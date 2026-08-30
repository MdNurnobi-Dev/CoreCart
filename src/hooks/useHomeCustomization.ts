import { useState, useEffect } from 'react';
import { apiFetch } from '../lib/utils';

export function useHomeCustomization() {
  const [banners, setBanners] = useState<any[]>([]);
  const [homeSections, setHomeSections] = useState<any[]>([]);
  const [uiSettings, setUiSettings] = useState({ home_grid_desktop: 4, home_grid_mobile: 2 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [b, h, u] = await Promise.all([
          apiFetch('/banners').catch(() => []),
          apiFetch('/home-sections').catch(() => []),
          apiFetch('/ui-settings').catch(() => ({ home_grid_desktop: 4, home_grid_mobile: 2 }))
        ]);
        setBanners(b);
        setHomeSections(h);
        setUiSettings(u);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { banners, homeSections, uiSettings, loading };
}
