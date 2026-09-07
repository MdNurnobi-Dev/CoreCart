const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// 1. Fix JWT_SECRET Fallback for Production
server = server.replace(/const JWT_SECRET = process\.env\.JWT_SECRET \|\| 'super-secret-ecommerce-key-998877';/g, 
`const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ecommerce-key-998877';
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('FATAL SECURITY ERROR: JWT_SECRET is not defined in production environment.');
}`);

// 2. Fix CORS ALLOWED_ORIGINS logic in Production
server = server.replace(/origin: process\.env\.NODE_ENV === 'production' && process\.env\.ALLOWED_ORIGINS[\s\S]*?: function \(origin, callback\) { callback\(null, true\) },/g, 
`origin: process.env.NODE_ENV === 'production' 
    ? (process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : false)
    : function (origin, callback) { callback(null, true) },`);

// 3. Stricter Auth Rate Limiting (Prevent Brute Force)
server = server.replace(/max: 100, \/\/ max 100 attempts per 15 minutes per IP/g, `max: 15, // max 15 attempts per 15 minutes per IP (Stricter security)`);

// 4. Fix Login Route Cookie (Missing in previous patch)
server = server.replace(/const token = jwt\.sign\(\{ id: user\.id, email: user\.email, role: user\.role \}, JWT_SECRET, \{ expiresIn: '30d' \}\);\s*res\.json\(\{ \s*token,\s*user: \{/g, 
`const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    res.json({ 
      token, 
      user: {`);

// 5. Basic input validation on register
server = server.replace(/const { name, email, password, phone } = req.body;\n\s*try \{/g, 
`const { name, email, password, phone } = req.body;
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Valid email and password are required' });
  }
  try {`);

// 6. Basic input validation on login
server = server.replace(/const { email, password } = req\.body;\n\s*try \{/g,
`const { email, password } = req.body;
  if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Valid email and password are required' });
  }
  try {`);

// 7. Error Handler Stack Trace Leakage protection & fix console.error
server = server.replace(/console\.error\('Unhandled Server Error:', err\.message\);/g, 
`console.error('Unhandled Server Error:', err.stack || err.message);`);

fs.writeFileSync('server.ts', server);
