import React, { useEffect, useState } from 'react';
import { 
  Package, Search, ChevronDown, CheckCircle, Clock, XCircle, 
  Truck, Eye, RefreshCw, Printer, AlertCircle, FileText, 
  MapPin, Phone, Mail, User, DollarSign, X, Check, Download
} from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Pagination from '../components/Pagination';

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
  
  // Tracking & Courier editing in modal
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [saveTrackingSuccess, setSaveTrackingSuccess] = useState(false);
  const [savingTracking, setSavingTracking] = useState(false);

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
    } catch (err) {
      console.error('Failed to fetch order details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const updateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingStatusId(orderId);
    try {
      await apiFetch(`/admin/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      
      // Update local state instantly
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev: any) => ({ ...prev, status: newStatus }));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleSaveTracking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setSavingTracking(true);
    try {
      await apiFetch(`/admin/orders/${selectedOrder.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: selectedOrder.status, 
          courier_name: courierName, 
          tracking_number: trackingNumber 
        })
      });

      setOrders(prev => prev.map(o => o.id === selectedOrder.id ? { 
        ...o, 
        courier_name: courierName, 
        tracking_number: trackingNumber 
      } : o));
      
      setSelectedOrder((prev: any) => ({
        ...prev,
        courier_name: courierName,
        tracking_number: trackingNumber
      }));

      setSaveTrackingSuccess(true);
      setTimeout(() => setSaveTrackingSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to save tracking:', err);
    } finally {
      setSavingTracking(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  const handleExportCSV = () => {
    if (orders.length === 0) return;
    
    const headers = ['Order ID', 'Customer Name', 'Customer Email', 'Status', 'Total Amount', 'Created At', 'Payment Intent ID', 'Courier', 'Tracking Number'];
    
    const csvContent = [
      headers.join(','),
      ...orders.map(o => [
        o.id,
        `"${(o.user_name || '').replace(/"/g, '""')}"`,
        `"${(o.user_email || '').replace(/"/g, '""')}"`,
        o.status,
        o.total_amount,
        `"${new Date(o.created_at).toISOString()}"`,
        o.stripe_payment_intent_id || '',
        `"${(o.courier_name || '').replace(/"/g, '""')}"`,
        `"${(o.tracking_number || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `orders_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Metrics
  const totalRevenue = orders
    .filter(o => o.status !== 'Cancelled')
    .reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'Pending').length;
  const paidCount = orders.filter(o => o.status === 'Paid' || o.status === 'Processing').length;
  const completedCount = orders.filter(o => o.status === 'Completed' || o.status === 'Delivered').length;
  const cancelledCount = orders.filter(o => o.status === 'Cancelled').length;

  const filteredOrders = orders.filter(order => {
    const matchesSearch = 
      order.id.toString().includes(search) ||
      (order.user_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (order.user_email || '').toLowerCase().includes(search.toLowerCase()) ||
      (order.tracking_number || '').toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'All' || 
      (statusFilter === 'Pending' && order.status === 'Pending') ||
      (statusFilter === 'Paid' && (order.status === 'Paid' || order.status === 'Processing')) ||
      (statusFilter === 'Completed' && (order.status === 'Completed' || order.status === 'Delivered')) ||
      (statusFilter === 'Cancelled' && order.status === 'Cancelled');

    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-2.5 h-2.5" />
            {status}
          </span>
        );
      case 'Paid':
      case 'Processing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-2.5 h-2.5" />
            {status}
          </span>
        );
      case 'Pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertCircle className="w-2.5 h-2.5" />
            Pending
          </span>
        );
      case 'Cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-2.5 h-2.5" />
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status || 'Unknown'}
          </span>
        );
    }
  };

  return (
    <div className="space-y-3 flex flex-col h-full">
      {/* Top Header & Compact Metrics */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
        <div>
          <h1 className="text-[15px] font-bold tracking-tight text-slate-900">Order Management</h1>
          <p className="text-[11px] text-slate-500">Monitor live orders, manage fulfillments, tracking & invoices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Compact Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Revenue</p>
            <p className="text-[15px] font-bold text-slate-900 mt-0.5">{currency}{totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <DollarSign className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Total Orders</p>
            <p className="text-[15px] font-bold text-slate-900 mt-0.5">{orders.length}</p>
          </div>
          <div className="w-7 h-7 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
            <Package className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Pending / Processing</p>
            <p className="text-[15px] font-bold text-amber-600 mt-0.5">{pendingCount + paidCount}</p>
          </div>
          <div className="w-7 h-7 rounded-md bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-lg p-2.5 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Completed</p>
            <p className="text-[15px] font-bold text-emerald-600 mt-0.5">{completedCount}</p>
          </div>
          <div className="w-7 h-7 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Orders Table Container */}
      <div className="bg-white border border-slate-200/90 rounded-xl shadow-2xs overflow-hidden flex flex-col flex-1">
        {/* Controls Toolbar: Status Tabs & Search */}
        <div className="p-2.5 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 bg-slate-50/70">
          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0 no-scrollbar">
            {[
              { label: 'All', count: orders.length },
              { label: 'Pending', count: pendingCount },
              { label: 'Paid', count: paidCount },
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

          {/* Search Input */}
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

        {/* Table Content */}
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[11px] text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              <tr>
                <th className="px-3 py-2">Order ID</th>
                <th className="px-3 py-2">Customer Info</th>
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Total Amount</th>
                <th className="px-3 py-2">Payment</th>
                <th className="px-3 py-2">Tracking</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : currentOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-10 text-center text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-1.5 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">No orders found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">Try clearing filters or search query</p>
                  </td>
                </tr>
              ) : (
                currentOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-3 py-2 font-bold text-slate-900">
                      <button
                        onClick={() => fetchOrderDetails(order.id)}
                        className="text-blue-600 hover:underline flex items-center gap-1 font-mono font-bold text-[11px]"
                      >
                        #{order.id}
                      </button>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-bold text-[9px] shrink-0">
                          {(order.user_name || 'G').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-[11px] truncate max-w-[140px]">{order.user_name}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{order.user_email}</p>
                        </div>
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
                    <td className="px-3 py-2">
                      <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[9px] font-bold">
                        {order.payment_method || 'Card'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-slate-600">
                      {order.tracking_number ? (
                        <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100">
                          {order.tracking_number}
                        </span>
                      ) : (
                        <span className="text-slate-300 italic">Not Assigned</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {getStatusBadge(order.status)}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => fetchOrderDetails(order.id)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded border border-slate-200 transition-colors"
                          title="View Order Details & Invoice"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        <div className="relative inline-block text-left group/menu">
                          <button 
                            disabled={updatingStatusId === order.id}
                            className="inline-flex items-center gap-1 h-[24px] px-2 bg-white border border-slate-200 rounded text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                          >
                            <span>Status</span>
                            <ChevronDown className="w-2.5 h-2.5" />
                          </button>
                          <div className="absolute right-0 w-28 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all z-20 divide-y divide-slate-100">
                            <div className="py-1">
                              <button 
                                onClick={() => updateStatus(order.id, 'Pending')} 
                                className="w-full text-left px-2.5 py-1 text-[10px] font-medium text-amber-700 hover:bg-amber-50 flex items-center justify-between"
                              >
                                <span>Pending</span>
                                {order.status === 'Pending' && <Check className="w-2.5 h-2.5" />}
                              </button>
                              <button 
                                onClick={() => updateStatus(order.id, 'Paid')} 
                                className="w-full text-left px-2.5 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-50 flex items-center justify-between"
                              >
                                <span>Paid</span>
                                {order.status === 'Paid' && <Check className="w-2.5 h-2.5" />}
                              </button>
                              <button 
                                onClick={() => updateStatus(order.id, 'Completed')} 
                                className="w-full text-left px-2.5 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 flex items-center justify-between"
                              >
                                <span>Completed</span>
                                {order.status === 'Completed' && <Check className="w-2.5 h-2.5" />}
                              </button>
                              <button 
                                onClick={() => updateStatus(order.id, 'Cancelled')} 
                                className="w-full text-left px-2.5 py-1 text-[10px] font-medium text-rose-600 hover:bg-rose-50 flex items-center justify-between"
                              >
                                <span>Cancelled</span>
                                {order.status === 'Cancelled' && <Check className="w-2.5 h-2.5" />}
                              </button>
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

      {/* Advanced Order Detail & Invoice Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="p-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-white/10 text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-[13px] font-bold">Order Details #{selectedOrder.id}</h2>
                  <p className="text-[10px] text-slate-400">Placed on {new Date(selectedOrder.created_at).toLocaleString()}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintInvoice}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded text-[11px] font-bold transition-all cursor-pointer"
                  title="Print Printable Receipt"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 text-[12px] flex-1">
              {/* Order Status & Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Customer</p>
                  <p className="font-bold text-slate-900">{selectedOrder.user_name}</p>
                  <p className="text-[11px] text-slate-500">{selectedOrder.user_email}</p>
                  {selectedOrder.user_phone && (
                    <p className="text-[11px] text-slate-500">{selectedOrder.user_phone}</p>
                  )}
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Payment & Status</p>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(selectedOrder.status)}
                    <span className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] font-bold">
                      {selectedOrder.payment_method || 'Card'}
                    </span>
                  </div>
                  <p className="text-[13px] font-bold text-blue-600 mt-1">
                    Total: {currency}{(Number(selectedOrder.total_amount)).toFixed(2)}
                  </p>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Shipping Info</p>
                  <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                    {selectedOrder.shipping_address || 'Standard Address on File'}
                  </p>
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100/80 px-3 py-1.5 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-600">
                  Ordered Items ({selectedOrder.items?.length || 0})
                </div>
                <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {loadingDetails ? (
                    <div className="p-4 text-center text-slate-400">Loading order items...</div>
                  ) : !selectedOrder.items || selectedOrder.items.length === 0 ? (
                    <div className="p-4 text-center text-slate-400">No items found for this order</div>
                  ) : (
                    selectedOrder.items.map((item: any) => (
                      <div key={item.id} className="p-2.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.product_image ? (
                            <img 
                              src={item.product_image} 
                              alt={item.product_name} 
                              className="w-9 h-9 object-cover rounded border border-slate-200 shrink-0" 
                            />
                          ) : (
                            <div className="w-9 h-9 rounded bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-slate-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 text-[11px] truncate">{item.product_name || `Product #${item.product_id}`}</p>
                            <p className="text-[10px] text-slate-400">Qty: {item.quantity} × {currency}{Number(item.price).toFixed(2)}</p>
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

              {/* Courier & Tracking Fulfillment Form */}
              <form onSubmit={handleSaveTracking} className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px]">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <span>Fulfillment & Tracking Details</span>
                  </div>
                  {saveTrackingSuccess && (
                    <span className="text-[10px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Updated!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Courier / Delivery Partner
                    </label>
                    <input 
                      type="text" 
                      value={courierName}
                      onChange={(e) => setCourierName(e.target.value)}
                      placeholder="e.g. FedEx, DHL, TechShop Express"
                      className="w-full bg-white border border-slate-200 rounded h-[28px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Tracking Code / AWB
                    </label>
                    <input 
                      type="text" 
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. TS-982142"
                      className="w-full bg-white border border-slate-200 rounded h-[28px] px-2 text-[11px] text-slate-900 focus:border-blue-500 outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={savingTracking}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1"
                  >
                    {savingTracking ? 'Saving...' : 'Update Fulfillment'}
                  </button>
                </div>
              </form>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500 font-medium">Change Status:</span>
                <select
                  value={selectedOrder.status}
                  onChange={(e) => updateStatus(selectedOrder.id, e.target.value)}
                  className="bg-white border border-slate-200 rounded px-2 py-1 text-[11px] font-bold text-slate-800 outline-none cursor-pointer"
                >
                  <option value="Pending">Pending</option>
                  <option value="Paid">Paid</option>
                  <option value="Completed">Completed</option>
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
    </div>
  );
}
