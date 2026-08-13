/**
 * Configuração usada apenas para gerar as capturas de tela do documento
 * "Visão geral do sistema". Troca os serviços que falam com o Firebase por
 * versões com dados fictícios (src/doc/mock-*), mantendo os componentes reais.
 *
 * Os apelidos específicos vêm antes do "@" genérico, e os mocks alcançam os
 * módulos verdadeiros por caminho relativo — que não passa por estes apelidos.
 */
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const r = (p: string) => path.resolve(__dirname, p);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@/contexts/AuthContext", replacement: r("./src/doc/mock-auth.tsx") },
      { find: "@/services/routines", replacement: r("./src/doc/mock-routines.ts") },
      { find: "@/services/completions", replacement: r("./src/doc/mock-completions.ts") },
      { find: "@/services/patients", replacement: r("./src/doc/mock-patients.ts") },
      { find: "@/services/templates", replacement: r("./src/doc/mock-templates.ts") },
      { find: "@/services/professionalOverview", replacement: r("./src/doc/mock-overview.ts") },
      { find: "@/services/roomRequests", replacement: r("./src/doc/mock-roomrequests.ts") },
      { find: "@/services/room", replacement: r("./src/doc/mock-room.ts") },
      { find: "@/services/sessions", replacement: r("./src/doc/mock-sessions.ts") },
      { find: "@/services/offers", replacement: r("./src/doc/mock-offers.ts") },
      { find: "@/services/personalEvents", replacement: r("./src/doc/mock-personal.ts") },
      { find: "@/services/referrals", replacement: r("./src/doc/mock-referrals.ts") },
      { find: "@/services/invoices", replacement: r("./src/doc/mock-invoices.ts") },
      { find: "@/services/assessments", replacement: r("./src/doc/mock-assessments.ts") },
      { find: "@/services/notifications", replacement: r("./src/doc/mock-notifications.ts") },
      { find: "@/firebase/auth", replacement: r("./src/doc/mock-fbauth.ts") },
      { find: "@/firebase/messaging", replacement: r("./src/doc/mock-messaging.ts") },
      { find: "virtual:pwa-register", replacement: r("./src/doc/mock-pwa-register.ts") },
      { find: "@", replacement: r("./src") },
    ],
  },
  // Sem isto o scanner rastreia o index.html do app e topa com o módulo virtual do PWA.
  optimizeDeps: { entries: ["doc-shots.html"] },
  server: { port: 5200, host: "127.0.0.1" },
});
