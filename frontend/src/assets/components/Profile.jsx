import React, { useState, useEffect, useContext } from "react";
import "./Profile.css";
import { AuthContext } from "../../AuthContext";
import { getUserProfile, updateUserProfile } from "../../api/userapi";

export default function Profile() {
  const { user, refetchUniversities } = useContext(AuthContext);
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
    ieltsBand: "",
    toefl: "",
    duolingo: "",
    greTotal: "",
    greVerbal: "",
    greQuant: "",
    gmat: "",
    sat: "",
    act: "",
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
          ieltsBand: data.ieltsBand || "",
          toefl: data.toefl || "",
          duolingo: data.duolingo || "",
          greTotal: data.greTotal || "",
          greVerbal: data.greVerbal || "",
          greQuant: data.greQuant || "",
          gmat: data.gmat || "",
          sat: data.sat || "",
          act: data.act || "",
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
    if (file) setDocs((prev) => ({ ...prev, [docKey]: file.name }));
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
      refetchUniversities();
    } catch {
      setSaveMsg("❌ Failed to save. Please try again.");
    }
    setSaving(false);
  };

  // Derived: what study level is the user targeting?
  const isMastersOrHigher = profile.preferredStudyLevel === "Masters";
  const isBachelors = profile.preferredStudyLevel === "Bachelors";

  return (
    <div className="profile-container">

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

      {/* TABS */}
      <div className="profile-tabs">
        {["personal", "academic", "tests", "preferences", "financial", "additional"].map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "tab-btn active" : "tab-btn"}
            onClick={() => setActiveTab(tab)}
          >
            {tab === "personal" && "Personal Info"}
            {tab === "academic" && "Academic"}
            {tab === "tests" && "Test Scores"}
            {tab === "preferences" && "Preferences"}
            {tab === "financial" && "Financial"}
            {tab === "additional" && "Additional"}
          </button>
        ))}
      </div>

      {/* CONTENT CARD */}
      <div className="profile-content-card">

        {/* ── PERSONAL INFO ── */}
        {activeTab === "personal" && (
          <div>
            <h2 className="section-title">Personal Information</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Full Name</label>
                <input name="name" value={profile.name} onChange={handleChange} placeholder="e.g. Ahmed Khan" />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" name="dateOfBirth" value={profile.dateOfBirth} onChange={handleChange} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input name="email" value={profile.email} onChange={handleChange} placeholder="e.g. ahmed@email.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input name="phone" value={profile.phone} onChange={handleChange} placeholder="e.g. +92 300 1234567" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input name="city" value={profile.city} onChange={handleChange} placeholder="e.g. Lahore" />
              </div>
              <div className="form-group">
                <label>Country</label>
                <input name="country" value={profile.country} onChange={handleChange} placeholder="e.g. Pakistan" />
              </div>
            </div>
          </div>
        )}

        {/* ── ACADEMIC ── */}
        {activeTab === "academic" && (
          <div>
            <h2 className="section-title">Academic Background</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Current Education Level</label>
                <select name="educationLevel" value={profile.educationLevel} onChange={handleChange}>
                  <option value="Bachelors">Bachelors</option>
                  <option value="Masters">Masters</option>
                </select>
              </div>
              <div className="form-group">
                <label>Field of Study</label>
                <input name="fieldOfStudy" value={profile.fieldOfStudy} onChange={handleChange} placeholder="e.g. Computer Science" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Institution Name</label>
                <input name="institution" value={profile.institution} onChange={handleChange} placeholder="e.g. LUMS" />
              </div>
              <div className="form-group">
                <label>Graduation Year</label>
                <input name="graduationYear" value={profile.graduationYear} onChange={handleChange} placeholder="e.g. 2025" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>CGPA</label>
                <input name="cgpa" value={profile.cgpa} onChange={handleChange} placeholder="e.g. 3.5" />
              </div>
              <div className="form-group">
                <label>Out of</label>
                <input name="cgpaOutOf" value={profile.cgpaOutOf} onChange={handleChange} placeholder="e.g. 4.0" />
              </div>
            </div>
          </div>
        )}

        {/* ── TEST SCORES ── */}
        {activeTab === "tests" && (
          <div>
            <h2 className="section-title">Standardized Test Scores</h2>

            {/* Context banner based on preferred study level */}
            <div className="test-context-banner">
              <span className="test-context-icon">🎯</span>
              <div>
                <strong>
                  {isBachelors
                    ? "You're targeting Bachelors programs"
                    : "You're targeting Masters / Postgraduate programs"}
                </strong>
                <p>
                  {isBachelors
                    ? "SAT & ACT are required for US undergraduate admissions. English proficiency tests apply to all countries."
                    : "GRE is required or optional at most universities. GMAT is needed for MBA programs. English proficiency tests apply everywhere."}
                </p>
                <span className="test-context-hint">
                  You can change your target level in the <strong>Preferences</strong> tab.
                </span>
              </div>
            </div>

            {/* ── ENGLISH PROFICIENCY (all levels) ── */}
            <div className="test-section-header">
              <span className="test-section-badge badge-all">All Programs</span>
              <h3 className="sub-section-title" style={{ margin: 0 }}>English Proficiency Tests</h3>
            </div>
            <p className="test-section-desc">Required by universities in USA, UK, Canada, Australia, Europe, and most non-English-speaking countries.</p>

            <div className="form-row">
              <div className="form-group">
                <label>
                  IELTS Overall Score
                  <span className="score-range">&nbsp;(0 – 9)</span>
                </label>
                <input
                  name="ielts"
                  value={profile.ielts}
                  onChange={handleChange}
                  placeholder="e.g. 7.0"
                />
              </div>
              <div className="form-group">
                <label>
                  IELTS Minimum Band
                  <span className="score-range">&nbsp;(per section, 0 – 9)</span>
                </label>
                <input
                  name="ieltsBand"
                  value={profile.ieltsBand}
                  onChange={handleChange}
                  placeholder="e.g. 6.5"
                />
                <span className="field-hint">Lowest score across Listening, Reading, Writing, Speaking</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  TOEFL iBT Score
                  <span className="score-range">&nbsp;(0 – 120)</span>
                </label>
                <input
                  name="toefl"
                  value={profile.toefl}
                  onChange={handleChange}
                  placeholder="e.g. 100"
                />
              </div>
              <div className="form-group">
                <label>
                  Duolingo English Test
                  <span className="score-range">&nbsp;(10 – 160)</span>
                </label>
                <input
                  name="duolingo"
                  value={profile.duolingo}
                  onChange={handleChange}
                  placeholder="e.g. 120"
                />
                <span className="field-hint">Accepted by 5,000+ universities worldwide</span>
              </div>
            </div>

            {/* ── UNDERGRADUATE TESTS (Bachelors focus) ── */}
            <div className={`test-section-header ${isMastersOrHigher ? "test-section-dimmed" : ""}`}>
              <span className="test-section-badge badge-bachelors">Bachelors</span>
              <h3 className="sub-section-title" style={{ margin: 0 }}>Undergraduate Admission Tests</h3>
            </div>
            <p className="test-section-desc">
              Required for US undergraduate programs. SAT/ACT are key factors in US university eligibility matching.
              {isMastersOrHigher && (
                <span className="test-not-primary"> Not typically required for Masters programs — fill in only if you have scores.</span>
              )}
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>
                  SAT Score
                  <span className="score-range">&nbsp;(400 – 1600)</span>
                </label>
                <input
                  name="sat"
                  value={profile.sat}
                  onChange={handleChange}
                  placeholder="e.g. 1450"
                  className={isMastersOrHigher ? "input-secondary" : ""}
                />
              </div>
              <div className="form-group">
                <label>
                  ACT Score
                  <span className="score-range">&nbsp;(1 – 36)</span>
                </label>
                <input
                  name="act"
                  value={profile.act}
                  onChange={handleChange}
                  placeholder="e.g. 32"
                  className={isMastersOrHigher ? "input-secondary" : ""}
                />
                <span className="field-hint">If ACT is blank, it will be estimated from your SAT score automatically</span>
              </div>
            </div>

            {/* ── GRADUATE TESTS (Masters focus) ── */}
            <div className={`test-section-header ${isBachelors ? "test-section-dimmed" : ""}`}>
              <span className="test-section-badge badge-masters">Masters / PhD</span>
              <h3 className="sub-section-title" style={{ margin: 0 }}>Graduate Admission Tests</h3>
            </div>
            <p className="test-section-desc">
              GRE is required or optional at most Masters and PhD programs. GMAT is primarily required for MBA programs.
              {isBachelors && (
                <span className="test-not-primary"> Not required for Bachelors programs — fill in only if you have scores.</span>
              )}
            </p>

            <div className="form-row">
              <div className="form-group">
                <label>
                  GRE Total Score
                  <span className="score-range">&nbsp;(260 – 340)</span>
                </label>
                <input
                  name="greTotal"
                  value={profile.greTotal}
                  onChange={handleChange}
                  placeholder="e.g. 320"
                  className={isBachelors ? "input-secondary" : ""}
                />
              </div>
              <div className="form-group">
                <label>
                  GMAT Score
                  <span className="score-range">&nbsp;(200 – 800)</span>
                </label>
                <input
                  name="gmat"
                  value={profile.gmat}
                  onChange={handleChange}
                  placeholder="e.g. 650"
                  className={isBachelors ? "input-secondary" : ""}
                />
                <span className="field-hint">Required for MBA programs at most US universities</span>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>
                  GRE Verbal
                  <span className="score-range">&nbsp;(130 – 170)</span>
                </label>
                <input
                  name="greVerbal"
                  value={profile.greVerbal}
                  onChange={handleChange}
                  placeholder="e.g. 158"
                  className={isBachelors ? "input-secondary" : ""}
                />
              </div>
              <div className="form-group">
                <label>
                  GRE Quantitative
                  <span className="score-range">&nbsp;(130 – 170)</span>
                </label>
                <input
                  name="greQuant"
                  value={profile.greQuant}
                  onChange={handleChange}
                  placeholder="e.g. 162"
                  className={isBachelors ? "input-secondary" : ""}
                />
              </div>
            </div>

            {/* TIP BOX */}
            <div className="profile-test-note">
              💡 <strong>Tip:</strong> Only fill in tests you have actually taken. Blank fields are handled automatically by the eligibility engine. All scores are saved regardless of your target level.
            </div>
          </div>
        )}

        {/* ── PREFERENCES ── */}
        {activeTab === "preferences" && (
          <div>
            <h2 className="section-title">Study Preferences</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Preferred Study Level</label>
                <select name="preferredStudyLevel" value={profile.preferredStudyLevel} onChange={handleChange}>
                  <option value="Bachelors">Bachelors</option>
                  <option value="Masters">Masters</option>
                </select>
              </div>
              <div className="form-group">
                <label>Preferred Countries</label>
                <input name="preferredCountries" value={profile.preferredCountries} onChange={handleChange} placeholder="e.g. USA, UK, Germany" />
                <span className="field-hint">Separate multiple countries with a comma</span>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preferred Programs</label>
                <input name="preferredPrograms" value={profile.preferredPrograms} onChange={handleChange} placeholder="e.g. Computer Science, Data Science" />
              </div>
            </div>
            <div className="form-group">
              <label>Preferred Intake</label>
              <input name="preferredIntakes" value={profile.preferredIntakes} onChange={handleChange} placeholder="e.g. Fall 2026, Spring 2027" />
              <span className="field-hint">Separate multiple intakes with a comma</span>
            </div>
          </div>
        )}

        {/* ── FINANCIAL ── */}
        {activeTab === "financial" && (
          <div>
            <h2 className="section-title">Financial Information</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Budget Min (USD/year)</label>
                <input name="budgetMin" value={profile.budgetMin} onChange={handleChange} placeholder="e.g. 10000" />
              </div>
              <div className="form-group">
                <label>Budget Max (USD/year)</label>
                <input name="budgetMax" value={profile.budgetMax} onChange={handleChange} placeholder="e.g. 50000" />
              </div>
            </div>
            <div className="form-group">
              <label>Financial Aid Preferences</label>
              <div className="checks">
                <label>
                  <input type="checkbox" name="needFinancialAid" checked={profile.needFinancialAid} onChange={handleChange} />
                  {" "}I need financial aid / funding
                </label>
                <label>
                  <input type="checkbox" name="interestedInScholarships" checked={profile.interestedInScholarships} onChange={handleChange} />
                  {" "}I am interested in scholarship opportunities
                </label>
              </div>
            </div>
          </div>
        )}

        {/* ── ADDITIONAL ── */}
        {activeTab === "additional" && (
          <div>
            <h2 className="section-title">Additional Information</h2>
            <div className="form-row">
              <div className="form-group">
                <label>Work Experience (Years)</label>
                <input name="workExperience" value={profile.workExperience} onChange={handleChange} placeholder="e.g. 2" />
                <span className="field-hint">Used for eligibility in Masters and MBA programs</span>
              </div>
              <div className="form-group">
                <label>Number of Publications</label>
                <input name="publications" value={profile.publications} onChange={handleChange} placeholder="e.g. 1" />
              </div>
            </div>
            <div className="form-group checks" style={{ marginBottom: "16px" }}>
              <label>
                <input type="checkbox" name="hasResearchExperience" checked={profile.hasResearchExperience} onChange={handleChange} />
                {" "}I have research experience
              </label>
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
              placeholder="e.g. Pursue research in Artificial Intelligence and contribute to open-source AI"
            />

            <h3 className="sub-section-title">Documents</h3>
            <div className="doc-upload-row">
              {[
                { key: "resume", label: "Resume / CV" },
                { key: "personalStatement", label: "Personal Statement" },
                { key: "transcript", label: "Transcript" },
              ].map(({ key, label }) => (
                <div className="doc-upload-item" key={key}>
                  <span>{label}</span>
                  <label className="doc-upload-btn">
                    {docs[key] ? "Change File" : "Upload"}
                    <input
                      type="file"
                      accept=".pdf,.doc,.docx"
                      style={{ display: "none" }}
                      onChange={(e) => handleDocUpload(e, key)}
                    />
                  </label>
                  {docs[key] && <span className="doc-status uploaded">✅ {docs[key]}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}