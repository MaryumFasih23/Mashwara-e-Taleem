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

  const score          = result?.evaluation?.overall_score ?? 0;
  const label          = result?.evaluation?.overall_quality_label ?? "";
  const strengths      = result?.evaluation?.strengths  ?? [];
  const weaknesses     = result?.evaluation?.weaknesses ?? [];
  const rewrite        = result?.evaluation?.rewrite_output?.improved_document ?? "";
  const atsScore       = result?.ats_score?.ats_score;
  const grammarScore   = result?.grammar?.grammar_quality_score;
  const missingKws     = result?.evaluation?.program_specificity?.missing_keywords_to_add ?? [];
  const actionPlan     = result?.evaluation?.action_plan_next_revision ?? [];
  const lineIssues     = result?.evaluation?.line_issues ?? [];
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
          {/* OVERVIEW CARD */}
          <div className="da-section-card">
            <h3 className="da-section-header">Overall Overview</h3>
            <div className="da-overview-row">
              <div className="da-overview-metric">
                <p className="da-tag-label">Quality Score</p>
                <div className="da-score-box">
                  {result ? `${score}% — ${label}` : "0%"}
                </div>
              </div>
              {result && grammarScore !== undefined && (
                <div className="da-overview-metric">
                  <p className="da-tag-label">Grammar</p>
                  <div className="da-score-box">{grammarScore}%</div>
                </div>
              )}
              {result && atsScore !== undefined && (
                <div className="da-overview-metric">
                  <p className="da-tag-label">ATS (Resume)</p>
                  <div className="da-score-box">{atsScore}%</div>
                </div>
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
          <div className="da-section-card">
            <h3 className="da-section-header">Line-by-line Issues</h3>
            {!result && <p className="da-muted">Run an analysis to see issues.</p>}
            {result && lineIssues.length === 0 && (
              <p className="da-muted">No significant line-level issues detected.</p>
            )}
            {result && lineIssues.length > 0 && (
              <div className="da-line-issue-list">
                {lineIssues
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
                            {li.issue_type.replace("_", " ")}
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
                        {li.improved_line && (
                          <p className="da-line-improved">
                            <span className="da-inline-label">Suggested:</span>{" "}
                            {li.improved_line}
                          </p>
                        )}
                        {li.explanation && (
                          <p className="da-line-explanation">{li.explanation}</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* SENTENCE & SECTION ANALYSIS CARD */}
          <div className="da-section-card">
            <h3 className="da-section-header">Sentence &amp; Section Insights</h3>
            {!result && <p className="da-muted">Run an analysis to see insights.</p>}
            {result && (
              <div className="da-section-columns">
                <div className="da-section-column">
                  <p className="da-tag-label">Sentence-level Improvements</p>
                  {sentenceImprovements.length === 0 ? (
                    <p className="da-muted">No specific sentence issues highlighted.</p>
                  ) : (
                    <div className="da-small-scroll">
                      {sentenceImprovements.map((s, i) => (
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
                              {s.improved_sentence}
                            </p>
                          )}
                          {s.explanation && (
                            <p className="da-line-explanation">{s.explanation}</p>
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
                      {Object.entries(sectionAnalysis).map(([key, sec]) => (
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

          {/* PROGRAM ALIGNMENT CARD */}
          <div className="da-section-card">
            <h3 className="da-section-header">Program Alignment</h3>
            {!result && <p className="da-muted">Run an analysis to see alignment.</p>}
            {result && (
              <>
                <p className="da-tag-label">Missing / Recommended Keywords</p>
                {missingKws.length === 0 ? (
                  <p className="da-muted">No missing program-specific keywords detected.</p>
                ) : (
                  <p className="da-keyword-list">{missingKws.join(", ")}</p>
                )}

                {keywordPlacement.length > 0 && (
                  <div className="da-small-scroll" style={{ marginTop: 10 }}>
                    {keywordPlacement.map((kp, i) => (
                      <div key={i} className="da-keyword-placement-item">
                        <span className="da-tag da-tag-type">
                          {kp.section || "Section"}
                        </span>
                        <p>
                          Add <strong>{kp.keyword}</strong> like:{" "}
                          {kp.suggested_sentence_or_fragment}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {mismatchNotes.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <p className="da-tag-label">Document–Program Mismatches</p>
                    <ul>
                      {mismatchNotes.map((m, i) => (
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
            <div className="da-section-card">
              <h3 className="da-section-header">Resume Bullet Review</h3>
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
                  {resumeBullets.map((b, i) => (
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
                          {b.improved_bullet}
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
                </div>
              )}
            </div>
          )}

          {/* ACTION PLAN + FULL REWRITE CARD */}
          <div className="da-section-card">
            <h3 className="da-section-header">Action Plan &amp; Improved Draft</h3>
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

                {rewrite && (
                  <>
                    <p className="da-tag-label" style={{ marginTop: 10 }}>
                      Improved Document (AI Rewrite)
                    </p>
                    <textarea
                      className="da-feedback-box da-rewrite-box"
                      readOnly
                      value={rewrite}
                    />
                  </>
                )}
              </>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}