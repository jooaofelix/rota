import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { initPwa } from "@/pwa/registerSW";
import "@/styles/index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);

initPwa();
