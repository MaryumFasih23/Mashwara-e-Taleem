import React, { useState } from "react";
import "./Profile.css";

export default function Profile() {
  const [activeTab, setActiveTab] = useState("personal");

  return (
    <div className="profile-container">

      {/* PAGE TITLE */}
      <h1 className="profile-title">Profile</h1>

      {/* HEADER CARD */}
      <div className="profile-header-card">
        <div className="profile-user-icon">👤</div>

        <div className="profile-info">
          <h2>Maryum Fasih</h2>
          <p>Computer Science • FAST NUCES</p>
          <p>📍 Islamabad, Pakistan &nbsp;&nbsp; 🔘 CGPA: 3.65/4.0</p>
        </div>

        <button className="profile-save-btn">Save Profile</button>
      </div>

      {/* TAB BUTTONS */}
      <div className="profile-tabs">
        <button
          className={activeTab === "personal" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("personal")}
        >
          Personal Info
        </button>

        <button
          className={activeTab === "academic" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("academic")}
        >
          Academic
        </button>

        <button
          className={activeTab === "tests" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("tests")}
        >
          Test Scores
        </button>

        <button
          className={activeTab === "preferences" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("preferences")}
        >
          Preferences
        </button>

        <button
          className={activeTab === "financial" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("financial")}
        >
          Financial
        </button>

        <button
          className={activeTab === "additional" ? "tab-btn active" : "tab-btn"}
          onClick={() => setActiveTab("additional")}
        >
          Additional
        </button>
      </div>

      {/* MAIN CONTENT CARD */}
      <div className="profile-content-card">

        {/* PERSONAL INFO TAB */}
        {activeTab === "personal" && (
          <div>
            <h2 className="section-title">Personal Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input value="Maryum Fasih" />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input value="23/05/2004" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input value="maryumfasih@gmail.com" />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input value="+923001234567" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input value="Islamabad" />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input value="Pakistan" />
              </div>
            </div>
          </div>
        )}

        {/* ACADEMIC TAB */}
        {activeTab === "academic" && (
          <div>
            <h2 className="section-title">Academic Background</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Current Education Level</label>
                <select>
                  <option>Bachelors</option>
                  <option>Masters</option>
                </select>
              </div>

              <div className="form-group">
                <label>Field of Study</label>
                <input value="Computer Science" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Institution Name</label>
                <input value="FAST NUCES" />
              </div>

              <div className="form-group">
                <label>Graduation Year</label>
                <input value="2026" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>CGPA</label>
                <input value="3.65" />
              </div>

              <div className="form-group">
                <label>Out of</label>
                <input value="4.0" />
              </div>
            </div>
          </div>
        )}

        {/* TEST SCORES TAB */}
        {activeTab === "tests" && (
          <div>
            <h2 className="section-title">Standardized Test Scores</h2>

            <h3 className="sub-section-title">English Proficiency Tests</h3>
            <div className="form-row">
              <div className="form-group">
                <label>IELTS Overall Score</label>
                <input value="7.5" />
              </div>

              <div className="form-group">
                <label>TOEFL Score</label>
                <input value="110" />
              </div>
            </div>

            <h3 className="sub-section-title">Graduate Admission Tests</h3>
            <div className="form-row">
              <div className="form-group">
                <label>GRE Total Score</label>
                <input value="320" />
              </div>

              <div className="form-group">
                <label>GMAT Score</label>
                <input value="720" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>GRE Verbal</label>
                <input value="160" />
              </div>

              <div className="form-group">
                <label>GRE Quantitative</label>
                <input value="160" />
              </div>
            </div>

            <h3 className="sub-section-title">Undergraduate Admission Tests</h3>
            <div className="form-row">
              <div className="form-group">
                <label>SAT Score</label>
                <input value="1450" />
              </div>
            </div>
          </div>
        )}

        {/* PREFERENCES TAB */}
        {activeTab === "preferences" && (
          <div>
            <h2 className="section-title">Study Preferences</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Preferred Study Level</label>
                <select>
                  <option>Masters</option>
                  <option>Bachelors</option>
                </select>
              </div>

              <div className="form-group">
                <label>Preferred Countries</label>
                <div className="tag-row">
                  <span className="tag">USA</span>
                  <span className="tag">UK</span>
                  <span className="tag">Germany</span>
                  <span className="tag">Australia</span>
                  <span className="tag">France</span>
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Preferred Programs</label>
                <input value="Masters in Computer Science, MS Data Science" />
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Intake</label>
              <div className="tag-row">
                <span className="tag">Fall 2026</span>
                <span className="tag">Spring 2027</span>
                <span className="tag">Fall 2027</span>
              </div>
            </div>
          </div>
        )}

        {/* FINANCIAL TAB */}
        {activeTab === "financial" && (
          <div>
            <h2 className="section-title">Financial Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Budget Range (USD per year)</label>
                <input value="10000" />
              </div>

              <div className="form-group">
                <label>To</label>
                <input value="30000" />
              </div>
            </div>

            <div className="form-group">
              <label>Financial Aid Preferences</label>
              <div className="checks">
                <label><input type="checkbox" /> I need financial aid/funding</label>
                <label><input type="checkbox" /> I am interested in scholarship opportunities</label>
              </div>
            </div>
          </div>
        )}

        {/* ADDITIONAL TAB */}
        {activeTab === "additional" && (
          <div>
            <h2 className="section-title">Additional Information</h2>

            <div className="form-row">
              <div className="form-group">
                <label>Work Experience (Years)</label>
                <input value="1" />
              </div>

              <div className="form-group">
                <label>Number of Publications</label>
                <input value="2" />
              </div>
            </div>

            <div className="form-group checks">
              <label><input type="checkbox" /> I have research experience</label>
            </div>

            <h3 className="sub-section-title">Extracurricular Activities</h3>
            <input value="President of Computer Society, Volunteer at Code for Pakistan" />

            <h3 className="sub-section-title">Career Goals</h3>
            <input value="Pursue research in Artificial Intelligence and Machine Learning" />

            <h3 className="sub-section-title">Documents</h3>
            <div className="tag-row">
              <span className="upload-tag">Resume/CV – Uploaded</span>
              <span className="upload-tag">Personal Statement – Uploaded</span>
              <span className="upload-tag">Transcript – Upload</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
