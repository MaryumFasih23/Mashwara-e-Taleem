import os
import sys
import pickle
import numpy as np
import pandas as pd
import faiss
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
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
    """Both files must exist and be non-empty."""
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

    # Save FAISS index as a proper binary file (much faster to reload)
    faiss.write_index(index, FAISS_INDEX_FILE)

    # Save only chunks (no embeddings needed separately — FAISS file has them)
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
# 4. SYSTEM PROMPT
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

4. If the student asks for another option or more universities:
- Give a few additional relevant examples, not just one unless only one is clearly supported.
- Keep details minimal unless asked.

5. If the student asks about low GPA cases:
- Be realistic but encouraging.
- Emphasize that options may be limited, but do not sound dismissive.

6. If the exact answer is not available:
- Say so briefly and honestly.
- Use: "I'm sorry, I don't have enough information on that."

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

FINAL RULE:
Always give the shortest natural answer that still feels helpful."""


# ══════════════════════════════════════════════════════════════════
# 5. GROQ LLM CALL
# ══════════════════════════════════════════════════════════════════

def ask_groq(client, user_message, retrieved_chunks, conversation_history):
    if not retrieved_chunks:
        return "I'm sorry, I don't have enough information on that."

    context_str = "\n".join(r["chunk"]["text"] for r in retrieved_chunks)

    rag_message = f"""Use the information below to answer the student's question naturally and briefly.

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
        max_tokens=220,
    )

    return response.choices[0].message.content.strip()


# ══════════════════════════════════════════════════════════════════
# 6. STARTUP & ROUTES
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
        # ── FAST PATH: just load from disk, no CSV reading, no encoding ──
        faiss_index, chunks = load_from_cache()
    else:
        # ── FIRST TIME ONLY: read CSVs → build chunks → encode → save ──
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
    reply = ask_groq(groq_client, req.message, results, req.history)
    return ChatResponse(reply=reply)