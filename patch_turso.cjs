const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://techshop-rajboss89130.aws-ap-south-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc5NDA2NDYsImlkIjoiMDFhMDQ5OGQtYWYwMS03YzM2LTk0ZTYtYjYxZGM2MzMxZGE1Iiwia2lkIjoiUWhEdDg3YTBfalp2SlFJdFFQSWpBR0xqRnJSNTdTQURaNTNUZGk5b0pMYyIsInJpZCI6IjEyYWE2NzgyLTRlOTYtNGE4MC04ZmQ3LTRlMDgyMDc5NTdmNyJ9.CqHwwm4M6RaW2qpSaJ8d0dNfEr0UyxKjc0U2fbQtbLICO-kNE-QNbn7H4vqDQAFXAfC5DWBET0E412F1yw9rDg'
});

async function run() {
  try {
    await client.execute(`ALTER TABLE chat_settings ADD COLUMN firebase_config TEXT DEFAULT '{}'`);
    console.log('Column firebase_config added successfully.');
  } catch (err) {
    if (err.message && err.message.includes('duplicate column name')) {
      console.log('Column already exists.');
    } else {
      console.error('Error:', err.message);
    }
  }
}
run();
