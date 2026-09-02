import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './admin.css';
import { getAdminStats } from '../../api/admin';
import StatCard from '../../components/StatCard';
import StatsChart from '../../components/StatsChart';

export default function AdminDashboard() {
  const { profile } = useAuth();

  const [stats, setStats] = useState({
    totalJobseekers: 0,
    totalEmployers: 0,
    totalActiveJobs: 0,
    newJobs24h: 0,
    newJobs7d: 0,
    applications24h: 0,
    totalApplications: 0,
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getAdminStats(),
      fetch('/api/admin/analytics').then(r => {
        if (!r.ok) return {};
        return r.json();
      }),
    ])
      .then(([s = {}, a = {}]) => {
        // Merge safely (backend may return either shape)
        setStats(prev => ({ ...prev, ...s, ...a }));
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch admin stats/analytics:', err);
        setError('Unable to load stats. Please try again later.');
        setLoading(false);
      });
  }, []);

  // Scoped styles so we don't depend on global changes. These are lightweight and
  // chosen to match the look-and-feel of other dashboard pages (cards, spacing).
  const scopedStyles = `
    .ac-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; }
    .ac-activities { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
    .ac-card { background: var(--card-bg, #fff); border-radius: 10px; padding: 16px; box-shadow: 0 1px 3px rgba(15,23,42,0.06); }
    .ac-title { font-size: 14px; font-weight: 700; margin: 0 0 8px 0; color: var(--muted-900,#111827);} 
    .ac-value { font-size: 22px; font-weight: 700; color: var(--brand-600,#111827); }
    .ac-sub { font-size: 12px; color: #6b7280; }
    .ac-hero { display:flex; justify-content:space-between; align-items:center; gap:12px; }
    @media (max-width: 820px) { .ac-activities { grid-template-columns: 1fr; } }
    .admin-header { margin-bottom: 8px; }
    .admin-sub { margin-top: 6px; color: #6b7280; }
    .ac-skeleton { background: linear-gradient(90deg,#f3f4f6 25%,#eeeeee 37%,#f3f4f6 63%); background-size: 400% 100%; animation: shimmer 1.4s ease-in-out infinite; height: 120px; border-radius: 10px; }
    @keyframes shimmer { 0%{ background-position: 100% 0 } 100%{ background-position: -100% 0 } }
  `;

  return (
    <div className="page-content" style={{ padding: 20 }}>
      <style>{scopedStyles}</style>

      <div className="admin-header">
        <h1 style={{ margin: 0, fontSize: 26 }}>Admin Dashboard</h1>
        {/* <div className="admin-sub">Welcome{profile?.fullName ? `, ${profile.fullName}` : ''} — monitor platform activity and manage content.</div> */}
      </div>

      {loading ? (
        <div className="ac-grid" style={{ marginTop: 8 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="ac-skeleton" />
          ))}
        </div>
      ) : error ? (
        <div>
          <p style={{ color: 'red' }}>{error}</p>
          <button onClick={() => window.location.reload()} className="btn-sm">Retry</button>
        </div>
      ) : (
        <>
          <div className="ac-grid" style={{ marginBottom: 18 }}>
            <div className="ac-card">
              <div className="ac-title">Jobseekers</div>
              <div className="ac-hero">
                <div className="ac-value">{stats.totalJobseekers ?? 0}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ac-sub">Total registered jobseekers</div>
                </div>
              </div>
            </div>

            <div className="ac-card">
              <div className="ac-title">Employers / Companies</div>
              <div className="ac-hero">
                <div className="ac-value">{stats.totalEmployers ?? 0}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ac-sub">Total employer profiles</div>
                </div>
              </div>
            </div>

            <div className="ac-card">
              <div className="ac-title">Active Job Postings</div>
              <div className="ac-hero">
                <div className="ac-value">{stats.totalActiveJobs ?? stats.totalJobs ?? 0}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ac-sub">Active listings on platform</div>
                </div>
              </div>
            </div>

            <div className="ac-card">
              <div className="ac-title">Applications</div>
              <div className="ac-hero">
                <div className="ac-value">{stats.totalApplications ?? 0}</div>
                <div style={{ textAlign: 'right' }}>
                  <div className="ac-sub">Total applications</div>
                </div>
              </div>
            </div>
          </div>

          <div className="ac-activities" style={{ marginBottom: 18 }}>
            <div className="ac-card">
              <div className="ac-title">Job Posting Activity</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.totalActiveJobs ?? stats.totalJobs ?? 0}</div>
                  <div className="ac-sub">Active</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{stats.newJobs24h ?? 0}</div>
                  <div className="ac-sub">New (24h)</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{stats.newJobs7d ?? 0}</div>
                  <div className="ac-sub">New (7d)</div>
                </div>
              </div>
            </div>

            <div className="ac-card">
              <div className="ac-title">Application Activity</div>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{stats.totalApplications ?? 0}</div>
                  <div className="ac-sub">Total Applications</div>
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{stats.applications24h ?? 0}</div>
                  <div className="ac-sub">Applications (24h)</div>
                </div>
              </div>
            </div>
          </div>

          <div className="ac-card">
            {/* <div className="ac-title">Platform Overview</div> */}
            <div style={{ marginTop: 12 }}>
              <StatsChart
                stats={{
                  totalJobseekers: stats.totalJobseekers,
                  totalEmployers: stats.totalEmployers,
                  totalActiveJobs: stats.totalActiveJobs ?? stats.totalJobs,
                  totalApplications: stats.totalApplications,
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
