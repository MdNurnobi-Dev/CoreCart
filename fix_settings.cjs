const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminSettings.tsx', 'utf8');

const newLogoUpload = `
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast('Image file size should be less than 2MB', 'error');
      return;
    }

    setUploadingLogo(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', { method: 'POST', body: form });
      setSettings(prev => ({ ...prev, logo_url: data.secure_url }));
      showToast('Logo uploaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to upload logo', 'error');
    } finally {
      setUploadingLogo(false);
    }
  };
`;

const newFaviconUpload = `
  const handleFaviconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showToast('Favicon file size should be less than 1MB', 'error');
      return;
    }

    setUploadingFavicon(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const data = await apiFetch('/admin/upload-image', { method: 'POST', body: form });
      setSettings(prev => ({ ...prev, favicon_url: data.secure_url }));
      showToast('Favicon uploaded successfully!', 'success');
    } catch (err) {
      showToast('Failed to upload favicon', 'error');
    } finally {
      setUploadingFavicon(false);
    }
  };
`;

code = code.replace(/const handleLogoUpload =[\s\S]*?reader\.readAsDataURL\(file\);\n  \};/, newLogoUpload);
code = code.replace(/const handleFaviconUpload =[\s\S]*?reader\.readAsDataURL\(file\);\n  \};/, newFaviconUpload);

fs.writeFileSync('src/pages/AdminSettings.tsx', code);
