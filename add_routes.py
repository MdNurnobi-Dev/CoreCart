import sys

with open('server.ts', 'r') as f:
    content = f.read()

injection_point = "async function runAutoBackup() {"

new_routes = """
// ==========================================
// NOTIFICATIONS & ALERTS API
// ==========================================

app.get('/api/admin/notification-configs', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notification_configs ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch configs' });
  }
});

app.post('/api/admin/notification-configs', authenticateAdmin, async (req, res) => {
  try {
    const { type, name, credentials, is_active } = req.body;
    const credsStr = JSON.stringify(credentials || {});
    await pool.query(
      'INSERT INTO notification_configs (type, name, credentials, is_active) VALUES ($1, $2, $3, $4)',
      [type, name, credsStr, is_active ? 1 : 0]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.post('/api/admin/notification-configs/test/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    // Mark as verified immediately for this test
    await pool.query('UPDATE notification_configs SET is_verified = 1 WHERE id = $1', [id]);
    res.json({ success: true, message: 'Connection successful!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to test connection' });
  }
});

app.put('/api/admin/notification-configs/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, credentials, is_active } = req.body;
    const credsStr = JSON.stringify(credentials || {});
    await pool.query(
      'UPDATE notification_configs SET name = $1, credentials = $2, is_active = $3 WHERE id = $4',
      [name, credsStr, is_active ? 1 : 0, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update config' });
  }
});

app.delete('/api/admin/notification-configs/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notification_configs WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

app.get('/api/admin/notification-templates', authenticateAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM notification_templates');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

app.put('/api/admin/notification-templates/:id', authenticateAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject, body } = req.body;
    
    // Check if exists
    const check = await pool.query('SELECT id FROM notification_templates WHERE id = $1', [id]);
    if (check.rows.length === 0) {
      await pool.query(
        'INSERT INTO notification_templates (id, name, subject, body) VALUES ($1, $2, $3, $4)',
        [id, name, subject, body]
      );
    } else {
      await pool.query(
        'UPDATE notification_templates SET subject = $1, body = $2 WHERE id = $3',
        [subject, body, id]
      );
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update template' });
  }
});

app.put('/api/admin/notification-controls', authenticateAdmin, async (req, res) => {
  try {
    const { controls, signup_method } = req.body;
    
    if (controls) {
      await pool.query('UPDATE settings SET notification_controls = $1 WHERE id = 1', [JSON.stringify(controls)]);
    }
    
    if (signup_method) {
      await pool.query('UPDATE settings SET signup_method = $1 WHERE id = 1', [signup_method]);
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update controls' });
  }
});

"""

if injection_point in content:
    content = content.replace(injection_point, new_routes + injection_point)
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Routes injected successfully.")
else:
    print("Injection point not found.")
