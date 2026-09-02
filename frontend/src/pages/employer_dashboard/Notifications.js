import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications, markRead, deleteNotification } from '../../api/notifications';
import { useNavigate } from 'react-router-dom';
import './Notifications.css';



export default function EmployerNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();


  useEffect(() => {
    
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const data = await getNotifications(token);
        if (mounted && data) {
          setNotifications(data);
          // Mark all unread notifications as read
          const unread = data.filter(n => !n.read);
          for (const n of unread) {
            try { await markRead(n._id || n.id, token); } catch (e) { console.warn('Failed to mark read', n._id, e); }
          }
        }

      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, [token]);

  useEffect(() => {
    function onNotif(e) {
      const payload = e.detail || e;
      // prepend
      setNotifications((prev) => [payload, ...prev]);
    }
    window.addEventListener('wc:notification', onNotif);
    return () => window.removeEventListener('wc:notification', onNotif);
  }, []);

  const handleMarkRead = async (id) => {
    try {
      const updated = await markRead(id, token);
      setNotifications((prev) => prev.map((n) => (String(n._id || n.id) === String(id) ? updated : n)));
    } catch (err) {
      console.error('Mark read failed', err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteNotification(id, token);
      setNotifications((prev) => prev.filter((n) => String(n._id || n.id) !== String(id)));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  return (
    <div className="page-content" style={{ padding: 24 }}>
      <div className="card">
        <div className="card-body">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2 style={{ margin: 0 }}>Notifications</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary" onClick={() => { setLoading(true); getNotifications(token).then(d => setNotifications(d||[])).catch(e=>console.error(e)).finally(()=>setLoading(false)); }}>Refresh</button>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {loading && <div style={{ padding: 12 }}>Loading…</div>}
            {!loading && notifications.length === 0 && (
              <div style={{ padding: 16, color: '#666' }}>No notifications</div>
            )}

            {!loading && notifications.map((n) => {
              const id = n._id || n.id;
              return (
                  <div
                    key={id}
                    className="notification-row"
                    onClick={() => {
                      if (n.link) navigate(n.link);
                      if (!n.read) handleMarkRead(id);
                    }}
                    style={{
                      display: 'flex',
                      gap: 12,
                      padding: 12,
                      borderRadius: 8,
                      background: n.read ? 'transparent' : '#f6fbff',
                      alignItems: 'flex-start',
                      marginBottom: 8,
                      cursor: n.link ? 'pointer' : 'default'
                    }}
                  >
                  <div style={{ width: 40, height: 40, borderRadius: 20, background: '#e9eef6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600 }} aria-hidden>
                    {n.type === 'application' ? 'A' : n.type === 'message' ? 'M' : n.type === 'expiration' ? '!' : n.type === 'closed' ? '✓' : '⚠'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 600 }}>{n.title}</div>
                        <div style={{ color: '#333', marginTop: 6 }}>{n.message}</div>
                      </div>
                      <div style={{ color: '#777', fontSize: 12 }}>{new Date(n.createdAt || n.time || Date.now()).toLocaleString()}</div>
                    </div>
                    <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                      {!n.read && <button className="secondary" onClick={() => handleMarkRead(id)}>Mark read</button>}
                      <button className="secondary" onClick={() => handleDelete(id)}>Delete</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
