import React, { useEffect, useState, useRef } from 'react';
import './EmployerMessages.css';
import '../../pages/jobhunter_dashboard/JobSeekerMessages.css';
import { useAuth } from '../../contexts/AuthContext';
import {
  getConversations,
  getMessages,
  sendMessage,
  startConversation,
  deleteConversation
} from '../../api/messages';
import { useLocation } from 'react-router-dom';




function initialsFromTitle(title) {
  if (!title) return 'U';
  const parts = title.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function EmployerMessages() {
  const [openMenuId, setOpenMenuId] = useState(null);
  const { profile } = useAuth();
  const userId = profile?.userId || profile?._id || null;
  const userType = 'EmployersProfile';

  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherName, setOtherName] = useState('');
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const threadRef = useRef(null);
  const location = useLocation();


  // Auto-refresh messages every 3 seconds when a conversation is open
useEffect(() => {
  if (!selected) return;
  const interval = setInterval(async () => {
    try {
      const d = await getMessages(selected._id);
      setMessages((prev) => {
        const newMsgs = d.messages || [];
        if (newMsgs.length !== prev.length) return newMsgs;
        return prev;
      });
    } catch {}
  }, 1000);
  return () => clearInterval(interval);
}, [selected]);

useEffect(() => {
  if (!selected) return;
  getMessages(selected._id)
    .then((d) => setMessages(d.messages || []))
    .catch(() => {});
}, [selected]);





  // Load conversations
  useEffect(() => {
  if (!userId) return;
  getConversations(userId, userType, filter === 'Archived')
    .then(async (d) => {
      const convosWithLogos = await Promise.all(
        (d.conversations || []).map(async (c) => {
          const other = c.participants.find((p) => String(p.userId) !== String(userId));
          if (!other) return c;
          try {
  const base = process.env.REACT_APP_API_URL || '';
  const res = await fetch(`${base}/api/profile?userId=${other.userId}`);
  if (!res.ok) return c;
  const data = await res.json();
  return {
    ...c,
    otherLogo: data.image || null,
  };
} catch {
  return c;
}
        })
      );
      setConvos(convosWithLogos);
    })
    .catch(() => {});
}, [userId, userType, filter]);


  // Load messages for selected convo
  useEffect(() => {
    if (!selected) return;
    getMessages(selected._id)
      .then((d) => setMessages(d.messages || []))
      .catch(() => {});
  }, [selected]);

  // Scroll to bottom on new messages
 // Scroll to bottom on new messages
  useEffect(() => {
    if (threadRef.current) {
      // Use a 0ms timeout to push the scroll to the next browser "tick".
      // This ensures the DOM has rendered the new messages *before* we scroll.
      const timer = setTimeout(() => {
        if (threadRef.current) { // Check again in case component unmounted
          threadRef.current.scrollTop = threadRef.current.scrollHeight;
        }
      }, 0);
      return () => clearTimeout(timer); // Clean up the timer
    }
  }, [messages]);

  // Determine other participant name (Job Hunter)
  useEffect(() => {
    if (!selected || !profile) return;

    (async () => {
      try {
        const other = selected.participants.find(
          (p) => String(p.userId) !== String(userId)
        );
        if (!other) return setOtherName('Conversation');

        const base = process.env.REACT_APP_API_URL || '';
        const res = await fetch(
          `${base}/api/profile?userId=${other.userId}`,
          { headers: { 'Content-Type': 'application/json' } }
        );

        if (!res.ok) return setOtherName('Conversation');
        const data = await res.json();

        const displayName =
          data.fullName ||
          `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
          data.email ||
          'Conversation';

        setOtherName(displayName);
      } catch (e) {
        console.error(e);
        setOtherName('Conversation');
      }
    })();
  }, [selected, profile, userId]);

  // Archive toggle
const handleArchive = async (id) => {
  try {
    const convo = convos.find((c) => c._id === id);
    const base = process.env.REACT_APP_API_URL || '';
    const res = await fetch(`${base}/api/messages/conversations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify({
        archived: !convo?.archivedBy?.some((a) => String(a.userId) === String(userId)),
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const updatedConvo = {
        ...data.conversation,
        archived: data.conversation.archivedBy?.some(
          (a) => String(a.userId) === String(userId)
        ),
      };
      setConvos((prev) => prev.map((c) => (c._id === id ? updatedConvo : c)));
      setOpenMenuId(null);
    } else console.warn('Archive request failed');
  } catch (e) {
    console.error('Archive failed', e);
  }
};

// Delete conversation (soft delete + notify job hunter)
const handleDeleteConvo = async (id) => {
  if (!id) return;
  try {
    const base = process.env.REACT_APP_API_URL || '';
    const token = localStorage.getItem('wc_token');

    const res = await fetch(`${base}/api/messages/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) throw new Error('Failed to delete conversation');

    // Remove locally
    setConvos((prev) => prev.filter((c) => c._id !== id));
    if (selected?._id === id) setSelected(null);
    setOpenMenuId(null);

    console.log('✅ Conversation deleted and notification sent.');
  } catch (err) {
    console.error('Error deleting conversation:', err);
    alert('Failed to delete conversation.');
  }
};




  // Handle sending message
  const handleSend = async () => {
    if (!text || !selected || !userId) return;

    try {
      const toParticipant = selected.participants.find(
        (p) => String(p.userId) !== String(userId)
      );

      const res = await sendMessage({
        conversationId: selected._id,
        from: userId,
        fromType: 'EmployersProfile',
        to: toParticipant?.userId,
        toType: 'Profile',
        body: text,
        title: selected?.title
      });

      setMessages((prev) => [...prev, res.message]);
      setText('');

      // instantly reflect on both ends
      setConvos((prev) => {
        const idx = prev.findIndex((c) => c._id === selected._id);
        const updated = {
          ...selected,
          lastMessage: text,
          updatedAt: new Date().toISOString()
        };
        if (idx >= 0) {
          const list = [...prev];
          list.splice(idx, 1);
          return [updated, ...list];
        }
        return [updated, ...prev];
      });
    } catch (e) {
      console.warn('Send failed', e);
    }
  };

  // Handle starting or selecting conversation (Employers initiate)
  useEffect(() => {
    const state = location?.state;
    if (!state || !userId) return;

    const target = state.toApplicantId || state.toUserId || state.toEmail;
    const title = state.toName || '';
    if (!target) return;

    (async () => {
      try {
        const current = await getConversations(userId, userType, false);
        const list = current.conversations || [];

        const existing = list.find((c) =>
          (c.participants || []).some(
            (p) => String(p.userId) === String(target)
          )
        );

        if (existing) {
          setConvos(list);
          setSelected(existing);
          return;
        }

        const res = await startConversation(
          userId,
          target,
          title,
          'EmployersProfile',
          'Profile',
          state.jobId
        );

        const newConv = res.conversation || res;
        const updated = await getConversations(userId, userType, false);
        setConvos(updated.conversations || []);
        setSelected(newConv);
      } catch (e) {
        console.warn('Could not start/select conversation', e);
      }
    })();
  }, [location.state, userId, userType]);

  // Filtered convo list
  const filteredConvos = convos.filter((c) => {
  if (!c) return false;
  const isArchived = c.archivedBy?.some((a) => String(a.userId) === String(userId));
  if (filter === 'Archived') return isArchived;
  if (filter === 'All') return !isArchived;
  if (search.trim()) {
    return (c.title || '').toLowerCase().includes(search.toLowerCase());
  }
  return true;
});


  return (
    <div className="messages-root page-content" style={{ padding: 24 }}>
      <div className="messages-card">
        {/* Sidebar */}
        <aside className="messages-list">
          <div className="panel panel-left">
            <div className="panel-header">
              <div className="panel-title">Conversations</div>
            </div>
            <div className="panel-body">
              <div className="messages-search">
                <input
                  className="wc-search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search conversations"
                />
              </div>

              <div className="messages-filters">
                {['All', 'Archived'].map((f) => (
                  <button
                    key={f}
                    className={`filter-btn ${filter === f ? 'active' : ''}`}
                    onClick={() => setFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="messages-convos">
                {filteredConvos.map((c) => (
                  <div
                    key={c._id}
                    className={`messages-convo ${
                      selected && selected._id === c._id ? 'active' : ''
                    }`}
                    onClick={() => setSelected(c)}
                  >
                    <div className="convo-left">
                      {/* FIX: Removed the extra <div className="avatar"> wrapper */}
                      {c.otherLogo ? (
                        <img
                          src={
                            c.otherLogo?.startsWith('http')
                              ? c.otherLogo
                              : `http://localhost:5000/${c.otherLogo.replace(/^\/+/, '')}`
                          }
                          alt="profile"
                          className="avatar-img" /* Added class for styling */
                        />
                      ) : (
                        <div className="avatar"> {/* Keep avatar div for initials */}
                          <span>{initialsFromTitle(c.title)}</span>
                        </div>
                      )}
                 

                    </div>
                    <div className="convo-body">
                      <div className="convo-title-row">
                        <div className="convo-title">
                          {c.title || 'Conversation'}
                        </div>
                        <div className="convo-time">
                          {c.updatedAt
                            ? new Date(c.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : ''}
                        </div>
                      </div>
                      <div className="convo-last">{c.lastMessage}</div>

{/* 3-dot icon menu */}
<div
  className="convo-actions"
  onClick={(e) => e.stopPropagation()}
>
  <button
    className="three-dot-btn"
    onClick={() =>
      setOpenMenuId(openMenuId === c._id ? null : c._id)
    }
  >
    ⋮
  </button>
  {openMenuId === c._id && (
    <div className="convo-menu">
      <button onClick={() => handleArchive(c._id)}>
        {c.archivedBy?.some((a) => String(a.userId) === String(userId))
          ? 'Unarchive'
          : 'Archive'}
      </button>
      <button onClick={() => handleDeleteConvo(c._id)}>Delete</button>

    </div>
  )}
</div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Thread */}
        <main className="messages-thread">
          <div className="panel panel-right">
            <div className="panel-header">
              <div className="panel-title">
                {selected
                  ? otherName || selected.title || 'Conversation'
                  : 'Active Chat Area'}
              </div>
            </div>
            <div className="panel-body panel-body-right">
              {!selected ? (
                <div className="messages-empty">
                  Select a conversation or start a new one
                </div>
              ) : (
                <>
                  <div className="thread-body" ref={threadRef}>
                    {/* ADD THIS BLOCK */}
                    {messages.length === 0 && (
                      <div className="messages-empty" style={{ margin: 'auto', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        This is the start of your conversation. Send a message to begin.
                      </div>
                    )}
                    {/* END OF ADDED BLOCK */}
                    
                    {messages.map((m) => (
                      <div
                        key={m._id}
                        className={`thread-msg ${
                          String(m.from) === String(userId) ? 'me' : 'them'
                        }`}
                      >
                        <div className="msg-body">{m.body}</div>
                        <div className="msg-meta">
                          {new Date(m.createdAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  
                </>
              )}
              
            </div>
                {/* Panel Footer */}
                  <div className="panel-footer">
                    <div className="thread-input">
                      <input
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a message"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <button className="send-btn" onClick={handleSend}>
                        ➤
                      </button>
                    </div>
                  </div>
          </div>
        </main>
      </div>
    </div>
  );
}
