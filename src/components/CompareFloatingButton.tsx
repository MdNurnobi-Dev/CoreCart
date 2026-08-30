import React, { useState } from 'react';
import { useCompare } from '../context/CompareContext';
import { Scale, X } from 'lucide-react';
import CompareOverlay from './CompareOverlay';

export default function CompareFloatingButton() {
  const { compareItems, clearCompare } = useCompare();
  const [isOpen, setIsOpen] = useState(false);

  if (compareItems.length === 0) return null;

  return (
    <>
      <div className="fixed bottom-[90px] right-4 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-slate-900 hover:bg-slate-800 text-white rounded-full pl-3 pr-4 py-2.5 shadow-lg flex items-center justify-center gap-2 relative transition-all hover:scale-105 border border-slate-700"
        >
          <div className="relative">
            <Scale className="w-4 h-4" />
            <span className="absolute -top-1.5 -right-1.5 bg-blue-500 text-white text-[9px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
              {compareItems.length}
            </span>
          </div>
          <span className="text-[13px] font-semibold tracking-wide">Compare</span>
        </button>
      </div>
      
      {isOpen && (
        <CompareOverlay onClose={() => setIsOpen(false)} />
      )}
    </>
  );
}
