import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import type { User } from "firebase/auth";
import { db, isFirebaseConfigured } from "@/firebase/config";
import { subscribeToAuthChanges } from "@/firebase/auth";
import type { UserDoc } from "@/types";

interface AuthContextValue {
  firebaseUser: User | null;
  userDoc: UserDoc | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  userDoc: null,
  loading: true,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sem as variáveis de ambiente do Firebase preenchidas, não há como autenticar:
    // evita deixar o app inteiro quebrado (tela em branco) e apenas mantém o usuário deslogado.
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    try {
      const unsubscribeAuth = subscribeToAuthChanges((user) => {
        setFirebaseUser(user);
        if (!user) {
          setUserDoc(null);
          setLoading(false);
        }
      });
      return unsubscribeAuth;
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    setLoading(true);
    const unsubscribeDoc = onSnapshot(
      doc(db, "users", firebaseUser.uid),
      (snapshot) => {
        setUserDoc(snapshot.exists() ? ({ uid: snapshot.id, ...snapshot.data() } as UserDoc) : null);
        setLoading(false);
      },
      () => setLoading(false)
    );
    return unsubscribeDoc;
  }, [firebaseUser]);

  return <AuthContext.Provider value={{ firebaseUser, userDoc, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
