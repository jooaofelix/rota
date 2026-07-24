import type { ActivityCategory, FeelingKey, Period, SkipReasonKey } from "@/types";

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
