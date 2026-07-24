import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ConsentPage } from "@/pages/legal/ConsentPage";
import type { UserRole } from "@/types";

/** Garante login e, opcionalmente, um papel específico. Redireciona cada usuário para sua área correta. */
export function RequireAuth({ role }: { role?: UserRole }) {
  const { firebaseUser, userDoc, loading } = useAuth();

  if (loading) return <LoadingSpinner label="Carregando..." />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!userDoc) return <LoadingSpinner label="Preparando sua conta..." />;

  if (role && userDoc.role !== role) {
    const home = userDoc.role === "professional" ? "/painel" : "/hoje";
    return <Navigate to={home} replace />;
  }

  if (!userDoc.consentAcceptedAt) return <ConsentPage />;

  return <Outlet />;
}
