import React from "react";
import { useNavigate } from "react-router-dom";
import "./ChooseRole.css";
import { useSignup } from '../../contexts/SignupContext';

export default function ChooseRole() {
  const navigate = useNavigate();

  const { reset, update } = useSignup();

  return (
    <div className="choose-role-root">
      <div className="choose-role-inner">
        <div className="choose-role-top">

          <h1 className="choose-role-title">Get Started — Choose Your Role</h1>
          <p className="choose-role-subtitle">Select how you want to use WorkConnect.</p>
        </div>

        <div className="choose-role-cards">
          <div className="role-card jobseeker">
            <h3 className="card-title">Job Seeker</h3>
            <div className="card-icon">{/* placeholder icon */}
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zM4 20c0-3.31 2.69-6 6-6h4c3.31 0 6 2.69 6 6v1H4v-1z" stroke="#111827" strokeWidth="0.5"/></svg>
            </div>
            <p className="card-desc">Find your next opportunity and connect with top employers</p>
            <button
              className="primary-btn"
              onClick={() => {
                // clear any previous signup state and set role
                try { reset(); } catch (err) { /* no-op */ }
                try { update({ role: 'jobhunter' }); } catch (err) { /* no-op */ }
                navigate("/signup-01");
              }}
            >Continue as Job Seeker</button>
          </div>

          <div className="role-card employer">
            <h3 className="card-title">Employer</h3>
            <div className="card-icon">{/* placeholder icon */}
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h18v7a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7zM7 6h10v4H7z" stroke="#111827" strokeWidth="0.5"/></svg>
            </div>
            <p className="card-desc">Post jobs, review applicants and grow your team</p>
            <button
              className="primary-btn"
              onClick={() => {
                try { reset(); } catch (err) { /* no-op */ }
                try { update({ role: 'employer' }); } catch (err) { /* no-op */ }
                navigate("/employer-signup-01");
              }}
            >Continue as Employer</button>
          </div>
        </div>
      </div>
    </div>
  );
}
