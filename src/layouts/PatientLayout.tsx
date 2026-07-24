import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/common/BottomNav";

export function PatientLayout() {
  return (
    <div className="app-container">
      <div className="flex-1 pb-4">
        <Outlet />
      </div>
      <BottomNav variant="patient" />
    </div>
  );
}
