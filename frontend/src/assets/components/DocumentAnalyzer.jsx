import React, { useState } from "react";
import "./DocumentAnalyzer.css";

export default function DocumentAnalyzer() {
  const [activeTab, setActiveTab] = useState("ps"); // "ps" or "cv"

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
          <div className="da-upload-area">
            <i className="da-upload-icon">⬆</i>
            <p>Drag and drop your document here</p>
            <p>or</p>
            <button className="da-browse">Browse Files</button>
          </div>
        </div>

        {/* RIGHT SIDE — RESULTS */}
        <div className="da-results">
          <h3 className="da-result-title">Quality Score:</h3>
          <div className="da-score-box">0%</div>

          <h3 className="da-result-title">Feedback:</h3>
          <div className="da-feedback-box">
            <p>No feedback yet.</p>
          </div>
        </div>

      </div>
    </div>
  );
}
