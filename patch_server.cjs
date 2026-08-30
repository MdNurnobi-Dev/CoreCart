const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const endpoints = `
// ==========================================
// HOME CUSTOMIZATION API
// ==========================================

// Public endpoints
app.get('/api/banners', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM banners WHERE is_active = true OR is_active = 1 ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

app.get('/api/home-sections', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM home_sections WHERE is_active = true OR is_active = 1 ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch home sections' });
  }
});

app.get('/api/ui-settings', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM ui_settings LIMIT 1");
    res.json(result.rows[0] || { home_grid_desktop: 6, home_grid_mobile: 2 });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch ui settings' });
  }
});

// Admin endpoints - Banners
app.get('/api/admin/banners', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM banners ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

app.post('/api/admin/banners', authenticateAdmin, async (req, res) => {
  try {
    const { title, subtitle, image_url, link_url, position, sort_order, is_active } = req.body;
    await pool.query(
      "INSERT INTO banners (title, subtitle, image_url, link_url, position, sort_order, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [title, subtitle, image_url, link_url, position, sort_order || 0, is_active ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

app.put('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, link_url, position, sort_order, is_active } = req.body;
    await pool.query(
      "UPDATE banners SET title=$1, subtitle=$2, image_url=$3, link_url=$4, position=$5, sort_order=$6, is_active=$7, updated_at=CURRENT_TIMESTAMP WHERE id=$8",
      [title, subtitle, image_url, link_url, position, sort_order || 0, is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

app.delete('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM banners WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// Admin endpoints - Home Sections
app.get('/api/admin/home-sections', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM home_sections ORDER BY sort_order ASC, created_at DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections' });
  }
});

app.post('/api/admin/home-sections', authenticateAdmin, async (req, res) => {
  try {
    const { title, type, category_slug, limit_count, sort_order, is_active } = req.body;
    await pool.query(
      "INSERT INTO home_sections (title, type, category_slug, limit_count, sort_order, is_active) VALUES ($1, $2, $3, $4, $5, $6)",
      [title, type, category_slug || '', limit_count || 6, sort_order || 0, is_active ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create section' });
  }
});

app.put('/api/admin/home-sections/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, type, category_slug, limit_count, sort_order, is_active } = req.body;
    await pool.query(
      "UPDATE home_sections SET title=$1, type=$2, category_slug=$3, limit_count=$4, sort_order=$5, is_active=$6, updated_at=CURRENT_TIMESTAMP WHERE id=$7",
      [title, type, category_slug || '', limit_count || 6, sort_order || 0, is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section' });
  }
});

app.delete('/api/admin/home-sections/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM home_sections WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section' });
  }
});

// Admin endpoints - UI Settings
app.put('/api/admin/ui-settings', authenticateAdmin, async (req, res) => {
  try {
    const { home_grid_desktop, home_grid_mobile } = req.body;
    const check = await pool.query("SELECT id FROM ui_settings LIMIT 1");
    if (check.rows.length === 0) {
      await pool.query("INSERT INTO ui_settings (home_grid_desktop, home_grid_mobile) VALUES ($1, $2)", [home_grid_desktop, home_grid_mobile]);
    } else {
      await pool.query("UPDATE ui_settings SET home_grid_desktop=$1, home_grid_mobile=$2, updated_at=CURRENT_TIMESTAMP", [home_grid_desktop, home_grid_mobile]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ==========================================
`;

code = code.replace(
  '// ==========================================\n// NOTIFICATIONS & ALERTS API',
  endpoints + '\n// NOTIFICATIONS & ALERTS API'
);

fs.writeFileSync('server.ts', code);
