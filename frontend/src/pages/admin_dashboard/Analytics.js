import React, { useEffect, useState } from 'react';
import './admin.css';

export default function Analytics() {
  const [metrics, setMetrics] = useState({
    totalUsers: 0,
    totalJobs: 0,
    totalApplications: 0,
    flaggedReports: 0,
    activeEmployers: 0,
    activeJobseekers: 0,
  });

  useEffect(() => {
    fetch('/api/admin/analytics')
      .then(res => res.json())
      .then(data => setMetrics(data))
      .catch(err => console.error('Failed to fetch analytics:', err));
  }, []);

  const container = {
    padding: '32px',
    fontFamily: 'Segoe UI, sans-serif',
    backgroundColor: '#f4f6f8',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  };

  const heading = {
    fontSize: '28px',
    fontWeight: '600',
    color: '#333',
  };

  const grid = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '24px',
  };

  const card = {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '24px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    minHeight: '160px',
  };

  const title = {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: '#222',
  };

  const stat = {
    fontSize: '24px',
    fontWeight: '700',
    color: '#333',
  };

  return (
    <div className="admin-page" style={container}>
      <h1 style={heading}>Platform Analytics</h1>
      <div style={grid}>
        <div style={card}>
          <p style={title}>Total Users</p>
          <p style={stat}>{metrics.totalUsers}</p>
        </div>
        <div style={card}>
          <p style={title}>Active Employers</p>
          <p style={stat}>{metrics.activeEmployers}</p>
        </div>
        <div style={card}>
          <p style={title}>Active Jobseekers</p>
          <p style={stat}>{metrics.activeJobseekers}</p>
        </div>
        <div style={card}>
          <p style={title}>Total Job Posts</p>
          <p style={stat}>{metrics.totalJobs}</p>
        </div>
        <div style={card}>
          <p style={title}>Total Applications</p>
          <p style={stat}>{metrics.totalApplications}</p>
        </div>
        <div style={card}>
          <p style={title}>Flagged Reports</p>
          <p style={stat}>{metrics.flaggedReports}</p>
        </div>
      </div>
    </div>
  );
}
