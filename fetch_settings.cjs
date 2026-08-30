const { createClient } = require('@libsql/client');
require('dotenv').config();

async function run() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL || 'libsql://techshop-rajboss89130.aws-ap-south-1.turso.io',
    authToken: process.env.TURSO_AUTH_TOKEN
  });

  const res = await client.execute('SELECT firebase_config FROM chat_settings LIMIT 1');
  console.log('DB firebase_config:', res.rows[0].firebase_config);
}
run();
