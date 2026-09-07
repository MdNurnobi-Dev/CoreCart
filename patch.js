const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

// 1. Imports
if (!content.includes("import helmet")) {
    content = content.replace("import express from 'express';", "import express from 'express';\nimport helmet from 'helmet';\nimport cookieParser from 'cookie-parser';");
}

// 2. Middlewares (cookie-parser, helmet, cors)
content = content.replace("app.use(cors());", `app.use(cookieParser());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https:", "http:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
      connectSrc: ["'self'", "wss:", "ws:", "https:", "http:"],
    }
  },
  crossOriginEmbedderPolicy: false,
}));
app.disable('x-powered-by');
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : '*',
  credentials: true
}));`);

// Reduce global express.json limit from 10mb to 2mb to mitigate large payload DoS
content = content.replace("app.use(express.json({ limit: '10mb' }));", "app.use(express.json({ limit: '2mb' }));");

// 3. Middlewares for Authentication (Check Cookies)
content = content.replace(/const authenticateToken = \(req: any, res: any, next: any\) => \{[\s\S]*?jwt\.verify\(token, JWT_SECRET/m, `const authenticateToken = (req: any, res: any, next: any) => {
  const token = req.cookies?.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Authentication token required' });

  jwt.verify(token, JWT_SECRET`);

content = content.replace(/const authenticateOptionalToken = \(req: any, res: any, next: any\) => \{[\s\S]*?jwt\.verify\(token, JWT_SECRET/m, `const authenticateOptionalToken = (req: any, res: any, next: any) => {
  const token = req.cookies?.token || (req.headers['authorization'] && req.headers['authorization'].split(' ')[1]);
  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET`);

// 4. Update login/register to set cookie
// Register
content = content.replace(/const token = jwt\.sign\(\{ id: user\.id, email: user\.email, role: user\.role \}, JWT_SECRET, \{ expiresIn: '30d' \}\);\s*res\.json\(\{ token, user \}\);/g, `const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '30d' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    res.json({ token, user });`);

// Login - Note: Login is exactly the same code!
// Let's make sure both are replaced (g flag).

// 5. Update multer to have a fileFilter
content = content.replace(/const upload = multer\(\{ storage: multer\.memoryStorage\(\), limits: \{ fileSize: 10 \* 1024 \* 1024 \} \}\);/g, `const upload = multer({ 
  storage: multer.memoryStorage(), 
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});`);

// 6. Global error handler at the end (before startServer())
if (!content.includes("app.use((err: any, req: any, res: any, next: any) => {")) {
  content = content.replace("async function startServer() {", `app.use((err: any, req: any, res: any, next: any) => {
  console.error('Unhandled Server Error:', err.message);
  res.status(err.status || 500).json({
    error: 'An internal server error occurred.',
    ...(process.env.NODE_ENV !== 'production' && { details: err.message })
  });
});

async function startServer() {`);
}

fs.writeFileSync('server.ts', content);
