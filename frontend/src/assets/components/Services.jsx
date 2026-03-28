import React from "react";
import "./Services.css";
import service1 from "../service1.png";
import service2 from "../service2.png";
import service3 from "../service3.png";
import service4 from "../service4.png";
import service5 from "../service5.png";
import service6 from "../service6.png";

const SERVICES = [
  {
    image: service1,
    title: "AI Chatbot Consultant",
    desc: "Get instant answers to your queries with our intelligent chatbot that provides step-by-step guidance throughout your application journey.",
  },
  {
    image: service2,
    title: "SOP & Resume Analysis",
    desc: "Upload your documents and receive detailed AI-powered feedback with actionable improvement suggestions to strengthen your application.",
  },
  {
    image: service3,
    title: "Profile Matching & Scoring",
    desc: "Advanced algorithms evaluate your profile against university requirements and provide eligibility scores for better decision-making.",
  },
  {
    image: service4,
    title: "University Recommendations",
    desc: "Discover personalized university and program suggestions tailored to your academic background, budget, and career goals.",
  },
  {
    image: service5,
    title: "Scholarship Finder",
    desc: "Access curated scholarship opportunities and financial aid options with advanced filtering to match your profile and needs.",
  },
  {
    image: service6,
    title: "Progress Analytics",
    desc: "Track your application readiness with detailed analytics and insights to monitor improvements over time.",
  },
];

const Services = () => {
  return (
    <section className="services-section" id="services">
      <h2 className="services-heading">
        Everything You Need for a Strong Application
      </h2>

      <div className="services-grid">
        {SERVICES.map((service, index) => (
          <div className="service-card" key={index}>
            <div className="service-image">
              <img src={service.image} alt={service.title} />
            </div>
            <h3>{service.title}</h3>
            <p>{service.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Services;
