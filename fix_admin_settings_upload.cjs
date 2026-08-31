const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminSettings.tsx', 'utf8');

// Replace the old handleFileSelect
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
      showToast(type === 'logo' ? 'Logo uploaded successfully!' : 'Favicon uploaded successfully!', 'success');
    } catch (err) {
      console.error('Upload failed', err);
      showToast('Failed to upload image', 'error');
    } finally {
      setUploading(false);
    }
  };
`;

code = code.replace(/const handleFileSelect = \(e: React\.ChangeEvent<HTMLInputElement>, type: 'logo' \| 'favicon'\) => \{[\s\S]*?reader\.readAsDataURL\(file\);\n  \};/, newHandleFileSelect);

fs.writeFileSync('src/pages/AdminSettings.tsx', code);
