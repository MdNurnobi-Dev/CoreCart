const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminLiveChat.tsx', 'utf8');

code = code.replace(
  "let config = {};",
  "let config: any = {};"
);

fs.writeFileSync('src/pages/AdminLiveChat.tsx', code);
