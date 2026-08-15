import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { RequireAuth } from "@/routes/RequireAuth";
import { PublicOnly } from "@/routes/PublicOnly";
import { RootRedirect } from "@/routes/RootRedirect";
import { ForegroundNotificationListener } from "@/components/common/ForegroundNotificationListener";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

import { LoginPage } from "@/pages/auth/LoginPage";
import { RegisterPage } from "@/pages/auth/RegisterPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";

import { PrivacyPolicyPage } from "@/pages/legal/PrivacyPolicyPage";
import { TermsPage } from "@/pages/legal/TermsPage";
import { RoomRequestReplyPage } from "@/pages/legal/RoomRequestReplyPage";
import { ProposalPage } from "@/pages/legal/ProposalPage";

import { PatientLayout } from "@/layouts/PatientLayout";
import { TodayPage } from "@/pages/patient/TodayPage";
import { RoutinePage } from "@/pages/patient/RoutinePage";
import { RewardsPage } from "@/pages/patient/RewardsPage";
import { HistoryPage } from "@/pages/patient/HistoryPage";
import { PatientProfilePage } from "@/pages/patient/PatientProfilePage";

import { ProfessionalLayout } from "@/layouts/ProfessionalLayout";
import { AgendaPage } from "@/pages/professional/AgendaPage";
import { HomePage } from "@/pages/professional/HomePage";
import { RecordsPage } from "@/pages/professional/RecordsPage";
import { PatientsListPage } from "@/pages/professional/PatientsListPage";
import { PatientDetailPage } from "@/pages/professional/PatientDetailPage";
import { RoutinesPage } from "@/pages/professional/RoutinesPage";
import { ProfessionalAccountPage } from "@/pages/professional/ProfessionalAccountPage";

// Carregadas sob demanda: dependem de recharts/@react-pdf-renderer, bibliotecas pesadas
// que não devem entrar no bundle inicial de um app mobile-first.
const ReportsPage = lazy(() => import("@/pages/professional/ReportsPage").then((m) => ({ default: m.ReportsPage })));
const FinancePage = lazy(() => import("@/pages/professional/FinancePage").then((m) => ({ default: m.FinancePage })));
// Materiais e questionários são texto demais para o pacote inicial.
const AnamnesePage = lazy(() => import("@/pages/professional/AnamnesePage").then((m) => ({ default: m.AnamnesePage })));
const MaterialsPage = lazy(() => import("@/pages/professional/MaterialsPage").then((m) => ({ default: m.MaterialsPage })));
const AboutPage = lazy(() => import("@/pages/legal/AboutPage").then((m) => ({ default: m.AboutPage })));
const MaterialPage = lazy(() => import("@/pages/legal/MaterialPage").then((m) => ({ default: m.MaterialPage })));
// A bateria de esquemas sozinha são 436 itens: carrega só para quem abre.
const QuestionnairePage = lazy(() => import("@/pages/legal/QuestionnairePage").then((m) => ({ default: m.QuestionnairePage })));

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <ForegroundNotificationListener />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRedirect />} />

            <Route element={<PublicOnly />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/cadastro" element={<RegisterPage />} />
              <Route path="/esqueci-senha" element={<ForgotPasswordPage />} />
            </Route>

            <Route path="/privacidade" element={<PrivacyPolicyPage />} />
            <Route path="/termos" element={<TermsPage />} />
            {/* Aberta pelo link do e-mail, sem login: quem divide a sala não tem conta. */}
            <Route path="/sala/resposta/:token" element={<RoomRequestReplyPage />} />
            {/* Aberta pelo link da proposta, sem login: o paciente pode nem ter conta. */}
            <Route path="/proposta/:token" element={<ProposalPage />} />
            {/* Apresentação: o link que ela manda antes do convite, para a pessoa
                entender o que vai acontecer antes de criar conta. */}
            <Route
              path="/conhecer"
              element={
                <Suspense fallback={<LoadingSpinner brand />}>
                  <AboutPage />
                </Suspense>
              }
            />
            {/* Material de psicoeducação: endereço fixo por assunto, aberto por
                qualquer um com o link, sem documento no banco. */}
            <Route
              path="/material/:slug"
              element={
                <Suspense fallback={<LoadingSpinner brand />}>
                  <MaterialPage />
                </Suspense>
              }
            />
            {/* Questionário respondido pelo link, sem login — ou aberto por ela na
                sessão, para entregar o aparelho ao paciente. */}
            <Route
              path="/questionario/:token"
              element={
                <Suspense fallback={<LoadingSpinner brand />}>
                  <QuestionnairePage />
                </Suspense>
              }
            />

            <Route element={<RequireAuth role="patient" />}>
              <Route element={<PatientLayout />}>
                <Route path="/hoje" element={<TodayPage />} />
                <Route path="/rotina" element={<RoutinePage />} />
                <Route path="/recompensas" element={<RewardsPage />} />
                <Route path="/historico" element={<HistoryPage />} />
                <Route path="/perfil" element={<PatientProfilePage />} />
              </Route>
            </Route>

            <Route element={<RequireAuth role="professional" />}>
              <Route element={<ProfessionalLayout />}>
                <Route path="/inicio" element={<HomePage />} />
                {/* Rota antiga do painel: quem tinha atalho salvo continua chegando. */}
                <Route path="/painel" element={<Navigate to="/inicio" replace />} />
                <Route path="/agenda" element={<AgendaPage />} />
                <Route path="/prontuarios" element={<RecordsPage />} />
                <Route path="/pacientes" element={<PatientsListPage />} />
                <Route path="/pacientes/:patientId" element={<PatientDetailPage />} />
                <Route
                  path="/pacientes/:patientId/anamnese"
                  element={
                    <Suspense fallback={<LoadingSpinner label="Carregando anamnese..." />}>
                      <AnamnesePage />
                    </Suspense>
                  }
                />
                <Route path="/rotinas" element={<RoutinesPage />} />
                <Route
                  path="/materiais"
                  element={
                    <Suspense fallback={<LoadingSpinner label="Carregando materiais..." />}>
                      <MaterialsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/relatorios"
                  element={
                    <Suspense fallback={<LoadingSpinner label="Carregando relatórios..." />}>
                      <ReportsPage />
                    </Suspense>
                  }
                />
                <Route
                  path="/financas"
                  element={
                    <Suspense fallback={<LoadingSpinner label="Carregando finanças..." />}>
                      <FinancePage />
                    </Suspense>
                  }
                />
                <Route path="/conta" element={<ProfessionalAccountPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
