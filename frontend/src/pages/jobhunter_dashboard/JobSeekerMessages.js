import React, { useEffect, useState, useRef } from 'react';
import './JobSeekerMessages.css';
import { useAuth } from '../../contexts/AuthContext';
import { getConversations, getMessages, sendMessage, deleteConversation } from '../../api/messages';
import { useLocation } from 'react-router-dom';

function initialsFromTitle(title) {
  if (!title) return 'U';
  const parts = title.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export default function JobSeekerMessages() {
  const { profile } = useAuth();
  const userId = profile?.userId || profile?._id || null;
  const userType = 'Profile';

  const [convos, setConvos] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [otherNames, setOtherNames] = useState({});
  const [otherLogos, setOtherLogos] = useState({});
  const [text, setText] = useState('');
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);
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
    .then((d) => {
      const list = d.conversations || [];
      // Remove duplicate conversations between same participants
      const deduped = [...new Map(
        list.map(c => {
          const key = c.participants
            ?.map(p => String(p.userId))
            .sort()
            .join('-');
          return [key, c];
        })
      ).values()];
      setConvos(deduped);
    })
    .catch(() => {});
}, [userId, userType, filter]);


  // Load messages
  useEffect(() => {
    if (!selected) return;
    getMessages(selected._id)
      .then((d) => setMessages(d.messages || []))
      .catch(() => {});
  }, [selected]);

  // Scroll to bottom
  useEffect(() => {
    if (threadRef.current)
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [messages]);

  // Determine other participant (Employer)
  useEffect(() => {
  if (!convos.length || !userId) return;
  (async () => {
    const base = process.env.REACT_APP_API_URL || '';
    const names = {};
    const logos = {};

    for (const convo of convos) {
      const participants = Array.isArray(convo.participants)
        ? convo.participants
        : [];
      const other = participants.find(
        (p) => String(p.userId) !== String(userId)
      );
      if (!other) continue;

      try {
        const res = await fetch(
          `${base}/api/profile?userId=${other.userId}&userType=${other.userType}`,
          { headers: { 'Content-Type': 'application/json' } }
        );
        if (!res.ok) continue;
        const data = await res.json();

        const displayName =
          data.companyName ||
          data.ownerName ||
          data.fullName ||
          `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
          data.email ||
          'Conversation';
        names[convo._id] = displayName;

        if (data.companyLogo)
          logos[convo._id] =
  data.companyLogo.startsWith('http')
    ? data.companyLogo
    : `${base.replace(/\/$/, '')}/${data.companyLogo.replace(/^\/+/, '')}`;

      } catch {}
    }

    setOtherNames(names);
    setOtherLogos(logos);
  })();
}, [convos, userId]);


  
  // Send message
  const handleSend = async () => {
    if (!text || !selected || !userId) return;
    try {
      const toParticipant = selected.participants.find(
        (p) => String(p.userId) !== String(userId)
      );
      const res = await sendMessage({
        conversationId: selected._id,
        from: userId,
        fromType: 'Profile',
        to: toParticipant?.userId,
        toType: 'EmployersProfile',
        body: text,
        title: selected?.title,
      });
      setMessages((prev) => [...prev, res.message]);
      setText('');
      setConvos((prev) => {
        const idx = prev.findIndex((c) => c._id === selected._id);
        const updated = {
          ...selected,
          lastMessage: text,
          updatedAt: new Date().toISOString(),
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

  // Archive toggle
const handleArchive = async (id) => {
  try {
    const convo = convos.find(c => c._id === id);
    const base = process.env.REACT_APP_API_URL || '';
    const res = await fetch(`${base}/api/messages/conversations/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        archived: !convo?.archivedBy?.some((a) => String(a.userId) === String(userId))
      })
    });

    if (res.ok) {
      const data = await res.json();
      const updatedConvo = {
        ...data.conversation,
        archived: data.conversation.archivedBy?.some(
          (a) => String(a.userId) === String(userId)
        )
      };
      setConvos((prev) =>
        prev.map((c) => (c._id === id ? updatedConvo : c))
      );
      // auto close dropdown
      setOpenMenuId(null);
    } else console.warn('Archive request failed');
  } catch (e) {
    console.error('Archive failed', e);
  }
};



// Delete conversation (soft delete)
const handleDeleteConvo = async (id) => {
  if (!id) return;
  try {
    await deleteConversation(id); // call centralized API
    // Remove the conversation from local state instantly
    setConvos((prev) => prev.filter((c) => c._id !== id));
    // Clear selected if the deleted convo is open
    if (selected?._id === id) setSelected(null);
    setOpenMenuId(null); // close dropdown menu
  } catch (err) {
    console.error('Error deleting conversation:', err);
    alert('Failed to delete conversation.');
  }
};




  // Refresh convos periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      if (!userId) return;
      try {
        const data = await getConversations(userId, userType, false);
        setConvos(data.conversations || []);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, [userId, userType]);

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
                      {otherLogos[c._id] ? (
                        <img
                          src={otherLogos[c._id]}
                          alt="logo"
                          className="avatar-img"
                        />
                      ) : (
                        <div className="avatar">{initialsFromTitle(c.title)}</div>
                      )}
                    </div>

                    <div className="convo-body">
                      <div className="convo-title-row">
                        <div className="convo-title">
                          {otherNames[c._id] || c.title || 'Conversation'}
                        </div>

                        <div className="convo-time">
                          {c.updatedAt
                            ? new Date(c.updatedAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : ''}
                        </div>
                      </div>
                      <div className="convo-last">{c.lastMessage}</div>
                    </div>

                    {/* 3-dot icon on right */}
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


                          {/* <button onClick={() => handleDeleteConvo(c._id)}>
                            Delete
                          </button> */}
                        </div>
                      )}
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
                ? otherNames[selected._id] || selected.title || 'Conversation'
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
                        <h1></h1>
                         <h1></h1>
                          <h1></h1>
                           <h1></h1>





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
                            minute: '2-digit',
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

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
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
