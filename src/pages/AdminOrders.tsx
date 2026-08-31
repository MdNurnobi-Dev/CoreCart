import React, { useEffect, useState } from 'react';
import { 
  Package, Search, ChevronDown, CheckCircle, Clock, XCircle, 
  Truck, Eye, RefreshCw, Printer, AlertCircle, FileText, 
  MapPin, Phone, Mail, User, DollarSign, X, Check, Download,
  Send, Plus, Trash2, Calendar, Navigation, Share2, MessageCircle,
  Copy, Edit3, ShieldAlert, Sparkles, ExternalLink, History,
  ArrowRight, ShieldCheck, Activity, UserCheck, Terminal, Info, Globe,
  CheckSquare, Square, MinusSquare, SlidersHorizontal, Layers, ListChecks, CheckCheck
} from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Pagination from '../components/Pagination';

interface TrackingMilestone {
  id: string;
  title: string;
  location: string;
  timestamp: string;
  status: string;
  note?: string;
  completed?: boolean;
}

interface OrderAuditLog {
  id: number;
  order_id: number;
  previous_status?: string | null;
  new_status: string;
  admin_id?: number | null;
  admin_name?: string;
  admin_email?: string;
  notes?: string;
  change_reason?: string;
  ip_address?: string;
  created_at: string;
}

const COMMON_COURIERS = [
  'Steadfast Courier',
  'Pathao Courier',
  'RedX Delivery',
  'Paperfly',
  'DHL Express',
  'FedEx Logistics',
  'eCourier',
  'Sundarban Courier',
  'SA Paribahan',
  'TechShop Express Logistics'
];

const CHECKPOINT_PRESETS = [
  { title: 'Order Verified & Approved', location: 'Dhaka Central Hub', status: 'Processing', note: 'Customer details verified and order queued for packaging' },
  { title: 'Item Packed & Quality Checked', location: 'Central Warehouse (Dhaka)', status: 'Processing', note: 'Goods inspected, packed with tamper-proof seal' },
  { title: 'Handed Over to Courier Partner', location: 'Dispatch Logistics Center', status: 'Shipped', note: 'Package assigned to courier with consignment slip' },
  { title: 'In Transit - Shifting Facility', location: 'Regional Transit Hub', status: 'In Transit', note: 'Package moving between regional sorting hubs' },
  { title: 'Arrived at Destination Sorting Hub', location: 'Local Area Delivery Center', status: 'In Transit', note: 'Arrived at local hub and scheduled for delivery slot' },
  { title: 'Out for Delivery with Rider', location: 'Local Area / City Route', status: 'Out for Delivery', note: 'Delivery agent is on route to customer address' },
  { title: 'Delivered Successfully', location: 'Customer Delivery Address', status: 'Delivered', note: 'Package received and signed by recipient' }
];

const AUDIT_REASON_PRESETS = [
  'Customer contact & shipping address verified',
  'Manual payment TrxID verified by accounts',
  'Goods packed & dispatched to courier',
  'Courier assignment & tracking AWB issued',
  'Customer requested delivery reschedule',
  'Customer unreachable during delivery attempt',
  'Item handed over & signature obtained',
  'Customer cancellation request processed',
  'Return initiated & verified'
];

export default function AdminOrders() {
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  const { token } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  
  // Selected Order for Detail Modal
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  
  // Modal active tab
  const [modalTab, setModalTab] = useState<'details' | 'tracking' | 'audit' | 'invoice'>('details');

  // Bulk Selection & Batch Update state
  const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
  const [bulkStatus, setBulkStatus] = useState<string>('Processing');
  const [bulkCourier, setBulkCourier] = useState<string>('');
  const [bulkLocation, setBulkLocation] = useState<string>('Central Sorting Hub');
  const [bulkReason, setBulkReason] = useState<string>('Bulk status transition');
  const [bulkNotes, setBulkNotes] = useState<string>('');
  const [bulkAppendCheckpoint, setBulkAppendCheckpoint] = useState<boolean>(true);
  const [bulkUpdating, setBulkUpdating] = useState<boolean>(false);
  const [showBulkConfigModal, setShowBulkConfigModal] = useState<boolean>(false);

  // Audit logs state
  const [auditLogs, setAuditLogs] = useState<OrderAuditLog[]>([]);
  const [loadingAuditLogs, setLoadingAuditLogs] = useState(false);
  const [newAuditNote, setNewAuditNote] = useState('');
  const [newAuditReason, setNewAuditReason] = useState(AUDIT_REASON_PRESETS[0]);
  const [newAuditStatus, setNewAuditStatus] = useState('');
  const [submittingAuditLog, setSubmittingAuditLog] = useState(false);

  // Logistics & Tracking state
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  const [estimatedDelivery, setEstimatedDelivery] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [recipientName, setRecipientName] = useState('');

  // Checkpoint builder state
  const [newCheckpointTitle, setNewCheckpointTitle] = useState('');
  const [newCheckpointLocation, setNewCheckpointLocation] = useState('');
  const [newCheckpointNote, setNewCheckpointNote] = useState('');
  const [newCheckpointStatus, setNewCheckpointStatus] = useState('Processing');
  const [newCheckpointTime, setNewCheckpointTime] = useState('');
  const [addingCheckpoint, setAddingCheckpoint] = useState(false);

  const [savingLogistics, setSavingLogistics] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOrders();
  }, [token]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/admin/orders', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch admin orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async (orderId: number) => {
    try {
      setLoadingAuditLogs(true);
      const logs = await apiFetch(`/admin/orders/${orderId}/audit-logs`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setAuditLogs(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoadingAuditLogs(false);
    }
  };

  const fetchOrderDetails = async (orderId: number) => {
    try {
      setLoadingDetails(true);
      const data = await apiFetch(`/admin/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setSelectedOrder(data);
      setCourierName(data.courier_name || 'TechShop Express Logistics');
      setTrackingNumber(data.tracking_number || '');
      setCurrentLocation(data.current_location || '');
      setEstimatedDelivery(data.estimated_delivery || '');
      setAdminNotes(data.admin_notes || '');
      setShippingAddress(data.shipping_address || '');
      setCustomerPhone(data.customer_phone || data.user_phone || '');
      setRecipientName(data.recipient_name || data.user_name || '');
      
      // Load audit logs if returned in order or fetch directly
      if (Array.isArray(data.audit_logs)) {
        setAuditLogs(data.audit_logs);
      } else {
        fetchAuditLogs(orderId);
      }

      setNewAuditStatus(data.status || 'Processing');
      
      // Default new checkpoint time to now
      const now = new Date();
      now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
      setNewCheckpointTime(now.toISOString().slice(0, 16));
      setNewCheckpointLocation(data.current_location || 'Central Sorting Hub');
      setNewCheckpointStatus(data.status || 'Processing');
    } catch (err) {
      console.error('Failed to fetch order details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateStatus = async (orderId: number, newStatus: string, reason?: string, notes?: string) => {
    setUpdatingStatusId(orderId);
    try {
      const updated = await apiFetch(`/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: newStatus,
          change_reason: reason || 'Status updated from admin order control',
          audit_notes: notes || `Order status transition to ${newStatus}`
        })
      });
      
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ 
          ...prev, 
          status: newStatus,
          tracking_history: updated.tracking_history || prev.tracking_history,
          audit_logs: updated.audit_logs || prev.audit_logs
        }));
        if (updated.audit_logs) {
          setAuditLogs(updated.audit_logs);
        } else {
          fetchAuditLogs(orderId);
        }
      }
      showFeedback('Status updated successfully');
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleCreateAuditLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || (!newAuditNote.trim() && !newAuditStatus)) return;

    setSubmittingAuditLog(true);
    try {
      const isStatusTransition = newAuditStatus && newAuditStatus !== selectedOrder.status;
      const res = await apiFetch(`/admin/orders/${selectedOrder.id}/audit-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          notes: newAuditNote.trim() || `Administrative audit log entry: ${newAuditReason}`,
          change_reason: newAuditReason.trim() || 'Admin Status Transition',
          new_status: isStatusTransition ? newAuditStatus : undefined
        })
      });

      if (res.audit_logs && Array.isArray(res.audit_logs)) {
        setAuditLogs(res.audit_logs);
      } else if (res.log) {
        setAuditLogs(prev => [res.log, ...prev]);
      } else {
        fetchAuditLogs(selectedOrder.id);
      }

      if (isStatusTransition) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newAuditStatus }));
        setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { ...o, status: newAuditStatus } : o));
      }

      setNewAuditNote('');
      showFeedback('Audit log entry recorded successfully!');
    } catch (err) {
      console.error('Failed to record audit log:', err);
    } finally {
      setSubmittingAuditLog(false);
    }
  };

  const handleSaveLogistics = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingLogistics(true);
    try {
      const updated = await apiFetch(`/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          courier_name: courierName, 
          tracking_number: trackingNumber,
          current_location: currentLocation,
          estimated_delivery: estimatedDelivery,
          admin_notes: adminNotes,
          shipping_address: shippingAddress,
          customer_phone: customerPhone,
          recipient_name: recipientName
        })
      });

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { 
        ...o, 
        courier_name: courierName, 
        tracking_number: trackingNumber,
        current_location: currentLocation,
        estimated_delivery: estimatedDelivery,
        shipping_address: shippingAddress,
        customer_phone: customerPhone,
        recipient_name: recipientName
      } : o));
      
      setSelectedOrder((prev: any) => ({
        ...prev,
        ...updated
      }));

      showFeedback('Fulfillment & Tracking details saved!');
    } catch (err) {
      console.error('Failed to save logistics:', err);
    } finally {
      setSavingLogistics(false);
    }
  };

  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !newCheckpointTitle.trim()) return;

    setAddingCheckpoint(true);
    try {
      const updated = await apiFetch(`/admin/orders/${selectedOrder.id}/checkpoints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: newCheckpointTitle.trim(),
          location: newCheckpointLocation.trim(),
          note: newCheckpointNote.trim(),
          status: newCheckpointStatus,
          timestamp: newCheckpointTime ? new Date(newCheckpointTime).toISOString() : new Date().toISOString()
        })
      });

      if (updated.audit_logs) {
        setAuditLogs(updated.audit_logs);
      }

      setSelectedOrder((prev: any) => ({
        ...prev,
        tracking_history: updated.tracking_history,
        current_location: updated.current_location,
        status: updated.status,
        audit_logs: updated.audit_logs || prev.audit_logs
      }));

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? {
        ...o,
        status: updated.status,
        current_location: updated.current_location
      } : o));

      setCurrentLocation(updated.current_location);
      setNewCheckpointTitle('');
      setNewCheckpointNote('');
      showFeedback('Tracking checkpoint added!');
    } catch (err) {
      console.error('Failed to add checkpoint:', err);
    } finally {
      setAddingCheckpoint(false);
    }
  };

  const handleDeleteCheckpoint = async (checkpointId: string) => {
    if (!selectedOrder) return;
    try {
      const updated = await apiFetch(`/admin/orders/${selectedOrder.id}/checkpoints/${checkpointId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (updated.audit_logs) {
        setAuditLogs(updated.audit_logs);
      }

      setSelectedOrder((prev: any) => ({
        ...prev,
        tracking_history: updated.tracking_history,
        audit_logs: updated.audit_logs || prev.audit_logs
      }));
      showFeedback('Checkpoint removed');
    } catch (err) {
      console.error('Failed to delete checkpoint:', err);
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric', 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000));
      if (diff < 30) return 'Just now';
      if (diff < 60) return `${diff}s ago`;
      if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
      if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
      return `${Math.floor(diff / 86400)}d ago`;
    } catch (e) {
      return '';
    }
  };

  const handleApplyPreset = (preset: typeof CHECKPOINT_PRESETS[0]) => {
    setNewCheckpointTitle(preset.title);
    setNewCheckpointLocation(preset.location);
    setNewCheckpointStatus(preset.status);
    setNewCheckpointNote(preset.note);
  };

  const generateAutoTrackingCode = () => {
    const randomCode = 'TS-' + Math.floor(100000 + Math.random() * 900000);
    setTrackingNumber(randomCode);
  };

  const showFeedback = (msg: string) => {
    setSaveSuccessMessage(msg);
    setTimeout(() => setSaveSuccessMessage(''), 2500);
  };

  const handleCopyPublicTrackingUrl = () => {
    if (!selectedOrder) return;
    const trackingCode = selectedOrder.tracking_number || selectedOrder.id;
    const url = `${window.location.origin}/track-order/${trackingCode}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenWhatsApp = () => {
    if (!selectedOrder) return;
    const phone = (customerPhone || selectedOrder.user_phone || '').replace(/[^0-9]/g, '');
    const trackingCode = selectedOrder.tracking_number || selectedOrder.id;
    const url = `${window.location.origin}/track-order/${trackingCode}`;
    const message = encodeURIComponent(
      `Hello ${selectedOrder.recipient_name || selectedOrder.user_name || 'Customer'},\n` +
      `Your order #${selectedOrder.id} status is now "${selectedOrder.status}".\n` +
      (selectedOrder.courier_name ? `Courier: ${selectedOrder.courier_name}\n` : '') +
      (selectedOrder.current_location ? `Current Location: ${selectedOrder.current_location}\n` : '') +
      `Track your live delivery status here: ${url}\nThank you for shopping with us!`
    );
    window.open(`https://wa.me/${phone ? (phone.startsWith('88') ? phone : '88' + phone) : ''}?text=${message}`, '_blank');
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    
    const headers = ['Order ID', 'Customer Name', 'Phone', 'Email', 'Status', 'Total Amount', 'Courier', 'Tracking Number', 'Current Location', 'Created At'];
    
    const csvContent = [
      headers.join(','),
      ...orders.map(o => [
        o.id,
        `"${(o.recipient_name || o.user_name || '').replace(/"/g, '""')}"`,
        `"${(o.customer_phone || o.user_phone || '').replace(/"/g, '""')}"`,
        `"${(o.user_email || '').replace(/"/g, '""')}"`,
        o.status,
        o.total_amount,
        `"${(o.courier_name || '').replace(/"/g, '""')}"`,
        `"${(o.tracking_number || '').replace(/"/g, '""')}"`,
        `"${(o.current_location || '').replace(/"/g, '""')}"`,
        `"${new Date(o.created_at).toISOString()}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_logistics_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'Pending' || o.status === 'Confirmed').length;
  const processingCount = orders.filter(o => o.status === 'Processing' || o.status === 'Packaging' || o.status === 'Paid').length;
  const inTransitCount = orders.filter(o => o.status === 'Shipped' || o.status === 'In Transit' || o.status === 'Out for Delivery').length;
  const completedCount = orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;
  const cancelledCount = orders.filter(o => o.status === 'Cancelled' || o.status === 'Returned').length;

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(search) ||
      (order.recipient_name || order.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (order.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (order.customer_phone || order.user_phone || '').includes(search) ||
      (order.courier_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (order.tracking_number || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Pending' && (order.status === 'Pending' || order.status === 'Confirmed')) ||
      (statusFilter === 'Processing' && (order.status === 'Paid' || order.status === 'Processing' || order.status === 'Packaging')) ||
      (statusFilter === 'In Transit' && (order.status === 'Shipped' || order.status === 'In Transit' || order.status === 'Out for Delivery')) ||
      (statusFilter === 'Completed' && (order.status === 'Completed' || order.status === 'Delivered')) ||
      (statusFilter === 'Cancelled' && (order.status === 'Cancelled' || order.status === 'Returned'));

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Bulk Selection calculations
  const isAllCurrentPageSelected = currentOrders.length > 0 && currentOrders.every(o => selectedOrderIds.includes(o.id));
  const isSomeCurrentPageSelected = currentOrders.some(o => selectedOrderIds.includes(o.id)) && !isAllCurrentPageSelected;
  const selectedOrdersList = orders.filter(o => selectedOrderIds.includes(o.id));
  const selectedTotalAmount = selectedOrdersList.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);

  const toggleSelectOrder = (id: number) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAllCurrentPage = () => {
    if (isAllCurrentPageSelected) {
      const pageIds = new Set(currentOrders.map(o => o.id));
      setSelectedOrderIds(prev => prev.filter(id => !pageIds.has(id)));
    } else {
      const newIds = new Set([...selectedOrderIds, ...currentOrders.map(o => o.id)]);
      setSelectedOrderIds(Array.from(newIds));
    }
  };

  const selectAllFilteredOrders = () => {
    setSelectedOrderIds(filteredOrders.map(o => o.id));
  };

  const clearSelection = () => {
    setSelectedOrderIds([]);
  };

  const handleExecuteBulkUpdate = async (statusOverride?: string) => {
    const targetStatus = statusOverride || bulkStatus;
    if (selectedOrderIds.length === 0 || !targetStatus) return;

    setBulkUpdating(true);
    try {
      const res = await apiFetch('/admin/orders/bulk-status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          order_ids: selectedOrderIds,
          status: targetStatus,
          courier_name: bulkCourier || undefined,
          current_location: bulkLocation || undefined,
          change_reason: bulkReason || `Bulk status update to ${targetStatus}`,
          notes: bulkNotes || undefined,
          append_checkpoint: bulkAppendCheckpoint
        })
      });

      if (res.success) {
        const updatedMap = new Map<number, any>((res.orders || []).map((o: any) => [o.id, o]));
        setOrders(prev => prev.map(o => {
          if (updatedMap.has(o.id)) {
            const updated = updatedMap.get(o.id);
            return { ...o, ...(updated || {}) };
          }
          if (selectedOrderIds.includes(o.id)) {
            return { ...o, status: targetStatus, courier_name: bulkCourier || o.courier_name, current_location: bulkLocation || o.current_location };
          }
          return o;
        }));

        if (selectedOrder && selectedOrderIds.includes(selectedOrder.id)) {
          fetchOrderDetails(selectedOrder.id);
        }

        showFeedback(`Successfully updated ${res.updated_count || selectedOrderIds.length} orders to "${targetStatus}"!`);
        setSelectedOrderIds([]);
        setShowBulkConfigModal(false);
        setBulkNotes('');
      } else {
        alert(res.error || 'Failed to perform bulk update');
      }
    } catch (err: any) {
      console.error('Failed to perform bulk update:', err);
      alert('Bulk update failed: ' + (err.message || 'Server error'));
    } finally {
      setBulkUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'delivered' || s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle className="w-2.5 h-2.5" />
          {status}
        </span>
      );
    }
    if (s === 'shipped' || s === 'in transit' || s === 'out for delivery') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
          <Truck className="w-2.5 h-2.5" />
          {status}
        </span>
      );
    }
    if (s === 'processing' || s === 'packaging' || s === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
          <Clock className="w-2.5 h-2.5" />
          {status}
        </span>
      );
    }
    if (s === 'pending' || s === 'confirmed') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <AlertCircle className="w-2.5 h-2.5" />
          {status}
        </span>
      );
    }
    if (s === 'cancelled' || s === 'returned') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <XCircle className="w-2.5 h-2.5" />
          {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
        {status || 'Unknown'}
      </span>
    );
  };

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Header & Quick Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-[15px] font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Order & Logistics Control</span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Live Logistics
            </span>
          </h1>
          <p className="text-[11px] text-slate-500">Manage orders, update live delivery checkpoints, courier consignment & receipts</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Revenue</p>
            <p className="text-[14px] font-bold text-slate-900 mt-0.5">{currency}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-3 h-3" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Orders</p>
            <p className="text-[14px] font-bold text-slate-900 mt-0.5">{orders.length}</p>
          </div>
          <div className="w-6 h-6 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-3 h-3" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pending / New</p>
            <p className="text-[14px] font-bold text-amber-600 mt-0.5">{pendingCount + processingCount}</p>
          </div>
          <div className="w-6 h-6 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-3 h-3" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">In Transit</p>
            <p className="text-[14px] font-bold text-sky-600 mt-0.5">{inTransitCount}</p>
          </div>
          <div className="w-6 h-6 rounded-md bg-sky-50 text-sky-600 flex items-center justify-center">
            <Truck className="w-3 h-3" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Delivered</p>
            <p className="text-[14px] font-bold text-emerald-600 mt-0.5">{completedCount}</p>
          </div>
          <div className="w-6 h-6 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-3 h-3" />
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1">
        {/* Controls Toolbar: Tabs & Search */}
        <div className="p-2.5 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 bg-slate-50/70">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {[
              { label: 'All', count: orders.length },
              { label: 'Pending', count: pendingCount },
              { label: 'Processing', count: processingCount },
              { label: 'In Transit', count: inTransitCount },
              { label: 'Completed', count: completedCount },
              { label: 'Cancelled', count: cancelledCount }
            ].map(tab => (
              <button
                key={tab.label}
                onClick={() => setStatusFilter(tab.label)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                  statusFilter === tab.label
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  statusFilter === tab.label ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by ID, customer, tracking..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg h-[28px] pl-8 pr-3 text-[11px] text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Bar (Visible when 1 or more orders are selected) */}
        {selectedOrderIds.length > 0 && (
          <div className="p-2 px-3 bg-blue-50/90 border-b border-blue-200 flex flex-wrap items-center justify-between gap-2.5 transition-all">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-600 text-white text-[10px] font-bold">
                {selectedOrderIds.length}
              </span>
              <span className="text-[11px] font-bold text-slate-800">
                {selectedOrderIds.length === 1 ? '1 Order Selected' : `${selectedOrderIds.length} Orders Selected`}
              </span>
              <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
                (Total: {currency}{selectedTotalAmount.toFixed(2)})
              </span>

              {selectedOrderIds.length < filteredOrders.length && (
                <button
                  type="button"
                  onClick={selectAllFilteredOrders}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-bold underline ml-1 cursor-pointer"
                >
                  Select all {filteredOrders.length} matching
                </button>
              )}
            </div>

            <div className="flex items-center flex-wrap gap-1.5">
              <div className="flex items-center gap-1 bg-white border border-slate-300 rounded px-2 py-0.5 shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Status:</span>
                <select
                  value={bulkStatus}
                  onChange={(e) => setBulkStatus(e.target.value)}
                  className="text-[11px] font-bold text-slate-800 outline-none bg-transparent cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Paid">Paid</option>
                  <option value="Processing">Processing</option>
                  <option value="Packaging">Packaging</option>
                  <option value="Shipped">Shipped</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Completed">Completed</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Returned">Returned</option>
                </select>
              </div>

              <button
                type="button"
                disabled={bulkUpdating}
                onClick={() => handleExecuteBulkUpdate()}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                {bulkUpdating ? (
                  <>
                    <RefreshCw className="w-3 h-3 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Apply Status</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowBulkConfigModal(true)}
                className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 rounded text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
                title="Bulk configure courier, tracking hubs, and notes"
              >
                <SlidersHorizontal className="w-3 h-3 text-slate-600" />
                <span>Logistics & Notes</span>
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="px-2 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded text-[10px] font-semibold transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[11px] text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="w-8 px-2.5 py-2 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentPageSelected}
                    ref={input => {
                      if (input) {
                        input.indeterminate = isSomeCurrentPageSelected;
                      }
                    }}
                    onChange={toggleSelectAllCurrentPage}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
                    title="Select all on this page"
                  />
                </th>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Customer & Phone</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Total Amount</th>
                <th className="px-3 py-2">Courier & Tracking</th>
                <th className="px-3 py-2">Current Location</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No orders found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search query</p>
                  </td>
                </tr>
              ) : (
                currentOrders.map(order => (
                  <tr 
                    key={order.id} 
                    className={`transition-colors group ${
                      selectedOrderIds.includes(order.id) 
                        ? 'bg-blue-50/70 hover:bg-blue-50 font-medium' 
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    <td className="w-8 px-2.5 py-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrderIds.includes(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5 cursor-pointer align-middle"
                      />
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900">
                      <button
                        onClick={() => fetchOrderDetails(order.id)}
                        className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-bold text-[11px] cursor-pointer"
                      >
                        #{order.id}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-[11px] truncate max-w-[140px]">
                          {order.recipient_name || order.user_name || 'Guest Customer'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate max-w-[140px] font-mono">
                          {order.customer_phone || order.user_phone || order.user_email}
                        </p>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-slate-500 whitespace-nowrap">
                      {new Date(order.created_at).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-3 py-2 font-bold text-slate-900 whitespace-nowrap">
                      {currency}{(Number(order.total_amount)).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-600">
                      <div>
                        {order.courier_name && (
                          <p className="text-[10px] font-medium text-slate-700 truncate max-w-[120px]">{order.courier_name}</p>
                        )}
                        {order.tracking_number ? (
                          <span className="bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded border border-blue-100 inline-block font-bold">
                            {order.tracking_number}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic">No AWB</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1 text-slate-700 text-[10px]">
                        <MapPin className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                        <span className="truncate max-w-[130px] font-medium">
                          {order.current_location || 'Central Sorting Hub'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => fetchOrderDetails(order.id)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 text-[10px] font-bold transition-colors cursor-pointer flex items-center gap-1"
                          title="Manage Live Logistics & Tracking"
                        >
                          <Truck className="w-3 h-3" />
                          <span>Track / Edit</span>
                        </button>

                        <div className="relative inline-block text-left group/menu">
                          <button 
                            disabled={updatingStatusId === order.id}
                            className="inline-flex items-center gap-1 h-[22px] px-1.5 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <span>Status</span>
                            <ChevronDown className="w-2.5 h-2.5" />
                          </button>
                          <div className="absolute right-0 w-32 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 divide-y divide-slate-100">
                            <div className="py-1">
                              {['Pending', 'Confirmed', 'Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Completed', 'Cancelled'].map(st => (
                                <button 
                                  key={st}
                                  onClick={() => updateStatus(order.id, st)} 
                                  className="w-full text-left px-2.5 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                >
                                  <span>{st}</span>
                                  {order.status === st && <Check className="w-2.5 h-2.5 text-blue-600" />}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
          totalItems={filteredOrders.length} 
          itemsPerPage={itemsPerPage} 
        />
      </div>

      {/* Advanced Order Detail, Live Tracking Hub & Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[94vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10 text-blue-400">
                  <Truck className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-[13px] font-bold">Order #{selectedOrder.id}</h2>
                    {getStatusBadge(selectedOrder.status)}
                  </div>
                  <p className="text-[10px] text-slate-400">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>

              {/* Navigation Tabs inside modal */}
              <div className="flex items-center gap-1.5">
                <div className="bg-slate-800 p-0.5 rounded-lg flex items-center gap-0.5 border border-slate-700">
                  <button
                    onClick={() => setModalTab('details')}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      modalTab === 'details' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Details & Items
                  </button>
                  <button
                    onClick={() => setModalTab('tracking')}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                      modalTab === 'tracking' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Navigation className="w-2.5 h-2.5" />
                    <span>Live Tracking ({Array.isArray(selectedOrder.tracking_history) ? selectedOrder.tracking_history.length : 0})</span>
                  </button>
                  <button
                    onClick={() => setModalTab('audit')}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 ${
                      modalTab === 'audit' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <History className="w-2.5 h-2.5" />
                    <span>Audit Trail ({auditLogs.length})</span>
                  </button>
                  <button
                    onClick={() => setModalTab('invoice')}
                    className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold transition-all ${
                      modalTab === 'invoice' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Invoice Slip
                  </button>
                </div>

                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Feedback notification toast inside modal */}
            {saveSuccessMessage && (
              <div className="bg-emerald-500 text-white px-3 py-1 text-[11px] font-bold flex items-center justify-between shrink-0 animate-in fade-in">
                <span className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />
                  {saveSuccessMessage}
                </span>
              </div>
            )}

            {/* Modal Body with Tab Switching */}
            <div className="p-3.5 overflow-y-auto space-y-3.5 text-[11px] flex-1">
              
              {/* TAB 1: ORDER DETAILS, CUSTOMER INFO & FULFILLMENT */}
              {modalTab === 'details' && (
                <div className="space-y-3">
                  {/* Customer, Shipping & Payment Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {/* Customer Info Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Customer Contact</p>
                      <p className="font-bold text-slate-900 text-[12px]">{selectedOrder.recipient_name || selectedOrder.user_name}</p>
                      <p className="text-slate-600 flex items-center gap-1 font-mono text-[10px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{selectedOrder.user_email}</span>
                      </p>
                      <p className="text-slate-600 flex items-center gap-1 font-mono text-[10px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{customerPhone || selectedOrder.user_phone || 'No phone'}</span>
                      </p>
                    </div>

                    {/* Payment & Amount Card */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Payment & Pricing</p>
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.2 bg-white border border-slate-200 rounded text-[9px] font-bold text-slate-700">
                          {selectedOrder.payment_method || 'Card'}
                        </span>
                        {getStatusBadge(selectedOrder.status)}
                      </div>
                      <p className="text-[13px] font-bold text-blue-600 mt-1">
                        Total: {currency}{(Number(selectedOrder.total_amount)).toFixed(2)}
                      </p>
                    </div>

                    {/* Quick Notify / WhatsApp Actions */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Customer Communication</p>
                      <div className="flex flex-col gap-1">
                        <button
                          onClick={handleOpenWhatsApp}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>Send WhatsApp Status</span>
                        </button>
                        <button
                          onClick={handleCopyPublicTrackingUrl}
                          className="w-full inline-flex items-center justify-center gap-1.5 px-2 py-1 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-[10px] font-bold transition-all cursor-pointer"
                        >
                          {copiedLink ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                          <span>{copiedLink ? 'Tracking Link Copied!' : 'Copy Tracking Link'}</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Ordered Items Table */}
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600 flex items-center justify-between">
                      <span>Package Contents ({selectedOrder.items?.length || 0} items)</span>
                      <span className="text-slate-500 font-normal">Subtotal itemized list</span>
                    </div>
                    <div className="divide-y divide-slate-100 max-h-40 overflow-y-auto">
                      {loadingDetails ? (
                        <div className="p-3 text-center text-slate-400">Loading order items...</div>
                      ) : !selectedOrder.items || selectedOrder.items.length === 0 ? (
                        <div className="p-3 text-center text-slate-400">No items found for this order</div>
                      ) : (
                        selectedOrder.items.map((item: any) => (
                          <div key={item.id} className="p-2 flex items-center justify-between gap-2.5">
                            <div className="flex items-center gap-2 min-w-0">
                              {item.product_image ? (
                                <img 
                                  src={item.product_image} 
                                  alt={item.product_name} 
                                  className="w-8 h-8 object-cover rounded border border-slate-200 shrink-0" 
                                />
                              ) : (
                                <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                                  <Package className="w-3.5 h-3.5 text-slate-400" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900 text-[11px] truncate">{item.product_name || `Product #${item.product_id}`}</p>
                                <p className="text-[10px] text-slate-400">Qty: <b>{item.quantity}</b> × {currency}{Number(item.price).toFixed(2)}</p>
                              </div>
                            </div>
                            <div className="font-bold text-slate-900 text-[11px] shrink-0">
                              {currency}{(Number(item.price) * item.quantity).toFixed(2)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Logistics Fulfillment & Contact Form */}
                  <form onSubmit={handleSaveLogistics} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                        <Truck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Fulfillment & Delivery Settings</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Update courier, AWB & destination</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Courier Partner
                        </label>
                        <div className="relative">
                          <input 
                            type="text" 
                            list="courier-list"
                            value={courierName}
                            onChange={(e) => setCourierName(e.target.value)}
                            placeholder="e.g. Steadfast, Pathao"
                            className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                          />
                          <datalist id="courier-list">
                            {COMMON_COURIERS.map(c => <option key={c} value={c} />)}
                          </datalist>
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                            Tracking Code / AWB
                          </label>
                          <button
                            type="button"
                            onClick={generateAutoTrackingCode}
                            className="text-[9px] text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            Auto-Generate
                          </button>
                        </div>
                        <input 
                          type="text" 
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="e.g. TS-882190"
                          className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Estimated Delivery
                        </label>
                        <input 
                          type="text" 
                          value={estimatedDelivery}
                          onChange={(e) => setEstimatedDelivery(e.target.value)}
                          placeholder="e.g. 2-3 Business Days or Oct 15"
                          className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Recipient Phone Number
                        </label>
                        <input 
                          type="text" 
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          placeholder="e.g. 01712345678"
                          className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Current Location / Facility Hub
                        </label>
                        <input 
                          type="text" 
                          value={currentLocation}
                          onChange={(e) => setCurrentLocation(e.target.value)}
                          placeholder="e.g. Dhaka Central Hub, Station Road"
                          className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Shipping Address (Editable)
                      </label>
                      <textarea 
                        rows={2}
                        value={shippingAddress}
                        onChange={(e) => setShippingAddress(e.target.value)}
                        placeholder="Customer delivery address..."
                        className="w-full bg-white border border-slate-200 rounded p-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none resize-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                        Internal Admin Notes / Delivery Remarks
                      </label>
                      <input 
                        type="text" 
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="e.g. Customer requested evening delivery slot"
                        className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => setModalTab('tracking')}
                        className="text-[11px] text-blue-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <Navigation className="w-3 h-3" />
                        <span>Manage Checkpoints / Timeline &rarr;</span>
                      </button>

                      <button
                        type="submit"
                        disabled={savingLogistics}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                      >
                        {savingLogistics ? 'Saving...' : 'Save Logistics Info'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: LIVE TRACKING CHECKPOINTS & LOCATION CONTROL (PRIMARY USER REQUIREMENT) */}
              {modalTab === 'tracking' && (
                <div className="space-y-3">
                  
                  {/* Current Active Location Hub Banner */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                        <MapPin className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <p className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">Current Package Location</p>
                        <p className="text-[12px] font-bold text-slate-900">{currentLocation || selectedOrder.current_location || 'Central Sorting Hub'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Courier</p>
                      <p className="text-[11px] font-bold text-slate-800">{courierName || selectedOrder.courier_name || 'TechShop Logistics'}</p>
                    </div>
                  </div>

                  {/* Add New Checkpoint Form */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[11px]">
                        <Plus className="w-3.5 h-3.5 text-blue-600" />
                        <span>Add Live Location Checkpoint</span>
                      </div>
                      <span className="text-[10px] text-slate-400">Customer will see this update instantly</span>
                    </div>

                    {/* Quick Presets for Instant One-Click Milestones */}
                    <div>
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                        Quick Preset Checkpoints
                      </label>
                      <div className="flex flex-wrap gap-1">
                        {CHECKPOINT_PRESETS.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleApplyPreset(preset)}
                            className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-[9px] font-semibold text-slate-700 transition-colors cursor-pointer"
                          >
                            {preset.title.split(' ')[0]} {preset.title.split(' ')[1]}
                          </button>
                        ))}
                      </div>
                    </div>

                    <form onSubmit={handleAddCheckpoint} className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            Checkpoint Milestone Title *
                          </label>
                          <input 
                            type="text" 
                            required
                            value={newCheckpointTitle}
                            onChange={(e) => setNewCheckpointTitle(e.target.value)}
                            placeholder="e.g. Arrived at Dhaka Central Hub"
                            className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none font-medium"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            Location / Hub Facility *
                          </label>
                          <input 
                            type="text" 
                            required
                            value={newCheckpointLocation}
                            onChange={(e) => setNewCheckpointLocation(e.target.value)}
                            placeholder="e.g. Banani Sorting Facility, Dhaka"
                            className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            Status Progression
                          </label>
                          <select 
                            value={newCheckpointStatus}
                            onChange={(e) => setNewCheckpointStatus(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none font-bold"
                          >
                            <option value="Confirmed">Confirmed</option>
                            <option value="Processing">Processing / Packed</option>
                            <option value="Shipped">Shipped / Handed to Courier</option>
                            <option value="In Transit">In Transit</option>
                            <option value="Out for Delivery">Out for Delivery</option>
                            <option value="Delivered">Delivered</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                            Timestamp (Date & Time)
                          </label>
                          <input 
                            type="datetime-local" 
                            value={newCheckpointTime}
                            onChange={(e) => setNewCheckpointTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">
                          Checkpoint Note / Rider Details (Optional)
                        </label>
                        <input 
                          type="text" 
                          value={newCheckpointNote}
                          onChange={(e) => setNewCheckpointNote(e.target.value)}
                          placeholder="e.g. Rider Contact: 01700-000000 | Parcel Sealed in Security Bag #210"
                          className="w-full bg-white border border-slate-200 rounded h-[26px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                        />
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={addingCheckpoint || !newCheckpointTitle.trim()}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        >
                          <Plus className="w-3 h-3" />
                          <span>{addingCheckpoint ? 'Publishing...' : 'Add & Publish Checkpoint'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Visual Timeline of Existing Checkpoints */}
                  <div className="border border-slate-200 rounded-lg p-3 bg-white space-y-2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Live Tracking History ({Array.isArray(selectedOrder.tracking_history) ? selectedOrder.tracking_history.length : 0} Checkpoints)
                      </h3>
                      <a
                        href={`/track-order/${selectedOrder.tracking_number || selectedOrder.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <span>Preview Public Tracker</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>

                    {!selectedOrder.tracking_history || selectedOrder.tracking_history.length === 0 ? (
                      <div className="py-6 text-center text-slate-400">
                        <Navigation className="w-6 h-6 mx-auto mb-1 text-slate-300 animate-bounce" />
                        <p className="text-[11px] font-semibold text-slate-600">No custom checkpoints recorded yet</p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Use the form above or pick a preset to log the first checkpoint!</p>
                      </div>
                    ) : (
                      <div className="relative pl-5 border-l-2 border-blue-200 ml-2 space-y-3 py-1">
                        {selectedOrder.tracking_history.map((cp: TrackingMilestone, idx: number) => (
                          <div key={cp.id || idx} className="relative group">
                            {/* Marker Icon */}
                            <div className="absolute -left-[27px] top-0.5 w-4.5 h-4.5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-2xs ring-2 ring-white">
                              <Check className="w-2.5 h-2.5" />
                            </div>

                            {/* Checkpoint Details */}
                            <div className="bg-slate-50/80 hover:bg-slate-50 border border-slate-200 rounded-lg p-2 transition-colors">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-slate-900 text-[11px]">{cp.title}</span>
                                    {getStatusBadge(cp.status)}
                                  </div>
                                  <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                                    <span className="flex items-center gap-1 text-blue-600 font-medium">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {cp.location}
                                    </span>
                                    <span>&bull;</span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-2.5 h-2.5" />
                                      {new Date(cp.timestamp).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                  </div>
                                  {cp.note && (
                                    <p className="text-[10px] text-slate-600 mt-1 bg-white p-1.5 rounded border border-slate-200/70 font-medium">
                                      {cp.note}
                                    </p>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteCheckpoint(cp.id)}
                                  className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                  title="Delete this checkpoint"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: AUDIT TRAIL & STATUS CHANGE HISTORY */}
              {modalTab === 'audit' && (
                <div className="space-y-3.5">
                  {/* Top: New Audit Entry & Status Transition Form */}
                  <form onSubmit={handleCreateAuditLog} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
                        <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Record Status Transition & Audit Remark</span>
                      </div>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase">Admin Audit Control</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Order Status</label>
                        <select
                          value={newAuditStatus}
                          onChange={(e) => setNewAuditStatus(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-800 outline-none focus:border-blue-500"
                        >
                          <option value="Pending">Pending (Awaiting Verification)</option>
                          <option value="Confirmed">Confirmed (Order Accepted)</option>
                          <option value="Paid">Paid (Payment Verified)</option>
                          <option value="Processing">Processing (In Preparation)</option>
                          <option value="Packaging">Packaging (In Warehouse)</option>
                          <option value="Shipped">Shipped (Assigned to Courier)</option>
                          <option value="In Transit">In Transit (Moving Facilities)</option>
                          <option value="Out for Delivery">Out for Delivery (Rider Dispatched)</option>
                          <option value="Delivered">Delivered (Completed)</option>
                          <option value="Cancelled">Cancelled</option>
                          <option value="Returned">Returned</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Change Reason / Action Type</label>
                        <input
                          type="text"
                          value={newAuditReason}
                          onChange={(e) => setNewAuditReason(e.target.value)}
                          placeholder="e.g. Customer verified, Payment confirmed"
                          className="w-full bg-white border border-slate-200 rounded px-2 py-1 text-[11px] text-slate-800 outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Preset Reason Chips */}
                    <div>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-1">Quick Reason Presets:</span>
                      <div className="flex flex-wrap gap-1">
                        {AUDIT_REASON_PRESETS.map((preset, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => setNewAuditReason(preset)}
                            className="text-[9px] px-1.5 py-0.5 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 transition-colors cursor-pointer text-left"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-600 mb-0.5">Detailed Audit Note / Internal Remarks</label>
                      <textarea
                        value={newAuditNote}
                        onChange={(e) => setNewAuditNote(e.target.value)}
                        placeholder="Provide details about why this status change occurred or internal notes for audit compliance..."
                        rows={2}
                        className="w-full bg-white border border-slate-200 rounded p-1.5 text-[11px] text-slate-800 outline-none focus:border-blue-500 resize-none"
                      />
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        type="submit"
                        disabled={submittingAuditLog}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
                      >
                        {submittingAuditLog ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        <span>Record Audit Entry</span>
                      </button>
                    </div>
                  </form>

                  {/* Main: Audit Trail Chronological Timeline */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-slate-900 font-bold text-[12px]">
                        <History className="w-3.5 h-3.5 text-blue-600" />
                        <span>Timestamped Status Change History</span>
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 text-slate-700 font-mono font-bold">
                          {auditLogs.length} events
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => fetchAuditLogs(selectedOrder.id)}
                        disabled={loadingAuditLogs}
                        className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-700 font-bold p-1 rounded hover:bg-blue-50 transition-colors cursor-pointer"
                        title="Refresh audit logs"
                      >
                        <RefreshCw className={`w-3 h-3 ${loadingAuditLogs ? 'animate-spin' : ''}`} />
                        <span>Refresh Logs</span>
                      </button>
                    </div>

                    {loadingAuditLogs ? (
                      <div className="text-center py-6 text-slate-400 bg-slate-50 rounded-lg border border-slate-200">
                        <RefreshCw className="w-5 h-5 mx-auto animate-spin mb-1 text-blue-500" />
                        <p className="text-[10px]">Loading audit trail logs...</p>
                      </div>
                    ) : auditLogs.length === 0 ? (
                      <div className="text-center py-6 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <History className="w-6 h-6 mx-auto text-slate-300" />
                        <p className="text-[11px] font-bold text-slate-600">No status audit logs recorded yet</p>
                        <p className="text-[10px] text-slate-400">All administrative status updates and checkpoint actions will be logged here automatically.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-200">
                        {auditLogs.map((log, index) => (
                          <div key={log.id || index} className="relative flex items-start gap-2.5 pl-1 text-[11px]">
                            {/* Dot */}
                            <div className="relative z-10 w-5 h-5 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
                            </div>

                            {/* Audit Card */}
                            <div className="flex-1 bg-white border border-slate-200 rounded-lg p-2.5 shadow-2xs hover:border-slate-300 transition-colors space-y-1.5">
                              {/* Header: Timestamp, Transition & TimeAgo */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 pb-1.5">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {log.previous_status && log.previous_status !== log.new_status ? (
                                    <div className="flex items-center gap-1">
                                      {getStatusBadge(log.previous_status)}
                                      <ArrowRight className="w-2.5 h-2.5 text-slate-400" />
                                      {getStatusBadge(log.new_status)}
                                    </div>
                                  ) : (
                                    <div>{getStatusBadge(log.new_status)}</div>
                                  )}

                                  {log.change_reason && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                      {log.change_reason}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                                  <Clock className="w-2.5 h-2.5 text-slate-400" />
                                  <span title={log.created_at}>{formatDateTime(log.created_at)}</span>
                                  {formatTimeAgo(log.created_at) && (
                                    <span className="text-[9px] px-1 py-0.2 rounded bg-slate-100 text-slate-600 font-sans font-semibold">
                                      {formatTimeAgo(log.created_at)}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Actor and Context info */}
                              <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] text-slate-600">
                                <div className="flex items-center gap-1 font-medium">
                                  <UserCheck className="w-3 h-3 text-blue-600" />
                                  <span className="font-bold text-slate-800">{log.admin_name || 'System Admin'}</span>
                                  {log.admin_email && (
                                    <span className="text-slate-400 text-[9px]">({log.admin_email})</span>
                                  )}
                                </div>

                                {log.ip_address && (
                                  <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                                    <Globe className="w-2.5 h-2.5" />
                                    <span>{log.ip_address}</span>
                                  </div>
                                )}
                              </div>

                              {/* Notes Content */}
                              {log.notes && (
                                <div className="bg-slate-50 border border-slate-200/80 rounded p-1.5 text-[10px] text-slate-700 font-normal leading-relaxed">
                                  {log.notes}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: PRINTABLE INVOICE / PACKING SLIP */}
              {modalTab === 'invoice' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-50 p-2 rounded-lg border border-slate-200">
                    <span className="text-[11px] font-bold text-slate-700">Printable Consignment & Invoice Receipt</span>
                    <button
                      onClick={handlePrintInvoice}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                    >
                      <Printer className="w-3 h-3" />
                      <span>Print Document</span>
                    </button>
                  </div>

                  {/* Printable Invoice Container */}
                  <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-4 print:p-0 print:border-none">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b border-slate-200 pb-3">
                      <div>
                        <h2 className="text-[15px] font-bold text-slate-900">TechShop Official Invoice</h2>
                        <p className="text-[10px] text-slate-500">Order ID: #{selectedOrder.id}</p>
                        <p className="text-[10px] text-slate-500">Date: {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[11px] font-bold font-mono text-blue-600">AWB: {selectedOrder.tracking_number || `TS-${selectedOrder.id}`}</p>
                        <p className="text-[10px] text-slate-500">Courier: {selectedOrder.courier_name || 'TechShop Logistics'}</p>
                      </div>
                    </div>

                    {/* Customer & Shipping Summary */}
                    <div className="grid grid-cols-2 gap-4 text-[10px]">
                      <div>
                        <p className="font-bold uppercase tracking-wider text-slate-400">Billed & Shipped To:</p>
                        <p className="font-bold text-slate-900 text-[11px]">{selectedOrder.recipient_name || selectedOrder.user_name}</p>
                        <p className="text-slate-600">{selectedOrder.customer_phone || selectedOrder.user_phone}</p>
                        <p className="text-slate-600">{selectedOrder.shipping_address || 'Address on file'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold uppercase tracking-wider text-slate-400">Payment Status:</p>
                        <p className="font-bold text-slate-900">{selectedOrder.payment_method || 'Card'}</p>
                        <p className="text-emerald-600 font-bold">Status: {selectedOrder.status}</p>
                      </div>
                    </div>

                    {/* Items table */}
                    <table className="w-full text-left text-[10px] border border-slate-200">
                      <thead className="bg-slate-100 font-bold uppercase text-slate-600 border-b border-slate-200">
                        <tr>
                          <th className="p-1.5">Item Description</th>
                          <th className="p-1.5 text-center">Qty</th>
                          <th className="p-1.5 text-right">Unit Price</th>
                          <th className="p-1.5 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedOrder.items?.map((it: any, i: number) => (
                          <tr key={i}>
                            <td className="p-1.5 font-medium">{it.product_name}</td>
                            <td className="p-1.5 text-center font-bold">{it.quantity}</td>
                            <td className="p-1.5 text-right">{currency}{Number(it.price).toFixed(2)}</td>
                            <td className="p-1.5 text-right font-bold">{currency}{(Number(it.price) * it.quantity).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Total Amount */}
                    <div className="flex justify-end pt-2 border-t border-slate-200">
                      <div className="w-48 space-y-1 text-[11px]">
                        <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1">
                          <span>Grand Total:</span>
                          <span className="text-blue-600">{currency}{Number(selectedOrder.total_amount).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-0.5 text-[10px] font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Confirmed">Confirmed</option>
                  <option value="Processing">Processing</option>
                  <option value="Shipped">Shipped</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="px-3 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Advanced Bulk Logistics & Tracking Update Modal */}
      {showBulkConfigModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full flex flex-col border border-slate-200 max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600/30 border border-blue-400/40 flex items-center justify-center text-blue-300">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-white">Bulk Tracking & Logistics Update</h3>
                  <p className="text-[10px] text-slate-300">Apply uniform status, courier info, and milestones to selected batch</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBulkConfigModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-md transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3 space-y-3 overflow-y-auto flex-1 text-[11px]">
              {/* Selected Orders Overview */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-lg p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-[11px]">
                    <ListChecks className="w-3.5 h-3.5 text-blue-600" />
                    <span>Target Orders in Batch ({selectedOrderIds.length})</span>
                  </div>
                  <span className="text-[11px] font-bold text-blue-700 font-mono">
                    Total Value: {currency}{selectedTotalAmount.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto p-1 bg-white/80 rounded border border-blue-100">
                  {selectedOrdersList.map(o => (
                    <span 
                      key={o.id}
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200"
                    >
                      <span className="font-bold text-blue-600">#{o.id}</span>
                      <span className="text-slate-400">({o.status})</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Form Controls */}
              <div className="space-y-2.5">
                {/* Target Status */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                    New Tracking Status <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={bulkStatus}
                    onChange={(e) => setBulkStatus(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-bold text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                  >
                    <option value="Pending">Pending (Awaiting Confirmation)</option>
                    <option value="Confirmed">Confirmed (Order Accepted)</option>
                    <option value="Paid">Paid (Payment Verified)</option>
                    <option value="Processing">Processing (Inventory Allocation)</option>
                    <option value="Packaging">Packaging (In Fulfillment)</option>
                    <option value="Shipped">Shipped (Handed to Courier)</option>
                    <option value="In Transit">In Transit (Moving between Hubs)</option>
                    <option value="Out for Delivery">Out for Delivery (With Delivery Agent)</option>
                    <option value="Delivered">Delivered (Successful Delivery)</option>
                    <option value="Completed">Completed (Order Finalized)</option>
                    <option value="Cancelled">Cancelled (Order Voided)</option>
                    <option value="Returned">Returned (Consignment Returned)</option>
                  </select>
                </div>

                {/* Logistics & Courier Assignment */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Assign Courier (Optional)
                    </label>
                    <div className="space-y-1">
                      <select
                        value={bulkCourier}
                        onChange={(e) => setBulkCourier(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                      >
                        <option value="">-- Keep Existing Courier --</option>
                        {COMMON_COURIERS.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                      <input
                        type="text"
                        placeholder="Or enter custom courier name..."
                        value={bulkCourier}
                        onChange={(e) => setBulkCourier(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Checkpoint / Hub Location
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Central Sorting Hub, Dhaka Warehouse"
                      value={bulkLocation}
                      onChange={(e) => setBulkLocation(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-[11px] text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                    <div className="flex flex-wrap gap-1 mt-1">
                      {['Central Logistics Hub', 'Dhaka Hub', 'Regional Distribution Center', 'Out for Delivery'].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBulkLocation(preset)}
                          className="px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 text-[9px] font-medium transition-colors"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Audit & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Audit Reason Preset
                    </label>
                    <select
                      value={bulkReason}
                      onChange={(e) => setBulkReason(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] font-medium text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all cursor-pointer"
                    >
                      <option value="Bulk status transition">Bulk status transition</option>
                      <option value="Bulk warehouse dispatch">Bulk warehouse dispatch</option>
                      <option value="Courier handover batch">Courier handover batch</option>
                      <option value="Delivery confirmation run">Delivery confirmation run</option>
                      <option value="Payment reconciled batch">Payment reconciled batch</option>
                      <option value="Administrative correction">Administrative correction</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                      Internal Audit Remarks (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Dispatched with morning transit truck"
                      value={bulkNotes}
                      onChange={(e) => setBulkNotes(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[11px] text-slate-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>

                {/* Milestone Toggle */}
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100/70 transition-colors">
                  <input
                    type="checkbox"
                    checked={bulkAppendCheckpoint}
                    onChange={(e) => setBulkAppendCheckpoint(e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                  />
                  <div className="text-[10px] text-slate-700">
                    <span className="font-bold text-slate-900 block">Record tracking milestone checkpoint</span>
                    <span className="text-slate-500">Appends a timestamped checkpoint to public customer tracking timelines.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => setShowBulkConfigModal(false)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={bulkUpdating}
                onClick={() => handleExecuteBulkUpdate()}
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded text-[11px] font-bold shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                {bulkUpdating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Updating {selectedOrderIds.length} Orders...</span>
                  </>
                ) : (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Apply to {selectedOrderIds.length} Orders</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
