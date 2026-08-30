const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminLiveChat.tsx', 'utf8');

// I will parse and format the JSON when it loads from API
code = code.replace(
  "firebase_config: data.firebase_config || '{}',",
  `firebase_config: (() => {
              try {
                return typeof data.firebase_config === 'string' ? JSON.stringify(JSON.parse(data.firebase_config), null, 2) : JSON.stringify(data.firebase_config, null, 2);
              } catch (e) {
                return data.firebase_config || '{}';
              }
            })(),`
);

fs.writeFileSync('src/pages/AdminLiveChat.tsx', code);
