import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SignupProgress from '../SignupProgress';
import { useSignup } from '../../../contexts/SignupContext';
import '../../signup/signup.css';
import { BsEye, BsEyeSlash, BsCheckCircle } from 'react-icons/bs';
import { sendCode, verifyCode } from '../../../api/verify';

export default function SignUpE01() {
  const navigate = useNavigate();
  const { data, update, setCurrentStep } = useSignup();
  useEffect(() => setCurrentStep(1), [setCurrentStep]);

  // mirror the SignUp01 logic: use signup context fields rather than local copies
  const emailRef = useRef(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [emailError, setEmailError] = useState('');

  // email editable / dirty tracking like SignUp01
  const [emailEditable, setEmailEditable] = useState(true);
  const initialEmailRef = useRef(data.email || '');
  const [emailDirty, setEmailDirty] = useState(false);
  const visitedRef = useRef(false);

  // send guard
  const [isSending, setIsSending] = useState(false);
  const sendingRef = useRef(false);

  // handle input changes — update signup context
  const onChangeLocal = (e) => {
    const { name, value } = e.target;
    if (name === 'email') {
      setEmailDirty(value !== (initialEmailRef.current || ''));
    }
    update({ [name]: value });
  };

  // OTP UI state + resend timer
  const [showOtp, setShowOtp] = useState(!!(data.verificationSent && !data.emailVerified));
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');

  const RESEND_SECONDS = 60;
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const timerRef = useRef(null);

  const startTimer = () => {
    setRemainingSeconds(RESEND_SECONDS);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setRemainingSeconds(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // submission — follows the same flow as SignUp01 but navigates to employer routes
  const onSubmit = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();

    setPasswordError('');
    setConfirmError('');
    setEmailError('');

    if (!data.email) {
      setEmailError('Please enter your email');
    } else {
      const emailRe = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(".+"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
      if (!emailRe.test(data.email)) setEmailError('Please enter a valid email');
    }

    if (!data.password) {
      setPasswordError('Password is required');
    } else if (data.password.length < 8 || !/[0-9]/.test(data.password) || !/[A-Za-z]/.test(data.password)) {
      setPasswordError('Password must be at least 8 characters and include letters and numbers');
    }

    if (data.password !== data.confirmPassword) {
      setConfirmError('Passwords do not match');
      return;
    }

    if (emailError || passwordError || confirmError || !data.email || !data.password) return;

    try {
      if (sendingRef.current) return;
      sendingRef.current = true;
      setIsSending(true);

      if (data.emailVerified) {
        navigate('/employer-signup-02');
        return;
      }

      const resp = await sendCode(data.email, 'email');
      setShowOtp(true);
      setOtpMessage(resp?.message || 'A verification code was sent to your email');
      initialEmailRef.current = data.email || '';
      setEmailDirty(false);
      try { update({ verificationSent: true }); } catch (e) { /* no-op */ }
      startTimer();
    } catch (err) {
      setEmailError('Failed to send verification code. Please try again later.');
    } finally {
      sendingRef.current = false;
      setIsSending(false);
    }
  };

  const handleNextClick = async () => {
    // If already verified, continue
    if (data.emailVerified) return navigate('/employer-signup-02');

    // Validate required fields before allowing any navigation or verification
    let hasError = false;
    setEmailError('');
    setPasswordError('');
    setConfirmError('');

    if (!data.email) {
      setEmailError('Please enter your email');
      hasError = true;
    } else {
      const emailRe = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\\.,;:\s@\"]+\.)+[^<>()[\]\\.,;:\s@\"]{2,})$/i;
      if (!emailRe.test(data.email)) {
        setEmailError('Please enter a valid email');
        hasError = true;
      }
    }

    if (!data.password) {
      setPasswordError('Password is required');
      hasError = true;
    } else if (data.password.length < 8 || !/[0-9]/.test(data.password) || !/[A-Za-z]/.test(data.password)) {
      setPasswordError('Password must be at least 8 characters and include letters and numbers');
      hasError = true;
    }

    if (data.password !== data.confirmPassword) {
      setConfirmError('Passwords do not match');
      hasError = true;
    }

    if (hasError) return; // block progression until user fixes fields

    // If email was edited, send code (reuse onSubmit logic)
    if (emailDirty) {
      await onSubmit();
      return;
    }

    // Not edited but not verified — trigger verification instead of silently navigating
    await onSubmit();
  };

  const onResend = async () => {
    if (remainingSeconds > 0) return;
    try {
      const resp = await sendCode(data.email, 'email');
      setOtpMessage(resp?.message || 'A verification code was resent to your email');
      startTimer();
      try { update({ verificationSent: true }); } catch (e) { /* no-op */ }
    } catch (err) {
      setOtpError('Failed to resend code. Try again later');
    }
  };

  const onVerifyOtp = async () => {
    setOtpError('');
    if (!otp) return setOtpError('Enter the verification code');
    try {
      const res = await verifyCode(data.email, otp);
      if (res.valid) {
        update({ emailVerified: true });
        navigate('/employer-signup-02');
      } else {
        setOtpError('Invalid or expired code');
      }
    } catch (err) {
      setOtpError('Verification failed. Try again');
    }
  };

  useEffect(() => {
    if (data.emailVerified) {
      setShowOtp(false);
      setOtpMessage('Email already verified');
      setEmailEditable(false);
    }
    if (!visitedRef.current) visitedRef.current = true;
  }, [data.emailVerified]);

  useEffect(() => {
    if (emailEditable && emailRef.current) {
      setTimeout(() => emailRef.current.focus(), 10);
    }
  }, [emailEditable]);

  useEffect(() => {
    if (emailEditable) {
      if (data.emailVerified) update({ emailVerified: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.email]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="signup01-container">
      <div className="signup01-header">
        <button className="signup-back-icon" aria-label="Exit signup" onClick={() => navigate('/choose-role') }>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="#233038" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <SignupProgress currentStep={1} />
      </div>

      <h1 className="signup01-title">Hire talent faster. Create your company account today.</h1>
      <p className="small-note">Use your company email (e.g., name@company.com)</p>

      <form onSubmit={onSubmit}>
        <div className="signup01-grid">
          <div>
            <label className="signup01-label">Email*</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                ref={emailRef}
                className={`signup01-input ${emailError ? 'invalid-input' : ''}`}
                name="email"
                value={data.email || ''}
                onChange={(e) => { setEmailError(''); onChangeLocal(e); }}
                placeholder="name@company.com"
                disabled={!emailEditable}
              />
              {data.emailVerified && (
                <span title="Email verified" style={{ color: '#16a34a', display: 'inline-flex', alignItems: 'center' }}><BsCheckCircle /></span>
              )}
              {!emailEditable && (
                <button type="button" className="btn-inline" onClick={() => { setEmailEditable(true); update({ emailVerified: false }); }} style={{ marginLeft: 8 }} disabled={isSending}>Change email</button>
              )}
            </div>
            {emailError && <div className="signup-error">{emailError}</div>}
          </div>

          <div>
            <label className="signup01-label">Password*</label>

            <div className="input-with-icon">
              <input
                className={`signup01-input ${passwordError ? 'invalid-input' : ''}`}
                name="password"
                value={data.password || ''}
                onChange={(e) => { setPasswordError(''); onChangeLocal(e); }}
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                aria-label="Password"
              />
              <button
                type="button"
                className="eye-toggle-label"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <BsEyeSlash /> : <BsEye />}
              </button>
            </div>
            {passwordError && <div className="signup-error">{passwordError}</div>}
          </div>

          <div>
            <label className="signup01-label">Confirm Password*</label>

            <div className="input-with-icon">
              <input
                className="signup01-input"
                name="confirmPassword"
                value={data.confirmPassword || ''}
                onChange={onChangeLocal}
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                aria-label="Confirm password"
              />
              <button
                type="button"
                className="eye-toggle-label"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                title={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
              >
                {showConfirmPassword ? <BsEyeSlash /> : <BsEye />}
              </button>
            </div>
            {confirmError && <div className="signup-error">{confirmError}</div>}
          </div>

        </div>

        <div style={{ marginTop: 18 }}>
          {data.emailVerified ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div className="small-note" style={{ textAlign: 'center', maxWidth: 500 }}>Your email has already been verified.</div>
              <div className="form-actions" style={{ width: '100%', justifyContent: 'center' }}>
                <button className="signup01-continue" type="button" onClick={() => navigate('/employer-signup-02')}>Continue</button>
              </div>
            </div>
          ) : (
            <>
              {!showOtp && (emailDirty || !visitedRef.current) && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <p className="small-note" style={{ textAlign: 'center', maxWidth: 500 }}>By clicking <strong>Agree &amp; Join</strong> or Continue, you agree to the Work Connect Terms and Privacy Policy.</p>
                      <div className="form-actions" style={{ width: '100%', justifyContent: 'center' }}>
                        <button className="signup01-continue" type="submit" disabled={isSending}>
                          {isSending ? 'Sending…' : 'Agree & Join'}
                        </button>
                      </div>
                  </div>

                  <div style={{ marginTop: 12, textAlign: 'center' }}>
                    <span className="small-note">Already on Work Connect? </span>
                    <button type="button" className="secondary-btn" onClick={() => navigate('/login')} style={{ marginLeft: 8 }}>Sign in</button>
                  </div>
                </>
              )}

              {showOtp && (
                <div style={{ marginTop: 12 }}>
                  <label className="signup01-label">Verification code</label>
                  <input className={`signup01-input ${otpError ? 'invalid-input' : ''}`} placeholder="Enter code" value={otp} onChange={e => { setOtpError(''); setOtp(e.target.value) }} />
                  {otpError && <div className="signup-error">{otpError}</div>}
                  {otpMessage && <div className="small-note">{otpMessage}</div>}
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
                    <button className="secondary-btn" type="button" onClick={onResend} disabled={remainingSeconds > 0}>
                      {remainingSeconds > 0 ? `Resend (${remainingSeconds}s)` : 'Resend code'}
                    </button>
                  </div>
                  <div className="form-actions">
                    <button className="signup01-continue" onClick={onVerifyOtp}>Verify &amp; Continue</button>
                  </div>
                </div>
              )}

              {!showOtp && !(emailDirty || !visitedRef.current) && (
                <div style={{ display: 'flex', justifyContent: 'center', marginTop: 12 }}>
                  <button className="signup01-continue" type="button" onClick={handleNextClick} disabled={isSending}>{isSending ? 'Sending…' : 'Next'}</button>
                </div>
              )}
            </>
          )}
        </div>
      </form>
    </div>
  );
}
