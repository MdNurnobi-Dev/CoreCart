import React, { useEffect, useState, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Users, 
  Calendar, 
  Download, 
  RefreshCw, 
  ArrowUpRight, 
  Package, 
  Layers, 
  BarChart3, 
  Award,
  AlertCircle,
  Clock,
  Eye,
  Percent,
  CheckCircle2
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { Link } from 'react-router-dom';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from '../components/LazyImage';
import ErrorBoundary from '../components/ErrorBoundary';

interface DailySaleData {
  date: string;
  displayDate: string;
  sales: number;
  ordersCount: number;
  newUsers: number;
  cumulativeUsers: number;
}

interface TopProductData {
  id: number;
  name: string;
  slug: string;
  category: string;
  imageUrl: string;
  price: number;
  stock: number;
  lowStockThreshold: number;
  unitsSold: number;
  revenue: number;
  orderCount: number;
}

interface CategoryBreakdown {
  category: string;
  sales: number;
  count: number;
}

interface AnalyticsResponse {
  rangeDays: number;
  dailySales: DailySaleData[];
  topProducts: TopProductData[];
  categoryBreakdown: CategoryBreakdown[];
  summary: {
    total30dRevenue: number;
    total30dOrders: number;
    total30dNewUsers: number;
    totalCompletedRevenue: number;
    totalUsersCount: number;
    avgOrderValue: number;
    avgDailySales: number;
  };
}

const CATEGORY_COLORS = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];

export default function AdminAnalytics() {
  const { token } = useAuth();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';

  const [timeRange, setTimeRange] = useState<number>(30);
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeChartTab, setActiveChartTab] = useState<'sales' | 'orders' | 'combined'>('combined');
  const [productMetric, setProductMetric] = useState<'units' | 'revenue'>('revenue');

  const fetchAnalytics = async (days: number = timeRange) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/admin/analytics?days=${days}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res && res.dailySales) {
        setData(res);
      } else {
        throw new Error('Invalid analytics response');
      }
    } catch (err: any) {
      console.error('Error fetching analytics:', err);
      setError(err?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(timeRange);
  }, [token, timeRange]);

  // Export Daily Analytics data as CSV
  const handleExportCSV = () => {
    if (!data || !data.dailySales.length) return;
    const headers = ['Date', 'Daily Sales (' + currency + ')', 'Orders Count', 'New Registrations', 'Cumulative Users'];
    const rows = data.dailySales.map(d => [
      d.date,
      d.sales.toFixed(2),
      d.ordersCount,
      d.newUsers,
      d.cumulativeUsers
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sales_analytics_${timeRange}days_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Custom Recharts Tooltip for Sales & Orders
  const CustomSalesTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-[11px] backdrop-blur-sm min-w-[170px]">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5 flex items-center justify-between">
            <span>{item.date}</span>
            <span className="text-blue-400 font-medium">Day {item.displayDate}</span>
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span> Sales:
              </span>
              <span className="font-bold text-white">{currency}{Number(item.sales || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span> Orders:
              </span>
              <span className="font-bold text-emerald-400">{item.ordersCount} orders</span>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
              <span className="text-slate-400">Avg / Order:</span>
              <span className="text-slate-200">
                {item.ordersCount > 0 ? `${currency}${(item.sales / item.ordersCount).toFixed(2)}` : `${currency}0.00`}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Tooltip for Users
  const CustomUserTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-slate-900/95 text-white p-2.5 rounded-lg shadow-xl border border-slate-700 text-[11px] backdrop-blur-sm min-w-[160px]">
          <p className="font-bold text-slate-300 border-b border-slate-800 pb-1 mb-1.5">{item.date}</p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block"></span> New Users:
              </span>
              <span className="font-bold text-indigo-400">+{item.newUsers}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span> Total Users:
              </span>
              <span className="font-bold text-cyan-300">{item.cumulativeUsers}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  // Max daily values for chart scaling
  const maxSales = useMemo(() => {
    if (!data?.dailySales.length) return 100;
    return Math.max(...data.dailySales.map(d => d.sales), 100);
  }, [data]);

  const maxOrders = useMemo(() => {
    if (!data?.dailySales.length) return 10;
    return Math.max(...data.dailySales.map(d => d.ordersCount), 5);
  }, [data]);

  const maxUsers = useMemo(() => {
    if (!data?.dailySales.length) return 10;
    return Math.max(...data.dailySales.map(d => d.newUsers), 5);
  }, [data]);

  const pieData = useMemo(() => {
    if (!data?.categoryBreakdown) return [];
    return data.categoryBreakdown.map((item, idx) => ({
      name: item.category,
      value: item.sales > 0 ? item.sales : (item.count || 1),
      count: item.count,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length]
    }));
  }, [data]);

  const topProductChartData = useMemo(() => {
    if (!data?.topProducts) return [];
    return data.topProducts.slice(0, 7).map(p => ({
      name: p.name.length > 18 ? p.name.substring(0, 16) + '...' : p.name,
      fullName: p.name,
      revenue: p.revenue,
      units: p.unitsSold,
      stock: p.stock
    }));
  }, [data]);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[55vh] gap-2">
        <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-600 border-t-transparent"></div>
        <p className="text-[12px] text-slate-500 font-medium">Calculating analytics and trend models...</p>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <span className="text-[12px] font-medium">{error}</span>
        </div>
        <button
          onClick={() => fetchAnalytics(timeRange)}
          className="px-2.5 py-1 text-[11px] bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const summary = data?.summary || {
    total30dRevenue: 0,
    total30dOrders: 0,
    total30dNewUsers: 0,
    totalCompletedRevenue: 0,
    totalUsersCount: 0,
    avgOrderValue: 0,
    avgDailySales: 0
  };

  return (
    <div className="space-y-3 pb-6">
      
      {/* 1. Header Toolbar with Micro-Typography */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[15px] font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Sales & Growth Analytics
            </h1>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Last {timeRange} Days
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Monitor daily sales turnover, registration velocity, product velocity, and category performance.
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Time Range Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200 text-[11px]">
            {[
              { label: '7D', value: 7 },
              { label: '14D', value: 14 },
              { label: '30D', value: 30 },
              { label: '60D', value: 60 }
            ].map(item => (
              <button
                key={item.value}
                onClick={() => setTimeRange(item.value)}
                className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-all cursor-pointer ${
                  timeRange === item.value 
                    ? 'bg-white text-blue-700 shadow-xs' 
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => fetchAnalytics(timeRange)}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-white border border-gray-200 rounded-md text-slate-700 hover:bg-gray-50 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
            title="Refresh analytics data"
          >
            <RefreshCw className={`w-3 h-3 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-xs cursor-pointer"
            title="Export CSV dataset"
          >
            <Download className="w-3 h-3" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Key Metrics Compact KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        
        {/* Metric 1: Total Sales */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Sales Revenue ({timeRange}d)</span>
            <div className="w-6 h-6 rounded-md bg-blue-50 flex items-center justify-center text-blue-600">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[18px] font-bold text-slate-900 tracking-tight">
            {currency}{summary.total30dRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>Avg Daily: <strong className="text-slate-700 font-semibold">{currency}{summary.avgDailySales}</strong></span>
            <span className="text-emerald-600 bg-emerald-50 px-1 rounded font-medium">Active</span>
          </div>
        </div>

        {/* Metric 2: Total Orders */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Total Orders</span>
            <div className="w-6 h-6 rounded-md bg-emerald-50 flex items-center justify-center text-emerald-600">
              <ShoppingCart className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[18px] font-bold text-slate-900 tracking-tight">
            {summary.total30dOrders.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">orders</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>Avg Value (AOV): <strong className="text-slate-700 font-semibold">{currency}{summary.avgOrderValue}</strong></span>
            <span className="text-blue-600 bg-blue-50 px-1 rounded font-medium">Volume</span>
          </div>
        </div>

        {/* Metric 3: User Registrations */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">New User Registrations</span>
            <div className="w-6 h-6 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[18px] font-bold text-slate-900 tracking-tight">
            +{summary.total30dNewUsers.toLocaleString()} <span className="text-[11px] font-normal text-slate-500">signups</span>
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>Total Base: <strong className="text-slate-700 font-semibold">{summary.totalUsersCount} users</strong></span>
            <span className="text-indigo-600 bg-indigo-50 px-1 rounded font-medium">Growth</span>
          </div>
        </div>

        {/* Metric 4: Top Category */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[11px] font-medium">Top Category</span>
            <div className="w-6 h-6 rounded-md bg-amber-50 flex items-center justify-center text-amber-600">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-[18px] font-bold text-slate-900 tracking-tight truncate">
            {data?.categoryBreakdown[0]?.category || 'General'}
          </div>
          <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500">
            <span>Sales: <strong className="text-slate-700 font-semibold">{currency}{data?.categoryBreakdown[0]?.sales.toFixed(2) || '0.00'}</strong></span>
            <span className="text-amber-700 bg-amber-50 px-1 rounded font-medium">
              {data?.categoryBreakdown[0]?.count || 0} units
            </span>
          </div>
        </div>

      </div>

      {/* 3. Primary Visualizer: Daily Sales & Orders Trend (Last 30 Days) */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-gray-100 gap-2">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5 text-blue-600" />
              Daily Sales & Order Trend
            </h2>
            <p className="text-[10.5px] text-slate-500">
              Day-by-day revenue accumulation and customer transaction frequency over the past {timeRange} days.
            </p>
          </div>

          <div className="flex items-center gap-1 self-start sm:self-auto bg-slate-100 p-0.5 rounded-md text-[10.5px]">
            <button
              onClick={() => setActiveChartTab('combined')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                activeChartTab === 'combined' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Combined
            </button>
            <button
              onClick={() => setActiveChartTab('sales')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                activeChartTab === 'sales' ? 'bg-white text-blue-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sales Only ($)
            </button>
            <button
              onClick={() => setActiveChartTab('orders')}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                activeChartTab === 'orders' ? 'bg-white text-emerald-700 shadow-xs font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Orders Count
            </button>
          </div>
        </div>

        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.dailySales || []} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="ordersGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="displayDate" 
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
                interval={timeRange > 30 ? 4 : (timeRange > 14 ? 2 : 0)}
              />
              <YAxis 
                yAxisId="salesAxis"
                tick={{ fontSize: 10, fill: '#64748b' }} 
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${currency}${v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v}`}
                domain={[0, Math.ceil(maxSales * 1.15)]}
              />
              {activeChartTab === 'combined' && (
                <YAxis 
                  yAxisId="ordersAxis"
                  orientation="right"
                  tick={{ fontSize: 10, fill: '#10b981' }} 
                  axisLine={false}
                  tickLine={false}
                  domain={[0, Math.ceil(maxOrders * 1.3)]}
                />
              )}
              <Tooltip content={<CustomSalesTooltip />} />
              
              {(activeChartTab === 'sales' || activeChartTab === 'combined') && (
                <Area 
                  yAxisId="salesAxis"
                  type="monotone" 
                  dataKey="sales" 
                  name="Daily Sales"
                  stroke="#2563eb" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#salesGrad)" 
                />
              )}

              {(activeChartTab === 'orders' || activeChartTab === 'combined') && (
                <Area 
                  yAxisId={activeChartTab === 'combined' ? 'ordersAxis' : 'salesAxis'}
                  type="monotone" 
                  dataKey="ordersCount" 
                  name="Orders Count"
                  stroke="#10b981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#ordersGrad)" 
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10.5px] text-slate-500 mt-2">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-blue-600 inline-block"></span>
              Daily Sales Volume ({currency})
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded bg-emerald-500 inline-block"></span>
              Order Frequency
            </span>
          </div>
          <span>Showing full {timeRange}-day period breakdown</span>
        </div>
      </div>

      {/* 4. Dual Grid: User Registration Trends + Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        
        {/* Left 2 Cols: User Registration Trends (30 Days) */}
        <div className="lg:col-span-2 bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-gray-100">
            <div>
              <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                User Registration Trends (Last {timeRange} Days)
              </h2>
              <p className="text-[10.5px] text-slate-500">
                New customer accounts acquired daily vs cumulative user base growth.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block uppercase font-semibold">Total Base</span>
              <span className="text-[12px] font-bold text-indigo-600">{summary.totalUsersCount} Users</span>
            </div>
          </div>

          <div className="h-[210px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.dailySales || []} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="userGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="displayDate" 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                  interval={timeRange > 30 ? 4 : (timeRange > 14 ? 2 : 0)}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }} 
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                  domain={[0, Math.max(maxUsers + 2, 5)]}
                />
                <Tooltip content={<CustomUserTooltip />} />
                <Area 
                  type="monotone" 
                  dataKey="newUsers" 
                  name="New Registrations"
                  stroke="#6366f1" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#userGrad)" 
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulativeUsers" 
                  name="Total Users"
                  stroke="#06b6d4" 
                  strokeWidth={1.5}
                  dot={false}
                  strokeDasharray="4 4"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-[10.5px] text-slate-500 mt-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded bg-indigo-600 inline-block"></span>
                Daily New Signups
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-cyan-500 inline-block"></span>
                Cumulative User Growth
              </span>
            </div>
            <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
              +{summary.total30dNewUsers} this period
            </span>
          </div>
        </div>

        {/* Right 1 Col: Sales by Category Distribution (Donut & List) */}
        <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs flex flex-col">
          <div className="pb-2 mb-2 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              Category Share
            </h2>
            <p className="text-[10.5px] text-slate-500">
              Sales distribution across product categories.
            </p>
          </div>

          <div className="h-[140px] w-full flex items-center justify-center relative">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [`${currency}${Number(val).toFixed(2)}`, 'Sales']}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', fontSize: '11px', color: '#fff', border: 'none' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-[11px] text-slate-400">No category sales recorded yet</div>
            )}
          </div>

          {/* Compact category list */}
          <div className="flex-1 space-y-1.5 overflow-y-auto max-h-[90px] pr-1 mt-1">
            {pieData.slice(0, 5).map((cat, i) => {
              const totalVal = pieData.reduce((acc, curr) => acc + curr.value, 0);
              const pct = totalVal > 0 ? Math.round((cat.value / totalVal) * 100) : 0;
              return (
                <div key={i} className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-700 font-medium truncate">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 text-slate-500">
                    <span className="font-semibold text-slate-900">{currency}{Number(cat.value).toFixed(0)}</span>
                    <span className="text-[10px] text-slate-400">({pct}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* 5. Top-Selling Products Performance (Visual Bars + Leaderboard Table) */}
      <div className="bg-white p-3 rounded-lg border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 mb-3 border-b border-gray-100 gap-2">
          <div>
            <h2 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-amber-500" />
              Top-Selling Products Leaderboard
            </h2>
            <p className="text-[10.5px] text-slate-500">
              Rankings based on units sold, order appearances, and total generated revenue.
            </p>
          </div>

          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 text-[10.5px]">Chart Metric:</span>
            <div className="flex items-center bg-slate-100 p-0.5 rounded-md">
              <button
                onClick={() => setProductMetric('revenue')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer ${
                  productMetric === 'revenue' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600'
                }`}
              >
                Revenue ($)
              </button>
              <button
                onClick={() => setProductMetric('units')}
                className={`px-2 py-0.5 rounded text-[10.5px] font-medium transition-colors cursor-pointer ${
                  productMetric === 'units' ? 'bg-white text-blue-700 font-semibold shadow-xs' : 'text-slate-600'
                }`}
              >
                Units Sold
              </button>
            </div>
          </div>
        </div>

        {/* Top Products Bar Chart */}
        {topProductChartData.length > 0 && (
          <div className="h-[160px] w-full mb-3 bg-slate-50/60 p-2 rounded-md border border-slate-100">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductChartData} margin={{ top: 5, right: 10, left: -15, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9.5, fill: '#475569' }} axisLine={{ stroke: '#cbd5e1' }} tickLine={false} />
                <YAxis 
                  tick={{ fontSize: 9.5, fill: '#475569' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(v) => productMetric === 'revenue' ? `${currency}${v}` : `${v}`}
                />
                <Tooltip 
                  formatter={(val: any) => [
                    productMetric === 'revenue' ? `${currency}${Number(val).toFixed(2)}` : `${val} units`, 
                    productMetric === 'revenue' ? 'Revenue' : 'Units Sold'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '6px', fontSize: '11px', color: '#fff', border: 'none' }}
                />
                <Bar 
                  dataKey={productMetric === 'revenue' ? 'revenue' : 'units'} 
                  fill={productMetric === 'revenue' ? '#2563eb' : '#10b981'} 
                  radius={[4, 4, 0, 0]} 
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead>
              <tr className="border-b border-gray-200 text-slate-400 font-bold uppercase tracking-wider text-[9.5px] bg-slate-50/50">
                <th className="py-2 px-2.5 w-10">Rank</th>
                <th className="py-2 px-2.5">Product</th>
                <th className="py-2 px-2.5">Category</th>
                <th className="py-2 px-2.5 text-right">Price</th>
                <th className="py-2 px-2.5 text-right">Units Sold</th>
                <th className="py-2 px-2.5 text-right">Total Revenue</th>
                <th className="py-2 px-2.5 text-center">Stock Status</th>
                <th className="py-2 px-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.topProducts && data.topProducts.length > 0 ? (
                data.topProducts.map((product, idx) => {
                  const isLowStock = product.stock <= product.lowStockThreshold;
                  const isOutOfStock = product.stock === 0;
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2 px-2.5 font-bold text-slate-500">
                        {idx === 0 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center text-[10px] font-bold">1</span>
                        ) : idx === 1 ? (
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">2</span>
                        ) : idx === 2 ? (
                          <span className="w-5 h-5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center justify-center text-[10px] font-bold">3</span>
                        ) : (
                          <span className="text-slate-400 pl-1.5">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded border border-gray-200 overflow-hidden bg-gray-100 shrink-0">
                            <LazyImage
                              src={product.imageUrl}
                              fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0 max-w-[200px] sm:max-w-[300px]">
                            <span className="font-semibold text-slate-900 block truncate" title={product.name}>
                              {product.name}
                            </span>
                            <span className="text-[10px] text-slate-400 block truncate">ID: #{product.id}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 px-2.5">
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                          {product.category}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-medium text-slate-700">
                        {currency}{product.price.toFixed(2)}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <span className="font-bold text-slate-900">{product.unitsSold}</span>
                        <span className="text-slate-400 text-[10px] block">{product.orderCount} orders</span>
                      </td>
                      <td className="py-2 px-2.5 text-right font-bold text-blue-700">
                        {currency}{product.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        {isOutOfStock ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            0 in stock
                          </span>
                        ) : isLowStock ? (
                          <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {product.stock} left (low)
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            {product.stock} units
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <Link
                          to={`/product/${product.slug || product.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded transition-colors inline-block"
                          title="View Live Product"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-slate-400">
                    No product order velocity recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
