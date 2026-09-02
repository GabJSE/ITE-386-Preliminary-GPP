import React, { useEffect, useState, useMemo } from 'react'; // Added useMemo
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useJobs } from '../../contexts/JobsContext';
import './dashboard.css';
import { uploadFile } from '../../api/upload';
import { sendApplication } from '../../api/applications';
import { getConversations } from '../../api/messages';
import { getNotifications, markRead as apiMarkRead } from '../../api/notifications';


// --- PLACEHOLDER FUNCTION TO PERSIST PROFILE CHANGES ---
// NOTE: Replace this with your actual API call to save user profile data
async function updateProfile(profileData, token) {
  // const base = process.env.REACT_APP_API_URL || '';
  // const headers = { 'Content-Type': 'application/json' };
  // if (token) headers.Authorization = `Bearer ${token}`;
  // const res = await fetch(`${base}/api/profile`, {
  //   method: 'PUT',
  //   headers,
  //   body: JSON.stringify(profileData),
  // });
  // if (!res.ok) {
  //   throw new Error('Failed to save profile changes.');
  // }
  console.log("Simulating API call to save profile:", profileData);
}
// -----------------------------------------------------

// Helper to get initials for a fallback logo
const getInitials = (name) => {
  if (!name) return 'J';
  return name.split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};


export default function JobhunterDashboard() {
  const { profile, token, userId, setProfile } = useAuth();
  const navigate = useNavigate();
  

  const [resume, setResume] = useState(profile?.resume || null);

  const { jobs, savedJobs: savedJobsList, savedJobIds, toggleSave } = useJobs();

  const [recommendedJobs, setRecommendedJobs] = useState([]);

  const [appliedJobs, setAppliedJobs] = useState([]);

  const [notifications, setNotifications] = useState([]);

  const [messages, setMessages] = useState([]);

  const handleApply = (job) => {
    // --- 1. ADD RESUME CHECK ---
    const resumeUrl = resume?.url || profile?.resume?.url || null;
    if (!resumeUrl) {
      alert('Please upload your resume before applying for a job.');
      return;
    }
    // ---------------------------

    // If already applied, inform user
    const jid = job._id || job.id;
    if (appliedJobs.find((a) => String(a.jobId) === String(jid))) {
      alert(`You already applied to ${job.title} at ${job.company}`);
      return;
    }

    // Build payload for API
    const payload = {
      applicantId: userId,
      employerId: job.createdBy || null,
      jobId: job._id || job.id,
      jobTitle: job.title,
      fullName: profile?.firstName ? `${profile.firstName} ${profile.lastName || ''}`.trim() : '',
      email: profile?.email || '',
      resumeUrl: resumeUrl, // Use the checked URL
      applicationDate: new Date().toISOString(),
    };

    sendApplication(payload).then((res) => {
      const app = res && res.application ? res.application : { id: `app-${Date.now()}`, jobId: payload.jobId, title: job.title, company: job.company, status: 'pending' };
      setAppliedJobs((prev) => [app, ...prev]);
      alert(`Applied to ${job.title} at ${job.company}`);
    }).catch((err) => {
      console.error('Failed to send application', err);
      alert('Failed to submit application. Please try again.');
    });
  };

  // toggleSave provided by JobsContext

  const handleUploadResume = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    // upload file to server
    (async () => {
      try {
        const res = await uploadFile(file);
        // res expected { url }
        const r = { name: file.name, url: res.url, uploadedAt: new Date().toISOString() };
        
        // --- RESUME FIX: 1. UPDATE PROFILE IN STATE/CONTEXT ---
        setResume(r);
        const newProfile = { ...profile, resume: r };
        if (setProfile) setProfile(newProfile);
        
        // --- RESUME FIX: 2. PERSIST PROFILE CHANGE TO BACKEND (using placeholder) ---
        await updateProfile({ resume: r }, token); 

        alert(`Uploaded resume: ${file.name}`);
      } catch (err) {
        console.error('Upload failed', err);
        alert('Upload failed. Please try again.');
      }
    })();
  };
  
  // --- NEW PROFILE COMPLETION LOGIC ---
  const derivedStats = useMemo(() => {
  if (!profile) return { completionPercentage: 0 };

  const checkFields = [
    profile.firstName,
    profile.lastName,
    profile.email,
    profile.profession || profile.desiredJobType,
    profile.bio,
    profile.skills?.length > 0,
    resume?.url || profile.resumeUrl,
    profile.githubUrl,
    profile.certifications?.length > 0,
    profile.experience?.length > 0,
    profile.education?.length > 0,
  ];

  const totalFields = checkFields.length;
  const filledFields = checkFields.filter(f => f && String(f).length > 0).length;
  const completionPercentage = totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;

  return { completionPercentage };
}, [profile, resume]);



  // derive recommended jobs from JobsContext and user profile
  useEffect(() => {
    try {
      const raw = Array.isArray(jobs) ? jobs : [];
      if (!profile || raw.length === 0) {
        setRecommendedJobs(raw);
        return;
      }

      // 💡 Use profile fields based on the provided schema
      const prefType = profile.desiredJobType ? String(profile.desiredJobType).toLowerCase() : null;
      const prefCategories = Array.isArray(profile.preferredJobCategories)
        ? profile.preferredJobCategories.map(c => String(c).toLowerCase())
        : [];
      const prefLoc = profile.preferredLocation ? String(profile.preferredLocation).toLowerCase() : null;
      const prefExp = profile.careerLevelTarget ? String(profile.careerLevelTarget).toLowerCase() : null;
      const profSkills = Array.isArray(profile.skills) ? profile.skills.map(s => String(s).toLowerCase()) : [];

      const scoreJob = (job) => {
        let score = 0;
        
        // 1. Job Category Match (Highest weight: 5)
        const jobCat = job.category || '';
        if (jobCat && prefCategories.length > 0) {
          if (prefCategories.some(pref => jobCat.toLowerCase().includes(pref))) {
            score += 5;
          }
        }

        // 2. Location Match (Weight: 4)
        const jobLocString = ((job.location || job.city || job.country) || '').toLowerCase();
        if (prefLoc && jobLocString.includes(prefLoc)) {
          score += 4;
        }

        // 3. Job Type Match (Weight: 3) - Uses desiredJobType
        if (prefType && job.type && job.type.toLowerCase() === prefType) {
          score += 3;
        }

        // 4. Career Level/Experience Match (Weight: 2)
        if (prefExp && job.experienceLevel && job.experienceLevel.toLowerCase() === prefExp) {
          score += 2;
        }
        
        // 5. Skill Overlap (Weight: 1 per skill, max 3)
        if (Array.isArray(job.skills) && profSkills.length > 0) {
          const jobSkillsLower = job.skills.map(s => String(s).toLowerCase());
          const matches = jobSkillsLower.filter(s => profSkills.includes(s));
          score += Math.min(matches.length, 3);
        }

        return score;
      };

      const scored = raw.map(j => ({ j, score: scoreJob(j) }));
      // Sort by score (descending)
      scored.sort((a, b) => b.score - a.score); 
            
      // Only keep jobs with a score greater than zero
      const positive = scored.filter(x => x.score > 0).map(x => x.j);
        
      // If no jobs are recommended, show all jobs
      setRecommendedJobs(positive.length > 0 ? positive : raw);
      
    } catch (e) {
      console.warn('Failed to compute recommended jobs', e);
      setRecommendedJobs(jobs || []);
    }
  }, [jobs, profile]);

  // fetch user conversations
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (userId) {
          const convData = await getConversations(userId, profile?.userType || 'Profile');
          const conv = convData.conversations || [];
          if (!cancelled && Array.isArray(conv)) {
            const msgs = conv.map((c, idx) => ({
              id: c._id || c.id || `c${idx}`,
              from: c.title || 'Conversation',
              subject: c.lastMessage || '',
              snippet: c.lastMessage || '',
              // --- BUG FIX: Use 'unread' or 'read' status from API ---
              unread: c.unread || (c.read === false), 
              // --------------------------------------------------------
            }));
            setMessages(msgs);
          }
        }
      } catch (err) {
        console.warn('Failed to load conversations', err);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // fetch notifications for jobseeker
  useEffect(() => {
    let mounted = true;
    async function loadNotifs() {
      try {
        const data = await getNotifications(token);
        if (mounted) setNotifications(Array.isArray(data) ? data : []);
      } catch (err) {
        console.warn('Failed to load notifications', err);
      }
    }
    if (userId) loadNotifs();

    function onNotif(e) {
      const payload = e.detail || e;
      setNotifications((prev) => [payload, ...prev]);
    }
    window.addEventListener('wc:notification', onNotif);
    return () => {
      mounted = false;
      window.removeEventListener('wc:notification', onNotif);
    };
  }, [userId, token]);

  // fetch applications for this applicant (real data)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!userId) return;
        const base = process.env.REACT_APP_API_URL || '';
        const res = await fetch(`${base}/api/applications/applicant/${encodeURIComponent(userId)}`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        // route returns { applications: [...] }
        const apps = Array.isArray(data.applications) ? data.applications : [];
        setAppliedJobs(apps.map(a => ({ id: a._id || a.id, jobId: a.jobId, title: a.jobTitle || a.title || '', company: a.company || '', status: a.status || 'pending' })));
      } catch (e) {
        // ignore; keep empty appliedJobs
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const markNotificationRead = (id) => {
    // optimistic UI + server call
    setNotifications((prev) => prev.map((n) => (String(n._id || n.id) === String(id) ? { ...n, read: true } : n)));
    apiMarkRead(id, token).catch((err) => console.warn('Failed to mark read', err));
  };

  const markMessageRead = (id) => {
    setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, unread: false } : m)));
  };

  // Analytics derived values
  const analytics = {
    totalApplications: appliedJobs.length,
    savedJobs: savedJobsList.length,
    profileViews: 42, // placeholder
    jobsViewed: 128, // placeholder
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-grid">
        {/* Left column: Profile, Notifications, Messages */}
        <aside className="left-col">
          {/* --- PROFILE SUMMARY CARD (Matching EmployerDashboard.js) --- */}
          <section className="profile-summary card profile-summary-card"> 
            <div className="jobhunter-avatar-wrapper">
              <div className="avatar">
                {profile?.avatarUrl || profile?.avatar || profile?.image ? (
                  <img
                    src={profile.avatarUrl || profile.avatar || profile.image}
                    alt={`${profile.firstName || 'User'} ${profile.lastName || ''}`}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span>
                    {(profile?.firstName?.[0] || 'J') + (profile?.lastName?.[0] || '')}
                  </span>
                )}
              </div>
            </div>


            
            <p className="jobhunter-name">{profile?.firstName || 'Jobseeker'} {profile?.lastName || ''}</p>
            {/* <p className="jobhunter-profession">{profile?.profession || 'Job Hunter'}</p> */}

            <div className="contact-info">
              <p>{profile?.email || 'N/A'}</p>
              <p>{profile?.phone || 'N/A'}</p>
              <p>Location: {profile?.city || 'N/A'}</p> 
            </div>

            {/* --- COMPLETION BAR (For Employer Dashboard Look) --- */}
            <p className="completion-text">
              Profile Completion: {derivedStats.completionPercentage}%
            </p>
            <div className="completion-bar">
              <div
                className="completion-progress"
                style={{ width: `${derivedStats.completionPercentage}%` }}
              ></div>
            </div>
            {/* ---------------------------------------------------- */}
            
            {/* <div className="skills-and-resume">
              <div className="skills">
                <strong>Skills:</strong>
                <div className="skill-list">{profile?.skills?.join(', ') || 'React, JavaScript, CSS'}</div>
              </div>

              <div className="resume-upload">
                <label className="upload-label">Resume:</label>
                <div className="resume-row">
                  <input type="file" onChange={handleUploadResume} /> */}
                  {/* --- RESUME FIX: Display file name from state --- */}
                  {/* <div className="resume-info">{resume?.name || 'No resume uploaded'}</div>
                </div>
              </div>
            </div> */}
          </section>
          {/* --- END PROFILE SUMMARY CARD --- */}


          <section className="notifications card">
            <h3>Notifications</h3>
            {notifications.length === 0 && <p>No notifications</p>}
            <ul>
              {notifications.map((n, idx) => (
                <li
                  key={n._id || n.id || `notif-${idx}`}
                  className={n.read ? 'read' : 'unread'}
                >
                  <div>{n.text || n.title || 'Notification'}</div>
                  {!n.read && (
                    <button onClick={() => markNotificationRead(n._id || n.id)}>
                      Mark read
                    </button>
                  )}
                </li>
              ))}
            </ul>

          </section>

          {/* <section className="messages card">
            <h3>Inbox</h3>
            {messages.length === 0 && <p>No messages</p>}
            <ul>
              {messages.map((m) => (
                <li key={m.id} className={m.unread ? 'unread' : ''}>
                  <div className="msg-from">{m.from}</div>
                  <div className="msg-subject">{m.subject}</div>
                  <div className="msg-snippet">{m.snippet}</div>
                  {m.unread && <button onClick={() => markMessageRead(m.id)}>Mark read</button>}
                </li>
              ))}
            </ul>
          </section> */}
        </aside>

        {/* Main column: Recommendations, Applied, Saved, Analytics, Settings, Help */}
        <main className="main-col">
          <section className="recommended card">
            <h2>Recommended Jobs</h2>
            <div className="job-list">
              {recommendedJobs.map((job) => (
                <div className="job-card" key={job._id || job.id}>
                  {/* --- LOGO FIX: Add logo/initials component to job card --- */}
                  <div className="job-card-logo">
                    {(job.logoUrl || job.logo) ? (
                      <img src={job.logoUrl || job.logo} alt={`${job.company} Logo`} className="job-logo-img" />
                    ) : (
                      <div className="job-logo-initials">
                        {getInitials(job.company || job.title)}
                      </div>
                    )}
                  </div>
                  {/* -------------------------------------------------------- */}
                  <div className="job-info">
                    <h3>{job.title}</h3>
                    <p className="meta">{job.company} — {job.location}</p>
                  </div>
                  <div className="job-actions">
                    {/* --- ADD APPLY BUTTON --- */}
                    {/* <button className="apply-btn" onClick={() => handleApply(job)}>Apply</button> */}
                    {/* ------------------------ */}
                    <button className="apply-btn secondary" onClick={() => { const id = job._id || job.id; navigate(`/jobhunter/jobs?jobId=${encodeURIComponent(id)}`); }}>View</button>
                    <button className="save-btn" onClick={() => toggleSave(job)}>{savedJobIds.includes(job._id || job.id) ? 'Saved' : 'Save'}</button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="applied card">
            <h2>Applied Jobs</h2>
            {appliedJobs.length === 0 ? <p>No applications yet</p> : (
              <table className="applied-table">
                <thead>
                  <tr><th>Job</th><th>Company</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {appliedJobs.map((a) => (
                    <tr key={a.id}>
                      <td>{a.title}</td>
                      <td>{a.company}</td>
                      <td className={`status ${a.status}`}>{a.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section className="saved card">
            <h2>Saved Jobs</h2>
            {(!savedJobsList || savedJobsList.length === 0) ? <p>No saved jobs</p> : (
              <ul>
                {savedJobsList.map((s) => {
                  const id = s.id || s.jobId || s._id;
                  const job = (jobs || []).find((j) => String(j._id || j.id) === String(id)) || { id, title: 'Unknown' };
                  return (
                    <li key={id}>
                      {job.title} — {job.company}
                      <button className="remove-btn" onClick={() => toggleSave(job)}>Remove</button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* <section className="analytics card">
            <h2>Activity Summary</h2>
            <div className="analytics-grid">
              <div className="metric">
                <div className="metric-value">{analytics.totalApplications}</div>
                <div className="metric-label">Applications</div>
              </div>
              <div className="metric">
                <div className="metric-value">{analytics.jobsViewed}</div>
                <div className="metric-label">Jobs Viewed</div>
              </div>
              <div className="metric">
                <div className="metric-value">{analytics.profileViews}</div>
                <div className="metric-label">Profile Views</div>
              </div>
              <div className="metric">
                <div className="metric-value">{analytics.savedJobs}</div>
                <div className="metric-label">Saved Jobs</div>
              </div>
            </div>
          </section> */}

          <section className="settings-help card">
            <div className="settings">
              <h3>Account Settings</h3>
              <p>Edit your personal info, change password, and manage preferences.</p>
              <button className="edit-btn" onClick={() => navigate('/jobhunter/profile')}>
  Edit Profile
</button>
            </div>

            {/* <div className="help">
              <h3>Help & Support</h3>
              <p>Check our FAQs or contact support if you need help.</p>
              <button className="edit-btn">Contact Support</button>
            </div> */}
          </section>
        </main>
      </div>
    </div>
  );
}