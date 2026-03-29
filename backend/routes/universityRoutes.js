import express from "express";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import User from "../models/User.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelScriptPath = path.join(__dirname, "..", "uni_eligibility_model", "predict_eligibility.py");
const pythonCmd = process.env.PYTHON_CMD || "python";

function toNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const cleaned = String(value).replace(/[^0-9.-]/g, "");
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeGpa(cgpa, cgpaOutOf) {
  const gpaValue = toNumber(cgpa);
  const outOfValue = toNumber(cgpaOutOf);

  if (gpaValue === null) return null;

  if (outOfValue && outOfValue > 0) {
    return (gpaValue / outOfValue) * 4;
  }

  if (gpaValue <= 4) return gpaValue;
  if (gpaValue <= 10) return (gpaValue / 10) * 4;
  if (gpaValue <= 100) return (gpaValue / 100) * 4;

  return null;
}

function estimateActFromSat(sat) {
  if (sat === null) return null;
  const estimated = Math.round(((sat - 400) * 35) / 1200 + 1);
  return clamp(estimated, 1, 36);
}

function buildModelInput(user) {
  const satRaw = toNumber(user.sat);
  const actRaw = toNumber(user.act);
  const ieltsRaw = toNumber(user.ielts);
  const toeflRaw = toNumber(user.toefl);
  const gpa = normalizeGpa(user.cgpa, user.cgpaOutOf);

  const sat = satRaw === null ? null : clamp(satRaw, 400, 1600);

  let act = actRaw;
  let actInferred = false;
  if (act === null && sat !== null) {
    act = estimateActFromSat(sat);
    actInferred = true;
  }
  if (act !== null) {
    act = clamp(act, 1, 36);
  }

  const ielts = ieltsRaw === null ? null : clamp(ieltsRaw, 0, 9);

  let toefl = toeflRaw;
  // Profiles sometimes store TOEFL on a /10 scale; map it to /120.
  if (toefl !== null && toefl <= 12) {
    toefl = toefl * 12;
  }
  if (toefl !== null) {
    toefl = clamp(toefl, 0, 120);
  }

  const warnings = [];

  if (sat === null) warnings.push("SAT not found in profile. Using default 0.");
  if (act === null) warnings.push("ACT not found in profile. Using default 0.");
  if (actInferred) warnings.push("ACT not found in profile. Estimated ACT from SAT.");
  if (ielts === null) warnings.push("IELTS not found in profile. Using default 0.");
  if (toefl === null) warnings.push("TOEFL not found in profile. Using default 0.");
  if (gpa === null) warnings.push("CGPA not found or invalid. Using default GPA 0.");

  return {
    input: {
      SAT: sat ?? 0,
      ACT: act ?? 0,
      IELTS: ielts ?? 0,
      TOEFL: toefl ?? 0,
      GPA: gpa ?? 0,
    },
    warnings,
  };
}

function runInference(payload) {
  return new Promise((resolve, reject) => {
    const py = spawn(pythonCmd, [modelScriptPath], {
      cwd: path.dirname(modelScriptPath),
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    py.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    py.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    py.on("error", (error) => {
      reject(error);
    });

    py.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr || `Python process failed with exit code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve(parsed);
      } catch {
        reject(new Error("Failed to parse model output."));
      }
    });

    py.stdin.write(JSON.stringify(payload));
    py.stdin.end();
  });
}

router.get("/recommendations/:uid", async (req, res) => {
  try {
    const minProbRaw = Number(req.query.minProb);
    const topKRaw = Number(req.query.topK);

    const minProb = Number.isFinite(minProbRaw)
      ? Math.min(Math.max(minProbRaw, 0), 1)
      : 0.1;
    const topK = Number.isFinite(topKRaw)
      ? Math.min(Math.max(Math.trunc(topKRaw), 1), 10000)
      : 5000;

    const user = await User.findOne({ uid: req.params.uid }).lean();
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const { input, warnings } = buildModelInput(user);
    const inferencePayload = { ...input, min_prob: minProb, top_k: topK };

    let modelResult = await runInference(inferencePayload);
    let fallbackApplied = false;

    // If strict threshold returns no rows, retry with relaxed threshold so
    // the UI can still show ranked suggestions.
    if (!Array.isArray(modelResult?.top_results) || modelResult.top_results.length === 0) {
      modelResult = await runInference({ ...input, min_prob: 0, top_k: topK });
      fallbackApplied = true;
      warnings.push("No universities matched your current threshold. Showing best available suggestions.");
    }

    return res.status(200).json({
      message: "University recommendations generated",
      fromProfileUid: req.params.uid,
      inputUsed: input,
      warnings,
      fallbackApplied,
      totalUniversities: modelResult.total_universities ?? 0,
      results: modelResult.top_results ?? [],
    });
  } catch (error) {
    const detail = String(error?.message || "");
    const missingPython = detail.includes("ENOENT") || detail.toLowerCase().includes("python");

    return res.status(500).json({
      error: missingPython
        ? "Python runtime not found. Set PYTHON_CMD env var or install Python."
        : "Failed to generate recommendations",
      detail,
    });
  }
});

export default router;
