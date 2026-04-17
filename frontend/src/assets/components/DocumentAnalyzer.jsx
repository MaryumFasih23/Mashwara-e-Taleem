import React, { useState, useRef } from "react";
import "./DocumentAnalyzer.css";
import { analyzeDocument } from "../../api/documentapi";

export default function DocumentAnalyzer() {
  const allowedExtensions = [".pdf", ".docx", ".txt"];
  const maxFileSizeBytes = 10 * 1024 * 1024;
  const [activeTab, setActiveTab]       = useState("ps");
  const [university, setUniversity]     = useState("");
  const [program, setProgram]           = useState("");
  const [file, setFile]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [result, setResult]             = useState(null);
  const [expanded, setExpanded]         = useState({
    lineIssues: true,
    sectionInsights: true,
    toneDetection: true,
    programAlignment: true,
    resumeBullets: true,
  });
  const fileInputRef                    = useRef(null);

  const validateFile = (selected) => {
    if (!selected) return "Please select a file to upload.";
    const lowerName = selected.name.toLowerCase();
    const isAllowed = allowedExtensions.some((ext) => lowerName.endsWith(ext));
    if (!isAllowed) return "Unsupported file type. Please upload a PDF, DOCX, or TXT file.";
    if (selected.size > maxFileSizeBytes) return "File is too large. Please upload a document under 10 MB.";
    return "";
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    const validationError = validateFile(selected);
    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }
    setError("");
    setFile(selected);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const dropped = e.dataTransfer.files[0];
    const validationError = validateFile(dropped);
    if (validationError) {
      setFile(null);
      setError(validationError);
      return;
    }
    setError("");
    setFile(dropped);
  };

  const handleSubmit = async () => {
    const cleanUniversity = university.trim();
    const cleanProgram = program.trim();
    const validationError = validateFile(file);
    if (validationError)    return setError(validationError);
    if (!cleanUniversity)   return setError("Please enter a university name.");
    if (!cleanProgram)      return setError("Please enter a program name.");

    setError("");
    setLoading(true);
    setResult(null);

    try {
      const data = await analyzeDocument({ file, university: cleanUniversity, program: cleanProgram });
      setResult(data);
    } catch (err) {
      setError(
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        "Analysis failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const score          = result?.evaluation?.overall_score ?? 0;
  const label          = result?.evaluation?.overall_quality_label ?? "";
  const strengths      = result?.evaluation?.strengths  ?? [];
  const weaknesses     = result?.evaluation?.weaknesses ?? [];
  const atsScore       = result?.ats_score?.ats_score;
  const grammarScore   = result?.grammar?.grammar_quality_score;
  const grammarErrorCount = result?.grammar?.grammar_error_count ?? result?.grammar?.count ?? 0;
  const domainAlignment = result?.domain_alignment ?? result?.evaluation?.program_specificity?.domain_alignment ?? {};
  const domainScore = domainAlignment?.score;
  const hasDomainMismatch = Boolean(domainAlignment?.is_mismatch);
  const missingKws     = result?.evaluation?.program_specificity?.missing_keywords_to_add ?? [];
  const actionPlan     = result?.evaluation?.action_plan_next_revision ?? [];
  const rawLineIssues  = result?.evaluation?.line_issues;
  const lineIssues     = Array.isArray(rawLineIssues)
    ? rawLineIssues
    : rawLineIssues && typeof rawLineIssues === "object"
    ? [rawLineIssues]
    : [];

  const normalizeWs = (s) =>
    String(s || "")
      .trim()
      .replace(/\s+/g, " ");
  const normalizeIssueText = (s) =>
    normalizeWs(s)
      .replace(/^(original|suggested|improved)\s*:\s*/i, "")
      .replace(/\s+([,.;:!?])/g, "$1")
      .toLowerCase();
  const isNoopIssue = (li) => {
    const o = normalizeWs(li?.original_line);
    const i = normalizeWs(li?.improved_line);
    if (!o || !i) return true;
    if (li?.rule_id === "HEURISTIC_LOWERCASE_SENTENCE_START") return false;
    const comparableOriginal = normalizeIssueText(o);
    const comparableImproved = normalizeIssueText(i);
    if (comparableOriginal === comparableImproved) return true;
    return (
      comparableOriginal.replace(/[^a-z0-9]+/g, "") ===
      comparableImproved.replace(/[^a-z0-9]+/g, "")
    );
  };
  const displayLineIssues = lineIssues.reduce((acc, li) => {
    if (isNoopIssue(li)) return acc;
    const key = [
      li?.line_number ?? "",
      normalizeIssueText(li?.original_line).slice(0, 140),
      String(li?.issue_type || "").toLowerCase(),
      normalizeIssueText(li?.improved_line).slice(0, 140),
    ].join("|");
    if (acc.seen.has(key)) return acc;
    acc.seen.add(key);
    acc.items.push(li);
    return acc;
  }, { seen: new Set(), items: [] }).items;
  const displayedIssueCount = displayLineIssues.length;
  const sanitizeUi = (s) =>
    String(s || "")
      .replace(/\[ADD DETAIL\]/gi, "a specific measurable outcome (e.g., % improvement, users impacted)")
      .replace(/\[ADD\s+METRIC\]/gi, "a number or percentage");
  const sectionAnalysis = result?.evaluation?.section_analysis ?? {};
  const sentenceImprovements =
    result?.evaluation?.sentence_level_improvements ?? [];
  const keywordPlacement =
    result?.evaluation?.program_specificity?.keyword_placement_suggestions ?? [];
  const mismatchNotes =
    result?.evaluation?.program_specificity?.mismatch_notes ?? [];
  const resumeBullets =
    result?.evaluation?.resume_bullet_analysis ?? [];
  const docType = result?.classification?.doc_type;
  const toneReport = result?.tone_detection ?? {};

  const clampScore = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));
  /** Aligned with backend: grammar score tracks visible line-issue count */
  const displayedGrammarScore = clampScore(grammarScore ?? 0);
  const qualityProxy = clampScore(score);
  const atsProxy = typeof atsScore === "number" ? clampScore(atsScore) : qualityProxy;
  const domainProxy = typeof domainScore === "number" ? clampScore(domainScore) : qualityProxy;
  const blendedOverallScore = clampScore(
    displayedGrammarScore * 0.3 + atsProxy * 0.2 + qualityProxy * 0.25 + domainProxy * 0.25
  );
  const displayedOverallScore = hasDomainMismatch
    ? Math.min(blendedOverallScore, 72)
    : blendedOverallScore;

  const heroStats = [
    { label: "Quality Score", value: result ? `${displayedOverallScore}%` : "--" },
    { label: "Grammar Issues", value: result ? grammarErrorCount : "--" },
    { label: "Doc Type", value: result ? docType || "Unknown" : "--" },
    { label: "Keywords Missing", value: result ? missingKws.length : "--" },
  ];

  const scoreToneClass = (value) =>
    value <= 50 ? "da-score-red" : value <= 75 ? "da-score-yellow" : "da-score-green";

  const renderProgress = (title, value, subtitle) => (
    <div className="da-progress-card">
      <div className="da-progress-head">
        <p className="da-tag-label">{title}</p>
        <span className="da-progress-value">{value}%</span>
      </div>
      <div className="da-progress-track">
        <div
          className={`da-progress-fill ${scoreToneClass(value)}`}
          style={{ width: `${value}%` }}
        />
      </div>
      {subtitle && <p className="da-muted">{subtitle}</p>}
    </div>
  );

  const toggleCard = (key) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const visibleItems = (items, isExpanded) =>
    isExpanded ? items : items.slice(0, 2);

  const handleDownloadActionPlan = () => {
    if (!result) return;
    const lines = [];
    lines.push("Document Analyzer - Improvement Plan");
    lines.push(`University: ${university}`);
    lines.push(`Program: ${program}`);
    lines.push("");
    lines.push(`Overall Score: ${displayedOverallScore}% (${label || "N/A"})`);
    lines.push(`Grammar Score: ${displayedGrammarScore}%`);
    if (typeof atsScore === "number") lines.push(`ATS Score: ${clampScore(atsScore)}%`);
    if (toneReport?.tone) lines.push(`Tone: ${toneReport.tone}`);
    lines.push("");

    lines.push("Top Strengths:");
    (strengths.length ? strengths : ["No strengths listed"]).forEach((s) => lines.push(`- ${s}`));
    lines.push("");

    lines.push("Top Weaknesses:");
    (weaknesses.length ? weaknesses : ["No weaknesses listed"]).forEach((w) => lines.push(`- ${w}`));
    lines.push("");

    lines.push("Prioritized Action Plan:");
    (Array.isArray(actionPlan) && actionPlan.length ? actionPlan : ["No action plan listed"]).forEach((a) => {
      const text = typeof a === "string" ? a : `${a.item || ""} ${a.priority ? `(${a.priority})` : ""}`;
      lines.push(`- ${text}`);
    });
    lines.push("");

    lines.push("Line-by-line Issues:");
    (displayLineIssues.length ? displayLineIssues : [{ line_number: "-", issue_type: "none", original_line: "No issues listed", improved_line: "", explanation: "" }]).forEach((li) => {
      lines.push(`- Line ${li.line_number} [${li.issue_type || "issue"}]`);
      if (li.original_line) lines.push(`  Original: ${li.original_line}`);
      if (li.improved_line) lines.push(`  Suggested: ${li.improved_line}`);
      if (li.explanation) lines.push(`  Why: ${li.explanation}`);
    });
    lines.push("");

    lines.push("Section Insights:");
    Object.entries(sectionAnalysis).forEach(([key, sec]) => {
      lines.push(`- ${sec?.title || key}`);
      (sec?.what_is_good || []).forEach((x) => lines.push(`  Good: ${x}`));
      (sec?.what_is_missing || []).forEach((x) => lines.push(`  Missing: ${x}`));
      (sec?.what_to_improve || []).forEach((x) => lines.push(`  Improve: ${x}`));
    });
    lines.push("");

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `document-analyzer-action-plan-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="da-container">
      <section className="da-hero">
        <div className="da-hero-copy">
          <p className="da-kicker">Dashboard Journey</p>
          <h1>Mashwara-e-Taleem Document Analyzer</h1>
          <p>
            Analyze personal statements and resumes with structured scoring, line-level improvements,
            and next-step action plans tailored to your target university and program.
          </p>
        </div>
        <div className="da-stats-grid">
          {heroStats.map((item, index) => (
            <article key={item.label} className="da-stat-card" style={{ animationDelay: `${index * 80}ms` }}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      {/* PAGE TITLE */}
      <h1 className="da-title">Document Workspace</h1>
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
      <div className={result ? "da-main da-main-with-results" : "da-main"}>

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

          {error && <p className="da-error-text">{error}</p>}

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
          <div className="da-home-progress-wrap">
            <div className="da-home-progress-labels">
              <span>Quality completion</span>
              <strong>{result ? displayedOverallScore : 0}%</strong>
            </div>
            <div className="da-home-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={result ? displayedOverallScore : 0}>
              <div className="da-home-progress-fill" style={{ width: `${result ? displayedOverallScore : 0}%` }} />
            </div>
          </div>

          <div className="da-section-card da-overview-card">
            <h3 className="da-section-header">Overall Overview</h3>
            <div className="da-overview-row da-overview-stack">
              {result && (
                <div className="da-score-row">
                  <div className="da-score-box da-score-compact">
                    {`${displayedOverallScore}% — ${label || "—"}`}
                  </div>
                  <div className="da-score-box da-score-compact">
                    {`Grammar ${displayedGrammarScore}%`}
                  </div>
                  {typeof atsScore === "number" && (
                    <div className="da-score-box da-score-compact">
                      {`ATS ${clampScore(atsScore)}%`}
                    </div>
                  )}
                  {typeof domainScore === "number" && (
                    <div className="da-score-box da-score-compact">
                      {`Domain ${clampScore(domainScore)}%`}
                    </div>
                  )}
                </div>
              )}
              {renderProgress(
                "Quality Score",
                result ? displayedOverallScore : 0,
                result ? label : ""
              )}
              {result &&
                renderProgress(
                  "Grammar Score",
                  displayedGrammarScore,
                  `${grammarErrorCount} grammar error(s)`
                )}
              {result &&
                typeof atsScore === "number" &&
                renderProgress("ATS Score", clampScore(atsScore), "Resume ATS readiness")}
              {result &&
                typeof domainScore === "number" &&
                renderProgress(
                  "Domain Alignment Score",
                  clampScore(domainScore),
                  domainAlignment?.message || ""
                )}
            </div>

            <div className="da-overview-lists">
              <div className="da-overview-column">
                <p className="da-tag-label">Top Strengths</p>
                {result && strengths.length > 0 ? (
                  <ul>
                    {strengths.slice(0, 3).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="da-muted">No strengths identified yet.</p>
                )}
              </div>
              <div className="da-overview-column">
                <p className="da-tag-label">Key Weaknesses</p>
                {result && weaknesses.length > 0 ? (
                  <ul>
                    {weaknesses.slice(0, 3).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="da-muted">No major weaknesses detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* LINE-BY-LINE ISSUES CARD */}
          <div className="da-section-card da-issues-card">
            <button
              className="da-accordion-header"
              onClick={() => toggleCard("lineIssues")}
            >
              <h3 className="da-section-header">
                Line-by-line Issues
                {result ? (
                  <span className="da-count-badge">{displayedIssueCount}</span>
                ) : null}
              </h3>
              <span>{expanded.lineIssues ? "Hide" : "Show"}</span>
            </button>
            {!result && <p className="da-muted">Run an analysis to see issues.</p>}
            {result && expanded.lineIssues && displayLineIssues.length === 0 && (
              <p className="da-muted">No substantive line-level edits needed — your text looks strong here.</p>
            )}
            {result && expanded.lineIssues && displayLineIssues.length > 0 && (
              <div className="da-line-issue-list">
                {displayLineIssues
                  .slice()
                  .sort((a, b) => {
                    const sevOrder = { critical: 0, important: 1, minor: 2 };
                    const sa = sevOrder[a.severity] ?? 3;
                    const sb = sevOrder[b.severity] ?? 3;
                    if (sa !== sb) return sa - sb;
                    return (a.line_number ?? 0) - (b.line_number ?? 0);
                  })
                  .map((li, idx) => (
                    <div key={idx} className="da-line-issue-item">
                      <div className="da-line-issue-meta">
                        <span className="da-tag da-tag-line">
                          Line {li.line_number}
                        </span>
                        {li.issue_type && (
                          <span className="da-tag da-tag-type">
                            {(li.issue_type || "").replace(/_/g, " ")}
                          </span>
                        )}
                        {li.severity && (
                          <span
                            className={
                              "da-tag da-tag-severity da-severity-" + li.severity
                            }
                          >
                            {li.severity}
                          </span>
                        )}
                      </div>
                      <div className="da-line-issue-body">
                        {li.original_line && (
                          <p className="da-line-original">
                            <span className="da-inline-label">Original:</span>{" "}
                            {li.original_line}
                          </p>
                        )}
                        {li.improved_line &&
                          !isNoopIssue(li) && (
                          <p className="da-line-improved">
                            <span className="da-inline-label">Suggested:</span>{" "}
                            {sanitizeUi(li.improved_line)}
                          </p>
                        )}
                        {li.explanation && (
                          <p className="da-line-explanation">{sanitizeUi(li.explanation)}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* SENTENCE & SECTION ANALYSIS CARD */}
          <div className="da-section-card da-insights-card">
            <button
              className="da-accordion-header"
              onClick={() => toggleCard("sectionInsights")}
            >
              <h3 className="da-section-header">Sentence &amp; Section Insights</h3>
              <span>{expanded.sectionInsights ? "Hide" : "Show"}</span>
            </button>
            {!result && <p className="da-muted">Run an analysis to see insights.</p>}
            {result && expanded.sectionInsights && (
              <div className="da-section-columns">
                <div className="da-section-column">
                  <p className="da-tag-label">Sentence-level Improvements</p>
                  {sentenceImprovements.length === 0 ? (
                    <p className="da-muted">No specific sentence issues highlighted.</p>
                  ) : (
                    <div className="da-small-scroll">
                      {visibleItems(
                        sentenceImprovements,
                        expanded.sectionInsights
                      ).map((s, i) => (
                        <div key={i} className="da-sentence-item">
                          {s.section && (
                            <p className="da-sentence-section">{s.section}</p>
                          )}
                          {s.original_sentence && (
                            <p className="da-line-original">
                              <span className="da-inline-label">Original:</span>{" "}
                              {s.original_sentence}
                            </p>
                          )}
                          {s.improved_sentence && (
                            <p className="da-line-improved">
                              <span className="da-inline-label">Suggested:</span>{" "}
                              {sanitizeUi(s.improved_sentence)}
                            </p>
                          )}
                          {s.explanation && (
                            <p className="da-line-explanation">{sanitizeUi(s.explanation)}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="da-section-column">
                  <p className="da-tag-label">Section-level Feedback</p>
                  {Object.keys(sectionAnalysis).length === 0 ? (
                    <p className="da-muted">No section-level feedback available.</p>
                  ) : (
                    <div className="da-small-scroll">
                      {visibleItems(
                        Object.entries(sectionAnalysis),
                        expanded.sectionInsights
                      ).map(([key, sec]) => (
                        <div key={key} className="da-section-block">
                          <h4 className="da-section-block-title">
                            {sec.title || key}
                          </h4>
                          <div className="da-section-block-row">
                            <div>
                              <p className="da-mini-heading">What is good</p>
                              {sec.what_is_good && sec.what_is_good.length > 0 ? (
                                <ul>
                                  {sec.what_is_good.map((g, i) => (
                                    <li key={i}>{g}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="da-muted">No highlights noted.</p>
                              )}
                            </div>
                            <div>
                              <p className="da-mini-heading">What is missing</p>
                              {sec.what_is_missing &&
                              sec.what_is_missing.length > 0 ? (
                                <ul>
                                  {sec.what_is_missing.map((m, i) => (
                                    <li key={i}>{m}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="da-muted">Nothing critical flagged.</p>
                              )}
                            </div>
                            <div>
                              <p className="da-mini-heading">What to improve</p>
                              {sec.what_to_improve &&
                              sec.what_to_improve.length > 0 ? (
                                <ul>
                                  {sec.what_to_improve.map((im, i) => (
                                    <li key={i}>{im}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="da-muted">No concrete edits suggested.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* TONE DETECTION CARD */}
          <div className="da-section-card da-tone-card">
            <button
              className="da-accordion-header"
              onClick={() => toggleCard("toneDetection")}
            >
              <h3 className="da-section-header">Tone Detection</h3>
              <span>{expanded.toneDetection ? "Hide" : "Show"}</span>
            </button>
            {!result && <p className="da-muted">Run an analysis to see tone feedback.</p>}
            {result && expanded.toneDetection && (
              <div className="da-tone-summary">
                <span className="da-tag da-tag-type">
                  {toneReport?.tone || "Neutral"}
                </span>
                <p>{toneReport?.message || "Tone feedback is not available."}</p>
                {Array.isArray(toneReport?.informal_words) &&
                  toneReport.informal_words.length > 0 && (
                  <p className="da-keyword-list">
                    <span className="da-inline-label">Words to review:</span>{" "}
                    {toneReport.informal_words.join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* PROGRAM ALIGNMENT CARD */}
          <div className="da-section-card da-program-card">
            <button
              className="da-accordion-header"
              onClick={() => toggleCard("programAlignment")}
            >
              <h3 className="da-section-header">Program Alignment</h3>
              <span>{expanded.programAlignment ? "Hide" : "Show"}</span>
            </button>
            {!result && <p className="da-muted">Run an analysis to see alignment.</p>}
            {result && expanded.programAlignment && (
              <>
                {hasDomainMismatch && (
                  <div className="da-domain-warning">
                    <p className="da-domain-warning-title">
                      Document is well-written but not aligned with target field
                    </p>
                    <p>
                      Target field: {domainAlignment?.target_domain || "Unknown"}.
                      Document appears closer to: {domainAlignment?.document_domain || "Unknown"}.
                    </p>
                  </div>
                )}

                {typeof domainScore === "number" && (
                  <div className="da-domain-summary">
                    {renderProgress(
                      "Domain Alignment Score",
                      clampScore(domainScore),
                      domainAlignment?.message || ""
                    )}
                    {Array.isArray(domainAlignment?.matched_target_keywords) &&
                      domainAlignment.matched_target_keywords.length > 0 && (
                      <p className="da-keyword-list">
                        <span className="da-inline-label">Matched target keywords:</span>{" "}
                        {domainAlignment.matched_target_keywords.join(", ")}
                      </p>
                    )}
                    {Array.isArray(domainAlignment?.document_keywords) &&
                      domainAlignment.document_keywords.length > 0 && (
                      <p className="da-keyword-list">
                        <span className="da-inline-label">Document keywords:</span>{" "}
                        {domainAlignment.document_keywords.slice(0, 12).join(", ")}
                      </p>
                    )}
                  </div>
                )}

                <p className="da-tag-label">Missing / Recommended Keywords</p>
                {missingKws.length === 0 ? (
                  <p className="da-muted">No missing program-specific keywords detected.</p>
                ) : (
                  <p className="da-keyword-list">{missingKws.join(", ")}</p>
                )}

                {keywordPlacement.length > 0 && (
                  <div className="da-small-scroll" style={{ marginTop: 10 }}>
                    {visibleItems(
                      keywordPlacement,
                      expanded.programAlignment
                    ).map((kp, i) => (
                      <div key={i} className="da-keyword-placement-item">
                        <span className="da-tag da-tag-type">
                          {kp.section || "Section"}
                        </span>
                        <p>
                          Add <strong>{kp.keyword}</strong> — {sanitizeUi(kp.suggested_sentence_or_fragment)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {mismatchNotes.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p className="da-tag-label">Document–Program Mismatches</p>
                    <ul>
                      {visibleItems(
                        mismatchNotes,
                        expanded.programAlignment
                      ).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* RESUME BULLETS CARD (RESUME ONLY) */}
          {docType === "RESUME" && (
            <div className="da-section-card da-resume-card">
              <button
                className="da-accordion-header"
                onClick={() => toggleCard("resumeBullets")}
              >
                <h3 className="da-section-header">Resume Bullet Review</h3>
                <span>{expanded.resumeBullets ? "Hide" : "Show"}</span>
              </button>
              {!result && (
                <p className="da-muted">Upload a resume to see bullet feedback.</p>
              )}
              {result && resumeBullets.length === 0 && (
                <p className="da-muted">
                  No individual bullet feedback was generated. Try adding more
                  detailed experience bullets.
                </p>
              )}
              {result && resumeBullets.length > 0 && (
                <div className="da-small-scroll">
                  {visibleItems(resumeBullets, expanded.resumeBullets).map(
                    (b, i) => (
                    <div key={i} className="da-bullet-item">
                      <div className="da-line-issue-meta">
                        {b.section && (
                          <span className="da-tag da-tag-line">{b.section}</span>
                        )}
                        <span className="da-tag da-tag-type">
                          {b.has_action_verb ? "Has action verb" : "Add action verb"}
                        </span>
                        <span className="da-tag da-tag-type">
                          {b.has_metric ? "Has metric" : "Add metric"}
                        </span>
                        {typeof b.program_relevance_score === "number" && (
                          <span className="da-tag da-tag-severity">
                            Relevance {b.program_relevance_score}%
                          </span>
                        )}
                      </div>
                      <p className="da-line-original">
                        <span className="da-inline-label">Bullet:</span>{" "}
                        {b.bullet_text}
                      </p>
                      {b.improved_bullet && (
                        <p className="da-line-improved">
                          <span className="da-inline-label">Suggested:</span>{" "}
                          {sanitizeUi(b.improved_bullet)}
                        </p>
                      )}
                      {Array.isArray(b.issues) && b.issues.length > 0 && (
                        <ul className="da-bullet-issues">
                          {b.issues.map((iss, idx) => (
                            <li key={idx}>{iss}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                  {!expanded.resumeBullets && resumeBullets.length > 2 && (
                    <p className="da-muted">
                      Showing 2 bullets. Click Show to expand full review.
                    </p>
                  )}
                </div>
              )}
              <div className="da-resume-example">
                <p className="da-mini-heading">Example improvement</p>
                <p className="da-line-original">
                  <span className="da-inline-label">Instead of:</span> Built a web app
                </p>
                <p className="da-line-improved">
                  <span className="da-inline-label">Try:</span> Developed a scalable web application using React and Node.js that improved performance by 30%
                </p>
              </div>
            </div>
          )}

          {/* ACTION PLAN CARD */}
          <div className="da-section-card da-action-card">
            <h3 className="da-section-header">Action Plan</h3>
            {!result && <p className="da-muted">Run an analysis to see suggestions.</p>}
            {result && (
              <>
                <p className="da-tag-label">Prioritized Fixes</p>
                {Array.isArray(actionPlan) && actionPlan.length > 0 ? (
                  <ol className="da-action-plan-list">
                    {actionPlan.map((a, i) => (
                      <li key={i}>
                        {typeof a === "string"
                          ? a
                          : `${a.item} ${
                              a.priority ? `(${a.priority} priority)` : ""
                            }`}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="da-muted">No explicit action plan was generated.</p>
                )}
                <button className="da-download-btn" onClick={handleDownloadActionPlan}>
                  Download Full Action Plan
                </button>
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
