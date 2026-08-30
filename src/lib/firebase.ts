import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

export const firebaseConfig = {
  apiKey: "AIzaSyDJo8tWkxHBSBsIRPMlAkKEAEmTg52_8H4",
  authDomain: "live-chat-b3b53.firebaseapp.com",
  projectId: "live-chat-b3b53",
  storageBucket: "live-chat-b3b53.firebasestorage.app",
  messagingSenderId: "808080434677",
  appId: "1:808080434677:web:974f106d085d591f126cbc"
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);
