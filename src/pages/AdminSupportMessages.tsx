import React, { useEffect, useState } from 'react';
import { 
  Inbox, 
  Search, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Mail, 
  Phone, 
  MessageSquare, 
  ExternalLink, 
  RefreshCw, 
  ChevronRight, 
  X, 
  Tag, 
  FileText, 
  Send,
  User,
  Calendar,
  Save,
  CheckCheck,
  Archive,
  Eye,
  Filter
} from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import ConfirmDialog from '../components/ConfirmDialog';

export interface SupportMessage {
  id: number;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  order_id?: string;
  message: string;
  status: 'unread' | 'in_progress' | 'resolved' | 'archived';
  admin_note?: string;
  created_at: string;
  updated_at: string;
}

export default function AdminSupportMessages() {
  const { token } = useAuth();
  const { settings } = useSettings();
  const siteName = settings?.site_name || 'CoreCart';

  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedMessage, setSelectedMessage] = useState<SupportMessage | null>(null);
  
  // Selected IDs for bulk actions
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  
  // Modal / Detail state
  const [editStatus, setEditStatus] = useState<SupportMessage['status']>('unread');
  const [editAdminNote, setEditAdminNote] = useState('');
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  useEffect(() => {
    fetchMessages();
  }, [token, statusFilter]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const url = statusFilter === 'all' 
        ? '/admin/support-messages' 
        : `/admin/support-messages?status=${statusFilter}`;
      
      const data = await apiFetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch support messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (msg: SupportMessage) => {
    setSelectedMessage(msg);
    setEditStatus(msg.status);
    setEditAdminNote(msg.admin_note || '');
    setActionSuccessMsg(null);

    // If message is unread, automatically update to in_progress or keep track
    if (msg.status === 'unread') {
      updateMessageStatus(msg.id, 'in_progress', false);
    }
  };

  const updateMessageStatus = async (id: number, newStatus: SupportMessage['status'], refresh = true) => {
    try {
      await apiFetch(`/admin/support-messages/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
      if (selectedMessage && selectedMessage.id === id) {
        setSelectedMessage(prev => prev ? { ...prev, status: newStatus } : null);
        setEditStatus(newStatus);
      }
      if (refresh) {
        fetchMessages();
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

  const handleSaveDetails = async () => {
    if (!selectedMessage) return;
    setIsSavingDetails(true);
    setActionSuccessMsg(null);

    try {
      const updated = await apiFetch(`/admin/support-messages/${selectedMessage.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: editStatus,
          admin_note: editAdminNote
        })
      });

      setSelectedMessage(updated);
      setMessages(prev => prev.map(m => m.id === updated.id ? updated : m));
      setActionSuccessMsg('Status & Admin notes saved successfully!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    } catch (err) {
      console.error('Failed to save message details:', err);
    } finally {
      setIsSavingDetails(false);
    }
  };

  const handleDeleteMessage = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Support Message',
      message: 'Are you sure you want to permanently delete this support message? This action is irreversible.',
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiFetch(`/admin/support-messages/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          setMessages(prev => prev.filter(m => m.id !== id));
          if (selectedMessage?.id === id) {
            setSelectedMessage(null);
          }
          setSelectedIds(prev => prev.filter(item => item !== id));
        } catch (err) {
          console.error('Error deleting message:', err);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Multiple Messages',
      message: `Are you sure you want to permanently delete ${selectedIds.length} selected support message(s)?`,
      isDanger: true,
      onConfirm: async () => {
        try {
          await apiFetch('/admin/support-messages/bulk-delete', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ ids: selectedIds })
          });
          setMessages(prev => prev.filter(m => !selectedIds.includes(m.id)));
          setSelectedIds([]);
          if (selectedMessage && selectedIds.includes(selectedMessage.id)) {
            setSelectedMessage(null);
          }
        } catch (err) {
          console.error('Error bulk deleting messages:', err);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredMessages.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredMessages.map(m => m.id));
    }
  };

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filter messages
  const filteredMessages = messages.filter(msg => {
    const matchesSearch = 
      msg.name.toLowerCase().includes(search.toLowerCase()) ||
      msg.email.toLowerCase().includes(search.toLowerCase()) ||
      (msg.phone && msg.phone.toLowerCase().includes(search.toLowerCase())) ||
      (msg.order_id && msg.order_id.toLowerCase().includes(search.toLowerCase())) ||
      msg.subject.toLowerCase().includes(search.toLowerCase()) ||
      msg.message.toLowerCase().includes(search.toLowerCase()) ||
      msg.id.toString().includes(search);

    const matchesCategory = categoryFilter === 'all' || msg.subject === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const unreadCount = messages.filter(m => m.status === 'unread').length;
  const inProgressCount = messages.filter(m => m.status === 'in_progress').length;
  const resolvedCount = messages.filter(m => m.status === 'resolved').length;

  return (
    <div className="space-y-4">
      {/* COMPACT PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[16px] font-semibold tracking-tight text-gray-900">
              Customer Support Messages
            </h1>
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full animate-pulse">
                {unreadCount} New
              </span>
            )}
          </div>
          
        </div>

        <button
          onClick={fetchMessages}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[12px] font-medium transition-colors shadow-2xs cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
          <span>Refresh Inbox</span>
        </button>
      </div>

      {/* COMPACT STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          onClick={() => setStatusFilter('all')}
          className={`bg-white rounded-[12px] p-3 border transition-all text-left shadow-sm cursor-pointer ${
            statusFilter === 'all' ? 'border-blue-500 ring-1 ring-blue-500/20 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-gray-500">All Inquiries</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
              <Inbox className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[16px] font-semibold text-gray-900 mt-1">{messages.length}</p>
        </button>

        <button
          onClick={() => setStatusFilter('unread')}
          className={`bg-white rounded-[12px] p-3 border transition-all text-left shadow-sm cursor-pointer ${
            statusFilter === 'unread' ? 'border-red-500 ring-1 ring-red-500/20 bg-red-50/30' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-red-600">Unread / New</span>
            <div className="w-6 h-6 rounded-md bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[16px] font-semibold text-red-700 mt-1">{unreadCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('in_progress')}
          className={`bg-white rounded-[12px] p-3 border transition-all text-left shadow-sm cursor-pointer ${
            statusFilter === 'in_progress' ? 'border-amber-500 ring-1 ring-amber-500/20 bg-amber-50/30' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-amber-600">In Progress</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[16px] font-semibold text-amber-700 mt-1">{inProgressCount}</p>
        </button>

        <button
          onClick={() => setStatusFilter('resolved')}
          className={`bg-white rounded-[12px] p-3 border transition-all text-left shadow-sm cursor-pointer ${
            statusFilter === 'resolved' ? 'border-emerald-500 ring-1 ring-emerald-500/20 bg-emerald-50/30' : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-emerald-600">Resolved</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-[16px] font-semibold text-emerald-700 mt-1">{resolvedCount}</p>
        </button>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white border border-gray-200 rounded-[12px] p-2.5 shadow-sm">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, email, order..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400"
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Filters & Bulk actions */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs cursor-pointer"
          >
            <option value="all">All Topics</option>
            <option value="General Inquiry">General Inquiry</option>
            <option value="Order Tracking & Delay">Order Tracking & Delay</option>
            <option value="Return / Replacement">Return / Replacement</option>
            <option value="Payment & Billing">Payment & Billing</option>
            <option value="Warranty Claim">Warranty Claim</option>
            <option value="Product Advice">Product Advice</option>
            <option value="Technical Support">Technical Support</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-700 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors shadow-2xs cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="unread">Unread Only</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
            <option value="archived">Archived</option>
          </select>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-[12px] font-medium transition-colors shadow-2xs cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete ({selectedIds.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* MESSAGES TABLE */}
      <div className="bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-hidden flex flex-col flex-1">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[12px] text-gray-700">
            <thead className="bg-gray-50/75 border-b border-gray-200 text-left text-[11px] font-medium text-gray-500 tracking-wider">
              <tr>
                <th className="px-3 py-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={filteredMessages.length > 0 && selectedIds.length === filteredMessages.length}
                    onChange={handleSelectAll}
                    className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-2">Ticket #</th>
                <th className="px-3 py-2">Customer</th>
                <th className="px-3 py-2">Topic & Message</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 font-normal">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span className="text-[12px]">Loading support inbox...</span>
                  </td>
                </tr>
              ) : filteredMessages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 space-y-1">
                    <Inbox className="w-7 h-7 mx-auto text-gray-300" />
                    <p className="font-medium text-gray-600 text-[12px]">No support messages found</p>
                    <p className="text-[11px] text-gray-400">When visitors send inquiries from the support page, they will appear here.</p>
                  </td>
                </tr>
              ) : (
                filteredMessages.map((msg) => {
                  const isSelected = selectedIds.includes(msg.id);
                  const isUnread = msg.status === 'unread';

                  return (
                    <tr 
                      key={msg.id} 
                      className={`hover:bg-gray-50/75 transition-colors border-b border-gray-100 last:border-0 ${
                        isUnread ? 'bg-blue-50/30 font-medium' : ''
                      } ${isSelected ? 'bg-blue-50/50' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(msg.id)}
                          className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Ticket # */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {isUnread && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" title="Unread" />
                          )}
                          <span className="font-mono font-medium text-gray-800 text-[11.5px]">#{msg.id}</span>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-3 py-2">
                        <div className="space-y-0.5 max-w-[180px]">
                          <div className="font-medium text-gray-900 truncate text-[12px]">
                            {msg.name}
                          </div>
                          <div className="text-[11px] text-gray-500 truncate flex items-center gap-1">
                            <Mail className="w-3 h-3 shrink-0 text-gray-400" />
                            <a href={`mailto:${msg.email}`} className="hover:text-blue-600 truncate">{msg.email}</a>
                          </div>
                          {msg.phone && (
                            <div className="text-[10.5px] text-emerald-600 truncate flex items-center gap-1 font-mono">
                              <Phone className="w-2.5 h-2.5 shrink-0 text-emerald-500" />
                              <a href={`tel:${msg.phone.replace(/[^0-9+]/g, '')}`} className="hover:underline">{msg.phone}</a>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Topic & Message Snippet */}
                      <td className="px-3 py-2">
                        <div className="space-y-1 max-w-[300px] sm:max-w-[400px]">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-block bg-gray-100 text-gray-700 text-[10.5px] font-medium px-1.5 py-0.5 rounded border border-gray-200">
                              {msg.subject}
                            </span>
                            {msg.order_id && (
                              <span className="inline-block bg-indigo-50 text-indigo-700 text-[10.5px] font-medium font-mono px-1.5 py-0.5 rounded border border-indigo-200">
                                Order #{msg.order_id}
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 line-clamp-1 text-[11.5px] leading-snug">
                            {msg.message}
                          </p>
                          {msg.admin_note && (
                            <p className="text-[10.5px] text-purple-700 font-medium truncate flex items-center gap-1">
                              <FileText className="w-3 h-3 text-purple-500 shrink-0" />
                              <span>Note: {msg.admin_note}</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {msg.status === 'unread' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-red-50 text-red-700 border border-red-200">
                            <AlertCircle className="w-3 h-3" /> Unread
                          </span>
                        )}
                        {msg.status === 'in_progress' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3" /> In Progress
                          </span>
                        )}
                        {msg.status === 'resolved' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Resolved
                          </span>
                        )}
                        {msg.status === 'archived' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-gray-100 text-gray-700 border border-gray-200">
                            <Archive className="w-3 h-3" /> Archived
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="px-3 py-2 whitespace-nowrap text-[11px] text-gray-500">
                        <div>{new Date(msg.created_at).toLocaleDateString()}</div>
                        <div className="text-[10px] text-gray-400">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      </td>

                      {/* Action Buttons */}
                      <td className="px-3 py-2 whitespace-nowrap text-right space-x-1">
                        <button
                          onClick={() => handleOpenDetail(msg)}
                          className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-medium rounded-md text-[11.5px] transition-colors cursor-pointer"
                          title="View Details & Contact"
                        >
                          View
                        </button>

                        <button
                          onClick={() => handleDeleteMessage(msg.id)}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                          title="Delete Ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DETAIL & CONTACT MODAL */}
      {selectedMessage && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-[14px] max-w-xl w-full border border-gray-200 shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50/75 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Inbox className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-[13px] flex items-center gap-1.5">
                    <span>Ticket #{selectedMessage.id}</span>
                    <span className="text-[10.5px] font-medium px-1.5 py-0.2 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {selectedMessage.subject}
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-gray-500">
                    {new Date(selectedMessage.created_at).toLocaleString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedMessage(null)}
                className="p-1 text-gray-400 hover:text-gray-700 rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-3.5 flex-1 text-[12px]">
              
              {/* Customer Profile Card */}
              <div className="bg-gray-50/75 border border-gray-200 rounded-lg p-3 space-y-2.5">
                <h4 className="font-medium text-gray-700 text-[11px] flex items-center gap-1.5">
                  <User className="w-3 h-3 text-blue-600" />
                  Customer Information & Contact Channels
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11.5px]">
                  <div>
                    <span className="text-gray-400 text-[10.5px] block">Customer Name</span>
                    <span className="font-medium text-gray-900">{selectedMessage.name}</span>
                  </div>

                  <div>
                    <span className="text-gray-400 text-[10.5px] block">Email Address</span>
                    <a 
                      href={`mailto:${selectedMessage.email}`}
                      className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3 text-blue-500" />
                      {selectedMessage.email}
                    </a>
                  </div>

                  {selectedMessage.phone && (
                    <div>
                      <span className="text-gray-400 text-[10.5px] block">Phone / WhatsApp</span>
                      <a 
                        href={`tel:${selectedMessage.phone.replace(/[^0-9+]/g, '')}`}
                        className="font-mono font-medium text-emerald-700 hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3 text-emerald-600" />
                        {selectedMessage.phone}
                      </a>
                    </div>
                  )}

                  {selectedMessage.order_id && (
                    <div>
                      <span className="text-gray-400 text-[10.5px] block">Related Order ID</span>
                      <span className="font-mono font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded text-[10.5px] inline-block">
                        #{selectedMessage.order_id}
                      </span>
                    </div>
                  )}
                </div>

                {/* Direct Action Buttons Toolkit */}
                <div className="pt-2 border-t border-gray-200 flex flex-wrap gap-1.5">
                  {/* Email Reply */}
                  <a
                    href={`mailto:${selectedMessage.email}?subject=Re: [Ticket #${selectedMessage.id}] ${selectedMessage.subject} - ${siteName}&body=Hi ${encodeURIComponent(selectedMessage.name)},%0D%0A%0D%0AThank you for reaching out to ${encodeURIComponent(siteName)} customer care regarding "${encodeURIComponent(selectedMessage.subject)}".%0D%0A%0D%0A`}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium text-[11px] transition-colors shadow-2xs cursor-pointer"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Mail className="w-3 h-3" />
                    <span>Reply via Email</span>
                  </a>

                  {/* Phone Call */}
                  {selectedMessage.phone && (
                    <a
                      href={`tel:${selectedMessage.phone.replace(/[^0-9+]/g, '')}`}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-[11px] transition-colors shadow-2xs cursor-pointer"
                    >
                      <Phone className="w-3 h-3" />
                      <span>Call Customer</span>
                    </a>
                  )}

                  {/* WhatsApp */}
                  {selectedMessage.phone && (
                    <a
                      href={`https://wa.me/${selectedMessage.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${selectedMessage.name}, I am contacting you from ${siteName} Support regarding your ticket #${selectedMessage.id} (${selectedMessage.subject}).`)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-[11px] transition-colors shadow-2xs cursor-pointer"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Inquiry Message Text */}
              <div className="space-y-1">
                <label className="block font-medium text-gray-700 text-[11px]">
                  Customer Message:
                </label>
                <div className="p-3 bg-white border border-gray-200 rounded-lg text-gray-800 text-[12px] leading-relaxed whitespace-pre-wrap">
                  {selectedMessage.message}
                </div>
              </div>

              {/* Status & Admin Notes */}
              <div className="bg-gray-50/75 border border-gray-200 rounded-lg p-3 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="block font-medium text-gray-700 text-[11px]">
                    Ticket Status & Resolution Notes
                  </label>
                  {actionSuccessMsg && (
                    <span className="text-emerald-600 font-medium text-[10.5px]">
                      {actionSuccessMsg}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10.5px] text-gray-500 mb-1">Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as SupportMessage['status'])}
                      className="w-full bg-white border border-gray-200 rounded-lg py-1 px-2 text-[11.5px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="unread">Unread / New</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="archived">Archived</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[10.5px] text-gray-500 mb-1">Internal Note</label>
                    <input
                      type="text"
                      value={editAdminNote}
                      onChange={(e) => setEditAdminNote(e.target.value)}
                      placeholder="e.g. Replied via email on 28 Aug..."
                      className="w-full bg-white border border-gray-200 rounded-lg py-1 px-2 text-[11.5px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={handleSaveDetails}
                    disabled={isSavingDetails}
                    className="flex items-center gap-1 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-[11.5px] transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3 h-3" />
                    <span>{isSavingDetails ? 'Saving...' : 'Save Notes'}</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-4 py-2.5 border-t border-gray-200 bg-gray-50/75 flex items-center justify-between">
              <button
                onClick={() => handleDeleteMessage(selectedMessage.id)}
                className="flex items-center gap-1 text-red-600 hover:text-red-700 text-[11.5px] font-medium hover:underline cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Ticket</span>
              </button>

              <button
                onClick={() => setSelectedMessage(null)}
                className="px-3 py-1 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-[11.5px] font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

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
