const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('AdminBanners')) {
  // Add imports
  code = code.replace(
    'import AdminLayout from "./components/AdminLayout";',
    'import AdminLayout from "./components/AdminLayout";\nimport AdminBanners from "./pages/AdminBanners";\nimport AdminHomeSettings from "./pages/AdminHomeSettings";'
  );

  // Add routes
  const routesToInsert = `
          <Route path="customize">
            <Route path="banners" element={<AdminBanners />} />
            <Route path="home" element={<AdminHomeSettings />} />
          </Route>
`;
  code = code.replace(
    '<Route path="settings" element={<AdminSettings />} />',
    '<Route path="settings" element={<AdminSettings />} />\n' + routesToInsert
  );

  fs.writeFileSync('src/App.tsx', code);
}
