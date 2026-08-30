import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch } from '../lib/utils';

export interface Product {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  price: number | string;
  category: string;
  image_url?: string;
  stock_quantity?: number;
  featured?: boolean;
  specs?: any;
}

interface ProductContextType {
  products: Product[];
  categories: string[];
  loading: boolean;
  error: string | null;
  refreshProducts: () => Promise<void>;
  searchProducts: (query: string, category?: string) => Product[];
}

const ProductContext = createContext<ProductContextType>({
  products: [],
  categories: [],
  loading: false,
  error: null,
  refreshProducts: async () => {},
  searchProducts: () => []
});

export const ProductProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProductsAndCategories = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch categories
      let cats: string[] = [];
      try {
        const catData = await apiFetch('/categories');
        if (Array.isArray(catData) && catData.length > 0) {
          const catMap = new Map<string, string>();
          catData.forEach((c: any) => {
            const name = (c.name || c.slug || '').trim();
            if (name) {
              const lower = name.toLowerCase();
              if (!catMap.has(lower)) {
                catMap.set(lower, name);
              }
            }
          });
          cats = Array.from(catMap.values());
        }
      } catch (e) {
        // Fallback handled below
      }

      // Fetch products
      const prodData = await apiFetch('/products');
      if (Array.isArray(prodData)) {
        setProducts(prodData);
        if (cats.length === 0) {
          const catMap = new Map<string, string>();
          prodData.forEach((p: any) => {
            const name = (p.category || '').trim();
            if (name) {
              const lower = name.toLowerCase();
              if (!catMap.has(lower)) {
                catMap.set(lower, name);
              }
            }
          });
          cats = Array.from(catMap.values());
        }
      }
      setCategories(cats.length > 0 ? cats : ['Laptop', 'Mobile']);
    } catch (err: any) {
      console.error('Error in ProductProvider:', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductsAndCategories();
  }, []);

  const searchProducts = (query: string, category?: string): Product[] => {
    const q = query.trim().toLowerCase();
    const cat = category?.trim().toLowerCase();

    return products.filter(p => {
      const matchesCat = !cat || (p.category && p.category.toLowerCase() === cat);
      if (!matchesCat) return false;
      if (!q) return true;

      const nameMatch = p.name?.toLowerCase().includes(q);
      const descMatch = p.description?.toLowerCase().includes(q);
      const catMatch = p.category?.toLowerCase().includes(q);

      return nameMatch || descMatch || catMatch;
    });
  };

  return (
    <ProductContext.Provider value={{
      products,
      categories,
      loading,
      error,
      refreshProducts: fetchProductsAndCategories,
      searchProducts
    }}>
      {children}
    </ProductContext.Provider>
  );
};

export const useProducts = () => useContext(ProductContext);
