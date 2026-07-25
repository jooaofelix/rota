# ROTA — Rotina e Acompanhamento

Aplicativo (PWA) para acompanhamento diário de rotina entre uma profissional de saúde e seus
pacientes, pensado especialmente para o público neurodivergente e para pacientes borderline:
telas simples, poucos elementos por vez, linguagem acolhedora e nunca punitiva.

## 1. Resumo da solução

Duas áreas completamente separadas dentro do mesmo app:

- **Paciente**: vê "o que precisar fazer agora", marca atividades como concluídas, registra como
  se sentiu, acompanha pontos/recompensas e recebe lembretes.
- **Profissional**: cria e ajusta a rotina de cada paciente vinculado, acompanha adesão e
  sentimentos, entrega recompensas, gera relatórios em PDF e recebe alertas (não-diagnósticos).

O sistema é mobile-first, instalável como PWA (ícone na tela inicial) e envia notificações push
mesmo com o app fechado, sempre pedindo permissão com uma tela explicativa antes de acionar o
prompt do navegador.

## 2. Arquitetura

```
Cliente (React + Vite, PWA)  ─────┐
                                   │  Firestore (dados) / Auth / Storage / FCM
Cloud Functions (Node, Admin SDK) ─┘  (regras de negócio server-side: pontos, streak,
                                       recompensas automáticas, envio de push, lembretes
                                       agendados, exclusão de conta)

Hospedagem do front-end: Cloudflare Pages
Backend: Firebase (Auth, Firestore, Storage, Cloud Messaging, Cloud Functions)
```

Por que parte da lógica fica em Cloud Functions e não só no cliente: pontos, sequência (streak) e
conquistas automáticas não podem depender só do cliente (o paciente poderia manipular o próprio
progresso), e notificações agendadas/push em segundo plano exigem um processo rodando no
servidor, não no navegador do usuário.

> **Cloud Functions (plano Blaze):** pontos, sequência de dias, conquistas automáticas,
> notificações push e lembretes agendados dependem das Cloud Functions, que exigem o plano pago
> (Blaze) do Firebase — mesmo dentro da faixa gratuita de uso. O vínculo profissional↔paciente não
> depende de Cloud Function: o paciente compartilha um "código" (o próprio uid, visível em Perfil
> > Seu código) em vez de a profissional buscar por e-mail.

## 3. Tecnologias

- React 18 + TypeScript + Vite
- Tailwind CSS (design mobile-first)
- React Router (rotas separadas por papel)
- Firebase: Authentication, Firestore, Storage, Cloud Messaging, Cloud Functions (2ª geração)
- `@react-pdf/renderer` para geração de relatórios em PDF (client-side)
- `recharts` para os gráficos simples do dashboard
- PWA via `vite-plugin-pwa` (estratégia `injectManifest`, Service Worker próprio combinando
  cache do app shell + Firebase Cloud Messaging em segundo plano)
- Cloudflare Pages para hospedagem do front-end

## 4. Estrutura de telas

**Paciente** (navegação inferior: Hoje · Rotina · Recompensas · Histórico · Perfil)
- Hoje: saudação, progresso do dia, próxima atividade, pendentes, recompensa mais próxima, avisos
- Rotina: abas Hoje / Próximos dias / Pendentes / Atrasadas / Concluídas, organizada por período
- Recompensas: pontos, nível, sequência de dias, conquistas, recompensas disponíveis
- Histórico: linha do tempo de tudo que foi registrado (sentimentos, comentários, motivos)
- Perfil: notificações (com tela de permissão explicativa), privacidade, exportar/excluir dados

**Profissional** (navegação inferior: Dashboard · Pacientes · Rotinas · Relatórios · Perfil)
- Dashboard: indicadores gerais, alertas, sentimentos mais registrados
- Pacientes: busca e filtros (pendentes, atrasados, sem acesso recente, com alerta)
- Perfil do paciente: abas Visão geral (gráficos) / Rotina (CRUD + modelos) / Histórico /
  Recompensas / Observações privadas
- Rotinas: biblioteca de modelos prontos + modelos personalizados, aplicáveis a qualquer paciente
- Relatórios: geração em PDF (resumido/completo/paciente/responsável/prontuário/personalizado)

## 5. Modelos de rotina prontos

Em `src/data/systemTemplates.ts`, incluindo os pedidos explicitamente:

- **Por prioridade** — poucas tarefas essenciais, da mais para a menos importante
- **Checklist simples** — lista curta sem horários fixos
- Por períodos do dia, rotina matinal, rotina noturna, higiene do sono, organização escolar,
  rotina de estudos, medicação, autocuidado, alimentação, exercícios, atividades para ansiedade
  (respiração guiada, técnica 5-4-3-2-1), organização pessoal e um modelo em branco

A profissional pode aplicar qualquer modelo a um paciente e editar tudo depois, ou salvar seus
próprios modelos personalizados.

## 6. Banco de dados (Firestore)

| Coleção | Função | Campos principais |
|---|---|---|
| `users` | Conta de login (papel, prefs de notificação) | `role`, `name`, `email`, `fcmTokens`, `notificationPrefs` |
| `professionals` | Dados específicos da profissional | `profession`, `bio` |
| `patients` | Dados de progresso do paciente | `points`, `level`, `currentStreak`, `privateNotes` |
| `professionalPatientLinks` | Vínculo profissional↔paciente (id determinístico `{profId}_{patientId}`) | `status` |
| `routines` | "Container" da rotina de um paciente | `title`, `templateKind`, `status` |
| `routineItems` | Cada atividade | `period`, `frequency`, `weekdays`, `category`, `priority`, `points`, `notificationConfig` |
| `completions` | Registro de conclusão/tentativa por dia | `status`, `feeling`, `comment`, `skipReason`, `pointsAwarded` |
| `emotionRecords` | Histórico dedicado de sentimentos (para gráficos) | `feeling`, `category`, `date` |
| `rewards` | Recompensas (manuais ou automáticas) | `criteriaType`, `pointsRequired`, `isAutomatic` |
| `rewardAchievements` | Conquistas efetivas | `awardedBy`, `pendingApproval` |
| `notifications` | Notificações in-app + push | `type`, `recipientId`, `read` |
| `reports` | Metadados dos relatórios gerados | `kind`, `periodStart/End`, `fileUrl` |
| `messages` | Avisos da profissional para o paciente | `text`, `read` |
| `routineTemplates` | Modelos personalizados da profissional | `kind`, `items[]` |
| `auditLogs` | Trilha de ações sensíveis (ex.: exclusão de conta) | `action`, `targetId` |
| `guardians` / `permissions` | Preparado para acesso futuro de pais/responsáveis | — |
| `notificationDedup` | Uso interno das Cloud Functions (idempotência de lembretes) | — |

## 7. Tipos de usuário e regras de acesso

- `patient`: só acessa os próprios documentos.
- `professional`: só acessa pacientes com vínculo ativo em `professionalPatientLinks`.
- `guardian`: modelado no schema, sem telas ainda (acesso futuro e limitado).

Regras reais em `firestore.rules` e `storage.rules` (nunca abertas). O vínculo usa um **id
determinístico** (`{professionalId}_{patientId}`) justamente para que as regras consigam validar
o acesso com `exists()`/`get()`, sem precisar de queries dentro das regras. Para vincular um
paciente, a profissional usa o **código do paciente** (o próprio uid, visível em Perfil > Seu
código no app do paciente) em vez de buscar por e-mail — assim nenhuma profissional consegue
"descobrir" ou listar pacientes não vinculados a ela, sem precisar de Cloud Function nenhuma.

## 8. Notificações

- Antes de pedir permissão do navegador, sempre mostramos uma tela explicando o benefício
  (`NotificationPrimer`).
- Token FCM salvo em `users.fcmTokens`. Envio de push feito por Cloud Functions
  (`onNotificationCreate` dispara ao criar qualquer doc em `notifications`) e lembretes automáticos
  (`routineReminders`, roda a cada 10 min: atividade próxima, no horário, atrasada; resumo diário
  às 20h; resumos de período às 7h30/12h30/18h30).
- Paciente escolhe quais tipos de notificação quer receber em `users.notificationPrefs`.

## 9. Recompensas

- Pontos, nível, sequência de dias, medalhas (`rewardAchievements`).
- Automáticas: primeira atividade concluída, marcos de sequência (3/7/14/30/60/100 dias), período
  do dia completo. Ids determinísticos evitam conquistas duplicadas. Calculado pela Cloud Function
  `onCompletionCreate` (Admin SDK), disparada ao criar um documento em `completions`.
- Manuais: a profissional cria e também pode **entregar diretamente**, mesmo sem pontuação.

## 10. Relatórios

Gerados no cliente com `@react-pdf/renderer` (prévia com `PDFViewer`, download com
`PDFDownloadLink`), a partir de dados agregados em `src/services/reportData.ts`. Ao salvar, o PDF
é enviado ao Storage (`patients/{id}/reports/{id}.pdf`) e a metadata gravada em `reports`. Antes
de gerar relatório para responsáveis/paciente, a tela avisa para revisar o que será incluído.

## 11. Etapas de desenvolvimento (concluídas nesta primeira versão)

1. Estrutura inicial do projeto (Vite + Tailwind + PWA)
2. Login e autenticação (e-mail/senha, Google, recuperação de senha)
3. Separação profissional/paciente com redirecionamento automático
4. Cadastro e vínculo de pacientes (por código do paciente, sem expor busca ao cliente)
5. Criação de rotina pela profissional + modelos prontos
6. Tela de rotina do paciente (por período/hoje/próximos/pendentes/atrasadas/concluídas)
7. Conclusão de atividades
8. Registro obrigatório de sentimento a cada conclusão
9. Notificações (permissão explicada, push em segundo plano, lembretes agendados)
10. Pontos e recompensas (automáticas via Cloud Function + manuais)
11. Dashboard geral da profissional
12. Dashboard individual por paciente (gráficos simples)
13. Relatórios em PDF
14. Privacidade: termos, política, consentimento, exportar dados, excluir conta (com Cloud
    Function de exclusão em cascata)
15. Build e typecheck validados (`npm run build` no app e nas functions)

## Como rodar localmente

```bash
npm install
cp .env.example .env   # preencha com as chaves do seu projeto Firebase
npm run dev
```

### Configurar o Firebase

1. Crie um projeto em https://console.firebase.google.com
2. Ative Authentication (métodos E-mail/senha e Google), Firestore, Storage e Cloud Messaging
3. Gere uma chave VAPID em *Cloud Messaging > Certificados push da Web* e coloque em
   `VITE_FIREBASE_VAPID_KEY`
4. `firebase deploy --only firestore:rules,firestore:indexes,storage:rules`
5. `cd functions && npm install && npm run build && firebase deploy --only functions`

### Deploy do front-end (Cloudflare Pages)

- Build command: `npm run build`
- Output directory: `dist`
- Configure as mesmas variáveis `VITE_FIREBASE_*` no painel do Cloudflare Pages

## Estrutura de pastas

```
src/
  components/   componentes reutilizáveis (common/, patient/, professional/)
  contexts/     AuthContext, ToastContext
  data/         modelos de rotina do sistema
  firebase/     config, auth, firestore, storage, messaging
  layouts/      shells com navegação inferior
  pages/        telas por área (auth/, legal/, patient/, professional/)
  pdf/          template do relatório em PDF
  routes/       proteção de rotas por papel
  services/     regras de acesso a dados (Firestore/Storage/Functions)
  sw/           service worker (cache + push)
  types/        modelos de dados compartilhados
  utils/        datas, agenda, pontos, constantes/textos
functions/src/  Cloud Functions (triggers, agendadas, callable)
```
