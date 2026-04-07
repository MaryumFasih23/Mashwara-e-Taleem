import json
import re
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).resolve().parents[1]
US_ELIG_DIR = BASE_DIR / "us_unis_eligibility"
NON_US_ELIG_DIR = BASE_DIR / "unielig_non_us"
US_PROGRAMS_PATH = BASE_DIR / "us_unis_programs" / "us_programs_dataset.csv"
NON_US_PROGRAMS_PATH = BASE_DIR / "prog_Eligibility" / "mashwara_programs_dataset_fixed.csv"


def to_float(value, default=0.0):
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip()
    if not text:
        return default
    cleaned = re.sub(r"[^0-9.\-]", "", text)
    if not cleaned:
        return default
    try:
        return float(cleaned)
    except ValueError:
        return default


def clamp(value, min_value, max_value):
    return max(min(value, max_value), min_value)


def normalize_gpa(cgpa, cgpa_out_of):
    gpa = to_float(cgpa, default=0.0)
    out_of = to_float(cgpa_out_of, default=0.0)

    if gpa <= 0:
        return 0.0
    if out_of > 0:
        return clamp((gpa / out_of) * 4.0, 0.0, 4.0)
    if gpa <= 4.0:
        return gpa
    if gpa <= 10.0:
        return (gpa / 10.0) * 4.0
    if gpa <= 100.0:
        return (gpa / 100.0) * 4.0
    return 0.0


def estimate_act_from_sat(sat):
    if sat <= 0:
        return 0.0
    estimated = round(((sat - 400) * 35) / 1200 + 1)
    return clamp(float(estimated), 1.0, 36.0)


def map_toefl(toefl_score):
    toefl = to_float(toefl_score, default=0.0)
    if 0 < toefl <= 12:
        toefl = toefl * 12
    return clamp(toefl, 0.0, 120.0)


def map_duolingo(duolingo_score, ielts_score):
    duo = to_float(duolingo_score, default=0.0)
    if duo > 0:
        return clamp(duo, 10.0, 160.0)

    ielts = to_float(ielts_score, default=0.0)
    if ielts > 0:
        estimated = 55 + ielts * 10
        return clamp(estimated, 10.0, 160.0)
    return 0.0


def normalize_work_exp(work_exp):
    return clamp(to_float(work_exp, default=0.0), 0.0, 25.0)


def build_student_profile(raw_profile):
    sat = clamp(to_float(raw_profile.get("sat"), default=0.0), 0.0, 1600.0)
    act = clamp(to_float(raw_profile.get("act"), default=0.0), 0.0, 36.0)

    warnings = []

    if act <= 0 and sat > 0:
        act = estimate_act_from_sat(sat)
        warnings.append("ACT was not present; estimated ACT from SAT.")

    profile = {
        "cgpa": normalize_gpa(raw_profile.get("cgpa"), raw_profile.get("cgpaOutOf")),
        "ielts": clamp(to_float(raw_profile.get("ielts"), default=0.0), 0.0, 9.0),
        "ielts_band": clamp(to_float(raw_profile.get("ieltsBand"), default=0.0), 0.0, 9.0),
        "toefl": map_toefl(raw_profile.get("toefl")),
        "duolingo": map_duolingo(raw_profile.get("duolingo"), raw_profile.get("ielts")),
        "gre": clamp(to_float(raw_profile.get("greTotal"), default=0.0), 0.0, 340.0),
        "sat": sat,
        "act": act,
        "work_exp": normalize_work_exp(raw_profile.get("workExperience")),
    }

    if profile["cgpa"] <= 0:
        warnings.append("CGPA was missing or invalid; using 0.")
    if profile["ielts"] <= 0:
        warnings.append("IELTS was missing or invalid; using 0.")
    if profile["toefl"] <= 0:
        warnings.append("TOEFL was missing or invalid; using 0.")

    if profile["ielts_band"] <= 0:
        profile["ielts_band"] = profile["ielts"]

    return profile, warnings


def load_us_assets():
    df = pd.read_csv(US_ELIG_DIR / "universities_synced_with_location.csv")
    df.columns = [c.strip() for c in df.columns]
    model = None
    scaler = None
    feature_cols = []

    try:
        model = joblib.load(US_ELIG_DIR / "us_xgb_model.pkl")
        scaler = joblib.load(US_ELIG_DIR / "us_scaler.pkl")
        feature_cols = joblib.load(US_ELIG_DIR / "us_feature_cols.pkl")
    except Exception:
        model = None
        scaler = None
        feature_cols = []

    return df, model, scaler, feature_cols


def load_non_us_assets():
    df = pd.read_csv(NON_US_ELIG_DIR / "Final_data_cleaned (3).csv")
    df.columns = [c.strip() for c in df.columns]
    model = None
    scaler = None
    feature_cols = []

    try:
        model = joblib.load(NON_US_ELIG_DIR / "xgb_model.pkl")
        scaler = joblib.load(NON_US_ELIG_DIR / "scaler.pkl")
        feature_cols = joblib.load(NON_US_ELIG_DIR / "feature_cols.pkl")
    except Exception:
        model = None
        scaler = None
        feature_cols = []

    return df, model, scaler, feature_cols


def safe_qcut(series, bins):
    try:
        return pd.qcut(series.rank(method="first"), q=bins, labels=False, duplicates="drop") + 1
    except ValueError:
        return pd.Series([3] * len(series), index=series.index)


def build_us_features(student, us_df):
    frame = us_df.copy()

    for col in [
        "SAT_Min",
        "SAT_Avg",
        "ACT_Min",
        "ACT_Avg",
        "Tuition_USD",
        "Average_GPA",
        "TOEFL_Min",
        "IELTS_Min",
        "GPA_Min",
        "Scholarship_Mentioned",
        "Scholarship_Percentages",
    ]:
        if col in frame.columns:
            frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(0.0)
        else:
            frame[col] = 0.0

    frame["UNI_RANK"] = frame["SAT_Avg"].rank(ascending=False, method="dense")
    rank_max = max(float(frame["UNI_RANK"].max()), 1.0)
    frame["UNI_RANK_SCORE"] = 1 - (frame["UNI_RANK"] / rank_max)
    frame["UNI_RANK_TIER"] = safe_qcut(frame["UNI_RANK"], bins=5).fillna(3).astype(float)

    frame["UNI_STRICTNESS"] = (
        (frame["GPA_Min"] / 4.0) * 0.45
        + (frame["SAT_Avg"] / 1600.0) * 0.35
        + (frame["IELTS_Min"] / 9.0) * 0.2
    )

    frame["CGPA"] = student["cgpa"]
    frame["IELTS"] = student["ielts"]
    frame["TOEFL"] = student["toefl"]
    frame["SAT"] = student["sat"]
    frame["ACT"] = student["act"]
    frame["GRE_SCORE"] = student["gre"]
    frame["HAS_SAT"] = 1 if student["sat"] > 0 else 0
    frame["HAS_ACT"] = 1 if student["act"] > 0 else 0
    frame["HAS_GRE"] = 1 if student["gre"] > 0 else 0
    frame["WORK_EXP"] = student["work_exp"]

    frame["GPA_MIN_GAP"] = student["cgpa"] - frame["GPA_Min"]
    frame["GPA_AVG_GAP"] = student["cgpa"] - frame["Average_GPA"]
    frame["IELTS_GAP"] = student["ielts"] - frame["IELTS_Min"]
    frame["TOEFL_GAP"] = student["toefl"] - frame["TOEFL_Min"]
    frame["SAT_GAP"] = student["sat"] - frame["SAT_Avg"]
    frame["ACT_GAP"] = student["act"] - frame["ACT_Avg"]

    frame["UNI_GPA_MIN"] = frame["GPA_Min"]
    frame["UNI_GPA_AVG"] = frame["Average_GPA"]
    frame["UNI_IELTS"] = frame["IELTS_Min"]
    frame["UNI_TOEFL"] = frame["TOEFL_Min"]
    frame["UNI_SAT_AVG"] = frame["SAT_Avg"]
    frame["UNI_ACT_AVG"] = frame["ACT_Avg"]
    frame["UNI_TUITION"] = frame["Tuition_USD"]
    frame["UNI_SCHOLAR"] = np.where(
        frame["Scholarship_Percentages"] > 0,
        frame["Scholarship_Percentages"],
        frame["Scholarship_Mentioned"] * 10,
    )

    return frame


def build_non_us_features(student, non_us_df):
    frame = non_us_df.copy()

    for col in [
        "qs_rank",
        "min_ielts",
        "ielts_band",
        "toefl",
        "duolingo",
        "gre",
        "work_exp",
        "min_cgpa",
        "gre_score",
        "tuition_usd",
    ]:
        if col in frame.columns:
            frame[col] = pd.to_numeric(frame[col], errors="coerce").fillna(0.0)
        else:
            frame[col] = 0.0

    rank_max = max(float(frame["qs_rank"].replace(0, np.nan).max() or 1.0), 1.0)
    rank_filled = frame["qs_rank"].replace(0, rank_max)

    frame["UNI_RANK"] = rank_filled
    frame["UNI_RANK_SCORE"] = 1 - (rank_filled / rank_max)
    frame["UNI_RANK_TIER"] = safe_qcut(rank_filled, bins=5).fillna(3).astype(float)
    frame["UNI_STRICTNESS"] = (
        (frame["min_cgpa"] / 4.0) * 0.4
        + (frame["min_ielts"] / 9.0) * 0.3
        + (frame["gre"] * 0.3)
    )

    frame["IELTS"] = student["ielts"]
    frame["IELTS_BAND"] = student["ielts_band"]
    frame["TOEFL"] = student["toefl"]
    frame["DUOLINGO"] = student["duolingo"]
    frame["GRE_SCORE"] = student["gre"]
    frame["HAS_GRE"] = 1 if student["gre"] > 0 else 0
    frame["WORK_EXP"] = student["work_exp"]
    frame["CGPA"] = student["cgpa"]

    frame["CGPA_GAP"] = student["cgpa"] - frame["min_cgpa"]
    frame["IELTS_GAP"] = student["ielts"] - frame["min_ielts"]
    frame["TOEFL_GAP"] = student["toefl"] - frame["toefl"]
    frame["DUOLINGO_GAP"] = student["duolingo"] - frame["duolingo"]
    frame["GRE_GAP"] = student["gre"] - frame["gre_score"]
    frame["WORK_EXP_GAP"] = student["work_exp"] - frame["work_exp"]

    frame["UNI_IELTS"] = frame["min_ielts"]
    frame["UNI_IELTS_BAND"] = frame["ielts_band"]
    frame["UNI_TOEFL"] = frame["toefl"]
    frame["UNI_DUOLINGO"] = frame["duolingo"]
    frame["UNI_GRE"] = frame["gre_score"]
    frame["UNI_GRE_REQ"] = frame["gre"]
    frame["UNI_WORKEXP"] = frame["work_exp"]
    frame["UNI_CGPA"] = frame["min_cgpa"]
    frame["UNI_TUITION"] = frame["tuition_usd"]

    return frame


def infer_probabilities(model, scaler, frame, feature_cols):
    if model is None or not feature_cols:
        if "University" in frame.columns:
            sat_score = np.clip((frame["SAT_GAP"] + 300) / 600, 0.0, 1.0)
            gpa_score = np.clip((frame["GPA_MIN_GAP"] + 0.7) / 1.4, 0.0, 1.0)
            english_score = np.clip((frame["TOEFL_GAP"] + 30) / 60, 0.0, 1.0)
            return np.clip((0.4 * sat_score) + (0.4 * gpa_score) + (0.2 * english_score), 0.0, 1.0)

        gpa_score = np.clip((frame["CGPA_GAP"] + 0.7) / 1.4, 0.0, 1.0)
        ielts_score = np.clip((frame["IELTS_GAP"] + 2.0) / 4.0, 0.0, 1.0)
        toefl_score = np.clip((frame["TOEFL_GAP"] + 35) / 70, 0.0, 1.0)
        return np.clip((0.5 * gpa_score) + (0.3 * ielts_score) + (0.2 * toefl_score), 0.0, 1.0)

    for col in feature_cols:
        if col not in frame.columns:
            frame[col] = 0.0

    x = frame[feature_cols].astype(float).fillna(0.0)

    transformed = x
    if scaler is not None:
        transformed = scaler.transform(x.to_numpy())

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(transformed)[:, 1]
    else:
        raw = model.predict(transformed)
        probs = np.array(raw, dtype=float)

    return np.clip(probs, 0.0, 1.0)


def predict_universities(payload):
    profile, warnings = build_student_profile(payload.get("profile", {}))
    min_prob = clamp(to_float(payload.get("min_prob"), default=0.1), 0.0, 1.0)
    top_k = int(clamp(to_float(payload.get("top_k"), default=5000), 1.0, 10000.0))

    us_df, us_model, us_scaler, us_features = load_us_assets()
    non_us_df, non_us_model, non_us_scaler, non_us_features = load_non_us_assets()

    if us_model is None:
        warnings.append("US model dependency not available. Using fallback scoring for US universities.")
    if non_us_model is None:
        warnings.append("Non-US model dependency not available. Using fallback scoring for non-US universities.")

    us_frame = build_us_features(profile, us_df)
    non_us_frame = build_non_us_features(profile, non_us_df)

    us_probs = infer_probabilities(us_model, us_scaler, us_frame, us_features)
    non_us_probs = infer_probabilities(non_us_model, non_us_scaler, non_us_frame, non_us_features)

    us_frame = us_frame.copy()
    non_us_frame = non_us_frame.copy()

    us_frame["eligibility_probability"] = us_probs
    non_us_frame["eligibility_probability"] = non_us_probs

    us_frame["final_score"] = (0.6 * us_frame["eligibility_probability"]) + (0.4 * us_frame["UNI_RANK_SCORE"])
    non_us_frame["final_score"] = (0.6 * non_us_frame["eligibility_probability"]) + (0.4 * non_us_frame["UNI_RANK_SCORE"])

    us_results = []
    for row in us_frame.itertuples(index=False):
        if float(row.eligibility_probability) < min_prob:
            continue

        us_results.append(
            {
                "university": str(row.University),
                "country": "USA",
                "city": str(row.City),
                "state": str(row.State),
                "location": str(row.Location),
                "qs_rank": int(getattr(row, "UNI_RANK", 0) or 0),
                "tuition_usd": float(row.Tuition_USD),
                "min_gpa": float(row.GPA_Min),
                "avg_gpa": float(row.Average_GPA),
                "min_sat": float(row.SAT_Min),
                "min_act": float(row.ACT_Min),
                "min_toefl": float(row.TOEFL_Min),
                "min_ielts": float(row.IELTS_Min),
                "url": str(row.URL) if str(row.URL) != "nan" else "",
                "eligibility_probability": float(row.eligibility_probability),
                "final_score": float(row.final_score),
                "source_model": "us_unis_eligibility",
            }
        )

    non_us_results = []
    for row in non_us_frame.itertuples(index=False):
        if float(row.eligibility_probability) < min_prob:
            continue

        non_us_results.append(
            {
                "university": str(row.university_name),
                "country": str(row.country),
                "city": "",
                "state": "",
                "location": "",
                "qs_rank": int(float(row.qs_rank)) if float(row.qs_rank) > 0 else 0,
                "tuition_usd": float(row.tuition_usd),
                "min_gpa": float(row.min_cgpa),
                "avg_gpa": 0.0,
                "min_sat": 0.0,
                "min_act": 0.0,
                "min_toefl": float(row.toefl),
                "min_ielts": float(row.min_ielts),
                "url": "",
                "eligibility_probability": float(row.eligibility_probability),
                "final_score": float(row.final_score),
                "source_model": "unielig_non_us",
            }
        )

    combined = us_results + non_us_results
    combined.sort(key=lambda item: item.get("final_score", 0), reverse=True)

    return {
        "results": combined[:top_k],
        "warnings": warnings,
    }


def parse_required_flag(value):
    if value is None:
        return False
    if isinstance(value, (int, float)):
        return float(value) > 0

    text = str(value).strip().lower()
    if not text:
        return False
    if "not required" in text or text in {"no", "false", "0"}:
        return False
    if text in {"yes", "true", "1", "required"}:
        return True
    return "required" in text


def parse_required_years(value):
    if value is None:
        return 0.0
    if isinstance(value, (int, float)):
        return max(float(value), 0.0)

    text = str(value).strip().lower()
    if not text or "not required" in text:
        return 0.0

    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if match:
        return float(match.group(1))

    return 1.0


def score_ratio(actual, required):
    req = max(float(required), 0.0)
    if req <= 0:
        return 1.0
    return clamp(float(actual) / req, 0.0, 1.2)


def normalize_country(country):
    text = str(country or "").strip().lower()
    if text in {"usa", "us", "united states", "united states of america"}:
        return "usa"
    return text


def load_programs_dataset():
    us = pd.read_csv(US_PROGRAMS_PATH)
    non_us = pd.read_csv(NON_US_PROGRAMS_PATH)

    us = us.rename(columns=lambda c: c.strip())
    non_us = non_us.rename(columns=lambda c: c.strip())

    if "country" not in us.columns:
        us["country"] = "USA"

    if "country" not in non_us.columns:
        non_us["country"] = ""

    if "university_url" not in non_us.columns:
        non_us["university_url"] = ""

    if "qs_rank" not in us.columns:
        us["qs_rank"] = np.nan

    all_columns = sorted(set(us.columns).union(set(non_us.columns)))
    us = us.reindex(columns=all_columns)
    non_us = non_us.reindex(columns=all_columns)

    programs = pd.concat([us, non_us], ignore_index=True)

    for col in [
        "tuition_fee_usd",
        "min_ielts_overall",
        "toefl_score",
        "min_gpa",
        "min_gre_score",
        "qs_rank",
    ]:
        if col not in programs.columns:
            programs[col] = 0.0
        programs[col] = pd.to_numeric(programs[col], errors="coerce").fillna(0.0)

    return programs


def predict_programs(payload):
    profile, warnings = build_student_profile(payload.get("profile", {}))
    university = str(payload.get("university", "")).strip()
    country = str(payload.get("country", "")).strip()
    top_k = int(clamp(to_float(payload.get("top_k"), default=50), 1.0, 500.0))

    if not university:
        raise ValueError("University name is required for program eligibility.")

    programs = load_programs_dataset()

    university_lc = university.lower()
    matches = programs[programs["university_name"].astype(str).str.lower() == university_lc].copy()

    if matches.empty:
        matches = programs[
            programs["university_name"].astype(str).str.lower().str.contains(university_lc, na=False)
        ].copy()

    if country:
        expected_country = normalize_country(country)
        matches = matches[
            matches["country"].astype(str).apply(normalize_country) == expected_country
        ].copy()

    if matches.empty:
        return {
            "university": university,
            "country": country,
            "results": [],
            "warnings": warnings + ["No programs found for this university in the datasets."],
        }

    output = []
    for row in matches.itertuples(index=False):
        gre_required = parse_required_flag(getattr(row, "gre_required", None))
        work_required_years = parse_required_years(getattr(row, "work_experience_required", None))

        gpa_score = score_ratio(profile["cgpa"], getattr(row, "min_gpa", 0.0))
        ielts_score = score_ratio(profile["ielts"], getattr(row, "min_ielts_overall", 0.0))
        toefl_score = score_ratio(profile["toefl"], getattr(row, "toefl_score", 0.0))

        if gre_required:
            required_gre = to_float(getattr(row, "min_gre_score", 0.0), default=300.0)
            gre_score = score_ratio(profile["gre"], required_gre)
        else:
            gre_score = 1.0

        if work_required_years > 0:
            work_score = score_ratio(profile["work_exp"], work_required_years)
        else:
            work_score = 1.0

        eligibility_probability = clamp(
            (0.45 * gpa_score)
            + (0.2 * ielts_score)
            + (0.15 * toefl_score)
            + (0.1 * gre_score)
            + (0.1 * work_score),
            0.0,
            1.0,
        )

        output.append(
            {
                "university_name": str(getattr(row, "university_name", "")),
                "country": str(getattr(row, "country", "")),
                "program_name": str(getattr(row, "program_name", "")),
                "degree_type": str(getattr(row, "degree_type", "")),
                "program_level": str(getattr(row, "program_level", "")),
                "program_category": str(getattr(row, "program_category", "")),
                "program_duration_years": to_float(getattr(row, "program_duration_years", 0.0), default=0.0),
                "tuition_fee_usd": to_float(getattr(row, "tuition_fee_usd", 0.0), default=0.0),
                "min_gpa": to_float(getattr(row, "min_gpa", 0.0), default=0.0),
                "min_ielts_overall": to_float(getattr(row, "min_ielts_overall", 0.0), default=0.0),
                "toefl_score": to_float(getattr(row, "toefl_score", 0.0), default=0.0),
                "gre_required": gre_required,
                "min_gre_score": to_float(getattr(row, "min_gre_score", 0.0), default=0.0),
                "work_experience_required": str(getattr(row, "work_experience_required", "")),
                "field_requirements": str(getattr(row, "field_requirements", "")),
                "application_deadline": str(getattr(row, "application_deadline", "")),
                "university_url": str(getattr(row, "university_url", "")),
                "qs_rank": to_float(getattr(row, "qs_rank", 0.0), default=0.0),
                "eligibility_probability": eligibility_probability,
            }
        )

    output.sort(key=lambda item: item["eligibility_probability"], reverse=True)

    return {
        "university": university,
        "country": country,
        "results": output[:top_k],
        "warnings": warnings,
    }


def main():
    payload_raw = sys.stdin.read().strip()
    payload = json.loads(payload_raw) if payload_raw else {}

    mode = str(payload.get("mode", "universities")).strip().lower()

    if mode == "programs":
        result = predict_programs(payload)
    else:
        result = predict_universities(payload)

    print(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        error = {"error": str(exc)}
        print(json.dumps(error, ensure_ascii=True))
        sys.exit(1)
