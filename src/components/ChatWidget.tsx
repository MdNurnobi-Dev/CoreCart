import React, { useState, useEffect, useRef } from 'react';
import ConfirmDialog from './ConfirmDialog';
import { 
  MessageSquare, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  Headphones, 
  ChevronDown,
  Sparkles,
  ArrowRight,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getOrCreateSessionId, 
  resetSessionId, 
  createOrUpdateSession, 
  sendVisitorMessage, 
  sendSupportReply,
  subscribeToSessionMessages, 
  ChatMessage 
} from '../services/chatService';

interface QuickFlow {
  id: string;
  buttonText: string;
  prompt: string;
  autoReply: string;
  requiresInput: boolean;
  inputPlaceholder?: string;
  followUpReply?: string;
  isEnabled: boolean;
}

interface ChatSettings {
  is_enabled?: boolean;
  welcome_message?: string;
  agent_name?: string;
  agent_title?: string;
  auto_reply_message?: string;
  telegram_bot_username?: string;
  quick_flows?: string | QuickFlow[];
}

const DEFAULT_QUICK_FLOWS: QuickFlow[] = [
  {
    id: "cancel_order",
    buttonText: "🚫 Cancel Order",
    prompt: "I want to cancel my order",
    autoReply: "Sure! To help you cancel your order quickly, please reply with your **Order ID** or **Transaction ID** below (e.g. #ORD-1002):",
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

export default function ChatWidget() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showTeaser, setShowTeaser] = useState(false);
  const [isTeaserPulsing, setIsTeaserPulsing] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeFlow, setActiveFlow] = useState<QuickFlow | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  const [settings, setSettings] = useState<ChatSettings>({
    is_enabled: true,
    welcome_message: 'Hello! 👋 Welcome to TechStore. How can we help you today?',
    agent_name: 'TechShop Support',
    agent_title: 'Customer Care Agent',
    auto_reply_message: 'Thank you for reaching out! Our support team will respond shortly.',
    telegram_bot_username: '',
    quick_flows: DEFAULT_QUICK_FLOWS
  });

  const [parsedFlows, setParsedFlows] = useState<QuickFlow[]>(DEFAULT_QUICK_FLOWS);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Proactive Visitor Greeting Animation (5-7s after arrival)
  useEffect(() => {
    // Check if teaser was already shown in this browsing session
    const hasSeenTeaser = sessionStorage.getItem('techstore_chat_teaser_shown');
    if (hasSeenTeaser || isOpen) return;

    // Trigger after 6 seconds (between 5-7s)
    const teaserTimer = setTimeout(() => {
      if (!isOpen) {
        setShowTeaser(true);
        setIsTeaserPulsing(true);
        sessionStorage.setItem('techstore_chat_teaser_shown', 'true');

        // Auto-dismiss teaser after 9 seconds of showing if unopened
        const dismissTimer = setTimeout(() => {
          setShowTeaser(false);
          setIsTeaserPulsing(false);
        }, 9000);

        return () => clearTimeout(dismissTimer);
      }
    }, 6000);

    return () => clearTimeout(teaserTimer);
  }, [isOpen]);

  // Load chat settings
  useEffect(() => {
    fetch('/api/chat-settings')
      .then(res => res.json())
      .then(data => {
        if (data) {
          setSettings(prev => ({ ...prev, ...data }));
          if (data.quick_flows) {
            try {
              const flows = typeof data.quick_flows === 'string' ? JSON.parse(data.quick_flows) : data.quick_flows;
              if (Array.isArray(flows) && flows.length > 0) {
                setParsedFlows(flows);
              }
            } catch (e) {
              console.warn('Error parsing quick_flows in widget:', e);
            }
          }
        }
      })
      .catch(err => console.error('Failed to load chat settings:', err));
  }, []);

  // Initialize Session
  useEffect(() => {
    const id = getOrCreateSessionId();
    setSessionId(id);

    const visitorName = user?.name || `Visitor #${id.slice(-4)}`;
    const visitorEmail = user?.email || '';

    createOrUpdateSession(id, { visitorName, visitorEmail });

    // Subscribe to messages for this session
    const unsubscribe = subscribeToSessionMessages(id, (liveMessages) => {
      setMessages(liveMessages);
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Listen for custom event from Support Page or other buttons
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
      setShowTeaser(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    };

    window.addEventListener('open-live-chat', handleOpenChat);
    return () => {
      window.removeEventListener('open-live-chat', handleOpenChat);
    };
  }, []);

  if (settings.is_enabled === false) {
    return null;
  }

  // Handle Standard Message or Interactive Flow Input
  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = (textToSend || input).trim();
    if (!messageContent || isSending || !sessionId) return;

    setInput('');
    setIsSending(true);

    const visitorName = user?.name || `Visitor #${sessionId.slice(-4)}`;
    const visitorEmail = user?.email || '';

    try {
      // 1. Send Visitor Message
      await sendVisitorMessage(sessionId, messageContent, {
        visitorName,
        visitorEmail,
        pageUrl: window.location.href
      });

      // 2. Check if we are in an active Q&A flow requiring input confirmation
      if (activeFlow && activeFlow.requiresInput && activeFlow.followUpReply) {
        const followUpTemplate = activeFlow.followUpReply;
        const finalBotReply = followUpTemplate.replace(/\{input\}/g, messageContent);
        
        // Short natural typing delay
        setTimeout(async () => {
          await sendSupportReply(
            sessionId, 
            finalBotReply, 
            settings.agent_name || 'Support Bot'
          );
        }, 500);

        setActiveFlow(null);
      }

    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Clicking a Quick QA Flow Button
  const handleTriggerQuickFlow = async (flow: QuickFlow) => {
    if (isSending || !sessionId) return;

    setIsSending(true);
    const visitorName = user?.name || `Visitor #${sessionId.slice(-4)}`;
    const visitorEmail = user?.email || '';

    try {
      // 1. Send customer prompt
      await sendVisitorMessage(sessionId, flow.prompt || flow.buttonText, {
        visitorName,
        visitorEmail,
        pageUrl: window.location.href
      });

      // 2. Trigger Bot Auto Response
      if (flow.autoReply) {
        setTimeout(async () => {
          await sendSupportReply(
            sessionId,
            flow.autoReply,
            settings.agent_name || 'Support Bot'
          );
        }, 400);
      }

      // 3. If requires follow-up input from user (e.g. Order ID / Transaction ID)
      if (flow.requiresInput) {
        setActiveFlow(flow);
        setTimeout(() => inputRef.current?.focus(), 450);
      } else {
        setActiveFlow(null);
      }

    } catch (err) {
      console.error('Quick flow error:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleResetChat = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reset Chat Conversation',
      message: 'Are you sure you want to start a new chat conversation? Your current chat history will be reset.',
      confirmText: 'Reset',
      isDanger: true,
      onConfirm: () => {
        const newId = resetSessionId();
        setSessionId(newId);
        setMessages([]);
        setActiveFlow(null);
        const visitorName = user?.name || `Visitor #${newId.slice(-4)}`;
        createOrUpdateSession(newId, { visitorName, visitorEmail: user?.email || '' });
        setConfirmDialog(null);
      }
    });
  };

  const activeEnabledFlows = parsedFlows.filter(f => f.isEnabled !== false);

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans">
      {isOpen ? (
        <div className="bg-white border border-slate-200/80 shadow-2xl rounded-2xl w-[320px] sm:w-[365px] max-w-[calc(100vw-32px)] h-[480px] max-h-[calc(100dvh-75px)] flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-white flex items-center justify-between shadow-sm shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0 border border-white/30">
                <Headphones className="w-4 h-4" />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-400 border-2 border-blue-600 rounded-full"></span>
              </div>
              <div className="truncate">
                <h3 className="text-[13px] font-bold tracking-tight leading-tight truncate">
                  {settings.agent_name || 'TechShop Support'}
                </h3>
                <p className="text-[10.5px] text-blue-100 flex items-center gap-1">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400"></span>
                  {settings.agent_title || 'Customer Care Agent'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={handleResetChat}
                title="Start New Conversation"
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-blue-100 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-[#f8fafc] text-[12.5px]">
            {/* Welcome Banner */}
            <div className="bg-white border border-slate-200/70 p-3 rounded-xl shadow-xs text-slate-700">
              <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[11.5px] mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Live Assistant</span>
              </div>
              <p className="text-slate-600 text-[12px] leading-relaxed">
                {settings.welcome_message || 'Hello! 👋 Welcome to TechStore. How can we help you today?'}
              </p>
            </div>

            {/* Message List */}
            {messages.map((msg, index) => {
              const isUser = msg.sender === 'user';
              return (
                <div 
                  key={msg.id || index} 
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <span className="text-[10px] text-slate-400 mb-0.5 px-1">
                    {isUser ? 'You' : (msg.senderName || settings.agent_name || 'Support')}
                  </span>
                  <div 
                    className={`max-w-[85%] px-3.5 py-2 rounded-2xl shadow-xs leading-relaxed ${
                      isUser 
                        ? 'bg-blue-600 text-white rounded-br-xs' 
                        : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              );
            })}

            {/* Active Flow Prompt Indicator */}
            {activeFlow && (
              <div className="bg-blue-50 border border-blue-200 text-blue-800 p-2.5 rounded-xl text-[11.5px] flex items-center justify-between gap-2 animate-in fade-in">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Please type your <b>{activeFlow.inputPlaceholder?.replace('Enter ', '') || 'Transaction/Order ID'}</b> below:</span>
                </div>
                <button
                  onClick={() => setActiveFlow(null)}
                  className="text-blue-500 hover:text-blue-800 text-[10.5px] font-bold underline shrink-0 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* Interactive Quick QA Actions */}
            {activeEnabledFlows.length > 0 && messages.length <= 2 && (
              <div className="pt-2">
                <p className="text-[11px] font-bold text-slate-500 mb-1.5 px-0.5 flex items-center gap-1">
                  <span>How can we help? Quick actions:</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeEnabledFlows.map((flow, idx) => (
                    <button
                      key={flow.id || idx}
                      onClick={() => handleTriggerQuickFlow(flow)}
                      disabled={isSending}
                      className="text-[11.5px] font-medium bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full transition-all shadow-2xs text-left cursor-pointer flex items-center gap-1 active:scale-95"
                    >
                      <span>{flow.buttonText}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input */}
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input 
              ref={inputRef}
              type="text" 
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={activeFlow ? (activeFlow.inputPlaceholder || "Enter details / Transaction ID...") : "Ask anything..."} 
              className={`flex-1 bg-slate-50 border rounded-lg px-3 py-1.5 text-[12.5px] text-slate-800 outline-none transition-all ${
                activeFlow ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/30' : 'border-slate-200 focus:border-blue-500'
              }`}
            />
            <button 
              type="submit" 
              disabled={!input.trim() || isSending} 
              className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>
      ) : (
        /* Floating Trigger Button with Proactive Visitor Teaser */
        <div className="relative flex flex-col items-end">
          {/* Visitor Teaser Bubble */}
          {showTeaser && (
            <div 
              onClick={() => {
                setShowTeaser(false);
                setIsTeaserPulsing(false);
                setIsOpen(true);
              }}
              className="mb-3 mr-1 bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/10 p-3.5 max-w-[270px] w-auto cursor-pointer transition-all duration-300 transform animate-in fade-in slide-in-from-bottom-3 hover:shadow-2xl hover:border-blue-300 relative group select-none"
            >
              {/* Close Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowTeaser(false);
                  setIsTeaserPulsing(false);
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-start gap-2.5 pr-4">
                <div className="relative shrink-0 mt-0.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-xs">
                    <Headphones className="w-4 h-4" />
                  </div>
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <p className="text-[13.5px] font-bold text-slate-900 leading-snug flex items-center gap-1.5">
                    <span>Hello! 👋 Need help?</span>
                  </p>
                  <p className="text-[11.5px] text-slate-500 mt-0.5 leading-tight font-medium">
                    Our live customer support is active & online now.
                  </p>
                  <div className="mt-2 flex items-center gap-1 text-[11px] font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">
                    <span>Start conversation</span>
                    <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </div>

              {/* Chat bubble tail pointer */}
              <div className="absolute -bottom-2 right-5 w-4 h-4 bg-white border-r border-b border-slate-200 rotate-45"></div>
            </div>
          )}

          {/* Trigger Button with Pulsing Effect */}
          <div className="relative">
            {isTeaserPulsing && (
              <span className="absolute -inset-1 rounded-full bg-blue-500/30 animate-ping"></span>
            )}
            <button 
              onClick={() => {
                setShowTeaser(false);
                setIsTeaserPulsing(false);
                setIsOpen(true);
              }}
              className={`bg-blue-600 hover:bg-blue-500 text-white p-3.5 rounded-full shadow-lg shadow-blue-600/30 transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center group relative cursor-pointer ${
                isTeaserPulsing ? 'animate-bounce ring-4 ring-blue-300' : ''
              }`}
              aria-label="Open Live Chat"
            >
              <MessageSquare className="w-5 h-5 group-hover:rotate-6 transition-transform" />
              <span className="absolute top-0 right-0 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></span>
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        confirmText={confirmDialog?.confirmText}
        cancelText={confirmDialog?.cancelText}
        isDanger={confirmDialog?.isDanger}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}
