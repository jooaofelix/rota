import type { ReactNode } from "react";
import { DEMO_PROFESSIONAL_USER, DEMO_USER, PATIENT_ID, PROFESSIONAL_ID } from "./demo-data";

/** Trocado para "professional" pela querystring ?role=professional na página de capturas. */
const asProfessional = new URLSearchParams(location.search).get("role") === "professional";

export function AuthProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useAuth() {
  const uid = asProfessional ? PROFESSIONAL_ID : PATIENT_ID;
  return {
    firebaseUser: { uid, email: asProfessional ? "camila@exemplo.com" : "ana@exemplo.com" } as never,
    userDoc: asProfessional ? DEMO_PROFESSIONAL_USER : DEMO_USER,
    loading: false,
  };
}
