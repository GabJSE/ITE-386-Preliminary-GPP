import React, { useState, useEffect, useRef } from 'react';
import { saveProfile } from '../../api/profile';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import './profile.css';
import { useToast } from '../../components/ToastProvider';
import ChangePasswordModal from "../../components/ChangePasswordModal.js";
import DocumentPreviewModal from '../../components/DocumentPreviewModal';

export default function Profile() {
  const { profile, token, setProfile } = useAuth(); // profile picture and basic info from auth
  const location = useLocation();
  // If another component navigated here with applicantProfile in state, use it as the source
  const incoming = location && location.state && location.state.applicantProfile ? location.state.applicantProfile : null;
  const isViewingExternal = !!incoming; // when true, this page should be read-only / view-only for that incoming profile
  const navigate = useNavigate();
  const toast = useToast();

  // editing state per section
  const [editingBasic, setEditingBasic] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState(false);
  const [editingDocuments, setEditingDocuments] = useState(false);
  const [editingPreferences, setEditingPreferences] = useState(false);

  // lightweight local state for UI-only interactions (uploads, edits)
  const [completeness, setCompleteness] = useState(82);
  const [activities, setActivities] = useState([]);
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [avatarEditing, setAvatarEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const avatarInputRef = useRef(null);
  const [showChangeModal, setShowChangeModal] = useState(false);
  

  // Use incoming profile (via location.state) when present, otherwise use profile from auth; fall back to safe defaults
  const defaultAvatar = 'https://ui-avatars.com/api/?name=User&background=E0E7FF&color=1D4ED8';
  const sourceProfile = incoming || profile;
  const user = sourceProfile || {
    firstName: '',
    lastName: '',
    role: '',
    location: '',
    image: defaultAvatar,
    email: '',
    phone: ''
  };

  // Controlled fields for main profile inputs
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [emailState, setEmailState] = useState(user.email || '');
  const [phoneState, setPhoneState] = useState(user.phone || '');
  // Prefer structured fields when available (stored in Profile or EmployersProfile).
  // Fall back to legacy `location` string when necessary.
  const legacyParts = (user.location || '').split(',').map(p => p.trim()).filter(Boolean);
  const initialCity = user.city || user.companyCity || legacyParts[0] || '';
  const initialState = user.stateprovince || user.companyRegion || legacyParts[1] || '';
  const initialCountry = user.country || user.companyCountry || legacyParts.slice(2).join(', ') || '';
  const [cityState, setCityState] = useState(initialCity);
  const [stateProvince, setStateProvince] = useState(initialState);
  const [country, setCountry] = useState(initialCountry);
  const [bioState, setBioState] = useState(user.bio || '');
  const [gender, setGender] = useState(user.gender || '');
  const [dob, setDob] = useState(user.dob ? new Date(user.dob).toISOString().substr(0,10) : '');
  const [nationality, setNationality] = useState(user.nationality || '');
  const [desiredJobType, setDesiredJobType] = useState(user.desiredJobType || 'Full-time');
  const [workArrangement, setWorkArrangement] = useState(user.workArrangement || 'On-site');
  const [expectedSalary, setExpectedSalary] = useState(user.expectedSalary || '');
  // Preferences: new fields
  const [preferredCategories, setPreferredCategories] = useState(() => (sourceProfile && Array.isArray(sourceProfile.preferredJobCategories) ? sourceProfile.preferredJobCategories : []));
  const [preferredLocationPref, setPreferredLocationPref] = useState(() => (sourceProfile && sourceProfile.preferredLocation ? sourceProfile.preferredLocation : ''));
  const [willingToRelocate, setWillingToRelocate] = useState(() => (sourceProfile && typeof sourceProfile.willingToRelocate === 'boolean' ? sourceProfile.willingToRelocate : false));
  const [careerLevelTarget, setCareerLevelTarget] = useState(() => (sourceProfile && sourceProfile.careerLevelTarget ? sourceProfile.careerLevelTarget : 'Entry-Level'));

  useEffect(() => {
    // keep previous behavior but accept multiple backend response shapes
    fetch('/api/profile/completeness')
      .then((r) => r.json())
      .then((d) => {
        // backend may return { percentage: 82 } or { completeness: 82 }
        const pct = (d && typeof d.percentage === 'number') ? d.percentage : (d && typeof d.completeness === 'number' ? d.completeness : null);
        if (pct !== null) setCompleteness(pct);
      })
      .catch(() => {/* ignore - keep fallback */});

    fetch('/api/profile/activities')
      .then((r) => r.json())
      .then((d) => {
        // backend may return an array directly or an object like { activities: [...] }
        if (Array.isArray(d)) return setActivities(d);
        if (d && Array.isArray(d.activities)) return setActivities(d.activities);
        // otherwise fall through to fallback below
        throw new Error('unexpected activities shape');
      })
      .catch(() => {
        // harmless example activities if backend doesn't provide any
        setActivities([
          { company: 'Meta Company', position: 'Product Designer', location: 'Porto, Portugal (On-site)', archivedAt: '5 days ago' },
          { company: 'Google', position: 'UX Researcher', location: 'Lisbon, Portugal (Hybrid)', archivedAt: '1 week ago' }
        ]);
      });
  }, []);

  const handleSettingsClick = () => navigate('/settings');

  const handleResumeChange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) setResumeFile(f);
  };

  // upload resume and save resumeUrl to profile
  useEffect(() => {
    if (!resumeFile || !token) return;
    let cancelled = false;
    (async () => {
      try {
        setResumeUploading(true);
        const fd = new FormData();
        fd.append('file', resumeFile);
  const res = await fetch('/api/uploads/resume', { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        // tolerant URL extraction (some upload endpoints return url | fileUrl | path)
        const url = data && (data.url || data.fileUrl || data.path) ? (data.url || data.fileUrl || data.path) : null;
        if (url) {
          // update local resumeUrl so UI shows the chip immediately
          setResumeUrl(url);
          try {
            const saved = await saveProfile({ ...(profile || {}), resumeUrl: url, __token: token });
            if (setProfile) setProfile(saved);
            try { toast && toast.success && toast.success('Resume uploaded'); } catch (e) {}
          } catch (err) {
            console.warn('Failed to save resumeUrl', err);
            try { toast && toast.error && toast.error('Failed to save resume'); } catch (e) {}
          }
        } else {
          console.warn('Upload response missing URL', data);
          try { toast && toast.error && toast.error('Upload did not return a file URL'); } catch (e) {}
        }
      } catch (err) {
        console.warn('Resume upload failed', err);
      } finally {
        setResumeUploading(false);
        // clear the selected file so the same file can be chosen again
        try { setResumeFile(null); if (resumeInputRef && resumeInputRef.current) resumeInputRef.current.value = ''; } catch (e) {}
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeFile, token]);

  const handleAvatarEdit = () => {
    // open file picker instead of a plain edit state
    if (avatarInputRef.current) avatarInputRef.current.click();
  };

  const handleAvatarChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // preview locally
    const url = URL.createObjectURL(f);
    // revoke previous preview when replacing
    if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    setAvatarPreview(url);
    setAvatarFile(f);

    // upload to server via /api/uploads/logo then save profile.image
    try {
      const fd = new FormData();
      fd.append('logo', f);
      const res = await fetch('/api/uploads/logo', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      // save profile image url
      if (token) {
        try {
          const saved = await saveProfile({ ...profile, image: data.url, __token: token });
          if (setProfile) setProfile(saved);
        } catch (err) {
          console.warn('Failed to save profile image', err);
        }
      }
    } catch (err) {
      console.debug('Avatar upload skipped or failed', err);
    }
  };

  useEffect(() => {
    return () => {
      if (avatarPreview) URL.revokeObjectURL(avatarPreview);
    };
  }, [avatarPreview]);

  // Note: InputWrap was removed per request. Inputs are rendered directly.

  // lists: languages, skills, portfolio links, certifications
  const [languagesList, setLanguagesList] = useState(() => (sourceProfile && Array.isArray(sourceProfile.languages) ? sourceProfile.languages : []));
  const [newLanguage, setNewLanguage] = useState('');

  const [skillsList, setSkillsList] = useState(() => (profile && Array.isArray(profile.skills) ? profile.skills : []));
  
  // If we are viewing an external applicant profile, keep the page read-only by default
  const [newSkill, setNewSkill] = useState('');

  const [portfolioList, setPortfolioList] = useState([]);
  const [newPortfolio, setNewPortfolio] = useState('');

  const [certsList, setCertsList] = useState([]);
  const [newCertName, setNewCertName] = useState('');
  const [newCertIssuer, setNewCertIssuer] = useState('');
  const [newCertDate, setNewCertDate] = useState('');

  const [certUploading, setCertUploading] = useState(false);
  const [newCertFile, setNewCertFile] = useState(null);
  // Documents: GitHub/GitLab URL, Letters of Recommendation, Professional Licenses
  const [githubUrl, setGithubUrl] = useState(() => (sourceProfile && (sourceProfile.githubUrl || sourceProfile.github) ? (sourceProfile.githubUrl || sourceProfile.github) : ''));
  const [lorsList, setLorsList] = useState(() => (sourceProfile && Array.isArray(sourceProfile.lettersOfRecommendation) ? sourceProfile.lettersOfRecommendation : []));
  const [lorUploading, setLorUploading] = useState(false);
  const [licensesList, setLicensesList] = useState(() => (sourceProfile && Array.isArray(sourceProfile.professionalLicenses) ? sourceProfile.professionalLicenses : []));
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [newLorFile, setNewLorFile] = useState(null);
  const [newLicenseFile, setNewLicenseFile] = useState(null);
  // drag & drop state and refs for modern dropzones
  const [lorDragOver, setLorDragOver] = useState(false);
  const [licenseDragOver, setLicenseDragOver] = useState(false);
  const [resumeDragOver, setResumeDragOver] = useState(false);
  const lorInputRef = useRef(null);
  const licenseInputRef = useRef(null);
  const resumeInputRef = useRef(null);
  // single resume URL (show as a chip after upload)
  const [resumeUrl, setResumeUrl] = useState(() => (sourceProfile && sourceProfile.resumeUrl ? sourceProfile.resumeUrl : ''));
  // generic preview modal state (used for resume, LORs, licenses)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrlState, setPreviewUrlState] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // note: preview fetching and blob fallback handled by DocumentPreviewModal

  // professional: work experience entries (behave like education entries)
  const [experienceList, setExperienceList] = useState(() => (sourceProfile && Array.isArray(sourceProfile.workExperience) ? sourceProfile.workExperience : (sourceProfile && Array.isArray(sourceProfile.experience) ? sourceProfile.experience : [])));
  const [newExpCompany, setNewExpCompany] = useState('');
  const [newExpPosition, setNewExpPosition] = useState('');
  const [newExpDuration, setNewExpDuration] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');

  // education entries
  const [educationList, setEducationList] = useState(() => (sourceProfile && Array.isArray(sourceProfile.education) ? sourceProfile.education : []));
  const [newSchool, setNewSchool] = useState('');
  const [newDegree, setNewDegree] = useState('');
  const [newField, setNewField] = useState('');
  const [newStartYear, setNewStartYear] = useState('');
  const [newEndYear, setNewEndYear] = useState('');
  const [newStatus, setNewStatus] = useState('Enrolled');
  const [newEduDesc, setNewEduDesc] = useState('');

  function addIfNotEmpty(value, setter, clearSetter) {
    if (!value || !value.trim()) return;
    setter(prev => [...prev, value.trim()]);
    clearSetter('');
  }

  // upload a certificate file and add its URL to certifications list
  const handleCertUpload = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    setCertUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
  // server exposes /api/uploads/resume and /api/uploads/logo (no generic POST /api/uploads)
  const res = await fetch('/api/uploads/resume', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url = data && (data.url || data.fileUrl || data.path) ? (data.url || data.fileUrl || data.path) : null;
      if (url) {
        const next = [...(certsList || []), url];
        setCertsList(next);
        try { await persistAll({ certifications: next }); } catch (err) { console.warn('Failed to persist uploaded certificate', err); }
        try { toast && toast.success && toast.success('Certificate uploaded'); } catch (e) {}
      } else {
        console.warn('Upload response missing URL', data);
      }
    } catch (err) {
      console.error('Certificate upload failed', err);
      try { toast && toast.error && toast.error('Failed to upload certificate'); } catch (e) {}
    } finally {
      setCertUploading(false);
      // clear the input value so the same file can be uploaded again if needed
      e.target.value = '';
    }
  };

  // upload a Letter of Recommendation (PDF) and persist
  const handleLorUpload = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // only accept PDFs
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      try { toast && toast.error && toast.error('Please upload a PDF file for LORs'); } catch (e) {}
      e.target.value = '';
      return;
    }
    setLorUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', f);
  const res = await fetch('/api/uploads/resume', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json().catch(() => ({}));
      const url = data && (data.url || data.fileUrl || data.path) ? (data.url || data.fileUrl || data.path) : null;
      if (url) {
        const next = [...(lorsList || []), url];
        setLorsList(next);
        try { await persistAll({ lettersOfRecommendation: next }); } catch (err) { console.warn('Failed to persist LOR', err); }
        try { toast && toast.success && toast.success('LOR uploaded'); } catch (e) {}
      } else {
        console.warn('Upload response missing URL', data);
      }
    } catch (err) {
      console.error('LOR upload failed', err);
      try { toast && toast.error && toast.error('Failed to upload LOR'); } catch (e) {}
    } finally {
      setLorUploading(false);
      if (e && e.target) e.target.value = '';
    }
  };

  // helper to upload arbitrary file (used by drop handlers)
  const uploadFileGeneric = async (file, validateFn, list, setList, patchKey, setUploading, successMsg, errorMsg) => {
    if (!file) return;
    if (validateFn && !validateFn(file)) {
      try { toast && toast.error && toast.error(errorMsg || 'Invalid file'); } catch (e) {}
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
  const res = await fetch('/api/uploads/resume', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json().catch(() => ({}));
      const url = data && (data.url || data.fileUrl || data.path) ? (data.url || data.fileUrl || data.path) : null;
      if (url) {
        const next = [...(list || []), url];
        setList(next);
        try { await persistAll({ [patchKey]: next }); } catch (err) { console.warn('Failed to persist uploaded file', err); }
        try { toast && toast.success && toast.success(successMsg || 'Uploaded'); } catch (e) {}
      } else {
        console.warn('Upload response missing URL', data);
      }
    } catch (err) {
      console.error('Upload failed', err);
      try { toast && toast.error && toast.error(errorMsg || 'Failed to upload file'); } catch (e) {}
    } finally {
      setUploading(false);
    }
  };

  // drop handlers for LORs
  const onLorDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setLorDragOver(true); };
  const onLorDragLeave = (e) => { e.preventDefault(); setLorDragOver(false); };
  const onLorDrop = (e) => { e.preventDefault(); setLorDragOver(false); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) uploadFileGeneric(f, (file) => (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')), lorsList, setLorsList, 'lettersOfRecommendation', setLorUploading, 'LOR uploaded', 'Please upload a PDF file for LORs'); };

  // drop handlers for licenses
  const onLicenseDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setLicenseDragOver(true); };
  const onLicenseDragLeave = (e) => { e.preventDefault(); setLicenseDragOver(false); };
  const onLicenseDrop = (e) => { e.preventDefault(); setLicenseDragOver(false); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) uploadFileGeneric(f, (file) => (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')), licensesList, setLicensesList, 'professionalLicenses', setLicenseUploading, 'License uploaded', 'Please upload a PDF file for licenses'); };

  // drop handlers for resume (allow many types) - reuse existing resume upload flow by setting resumeFile
  const onResumeDragOver = (e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setResumeDragOver(true); };
  const onResumeDragLeave = (e) => { e.preventDefault(); setResumeDragOver(false); };
  const onResumeDrop = (e) => { e.preventDefault(); setResumeDragOver(false); const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]; if (f) setResumeFile(f); };

  // upload professional license (PDF) and persist
  const handleLicenseUpload = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      try { toast && toast.error && toast.error('Please upload a PDF file for licenses'); } catch (e) {}
      e.target.value = '';
      return;
    }
    setLicenseUploading(true);
    try {
  const fd = new FormData();
  fd.append('file', f);
  // server exposes /api/uploads/resume for generic file uploads (resumes, licenses, certs)
  const res = await fetch('/api/uploads/resume', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json().catch(() => ({}));
      const url = data && (data.url || data.fileUrl || data.path) ? (data.url || data.fileUrl || data.path) : null;
      if (url) {
        const next = [...(licensesList || []), url];
        setLicensesList(next);
        try { await persistAll({ professionalLicenses: next }); } catch (err) { console.warn('Failed to persist license', err); }
        try { toast && toast.success && toast.success('License uploaded'); } catch (e) {}
      } else {
        console.warn('Upload response missing URL', data);
      }
    } catch (err) {
      console.error('License upload failed', err);
      try { toast && toast.error && toast.error('Failed to upload license'); } catch (e) {}
    } finally {
      setLicenseUploading(false);
      e.target.value = '';
    }
  };

  // Debounced save: collect fields we care about and send to backend
  const saveTimeout = useRef(null);
  const scheduleSave = (patch) => {
    if (!token) return; // only auto-save when authenticated
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        // transform education entries in a patch to backend shape if present
        const transformedPatch = { ...patch };
        if (Array.isArray(transformedPatch.education)) {
          transformedPatch.education = (transformedPatch.education || []).map(e => ({
            school: e.school || '',
            degree: e.degree || '',
            fieldOfStudy: (e.field || e.fieldOfStudy) || '',
            startYear: e.startYear || '',
            endYear: e.endYear || '',
            status: e.status || '',
            description: (e.desc || e.description) || '',
          }));
        }
        const payload = { ...profile, ...transformedPatch, __token: token };
        const saved = await saveProfile(payload);
        if (setProfile) setProfile(saved);
      } catch (err) {
        console.warn('Auto-save failed', err);
      }
    }, 700);
  };

  // immediate save helper (used when user clicks Save)
  const saveNow = async (patch) => {
    if (!token) return;
    try {
      const transformedPatch = { ...patch };
      if (Array.isArray(transformedPatch.education)) {
        transformedPatch.education = (transformedPatch.education || []).map(e => ({
          school: e.school || '',
          degree: e.degree || '',
          fieldOfStudy: (e.field || e.fieldOfStudy) || '',
          startYear: e.startYear || '',
          endYear: e.endYear || '',
          status: e.status || '',
          description: (e.desc || e.description) || '',
        }));
      }
      const payload = { ...profile, ...transformedPatch, __token: token };
      const saved = await saveProfile(payload);
      if (setProfile) setProfile(saved);
    } catch (err) {
      console.warn('Save failed', err);
      alert('Failed to save. Please try again.');
    }
  };

  // build a full payload from local state to persist the whole profile
  const buildFullPayload = () => {
    // map frontend local state to backend Profile schema
    const loc = [cityState, stateProvince, country].filter(Boolean).join(', ');
    const transformedEducation = (educationList || []).map(e => ({
      school: e.school || '',
      degree: e.degree || '',
      fieldOfStudy: (e.field || e.fieldOfStudy) || '',
      startYear: e.startYear || '',
      endYear: e.endYear || '',
      status: e.status || '',
      description: (e.desc || e.description) || '',
    }));

    return {
      firstName,
      lastName,
      email: emailState,
      phone: phoneState,
      // keep legacy `location` string for backward compatibility
      location: loc,
      // preferred structured fields used by backend
      city: cityState || undefined,
      stateprovince: stateProvince || undefined,
      country: country || undefined,
      bio: bioState,
      gender,
      dob,
      nationality,
      desiredJobType,
      workArrangement,
      expectedSalary,
      languages: languagesList,
      skills: skillsList,
      portfolio: portfolioList,
      certifications: certsList,
      education: transformedEducation,
  // include experience (backend schema uses `experience`) so the backend receives the list when persisting
  experience: experienceList,
      // preferences
      preferredJobCategories: preferredCategories,
      preferredLocation: preferredLocationPref,
      careerLevelTarget,
      // documents
      githubUrl: githubUrl || undefined,
      lettersOfRecommendation: lorsList || [],
      professionalLicenses: licensesList || [],
      // avatar/image and resume are handled by their upload flows which call saveProfile directly
    };
  };

  // Persist the full profile to the server immediately
  const persistAll = async (extraPatch = {}) => {
    if (!token) return;
    try {
      // cancel any scheduled auto-save to avoid races
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
      // If extraPatch includes education entries from UI, transform them to backend shape
      const patch = { ...extraPatch };
      if (Array.isArray(patch.education)) {
        patch.education = (patch.education || []).map(e => ({
          school: e.school || '',
          degree: e.degree || '',
          fieldOfStudy: (e.field || e.fieldOfStudy) || '',
          startYear: e.startYear || '',
          endYear: e.endYear || '',
          status: e.status || '',
          description: (e.desc || e.description) || '',
        }));
      }
      const payload = { ...profile, ...buildFullPayload(), ...patch, __token: token };
      const saved = await saveProfile(payload);
      if (setProfile) setProfile(saved);
      // show success toast
      try { toast && toast.success && toast.success('Profile saved'); } catch (e) { /* swallow */ }
      return saved;
    } catch (err) {
      console.error('persistAll failed', err);
      try { toast && toast.error && toast.error('Failed to save profile'); } catch (e) { /* swallow */ }
      throw err;
    }
  };

  // remove item locally and persist change immediately to backend
  const removeAndPersist = async (index, list, setter, fieldKey) => {
    const next = (list || []).filter((_, i) => i !== index);
    setter(next);
    // map frontend list key to backend field names if needed
    const patchKey = fieldKey || 'unknown';
    try {
      // for education, provide UI-shaped entries; persistAll will transform them
      await persistAll({ [patchKey]: next });
      try { toast && toast.success && toast.success('Removed'); } catch (e) {}
    } catch (err) {
      console.error('Failed to persist removal', err);
      try { toast && toast.error && toast.error('Failed to remove item'); } catch (e) {}
    }
  };

  // remove resume helper
  const removeResume = async () => {
    setResumeUrl('');
    try {
      await persistAll({ resumeUrl: '' });
      try { toast && toast.success && toast.success('Resume removed'); } catch (e) {}
    } catch (err) {
      console.error('Failed to remove resume', err);
      try { toast && toast.error && toast.error('Failed to remove resume'); } catch (e) {}
    }
  };

  function removeAt(index, setter) {
    setter(prev => prev.filter((_, i) => i !== index));
  }

  // watch list changes and schedule save
  useEffect(() => {
    scheduleSave({ skills: skillsList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skillsList]);

  useEffect(() => {
    if (sourceProfile && Array.isArray(sourceProfile.skills)) setSkillsList(sourceProfile.skills);
  }, [sourceProfile]);

  // populate portfolio and certifications from loaded profile on first load
  useEffect(() => {
    if (sourceProfile && Array.isArray(sourceProfile.portfolio)) setPortfolioList(sourceProfile.portfolio);
    if (sourceProfile && Array.isArray(sourceProfile.certifications)) setCertsList(sourceProfile.certifications);
    if (sourceProfile && sourceProfile.githubUrl) setGithubUrl(sourceProfile.githubUrl);
    if (sourceProfile && Array.isArray(sourceProfile.lettersOfRecommendation)) setLorsList(sourceProfile.lettersOfRecommendation);
    if (sourceProfile && Array.isArray(sourceProfile.professionalLicenses)) setLicensesList(sourceProfile.professionalLicenses);
    if (sourceProfile && sourceProfile.resumeUrl) setResumeUrl(sourceProfile.resumeUrl);
  }, [sourceProfile]);

  // if profile loads from server, populate languages (and keep in sync)
  useEffect(() => {
    if (sourceProfile && Array.isArray(sourceProfile.languages)) setLanguagesList(sourceProfile.languages);
  }, [sourceProfile]);

  useEffect(() => {
    scheduleSave({ languages: languagesList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [languagesList]);

  useEffect(() => {
    scheduleSave({ portfolio: portfolioList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portfolioList]);

  // persist workExperience on change
  useEffect(() => {
    scheduleSave({ experience: experienceList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [experienceList]);

  useEffect(() => {
    scheduleSave({ certifications: certsList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certsList]);

  // persist LORs and licenses when they change
  useEffect(() => {
    scheduleSave({ lettersOfRecommendation: lorsList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lorsList]);

  useEffect(() => {
    scheduleSave({ professionalLicenses: licensesList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [licensesList]);

  // persist github url when changed (on blur typically)
  useEffect(() => {
    scheduleSave({ githubUrl });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubUrl]);

  // persist preference changes
  useEffect(() => {
    scheduleSave({ preferredJobCategories: preferredCategories });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredCategories]);

  useEffect(() => {
    scheduleSave({ preferredLocation: preferredLocationPref, careerLevelTarget });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferredLocationPref, careerLevelTarget]);

  // autosave when job type or work arrangement are changed (selects)
  useEffect(() => {
    scheduleSave({ desiredJobType });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredJobType]);

  useEffect(() => {
    scheduleSave({ workArrangement });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workArrangement]);

  // keep education in sync with profile when it loads
  useEffect(() => {
    // populate education from sourceProfile only on first load (don't overwrite local edits)
    if ((!educationList || educationList.length === 0) && sourceProfile && Array.isArray(sourceProfile.education)) {
      // normalize server shape (fieldOfStudy/description) to UI shape (field/desc)
      const normalized = sourceProfile.education.map(e => ({
        school: e.school || '',
        degree: e.degree || '',
        field: e.fieldOfStudy || e.field || '',
        startYear: e.startYear || '',
        endYear: e.endYear || '',
        status: e.status || '',
        desc: e.description || e.desc || '',
      }));
      setEducationList(normalized);
    }
  }, [sourceProfile]);

  // populate experience from sourceProfile on first load
  useEffect(() => {
    if ((!experienceList || experienceList.length === 0) && sourceProfile && (Array.isArray(sourceProfile.workExperience) || Array.isArray(sourceProfile.experience))) {
      const raw = sourceProfile.workExperience || sourceProfile.experience || [];
      const normalized = raw.map(w => ({
        company: w.company || '',
        position: w.position || w.title || '',
        duration: w.duration || w.years || '',
        description: w.description || w.desc || '',
      }));
      setExperienceList(normalized);
    }
  }, [sourceProfile]);

  // save education list when it changes
  useEffect(() => {
    scheduleSave({ education: educationList });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [educationList]);

  // save when a field is finished editing (on blur)
  const handleFieldBlur = () => {
    // schedule save using backend-friendly field names
    scheduleSave({
      firstName,
      lastName,
      email: emailState,
      phone: phoneState,
      city: cityState,
      stateprovince: stateProvince,
      country,
      bio: bioState,
      gender,
      dob,
      nationality,
      desiredJobType,
      workArrangement,
      expectedSalary,
    });
  };

  // account modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isProcessingAccount, setIsProcessingAccount] = useState(false);

  const handleDeactivate = async () => {
    if (!token) return;
    setIsProcessingAccount(true);
    try {
      const res = await fetch('/api/account/deactivate', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error('Request failed');
      // clear local auth and redirect to login
      localStorage.removeItem('wc_token');
      localStorage.removeItem('wc_userId');
      if (setProfile) setProfile(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Deactivate failed', err);
      alert('Failed to deactivate account. Please try again.');
    } finally {
      setIsProcessingAccount(false);
      setShowAccountModal(false);
    }
  };

  const handleDeleteAccount = async () => {
    // now handled by the password confirm modal; this function will be replaced
    return;
  };

  // password confirm modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [confirmAction, setConfirmAction] = useState('');

  const openPasswordConfirm = (action = 'delete') => {
    setConfirmPassword('');
    setConfirmError('');
    setConfirmAction(action);
    setShowPasswordModal(true);
  };


  // change password modal state
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');


  // generic submit for delete or deactivate using password
  const submitConfirmWithPassword = async () => {
    if (!token) return;
    if (!confirmPassword || confirmPassword.length < 6) {
      setConfirmError('Please enter your password.');
      return;
    }
    setIsDeleting(true);
    try {
      let res;
      if (confirmAction === 'deactivate') {
        res = await fetch('/api/account/deactivate', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: confirmPassword }) });
      } else {
        // default to delete
        res = await fetch('/api/account', { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ password: confirmPassword }) });
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirmError(data && data.message ? data.message : 'Request failed.');
        return;
      }
      // success: clear auth and redirect
      localStorage.removeItem('wc_token');
      localStorage.removeItem('wc_userId');
      if (setProfile) setProfile(null);
      window.location.href = '/login';
    } catch (err) {
      console.error('Action failed', err);
      setConfirmError('Failed to perform action. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowPasswordModal(false);
      setShowAccountModal(false);
    }
  };


  return (
    <div className="profile-page">
      <div className="profile-center">
        <header className="profile-top">
          <div className="profile-top-left">
            <div className="profile-avatar large" role="button" tabIndex={0} onClick={handleAvatarEdit} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleAvatarEdit(); }} aria-label="Change profile picture">
              <img src={avatarPreview || user.image} alt={`${user.firstName} ${user.lastName}`} />
              
              <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
            <div className="profile-meta">
              <h1 className="profile-name">{user.firstName} {user.lastName}</h1>
              <p className="profile-contact">{user.email} · {user.phone}</p>
              <p className="profile-location">{user.location}</p>
            </div>
          </div>
          
        </header>

        <div className="profile-grid">
          <main className="profile-main">
            <section className="card">
              <div className="card-body">
                <div className="card-header">
                  <h3>Basic Information</h3>
                  <button className={`edit-btn ${editingBasic ? 'save' : ''}`} disabled={isViewingExternal} onClick={async () => {
                    if (editingBasic) {
                      // save all fields for consistency
                      try {
                        await persistAll();
                      } catch (err) {
                        alert('Failed to save profile. Please try again.');
                      }
                    }
                    setEditingBasic(!editingBasic);
                  }}>{editingBasic ? 'Save' : 'Edit'}</button>
                </div>
                <div className="form-row two-col">
                  <div>
                    <label>First Name</label>
                    <div className="input-wrap">
                          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} onBlur={handleFieldBlur} readOnly={!editingBasic} />
                    </div>
                  </div>
                  <div>
                    <label>Last Name</label>
                    <div className="input-wrap">
                          <input value={lastName} onChange={(e) => setLastName(e.target.value)} onBlur={handleFieldBlur} readOnly={!editingBasic} />
                    </div>
                  </div>
                </div>
                {/* Job Title / Role removed as requested */}
                <div className="form-row two-col">
                  <div>
                    <label>Contact (Email)</label>
                    <div className="input-wrap">
                      <input value={emailState} onChange={(e) => setEmailState(e.target.value)} onBlur={handleFieldBlur} readOnly={!editingBasic} />
                    </div>
                  </div>
                  <div>
                    <label>Phone</label>
                    <div className="input-wrap">
                      <input value={phoneState} onChange={(e) => setPhoneState(e.target.value)} onBlur={handleFieldBlur} readOnly={!editingBasic} />
                    </div>
                  </div>
                </div>
                <div className="form-row two-col">
                  <div>
                    <label>City</label>
                    <div className="input-wrap">
                      <input value={cityState} onChange={(e) => setCityState(e.target.value)} onBlur={handleFieldBlur} />
                    </div>
                  </div>
                  <div>
                    <div className="province-country">
                      <div>
                        <label>Province / State</label>
                        <div className="input-wrap">
                          <input placeholder="Province / State" value={stateProvince} onChange={(e) => setStateProvince(e.target.value)} onBlur={handleFieldBlur} />
                        </div>
                      </div>
                      <div>
                        <label>Country</label>
                        <div className="input-wrap">
                          <input placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} onBlur={handleFieldBlur} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <label>About / Bio</label>
                  <div className="input-wrap">
                    <textarea value={bioState} onChange={(e) => setBioState(e.target.value)} onBlur={handleFieldBlur} placeholder="Tell employers about yourself, your career goals and strengths." rows={5} readOnly={!editingBasic} />
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <div className="card-header">
                  <h3>Educational Background</h3>
                </div>
                <div className="form-row">
                  <label>Education</label>
                  <div className="list-input">
                      <div className="chips">
                      {educationList.map((e, i) => (
                        <div key={i} className="experience-entry">
                          <div className="entry-header">
                            <div className="entry-title">{e.school || '—'} {e.degree ? <span className="entry-sub">· {e.degree}</span> : null}</div>
                            <div>
                              <button className="chip-remove" aria-label={`Remove education ${i}`} onClick={() => removeAndPersist(i, educationList, setEducationList, 'education')}>×</button>
                            </div>
                          </div>
                          {e.field ? <div className="entry-meta">{e.field}</div> : null}
                          <div className="entry-meta">{(e.startYear || '') + (e.endYear ? ' – ' + e.endYear : e.startYear ? ' – Present' : '')}{e.status ? ' · ' + e.status : ''}</div>
                          {e.desc ? <div className="entry-desc">{e.desc}</div> : null}
                        </div>
                      ))}
                    </div>
                      <div className="add-row education-add">
                      <input value={newSchool} onChange={(e) => setNewSchool(e.target.value)} placeholder="School / Institution" />
                      <select aria-label="Grade level" value={newDegree} onChange={(e) => { setNewDegree(e.target.value); setNewField(''); }}>
                        <option value="">Select grade level</option>
                        <option>Elementary</option>
                        <option>High School</option>
                        <option>Senior High School</option>
                        <option>College</option>
                        <option>Post-Secondary / Graduate</option>
                      </select>
                      {/* Field of Study: for Elementary/HighSchool keep a free text input; for Senior High School show K-12 tracks; for College/Post-Secondary show program list */}
                      {newDegree === 'Senior High School' ? (
                        <select aria-label="Senior high school track" value={newField} onChange={(e) => setNewField(e.target.value)}>
                          <option value="">Select SHS track (optional)</option>
                          <option>Academic - General</option>
                          <option>Academic - Accountancy, Business and Management (ABM)</option>
                          <option>Academic - Humanities and Social Sciences (HUMSS)</option>
                          <option>Academic - Science, Technology, Engineering and Mathematics (STEM)</option>
                          <option>Technical-Vocational-Livelihood (TVL)</option>
                          <option>Arts and Design</option>
                          <option>Sports</option>
                        </select>
                      ) : newDegree === 'College' || newDegree === 'Post-Secondary / Graduate' ? (
                        <select aria-label="College program" value={newField} onChange={(e) => setNewField(e.target.value)}>
                          <option value="">Select program / course (optional)</option>
                          <option>BS Computer Science</option>
                          <option>BS Information Technology</option>
                          <option>BS Information Systems</option>
                          <option>BS Nursing</option>
                          <option>BS Business Administration</option>
                          <option>BS Accountancy</option>
                          <option>BS Education</option>
                          <option>BS Psychology</option>
                          <option>BS Biology</option>
                          <option>BS Chemistry</option>
                          <option>BS Civil Engineering</option>
                          <option>BS Mechanical Engineering</option>
                          <option>BS Electrical Engineering</option>
                          <option>Diploma / Certificate</option>
                          <option>Associate Degree</option>
                          <option>Other</option>
                        </select>
                      ) : (
                        <input value={newField} onChange={(e) => setNewField(e.target.value)} placeholder="Field of Study (optional)" />
                      )}
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input value={newStartYear} onChange={(e) => setNewStartYear(e.target.value)} placeholder="Start Year (e.g. 2019)" />
                        <input value={newEndYear} onChange={(e) => setNewEndYear(e.target.value)} placeholder="End Year (e.g. 2023) or Present" />
                      </div>
                      <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                        <option>Enrolled</option>
                        <option>Graduated</option>
                        <option>On leave</option>
                        <option>Withdrawn</option>
                      </select>
                      <input value={newEduDesc} onChange={(e) => setNewEduDesc(e.target.value)} placeholder="Short description (optional)" />
                      <button type="button" className="add-btn" onClick={async () => {
                        if (!newSchool.trim()) return;
                        const next = [
                          ...educationList,
                          { school: newSchool.trim(), degree: newDegree.trim(), field: newField.trim(), startYear: newStartYear.trim(), endYear: newEndYear.trim(), status: newStatus, desc: newEduDesc.trim() }
                        ];
                        setEducationList(next);
                        // persist immediately
                        try {
                          await persistAll({ education: next });
                          try { toast && toast.success && toast.success('Education saved'); } catch (e) { }
                        } catch (err) {
                          console.error('Failed to save education', err);
                          try { toast && toast.error && toast.error('Failed to save education'); } catch (e) { }
                        }
                        setNewSchool(''); setNewDegree(''); setNewField(''); setNewStartYear(''); setNewEndYear(''); setNewStatus('Enrolled'); setNewEduDesc('');
                      }}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <div className="card-header">
                  <h3>Professional Information</h3>
                </div>

                <div className="form-row">
                  <label>Skills</label>
                  <div className="list-input">
                    <div className="chips">
                      {skillsList.map((s, i) => (
                        <span className="chip" key={i}>{s}<button onClick={() => removeAt(i, setSkillsList)} className="chip-remove" aria-label={`Remove ${s}`}>×</button></span>
                      ))}
                    </div>
                    <div className="add-row">
                      <input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} placeholder="Add skill" />
                      <button type="button" className="add-btn" onClick={() => { addIfNotEmpty(newSkill, setSkillsList, setNewSkill); }}>+</button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label>Experience</label>
                  <div className="list-input">
                    <div className="chips">
                      {experienceList && experienceList.length ? experienceList.map((we, i) => (
                        <div key={i} className="experience-entry">
                          <div className="entry-header">
                            <div className="entry-title">{we.position || '—'} <span className="entry-sub">· {we.company || '—'}</span></div>
                            <div>
                              <button className="chip-remove" aria-label={`Remove experience ${i}`} onClick={() => removeAndPersist(i, experienceList, setExperienceList, 'experience')}>×</button>
                            </div>
                          </div>
                          <div className="entry-meta">{we.duration}</div>
                          <div className="entry-desc">{we.description}</div>
                        </div>
                      )) : <div style={{ color: '#64748b' }}>No experience added</div>}
                    </div>

                    <div className="add-row experience-add" style={{ marginTop: 8 }}>
                      <input value={newExpCompany} onChange={(e) => setNewExpCompany(e.target.value)} placeholder="Company" />
                      <input value={newExpPosition} onChange={(e) => setNewExpPosition(e.target.value)} placeholder="Position" />
                      <input value={newExpDuration} onChange={(e) => setNewExpDuration(e.target.value)} placeholder="Duration (e.g. 2019 - 2021)" />
                      <input value={newExpDesc} onChange={(e) => setNewExpDesc(e.target.value)} placeholder="Short description" />
                      <button type="button" className="add-btn" onClick={async () => {
                        if (!newExpCompany.trim() && !newExpPosition.trim()) return;
                        const next = [
                          ...experienceList,
                          { company: newExpCompany.trim(), position: newExpPosition.trim(), duration: newExpDuration.trim(), description: newExpDesc.trim() }
                        ];
                        setExperienceList(next);
                        // persist immediately
                        try {
                          // persist using backend field name `experience`
                          await persistAll({ experience: next });
                          try { toast && toast.success && toast.success('Experience saved'); } catch (e) {}
                        } catch (err) {
                          console.error('Failed to save experience', err);
                          try { toast && toast.error && toast.error('Failed to save experience'); } catch (e) {}
                        }
                        setNewExpCompany(''); setNewExpPosition(''); setNewExpDuration(''); setNewExpDesc('');
                      }}>+</button>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label>Certifications / Training</label>
                  <div className="list-input">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div className="chips" style={{ flex: 1 }}>
                        {certsList.map((c, i) => {
                          const isString = typeof c === 'string';
                          let meta = '';
                          if (!isString) {
                            if (c.issuer) meta += c.issuer;
                            if (c.dateIssued) {
                              const d = new Date(c.dateIssued);
                              if (!isNaN(d.getTime())) meta += (meta ? ' · ' : '') + d.toLocaleDateString();
                            }
                          }
                          return (
                            <div key={i} className="experience-entry">
                              <div className="entry-header">
                                <div className="entry-title">{isString ? c : (c.name || 'Certificate')}</div>
                                <div>
                                  <button className="chip-remove" aria-label={`Remove cert ${i}`} onClick={() => removeAndPersist(i, certsList, setCertsList, 'certifications')}>×</button>
                                </div>
                              </div>
                              {meta ? <div className="entry-meta">{meta}</div> : null}
                              {!isString && c.url ? <div className="entry-desc"><a href={c.url} target="_blank" rel="noreferrer">View file</a></div> : null}
                            </div>
                          );
                        })}
                      </div>

                      <div style={{ whiteSpace: 'nowrap' }}>
                        {/* <label style={{ display: 'inline-block' }}>
                          <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={handleCertUpload} />
                          <button type="button" className="wc-btn" title="Upload certificate">{certUploading ? 'Uploading…' : 'Upload certificate'}</button>
                        </label> */}
                      </div>
                    </div>

                    <div className="add-row" style={{ marginTop: 8, alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      
                      <input value={newCertName} onChange={(e) => setNewCertName(e.target.value)} placeholder="Certification name" style={{ minWidth: 200 }} />
                      <input value={newCertIssuer} onChange={(e) => setNewCertIssuer(e.target.value)} placeholder="Issuer (optional)" style={{ minWidth: 160 }} />
                      <input value={newCertDate} onChange={(e) => setNewCertDate(e.target.value)} placeholder="Date issued" style={{ minWidth: 160 }} />
                      <input id="newCertFile" type="file" accept="application/pdf,image/*" style={{ display: 'inline-block' }} onChange={(e) => setNewCertFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)} />
                      <button type="button" className="add-btn" onClick={async () => {
                        // require a name at minimum
                        if (!newCertName || !newCertName.trim()) {
                          try { toast && toast.error && toast.error('Please enter a certification name'); } catch (e) {}
                          return;
                        }
                        try {
                          let entry = { name: newCertName.trim() };
                          if (newCertIssuer && newCertIssuer.trim()) entry.issuer = newCertIssuer.trim();
                          if (newCertDate) {
                            // store as ISO date string
                            const d = new Date(newCertDate);
                            if (!isNaN(d.getTime())) entry.dateIssued = d.toISOString();
                          }
                          if (newCertFile) {
                            // upload file
                            const fd = new FormData();
                            fd.append('file', newCertFile);
                            setCertUploading(true);
                            const res = await fetch('/api/uploads/resume', { method: 'POST', body: fd });
                            setCertUploading(false);
                            if (!res.ok) throw new Error('Upload failed');
                            const data = await res.json().catch(() => ({}));
                            const url = data && (data.url || data.fileUrl || data.path) ? (data.url || data.fileUrl || data.path) : null;
                            if (url) entry.url = url;
                          }
                          const next = [...(certsList || []), entry];
                          setCertsList(next);
                          try { await persistAll({ certifications: next }); } catch (err) { console.warn('Failed to persist certifications', err); }
                          try { toast && toast.success && toast.success('Certification added'); } catch (e) {}
                        } catch (err) {
                          console.error('Failed to add certification', err);
                          try { toast && toast.error && toast.error('Failed to add certification'); } catch (e) {}
                        } finally {
                          setNewCertName(''); setNewCertIssuer(''); setNewCertDate('');
                          setNewCertFile(null);
                          const f = document.getElementById('newCertFile'); if (f) f.value = '';
                        }
                      }}>+</button>
                      {newCertFile ? <span style={{ marginLeft: 8, color: '#64748b' }}>{newCertFile.name}</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <aside className="profile-side">
            <section className="card">
              <div className="card-body">
                <h3>Personal Details</h3>
                <div className="form-row two-col">
                  <div>
                    <label>Gender</label>
                    <div className="input-wrap">
                      <select value={gender} onChange={(e) => setGender(e.target.value)} onBlur={handleFieldBlur}>
                        <option value="">Prefer not to say</option>
                        <option value="Female">Female</option>
                        <option value="Male">Male</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label>Date of Birth</label>
                    <div className="input-wrap">
                      <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} onBlur={handleFieldBlur} />
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <label>Nationality</label>
                  <div className="input-wrap"><input value={nationality} onChange={(e) => setNationality(e.target.value)} onBlur={handleFieldBlur} /></div>
                </div>
                <div className="form-row">
                  <label>Languages</label>
                  <div className="list-input">
                    <div className="chips">
                      {languagesList.map((l, i) => (
                        <span className="chip" key={i}>{l}<button onClick={() => removeAt(i, setLanguagesList)} className="chip-remove" aria-label={`Remove ${l}`}>×</button></span>
                      ))}
                    </div>
                    <div className="add-row">
                      <input value={newLanguage} onChange={(e) => setNewLanguage(e.target.value)} placeholder="Add language" />
                      <button type="button" className="add-btn" onClick={() => addIfNotEmpty(newLanguage, setLanguagesList, setNewLanguage)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <h3>Documents</h3>
                <div className="form-row">
                  <label>Resume / CV</label>
                  <div>
                    <label
                      className={`upload-dropzone ${resumeDragOver ? 'dragover' : ''}`}
                      onDragOver={onResumeDragOver}
                      onDragLeave={onResumeDragLeave}
                      onDrop={onResumeDrop}
                      tabIndex={0}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (resumeInputRef.current) resumeInputRef.current.click(); } }}
                    >
                      <div className="dz-inner">
                        <div className="dz-icon">⤓</div>
                        <div className="dz-title">{resumeUploading ? 'Uploading…' : (resumeFile ? resumeFile.name : 'Drag and drop your resume or choose file')}</div>
                        <div className="dz-sub">PDF, DOCX, TXT, RTF — Max size: 5MB</div>
                        <div className="dz-footer">
                          <div className="dz-left">Files Supported: PDF, DOCX, JPG</div>
                          <div className="dz-right">Maximum size: 5MB</div>
                        </div>
                      </div>
                      <input ref={resumeInputRef} id="resumeUpload" type="file" style={{ display: 'none' }} onChange={handleResumeChange} />
                    </label>
                    {resumeUrl ? (
                      <div style={{ marginTop: 8 }}>
                        <span className="file-chip">
                          <button type="button" className="resume-link" onClick={() => {
                            const getAbsoluteUrl = (url) => {
                              try {
                                if (!url) return '';
                                if (/^https?:\/\//i.test(url)) return url;
                                if (/^\/\//.test(url)) return window.location.protocol + url;
                                const path = url.startsWith('/') ? url : '/' + url;
                                return window.location.origin + path;
                              } catch (e) {
                                return url;
                              }
                            };
                            setPreviewUrlState(getAbsoluteUrl(resumeUrl));
                            setPreviewTitle('Resume');
                            setPreviewOpen(true);
                          }} aria-label="View resume">Resume</button>
                          <button className="chip-remove" aria-label="Remove resume" onClick={removeResume}>×</button>
                        </span>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="form-row">
                  <label>GitHub / GitLab URL</label>
                  <div className="input-wrap">
                    <input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} onBlur={() => scheduleSave({ githubUrl })} placeholder="https://github.com/yourusername" />
                  </div>
                </div>

                <div className="form-row">
                  <label>Letters of Recommendation (PDF)</label>
                  <div className="list-input">
                    <div className="chips" style={{ alignItems: 'center', gap: 8 }}>
                      {lorsList.map((l, i) => (
                        <span key={i} className="file-chip">
                          <button type="button" className="file-link" onClick={() => {
                            const getAbsoluteUrl = (url) => {
                              try {
                                if (!url) return '';
                                if (/^https?:\/\//i.test(url)) return url;
                                if (/^\/\//.test(url)) return window.location.protocol + url;
                                const path = url.startsWith('/') ? url : '/' + url;
                                return window.location.origin + path;
                              } catch (e) {
                                return url;
                              }
                            };
                            setPreviewUrlState(getAbsoluteUrl(l));
                            setPreviewTitle(`Letter ${i + 1}`);
                            setPreviewOpen(true);
                          }}>Letter {i + 1}</button>
                          <button className="chip-remove" aria-label={`Remove LOR ${i}`} onClick={() => removeAndPersist(i, lorsList, setLorsList, 'lettersOfRecommendation')}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label
                        className={`upload-dropzone ${lorDragOver ? 'dragover' : ''}`}
                        onDragOver={onLorDragOver}
                        onDragLeave={onLorDragLeave}
                        onDrop={onLorDrop}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (lorInputRef.current) lorInputRef.current.click(); } }}
                      >
                        <div className="dz-inner">
                          <div className="dz-icon">📄</div>
                          <div className="dz-title">{lorUploading ? <span className="upload-spinner" /> : 'Drag & drop LOR or choose file'}</div>
                          <div className="dz-sub">PDF only</div>
                          <div className="dz-footer"><div className="dz-left">Files Supported: PDF</div><div className="dz-right">Maximum size: 5MB</div></div>
                        </div>
                        <input ref={lorInputRef} id="lorUpload" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleLorUpload} />
                      </label>
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <label>Professional Certifications & Licenses (PDF)</label>
                  <div className="list-input">
                    <div className="chips" style={{ alignItems: 'center', gap: 8 }}>
                      {licensesList.map((lic, i) => (
                        <span key={i} className="file-chip">
                          <button type="button" className="file-link" onClick={() => {
                            const getAbsoluteUrl = (url) => {
                              try {
                                if (!url) return '';
                                if (/^https?:\/\//i.test(url)) return url;
                                if (/^\/\//.test(url)) return window.location.protocol + url;
                                const path = url.startsWith('/') ? url : '/' + url;
                                return window.location.origin + path;
                              } catch (e) {
                                return url;
                              }
                            };
                            setPreviewUrlState(getAbsoluteUrl(lic));
                            setPreviewTitle(`License ${i + 1}`);
                            setPreviewOpen(true);
                          }}>License {i + 1}</button>
                          <button className="chip-remove" aria-label={`Remove License ${i}`} onClick={() => removeAndPersist(i, licensesList, setLicensesList, 'licenses')}>×</button>
                        </span>
                      ))}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <label
                        className={`upload-dropzone ${licenseDragOver ? 'dragover' : ''}`}
                        onDragOver={onLicenseDragOver}
                        onDragLeave={onLicenseDragLeave}
                        onDrop={onLicenseDrop}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { if (licenseInputRef.current) licenseInputRef.current.click(); } }}
                      >
                        <div className="dz-inner">
                          <div className="dz-icon">📑</div>
                          <div className="dz-title">{licenseUploading ? <span className="upload-spinner" /> : 'Drag & drop license or choose file'}</div>
                          <div className="dz-sub">PDF only</div>
                          <div className="dz-footer"><div className="dz-left">Files Supported: PDF</div><div className="dz-right">Maximum size: 5MB</div></div>
                        </div>
                        <input ref={licenseInputRef} id="licenseUpload" type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handleLicenseUpload} />
                      </label>
                    </div>
                  </div>
                </div>
                <div className="form-row">
                  <label>Portfolio Links</label>
                  <div className="list-input">
                    <div className="chips">
                      {portfolioList.map((p, i) => (
                        <span className="chip" key={i}><a href={p} target="_blank" rel="noreferrer">{p}</a><button onClick={() => removeAt(i, setPortfolioList)} className="chip-remove" aria-label={`Remove ${p}`}>×</button></span>
                      ))}
                    </div>
                    <div className="add-row">
                      <input value={newPortfolio} onChange={(e) => setNewPortfolio(e.target.value)} placeholder="Add portfolio URL" />
                      <button type="button" className="add-btn" onClick={() => addIfNotEmpty(newPortfolio, setPortfolioList, setNewPortfolio)}>+</button>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <h3>Preferences</h3>
                <div className="form-row">
                  <label>Preferred Job Type</label>
                  <div className="input-wrap">
                    <select value={desiredJobType} onChange={(e) => setDesiredJobType(e.target.value)} onBlur={handleFieldBlur}>
                      <option>Full-time</option>
                      <option>Part-time</option>
                      <option>Internship</option>
                      <option>Freelance / Contract</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label>Preferred Work Arrangement</label>
                  <div className="input-wrap">
                    <select value={workArrangement} onChange={(e) => setWorkArrangement(e.target.value)} onBlur={handleFieldBlur}>
                      <option>On-site</option>
                      <option>Remote</option>
                      <option>Hybrid</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label>Preferred Job Category / Industry</label>
                  <div className="input-wrap">
                    <select value={preferredCategories[0] || ''} onChange={(e) => { const v = e.target.value; setPreferredCategories(v ? [v] : []); }}>
                      <option value="">Select category</option>
                      <option>Information Technology</option>
                      <option>Marketing</option>
                      <option>Design / Creative</option>
                      <option>Education</option>
                      <option>Healthcare</option>
                      <option>Engineering</option>
                      <option>Finance / Accounting</option>
                      <option>Sales</option>
                      <option>Customer Support</option>
                      <option>Operations</option>
                      <option>Human Resources</option>
                      <option>Legal</option>
                      <option>Product</option>
                      <option>Research</option>
                      <option>Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <label>Preferred Location</label>
                  <div className="input-wrap">
                    <input value={preferredLocationPref} onChange={(e) => setPreferredLocationPref(e.target.value)} placeholder="City or Province (e.g. Metro Manila)" />
                  </div>
                </div>

                <div className="form-row">
                  <label>Career Level Target</label>
                  <div className="input-wrap">
                    <select value={careerLevelTarget} onChange={(e) => setCareerLevelTarget(e.target.value)}>
                      <option>Entry-Level</option>
                      <option>Mid-Level</option>
                      <option>Senior-Level</option>
                      <option>Managerial</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <h3>Account</h3>
                <div className="form-row">
                <button className="secondary" onClick={() => setShowChangePasswordModal(true)}>
                  Change Password
                </button>
                </div>
                {/* <div className="form-row">
                  <button className="secondary">Manage Privacy Settings</button>
                </div> */}
                <div className="form-row">
                  <button className="danger" onClick={() => setShowAccountModal(true)}>Deactivate / Delete Account</button>
                </div>
              </div>
            </section>
          </aside>
        </div>
        {showAccountModal && (
          <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={() => { if (!isProcessingAccount) setShowAccountModal(false); }}>
            <div className="wc-modal" role="document" onClick={(e) => e.stopPropagation()}>
              <h3>Account actions</h3>
              <div className="action-descs">
                <div className="action-desc">
                  <strong>Deactivate</strong>
                  <div className="action-text">Temporarily hides your profile and content. You can reactivate later.</div>
                  <div className="action-actions">
                    <button className="secondary" onClick={() => { if (!isProcessingAccount) openPasswordConfirm('deactivate'); }} disabled={isProcessingAccount}>Deactivate</button>
                  </div>
                </div>
                <div className="action-desc">
                  <strong className="danger-label">Delete</strong>
                  <div className="action-text">Permanently removes your account and all associated data. This action is irreversible.</div>
                  <div className="action-actions">
                    <button className="danger" onClick={() => { if (!isProcessingAccount) openPasswordConfirm(); }} disabled={isProcessingAccount}>Delete</button>
                  </div>
                </div>
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="edit-btn" onClick={() => { if (!isProcessingAccount) setShowAccountModal(false); }} disabled={isProcessingAccount}>Cancel</button>
              </div>
            </div>
          </div>
        )}
        {showPasswordModal && (
          <div className="wc-modal-backdrop" role="dialog" aria-modal="true" onClick={() => { if (!isDeleting) setShowPasswordModal(false); }}>
            <div className="wc-modal" role="document" onClick={(e) => e.stopPropagation()}>
              <h3>Confirm account deletion</h3>
              <p>Enter your password to confirm permanent deletion of your account.</p>
              <div style={{ marginTop: 12 }}>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Your password" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e6e6e9' }} />
                {confirmError && <div className="confirm-error" style={{ marginTop: 8 }}>{confirmError}</div>}
              </div>
              <div className="modal-actions" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="secondary" onClick={() => { if (!isDeleting) setShowPasswordModal(false); }} disabled={isDeleting}>Cancel</button>
                <button className="danger" onClick={() => { if (!isDeleting) submitConfirmWithPassword(); }} disabled={isDeleting}>{confirmAction === 'deactivate' ? 'Deactivate account' : 'Delete account'}</button>
              </div>
            </div>
          </div>
        )}
        {showChangePasswordModal && (
          <div className="modal-overlay" onClick={() => setShowChangePasswordModal(false)}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h2>Change Password</h2>

              <div className="form-row">
                <label>Current Password</label>
                <input type="password" placeholder="Enter current password" />
              </div>

              {/* ✅ Added Confirm Old Password */}
              <div className="form-row">
                <label>Confirm Old Password</label>
                <input type="password" placeholder="Confirm old password" />
              </div>

              <div className="form-row">
                <label>New Password</label>
                <input type="password" placeholder="Enter new password" />
              </div>

              <div className="form-row">
                <label>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" />
              </div>

              <div className="buttons">
                <button className="primary" onClick={() => {/* handle save logic */}}>Save</button>
                <button className="secondary" onClick={() => setShowChangePasswordModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}

        {/* Centralized document preview modal (resume, LORs, licenses) */}
        <DocumentPreviewModal open={previewOpen} url={previewUrlState} title={previewTitle} onClose={() => setPreviewOpen(false)} />



      </div>
    </div>
  );
}
