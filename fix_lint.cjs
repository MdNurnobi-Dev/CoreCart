const fs = require('fs');

// Fix AdminPaymentGateways
let code = fs.readFileSync('src/pages/AdminPaymentGateways.tsx', 'utf8');

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
if (!code.includes('const handleImageUpload =')) {
  code = code.replace('const handleSave = async', uploadFn + '\n  const handleSave = async');
}
fs.writeFileSync('src/pages/AdminPaymentGateways.tsx', code);

// Fix AdminSettings
code = fs.readFileSync('src/pages/AdminSettings.tsx', 'utf8');
code = code.replace("  Loader2,\n  Upload\n} from 'lucide-react';", "} from 'lucide-react';"); // Remove the duplicate import we added earlier
if (!code.includes("import { apiFetch")) {
  code = code.replace("import React, { useEffect, useState, useRef } from 'react';", "import React, { useEffect, useState, useRef } from 'react';\nimport { apiFetch } from '../lib/utils';");
}
fs.writeFileSync('src/pages/AdminSettings.tsx', code);

