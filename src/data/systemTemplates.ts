import { Timestamp } from "firebase/firestore";
import type { RoutineTemplateDoc, RoutineTemplateItem } from "@/types";

type ItemInput = Partial<RoutineTemplateItem> & Pick<RoutineTemplateItem, "title" | "period" | "category" | "icon">;

function item(partial: ItemInput): RoutineTemplateItem {
  return { frequency: "daily", durationMinutes: 10, points: 10, priority: "medium", ...partial };
}

const now = Timestamp.now();

/**
 * Modelos prontos oferecidos pelo ROTA. Pensados para pacientes borderline e
 * neurodivergentes: passos curtos, previsíveis, linguagem acolhedora e sem
 * excesso de estímulos. A profissional pode editar tudo antes de aplicar.
 */
export const SYSTEM_ROUTINE_TEMPLATES: RoutineTemplateDoc[] = [
  {
    id: "system-priority",
    professionalId: "system",
    kind: "priority",
    name: "Modelo por prioridade",
    description: "Organiza o dia em poucas tarefas essenciais, da mais para a menos importante. Bom para quem se sente sobrecarregado com muitas atividades.",
    icon: "🎯",
    items: [
      item({ title: "Tarefa mais importante do dia", instruction: "Escolha 1 coisa que realmente precisa ser feita hoje.", period: "morning", category: "organization", priority: "high", icon: "🎯", points: 20 }),
      item({ title: "Segunda prioridade", instruction: "Uma tarefa importante, mas que pode esperar um pouco.", period: "afternoon", category: "organization", priority: "medium", icon: "📌", points: 15 }),
      item({ title: "Se sobrar energia", instruction: "Só faça se estiver se sentindo bem. Não é obrigatório.", period: "evening", category: "custom", priority: "low", icon: "🌤️", points: 5 }),
    ],
    createdAt: now,
  },
  {
    id: "system-checklist",
    professionalId: "system",
    kind: "checklist",
    name: "Checklist simples do dia",
    description: "Uma lista curta e direta para marcar como feito, sem horários fixos. Ideal para dias mais livres ou para quem prefere menos estrutura.",
    icon: "✅",
    items: [
      item({ title: "Tomar água", period: "morning", category: "selfcare", icon: "💧", priority: "low", points: 5 }),
      item({ title: "Escovar os dentes", period: "morning", category: "hygiene", icon: "🦷", priority: "medium", points: 5 }),
      item({ title: "Comer alguma coisa", period: "afternoon", category: "feeding", icon: "🍎", priority: "medium", points: 10 }),
      item({ title: "Sair um pouco da cama/quarto", period: "afternoon", category: "selfcare", icon: "🚶", priority: "low", points: 10 }),
      item({ title: "Momento de respirar e descansar", period: "evening", category: "relaxation", icon: "🌿", priority: "low", points: 10 }),
    ],
    createdAt: now,
  },
  {
    id: "system-period_based",
    professionalId: "system",
    kind: "period_based",
    name: "Rotina por períodos do dia",
    description: "Divide as atividades em manhã, tarde e noite, com poucos itens em cada período.",
    icon: "🗓️",
    items: [
      item({ title: "Acordar e se organizar", period: "morning", time: "08:00", category: "organization", icon: "🌅", points: 10 }),
      item({ title: "Almoço com calma", period: "afternoon", time: "12:30", category: "feeding", icon: "🍽️", points: 10 }),
      item({ title: "Preparar para dormir", period: "evening", time: "21:30", category: "sleep", icon: "🌙", points: 10 }),
    ],
    createdAt: now,
  },
  {
    id: "system-morning_routine",
    professionalId: "system",
    kind: "morning_routine",
    name: "Rotina matinal",
    description: "Passos simples para começar o dia com previsibilidade, um de cada vez.",
    icon: "🌅",
    items: [
      item({ title: "Acordar e alongar", instruction: "Espreguice devagar antes de levantar.", period: "morning", time: "07:30", category: "selfcare", icon: "🌅", priority: "low", points: 5 }),
      item({ title: "Escovar os dentes", period: "morning", time: "07:45", category: "hygiene", icon: "🦷", points: 5 }),
      item({ title: "Tomar café da manhã", period: "morning", time: "08:00", category: "feeding", icon: "🍽️", points: 10 }),
      item({ title: "Tomar a medicação da manhã", period: "morning", time: "08:15", category: "medication", icon: "💊", priority: "high", points: 15, description: "Confirme com sua profissional se houver dúvida." }),
      item({ title: "Ver o que tem para o dia", instruction: "Dê uma olhada rápida na sua rotina de hoje.", period: "morning", time: "08:30", category: "organization", icon: "🗂️", points: 5 }),
    ],
    createdAt: now,
  },
  {
    id: "system-night_routine",
    professionalId: "system",
    kind: "night_routine",
    name: "Rotina noturna",
    description: "Passos calmos para encerrar o dia e preparar o sono.",
    icon: "🌙",
    items: [
      item({ title: "Guardar telas", instruction: "Desligue ou guarde celular/computador.", period: "evening", time: "21:00", category: "sleep", icon: "📵", points: 10 }),
      item({ title: "Higiene antes de dormir", period: "evening", time: "21:15", category: "hygiene", icon: "🛁", points: 5 }),
      item({ title: "Momento de calma", instruction: "Respiração, leitura leve ou música calma.", period: "evening", time: "21:30", category: "relaxation", icon: "🌿", points: 10 }),
      item({ title: "Ir para a cama", period: "evening", time: "22:00", category: "sleep", icon: "🛏️", points: 10 }),
    ],
    createdAt: now,
  },
  {
    id: "system-sleep_hygiene",
    professionalId: "system",
    kind: "sleep_hygiene",
    name: "Higiene do sono",
    description: "Hábitos para melhorar a qualidade do sono aos poucos.",
    icon: "😴",
    items: [
      item({ title: "Sem cafeína à tarde", period: "afternoon", category: "sleep", icon: "☕", priority: "low", points: 5 }),
      item({ title: "Diminuir luzes fortes", period: "evening", time: "20:30", category: "sleep", icon: "💡", points: 5 }),
      item({ title: "Ambiente para dormir", instruction: "Deixe o quarto confortável: temperatura, silêncio, escuro.", period: "evening", time: "21:30", category: "sleep", icon: "🛏️", points: 10 }),
      item({ title: "Horário fixo para dormir", period: "evening", time: "22:00", category: "sleep", icon: "⏰", priority: "high", points: 15 }),
    ],
    createdAt: now,
  },
  {
    id: "system-school_organization",
    professionalId: "system",
    kind: "school_organization",
    name: "Organização escolar",
    description: "Ajuda a organizar material e tarefas escolares sem sobrecarregar.",
    icon: "🎒",
    items: [
      item({ title: "Separar material do dia seguinte", period: "evening", category: "organization", icon: "🎒", points: 10 }),
      item({ title: "Conferir tarefas e prazos", period: "afternoon", category: "organization", icon: "📋", points: 10 }),
      item({ title: "Um bloco de estudo curto", instruction: "20 a 30 minutos, com pausa depois.", period: "afternoon", category: "study", icon: "📚", durationMinutes: 25, points: 15 }),
    ],
    createdAt: now,
  },
  {
    id: "system-study_routine",
    professionalId: "system",
    kind: "study_routine",
    name: "Rotina de estudos",
    description: "Blocos curtos de estudo com pausas, evitando sobrecarga.",
    icon: "📚",
    items: [
      item({ title: "Bloco de estudo 1", instruction: "25 minutos de foco em uma matéria só.", period: "morning", category: "study", icon: "📚", durationMinutes: 25, points: 15 }),
      item({ title: "Pausa", instruction: "Levante, beba água, descanse os olhos.", period: "morning", category: "relaxation", icon: "🌿", durationMinutes: 5, points: 5, priority: "low" }),
      item({ title: "Bloco de estudo 2", period: "afternoon", category: "study", icon: "📖", durationMinutes: 25, points: 15 }),
      item({ title: "Revisar o que aprendeu", instruction: "Sem cobrança, só revisar rapidamente.", period: "evening", category: "study", icon: "📝", points: 10, priority: "low" }),
    ],
    createdAt: now,
  },
  {
    id: "system-medication",
    professionalId: "system",
    kind: "medication",
    name: "Medicação",
    description: "Lembretes de horários de medicação com prioridade alta.",
    icon: "💊",
    items: [
      item({ title: "Medicação da manhã", period: "morning", time: "08:00", category: "medication", icon: "💊", priority: "high", points: 15 }),
      item({ title: "Medicação da tarde", period: "afternoon", time: "14:00", category: "medication", icon: "💊", priority: "high", points: 15 }),
      item({ title: "Medicação da noite", period: "evening", time: "21:00", category: "medication", icon: "💊", priority: "high", points: 15 }),
    ],
    createdAt: now,
  },
  {
    id: "system-selfcare",
    professionalId: "system",
    kind: "selfcare",
    name: "Autocuidado",
    description: "Pequenos momentos para cuidar de si mesmo ao longo do dia.",
    icon: "💆",
    items: [
      item({ title: "Cuidar da pele/corpo", period: "morning", category: "selfcare", icon: "🧴", points: 10, priority: "low" }),
      item({ title: "Momento só seu", instruction: "Algo que você goste de fazer, sem culpa.", period: "afternoon", category: "selfcare", icon: "🎨", points: 10, priority: "low" }),
      item({ title: "Check-in com você mesmo", instruction: "Pare um minuto e perceba como você está.", period: "evening", category: "selfcare", icon: "💭", points: 10 }),
    ],
    createdAt: now,
  },
  {
    id: "system-feeding",
    professionalId: "system",
    kind: "feeding",
    name: "Alimentação",
    description: "Estrutura simples de refeições ao longo do dia.",
    icon: "🍽️",
    items: [
      item({ title: "Café da manhã", period: "morning", time: "08:00", category: "feeding", icon: "🍳", points: 10 }),
      item({ title: "Almoço", period: "afternoon", time: "12:30", category: "feeding", icon: "🍽️", points: 10 }),
      item({ title: "Lanche da tarde", period: "afternoon", time: "16:00", category: "feeding", icon: "🍎", priority: "low", points: 5 }),
      item({ title: "Jantar", period: "evening", time: "19:30", category: "feeding", icon: "🍲", points: 10 }),
    ],
    createdAt: now,
  },
  {
    id: "system-exercise",
    professionalId: "system",
    kind: "exercise",
    name: "Exercícios",
    description: "Movimento leve e progressivo, sem exigir performance.",
    icon: "🏃",
    items: [
      item({ title: "Alongamento", period: "morning", category: "exercise", icon: "🤸", durationMinutes: 10, points: 10, priority: "low" }),
      item({ title: "Caminhada curta", instruction: "No seu ritmo, sem pressa.", period: "afternoon", category: "exercise", icon: "🚶", durationMinutes: 15, points: 15 }),
    ],
    createdAt: now,
  },
  {
    id: "system-anxiety_support",
    professionalId: "system",
    kind: "anxiety_support",
    name: "Atividades para ansiedade",
    description: "Ferramentas curtas de regulação emocional para momentos difíceis.",
    icon: "🧩",
    items: [
      item({ title: "Respiração guiada", instruction: "Inspire 4 segundos, segure 4, solte 6. Repita 5 vezes.", period: "morning", category: "therapeutic", icon: "🫁", durationMinutes: 5, points: 10 }),
      item({ title: "Registro de como estou me sentindo", instruction: "Sem certo ou errado, só perceber.", period: "afternoon", category: "therapeutic", icon: "📝", points: 10 }),
      item({ title: "Técnica de aterramento (5-4-3-2-1)", instruction: "Perceba 5 coisas que vê, 4 que ouve, 3 que sente, 2 que cheira, 1 que sente o gosto.", period: "evening", category: "therapeutic", icon: "🌍", durationMinutes: 5, points: 15, priority: "high" }),
    ],
    createdAt: now,
  },
  {
    id: "system-personal_organization",
    professionalId: "system",
    kind: "personal_organization",
    name: "Organização pessoal",
    description: "Pequenas tarefas para manter o espaço e a rotina em ordem.",
    icon: "🗂️",
    items: [
      item({ title: "Arrumar a cama", period: "morning", category: "organization", icon: "🛏️", priority: "low", points: 5 }),
      item({ title: "Organizar um cantinho", instruction: "Só um espaço pequeno, sem precisar arrumar tudo.", period: "afternoon", category: "organization", icon: "🗂️", points: 10 }),
      item({ title: "Planejar o dia de amanhã", period: "evening", category: "organization", icon: "📅", points: 10, priority: "low" }),
    ],
    createdAt: now,
  },
  {
    id: "system-custom",
    professionalId: "system",
    kind: "custom",
    name: "Rotina em branco",
    description: "Comece do zero e monte a rotina do seu jeito.",
    icon: "⭐",
    items: [],
    createdAt: now,
  },
];

export const TEMPLATE_KIND_LABELS: Record<string, string> = Object.fromEntries(
  SYSTEM_ROUTINE_TEMPLATES.map((t) => [t.kind, t.name])
);
