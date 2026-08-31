import React, { createContext, useContext, useEffect, useState } from 'react';

export interface CurrencyInfo {
  code: string;
  symbol: string;
  rate: number;
}

export const AVAILABLE_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', rate: 1 },
  { code: 'EUR', symbol: '€', rate: 0.92 },
  { code: 'GBP', symbol: '£', rate: 0.79 },
  { code: 'JPY', symbol: '¥', rate: 150.5 },
  { code: 'AUD', symbol: 'A$', rate: 1.53 },
  { code: 'CAD', symbol: 'C$', rate: 1.35 }
];

interface Settings {
  site_name: string;
  logo_url: string;
  favicon_url: string;
  show_site_name_in_header?: boolean;
  footer_text: string;
  contact_email: string;
  contact_phone: string;
  contact_phone_alt?: string;
  contact_address?: string;
  support_hours?: string;
  announcement_text?: string;
  announcement_link?: string;
  currency_symbol: string;
  facebook_url: string;
  instagram_url: string;
  twitter_url: string;
  youtube_url?: string;
  linkedin_url?: string;
}

interface SettingsContextType {
  settings: Settings | null;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  
  // Currency features
  availableCurrencies: CurrencyInfo[];
  currentCurrency: CurrencyInfo;
  setCurrency: (code: string) => void;
  formatPrice: (price: number | string) => string;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings | null>(() => {
    try {
      const cached = localStorage.getItem('techshop_settings_cache');
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (e) {
      console.error('Failed to parse cached settings', e);
    }
    return null;
  });
  const [loading, setLoading] = useState(true);

  // Currency State
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState(() => {
    return localStorage.getItem('techshop_currency') || 'USD';
  });

  const handleSetCurrency = (code: string) => {
    setSelectedCurrencyCode(code);
    localStorage.setItem('techshop_currency', code);
  };

  const currentCurrency = AVAILABLE_CURRENCIES.find(c => c.code === selectedCurrencyCode) || AVAILABLE_CURRENCIES[0];

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '0.00';
    
    // Convert based on rate
    const converted = numPrice * currentCurrency.rate;
    
    // Format appropriately (e.g. no decimals for JPY)
    if (currentCurrency.code === 'JPY') {
      return Math.round(converted).toString();
    }
    return converted.toFixed(2);
  };

  const fetchSettings = async (retryCount = 0) => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        localStorage.setItem('techshop_settings_cache', JSON.stringify(data));
        
        if (data.site_name) {
          document.title = data.site_name;
        }
        if (data.favicon_url) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement('link');
            link.rel = 'icon';
            document.getElementsByTagName('head')[0].appendChild(link);
          }
          link.href = data.favicon_url;
        }
      } else if (retryCount < 2) {
        setTimeout(() => fetchSettings(retryCount + 1), 1500);
      }
    } catch (err) {
      if (retryCount < 2) {
        setTimeout(() => fetchSettings(retryCount + 1), 1500);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Prevent UI flashing with default values if we haven't loaded yet and have no cache
  if (loading && !settings) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
      </div>
    );
  }

  return (
    <SettingsContext.Provider value={{ 
      settings, 
      loading, 
      refreshSettings: () => fetchSettings(0),
      availableCurrencies: AVAILABLE_CURRENCIES,
      currentCurrency,
      setCurrency: handleSetCurrency,
      formatPrice
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
