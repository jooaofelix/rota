import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { initPwa } from "@/pwa/registerSW";
import "@/styles/index.css";

// Antes da primeira pintura, para a largura não pular depois que o React monta.
const larguraGuardada = (() => {
  try {
    return localStorage.getItem("rota-desktop-mode");
  } catch {
    return null;
  }
})();
if (larguraGuardada === "1" || (larguraGuardada === null && window.matchMedia("(min-width: 900px)").matches)) {
  document.documentElement.classList.add("desktop-mode");
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

initPwa();
