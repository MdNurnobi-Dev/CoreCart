const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  `        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson,
        check.rows[0].id
      ]);`,
  `        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson,
        check.rows[0].id,
        req.body.firebase_config ? (typeof req.body.firebase_config === 'string' ? req.body.firebase_config : JSON.stringify(req.body.firebase_config)) : '{}'
      ]);`
);

code = code.replace(
  `        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson
      ]);`,
  `        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson,
        req.body.firebase_config ? (typeof req.body.firebase_config === 'string' ? req.body.firebase_config : JSON.stringify(req.body.firebase_config)) : '{}'
      ]);`
);

fs.writeFileSync('server.ts', code);
