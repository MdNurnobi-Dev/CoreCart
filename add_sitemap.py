import sys

with open('server.ts', 'r') as f:
    content = f.read()

import_statement = "import { generateSitemap } from './src/server/sitemap-generator.js';\n"
if "sitemap-generator.js" not in content:
    content = import_statement + content

injection_point = "async function startServer() {"

new_code = """
// Sitemap Generator Job (Every 1 Hour)
setInterval(() => {
  generateSitemap().catch(err => console.error(err));
}, 1000 * 60 * 60);

// Generate immediately on startup
setTimeout(() => {
  generateSitemap().catch(err => console.error(err));
}, 5000);

"""

if "generateSitemap()" not in content:
    content = content.replace(injection_point, new_code + injection_point)

    # Also add explicit routes for them just in case
    routes_point = "app.get('/api/db-status'"
    routes_code = """
app.get('/sitemap.xml', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'sitemap.xml'));
});

app.get('/robots.txt', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'robots.txt'));
});

"""
    content = content.replace(routes_point, routes_code + routes_point)
    
    with open('server.ts', 'w') as f:
        f.write(content)
    print("Sitemap generator added successfully.")
else:
    print("Already added.")
