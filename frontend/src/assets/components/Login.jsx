import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Login.css";
import loginImage from "../login-image.png";
import { loginWithEmail, loginWithGoogle } from "../../firebaseAuth";
import logo from "../logo.png";
export default function Login() {
const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [touched, setTouched] = useState({ email: false, pw: false });
  const [submitting, setSubmitting] = useState(false);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email) return "Email is required";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "" : "Enter a valid email";
  }, [email, touched.email]);

  const pwError = useMemo(() => {
    if (!touched.pw) return "";
    if (!pw) return "Password is required";
    return pw.length < 6 ? "At least 6 characters" : "";
  }, [pw, touched.pw]);

  const valid = email && pw && !emailError && !pwError;

async function onSubmit(e) {
  e.preventDefault();
  setTouched({ email: true, pw: true });
  if (!valid) return;
  setSubmitting(true);

  try {
    await loginWithEmail(email, pw);

    alert("Login successful!");
    navigate("/dashboard");
    console.log("User logged in successfully");
    // You can navigate to homepage or dashboard here later
  } catch (error) {
    console.error("Login error:", error);
    alert(error.message);
  }

  setSubmitting(false);
}

  return (
    <div className="lp">
<header className="auth-header">
  <div className="auth-header-inner">
    <div className="auth-brand">
      <img src={logo} alt="Mashwara-e-Taleem" className="auth-logo" />
      <span className="auth-title">Mashwara-e-Taleem</span>
    </div>
    <p className="auth-subtitle">Smarter guidance for your study journey</p>
  </div>
</header>


      <main className="lp-shell">
        <section className="lp-card" role="region" aria-label="Login">
          <h1 className="lp-title">Welcome Back</h1>
          <p className="lp-sub">
            Log In to access your dashboard and continue optimizing your
            application process
          </p>

          <form className="lp-form" onSubmit={onSubmit} noValidate>
            <label className="lp-label" htmlFor="email">Email</label>
            <div className={`lp-field ${emailError ? "is-error" : ""}`}>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                aria-invalid={!!emailError}
                aria-describedby="email-help"
              />
            </div>
            {emailError && <div id="email-help" className="lp-help">{emailError}</div>}

            <label className="lp-label" htmlFor="password">Password</label>
            <div className={`lp-field lp-field-pw ${pwError ? "is-error" : ""}`}>
              <input
                id="password"
                type={show ? "text" : "password"}
                placeholder="Enter your password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, pw: true }))}
                aria-invalid={!!pwError}
                aria-describedby="pw-help"
              />
              <button
                type="button"
                className="lp-toggle"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>
            {pwError && <div id="pw-help" className="lp-help">{pwError}</div>}

            <button className="lp-btn" type="submit" disabled={!valid || submitting}>
              {submitting ? "LOGGING IN..." : "LOG IN"}
            </button>
          </form>

          <div className="lp-or" role="separator">OR</div>

          <button type="button" className="lp-google" onClick={async () => {
  try {
    const result = await loginWithGoogle();
    console.log("Google login success:", result.user);
    alert("Logged in with Google!");
    navigate("/dashboard");
  } catch (error) {
    console.error("Google login error:", error);
    alert(error.message);
  }
}}
>
            {/* Inline Google 'G' SVG so it always renders */}
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.678 32.91 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.817C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.646-3.07-11.289-7.437l-6.54 5.036C9.51 39.556 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.316 3.086-4.078 5.437-7.594 6.57.001-.001 7.594 6.57 7.594 6.57C39.044 38.023 44 31.5 44 24c0-1.341-.138-2.65-.389-3.917z"/>
            </svg>
            Continue with Google
          </button>

          <p className="lp-hint">
            Don’t have an Account? <a href="/signup">Sign Up</a>
          </p>
        </section>
        <section className="lp-art">
          <img className="lp-img" src={loginImage} alt="Student ready to travel and study" />
        </section>
      </main>
    </div>
    
  );
}
