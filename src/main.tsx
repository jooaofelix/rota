import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { initPwa } from "@/pwa/registerSW";
import "@/styles/index.css";

if (localStorage.getItem("rota-desktop-mode") === "1") {
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
