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
