/**
 * Dados fictícios usados para gerar as capturas de tela do documento "Visão geral
 * do sistema". Reproduzem a paciente "Ana Beatriz" e a profissional "Dra. Camila
 * Fernandes" do documento original, para as telas novas combinarem com as antigas.
 *
 * Nada aqui entra no aplicativo: estes módulos só são carregados pela configuração
 * `vite.shots.config.ts`, usada apenas na geração do documento.
 */
import { Timestamp } from "firebase/firestore";
import type { CompletionDoc, PatientDoc, RoutineDoc, RoutineItemDoc, UserDoc } from "@/types";
import type { PatientOverview } from "@/services/professionalOverview";

export const PATIENT_ID = "demo-ana";
export const PROFESSIONAL_ID = "demo-camila";

const now = Timestamp.now();

export const DEMO_USER: UserDoc = {
  uid: PATIENT_ID,
  role: "patient",
  name: "Ana Beatriz",
  email: "ana@exemplo.com",
  createdAt: now,
  active: true,
  notificationPrefs: {
    activityUpcoming: true,
    activityDue: true,
    activityLate: true,
    periodSummary: true,
    newActivity: true,
    activityChanged: true,
    newMessage: true,
    newReward: true,
    rewardAchieved: true,
    medicationReminder: true,
    dailySummary: false,
  },
};

export const DEMO_PROFESSIONAL_USER: UserDoc = {
  uid: PROFESSIONAL_ID,
  role: "professional",
  name: "Dra. Camila Fernandes",
  email: "camila@exemplo.com",
  createdAt: now,
  active: true,
};

export const DEMO_PATIENT: PatientDoc = {
  uid: PATIENT_ID,
  name: "Ana Beatriz",
  points: 165,
  level: 2,
  currentStreak: 4,
  longestStreak: 9,
  active: true,
  createdAt: now,
};

export const DEMO_ROUTINE: RoutineDoc = {
  id: "demo-routine",
  patientId: PATIENT_ID,
  professionalId: PROFESSIONAL_ID,
  title: "Minha rotina",
  templateKind: "priority",
  status: "active",
  createdAt: now,
  updatedAt: now,
};

type ItemSeed = Pick<RoutineItemDoc, "title" | "period" | "time" | "category" | "priority" | "icon" | "points"> &
  Partial<RoutineItemDoc>;

function item(id: string, seed: ItemSeed): RoutineItemDoc {
  return {
    id,
    routineId: DEMO_ROUTINE.id,
    patientId: PATIENT_ID,
    professionalId: PROFESSIONAL_ID,
    description: "",
    frequency: "daily",
    order: 0,
    status: "pending",
    active: true,
    createdBy: "patient",
    createdAt: now,
    updatedAt: now,
    ...seed,
  };
}

/**
 * As sete atividades do documento original, na mesma ordem e horários. As duas
 * criadas pela profissional aparecem travadas no quadro de prioridades — é o que
 * as regras do Firestore realmente fazem.
 */
export const DEMO_ITEMS: RoutineItemDoc[] = [
  item("i1", { title: "Tomar café da manhã", period: "morning", time: "08:00", category: "feeding", priority: "essential", icon: "🍽️", points: 10 }),
  item("i2", { title: "Escovar os dentes", period: "morning", time: "08:15", category: "hygiene", priority: "high", icon: "🦷", points: 5 }),
  item("i3", { title: "Medicação da manhã", period: "morning", time: "08:30", category: "medication", priority: "essential", icon: "💊", points: 15, createdBy: "professional" }),
  item("i4", { title: "Caminhada leve", period: "afternoon", time: "13:00", category: "exercise", priority: "medium", icon: "🚶", points: 15 }),
  item("i5", { title: "Bloco de estudo", period: "afternoon", time: "14:00", category: "study", priority: "high", icon: "📚", points: 15 }),
  item("i6", { title: "Respiração guiada", period: "evening", time: "20:00", category: "therapeutic", priority: "medium", icon: "🫁", points: 10, createdBy: "professional" }),
  item("i7", { title: "Preparar para dormir", period: "evening", time: "21:30", category: "sleep", priority: "low", icon: "🌙", points: 10 }),
];

/**
 * Três pacientes para o painel da profissional ter o que mostrar: uma em dia,
 * uma adiantada e um sem acessar há dias, que é o caso que dispara o alerta.
 */
export const DEMO_OVERVIEW: PatientOverview[] = [
  {
    patientId: PATIENT_ID,
    name: "Ana Beatriz",
    points: 165,
    currentStreak: 4,
    lastAccessAt: new Date(),
    todayCompleted: 1,
    todayTotal: 7,
    todayPending: 6,
    todayLate: 0,
    lastFeeling: "good",
    weekCompletionRate: 78,
    hasAttentionAlert: false,
    alerts: [],
  },
  {
    patientId: "demo-pedro",
    name: "Pedro Henrique",
    points: 40,
    currentStreak: 0,
    lastAccessAt: new Date(Date.now() - 4 * 86400000),
    todayCompleted: 0,
    todayTotal: 5,
    todayPending: 5,
    todayLate: 2,
    lastFeeling: "tired",
    weekCompletionRate: 32,
    hasAttentionAlert: true,
    alerts: ["Sem acessar o app há 4 dias"],
  },
  {
    patientId: "demo-larissa",
    name: "Larissa Souza",
    points: 210,
    currentStreak: 9,
    lastAccessAt: new Date(),
    todayCompleted: 4,
    todayTotal: 6,
    todayPending: 2,
    todayLate: 0,
    lastFeeling: "great",
    weekCompletionRate: 92,
    hasAttentionAlert: false,
    alerts: [],
  },
];

export const DEMO_COMPLETIONS: CompletionDoc[] = [
  {
    id: "c1",
    routineItemId: "i2",
    patientId: PATIENT_ID,
    date: new Date().toISOString().slice(0, 10),
    status: "completed",
    feeling: "good",
    neededHelp: false,
    pointsAwarded: 5,
    completedAt: now,
  },
];
