import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications } from '../../api/notifications';
import '../../pages/signup/signup.css';
import './jobhunter.css';
import logo from '../../assets/logo.svg';
import { markAllRead } from '../../api/notifications'; // create this API if needed

export default function DashboardLayout() {
  const { profile, logout, token } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const doLogout = () => setShowConfirm(true);

  const confirmLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.warn('Logout failed', e);
    }
    navigate('/login');
  };

  const cancelLogout = () => setShowConfirm(false);

  // Handle ESC key to close sidebar on mobile
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  // Load unread notification count and subscribe to new notifications
  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!token) return;
      try {
        const data = await getNotifications(token);
        if (!mounted) return;
        const list = Array.isArray(data) ? data : (data.notifications || []);
        const unread = list.filter(n => !n.read).length;
        setUnreadCount(unread);
      } catch (e) {
        console.warn('Failed to load notifications', e);
      }
    }

    load();

    function onNotif(e) {
      const payload = e?.detail || e;
      if (!payload) return;
      if (!payload.read) setUnreadCount(c => c + 1);
    }

    window.addEventListener('wc:notification', onNotif);

    return () => {
      mounted = false;
      window.removeEventListener('wc:notification', onNotif);
    };
  }, [token]);

  useEffect(() => {
    if (mobileOpen) document.body.classList.add('sidebar-open');
    else document.body.classList.remove('sidebar-open');
  }, [mobileOpen]);

  return (
    <div className="dashboard-root">
      {mobileOpen && <div className="dashboard-overlay show" onClick={() => setMobileOpen(false)} aria-hidden />}

      <aside className={`dashboard-sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`} style={{ position: 'relative' }}>
        <button
          className="sidebar-toggle"
          onClick={() => {
            if (window.innerWidth <= 900) setMobileOpen(o => !o);
            else setCollapsed(s => !s);
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-pressed={mobileOpen}
        >
          {collapsed ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M9 6L15 12L9 18" stroke="#ffffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <path d="M15 6L9 12L15 18" stroke="#ffffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>

        <div className="sidebar-header" style={{ marginBottom: 18 }}>
          <img src={logo} className="wc-sidebar-logo" alt="WorkConnect" />
          <div style={{ display: 'inline-block', marginLeft: 8 }}>
            <h2 className="sidebar-title">WorkConnect</h2>
            <div className="sidebar-role" style={{ marginTop: 6, color: '#6b7280' }}>Jobseeker</div>
          </div>
        </div>

        <nav>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            <li>
              <NavLink to="/jobhunter/dashboard" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="icon" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zM13 21h8V11h-8v10zm0-18v6h8V3h-8z" fill="#233038"/></svg></span>
                <span className="label">Dashboard</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/jobhunter/profile" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="icon" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 12c2.7 0 4.9-2.2 4.9-4.9S14.7 2.2 12 2.2 7.1 4.4 7.1 7.1 9.3 12 12 12zm0 2.2c-3 0-9 1.5-9 4.4V22h18v-3.4c0-2.9-6-4.4-9-4.4z" fill="#233038"/></svg></span>
                <span className="label">Profile</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/jobhunter/jobs" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="icon" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 6h16v2H4zM4 11h10v2H4zM4 16h16v2H4z" fill="#233038"/></svg></span>
                <span className="label">Job Listings</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/jobhunter/saved-jobs" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="icon" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 2h12v20l-6-3-6 3V2z" fill="#233038"/></svg></span>
                <span className="label">Saved Jobs</span>
              </NavLink>
            </li>
            <li>
              <NavLink to="/jobhunter/applications" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                <span className="icon" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M19 3H5c-1.1 0-2 .9-2 2v14l4-2 4 2 4-2 4 2V5c0-1.1-.9-2-2-2z" fill="#233038"/></svg></span>
                <span className="label">Applications</span>
              </NavLink>
            </li>
            <li style={{ position: 'relative' }}>
              <NavLink to="/jobhunter/messages" className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`} onClick={() => setUnreadMessages(0)}>
                <span className="icon" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 2H4c-1.1 0-2 .9-2 2v14l4-2 4 2 8-4V4c0-1.1-.9-2-2-2z" fill="#233038"/></svg></span>
                <span className="label">Messages</span>
                {unreadMessages > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -7,
                    background: '#e11d48',
                    color: '#fff',
                    fontSize: 12,
                    padding: '2px 6px',
                    borderRadius: 12,
                    lineHeight: 1,
                    fontWeight: 600
                  }} aria-hidden>{unreadMessages > 99 ? '99+' : unreadMessages}</span>
                )}
              </NavLink>
            </li>
            <li style={{ position: 'relative' }}>
              <NavLink 
                    to="/jobhunter/notifications"
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    onClick={async () => {
                      try {
                        await markAllRead(token); // mark all as read on server
                        setUnreadCount(0);        // hide badge
                      } catch (err) {
                        console.warn('Failed to mark all read', err);
                        setUnreadCount(0);        // still hide badge locally
                      }
                    }}
                  >
                <span className="icon" aria-hidden><svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2zm6-6V11c0-3.1-1.6-5.6-4.5-6.3V4a1.5 1.5 0 0 0-3 0v.7C7.6 5.4 6 7.9 6 11v5l-2 2v1h16v-1l-2-2z" fill="#233038"/></svg></span>
                <span className="label">Notifications</span>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -4,
                    right: -7,
                    background: '#e11d48',
                    color: '#fff',
                    fontSize: 12,
                    padding: '2px 6px',
                    borderRadius: 12,
                    lineHeight: 1,
                    fontWeight: 600
                  }} aria-hidden>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </NavLink>
            </li>

          </ul>
        </nav>

        <div style={{ position: 'absolute', bottom: 18, left: 12, right: 12 }}>
          {showConfirm ? (
            <div style={{ backgroundColor: '#fff3cd', padding: '16px', borderRadius: '8px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' }}>
              <p style={{ color: '#856404', marginBottom: '12px' }}>Are you sure you want to logout?</p>
              <button onClick={confirmLogout} style={{ marginRight: '12px', backgroundColor: '#d9534f', color: '#fff', padding: '8px 12px', borderRadius: '4px', border: 'none' }}>Yes</button>
              <button onClick={cancelLogout} style={{ backgroundColor: '#6c757d', color: '#fff', padding: '8px 12px', borderRadius: '4px', border: 'none' }}>No</button>
            </div>
          ) : (
            <button className="secondary-btn logout-btn" onClick={doLogout} style={{ width: '100%' }}>
              <span className="logout-icon" aria-hidden><svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="#233038"/></svg></span>
              <span className="logout-label">Logout</span>
            </button>
          )}
        </div>
      </aside>

      <main className="page-content">
        <Outlet />
      </main>
    </div>
  );
}
