import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

/** Telas de login/cadastro: se já estiver autenticado, manda direto para a área correta. */
export function PublicOnly() {
  const { firebaseUser, userDoc, loading } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (firebaseUser && userDoc) {
    return <Navigate to={userDoc.role === "professional" ? "/painel" : "/hoje"} replace />;
  }

  return <Outlet />;
}
