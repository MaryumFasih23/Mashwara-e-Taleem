import React, { useState } from "react";
import "./VisaGuidance.css";

const VISA_DATA = {
  US: {
    country: "United States",
    flag: "https://flagcdn.com/w40/us.png",
    visaType: "F-1 Student Visa",
    description:
      "The F-1 visa is the most common student visa for academic studies at accredited US colleges, universities, seminaries, conservatories, academic high schools, or language training programs.",
    steps: [
      "Receive your I-20 form from your US institution after acceptance.",
      "Pay the SEVIS (Student and Exchange Visitor Information System) fee.",
      "Complete the DS-160 online nonimmigrant visa application.",
      "Schedule a visa interview at the nearest US embassy or consulate.",
      "Attend the interview with required documents.",
      "Wait for visa processing and collect your passport.",
    ],
    requirements: [
      "Valid passport (6+ months beyond stay)",
      "Form I-20 from your institution",
      "DS-160 confirmation page",
      "SEVIS fee payment receipt (I-901)",
      "Visa application fee receipt",
      "Proof of financial support",
      "Transcripts & academic records",
      "English proficiency test scores (IELTS / TOEFL)",
      "Acceptance letter from the institution",
    ],
    processingTime: "3–5 weeks on average",
    fee: "~$185 USD (MRV fee)",
    link: "https://travel.state.gov/content/travel/en/us-visas/study/student-visa.html",
  },
  UK: {
    country: "United Kingdom",
    flag: "https://flagcdn.com/w40/gb.png",
    visaType: "Student Visa (formerly Tier 4)",
    description:
      "The UK Student Visa allows you to study at a licensed UK institution (university, college, or independent school) for courses longer than 6 months.",
    steps: [
      "Receive a Confirmation of Acceptance for Studies (CAS) from your institution.",
      "Gather required documents and financial evidence.",
      "Apply online on the UK Visas and Immigration (UKVI) website.",
      "Pay the visa fee and Immigration Health Surcharge (IHS).",
      "Book and attend a biometric appointment.",
      "Wait for a decision and collect your passport or BRP card.",
    ],
    requirements: [
      "Valid passport",
      "Confirmation of Acceptance for Studies (CAS) reference number",
      "Proof of financial means (28 consecutive days of bank statements)",
      "English language proficiency (IELTS UKVI / SELT)",
      "Tuberculosis test results (if applicable)",
      "ATAS certificate (for certain subjects)",
      "Parental consent if under 18",
    ],
    processingTime: "3 weeks within the UK, up to 3 weeks from outside",
    fee: "~£490 (from outside the UK) + IHS levy (~£776/year)",
    link: "https://www.gov.uk/student-visa",
  },
  CA: {
    country: "Canada",
    flag: "https://flagcdn.com/w40/ca.png",
    visaType: "Study Permit",
    description:
      "A Canadian Study Permit authorises foreign nationals to study at a Designated Learning Institution (DLI) in Canada for programs longer than 6 months.",
    steps: [
      "Receive your acceptance letter from a Designated Learning Institution (DLI).",
      "Gather required documents.",
      "Apply online through the IRCC portal or via paper application.",
      "Provide biometrics if required.",
      "Wait for a decision and receive your study permit.",
      "Apply for a port-of-entry study permit letter if studying for less than 6 months.",
    ],
    requirements: [
      "Valid passport",
      "Acceptance letter from a DLI",
      "Proof of financial support",
      "Proof of ties to home country",
      "Immigration medical exam (if required)",
      "Biometrics",
      "Custodian declaration (if under 18)",
    ],
    processingTime: "4–12 weeks (varies by country)",
    fee: "~CAD $150",
    link: "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada/study-permit.html",
  },
  AU: {
    country: "Australia",
    flag: "https://flagcdn.com/w40/au.png",
    visaType: "Student Visa (Subclass 500)",
    description:
      "The Australian Student Visa (Subclass 500) allows you to stay in Australia to study full-time in a registered course.",
    steps: [
      "Receive an electronic Confirmation of Enrolment (CoE) from your institution.",
      "Create an ImmiAccount on the Australian Government's immigration website.",
      "Prepare and upload required documents.",
      "Submit your online application and pay the visa fee.",
      "Provide biometrics and health examinations if requested.",
      "Await the visa decision.",
    ],
    requirements: [
      "Valid passport",
      "Confirmation of Enrolment (CoE)",
      "Proof of financial capacity",
      "Overseas Student Health Cover (OSHC)",
      "English language test results",
      "Genuine Temporary Entrant (GTE) statement",
      "Academic transcripts",
    ],
    processingTime: "75% of applications: ~29 days",
    fee: "~AUD $650",
    link: "https://immi.homeaffairs.gov.au/visas/getting-a-visa/visa-listing/student-500",
  },
  DE: {
    country: "Germany",
    flag: "https://flagcdn.com/w40/de.png",
    visaType: "National Visa (Study) – Type D",
    description:
      "Students from non-EU/EEA countries need a German National Visa (Type D) to study at a German university. After arrival, you convert it to a student residence permit.",
    steps: [
      "Receive an admission letter from a German university (or study college).",
      "Schedule an appointment at the German embassy or consulate in your home country.",
      "Prepare required documents.",
      "Attend the visa appointment and pay the fee.",
      "Wait for the visa decision.",
      "After arrival, register your residence and apply for a residence permit.",
    ],
    requirements: [
      "Valid passport",
      "University admission letter",
      "Proof of financial means (blocked account ~€11,208/year or scholarship)",
      "Health insurance coverage",
      "Language proficiency (German or English depending on course)",
      "Academic certificates and transcripts",
      "Biometric photos",
    ],
    processingTime: "4–12 weeks",
    fee: "~€75",
    link: "https://www.make-it-in-germany.com/en/visa-residence/types/studying",
  },
};

const COUNTRIES = Object.entries(VISA_DATA).map(([code, data]) => ({
  code,
  label: data.country,
  flag: data.flag,
}));

export default function VisaGuidance() {
  const [selected, setSelected] = useState("US");
  const visa = VISA_DATA[selected];

  const heroStats = [
    { label: "Steps", value: visa.steps.length },
    { label: "Documents", value: visa.requirements.length },
    { label: "Processing", value: visa.processingTime },
    { label: "Visa Fee", value: visa.fee },
  ];

  return (
    <div className="visa-container">
      <section className="visa-hero">
        <div className="visa-hero-copy">
          <p className="visa-kicker">Dashboard Journey</p>
          <h1>Plan your student visa journey</h1>
          <p>
            Compare country-specific visa pathways, review mandatory documents, and follow a clear
            step-by-step process from acceptance to approval.
          </p>
        </div>
        <div className="visa-stats-grid">
          {heroStats.map((item, index) => (
            <article key={item.label} className="visa-stat-card" style={{ animationDelay: `${index * 80}ms` }}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </article>
          ))}
        </div>
      </section>

      <h1 className="visa-title">Visa Guidance</h1>
      <p className="visa-subtitle">
        Select a country below to view student visa requirements and step-by-step guidance.
      </p>

      {/* Country tabs */}
      <div className="visa-tabs">
        {COUNTRIES.map(({ code, label, flag }) => (
          <button
            key={code}
            className={`visa-tab${selected === code ? " visa-tab-active" : ""}`}
            onClick={() => setSelected(code)}
          >
            <img src={flag} alt={`${label} flag`} className="visa-tab-flag" />
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="visa-content">
        {/* Header */}
        <div className="visa-header-card">
          <img src={visa.flag} alt={`${visa.country} flag`} className="visa-header-flag" />
          <div>
            <h2 className="visa-header-title">{visa.country}</h2>
            <p className="visa-header-type">{visa.visaType}</p>
          </div>
        </div>

        <p className="visa-desc">{visa.description}</p>

        <div className="visa-meta-row">
          <div className="visa-meta-badge">
            <span className="visa-meta-label">Processing Time</span>
            <span className="visa-meta-value">{visa.processingTime}</span>
          </div>
          <div className="visa-meta-badge">
            <span className="visa-meta-label">Visa Fee</span>
            <span className="visa-meta-value">{visa.fee}</span>
          </div>
        </div>

        <div className="visa-two-col">
          {/* Steps */}
          <div className="visa-section">
            <h3 className="visa-section-title">Step-by-Step Process</h3>
            <ol className="visa-steps visa-steps-cards">
              {visa.steps.map((step, i) => (
                <li key={i} className="visa-step-item visa-step-card">
                  <span className="visa-step-badge">Step {i + 1}</span>
                  <p>{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Requirements */}
          <div className="visa-section">
            <h3 className="visa-section-title">Required Documents</h3>
            <ul className="visa-reqs">
              {visa.requirements.map((req, i) => (
                <li key={i} className="visa-req-item">{req}</li>
              ))}
            </ul>
          </div>
        </div>

        <a
          href={visa.link}
          target="_blank"
          rel="noreferrer"
          className="visa-official-link"
        >
          Visit Official Government Page →
        </a>
      </div>
    </div>
  );
}
