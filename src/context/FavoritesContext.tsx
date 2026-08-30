import React, { createContext, useContext, useState, useEffect } from 'react';

export interface FavoriteItem {
  id: number;
  name: string;
  price: number;
  image_url?: string;
  category?: string;
  description?: string;
  specs?: any;
}

interface FavoritesContextType {
  favorites: FavoriteItem[];
  favoritesCount: number;
  isFavorite: (id: number | string) => boolean;
  toggleFavorite: (product: any) => void;
  addToFavorites: (product: any) => void;
  removeFromFavorites: (id: number | string) => void;
  clearFavorites: () => void;
  toastMessage: { text: string; type: 'add' | 'remove' | 'info'; visible: boolean } | null;
  hideToast: () => void;
}

const FavoritesContext = createContext<FavoritesContextType | undefined>(undefined);

const FAVORITES_STORAGE_KEY = 'techshop_user_favorites_v1';

export const FavoritesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem(FAVORITES_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to parse favorites from localStorage:', e);
      return [];
    }
  });

  const [toastMessage, setToastMessage] = useState<{
    text: string;
    type: 'add' | 'remove' | 'info';
    visible: boolean;
  } | null>(null);

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
    } catch (e) {
      console.error('Failed to save favorites to localStorage:', e);
    }
  }, [favorites]);

  const showToast = (text: string, type: 'add' | 'remove' | 'info') => {
    setToastMessage({ text, type, visible: true });
    setTimeout(() => {
      setToastMessage(prev => (prev?.text === text ? { ...prev, visible: false } : prev));
    }, 2800);
  };

  const hideToast = () => {
    setToastMessage(null);
  };

  const isFavorite = (id: number | string): boolean => {
    const numId = Number(id);
    return favorites.some(item => Number(item.id) === numId);
  };

  const addToFavorites = (product: any) => {
    if (!product || !product.id) return;
    const numId = Number(product.id);
    if (!isFavorite(numId)) {
      const newItem: FavoriteItem = {
        id: numId,
        name: product.name,
        price: Number(product.price) || 0,
        image_url: product.image_url,
        category: product.category || 'General',
        description: product.description,
        specs: product.specs
      };
      setFavorites(prev => [newItem, ...prev]);
      showToast(`Added "${product.name}" to favorites`, 'add');
    }
  };

  const removeFromFavorites = (id: number | string) => {
    const numId = Number(id);
    const itemToRemove = favorites.find(item => Number(item.id) === numId);
    setFavorites(prev => prev.filter(item => Number(item.id) !== numId));
    if (itemToRemove) {
      showToast(`Removed "${itemToRemove.name}" from favorites`, 'remove');
    }
  };

  const toggleFavorite = (product: any) => {
    if (!product || !product.id) return;
    const numId = Number(product.id);
    if (isFavorite(numId)) {
      removeFromFavorites(numId);
    } else {
      addToFavorites(product);
    }
  };

  const clearFavorites = () => {
    setFavorites([]);
    showToast('Favorites list cleared', 'info');
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoritesCount: favorites.length,
        isFavorite,
        toggleFavorite,
        addToFavorites,
        removeFromFavorites,
        clearFavorites,
        toastMessage,
        hideToast
      }}
    >
      {children}

      {/* GLOBAL TOAST NOTIFICATION FOR FAVORITES */}
      {toastMessage && toastMessage.visible && (
        <div className="fixed bottom-5 right-5 z-[999] max-w-sm bg-slate-900/95 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700/80 backdrop-blur-md flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div
            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
              toastMessage.type === 'add'
                ? 'bg-rose-500/20 text-rose-400'
                : toastMessage.type === 'remove'
                ? 'bg-slate-700 text-slate-300'
                : 'bg-blue-500/20 text-blue-400'
            }`}
          >
            {toastMessage.type === 'add' ? (
              <svg className="w-4 h-4 fill-current text-rose-500" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <p className="text-xs font-medium text-slate-100 flex-1 line-clamp-2">{toastMessage.text}</p>
          <button
            onClick={hideToast}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer text-xs"
          >
            ✕
          </button>
        </div>
      )}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = (): FavoritesContextType => {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error('useFavorites must be used within a FavoritesProvider');
  }
  return context;
};
