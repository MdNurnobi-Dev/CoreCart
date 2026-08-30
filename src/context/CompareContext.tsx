import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CompareContextType {
  compareItems: any[];
  addToCompare: (product: any) => void;
  removeFromCompare: (productId: number) => void;
  clearCompare: () => void;
  isComparing: (productId: number) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareItems, setCompareItems] = useState<any[]>(() => {
    const saved = localStorage.getItem('compareItems');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('compareItems', JSON.stringify(compareItems));
  }, [compareItems]);

  const addToCompare = (product: any) => {
    setCompareItems(prev => {
      if (prev.find(item => item.id === product.id)) return prev;
      if (prev.length >= 4) {
        // limit to 4 items, replace the oldest one? or just alert?
        return [...prev.slice(1), product];
      }
      return [...prev, product];
    });
  };

  const removeFromCompare = (productId: number) => {
    setCompareItems(prev => prev.filter(item => item.id !== productId));
  };

  const clearCompare = () => {
    setCompareItems([]);
  };

  const isComparing = (productId: number) => {
    return compareItems.some(item => item.id === productId);
  };

  return (
    <CompareContext.Provider value={{ compareItems, addToCompare, removeFromCompare, clearCompare, isComparing }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (context === undefined) {
    throw new Error('useCompare must be used within a CompareProvider');
  }
  return context;
}
