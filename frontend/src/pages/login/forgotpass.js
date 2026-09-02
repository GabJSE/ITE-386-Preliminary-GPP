import React, { useState, useRef, useEffect } from 'react';
import './forgotpass.css';

export default function ForgotPass() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const msgRef = useRef(null);

  useEffect(() => {
    if ((error || message) && msgRef.current) {
      try { msgRef.current.focus(); } catch (e) { }
    }
  }, [error, message]);

  async function requestOtp(e) {
    e && e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res = await fetch('/api/forgot-password/request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP');
      setMessage('OTP sent to your email. Check your inbox.');
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally { setLoading(false); }
  }

  async function verifyOtp(e) {
    e && e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res = await fetch('/api/forgot-password/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, otp }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Invalid OTP');
      setMessage('OTP verified — set a new password.');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally { setLoading(false); }
  }

  async function resetPassword(e) {
    e && e.preventDefault();
    setError(''); setMessage(''); setLoading(true);
    try {
      const res = await fetch('/api/forgot-password/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, newPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');
      setMessage('Password reset successful — you can sign in now.');
      setStep(4);
    } catch (err) {
      setError(err.message || 'Failed to reset password');
    } finally { setLoading(false); }
  }

  return (
    <div className="forgot-page modern">
      <div className="login-center">
        <div className="forgot-card login-card">
          <div className="login-card-header">
            <div className="brand">
              <div className="brand-logo">WC</div>
              <div className="brand-name">WorkConnect</div>
            </div>
            <h2>Reset your password</h2>
            <p className="login-sub">Enter your email to receive a reset code, then create a new password.</p>
          </div>

          <div className="login-card-body">
            {error && <div ref={msgRef} tabIndex={-1} className="error-box" role="alert">{error}</div>}
            {message && <div ref={msgRef} tabIndex={-1} className="info-box">{message}</div>}

            {step === 1 && (
              <form onSubmit={requestOtp} aria-busy={loading}>
                <div className="form-group">
                  <label htmlFor="fp-email">Email</label>
                  <input id="fp-email" className="wc-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <button type="submit" className="signin-btn" disabled={loading}>{loading ? 'Sending…' : 'Send reset code'}</button>
              </form>
            )}

            {step === 2 && (
              <form onSubmit={verifyOtp} aria-busy={loading}>
                <div className="form-group">
                  <label htmlFor="fp-otp">Enter code</label>
                  <input id="fp-otp" className="wc-input" value={otp} onChange={e => setOtp(e.target.value)} required />
                </div>
                <button type="submit" className="signin-btn" disabled={loading}>{loading ? 'Verifying…' : 'Verify code'}</button>
              </form>
            )}

            {step === 3 && (
              <form onSubmit={resetPassword} aria-busy={loading}>
                <div className="form-group">
                  <label htmlFor="fp-newpass">New password</label>
                  <input id="fp-newpass" className="wc-input" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                </div>
                <button type="submit" className="signin-btn" disabled={loading}>{loading ? 'Saving…' : 'Save new password'}</button>
              </form>
            )}

            {step === 4 && (
              <div>
                <p>Password updated. You may now <a className="join-link" href="/login">sign in</a>.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
