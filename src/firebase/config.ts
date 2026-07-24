import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { initializeFirestore, getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
import { getFunctions, type Functions } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

/**
 * Sem essas variáveis (VITE_FIREBASE_*) preenchidas no ambiente de build, não há como
 * inicializar o Firebase. É essencial calcular isso ANTES de chamar getAuth/getFirestore/etc:
 * o SDK do Auth lança um erro (auth/invalid-api-key) assim que é inicializado com uma chave
 * vazia/inválida, e como isso acontecia no topo deste módulo — antes até do React montar —
 * o erro derrubava o carregamento de toda a árvore de imports (App -> AuthContext -> aqui),
 * e a tela ficava completamente em branco (nem chegava a chamar createRoot().render()).
 */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

export const firebaseApp: FirebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

let authInstance: Auth | null = null;
let firestoreInstance: Firestore | null = null;
let storageInstance: FirebaseStorage | null = null;
let functionsInstance: Functions | null = null;

if (isFirebaseConfigured) {
  try {
    authInstance = getAuth(firebaseApp);

    // Campos opcionais (ex.: horário/descrição não preenchidos) chegam como `undefined` em
    // vários formulários; ignoramos esses campos ao gravar em vez de forçar cada serviço a
    // filtrá-los. initializeFirestore só pode ser chamado uma vez por app (lança erro em
    // recarregamentos/HMR), daí o fallback para getFirestore.
    try {
      firestoreInstance = initializeFirestore(firebaseApp, { ignoreUndefinedProperties: true });
    } catch {
      firestoreInstance = getFirestore(firebaseApp);
    }

    storageInstance = getStorage(firebaseApp);
    functionsInstance = getFunctions(firebaseApp, "southamerica-east1");
  } catch (error) {
    // Nunca deixa uma falha de inicialização do Firebase quebrar o carregamento do app inteiro.
    console.error("Falha ao inicializar o Firebase. Verifique as variáveis VITE_FIREBASE_*.", error);
  }
}

// Fora do fluxo autenticado (login/cadastro/páginas legais) essas instâncias nunca são usadas
// quando o Firebase não está configurado, então o cast abaixo é seguro nesse cenário: qualquer
// tentativa real de uso sem configuração lança um erro claro no ponto de uso, em vez de derrubar
// o app inteiro no carregamento inicial.
export const auth = authInstance as Auth;
export const db = firestoreInstance as Firestore;
export const storage = storageInstance as FirebaseStorage;
export const functions = functionsInstance as Functions;
