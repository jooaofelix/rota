import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
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
        if (snapshot.exists()) {
          setUserDoc({ uid: snapshot.id, ...snapshot.data() } as UserDoc);
          setLoading(false);
          return;
        }

        // Um retrato vindo do cache não prova que o perfil não existe: no primeiro
        // instante depois de abrir o app o cache local ainda está vazio, e é esse
        // retrato que chega antes da resposta do servidor. Criar o perfil aqui
        // sobrescreveria como paciente a conta de quem já é profissional — foi o
        // que aconteceu uma vez, num arranque frio logo depois de uma atualização.
        // Só o "não existe" confirmado pelo servidor vale.
        if (snapshot.metadata.fromCache) return;

        // Conta autenticada sem perfil ainda (ex.: primeiro login com Google via
        // redirecionamento, cujo retorno o Safari às vezes "perde"): cria um perfil
        // padrão de paciente agora, em vez de deixar a pessoa presa sem conseguir
        // entrar. O próprio onSnapshot dispara de novo assim que o documento existir.
        setDoc(doc(db, "users", firebaseUser.uid), {
          uid: firebaseUser.uid,
          role: "patient",
          name: firebaseUser.displayName ?? "",
          email: firebaseUser.email ?? "",
          photoURL: firebaseUser.photoURL ?? "",
          createdAt: serverTimestamp(),
          lastLoginAt: serverTimestamp(),
          active: true,
        }).catch(() => setLoading(false));
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
