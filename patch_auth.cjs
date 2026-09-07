const fs = require('fs');

let authContext = fs.readFileSync('src/context/AuthContext.tsx', 'utf8');

authContext = authContext.replace(`    const currentToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
    if (!currentToken) {
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch('/api/user/profile', {
        headers: { 'Authorization': \`Bearer \${currentToken}\` }
      });`, `    const currentToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);
    // Even if currentToken is missing from localStorage, the HttpOnly cookie might be present.
    // If the user object exists in localStorage, it means they might be logged in via cookie.
    const hasStoredUser = typeof localStorage !== 'undefined' ? !!localStorage.getItem('user') : false;
    if (!currentToken && !hasStoredUser) {
      setLoading(false);
      return null;
    }

    try {
      const res = await fetch('/api/user/profile', {
        credentials: 'include',
        headers: currentToken ? { 'Authorization': \`Bearer \${currentToken}\` } : {}
      });`);

fs.writeFileSync('src/context/AuthContext.tsx', authContext);
