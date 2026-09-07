const fs = require('fs');
const path = require('path');
const execSync = require('child_process').execSync;

const files = execSync('grep -rl "CoreCart" . --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git').toString().trim().split('\n');

files.forEach(file => {
  if (file && fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    let updated = content.replace(/CoreCart/g, 'CoreCart');
    updated = updated.replace(/corecart/g, 'corecart');
    fs.writeFileSync(file, updated);
    console.log(`Updated ${file}`);
  }
});
