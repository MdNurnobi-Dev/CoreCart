import React, { createContext, useContext, useState, useEffect } from 'react';

export interface CartItem {
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
  category?: string;
}

interface CartContextType {
  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (isOpen: boolean) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (product_id: number) => void;
  updateQuantity: (product_id: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextType>({} as CartContextType);

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('cart');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = (item: CartItem) => {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === item.product_id);
      if (existing) {
        return prev.map(i => i.product_id === item.product_id ? { ...i, quantity: i.quantity + item.quantity } : i);
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (product_id: number) => {
    setCart(prev => prev.filter(i => i.product_id !== product_id));
  };

  const updateQuantity = (product_id: number, quantity: number) => {
    if (quantity <= 0) return removeFromCart(product_id);
    setCart(prev => prev.map(i => i.product_id === product_id ? { ...i, quantity } : i));
  };

  const clearCart = () => setCart([]);

  return (
    <CartContext.Provider value={{ cart, isCartOpen, setIsCartOpen, addToCart, removeFromCart, updateQuantity, clearCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
