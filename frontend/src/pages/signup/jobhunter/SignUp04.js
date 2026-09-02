import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSignup } from "../../../contexts/SignupContext";
import { signup, login as apiLogin } from "../../../api/auth";
import { useAuth } from "../../../contexts/AuthContext";
import "../signup.css";
import SignupProgress from "../SignupProgress";
import { useToast } from '../../../components/ToastProvider';

function SignUp04() {
  const navigate = useNavigate();
  const { data, update, setCurrentStep } = useSignup();
  const auth = useAuth();
  const toast = useToast();

  // After removing the previous step-03, this becomes step 3 in the flow
  useEffect(() => setCurrentStep(3), [setCurrentStep]);

  const [loading, setLoading] = useState(false);
  const [jobType, setJobType] = useState(data.jobType || 'full-time');

  // small map of phone code -> country name (kept inline to avoid importing CountrySelect)
  const COUNTRY_MAP = {
    '+63': 'Philippines',
    '+1': 'United States',
    '+44': 'United Kingdom',
    '+61': 'Australia',
    '+91': 'India',
    '+49': 'Germany',
    '+33': 'France',
    '+34': 'Spain',
    '+39': 'Italy',
    '+81': 'Japan',
    '+86': 'China',
  };

  const onFinish = async () => {
    setLoading(true);
    try {
      const payload = { ...data, jobType };
      update({ jobType });
      const result = await signup(payload);
      // store returned profile/userId in signup context
      update({ ...result.profile, userId: result.userId });

      // show immediate toast while we attempt auto-login
      toast.success('Account created — redirecting...', { duration: 2000 });

      // attempt auto-login; if successful, go to dashboard; otherwise send user to login page
      try {
        const pw = data.password;
        if (pw) {
          const loginRes = await apiLogin({ email: data.email, password: pw });
          if (loginRes && loginRes.token) {
            await auth.login(data.email, pw);
            const role = result?.profile?.role || data.role || auth.profile?.role || 'jobhunter';
            if (role === 'employer') navigate('/employer/dashboard', { replace: true });
            else navigate('/jobhunter/dashboard', { replace: true });
            return;
          }
        }
      } catch (e) {
        console.warn('Auto-login failed', e);
      }

      // Auto-login failed or no pw provided — send user to login page and ask them to sign in
      toast.info('Account created. Please sign in to continue.');
      navigate('/login', { replace: true, state: { email: data.email } });
    } catch (err) {
      console.error('Signup error', err);
      toast.error('Could not create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="signup01-container">
      <div className="signup01-header">
        <button className="signup-back-icon" onClick={() => navigate('/signup-02')} aria-label="Go back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#233038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <SignupProgress currentStep={3} />
      </div>
      <h1 className="signup01-title">Finish and Submit</h1>
      <p className="small-note">Review your information below, enter the verification code we sent, then finish signup.</p>

      {/* summary view (readable) */}
      <div className="signup-card" style={{ marginTop: 12 }}>
        <h3>Personal</h3>
        <div><strong>Name:</strong> {data.firstName || ''} {data.lastName || ''}</div>
        <div><strong>Email:</strong> {data.email || ''}</div>
        <div><strong>Role:</strong> {data.role || 'jobhunter'}</div>

        <h3 style={{ marginTop: 8 }}>Contact</h3>
        <div><strong>Phone:</strong> {data.phone || ''}</div>

        <h3 style={{ marginTop: 8 }}>Location</h3>
        <div><strong>Address:</strong> {data.addressLine || ''}</div>
        <div><strong>City:</strong> {data.city || ''}</div>
        <div><strong>State / Province:</strong> {data.stateprovince || ''}</div>
        <div><strong>Postal Code:</strong> {data.postalCode || ''}</div>
        <div><strong>Country:</strong> {COUNTRY_MAP[data.country] || (data.country || '')} { (data.country) ? <span style={{opacity:0.7}}>({data.country})</span> : null }</div>

        {/* Employer-specific fields (if user filled employer flow) */}
        {data.role === 'employer' && (
          <>
            <h3 style={{ marginTop: 8 }}>Company / Employer</h3>
            <div><strong>Company name:</strong> {data.companyName || ''}</div>
            <div><strong>Company website:</strong> {data.companyWebsite || ''}</div>
            <div><strong>Industry:</strong> {data.industry || ''}</div>
            <div><strong>Company size:</strong> {data.companySize || ''}</div>
            <div><strong>Owner name:</strong> {data.ownerName || ''}</div>
            <div><strong>Owner email:</strong> {data.ownerEmail || ''}</div>
          </>
        )}
      </div>

      <div className="form-actions">
        <button className="signup01-continue" onClick={onFinish} disabled={loading}>{loading ? 'Saving...' : 'Finish and Continue'}</button>
      </div>
    </div>
  );
}

export default SignUp04;
