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

# ── CONFIG ──────────────────────────────────────────────────────
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "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")
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
        f"{ats_block}"
        f"DOCUMENT:\n{corrected[:12000]}\n\n"
        "Return JSON with keys: doc_type, overall_score (0-100), overall_quality_label, "
        "program_specificity (target_university, target_program, fit_score, missing_keywords_to_add, where_to_add_keywords), "
        "format_and_sections (is_correct_format, missing_sections, section_checks), "
        "grammar (score, top_issues), clarity (score, issues), tone (summary, is_appropriate, issues), "
        "relevance_to_selected_program (score, issues, what_to_add_based_on_context), "
        "strengths (array), weaknesses (array), "
        "sentence_level_improvements (array of {original, improved, why}), "
        'rewrite_output ({"improved_document": ""}), '
        "action_plan_next_revision (array)"
    )

    out = ask_llm_json(prompt, max_tokens=3200, temperature=0.0)

    if isinstance(out, dict) and "error" not in out:
        out.setdefault("format_and_sections", {})
        out["format_and_sections"]["is_correct_format"] = format_report["is_correct_format"]
        out["format_and_sections"]["missing_sections"]  = format_report["missing_sections"]
        out["format_and_sections"]["section_checks"]    = format_report["section_checks"]

        out.setdefault("program_specificity", {})
        out["program_specificity"]["target_university"]       = uni_name
        out["program_specificity"]["target_program"]          = prog_name
        out["program_specificity"]["fit_score"]               = program_fit.get("program_fit_score", 0)
        out["program_specificity"]["missing_keywords_to_add"] = program_fit.get("missing_keywords", [])[:12]

        out.setdefault("grammar", {})
        out["grammar"]["score"]       = grammar_report["grammar_quality_score"]
        out["grammar"]["issue_count"] = grammar_report["count"]

        score = out.get("overall_score", 0)
        out["overall_quality_label"] = (
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

        # Use pre-loaded indexes (no reload on every request)
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
        return JSONResponse({"error": f"Internal server error: {str(e)}"}, status_code=500)
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


@app.get("/health")
@app.get("/api/document-analyzer/health")
async def health():
    return {"status": "ok"}