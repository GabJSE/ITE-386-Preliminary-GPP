import React from "react";
import "./Terms.css";

function Terms() {
  return (
    <div className="terms-container">
      <div className="terms-content">
        <h1>Terms and Conditions</h1>

        <p className="intro">
          Welcome to <strong>WorkConnect</strong> — a platform designed to help job
          seekers connect with employers, and businesses find the right talent.
          By accessing or using our website and services, you agree to the
          following Terms and Conditions. Please read them carefully.
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          By creating an account, browsing job listings, or posting opportunities
          on WorkConnect, you confirm that you have read, understood, and agree
          to be bound by these Terms and Conditions, as well as our Privacy
          Policy.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          WorkConnect provides an online platform where job seekers can create
          profiles, upload resumes, and apply for jobs. Employers and recruiters
          can post job openings, view applicant profiles, and connect with
          potential candidates. WorkConnect acts solely as an intermediary and
          does not participate in or guarantee any hiring processes.
        </p>

        <h2>3. User Responsibilities</h2>
        <p>
          You are responsible for the accuracy and truthfulness of all
          information you provide on the platform. You agree not to:
        </p>
        <ul>
          <li>Use false identities or impersonate another person.</li>
          <li>
            Post misleading, offensive, or unlawful content, including job
            listings or profiles.
          </li>
          <li>
            Attempt to access, tamper with, or use non-public areas of the
            website.
          </li>
        </ul>

        <h2>4. Employer Responsibilities</h2>
        <p>
          Employers and recruiters using WorkConnect must comply with all
          applicable labor and employment laws. Job postings must accurately
          describe available positions and must not include discriminatory,
          fraudulent, or inappropriate content.
        </p>

        <h2>5. Job Seeker Responsibilities</h2>
        <p>
          Job seekers must ensure that their profiles, resumes, and applications
          accurately represent their qualifications and experience. WorkConnect
          reserves the right to remove or suspend any user who provides false
          information or engages in misconduct.
        </p>

        <h2>6. Privacy and Data Use</h2>
        <p>
          By using WorkConnect, you consent to the collection and use of your
          data as outlined in our <a href="/privacy">Privacy Policy</a>. Your
          personal data will only be shared with potential employers or job
          seekers as necessary to facilitate employment opportunities.
        </p>

        <h2>7. Limitation of Liability</h2>
        <p>
          WorkConnect acts as an intermediary and is not responsible for the
          outcome of any employment or recruitment process. We do not guarantee
          job offers, employment, or candidate suitability. To the fullest
          extent permitted by law, WorkConnect shall not be liable for any
          indirect, incidental, or consequential damages resulting from your use
          of the platform.
        </p>

        <h2>8. Account Termination</h2>
        <p>
          We reserve the right to suspend or terminate accounts that violate
          these Terms, misuse the platform, or engage in fraudulent or harmful
          activities. Users may also delete their accounts at any time through
          their profile settings.
        </p>

        <h2>9. Changes to These Terms</h2>
        <p>
          WorkConnect reserves the right to update or modify these Terms and
          Conditions at any time. Continued use of the platform after changes
          have been posted indicates your acceptance of the revised Terms.
        </p>

        <h2>10. Contact Information</h2>
        <p>
          If you have any questions or concerns about these Terms, please
          contact us at our <a href="/Contact">Contact Page</a>.
        </p>

        <p className="last-updated">Last updated: October 30, 2025</p>
      </div>
    </div>
  );
}

export default Terms;

