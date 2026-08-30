const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  "telegram_bot_username, quick_flows FROM chat_settings LIMIT 1');",
  "telegram_bot_username, quick_flows, firebase_config FROM chat_settings LIMIT 1');"
);

// update GET admin chat_settings
// Actually SELECT * FROM chat_settings LIMIT 1 gets it already.
// Update INSERT/UPDATE
code = code.replace(
  "telegram_bot_username, telegram_notifications_enabled, quick_flows",
  "telegram_bot_username, telegram_notifications_enabled, quick_flows, firebase_config"
);
code = code.replace(
  "telegram_bot_username, telegram_notifications_enabled, quick_flows",
  "telegram_bot_username, telegram_notifications_enabled, quick_flows, firebase_config"
);
code = code.replace(
  "quick_flows = $11,",
  "quick_flows = $11, firebase_config = $13,"
);
code = code.replace(
  "is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,\\n        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,\\n        flowsJson,\\n        check.rows[0].id",
  `is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,
        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson,
        check.rows[0].id,
        req.body.firebase_config ? (typeof req.body.firebase_config === 'string' ? req.body.firebase_config : JSON.stringify(req.body.firebase_config)) : '{}'`
);
code = code.replace(
  "is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,\\n        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,\\n        flowsJson",
  `is_enabled, welcome_message, agent_name, agent_title, auto_reply_message,
        history_retention_days, telegram_bot_token, telegram_chat_id, telegram_bot_username, telegram_notifications_enabled,
        flowsJson,
        req.body.firebase_config ? (typeof req.body.firebase_config === 'string' ? req.body.firebase_config : JSON.stringify(req.body.firebase_config)) : '{}'`
);
code = code.replace(
  "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *",
  "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *"
);

fs.writeFileSync('server.ts', code);
