const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const endpoints = `
// ==========================================
// ADMIN: PRODUCT REVIEWS
// ==========================================

app.get('/api/admin/reviews', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query(\`
      SELECT pr.*, p.name as product_name, p.image_url as product_image
      FROM product_reviews pr
      LEFT JOIN products p ON pr.product_id = p.id
      ORDER BY pr.created_at DESC
    \`);
    res.json(result.rows);
  } catch (err: any) {
    console.error('Failed to fetch reviews:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.put('/api/admin/reviews/:id/status', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const result = await pool.query(
      'UPDATE product_reviews SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Review not found' });
    res.json(result.rows[0]);
  } catch (err: any) {
    console.error('Failed to update review status:', err);
    res.status(500).json({ error: 'Failed to update review status' });
  }
});

app.delete('/api/admin/reviews/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM product_reviews WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err: any) {
    console.error('Failed to delete review:', err);
    res.status(500).json({ error: 'Failed to delete review' });
  }
});
`;

code = code.replace(
  "// ==========================================\n// ADMIN: LIVE CHAT SETTINGS & SESSIONS\n// ==========================================",
  endpoints + "\n\n// ==========================================\n// ADMIN: LIVE CHAT SETTINGS & SESSIONS\n// =========================================="
);

fs.writeFileSync('server.ts', code);
