const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newEndpoints = `
app.get('/api/admin/reviews/settings', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT review_settings FROM settings LIMIT 1');
    const settings = result.rows[0]?.review_settings || '{}';
    res.json(typeof settings === 'string' ? JSON.parse(settings) : settings);
  } catch (err: any) {
    console.error('Failed to fetch review settings:', err);
    res.status(500).json({ error: 'Failed to fetch review settings' });
  }
});

app.put('/api/admin/reviews/settings', authenticateAdmin, async (req, res) => {
  try {
    const review_settings = JSON.stringify(req.body);
    const result = await pool.query(
      'UPDATE settings SET review_settings = $1 WHERE id = (SELECT id FROM settings LIMIT 1) RETURNING review_settings',
      [review_settings]
    );
    if (result.rows.length === 0) {
      // Create settings row if it doesn't exist
      await pool.query('INSERT INTO settings (review_settings) VALUES ($1)', [review_settings]);
    }
    res.json(req.body);
  } catch (err: any) {
    console.error('Failed to update review settings:', err);
    res.status(500).json({ error: 'Failed to update review settings' });
  }
});
`;

code = code.replace(
  "app.get('/api/admin/reviews', authenticateAdmin, async (req, res) => {",
  newEndpoints + "\n\napp.get('/api/admin/reviews', authenticateAdmin, async (req, res) => {"
);

fs.writeFileSync('server.ts', code);
