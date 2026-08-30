import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 sm:space-x-2 text-[11px] sm:text-xs text-slate-500 mb-2 sm:mb-3 whitespace-nowrap overflow-x-auto no-scrollbar pb-1">
      <ol className="flex items-center space-x-1.5 sm:space-x-2">
        <li>
          <Link 
            to="/" 
            className="flex items-center gap-1 hover:text-blue-600 transition-colors"
            title="Home"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Home</span>
          </Link>
        </li>
        
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-1.5 sm:space-x-2">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isLast || !item.path ? (
                <span className="font-semibold text-slate-800 truncate max-w-[140px] sm:max-w-[240px]" title={item.label} aria-current="page">
                  {item.label}
                </span>
              ) : (
                <Link 
                  to={item.path} 
                  className="hover:text-blue-600 transition-colors truncate max-w-[120px] sm:max-w-[200px]"
                  title={item.label}
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
