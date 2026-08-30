import React from 'react';
import { useCompare } from '../context/CompareContext';
import { X, Trash2, CheckCircle, Info } from 'lucide-react';
import LazyImage from './LazyImage';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CompareOverlay({ onClose }: { onClose: () => void }) {
  const { compareItems, removeFromCompare, clearCompare } = useCompare();
  const { addToCart } = useCart();

  // Collect all unique specs keys
  const allSpecsKeys = new Set<string>();
  compareItems.forEach(item => {
    if (item.specs) {
      let parsedSpecs = item.specs;
      if (typeof parsedSpecs === 'string') {
        try {
          parsedSpecs = JSON.parse(parsedSpecs);
        } catch(e) {}
      }
      if (typeof parsedSpecs === 'object' && parsedSpecs !== null) {
        Object.keys(parsedSpecs).forEach(key => allSpecsKeys.add(key));
      }
    }
  });
  const specsList = Array.from(allSpecsKeys);

  const getSpecValue = (item: any, key: string) => {
    if (!item.specs) return '-';
    let parsedSpecs = item.specs;
    if (typeof parsedSpecs === 'string') {
      try {
        parsedSpecs = JSON.parse(parsedSpecs);
      } catch(e) {}
    }
    return parsedSpecs[key] || '-';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-3 border-b border-slate-200">
          <h2 className="text-[15px] font-bold text-slate-800 flex items-center gap-2">
            Product Comparison ({compareItems.length})
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={clearCompare} className="text-[12px] font-semibold text-red-600 hover:text-red-700 flex items-center gap-1">
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </button>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {compareItems.length === 0 ? (
          <div className="p-8 text-center text-[13px] text-slate-500">
            No products selected for comparison.
          </div>
        ) : (
          <div className="flex-1 overflow-auto p-2 sm:p-3 bg-slate-50 custom-scrollbar">
            <div className="min-w-max">
              <table className="w-full bg-white rounded-lg shadow-sm border border-slate-200 text-[12px]">
                <thead>
                  <tr>
                    <th className="w-24 sm:w-32 p-3 bg-slate-50 border-b border-r border-slate-200 text-left font-bold text-slate-600">
                      Product Info
                    </th>
                    {compareItems.map(item => (
                      <th key={item.id} className="w-36 sm:w-48 p-3 border-b border-r border-slate-200 align-top relative">
                        <button 
                          onClick={() => removeFromCompare(item.id)}
                          className="absolute top-1.5 right-1.5 text-slate-400 hover:text-red-500 bg-white rounded-full p-1 shadow-sm border border-slate-100 transition-colors"
                          title="Remove from comparison"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                        <div className="flex flex-col items-center">
                          <Link to={`/product/${item.slug || item.id}`} onClick={onClose} className="block mb-2">
                            <LazyImage 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mix-blend-multiply"
                            />
                          </Link>
                          <Link to={`/product/${item.slug || item.id}`} onClick={onClose} className="text-[11px] sm:text-[12px] font-bold text-slate-800 text-center hover:text-blue-600 line-clamp-2 h-8 mb-1">
                            {item.name}
                          </Link>
                          <div className="text-[13px] font-bold text-blue-600 mb-2">
                            ${item.sale_price ? item.sale_price.toFixed(2) : item.price?.toFixed(2)}
                            {item.sale_price && item.price && (
                              <span className="text-[10px] text-slate-400 line-through ml-1">${item.price.toFixed(2)}</span>
                            )}
                          </div>
                          <button 
                            onClick={() => {
                              addToCart({
                                product_id: item.id,
                                name: item.name,
                                price: item.sale_price || item.price,
                                image_url: item.image_url,
                                quantity: 1
                              });
                            }}
                            className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold rounded transition-colors"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Basic Info */}
                  <tr>
                    <td className="p-2 sm:p-3 bg-slate-50 border-b border-r border-slate-200 font-semibold text-slate-700">Category</td>
                    {compareItems.map(item => (
                      <td key={`cat-${item.id}`} className="p-2 sm:p-3 border-b border-r border-slate-200 text-slate-600 capitalize">
                        {item.category?.replace(/-/g, ' ')}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td className="p-2 sm:p-3 bg-slate-50 border-b border-r border-slate-200 font-semibold text-slate-700">Availability</td>
                    {compareItems.map(item => (
                      <td key={`stock-${item.id}`} className="p-2 sm:p-3 border-b border-r border-slate-200 text-slate-600">
                        {item.stock > 0 ? (
                          <span className="text-emerald-600 font-medium flex items-center gap-1 text-[11px]"><CheckCircle className="w-3.5 h-3.5"/> In Stock</span>
                        ) : (
                          <span className="text-red-600 font-medium flex items-center gap-1 text-[11px]"><X className="w-3.5 h-3.5"/> Out of Stock</span>
                        )}
                      </td>
                    ))}
                  </tr>
                  
                  {/* Detailed Specs */}
                  {specsList.length > 0 && (
                    <tr>
                      <td colSpan={compareItems.length + 1} className="p-2 bg-slate-100 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Specifications
                      </td>
                    </tr>
                  )}
                  {specsList.map(specKey => (
                    <tr key={specKey} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-2 sm:p-3 bg-slate-50 border-b border-r border-slate-200 font-semibold text-slate-700 capitalize">
                        {specKey.replace(/_/g, ' ')}
                      </td>
                      {compareItems.map(item => (
                        <td key={`spec-${item.id}-${specKey}`} className="p-2 sm:p-3 border-b border-r border-slate-200 text-slate-600">
                          {getSpecValue(item, specKey)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
