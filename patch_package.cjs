const fs = require('fs');
let pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.name = 'corecart';
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
