import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, GripVertical, Upload, Loader2 } from 'lucide-react';
import LazyImage from '../components/LazyImage';

interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image_url: string;
  link_url: string;
  position: string;
  is_active: boolean;
  sort_order: number;
}

export default function AdminBanners() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIdx(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', '');
    e.dataTransfer.setDragImage(e.currentTarget as Element, 20, 20);
  };

  const handleDragOver = (index: number) => {
    if (draggedIdx === null || draggedIdx === index) return;
    
    const newBanners = [...banners];
    const draggedItem = newBanners[draggedIdx];
    
    newBanners.splice(draggedIdx, 1);
    newBanners.splice(index, 0, draggedItem);
    
    const updated = newBanners.map((ban, idx) => ({ ...ban, sort_order: idx + 1 }));
    setBanners(updated);
    setDraggedIdx(index);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    try {
      const items = banners.map((ban) => ({ id: ban.id, sort_order: ban.sort_order }));
      await apiFetch('/admin/banners/reorder', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      fetchBanners();
    } catch (err) {
      console.error(err);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);

  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    image_url: '',
    link_url: '',
    position: 'hero',
    is_active: true,
    sort_order: 0
  });

  useEffect(() => {
    fetchBanners();
  }, []);

  const fetchBanners = async () => {
    try {
      const data = await apiFetch('/admin/banners');
      setBanners(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (banner?: Banner) => {
    if (banner) {
      setEditingBanner(banner);
      setFormData({
        title: banner.title || '',
        subtitle: banner.subtitle || '',
        image_url: banner.image_url || '',
        link_url: banner.link_url || '',
        position: banner.position || 'hero',
        is_active: banner.is_active,
        sort_order: banner.sort_order || 0
      });
    } else {
      setEditingBanner(null);
      setFormData({ title: '', subtitle: '', image_url: '', link_url: '', position: 'hero', is_active: true, sort_order: 0 });
    }
    setIsModalOpen(true);
  };

  
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', {
        method: 'POST',
        body: form,
      });
      setFormData({ ...formData, image_url: data.secure_url });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBanner) {
        await apiFetch(`/admin/banners/${editingBanner.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiFetch('/admin/banners', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      fetchBanners();
    } catch (err) {
      alert('Failed to save banner');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this banner?')) return;
    try {
      await apiFetch(`/admin/banners/${id}`, { method: 'DELETE' });
      fetchBanners();
    } catch (err) {
      alert('Failed to delete banner');
    }
  };

  if (loading) return <div className="p-4 text-[13px]">Loading banners...</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-[16px] font-bold text-slate-800">Banners Management</h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Add Banner
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-[12px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
            <tr>
              <th className="px-3 py-2.5">Image</th>
              <th className="px-3 py-2.5">Details</th>
              <th className="px-3 py-2.5">Position</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {banners.map((banner, index) => (
              <tr key={banner.id} className="hover:bg-slate-50 transition-colors cursor-move group" draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }} onDragEnd={handleDragEnd}>
                <td className="px-3 py-2">
                  <LazyImage src={banner.image_url} alt={banner.title} className="w-16 h-10 object-cover rounded border border-slate-200" />
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-slate-800">{banner.title || '-'}</div>
                  <div className="text-[11px] text-slate-500">{banner.subtitle}</div>
                </td>
                <td className="px-3 py-2 capitalize font-medium">{banner.position}</td>
                <td className="px-3 py-2">
                  {banner.is_active ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(banner)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(banner.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {banners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-slate-500">No banners found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h2 className="text-[14px] font-bold text-slate-800">{editingBanner ? 'Edit Banner' : 'Add Banner'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Title</label>
                <input type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Subtitle</label>
                <input type="text" value={formData.subtitle} onChange={e => setFormData({...formData, subtitle: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Image URL *</label>
                <div className="flex items-center gap-2">
                  <input type="url" required value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="flex-1 px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Image URL..." />
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      disabled={uploadingImage}
                    />
                    <button 
                      type="button"
                      disabled={uploadingImage}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Link URL</label>
                <input type="text" value={formData.link_url} onChange={e => setFormData({...formData, link_url: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Position</label>
                  <select value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="hero">Hero (Top)</option>
                    <option value="bottom">Bottom</option>
                    <option value="promotional">Promotional Grid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sort Order</label>
                  <input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-blue-600" />
                <label htmlFor="isActive" className="text-[12px] font-medium text-slate-700">Active</label>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-[12px] font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-[12px] font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Banner</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
