/**
 * Refaz as capturas de tela das telas do aplicativo usadas no documento
 * "Visão geral do sistema".
 *
 * Antes de rodar, suba o servidor de capturas noutro terminal:
 *   npx vite --config vite.shots.config.ts --mode production
 *
 * Depois:
 *   node scripts/doc/capturar.mjs
 *
 * Requer o playwright instalado (npm i -D playwright) e um Chromium disponível.
 */
import { chromium } from "playwright";

const OUT = new URL("../../docs/assets/telas", import.meta.url).pathname;
const BASE = "http://127.0.0.1:5200/doc-shots.html";

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
  locale: "pt-BR",
});

async function shot(name, query, prepare) {
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 160)));
  await page.goto(`${BASE}?${query}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  if (prepare) await prepare(page);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  const body = (await page.locator("body").innerText()).replace(/\s+/g, " ").slice(0, 110);
  console.log(`${name.padEnd(18)} ${errors.length ? "ERRO: " + errors[0] : "ok"} | ${body}`);
  await page.close();
}

await shot("login", "screen=login");

await shot("rotina", "screen=rotina");

await shot("prioridades", "screen=rotina", async (page) => {
  await page.getByRole("button", { name: /Prioridades/ }).click();
  await page.waitForTimeout(400);
});

await shot("perfil", "screen=perfil", async (page) => {
  await page.getByText("Notificações", { exact: true }).scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
});

await shot("prof-modelos", "screen=modelos&role=professional");

await shot("prof-previa", "screen=modelos&role=professional", async (page) => {
  await page.getByText("Modelo por prioridade").click();
  await page.waitForTimeout(500);
});

await browser.close();
