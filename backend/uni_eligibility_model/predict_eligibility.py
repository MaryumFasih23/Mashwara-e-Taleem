import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
import torch
import torch.nn as nn


BASE_DIR = Path(__file__).resolve().parent
CSV_PATH = BASE_DIR / "universities_profile_filled.csv"
QS_PATH = BASE_DIR / "2026 QS World University Rankings 1.3 (For qs.com).xlsx"
SCALER_PATH = BASE_DIR / "scaler.pkl"
MODEL_PATH = BASE_DIR / "eligibility_model.pt"


device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


class EligibilityNet(nn.Module):
    def __init__(self, input_dim=10):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, 64),
            nn.ReLU(),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Linear(32, 1),
        )

    def forward(self, x):
        return self.net(x)


try:
    df_uni = pd.read_csv(CSV_PATH)
    scaler = joblib.load(SCALER_PATH)

    model = EligibilityNet().to(device)
    model.load_state_dict(torch.load(MODEL_PATH, map_location=device))
    model.eval()

    # --- merge QS rankings ---
    qs_raw = pd.read_excel(QS_PATH, header=None)
    header_row = None
    for _i in range(len(qs_raw)):
        if "Rank" in qs_raw.iloc[_i].astype(str).tolist():
            header_row = _i
            break

    if header_row is not None:
        qs_df = qs_raw.iloc[header_row:].copy()
        qs_df.columns = qs_df.iloc[0]
        qs_df = qs_df.iloc[1:][["Rank", "Name"]]
        qs_df = qs_df[qs_df["Rank"].astype(str).str.contains(r"\d", na=False)]
        qs_df["Rank"] = pd.to_numeric(
            qs_df["Rank"].astype(str).str.replace("=", "", regex=False), errors="coerce"
        )
        qs_df = qs_df.dropna(subset=["Rank"])
        qs_df["Rank"] = qs_df["Rank"].astype(int)
        qs_df = qs_df.rename(columns={"Name": "University"})
        qs_df["University"] = qs_df["University"].str.strip().str.lower()
        df_uni["University"] = df_uni["University"].str.strip().str.lower()
        df_uni = df_uni.merge(qs_df, on="University", how="left")
    else:
        df_uni["Rank"] = 1000

    df_uni["Rank"] = df_uni["Rank"].fillna(1000)
    df_uni["QS_Score"] = 1 / (df_uni["Rank"] + 1)

except Exception as exc:  # pragma: no cover
    sys.stderr.write(f"Model initialization error: {exc}")
    sys.exit(1)


def safe_float(value, default=0.0):
    try:
        return float(value)
    except (TypeError, ValueError):
        return float(default)


def predict_for_all_universities(user, min_prob=0.10, top_k=5000):
    results = []

    for _, uni in df_uni.iterrows():
        x = np.array([
            user["SAT"],
            user["ACT"],
            user["IELTS"],
            user["TOEFL"],
            user["GPA"],
            uni["SAT_Min"],
            uni["ACT_Min"],
            uni["IELTS_Min"],
            uni["TOEFL_Min"],
            uni["Average_GPA"],
        ]).reshape(1, -1)

        x = scaler.transform(x)
        x = torch.tensor(x, dtype=torch.float32).to(device)

        with torch.no_grad():
            prob = torch.sigmoid(model(x)).item()

        # cap probability to avoid everything clustering at 1.0
        prob = min(prob, 0.95)

        if prob >= min_prob:
            qs_score = safe_float(uni.get("QS_Score"), 1 / 1001)
            qs_rank = int(safe_float(uni.get("Rank"), 1000))
            final_score = round((0.4 * prob) + (0.6 * qs_score), 6)

            results.append({
                "university": str(uni.get("University", "")),
                "tuition_usd": safe_float(uni.get("Tuition_USD"), 0),
                "min_gpa": safe_float(uni.get("Average_GPA"), 0),
                "min_sat": safe_float(uni.get("SAT_Min"), 0),
                "min_act": safe_float(uni.get("ACT_Min"), 0),
                "min_toefl": safe_float(uni.get("TOEFL_Min"), 0),
                "min_ielts": safe_float(uni.get("IELTS_Min"), 0),
                "url": str(uni.get("URL", "")),
                "eligibility_probability": round(prob, 4),
                "qs_rank": qs_rank,
                "final_score": final_score,
            })

    # sort by final_score (0.4 * eligibility + 0.6 * QS prestige) — matches original model
    results.sort(key=lambda item: item["final_score"], reverse=True)

    # deduplicate by university name
    seen = set()
    unique = []
    for r in results:
        if r["university"] not in seen:
            unique.append(r)
            seen.add(r["university"])

    return unique[:top_k]


def main():
    try:
        payload = json.loads(sys.stdin.read() or "{}")

        user = {
            "SAT": safe_float(payload.get("SAT", 0)),
            "ACT": safe_float(payload.get("ACT", 0)),
            "IELTS": safe_float(payload.get("IELTS", 0)),
            "TOEFL": safe_float(payload.get("TOEFL", 0)),
            "GPA": safe_float(payload.get("GPA", 0)),
        }

        min_prob = min(max(safe_float(payload.get("min_prob", 0.10)), 0.0), 1.0)
        top_k = int(safe_float(payload.get("top_k", 5000), 5000))
        top_k = min(max(top_k, 1), 10000)

        top_results = predict_for_all_universities(user, min_prob=min_prob, top_k=top_k)

        output = {
            "total_universities": len(top_results),
            "top_results": top_results,
        }
        sys.stdout.write(json.dumps(output))
    except Exception as exc:
        sys.stderr.write(f"Prediction error: {exc}")
        sys.exit(1)


if __name__ == "__main__":
    main()
