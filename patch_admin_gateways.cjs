const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminPaymentGateways.tsx', 'utf8');

// Add states and icons
if (!code.includes('Upload')) {
  code = code.replace(
    "import { Plus, Edit2, Trash2, XCircle, CheckCircle, Search, CreditCard, Banknote, Building2, Smartphone, MoreHorizontal } from 'lucide-react';",
    "import { Plus, Edit2, Trash2, XCircle, CheckCircle, Search, CreditCard, Banknote, Building2, Smartphone, MoreHorizontal, Upload, Loader2 } from 'lucide-react';"
  );
}

code = code.replace(
  'const [formData, setFormData]',
  'const [uploadingImage, setUploadingImage] = useState(false);\n  const [formData, setFormData]'
);

const uploadFn = `
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', {
        method: 'POST',
        body: form,
      });
      setFormData({ ...formData, logo_url: data.secure_url });
    } catch (err) {
      console.error('Upload failed', err);
      alert('Failed to upload image.');
    } finally {
      setUploadingImage(false);
    }
  };
`;

code = code.replace(
  'const handleSubmit = async',
  uploadFn + '\n  const handleSubmit = async'
);

const oldLogoInput = `              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Logo URL (Optional)</label>
                <input
                  type="text"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                  className="w-full h-7 bg-slate-50 border border-slate-200 rounded px-2 text-slate-800 focus:border-blue-500 outline-none"
                />
              </div>`;

const newLogoInput = `              <div>
                <label className="block text-[10.5px] font-semibold text-slate-700 mb-0.5">Logo URL (Optional)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="flex-1 h-7 bg-slate-50 border border-slate-200 rounded px-2 text-slate-800 focus:border-blue-500 outline-none"
                  />
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      disabled={uploadingImage}
                    />
                    <button 
                      type="button"
                      disabled={uploadingImage}
                      className="flex items-center gap-1 px-2 h-7 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[10px] font-medium transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              </div>`;

code = code.replace(oldLogoInput, newLogoInput);

fs.writeFileSync('src/pages/AdminPaymentGateways.tsx', code);
