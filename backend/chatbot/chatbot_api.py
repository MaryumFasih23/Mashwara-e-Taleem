import os
import sys
import pickle
import numpy as np
import pandas as pd
import faiss
import httpx
import re
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from groq import Groq

# ─────────────────────────────────────────────
# LOAD ENV
# ─────────────────────────────────────────────
load_dotenv()
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
EMBED_MODEL  = os.getenv("EMBED_MODEL", "all-MiniLM-L6-v2")
TOP_K        = int(os.getenv("TOP_K", "8"))

# URL of your Node backend's scholarship endpoint
SCHOLARSHIP_API_URL = os.getenv("SCHOLARSHIP_API_URL", "http://localhost:5000/api/scholarships")

# ─────────────────────────────────────────────
# PATHS
# ─────────────────────────────────────────────
BASE_DIR                = os.path.dirname(__file__)
DATA_DIR                = os.path.join(BASE_DIR, "chatbot_data")
NON_US_PROGRAMS_CSV     = os.path.join(DATA_DIR, "non_us_programs.csv")
NON_US_UNIVERSITIES_CSV = os.path.join(DATA_DIR, "non_us_universities.csv")
US_PROGRAMS_CSV         = os.path.join(DATA_DIR, "us_programs.csv")
US_UNIVERSITIES_CSV     = os.path.join(DATA_DIR, "us_universites_descriptive.csv")
CACHE_FILE              = os.path.join(DATA_DIR, "embeddings_cache.pkl")
FAISS_INDEX_FILE        = os.path.join(DATA_DIR, "faiss_index.bin")

# ─────────────────────────────────────────────
# FASTAPI APP
# ─────────────────────────────────────────────
app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────
# GLOBAL STATE
# ─────────────────────────────────────────────
embed_model = None
faiss_index = None
chunks      = []
groq_client = None


class ChatRequest(BaseModel):
    message: str
    history: List[dict] = []
    profile: Optional[Dict[str, Any]] = None
    eligibility_summary: Optional[str] = None


class ChatResponse(BaseModel):
    reply: str


# ══════════════════════════════════════════════════════════════════
# 1. DATA LOADING & CHUNK BUILDING
# ══════════════════════════════════════════════════════════════════

def load_data():
    print("📂 Loading datasets …")
    non_us_prog = pd.read_csv(NON_US_PROGRAMS_CSV)
    non_us_uni  = pd.read_csv(NON_US_UNIVERSITIES_CSV)
    us_prog     = pd.read_csv(US_PROGRAMS_CSV)
    us_uni      = pd.read_csv(US_UNIVERSITIES_CSV)

    print(f"   ✅ non_us_programs      : {len(non_us_prog):,} rows")
    print(f"   ✅ non_us_universities  : {len(non_us_uni):,} rows")
    print(f"   ✅ us_programs          : {len(us_prog):,} rows")
    print(f"   ✅ us_universities      : {len(us_uni):,} rows")

    return non_us_prog, non_us_uni, us_prog, us_uni


def build_chunks(non_us_prog, non_us_uni, us_prog, us_uni):
    chunks = []

    for _, r in non_us_prog.iterrows():
        scholarship = "Yes" if str(r.get("scholarship_available", "")).strip().lower() == "yes" else "No"
        gre_req     = "Yes" if str(r.get("gre_required", "0")).strip() not in ("0", "No", "no", "") else "No"
        work_req    = "Yes" if str(r.get("work_experience_required", "0")).strip() not in ("0", "No", "no", "") else "No"

        text = (
            f"[INTERNATIONAL PROGRAM] University: {r.get('university_name', 'N/A')} | "
            f"Country: {r.get('country', 'N/A')} | QS Rank: {r.get('qs_rank', 'N/A')} | "
            f"Program: {r.get('program_name', 'N/A')} | Degree: {r.get('degree_type', 'N/A')} | "
            f"Level: {r.get('program_level', 'N/A')} | Category: {r.get('program_category', 'N/A')} | "
            f"Duration: {r.get('program_duration_years', 'N/A')} years | "
            f"Tuition (USD/yr): ${r.get('tuition_fee_usd', 'N/A')} | Scholarship: {scholarship} | "
            f"Min IELTS Overall: {r.get('min_ielts_overall', 'N/A')} | "
            f"Min IELTS Band: {r.get('min_ielts_band', 'N/A')} | "
            f"TOEFL: {r.get('toefl_score', 'N/A')} | Duolingo: {r.get('duolingo_score', 'N/A')} | "
            f"Min GPA: {r.get('min_gpa', 'N/A')} | GRE Required: {gre_req} | "
            f"Min GRE: {r.get('min_gre_score', 'N/A')} | Work Exp: {work_req} | "
            f"Field Requirements: {r.get('field_requirements', 'N/A')}"
        )
        chunks.append({
            "text": text,
            "source": "non_us_programs",
            "university": r.get("university_name", ""),
            "country": r.get("country", ""),
            "program": r.get("program_name", ""),
            "level": r.get("program_level", "")
        })

    for _, r in non_us_uni.iterrows():
        gre_req  = "Yes" if str(r.get("gre", "0")).strip() not in ("0", "No", "no", "") else "No"
        work_req = "Yes" if str(r.get("work_exp", "0")).strip() not in ("0", "No", "no", "") else "No"

        text = (
            f"[INTERNATIONAL UNIVERSITY PROFILE] University: {r.get('university_name', 'N/A')} | "
            f"Country: {r.get('country', 'N/A')} | QS Rank: {r.get('qs_rank', 'N/A')} | "
            f"Min IELTS: {r.get('min_ielts', 'N/A')} | IELTS Band: {r.get('ielts_band', 'N/A')} | "
            f"TOEFL: {r.get('toefl', 'N/A')} | Duolingo: {r.get('duolingo', 'N/A')} | "
            f"GRE Required: {gre_req} | Work Exp: {work_req} | "
            f"Min CGPA: {r.get('min_cgpa', 'N/A')} | Min GRE Score: {r.get('gre_score', 'N/A')} | "
            f"Annual Tuition (USD): ${r.get('tuition_usd', 'N/A')}"
        )
        chunks.append({
            "text": text,
            "source": "non_us_universities",
            "university": r.get("university_name", ""),
            "country": r.get("country", ""),
            "program": "",
            "level": "general"
        })

    for _, r in us_prog.iterrows():
        scholarship = "Yes" if str(r.get("scholarship_available", "")).strip().lower() == "yes" else "No"
        gre_req     = "Yes" if str(r.get("gre_required", "Not Required")).strip() not in ("Not Required", "No", "no", "0", "") else "No"
        work_req    = "Yes" if str(r.get("work_experience_required", "Not Required")).strip() not in ("Not Required", "No", "no", "0", "") else "No"

        text = (
            f"[US PROGRAM] University: {r.get('university_name', 'N/A')} | "
            f"State: {r.get('state', 'N/A')} | City: {r.get('city', 'N/A')} | "
            f"Type: {r.get('institution_type', 'N/A')} | QS Rank: {r.get('qs_world_ranking', 'N/A')} | "
            f"Program: {r.get('program_name', 'N/A')} | Degree: {r.get('degree_type', 'N/A')} | "
            f"Level: {r.get('program_level', 'N/A')} | Category: {r.get('program_category', 'N/A')} | "
            f"Duration: {r.get('program_duration_years', 'N/A')} years | "
            f"Tuition (USD/yr): ${r.get('tuition_fee_usd', 'N/A')} | Scholarship: {scholarship} | "
            f"SAT Range: {r.get('sat_min', 'N/A')}-{r.get('sat_max', 'N/A')} | "
            f"ACT Range: {r.get('act_min', 'N/A')}-{r.get('act_max', 'N/A')} | "
            f"Min IELTS Overall: {r.get('min_ielts_overall', 'N/A')} | "
            f"Min IELTS Band: {r.get('min_ielts_band', 'N/A')} | "
            f"TOEFL: {r.get('toefl_score', 'N/A')} | Duolingo: {r.get('duolingo_score', 'N/A')} | "
            f"Min GPA: {r.get('min_gpa', 'N/A')} | GRE Required: {gre_req} | Work Exp: {work_req} | "
            f"Application Deadline: {r.get('application_deadline', 'N/A')} | "
            f"URL: {r.get('university_url', 'N/A')} | "
            f"Field Requirements: {r.get('field_requirements', 'N/A')}"
        )
        chunks.append({
            "text": text,
            "source": "us_programs",
            "university": r.get("university_name", ""),
            "country": "USA",
            "program": r.get("program_name", ""),
            "level": r.get("program_level", "")
        })

    for _, r in us_uni.iterrows():
        text = (
            f"[US UNIVERSITY PROFILE] University: {r.get('University', 'N/A')} | "
            f"Type: {r.get('Institution_Type', 'N/A')} | "
            f"Location: {r.get('City', 'N/A')}, {r.get('State', 'N/A')} | "
            f"US News Rank 2025: #{r.get('US_News_Ranking_2025', 'N/A')} | "
            f"Acceptance Rate: {r.get('Acceptance_Rate_Pct', 'N/A')}% | "
            f"SAT 25th-75th: {r.get('Bach_SAT_25th', 'N/A')}-{r.get('Bach_SAT_75th', 'N/A')} | "
            f"ACT 25th-75th: {r.get('Bach_ACT_25th', 'N/A')}-{r.get('Bach_ACT_75th', 'N/A')} | "
            f"Avg Admitted GPA: {r.get('Bach_Avg_GPA_Admitted', 'N/A')} | "
            f"Bach TOEFL: {r.get('Bach_TOEFL_Min', 'N/A')} | Bach IELTS: {r.get('Bach_IELTS_Min', 'N/A')} | "
            f"Bach Tuition (USD): ${r.get('Bach_Annual_Tuition_USD', 'N/A')} | "
            f"Bach Deadline: {r.get('Bach_Application_Deadline', 'N/A')} | "
            f"Scholarship/Aid: {r.get('Scholarship_Financial_Aid', 'N/A')} | "
            f"Masters Offered: {r.get('Masters_Programs_Offered', 'N/A')} | "
            f"Masters Min GPA: {r.get('Masters_Min_GPA_Recommended', 'N/A')} | "
            f"Masters GRE: {r.get('Masters_GRE_Policy', 'N/A')} | "
            f"Masters TOEFL: {r.get('Masters_TOEFL_Min', 'N/A')} | Masters IELTS: {r.get('Masters_IELTS_Min', 'N/A')} | "
            f"Masters Tuition (USD): ${r.get('Masters_Annual_Tuition_USD', 'N/A')} | "
            f"Masters Deadline: {r.get('Masters_Application_Deadline', 'N/A')} | "
            f"LOR Count: {r.get('Masters_LOR_Count', 'N/A')} | SOP Required: {r.get('Masters_SOP_Required', 'N/A')} | "
            f"URL: {r.get('Official_URL', 'N/A')}"
        )
        chunks.append({
            "text": text,
            "source": "us_universities",
            "university": r.get("University", ""),
            "country": "USA",
            "program": "",
            "level": "general"
        })

    print(f"\n📦 Total chunks built: {len(chunks):,}")
    return chunks


# ══════════════════════════════════════════════════════════════════
# 2. CACHE HELPERS
# ══════════════════════════════════════════════════════════════════

def cache_is_valid():
    return (
        os.path.exists(CACHE_FILE) and os.path.getsize(CACHE_FILE) > 0 and
        os.path.exists(FAISS_INDEX_FILE) and os.path.getsize(FAISS_INDEX_FILE) > 0
    )


def load_from_cache():
    print("\n💾 Cache found — loading embeddings + index instantly …")
    with open(CACHE_FILE, "rb") as f:
        cache = pickle.load(f)
    stored_chunks = cache.get("chunks", [])
    if not stored_chunks:
        raise ValueError("Cache is missing chunks — delete cache files and restart.")
    index = faiss.read_index(FAISS_INDEX_FILE)
    print(f"✅ Loaded {index.ntotal:,} vectors from cache. No encoding needed.")
    return index, stored_chunks


def build_and_save_to_cache(chunk_list, model):
    print("\n🔢 First-time setup: encoding all chunks (only happens once) …")
    texts = [c["text"] for c in chunk_list]
    batch_size = 512
    all_embeddings = []

    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        embs = model.encode(batch, show_progress_bar=False, convert_to_numpy=True)
        all_embeddings.append(embs)
        pct = min(100, int((i + batch_size) / len(texts) * 100))
        print(f"   … {pct}% encoded", end="\r")

    print()
    embeddings = np.vstack(all_embeddings).astype("float32")
    faiss.normalize_L2(embeddings)

    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)

    faiss.write_index(index, FAISS_INDEX_FILE)
    with open(CACHE_FILE, "wb") as f:
        pickle.dump({"chunks": chunk_list}, f)

    print(f"✅ Cache saved → {CACHE_FILE} + {FAISS_INDEX_FILE}")
    print(f"✅ FAISS index: {index.ntotal:,} vectors, dim={dim}")
    return index


# ══════════════════════════════════════════════════════════════════
# 3. RETRIEVAL
# ══════════════════════════════════════════════════════════════════

def retrieve(query, model, index, chunk_list):
    q_emb = model.encode([query], convert_to_numpy=True).astype("float32")
    faiss.normalize_L2(q_emb)
    scores, idxs = index.search(q_emb, TOP_K)
    results = []
    for score, idx in zip(scores[0], idxs[0]):
        if idx >= 0:
            results.append({"chunk": chunk_list[idx], "score": float(score)})
    return results


# ══════════════════════════════════════════════════════════════════
# 4. SCHOLARSHIP INTEGRATION
# ══════════════════════════════════════════════════════════════════

# Keywords that signal the student is asking about scholarships
SCHOLARSHIP_KEYWORDS = [
    "scholarship", "scholarships", "funded", "fully funded", "funding",
    "financial aid", "stipend", "bursary", "fellowship", "grant",
    "tuition waiver", "free education", "scholarship for pakistani",
    "scholarship for international", "need money", "can't afford",
    "how to fund", "fund my studies",
]

# Country keywords we can extract to narrow the scholarship query
COUNTRY_MAP = {
    "usa": "USA", "us": "USA", "united states": "USA", "america": "USA",
    "uk": "UK", "britain": "UK", "england": "UK", "united kingdom": "UK",
    "canada": "Canada", "australia": "Australia",
    "germany": "Germany", "qatar": "Qatar",
}

DEGREE_MAP = {
    "bachelor": "Bachelor", "bachelors": "Bachelor", "undergraduate": "Bachelor", "ug": "Bachelor",
    "master": "Master", "masters": "Master", "ms ": "Master", "msc": "Master",
    "postgraduate": "Master", "pg ": "Master",
}


def is_scholarship_question(message: str) -> bool:
    msg_lower = message.lower()
    return any(kw in msg_lower for kw in SCHOLARSHIP_KEYWORDS)


def extract_country_from_message(message: str) -> str:
    msg_lower = message.lower()
    for keyword, country in COUNTRY_MAP.items():
        if keyword in msg_lower:
            return country
    return ""


def extract_degree_from_message(message: str) -> str:
    msg_lower = message.lower()
    for keyword, degree in DEGREE_MAP.items():
        if keyword in msg_lower:
            return degree
    return ""


def fetch_scholarships_for_chatbot(country: str = "", degree_level: str = "", domain: str = "Computer Science") -> str:
    """
    Calls the Node backend scholarship endpoint and returns a formatted
    string block to inject into the LLM prompt.
    Returns empty string on any failure (chatbot still works without it).
    """
    try:
        params = {"domain": domain}
        if country:
            params["country"] = country
        if degree_level:
            params["degreeLevel"] = degree_level

        with httpx.Client(timeout=10.0) as client:
            response = client.get(SCHOLARSHIP_API_URL, params=params)

        if response.status_code != 200:
            print(f"⚠️  Scholarship API returned {response.status_code}")
            return ""

        data = response.json()
        scholarships = data.get("scholarships", [])

        if not scholarships:
            return ""

        # Take top 15 scholarships by score to keep context manageable
        top = sorted(scholarships, key=lambda s: s.get("score", 0), reverse=True)[:15]

        lines = [
            "[SCHOLARSHIP DATA — Use this when the student asks about scholarships, funding, or financial aid. "
            "Present scholarships naturally. Do not list all of them unless asked — pick the most relevant ones.]"
        ]

        for s in top:
            title       = s.get("title", "Unknown Scholarship")
            provider    = s.get("provider", "")
            s_country   = s.get("country", "")
            degree      = s.get("degreeLevel", "")
            amount      = s.get("amount", "")
            deadline    = s.get("deadline", "")
            s_type      = s.get("type", "")
            is_govt     = s.get("isGovernment", False)
            link        = s.get("applicationLink", "")
            eligibility = s.get("eligibility", [])
            description = s.get("description", "")

            parts = []
            if provider:    parts.append(f"Provider: {provider}")
            if s_country:   parts.append(f"Country: {s_country}")
            if degree:      parts.append(f"Level: {degree}")
            if amount:      parts.append(f"Amount: {amount}")
            if deadline:    parts.append(f"Deadline: {deadline}")
            if s_type:      parts.append(f"Type: {'Government' if is_govt else s_type}")
            if link:        parts.append(f"Link: {link}")
            if eligibility: parts.append(f"Eligibility: {'; '.join(eligibility[:3])}")
            if description: parts.append(f"Info: {description[:120]}")

            lines.append(f"- {title} | " + " | ".join(parts))

        return "\n".join(lines)

    except Exception as e:
        print(f"⚠️  Could not fetch scholarships for chatbot: {e}")
        return ""


# ══════════════════════════════════════════════════════════════════
# 5. PROFILE CONTEXT BUILDER  (silent — never echoed back to student)
# ══════════════════════════════════════════════════════════════════

def build_profile_context(profile: dict) -> str:
    if not profile:
        return ""

    lines = ["[STUDENT PROFILE — use only when the student's question directly requires it. Never echo this back or mention it unprompted.]"]

    edu_level    = profile.get("educationLevel", "")
    field        = profile.get("fieldOfStudy", "")
    cgpa         = profile.get("cgpa", "")
    cgpa_out_of  = profile.get("cgpaOutOf", "")
    ielts        = profile.get("ielts", "")
    ielts_band   = profile.get("ieltsBand", "")
    toefl        = profile.get("toefl", "")
    duolingo     = profile.get("duolingo", "")
    gre_total    = profile.get("greTotal", "")
    gre_verbal   = profile.get("greVerbal", "")
    gre_quant    = profile.get("greQuant", "")
    gmat         = profile.get("gmat", "")
    sat          = profile.get("sat", "")
    act          = profile.get("act", "")

    pref_level     = profile.get("preferredStudyLevel", "")
    pref_countries = profile.get("preferredCountries", [])
    pref_programs  = profile.get("preferredPrograms", "")
    budget_min     = profile.get("budgetMin", "")
    budget_max     = profile.get("budgetMax", "")
    need_aid       = profile.get("needFinancialAid", False)
    scholarships   = profile.get("interestedInScholarships", False)
    work_exp       = profile.get("workExperience", "")
    has_research   = profile.get("hasResearchExperience", False)
    career_goals   = profile.get("careerGoals", "")

    if edu_level:  lines.append(f"Education level: {edu_level}")
    if field:      lines.append(f"Field of study: {field}")

    if cgpa:
        lines.append(f"CGPA: {cgpa}{f'/{cgpa_out_of}' if cgpa_out_of else ''}")

    scores = []
    if ielts:
        s = f"IELTS {ielts} overall"
        if ielts_band: s += f" / {ielts_band} band"
        scores.append(s)
    if toefl:     scores.append(f"TOEFL {toefl}")
    if duolingo:  scores.append(f"Duolingo {duolingo}")
    if gre_total:
        s = f"GRE {gre_total}"
        if gre_verbal and gre_quant: s += f" (V{gre_verbal}/Q{gre_quant})"
        scores.append(s)
    if gmat: scores.append(f"GMAT {gmat}")
    if sat:  scores.append(f"SAT {sat}")
    if act:  scores.append(f"ACT {act}")
    if scores: lines.append("Test scores: " + ", ".join(scores))

    if pref_level: lines.append(f"Target level: {pref_level}")
    if pref_countries:
        c = ", ".join(pref_countries) if isinstance(pref_countries, list) else pref_countries
        lines.append(f"Preferred countries: {c}")
    if pref_programs: lines.append(f"Preferred programs: {pref_programs}")

    budget_parts = []
    if budget_min: budget_parts.append(f"from ${budget_min}")
    if budget_max: budget_parts.append(f"up to ${budget_max}")
    if budget_parts: lines.append(f"Budget: {' '.join(budget_parts)} USD/year")
    if need_aid:       lines.append("Needs financial aid")
    if scholarships:   lines.append("Interested in scholarships")
    if work_exp:       lines.append(f"Work experience: {work_exp} years")
    if has_research:   lines.append("Has research experience")
    if career_goals:   lines.append(f"Career goals: {career_goals}")

    if len(lines) == 1:
        return ""

    return "\n".join(lines)


# ══════════════════════════════════════════════════════════════════
# 6. SYSTEM PROMPT
# ══════════════════════════════════════════════════════════════════

SYSTEM_PROMPT = """You are an expert university admissions consultant for Pakistani and international students.

Your job is to answer like a real consultant: natural, concise, clear, and helpful.

RESPONSE RULES:
- Answer only what the student asked.
- Keep the response short and direct.
- For most questions, use 2 to 4 sentences maximum.
- Do not ask follow-up questions.
- Do not add extra suggestions unless the student explicitly asks for options, recommendations, or alternatives.
- Do not use bullet points unless the student clearly asks for a list.
- Do not over-explain.

STYLE:
- Sound natural and human, not robotic.
- Speak like a consultant in a real conversation.
- Be confident, but not exaggerated.
- Be honest and realistic.
- Do not sound like a search engine or database reader.

STRICT DON'TS:
- Never mention database, context, retrieval, documents, chunks, sources, search results, or reasoning.
- Never say phrases like "based on the data", "from the context", "according to the retrieved information", or "I found".
- Never dump raw fields mechanically.
- Never repeat the same requirement multiple times.
- Never invent facts that are not supported by the provided information.
- Never imply guaranteed admission.
- Never mention the student's name, GPA, or test scores back to them unless they specifically ask about their own profile.
- Never say things like "with your X GPA" or "given your IELTS of Y" unless the student explicitly asked you to assess their profile.
- Never reveal that you have a student profile or eligibility list. Use the information silently.

SCHOLARSHIP ANSWERING RULES:
- When scholarship data is provided, use it to give specific, helpful answers.
- Mention 2-4 scholarships by name when asked, with the most important detail (amount, deadline, or eligibility).
- Always include the application link if one is available.
- Do not list every scholarship — pick the best matches for the student's situation.
- If the student's profile shows they are interested in scholarships or need financial aid, prioritize fully funded and government scholarships.
- Never make up scholarships that are not in the provided data.

HOW TO ANSWER BY QUESTION TYPE:

1. If the student asks a direct factual question:
- Answer directly in the first sentence.
- Add only a brief explanation if needed.

2. If the student asks about chances or competitiveness:
- First give a realistic overall assessment.
- Then briefly explain why.
- Keep it honest and balanced.

3. If the student asks what universities they can get into:
- Give a short overall assessment first.
- Then give 2 to 4 relevant examples only if the information supports it.
- Prefer university-level guidance over random program-level details unless the question is specifically about programs.
- If you have eligibility data for this student, prefer universities from that list.

4. If the student asks for another option or more universities:
- Give a few additional relevant examples, not just one unless only one is clearly supported.
- Keep details minimal unless asked.

5. If the student asks about low GPA cases:
- Be realistic but encouraging.
- Emphasize that options may be limited, but do not sound dismissive.

6. If the exact answer is not available:
- Say so briefly and honestly.
- Use: "I'm sorry, I don't have enough information on that."

PERSONALIZATION (IMPORTANT):
- If a student profile or eligibility list is provided in the prompt, use it silently to shape your answer.
- Only reference the student's scores or profile details if they directly asked about their own situation (e.g. "am I eligible", "can I get in", "what are my chances").
- Even then, be brief — say something like "based on your profile, you'd be a competitive applicant for..." rather than reciting their numbers.
- If an eligibility list is provided and the student asks for university suggestions, draw from that list.

PRIORITY:
- Insight over raw numbers.
- Relevance over completeness.
- Natural phrasing over structured dumping.

GOOD RESPONSE EXAMPLES:

Example 1:
Student: "Does Princeton offer computer science?"
Answer: "Yes, Princeton does offer Computer Science, and it's one of its strongest areas. It's a highly competitive option, especially for international applicants."

Example 2:
Student: "How competitive is Oxford for a Pakistani applicant?"
Answer: "Oxford is extremely competitive for any applicant, and especially so for international students. A Pakistani applicant would usually need outstanding grades, a very strong overall profile, and an excellent application."

Example 3:
Student: "Which US uni can I get into with a 2.6 GPA?"
Answer: "A 2.6 GPA makes US options more limited, so you would need to target less competitive and more flexible universities. Admission is still possible, but the overall range will be narrower."

Example 4:
Student: "Any other university?"
Answer: "Yes, you could also look at a few other similar options, depending on the country and program level. The best alternatives would be universities with slightly more flexible entry requirements."

Example 5:
Student: "Are there any scholarships for Pakistani students in the UK?"
Answer: "Yes, there are several options worth looking at. The Chevening Scholarship is one of the most well-known government-funded options for Pakistani students. The Commonwealth Scholarship is another strong choice if you're aiming for postgraduate study. Both are fully funded and have competitive but fair selection processes."

FINAL RULE:
Always give the shortest natural answer that still feels helpful."""


# ══════════════════════════════════════════════════════════════════
# 7. GROQ LLM CALL
# ══════════════════════════════════════════════════════════════════

def ask_groq(client, user_message, retrieved_chunks, conversation_history,
             profile_context="", eligibility_summary="", scholarship_context=""):
    if not retrieved_chunks and not scholarship_context:
        return "I'm sorry, I don't have enough information on that."

    context_str = "\n".join(r["chunk"]["text"] for r in retrieved_chunks)

    # Build extra context block — only included if non-empty
    extra = ""
    if profile_context:
        extra += f"\n\n{profile_context}"
    if eligibility_summary:
        extra += f"\n\n{eligibility_summary}"
    if scholarship_context:
        extra += f"\n\n{scholarship_context}"

    rag_message = f"""Use the information below to answer the student's question naturally and briefly.{extra}

Information:
{context_str}

Student's question: {user_message}

Give a short, natural, consultant-style response."""

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    for msg in conversation_history[-6:]:
        messages.append(msg)
    messages.append({"role": "user", "content": rag_message})

    response = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=messages,
        temperature=0.2,
        max_tokens=320,
    )

    return response.choices[0].message.content.strip()


# ══════════════════════════════════════════════════════════════════
# 8. STARTUP & ROUTES
# ══════════════════════════════════════════════════════════════════

@app.on_event("startup")
async def startup_event():
    global embed_model, faiss_index, chunks, groq_client

    if not GROQ_API_KEY:
        print("❌  GROQ_API_KEY not set in .env")
        sys.exit(1)

    groq_client = Groq(api_key=GROQ_API_KEY)

    print(f"\n🤖 Loading embedding model: {EMBED_MODEL} …")
    embed_model = SentenceTransformer(EMBED_MODEL)
    print("   ✅ Embedding model loaded!")

    if cache_is_valid():
        faiss_index, chunks = load_from_cache()
    else:
        print("⚠️  No valid cache found — running first-time setup …")
        try:
            non_us_prog, non_us_uni, us_prog, us_uni = load_data()
        except FileNotFoundError as e:
            print(f"\n❌  CSV not found: {e}")
            print("    All 4 CSV files must be in chatbot_data/ folder.\n")
            sys.exit(1)
        chunks = build_chunks(non_us_prog, non_us_uni, us_prog, us_uni)
        faiss_index = build_and_save_to_cache(chunks, embed_model)

    print("\n✅ Chatbot API is ready!\n")


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest):
    results = retrieve(req.message, embed_model, faiss_index, chunks)
    profile_context = build_profile_context(req.profile) if req.profile else ""

    # ── Scholarship integration ──────────────────────────────────
    scholarship_context = ""
    if is_scholarship_question(req.message):
        country      = extract_country_from_message(req.message)
        degree_level = extract_degree_from_message(req.message)

        # Also pull country/degree from profile if not found in message
        if not country and req.profile:
            pref = req.profile.get("preferredCountries", [])
            if isinstance(pref, list) and pref:
                country = pref[0]
            elif isinstance(pref, str):
                country = pref
        if not degree_level and req.profile:
            lvl = req.profile.get("preferredStudyLevel", "")
            if "master" in lvl.lower():
                degree_level = "Master"
            elif "bachelor" in lvl.lower():
                degree_level = "Bachelor"

        # Use student's field of study as domain if available
        domain = "Computer Science"
        if req.profile:
            field = req.profile.get("fieldOfStudy", "")
            if field:
                domain = field

        scholarship_context = fetch_scholarships_for_chatbot(country, degree_level, domain)
        if scholarship_context:
            print(f"✅ Scholarship context injected for: country={country!r}, degree={degree_level!r}, domain={domain!r}")
        else:
            print("⚠️  Scholarship fetch returned empty — answering without scholarship data")
    # ─────────────────────────────────────────────────────────────

    reply = ask_groq(
        groq_client,
        req.message,
        results,
        req.history,
        profile_context=profile_context,
        eligibility_summary=req.eligibility_summary or "",
        scholarship_context=scholarship_context,
    )
    return ChatResponse(reply=reply)