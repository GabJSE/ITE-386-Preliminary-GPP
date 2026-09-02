import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import './admin.css';
import logo from '../../assets/logo.svg';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaTachometerAlt,
  FaUsers,
  FaClipboardCheck,
  FaFlag,
  FaChevronLeft,
  FaChevronRight,
} from 'react-icons/fa';

export default function AdminLayout() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();

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


  const layoutStyle = {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#f4f6f8',
  };

  const sidebarStyle = {
    width: collapsed ? '72px' : '240px',
    transition: 'width 0.3s ease',
  };

  const contentStyle = {
    flex: 1,
    padding: '32px',
  };

  const headerStyle = {
    fontSize: '20px',
    fontWeight: '600',
    marginBottom: '24px',
    color: '#333',
  };

  const navLinks = [
    { to: '/admin', label: 'Dashboard', icon: <FaTachometerAlt /> },
    { to: '/admin/users', label: 'User Management', icon: <FaUsers /> },
  { to: '/admin/jobs', label: 'Job Listings', icon: <FaClipboardCheck /> },
  ];

  return (
    <div className="dashboard-root" style={layoutStyle}>
      <aside className={`dashboard-sidebar ${collapsed ? 'collapsed' : ''} admin-sidebar`} style={sidebarStyle}>
        <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <FaChevronRight /> : <FaChevronLeft />}
        </button>

  <div className="sidebar-header">
          <img src={logo} className="wc-sidebar-logo" alt="WorkConnect" />
          {!collapsed && (
            <div style={{ display: 'inline-block', marginLeft: 8 }}>
              <h2 className="sidebar-title">WorkConnect</h2>
              <div className="sidebar-role" style={{ marginTop: 6 }}>Admin</div>
            </div>
          )}
        </div>

        <nav style={{ width: '100%' }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
            {navLinks.map(({ to, label, icon }) => (
              <li key={to}>
                <NavLink to={to} end={to === '/admin'} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
                  <span className="icon" aria-hidden>{icon}</span>
                  <span className="label">{label}</span>
                </NavLink>
              </li>
            ))}
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
      <span className="logout-icon" aria-hidden>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" fill="currentColor"/></svg>
      </span>
      <span className="logout-label">Logout</span>
    </button>
  )}
</div>

      </aside>

      <main className="page-content" style={contentStyle}>
        {/* <div className="admin-header" style={headerStyle}>
          {(() => {
            // pick the most-specific matching route (longest `to`) so '/admin' doesn't win over '/admin/users'
            const match = navLinks.reduce((best, link) => {
              if (location.pathname.startsWith(link.to) && link.to.length > (best?.to?.length || 0)) return link;
              return best;
            }, null);
            return match?.label || 'Admin';
          })()}
        </div> */}
        <Outlet />
      </main>
    </div>
  );
}
