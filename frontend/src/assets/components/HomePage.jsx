import React from "react";
import Navbar from "./Navbar.jsx";
import Hero from './Hero.jsx'
import Services from './Services.jsx'
import Working from './Working.jsx'
import Footer from './Footer.jsx'

const HomePage = () => {
  return (
    <>
      <Navbar />
      <Hero />
      <Services />
      <Working />
      <Footer />
    </>
  );
};

export default HomePage;
