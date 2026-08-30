const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import AdminProducts from './pages/AdminProducts';",
  "import AdminProducts from './pages/AdminProducts';\nimport AdminReviews from './pages/AdminReviews';"
);

code = code.replace(
  "<Route path=\"products\" element={<AdminProducts />} />",
  "<Route path=\"products\" element={<AdminProducts />} />\n                      <Route path=\"reviews\" element={<AdminReviews />} />"
);

fs.writeFileSync('src/App.tsx', code);
