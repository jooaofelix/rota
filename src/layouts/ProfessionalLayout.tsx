import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/common/BottomNav";

export function ProfessionalLayout() {
  // A paleta da profissional é aplicada em <html> (e não aqui na div) para valer
  // também no que é renderizado em portal — folhas, diálogos e avisos.
  useEffect(() => {
    document.documentElement.classList.add("pro-theme");
    return () => document.documentElement.classList.remove("pro-theme");
  }, []);

  return (
    <div className="app-container">
      <div className="flex-1 pb-4">
        <Outlet />
      </div>
      <BottomNav variant="professional" />
    </div>
  );
}
