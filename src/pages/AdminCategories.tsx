import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Loader2, Plus, Edit, Trash2, ChevronLeft, Save, Upload, Tag, Search, RefreshCw, CheckCircle2 } from 'lucide-react';
import Pagination from '../components/Pagination';
import LazyImage, { DEFAULT_BANNER_IMAGE } from '../components/LazyImage';
import { apiFetch } from '../lib/utils';
import ConfirmDialog from '../components/ConfirmDialog';

export default function AdminCategories() {
  const { user, token } = useAuth();
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  const [formData, setFormData] = useState<any>({ id: null, name: '', slug: '', description: '', image_url: '' });
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await apiFetch('/admin/categories');
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      // Fallback to public endpoint
      try {
        const publicData = await apiFetch('/categories');
        setCategories(Array.isArray(publicData) ? publicData : []);
      } catch (fallbackErr) {
        console.error('Categories fallback error:', fallbackErr);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCategories = async () => {
    try {
      setIsSyncing(true);
      const res = await apiFetch('/admin/categories/sync', {
        method: 'POST'
      });
      if (res && res.categories) {
        setCategories(res.categories);
      } else {
        await fetchCategories();
      }
    } catch (err) {
      console.error('Sync failed:', err);
      await fetchCategories();
    } finally {
      setIsSyncing(false);
    }
  };

  const handleEdit = (category: any) => {
    setFormData(category);
    setIsEditing(true);
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Category',
      message: 'Are you sure you want to delete this category? This will not delete the products inside it, but they will become uncategorized.',
      onConfirm: async () => {
        try {
          await apiFetch(`/admin/categories/${id}`, {
            method: 'DELETE'
          });
          setCategories(categories.filter(c => c.id !== id));
        } catch (err) {
          alert('Failed to delete category');
        }
        setConfirmDialog(null);
      }
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setUploadingImage(true);
    const form = new FormData();
    form.append('file', file);
    form.append('upload_preset', 'ml_default'); 
    
    try {
      const data = await apiFetch('/admin/upload-image', {
        method: 'POST',
        body: form,
      });
      setFormData({ ...formData, image_url: data.secure_url });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload image. Please ensure R2 is configured in the admin settings.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = formData.id ? `/admin/categories/${formData.id}` : '/admin/categories';
      const method = formData.id ? 'PUT' : 'POST';
      
      await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      setIsEditing(false);
      fetchCategories();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Failed to save category');
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    (c.name || '').toLowerCase().includes(search.toLowerCase()) || 
    (c.slug || '').toLowerCase().includes(search.toLowerCase())
  );
  
  const totalPages = Math.ceil(filteredCategories.length / itemsPerPage);
  const displayedCategories = filteredCategories.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  if (!user || user.role !== 'admin') return null;

  if (isEditing) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center gap-2.5">
          <button 
            onClick={() => setIsEditing(false)}
            className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-2xs cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-[16px] font-semibold tracking-tight text-gray-900">
              {formData.id ? 'Edit Category' : 'New Category'}
            </h1>
            
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-[12px] shadow-sm p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">Category Name</label>
              <input 
                type="text" 
                required
                value={formData.name || ''}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400"
                placeholder="e.g. Laptops"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">URL Slug</label>
              <input 
                type="text" 
                required
                value={formData.slug || ''}
                onChange={(e) => setFormData({...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-')})}
                className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400"
                placeholder="e.g. laptops"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Description</label>
            <textarea 
              rows={3}
              value={formData.description || ''}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400"
              placeholder="Category collection overview..."
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">Category Banner Image</label>
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                value={formData.image_url || ''}
                onChange={(e) => setFormData({...formData, image_url: e.target.value})}
                className="flex-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-[12px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400"
                placeholder="Image URL or upload via Cloudinary..."
              />
              <div className="relative">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <button type="button" disabled={uploadingImage} className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[12px] font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                  {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <span>{uploadingImage ? 'Uploading...' : 'Upload'}</span>
                </button>
              </div>
            </div>
            {formData.image_url && (
              <div className="mt-2.5 w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-white">
                <LazyImage 
                  src={formData.image_url} 
                  alt="Preview" 
                  fallbackSrc={DEFAULT_BANNER_IMAGE}
                  className="w-full h-full object-cover" 
                  containerClassName="w-full h-full"
                  showBadgeOnError={false}
                />
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[12px] font-medium transition-colors shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={saving || uploadingImage}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Category</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight text-gray-900">Categories</h1>
          
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleSyncCategories}
            disabled={isSyncing || loading}
            title="Auto-sync categories from existing products table"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-lg text-[12px] font-medium transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-blue-600' : 'text-gray-500'}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync with Products'}</span>
          </button>
          <button 
            onClick={() => {
              setFormData({ id: null, name: '', slug: '', description: '', image_url: '' });
              setIsEditing(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[12px] font-medium transition-colors shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" /> 
            <span>Add Category</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-white border border-gray-200 rounded-[12px] p-2.5 shadow-sm">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search categories by name or slug..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-[12px] text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors placeholder:text-gray-400"
          />
        </div>
        <div className="text-[11px] text-gray-500 font-medium">
          Total: <span className="font-semibold text-gray-900">{categories.length}</span> categories
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-gray-400 gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span className="text-[12px]">Loading categories from database...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12px] text-gray-700">
              <thead className="bg-gray-50/75 border-b border-gray-200 text-left text-[11px] font-medium text-gray-500 tracking-wider">
                <tr>
                  <th className="px-3 py-2">Category</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Products Count</th>
                  <th className="px-3 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-normal">
                {displayedCategories.map(cat => (
                  <tr key={cat.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md border border-gray-200 overflow-hidden shrink-0 bg-gray-50"> 
                          <LazyImage 
                            src={cat.image_url} 
                            alt={cat.name} 
                            fallbackSrc={DEFAULT_BANNER_IMAGE}
                            className="w-full h-full object-cover" 
                            containerClassName="w-full h-full"
                            showBadgeOnError={false}
                          />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-[12px]">{cat.name}</p>
                          <p className="text-[10.5px] text-gray-400 font-mono">/{cat.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-xs truncate text-[11.5px] text-gray-500">
                      {cat.description || 'No description provided.'}
                    </td>
                    <td className="px-3 py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {cat.product_count !== undefined ? cat.product_count : 0} items
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right space-x-1">
                      <button 
                        onClick={() => handleEdit(cat)}
                        title="Edit category"
                        className="p-1 text-gray-400 hover:text-blue-600 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={() => handleDelete(cat.id)}
                        title="Delete category"
                        className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {displayedCategories.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-400 text-[12px]">
                      No categories found in the database. Click "Sync with Products" to populate automatically.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
          totalItems={filteredCategories.length} 
          itemsPerPage={itemsPerPage} 
        />
      </div>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        title={confirmDialog?.title || ''}
        message={confirmDialog?.message || ''}
        onConfirm={confirmDialog?.onConfirm || (() => {})}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}

