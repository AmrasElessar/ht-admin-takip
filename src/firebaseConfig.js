// src/firebaseConfig.js

import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getDatabase } from 'firebase/database'
import { getStorage } from 'firebase/storage'
// CORRECT: Import functions service
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

const auth = getAuth(app)
const db = getFirestore(app)
const realtimeDB = getDatabase(app)
const storage = getStorage(app)
// CORRECT: Initialize the functions service
const functions = getFunctions(app)

// Connect to emulators in development
if (import.meta.env.DEV) {
  // Uncomment the services you are using in the emulator
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectDatabaseEmulator(realtimeDB, 'localhost', 9000);
  // connectAuthEmulator(auth, 'http://localhost:9099');
  connectFunctionsEmulator(functions, 'localhost', 5001)
}

// CORRECT: Export the functions service alongside the others
export { app, auth, db, realtimeDB, storage, functions }
