const { createClient } = require('@libsql/client');
require('dotenv').config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://techshop-rajboss89130.aws-ap-south-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3ODc5NDA2NDYsImlkIjoiMDFhMDQ5OGQtYWYwMS03YzM2LTk0ZTYtYjYxZGM2MzMxZGE1Iiwia2lkIjoiUWhEdDg3YTBfalp2SlFJdFFQSWpBR0xqRnJSNTdTQURaNTNUZGk5b0pMYyIsInJpZCI6IjEyYWE2NzgyLTRlOTYtNGE4MC04ZmQ3LTRlMDgyMDc5NTdmNyJ9.CqHwwm4M6RaW2qpSaJ8d0dNfEr0UyxKjc0U2fbQtbLICO-kNE-QNbn7H4vqDQAFXAfC5DWBET0E412F1yw9rDg'
});

const firebaseConfig = {
  apiKey: "AIzaSyDJo8tWkxHBSBsIRPMlAkKEAEmTg52_8H4",
  authDomain: "live-chat-b3b53.firebaseapp.com",
  projectId: "live-chat-b3b53",
  storageBucket: "live-chat-b3b53.firebasestorage.app",
  messagingSenderId: "808080434677",
  appId: "1:808080434677:web:974f106d085d591f126cbc"
};

async function run() {
  try {
    await client.execute({
      sql: `UPDATE chat_settings SET firebase_config = ? WHERE 1=1`,
      args: [JSON.stringify(firebaseConfig)]
    });
    console.log('Successfully seeded firebase_config');
  } catch (err) {
    console.error('Error:', err.message);
  }
}
run();
