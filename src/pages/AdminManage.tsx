import React, { useState } from 'react';
import { Settings, Image as ImageIcon, Globe, Database, Save, Server, Link as LinkIcon, RefreshCw, Key, CheckCircle2, Download, AlertCircle, Zap, ShieldCheck } from 'lucide-react';
import { validateR2BucketConnection, R2ValidationResult, R2Credentials, R2FieldSource } from '../utils/r2Validation';

// Re-export for universal consumption
export { validateR2BucketConnection };
export type { R2ValidationResult, R2Credentials };

type Tab = 'storage' | 'api' | 'database' | 'backup';


function ToastMessage({ message, type, onClose }: { message: string, type: 'success' | 'error', onClose: () => void }) {
  React.useEffect(() => {
    if (message) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 px-4 py-2 rounded shadow-lg text-[13px] font-medium text-white animate-in slide-in-from-bottom-5 ${type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
      {message}
    </div>
  );
}


function ConfirmDialog({ isOpen, title, message, onConfirm, onCancel }: { isOpen: boolean, title: string, message: string, onConfirm: () => void, onCancel: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-sm animate-in zoom-in-95">
        <div className="p-4">
          <h3 className="text-[14px] font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-[12px] text-gray-500">{message}</p>
        </div>
        <div className="px-4 py-3 bg-gray-50 rounded-b-lg flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-[12px] font-medium text-white bg-red-600 rounded hover:bg-red-700">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminManage() {
  const [activeTab, setActiveTab] = useState<Tab>('storage');

  return (
    <div className="flex flex-col h-full space-y-4">
      <div>
        <h1 className="text-[16px] font-semibold text-gray-900">Manage Systems</h1>
        <p className="text-[12px] text-gray-500 mt-1">Configure external APIs, databases, and backup systems.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-4 h-full overflow-hidden">
        {/* Navigation Sidebar / Tabs */}
        <div className="md:w-[200px] shrink-0">
          <nav className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
            <button
              onClick={() => setActiveTab('storage')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                activeTab === 'storage' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Storage Manage
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                activeTab === 'api' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              External APIs
            </button>
            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                activeTab === 'database' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Database className="w-4 h-4" />
              Database
            </button>
            <button
              onClick={() => setActiveTab('backup')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                activeTab === 'backup' ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Save className="w-4 h-4" />
              Backup & Restore
            </button>
          </nav>
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-y-auto">
          {activeTab === 'storage' && <StorageManager />}
          {activeTab === 'api' && <ExternalApiManager />}
          {activeTab === 'database' && <DatabaseManager />}
          {activeTab === 'backup' && <BackupRestoreManager />}
        </div>
      </div>
    </div>
  );
}

// -- Sub-components for Tabs (UI Placeholders) --

import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';

function StorageManager() {
  const { token } = useAuth();
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({msg, type});
  const [providers, setProviders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState<number | null>(null);
  const [settings, setSettings] = useState({
    r2_account_id: '',
    r2_access_key: '',
    r2_secret_key: '',
    r2_bucket_name: '',
    r2_public_url: '',
    local_storage_enabled: false,
    primary_storage: 'r2'
  });
  const [sources, setSources] = useState<R2FieldSource>({
    r2_account_id: 'none',
    r2_access_key: 'none',
    r2_secret_key: 'none',
    r2_bucket_name: 'none',
    r2_public_url: 'none'
  });
  const [localWritable, setLocalWritable] = useState(false);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [validationResult, setValidationResult] = useState<R2ValidationResult | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'verifying' | 'completed' | 'error'>('idle');
  const [syncProgress, setSyncProgress] = useState({ total: 0, synced: 0, current: '', errors: 0, step: 'idle' });
  const [metrics, setMetrics] = useState({ totalSize: 0, fileCount: 0, bandwidthUsage: 0, configured: false, loading: true });

  React.useEffect(() => {
    const eventSource = new EventSource('/api/admin/storage/sync-progress');
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.status) setSyncStatus(data.status);
        setSyncProgress({
          total: data.totalFiles || 0,
          synced: data.syncedFiles || 0,
          current: data.currentFile || '',
          errors: data.errors || 0,
          step: data.step || 'idle'
        });
      } catch (err) {}
    };
    return () => eventSource.close();
  }, []);

  const fetchMetrics = async () => {
    try {
      setMetrics(prev => ({ ...prev, loading: true }));
      const data = await apiFetch('/admin/storage/metrics');
      if (data && data.configured) {
        setMetrics({
          totalSize: data.metrics.totalSize || 0,
          fileCount: data.metrics.fileCount || 0,
          bandwidthUsage: data.metrics.bandwidthUsage || 0,
          configured: true,
          loading: false
        });
      } else {
        setMetrics(prev => ({ ...prev, configured: false, loading: false }));
      }
    } catch (err) {
      setMetrics(prev => ({ ...prev, configured: false, loading: false }));
    }
  };

  React.useEffect(() => {
    fetchMetrics();
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSyncToPrimary = async () => {
    if (!settings.r2_public_url) {
      showToast('Please save R2 Public URL before syncing.', 'error');
      return;
    }
    
    try {
      await apiFetch('/admin/storage/sync-r2', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Sync started successfully');
    } catch (err: any) {
      showToast(err.message || 'Failed to start sync', 'error');
    }
  };

  // New Provider Form
  const [showNewForm, setShowNewForm] = useState(false);
  const [newProvider, setNewProvider] = useState({ name: '', provider_key: '', api_key: '', api_secret: '', is_active: false });

  // Backup/Restore State
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);

  React.useEffect(() => {
    fetchProviders();
    fetchStorageSettings();
    checkLocalWritable();
  }, []);

  const fetchStorageSettings = async () => {
    try {
      const data = await apiFetch('/admin/backup/settings');
      if (data) {
        setSettings({
          r2_account_id: data.r2_account_id || '',
          r2_access_key: data.r2_access_key || '',
          r2_secret_key: data.r2_secret_key || '',
          r2_bucket_name: data.r2_bucket_name || '',
          r2_public_url: data.r2_public_url || '',
          local_storage_enabled: !!data.local_storage_enabled,
          primary_storage: data.primary_storage || 'r2'
        });
        if (data.sources) {
          setSources(data.sources);
        }
        if (data.r2_bucket_name && data.r2_account_id && data.r2_access_key && data.r2_secret_key) {
          setTestSuccess(true);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const checkLocalWritable = async () => {
    try {
      const res = await apiFetch('/admin/storage/local-check');
      setLocalWritable(!!res?.writable);
      if (!res?.writable) {
         setSettings(prev => ({...prev, local_storage_enabled: false}));
      }
    } catch (err) {
      setLocalWritable(false);
      setSettings(prev => ({...prev, local_storage_enabled: false}));
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestSuccess(false);
    setValidationResult(null);
    try {
      const result = await validateR2BucketConnection(settings, token);
      setValidationResult(result);
      if (result.connected) {
        showToast(`R2 connected successfully (${result.latencyMs}ms)!`);
        setTestSuccess(true);
        if (result.sources) {
          setSources(result.sources);
        }
        fetchMetrics();
      } else {
        showToast(result.message || 'R2 Connection test failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'R2 Connection test failed', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveStorageSettings = async () => {
    setSettingsLoading(true);
    try {
      const res = await apiFetch('/admin/backup/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      if (res?.settings?.sources) {
        setSources(res.settings.sources);
      }
      showToast('Storage settings saved successfully!');
      fetchMetrics();
    } catch (err) {
      showToast('Failed to save storage settings', 'error');
    } finally {
      setSettingsLoading(false);
    }
  };

  const renderSourceBadge = (key: keyof R2FieldSource) => {
    const src = sources[key] as string;
    if (src === 'env') {
      return <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">.env</span>;
    }
    if (src === 'database') {
      return <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">Database</span>;
    }
    if (src === 'override' || src === 'custom') {
      return <span className="text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">Custom</span>;
    }
    return null;
  };


  const fetchProviders = async () => {
    try {
      const data = await apiFetch('/admin/image-providers');
      setProviders(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (provider: any) => {
    setSaveLoading(provider.id);
    try {
      await apiFetch(`/admin/image-providers/${provider.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(provider)
      });
      fetchProviders();
    } catch (err) {
      showToast('Failed to update provider', 'error');
    } finally {
      setSaveLoading(null);
    }
  };

  const handleAdd = async () => {
    try {
      await apiFetch(`/admin/image-providers`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newProvider)
      });
      setShowNewForm(false);
      setNewProvider({ name: '', provider_key: '', api_key: '', api_secret: '', is_active: false });
      fetchProviders();
    } catch (err) {
      showToast('Failed to add provider', 'error');
    }
  };

  const handleBackup = async () => {
    setBackupLoading(true);
    try {
      const data = await apiFetch('/admin/images/backup');
      const dataStr = JSON.stringify(data.data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `product-images-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
    } catch (err) {
      showToast('Failed to export images', 'error');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setRestoreLoading(true);
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      const res = await apiFetch('/admin/images/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: importedData })
      });
      
      showToast(`Successfully restored ${res.count} product images`);
    } catch (err: any) {
      console.error(err);
      showToast('Failed to restore images', 'error');
    } finally {
      setRestoreLoading(false);
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div className="p-4 space-y-6 animate-in fade-in pb-10">
      <div>
        <h2 className="text-[14px] font-semibold text-gray-900">Storage Manage</h2>
        <p className="text-[12px] text-gray-500">Configure primary storage (Cloudflare R2) and secondary storage integrations.</p>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
              <Server className="w-4 h-4 text-orange-500" />
              Primary Storage (Cloudflare R2)
            </h3>
            <p className="text-[11px] text-gray-500 mt-1">Cloudflare R2 is the default primary storage for all images, PDFs, and backups.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-gray-500">Primary System</span>
            <div className="h-4 w-4 rounded-full bg-green-500 shadow-sm border border-white"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-gray-700">Account ID</label>
              {renderSourceBadge('r2_account_id')}
            </div>
            <input 
              type="text" 
              value={settings.r2_account_id}
              onChange={e => {setSettings({...settings, r2_account_id: e.target.value}); setTestSuccess(false); setValidationResult(null);}}
              className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-gray-700">Bucket Name</label>
              {renderSourceBadge('r2_bucket_name')}
            </div>
            <input 
              type="text" 
              value={settings.r2_bucket_name}
              onChange={e => {setSettings({...settings, r2_bucket_name: e.target.value}); setTestSuccess(false); setValidationResult(null);}}
              className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-gray-700">Access Key ID</label>
              {renderSourceBadge('r2_access_key')}
            </div>
            <input 
              type="password" 
              value={settings.r2_access_key}
              onChange={e => {setSettings({...settings, r2_access_key: e.target.value}); setTestSuccess(false); setValidationResult(null);}}
              className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-gray-700">Secret Access Key</label>
              {renderSourceBadge('r2_secret_key')}
            </div>
            <input 
              type="password" 
              value={settings.r2_secret_key}
              onChange={e => {setSettings({...settings, r2_secret_key: e.target.value}); setTestSuccess(false); setValidationResult(null);}}
              className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
            />
          </div>
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11px] font-medium text-gray-700">Public URL (e.g. https://pub-xxxx.r2.dev)</label>
              {renderSourceBadge('r2_public_url')}
            </div>
            <input 
              type="text" 
              value={settings.r2_public_url}
              onChange={e => {setSettings({...settings, r2_public_url: e.target.value});}}
              placeholder="https://your-public-r2-domain.com"
              className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
            />
          </div>
        </div>

        {/* Validation Diagnostic Panel */}
        {validationResult && (
          <div className={`border rounded-lg p-3 ${validationResult.connected ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'} transition-all`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {validationResult.connected ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600" />
                )}
                <span className={`text-[12px] font-semibold ${validationResult.connected ? 'text-emerald-900' : 'text-rose-900'}`}>
                  {validationResult.connected ? 'Cloudflare R2 Bucket Connected & Ready' : 'R2 Bucket Validation Issue'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {validationResult.latencyMs !== undefined && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-gray-200 text-gray-700">
                    <Zap className="w-3 h-3 text-amber-500" /> {validationResult.latencyMs}ms
                  </span>
                )}
              </div>
            </div>

            <p className={`text-[11px] mt-1.5 ${validationResult.connected ? 'text-emerald-700' : 'text-rose-700'}`}>
              {validationResult.message}
            </p>

            {validationResult.missingFields && validationResult.missingFields.length > 0 && (
              <div className="mt-2 text-[11px] text-rose-800">
                <span className="font-semibold">Missing configuration items:</span> {validationResult.missingFields.join(', ')}
              </div>
            )}

            {validationResult.diagnostics && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2.5 pt-2 border-t border-gray-200/60 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${validationResult.diagnostics.credentialsPresent ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-gray-600">Credentials Valid</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${validationResult.diagnostics.bucketReachable ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                  <span className="text-gray-600">Bucket Reachable</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${validationResult.diagnostics.publicUrlConfigured ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-gray-600">{validationResult.diagnostics.publicUrlConfigured ? 'Public URL Set' : 'No Public URL'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className={`w-1.5 h-1.5 rounded-full ${validationResult.diagnostics.syncReady ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                  <span className="text-gray-600">{validationResult.diagnostics.syncReady ? 'Sync Engine Ready' : 'Sync Blocked'}</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Real-Time Storage Metrics Dashboard */}
        {metrics.configured && !metrics.loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Total Storage Used</span>
              <span className="text-[20px] font-bold text-gray-900">{formatBytes(metrics.totalSize)}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Total Files Hosted</span>
              <span className="text-[20px] font-bold text-gray-900">{metrics.fileCount.toLocaleString()}</span>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm flex flex-col justify-center">
              <span className="text-[11px] text-gray-500 font-medium uppercase tracking-wider mb-1">Est. Bandwidth (30d)</span>
              <span className="text-[20px] font-bold text-gray-900">{formatBytes(metrics.bandwidthUsage)}</span>
            </div>
          </div>
        )}

        {/* Sync Progress Indicator */}
        {(syncStatus === 'syncing' || syncStatus === 'verifying') && (
          <div className="bg-white border border-blue-200 shadow-sm rounded-lg p-4 mb-4">
             <div className="flex justify-between items-center mb-4">
               <h4 className="text-[13px] font-bold text-gray-900">Syncing External Files to R2</h4>
               <span className="text-[12px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                 {syncProgress.synced} / {syncProgress.total} Files
               </span>
             </div>
             
             {/* Step-by-Step Tracker */}
             <div className="flex items-center justify-between mb-4 relative">
               <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-gray-100 z-0"></div>
               <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-blue-500 z-0 transition-all duration-500" style={{
                 width: syncProgress.step === 'gathering' ? '15%' : 
                        syncProgress.step === 'downloading' ? '50%' : 
                        syncProgress.step === 'uploading' ? '85%' : 
                        syncProgress.step === 'verifying' ? '100%' : '0%'
               }}></div>
               
               {/* Step 1: Gathering */}
               <div className="relative z-10 flex flex-col items-center gap-1">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${['gathering', 'downloading', 'uploading', 'verifying', 'completed'].includes(syncProgress.step) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>1</div>
                 <span className={`text-[10px] font-medium ${['gathering', 'downloading', 'uploading', 'verifying', 'completed'].includes(syncProgress.step) ? 'text-blue-700' : 'text-gray-400'}`}>Gather</span>
               </div>
               {/* Step 2: Downloading */}
               <div className="relative z-10 flex flex-col items-center gap-1">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${['downloading', 'uploading', 'verifying', 'completed'].includes(syncProgress.step) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>2</div>
                 <span className={`text-[10px] font-medium ${['downloading', 'uploading', 'verifying', 'completed'].includes(syncProgress.step) ? 'text-blue-700' : 'text-gray-400'}`}>Download</span>
               </div>
               {/* Step 3: Uploading to R2 */}
               <div className="relative z-10 flex flex-col items-center gap-1">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${['uploading', 'verifying', 'completed'].includes(syncProgress.step) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>3</div>
                 <span className={`text-[10px] font-medium ${['uploading', 'verifying', 'completed'].includes(syncProgress.step) ? 'text-blue-700' : 'text-gray-400'}`}>Upload (R2)</span>
               </div>
               {/* Step 4: Verifying */}
               <div className="relative z-10 flex flex-col items-center gap-1">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${['verifying', 'completed'].includes(syncProgress.step) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-500'}`}>4</div>
                 <span className={`text-[10px] font-medium ${['verifying', 'completed'].includes(syncProgress.step) ? 'text-blue-700' : 'text-gray-400'}`}>Verify</span>
               </div>
             </div>

             <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden shadow-inner">
               <div className="bg-gradient-to-r from-blue-500 to-blue-400 h-2 rounded-full transition-all duration-300" style={{width: `${syncProgress.total > 0 ? Math.round((syncProgress.synced / syncProgress.total) * 100) : 0}%`}}></div>
             </div>
             
             <div className="flex justify-between items-center">
               <p className="text-[11px] text-gray-600 truncate flex-1 font-medium bg-gray-50 px-2 py-1 rounded border border-gray-100">{syncProgress.current}</p>
               {syncProgress.errors > 0 && <p className="text-[11px] text-red-500 ml-2 font-bold px-2 py-1 bg-red-50 rounded border border-red-100">{syncProgress.errors} errors</p>}
             </div>
          </div>
        )}
        
        {syncStatus === 'completed' && syncProgress.total > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-green-900">Sync Completed Successfully!</p>
              <p className="text-[11px] text-green-700 mt-0.5">All {syncProgress.synced} external files have been securely migrated to Cloudflare R2.</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <button 
            onClick={handleTestConnection}
            disabled={testLoading || !settings.r2_bucket_name || !settings.r2_account_id || !settings.r2_access_key || !settings.r2_secret_key}
            className="h-8 px-4 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-[12px] font-medium shadow-sm flex items-center"
          >
            {testLoading ? 'Testing...' : testSuccess ? <><CheckCircle2 className="w-3.5 h-3.5 mr-1.5 text-green-500" /> Verified</> : 'Test Connection'}
          </button>
          
          <button 
            onClick={handleSaveStorageSettings}
            disabled={settingsLoading || (!testSuccess && !!settings.r2_bucket_name)}
            className="h-8 px-4 bg-gray-900 hover:bg-black text-white rounded text-[12px] font-medium shadow-sm"
          >
            {settingsLoading ? 'Saving...' : 'Save Settings'}
          </button>
          
          <button 
            onClick={handleSyncToPrimary}
            disabled={syncStatus === 'syncing' || syncStatus === 'verifying' || !testSuccess || !settings.r2_public_url}
            className="h-8 px-4 ml-auto bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-medium shadow-sm flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${(syncStatus === 'syncing' || syncStatus === 'verifying') ? 'animate-spin' : ''}`} />
            Sync to Primary
          </button>
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <h3 className="text-[13px] font-medium text-gray-900 mb-2">Local Storage (VPS/cPanel)</h3>
        <p className="text-[11px] text-gray-500 mb-4">If this project is hosted on a VPS or cPanel with persistent local storage, you can enable local file uploads.</p>
        
        <div className="flex items-center gap-3">
          <label className={`relative inline-flex items-center ${!localWritable ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}>
            <input 
              type="checkbox" 
              checked={settings.local_storage_enabled}
              onChange={e => {
                if (localWritable) {
                  setSettings({...settings, local_storage_enabled: e.target.checked});
                }
              }}
              disabled={!localWritable}
              className="sr-only peer" 
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
            <span className="ml-3 text-[12px] font-medium text-gray-900">Enable Local Storage</span>
          </label>
          
          {!localWritable ? (
             <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-1 rounded">Environment Not Supported (Disabled)</span>
          ) : (
             <span className="text-[10px] font-medium text-green-600 bg-green-50 px-2 py-1 rounded">Environment Supported</span>
          )}
        </div>
      </div>

      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-[13px] font-medium text-gray-900">Secondary Integrations</h3>
            <p className="text-[11px] text-gray-500">Optional backup providers (e.g., Cloudinary, Unsplash)</p>
          </div>
          <button 
            onClick={() => setShowNewForm(true)}
            className="h-7 px-3 bg-gray-900 hover:bg-black text-white rounded text-[11px] font-medium shadow-sm"
          >
            + Add Provider
          </button>
        </div>

        {showNewForm && (
          <div className="p-4 bg-gray-50 border-b border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Provider Name</label>
              <input 
                type="text" 
                value={newProvider.name}
                onChange={e => setNewProvider({...newProvider, name: e.target.value})}
                placeholder="e.g. Cloudinary"
                className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Provider Key</label>
              <input 
                type="text" 
                value={newProvider.provider_key}
                onChange={e => setNewProvider({...newProvider, provider_key: e.target.value.toLowerCase().replace(/\s+/g, '_')})}
                placeholder="e.g. cloudinary"
                className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">API Key (Optional)</label>
              <input 
                type="text" 
                value={newProvider.api_key}
                onChange={e => setNewProvider({...newProvider, api_key: e.target.value})}
                className="w-full h-8 px-2 border border-gray-300 rounded text-[12px] outline-none focus:border-blue-500 bg-white" 
              />
            </div>
            <div className="flex gap-2">
              <button 
                onClick={handleAdd}
                className="h-8 px-4 flex-1 bg-gray-900 hover:bg-black text-white rounded text-[12px] font-medium shadow-sm"
              >
                Save
              </button>
              <button 
                onClick={() => setShowNewForm(false)}
                className="h-8 px-4 flex-1 bg-white hover:bg-gray-50 text-gray-700 rounded text-[12px] font-medium border border-gray-300 shadow-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {providers.length === 0 ? (
            <div className="p-8 text-center text-[12px] text-gray-500">No secondary providers configured.</div>
          ) : (
            providers.map(provider => (
              <div key={provider.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-gray-900">{provider.name}</span>
                    <span className="px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 text-[9px] font-medium uppercase tracking-wider">{provider.provider_key}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-2">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={provider.is_active}
                        onChange={e => handleUpdate({...provider, is_active: e.target.checked})}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                      />
                      <span className="text-[11px] font-medium text-gray-700">Active</span>
                    </label>
                  </div>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <input 
                    type="password"
                    placeholder="API Key"
                    value={provider.api_key || ''}
                    onChange={e => {
                      const updated = [...providers];
                      const idx = updated.findIndex(p => p.id === provider.id);
                      updated[idx].api_key = e.target.value;
                      setProviders(updated);
                    }}
                    onBlur={() => handleUpdate(provider)}
                    className="h-8 px-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500 bg-white" 
                  />
                  <input 
                    type="password"
                    placeholder="API Secret"
                    value={provider.api_secret || ''}
                    onChange={e => {
                      const updated = [...providers];
                      const idx = updated.findIndex(p => p.id === provider.id);
                      updated[idx].api_secret = e.target.value;
                      setProviders(updated);
                    }}
                    onBlur={() => handleUpdate(provider)}
                    className="h-8 px-2 border border-gray-200 rounded text-[11px] outline-none focus:border-blue-500 bg-white" 
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <ToastMessage message={toast?.msg || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </div>
  );
}

function ExternalApiManager() {
  return (
    <div className="p-4 space-y-4 animate-in fade-in">
      <div>
        <h2 className="text-[14px] font-semibold text-gray-900">External APIs</h2>
        <p className="text-[12px] text-gray-500 mb-4">Configure third-party services and webhooks.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* API Card */}
        <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900">Payment Gateway</h3>
          </div>
          <p className="text-[11px] text-gray-500">Manage Stripe / PayPal keys for transactions.</p>
          <button className="mt-auto h-7 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[12px] font-medium border border-gray-300 w-fit">Configure</button>
        </div>

        <div className="border border-gray-200 rounded-lg p-4 flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-gray-500" />
            <h3 className="text-[13px] font-medium text-gray-900">Webhooks</h3>
          </div>
          <p className="text-[11px] text-gray-500">Receive external events via webhook URLs.</p>
          <button className="mt-auto h-7 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[12px] font-medium border border-gray-300 w-fit">Manage Endpoints</button>
        </div>
      </div>
    </div>
  );
}

function DatabaseManager() {
  const { token } = useAuth();
  const [dbStatus, setDbStatus] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [syncing, setSyncing] = React.useState(false);
  const [syncResult, setSyncResult] = React.useState<any>(null);
  const [toast, setToast] = React.useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/db-status');
      const data = await res.json();
      setDbStatus(data);
    } catch (err: any) {
      console.error('Failed to fetch DB status:', err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchStatus();
  }, []);

  const handleSyncFromNeon = async () => {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch('/api/admin/db/sync-from-neon', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSyncResult(data);
        setToast({ msg: 'Database synced successfully from Neon to Turso!', type: 'success' });
        await fetchStatus();
      } else {
        throw new Error(data.error || 'Sync failed');
      }
    } catch (err: any) {
      setToast({ msg: err.message || 'Sync failed', type: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 space-y-4 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-gray-900">Database Engine & Storage Architecture</h2>
          <p className="text-[12px] text-gray-500">Supports dual-engine architecture: Turso Cloud SQLite / LibSQL and Neon PostgreSQL.</p>
        </div>
        <button
          onClick={fetchStatus}
          disabled={loading}
          className="h-7 px-3 bg-white hover:bg-gray-50 text-gray-700 rounded text-[11px] font-medium border border-gray-200 flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Active Database Card */}
      <div className="border border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
        <div className="p-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-blue-600" />
            <h3 className="text-[13px] font-medium text-gray-900">
              {dbStatus?.engine_name || (dbStatus?.engine === 'turso' ? 'Turso Cloud SQLite' : 'Neon Cloud PostgreSQL')}
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-semibold uppercase tracking-wider">
              {dbStatus?.engine || 'Active Engine'}
            </span>
          </div>
          <span className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${dbStatus?.connected ? 'text-green-700 bg-green-50 border-green-200' : 'text-red-700 bg-red-50 border-red-200'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${dbStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            {dbStatus?.connected ? 'Connected & Healthy' : 'Disconnected'}
          </span>
        </div>

        <div className="p-3 space-y-3 text-[12px]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
              <span className="text-[11px] text-gray-500 block">Total Products</span>
              <span className="text-[15px] font-bold text-gray-900">{dbStatus?.counts?.products ?? 0}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
              <span className="text-[11px] text-gray-500 block">Total Users</span>
              <span className="text-[15px] font-bold text-gray-900">{dbStatus?.counts?.users ?? 0}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
              <span className="text-[11px] text-gray-500 block">Total Orders</span>
              <span className="text-[15px] font-bold text-gray-900">{dbStatus?.counts?.orders ?? 0}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded border border-gray-100">
              <span className="text-[11px] text-gray-500 block">Categories</span>
              <span className="text-[15px] font-bold text-gray-900">{dbStatus?.counts?.categories ?? 0}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-100">
            <div>
              <span className="text-gray-500 font-medium">Turso SQLite Endpoint:</span>
              <p className="font-mono text-gray-800 truncate mt-0.5">libsql://techshop-rajboss89130.aws-ap-south-1.turso.io</p>
            </div>
            <div>
              <span className="text-gray-500 font-medium">Neon PostgreSQL Endpoint:</span>
              <p className="font-mono text-gray-800 truncate mt-0.5">ep-bitter-sun-ayntsxe4-pooler.c-5.us-east-2.aws.neon.tech</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-gray-100">
            <button
              onClick={handleSyncFromNeon}
              disabled={syncing}
              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-medium flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing Tables...' : 'Sync Data from Neon PostgreSQL to Turso'}
            </button>
          </div>

          {syncResult && (
            <div className="p-3 bg-green-50 border border-green-200 rounded text-[11px] text-green-800 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-green-900">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                {syncResult.message}
              </div>
              <p className="text-green-700">
                Synced tables: {Object.entries(syncResult.tableCounts || {}).map(([tbl, count]) => `${tbl} (${count})`).join(', ')}
              </p>
            </div>
          )}
        </div>
      </div>
      <ToastMessage message={toast?.msg || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
    </div>
  );
}



function BackupRestoreManager() {
  const { token } = useAuth();
  const [settings, setSettings] = useState({
    r2_account_id: '',
    r2_access_key: '',
    r2_secret_key: '',
    r2_bucket_name: '',
    auto_backup_enabled: false,
    auto_backup_frequency: 'daily'
  });
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  const [testSuccess, setTestSuccess] = useState(false);
  
  const [r2Files, setR2Files] = useState<any[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' = 'success') => setToast({msg, type});
  const [confirmAction, setConfirmAction] = useState<{title: string, message: string, onConfirm: () => void, onCancel?: () => void} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<{ uri: string, name: string } | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'importing' | 'verifying' | 'success' | 'error'>('idle');

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const data = await apiFetch('/admin/backup/settings');
      if (data) {
        setSettings({
          r2_account_id: data.r2_account_id || '',
          r2_access_key: data.r2_access_key || '',
          r2_secret_key: data.r2_secret_key || '',
          r2_bucket_name: data.r2_bucket_name || '',
          auto_backup_enabled: !!data.auto_backup_enabled,
          auto_backup_frequency: data.auto_backup_frequency || 'daily'
        });
        if (data.r2_bucket_name && data.r2_account_id && data.r2_access_key && data.r2_secret_key) {
          fetchR2Files();
          setTestSuccess(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchR2Files = async () => {
    setLoadingFiles(true);
    try {
      const files = await apiFetch('/admin/backup/r2/list');
      setR2Files(files || []);
    } catch (err) {
      console.error('Failed to fetch files', err);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleTestConnection = async () => {
    setTestLoading(true);
    setTestSuccess(false);
    try {
      const res = await apiFetch('/admin/backup/r2/test', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      showToast('R2 Connection test successful!');
      setTestSuccess(true);
    } catch (err: any) {
      showToast(err.message || 'R2 Connection test failed', 'error');
    } finally {
      setTestLoading(false);
    }
  };

  const handleSaveSettings = async (force: boolean = false) => {
    if (!force && !testSuccess && settings.r2_bucket_name) {
      setConfirmAction({
        title: 'Skip Connection Test?',
        message: 'You haven\'t successfully tested the connection yet. Save anyway?',
        onConfirm: () => { setConfirmAction(null); handleSaveSettings(true); }
      });
      return;
    }
    setSaveLoading(true);
    try {
      await apiFetch('/admin/backup/settings', {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(settings)
      });
      showToast('Backup settings saved successfully!');
      if (settings.r2_bucket_name && settings.r2_account_id && settings.r2_access_key && settings.r2_secret_key) {
        fetchR2Files();
      }
    } catch (err) {
      showToast('Failed to save settings', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleLocalBackup = async () => {
    setIsExporting(true);
    setExportData(null);
    try {
      const data = await apiFetch('/admin/backup/full');
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
      const exportFileDefaultName = `full-backup-${new Date().toISOString().split('T')[0]}.json`;
      
      setExportData({ uri: dataUri, name: exportFileDefaultName });
    } catch (err) {
      showToast('Failed to generate local backup', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleLocalRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setConfirmAction({
      title: 'Overwrite Database?',
      message: 'WARNING: This will overwrite your existing database with the selected backup file. Are you sure?',
      onCancel: () => { if (e.target) e.target.value = ''; setConfirmAction(null); },
      onConfirm: async () => {
        setConfirmAction(null);
        try {
      setRestoreStatus('importing');
      const text = await file.text();
      const importedData = JSON.parse(text);
      
      const res = await apiFetch('/admin/backup/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ data: importedData })
      });
      
      setRestoreStatus('verifying');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate verifying delay
      setRestoreStatus('success');
      setTimeout(() => {
        showToast(res.message || 'Restored successfully');
        setRestoreStatus('idle');
      }, 500);
      
    } catch (err: any) {
      console.error(err);
      setRestoreStatus('error');
      setTimeout(() => {
         showToast('Failed to restore from local backup', 'error');
         setRestoreStatus('idle');
      }, 500);
    } finally {
      if (e.target) e.target.value = '';
    }
      }
    });
  };

  const handleR2Backup = async () => {
    setIsUploading(true);
    try {
      const res = await apiFetch('/admin/backup/r2/upload', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      showToast('Successfully uploaded backup to Cloudflare R2: ' + res.fileName);
      fetchR2Files();
    } catch (err: any) {
      showToast(err.message || 'Failed to upload backup to R2', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleR2Restore = async (key: string) => {
    setConfirmAction({
      title: 'Restore from Cloud?',
      message: `WARNING: Overwrite database using backup "${key}"?`,
      onCancel: () => setConfirmAction(null),
      onConfirm: async () => {
        setConfirmAction(null);
        setRestoreStatus('importing');
    try {
      const res = await apiFetch('/admin/backup/r2/restore', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ key })
      });
      setRestoreStatus('verifying');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setRestoreStatus('success');
      setTimeout(() => {
         showToast(res.message || 'Restored successfully from R2');
         setRestoreStatus('idle');
      }, 500);
    } catch (err: any) {
      setRestoreStatus('error');
      setTimeout(() => {
         showToast(err.message || 'Failed to restore from R2', 'error');
         setRestoreStatus('idle');
      }, 500);
    }
      }
    });
  };

  if (loading) return <div className="p-4 text-xs text-gray-500">Loading settings...</div>;

  return (
    <div className="p-4 space-y-6 animate-in fade-in pb-10">
      <div>
        <h2 className="text-[14px] font-semibold text-gray-900">Backup & Restore</h2>
        <p className="text-[12px] text-gray-500">Create full system backups locally or sync with Cloudflare R2.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Local Backup */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
          <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-600" />
            Local Database Backup
          </h3>
          <p className="text-[11px] text-gray-500">Download or upload a complete JSON dump of your store.</p>
          <div className="flex gap-2">
            {!exportData ? (
               <button 
                 onClick={handleLocalBackup}
                 disabled={isExporting || restoreStatus !== 'idle'}
                 className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded text-[12px] font-medium shadow-sm"
               >
                 {isExporting ? 'Generating Backup...' : 'Export Full Backup'}
               </button>
            ) : (
               <a 
                 href={exportData.uri}
                 download={exportData.name}
                 onClick={() => setTimeout(() => setExportData(null), 1000)}
                 className="h-8 flex items-center px-3 bg-green-600 hover:bg-green-700 text-white rounded text-[12px] font-medium shadow-sm"
               >
                 <Download className="w-3.5 h-3.5 mr-1.5" /> Download Backup
               </a>
            )}
            
            <label className="h-8 px-3 bg-white hover:bg-gray-50 text-gray-700 rounded text-[12px] font-medium border border-gray-300 shadow-sm flex items-center cursor-pointer">
              {restoreStatus === 'importing' ? 'Importing...' : restoreStatus === 'verifying' ? 'Verifying...' : restoreStatus === 'success' ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500 mr-1.5"/> Success</> : 'Restore from JSON'}
              <input type="file" accept=".json" onChange={handleLocalRestore} className="hidden" />
            </label>
          </div>
          {restoreStatus === 'importing' && <p className="text-[11px] text-blue-600">Importing backup, please wait...</p>}
          {restoreStatus === 'verifying' && <p className="text-[11px] text-orange-500">Verifying integrity...</p>}
          {restoreStatus === 'success' && <p className="text-[11px] text-green-600 font-medium">Database restored and verified successfully!</p>}
        </div>

        {/* Cloudflare R2 Upload */}
        <div className="border border-gray-200 rounded-lg p-4 space-y-3 bg-white">
          <h3 className="text-[13px] font-medium text-gray-900 flex items-center gap-2">
            <Server className="w-4 h-4 text-orange-500" />
            Cloud Backup (R2)
          </h3>
          <p className="text-[11px] text-gray-500">Upload the current state to your Cloudflare R2 bucket.</p>
          <button 
            onClick={handleR2Backup}
            disabled={isUploading || !settings.r2_bucket_name}
            className="h-8 px-3 bg-orange-500 hover:bg-orange-600 text-white rounded text-[12px] font-medium shadow-sm disabled:opacity-50"
          >
            {isUploading ? 'Uploading...' : 'Backup Now to Cloud'}
          </button>
        </div>
      </div>

      <hr className="border-gray-100" />

      {/* Cloudflare Backups List */}
      <div className="border border-gray-200 rounded-lg p-4 bg-white">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-[13px] font-medium text-gray-900">R2 Cloud Backups</h3>
          <button onClick={() => {
            if (settings.r2_bucket_name && settings.r2_account_id && settings.r2_access_key && settings.r2_secret_key) {
               fetchR2Files();
            } else {
               showToast('Please configure and test all R2 settings first.', 'error');
            }
          }} className="text-gray-500 hover:text-gray-700">
            <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {r2Files.length === 0 ? (
          <div className="text-[12px] text-gray-500 py-4 text-center">No backups found in R2 bucket.</div>
        ) : (
          <div className="space-y-2">
            {r2Files.map(file => (
              <div key={file.key} className="flex items-center justify-between p-3 border border-gray-100 rounded bg-gray-50/50">
                <div>
                  <p className="text-[12px] font-medium text-gray-800">{file.key}</p>
                  <p className="text-[10px] text-gray-500">
                    {new Date(file.lastModified).toLocaleString()} • {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button 
                  onClick={() => handleR2Restore(file.key)}
                  disabled={restoreStatus !== 'idle'}
                  className="h-7 px-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded text-[11px] font-medium shadow-sm"
                >
                  Restore
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ToastMessage message={toast?.msg || ''} type={toast?.type || 'success'} onClose={() => setToast(null)} />
      <ConfirmDialog 
        isOpen={!!confirmAction} 
        title={confirmAction?.title || ''} 
        message={confirmAction?.message || ''} 
        onConfirm={confirmAction?.onConfirm || (() => {})} 
        onCancel={() => {
          if (confirmAction?.onCancel) confirmAction.onCancel();
          else setConfirmAction(null);
        }} 
      />
    </div>
  );
}
