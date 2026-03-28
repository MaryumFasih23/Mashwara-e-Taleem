import React from "react";
import "./Working.css";

export default function Working() {
  return (
    <section className="working" id="how" aria-labelledby="working-title">
      <div className="working__container">
        <h2 className="working__title" id="working-title">
          Simple Steps to Success
        </h2>

        <div className="steps">
          {/* Step 1 — LEFT layout: [badge][card][spacer] */}
          <div className="step-row step-row--left">
            <span className="badge" aria-hidden="true">1</span>
            <div className="card card--teal">
              <h3 className="card__title">Create Your Profile</h3>
              <p className="card__desc">
                Sign up and build your comprehensive student profile with
                academic credentials, interests, and preferences for your study
                abroad journey.
              </p>
            </div>
            <div className="spacer" />
          </div>

          {/* Step 2 — RIGHT layout: [spacer][card][badge] */}
          <div className="step-row step-row--right">
            <div className="spacer" />
            <div className="card card--peach">
              <h3 className="card__title">Upload Documents</h3>
              <p className="card__desc">
                Submit your Statement of Purpose and resume for AI-powered
                analysis. Our NLP models will evaluate and provide detailed
                feedback.
              </p>
            </div>
            <span className="badge" aria-hidden="true">2</span>
          </div>

          {/* Step 3 — LEFT */}
          <div className="step-row step-row--left">
            <span className="badge" aria-hidden="true">3</span>
            <div className="card card--teal">
              <h3 className="card__title">Get Recommendations</h3>
              <p className="card__desc">
                Receive personalized university, program, and scholarship
                recommendations based on your profile, eligibility, and
                preferences.
              </p>
            </div>
            <div className="spacer" />
          </div>

          {/* Step 4 — RIGHT */}
          <div className="step-row step-row--right">
            <div className="spacer" />
            <div className="card card--peach">
              <h3 className="card__title">Refine & Apply</h3>
              <p className="card__desc">
                Use AI chatbot guidance to improve your application, track your
                progress, and confidently submit to your chosen universities.
              </p>
            </div>
            <span className="badge" aria-hidden="true">4</span>
          </div>
        </div>
      </div>
    </section>
  );
}
