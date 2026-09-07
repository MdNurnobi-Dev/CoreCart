const fs = require('fs');
let server = fs.readFileSync('server.ts', 'utf8');

// Add import
server = server.replace("import helmet from 'helmet';", "import helmet from 'helmet';\nimport { applyHelmetConfig } from './src/server/helmet-config.js';");

// Remove existing helmet usage
const existingHelmet = `if (process.env.NODE_ENV === 'production') {
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
}`;

server = server.replace(existingHelmet, "applyHelmetConfig(app);");

fs.writeFileSync('server.ts', server);
