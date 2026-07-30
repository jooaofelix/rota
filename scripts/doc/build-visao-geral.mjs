/**
 * Monta o documento "ROTA — Visão geral do sistema" em PDF.
 *
 * As capturas de tela ficam em docs/assets/telas. As telas que mudam são
 * refeitas com `scripts/doc/capturar.mjs`; as demais são reaproveitadas.
 *
 *   node scripts/doc/build-visao-geral.mjs
 */
import { chromium } from "playwright";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ASSETS = path.join(ROOT, "docs/assets");
const OUT_PDF = path.join(ROOT, "docs/ROTA-visao-geral.pdf");
const OUT_HTML = path.join(ROOT, "docs/.visao-geral.html");

const tela = (nome) => `assets/telas/${nome}.png`;

/** Um cartão: telefone à esquerda, título e texto à direita. */
const card = ({ img, titulo, texto, novo }) => `
  <section class="card">
    <div class="phone"><span class="notch"></span><img src="${tela(img)}" alt="" /></div>
    <div class="card-text">
      <h3>${titulo}${novo ? '<span class="tag-novo">atualizado</span>' : ""}</h3>
      <p>${texto}</p>
    </div>
  </section>`;

/** Um passo da sequência "Um dia com o ROTA". */
const passo = (n, img, legenda) => `
  <section class="step">
    <span class="step-n">${n}</span>
    <div class="phone sm"><span class="notch"></span><img src="${tela(img)}" alt="" /></div>
    <p class="step-cap">${legenda}</p>
  </section>`;

const pagina = ({ etiqueta, titulo, sub, corpo, rodape, classe = "" }) => `
<div class="page ${classe}">
  <header class="page-head">
    <span class="pill">${etiqueta}</span>
    <h2>${titulo}</h2>
    <div class="rule"></div>
    ${sub ? `<p class="sub">${sub}</p>` : ""}
  </header>
  <main>${corpo}</main>
  <footer class="page-foot">
    <span class="foot-l">🌿 ROTA — Rotina e Acompanhamento</span>
    <img class="foot-logo" src="assets/logo-compass.png" alt="" />
    <span class="foot-r">${rodape}</span>
  </footer>
</div>`;

const paginas = [];

// ---------------------------------------------------------------- capa
paginas.push(`
<div class="page capa">
  <img class="capa-logo" src="assets/logo-wordmark.png" alt="ROTA" />
  <p class="capa-frase">
    Toda jornada começa antes do primeiro passo — no momento em que se escolhe uma direção.
    ROTA nasce dessa ideia: não impor um destino, mas oferecer um caminho, traçado aos poucos,
    no ritmo de cada pessoa. Entre a rotina que acolhe e o crescimento que se conquista dia após
    dia, existe uma rota — a sua.
  </p>
</div>`);

// ---------------------------------------------------------------- rosto
paginas.push(`
<div class="page rosto">
  <div class="rosto-anel a1"></div><div class="rosto-anel a2"></div><div class="rosto-anel a3"></div>
  <img class="rosto-compass" src="assets/logo-compass.png" alt="" />
  <div class="rosto-txt">
    <p class="kicker">VISÃO GERAL DO SISTEMA</p>
    <h1>ROTA</h1>
    <p class="rosto-sub">Rotina e Acompanhamento</p>
    <p class="rosto-desc">
      Visão geral do sistema de acompanhamento de rotina entre profissional de saúde e pacientes —
      com foco em simplicidade, acolhimento e no público neurodivergente e borderline. Este
      documento mostra as principais telas e explica como cada parte funciona.
    </p>
    <div class="chips">
      <span class="chip">🔔 Lembretes inteligentes</span>
      <span class="chip">🏆 Recompensas e pontos</span>
      <span class="chip">📊 Acompanhamento em tempo real</span>
      <span class="chip">🎯 Prioridades que o paciente organiza</span>
      <span class="chip">🔒 Privacidade em primeiro lugar</span>
    </div>
  </div>
  <p class="rosto-foot">Documento gerado a partir de dados de demonstração · ROTA</p>
</div>`);

// ---------------------------------------------------------------- introdução
paginas.push(pagina({
  etiqueta: "INTRODUÇÃO",
  titulo: "O que é o ROTA",
  sub: "Para quem o sistema foi pensado e como ele funciona no dia a dia.",
  rodape: "Introdução · 1",
  corpo: `
    <p class="lead">
      O <b class="g">ROTA</b> é um aplicativo (PWA, instalável na tela inicial do celular) para
      acompanhamento diário de rotina entre uma <b class="g">profissional de saúde</b> e seus
      <b class="g">pacientes</b>. Ele foi desenhado especialmente pensando em pessoas
      neurodivergentes e pacientes com transtorno de personalidade borderline: telas simples,
      poucos elementos por vez, linguagem sempre acolhedora e <b class="g">nunca punitiva</b>.
    </p>
    <p class="lead">
      O sistema tem duas áreas completamente separadas: a <b class="g">área do paciente</b>, onde
      ele vê sua rotina do dia, marca atividades como concluídas, organiza o que é indispensável e
      registra como se sentiu; e a <b class="g">área da profissional</b>, onde ela cria e ajusta a
      rotina de cada paciente vinculado, acompanha adesão e sentimentos, entrega recompensas e
      gera relatórios.
    </p>
    <div class="grid2">
      <div class="mini"><span class="mini-ico">💬</span><div><h4>Sentimento sempre registrado</h4>
        <p>Toda conclusão de atividade pergunta obrigatoriamente "como você se sentiu?", com emojis grandes e resposta rápida.</p></div></div>
      <div class="mini"><span class="mini-ico">🤝</span><div><h4>Sem linguagem punitiva</h4>
        <p>Se o paciente não conseguir realizar algo, o app pergunta o motivo de forma gentil — nunca constrange ou cobra.</p></div></div>
      <div class="mini"><span class="mini-ico">📲</span><div><h4>Notificações mesmo fechado</h4>
        <p>Lembretes, mensagens e recompensas chegam por push, sempre pedindo permissão com uma tela explicando o benefício antes.</p></div></div>
      <div class="mini"><span class="mini-ico">🎯</span><div><h4>Rotina por prioridade</h4>
        <p>As atividades ficam em quatro níveis, do indispensável ao opcional, para que um dia difícil ainda conte como cumprido.</p></div></div>
    </div>`,
}));

// ---------------------------------------------------------------- paciente
paginas.push(pagina({
  etiqueta: "ÁREA DO PACIENTE",
  titulo: "O que o paciente vê",
  sub: "Navegação inferior simples: Hoje · Rotina · Recompensas · Histórico · Perfil.",
  rodape: "Área do paciente · 2",
  corpo: card({
    img: "login", titulo: "Login", novo: true,
    texto: "Paciente e profissional usam o mesmo aplicativo, mas cada um só enxerga sua própria área — o sistema identifica o papel do usuário e redireciona para o lugar certo. A tela ocupa o celular inteiro, com partículas em movimento ao fundo e uma frase que troca sozinha. Login por e-mail e senha ou por Google, com recuperação de senha.",
  }) + card({
    img: "hoje", titulo: "Hoje",
    texto: "A tela mais importante para o paciente: responde imediatamente \"o que eu preciso fazer agora\". Saudação com o nome, progresso do dia em um anel visual, próxima atividade em destaque, pontos, sequência de dias, recompensa mais próxima e avisos da profissional.",
  }),
}));

paginas.push(pagina({
  etiqueta: "ÁREA DO PACIENTE",
  titulo: "O que o paciente vê (continuação)",
  rodape: "Área do paciente · 3",
  corpo: card({
    img: "rotina", titulo: "Rotina", novo: true,
    texto: "Visão completa da rotina, organizada por período do dia (manhã, tarde, noite). As abas alternam entre Hoje, Prioridades, Próximos dias, Pendentes, Atrasadas e Concluídas — sem nunca sobrecarregar a tela com informação demais.",
  }) + card({
    img: "prioridades", titulo: "Prioridades", novo: true,
    texto: "Quatro quadros — indispensável, alta, normal e baixa — com a rotina inteira distribuída entre eles. A atividade muda de quadro arrastando pelo pegador, segurando o cartão e arrastando, ou tocando nele e escolhendo da lista. As atividades definidas pela profissional aparecem com cadeado: só ela muda a prioridade delas.",
  }),
}));

paginas.push(pagina({
  etiqueta: "ÁREA DO PACIENTE",
  titulo: "O que o paciente vê (continuação)",
  rodape: "Área do paciente · 4",
  corpo: card({
    img: "recompensas", titulo: "Recompensas",
    texto: "Pontos, nível, sequência de dias (streak) e medalhas conquistadas automaticamente (primeira atividade, sequências, período do dia completo), além de recompensas cadastradas pela profissional — algumas exigem pontos, outras são entregues diretamente.",
  }) + card({
    img: "historico", titulo: "Histórico",
    texto: "Registro cronológico de tudo o que já foi feito, com o sentimento escolhido em cada atividade e o comentário opcional que o paciente quis compartilhar.",
  }),
}));

paginas.push(pagina({
  etiqueta: "ÁREA DO PACIENTE",
  titulo: "O que o paciente vê (final)",
  rodape: "Área do paciente · 5",
  corpo: card({
    img: "perfil", titulo: "Perfil", novo: true,
    texto: "Código de vínculo para a profissional adicionar o paciente, e a configuração de notificações — agora em quatro grupos (lembretes das atividades, recados da profissional, recompensas e resumos) em vez de uma lista longa de opções. Quem quiser controle fino abre \"Ajustar em detalhe\". A permissão do navegador só é pedida depois de uma tela explicando o benefício. Também dá acesso à política de privacidade, termos de uso, exportação e exclusão dos próprios dados.",
  }),
}));

// ---------------------------------------------------------------- um dia
paginas.push(pagina({
  etiqueta: "NA PRÁTICA",
  titulo: "Um dia com o ROTA",
  sub: "Sequência real de interações da paciente Ana ao longo do dia — cada imagem é uma tela de verdade do sistema.",
  rodape: "Um dia com o ROTA · 6",
  classe: "grid-steps",
  corpo:
    passo(1, "hoje", "Abre o app de manhã e já sabe o que fazer.") +
    passo(2, "dia-2", 'Toca em "Tomar café da manhã".') +
    passo(3, "dia-3", 'Confirma: "Como você se sentiu?"') +
    passo(4, "dia-4", 'Escolhe "Bem" e comenta (opcional).'),
}));

paginas.push(pagina({
  etiqueta: "NA PRÁTICA",
  titulo: "Um dia com o ROTA (continuação)",
  rodape: "Um dia com o ROTA · 7",
  classe: "grid-steps",
  corpo:
    passo(5, "dia-5", "Mensagem positiva + progresso atualiza na hora.") +
    passo(6, "dia-6", 'Mais tarde, tenta a "Caminhada leve".') +
    passo(7, "dia-7", 'Não conseguiu: "Tudo bem, o que aconteceu?"') +
    passo(8, "dia-8", "Escolhe o motivo, sem julgamento."),
}));

paginas.push(pagina({
  etiqueta: "NA PRÁTICA",
  titulo: "Um dia com o ROTA (final)",
  sub: "Para fechar o dia: o que fica registrado e o que motiva a continuar amanhã.",
  rodape: "Um dia com o ROTA · 8",
  corpo: card({
    img: "dia-9", titulo: "Passo 9",
    texto: "Histórico já mostra tudo do dia, com o sentimento e o comentário de cada atividade.",
  }) + card({
    img: "dia-10", titulo: "Passo 10",
    texto: "Pontos e conquistas sempre visíveis, para o esforço do dia ficar reconhecido.",
  }),
}));

// ---------------------------------------------------------------- profissional
paginas.push(pagina({
  etiqueta: "ÁREA DA PROFISSIONAL",
  titulo: "O que a profissional vê",
  sub: "Navegação inferior: Dashboard · Pacientes · Rotinas · Relatórios · Perfil.",
  rodape: "Área da profissional · 9",
  corpo: card({
    img: "prof-dashboard", titulo: "Dashboard",
    texto: "Visão geral dos pacientes vinculados: quantos ativos, taxa de conclusão do dia, pendências e atrasos, alertas automáticos (sem diagnosticar) como queda de adesão ou ausência prolongada, e os sentimentos mais registrados no grupo.",
  }) + card({
    img: "prof-pacientes", titulo: "Pacientes",
    texto: "Lista de todos os pacientes vinculados, com busca por nome e filtros por adesão, atrasos, inatividade recente ou alertas. Acesso rápido ao perfil completo de cada um.",
  }),
}));

paginas.push(pagina({
  etiqueta: "ÁREA DA PROFISSIONAL",
  titulo: "O que a profissional vê (continuação)",
  rodape: "Área da profissional · 10",
  corpo: card({
    img: "prof-detalhe", titulo: "Detalhe do paciente",
    texto: "Abas para Visão geral (gráficos de adesão e sentimentos), Rotina (criação e edição de atividades), Histórico completo, Recompensas e Observações privadas — visíveis só para a profissional.",
  }) + card({
    img: "prof-modelos", titulo: "Modelos de rotina", novo: true,
    texto: "Biblioteca de quinze modelos prontos para aplicar a qualquer paciente: por prioridade, checklist simples, rotina matinal e noturna, higiene do sono, estudos, medicação, autocuidado, exercícios e atividades para ansiedade. Tudo editável depois de aplicado.",
  }),
}));

paginas.push(pagina({
  etiqueta: "ÁREA DA PROFISSIONAL",
  titulo: "O que a profissional vê (final)",
  rodape: "Área da profissional · 11",
  corpo: card({
    img: "prof-previa", titulo: "Prévia antes de aplicar", novo: true,
    texto: "Nenhum modelo é aplicado com um toque só. Ao escolher um, uma prévia explica <b>como aquele modelo funciona</b> — não o que ele contém, mas por que é assim — lista os passos sugeridos e mostra todas as atividades que vão entrar na rotina, agrupadas por período ou pelos quatro níveis de prioridade. Nada é gravado antes de confirmar.",
  }),
}));

// ---------------------------------------------------------------- técnico
paginas.push(pagina({
  etiqueta: "POR TRÁS DO SISTEMA",
  titulo: "Como funciona tecnicamente",
  sub: "Resumo rápido da arquitetura, para quem for acompanhar a manutenção do projeto.",
  rodape: "Como funciona · 12",
  classe: "tecnico",
  corpo: `
    <div class="tec-l">
      <ul class="tec-list">
        <li><b>PWA mobile-first</b>: React + TypeScript + Tailwind, instalável na tela inicial do
          celular, com Service Worker próprio para cache e notificações em segundo plano.</li>
        <li><b>Firebase</b>: Authentication (e-mail/senha e Google), Firestore (banco em tempo
          real), Storage (imagens, áudios, relatórios) e Cloud Messaging (push).</li>
        <li><b>Cloud Functions</b>: motor de pontos, sequência de dias e recompensas automáticas;
          lembretes agendados; exclusão de conta em cascata (LGPD).</li>
        <li><b>Relatórios em PDF</b>: gerados sob demanda, com prévia antes de enviar e escolha do
          período e das seções incluídas.</li>
      </ul>
      <div class="nota">
        <h4>Sobre as imagens deste documento</h4>
        <p>As capturas de tela usam dados fictícios de demonstração (paciente "Ana Beatriz" e
        profissional "Dra. Camila Fernandes") apenas para ilustrar o funcionamento real do sistema.</p>
      </div>
    </div>
    <div class="tec-r">
      <div class="mini"><span class="mini-ico">🔒</span><div><h4>Segurança</h4>
        <p>Regras do Firestore/Storage isolam totalmente os dados de cada paciente; a profissional só acessa quem está vinculado a ela, e o paciente só altera o que ele mesmo criou.</p></div></div>
      <div class="mini"><span class="mini-ico">🧭</span><div><h4>Sem diagnóstico automático</h4>
        <p>O sistema mostra dados e padrões para apoiar a avaliação clínica — nunca substitui o julgamento da profissional.</p></div></div>
      <div class="mini"><span class="mini-ico">📄</span><div><h4>LGPD</h4>
        <p>Consentimento, política de privacidade, exportação e exclusão de dados a qualquer momento.</p></div></div>
      <div class="mini"><span class="mini-ico">🎯</span><div><h4>Feito para acolher</h4>
        <p>Poucos elementos por tela, linguagem gentil, feedback visual em cada ação.</p></div></div>
    </div>`,
}));

// ---------------------------------------------------------------- css + build

const css = `
*, *::before, *::after { box-sizing: border-box; }
body { margin: 0; font-family: Helvetica, Arial, sans-serif; color: #16302a; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.page { position: relative; width: 210mm; height: 297mm; padding: 16mm 15mm 14mm; overflow: hidden;
  background: #fdfcf7 radial-gradient(#e6e2d6 0.6px, transparent 0.6px) 0 0 / 14px 14px; page-break-after: always; }
.page:last-child { page-break-after: auto; }

/* capa */
.capa { display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: radial-gradient(circle at 50% 42%, #f2faf6 0%, #fbfaf5 55%, #faf8f1 100%); }
.capa-logo { width: 132mm; }
.capa-frase { width: 108mm; margin-top: 9mm; font-size: 10.5pt; line-height: 1.75; font-style: italic;
  color: #5f6f68; text-align: center; }

/* rosto */
.rosto { padding: 0; display: block; background: #fbfaf5; }
.rosto-txt { position: absolute; left: 18mm; top: 62mm; width: 92mm; }
.kicker { margin: 0 0 4mm; font-size: 8.5pt; letter-spacing: .30em; font-weight: bold; color: #2f9a7c; }
.rosto h1 { margin: 0; font-size: 46pt; letter-spacing: .04em; color: #14493c; }
.rosto-sub { margin: 3mm 0 0; font-size: 15pt; color: #2f9a7c; }
.rosto-desc { margin: 8mm 0 0; font-size: 10.5pt; line-height: 1.75; color: #4b5b55; }
.chips { margin-top: 10mm; display: flex; flex-direction: column; align-items: flex-start; gap: 3mm; }
.chip { background: #fff; border: 1px solid #e7efeb; border-radius: 999px; padding: 2.6mm 5mm;
  font-size: 9pt; font-weight: bold; color: #24544a; box-shadow: 0 2px 6px rgba(20,60,50,.06); }
.rosto-compass { position: absolute; right: 8mm; top: 88mm; width: 92mm; opacity: .92; }
.rosto-anel { position: absolute; border: 1px solid #dfeee8; border-radius: 50%; }
.a1 { width: 150mm; height: 150mm; right: -20mm; top: 60mm; }
.a2 { width: 210mm; height: 210mm; right: -52mm; top: 30mm; border-style: dashed; }
.a3 { width: 96mm; height: 96mm; right: 6mm; top: 86mm; }
.rosto-foot { position: absolute; left: 0; right: 0; bottom: 12mm; text-align: center; font-size: 8pt; color: #93a49d; }

/* cabeçalho de página */
.page-head { margin-bottom: 7mm; }
.pill { display: inline-block; background: #e4f4ee; color: #1f6b58; font-size: 7.5pt; font-weight: bold;
  letter-spacing: .09em; padding: 1.6mm 3.4mm; border-radius: 4px; }
.page-head h2 { margin: 3.5mm 0 2.5mm; font-size: 21pt; color: #14493c; }
.rule { height: 2.6px; background: #2f9a7c; border-radius: 2px; }
.sub { margin: 3mm 0 0; font-size: 9.5pt; color: #7d8c86; }

/* cartões */
.card { display: flex; align-items: center; gap: 10mm; background: #fff; border-radius: 6mm;
  padding: 7mm 8mm; margin-bottom: 6mm; box-shadow: 0 3px 14px rgba(20,60,50,.055); }
.card-text h3 { margin: 0 0 3mm; font-size: 15pt; color: #14493c; }
.card-text p { margin: 0; font-size: 10pt; line-height: 1.65; color: #4b5b55; }
.tag-novo { margin-left: 3mm; vertical-align: middle; background: #2f9a7c; color: #fff; font-size: 7pt;
  font-weight: bold; letter-spacing: .06em; padding: 1.1mm 2.4mm; border-radius: 3px; text-transform: uppercase; }

/* telefone */
.phone { position: relative; flex: 0 0 auto; width: 44mm; padding: 2.2mm; background: #12362c;
  border-radius: 7mm; box-shadow: 0 5px 16px rgba(18,54,44,.28); }
.phone img { display: block; width: 100%; border-radius: 5mm; }
.notch { position: absolute; top: 3.4mm; left: 50%; transform: translateX(-50%); width: 14mm; height: 1.5mm;
  background: #12362c; border-radius: 999px; z-index: 2; }
.phone.sm { width: 38mm; }

/* sequência de passos */
.grid-steps main { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; }
.step { position: relative; background: #fff; border-radius: 6mm; padding: 7mm 5mm 5mm; text-align: center;
  box-shadow: 0 3px 14px rgba(20,60,50,.055); }
.step-n { position: absolute; left: 5mm; top: 5mm; width: 6.5mm; height: 6.5mm; border-radius: 50%;
  background: #2f9a7c; color: #fff; font-size: 8.5pt; font-weight: bold; line-height: 6.5mm; }
.step .phone { margin: 0 auto; }
.step-cap { margin: 4mm 0 0; font-size: 9pt; color: #4b5b55; }

/* introdução */
.lead { font-size: 10.5pt; line-height: 1.75; color: #3d4f49; margin: 0 0 4mm; }
.g { color: #217c64; }
.grid2 { margin-top: 6mm; display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }
.mini { display: flex; gap: 4mm; background: #fff; border-radius: 5mm; padding: 5.5mm;
  box-shadow: 0 3px 12px rgba(20,60,50,.05); }
.mini-ico { font-size: 15pt; line-height: 1; }
.mini h4 { margin: 0 0 1.8mm; font-size: 11pt; color: #14493c; }
.mini p { margin: 0; font-size: 8.8pt; line-height: 1.6; color: #5b6b65; }

/* página técnica */
.tecnico main { display: grid; grid-template-columns: 1fr 1fr; gap: 7mm; align-items: start; }
.tec-list { margin: 0; padding-left: 5mm; }
.tec-list li { font-size: 10pt; line-height: 1.7; color: #3d4f49; margin-bottom: 3.5mm; }
.tec-list b { color: #14493c; }
.nota { margin-top: 6mm; background: #eaf6f1; border-radius: 5mm; padding: 6mm; }
.nota h4 { margin: 0 0 2.5mm; font-size: 11pt; color: #14493c; }
.nota p { margin: 0; font-size: 8.8pt; line-height: 1.65; color: #5b6b65; }
.tec-r { display: flex; flex-direction: column; gap: 5mm; }

/* rodapé */
.page-foot { position: absolute; left: 15mm; right: 15mm; bottom: 9mm; display: flex; align-items: center;
  justify-content: space-between; font-size: 7.5pt; color: #93a49d; }
.foot-logo { width: 7mm; opacity: .55; }
`;

const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" />
<title>ROTA — Visão geral do sistema</title><style>${css}</style></head>
<body>${paginas.join("\n")}</body></html>`;

fs.writeFileSync(OUT_HTML, html);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
});
const page = await browser.newPage();
await page.goto(`file://${OUT_HTML}`, { waitUntil: "networkidle" });
await page.pdf({ path: OUT_PDF, format: "A4", printBackground: true,
  margin: { top: "0", bottom: "0", left: "0", right: "0" } });
await browser.close();
fs.unlinkSync(OUT_HTML);
console.log("gerado:", OUT_PDF, `(${paginas.length} páginas)`);
