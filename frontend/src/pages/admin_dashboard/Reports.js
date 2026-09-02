import React, { useEffect, useState } from 'react';
import './admin.css';

export default function Reports() {
  const [reports, setReports] = useState([]);

  useEffect(() => {
    fetch('/api/admin/reports')
      .then(res => res.json())
      .then(data => setReports(data))
      .catch(err => console.error('Failed to fetch reports:', err));
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

  const reportCard = {
    backgroundColor: '#fff',
    borderRadius: '10px',
    padding: '20px',
    boxShadow: '0 2px 6px rgba(0,0,0,0.05)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };

  const reportInfo = {
    display: 'flex',
    flexDirection: 'column',
  };

  const reportTitle = {
    fontSize: '18px',
    fontWeight: '600',
    color: '#222',
  };

  const reportDetails = {
    fontSize: '14px',
    color: '#666',
  };

  const actionGroup = {
    display: 'flex',
    gap: '12px',
  };

  const resolveBtn = {
    backgroundColor: '#0078d4',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  };

  const dismissBtn = {
    backgroundColor: '#6b7280',
    color: '#fff',
    border: 'none',
    padding: '8px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
  };

  return (
    <div className="admin-page" style={container}>
      <h1 style={heading}>Flagged Reports</h1>
      {reports.length > 0 ? (
        reports.map((report, i) => (
          <div key={i} style={reportCard}>
            <div style={reportInfo}>
              <span style={reportTitle}>{report.subject}</span>
              <span style={reportDetails}>{report.details}</span>
            </div>
            <div style={actionGroup}>
              <button style={resolveBtn}>Resolve</button>
              <button style={dismissBtn}>Dismiss</button>
            </div>
          </div>
        ))
      ) : (
        <p>No reports found.</p>
      )}
    </div>
  );
}
