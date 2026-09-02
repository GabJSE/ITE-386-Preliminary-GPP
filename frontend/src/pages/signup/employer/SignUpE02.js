import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupProgress from '../SignupProgress';
import { useSignup } from '../../../contexts/SignupContext';
import '../../signup/signup.css';

const industries = ['Technology','Finance','Healthcare','Education','Retail','Other'];
const sizes = ['1-10','11-50','51-200','201-500','501-1000','1000+'];

export default function SignUpE02() {
  const navigate = useNavigate();
  const { data, update, setCurrentStep } = useSignup();
  useEffect(() => setCurrentStep(2), [setCurrentStep]);

  const [companyName, setCompanyName] = useState(data.companyName || '');
  const [website, setWebsite] = useState(data.companyWebsite || '');
  const [industry, setIndustry] = useState(data.industry || '');
  const [size, setSize] = useState(data.companySize || '');
  const [location, setLocation] = useState(data.companyLocation || '');
  const [companyError, setCompanyError] = useState('');
  const [locationError, setLocationError] = useState('');
  const companyRef = useRef(null);
  const locationRef = useRef(null);

  // structured address fields
  const [streetAddress, setStreetAddress] = useState(data.companyStreetAddress || '');
  const [city, setCity] = useState(data.companyCity || '');
  const [region, setRegion] = useState(data.companyRegion || '');
  const [postalCode, setPostalCode] = useState(data.companyPostalCode || '');
  const [country, setCountry] = useState(data.companyCountry || '');
  const cityRef = useRef(null);

  const onNext = () => {
    setCompanyError(''); setLocationError('');
    if (!companyName) { setCompanyError('Please enter your company name'); if (companyRef.current) { companyRef.current.focus(); companyRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); } return; }

    // Require at least city and country for location specificity; encourage street address but keep it optional
    if (!city || !country) {
      setLocationError('Please provide at least the city and country for the company location');
      if (cityRef.current) { cityRef.current.focus(); cityRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
      return;
    }

    // build a human-readable combined location string for backward compatibility
    const combined = `${streetAddress ? streetAddress + ', ' : ''}${city}${region ? ', ' + region : ''}${postalCode ? ' ' + postalCode : ''}${country ? ', ' + country : ''}`;

    update({
      companyName,
      companyWebsite: website,
      industry,
      companySize: size,
      // structured fields
      companyStreetAddress: streetAddress,
      companyCity: city,
      companyRegion: region,
      companyPostalCode: postalCode,
      companyCountry: country,
      // legacy/combined field
      companyLocation: combined,
    });
    navigate('/employer-signup-03');
  };

  return (
    <div className="signup01-container">
      <div className="signup01-header">
        <button className="signup-back-icon" onClick={() => navigate('/employer-signup-01')} aria-label="Go back">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#233038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
  <SignupProgress currentStep={2} steps={["Step 1","Step 2","Step 3"]} />
      </div>
      <h1 className="signup01-title">Company details</h1>
      <p className="small-note">Tell us about your company so candidates can learn more.</p>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Company name</label>
        <input ref={companyRef} className={`signup01-input ${companyError ? 'invalid-input' : ''}`} value={companyName} onChange={e => { setCompanyError(''); setCompanyName(e.target.value) }} />
        {companyError && <div className="signup-error">{companyError}</div>}
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Company website</label>
        <input className="signup01-input" value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://" />
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Industry</label>
        <select className="signup01-input" value={industry} onChange={e => setIndustry(e.target.value)}>
          <option value="">Select industry</option>
          {industries.map(i => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Company size</label>
        <select className="signup01-input" value={size} onChange={e => setSize(e.target.value)}>
          <option value="">Select size</option>
          {sizes.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Street Address</label>
        <input className={`signup01-input`} value={streetAddress} onChange={e => setStreetAddress(e.target.value)} placeholder="Full street address, building number, suite/unit (optional)" />
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">City / Municipality</label>
        <input ref={cityRef} className={`signup01-input ${locationError ? 'invalid-input' : ''}`} value={city} onChange={e => { setLocationError(''); setCity(e.target.value) }} placeholder="City / Municipality" />
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">State / Province / Region</label>
        <input className="signup01-input" value={region} onChange={e => setRegion(e.target.value)} placeholder="State, province, or region" />
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">ZIP / Postal Code</label>
        <input className="signup01-input" value={postalCode} onChange={e => setPostalCode(e.target.value)} placeholder="ZIP or postal code" />
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="signup01-label">Country</label>
        <input className={`signup01-input ${locationError ? 'invalid-input' : ''}`} value={country} onChange={e => { setLocationError(''); setCountry(e.target.value) }} placeholder="Country" />
        {locationError && <div className="signup-error">{locationError}</div>}
      </div>

      <div style={{ marginTop: 22, display: 'flex', justifyContent: 'flex-end' }}>
        <button className="signup01-continue" onClick={onNext}>Next</button>
      </div>
    </div>
  );
}
