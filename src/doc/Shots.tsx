/**
 * Página usada só para gerar as capturas de tela do documento "Visão geral do
 * sistema". Monta as telas reais do aplicativo dentro do shell real (incluindo a
 * navegação inferior), com os serviços trocados por dados fictícios pela
 * configuração `vite.shots.config.ts`.
 *
 * Uso: /doc-shots.html?screen=login | rotina | perfil | modelos | dashboard
 */
import { useState } from "react";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ToastProvider } from "@/contexts/ToastContext";
import { PriorityBoard, type BoardItem } from "@/components/common/PriorityBoard";
import { PatientLayout } from "@/layouts/PatientLayout";
import { ProfessionalLayout } from "@/layouts/ProfessionalLayout";
import { LoginPage } from "@/pages/auth/LoginPage";
import { PatientProfilePage } from "@/pages/patient/PatientProfilePage";
import { RoutinePage } from "@/pages/patient/RoutinePage";
import { AgendaPage } from "@/pages/professional/AgendaPage";
import { HomePage } from "@/pages/professional/HomePage";
import { RecordsPage } from "@/pages/professional/RecordsPage";
import { RoomRequestReplyPage } from "@/pages/legal/RoomRequestReplyPage";
import { FinancePage } from "@/pages/professional/FinancePage";
import { ProposalPage } from "@/pages/legal/ProposalPage";
import { RoutinesPage } from "@/pages/professional/RoutinesPage";
import "@/styles/index.css";

const screen = new URLSearchParams(location.search).get("screen") ?? "login";

const PATIENT_SCREENS: Record<string, { path: string; element: JSX.Element }> = {
  rotina: { path: "/rotina", element: <RoutinePage /> },
  perfil: { path: "/perfil", element: <PatientProfilePage /> },
};

/** Quadro isolado, com estado local: serve para testar o gesto sem depender de gravação. */
function QuadroSolto() {
  const [items, setItems] = useState<BoardItem[]>([
    { id: "a", title: "Tomar a medicação", icon: "💊", priority: "essential", hint: "Manhã · 08:00" },
    { id: "b", title: "Comer alguma coisa", icon: "🍎", priority: "essential", hint: "Tarde" },
    { id: "c", title: "Higiene básica", icon: "🦷", priority: "high", hint: "Manhã" },
    { id: "d", title: "Organizar um cantinho", icon: "🗂️", priority: "medium", hint: "Tarde" },
    { id: "e", title: "Momento de respirar", icon: "🌿", priority: "low", hint: "Noite" },
  ]);
  return (
    <div className="mx-auto max-w-md p-4">
      <PriorityBoard items={items} onChange={setItems} />
      <pre id="estado" className="mt-3 text-xs">{items.map((i) => `${i.id}:${i.priority}`).join(" ")}</pre>
    </div>
  );
}

function App() {
  if (screen === "quadro") return <QuadroSolto />;
  if (screen === "proposta") {
    return (
      <MemoryRouter initialEntries={["/proposta/p1"]}>
        <Routes>
          <Route path="/proposta/:token" element={<ProposalPage />} />
        </Routes>
      </MemoryRouter>
    );
  }
  if (screen === "resposta") {
    return (
      <MemoryRouter initialEntries={["/sala/resposta/abc123"]}>
        <Routes>
          <Route path="/sala/resposta/:token" element={<RoomRequestReplyPage />} />
        </Routes>
      </MemoryRouter>
    );
  }
  if (screen === "login") {
    return (
      <MemoryRouter initialEntries={["/entrar"]}>
        <Routes>
          <Route path="/entrar" element={<LoginPage />} />
        </Routes>
      </MemoryRouter>
    );
  }

  const PRO: Record<string, { path: string; element: JSX.Element }> = {
    modelos: { path: "/rotinas", element: <RoutinesPage /> },
    dashboard: { path: "/inicio", element: <HomePage /> },
    agenda: { path: "/agenda", element: <AgendaPage /> },
    financas: { path: "/financas", element: <FinancePage /> },
    prontuarios: { path: "/prontuarios", element: <RecordsPage /> },
  };
  const pro = PRO[screen];
  if (pro) {
    return (
      <MemoryRouter initialEntries={[pro.path]}>
        <Routes>
          <Route element={<ProfessionalLayout />}>
            <Route path={pro.path} element={pro.element} />
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
