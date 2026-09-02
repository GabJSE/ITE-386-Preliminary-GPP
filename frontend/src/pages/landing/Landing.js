import React from "react";
import { Link } from "react-router-dom";
import { useJobs } from '../../contexts/JobsContext';
import "./Landing.css"; // external CSS for styling
// Change the hero background image below by replacing the import path with your image
// e.g. import slide1 from '../../assets/your-hero-image.jpg'
import slide1 from '../../assets/hero_image.svg';

function Landing() {
  const { jobs = [] } = useJobs();

  // pick featured jobs: prefer exclusive/featured flags, otherwise most recent
  const featured = (() => {
    try {
      const preferred = jobs.filter(j => j.exclusive || j.featured);
      if (preferred && preferred.length > 0) return preferred.slice(0, 3);
      // fallback: most recent postedAt
      const sorted = [...jobs].sort((a, b) => new Date(b.postedAt || b.postedAt) - new Date(a.postedAt || a.postedAt));
      return sorted.slice(0, 3);
    } catch (e) {
      return jobs.slice(0, 3);
    }
  })();

  return (
    <div className="landing-container">
      {/* HERO */}
      <header className="landing-hero" style={{ backgroundImage: `url(${slide1})` }}>
        <div className="landing-hero-inner">
          <h1>Where Talent Meets Opportunity</h1>
          <p className="lead">Find talent faster or discover your next opportunity.</p>
          <div className="cta-row">
            <Link to="/signup-01" className="primary-btn">Find Jobs</Link>
            <Link to="/employer-signup-01" className="secondary-btn">Post a Job</Link>
          </div>
        </div>
      </header>

      {/* HOW IT WORKS */}
      <section className="how-it-works">
        <h2>How it works</h2>
        <div className="steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-label">Create an account</div>
          </div>

          <div className="step-arrow" aria-hidden>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="rgba(10,169,111,0.08)" />
              <path d="M9 6L15 12L9 18" stroke="var(--wc-primary,#0aa96f)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="step">
            <div className="step-number">2</div>
            <div className="step-label">Search or post jobs</div>
          </div>

          <div className="step-arrow" aria-hidden>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="12" fill="rgba(10,169,111,0.08)" />
              <path d="M9 6L15 12L9 18" stroke="var(--wc-primary,#0aa96f)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="step">
            <div className="step-number">3</div>
            <div className="step-label">Connect and hire</div>
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="benefits">
        <div className="benefit">
          <h3>For Job Seekers</h3>
          <ul>
            <li>Easy job search</li>
            <li>Instant updates</li>
            <li>Profile Updates</li>
          </ul>
        </div>
        <div className="benefit">
          <h3>For Employers</h3>
          <ul>
            <li>Quick posting</li>
            <li>Candidate profile view</li>
            <li>Real-time applications</li>
          </ul>
        </div>
      </section>

      {/* FEATURED JOBS / COMPANIES */}
      <section className="featured">
        <h2>Featured Jobs</h2>
        <div className="featured-grid">
          {featured && featured.length > 0 ? (
            featured.map(job => (
              <Link key={job._id || job.id} to="/choose-role" className="card featured-card">
                <div className="card-left">
                  <div className="card-title">{job.title}</div>
                  <div className="card-company">{job.company}</div>
                  <div className="card-meta">{job.location || job.city || job.country}</div>
                </div>
                <div className="card-right">
                  <div className="badge">{job.exclusive ? 'Exclusive' : job.type || ''}</div>
                </div>
              </Link>
            ))
          ) : (
            // fallback static placeholders if there are no jobs
            <>
              <div className="card">Job Title — Company A</div>
              <div className="card">Job Title — Company B</div>
              <div className="card">Job Title — Company C</div>
            </>
          )}
        </div>
      </section>

      {/* TESTIMONIALS */}
      {/* <section className="testimonials">
        <h2>Testimonials</h2>
        <div className="testimonials-grid">
          <blockquote>“Found my dream job in two weeks.” — Anna</blockquote>
          <blockquote>“Posting was easy and we hired fast.” — BetaCorp HR</blockquote>
        </div>
      </section> */}

      {/* CTA */}
      <section className="cta-join">
        <h2>Join WorkConnect Today</h2>
        <Link to="/choose-role" className="primary-btn">Sign up now</Link>
      </section>
    </div>
  );
}

export default Landing;
