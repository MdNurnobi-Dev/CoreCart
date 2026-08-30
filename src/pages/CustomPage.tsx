import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ChevronRight, Home } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';
import IphoneOrderDemo from './IphoneOrderDemo';
import { SEO } from '../components/SEO';

// Helper to evaluate PHP template tags on client side
function processPhpTemplate(content: string, vars: Record<string, string> = {}) {
  if (!content) return '';
  let processed = content;
  
  // Replace PHP echo expressions
  processed = processed.replace(/<\?php\s+echo\s+date\(['"]([A-Za-z0-9_\-\s:]+)['"]\);\s*\?>/gi, (_, fmt) => {
    if (fmt.includes('Y')) return new Date().getFullYear().toString();
    return new Date().toLocaleDateString();
  });
  processed = processed.replace(/<\?php\s+echo\s+\$site_name;\s*\?>/gi, vars.site_name || 'TechStore');
  processed = processed.replace(/<\?php\s+echo\s+\$current_year;\s*\?>/gi, new Date().getFullYear().toString());
  processed = processed.replace(/<\?php\s+echo\s+\$contact_email;\s*\?>/gi, vars.contact_email || 'support@techstore.com');
  processed = processed.replace(/<\?php\s+echo\s+\$contact_phone;\s*\?>/gi, vars.contact_phone || '+1 (800) 123-4567');
  processed = processed.replace(/<\?php\s+echo\s+\$currency_symbol;\s*\?>/gi, vars.currency_symbol || '$');
  processed = processed.replace(/<\?php\s+echo\s+htmlspecialchars\((.*?)\);\s*\?>/gi, '$1');
  processed = processed.replace(/<\?php\s+echo\s+([^;]+);\s*\?>/gi, (_, expr) => expr.trim().replace(/^['"]|['"]$/g, ''));
  
  // Strip any remaining unexecuted PHP tags so HTML renders properly
  processed = processed.replace(/<\?php[\s\S]*?\?>/gi, '');
  return processed;
}

export default function CustomPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { settings } = useSettings();
  const [page, setPage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  if (slug === 'iphone-order-confirmed-details' || slug === 'iphone-order-demo' || slug === 'iphone-order-confirmed' || slug === 'iphone-order-showcase') {
    return <IphoneOrderDemo />;
  }

  useEffect(() => {
    fetchPage();
  }, [slug]);

  const fetchPage = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/pages/${slug}`);
      if (res.ok) {
        const data = await res.json();
        setPage(data);
        if (data.title) {
          document.title = `${data.title} - ${settings?.site_name || 'TechStore'}`;
        }
      } else {
        navigate('/'); // redirect if not found
      }
    } catch (err) {
      console.error(err);
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex justify-center items-center h-full min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!page) return null;

  const htmlContent = processPhpTemplate(page.content, {
    site_name: settings?.site_name || 'TechStore',
    contact_email: settings?.contact_email || 'support@techstore.com',
    contact_phone: settings?.contact_phone || '+1 (800) 123-4567',
    currency_symbol: settings?.currency_symbol || '$'
  });

  return (
    <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      <SEO 
        title={page.title} 
        description={page.meta_description || `${page.title} - Official information and details from ${settings?.site_name || 'TechStore'}.`}
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: page.title, url: `/page/${slug}` }
        ]}
      />
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-[12px] text-gray-500 mb-6">
        <Link to="/" className="hover:text-blue-600 flex items-center gap-1">
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
        <span className="font-semibold text-gray-800">{page.title}</span>
      </nav>

      {/* Rendered Custom Content */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div 
          className="custom-html-content space-y-4 text-gray-800"
          dangerouslySetInnerHTML={{ __html: htmlContent }} 
        />
      </div>
    </div>
  );
}
