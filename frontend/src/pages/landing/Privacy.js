import React from "react";
import "./Privacy.css";

function Privacy() {
  return (
    <div className="privacy-container">
      <div className="privacy-content">
        <h1>Privacy Policy</h1>
        <p>
          At <strong>WorkConnect</strong>, we value your privacy. This policy
          explains how we collect, use, and protect your personal information
          when you use our platform to connect job seekers and employers.
        </p>

        <h2>1. Information We Collect</h2>
        <p>
          We collect personal information such as your name, email address,
          contact details, and employment information when you create an account
          or apply for jobs. Employers may also provide company and job posting
          details.
        </p>

        <h2>2. How We Use Your Information</h2>
        <p>
          We use your information to connect job seekers and employers, manage
          your account, send notifications, and improve our services. We do not
          sell or rent your data to third parties.
        </p>

        <h2>3. Data Sharing</h2>
        <p>
          Your information may be shared with employers or job seekers only when
          necessary to facilitate employment opportunities through WorkConnect.
        </p>

        <h2>4. Data Security</h2>
        <p>
          We implement security measures to protect your data from unauthorized
          access or disclosure. However, no system is completely secure, and we
          cannot guarantee absolute protection.
        </p>

        <h2>5. Updates to This Policy</h2>
        <p>
          We may update this Privacy Policy periodically. Continued use of our
          services after updates means you accept the revised policy.
        </p>

        <p className="last-updated">Last updated: October 30, 2025</p>
      </div>
    </div>
  );
}

export default Privacy;
