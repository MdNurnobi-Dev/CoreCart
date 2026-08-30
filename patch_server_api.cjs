const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Add APIs for Banners and Home Sections
const newApis = `
// --- BANNERS API ---
app.get('/api/banners', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM banners WHERE is_active = true OR is_active = 1 ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

app.get('/api/admin/banners', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM banners ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch banners' });
  }
});

app.post('/api/admin/banners', authenticateAdmin, async (req, res) => {
  const { title, subtitle, image_url, link_url, position, is_active, sort_order } = req.body;
  try {
    const result = await pool.query(
      \`INSERT INTO banners (title, subtitle, image_url, link_url, position, is_active, sort_order) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *\`,
      [title || '', subtitle || '', image_url, link_url || '', position || 'hero', is_active !== false, sort_order || 0]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create banner' });
  }
});

app.put('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, subtitle, image_url, link_url, position, is_active, sort_order } = req.body;
  try {
    const result = await pool.query(
      \`UPDATE banners SET title = $1, subtitle = $2, image_url = $3, link_url = $4, position = $5, is_active = $6, sort_order = $7 
       WHERE id = $8 RETURNING *\`,
      [title || '', subtitle || '', image_url, link_url || '', position || 'hero', is_active !== false, sort_order || 0, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Banner not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update banner' });
  }
});

app.delete('/api/admin/banners/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM banners WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete banner' });
  }
});

// --- HOME SECTIONS API ---
app.get('/api/home-sections', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM home_sections WHERE is_active = true OR is_active = 1 ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch home sections' });
  }
});

app.get('/api/admin/home-sections', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM home_sections ORDER BY sort_order ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch home sections' });
  }
});

app.post('/api/admin/home-sections', authenticateAdmin, async (req, res) => {
  const { title, type, category_slug, sort_order, is_active, limit_count } = req.body;
  try {
    const result = await pool.query(
      \`INSERT INTO home_sections (title, type, category_slug, sort_order, is_active, limit_count) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *\`,
      [title, type, category_slug || '', sort_order || 0, is_active !== false, limit_count || 8]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create home section' });
  }
});

app.put('/api/admin/home-sections/:id', authenticateAdmin, async (req, res) => {
  const { id } = req.params;
  const { title, type, category_slug, sort_order, is_active, limit_count } = req.body;
  try {
    const result = await pool.query(
      \`UPDATE home_sections SET title = $1, type = $2, category_slug = $3, sort_order = $4, is_active = $5, limit_count = $6 
       WHERE id = $7 RETURNING *\`,
      [title, type, category_slug || '', sort_order || 0, is_active !== false, limit_count || 8, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Home section not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update home section' });
  }
});

app.delete('/api/admin/home-sections/:id', authenticateAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM home_sections WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete home section' });
  }
});

// Settings layout keys for home grid
app.get('/api/ui-settings', async (req, res) => {
  try {
    // If table does not exist yet it might fail, so create it if needed
    await pool.query(\`
      CREATE TABLE IF NOT EXISTS ui_settings (
        id SERIAL PRIMARY KEY,
        home_grid_desktop INTEGER DEFAULT 4,
        home_grid_mobile INTEGER DEFAULT 2
      )
    \`);
    // Provide a default fallback if table just created or SQLite is used without SERIAL
    try { await pool.query(\`CREATE TABLE IF NOT EXISTS ui_settings (id INTEGER PRIMARY KEY AUTOINCREMENT, home_grid_desktop INTEGER DEFAULT 4, home_grid_mobile INTEGER DEFAULT 2)\`); } catch (e) {}

    let result = await pool.query('SELECT * FROM ui_settings LIMIT 1');
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO ui_settings (home_grid_desktop, home_grid_mobile) VALUES (4, 2)');
      result = await pool.query('SELECT * FROM ui_settings LIMIT 1');
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.json({ home_grid_desktop: 4, home_grid_mobile: 2 });
  }
});

app.put('/api/admin/ui-settings', authenticateAdmin, async (req, res) => {
  const { home_grid_desktop, home_grid_mobile } = req.body;
  try {
    let result = await pool.query('SELECT id FROM ui_settings LIMIT 1');
    if (result.rows.length === 0) {
      await pool.query('INSERT INTO ui_settings (home_grid_desktop, home_grid_mobile) VALUES ($1, $2)', [home_grid_desktop || 4, home_grid_mobile || 2]);
    } else {
      await pool.query('UPDATE ui_settings SET home_grid_desktop = $1, home_grid_mobile = $2 WHERE id = $3', [home_grid_desktop || 4, home_grid_mobile || 2, result.rows[0].id]);
    }
    const updated = await pool.query('SELECT * FROM ui_settings LIMIT 1');
    res.json(updated.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update ui settings' });
  }
});

`;

if (!code.includes('/api/banners')) {
  // Inject before the error handler
  code = code.replace(/app\.use\(\(err: any, req: express\.Request, res: express\.Response, next: express\.NextFunction\) => \{/, newApis + '\n\napp.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {');
  fs.writeFileSync('server.ts', code);
}
