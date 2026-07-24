import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "./config";
import type { UserRole } from "@/types";

const googleProvider = new GoogleAuthProvider();

export function subscribeToAuthChanges(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export async function loginWithEmail(email: string, password: string) {
  const credential = await signInWithEmailAndPassword(auth, email, password);
  await touchLastLogin(credential.user.uid);
  return credential.user;
}

export async function loginWithGoogle() {
  const credential = await signInWithPopup(auth, googleProvider);
  const userRef = doc(db, "users", credential.user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    // Novo usuário via Google: cria um cadastro pendente de definição de papel (paciente por padrão,
    // a profissional é sempre convidada/criada manualmente por um administrador do sistema).
    await setDoc(userRef, {
      uid: credential.user.uid,
      role: "patient" as UserRole,
      name: credential.user.displayName ?? "",
      email: credential.user.email ?? "",
      photoURL: credential.user.photoURL ?? "",
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      active: true,
    });
  } else {
    await touchLastLogin(credential.user.uid);
  }

  return credential.user;
}

export async function registerWithEmail(name: string, email: string, password: string, role: UserRole = "patient") {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: name });

  await setDoc(doc(db, "users", credential.user.uid), {
    uid: credential.user.uid,
    role,
    name,
    email,
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    active: true,
  });

  return credential.user;
}

export async function requestPasswordReset(email: string) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await signOut(auth);
}

async function touchLastLogin(uid: string) {
  await updateDoc(doc(db, "users", uid), { lastLoginAt: serverTimestamp() }).catch(() => undefined);
}
