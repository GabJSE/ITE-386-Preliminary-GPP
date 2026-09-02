// utils to build headers
function authHeaders(extra = {}) {
  const token = localStorage.getItem('wc_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

// Fetch all conversations for a user
export async function getConversations(userId, userType, archived = false) {
  const params = new URLSearchParams();
  params.set('userId', userId);params.set('userId', userId);
  if (archived) params.set('archived', 'true');

  const res = await fetch(
    `${process.env.REACT_APP_API_URL || ''}/api/messages/conversations?${params.toString()}`,
    { headers: authHeaders() }
  );

  if (!res.ok) throw new Error('Failed to fetch conversations');
  return res.json();
}


// Fetch messages from a conversation

export async function getMessages(conversationId) {
  const res = await fetch(
    `${process.env.REACT_APP_API_URL || ''}/api/messages/conversation/${conversationId}/messages`,
    { headers: authHeaders() }
  );

  if (!res.ok) throw new Error('Failed to fetch messages');
  return res.json(); // should return { messages: [...] }
}


// Send a message
export async function sendMessage(payload) {
  const enrichedPayload = {
    ...payload,
    fromType: payload.fromType || localStorage.getItem('wc_userType') || 'Profile',
    toType:
      payload.toType ||
      (payload.fromType === 'Profile' ? 'EmployersProfile' : 'Profile'),
  };

  console.log('[DEBUG sendMessage] sending', enrichedPayload);

  const res = await fetch(`${process.env.REACT_APP_API_URL || ''}/api/messages/send`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(enrichedPayload),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[sendMessage] server response', txt);
    throw new Error('Failed to send message');
  }
  return res.json();
}


// Start a new conversation
export async function startConversation(from, to, title = '', fromType, toType, jobId = null) {
  const payload = { from, to, title, fromType, toType, jobId }; // ✅ include jobId
  console.log('[startConversation] payload =', payload);

  const res = await fetch(
    `${process.env.REACT_APP_API_URL || ''}/api/messages/start`,
    {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }
  );

  if (!res.ok) {
    const txt = await res.text();
    console.error('[startConversation] server response', txt);
    throw new Error('Failed to start conversation');
  }

  return res.json();
}



// Archive / unarchive a conversation
export async function archiveConversation(conversationId, userId, archived = true) {
  const res = await fetch(
    `${process.env.REACT_APP_API_URL || ''}/api/messages/conversations/${encodeURIComponent(conversationId)}`,
    {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ archived, userId }),
    }
  );

  if (!res.ok) throw new Error('Failed to archive conversation');
  return res.json();
}

// Delete a conversation
// messages.js
export async function deleteConversation(conversationId) {
  const base = process.env.REACT_APP_API_URL || '';
  const token = localStorage.getItem('token');

  const res = await fetch(`${base}/api/messages/${conversationId}`, { // remove /conversations
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to delete conversation');
  }

  return res.json();
}



