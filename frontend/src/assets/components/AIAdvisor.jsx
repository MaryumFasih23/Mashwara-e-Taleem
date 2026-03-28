import React from "react";
import "./AIAdvisor.css";

export default function AIAdvisor() {
  return (
    <div className="ai-container">

      {/* PAGE TITLE */}
      <h1 className="ai-title">Mashwara-e-Taleem AI Advisor</h1>

      {/* INTRO MESSAGE */}
      <div className="ai-intro-box">
        <span className="ai-avatar">💬</span>
        <p className="ai-intro-text">
          Welcome to Mashwara-e-Taleem! I’m your AI study abroad advisor.
          How can I help you today?
        </p>
      </div>

      {/* QUICK QUESTIONS */}
      <div className="ai-quick-section">
        <h3 className="ai-quick-title">Quick Questions:</h3>

        <div className="ai-quick-buttons">
          <button className="ai-quick-btn">Suggest universities within my budget.</button>
          <button className="ai-quick-btn">Find scholarships I'm eligible for.</button>
          <button className="ai-quick-btn">When should I start my university applications?</button>
          <button className="ai-quick-btn">Which part of my profile is the weakest?</button>
        </div>
      </div>

      {/* INPUT BOX */}
      <div className="ai-input-area">
        <input
          type="text"
          placeholder="Type your question here..."
          className="ai-input"
        />
        <button className="ai-send-btn">➤</button>
      </div>

      {/* DISCLAIMER */}
      <p className="ai-disclaimer">
        AI can make mistakes. Please verify important information.
      </p>

    </div>
  );
}
