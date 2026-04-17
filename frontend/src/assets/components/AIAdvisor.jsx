import React, { useState, useRef, useEffect } from "react";
import "./AIAdvisor.css";

const QUICK_QUESTIONS = [
  "Suggest universities within my budget.",
  "Find scholarships I'm eligible for.",
  "When should I start my university applications?",
  "Which part of my profile is the weakest?",
];

const API_URL = "http://localhost:5000/api/chatbot/chat";

export default function AIAdvisor() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Welcome to Mashwara-e-Taleem! I'm your AI study abroad advisor. How can I help you today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const getHistory = () =>
    messages
      .filter((m) => m.role !== "error")
      .map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.text,
      }));

  const sendMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg = { role: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: getHistory() }),
      });

      if (!res.ok) throw new Error(`Server error ${res.status}`);
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "error",
          text: "Sorry, I couldn't connect to the advisor. Please make sure the chatbot server is running.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <div className="ai-container">
      <h1 className="ai-title">Mashwara-e-Taleem AI Advisor</h1>

      {/* QUICK QUESTIONS — only show when chat is fresh */}
      {messages.length === 1 && (
        <div className="ai-quick-section">
          <h3 className="ai-quick-title">Quick Questions:</h3>
          <div className="ai-quick-buttons">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                className="ai-quick-btn"
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CHAT WINDOW */}
      <div className="ai-chat-window">
        {messages.map((msg, i) => (
          <div key={i} className={`ai-bubble-row ai-bubble-row--${msg.role}`}>
            {msg.role === "assistant" && (
              <span className="ai-avatar-icon">💬</span>
            )}
            <div className={`ai-bubble ai-bubble--${msg.role}`}>
              {msg.text}
            </div>
          </div>
        ))}

        {loading && (
          <div className="ai-bubble-row ai-bubble-row--assistant">
            <span className="ai-avatar-icon">💬</span>
            <div className="ai-bubble ai-bubble--assistant ai-bubble--typing">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* INPUT */}
      <div className="ai-input-area">
        <input
          type="text"
          placeholder="Type your question here…"
          className="ai-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          disabled={loading}
        />
        <button
          className="ai-send-btn"
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
        >
          ➤
        </button>
      </div>

      <p className="ai-disclaimer">
        AI can make mistakes. Please verify important information.
      </p>
    </div>
  );
}