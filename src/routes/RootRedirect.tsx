import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

export function RootRedirect() {
  const { firebaseUser, userDoc, loading } = useAuth();

  if (loading) return <LoadingSpinner brand />;
  if (!firebaseUser) return <Navigate to="/login" replace />;
  if (!userDoc) return <LoadingSpinner label="Preparando sua conta..." />;

  return <Navigate to={userDoc.role === "professional" ? "/painel" : "/hoje"} replace />;
}
