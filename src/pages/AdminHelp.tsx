import React from 'react';
import { HelpCircle, ExternalLink, Mail, Phone, MapPin, Code, Server, Heart, Globe, Github } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

export default function AdminHelp() {
  const { settings } = useSettings();

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 p-4 sm:p-6 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-[18px] font-bold text-slate-900 leading-tight">Admin Support & Help</h1>
            <p className="text-[13px] text-slate-500">Contact the development team and view system details.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Company Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Code className="w-4 h-4 text-slate-400" />
              <h2 className="text-[14px] font-bold text-slate-800">Development Partner</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <h3 className="text-[15px] font-bold text-slate-900">Vib Tools</h3>
                <p className="text-[12px] text-slate-500 italic mt-0.5">Practical software for real workflows.</p>
              </div>

              <p className="text-[12px] text-slate-600 leading-relaxed">
                Vib Tools builds practical desktop applications, self-hosted software, automation tooling, developer utilities, and open-source projects.
              </p>

              <div className="space-y-2 mt-4 pt-3 border-t border-slate-100">
                <a href="https://vib.tools/" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-[12px] text-slate-600 hover:text-blue-600 transition-colors">
                  <Globe className="w-3.5 h-3.5 text-slate-400" />
                  https://vib.tools/
                  <ExternalLink className="w-3 h-3 ml-auto opacity-50" />
                </a>
                <a href="mailto:support@vib.tools" className="flex items-center gap-2 text-[12px] text-slate-600 hover:text-blue-600 transition-colors">
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  support@vib.tools
                </a>
                <a href="tel:+8801795470603" className="flex items-center gap-2 text-[12px] text-slate-600 hover:text-blue-600 transition-colors">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  +880 1795-470603 (Phone & WhatsApp)
                </a>
                <div className="flex items-start gap-2 text-[12px] text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <span>5660 Kochakata, Nageswari,<br/>Kurigram, Rangpur, Bangladesh (GMT+6)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Project Details Card */}
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <Server className="w-4 h-4 text-slate-400" />
              <h2 className="text-[14px] font-bold text-slate-800">Project Overview</h2>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[12px] text-slate-500">Project Name</span>
                <span className="text-[12px] font-medium text-slate-800">{settings?.site_name || 'E-Commerce Platform'}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[12px] text-slate-500">Environment</span>
                <span className="text-[12px] font-medium text-slate-800">Production</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[12px] text-slate-500">Stack</span>
                <span className="text-[12px] font-medium text-slate-800">React + Express + SQLite</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[12px] text-slate-500">Version</span>
                <span className="text-[12px] font-medium text-slate-800">1.0.0</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-50">
                <span className="text-[12px] text-slate-500">Last Verified</span>
                <span className="text-[12px] font-medium text-slate-800">August 2026</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Heart className="w-3.5 h-3.5 text-rose-400" />
                <h3 className="text-[12px] font-bold text-slate-800">Maintainer Identity</h3>
              </div>
              <div className="bg-slate-50 rounded p-2 text-[11px] text-slate-600 leading-relaxed border border-slate-100">
                Maintained by <strong>Md Nurnobi</strong> (GitHub: <a href="https://github.com/victorsteele" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">@victorsteele</a>)<br/>
                Associated with maintaining Vib Tools repositories.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
