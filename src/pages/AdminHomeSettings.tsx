import React, { useState, useEffect } from 'react';
import { apiFetch } from '../api';
import { Plus, Edit2, Trash2, CheckCircle, XCircle, MoveUp, MoveDown, GripVertical } from 'lucide-react';

interface HomeSection {
  id: number;
  title: string;
  type: string;
  category_slug: string;
  sort_order: number;
  is_active: boolean;
  limit_count: number;
}

export default function AdminHomeSettings() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [uiSettings, setUiSettings] = useState({ home_grid_desktop: 4, home_grid_mobile: 2 });
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
    
    const newSections = [...sections];
    const draggedItem = newSections[draggedIdx];
    
    newSections.splice(draggedIdx, 1);
    newSections.splice(index, 0, draggedItem);
    
    // update sort orders
    const updated = newSections.map((sec, idx) => ({ ...sec, sort_order: idx + 1 }));
    setSections(updated);
    setDraggedIdx(index);
  };

  const handleDragEnd = async () => {
    setDraggedIdx(null);
    try {
      const items = sections.map((sec) => ({ id: sec.id, sort_order: sec.sort_order }));
      await apiFetch('/admin/home-sections/reorder', {
        method: 'POST',
        body: JSON.stringify({ items })
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<HomeSection | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    type: 'trending',
    category_slug: '',
    sort_order: 0,
    is_active: true,
    limit_count: 8
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [secData, uiData] = await Promise.all([
        apiFetch('/admin/home-sections'),
        apiFetch('/ui-settings')
      ]);
      setSections(secData);
      setUiSettings(uiData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUiSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiFetch('/admin/ui-settings', {
        method: 'PUT',
        body: JSON.stringify(uiSettings)
      });
      alert('UI Settings saved successfully');
    } catch (err) {
      alert('Failed to save UI settings');
    }
  };

  const handleOpenModal = (section?: HomeSection) => {
    if (section) {
      setEditingSection(section);
      setFormData({
        title: section.title,
        type: section.type,
        category_slug: section.category_slug || '',
        sort_order: section.sort_order || 0,
        is_active: section.is_active,
        limit_count: section.limit_count || 8
      });
    } else {
      setEditingSection(null);
      setFormData({ title: '', type: 'trending', category_slug: '', sort_order: sections.length, is_active: true, limit_count: 8 });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingSection) {
        await apiFetch(`/admin/home-sections/${editingSection.id}`, {
          method: 'PUT',
          body: JSON.stringify(formData)
        });
      } else {
        await apiFetch('/admin/home-sections', {
          method: 'POST',
          body: JSON.stringify(formData)
        });
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err) {
      alert('Failed to save section');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this section?')) return;
    try {
      await apiFetch(`/admin/home-sections/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed to delete section');
    }
  };

  if (loading) return <div className="p-4 text-[13px]">Loading home settings...</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <h2 className="text-[14px] font-bold text-slate-800">Global Grid Layout (Desktop & Mobile)</h2>
          <p className="text-[11px] text-slate-500">Configure how many product cards show per row globally.</p>
        </div>
        <form onSubmit={handleUiSettingsSubmit} className="p-4 grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Desktop Columns</label>
            <select value={uiSettings.home_grid_desktop} onChange={e => setUiSettings({...uiSettings, home_grid_desktop: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="3">3 Columns</option>
              <option value="4">4 Columns</option>
              <option value="5">5 Columns</option>
              <option value="6">6 Columns</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">Mobile Columns</label>
            <select value={uiSettings.home_grid_mobile} onChange={e => setUiSettings({...uiSettings, home_grid_mobile: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
              <option value="1">1 Column</option>
              <option value="2">2 Columns</option>
            </select>
          </div>
          <div>
            <button type="submit" className="w-full px-3 py-1.5 bg-slate-900 text-white text-[12px] font-semibold rounded hover:bg-slate-800 transition-colors">
              Save Grid Settings
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-[14px] font-bold text-slate-800">Dynamic Home Sections</h2>
            <p className="text-[11px] text-slate-500">Manage categories, trending, and best-selling product sections on the home page.</p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-[12px] font-semibold rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Section
          </button>
        </div>
        
        <table className="w-full text-left text-[12px]">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase">
            <tr>
              <th className="px-3 py-2.5">Title</th>
              <th className="px-3 py-2.5">Type / Source</th>
              <th className="px-3 py-2.5">Limit</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-3 py-2.5">Order</th>
              <th className="px-3 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sections.map((section, index) => (
              <tr key={section.id} className="hover:bg-slate-50 transition-colors cursor-move group" draggable onDragStart={(e) => handleDragStart(e, index)} onDragOver={(e) => { e.preventDefault(); handleDragOver(index); }} onDragEnd={handleDragEnd}>
                <td className="px-3 py-2 font-semibold text-slate-800 flex items-center gap-2"><GripVertical className="w-4 h-4 text-slate-400 group-hover:text-slate-600" /> {section.title}</td>
                <td className="px-3 py-2">
                  <span className="capitalize font-medium text-indigo-600">{section.type.replace('_', ' ')}</span>
                  {section.type === 'category' && <div className="text-[10px] text-slate-500 bg-slate-100 px-1 py-0.5 inline-block rounded mt-0.5">Slug: {section.category_slug}</div>}
                </td>
                <td className="px-3 py-2 font-medium">{section.limit_count}</td>
                <td className="px-3 py-2">
                  {section.is_active ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-700">
                      <CheckCircle className="w-3 h-3" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-slate-500">{section.sort_order}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleOpenModal(section)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleDelete(section.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {sections.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-slate-500">No dynamic sections added yet. The 'All Products' section is permanent and always visible.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <h2 className="text-[14px] font-bold text-slate-800">{editingSection ? 'Edit Section' : 'Add Section'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Section Title *</label>
                <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Content Type</label>
                  <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none">
                    <option value="trending">Trending (Random/Popular)</option>
                    <option value="best_selling">Best Selling</option>
                    <option value="category">Specific Category</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Product Limit</label>
                  <input type="number" required value={formData.limit_count} onChange={e => setFormData({...formData, limit_count: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              {formData.type === 'category' && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Category Slug *</label>
                  <input type="text" required={formData.type === 'category'} placeholder="e.g. electronics" value={formData.category_slug} onChange={e => setFormData({...formData, category_slug: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
                </div>
              )}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Sort Order (Lower appears first)</label>
                <input type="number" value={formData.sort_order} onChange={e => setFormData({...formData, sort_order: parseInt(e.target.value)})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} className="rounded text-blue-600" />
                <label htmlFor="isActive" className="text-[12px] font-medium text-slate-700">Section is Active</label>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-3 py-1.5 text-[12px] font-semibold text-slate-600 bg-slate-100 rounded hover:bg-slate-200">Cancel</button>
                <button type="submit" className="px-3 py-1.5 text-[12px] font-semibold text-white bg-blue-600 rounded hover:bg-blue-700">Save Section</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
