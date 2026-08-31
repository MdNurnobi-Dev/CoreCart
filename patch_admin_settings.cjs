const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminSettings.tsx', 'utf8');

if (!code.includes('Loader2')) {
  code = code.replace(
    "import { Settings as SettingsIcon, Save, RefreshCw, Smartphone, Laptop, CreditCard, Paintbrush, Facebook, Twitter, Instagram, HelpCircle, Eye, ImageIcon, Trash2 } from 'lucide-react';",
    "import { Settings as SettingsIcon, Save, RefreshCw, Smartphone, Laptop, CreditCard, Paintbrush, Facebook, Twitter, Instagram, HelpCircle, Eye, ImageIcon, Trash2, Upload, Loader2 } from 'lucide-react';"
  );
}

// Add state for uploading
code = code.replace(
  'const [saving, setSaving] = useState(false);',
  'const [saving, setSaving] = useState(false);\n  const [uploadingLogo, setUploadingLogo] = useState(false);\n  const [uploadingFavicon, setUploadingFavicon] = useState(false);'
);

// We need to rewrite handleFileSelect
const newHandleFileSelect = `
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'favicon') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image must be less than 2MB', 'error');
      return;
    }

    const setUploading = type === 'logo' ? setUploadingLogo : setUploadingFavicon;
    setUploading(true);
    
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', {
        method: 'POST',
        body: form,
      });
      
      if (type === 'logo') {
        setSettings(prev => ({ ...prev, logo_url: data.secure_url }));
      } else {
        setSettings(prev => ({ ...prev, favicon_url: data.secure_url }));
      }
      showToast(type === 'logo' ? 'Logo uploaded successfully!' : 'Favicon uploaded successfully!');
    } catch (err) {
      console.error('Upload failed', err);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };
`;

code = code.replace(
  /const handleFileSelect = \(e: React.ChangeEvent<HTMLInputElement>, type: 'logo' \| 'favicon'\) => \{[\s\S]*?reader.readAsDataURL\(file\);\n  \};/,
  newHandleFileSelect
);

// Add upload state indicator in the UI. We can skip changing the UI greatly because it already has a file input. We just need to make sure the label text reflects the state or just rely on toast. 
// Wait, is there a button?
// In AdminSettings:
// <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
//   <span className="text-white text-[10px] font-medium">Change</span>
// </div>
// <input type="file" ref={logoFileInputRef} onChange={(e) => handleFileSelect(e, 'logo')} className="hidden" accept="image/*" />

// I will update the "Change" text to show Loader2 if uploading.
const oldLogoChange = `<span className="text-white text-[10px] font-medium">Change</span>`;
const newLogoChange = `<span className="text-white text-[10px] font-medium">{uploadingLogo ? 'Uploading...' : 'Change'}</span>`;
code = code.replace(oldLogoChange, newLogoChange);

const oldFaviconChange = `<span className="text-white text-[10px] font-medium">Change Favicon</span>`;
const newFaviconChange = `<span className="text-white text-[10px] font-medium">{uploadingFavicon ? 'Uploading...' : 'Change Favicon'}</span>`;
code = code.replace(oldFaviconChange, newFaviconChange);

// For URL inputs in AdminSettings:
const oldUrlInput = `<input 
                      type="text" 
                      name="logo_url"
                      value={settings.logo_url || ''}
                      onChange={handleChange}
                      placeholder="https://example.com/logo.png"
                      className="w-full bg-white border border-gray-200 rounded-lg h-[28px] px-2 text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                    />`;
const newUrlInput = `<div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        name="logo_url"
                        value={settings.logo_url || ''}
                        onChange={handleChange}
                        placeholder="https://example.com/logo.png"
                        className="flex-1 bg-white border border-gray-200 rounded-lg h-[28px] px-2 text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => logoFileInputRef.current?.click()}
                        disabled={uploadingLogo}
                        className="flex items-center gap-1 px-2 h-[28px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingLogo ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Upload</span>
                      </button>
                    </div>`;

code = code.replace(oldUrlInput, newUrlInput);

const oldFaviconUrlInput = `<input 
                      type="text" 
                      name="favicon_url"
                      value={settings.favicon_url || ''}
                      onChange={handleChange}
                      placeholder="https://example.com/favicon.ico"
                      className="w-full bg-white border border-gray-200 rounded-lg h-[28px] px-2 text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                    />`;
const newFaviconUrlInput = `<div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        name="favicon_url"
                        value={settings.favicon_url || ''}
                        onChange={handleChange}
                        placeholder="https://example.com/favicon.ico"
                        className="flex-1 bg-white border border-gray-200 rounded-lg h-[28px] px-2 text-[11px] text-gray-900 placeholder-gray-400 focus:border-blue-500 outline-none"
                      />
                      <button 
                        type="button"
                        onClick={() => faviconFileInputRef.current?.click()}
                        disabled={uploadingFavicon}
                        className="flex items-center gap-1 px-2 h-[28px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-medium transition-colors disabled:opacity-50"
                      >
                        {uploadingFavicon ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                        <span>Upload</span>
                      </button>
                    </div>`;

code = code.replace(oldFaviconUrlInput, newFaviconUrlInput);

fs.writeFileSync('src/pages/AdminSettings.tsx', code);
