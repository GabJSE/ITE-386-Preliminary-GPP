import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import './EmployerDashboard.css';

export default function EmployerDashboard() {
  const { profile, token } = useAuth();

  const [stats, setStats] = useState({
    jobs: [],
    applications: [],
    activeJobs: [],
    ongoingInterviews: [],
  });
  const [employerProfile, setEmployerProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch employer profile
useEffect(() => {
  async function fetchEmployerProfile() {
    try {
      const base = process.env.REACT_APP_API_URL || '';
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const employerId = profile?.userId || profile?.id || profile?._id;
      if (!employerId) return;

      // ✅ Correct endpoint and query param
      const res = await fetch(`${base}/api/profile/${encodeURIComponent(employerId)}?userType=EmployersProfile`, { headers });
      if (res.ok) {
        const data = await res.json();
        setEmployerProfile(data || {});
      } else {
        console.warn('Failed to fetch employer profile', res.statusText);
      }
    } catch (e) {
      console.warn('Failed to fetch employer profile', e);
    }
  }
  fetchEmployerProfile();
}, [token, profile]);


  // Fetch stats (jobs, applications)
  useEffect(() => {
    let cancelled = false;
    async function loadStats() {
      setLoading(true);
      setError(null);
      try {
        const base = process.env.REACT_APP_API_URL || '';
        const employerId =
          profile?.userId ||
          profile?.id ||
          profile?._id ||
          profile?.employerId ||
          profile?.companyId;

        if (!employerId) {
          setLoading(false);
          return;
        }

        // Fetch jobs
        let jobs = [];
        try {
          const jobsRes = await fetch(`${base}/api/jobs?createdBy=${encodeURIComponent(employerId)}`);
          if (jobsRes.ok) {
            const jobsData = await jobsRes.json();
            jobs = Array.isArray(jobsData)
              ? jobsData
              : Array.isArray(jobsData.jobs)
              ? jobsData.jobs
              : [];
          }
        } catch (e) {
          console.warn('Failed to fetch employer jobs', e);
        }

        // Fetch applications
        let applications = [];
        try {
          const headers = { 'Content-Type': 'application/json' };
          if (token) headers.Authorization = `Bearer ${token}`;
          const appsRes = await fetch(`${base}/api/applications/employer/${encodeURIComponent(employerId)}`, { headers });
          if (appsRes.ok) {
            const appsData = await appsRes.json();
            applications = (Array.isArray(appsData.applications)
              ? appsData.applications
              : Array.isArray(appsData)
              ? appsData
              : []
            ).map(app => ({
              ...app,
              applicantName:
                app.applicantName ||
                app.fullName ||
                `${app.applicant?.firstName || ''} ${app.applicant?.lastName || ''}`.trim() ||
                'N/A',
              jobTitle: app.jobTitle || app.job?.title || 'N/A',
              dateApplied: app.appliedAt || app.createdAt || null,
            }));
          }
        } catch (e) {
          console.warn('Failed to fetch employer applications', e);
        }

        // Derive active jobs and ongoing interviews
        const ongoing = applications.filter(a => {
          const s = (a.status || '').toLowerCase();
          return (
            s.includes('interview') ||
            s.includes('shortlist') ||
            s.includes('scheduled') ||
            s.includes('on hold') ||
            s.includes('phone')
          );
        });

        const activeJobs = jobs
          .filter(j => (j.status || '').toLowerCase() !== 'closed')
          .map(j => ({
            ...j,
            contactName: j.contactName || profile?.companyName || '',
            postedDate: j.postedAt || j.postedDate || j.createdAt || null,
          }));

        if (!cancelled) {
          setStats({ jobs, applications, activeJobs, ongoingInterviews: ongoing });
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load stats');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadStats();
    return () => {
      cancelled = true;
    };
  }, [token, profile]);

  // Derived statistics
  const derivedStats = useMemo(() => {
    const totalJobPosts = stats.jobs.length;
    const totalApplicants = stats.applications.length;
    const pendingApplications = stats.applications.filter(a =>
      ['pending', 'new', 'in review'].includes((a.status || '').toLowerCase())
    ).length;
    const hiredApplicants = stats.applications.filter(a =>
      ['hired', 'accepted'].includes((a.status || '').toLowerCase())
    ).length;

    const completionFields = [
      employerProfile?.companyName,
      employerProfile?.ownerEmail,
      employerProfile?.ownerPhone,
      employerProfile?.companyLogo,
      employerProfile?.companyWebsite,
      employerProfile?.companyStreetAddress,
      employerProfile?.companyCity,
      employerProfile?.companyRegion,
      employerProfile?.companyPostalCode,
      employerProfile?.companyCountry,
      employerProfile?.companyDescription
    ];

    const completedCount = completionFields.filter(Boolean).length;
    const completionPercentage = Math.round((completedCount / completionFields.length) * 100);

    return { totalJobPosts, totalApplicants, pendingApplications, hiredApplicants, completionPercentage };
  }, [stats, employerProfile]);

  const getStatusClass = status => {
    const s = (status || '').toLowerCase();
    if (s.includes('hired') || s.includes('accepted')) return 'status-Hired';
    if (s.includes('rejected')) return 'status-Rejected';
    if (s.includes('interview') || s.includes('scheduled') || s.includes('shortlist')) return 'status-Interview';
    return 'status-Pending';
  };

  const getInitials = name => {
    if (!name) return 'Co';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div>
          <h1 className="heading">Employer Dashboard</h1>
          <p className="subheading">
            Welcome{profile?.companyName ? `, ${profile.companyName}` : ''}
          </p>
        </div>
      </div>

      <div className="main-content">
        {/* Left Panel */}
        <div className="left-panel">
          <div className="stats-grid">
            <div className="card">
              <p className="section-title">Total Job Posts</p>
              <p className="bold-text">{derivedStats.totalJobPosts}</p>
            </div>

            <div className="card">
              <p className="section-title">Active Job Posts</p>
              <p className="bold-text">{stats.activeJobs.length}</p>
              <p className="light-text">
                {stats.activeJobs.length > 0
                  ? `Manage ${stats.activeJobs.length} active posts.`
                  : 'Start posting jobs now.'}
              </p>
            </div>

            <div className="card">
              <p className="section-title">Total Applicants</p>
              <p className="bold-text">{derivedStats.totalApplicants}</p>
            </div>

            <div className="card">
              <p className="section-title">Hired Applicants</p>
              <p className="bold-text">{derivedStats.hiredApplicants}</p>
            </div>
          </div>

          {/* Recent Applications */}
          <div className="recent-applications-section">
            <p className="section-title">Recent Applications</p>
            <div className="pending-list">
              {loading && <div style={{ padding: 12 }}>Loading applications...</div>}
              {error && <div style={{ padding: 12, color: '#c0392b' }}>Error: {error}</div>}
              {!loading && !error && stats.applications.length > 0 && (
                <div className="list-header">
                  <span>Applicant Name</span>
                  <span>Job Title</span>
                  <span>Date Applied</span>
                  <span>Status</span>
                </div>
              )}
              {!loading &&
                !error &&
                stats.applications.slice(0, 5).map((app, i) => (
                  <div key={i} className="pending-item">
                    <div className="app-info">
                      <span className="app-name">{app.applicantName}</span>
                      <span className="app-role">{app.currentPosition || 'Candidate'}</span>
                    </div>
                    <span className="job-title-text">{app.jobTitle}</span>
                    <span className="date-text">
                      {app.dateApplied ? new Date(app.dateApplied).toLocaleDateString() : '—'}
                    </span>
                    <span className={`status-badge ${getStatusClass(app.status)}`}>
                      {app.status || 'Pending'}
                    </span>
                  </div>
                ))}
              {!loading && !error && stats.applications.length === 0 && (
                <div style={{ padding: 12, textAlign: 'center', color: '#666' }}>
                  No recent applications found.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="right-panel">
  {employerProfile ? (
    <div className="card profile-summary-card">
      <p className="section-title">Company Profile</p>
      <div className="company-logo">
        {employerProfile.companyLogo ? (
          <img src={employerProfile.companyLogo} alt={`${employerProfile.companyName} Logo`} />
        ) : (
          getInitials(employerProfile.companyName || 'Company')
        )}
      </div>

      <p className="company-name">{employerProfile.companyName || 'Company Name'}</p>

      <div className="contact-info">
        <p>{employerProfile.ownerEmail || 'N/A'}</p>
        <p>{employerProfile.ownerPhone || 'N/A'}</p>
        <p>{employerProfile.companyWebsite || 'No website listed'}</p>
      </div>

      <p className="completion-text">
        Profile Completion: {derivedStats.completionPercentage}%
      </p>
      <div className="completion-bar">
        <div
          className="completion-progress"
          style={{ width: `${derivedStats.completionPercentage}%` }}
        ></div>
      </div>
    </div>
  ) : (
    <div style={{ padding: 12, color: '#666' }}>Loading profile...</div>
  )}
</div>

      </div>
    </div>
  );
}
