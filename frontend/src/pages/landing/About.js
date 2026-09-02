import React from "react";
import "./About.css";

const About = () => {
  return (
    <div className="about-page">
      <div className="about-container">
        <h1>About WorkConnect</h1>
        <p>
          Welcome to WorkConnect, a vibrant community dedicated to helping junior professionals in the creative field find their dream jobs. 
          Connect with employers, showcase your talents, and take the next step in your career      
          journey with us. Join our network of talented individuals and innovative companies today.                   
        </p>

        <section className="team-section">
          <h1>Our Team</h1>
          <div className="team-cards">
            <div className="team-card">
              <div className="avatar">GE</div>
              <h3>Gabriel Esperanza</h3>
              <p>Project Manager</p>
            </div>
            <div className="team-card">
              <div className="avatar">PC</div>
              <h3>Patrick Cruz</h3>
              <p>Backend Developer</p>
            </div>
            <div className="team-card">
              <div className="avatar">EM</div>
              <h3>Ed Reniele Mangilit</h3>
              <p>Backend Developer</p>
            </div>
            <div className="team-card">
              <div className="avatar">PN</div>
              <h3>Prince Navarro</h3>
              <p>Frontend Developer</p>
            </div>
            <div className="team-card">
              <div className="avatar">LL</div>
              <h3>Lawrence Latido</h3>
              <p>Frontend Developer</p>
            </div>
          </div>
        </section>

        <section className="vission-section">
          <h1>Our Vision</h1>
          <p>
            Our vision is to create unparalleled economic opportunities for every junior creative professional worldwide, 
            empowering them to achieve their career goals and contribute to the global workforce.
          </p>
        </section>

        <section className="mission-section">
          <h1>Our Mission</h1>
          <p>
            Our mission is to create an intuitive and reliable platform that 
            empowers users to achieve their goals efficiently.
          </p>
        </section>

        <section className="who-section">
          <h1>Who are we?</h1>
          <p>
            WorkConnect started as an idea in 2025, born out of a desire to help junior creative professionals find meaningful job opportunities.
            Officially launched in 2025, WorkConnect has quickly grown into a dynamic platform, connecting talented individuals with innovative companies.
            Under visionary leadership, WorkConnect continues to expand, offering a range of services including job listings, career resources,
            and networking opportunities to support the next generation of creative professionals.
          </p>
        </section>
      </div>
    </div>
  );
};

export default About;
