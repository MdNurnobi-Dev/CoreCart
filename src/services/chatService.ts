export interface ChatMessage {
  id?: string | number;
  sessionId: string;
  text: string;
  sender: 'user' | 'support' | 'system';
  senderName: string;
  createdAt: any;
  timestamp?: string;
}

export interface ChatSession {
  id: string;
  visitorName: string;
  visitorEmail?: string;
  startedAt?: any;
  lastMessage: string;
  lastMessageTime: any;
  unreadByAdmin?: number;
  status: 'active' | 'closed';
  pageUrl?: string;
  unreadByUser?: number;
}

const SESSION_STORAGE_KEY = 'techstore_livechat_session_id';

// Event emitter for instant UI updates across components
type Listener<T> = (data: T) => void;
const sessionListeners = new Set<Listener<ChatSession[]>>();
const messageListeners = new Map<string, Set<Listener<ChatMessage[]>>>();

let cachedSessions: ChatSession[] = [];
const cachedMessages = new Map<string, ChatMessage[]>();

function notifySessionListeners(sessions: ChatSession[]) {
  cachedSessions = sessions;
  sessionListeners.forEach(listener => {
    try {
      listener(sessions);
    } catch (e) {
      console.error('Error notifying session listener:', e);
    }
  });
}

function notifyMessageListeners(sessionId: string, messages: ChatMessage[]) {
  cachedMessages.set(sessionId, messages);
  const listeners = messageListeners.get(sessionId);
  if (listeners) {
    listeners.forEach(listener => {
      try {
        listener(messages);
      } catch (e) {
        console.error('Error notifying message listener:', e);
      }
    });
  }
}

export function getOrCreateSessionId(): string {
  let sessionId = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!sessionId) {
    sessionId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  }
  return sessionId;
}

export function resetSessionId(): string {
  const newId = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  localStorage.setItem(SESSION_STORAGE_KEY, newId);
  return newId;
}

/**
 * Initialize or update session in Server
 */
export async function createOrUpdateSession(
  sessionId: string, 
  visitorData: { visitorName?: string; visitorEmail?: string; pageUrl?: string }
) {
  try {
    const res = await fetch('/api/chat/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sessionId,
        visitorName: visitorData.visitorName || 'Visitor',
        visitorEmail: visitorData.visitorEmail || '',
        pageUrl: visitorData.pageUrl || window.location.pathname,
      })
    });
    if (res.ok) {
      const sessionData = await res.json();
      // Update local cache
      const existingIdx = cachedSessions.findIndex(s => s.id === sessionId);
      if (existingIdx >= 0) {
        cachedSessions[existingIdx] = { ...cachedSessions[existingIdx], ...sessionData };
      } else {
        cachedSessions = [sessionData, ...cachedSessions];
      }
      notifySessionListeners(cachedSessions);
    }
  } catch (err) {
    console.warn('Backend session update notice:', err);
  }
}

/**
 * Send a message from the visitor
 */
export async function sendVisitorMessage(
  sessionId: string,
  text: string,
  visitorData: { visitorName?: string; visitorEmail?: string; pageUrl?: string }
): Promise<ChatMessage | null> {
  let createdMessage: ChatMessage | null = null;

  try {
    const res = await fetch('/api/chat/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        text,
        visitorName: visitorData.visitorName || 'Visitor',
        visitorEmail: visitorData.visitorEmail || '',
        pageUrl: visitorData.pageUrl || window.location.href
      })
    });
    if (res.ok) {
      createdMessage = await res.json();
      if (createdMessage) {
        const currentMsgs = cachedMessages.get(sessionId) || [];
        const updated = [...currentMsgs, createdMessage];
        notifyMessageListeners(sessionId, updated);
      }
    }
  } catch (backendErr) {
    console.warn('Backend send message error:', backendErr);
  }

  return createdMessage;
}

/**
 * Send a message from Admin / Support
 */
export async function sendSupportReply(
  sessionId: string,
  text: string,
  agentName = 'Support Agent'
): Promise<ChatMessage | null> {
  let createdMessage: ChatMessage | null = null;

  try {
    const res = await fetch('/api/chat/reply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId,
        text,
        agentName
      })
    });
    if (res.ok) {
      createdMessage = await res.json();
      if (createdMessage) {
        const currentMsgs = cachedMessages.get(sessionId) || [];
        const updated = [...currentMsgs, createdMessage];
        notifyMessageListeners(sessionId, updated);
      }
    }
  } catch (err) {
    console.warn('Backend reply error:', err);
  }

  return createdMessage;
}

/**
 * Listen for messages of a specific session in real-time
 */
export function subscribeToSessionMessages(
  sessionId: string,
  callback: (messages: ChatMessage[]) => void
) {
  let isSubscribed = true;

  if (!messageListeners.has(sessionId)) {
    messageListeners.set(sessionId, new Set());
  }
  const listeners = messageListeners.get(sessionId)!;
  listeners.add(callback);

  // Return cached immediately if available
  const existing = cachedMessages.get(sessionId);
  if (existing) {
    callback(existing);
  }

  const fetchBackendMessages = async () => {
    try {
      const res = await fetch(`/api/chat/session/${sessionId}/messages`);
      if (res.ok && isSubscribed) {
        const data: ChatMessage[] = await res.json();
        cachedMessages.set(sessionId, data);
        callback(data);
      }
    } catch (err) {
      // Network retry on next interval
    }
  };

  fetchBackendMessages();
  const pollInterval = setInterval(fetchBackendMessages, 2000);

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    listeners.delete(callback);
    if (listeners.size === 0) {
      messageListeners.delete(sessionId);
    }
  };
}

/**
 * Listen for all chat sessions for Admin dashboard in real-time
 */
export function subscribeToAllSessions(
  callback: (sessions: ChatSession[]) => void
) {
  let isSubscribed = true;
  sessionListeners.add(callback);

  if (cachedSessions.length > 0) {
    callback(cachedSessions);
  }

  const fetchBackendSessions = async () => {
    try {
      const res = await fetch('/api/chat/admin/sessions');
      if (res.ok && isSubscribed) {
        const data: ChatSession[] = await res.json();
        cachedSessions = Array.isArray(data) ? data : [];
        callback(cachedSessions);
      }
    } catch (err) {
      // Network retry
    }
  };

  fetchBackendSessions();
  const pollInterval = setInterval(fetchBackendSessions, 2500);

  return () => {
    isSubscribed = false;
    clearInterval(pollInterval);
    sessionListeners.delete(callback);
  };
}

/**
 * Delete a session and its entire messages history
 */
export async function deleteSession(sessionId: string): Promise<boolean> {
  // Optimistically remove from local cache and notify immediately
  cachedSessions = cachedSessions.filter(s => s.id !== sessionId);
  cachedMessages.delete(sessionId);
  notifySessionListeners(cachedSessions);

  // Check if active local session matches deleted session
  if (localStorage.getItem(SESSION_STORAGE_KEY) === sessionId) {
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  try {
    const res = await fetch(`/api/chat/admin/session/${sessionId}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (err) {
    console.error('Backend delete session error:', err);
    return false;
  }
}

/**
 * Bulk delete multiple sessions
 */
export async function bulkDeleteSessions(sessionIds: string[]): Promise<number> {
  if (!sessionIds.length) return 0;

  // Optimistic cleanup
  const idSet = new Set(sessionIds);
  cachedSessions = cachedSessions.filter(s => !idSet.has(s.id));
  sessionIds.forEach(id => {
    cachedMessages.delete(id);
    if (localStorage.getItem(SESSION_STORAGE_KEY) === id) {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  });
  notifySessionListeners(cachedSessions);

  let count = 0;
  try {
    const res = await fetch('/api/chat/admin/bulk-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionIds })
    });
    if (res.ok) {
      const data = await res.json();
      count = data.count || sessionIds.length;
    }
  } catch (err) {
    console.error('Bulk delete error:', err);
  }

  return count;
}

/**
 * Delete all chat sessions and messages permanently
 */
export async function deleteAllSessions(): Promise<number> {
  // Clear cache immediately
  cachedSessions = [];
  cachedMessages.clear();
  localStorage.removeItem(SESSION_STORAGE_KEY);
  notifySessionListeners([]);

  let count = 0;
  try {
    const res = await fetch('/api/chat/admin/all-sessions', {
      method: 'DELETE'
    });
    if (res.ok) {
      const data = await res.json();
      count = data.count || 0;
    }
  } catch (err) {
    console.error('Delete all error:', err);
  }
  return count;
}

/**
 * Clean expired sessions based on retention days
 */
export async function cleanExpiredSessions(retentionDays: number): Promise<number> {
  if (retentionDays <= 0) return 0;
  let count = 0;

  try {
    const res = await fetch('/api/chat/admin/cleanup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ retentionDays })
    });
    if (res.ok) {
      const data = await res.json();
      count = data.deletedCount || 0;
      
      // Refresh list
      const fetchRes = await fetch('/api/chat/admin/sessions');
      if (fetchRes.ok) {
        const data = await fetchRes.json();
        cachedSessions = Array.isArray(data) ? data : [];
        notifySessionListeners(cachedSessions);
      }
    }
  } catch (err) {
    console.error('Backend cleanup error:', err);
  }

  return count;
}
