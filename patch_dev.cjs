const fs = require('fs');

let server = fs.readFileSync('server.ts', 'utf8');

// Replace helmet usage to only run in production, or with relaxed settings for dev
server = server.replace(/app\.use\(helmet\(\{(?:[\s\S]*?)crossOriginEmbedderPolicy: false,\n\}\)\);/g, 
`if (process.env.NODE_ENV === 'production') {
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
}`);

// Also fix cors settings
server = server.replace(/app\.use\(cors\(\{\n  origin: process\.env\.ALLOWED_ORIGINS \? process\.env\.ALLOWED_ORIGINS\.split\(','\) : '\*',\n  credentials: true\n\}\)\);/g, 
`app.use(cors({
  origin: process.env.NODE_ENV === 'production' && process.env.ALLOWED_ORIGINS 
    ? process.env.ALLOWED_ORIGINS.split(',') 
    : function (origin, callback) { callback(null, true) }, // Allow all in dev safely for credentials
  credentials: true
}));`);

// Wait, I need to check the exact regex match for helmet. 
