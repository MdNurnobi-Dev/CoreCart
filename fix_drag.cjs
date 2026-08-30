const fs = require('fs');

function fixFile(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/e\.dataTransfer\.setDragImage\(e\.currentTarget, 20, 20\);/g, "e.dataTransfer.setDragImage(e.currentTarget as Element, 20, 20);");
  fs.writeFileSync(file, code);
}

fixFile('src/pages/AdminBanners.tsx');
fixFile('src/pages/AdminHomeSettings.tsx');
