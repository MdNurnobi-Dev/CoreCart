const fs = require('fs');

// Add /api/auth/logout to server.ts
let server = fs.readFileSync('server.ts', 'utf8');
if (!server.includes("app.post('/api/auth/logout'")) {
  server = server.replace("app.post('/api/auth/login', authLimiter, async (req: any, res: any) => {", `app.post('/api/auth/logout', (req: any, res: any) => {
  res.clearCookie('token');
  res.json({ success: true });
});\n\napp.post('/api/auth/login', authLimiter, async (req: any, res: any) => {`);
  fs.writeFileSync('server.ts', server);
}

// Modify AuthContext to call /api/auth/logout
let auth = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');
auth = auth.replace(/const logout = useCallback\(\(\) => \{[\s\S]*?\}, \[\]\);/, `const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(console.error);
      // Token removed via backend or expiration
      localStorage.removeItem('user');
    } catch (err) {
      console.error('Failed to clear session:', err);
    }
  }, []);`);
fs.writeFileSync('src/context/AuthContext.tsx', auth);
