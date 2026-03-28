import React, { useState, useEffect, useContext } from "react";
import "./Profile.css";
import { AuthContext } from "../../AuthContext";
import { getUserProfile, updateUserProfile } from "../../api/userapi";

export default function Profile() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("personal");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [profile, setProfile] = useState({
    name: "",
    email: "",
    dateOfBirth: "",
    phone: "",
    city: "",
    country: "",
    educationLevel: "Bachelors",
    fieldOfStudy: "",
    institution: "",
    graduationYear: "",
    cgpa: "",
    cgpaOutOf: "",
    ielts: "",
    toefl: "",
    greTotal: "",
    gmat: "",
    greVerbal: "",
    greQuant: "",
    sat: "",
    preferredStudyLevel: "Masters",
    preferredCountries: "",
    preferredPrograms: "",
    preferredIntakes: "",
    budgetMin: "",
    budgetMax: "",
    needFinancialAid: false,
    interestedInScholarships: false,
    workExperience: "",
    publications: "",
    hasResearchExperience: false,
    extracurriculars: "",
    careerGoals: "",
  });

  // Document upload state
  const [docs, setDocs] = useState({
    resume: null,
    personalStatement: null,
    transcript: null,
  });

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid)
      .then((data) => {
        setProfile({
          name: data.name || "",
          email: data.email || "",
          dateOfBirth: data.dateOfBirth || "",
          phone: data.phone || "",
          city: data.city || "",
          country: data.country || "",
          educationLevel: data.educationLevel || "Bachelors",
          fieldOfStudy: data.fieldOfStudy || "",
          institution: data.institution || "",
          graduationYear: data.graduationYear || "",
          cgpa: data.cgpa || "",
          cgpaOutOf: data.cgpaOutOf || "",
          ielts: data.ielts || "",
          toefl: data.toefl || "",
          greTotal: data.greTotal || "",
          gmat: data.gmat || "",
          greVerbal: data.greVerbal || "",
          greQuant: data.greQuant || "",
          sat: data.sat || "",
          preferredStudyLevel: data.preferredStudyLevel || "Masters",
          preferredCountries: (data.preferredCountries || []).join(", "),
          preferredPrograms: data.preferredPrograms || "",
          preferredIntakes: (data.preferredIntakes || []).join(", "),
          budgetMin: data.budgetMin || "",
          budgetMax: data.budgetMax || "",
          needFinancialAid: data.needFinancialAid || false,
          interestedInScholarships: data.interestedInScholarships || false,
          workExperience: data.workExperience || "",
          publications: data.publications || "",
          hasResearchExperience: data.hasResearchExperience || false,
          extracurriculars: data.extracurriculars || "",
          careerGoals: data.careerGoals || "",
        });
      })
      .catch((err) => console.error("Failed to load profile:", err));
  }, [user]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setProfile((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleDocUpload = (e, docKey) => {
    const file = e.target.files[0];
    if (file) {
      setDocs((prev) => ({ ...prev, [docKey]: file.name }));
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSaveMsg("");
    try {
      const payload = {
        ...profile,
        preferredCountries: profile.preferredCountries.split(",").map((s) => s.trim()).filter(Boolean),
        preferredIntakes: profile.preferredIntakes.split(",").map((s) => s.trim()).filter(Boolean),
      };
      await updateUserProfile(user.uid, payload);
      setSaveMsg("✅ Profile saved successfully!");
    } catch {
      setSaveMsg("❌ Failed to save. Please try again.");
    }
    setSaving(false);
  };

  return (
    <div className="profile-container">

      {/* PAGE TITLE */}
      <h1 className="profile-title">Profile</h1>

      {/* HEADER CARD */}
      <div className="profile-header-card">
        <div className="profile-user-icon">👤</div>

        <div className="profile-info">
          <h2>{profile.name || "Your Name"}</h2>
          <p>{profile.fieldOfStudy || "Field of Study"} • {profile.institution || "Institution"}</p>
          <p>📍 {profile.city || "City"}, {profile.country || "Country"} &nbsp;&nbsp; 🔘 CGPA: {profile.cgpa || "–"}/{profile.cgpaOutOf || "–"}</p>
        </div>

        <button className="profile-save-btn" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      {saveMsg && <p style={{ textAlign: "center", marginTop: "8px" }}>{saveMsg}</p>}

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
                <input name="name" value={profile.name} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={profile.dateOfBirth} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input name="email" value={profile.email} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={profile.phone} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input name="city" value={profile.city} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Country</label>
                <input name="country" value={profile.country} onChange={handleChange} />
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
                <select name="educationLevel" value={profile.educationLevel} onChange={handleChange}>
                  <option>Bachelors</option>
                  <option>Masters</option>
                </select>
              </div>

              <div className="form-group">
                <label>Field of Study</label>
                <input name="fieldOfStudy" value={profile.fieldOfStudy} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Institution Name</label>
                <input name="institution" value={profile.institution} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Graduation Year</label>
                <input name="graduationYear" value={profile.graduationYear} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>CGPA</label>
                <input name="cgpa" value={profile.cgpa} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Out of</label>
                <input name="cgpaOutOf" value={profile.cgpaOutOf} onChange={handleChange} />
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
                <input name="ielts" value={profile.ielts} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>TOEFL Score</label>
                <input name="toefl" value={profile.toefl} onChange={handleChange} />
              </div>
            </div>

            <h3 className="sub-section-title">Graduate Admission Tests</h3>
            <div className="form-row">
              <div className="form-group">
                <label>GRE Total Score</label>
                <input name="greTotal" value={profile.greTotal} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>GMAT Score</label>
                <input name="gmat" value={profile.gmat} onChange={handleChange} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>GRE Verbal</label>
                <input name="greVerbal" value={profile.greVerbal} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>GRE Quantitative</label>
                <input name="greQuant" value={profile.greQuant} onChange={handleChange} />
              </div>
            </div>

            <h3 className="sub-section-title">Undergraduate Admission Tests</h3>
            <div className="form-row">
              <div className="form-group">
                <label>SAT Score</label>
                <input name="sat" value={profile.sat} onChange={handleChange} />
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
                <select name="preferredStudyLevel" value={profile.preferredStudyLevel} onChange={handleChange}>
                  <option>Masters</option>
                  <option>Bachelors</option>
                </select>
              </div>

              <div className="form-group">
                <label>Preferred Countries</label>
                <div className="tag-row">
                  <input name="preferredCountries" value={profile.preferredCountries} onChange={handleChange} placeholder="e.g. USA, UK, Germany" />
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Preferred Programs</label>
                <input name="preferredPrograms" value={profile.preferredPrograms} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Preferred Intake</label>
              <div className="tag-row">
                <input name="preferredIntakes" value={profile.preferredIntakes} onChange={handleChange} placeholder="e.g. Fall 2026, Spring 2027" />
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
                <input name="budgetMin" value={profile.budgetMin} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>To</label>
                <input name="budgetMax" value={profile.budgetMax} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group">
              <label>Financial Aid Preferences</label>
              <div className="checks">
                <label><input type="checkbox" name="needFinancialAid" checked={profile.needFinancialAid} onChange={handleChange} /> I need financial aid/funding</label>
                <label><input type="checkbox" name="interestedInScholarships" checked={profile.interestedInScholarships} onChange={handleChange} /> I am interested in scholarship opportunities</label>
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
                <input name="workExperience" value={profile.workExperience} onChange={handleChange} />
              </div>

              <div className="form-group">
                <label>Number of Publications</label>
                <input name="publications" value={profile.publications} onChange={handleChange} />
              </div>
            </div>

            <div className="form-group checks">
              <label><input type="checkbox" name="hasResearchExperience" checked={profile.hasResearchExperience} onChange={handleChange} /> I have research experience</label>
            </div>

            <h3 className="sub-section-title">Extracurricular Activities</h3>
            <textarea
              className="profile-textarea"
              name="extracurriculars"
              value={profile.extracurriculars}
              onChange={handleChange}
              placeholder="e.g. President of Computer Society, Volunteer at Code for Pakistan"
            />

            <h3 className="sub-section-title">Career Goals</h3>
            <textarea
              className="profile-textarea"
              name="careerGoals"
              value={profile.careerGoals}
              onChange={handleChange}
              placeholder="e.g. Pursue research in Artificial Intelligence and Machine Learning"
            />

            <h3 className="sub-section-title">Documents</h3>
            <div className="doc-upload-row">

              <div className="doc-upload-item">
                <span>Resume / CV</span>
                <label className="doc-upload-btn">
                  {docs.resume ? "Change File" : "Upload"}
                  <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => handleDocUpload(e, "resume")} />
                </label>
                {docs.resume && <span className="doc-status uploaded">✅ {docs.resume}</span>}
              </div>

              <div className="doc-upload-item">
                <span>Personal Statement</span>
                <label className="doc-upload-btn">
                  {docs.personalStatement ? "Change File" : "Upload"}
                  <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => handleDocUpload(e, "personalStatement")} />
                </label>
                {docs.personalStatement && <span className="doc-status uploaded">✅ {docs.personalStatement}</span>}
              </div>

              <div className="doc-upload-item">
                <span>Transcript</span>
                <label className="doc-upload-btn">
                  {docs.transcript ? "Change File" : "Upload"}
                  <input type="file" accept=".pdf,.doc,.docx" style={{ display: "none" }} onChange={(e) => handleDocUpload(e, "transcript")} />
                </label>
                {docs.transcript && <span className="doc-status uploaded">✅ {docs.transcript}</span>}
              </div>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}