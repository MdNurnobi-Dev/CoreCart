import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartRedirect() {
  const navigate = useNavigate();
  const { setIsCartOpen } = useCart();

  useEffect(() => {
    setIsCartOpen(true);
    // Redirect to home and ensure the cart drawer slides open
    navigate('/', { replace: true });
  }, [navigate, setIsCartOpen]);

  return null;
}
