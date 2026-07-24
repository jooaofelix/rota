import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(firebaseApp);

// Campos opcionais (ex.: horário/descrição não preenchidos) chegam como `undefined` em vários
// formulários; ignoramos esses campos ao gravar em vez de forçar cada serviço a filtrá-los.
// initializeFirestore só pode ser chamado uma vez por app (lança erro em recarregamentos/HMR).
let firestoreInstance;
try {
  firestoreInstance = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
} catch {
  firestoreInstance = getFirestore(firebaseApp);
}
export const db = firestoreInstance;

export const storage = getStorage(firebaseApp);
export const functions = getFunctions(firebaseApp, "southamerica-east1");

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);
