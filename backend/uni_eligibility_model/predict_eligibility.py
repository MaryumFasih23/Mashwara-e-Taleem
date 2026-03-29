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

        if prob >= min_prob:
            results.append({
                "university": str(uni.get("University", "")),
                "country": None,
                "tuition_usd": safe_float(uni.get("Tuition_USD"), 0),
                "min_gpa": safe_float(uni.get("Average_GPA"), 0),
                "min_sat": safe_float(uni.get("SAT_Min"), 0),
                "min_act": safe_float(uni.get("ACT_Min"), 0),
                "min_toefl": safe_float(uni.get("TOEFL_Min"), 0),
                "min_ielts": safe_float(uni.get("IELTS_Min"), 0),
                "url": str(uni.get("URL", "")),
                "eligibility_probability": round(prob, 4),
            })

    results.sort(key=lambda item: item["eligibility_probability"], reverse=True)
    return results[:top_k]


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
