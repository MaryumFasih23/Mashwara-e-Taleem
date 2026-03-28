import React from "react";
import "./Footer.css";
import { useNavigate } from "react-router-dom";

export default function Footer() {
  const year = new Date().getFullYear();

  const navigate = useNavigate();

  const NavigateToSignup = () =>
  {
    navigate('/signup');
  }

  return (
    <footer className="site-footer" id="contact">
      {/* CTA band */}
      <section className="footer-cta" aria-labelledby="cta-title">
        <div className="footer-container">
          <h2 id="cta-title" className="cta-title">
            Ready to Start Your Journey?
          </h2>
          <p className="cta-subtitle">
            Join Mashwara-e-Taleem today and take the first step toward your
            dream university with AI-powered guidance designed specifically for you.
          </p>

           <button className="mobile-cta" onClick={NavigateToSignup}>
            Get Started
          </button>
        </div>
      </section>

      {/* Legal / credits band */}
      <section className="footer-legal" aria-label="Legal and credits">
        <div className="footer-container legal-inner">
          <p className="legal-line">
            © {year} Mashwara-e-Taleem. Empowering Pakistani students to achieve their dreams.
          </p>
          <p className="legal-line">
            Developed by Maryum Fasih, Mahum Hamid &amp; Muneeb ur Rehman
          </p>
        </div>
      </section>
    </footer>
  );
}
