/**
 * Página usada só para gerar as capturas de tela do documento "Visão geral do
 * sistema". Monta as telas reais do aplicativo dentro do shell real (incluindo a
 * navegação inferior), com os serviços trocados por dados fictícios pela
 * configuração `vite.shots.config.ts`.
 *
 * Uso: /doc-shots.html?screen=login | rotina | perfil | modelos
 */
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/contexts/ToastContext";
import { PatientLayout } from "@/layouts/PatientLayout";
import { ProfessionalLayout } from "@/layouts/ProfessionalLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { PatientProfilePage } from "@/pages/patient/PatientProfilePage";
import { RoutinePage } from "@/pages/patient/RoutinePage";
import { RoutinesPage } from "@/pages/professional/RoutinesPage";
import "@/styles/index.css";

const screen = new URLSearchParams(location.search).get("screen") ?? "login";

const PATIENT_SCREENS: Record<string, { path: string; element: JSX.Element }> = {
  rotina: { path: "/rotina", element: <RoutinePage /> },
  perfil: { path: "/perfil", element: <PatientProfilePage /> },
};

function App() {
  if (screen === "login") {
    return (
      <MemoryRouter initialEntries={["/entrar"]}>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  if (screen === "modelos") {
    return (
      <MemoryRouter initialEntries={["/rotinas"]}>
        <Routes>
          <Route element={<ProfessionalLayout />}>
            <Route path="/rotinas" element={<RoutinesPage />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  }

  const patient = PATIENT_SCREENS[screen];
  if (!patient) return <p className="p-6">Tela desconhecida: {screen}</p>;

  return (
    <MemoryRouter initialEntries={[patient.path]}>
      <Routes>
        <Route element={<PatientLayout />}>
          <Route path={patient.path} element={patient.element} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
}

createRoot(document.getElementById("root")!).render(
  <ToastProvider>
    <App />
  </ToastProvider>
);
