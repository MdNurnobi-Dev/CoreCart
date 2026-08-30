const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminLiveChat.tsx', 'utf8');

code = code.replace(
  "if (!config.projectId || !config.databaseURL) {\\n        throw new Error('Missing projectId or databaseURL in JSON config');\\n      }",
  "if (!config.projectId || (!config.databaseURL && !config.authDomain)) {\\n        throw new Error('Missing projectId, or authDomain/databaseURL in JSON config');\\n      }"
);

code = code.replace(
  "const url = \\`\\${config.databaseURL}/.json\\`;",
  "const url = config.databaseURL ? \\`\\${config.databaseURL}/.json\\` : \\`https://firestore.googleapis.com/v1/projects/\\${config.projectId}/databases/(default)/documents\\`;"
);

fs.writeFileSync('src/pages/AdminLiveChat.tsx', code);
