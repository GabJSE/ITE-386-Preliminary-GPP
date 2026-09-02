import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './styles/flag-icon-emoji.css';
import App from './App';
import { SignupProvider } from './contexts/SignupContext';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './components/ToastProvider';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom'; // Added this line

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter> {/* ✅ Wrap everything inside this */}
      <AuthProvider>
        <SignupProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SignupProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

reportWebVitals();
