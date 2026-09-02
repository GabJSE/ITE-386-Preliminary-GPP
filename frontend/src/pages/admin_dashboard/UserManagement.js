import React, { useEffect, useMemo, useState } from 'react';
// Import the correct CSS file
import './UserManagement.css'; 
// We assume admin.css is a global style, but if not, you can remove it.
import './admin.css'; 

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // UI state
  const [searchTerm, setSearchTerm] = useState('');
  const [roleTab, setRoleTab] = useState('All'); // All, Jobseekers, Employers, Admins
  const [statusFilter, setStatusFilter] = useState('All'); // All, Active, Deactivated, Deleted
  const [selectedUser, setSelectedUser] = useState(null); // user object for modal
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  function fetchUsers() {
    setLoading(true);
    setError('');
    fetch('/api/admin/merged-users/users')
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch');
        return res.json();
      })
      .then(data => {
        const arr = Array.isArray(data) ? data : [];
        setUsers(arr);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching users:', err);
        setError('Unable to load users. Please try again later.');
        setLoading(false);
      });
  }

  // Derived list based on tabs/filters/search
  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users
      .filter(u => {
        if (roleTab === 'Jobseekers') return (u.role || '').toLowerCase().includes('job');
        if (roleTab === 'Employers') return (u.role || '').toLowerCase().includes('employer');
        if (roleTab === 'Admins') return (u.role || '').toLowerCase().includes('admin');
        return true;
      })
      .filter(u => {
        if (statusFilter === 'All') return true;
        return (u.status || 'active').toLowerCase() === statusFilter.toLowerCase();
      })
      .filter(u => {
        if (!term) return true;
        return (
          (u.fullName || '').toLowerCase().includes(term) ||
          (u.email || '').toLowerCase().includes(term)
        );
      });
  }, [users, roleTab, statusFilter, searchTerm]);

  // --- STYLES BLOCK REMOVED ---

  // Modal helpers
  async function openModal(userSummary) {
    setModalOpen(true);
    setModalLoading(true);
    setSelectedUser(null); // Clear any old data
    setError('');
    try {
      // Fetch the full user document from our new route
      const res = await fetch(`/api/admin/merged-users/users/${userSummary._id}`);
      if (!res.ok) throw new Error('Failed to load user details');
      const fullUser = await res.json();

      // Map the full data to the fields the modal expects (fullName, email)
      // This ensures our existing 'Save' logic still works
      let mappedUser = { ...fullUser };
      
      if (fullUser.role === 'jobhunter') {
        mappedUser.fullName = `${fullUser.firstName || ''} ${fullUser.lastName || ''}`.trim();
        mappedUser.email = fullUser.email;
      } else if (fullUser.role === 'employer') {
        mappedUser.fullName = fullUser.ownerName;
        mappedUser.email = fullUser.ownerEmail;
      } else { // admin
        mappedUser.fullName = fullUser.name;
        mappedUser.email = fullUser.email;
      }
      
      setSelectedUser(mappedUser);
    } catch (err) {
      console.error(err);
      setError('Failed to load user details. Please close and try again.');
    } finally {
      setModalLoading(false);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedUser(null);
  }

  // Save edits (name/email/password)
  async function saveUserEdits() {
    if (!selectedUser) return;
    setSaving(true);
    setError('');
    try {
      const id = selectedUser._id || selectedUser.id;
      
      // Build the payload with all common and specific fields
      const payload = { 
        fullName: selectedUser.fullName, 
        email: selectedUser.email, 
        role: selectedUser.role 
      };
      
      if (selectedUser.newPassword) {
        payload.password = selectedUser.newPassword;
      }

      // Add role-specific fields
      if (selectedUser.role === 'jobhunter') {
        payload.phone = selectedUser.phone;
        payload.city = selectedUser.city;
        payload.bio = selectedUser.bio;
      } else if (selectedUser.role === 'employer') {
        payload.companyName = selectedUser.companyName;
        payload.ownerPhone = selectedUser.ownerPhone;
        payload.companyCity = selectedUser.companyCity;
      }

      const res = await fetch(`/api/admin/merged-users/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save');
      
      const updatedSummary = await res.json(); // Backend returns the summary
      
      // Update the main list with the summary
      setUsers(prev => prev.map(u => (u._id === updatedSummary._id || u.id === updatedSummary.id ? updatedSummary : u)));
      
      setSaving(false);
      closeModal();
    } catch (err) {
      console.error(err);
      setError('Failed to save changes.');
      setSaving(false);
    }
  }

  // Toggle status (activate/suspend/delete)
  async function changeStatus(userId, newStatus) {
    setError('');
    try {
      const res = await fetch(`/api/admin/merged-users/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Failed');
      const updated = await res.json();
      setUsers(prev => prev.map(u => (u._id === updated._id || u.id === updated.id ? updated : u)));
      if (selectedUser && (selectedUser._id === userId || selectedUser.id === userId)) {
        // MERGE the update, don't replace the object
        setSelectedUser(prev => ({ ...prev, ...updated })); // <-- THIS IS THE FIX
      }
    } catch (err) {
      console.error(err);
      setError('Failed to change status');
    }
  }

  // // Delete permanently
  // async function deleteUser(userId) {
  //   if (!window.confirm('Permanently delete this user? This cannot be undone.')) return;
  //   setError('');
  //   try {
  //     const res = await fetch(`/api/admin/merged-users/users/${userId}`, { method: 'DELETE' });
  //     if (!res.ok) throw new Error('Failed to delete');
  //     setUsers(prev => prev.filter(u => (u._id || u.id) !== userId));
  //     closeModal();
  //   } catch (err) {
  //     console.error(err);
  //     setError('Failed to delete user');
  //   }
  // }

  return (
    <div className="page-content">
      {/* <style> tag removed */}
      <div className="page-header">
        <div>
          <h2 className="page-title">User Management</h2>
          <div className="page-subtitle">Search, filter and manage user accounts.</div>
        </div>

        <div className="controls">
          <input
            className="input"
            placeholder="Search by name or email"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <select className="select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="All">All status</option>
            <option value="active">Active</option>
            {/* <option value="suspended">Suspended</option> */}
            <option value="deactivated">Deactivated</option>
            {/* <option value="deleted">Deleted</option> */}
          </select>
        </div>
      </div>

      <div className="tabs-container">
        <div className="tabs">
          {['All', 'Jobseekers', 'Employers', 'Admins'].map(t => (
            <button
              key={t}
              className={`tab ${roleTab === t ? 'active' : ''}`}
              onClick={() => setRoleTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {loading ? (
        <div>Loading users…</div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="table-empty-cell">
                    No users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(u => (
                  <tr key={u._id || u.id} className="user-row">
                    <td>
                      <div className="user-name">{u.name || '—'}</div>
                      <div className="user-phone">{u.phone || ''}</div>
                    </td>
                    <td>{u.email || '—'}</td>
                    <td className="user-role">{u.role || '—'}</td>
                    <td>
                      {/* <span className={`badge ${
                        (u.status || 'active') === 'active' ? 'active' :
                        u.status === 'suspended' ? 'suspended' :
                        u.status === 'deactivated' ? 'deactivated' : 'deleted'
                      }`}>
                        {(u.status || 'active').toUpperCase()}
                      </span> */}
                      <span className={`badge ${
                        (u.status || 'active') === 'active' ? 'active' : 'deactivated'
                      }`}>
                        {(u.status || 'active').toUpperCase()}
                      </span>
                    </td>
                    <td>{new Date(u.joined).toLocaleDateString()}</td>
                    <td>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => openModal(u)}
                      >
                        Manage
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && selectedUser && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">User Details</h3>
              <div className="modal-email">{selectedUser.email}</div>
            </div>

            {/* Find and replace this entire block */}
            <div className="modal-body">
              {modalLoading ? (
                <div>Loading user details...</div>
              ) : !selectedUser ? (
                <div className="error-message">{error || 'Could not load user.'}</div>
              ) : (
                <>
                <div className="modal-profile-pic-container">
                    <img
                      className="modal-profile-pic"
                      src={
                        (selectedUser.role === 'jobhunter' ? selectedUser.image : selectedUser.companyLogo) || 
                        "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect width='100' height='100' fill='%23e5e7eb'/%3E%3Ctext x='50' y='55' font-family='Arial' font-size='40' fill='%239ca3af' text-anchor='middle'%3E?%3C/text%3E%3C/svg%3E"
                      }
                      alt="Profile"
                    />
                  </div>
                  {/* --- Standard Fields --- */}
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="fullName">Full Name</label>
                      <input
                        id="fullName"
                        placeholder="Full Name"
                        value={selectedUser.fullName || ''}
                        onChange={e => setSelectedUser(prev => ({ ...prev, fullName: e.target.value }))}
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="email">Email Address</label>
                      <input
                        id="email"
                        placeholder="Email Address"
                        value={selectedUser.email || ''}
                        onChange={e => setSelectedUser(prev => ({ ...prev, email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="role">Role</label>
                      <select
                        id="role"
                        value={selectedUser.role || ''}
                        onChange={e => setSelectedUser(prev => ({ ...prev, role: e.target.value }))}
                      >
                        <option value="jobhunter">Jobseeker</option>
                        <option value="employer">Employer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label htmlFor="newPassword">New Password</label>
                      <input
                        id="newPassword"
                        placeholder="Leave blank to keep unchanged"
                        type="password"
                        value={selectedUser.newPassword || ''}
                        onChange={e => setSelectedUser(prev => ({ ...prev, newPassword: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* --- Role-Specific Fields --- */}
                  
                  {/* --- JOBSEEKER FIELDS --- */}
                  {selectedUser.role === 'jobhunter' && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="phone">Phone Number</label>
                          <input
                            id="phone"
                            placeholder="Phone Number"
                            value={selectedUser.phone || ''}
                            onChange={e => setSelectedUser(prev => ({ ...prev, phone: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="city">City</label>
                          <input
                            id="city"
                            placeholder="City"
                            value={selectedUser.city || ''}
                            onChange={e => setSelectedUser(prev => ({ ...prev, city: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="bio">Bio</label>
                          <textarea
                            id="bio"
                            className="form-textarea"
                            placeholder="Bio"
                            rows={3}
                            value={selectedUser.bio || ''}
                            onChange={e => setSelectedUser(prev => ({ ...prev, bio: e.target.value }))}
                          />
                        </div>
                      </div>
                    </>
                  )}
                  
                  {/* --- EMPLOYER FIELDS --- */}
                  {selectedUser.role === 'employer' && (
                    <>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="companyName">Company Name</label>
                          <input
                            id="companyName"
                            placeholder="Company Name"
                            value={selectedUser.companyName || ''}
                            onChange={e => setSelectedUser(prev => ({ ...prev, companyName: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label htmlFor="ownerPhone">Owner Phone</label>
                          <input
                            id="ownerPhone"
                            placeholder="Owner Phone"
                            value={selectedUser.ownerPhone || ''}
                            onChange={e => setSelectedUser(prev => ({ ...prev, ownerPhone: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="companyCity">Company City</label>
                          <input
                            id="companyCity"
                            placeholder="Company City"
                            value={selectedUser.companyCity || ''}
                            onChange={e => setSelectedUser(prev => ({ ...prev, companyCity: e.target.value }))}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div> 
              
              
              {/* This is the closing div of modal-body */}

            {/* All buttons now go in a single footer outside the body */}
            <div className="modal-footer">
              <div className="footer-actions-left">
                {/* Toggle Activate/Deactivate Button */}
                {((selectedUser.status || 'active') === 'active') ? (
                  <button className="btn btn-danger" onClick={() => changeStatus(selectedUser._id || selectedUser.id, 'deactivated')}>
                    Deactivate
                  </button>
                ) : (
                  <button className="btn btn-primary" onClick={() => changeStatus(selectedUser._id || selectedUser.id, 'active')}>
                    Activate
                  </button>
                )}
              </div>

              <div className="footer-actions-right">
                <button className="btn" onClick={closeModal} disabled={saving}>
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => saveUserEdits()}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </div>
            </div>
            
          </div>
        </div>
      )}
    </div>
  );
}