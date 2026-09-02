import React from 'react';
import './Footer.css';
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="wc-footer">
      <div className="wc-footer-inner">
        <div className="wc-footer-left">
          <div className="wc-logo">WorkConnect</div>
          <div className="wc-copy">© {new Date().getFullYear()} WorkConnect — Connecting talent and opportunity.</div>
        </div>

        <div className="wc-footer-right">
          <Link to="/terms" className="wc-footer-link">Terms</Link>
          <Link to="/privacy" className="wc-footer-link">Privacy</Link>
        </div>
      </div>
    </footer>
  );
}
