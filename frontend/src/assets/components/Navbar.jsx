// src/components/Navbar.jsx
import { useState } from "react";
import { FaHome, FaBriefcase } from "react-icons/fa";
import { IoInformationCircle, IoMenu, IoClose } from "react-icons/io5";
import "./Navbar.css";
import logo from "../logo.png";
import {useNavigate } from "react-router-dom";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();


  const navigateToSignUp = () =>
  {
    navigate('/signup');
  }

  return (
    <header className="site-header" id="top">
      <div className="container navbar">
        {/* Brand */}
        <a href="#" className="brand" aria-label="Mashwara-e-Taleem, home">
          <span className="brand-logo">
            <img src={logo} alt="" width={28} height={28} aria-hidden="true" />
          </span>
          <span className="brand-name">Mashwara-e-Taleem</span>
        </a>

        {/* Primary links (desktop) */}
        <nav className="primary-nav" aria-label="Primary">
          <a className="nav-link" href="#home" aria-current="page">
            <FaHome aria-hidden="true" /> Home
          </a>
          <a className="nav-link" href="#services">
            <FaBriefcase aria-hidden="true" /> Services
          </a>
          <a className="nav-link" href="#how">
            <IoInformationCircle aria-hidden="true" /> How It Works
          </a>
        </nav>

        {/* CTA (desktop) */}
        <button className="cta" onClick={navigateToSignUp}>
          Get Started
        </button>

        {/* Burger (mobile) */}
        <button
          className="burger"
          onClick={() => setOpen(v => !v)}
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          aria-controls="mobile-menu"
        >
          {open ? <IoClose size={22} /> : <IoMenu size={22} />}
        </button>
      </div>

      {/* Mobile drawer */}
      <div id="mobile-menu" className={`mobile-drawer ${open ? "open" : ""}`}>
        <a className="mobile-item" href="#home" onClick={() => setOpen(false)}>
          <FaHome aria-hidden="true" /> Home
        </a>
        <a className="mobile-item" href="#services" onClick={() => setOpen(false)}>
          <FaBriefcase aria-hidden="true" /> Services
        </a>
        <a className="mobile-item" href="#how" onClick={() => setOpen(false)}>
          <IoInformationCircle aria-hidden="true" /> How It Works
        </a>
        <button className="mobile-cta" onClick={ () => {
          setOpen(false);
          navigateToSignUp();
        }}>
          Get Started
        </button>
      </div>
    </header>
  );
}
