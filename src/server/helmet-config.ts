import helmet from 'helmet';

export function getHelmetMiddleware() {
  return helmet({
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
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    xContentTypeOptions: true,
    crossOriginEmbedderPolicy: false,
  });
}

export function applyHelmetConfig(app: any) {
  if (process.env.NODE_ENV === 'production') {
    app.use(getHelmetMiddleware());
  }
}
