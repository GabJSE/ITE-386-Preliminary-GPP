import React, { useEffect, useState } from 'react';
import './dashboard.css';
import './JobseekerNotification.css';
import { useAuth } from '../../contexts/AuthContext';
import { getNotifications, markRead, deleteNotification } from '../../api/notifications';
import { io } from 'socket.io-client';

export default function JobseekerNotification() {
  const { token, userId } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);

  // 🔹 Load notifications once
  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const data = await getNotifications(token);
        if (mounted) setNotifications(data || []);

        // Mark all unread notifications as read
        if (data?.length) {
          const unread = data.filter(n => !n.read);
          await Promise.all(unread.map(n => markRead(n._id || n.id, token)));
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

  // 🔹 Mark as read
  const handleMarkRead = async (id) => {
    try {
      const updated = await markRead(id, token);
      setNotifications((prev) =>
        prev.map((n) => (String(n._id || n.id) === String(id) ? updated : n))
      );
    } catch (err) {
      console.error('Mark read failed', err);
    }
  };

  // 🔹 Delete notification
  const handleDelete = async (id) => {
    try {
      await deleteNotification(id, token);
      setNotifications((prev) =>
        prev.filter((n) => String(n._id || n.id) !== String(id))
      );
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  // 🔹 Realtime updates: notifications + deleted chat alert
  useEffect(() => {
    const socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000');

    socket.emit('register', userId); // join userId room

    // 📨 New notifications (generic)
    socket.on('notification', (notif) => {
      console.log('🔔 New notification:', notif);
      setNotifications((prev) => [notif, ...prev]);
    });

    // ❌ Chat closed notification (real-time)
    socket.on('conversationDeleted', ({ message }) => {
      console.log('❌ Chat closed:', message);
      const notif = {
        _id: Date.now().toString(),
        title: 'Chat Closed',
        message,
        type: 'system',
        read: false,
      };
      setNotifications((prev) => [notif, ...prev]);
    });

    return () => socket.disconnect();
  }, [userId]);

  return (
    <div className="dashboard-container">
      <div className="card">
        <h2 className="overview-header">Notifications</h2>
        <div style={{ marginTop: 12 }}>
          {loading && <div style={{ padding: 12 }}>Loading…</div>}
          {!loading && notifications.length === 0 && (
            <div style={{ padding: 16, color: '#666' }}>No notifications</div>
          )}

          {!loading &&
            notifications.map((n) => {
              const id = n._id || n.id;
              return (
                <div
                  key={id}
                  className={`notification-item ${n.read ? '' : 'unread'}`}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12,
                    padding: 12,
                    borderRadius: 8,
                    marginBottom: 8,
                  }}
                >
                  <div>
                    <strong>{n.title}</strong>
                    <div className="notif-desc">{n.message}</div>
                  </div>
                  <div
                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    {!n.read && (
                      <button
                        className="save-btn"
                        onClick={() => handleMarkRead(id)}
                      >
                        Mark read
                      </button>
                    )}
                    <button
                      className="save-btn"
                      onClick={() => handleDelete(id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
