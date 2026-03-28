import heroImg from "../hero_image.png"; // or .svg/.jpg
import "./Hero.css";
import { useNavigate } from "react-router-dom";
export default function Hero() {

  const navigate = useNavigate();

  const NavigateToSignup = () =>
  {
    navigate('/signup');
  }

  return (
    <section className="hero" id="home" aria-labelledby="hero-title">
      <div className=" hero__grid">

        <div className="hero__art">
          <img
            src={heroImg}
            alt="Students, books and globe illustration"
            className="hero__img"
            loading="eager"
            // fetchpriority="high"
          />
        </div>


        <div className="hero__copy">
          <h1 id="hero-title" className="hero__title">
            Your Path to International<br className="hide-sm" /> Universities Starts Here
          </h1>

          <p className="hero__subtitle">
            Mashwara-e-Taleem empowers students with AI-driven guidance for
            university applications. Get personalized feedback on your SOP and
            résumé, discover programs that match your profile, and receive
            intelligent insights.
          </p>


        </div>
      </div>
            <div className="hero__ctaRow">
            <div className="hero__ctaBtn"  style = {{cursor: 'pointer'}}
            onClick={NavigateToSignup}>
              Join Now
          </div>
          </div>
    </section>
  );
}
