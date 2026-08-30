const fs = require('fs');
let code = fs.readFileSync('src/pages/AdminLiveChat.tsx', 'utf8');

// Add firebase_config to settings state
code = code.replace(
  "telegram_notifications_enabled: true,",
  "telegram_notifications_enabled: true,\n    firebase_config: '{}',"
);

// Add initialization of firebase config
code = code.replace(
  "telegram_bot_username: data.telegram_bot_username || '',",
  "telegram_bot_username: data.telegram_bot_username || '',\n            firebase_config: data.firebase_config || '{}',"
);

// Add Firebase tab / Settings in UI
// The settings tab currently just ends with some divs. I will inject a section for Firebase configuration.
// Wait, I need to know what the settings tab looks like.
fs.writeFileSync('src/pages/AdminLiveChat.tsx', code);
