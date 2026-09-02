import React, { createContext, useContext, useEffect, useState } from 'react';

const JobsContext = createContext(null);

function formatSalary(min, max, currency, frequency) {
  if (min == null && max == null && !currency) return '';
  const fmt = (v) => {
    if (v == null) return null;
    // show thousands separator
    try { return Number(v).toLocaleString(); } catch (e) { return String(v); }
  };
  const fmin = fmt(min);
  const fmax = fmt(max);
  const freqLabel = frequency === 'hourly' ? '/hr' : '/yr';
  if (fmin && fmax) return `${currency ? currency + ' ' : ''}${fmin} - ${fmax}${currency ? '' : ''} ${freqLabel}`.trim();
  if (fmin) return `${currency ? currency + ' ' : ''}${fmin} ${freqLabel}`.trim();
  if (fmax) return `${currency ? currency + ' ' : ''}${fmax} ${freqLabel}`.trim();
  return '';
}

export function JobsProvider({ children }) {
  const defaultJobs = [
    {
      id: 1,
      title: 'Product Designer',
      company: 'Acme Company',
      location: 'Remote',
      type: 'Full-time',
      salary: '$40k - $60k',
      summary: 'Design delightful product experiences.',
      description: 'Work with cross-functional teams to design user experiences.',
      easyApply: true,
      isRemote: true,
      isHybrid: false,
      isFullTime: true,
      postedAt: '2025-10-10',
      applied: false,
      exclusive: false,
    },
    {
      id: 2,
      title: 'UI/UX Designer',
      company: 'DesignCo',
      location: 'Lisbon, PT',
      type: 'Contract',
      salary: '$30/hr',
      summary: 'Create UI mockups and prototypes.',
      description: 'Collaborate with product team to deliver high-fidelity designs.',
      easyApply: false,
      isRemote: false,
      isHybrid: false,
      isFullTime: false,
      postedAt: '2025-10-12',
      applied: true,
      exclusive: true,
    },
    {
      id: 3,
      title: 'Frontend Engineer',
      company: 'Webify',
      location: 'Manila, PH',
      type: 'Full-time',
      salary: '$20k - $35k',
      summary: 'Implement UI using React.',
      description: 'Develop and maintain frontend components and pages.',
      easyApply: true,
      isRemote: false,
      isHybrid: false,
      isFullTime: true,
      postedAt: '2025-09-30',
      applied: false,
      exclusive: false,
    }
  ];

  const [jobs, setJobs] = useState(() => {
    try {
      const raw = localStorage.getItem('wc_jobs');
      return raw ? JSON.parse(raw) : defaultJobs;
    } catch (e) {
      return defaultJobs;
    }
  });

  // savedJobs is an array of objects: { id, savedAt }
  const [savedJobs, setSavedJobs] = useState(() => {
    try {
      const raw = localStorage.getItem('wc_saved_jobs');
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // support old format where array might be list of ids (strings/numbers)
      if (parsed.length === 0) return [];
      if (typeof parsed[0] === 'string' || typeof parsed[0] === 'number') {
        return parsed.map(id => ({ id, savedAt: null }));
      }
      // already in new format
      return parsed.map(p => ({ id: p.id, savedAt: p.savedAt || null }));
    } catch (e) {
      return [];
    }
  });

  // persist saved jobs locally
  useEffect(() => {
    try {
      localStorage.setItem('wc_saved_jobs', JSON.stringify(savedJobs));
    } catch (e) {
      // ignore
    }
  }, [savedJobs]);

  function toggleSave(jobOrId) {
    const id = typeof jobOrId === 'string' || typeof jobOrId === 'number' ? jobOrId : (jobOrId && (jobOrId.id || jobOrId._id || jobOrId._id) );
    if (!id) return;
    setSavedJobs(prev => {
      const exists = prev.findIndex(s => String(s.id) === String(id));
      if (exists !== -1) {
        // remove
        return prev.filter(s => String(s.id) !== String(id));
      }
      // add with timestamp
      return [{ id, savedAt: new Date().toISOString() }, ...prev];
    });
  }

  // convenience derived array of ids for legacy checks
  const savedJobIds = savedJobs.map(s => s.id);

  // persist locally
  useEffect(() => {
    try {
      localStorage.setItem('wc_jobs', JSON.stringify(jobs));
    } catch (e) {
      // ignore storage errors
    }
  }, [jobs]);

  // try to fetch from backend on mount — if available, use backend list (overrides local)
  useEffect(() => {
    let mounted = true;
    async function fetchJobs() {
      try {
        const res = await fetch('/api/jobs');
        if (!res.ok) return;
        const data = await res.json();
        if (!mounted) return;
        // normalize postedAt to date-only string for older entries
  const normalized = data.map(j => ({ ...j, postedAt: j.postedAt ? j.postedAt.toString().slice(0,10) : '' }));
        setJobs(normalized);
      } catch (e) {
        // backend not available — keep local jobs
      }
    }
    fetchJobs();
    return () => { mounted = false; };
  }, []);

  function addJob(job) {
    // returns a promise resolving to the mapped job (server-saved or local fallback)
    return (async () => {
      try {
        const res = await fetch('/api/jobs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(job) });
        if (res.ok) {
          const saved = await res.json();
          // server returns created job with _id
            const mapped = { 
            id: saved._id || saved.id || Date.now(),
            title: saved.title,
            company: saved.company,
            category: saved.category || '',
            location: saved.location || (saved.city ? `${saved.city}${saved.stateOrProvince ? ', ' + saved.stateOrProvince : ''}${saved.country ? ', ' + saved.country : ''}` : ''),
            city: saved.city || null,
            stateOrProvince: saved.stateOrProvince || null,
            country: saved.country || null,
            type: saved.type,
            deadline: saved.deadline || saved.applicationDeadline || '',
            expirationDate: saved.expirationDate || '',
            minSalary: saved.minSalary,
            maxSalary: saved.maxSalary,
            currency: saved.currency,
            salary: formatSalary(saved.minSalary, saved.maxSalary, saved.currency, saved.salaryFrequency),
            logoUrl: saved.logoUrl,
            logoName: saved.logoName,
            summary: saved.summary,
            description: saved.description,
              responsibilities: saved.responsibilities || [],
              requirements: saved.requirements || [],
              skills: saved.skills || [],
              benefits: saved.benefits || [],
              experienceLevel: saved.experienceLevel || '',
              educationLevel: saved.educationLevel || '',
              applicationMethod: saved.applicationMethod || '',
              applicationTarget: saved.applicationTarget || '',
              preferred: saved.preferred || '',
            easyApply: saved.easyApply,
            isRemote: saved.isRemote,
            isHybrid: saved.isHybrid,
            isFullTime: saved.isFullTime,
            postedAt: saved.postedAt ? saved.postedAt.toString().slice(0,10) : new Date().toISOString().slice(0,10),
            applied: saved.applied || false,
            exclusive: saved.exclusive || false,
          };
            setJobs(prev => [mapped, ...prev]);
            return { job: mapped, fromServer: true };
        }
      } catch (e) {
        // backend not reachable — fallback to local
      }

      const newJob = {
        id: Date.now(),
        title: job.title || 'Untitled',
        company: job.company || 'Unknown',
        category: job.category || '',
        location: job.location || (job.city ? `${job.city}${job.stateOrProvince ? ', ' + job.stateOrProvince : ''}${job.country ? ', ' + job.country : ''}` : ''),
        city: job.city || null,
        stateOrProvince: job.stateOrProvince || null,
        country: job.country || null,
        type: job.type || '',
        deadline: job.deadline || job.applicationDeadline || '',
        expirationDate: job.expirationDate || '',
        minSalary: job.minSalary || null,
        maxSalary: job.maxSalary || null,
        currency: job.currency || '',
        salary: formatSalary(job.minSalary, job.maxSalary, job.currency, job.salaryFrequency),
        logoUrl: job.logoUrl || null,
        logoName: job.logoName || '',
        summary: job.summary || job.description?.slice(0, 120) || '',
        description: job.description || job.summary || '',
  responsibilities: job.responsibilities || [],
  requirements: job.requirements || [],
  skills: job.skills || [],
  benefits: job.benefits || [],
  experienceLevel: job.experienceLevel || '',
  educationLevel: job.educationLevel || '',
  applicationMethod: job.applicationMethod || '',
  applicationTarget: job.applicationTarget || '',
  preferred: job.preferred || '',
        easyApply: !!job.easyApply,
        isRemote: job.workArrangement === 'remote' || false,
        isHybrid: job.workArrangement === 'hybrid' || false,
        isFullTime: job.type && job.type.toLowerCase().includes('full'),
        postedAt: new Date().toISOString().slice(0, 10),
        applied: false,
        exclusive: !!job.exclusive,
      };
        setJobs(prev => [newJob, ...prev]);
        return { job: newJob, fromServer: false };
    })();
  }

  return (
    <JobsContext.Provider value={{ jobs, setJobs, addJob, savedJobs, savedJobIds, toggleSave }}>
      {children}
    </JobsContext.Provider>
  );
}

export function useJobs() {
  const ctx = useContext(JobsContext);
  if (!ctx) throw new Error('useJobs must be used within JobsProvider');
  return ctx;
}
