import React, { useState, useRef, useEffect, useContext } from "react";
import "./AIAdvisor.css";
import { AuthContext } from "../../AuthContext";
import { getUserProfile } from "../../api/userapi";
const QUICK_QUESTIONS = [
  "What is the minimum GPA required for top universities?",
  "Which countries offer the most scholarships for Pakistani students?",
  "What IELTS score do I need for a Masters abroad?",
  "What's the difference between a Masters and an MBA?",
];

const API_URL = "http://localhost:8002/chat";
const CHAT_HISTORY_KEY = "mashwara_chat_history";

// ── Build a compact eligibility summary string from the model results ──
function buildEligibilitySummary(universities) {
  if (!universities || universities.length === 0) return "";

  // Take top 20 by final_score, already sorted by AuthContext
  const top = universities.slice(0, 20);

  const lines = [
    "[ELIGIBILITY MODEL RESULTS — top universities this student is likely eligible for based on their academic profile. Use this list when suggesting universities. Do not mention probabilities or scores to the student.]",
  ];

  top.forEach((u) => {
    const prob = Math.round((u.eligibility_probability || 0) * 100);
    const country = u.country || "";
    const tuition = u.tuition_usd
      ? `$${Math.round(u.tuition_usd).toLocaleString()}/yr`
      : "";
    const rank = u.qs_rank ? `QS #${u.qs_rank}` : "";
    const parts = [country, rank, tuition].filter(Boolean).join(" | ");
    lines.push(`- ${u.university}${parts ? ` (${parts})` : ""} — eligibility ${prob}%`);
  });

  return lines.join("\n");
}

export default function AIAdvisor() {
  const { user, universities } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem(CHAT_HISTORY_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (_) {}
    return [
      {
        role: "assistant",
        text: "Welcome to Mashwara-e-Taleem! I'm your AI study abroad advisor. How can I help you today?",
      },
    ];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  // Fetch profile from MongoDB once user is known
  useEffect(() => {
    if (!user?.uid) return;
    getUserProfile(user.uid)
      .then((data) => setProfile(data))
      .catch(() => setProfile(null));
  }, [user?.uid]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Persist chat history
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    } catch (_) {}
  }, [messages]);

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

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const body = {
        message: trimmed,
        history: getHistory(),
      };

      // Attach cleaned profile (strip MongoDB internals)
      if (profile) {
        const { _id, __v, uid, email, createdAt, updatedAt, ...cleanProfile } = profile;
        body.profile = cleanProfile;
      }

      // Attach eligibility summary from the model (already fetched by AuthContext)
      if (universities && universities.length > 0) {
        body.eligibility_summary = buildEligibilitySummary(universities);
      }

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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

  const clearChat = () => {
    const fresh = [
      {
        role: "assistant",
        text: "Welcome to Mashwara-e-Taleem! I'm your AI study abroad advisor. How can I help you today?",
      },
    ];
    setMessages(fresh);
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(fresh));
    } catch (_) {}
  };

  return (
    <div className="ai-container">
      <div className="ai-header-row">
        <h1 className="ai-title">Mashwara-e-Taleem AI Advisor</h1>
        {messages.length > 1 && (
          <button className="ai-clear-btn" onClick={clearChat} title="Clear chat history">
            🗑 Clear
          </button>
        )}
      </div>

      {/* QUICK QUESTIONS — only when chat is fresh */}
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