import React, { useState, useRef } from "react";
import "./DocumentAnalyzer.css";
import { analyzeDocument } from "../../api/documentapi";

export default function DocumentAnalyzer() {
  const [activeTab, setActiveTab]       = useState("ps");
  const [university, setUniversity]     = useState("");
  const [program, setProgram]           = useState("");
  const [file, setFile]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [result, setResult]             = useState(null);
  const fileInputRef                    = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    if (dropped) setFile(dropped);
  };

  const handleSubmit = async () => {
    if (!file)       return setError("Please select a file to upload.");
    if (!university) return setError("Please enter a university name.");
    if (!program)    return setError("Please enter a program name.");

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const data = await analyzeDocument({ file, university, program });
      setResult(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Analysis failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const score    = result?.evaluation?.overall_score ?? 0;
  const label    = result?.evaluation?.overall_quality_label ?? "";
  const strengths   = result?.evaluation?.strengths  ?? [];
  const weaknesses  = result?.evaluation?.weaknesses ?? [];
  const rewrite     = result?.evaluation?.rewrite_output?.improved_document ?? "";
  const atsScore    = result?.ats_score?.ats_score;
  const grammarScore = result?.grammar?.grammar_quality_score;
  const missingKws  = result?.evaluation?.program_specificity?.missing_keywords_to_add ?? [];
  const actionPlan  = result?.evaluation?.action_plan_next_revision ?? [];

  return (
    <div className="da-container">

      {/* PAGE TITLE */}
      <h1 className="da-title">Mashwara-e-Taleem Document Analyzer</h1>
      <p className="da-subtitle">
        Upload your Personal Statement or Resume for AI-powered feedback and improvement suggestions.
      </p>

      {/* TABS */}
      <div className="da-tabs">
        <button
          className={activeTab === "ps" ? "da-tab active" : "da-tab"}
          onClick={() => setActiveTab("ps")}
        >
          Personal Statement
        </button>
        <button
          className={activeTab === "cv" ? "da-tab active" : "da-tab"}
          onClick={() => setActiveTab("cv")}
        >
          Resume / CV
        </button>
      </div>

      {/* MAIN LAYOUT */}
      <div className="da-main">

        {/* LEFT SIDE — UPLOAD BOX */}
        <div className="da-upload-box">

          {/* University + Program inputs */}
          <div style={{ marginBottom: "15px" }}>
            <input
              className="da-input"
              type="text"
              placeholder="Target University (e.g. MIT)"
              value={university}
              onChange={(e) => setUniversity(e.target.value)}
            />
            <input
              className="da-input"
              type="text"
              placeholder="Target Program (e.g. Computer Science)"
              value={program}
              onChange={(e) => setProgram(e.target.value)}
              style={{ marginTop: "10px" }}
            />
          </div>

          {/* Drop zone */}
          <div
            className="da-upload-area"
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
          >
            <i className="da-upload-icon">⬆</i>
            <p>{file ? file.name : "Drag and drop your document here"}</p>
            <p>or</p>
            <button className="da-browse" onClick={() => fileInputRef.current.click()}>
              Browse Files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt"
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
          </div>

          {error && <p style={{ color: "red", marginTop: "10px", fontWeight: 600 }}>{error}</p>}

          <button
            className="da-submit"
            onClick={handleSubmit}
            disabled={loading}
            style={{ marginTop: "18px", width: "100%" }}
          >
            {loading ? "Analyzing…" : "Analyze Document"}
          </button>
        </div>

        {/* RIGHT SIDE — RESULTS */}
        <div className="da-results">
          <h3 className="da-result-title">Quality Score:</h3>
          <div className="da-score-box">
            {result ? `${score}% — ${label}` : "0%"}
          </div>

          {result && grammarScore !== undefined && (
            <>
              <h3 className="da-result-title">Grammar Score:</h3>
              <div className="da-score-box">{grammarScore}%</div>
            </>
          )}

          {result && atsScore !== undefined && (
            <>
              <h3 className="da-result-title">ATS Score:</h3>
              <div className="da-score-box">{atsScore}%</div>
            </>
          )}

          <h3 className="da-result-title">Feedback:</h3>
          <div className="da-feedback-box">
            {!result && <p>No feedback yet.</p>}
            {result && (
              <>
                {strengths.length > 0 && (
                  <>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>✅ Strengths:</p>
                    <ul style={{ paddingLeft: 18, marginBottom: 10 }}>
                      {strengths.map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                  </>
                )}
                {weaknesses.length > 0 && (
                  <>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>❌ Weaknesses:</p>
                    <ul style={{ paddingLeft: 18, marginBottom: 10 }}>
                      {weaknesses.map((w, i) => <li key={i}>{w}</li>)}
                    </ul>
                  </>
                )}
                {missingKws.length > 0 && (
                  <>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>🔑 Missing Keywords:</p>
                    <p style={{ marginBottom: 10 }}>{missingKws.join(", ")}</p>
                  </>
                )}
                {actionPlan.length > 0 && (
                  <>
                    <p style={{ fontWeight: 700, marginBottom: 4 }}>📌 Action Plan:</p>
                    <ol style={{ paddingLeft: 18 }}>
                      {actionPlan.map((a, i) => <li key={i}>{a}</li>)}
                    </ol>
                  </>
                )}
              </>
            )}
          </div>

          {rewrite && (
            <>
              <h3 className="da-result-title">Improved Document:</h3>
              <textarea
                className="da-feedback-box"
                style={{ height: "250px", resize: "vertical", fontFamily: "monospace", fontSize: 13 }}
                readOnly
                value={rewrite}
              />
            </>
          )}
        </div>

      </div>
    </div>
  );
}