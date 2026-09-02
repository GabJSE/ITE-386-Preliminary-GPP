import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupProgress from '../SignupProgress';
import { useSignup } from '../../../contexts/SignupContext';
import '../../signup/signup.css';
import CountrySelect from '../CountrySelect';
import { signup } from '../../../api/auth';
import { useAuth } from '../../../contexts/AuthContext';

export default function SignUpE03() {
  const navigate = useNavigate();
  const auth = useAuth();
  const { data, update, setCurrentStep } = useSignup();
  useEffect(() => setCurrentStep(3), [setCurrentStep]);

  const [fullName, setFullName] = useState(data.ownerName || '');
  const [position, setPosition] = useState(data.ownerPosition || '');
  const [phone, setPhone] = useState(data.ownerPhone || '');
  const [phoneCountry, setPhoneCountry] = useState(data.phoneCountry || '+63');
  const [email, setEmail] = useState(data.email || '');
  const [fullNameError, setFullNameError] = useState('');
  const [emailError, setEmailError] = useState('');
  const fullNameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);

  const onNext = () => {
    setFullNameError(''); setEmailError('');
    if (!fullName) { setFullNameError('Please enter full name'); if (fullNameRef.current) { fullNameRef.current.focus(); fullNameRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
    if (!email) { setEmailError('Please enter a work email'); if (emailRef.current) { emailRef.current.focus(); emailRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }
  if (!data.password) { alert('Password missing from earlier step; please go back and set a password.'); return; }
  // ensure company name exists in signup context (required by backend)
  if (!data.companyName) {
    alert('Company name is missing from your company details. Please go back to Step 2 and enter your company name.');
    return;
  }
  update({ ownerName: fullName, ownerPosition: position, ownerPhone: phone, email });
  // Build payload and finish signup here
  (async () => {
    try {
      const payload = {
        email: email,
        password: data.password,
        role: 'employer',
        // company fields may be present on the signup context
        companyName: data.companyName,
        companyWebsite: data.companyWebsite,
        industry: data.industry,
        companySize: data.companySize,
        // include both legacy combined location and structured address fields
        companyLocation: data.companyLocation,
        companyStreetAddress: data.companyStreetAddress,
        companyCity: data.companyCity,
        companyRegion: data.companyRegion,
        companyPostalCode: data.companyPostalCode,
        companyCountry: data.companyCountry,
        companyDescription: data.companyDescription,
        companyLogo: data.companyLogo,
        ownerName: fullName,
        ownerPosition: position,
        ownerPhone: phone,
      };

      const result = await signup(payload);
      // update signup context with returned profile/userId
      update({ ...result.profile, userId: result.userId });

      // attempt auto-login
      try {
        if (data.password) await auth.login(email, data.password);
      } catch (e) {
        console.warn('Auto-login failed', e);
      }

      // go to employer dashboard
      navigate('/employer/dashboard');
    } catch (err) {
      console.error('Employer signup failed', err);
      alert(err?.message || 'Failed to finish signup');
    }
  })();
  };

  return (
    <div className="signup01-container">
      <div className="signup01-header">
        <button className="signup-back-icon" onClick={() => navigate('/employer-signup-02')} aria-label="Go back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#233038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
  <SignupProgress currentStep={3} steps={["Account","Company","Owner","Profile"]} />
      </div>
      <h1 className="signup01-title">Owner / HR representative</h1>
      <p className="small-note">This person will manage hiring and job posts.</p>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Full name</label>
        <input ref={fullNameRef} className={`signup01-input ${fullNameError ? 'invalid-input' : ''}`} value={fullName} onChange={e => { setFullNameError(''); setFullName(e.target.value) }} />
        {fullNameError && <div className="signup-error">{fullNameError}</div>}
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Position / Role</label>
        <input className="signup01-input" value={position} onChange={e => setPosition(e.target.value)} placeholder="HR Manager, Owner" />
      </div>

      <div style={{ marginTop: 12 }} className="phone-row">
        <div className="phone-country">
          <CountrySelect value={phoneCountry} onChange={(code) => { setPhoneCountry(code); update({ phoneCountry: code }); }} />
        </div>
        <div style={{ flex: 1 }}>
          <label className="signup01-label">Phone number</label>
          <input className="signup01-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="555 555 5555" />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Work email</label>
        <input ref={emailRef} className={`signup01-input ${emailError ? 'invalid-input' : ''}`} value={email} onChange={e => { setEmailError(''); setEmail(e.target.value) }} />
        {emailError && <div className="signup-error">{emailError}</div>}
      </div>

      <div style={{ marginTop: 22 ,display: 'flex', justifyContent: 'flex-end'}}>
        <button className="signup01-continue" onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
