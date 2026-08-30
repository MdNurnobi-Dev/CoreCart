import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import ConfirmDialog from '../components/ConfirmDialog';
import { 
  FileCheck2, 
  Search, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  RefreshCw, 
  Eye, 
  Copy, 
  Check, 
  AlertTriangle, 
  X, 
  Building2, 
  Smartphone, 
  CreditCard,
  User,
  Phone,
  Calendar,
  ExternalLink,
  Package
} from 'lucide-react';

interface ManualPayment {
  id: number;
  order_id: number;
  user_id: number;
  gateway_name: string;
  sender_number: string;
  trx_id: string;
  amount: number;
  status: 'Pending' | 'Verified' | 'Rejected';
  admin_note: string;
  attachment_url: string;
  customer_name: string;
  customer_phone: string;
  user_phone?: string;
  tracking_number?: string;
  shipping_address?: string;
  user_name?: string;
  user_email?: string;
  created_at: string;
  updated_at: string;
  items?: any[];
}

interface Stats {
  total: number;
  pending: number;
  verified: number;
  rejected: number;
  total_verified_amount: number;
}

export default function AdminManualPayments() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<ManualPayment[]>([]);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    verified: 0,
    rejected: 0,
    total_verified_amount: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [gatewayFilter, setGatewayFilter] = useState('all');

  // Detail / Recheck Drawer state
  const [selectedPayment, setSelectedPayment] = useState<ManualPayment | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [token, statusFilter, gatewayFilter]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await apiFetch('/admin/manual-payments/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsRes) setStats(statsRes);

      // Fetch list
      let url = `/admin/manual-payments?status=${statusFilter}&gateway=${gatewayFilter}`;
      if (searchQuery.trim()) {
        url += `&search=${encodeURIComponent(searchQuery.trim())}`;
      }
      const data = await apiFetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setPayments(data || []);
    } catch (err: any) {
      console.error('Fetch manual payments error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const openDetailDrawer = async (paymentId: number) => {
    setDetailLoading(true);
    try {
      const data = await apiFetch(`/admin/manual-payments/${paymentId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setSelectedPayment(data);
      setAdminNoteInput(data.admin_note || '');
    } catch (err: any) {
      alert(err.message || 'Failed to fetch payment detail.');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleVerify = (paymentId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Approve Payment Submission',
      message: 'Verify and approve this manual payment? This will update the associated order status to Paid.',
      isDanger: false,
      onConfirm: async () => {
        setActionProcessing(true);
        try {
          const res = await apiFetch(`/admin/manual-payments/${paymentId}/verify`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ admin_note: adminNoteInput || 'Payment verified by Admin.' })
          });

          setToastMsg('Payment verified successfully! Order marked as Paid.');
          setTimeout(() => setToastMsg(''), 3000);
          
          if (selectedPayment && selectedPayment.id === paymentId) {
            setSelectedPayment(res.payment);
          }
          fetchData();
        } catch (err: any) {
          alert(err.message || 'Verification failed.');
        } finally {
          setActionProcessing(false);
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleReject = (paymentId: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Reject Payment Submission',
      message: 'Reject this payment submission? Order status will be updated to Payment Failed.',
      isDanger: true,
      onConfirm: async () => {
        setActionProcessing(true);
        try {
          const res = await apiFetch(`/admin/manual-payments/${paymentId}/reject`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ admin_note: adminNoteInput || 'TrxID could not be verified.' })
          });

          setToastMsg('Payment submission rejected.');
          setTimeout(() => setToastMsg(''), 3000);

          if (selectedPayment && selectedPayment.id === paymentId) {
            setSelectedPayment(res.payment);
          }
          fetchData();
        } catch (err: any) {
          alert(err.message || 'Rejection failed.');
        } finally {
          setActionProcessing(false);
        }
        setConfirmDialog(null);
      }
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTrxId(text);
    setTimeout(() => setCopiedTrxId(null), 2000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Verified':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300"><CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified</span>;
      case 'Rejected':
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-100 text-red-800 border border-red-300"><XCircle className="w-3 h-3 text-red-600" /> Rejected</span>;
      default:
        return <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse"><Clock className="w-3 h-3 text-amber-600" /> Pending Review</span>;
    }
  };

  return (
    <div className="space-y-3 p-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-[16px] font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-blue-600" />
            Manual Payment Verification
          </h1>
          <p className="text-[11px] text-slate-500">Recheck, verify, or reject mobile banking & manual payment submissions.</p>
        </div>
        <button
          onClick={fetchData}
          className="px-2.5 py-1 text-[11px] font-medium bg-white text-slate-700 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-1 shadow-2xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Submissions
        </button>
      </div>

      {/* Toast Notification */}
      {toastMsg && (
        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded text-[11px] text-emerald-800 flex items-center justify-between">
          <span className="flex items-center gap-1.5 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {toastMsg}
          </span>
          <button onClick={() => setToastMsg('')} className="text-emerald-500"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* Stats Overview Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="p-2.5 bg-white border border-slate-200 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Total Claims</p>
          <p className="text-[18px] font-bold text-slate-900 mt-0.5">{stats.total}</p>
        </div>
        <div className="p-2.5 bg-white border border-amber-200 bg-amber-50/20 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-amber-700 uppercase tracking-wider">Pending Recheck</p>
          <p className="text-[18px] font-bold text-amber-600 mt-0.5">{stats.pending}</p>
        </div>
        <div className="p-2.5 bg-white border border-emerald-200 bg-emerald-50/20 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">Verified Paid</p>
          <p className="text-[18px] font-bold text-emerald-600 mt-0.5">{stats.verified}</p>
        </div>
        <div className="p-2.5 bg-white border border-red-200 bg-red-50/20 rounded-md shadow-2xs">
          <p className="text-[10px] font-medium text-red-700 uppercase tracking-wider">Rejected</p>
          <p className="text-[18px] font-bold text-red-600 mt-0.5">{stats.rejected}</p>
        </div>
        <div className="p-2.5 bg-white border border-blue-200 bg-blue-50/20 rounded-md shadow-2xs col-span-2 sm:col-span-1">
          <p className="text-[10px] font-medium text-blue-700 uppercase tracking-wider">Verified Amount</p>
          <p className="text-[18px] font-bold text-blue-700 mt-0.5">৳{stats.total_verified_amount.toLocaleString()}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-2 bg-white border border-slate-200 rounded-md shadow-2xs flex flex-col sm:flex-row gap-2 justify-between items-center">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, TrxID, Phone, Name..."
            className="w-full h-7 pl-8 pr-2 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          {/* Status Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded">
            {[
              { id: 'all', label: 'All' },
              { id: 'Pending', label: 'Pending' },
              { id: 'Verified', label: 'Verified' },
              { id: 'Rejected', label: 'Rejected' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-all cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Gateway Filter Dropdown */}
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value)}
            className="h-7 bg-slate-50 border border-slate-200 rounded px-2 text-[11px] text-slate-800 outline-none focus:border-blue-500"
          >
            <option value="all">All Gateways</option>
            <option value="bKash">bKash</option>
            <option value="Nagad">Nagad</option>
            <option value="Rocket">Rocket</option>
            <option value="Bank">Bank Transfer</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white border border-slate-200 rounded-md shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-2 px-3">Order ID & Customer</th>
                <th className="py-2 px-3">Gateway</th>
                <th className="py-2 px-3">TrxID & Sender</th>
                <th className="py-2 px-3">Amount</th>
                <th className="py-2 px-3">Submitted At</th>
                <th className="py-2 px-3 text-center">Status</th>
                <th className="py-2 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[11.5px] text-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      <span>Loading manual payment submissions...</span>
                    </div>
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No manual payment submissions found.
                  </td>
                </tr>
              ) : (
                payments.map((mp) => (
                  <tr key={mp.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-3">
                      <div>
                        <span className="font-bold text-blue-600 text-[12px]">#{mp.order_id}</span>
                        {mp.tracking_number && (
                          <span className="ml-1 text-[10px] text-slate-400 font-mono">({mp.tracking_number})</span>
                        )}
                        <p className="font-medium text-slate-900 text-[11px] mt-0.5">{mp.customer_name || mp.user_name}</p>
                        <p className="text-[10px] text-slate-400">{mp.customer_phone || mp.user_email}</p>
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded text-[10.5px] border border-slate-200">
                        {mp.gateway_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3">
                      <div>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[11.5px] font-bold text-slate-900 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            {mp.trx_id}
                          </span>
                          <button
                            onClick={() => copyToClipboard(mp.trx_id)}
                            className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                            title="Copy TrxID"
                          >
                            {copiedTrxId === mp.trx_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        {mp.sender_number && (
                          <p className="text-[10px] text-slate-500 mt-0.5">Sender: {mp.sender_number}</p>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="font-bold text-slate-900 text-[12px]">৳{mp.amount.toLocaleString()}</span>
                    </td>
                    <td className="py-2.5 px-3 text-[10.5px] text-slate-500">
                      {new Date(mp.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      <br />
                      <span className="text-slate-400">{new Date(mp.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {getStatusBadge(mp.status)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openDetailDrawer(mp.id)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10.5px] font-semibold flex items-center gap-1 transition-colors"
                          title="View & Recheck Details"
                        >
                          <Eye className="w-3 h-3 text-blue-600" /> Recheck
                        </button>
                        {mp.status === 'Pending' && (
                          <>
                            <button
                              onClick={() => handleVerify(mp.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10.5px] font-semibold transition-colors shadow-2xs"
                              title="Verify Payment"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => handleReject(mp.id)}
                              className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10.5px] font-semibold transition-colors shadow-2xs"
                              title="Reject Payment"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail & Recheck Modal */}
      {selectedPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-lg shadow-xl w-full max-w-lg p-4 space-y-3 relative my-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-[14px] font-bold text-slate-900 flex items-center gap-1.5">
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  Recheck Payment: Order #{selectedPayment.order_id}
                </h3>
                <p className="text-[10.5px] text-slate-500">Verify customer submitted TrxID with bank/wallet statement.</p>
              </div>
              <button
                onClick={() => setSelectedPayment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-[11px] max-h-[70vh] overflow-y-auto pr-1">
              {/* Status Banner */}
              <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded border border-slate-200">
                <span className="text-slate-600 font-medium">Submission Status:</span>
                <div>{getStatusBadge(selectedPayment.status)}</div>
              </div>

              {/* Transaction Highlight Box */}
              <div className="p-3 bg-amber-50/60 border border-amber-200 rounded-md space-y-1.5">
                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Transaction Data to Recheck</p>
                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <div>
                    <span className="text-slate-500 text-[10px] block">Payment Channel:</span>
                    <span className="font-bold text-slate-900">{selectedPayment.gateway_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Claimed Amount:</span>
                    <span className="font-bold text-emerald-700 text-[13px]">৳{selectedPayment.amount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Transaction ID (TrxID):</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-amber-300 text-slate-900 text-[12px]">
                        {selectedPayment.trx_id}
                      </span>
                      <button
                        onClick={() => copyToClipboard(selectedPayment.trx_id)}
                        className="p-1 bg-white border border-slate-200 rounded hover:bg-slate-100 text-slate-600"
                        title="Copy TrxID"
                      >
                        {copiedTrxId === selectedPayment.trx_id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] block">Sender Phone / Account:</span>
                    <span className="font-mono font-medium text-slate-900">{selectedPayment.sender_number || 'Not provided'}</span>
                  </div>
                </div>
              </div>

              {/* Customer Info */}
              <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-md space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3 h-3" /> Customer Details
                </p>
                <div className="grid grid-cols-2 gap-1 text-[11px]">
                  <p><span className="text-slate-500">Name:</span> <strong>{selectedPayment.customer_name || selectedPayment.user_name}</strong></p>
                  <p><span className="text-slate-500">Phone:</span> <strong>{selectedPayment.customer_phone || selectedPayment.user_phone || 'N/A'}</strong></p>
                  <p className="col-span-2"><span className="text-slate-500">Address:</span> {selectedPayment.shipping_address || 'N/A'}</p>
                </div>
              </div>

              {/* Order Items Preview */}
              {selectedPayment.items && selectedPayment.items.length > 0 && (
                <div className="border border-slate-200 rounded-md overflow-hidden">
                  <div className="bg-slate-100 px-2.5 py-1 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase flex items-center gap-1">
                    <Package className="w-3 h-3" /> Order Items ({selectedPayment.items.length})
                  </div>
                  <div className="divide-y divide-slate-100">
                    {selectedPayment.items.map((item, idx) => (
                      <div key={idx} className="p-2 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-2">
                          {item.product_image && (
                            <img src={item.product_image} alt="" className="w-6 h-6 rounded object-cover border border-slate-200 shrink-0" />
                          )}
                          <span className="font-medium text-slate-800 line-clamp-1">{item.product_name}</span>
                        </div>
                        <span className="text-slate-500 shrink-0">Qty: {item.quantity} × ৳{item.price}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Admin Note Input */}
              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-1">
                  Admin Verification Note / Reason
                </label>
                <input
                  type="text"
                  value={adminNoteInput}
                  onChange={(e) => setAdminNoteInput(e.target.value)}
                  placeholder="e.g. Statement verified with bKash merchant app."
                  className="w-full h-8 bg-slate-50 border border-slate-200 rounded px-2 text-[11px] text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setSelectedPayment(null)}
                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleReject(selectedPayment.id)}
                  disabled={actionProcessing}
                  className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" /> Reject Payment
                </button>
                <button
                  onClick={() => handleVerify(selectedPayment.id)}
                  disabled={actionProcessing}
                  className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verify & Mark Paid
                </button>
              </div>
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
