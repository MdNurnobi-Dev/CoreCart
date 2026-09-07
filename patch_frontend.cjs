const fs = require('fs');

// Patch utils.ts
let utils = fs.readFileSync('src/lib/utils.ts', 'utf8');
utils = utils.replace(/const res = await fetch\(url, \{/g, `const res = await fetch(url, {
    credentials: 'include',`);
fs.writeFileSync('src/lib/utils.ts', utils);

// Patch api.ts
let api = fs.readFileSync('src/api.ts', 'utf8');
api = api.replace(/const response = await fetch\(\`\$\{API_URL\}\$\{endpoint\}\`, \{/g, `const response = await fetch(\`\${API_URL}\${endpoint}\`, {
    credentials: 'include',`);
fs.writeFileSync('src/api.ts', api);

// Patch AuthContext.tsx
let authContext = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

// Stop setting token in localStorage
authContext = authContext.replace(/localStorage\.setItem\('token', newToken\);/g, `// JWT is now managed via HttpOnly cookie`);
// Stop removing token from localStorage
authContext = authContext.replace(/localStorage\.removeItem\('token'\);/g, `// Token removed via backend or expiration`);

fs.writeFileSync('src/context/AuthContext.tsx', authContext);

