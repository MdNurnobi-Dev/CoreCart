import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    // If navigating to a hash (e.g. #all-products), let browser handle it or we can handle it later.
    if (hash) {
      const element = document.getElementById(hash.substring(1));
      if (element) {
        setTimeout(() => element.scrollIntoView({ behavior: 'smooth' }), 50);
      }
      return;
    }

    // Attempt synchronous scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Attempt async scroll after DOM mutations (React 18 layout shift workaround)
    const timeout = setTimeout(() => {
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }, 100);

    return () => clearTimeout(timeout);
  }, [pathname, hash]);

  return null;
}
