import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const FIREBASE_CONFIG = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY,
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID,
};

const firebaseApp = initializeApp(FIREBASE_CONFIG);

export const firebaseDb = getFirestore(firebaseApp);
export const firebaseStorage = getStorage(firebaseApp);
