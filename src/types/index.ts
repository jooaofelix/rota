import type { Timestamp } from "firebase/firestore";

/** Papel do usuário dentro do sistema. "guardian" fica preparado para uso futuro. */
export type UserRole = "professional" | "patient" | "guardian";

export type Period = "morning" | "afternoon" | "evening";

export type ActivityCategory =
  | "feeding"
  | "sleep"
  | "hygiene"
  | "medication"
  | "exercise"
  | "study"
  | "work"
  | "organization"
  | "relaxation"
  | "selfcare"
  | "socialization"
  | "therapeutic"
  | "custom";

/**
 * Níveis de prioridade, do mais para o menos urgente: "essential" (indispensável),
 * "high" (alta), "medium" (normal) e "low" (baixa). Rotinas antigas só usam
 * low/medium/high — "essential" foi acrescentado depois e é opcional na prática.
 */
export type Priority = "essential" | "high" | "medium" | "low";

export type ActivityStatus = "pending" | "completed" | "partial" | "skipped" | "late";

export type FeelingKey =
  | "great"
  | "good"
  | "neutral"
  | "tired"
  | "anxious"
  | "sad"
  | "angry"
  | "difficulty"
  | "needed_help"
  | "not_finished";

export type SkipReasonKey =
  | "forgot"
  | "no_time"
  | "did_not_understand"
  | "tired"
  | "anxious"
  | "no_motivation"
  | "needed_help"
  | "unexpected_event"
  | "other";

/** Modelo base de rotina utilizável ao criar novas rotinas. */
export type RoutineTemplateKind =
  | "priority"
  | "checklist"
  | "period_based"
  | "morning_routine"
  | "night_routine"
  | "sleep_hygiene"
  | "school_organization"
  | "study_routine"
  | "medication"
  | "selfcare"
  | "feeding"
  | "exercise"
  | "anxiety_support"
  | "personal_organization"
  | "custom";

/** documento em /users/{uid} */
export interface UserDoc {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
  photoURL?: string;
  createdAt: Timestamp;
  lastLoginAt?: Timestamp;
  fcmTokens?: string[];
  notificationPrefs?: NotificationPreferences;
  consentAcceptedAt?: Timestamp;
  termsAcceptedAt?: Timestamp;
  active: boolean;
}

export interface NotificationPreferences {
  activityUpcoming: boolean;
  activityDue: boolean;
  activityLate: boolean;
  periodSummary: boolean;
  newActivity: boolean;
  activityChanged: boolean;
  newMessage: boolean;
  newReward: boolean;
  rewardAchieved: boolean;
  medicationReminder: boolean;
  dailySummary: boolean;
}

/** documento em /professionals/{uid} */
export interface ProfessionalDoc {
  uid: string;
  name: string;
  profession: string;
  registrationNumber?: string;
  photoURL?: string;
  bio?: string;
  createdAt: Timestamp;
}

/** documento em /patients/{uid} */
export interface PatientDoc {
  uid: string;
  name: string;
  birthDate?: Timestamp;
  /** Só a profissional preenche e lê. O CPF é exigido pela nota fiscal. */
  cpf?: string;
  phone?: string;
  email?: string;
  /** Valor combinado da sessão, usado como padrão ao agendar. */
  defaultPrice?: number;
  /**
   * Código que a profissional entrega à pessoa para ela criar a conta e assumir
   * este cadastro. Some depois de usado.
   */
  accessCode?: string;
  /**
   * false quando o paciente existe só como cadastro da profissional, sem login.
   * A maioria dos pacientes de um consultório nunca vai abrir o aplicativo, e a
   * agenda, o prontuário e a nota não dependem disso.
   */
  hasAccount?: boolean;
  photoURL?: string;
  points: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  lastActivityDate?: string; // yyyy-MM-dd, usado para cálculo de sequência
  lastAccessAt?: Timestamp;
  privateNotes?: string; // visível apenas para a profissional
  active: boolean;
  createdAt: Timestamp;
}

/** documento em /professionalPatientLinks/{id} — vínculo profissional <-> paciente */
export interface ProfessionalPatientLink {
  id: string;
  professionalId: string;
  patientId: string;
  status: "active" | "paused" | "ended";
  createdAt: Timestamp;
}

/** documento em /guardians/{uid} — acesso limitado de responsáveis (futuro) */
export interface GuardianDoc {
  uid: string;
  name: string;
  email: string;
  patientIds: string[];
  createdAt: Timestamp;
}

/** documento em /permissions/{id} — regras finas de acesso de responsáveis/relatórios */
export interface PermissionDoc {
  id: string;
  granteeId: string;
  patientId: string;
  scope: Array<"routine" | "history" | "rewards" | "reports">;
  grantedBy: string;
  createdAt: Timestamp;
  expiresAt?: Timestamp;
}

/** documento em /routines/{id} — a rotina "container" de um paciente */
export interface RoutineDoc {
  id: string;
  patientId: string;
  professionalId: string;
  title: string;
  description?: string;
  templateKind?: RoutineTemplateKind;
  status: "active" | "paused" | "archived";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** documento em /routineItems/{id} — uma atividade dentro de uma rotina */
export interface RoutineItemDoc {
  id: string;
  routineId: string;
  patientId: string;
  professionalId: string;
  title: string;
  description?: string;
  instruction?: string;
  period: Period;
  date?: string; // yyyy-MM-dd para atividade única
  time?: string; // HH:mm
  durationMinutes?: number;
  frequency: "once" | "daily" | "weekly" | "custom_days";
  weekdays?: number[]; // 0=domingo ... 6=sábado
  category: ActivityCategory;
  priority: Priority;
  icon: string;
  imageUrl?: string;
  audioUrl?: string;
  linkUrl?: string;
  points: number;
  rewardId?: string;
  professionalNote?: string;
  notificationConfig?: ActivityNotificationConfig;
  status: ActivityStatus;
  order: number;
  active: boolean;
  /** Quem criou o item: paciente cria e edita livremente as próprias atividades; a profissional sempre pode editar tudo. */
  createdBy: "patient" | "professional";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ActivityNotificationConfig {
  enabled: boolean;
  leadMinutes: number; // antecedência
  remindersCount: number;
  repeatIfLate: boolean;
  customMessage?: string;
}

/** documento em /completions/{id} — registro de conclusão/tentativa de uma atividade em um dia */
export interface CompletionDoc {
  id: string;
  routineItemId: string;
  patientId: string;
  date: string; // yyyy-MM-dd
  status: "completed" | "partial" | "skipped";
  feeling?: FeelingKey;
  comment?: string;
  skipReason?: SkipReasonKey;
  skipReasonOther?: string;
  neededHelp: boolean;
  approxMinutesUsed?: number;
  pointsAwarded: number;
  completedAt: Timestamp;
}

/** documento em /emotionRecords/{id} — histórico dedicado de sentimentos, para gráficos */
export interface EmotionRecordDoc {
  id: string;
  patientId: string;
  completionId: string;
  routineItemId: string;
  category: ActivityCategory;
  feeling: FeelingKey;
  date: string;
  createdAt: Timestamp;
}

export type RewardCriteriaType =
  | "manual"
  | "points_threshold"
  | "first_completion"
  | "period_complete"
  | "streak_days"
  | "week_participation"
  | "feeling_logged_streak"
  | "category_improvement";

/** documento em /rewards/{id} */
export interface RewardDoc {
  id: string;
  patientId?: string; // vazio quando é um modelo genérico da profissional
  professionalId: string;
  name: string;
  description?: string;
  icon: string;
  imageUrl?: string;
  pointsRequired?: number;
  criteriaType: RewardCriteriaType;
  criteriaValue?: number;
  expiresAt?: Timestamp;
  status: "available" | "claimed" | "expired" | "disabled";
  incentiveMessage?: string;
  isAutomatic: boolean;
  requiresApproval: boolean;
  createdAt: Timestamp;
}

/** documento em /rewardAchievements/{id} — conquista efetiva de uma recompensa por um paciente */
export interface RewardAchievementDoc {
  id: string;
  patientId: string;
  rewardId: string;
  rewardName: string;
  icon: string;
  awardedBy: "system" | "professional";
  approvedByProfessionalId?: string;
  pendingApproval: boolean;
  achievedAt: Timestamp;
}

export type NotificationType =
  | "activity_upcoming"
  | "activity_due"
  | "activity_late"
  | "period_morning"
  | "period_afternoon"
  | "period_evening"
  | "new_activity"
  | "activity_changed"
  | "new_message"
  | "new_reward"
  | "reward_achieved"
  | "medication_reminder"
  | "daily_summary"
  | "activity_pending";

/** documento em /notifications/{id} */
export interface NotificationDoc {
  id: string;
  recipientId: string;
  type: NotificationType;
  title: string;
  body: string;
  routineItemId?: string;
  url?: string;
  read: boolean;
  sentAt: Timestamp;
  createdAt: Timestamp;
}

/** documento em /messages/{id} — mensagens/avisos da profissional para o paciente */
export interface MessageDoc {
  id: string;
  professionalId: string;
  patientId: string;
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

// ---------------------------------------------------------------- sessões clínicas

export type SessionStatus = "scheduled" | "done" | "no_show" | "cancelled";
export type SessionModality = "in_person" | "online";

/** "exempt" cobre atendimento social/gratuito; "package" é o pacote mensal já quitado. */
export type PaymentStatus = "pending" | "paid" | "exempt" | "overdue";
export type PaymentMethod = "pix" | "cash" | "card" | "transfer" | "insurance" | "package";

/**
 * documento em /sessions/{id} — um atendimento agendado.
 *
 * O nome do paciente fica desnormalizado porque a agenda desenha uma semana inteira
 * de uma vez: buscar o cadastro de cada paciente por célula seria uma leitura por
 * bloco na tela.
 */
export interface SessionDoc {
  id: string;
  professionalId: string;
  patientId: string;
  patientName: string;
  date: string; // yyyy-MM-dd
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  modality: SessionModality;
  status: SessionStatus;
  /** Cor do bloco na agenda, escolhida pela profissional. */
  color?: string;
  meetingUrl?: string;
  price?: number;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  paidAt?: Timestamp;
  receiptIssued?: boolean;
  /** Observação rápida da agenda — não é prontuário. */
  note?: string;
  cancelReason?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * documento em /sessionRecords/{id} — o registro clínico da sessão (prontuário).
 *
 * Fica separado de `sessions` de propósito: o prontuário é sigiloso e só a
 * profissional que atendeu pode ler, enquanto a sessão em si aparece em telas mais
 * corriqueiras. Depois de assinado (`signedAt`), o conteúdo não muda mais — correções
 * entram como adendo, que é o que a Resolução CFP 001/2009 espera de um registro.
 */
export interface SessionRecordDoc {
  id: string;
  sessionId: string;
  patientId: string;
  professionalId: string;
  date: string; // yyyy-MM-dd, repetido para listar o prontuário sem ler as sessões
  /** Demanda trazida no dia. */
  complaint?: string;
  /** Evolução: o que aconteceu na sessão. É o campo obrigatório do registro. */
  evolution: string;
  /** Procedimentos, técnicas e recursos utilizados. */
  interventions?: string;
  /** Apresentação e estado do paciente durante o atendimento. */
  patientState?: string;
  /** Plano para o próximo encontro. */
  plan?: string;
  /** Combinado/tarefa levada pelo paciente. */
  homework?: string;
  /** Encaminhamentos feitos (psiquiatria, exames, rede de apoio). */
  referral?: string;
  /** Marcação de atenção a risco, com a descrição no campo seguinte. */
  riskFlag: boolean;
  riskNote?: string;
  signedAt?: Timestamp;
  addenda?: Array<{ text: string; createdAt: Timestamp }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ---------------------------------------------------------------- sala compartilhada

/**
 * documento em /roomPartners/{id} — profissional que divide a sala.
 *
 * Não é usuário do ROTA: é um contato da dona da agenda, que recebe a escala por
 * e-mail ou em PDF. Por isso guarda e-mail e telefone, e não um uid.
 */
export interface RoomPartnerDoc {
  id: string;
  /** Dona da agenda da sala. */
  professionalId: string;
  /**
   * Marca o registro da própria dona da agenda. Ela também ocupa a sala em
   * horários, e é comparando os atendimentos dela com esses horários que o app
   * avisa quando uma consulta cai num turno de outra pessoa.
   */
  isOwner?: boolean;
  name: string;
  profession?: string;
  email?: string;
  phone?: string;
  color?: string;
  active: boolean;
  createdAt: Timestamp;
}

/**
 * documento em /roomSlots/{id} — um horário fixo da sala na semana.
 *
 * A escala da sala se repete toda semana (segunda das 7h às 12h é sempre da mesma
 * pessoa), então o horário é preso ao dia da semana e não a uma data. Trocas
 * pontuais entram como observação, não como um documento por semana.
 */
export interface RoomSlotDoc {
  id: string;
  professionalId: string;
  partnerId: string;
  partnerName: string;
  /** 0 = domingo ... 6 = sábado */
  weekday: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  room?: string;
  note?: string;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * documento em /roomRequests/{token} — aviso de uso da sala em turno de outra pessoa.
 *
 * O id do documento é um código sorteado que vai no link do e-mail: é ele que
 * autoriza a resposta. O parceiro não tem conta no ROTA, então o próprio endereço
 * funciona como credencial — por isso o documento guarda o mínimo (nomes, data e
 * horário) e nunca o e-mail nem qualquer dado de paciente.
 */
export interface RoomRequestDoc {
  id: string;
  professionalId: string;
  ownerName: string;
  partnerId: string;
  partnerName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: "pending" | "confirmed" | "declined";
  replyNote?: string;
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

/**
 * Estado de uma nota.
 *
 * "enviando" existe porque a emissão é assíncrona do lado de lá: o emissor
 * aceita o pedido e a prefeitura responde depois. Sem esse estado, uma nota em
 * processamento parecia erro e ela emitia de novo — nota duplicada é problema
 * fiscal, não de tela.
 */
export type InvoiceStatus = "rascunho" | "enviando" | "emitida" | "erro" | "cancelada";

/** documento em /invoices/{id} — uma NFS-e pedida a partir do que foi atendido. */
export interface InvoiceDoc {
  id: string;
  professionalId: string;
  sessionId?: string;
  patientId?: string;
  patientName: string;
  /** Tomador do serviço: a nota precisa do CPF de quem pagou. */
  patientCpf?: string;
  patientEmail?: string;
  description: string;
  value: number;
  /** Mês de competência, YYYY-MM-DD (dia 1 basta). */
  competencia: string;
  status: InvoiceStatus;
  /** Devolvidos pelo emissor quando a nota sai. */
  numero?: string;
  chaveAcesso?: string;
  linkPdf?: string;
  linkXml?: string;
  /** Referência do pedido no emissor, para consultar depois sem duplicar. */
  providerRef?: string;
  erro?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Como ela está cadastrada perante o fisco. Muda prazo, acesso e o que é exigido. */
export type FiscalRegime = "pj_simples" | "pj_outro" | "mei" | "autonomo" | "indefinido";

/**
 * documento em /fiscalProfiles/{uid} — dados fiscais da profissional.
 *
 * Coleção à parte de propósito: `professionals/{uid}` é legível por qualquer
 * usuário logado, porque o paciente precisa ver nome e profissão de quem o
 * atende. CNPJ, CPF e endereço não são dado de vitrine — ficam aqui, onde só a
 * dona lê.
 *
 * É o cadastro que a emissão de NFS-e vai exigir, e que o recibo já usa.
 */
export interface FiscalProfileDoc {
  uid: string;
  regime: FiscalRegime;
  /** Razão social (PJ) ou nome civil completo (autônoma). */
  legalName?: string;
  cnpj?: string;
  cpf?: string;
  /** Inscrição municipal / CCM — sem ela não há emissão em nenhum município. */
  inscricaoMunicipal?: string;
  municipio?: string;
  uf?: string;
  /** Código do serviço na lista da LC 116, ex.: "4.16" para psicologia. */
  codigoServico?: string;
  cnae?: string;
  /** Alíquota de ISS em porcentagem, ex.: 2 para 2%. */
  issAliquota?: number;
  enderecoLinha1?: string;
  cep?: string;
  /** Texto padrão da descrição do serviço na nota e no recibo. */
  descricaoPadrao?: string;
  /** Próximo número do recibo. A numeração é dela, não do sistema. */
  proximoRecibo?: number;
  updatedAt: Timestamp;
}

/**
 * documento em /referrals/{id} — registro de um encaminhamento feito.
 *
 * Guarda para quem, quando e por quê, não o texto clínico: o encaminhamento em
 * si é uma decisão do acompanhamento e merece ficar registrado, mas o que foi
 * escrito ao colega já saiu pelo WhatsApp ou pelo e-mail dela.
 */
export interface ReferralDoc {
  id: string;
  professionalId: string;
  patientId: string;
  patientName: string;
  especialidade: string;
  colleagueName?: string;
  motivo?: string;
  urgente?: boolean;
  createdAt: Timestamp;
}

export type PersonalKind = "personal" | "admin" | "study" | "break" | "errand" | "other";

/**
 * documento em /personalEvents/{id} — o que ocupa o dia dela e não é atendimento.
 *
 * Supervisão, almoço, banco, curso, buscar o filho na escola. Entra na mesma
 * agenda porque o dia é um só: sem isso, a grade mostrava horários "livres" que
 * na verdade já tinham dono, e a conta de quando ela pode atender saía errada.
 *
 * Sem horário, vira demanda do dia — uma tarefa a riscar, não um bloco na grade.
 */
export interface PersonalEventDoc {
  id: string;
  professionalId: string;
  title: string;
  note?: string;
  kind: PersonalKind;
  date: string;
  startTime?: string;
  endTime?: string;
  done?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** O que está sendo vendido. Muda o texto da proposta, não a mecânica. */
export type OfferKind = "package" | "monthly" | "single" | "assessment" | "intensive" | "gift" | "other";

/**
 * documento em /offers/{id} — o catálogo da profissional.
 *
 * É o que ela vende, escrito uma vez e reaproveitado: "pacote de 4 sessões",
 * "acompanhamento mensal", "avaliação psicológica". A proposta enviada copia
 * estes valores em vez de apontar para cá, para que mudar o preço amanhã não
 * reescreva o que alguém já recebeu.
 */
export interface OfferDoc {
  id: string;
  professionalId: string;
  title: string;
  description?: string;
  kind: OfferKind;
  /** Quantos atendimentos entram. 0 quando não se conta por sessão. */
  sessions: number;
  price: number;
  /** Preço cheio, quando existe desconto a mostrar. */
  listPrice?: number;
  /** Em quantas vezes pode dividir. 1 = à vista. */
  installments?: number;
  /** Prazo para usar as sessões, em dias. */
  validityDays?: number;
  active: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * documento em /proposals/{token} — uma proposta enviada a um paciente.
 *
 * O id é o código do link: quem o recebe abre a página de aceite sem ter conta,
 * como no aviso de uso da sala. Por isso aqui só entra o que a própria pessoa já
 * sabe (o nome dela, o que foi oferecido, o preço) — nada de prontuário, nada de
 * histórico, nada sobre outros pacientes.
 */
export interface ProposalDoc {
  id: string;
  professionalId: string;
  professionalName: string;
  patientId?: string;
  patientName: string;
  patientEmail?: string;
  title: string;
  description?: string;
  kind: OfferKind;
  sessions: number;
  price: number;
  listPrice?: number;
  installments?: number;
  validityDays?: number;
  /** Data limite para aceitar (YYYY-MM-DD). */
  validUntil: string;
  status: "sent" | "accepted" | "declined";
  replyNote?: string;
  createdAt: Timestamp;
  respondedAt?: Timestamp;
}

export type ReportKind = "summary" | "full" | "patient" | "guardian" | "medical_record" | "custom";

/** documento em /reports/{id} */
export interface ReportDoc {
  id: string;
  patientId: string;
  professionalId: string;
  kind: ReportKind;
  periodStart: string;
  periodEnd: string;
  includedCategories?: ActivityCategory[];
  includedSections: {
    activities: boolean;
    feelings: boolean;
    comments: boolean;
    rewards: boolean;
    charts: boolean;
    professionalNotes: boolean;
  };
  professionalObservation?: string;
  fileUrl?: string;
  shareToken?: string;
  shareExpiresAt?: Timestamp;
  sentTo?: Array<"patient" | "guardian" | "medical_record" | "other_professional">;
  createdAt: Timestamp;
}

/** documento em /routineTemplates/{id} — modelos reutilizáveis de rotina */
export interface RoutineTemplateDoc {
  id: string;
  professionalId: string | "system"; // "system" = modelo padrão do ROTA
  kind: RoutineTemplateKind;
  name: string;
  description: string;
  icon: string;
  /** Explicação em texto de como o modelo funciona no dia a dia. Só os modelos do sistema têm. */
  howItWorks?: string;
  /** Passos curtos mostrados na prévia, antes de aplicar o modelo. */
  steps?: string[];
  items: RoutineTemplateItem[];
  createdAt: Timestamp;
}

export interface RoutineTemplateItem {
  title: string;
  description?: string;
  instruction?: string;
  period: Period;
  time?: string;
  durationMinutes?: number;
  frequency: "once" | "daily" | "weekly" | "custom_days";
  weekdays?: number[];
  category: ActivityCategory;
  priority: Priority;
  icon: string;
  points: number;
}

/**
 * documento em /assessments/{token} — uma aplicação de questionário.
 *
 * O id é o código do link, como na proposta: o paciente responde do celular
 * dele sem precisar ter conta. Enquanto está pendente, quem tem o link lê;
 * respondido, só a profissional e o próprio paciente — resposta de
 * questionário de esquemas é dado clínico e para de circular.
 */
export interface AssessmentDoc {
  id: string;
  professionalId: string;
  professionalName: string;
  patientId: string;
  patientName: string;
  questionarioId: string;
  questionarioNome: string;
  status: "pendente" | "respondido";
  /**
   * Uma posição por item. Nos questionários de duas colunas (mãe/pai) cada
   * posição é um par; o item não respondido em uma das colunas fica em 0.
   */
  respostas?: number[];
  respostasPai?: number[];
  /** Média por fator, já apurada, na chave do fator. */
  fatores?: Record<string, number>;
  fatoresPai?: Record<string, number>;
  /** Média geral, para os questionários sem fator (YCI, YRAI). */
  media?: number;
  /** Leitura clínica dela sobre o resultado. */
  observacao?: string;
  createdAt: Timestamp;
  answeredAt?: Timestamp;
}

/**
 * documento em /anamneses/{patientId} — a anamnese daquele paciente.
 *
 * Uma por paciente, com o id do próprio paciente: anamnese é a entrada do
 * prontuário, não um registro que se repete. O que vier depois é evolução de
 * sessão, e isso já mora em sessionRecords.
 *
 * Depois de encerrada não muda mais — só recebe adendo, como manda a Resolução
 * CFP 001/2009 para documento de prontuário.
 */
export interface AnamneseDoc {
  id: string;
  patientId: string;
  professionalId: string;
  /** Respostas achatadas: "demanda.queixa" -> texto. */
  respostas: Record<string, string>;
  signedAt?: Timestamp;
  addenda?: Array<{ texto: string; createdAt: Timestamp }>;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * documento em /goals/{id} — metas dela e avisos sobre a própria agenda.
 *
 * Duas coisas que parecem diferentes e são a mesma: um plano que só existe na
 * cabeça e some. "Terminar a especialização até dezembro" e "não marcar nada em
 * julho, congresso" têm o mesmo destino quando ficam no papelzinho da mesa.
 *
 * O aviso de agenda não é decorativo: quando ela for marcar um atendimento
 * dentro do período, a tela lembra antes de gravar.
 */
export interface GoalDoc {
  id: string;
  professionalId: string;
  /** meta = algo a alcançar; agenda = período em que ela não quer (ou quer reduzir) atendimento. */
  tipo: "meta" | "agenda";
  titulo: string;
  detalhe?: string;
  /** Prazo da meta, ou início do período do aviso (YYYY-MM-DD). */
  inicio?: string;
  /** Fim do período do aviso (YYYY-MM-DD). */
  fim?: string;
  /** Meta contável: 12 livros, 40 sessões, 8 supervisões. */
  alvo?: number;
  progresso?: number;
  unidade?: string;
  concluida?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** documento em /auditLogs/{id} — trilha de alterações relevantes */
export interface AuditLogDoc {
  id: string;
  actorId: string;
  actorRole: UserRole;
  action: string;
  targetType: string;
  targetId: string;
  patientId?: string;
  details?: Record<string, unknown>;
  createdAt: Timestamp;
}
