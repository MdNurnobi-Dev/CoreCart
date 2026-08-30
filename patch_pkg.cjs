const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!pkg.scripts['build:cf']) {
  pkg.scripts['build:cf'] = 'vite build';
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
}
