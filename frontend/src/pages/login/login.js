import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Login.css";
import { BsEye, BsEyeSlash } from 'react-icons/bs';
import { useAuth } from "../../contexts/AuthContext";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);
  const auth = useAuth();
  const navigate = useNavigate();

  // Set tab title on mount, reset on unmount
  useEffect(() => {
    const originalTitle = document.title;
    document.title = "WorkConnect – Login";
    return () => {
      document.title = originalTitle;
    };
  }, []);

  useEffect(() => {
    if (error && errorRef.current) {
      try { errorRef.current.focus(); } catch (e) { /* ignore focus errors */ }
    }
  }, [error]);

  const onSubmit = async (e) => {
  e.preventDefault();
  setError("");
  setLoading(true);

  if (!email.trim()) {
    setError("Please enter your email.");
    setLoading(false);
    return;
  }
  if (!password.trim()) {
    setError("Password field cannot be empty.");
    setLoading(false);
    return;
  }

  try {
    const result = await auth.login(email, password);

    // ✅ Ensure the result contains user info
    if (result && result.userId) {
      localStorage.setItem("userId", result.userId);
      if (result.token) localStorage.setItem("token", result.token);
      if (result.role) localStorage.setItem("role", result.role);
      console.log("Saved login data:", result);
    } else {
      console.warn("No userId returned from login result:", result);
    }

  // prefer the server-declared role from the login response (result.role)
  // because fetching a profile may return a skeleton with role='jobhunter'
  const role = result?.role || result?.profile?.role || auth.profile?.role || "jobhunter";
  if (role === "employer") navigate("/employer/dashboard");
  else if (role === 'admin' || role === 'superadmin') navigate('/admin');
  else navigate("/jobhunter/dashboard");

  } catch (err) {
    const raw = String(err?.message || err || '');
    const lc = raw.toLowerCase();

    let friendly = 'Incorrect username or password.';
    if (!raw || lc.includes('failed to fetch') || lc.includes('networkerror') || lc.includes('network request failed') || lc.includes('fetch')) {
      friendly = 'Unable to connect. Please try again later.';
    } else if (lc.includes('login failed') || lc.includes('incorrect') || lc.includes('invalid') || lc.includes('credentials') || lc.includes('password')) {
      friendly = 'Incorrect username or password.';
    } else if (lc.includes('email and password do not match')) {
      friendly = 'Email and password do not match.';
    } else if (lc.includes('no user') || lc.includes('not found') || lc.includes('user not found') || lc.includes('account not found')) {
      friendly = 'Account not found.';
    } else if (lc.includes('suspend') || lc.includes('deactivate') || lc.includes('deactivated')) {
      friendly = 'Account suspended or deactivated.';
    } else if (lc.includes('not verified') || lc.includes('verify')) {
      friendly = 'Email not verified. Please check your inbox.';
    } else if (lc.includes('too many') || lc.includes('attempts')) {
      friendly = 'Too many failed attempts. Try again later.';
    } else if (lc.includes('session expired')) {
      friendly = 'Session expired. Please log in again.';
    } else if (lc.includes('server') || lc.includes('internal')) {
      friendly = 'Server error. Contact support.';
    }

    setError(friendly);
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="login-page modern">
      <div className="login-center">
        <div className="login-card" role="main" aria-labelledby="signin-title">
          <div className="login-card-header">
            <div className="brand">
              <div className="brand-logo">WC</div>
              <div className="brand-name">WorkConnect</div>
            </div>
            <h2 id="signin-title">Sign in to your account</h2>
            <p className="login-sub" id="login-sub">Welcome back — continue where you left off.</p>
          </div>

          <div className="login-card-body">
            {/* <button type="button" className="social-btn google" aria-label="Sign in with Google">
              Continue with Google
            </button>

            <div className="divider"><span>or</span></div> */}

            <form
              onSubmit={onSubmit}
              aria-busy={loading}
              className={error ? 'has-error' : ''}
              aria-describedby="login-sub"
            >
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  className={`wc-input ${error ? 'error' : ''}`}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label htmlFor="password">Password</label>
                <div className="input-with-icon">
                  <input
                    id="password"
                    className={`wc-input ${error ? 'error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eye-toggle-label"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-pressed={showPassword}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <BsEyeSlash /> : <BsEye />}
                  </button>
                </div>
              </div>

              {error && (
                <div ref={errorRef} tabIndex={-1} className="error-box" role="alert" aria-live="assertive">
                  {error}
                </div>
              )}

              <div className="form-actions">
                <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
              </div>

              <button type="submit" className="signin-btn" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="signup-cta">
              New to WorkConnect? <Link to="/choose-role" className="join-link">Create an account</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
