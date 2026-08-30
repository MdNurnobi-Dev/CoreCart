import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Search, Edit, Trash2, Filter, Upload, Download, X, Layers, AlertTriangle, Boxes, ShieldAlert, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Pagination from '../components/Pagination';
import LazyImage, { DEFAULT_PRODUCT_IMAGE } from '../components/LazyImage';
import ConfirmDialog from '../components/ConfirmDialog';
import { PRODUCT_TYPE_OPTIONS, getProductTypeConfig } from '../types/product';

export default function AdminProducts() {
  const { settings } = useSettings();
  const currency = settings?.currency_symbol || '$';
  const { token } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'out_of_stock' | 'in_stock'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [adjustingStockId, setAdjustingStockId] = useState<number | null>(null);
  
  const [exportState, setExportState] = useState<'idle' | 'processing' | 'ready'>('idle');
  const [exportProgress, setExportProgress] = useState(0);
  const [exportDownloadData, setExportDownloadData] = useState<{uri: string, filename: string} | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<any>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const data = await apiFetch('/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStockAdjust = async (id: number, delta: number) => {
    try {
      setAdjustingStockId(id);
      await apiFetch(`/admin/products/${id}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ adjust_by: delta })
      });
      await fetchProducts();
    } catch (err) {
      console.error('Failed to update stock:', err);
      alert('Failed to update stock');
    } finally {
      setAdjustingStockId(null);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Product',
      message: 'Are you sure you want to permanently delete this product? This action cannot be undone.',
      onConfirm: async () => {
        try {
          await apiFetch(`/admin/products/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          fetchProducts();
        } catch (err) {
          console.error(err);
          alert('Failed to delete product');
        }
        setConfirmDialog(null);
      }
    });
  };

  const categories = useMemo(() => {
    const catMap = new Map<string, string>();
    products.forEach(p => {
      const name = (p.category || '').trim();
      if (name) {
        const lower = name.toLowerCase();
        if (!catMap.has(lower)) {
          catMap.set(lower, name);
        }
      }
    });
    return Array.from(catMap.values());
  }, [products]);

  const lowStockCount = useMemo(() => {
    return products.filter(p => {
      const stock = Number(p.stock ?? 0);
      const threshold = Number(p.low_stock_threshold ?? 5);
      return stock <= threshold;
    }).length;
  }, [products]);

  const outOfStockCount = useMemo(() => {
    return products.filter(p => Number(p.stock ?? 0) === 0).length;
  }, [products]);

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || (product.category || '').toLowerCase().includes(search.toLowerCase());
    const matchesCategory = categoryFilter ? product.category === categoryFilter : true;
    const matchesType = productTypeFilter ? (product.product_type || 'physical') === productTypeFilter : true;
    
    const stock = Number(product.stock ?? 0);
    const threshold = Number(product.low_stock_threshold ?? 5);
    let matchesStock = true;
    if (stockFilter === 'low_stock') {
      matchesStock = stock <= threshold && stock > 0;
    } else if (stockFilter === 'out_of_stock') {
      matchesStock = stock === 0;
    } else if (stockFilter === 'in_stock') {
      matchesStock = stock > threshold;
    }

    return matchesSearch && matchesCategory && matchesType && matchesStock;
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const currentProducts = filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleExport = () => {
    if (products.length === 0) return alert('No products to export');
    
    setExportState('processing');
    setExportProgress(0);

    // Simulate export processing time
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5; // increment by 5-20%
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        // Finalize data preparation
        const exportData = products.map(p => ({
          name: p.name,
          slug: p.slug,
          category: p.category,
          product_type: p.product_type || 'physical',
          price: p.price,
          sale_price: p.sale_price,
          original_price: p.original_price,
          stock: p.stock,
          low_stock_threshold: p.low_stock_threshold,
          description: p.description,
          features: p.features,
          specifications: p.specifications,
          image_url: p.image_url,
          images: p.images
        }));
        
        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        const exportFileDefaultName = `products-export-${new Date().toISOString().split('T')[0]}.json`;
        
        setExportDownloadData({ uri: dataUri, filename: exportFileDefaultName });
        setExportState('ready');
      }
      setExportProgress(progress);
    }, 400); // Update every 400ms
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedProducts = JSON.parse(text);
      
      if (!Array.isArray(importedProducts)) {
        return alert('Invalid JSON format. Expected an array of products.');
      }

      setLoading(true);
      for (const prod of importedProducts) {
        await apiFetch('/admin/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(prod)
        });
      }

      alert('Products imported successfully!');
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Failed to import products. Check the file format.');
    } finally {
      setLoading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-[16px] font-bold tracking-tight text-gray-900">Products Catalog</h1>
          <p className="text-[12px] text-gray-500">Manage catalog inventory, stock thresholds, and listings</p>
        </div>
        <div className="flex items-center gap-2">
          <Link 
            to="/admin/product/new" 
            className="inline-flex items-center justify-center h-[32px] px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-[12px] transition-colors shadow-2xs gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Product</span>
          </Link>
        </div>
      </div>

      {/* Stock Health Badges / Filter Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => { setStockFilter('all'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors cursor-pointer shrink-0 ${
            stockFilter === 'all'
              ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          }`}
        >
          All Items ({products.length})
        </button>
        <button
          type="button"
          onClick={() => { setStockFilter('low_stock'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            stockFilter === 'low_stock'
              ? 'bg-amber-500 text-white border-amber-500 shadow-2xs'
              : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
          }`}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>Low Stock ({lowStockCount})</span>
        </button>
        <button
          type="button"
          onClick={() => { setStockFilter('out_of_stock'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-md text-[11.5px] font-semibold border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            stockFilter === 'out_of_stock'
              ? 'bg-rose-600 text-white border-rose-600 shadow-2xs'
              : 'bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100'
          }`}
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Out of Stock ({outOfStockCount})</span>
        </button>
        <button
          type="button"
          onClick={() => { setStockFilter('in_stock'); setCurrentPage(1); }}
          className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium border transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            stockFilter === 'in_stock'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
              : 'bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100'
          }`}
        >
          <CheckCircle className="w-3 h-3" />
          <span>Optimal Stock ({Math.max(0, products.length - lowStockCount)})</span>
        </button>
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-gray-200 rounded-[10px] shadow-2xs overflow-hidden flex flex-col">
        {/* Action / Search Bar */}
        <div className="p-3 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 bg-gray-50/50">
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto flex-1">
            <div className="relative w-full sm:max-w-[150px]">
              <Filter className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
              <select 
                value={categoryFilter} 
                onChange={(e) => { setCategoryFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-200 rounded-lg h-[30px] pl-8 pr-6 text-[12px] text-gray-900 focus:border-[#38BDF8] outline-none appearance-none cursor-pointer"
              >
                <option value="">All Categories</option>
                {categories.map((cat, idx) => (
                  <option key={`cat-filter-${idx}`} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:max-w-[150px]">
              <Layers className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-500" />
              <select 
                value={productTypeFilter}
                onChange={(e) => { setProductTypeFilter(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-200 rounded-lg h-[30px] pl-8 pr-6 text-[12px] text-gray-900 focus:border-[#38BDF8] outline-none appearance-none cursor-pointer"
              >
                <option value="">All Types</option>
                {PRODUCT_TYPE_OPTIONS.map((opt) => (
                  <option key={`type-filter-${opt.id}`} value={opt.id}>
                    {opt.icon} {opt.shortLabel}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative w-full sm:max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-gray-500" />
              <input 
                type="text" 
                placeholder="Search by name or category..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full bg-white border border-gray-200 rounded-lg h-[30px] pl-8 pr-3 text-[12px] text-gray-900 placeholder-[#8B949E] focus:border-[#38BDF8] outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button 
              onClick={handleExport}
              className="inline-flex items-center justify-center h-[30px] px-3 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium text-[12px] hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-2xs gap-1.5 cursor-pointer"
              title="Export Products (JSON)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <label 
              className="inline-flex items-center justify-center h-[30px] px-3 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium text-[12px] hover:bg-gray-50 hover:text-gray-900 transition-colors shadow-2xs gap-1.5 cursor-pointer"
              title="Import Products (JSON)"
            >
              <Upload className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Import</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImport} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-[12px] text-gray-500">
            <thead className="bg-gray-50 border-b border-gray-200 text-[11px] uppercase tracking-wider text-gray-500 font-semibold">
              <tr>
                <th className="px-3 py-2 w-12">Image</th>
                <th className="px-3 py-2">Product Name</th>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Price</th>
                <th className="px-3 py-2">Stock / Threshold</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    Loading products...
                  </td>
                </tr>
              ) : currentProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              ) : (
                currentProducts.map(product => {
                  const typeCfg = getProductTypeConfig(product.product_type);
                  const stock = Number(product.stock ?? 0);
                  const threshold = Number(product.low_stock_threshold ?? 5);
                  const isOut = stock === 0;
                  const isLow = stock <= threshold;

                  return (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2">
                        <div className="w-8 h-8 rounded-md bg-white border border-gray-200 overflow-hidden shrink-0">
                          <LazyImage 
                            src={product.image_url} 
                            alt={product.name} 
                            fallbackSrc={DEFAULT_PRODUCT_IMAGE}
                            className="w-full h-full object-cover" 
                            containerClassName="w-full h-full"
                            showBadgeOnError={false}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        <div>{product.name}</div>
                        {product.slug && (
                          <div className="text-[10px] text-blue-600 font-mono mt-0.5">
                            <Link to={`/product/${product.slug}`} target="_blank" className="hover:underline flex items-center gap-1">
                              <span>/product/{product.slug}</span>
                            </Link>
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-flex px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 border border-gray-200 text-[10px] font-medium">
                          {product.category || 'General'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-medium ${typeCfg.badgeBg} ${typeCfg.badgeText} ${typeCfg.badgeBorder}`}>
                          <span>{typeCfg.icon}</span>
                          <span>{typeCfg.shortLabel}</span>
                        </span>
                      </td>
                      <td className="px-3 py-2 font-medium text-gray-900">
                        {product.sale_price && Number(product.sale_price) > 0 && Number(product.sale_price) < Number(product.price) ? (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-emerald-600">
                                {currency}{(Number(product.sale_price)).toFixed(2)}
                              </span>
                              <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded">
                                {Math.round(((Number(product.price) - Number(product.sale_price)) / Number(product.price)) * 100)}% OFF
                              </span>
                            </div>
                            <span className="text-[11px] text-gray-400 line-through">
                              {currency}{(Number(product.price)).toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <span>{currency}{(Number(product.price)).toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-700' : 'text-slate-800'}`}>
                                {stock} units
                              </span>
                              {isOut ? (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-200 rounded">
                                  Out of Stock
                                </span>
                              ) : isLow ? (
                                <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 rounded flex items-center gap-0.5">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600" /> Low (≤{threshold})
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Alert at ≤ {threshold}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              disabled={adjustingStockId === product.id}
                              onClick={() => handleQuickStockAdjust(product.id, 5)}
                              className="px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-200 cursor-pointer disabled:opacity-50"
                              title="Add +5 units"
                            >
                              +5
                            </button>
                            <button
                              type="button"
                              disabled={adjustingStockId === product.id}
                              onClick={() => handleQuickStockAdjust(product.id, 10)}
                              className="px-1.5 py-0.5 text-[10px] font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200 cursor-pointer disabled:opacity-50"
                              title="Add +10 units"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right space-x-1.5">
                        <Link 
                          to={`/admin/product/edit/${product.id}`}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-white border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 transition-colors"
                          title="Edit product"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </Link>
                        <button 
                          onClick={() => handleDelete(product.id)}
                          className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                          title="Delete product"
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
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={setCurrentPage} 
          totalItems={filteredProducts.length} 
          itemsPerPage={itemsPerPage} 
        />
      </div>

      {/* Sticky Export Progress UI */}
      {exportState !== 'idle' && (
        <div className="fixed bottom-6 right-6 bg-white border border-gray-200 shadow-[0_8px_30px_rgb(0,0,0,0.12)] rounded-[12px] p-4 w-80 z-50 flex flex-col gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[14px] font-semibold text-gray-900">
              {exportState === 'processing' ? 'Preparing Export...' : 'Export Ready'}
            </h3>
            <button onClick={() => setExportState('idle')} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          {exportState === 'processing' ? (
            <div className="space-y-2">
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${exportProgress}%` }}
                />
              </div>
              <p className="text-[12px] text-gray-500 text-right">{exportProgress}% Complete</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-[12px] text-gray-500">Your product data has been successfully processed and is ready to download.</p>
              <a 
                href={exportDownloadData?.uri} 
                download={exportDownloadData?.filename}
                onClick={() => setTimeout(() => setExportState('idle'), 500)}
                className="flex items-center justify-center w-full gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-[13px] font-medium hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            </div>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
