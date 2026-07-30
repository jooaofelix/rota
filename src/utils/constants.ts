import type { ActivityCategory, FeelingKey, Period, Priority, SkipReasonKey } from "@/types";

/** Da mais para a menos urgente — é essa a ordem em que os quadros aparecem na tela. */
export const PRIORITY_ORDER: Priority[] = ["essential", "high", "medium", "low"];

export const PRIORITY_LABELS: Record<Priority, string> = {
  essential: "Indispensável",
  high: "Alta",
  medium: "Normal",
  low: "Baixa",
};

/** Texto curto que explica o que cada quadro significa, pra escolha não virar adivinhação. */
export const PRIORITY_HINTS: Record<Priority, string> = {
  essential: "Não pode faltar hoje, mesmo num dia difícil.",
  high: "Importante, mas o dia não desanda se sobrar para amanhã.",
  medium: "Faz parte da rotina, sem urgência.",
  low: "Só se sobrar energia. É opcional.",
};

export const PRIORITY_EMOJI: Record<Priority, string> = {
  essential: "🔴",
  high: "🟠",
  medium: "🟢",
  low: "🔵",
};

/** Cores dos quadros/etiquetas de prioridade (borda, fundo e texto). */
export const PRIORITY_STYLES: Record<Priority, { border: string; bg: string; text: string; chip: string }> = {
  essential: { border: "border-rose-300", bg: "bg-rose-50/70", text: "text-rose-700", chip: "bg-rose-100 text-rose-700" },
  high: { border: "border-amber-300", bg: "bg-amber-50/70", text: "text-amber-700", chip: "bg-amber-100 text-amber-700" },
  medium: { border: "border-brand-200", bg: "bg-brand-50/70", text: "text-brand-700", chip: "bg-brand-100 text-brand-700" },
  low: { border: "border-sky-200", bg: "bg-sky-50/70", text: "text-sky-700", chip: "bg-sky-100 text-sky-700" },
};

export const PERIOD_LABELS: Record<Period, string> = {
  morning: "Manhã",
  afternoon: "Tarde",
  evening: "Noite",
};

export const PERIOD_ICONS: Record<Period, string> = {
  morning: "🌅",
  afternoon: "☀️",
  evening: "🌙",
};

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  feeding: "Alimentação",
  sleep: "Sono",
  hygiene: "Higiene",
  medication: "Medicação",
  exercise: "Exercício",
  study: "Estudo",
  work: "Trabalho",
  organization: "Organização",
  relaxation: "Relaxamento",
  selfcare: "Autocuidado",
  socialization: "Socialização",
  therapeutic: "Atividade terapêutica",
  custom: "Tarefa personalizada",
};

export const CATEGORY_ICONS: Record<ActivityCategory, string> = {
  feeding: "🍽️",
  sleep: "😴",
  hygiene: "🧼",
  medication: "💊",
  exercise: "🏃",
  study: "📚",
  work: "💼",
  organization: "🗂️",
  relaxation: "🌿",
  selfcare: "💆",
  socialization: "🤝",
  therapeutic: "🧩",
  custom: "⭐",
};

export const FEELING_OPTIONS: Array<{ key: FeelingKey; label: string; emoji: string; color: string }> = [
  { key: "great", label: "Muito bem", emoji: "😄", color: "feeling-great" },
  { key: "good", label: "Bem", emoji: "🙂", color: "feeling-good" },
  { key: "neutral", label: "Normal", emoji: "😐", color: "feeling-neutral" },
  { key: "tired", label: "Cansado", emoji: "🥱", color: "feeling-tired" },
  { key: "anxious", label: "Ansioso", emoji: "😰", color: "feeling-anxious" },
  { key: "sad", label: "Triste", emoji: "😢", color: "feeling-sad" },
  { key: "angry", label: "Irritado", emoji: "😠", color: "feeling-angry" },
  { key: "difficulty", label: "Com dificuldade", emoji: "😓", color: "feeling-tired" },
  { key: "needed_help", label: "Precisei de ajuda", emoji: "🤝", color: "feeling-good" },
  { key: "not_finished", label: "Não consegui terminar", emoji: "⏸️", color: "feeling-sad" },
];

export const SKIP_REASON_OPTIONS: Array<{ key: SkipReasonKey; label: string; emoji: string }> = [
  { key: "forgot", label: "Esqueci", emoji: "💭" },
  { key: "no_time", label: "Não tive tempo", emoji: "⏰" },
  { key: "did_not_understand", label: "Não entendi", emoji: "❓" },
  { key: "tired", label: "Estava cansado", emoji: "🥱" },
  { key: "anxious", label: "Estava ansioso", emoji: "😰" },
  { key: "no_motivation", label: "Não tive vontade", emoji: "🌧️" },
  { key: "needed_help", label: "Precisei de ajuda", emoji: "🤝" },
  { key: "unexpected_event", label: "Aconteceu um imprevisto", emoji: "🌀" },
  { key: "other", label: "Outro motivo", emoji: "✏️" },
];

export const POSITIVE_MESSAGES = [
  "Muito bem! Mais uma etapa concluída.",
  "Você conseguiu! Continue assim.",
  "Cada passo conta. Você está indo bem.",
  "Obrigado por contar como você se sentiu.",
];

export const DIFFICULTY_MESSAGES = [
  "Mesmo com dificuldade, você tentou. Isso também é progresso.",
  "Está tudo bem não conseguir sempre. Obrigado por compartilhar.",
  "Reconhecer como você se sentiu já é um passo importante.",
];

export const SKIP_MESSAGES = [
  "Sem problemas. Amanhã é uma nova oportunidade.",
  "Obrigado por avisar. Isso ajuda a te acompanhar melhor.",
];

export const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

export const ICON_OPTIONS = [
  "⭐", "💧", "🦷", "📖", "🛏️", "🥗", "🧘", "🎨", "🎧", "🧴",
  "🚶", "🧩", "📝", "💊", "🛁", "🍎", "⏰", "🎯", "🧸", "🌞",
];
