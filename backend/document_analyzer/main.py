import os, re, json, pickle, tempfile, shutil
import numpy as np
import pandas as pd
from pypdf import PdfReader
import docx
import language_tool_python
from sentence_transformers import SentenceTransformer
import faiss
from groq import Groq
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

# ── CONFIG ──────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
LLM_MODEL    = "llama-3.3-70b-versatile"
EMBED_MODEL  = "sentence-transformers/all-MiniLM-L6-v2"

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

US_UNI_CSV      = os.path.join(DATA_DIR, "us_universities.csv")
US_PROG_CSV     = os.path.join(DATA_DIR, "us_programs.csv")
NON_US_UNI_CSV  = os.path.join(DATA_DIR, "non_us_universities.csv")
NON_US_PROG_CSV = os.path.join(DATA_DIR, "non_us_programs.csv")

UNI_EMB_PKL  = os.path.join(DATA_DIR, "uni_embeddings.pkl")
PROG_EMB_PKL = os.path.join(DATA_DIR, "prog_embeddings.pkl")

KEYWORD_STOPLIST = {
    "the","and","for","with","this","that","from","your","have","will","you","our","are","can","also",
    "program","university","department","students","course","courses","study","research","faculty",
    "requirements","requirement","application","admission","deadline","tuition","fees","location",
    "more","information","please","visit","contact","email","phone","address","apply","online",
    "full","time","part","per","year","credit","hours","minimum","maximum","based","must","meet",
    "all","any","one","two","three","four","five","six","seven","eight","nine","ten",
    "not","but","its","has","was","been","they","their","them","who","what","when","where","how",
    "each","which","about","after","before","during","other","into","than","then","some","only",
    "may","use","used","new","also","both","well","even","such","same","most","many","best",
    "http","https","www","html","php","asp","aspx","edu","com","org","net","gov","htm",
    "nan","none","null","true","false","yes","no",
    "rolling","adance","january","advancedcomputinginstitute","institute","private","college",
    "academics","programs","computing","public",
}

ACTION_VERBS = [
    "led","developed","implemented","designed","built","optimized","created",
    "managed","analyzed","improved","increased","reduced","delivered","automated",
    "coordinated","executed","launched","engineered","refactored","deployed","integrated"
]

# ── GLOBAL STATE (loaded once at startup) ───────────────────────
_state = {
    "client":     None,
    "embedder":   None,
    "lt_tool":    None,
    "unis":       None,
    "progs":      None,
    "uni_index":  None,
    "prog_index": None,
}


# ── DATASET NORMALIZATION ────────────────────────────────────────

def normalize_us_universities(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["university_name"] = out.get("University", pd.Series(dtype=str))
    out["program_name"]    = ""
    return out

def normalize_non_us_universities(df: pd.DataFrame) -> pd.DataFrame:
    out = df.copy()
    out["program_name"] = ""
    return out

def normalize_us_programs(df: pd.DataFrame) -> pd.DataFrame:
    return df.copy()

def normalize_non_us_programs(df: pd.DataFrame) -> pd.DataFrame:
    return df.copy()


def load_data():
    frames_uni  = []
    frames_prog = []

    if os.path.exists(US_UNI_CSV):
        df = pd.read_csv(US_UNI_CSV)
        df = normalize_us_universities(df)
        frames_uni.append(df)

    if os.path.exists(NON_US_UNI_CSV):
        df = pd.read_csv(NON_US_UNI_CSV)
        df = normalize_non_us_universities(df)
        frames_uni.append(df)

    if os.path.exists(US_PROG_CSV):
        df = pd.read_csv(US_PROG_CSV)
        df = normalize_us_programs(df)
        frames_prog.append(df)

    if os.path.exists(NON_US_PROG_CSV):
        df = pd.read_csv(NON_US_PROG_CSV)
        df = normalize_non_us_programs(df)
        frames_prog.append(df)

    unis  = pd.concat(frames_uni,  ignore_index=True) if frames_uni  else pd.DataFrame()
    progs = pd.concat(frames_prog, ignore_index=True) if frames_prog else pd.DataFrame()

    unis["combined"]  = unis.fillna("").astype(str).agg(" | ".join, axis=1)
    progs["combined"] = progs.fillna("").astype(str).agg(" | ".join, axis=1)

    return unis, progs


# ── EMBEDDING + FAISS ────────────────────────────────────────────

def build_index(df: pd.DataFrame, text_col: str, pkl_path: str, embedder):
    texts = df[text_col].fillna("").astype(str).tolist()
    if os.path.exists(pkl_path):
        with open(pkl_path, "rb") as f:
            emb = pickle.load(f)
        emb = np.array(emb, dtype="float32")
    else:
        emb = embedder.encode(texts, normalize_embeddings=True, show_progress_bar=True)
        emb = np.array(emb, dtype="float32")
        with open(pkl_path, "wb") as f:
            pickle.dump(emb, f)
    index = faiss.IndexFlatIP(emb.shape[1])
    index.add(emb)
    return index

def retrieve(df: pd.DataFrame, index, query: str, embedder, k: int = 3) -> pd.DataFrame:
    q = embedder.encode([query], normalize_embeddings=True).astype("float32")
    D, I = index.search(q, k)
    out = df.iloc[I[0]].copy()
    out["score"] = D[0]
    return out


# ── LIFESPAN (replaces deprecated @app.on_event) ────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load all heavy resources once at startup."""
    print("[startup] Loading Groq client...")
    _state["client"] = Groq(api_key=GROQ_API_KEY)

    print("[startup] Loading SentenceTransformer...")
    _state["embedder"] = SentenceTransformer(EMBED_MODEL)

    print("[startup] Loading LanguageTool (requires Java)...")
    _state["lt_tool"] = language_tool_python.LanguageTool("en-US")

    print("[startup] Loading CSV datasets...")
    unis, progs = load_data()
    _state["unis"]  = unis
    _state["progs"] = progs

    print("[startup] Building FAISS indexes...")
    _state["uni_index"]  = build_index(unis,  "combined", UNI_EMB_PKL,  _state["embedder"])
    _state["prog_index"] = build_index(progs, "combined", PROG_EMB_PKL, _state["embedder"])

    print("[startup] All resources loaded. Server ready.")
    yield

    # Cleanup on shutdown
    if _state["lt_tool"]:
        _state["lt_tool"].close()
    print("[shutdown] Resources released.")


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── HELPERS ─────────────────────────────────────────────────────

def safe_json_parse(text):
    if text is None:
        return {"error": "empty_response"}
    t = text.strip()
    if t.startswith("```"):
        t = re.sub(r"^```[a-zA-Z]*\s*", "", t)
        t = re.sub(r"\s*```$", "", t).strip()
    try:
        return json.loads(t)
    except Exception:
        m = re.search(r"\{.*\}", t, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
    return {"error": "invalid_json", "raw": text[:4000]}

def ask_llm_json(prompt, max_tokens=2500, temperature=0.0):
    client = _state["client"]
    r = client.chat.completions.create(
        model=LLM_MODEL,
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=max_tokens
    )
    return safe_json_parse(r.choices[0].message.content)

def read_pdf(path):
    reader = PdfReader(path)
    return "\n".join([(p.extract_text() or "") for p in reader.pages]).strip()

def read_docx(path):
    d = docx.Document(path)
    return "\n".join([p.text for p in d.paragraphs]).strip()

def read_txt(path):
    with open(path, "r", encoding="utf-8", errors="ignore") as f:
        return f.read().strip()

def read_document(path):
    ext = os.path.splitext(path)[1].lower()
    if ext == ".pdf":  return read_pdf(path)
    if ext == ".docx": return read_docx(path)
    if ext == ".txt":  return read_txt(path)
    raise ValueError("Unsupported file type. Please upload .pdf, .docx, or .txt")

def grammar_check(text, max_issues=25):
    lt = _state["lt_tool"]
    matches   = lt.check(text)
    corrected = language_tool_python.utils.correct(text, matches)
    issues    = []
    for m in matches[:max_issues]:
        issues.append({
            "message":      m.message,
            "context":      m.context,
            "replacements": m.replacements[:5]
        })
    issue_count           = len(matches)
    grammar_quality_score = max(0, 100 - issue_count * 2)
    return {
        "count":                 issue_count,
        "grammar_quality_score": grammar_quality_score,
        "issues":                issues,
        "corrected":             corrected
    }

def classify(text):
    prompt = (
        'Return ONLY JSON.\n'
        'Schema: {"doc_type":"SOP|RESUME","confidence":0.0,"reason_short":""}\n'
        f'TEXT:\n{text[:6000]}'
    )
    out = ask_llm_json(prompt, max_tokens=450)
    if "doc_type" not in out:
        out = {
            "doc_type":     "RESUME" if "experience" in text.lower() else "SOP",
            "confidence":   0.5,
            "reason_short": "fallback"
        }
    return out

def format_check(text, doc_type):
    lower      = text.lower()
    lines      = [l.strip() for l in text.splitlines() if l.strip()]
    first_para = lines[0] if lines else ""
    checks     = {}

    if doc_type == "RESUME":
        checks["resume_header"]     = bool(re.search(r"\bemail\b|@\w+|\bphone\b|\bmobile\b|\blinkedin\b|\bgithub\b", text, re.I))
        checks["resume_education"]  = bool(re.search(r"\beducation\b|\bdegree\b|\buniversity\b|\bcgpa\b|\bgpa\b", text, re.I))
        checks["resume_experience"] = bool(re.search(r"\bexperience\b|\bemployment\b|\bwork history\b", text, re.I))
        checks["resume_projects"]   = bool(re.search(r"\bprojects?\b|\bportfolio\b", text, re.I))
        checks["resume_skills"]     = bool(re.search(r"\bskills?\b|\btechnologies\b|\btools\b", text, re.I))
        checks["resume_extras"]     = bool(re.search(r"\bcertifications?\b|\bawards?\b|\bvolunteer\b|\bleadership\b", text, re.I))
        required = ["resume_header", "resume_education", "resume_experience", "resume_skills"]
    else:
        checks["sop_intro"]          = (
            "statement of purpose" in lower
            or "i am applying" in lower
            or "i wish to pursue" in lower
            or bool(re.search(r"\b(passionate|motivated|aspiring)\b", lower))
            or len(first_para) > 50
        )
        checks["sop_academics"]      = bool(re.search(r"\b(bachelor|undergraduate|degree|cgpa|gpa|university|graduation)\b", lower))
        checks["sop_experience"]     = bool(re.search(r"\b(intern|internship|project|research|work experience|worked)\b", lower))
        checks["sop_why_program"]    = bool(re.search(r"\b(program|curriculum|courses|specialization|research interests|master)\b", lower))
        checks["sop_why_university"] = bool(re.search(r"\b(university|faculty|lab|research group|department)\b", lower))
        checks["sop_goals"]          = bool(re.search(r"\b(career goals?|short[- ]term|long[- ]term|i aim to|i plan to|aspire|i hope to|my goal|future)\b", lower))
        checks["sop_conclusion"]     = bool(re.search(r"\b(in conclusion|thank you|i look forward|i would be honored|i am confident|i believe|i hope to)\b", lower))
        required = ["sop_intro", "sop_academics", "sop_experience", "sop_goals"]

    missing = [r for r in required if not checks.get(r)]
    if doc_type == "RESUME" and not checks.get("resume_projects"):
        missing.append("resume_projects")
    if doc_type == "SOP" and not checks.get("sop_conclusion"):
        missing.append("sop_conclusion")

    return {
        "is_correct_format": (len(missing) == 0),
        "missing_sections":  missing,
        "section_checks":    checks
    }

def extract_program_keywords(context, top_k=30):
    context_clean = re.sub(r"https?://\S+", " ", context)
    context_clean = re.sub(r"www\.\S+", " ", context_clean)
    words = re.findall(r"[a-zA-Z]{4,}", context_clean.lower())
    words = [w for w in words if w not in KEYWORD_STOPLIST]
    freq  = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1
    freq = {w: c for w, c in freq.items() if c >= 2}
    return [w for w, _ in sorted(freq.items(), key=lambda x: x[1], reverse=True)[:top_k]]

def program_fit_score(text, context):
    tl      = text.lower()
    kws     = extract_program_keywords(context, top_k=30)
    hits    = [k for k in kws if k in tl]
    missing = [k for k in kws if k not in tl]
    score   = min(100, int(len(hits) * (100 / max(1, len(kws)))))
    return {
        "program_fit_score":  score,
        "matched_keywords":   hits[:25],
        "missing_keywords":   missing[:25],
        "keywords_used":      kws
    }

def ats_score(text, context, fmt):
    tl               = text.lower()
    program_keywords = extract_program_keywords(context, top_k=30)

    section_score  = 0
    section_score += 10 if fmt["section_checks"].get("resume_header")     else 0
    section_score += 15 if fmt["section_checks"].get("resume_education")  else 0
    section_score += 15 if fmt["section_checks"].get("resume_experience") else 0
    section_score += 10 if fmt["section_checks"].get("resume_skills")     else 0
    section_score +=  5 if fmt["section_checks"].get("resume_projects")   else 0
    section_score  = min(section_score, 50)

    verb_count   = sum(1 for v in ACTION_VERBS if v in tl)
    verb_score   = min(15, verb_count * 2)

    metrics      = len(re.findall(r"\b\d+(\.\d+)?\s*(%|x|yrs|years|months|users|clients|requests|ms|s)\b", tl))
    metric_score = min(15, metrics * 5)

    bullets      = len(re.findall(r"(\n\s*[-•*]\s+)", text))
    bullet_score = min(10, bullets)

    prog_hits     = sum(1 for k in program_keywords if k in tl)
    prog_kw_score = min(20, prog_hits * 2)

    total = int(min(100, section_score + verb_score + metric_score + bullet_score + prog_kw_score))

    suggestions = []
    if not fmt["section_checks"].get("resume_projects"):
        suggestions.append("Add a 'Projects' section with 2–3 program-relevant projects.")
    if metrics == 0:
        suggestions.append("Add measurable impact (%, time saved, scale, users) in bullets.")
    if verb_count < 4:
        suggestions.append("Start bullets with strong action verbs (Developed, Implemented, Optimized, Led).")
    if bullets < 5:
        suggestions.append("Convert paragraphs into concise bullet points (ATS prefers bullets).")
    if prog_hits < 4:
        suggestions.append("Add program-specific keywords and technical skills aligned with the selected program.")

    return {
        "ats_score":   total,
        "breakdown":   {
            "section_score":    section_score,
            "action_verbs":     {"count": verb_count,  "score": verb_score},
            "metrics":          {"count": metrics,     "score": metric_score},
            "bullets":          {"count": bullets,     "score": bullet_score},
            "program_keywords": {"hits": prog_hits,    "score": prog_kw_score, "sample": program_keywords[:12]},
        },
        "suggestions": suggestions
    }


def build_analysis_scaffold(text: str, doc_type: str):
    """
    Build a lightweight scaffold the LLM can use to anchor feedback to
    concrete line numbers and coarse sections. This is heuristic on purpose
    but stable: we never mutate the text here, only describe it.
    """
    lines_raw = text.splitlines()
    lines = []
    for idx, t in enumerate(lines_raw, start=1):
        lines.append({"line_number": idx, "text": t})

    sections = []
    n = len(lines_raw)

    if doc_type == "RESUME":
        # Simple heading-based segmentation for resumes
        headings = [
            ("HEADER", ["name", "email", "phone", "linkedin", "github"]),
            ("SUMMARY", ["summary", "objective", "profile"]),
            ("EXPERIENCE", ["experience", "employment", "work history"]),
            ("PROJECTS", ["projects", "project"]),
            ("EDUCATION", ["education", "degree", "university"]),
            ("SKILLS", ["skills", "technologies", "tools"]),
            ("ADDITIONAL", ["certifications", "awards", "volunteer", "leadership", "activities"]),
        ]

        current_section = {"id": "FULL_RESUME", "title": "Full Resume", "start_line": 1, "end_line": n or 1, "type": "resume"}
        detected = []
        lower_lines = [l.lower() for l in lines_raw]

        for sec_id, keywords in headings:
            for i, l in enumerate(lower_lines):
                if any(re.search(rf"\\b{kw}\\b", l) for kw in keywords):
                    detected.append({"id": sec_id, "title": sec_id.title().replace("_", " "), "start_line": i + 1})
                    break

        detected_sorted = sorted({d["id"]: d for d in detected}.values(), key=lambda x: x["start_line"])
        if detected_sorted:
            for i, sec in enumerate(detected_sorted):
                start = sec["start_line"]
                end = (detected_sorted[i + 1]["start_line"] - 1) if i + 1 < len(detected_sorted) else (n or start)
                sections.append({"id": sec["id"], "title": sec["title"], "start_line": start, "end_line": end, "type": "resume"})
        else:
            sections.append(current_section)
    else:
        # SOP / Personal statement: approximate into ordered narrative sections
        ordered = [
            ("INTRODUCTION", "Introduction"),
            ("ACADEMIC_BACKGROUND", "Academic Background"),
            ("EXPERIENCE_AND_PROJECTS", "Experience and Projects"),
            ("WHY_THIS_PROGRAM", "Why This Program"),
            ("WHY_THIS_UNIVERSITY", "Why This University"),
            ("CAREER_GOALS", "Career Goals"),
            ("CONCLUSION", "Conclusion"),
        ]

        if n == 0:
            sections.append({"id": "FULL_SOP", "title": "Full Statement", "start_line": 1, "end_line": 1, "type": "sop"})
        else:
            # Divide lines into contiguous blocks following the above order
            block_size = max(1, n // len(ordered))
            start = 1
            for i, (sec_id, title) in enumerate(ordered):
                if i == len(ordered) - 1:
                    end = n
                else:
                    end = min(n, start + block_size - 1)
                sections.append({"id": sec_id, "title": title, "start_line": start, "end_line": end, "type": "sop"})
                start = end + 1
                if start > n:
                    break

    return {"lines": lines, "sections": sections}

def evaluate_and_rewrite(text, corrected, doc_type, format_report, grammar_report,
                          context, program_fit, uni_name, prog_name, ats_report=None):
    if doc_type == "RESUME":
        structure_rules = (
            "STRICT RESUME RULES:\n"
            "- MUST be ATS-friendly.\n"
            "- Use EXACT headings: NAME + CONTACT, PROFESSIONAL SUMMARY, SKILLS, EXPERIENCE, EDUCATION, PROJECTS, ADDITIONAL\n"
            "- Experience & Projects MUST be bullet points.\n"
            "- Do NOT invent facts. Use [ADD DETAIL] if missing.\n"
            "- Output MUST be valid JSON only."
        )
    else:
        structure_rules = (
            "STRICT SOP RULES:\n"
            "- Use EXACT headings: Introduction, Academic Background, Experience and Projects, "
            "Why This Program, Why This University, Career Goals, Conclusion\n"
            "- No bullet lists (use paragraphs).\n"
            "- Do NOT invent facts. Use [ADD DETAIL] if missing.\n"
            "- Output MUST be valid JSON only."
        )

    ats_block = (
        f"\nATS_REPORT:\n{json.dumps(ats_report, ensure_ascii=False)}\n"
        if ats_report else ""
    )
    grammar_summary = {
        "issue_count":            grammar_report["count"],
        "quality_score_0_to_100": grammar_report["grammar_quality_score"],
        "top_issues":             [i["message"] for i in grammar_report["issues"][:10]]
    }

    scaffold = build_analysis_scaffold(corrected, doc_type)

    prompt = (
        f"You are an admissions reviewer and writing coach.\n"
        f"Return ONLY valid JSON. No markdown. No triple backticks.\n"
        f"TARGET UNIVERSITY: {uni_name}\n"
        f"TARGET PROGRAM: {prog_name}\n"
        f"{structure_rules}\n"
        f"UNIVERSITY+PROGRAM CONTEXT:\n{context}\n"
        f"PROGRAM_FIT:\n{json.dumps(program_fit, ensure_ascii=False)}\n"
        f"FORMAT_REPORT:\n{json.dumps(format_report, ensure_ascii=False)}\n"
        f"GRAMMAR_REPORT:\n{json.dumps(grammar_summary, ensure_ascii=False)}\n"
        f"ANALYSIS_SCAFFOLD:\n{json.dumps(scaffold, ensure_ascii=False)}\n"
        f"{ats_block}"
        f"DOCUMENT:\n{corrected[:12000]}\n\n"
        "Return ONLY valid JSON with the following structure (no markdown, no comments):\n"
        "{\n"
        '  \"doc_type\": \"SOP\" | \"RESUME\",\n'
        "  \"overall_score\": number (0-100),\n"
        "  \"overall_quality_label\": string,\n"
        "  \"program_specificity\": {\n"
        "    \"target_university\": string,\n"
        "    \"target_program\": string,\n"
        "    \"fit_score\": number,\n"
        "    \"missing_keywords_to_add\": [string],\n"
        "    \"where_to_add_keywords\": [string],\n"
        "    \"keyword_placement_suggestions\": [\n"
        "      {\"keyword\": string, \"section\": string, \"suggested_sentence_or_fragment\": string}\n"
        "    ],\n"
        "    \"mismatch_notes\": [string]\n"
        "  },\n"
        "  \"format_and_sections\": {\n"
        "    \"is_correct_format\": boolean,\n"
        "    \"missing_sections\": [string],\n"
        "    \"section_checks\": object\n"
        "  },\n"
        "  \"grammar\": {\"score\": number, \"issue_count\": number, \"top_issues\": [string]},\n"
        "  \"clarity\": {\"score\": number, \"issues\": [string]},\n"
        "  \"tone\": {\"summary\": string, \"is_appropriate\": boolean, \"issues\": [string]},\n"
        "  \"relevance_to_selected_program\": {\n"
        "    \"score\": number,\n"
        "    \"issues\": [string],\n"
        "    \"what_to_add_based_on_context\": [string]\n"
        "  },\n"
        "  \"strengths\": [string],\n"
        "  \"weaknesses\": [string],\n"
        "  \"line_issues\": [\n"
        "    {\n"
        "      \"line_number\": number,\n"
        "      \"issue_type\": \"grammar\" | \"clarity\" | \"tone\" | \"weak_content\" | \"repetition\" | \"structure\" | \"program_mismatch\",\n"
        "      \"severity\": \"critical\" | \"important\" | \"minor\",\n"
        "      \"original_line\": string,\n"
        "      \"improved_line\": string,\n"
        "      \"explanation\": string\n"
        "    }\n"
        "  ],\n"
        "  \"sentence_level_improvements\": [\n"
        "    {\n"
        "      \"section\": string,\n"
        "      \"original_sentence\": string,\n"
        "      \"improved_sentence\": string,\n"
        "      \"issue_type\": string,\n"
        "      \"severity\": string,\n"
        "      \"explanation\": string\n"
        "    }\n"
        "  ],\n"
        "  \"section_analysis\": {\n"
        "    \"SECTION_ID\": {\n"
        "      \"title\": string,\n"
        "      \"what_is_good\": [string],\n"
        "      \"what_is_missing\": [string],\n"
        "      \"what_to_improve\": [string]\n"
        "    }\n"
        "  },\n"
        "  \"resume_bullet_analysis\": [\n"
        "    {\n"
        "      \"section\": string,\n"
        "      \"bullet_text\": string,\n"
        "      \"has_action_verb\": boolean,\n"
        "      \"action_verb\": string | null,\n"
        "      \"has_metric\": boolean,\n"
        "      \"metric_example\": string | null,\n"
        "      \"program_relevance_score\": number,\n"
        "      \"issues\": [string],\n"
        "      \"improved_bullet\": string\n"
        "    }\n"
        "  ],\n"
        "  \"rewrite_output\": {\"improved_document\": string},\n"
        "  \"action_plan_next_revision\": [\n"
        "    {\"item\": string, \"priority\": \"high\" | \"medium\" | \"low\"}\n"
        "  ]\n"
        "}\n"
        "Rules:\n"
        "- Do NOT give generic advice; every issue must refer to the actual text and, when possible, a specific line or section.\n"
        "- Use the ANALYSIS_SCAFFOLD line numbers and sections when populating line_issues and section_analysis.\n"
        "- Tailor feedback to the TARGET UNIVERSITY and TARGET PROGRAM using PROGRAM_FIT and the provided context.\n"
        "- For resumes, analyze each bullet individually for action verbs, metrics, and program relevance.\n"
        "- Do not invent facts; if information is missing, suggest phrases with [ADD DETAIL] placeholders.\n"
    )

    out = ask_llm_json(prompt, max_tokens=3200, temperature=0.0)

    if isinstance(out, dict) and "error" not in out:
        # Ensure section/format info is always present and aligned with our own checks
        fmt_section = out.setdefault("format_and_sections", {})
        fmt_section["is_correct_format"] = format_report["is_correct_format"]
        fmt_section["missing_sections"]  = format_report["missing_sections"]
        fmt_section["section_checks"]    = format_report["section_checks"]

        # Program specificity defaults and alignment
        prog_spec = out.setdefault("program_specificity", {})
        prog_spec["target_university"]       = uni_name
        prog_spec["target_program"]          = prog_name
        prog_spec["fit_score"]               = program_fit.get("program_fit_score", 0)
        prog_spec.setdefault("missing_keywords_to_add", program_fit.get("missing_keywords", [])[:12])
        prog_spec.setdefault("where_to_add_keywords", [])
        prog_spec.setdefault("keyword_placement_suggestions", [])
        prog_spec.setdefault("mismatch_notes", [])

        # Grammar defaults
        gram = out.setdefault("grammar", {})
        gram["score"]       = grammar_report["grammar_quality_score"]
        gram["issue_count"] = grammar_report["count"]
        gram.setdefault("top_issues", grammar_summary["top_issues"])

        # Line issues normalization
        allowed_issue_types = {"grammar", "clarity", "tone", "weak_content", "repetition", "structure", "program_mismatch"}
        allowed_severity    = {"critical", "important", "minor"}
        line_issues = out.get("line_issues") or []
        normalized_line_issues = []
        if isinstance(line_issues, list):
            for li in line_issues:
                if not isinstance(li, dict):
                    continue
                ln = int(li.get("line_number", 0)) or 0
                if ln <= 0:
                    continue
                itype = str(li.get("issue_type", "clarity")).lower()
                if itype not in allowed_issue_types:
                    itype = "clarity"
                sev = str(li.get("severity", "minor")).lower()
                if sev not in allowed_severity:
                    sev = "minor"
                normalized_line_issues.append({
                    "line_number": ln,
                    "issue_type": itype,
                    "severity": sev,
                    "original_line": li.get("original_line", ""),
                    "improved_line": li.get("improved_line", ""),
                    "explanation": li.get("explanation", "")
                })
        out["line_issues"] = normalized_line_issues

        # Section analysis normalization
        section_analysis = out.get("section_analysis") or {}
        if isinstance(section_analysis, list):
            converted = {}
            for entry in section_analysis:
                if isinstance(entry, dict):
                    key = entry.get("id") or entry.get("title") or f"section_{len(converted)+1}"
                    converted[str(key)] = {
                        "title": entry.get("title", str(key)),
                        "what_is_good": entry.get("what_is_good", []),
                        "what_is_missing": entry.get("what_is_missing", []),
                        "what_to_improve": entry.get("what_to_improve", []),
                    }
            section_analysis = converted
        elif isinstance(section_analysis, dict):
            # ensure each value has the expected keys
            for k, v in list(section_analysis.items()):
                if not isinstance(v, dict):
                    section_analysis[k] = {
                        "title": str(k),
                        "what_is_good": [],
                        "what_is_missing": [],
                        "what_to_improve": [],
                    }
                else:
                    v.setdefault("title", str(k))
                    v.setdefault("what_is_good", [])
                    v.setdefault("what_is_missing", [])
                    v.setdefault("what_to_improve", [])
        else:
            section_analysis = {}
        out["section_analysis"] = section_analysis

        # Sentence-level improvements default
        sli = out.get("sentence_level_improvements")
        if not isinstance(sli, list):
            out["sentence_level_improvements"] = []

        # Resume bullet analysis default
        if doc_type == "RESUME":
            rba = out.get("resume_bullet_analysis")
            if not isinstance(rba, list):
                out["resume_bullet_analysis"] = []
        else:
            out["resume_bullet_analysis"] = []

        # Action plan normalization: allow both plain strings and objects
        ap = out.get("action_plan_next_revision") or []
        normalized_ap = []
        if isinstance(ap, list):
            for item in ap:
                if isinstance(item, str):
                    normalized_ap.append({"item": item, "priority": "high"})
                elif isinstance(item, dict):
                    txt = item.get("item") or item.get("text") or ""
                    pr  = str(item.get("priority", "high")).lower()
                    if pr not in {"high", "medium", "low"}:
                        pr = "high"
                    if txt:
                        normalized_ap.append({"item": txt, "priority": pr})
        out["action_plan_next_revision"] = normalized_ap

        # Derive quality label if missing
        score = out.get("overall_score", 0)
        out["overall_quality_label"] = out.get("overall_quality_label") or (
            "Exceptional" if score >= 85 else
            "Strong"      if score >= 70 else
            "Average"     if score >= 50 else
            "Weak"        if score >= 30 else
            "Very Weak"
        )
    return out


# ── ROUTES ───────────────────────────────────────────────────────

@app.post("/analyze")
@app.post("/api/document-analyzer/analyze")
async def analyze_document(
    file:       UploadFile = File(...),
    university: str        = Form(...),
    program:    str        = Form(...),
):
    suffix = os.path.splitext(file.filename)[1]
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        text           = read_document(tmp_path)
        grammar        = grammar_check(text)
        classification = classify(text)
        doc_type       = classification.get("doc_type", "SOP")
        fmt            = format_check(text, doc_type)

        unis       = _state["unis"]
        progs      = _state["progs"]
        uni_index  = _state["uni_index"]
        prog_index = _state["prog_index"]
        embedder   = _state["embedder"]

        q      = f"{university} {program}".strip()
        u_rows = retrieve(unis,  uni_index,  q, embedder, k=3)
        p_rows = retrieve(progs, prog_index, q, embedder, k=3)
        context = "\n".join(list(u_rows["combined"]) + list(p_rows["combined"]))

        prog_fit = program_fit_score(text, context)
        ats      = ats_score(text, context, fmt) if doc_type == "RESUME" else None

        evaluation = evaluate_and_rewrite(
            text=text, corrected=grammar["corrected"], doc_type=doc_type,
            format_report=fmt, grammar_report=grammar, context=context,
            program_fit=prog_fit, uni_name=university, prog_name=program,
            ats_report=ats
        )

        return JSONResponse({
            "classification": classification,
            "grammar":        grammar,
            "format":         fmt,
            "program_fit":    prog_fit,
            "ats_score":      ats,
            "evaluation":     evaluation
        })

    except ValueError as ve:
        return JSONResponse({"error": str(ve)}, status_code=400)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return JSONResponse({"error": f"Internal server error: {str(e)}"}, status_code=500)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/health")
@app.get("/api/document-analyzer/health")
async def health():
    return {"status": "ok"}