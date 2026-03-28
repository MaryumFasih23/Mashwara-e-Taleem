import React, { useMemo, useState } from "react";
import "./Signup.css";
import logo from "../logo.png";
import signupImage from "../signup-image.png";
import { signupWithEmail, loginWithGoogle } from "../../firebaseAuth";

export default function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [agree, setAgree] = useState(false);
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    pw: false,
    pw2: false,
  });
  const [submitting, setSubmitting] = useState(false);

  // VALIDATION
  const nameError = useMemo(() => {
    if (!touched.name) return "";
    return name.trim() ? "" : "Full name is required";
  }, [name, touched.name]);

  const emailError = useMemo(() => {
    if (!touched.email) return "";
    if (!email) return "Email is required";
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
      ? ""
      : "Enter a valid email";
  }, [email, touched.email]);

  const pwError = useMemo(() => {
    if (!touched.pw) return "";
    if (!pw) return "Password is required";
    if (pw.length < 8) return "At least 8 characters";
    return "";
  }, [pw, touched.pw]);

  const pw2Error = useMemo(() => {
    if (!touched.pw2) return "";
    if (!pw2) return "Please confirm your password";
    return pw2 === pw ? "" : "Passwords do not match";
  }, [pw2, pw, touched.pw2]);

  const valid =
    name &&
    email &&
    pw &&
    pw2 &&
    !nameError &&
    !emailError &&
    !pwError &&
    !pw2Error &&
    agree;

  // EMAIL SIGNUP
  async function onSubmit(e) {
    e.preventDefault();
    setTouched({ name: true, email: true, pw: true, pw2: true });
    if (!valid) return;

    setSubmitting(true);

    try {
      // Firebase Signup
      const result = await signupWithEmail(email, pw);
      const uid = result.user.uid;

      // Store user in MongoDB
      await fetch("http://localhost:5000/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid,
          name,
          email,
        }),
      });

      alert("Signup successful!");
    } catch (error) {
      alert(error.message);
    }

    setSubmitting(false);
  }

  // GOOGLE SIGNUP
  async function handleGoogleSignup() {
    try {
      const result = await loginWithGoogle();
      const user = result.user;

      await fetch("http://localhost:5000/api/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: user.uid,
          name: user.displayName,
          email: user.email,
        }),
      });

      alert("Signed up with Google!");
    } catch (error) {
      console.error("Google signup error:", error);
      alert(error.message);
    }
  }

  return (
    <div className="su">
      {/* HEADER */}
      <header className="auth-header">
        <div className="auth-header-inner">
          <div className="auth-brand">
            <img src={logo} alt="Mashwara-e-Taleem" className="auth-logo" />
            <span className="auth-title">Mashwara-e-Taleem</span>
          </div>
          <p className="auth-subtitle">
            Smarter guidance for your study journey
          </p>
        </div>
      </header>

      <main className="su-shell">
        {/* LEFT IMAGE */}
        <section className="su-art">
          <img
            className="lp-img"
            src={signupImage}
            alt="Student starting application journey"
          />
        </section>

        {/* RIGHT PANEL */}
        <section className="su-card" role="region" aria-label="Create Account">
          <h1 className="su-title">Create Account</h1>
          <p className="su-sub">Start your application journey today</p>

          {/* FORM */}
          <form className="su-form" onSubmit={onSubmit} noValidate>
            {/* NAME */}
            <label className="su-label" htmlFor="name">
              Full Name
            </label>
            <div className={`su-field ${nameError ? "is-error" : ""}`}>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
              />
            </div>
            {nameError && <div className="su-help">{nameError}</div>}

            {/* EMAIL */}
            <label className="su-label" htmlFor="email">
              Email
            </label>
            <div className={`su-field ${emailError ? "is-error" : ""}`}>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              />
            </div>
            {emailError && <div className="su-help">{emailError}</div>}

            {/* PASSWORD */}
            <label className="su-label" htmlFor="password">
              Password
            </label>
            <div className={`su-field su-field-pw ${pwError ? "is-error" : ""}`}>
              <input
                id="password"
                type={show1 ? "text" : "password"}
                placeholder="Create a strong password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, pw: true }))}
              />
              <button
                type="button"
                className="su-toggle"
                onClick={() => setShow1((s) => !s)}
              >
                {show1 ? "Hide" : "Show"}
              </button>
            </div>
            {pwError && <div className="su-help">{pwError}</div>}

            {/* CONFIRM PASSWORD */}
            <label className="su-label" htmlFor="password2">
              Confirm Password
            </label>
            <div className={`su-field su-field-pw ${pw2Error ? "is-error" : ""}`}>
              <input
                id="password2"
                type={show2 ? "text" : "password"}
                placeholder="Re-enter your password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, pw2: true }))}
              />
              <button
                type="button"
                className="su-toggle"
                onClick={() => setShow2((s) => !s)}
              >
                {show2 ? "Hide" : "Show"}
              </button>
            </div>
            {pw2Error && <div className="su-help">{pw2Error}</div>}

            {/* TERMS */}
            <label className="su-terms">
              <input
                type="checkbox"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
              />
              <span>
                I agree to the{" "}
                <a href="/terms" target="_blank">
                  Terms & Conditions
                </a>
              </span>
            </label>

            {/* SUBMIT */}
            <button className="su-btn" type="submit" disabled={!valid || submitting}>
              {submitting ? "CREATING..." : "SIGN UP"}
            </button>
          </form>

          <div className="su-or">OR</div>

          {/* GOOGLE SIGNUP */}
          <button type="button" className="su-google" onClick={handleGoogleSignup}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 48 48"
            >
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.678 32.91 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z" />
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.817C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z" />
              <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.191-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.646-3.07-11.289-7.437l-6.54 5.036C9.51 39.556 16.227 44 24 44z" />
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.316 3.086-4.078 5.437-7.594 6.57.001-.001 7.594 6.57 7.594 6.57C39.044 38.023 44 31.5 44 24c0-1.341-.138-2.65-.389-3.917z" />
            </svg>
            Continue with Google
          </button>

          <p className="su-hint">
            Already have an Account? <a href="/login">Log In</a>
          </p>
        </section>
      </main>
    </div>
  );
}
