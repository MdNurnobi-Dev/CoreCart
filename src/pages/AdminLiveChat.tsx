import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Settings, 
  Send, 
  Trash2, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  Bot, 
  Clock, 
  RefreshCw,
  SendHorizontal,
  Plus,
  Edit3,
  Check,
  X,
  Radio,
  Sparkles,
  AlertTriangle,
  Mail,
  User,
  Hash,
  Globe
} from 'lucide-react';
import { 
  subscribeToAllSessions, 
  subscribeToSessionMessages, 
  sendSupportReply, 
  deleteSession, 
  bulkDeleteSessions,
  deleteAllSessions,
  cleanExpiredSessions, 
  ChatSession, 
  ChatMessage 
} from '../services/chatService';

export interface QuickFlowItem {
  id: string;
  buttonText: string;
  prompt: string;
  autoReply: string;
  requiresInput: boolean;
  inputPlaceholder?: string;
  followUpReply?: string;
  isEnabled: boolean;
}

const DEFAULT_FLOW_ITEMS: QuickFlowItem[] = [
  {
    id: "cancel_order",
    buttonText: "🚫 Cancel Order",
    prompt: "I want to cancel my order",
    autoReply: "Sure! To help you cancel your order quickly, please provide your **Order ID** or **Transaction ID** below (e.g. #ORD-1002):",
    requiresInput: true,
    inputPlaceholder: "Enter Order ID / Transaction ID...",
    followUpReply: "Thank you! We have received your cancellation request for '{input}'. Our support and billing team has been notified on Telegram and will verify it immediately.",
    isEnabled: true
  },
  {
    id: "track_order",
    buttonText: "📦 Track Order",
    prompt: "I want to track my order",
    autoReply: "Please enter your **Order ID** or **Phone Number** used during checkout:",
    requiresInput: true,
    inputPlaceholder: "Enter Order ID or Phone number...",
    followUpReply: "We have received your lookup request for '{input}'. Our logistics team has been notified to check the current delivery progress for you.",
    isEnabled: true
  },
  {
    id: "return_refund",
    buttonText: "💰 Return & Refund Policy",
    prompt: "What is your return & refund policy?",
    autoReply: "We offer a 7-day hassle-free return and refund policy on all eligible tech items in original packaging. If you need assistance with an item, please reply with your Order ID.",
    requiresInput: false,
    inputPlaceholder: "",
    followUpReply: "",
    isEnabled: true
  },
  {
    id: "payment_issues",
    buttonText: "💳 Payment & Billing",
    prompt: "I have an issue with payment/billing",
    autoReply: "Please provide your payment method (bKash/Nagad/Card) and Transaction reference ID below:",
    requiresInput: true,
    inputPlaceholder: "Enter Transaction ID / Reference...",
    followUpReply: "Thank you! We have logged your transaction reference '{input}' and our billing desk is verifying it.",
    isEnabled: true
  },
  {
    id: "talk_agent",
    buttonText: "👨‍💼 Chat with Live Agent",
    prompt: "I want to speak with a customer care agent",
    autoReply: "You are connected with our Live Customer Support team. Please leave your message and an agent will reply directly!",
    requiresInput: false,
    inputPlaceholder: "",
    followUpReply: "",
    isEnabled: true
  }
];

interface ConfirmModalState {
  isOpen: boolean;
  type: 'single' | 'bulk' | 'all' | 'expired';
  targetId?: string;
  title: string;
  message: string;
}

export default function AdminLiveChat() {
  const [activeTab, setActiveTab] = useState<'conversations' | 'quick_flows' | 'settings'>('conversations');
  
  // Conversations State
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [adminReply, setAdminReply] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSessionIds, setSelectedSessionIds] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Custom in-app confirmation modal state (eliminates browser popup issues)
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  
  // Settings State
  const [settings, setSettings] = useState({
    is_enabled: true,
    welcome_message: 'Hello! 👋 Welcome to CoreCart. How can we help you today?',
    agent_name: 'TechShop Support',
    agent_title: 'Customer Care Agent',
    auto_reply_message: 'Thank you for reaching out! Our team has received your message and will respond shortly.',
    history_retention_days: 30,
    telegram_bot_token: '',
    telegram_chat_id: '',
    telegram_bot_username: '',
    telegram_notifications_enabled: true,
    firebase_config: '{}',
    quick_flows: ''
  });

  // Quick Flows State
  const [quickFlows, setQuickFlows] = useState<QuickFlowItem[]>(DEFAULT_FLOW_ITEMS);
  const [editingFlow, setEditingFlow] = useState<QuickFlowItem | null>(null);
  const [isCreatingFlow, setIsCreatingFlow] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [testStatus, setTestStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotificationStatus({ type, message });
    setTimeout(() => setNotificationStatus(null), 3500);
  };

  // Fetch Admin Chat Settings
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/admin/chat-settings', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data && !data.error) {
          setSettings(prev => ({
            ...prev,
            ...data,
            welcome_message: data.welcome_message || '',
            agent_name: data.agent_name || '',
            agent_title: data.agent_title || '',
            auto_reply_message: data.auto_reply_message || '',
            telegram_bot_token: data.telegram_bot_token || '',
            telegram_chat_id: data.telegram_chat_id || '',
            telegram_bot_username: data.telegram_bot_username || '',
            firebase_config: (() => {
              try {
                return typeof data.firebase_config === 'string' ? JSON.stringify(JSON.parse(data.firebase_config), null, 2) : JSON.stringify(data.firebase_config, null, 2);
              } catch (e) {
                return data.firebase_config || '{}';
              }
            })(),
            quick_flows: data.quick_flows || ''
          }));
          if (data.quick_flows) {
            try {
              const parsed = typeof data.quick_flows === 'string' ? JSON.parse(data.quick_flows) : data.quick_flows;
              if (Array.isArray(parsed) && parsed.length > 0) {
                setQuickFlows(parsed);
              }
            } catch (e) {
              console.warn('Could not parse quick_flows:', e);
            }
          }
        }
      })
      .catch(err => console.error('Failed to load admin chat settings:', err));
  }, []);

  // Subscribe to all sessions
  useEffect(() => {
    const unsubscribe = subscribeToAllSessions((liveSessions) => {
      setSessions(liveSessions);
      // Auto-select first session if none selected
      setSelectedSessionId(current => {
        if (!current && liveSessions.length > 0) {
          return liveSessions[0].id;
        }
        // If current selected session was deleted, select next available or null
        if (current && !liveSessions.some(s => s.id === current)) {
          return liveSessions.length > 0 ? liveSessions[0].id : null;
        }
        return current;
      });
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Subscribe to selected session's messages
  useEffect(() => {
    if (!selectedSessionId) {
      setMessages([]);
      return;
    }

    const unsubscribe = subscribeToSessionMessages(selectedSessionId, (liveMessages) => {
      setMessages(liveMessages);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedSessionId]);

  // Scroll to bottom of message stream
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/chat/admin/sessions');
      if (res.ok) {
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminReply.trim() || !selectedSessionId || isSending) return;

    setIsSending(true);
    const replyText = adminReply.trim();
    setAdminReply('');

    try {
      await sendSupportReply(selectedSessionId, replyText, settings.agent_name || 'Admin Support');
    } catch (err) {
      console.error('Failed to send admin reply:', err);
      showToast('Failed to deliver reply', 'error');
    } finally {
      setIsSending(false);
    }
  };

  // Trigger Delete Confirmation Modal
  const requestDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmModal({
      isOpen: true,
      type: 'single',
      targetId: sessionId,
      title: 'Delete Chat Session',
      message: 'Are you sure you want to permanently delete this chat session and its full message history? This will clean up database storage.'
    });
  };

  const requestBulkDelete = () => {
    if (selectedSessionIds.length === 0) return;
    setConfirmModal({
      isOpen: true,
      type: 'bulk',
      title: `Delete ${selectedSessionIds.length} Selected Chats`,
      message: `Are you sure you want to delete ${selectedSessionIds.length} selected conversations permanently? This cannot be undone.`
    });
  };

  const requestDeleteAll = () => {
    setConfirmModal({
      isOpen: true,
      type: 'all',
      title: 'Delete All Chat History',
      message: '⚠️ This will permanently purge ALL visitor chat conversations, spam logs, and message records from the database. Are you sure?'
    });
  };

  const requestCleanExpired = () => {
    setConfirmModal({
      isOpen: true,
      type: 'expired',
      title: 'Clean Expired Chat Logs',
      message: `Clean all chat sessions older than ${settings.history_retention_days} days to keep your database optimized?`
    });
  };

  // Execute Confirmed Delete
  const handleExecuteDelete = async () => {
    if (!confirmModal) return;
    setIsDeleting(true);

    try {
      if (confirmModal.type === 'single' && confirmModal.targetId) {
        const targetId = confirmModal.targetId;
        // Optimistic UI state
        setSessions(prev => {
          const remaining = prev.filter(s => s.id !== targetId);
          if (selectedSessionId === targetId) {
            setSelectedSessionId(remaining.length > 0 ? remaining[0].id : null);
          }
          return remaining;
        });
        setSelectedSessionIds(prev => prev.filter(id => id !== targetId));
        
        await deleteSession(targetId);
        showToast('Chat session deleted permanently.');
      } else if (confirmModal.type === 'bulk') {
        const toDelete = [...selectedSessionIds];
        setSessions(prev => {
          const remaining = prev.filter(s => !toDelete.includes(s.id));
          if (selectedSessionId && toDelete.includes(selectedSessionId)) {
            setSelectedSessionId(remaining.length > 0 ? remaining[0].id : null);
          }
          return remaining;
        });
        setSelectedSessionIds([]);

        const count = await bulkDeleteSessions(toDelete);
        showToast(`Successfully deleted ${count || toDelete.length} chat sessions.`);
      } else if (confirmModal.type === 'all') {
        setSessions([]);
        setSelectedSessionId(null);
        setSelectedSessionIds([]);

        const count = await deleteAllSessions();
        showToast(`Database cleaned! Removed ${count} sessions.`);
      } else if (confirmModal.type === 'expired') {
        const count = await cleanExpiredSessions(Number(settings.history_retention_days));
        showToast(`Cleanup finished: Removed ${count} expired sessions.`);
      }
    } catch (err) {
      console.error('Delete execution error:', err);
      showToast('Error during deletion process', 'error');
    } finally {
      setIsDeleting(false);
      setConfirmModal(null);
    }
  };

  // Selection handlers
  const toggleSelectSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedSessionIds(prev => 
      prev.includes(sessionId) ? prev.filter(id => id !== sessionId) : [...prev, sessionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedSessionIds.length === filteredSessions.length && filteredSessions.length > 0) {
      setSelectedSessionIds([]);
    } else {
      setSelectedSessionIds(filteredSessions.map(s => s.id));
    }
  };

  // Save Settings & Flows
  const handleSaveSettings = async (customFlows?: QuickFlowItem[]) => {
    setIsSaving(true);
    const token = localStorage.getItem('token');
    const flowsToSave = customFlows || quickFlows;

    const payload = {
      ...settings,
      quick_flows: JSON.stringify(flowsToSave)
    };

    try {
      const res = await fetch('/api/admin/chat-settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.ok) {
        showToast('Live Chat Settings & QA Flows saved successfully!');
      } else {
        showToast(data.error || 'Failed to save settings', 'error');
      }
    } catch (err) {
      showToast('Failed to connect to server', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Flow Management Handlers
  const handleToggleFlow = (id: string) => {
    const updated = quickFlows.map(f => f.id === id ? { ...f, isEnabled: !f.isEnabled } : f);
    setQuickFlows(updated);
    handleSaveSettings(updated);
  };

  const handleDeleteFlow = (id: string) => {
    const updated = quickFlows.filter(f => f.id !== id);
    setQuickFlows(updated);
    handleSaveSettings(updated);
    showToast('QA Flow removed.');
  };

  const handleSaveEditedFlow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFlow) return;
    
    let updated: QuickFlowItem[];
    if (isCreatingFlow) {
      updated = [...quickFlows, { ...editingFlow, id: editingFlow.id || `flow_${Date.now()}` }];
    } else {
      updated = quickFlows.map(f => f.id === editingFlow.id ? editingFlow : f);
    }

    setQuickFlows(updated);
    setEditingFlow(null);
    setIsCreatingFlow(false);
    handleSaveSettings(updated);
    showToast('QA flow saved successfully.');
  };

  const handleResetToDefaultFlows = () => {
    setQuickFlows(DEFAULT_FLOW_ITEMS);
    handleSaveSettings(DEFAULT_FLOW_ITEMS);
    showToast('Reset all QA flows to standard recommended defaults.');
  };

  // Test Telegram Bot

  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    setTestStatus(null);
    try {
      let config: any = {};
      if (typeof settings.firebase_config === 'string') {
        config = JSON.parse(settings.firebase_config);
      } else {
        config = settings.firebase_config;
      }
      
      if (!config.projectId || (!config.databaseURL && !config.authDomain)) {
        throw new Error('Missing projectId, or authDomain/databaseURL in JSON config');
      }

      // Simple mock test since we don't have the SDK initialized here directly.
      const url = config.databaseURL 
        ? `${config.databaseURL}/.json`
        : `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/(default)/documents`;
      const res = await fetch(url, { method: 'GET' }).catch(() => null);
      
      // Even if permission denied, it means it connected to Firebase
      if (res && (res.status === 401 || res.status === 200)) {
        setTestStatus({ type: 'success', message: 'Firebase connection successful! (Permission rules active)' });
      } else {
        setTestStatus({ type: 'success', message: 'Firebase credentials format validated successfully!' });
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: 'Invalid Firebase JSON or connection failed: ' + err.message });
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const handleTestTelegram = async () => {
    setIsTestingTelegram(true);
    setTestStatus(null);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/admin/chat-settings/test-telegram', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          bot_token: settings.telegram_bot_token,
          chat_id: settings.telegram_chat_id
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setTestStatus({ type: 'success', message: 'Test message sent to Telegram successfully! Check your group.' });
      } else {
        setTestStatus({ type: 'error', message: data.error || 'Failed to send Telegram test message. Check Token/Chat ID.' });
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: 'Network error connecting to Telegram API.' });
    } finally {
      setIsTestingTelegram(false);
    }
  };

  const filteredSessions = sessions.filter(s => 
    (s.visitorName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.id || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (s.lastMessage || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedSession = sessions.find(s => s.id === selectedSessionId);

  const formatTime = (timeVal: any) => {
    if (!timeVal) return 'Recent';
    try {
      const d = new Date(timeVal);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
    } catch (e) {}
    return 'Recent';
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto">
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 sm:p-3.5 rounded-[12px] border border-gray-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[16px] font-semibold tracking-tight text-gray-900 leading-tight">Live Chat Control Center</h1>
              <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Radio className="w-2 h-2 animate-pulse text-emerald-600" />
                Live Active
              </span>
            </div>
            
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg text-[12px] font-medium shrink-0">
          <button
            onClick={() => setActiveTab('conversations')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'conversations'
                ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Inbox ({sessions.length})
          </button>
          
          <button
            onClick={() => setActiveTab('quick_flows')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'quick_flows'
                ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5" />
            QA Bot ({quickFlows.filter(f => f.isEnabled).length})
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'bg-white text-blue-600 shadow-2xs font-semibold'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      {/* Toast Notification Banner */}
      {notificationStatus && (
        <div className={`p-2.5 rounded-[12px] text-[12px] font-medium flex items-center gap-2 animate-in fade-in duration-150 ${
          notificationStatus.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {notificationStatus.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />}
          <span>{notificationStatus.message}</span>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 1: LIVE CONVERSATIONS INBOX & SPAM CLEANUP */}
      {/* ========================================================= */}
      {activeTab === 'conversations' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[620px] max-h-[78vh]">
          
          {/* Left: Sessions List */}
          <div className="md:col-span-4 bg-white rounded-[12px] border border-gray-200 flex flex-col overflow-hidden shadow-sm">
            {/* Search & Action Bar */}
            <div className="p-2.5 border-b border-gray-100 space-y-2 shrink-0 bg-gray-50/60">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search visitor, ID, or message..."
                    className="w-full pl-8 pr-2.5 h-[30px] bg-white border border-gray-200 rounded-lg text-[12px] text-gray-800 placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  title="Refresh Sessions"
                  className="h-[30px] w-[30px] flex items-center justify-center bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 rounded-lg transition-colors cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={filteredSessions.length > 0 && selectedSessionIds.length === filteredSessions.length}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    title="Select all"
                  />
                  <span className="text-gray-500 font-medium">
                    {selectedSessionIds.length > 0 ? `${selectedSessionIds.length} selected` : `${filteredSessions.length} sessions`}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {selectedSessionIds.length > 0 ? (
                    <button
                      onClick={requestBulkDelete}
                      className="px-2 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded font-medium text-[10.5px] transition-colors flex items-center gap-1 shadow-2xs cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete ({selectedSessionIds.length})
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={requestDeleteAll}
                        disabled={sessions.length === 0}
                        title="Delete all sessions to clean spam"
                        className="text-red-500 hover:text-red-700 disabled:text-gray-300 flex items-center gap-1 font-medium hover:underline text-[11px] cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        Clear All
                      </button>
                      <span className="text-gray-300">|</span>
                      <button
                        onClick={requestCleanExpired}
                        disabled={sessions.length === 0}
                        className="text-amber-600 hover:text-amber-700 disabled:text-gray-300 flex items-center gap-1 font-medium hover:underline text-[11px] cursor-pointer"
                      >
                        <Clock className="w-3 h-3" />
                        &gt;{settings.history_retention_days}d
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Session Items List */}
            <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
              {filteredSessions.length === 0 ? (
                <div className="p-8 text-center text-gray-400 space-y-2">
                  <MessageSquare className="w-7 h-7 mx-auto opacity-30" />
                  <p className="text-[12px] font-semibold text-gray-600">No chat sessions found</p>
                  <p className="text-[11px]">Any visitor conversations or test chats will appear here in real-time.</p>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isSelected = session.id === selectedSessionId;
                  const isChecked = selectedSessionIds.includes(session.id);
                  return (
                    <div
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`p-2.5 cursor-pointer transition-colors flex items-start gap-2.5 text-left group relative ${
                        isSelected 
                          ? 'bg-blue-50/80 border-l-2 border-blue-600' 
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      {/* Checkbox for bulk delete */}
                      <div className="pt-0.5" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => toggleSelectSession(session.id, e as any)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-semibold text-[12px] text-gray-900 truncate">
                            {session.visitorName || 'Visitor'}
                          </span>
                          <span className="text-[10px] text-gray-400 shrink-0">
                            {formatTime(session.lastMessageTime)}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 truncate mb-1">
                          {session.lastMessage || 'Session started'}
                        </p>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[9.5px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">
                            #{session.id.slice(-6)}
                          </span>
                          {session.pageUrl && (
                            <span className="text-[9.5px] text-gray-400 truncate max-w-[120px]">
                              {session.pageUrl.replace(/^https?:\/\/[^/]+/, '') || '/'}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Instant Delete Button */}
                      <button
                        onClick={(e) => requestDeleteSession(session.id, e)}
                        title="Delete Session"
                        className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1 rounded-md transition-colors opacity-80 group-hover:opacity-100 shrink-0 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right: Message Stream & Live Reply Box */}
          <div className="md:col-span-8 bg-white rounded-[12px] border border-gray-200 flex flex-col overflow-hidden shadow-sm">
            {selectedSession ? (
              <>
                {/* Session Header */}
                <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[12px] shrink-0">
                      {(selectedSession.visitorName || 'V').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-[13px] text-gray-900 leading-tight truncate">
                          {selectedSession.visitorName || 'Visitor'}
                        </h3>
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-mono shrink-0">
                          #{selectedSession.id.slice(-8)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500 truncate">
                        {selectedSession.visitorEmail ? `${selectedSession.visitorEmail} • ` : ''}
                        Page: <span className="font-mono text-gray-600">{selectedSession.pageUrl || '/'}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => requestDeleteSession(selectedSession.id)}
                      className="text-red-600 hover:text-white hover:bg-red-600 px-2.5 py-1.5 rounded-lg border border-red-200 transition-colors text-[11px] flex items-center gap-1.5 font-bold shadow-2xs cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete Chat
                    </button>
                  </div>
                </div>

                {/* Messages Body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#f8fafc]">
                  {messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                      <p className="text-[12px]">No messages in this chat session yet.</p>
                    </div>
                  ) : (
                    messages.map((msg, idx) => {
                      const isSupport = msg.sender === 'support';
                      return (
                        <div
                          key={msg.id || idx}
                          className={`flex flex-col ${isSupport ? 'items-end' : 'items-start'}`}
                        >
                          <span className="text-[10px] text-gray-400 mb-0.5 px-1 font-medium">
                            {isSupport ? (msg.senderName || settings.agent_name || 'Admin Support') : (msg.senderName || selectedSession.visitorName)}
                          </span>
                          <div
                            className={`max-w-[78%] px-3.5 py-2 rounded-xl text-[12.5px] leading-relaxed shadow-2xs ${
                              isSupport
                                ? 'bg-blue-600 text-white rounded-br-xs'
                                : 'bg-white border border-gray-200 text-gray-800 rounded-bl-xs'
                            }`}
                          >
                            {msg.text}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick Reply Suggestions */}
                <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0">
                  <span className="text-gray-400 shrink-0 font-medium">Quick reply:</span>
                  {[
                    "Hello! How can I assist you today?",
                    "Could you please share your Order ID or Transaction ID?",
                    "We are checking this with our team right now!",
                    "Thank you for contacting CoreCart support."
                  ].map((quick, qIdx) => (
                    <button
                      key={qIdx}
                      onClick={() => setAdminReply(quick)}
                      className="bg-white border border-gray-200 hover:border-blue-400 hover:text-blue-600 px-2 py-0.5 rounded-full text-gray-600 shrink-0 transition-colors shadow-2xs text-left cursor-pointer"
                    >
                      {quick}
                    </button>
                  ))}
                </div>

                {/* Admin Reply Input */}
                <form 
                  onSubmit={handleSendReply}
                  className="p-2.5 bg-white border-t border-gray-200 flex items-center gap-2 shrink-0"
                >
                  <input
                    type="text"
                    value={adminReply}
                    onChange={e => setAdminReply(e.target.value)}
                    placeholder="Type support reply (press Enter to send)..."
                    className="flex-1 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-3 py-2 text-[12.5px] text-gray-800 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!adminReply.trim() || isSending}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-lg font-bold text-[12.5px] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {isSending ? 'Sending...' : 'Send'}
                  </button>
                </form>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-gray-400">
                <MessageSquare className="w-10 h-10 opacity-30 mb-2" />
                <h4 className="font-bold text-gray-600 text-[13px]">Select a Chat Session</h4>
                <p className="text-[12px] max-w-sm">
                  Click on any conversation on the left to view customer inquiries, reply in real-time, or delete unwanted sessions.
                </p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: INTERACTIVE QUICK QA & AUTOMATED BOT FLOWS */}
      {/* ========================================================= */}
      {activeTab === 'quick_flows' && (
        <div className="space-y-4">
          
          {/* Header Card */}
          <div className="bg-white p-3.5 sm:p-4 rounded-[12px] border border-gray-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-blue-600" />
                <h2 className="font-semibold text-[13.5px] text-gray-900">Interactive Customer Q&A & Bot Automation</h2>
              </div>
              
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleResetToDefaultFlows}
                className="h-[30px] px-2.5 text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg text-[11px] font-medium transition-colors cursor-pointer"
              >
                Reset Defaults
              </button>

              <button
                onClick={() => {
                  setEditingFlow({
                    id: `flow_${Date.now()}`,
                    buttonText: '⚡ New Question',
                    prompt: 'I have a question',
                    autoReply: 'Please provide your details below:',
                    requiresInput: true,
                    inputPlaceholder: 'Enter Transaction or Order ID...',
                    followUpReply: "Thank you! We have received your request for '{input}' and will update you shortly.",
                    isEnabled: true
                  });
                  setIsCreatingFlow(true);
                }}
                className="h-[30px] px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-semibold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add QA Flow
              </button>
            </div>
          </div>

          {/* Quick Flow Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickFlows.map((flow, index) => (
              <div 
                key={flow.id || index}
                className={`bg-white rounded-[12px] border p-3.5 shadow-sm transition-all relative ${
                  flow.isEnabled ? 'border-gray-200' : 'border-gray-200 bg-gray-50/60 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2 pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-gray-900 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                      {flow.buttonText}
                    </span>
                    {flow.requiresInput && (
                      <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">
                        Input Required
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {/* Toggle */}
                    <button
                      type="button"
                      onClick={() => handleToggleFlow(flow.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                        flow.isEnabled 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {flow.isEnabled ? 'Active' : 'Disabled'}
                    </button>

                    {/* Edit */}
                    <button
                      type="button"
                      onClick={() => {
                        setEditingFlow({ ...flow });
                        setIsCreatingFlow(false);
                      }}
                      className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                      title="Edit Flow"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={() => handleDeleteFlow(flow.id)}
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      title="Delete Flow"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Flow Details */}
                <div className="space-y-2 text-[11.5px]">
                  <div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">1. Customer Trigger:</span>
                    <p className="text-gray-700 bg-gray-50 px-2.5 py-1 rounded border border-gray-100 text-[11px] italic">
                      "{flow.prompt}"
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">2. Bot Initial Auto-Prompt:</span>
                    <p className="text-blue-900 bg-blue-50/60 px-2.5 py-1 rounded border border-blue-100 text-[11px]">
                      {flow.autoReply}
                    </p>
                  </div>

                  {flow.requiresInput && (
                    <div>
                      <span className="text-[10px] font-medium text-amber-700 uppercase tracking-wider block">
                        3. Follow-up Confirmation:
                      </span>
                      <p className="text-emerald-900 bg-emerald-50/70 px-2.5 py-1 rounded border border-emerald-200 text-[11px]">
                        {flow.followUpReply || "Thank you! We received your input: '{input}'"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Edit / Create Modal */}
          {editingFlow && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-[12px] border border-gray-200 shadow-xl max-w-lg w-full p-4 sm:p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <h3 className="font-semibold text-[13.5px] text-gray-900">
                      {isCreatingFlow ? 'Create Quick QA / Bot Automation Flow' : 'Edit Quick QA Flow'}
                    </h3>
                  </div>
                  <button 
                    onClick={() => setEditingFlow(null)}
                    className="text-gray-400 hover:text-gray-700 p-1 rounded-md cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditedFlow} className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Quick Button Label (Shown to Visitor)
                    </label>
                    <input
                      type="text"
                      required
                      value={editingFlow.buttonText}
                      onChange={e => setEditingFlow({ ...editingFlow, buttonText: e.target.value })}
                      placeholder="e.g. 🚫 Cancel Order or 📦 Track Order"
                      className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[32px] text-[12px] text-gray-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Customer Trigger Message
                    </label>
                    <input
                      type="text"
                      required
                      value={editingFlow.prompt}
                      onChange={e => setEditingFlow({ ...editingFlow, prompt: e.target.value })}
                      placeholder="e.g. I want to cancel my order"
                      className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[32px] text-[12px] text-gray-800 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-gray-700 mb-1">
                      Bot Initial Auto-Response / Question
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={editingFlow.autoReply}
                      onChange={e => setEditingFlow({ ...editingFlow, autoReply: e.target.value })}
                      placeholder="e.g. Sure! Please provide your Order ID or Transaction ID below:"
                      className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg p-2 text-[12px] text-gray-800 outline-none"
                    />
                  </div>

                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editingFlow.requiresInput}
                        onChange={e => setEditingFlow({ ...editingFlow, requiresInput: e.target.checked })}
                        className="rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                      />
                      <span className="text-[11.5px] font-semibold text-amber-900">
                        Require Customer Input (e.g. Ask for Transaction ID or Order Number)
                      </span>
                    </label>

                    {editingFlow.requiresInput && (
                      <div className="space-y-2 pt-1">
                        <div>
                          <label className="block text-[10.5px] font-medium text-amber-800 mb-0.5">
                            Input Box Placeholder
                          </label>
                          <input
                            type="text"
                            value={editingFlow.inputPlaceholder || ''}
                            onChange={e => setEditingFlow({ ...editingFlow, inputPlaceholder: e.target.value })}
                            placeholder="Enter Transaction ID / Order ID..."
                            className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-lg px-2.5 h-[30px] text-[11.5px] text-gray-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[10.5px] font-medium text-amber-800 mb-0.5">
                            Follow-Up Bot Confirmation Reply (Use <code>{'{input}'}</code> for user's input)
                          </label>
                          <textarea
                            rows={2}
                            value={editingFlow.followUpReply || ''}
                            onChange={e => setEditingFlow({ ...editingFlow, followUpReply: e.target.value })}
                            placeholder="Thank you! We received your cancellation request for '{input}'."
                            className="w-full bg-white border border-amber-200 focus:border-amber-500 rounded-lg p-2 text-[11.5px] text-gray-800 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setEditingFlow(null)}
                      className="px-3.5 h-[30px] bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-[11.5px] transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3.5 h-[30px] bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[11.5px] transition-all shadow-2xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Save QA Flow
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: GENERAL SETTINGS & TELEGRAM BOT CONFIG */}
      {/* ========================================================= */}
      {activeTab === 'settings' && (
        <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="space-y-4">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Live Chat Widget General Controls */}
            <div className="bg-white p-3.5 sm:p-4 rounded-[12px] border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold text-[13px] text-gray-900">Live Chat Widget Controls</h3>
                </div>
                
                {/* Enable/Disable Toggle */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.is_enabled}
                    onChange={e => setSettings({ ...settings, is_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-[11px] font-medium text-gray-700">
                    {settings.is_enabled ? 'Enabled' : 'Disabled'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Welcome Greeting Message
                </label>
                <textarea
                  rows={2}
                  value={settings.welcome_message}
                  onChange={e => setSettings({ ...settings, welcome_message: e.target.value })}
                  placeholder="Hello! 👋 How can we help you today?"
                  className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg p-2 text-[12px] text-gray-800 outline-none"
                />
                <span className="text-[10px] text-gray-400">Shown to visitors at the top of the chat window.</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Agent Display Name
                  </label>
                  <input
                    type="text"
                    value={settings.agent_name}
                    onChange={e => setSettings({ ...settings, agent_name: e.target.value })}
                    className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[30px] text-[12px] text-gray-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Agent Title / Subtitle
                  </label>
                  <input
                    type="text"
                    value={settings.agent_title}
                    onChange={e => setSettings({ ...settings, agent_title: e.target.value })}
                    className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[30px] text-[12px] text-gray-800 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Chat History Retention Max Period
                </label>
                <select
                  value={settings.history_retention_days}
                  onChange={e => setSettings({ ...settings, history_retention_days: Number(e.target.value) })}
                  className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[30px] text-[12px] text-gray-800 outline-none"
                >
                  <option value={7}>7 Days</option>
                  <option value={15}>15 Days</option>
                  <option value={30}>30 Days (Recommended)</option>
                  <option value={60}>60 Days</option>
                  <option value={90}>90 Days</option>
                  <option value={0}>Keep Forever (No Auto-Purge)</option>
                </select>
                <span className="text-[10px] text-gray-400">Controls retention duration of past chat session logs.</span>
              </div>
            </div>

            {/* Telegram Bot Integration Card */}
            <div className="bg-white p-3.5 sm:p-4 rounded-[12px] border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-500" />
                  <h3 className="font-semibold text-[13px] text-gray-900">Telegram Bot Notifications (Admin Only)</h3>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={settings.telegram_notifications_enabled}
                    onChange={e => setSettings({ ...settings, telegram_notifications_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-2 text-[11px] font-medium text-gray-700">
                    {settings.telegram_notifications_enabled ? 'Active' : 'Muted'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Telegram Bot Token
                </label>
                <input
                  type="password"
                  value={settings.telegram_bot_token}
                  onChange={e => setSettings({ ...settings, telegram_bot_token: e.target.value })}
                  placeholder="8921887336:AAHFQg1uwLIHcyIp1ofAcqY7qMFeKaISCQQ"
                  className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[30px] text-[12px] font-mono text-gray-800 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Telegram Chat ID / Group ID
                  </label>
                  <input
                    type="text"
                    value={settings.telegram_chat_id}
                    onChange={e => setSettings({ ...settings, telegram_chat_id: e.target.value })}
                    placeholder="-1004430526389"
                    className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[30px] text-[12px] font-mono text-gray-800 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-700 mb-1">
                    Bot Username
                  </label>
                  <input
                    type="text"
                    value={settings.telegram_bot_username}
                    onChange={e => setSettings({ ...settings, telegram_bot_username: e.target.value })}
                    placeholder="TechShop_Live_Support_bot"
                    className="w-full bg-white border border-gray-200 focus:border-blue-500 rounded-lg px-2.5 h-[30px] text-[12px] text-gray-800 outline-none"
                  />
                </div>
              </div>

              {/* Test Telegram & Open Bot Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestTelegram}
                  disabled={isTestingTelegram}
                  className="h-[30px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <SendHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  {isTestingTelegram ? 'Testing...' : 'Send Test Notification'}
                </button>

                {settings.telegram_bot_username && (
                  <a
                    href={`https://t.me/${settings.telegram_bot_username}`}
                    target="_blank"
                    rel="noreferrer"
                    className="h-[30px] px-3 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    Open Telegram Bot <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>

              {testStatus && (
                <div className={`p-2 rounded-lg text-[11px] ${
                  testStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {testStatus.message}
                </div>
              )}
            </div>

          </div>


            {/* Firebase Database Credentials Card */}
            <div className="bg-white p-3.5 sm:p-4 rounded-[12px] border border-gray-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <h3 className="font-semibold text-[13px] text-gray-900">Firebase Database Credentials</h3>
                </div>
              </div>
              
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  Firebase Config (JSON format)
                </label>
                <textarea
                  value={typeof settings.firebase_config === 'string' ? settings.firebase_config : JSON.stringify(settings.firebase_config, null, 2)}
                  onChange={e => setSettings({ ...settings, firebase_config: e.target.value })}
                  placeholder={'{\n  "apiKey": "...",\n  "authDomain": "...",\n  "projectId": "...",\n  "databaseURL": "..."\n}'}
                  rows={6}
                  className="w-full bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg p-2.5 text-[11px] font-mono text-gray-800 outline-none resize-none"
                />
                <span className="text-[10px] text-gray-400 mt-1 block">Paste your Firebase Project configuration JSON here. This credential is used for external live sync integrations.</span>
              </div>
              <div className="pt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleTestFirebase}
                  disabled={isTestingFirebase}
                  className="h-[30px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-[11px] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-orange-500 ${isTestingFirebase ? 'animate-spin' : ''}`} />
                  {isTestingFirebase ? 'Testing...' : 'Test Firebase Connection'}
                </button>
              </div>

            </div>

          {/* Save Button */}
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={isSaving}
              className="h-[32px] px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-[12px] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : 'Save Live Chat Settings'}
            </button>
          </div>

        </form>
      )}

      {/* ========================================================= */}
      {/* IN-APP CONFIRMATION MODAL (Prevents browser popup block) */}
      {/* ========================================================= */}
      {confirmModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-100">
          <div className="bg-white rounded-[12px] border border-gray-200 shadow-xl max-w-md w-full p-4 sm:p-5 space-y-3.5 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-lg shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-[13.5px] text-gray-900 leading-tight">
                  {confirmModal.title}
                </h3>
                <p className="text-[11.5px] text-gray-600 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                disabled={isDeleting}
                className="h-[30px] px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium text-[11.5px] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                disabled={isDeleting}
                className="h-[30px] px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-[11.5px] transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {isDeleting ? 'Deleting...' : 'Yes, Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
