const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const endpoints = `
app.post('/api/admin/banners/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await pool.query("UPDATE banners SET sort_order = $1 WHERE id = $2", [item.sort_order, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder banners' });
  }
});

app.post('/api/admin/home-sections/reorder', authenticateAdmin, async (req, res) => {
  try {
    const { items } = req.body;
    for (const item of items) {
      await pool.query("UPDATE home_sections SET sort_order = $1 WHERE id = $2", [item.sort_order, item.id]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reorder sections' });
  }
});
`;

code = code.replace(
  '// Admin endpoints - Banners',
  endpoints + '\n// Admin endpoints - Banners'
);

fs.writeFileSync('server.ts', code);
