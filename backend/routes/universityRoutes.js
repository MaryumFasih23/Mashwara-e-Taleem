import express from "express";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import User from "../models/User.js";

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const inferenceScriptPath = path.join(__dirname, "..", "ml", "recommendation_engine.py");
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
  const ieltsBandRaw = toNumber(user.ieltsBand);
  const toeflRaw = toNumber(user.toefl);
  const greRaw = toNumber(user.greTotal);
  const duolingoRaw = toNumber(user.duolingo);
  const workExperienceRaw = toNumber(user.workExperience);
  const gpa = normalizeGpa(user.cgpa, user.cgpaOutOf);

  const sat = satRaw === null ? null : clamp(satRaw, 0, 1600);

  let act = actRaw;
  let actInferred = false;
  if (act === null && sat !== null && sat > 0) {
    act = estimateActFromSat(sat);
    actInferred = true;
  }
  if (act !== null) {
    act = clamp(act, 0, 36);
  }

  const ielts = ieltsRaw === null ? null : clamp(ieltsRaw, 0, 9);
  const ieltsBand = ieltsBandRaw === null ? null : clamp(ieltsBandRaw, 0, 9);

  let toefl = toeflRaw;
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
      sat: sat ?? 0,
      act: act ?? 0,
      ielts: ielts ?? 0,
      ieltsBand: ieltsBand ?? ielts ?? 0,
      toefl: toefl ?? 0,
      cgpa: gpa ?? 0,
      cgpaOutOf: 4,
      greTotal: greRaw ?? 0,
      duolingo: duolingoRaw ?? 0,
      workExperience: workExperienceRaw ?? 0,
    },
    warnings,
  };
}

function runInference(payload) {
  return new Promise((resolve, reject) => {
    const py = spawn(pythonCmd, [inferenceScriptPath], {
      cwd: path.dirname(inferenceScriptPath),
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
        reject(new Error(stderr || stdout || `Python process failed with exit code ${code}`));
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

    const minProb = Number.isFinite(minProbRaw) ? Math.min(Math.max(minProbRaw, 0), 1) : 0.1;
    const topK = Number.isFinite(topKRaw) ? Math.min(Math.max(Math.trunc(topKRaw), 1), 10000) : 5000;

    const user = await User.findOne({ uid: req.params.uid }).lean();
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const { input, warnings } = buildModelInput(user);
    const inferencePayload = {
      mode: "universities",
      profile: input,
      min_prob: minProb,
      top_k: topK,
    };

    const modelResult = await runInference(inferencePayload);

    if (modelResult?.error) {
      throw new Error(modelResult.error);
    }

    const resultWarnings = [
      ...warnings,
      ...(Array.isArray(modelResult?.warnings) ? modelResult.warnings : []),
    ];

    const results = Array.isArray(modelResult?.results)
      ? modelResult.results
          .filter((item) => Number(item?.eligibility_probability) >= minProb)
          .slice(0, topK)
      : [];

    return res.status(200).json({
      message: "University recommendations generated",
      fromProfileUid: req.params.uid,
      inputUsed: input,
      warnings: resultWarnings,
      totalUniversities: results.length,
      results,
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

router.get("/programs/:uid", async (req, res) => {
  try {
    const university = String(req.query.university || "").trim();
    const country = String(req.query.country || "").trim();
    const topKRaw = Number(req.query.topK);
    const topK = Number.isFinite(topKRaw) ? Math.min(Math.max(Math.trunc(topKRaw), 1), 500) : 50;

    if (!university) {
      return res.status(400).json({ error: "Query param 'university' is required" });
    }

    const user = await User.findOne({ uid: req.params.uid }).lean();
    if (!user) {
      return res.status(404).json({ error: "User profile not found" });
    }

    const { input, warnings } = buildModelInput(user);
    const modelResult = await runInference({
      mode: "programs",
      profile: input,
      university,
      country,
      top_k: topK,
    });

    if (modelResult?.error) {
      throw new Error(modelResult.error);
    }

    return res.status(200).json({
      message: "Program eligibility generated",
      fromProfileUid: req.params.uid,
      university,
      country,
      warnings: [
        ...warnings,
        ...(Array.isArray(modelResult?.warnings) ? modelResult.warnings : []),
      ],
      totalPrograms: Array.isArray(modelResult?.results) ? modelResult.results.length : 0,
      results: Array.isArray(modelResult?.results) ? modelResult.results : [],
    });
  } catch (error) {
    const detail = String(error?.message || "");
    return res.status(500).json({
      error: "Failed to generate program eligibility",
      detail,
    });
  }
});

export default router;
