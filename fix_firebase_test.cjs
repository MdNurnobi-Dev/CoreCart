const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminLiveChat.tsx', 'utf8');

const oldCode = `      if (!config.projectId || !config.databaseURL) {
        throw new Error('Missing projectId or databaseURL in JSON config');
      }

      // Simple mock test since we don't have the SDK initialized here directly.
      // Or we can try to fetch the database URL with .json
      const url = \`\${config.databaseURL}/.json\`;`;

const newCode = `      if (!config.projectId || (!config.databaseURL && !config.authDomain)) {
        throw new Error('Missing projectId, or authDomain/databaseURL in JSON config');
      }

      // Simple mock test since we don't have the SDK initialized here directly.
      const url = config.databaseURL 
        ? \`\${config.databaseURL}/.json\`
        : \`https://firestore.googleapis.com/v1/projects/\${config.projectId}/databases/(default)/documents\`;`;

code = code.replace(oldCode, newCode);

fs.writeFileSync('src/pages/AdminLiveChat.tsx', code);
