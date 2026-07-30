import type { ReactNode } from "react";
import { DEMO_PROFESSIONAL_USER, DEMO_USER, PATIENT_ID, PROFESSIONAL_ID } from "./demo-data";

/** Trocado para "professional" pela querystring ?role=professional na página de capturas. */
const asProfessional = new URLSearchParams(location.search).get("role") === "professional";

/**
 * Montado uma vez, fora do hook. O contexto real devolve estado do React, que é
 * estável entre renders; devolver um objeto novo a cada chamada põe em laço
 * infinito as telas que usam `firebaseUser` como dependência de efeito.
 */
const VALUE = {
  firebaseUser: {
    uid: asProfessional ? PROFESSIONAL_ID : PATIENT_ID,
    email: asProfessional ? "camila@exemplo.com" : "ana@exemplo.com",
  } as never,
  userDoc: asProfessional ? DEMO_PROFESSIONAL_USER : DEMO_USER,
  loading: false,
};

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  return VALUE;
}
