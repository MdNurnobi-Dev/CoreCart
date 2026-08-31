const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminBanners.tsx', 'utf8');

// Add states and icons
if (!code.includes('Upload')) {
  code = code.replace(
    "import { Plus, Edit2, Trash2, XCircle, CheckCircle, GripVertical } from 'lucide-react';",
    "import { Plus, Edit2, Trash2, XCircle, CheckCircle, GripVertical, Upload, Loader2 } from 'lucide-react';"
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
      setFormData({ ...formData, image_url: data.secure_url });
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

const oldImageInput = `<div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Image URL *</label>
                <input type="url" required value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="w-full px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" />
              </div>`;

const newImageInput = `<div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Image URL *</label>
                <div className="flex items-center gap-2">
                  <input type="url" required value={formData.image_url} onChange={e => setFormData({...formData, image_url: e.target.value})} className="flex-1 px-2 py-1.5 text-[12px] border border-slate-300 rounded focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none" placeholder="Image URL..." />
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
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] font-medium transition-colors disabled:opacity-50"
                    >
                      {uploadingImage ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                      <span>Upload</span>
                    </button>
                  </div>
                </div>
              </div>`;

code = code.replace(oldImageInput, newImageInput);

fs.writeFileSync('src/pages/AdminBanners.tsx', code);
