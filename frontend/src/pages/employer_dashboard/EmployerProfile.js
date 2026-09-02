import React, { useEffect, useState, useRef } from 'react';
// Use the jobseeker profile layout/styles for a consistent dashboard look
import '../jobhunter_dashboard/profile.css';
import './EmployerProfile.css';
import { useToast } from '../../components/ToastProvider';
import { useAuth } from '../../contexts/AuthContext';
import { getOwnProfile, saveProfile } from '../../api/profile';

export default function EmployerProfile() {
  const { token, userId, profile: authProfile } = useAuth();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState(null);
  const logoInputRef = useRef(null);
  const toast = useToast();
  const [achievementsList, setAchievementsList] = useState([]);
  const [newAchievement, setNewAchievement] = useState('');
  const [officeList, setOfficeList] = useState([]);
  const [newOffice, setNewOffice] = useState('');

  // account / password modal state (copied behavior from jobseeker profile)
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isProcessingAccount, setIsProcessingAccount] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmAction, setConfirmAction] = useState('');
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Always fetch the authoritative profile from the server to ensure we
        // surface all persisted fields (auth context may contain a lightweight
        // snapshot that doesn't include newly added employer fields).
        const p = await getOwnProfile(token, userId, authProfile?.email);
        if (!cancelled) setCompany(p);
      } catch (err) {
        if (!cancelled) setError('Failed to load company profile');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [token, userId, authProfile]);

  useEffect(() => {
    // when company loads, populate form data for editing
    if (company) {
      // if structured location fields are missing but a legacy companyLocation string exists,
      // attempt to split it into street / city / region / country parts (best-effort)
      let parsedStreet = company.companyStreetAddress || '';
      let parsedCity = company.companyCity || '';
      let parsedRegion = company.companyRegion || '';
      let parsedCountry = company.companyCountry || '';
      if ((!parsedStreet && !parsedCity && !parsedRegion && !parsedCountry) && company.companyLocation) {
        const parts = company.companyLocation.split(',').map(p => p.trim()).filter(Boolean);
        if (parts.length === 1) {
          // single token — most likely a city or locality
          parsedCity = parts[0];
        } else if (parts.length === 2) {
          // usually city, country
          parsedCity = parts[0];
          parsedCountry = parts[1];
        } else if (parts.length === 3) {
          // ambiguous: could be "City, Region, Country" or "Street, City, Country".
          // detect street-like first part (numbers or common street words).
          const streetLike = /\d|\b(st|street|rd|road|ave|avenue|blvd|boulevard|lane|ln|dr|drive)\b/i;
          if (streetLike.test(parts[0])) {
            parsedStreet = parts[0];
            parsedCity = parts[1];
            parsedCountry = parts[2];
          } else {
            parsedCity = parts[0];
            parsedRegion = parts[1];
            parsedCountry = parts[2];
          }
        } else if (parts.length >= 4) {
          // assume first is street, next is city, middle is region(s), last is country
          parsedStreet = parts[0];
          parsedCity = parts[1];
          parsedRegion = parts.slice(2, parts.length - 1).join(', ');
          parsedCountry = parts[parts.length - 1];
        }
      }
  // compose a headquarters string from structured fields when available
  const composedHQ = [parsedStreet || company.companyStreetAddress, parsedCity || company.companyCity, parsedRegion || company.companyRegion, company.companyPostalCode, parsedCountry || company.companyCountry].filter(Boolean).join(', ');

      setFormData({
        companyName: company.companyName || '',
        tagline: company.tagline || '',
        companyWebsite: company.companyWebsite || '',
        industry: company.industry || '',
        companySize: company.companySize || '',
    companyStreetAddress: parsedStreet || company.companyStreetAddress || '',
  companyCity: parsedCity || company.companyCity || '',
  companyRegion: parsedRegion || company.companyRegion || '',
  companyPostalCode: company.companyPostalCode || '',
  companyCountry: parsedCountry || company.companyCountry || '',
  companyLocation: company.companyLocation || '',
  // prefer a composed HQ from structured fields for display/editing
  headquarters: composedHQ || company.companyLocation || '',
        officeLocations: (company.officeLocations && Array.isArray(company.officeLocations)) ? company.officeLocations.join('\n') : (company.officeLocations || ''),
        ownerName: company.ownerName || '',
        ownerPosition: company.ownerPosition || '',
        ownerPhone: company.ownerPhone || '',
        phoneCountry: company.phoneCountry || '',
        ownerEmail: company.ownerEmail || company.email || '',
        companyDescription: company.companyDescription || '',
        mission: company.mission || '',
        vision: company.vision || '',
        coreValues: company.coreValues || company.values || [],
        foundingStory: company.foundingStory || '',
  achievements: (company.achievements && Array.isArray(company.achievements)) ? company.achievements.join('\n') : (company.achievements || ''),
        companyLogo: company.companyLogo || '',
        linkedin: company.linkedin || '',
        instagram: company.instagram || '',
        facebook: company.facebook || '',
        twitter: company.twitter || '',
        blog: company.blog || '',
        careersPage: company.careersPage || '',
      });
      // populate logo preview
      if (company.companyLogo) setLogoPreview(company.companyLogo);
      // populate chip lists
      setAchievementsList((company.achievements && Array.isArray(company.achievements)) ? company.achievements : (company.achievements || []));
      setOfficeList((company.officeLocations && Array.isArray(company.officeLocations)) ? company.officeLocations : (company.officeLocations || []));
    }
  }, [company]);

  useEffect(() => {
    return () => {
      if (logoPreview && logoPreview.startsWith('blob:')) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  if (loading) return <div className="page-content" style={{ padding: 24 }}>Loading company profile…</div>;
  if (error) return <div className="page-content" style={{ padding: 24 }}><div className="signup-error">{error}</div></div>;

  if (!company) return <div className="page-content" style={{ padding: 24 }}>No company profile found.</div>;

  function startEdit() {
    setEditMode(true);
  }

  function cancelEdit() {
    // reset form data back to company values
    setFormData(prev => ({ ...prev }));
    setEditMode(false);
    setSaving(false);
  }

  async function handleSave(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      // validation: required fields and URLs
      if (!formData.companyName || !formData.companyName.trim()) {
        toast.error('Company name is required');
        setError('Company name is required');
        setSaving(false);
        return;
      }

      const isValidUrl = (v) => {
        if (!v) return true;
        try { const u = new URL(v); return !!u.protocol && !!u.hostname; } catch (e) { return false; }
      };
      const urlFields = ['companyWebsite','linkedin','instagram','facebook','twitter','blog','careersPage'];
      for (const f of urlFields) {
        if (formData[f] && formData[f].trim() && !isValidUrl(formData[f].trim())) {
          toast.error(`Invalid URL in ${f}`);
          setError(`Invalid URL in ${f}`);
          setSaving(false);
          return;
        }
      }

  // assemble payload
  const payload = { ...formData, userId: company.userId || userId, __token: token };
  // ensure headquarters is composed from structured fields (City, Region, Country)
  const hParts = [payload.companyCity, payload.companyRegion, payload.companyCountry].filter(Boolean);
  if (hParts.length) payload.headquarters = hParts.join(', ');
  else if (!payload.headquarters && payload.companyLocation) payload.headquarters = payload.companyLocation;
      payload.achievements = achievementsList.slice();
      payload.officeLocations = officeList.slice();
      if (payload.coreValues && Array.isArray(payload.coreValues) === false) payload.coreValues = (payload.coreValues || '').split(',').map(s => s.trim()).filter(Boolean);
      const res = await saveProfile(payload);
      // update local company state with response (server returns saved profile)
      setCompany(res);
      setEditMode(false);
      toast.success('Profile saved');
    } catch (err) {
      setError('Failed to save profile');
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  }

  function updateField(name, value) {
    setFormData(prev => {
      const next = { ...prev, [name]: value };
      // if one of the structured location fields changed, keep `headquarters` in sync
      const locKeys = ['companyStreetAddress', 'companyCity', 'companyRegion', 'companyPostalCode', 'companyCountry'];
      if (locKeys.includes(name)) {
        const parts = [next.companyStreetAddress, next.companyCity, next.companyRegion, next.companyPostalCode, next.companyCountry].filter(Boolean);
        next.headquarters = parts.join(', ');
      }
      return next;
    });
  }

  // helper to update structured headquarters fields and keep the composed
  // `headquarters` string in sync for display and saving
  function updateHeadquartersField(field, value) {
    setFormData(prev => {
      const next = { ...prev, [field]: value };
      // include street and postal to keep the composed headquarters consistent
      const parts = [next.companyStreetAddress, next.companyCity, next.companyRegion, next.companyPostalCode, next.companyCountry].filter(Boolean);
      next.headquarters = parts.join(', ');
      return next;
    });
  }

  function removeAt(index, setter) {
    setter(prev => prev.filter((_, i) => i !== index));
  }

  function addIfNotEmpty(value, setter, clearSetter) {
    if (!value || !value.trim()) return;
    setter(prev => [...prev, value.trim()]);
    if (clearSetter) clearSetter('');
  }

  // achievements chips handlers
  const addAchievement = () => addIfNotEmpty(newAchievement, setAchievementsList, setNewAchievement);
  const removeAchievement = (i) => removeAt(i, setAchievementsList);

  // office locations chips handlers
  const addOffice = () => addIfNotEmpty(newOffice, setOfficeList, setNewOffice);
  const removeOffice = (i) => removeAt(i, setOfficeList);

  const handleLogoEdit = () => {
    if (logoInputRef.current) logoInputRef.current.click();
  };

  const handleLogoChange = async (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f || !token) return;
    // preview locally
    const url = URL.createObjectURL(f);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(url);
    setLogoUploading(true);
    try {
      const fd = new FormData();
      fd.append('logo', f);
      const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/uploads/logo`, { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      // save companyLogo to profile
      try {
        const payload = { ...company, companyLogo: data.url, __token: token };
        const saved = await saveProfile(payload);
        setCompany(saved);
        setFormData(prev => ({ ...prev, companyLogo: saved.companyLogo || data.url }));
        toast.success('Logo uploaded and saved');
      } catch (err) {
        toast.error('Failed to save logo to profile');
      }
    } catch (err) {
      console.error('Logo upload failed', err);
      toast.error('Logo upload failed');
      // revert preview if upload failed
      if (logoPreview) { URL.revokeObjectURL(logoPreview); setLogoPreview(company.companyLogo || null); }
    } finally {
      setLogoUploading(false);
    }
  };

  // account actions: open password confirm modal
  const openPasswordConfirm = (action = 'delete') => {
    setConfirmPassword('');
    setConfirmError('');
    setConfirmAction(action);
    setShowPasswordModal(true);
  };

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

  const handleDeactivate = async () => {
    if (!token) return;
    setIsProcessingAccount(true);
    try {
      const res = await fetch('/api/account/deactivate', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      if (!res.ok) throw new Error('Request failed');
      // clear local auth and redirect to login
      localStorage.removeItem('wc_token');
      localStorage.removeItem('wc_userId');
      window.location.href = '/login';
    } catch (err) {
      console.error('Deactivate failed', err);
      alert('Failed to deactivate account. Please try again.');
    } finally {
      setIsProcessingAccount(false);
      setShowAccountModal(false);
    }
  };

  return (
    <div className="profile-page">
      <div className="profile-center">
        <header className="profile-top">
          <div className="profile-top-left">
            <div className="profile-avatar large" role="button" tabIndex={0} onClick={handleLogoEdit} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleLogoEdit(); }} aria-label="Change company logo">
              <img src={logoPreview || company.companyLogo || ''} alt={company.companyName || 'Company'} />
              <input ref={logoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} disabled={logoUploading} aria-busy={logoUploading} />
            </div>
              <div className="profile-meta">
                <h1 className="profile-name">{company.companyName}</h1>
                <p className="profile-role">{formData.tagline || company.industry || '—'} {company.companySize ? '• ' + company.companySize : ''}</p>
                <p className="profile-contact">{company.ownerEmail || company.email || '—'} · {company.ownerPhone || company.phone || '—'}</p>
                <p className="profile-location">{formData.headquarters || [formData.companyStreetAddress, formData.companyCity, formData.companyRegion, formData.companyCountry].filter(Boolean).join(', ') || company.companyLocation || '—'}</p>
              </div>
          </div>
          <div className="profile-top-right">
            {!editMode ? (
              <button className="edit-btn" onClick={startEdit}>Edit Profile</button>
            ) : (
              <div style={{display:'flex',gap:8}}>
                <button className="edit-btn" onClick={cancelEdit} disabled={saving}>Cancel</button>
                <button className={`edit-btn ${saving ? '' : 'save'}`} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            )}
          </div>
        </header>

        <div className="profile-grid">
          <main className="profile-main">
            <section className="card">
              <div className="card-body">
                <div className="card-header">
                  <h3>Company Branding & Identity</h3>
                </div>

                <div className="form-row two-col">
                  <div>
                    <label>Company Name & Tagline</label>
                    <div className="input-wrap"><input value={formData.companyName} onChange={e => updateField('companyName', e.target.value)} readOnly={!editMode} /></div>
                    <div className="input-wrap" style={{marginTop:8}}><input placeholder="Tagline (one-liner)" value={formData.tagline} onChange={e => updateField('tagline', e.target.value)} readOnly={!editMode} /></div>
                  </div>
                  <div>
                    <label>Industry / Company Size</label>
                    <div style={{display:'flex',gap:8}}>
                      <div style={{flex:1}} className="input-wrap"><input value={formData.industry} onChange={e => updateField('industry', e.target.value)} readOnly={!editMode} /></div>
                      <div style={{width:160}} className="input-wrap">
                        <select value={formData.companySize} onChange={e => updateField('companySize', e.target.value)} disabled={!editMode}>
                          <option value="">—</option>
                          <option>1-10</option>
                          <option>11-50</option>
                          <option>51-200</option>
                          <option>201-500</option>
                          <option>501-1000</option>
                          <option>1000+</option>
                        </select>
                      </div>
                    </div>
                    <div style={{marginTop:8}} className="input-wrap"><input value={formData.companyWebsite} onChange={e => updateField('companyWebsite', e.target.value)} readOnly={!editMode} placeholder="Website (https://...)" /></div>
                  </div>
                </div>

              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <div className="card-header"><h3>Administration</h3></div>
                <div className="form-row two-col">
                  <div>
                    <label>Account Handler Name</label>
                    <div className="input-wrap"><input value={formData.ownerName} onChange={e => updateField('ownerName', e.target.value)} readOnly={!editMode} placeholder="Person responsible for this account" /></div>
                  </div>
                  <div>
                    <label>Handler Position</label>
                    <div className="input-wrap"><input value={formData.ownerPosition} onChange={e => updateField('ownerPosition', e.target.value)} readOnly={!editMode} placeholder="Handler's job title" /></div>
                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <div className="card-header"><h3>Company Overview (About Us)</h3></div>
                <div className="form-row">
                  <label>Mission</label>
                  <div className="input-wrap"><textarea value={formData.mission} onChange={e => updateField('mission', e.target.value)} readOnly={!editMode} /></div>
                </div>
                <div className="form-row">
                  <label>Vision</label>
                  <div className="input-wrap"><textarea value={formData.vision} onChange={e => updateField('vision', e.target.value)} readOnly={!editMode} /></div>
                </div>
                <div className="form-row">
                  <label>Core Values (comma separated)</label>
                  <div className="input-wrap"><input value={(Array.isArray(formData.coreValues) ? formData.coreValues.join(', ') : formData.coreValues)} onChange={e => updateField('coreValues', e.target.value)} readOnly={!editMode} /></div>
                </div>
                <div className="form-row">
                  <label>Detailed Description</label>
                  <div className="input-wrap"><textarea value={formData.companyDescription} onChange={e => updateField('companyDescription', e.target.value)} rows={6} readOnly={!editMode} /></div>
                </div>
                <div className="form-row">
                    <label>Founding Story</label>
                    <div className="input-wrap"><textarea value={formData.foundingStory} onChange={e => updateField('foundingStory', e.target.value)} rows={4} readOnly={!editMode} /></div>
                  

                  <div>
                  <div className="form-row">
                    <label>Key Achievements / Awards</label>
                    <div className="list-input">
                      <div className="chips">
                        {achievementsList.map((a, i) => (
                          <span className="chip" key={i}>{a} <button onClick={() => removeAchievement(i)} className="chip-remove" aria-label={`Remove ${a}`} disabled={!editMode}>×</button></span>
                        ))}
                      </div>
                      <div className="add-row">
                        <input value={newAchievement} onChange={(e) => setNewAchievement(e.target.value)} placeholder="Add achievement" disabled={!editMode} />
                        <button type="button" className="add-btn" onClick={addAchievement} disabled={!editMode}>+</button>
                      </div>
                    </div>
                  </div>

                  </div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="card-body">
                <h3>Location & Contact</h3>
                    <div className="form-row">
                      <label>Street Address</label>
                      <div className="input-wrap">
                        <input placeholder="Street address (building, number, street)" value={formData.companyStreetAddress || ''} onChange={e => updateField('companyStreetAddress', e.target.value)} readOnly={!editMode} />
                      </div>
                    </div>
                    <div className="form-row" style={{ marginTop: 8 }}>
                      <label>Headquarters</label>
                      <div className="input-wrap" style={{ display: 'flex', gap: 8 }}>
                        <input placeholder="City / Municipality" value={formData.companyCity || ''} onChange={e => updateField('companyCity', e.target.value)} readOnly={!editMode} style={{ flex: 1 }} />
                        <input placeholder="State / Province / Region" value={formData.companyRegion || ''} onChange={e => updateField('companyRegion', e.target.value)} readOnly={!editMode} style={{ flex: 1 }} />
                        <input placeholder="ZIP / Postal Code" value={formData.companyPostalCode || ''} onChange={e => updateField('companyPostalCode', e.target.value)} readOnly={!editMode} style={{ width: 140 }} />
                        <input placeholder="Country" value={formData.companyCountry || ''} onChange={e => updateField('companyCountry', e.target.value)} readOnly={!editMode} style={{ width: 160 }} />
                      </div>
                    </div>
                <div className="form-row">
                  <label>Office Locations</label>
                  <div className="list-input">
                    <div className="chips">
                      {officeList.map((o, i) => (
                        <span className="chip" key={i}>{o} <button onClick={() => removeOffice(i)} className="chip-remove" aria-label={`Remove ${o}`} disabled={!editMode}>×</button></span>
                      ))}
                    </div>
                    <div className="add-row">
                      <input value={newOffice} onChange={(e) => setNewOffice(e.target.value)} placeholder="Add office location" disabled={!editMode} />
                      <button type="button" className="add-btn" onClick={addOffice} disabled={!editMode}>+</button>
                    </div>
                  </div>
                </div>
                <div className="form-row two-col">
                  <div>
                    <label>Contact Email</label>
                    <div className="input-wrap"><input value={formData.ownerEmail} onChange={e => updateField('ownerEmail', e.target.value)} readOnly={!editMode} /></div>
                  </div>
                  <div>
                    <label>Contact Phone</label>
                    <div className="input-wrap"><input value={formData.ownerPhone} onChange={e => updateField('ownerPhone', e.target.value)} readOnly={!editMode} /></div>
                  </div>
                </div>
              </div>
            </section>
          </main>

          <aside className="profile-side">
            

            <section className="card">
              <div className="card-body">
                <h3>Social Media & External Links</h3>
                {/* <div className="form-row">
                  <label>LinkedIn</label>
                  <div className="input-wrap"><input value={formData.linkedin} onChange={e => updateField('linkedin', e.target.value)} readOnly={!editMode} placeholder="https://linkedin.com/company/your-company" /></div>
                </div> */}
                <div className="form-row">
                  <label>Instagram</label>
                  <div className="input-wrap"><input value={formData.instagram} onChange={e => updateField('instagram', e.target.value)} readOnly={!editMode} placeholder="https://instagram.com/your-company" /></div>
                </div>
                <div className="form-row">
                  <label>Facebook</label>
                  <div className="input-wrap"><input value={formData.facebook} onChange={e => updateField('facebook', e.target.value)} readOnly={!editMode} placeholder="https://facebook.com/your-page" /></div>
                </div>
                <div className="form-row">
                  <label>Twitter / X</label>
                  <div className="input-wrap"><input value={formData.twitter} onChange={e => updateField('twitter', e.target.value)} readOnly={!editMode} placeholder="https://twitter.com/yourhandle" /></div>
                </div>
                <div className="form-row">
                  <label>Company Blog / News</label>
                  <div className="input-wrap"><input value={formData.blog} onChange={e => updateField('blog', e.target.value)} readOnly={!editMode} placeholder="https://blog.yourcompany.com or https://yourcompany.com/blog" /></div>
                </div>
                <div className="form-row">
                  <label>Careers Page</label>
                  <div className="input-wrap"><input value={formData.careersPage} onChange={e => updateField('careersPage', e.target.value)} readOnly={!editMode} placeholder="https://yourcompany.com/careers" /></div>
                </div>
              </div>
            </section>

            <section className="card">
  <div className="card-body">
    <h3>Account</h3>

    <div className="form-row">
      <button
        className="secondary"
        onClick={() => setShowChangePasswordModal(true)}
      >
        Change Password
      </button>
    </div>

    {/* <div className="form-row">
      <button className="secondary">
        Manage Privacy Settings
      </button>
    </div> */}

    <div className="form-row">
      <button
        className="danger"
        onClick={() => setShowAccountModal(true)}
      >
        Deactivate / Delete Account
      </button>
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
                <input type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>
              <div className="form-row">
                <label>New Password</label>
                <input type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
              </div>
              <div className="form-row">
                <label>Confirm New Password</label>
                <input type="password" placeholder="Confirm new password" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} />
              </div>
              {passwordError && <div className="confirm-error" style={{ marginTop: 8 }}>{passwordError}</div>} 
              <div className="buttons" style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="primary" onClick={async () => {
                  // minimal client-side validation and request
                  setPasswordError('');
                  if (!currentPassword || !newPassword || newPassword.length < 6) {
                    setPasswordError('Please provide current password and a new password at least 6 characters long.');
                    return;
                  }
                  if (newPassword !== confirmNewPassword) {
                    setPasswordError('New passwords do not match.');
                    return;
                  }
                  try {
                    const res = await fetch('/api/account/change-password', { method: 'POST', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ currentPassword, newPassword }) });
                    if (!res.ok) throw new Error('Request failed');
                    toast.success('Password changed');
                    setShowChangePasswordModal(false);
                    setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
                  } catch (err) {
                    console.error('Change password failed', err);
                    setPasswordError('Failed to change password. Please check your current password and try again.');
                  }
                }}>Save</button>
                <button className="secondary" onClick={() => setShowChangePasswordModal(false)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
