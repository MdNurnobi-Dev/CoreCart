import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { AlertCircle, ChevronLeft, Loader2, Save, Upload, Link2, RefreshCw, Layers, PlusCircle, ExternalLink, Boxes, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from '../components/LazyImage';
import { slugify } from '../utils/slug';
import { PRODUCT_TYPE_OPTIONS, ProductType, getProductTypeConfig } from '../types/product';

export default function AdminProductForm() {
  const { id } = useParams();
  const isEditing = !!id;
  const navigate = useNavigate();
  const { token } = useAuth();
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';

  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState('');
  const [isCustomSlug, setIsCustomSlug] = useState(false);

  // Categories list state
  const [categoriesList, setCategoriesList] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [isCustomCategoryMode, setIsCustomCategoryMode] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: '',
    sale_price: '',
    category: '',
    product_type: 'physical' as ProductType,
    stock: '15',
    low_stock_threshold: '5',
    image_url: ''
  });
  
  const [specPairs, setSpecPairs] = useState([{ key: '', value: '' }]);

  // Load existing categories from DB
  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      let data: any[] = [];
      try {
        data = await apiFetch('/admin/categories');
      } catch {
        data = await apiFetch('/categories');
      }
      if (Array.isArray(data)) {
        setCategoriesList(data);
      }
    } catch (err) {
      console.error('Failed to load categories in product form:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (isEditing) {
      const fetchProduct = async () => {
        try {
          const data = await apiFetch(`/products/${id}`);
          setFormData({
            name: data.name,
            slug: data.slug || '',
            description: data.description || '',
            price: data.price !== undefined && data.price !== null ? String(data.price) : '',
            sale_price: data.sale_price !== undefined && data.sale_price !== null ? String(data.sale_price) : '',
            category: data.category || '',
            product_type: (data.product_type || 'physical') as ProductType,
            stock: data.stock !== undefined && data.stock !== null ? String(data.stock) : '15',
            low_stock_threshold: data.low_stock_threshold !== undefined && data.low_stock_threshold !== null ? String(data.low_stock_threshold) : '5',
            image_url: data.image_url || ''
          });
          if (data.slug) {
            setIsCustomSlug(true);
          }
          
          if (data.specs) {
            try {
              const parsed = typeof data.specs === 'string' ? JSON.parse(data.specs) : data.specs;
              const pairs = Object.keys(parsed).map(key => ({ key, value: parsed[key] }));
              if (pairs.length > 0) setSpecPairs(pairs);
            } catch (e) {
              // Ignore
            }
          }
        } catch (err) {
          console.error(err);
          alert('Product not found');
          navigate('/admin/products');
        } finally {
          setLoading(false);
        }
      };
      fetchProduct();
    }
  }, [id, isEditing, navigate]);

  const handleNameChange = (val: string) => {
    setFormData(prev => {
      const next = { ...prev, name: val };
      if (!isCustomSlug && (!isEditing || !prev.slug)) {
        next.slug = slugify(val);
      }
      return next;
    });
  };

  // Quick discount calculation helper
  const applyQuickDiscount = (percentage: number) => {
    const regular = parseFloat(formData.price);
    if (isNaN(regular) || regular <= 0) {
      alert('Please enter a valid regular price first.');
      return;
    }
    const discounted = regular * (1 - percentage / 100);
    setFormData(prev => ({
      ...prev,
      sale_price: (Math.round(discounted * 100) / 100).toFixed(2)
    }));
  };

  const adjustStock = (amount: number) => {
    const current = parseInt(formData.stock, 10) || 0;
    const next = Math.max(0, current + amount);
    setFormData(prev => ({ ...prev, stock: String(next) }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    
    try {
      if (!formData.category.trim()) {
        setError('Please select or enter a Category');
        setSaving(false);
        return;
      }

      const specsObj = specPairs.reduce((acc, pair) => {
        if (pair.key.trim()) acc[pair.key.trim()] = pair.value.trim();
        return acc;
      }, {} as Record<string, string>);

      const regularPrice = Number(formData.price);
      const salePriceNum = formData.sale_price ? Number(formData.sale_price) : null;
      const parsedStock = formData.stock !== '' && !isNaN(Number(formData.stock)) ? Math.max(0, parseInt(formData.stock, 10)) : 0;
      const parsedThreshold = formData.low_stock_threshold !== '' && !isNaN(Number(formData.low_stock_threshold)) ? Math.max(0, parseInt(formData.low_stock_threshold, 10)) : 5;

      const payload = {
        ...formData,
        category: formData.category.trim(),
        product_type: formData.product_type || 'physical',
        price: regularPrice,
        sale_price: salePriceNum !== null && !isNaN(salePriceNum) ? salePriceNum : null,
        stock: parsedStock,
        low_stock_threshold: parsedThreshold,
        specs: JSON.stringify(specsObj)
      };

      const url = isEditing ? `/admin/products/${id}` : '/admin/products';
      const method = isEditing ? 'PUT' : 'POST';

      await apiFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      navigate('/admin/products');
    } catch (err: any) {
      setError(err.message || 'Failed to save product');
    } finally {
      setSaving(false);
    }
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
      alert('Failed to upload image. Please ensure R2 is configured in the admin settings.');
    } finally {
      setUploadingImage(false);
    }
  };

  const updateSpec = (index: number, field: 'key' | 'value', val: string) => {
    const newPairs = [...specPairs];
    newPairs[index][field] = val;
    setSpecPairs(newPairs);
  };

  const addSpec = () => setSpecPairs([...specPairs, { key: '', value: '' }]);

  const removeSpec = (index: number) => {
    const newPairs = [...specPairs];
    newPairs.splice(index, 1);
    setSpecPairs(newPairs);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  const currentTypeConfig = getProductTypeConfig(formData.product_type);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link 
          to="/admin/products"
          className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <ChevronLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-[16px] font-semibold tracking-tight text-gray-900">
            {isEditing ? 'Edit Product' : 'Add New Product'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-[12px] shadow-sm overflow-hidden">
        {error && (
          <div className="m-3 mb-0 bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded-lg text-[12px] font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}
        
        <div className="p-3.5 space-y-3.5">
          {/* Top Row: Name & Category */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">
                Product Name <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="text"
                value={formData.name || ''}
                onChange={e => handleNameChange(e.target.value)}
                className="w-full bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                placeholder="e.g. MacBook Pro M3 Max"
              />
            </div>

            {/* Category Field with List Dropdown from Categories Page */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[12px] font-medium text-gray-700">
                  Category <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCustomCategoryMode(!isCustomCategoryMode)}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                  >
                    {isCustomCategoryMode ? '← Select from List' : '+ Enter Custom'}
                  </button>
                  <Link
                    to="/admin/categories"
                    target="_blank"
                    className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-0.5"
                    title="Manage Categories in new tab"
                  >
                    <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </div>

              {isCustomCategoryMode ? (
                <div className="flex items-center gap-1.5">
                  <input
                    required
                    type="text"
                    value={formData.category || ''}
                    onChange={e => setFormData({...formData, category: e.target.value})}
                    className="flex-1 bg-white border border-blue-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                    placeholder="Type custom category (e.g. Smart Home)"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomCategoryMode(false)}
                    className="h-[30px] px-2 text-[11px] bg-slate-100 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <select
                    required
                    value={formData.category || ''}
                    onChange={e => {
                      if (e.target.value === '__custom__') {
                        setIsCustomCategoryMode(true);
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 focus:border-[#38BDF8] outline-none cursor-pointer"
                  >
                    <option value="" disabled>-- Select a Category from Categories List --</option>
                    {categoriesList.map(cat => (
                      <option key={`cat-opt-${cat.id || cat.slug || cat.name}`} value={cat.name}>
                        📁 {cat.name}
                      </option>
                    ))}
                    {formData.category && !categoriesList.some(c => c.name?.toLowerCase() === formData.category?.toLowerCase()) && (
                      <option value={formData.category}>
                        📌 Current: {formData.category}
                      </option>
                    )}
                    <option value="__custom__">➕ Add / Type New Custom Category...</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Product Type Feature Section */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[12px] font-semibold text-slate-800">Product Type</span>
              </div>
              <span className="text-[10px] text-slate-500">
                Determines fulfillment mode & storefront tags
              </span>
            </div>

            {/* Visual Type Selector Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {PRODUCT_TYPE_OPTIONS.map((typeOpt) => {
                const isSelected = (formData.product_type || 'physical') === typeOpt.id;
                return (
                  <button
                    key={typeOpt.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, product_type: typeOpt.id })}
                    className={`flex flex-col items-start p-2 rounded-lg border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-blue-50/80 border-blue-500 shadow-2xs ring-1 ring-blue-400/40'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="text-[14px] leading-none">{typeOpt.icon}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0"></span>
                      )}
                    </div>
                    <span className={`text-[11px] font-semibold ${isSelected ? 'text-blue-900' : 'text-slate-800'} line-clamp-1`}>
                      {typeOpt.shortLabel}
                    </span>
                    <span className="text-[9px] text-slate-500 mt-0.5 line-clamp-1">
                      {typeOpt.deliveryTag}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Selected Type Detailed Helper Hint */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-200/70 text-[11px] text-slate-600">
              <span className="font-semibold text-slate-700">{currentTypeConfig.icon} {currentTypeConfig.label}:</span>
              <span className="text-slate-500">{currentTypeConfig.description}</span>
            </div>
          </div>

          {/* SEO URL Slug */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-[12px] font-medium text-gray-700">
                SEO Friendly URL Slug
              </label>
              <button
                type="button"
                onClick={() => {
                  setFormData(prev => ({ ...prev, slug: slugify(prev.name) }));
                  setIsCustomSlug(false);
                }}
                className="text-[11px] text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Auto-generate from Name
              </button>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex-1 flex items-center bg-slate-50 border border-gray-300 rounded-lg h-[30px] px-2 focus-within:bg-white focus-within:border-[#38BDF8] transition-colors">
                <span className="text-[11px] text-slate-400 select-none pr-1">/product/</span>
                <input
                  type="text"
                  value={formData.slug || ''}
                  onChange={e => {
                    setIsCustomSlug(true);
                    setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[\s_]+/g, '-') });
                  }}
                  className="w-full bg-transparent text-[12px] text-gray-900 placeholder-gray-400 outline-none"
                  placeholder="e.g. macbook-pro-m3-max"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Live URL: <code className="text-blue-600 font-mono">/product/{formData.slug || slugify(formData.name) || 'product-slug'}</code>
            </p>
          </div>
          
          {/* Pricing & Automatic Discount Engine */}
          <div className="bg-slate-50/80 border border-slate-200/90 rounded-lg p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-semibold text-slate-800 flex items-center gap-1.5">
                Pricing & Offer Discounts
              </span>
              <span className="text-[10px] text-slate-500">
                Setting Sale Price auto-applies discount badge on storefront
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Regular Price (MRP) ({currency}) <span className="text-red-500">*</span>
                </label>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price || ''}
                  onChange={e => setFormData({...formData, price: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg h-[30px] px-2.5 text-[12px] font-medium text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                  placeholder="e.g. 199.99"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Sale / Offer Price ({currency}) <span className="text-slate-400 font-normal">(Optional)</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.sale_price || ''}
                  onChange={e => setFormData({...formData, sale_price: e.target.value})}
                  className="w-full bg-white border border-gray-300 rounded-lg h-[30px] px-2.5 text-[12px] font-medium text-emerald-700 placeholder-gray-400 focus:border-emerald-500 outline-none"
                  placeholder="e.g. 149.99 (Discounted price)"
                />
              </div>
            </div>

            {/* Quick Discount Percent Shortcut Buttons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-medium text-slate-600">Quick Auto-Calculate Discount:</span>
                {formData.sale_price && (
                  <button 
                    type="button" 
                    onClick={() => setFormData({...formData, sale_price: ''})}
                    className="text-[10px] text-slate-500 hover:text-red-600 underline cursor-pointer"
                  >
                    Clear Sale Price
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[5, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => applyQuickDiscount(pct)}
                    className="px-2 py-0.5 rounded bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-200 hover:border-blue-300 text-[11px] font-medium transition-colors cursor-pointer shadow-2xs"
                  >
                    {pct}% OFF
                  </button>
                ))}
              </div>
            </div>

            {/* Auto Discount Preview Badge */}
            {(() => {
              const reg = parseFloat(formData.price);
              const sale = parseFloat(formData.sale_price);
              if (!isNaN(reg) && reg > 0 && !isNaN(sale) && sale > 0) {
                if (sale < reg) {
                  const saveAmount = reg - sale;
                  const discountPercent = Math.round((saveAmount / reg) * 100);
                  return (
                    <div className="flex items-center gap-2 p-2 bg-emerald-50/90 border border-emerald-200 rounded-md text-[11px] text-emerald-800">
                      <span className="font-bold bg-emerald-600 text-white text-[10px] px-1.5 py-0.5 rounded shadow-2xs">
                        {discountPercent}% OFF
                      </span>
                      <span>
                        Customer saves <strong>{currency}{saveAmount.toFixed(2)}</strong>! Displayed as <span className="line-through text-slate-400">{currency}{reg.toFixed(2)}</span> <strong className="text-emerald-700">{currency}{sale.toFixed(2)}</strong>
                      </span>
                    </div>
                  );
                } else if (sale > reg) {
                  return (
                    <div className="p-2 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800">
                      ⚠️ Note: Sale price ({currency}{sale.toFixed(2)}) is higher than regular price ({currency}{reg.toFixed(2)}).
                    </div>
                  );
                }
              }
              return null;
            })()}
          </div>

          {/* Inventory & Low-Stock Alert Threshold Section */}
          <div className="bg-slate-50/90 border border-slate-200 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                <span className="text-[12px] font-semibold text-slate-800">Inventory & Low-Stock Alerts</span>
              </div>
              
              {/* Real-time stock status badge */}
              {(() => {
                const stockNum = parseInt(formData.stock, 10) || 0;
                const thresholdNum = parseInt(formData.low_stock_threshold, 10) || 5;
                if (stockNum === 0) {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                      <ShieldAlert className="w-3 h-3 text-rose-600" /> Out of Stock (0)
                    </span>
                  );
                } else if (stockNum <= thresholdNum) {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                      <AlertTriangle className="w-3 h-3 text-amber-600" /> Low Stock Alert ({stockNum} left)
                    </span>
                  );
                } else {
                  return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock ({stockNum})
                    </span>
                  );
                }
              })()}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Current Stock Quantity */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Current Stock Quantity <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Units available</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    className="flex-1 bg-white border border-gray-300 rounded-lg h-[30px] px-2.5 text-[12px] font-semibold text-gray-900 focus:border-indigo-500 outline-none"
                    placeholder="e.g. 25"
                  />
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => adjustStock(5)}
                      className="px-1.5 h-[30px] rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                      title="Add 5 units"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustStock(10)}
                      className="px-1.5 h-[30px] rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
                      title="Add 10 units"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustStock(-5)}
                      disabled={(parseInt(formData.stock, 10) || 0) < 5}
                      className="px-1.5 h-[30px] rounded bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer disabled:opacity-40"
                      title="Remove 5 units"
                    >
                      -5
                    </button>
                  </div>
                </div>
              </div>

              {/* Low-Stock Alert Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-medium text-slate-700">
                    Low-Stock Alert Threshold <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-amber-600 font-medium">Triggers dashboard badge</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    value={formData.low_stock_threshold}
                    onChange={e => setFormData({ ...formData, low_stock_threshold: e.target.value })}
                    className="flex-1 bg-white border border-gray-300 rounded-lg h-[30px] px-2.5 text-[12px] font-semibold text-amber-800 focus:border-amber-500 outline-none"
                    placeholder="e.g. 5"
                  />
                  <div className="flex items-center gap-1">
                    {[3, 5, 10].map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setFormData({ ...formData, low_stock_threshold: String(val) })}
                        className={`px-1.5 h-[30px] rounded border text-[11px] font-medium transition-colors cursor-pointer ${
                          formData.low_stock_threshold === String(val)
                            ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                            : 'bg-white hover:bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-[10.5px] text-slate-500 bg-white/70 p-2 rounded border border-slate-200/80">
              💡 <strong>How it works:</strong> When available stock falls to or below <span className="text-amber-700 font-semibold">{formData.low_stock_threshold || '5'} units</span>, an alert notification badge automatically displays on the Admin Dashboard and Products navigation to prompt a restock.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-1 gap-3">
            <div>
              <label className="block text-[12px] font-medium text-gray-700 mb-1">Image URL</label>
              <div className="flex items-center gap-2">
                <input
                  required
                  type="url"
                  value={formData.image_url || ''}
                  onChange={e => setFormData({...formData, image_url: e.target.value})}
                  className="flex-1 bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                  placeholder="URL or Upload ->"
                />
                <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploadingImage}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                  />
                  <button type="button" disabled={uploadingImage} className="h-[30px] bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 rounded-lg px-3 text-[12px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    {uploadingImage ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {formData.image_url && (
            <div className="w-16 h-16 rounded-lg border border-gray-200 overflow-hidden bg-white shrink-0">
              <LazyImage 
                src={formData.image_url} 
                alt="Preview" 
                fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                className="w-full h-full object-cover" 
                containerClassName="w-full h-full"
                showBadgeOnError={false}
              />
            </div>
          )}

          <div>
            <label className="block text-[12px] font-medium text-gray-700 mb-1">Description</label>
            <textarea
              required
              rows={4}
              value={formData.description || ''}
              onChange={e => setFormData({...formData, description: e.target.value})}
              className="w-full bg-white border border-gray-300 rounded-lg p-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
              placeholder="Detailed product description..."
            />
          </div>

          <div className="pt-2 border-t border-gray-100">
            <label className="block text-[12px] font-medium text-gray-700 mb-2">Specifications (Key-Value)</label>
            <div className="space-y-2">
              {specPairs.map((pair, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={pair.key}
                    onChange={e => updateSpec(index, 'key', e.target.value)}
                    placeholder="e.g. Processor"
                    className="w-1/3 bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                  />
                  <input
                    type="text"
                    value={pair.value}
                    onChange={e => updateSpec(index, 'value', e.target.value)}
                    placeholder="e.g. M3 Pro 12-core"
                    className="flex-1 bg-white border border-gray-300 rounded-lg h-[30px] px-2 text-[12px] text-gray-900 placeholder-gray-400 focus:border-[#38BDF8] outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={() => removeSpec(index)}
                    className="h-[30px] px-3 text-[12px] font-medium text-gray-500 hover:text-red-600 bg-white hover:bg-red-50 rounded-lg border border-gray-200 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
              <button 
                type="button" 
                onClick={addSpec}
                className="text-[12px] font-medium text-[#2563EB] hover:text-[#1D4ED8]"
              >
                + Add Specification
              </button>
            </div>
          </div>
        </div>

        <div className="p-3.5 bg-gray-50 border-t border-gray-200 flex justify-end gap-2">
          <Link 
            to="/admin/products"
            className="h-[28px] px-4 rounded-lg font-medium text-gray-900 bg-white border border-gray-200 hover:bg-gray-50 transition-colors flex items-center text-[12px]"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving || uploadingImage}
            className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white h-[28px] px-6 rounded-lg text-[12px] font-medium transition-colors shadow-sm inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Product
          </button>
        </div>
      </form>
    </div>
  );
}

