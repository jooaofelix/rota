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
 *
 * Cada modelo traz um `howItWorks` (e, quando ajuda, `steps`) porque a prévia
 * explica o modelo antes de aplicar — ninguém deveria aceitar uma rotina sem
 * entender o que ela propõe.
 */
export const SYSTEM_ROUTINE_TEMPLATES: RoutineTemplateDoc[] = [
  {
    id: "system-priority",
    professionalId: "system",
    kind: "priority",
    name: "Modelo por prioridade",
    description: "Separa o dia em quatro níveis de importância, do que não pode faltar ao que é só bônus.",
    icon: "🎯",
    howItWorks:
      "As atividades ficam distribuídas em quatro quadros: indispensável, alta, normal e baixa. A ideia é que, num dia ruim, dê para fazer só o quadro indispensável e o dia ainda conte como cumprido. O resto é ganho, não cobrança.",
    steps: [
      "Arraste cada atividade para o quadro que combina com a sua rotina.",
      "Deixe poucas coisas em indispensável: duas ou três já bastam.",
      "O que ficar em baixa é opcional, sem culpa se não acontecer.",
    ],
    items: [
      item({ title: "Tomar a medicação", instruction: "Se você usa medicação, esse é o item que não pode faltar.", period: "morning", time: "08:00", category: "medication", priority: "essential", icon: "💊", points: 20 }),
      item({ title: "Comer alguma coisa", instruction: "Não precisa ser uma refeição completa. Só não passar o dia sem comer.", period: "afternoon", category: "feeding", priority: "essential", icon: "🍎", points: 20 }),
      item({ title: "Tarefa mais importante do dia", instruction: "Escolha 1 coisa que realmente precisa ser feita hoje.", period: "morning", category: "organization", priority: "high", icon: "🎯", points: 15 }),
      item({ title: "Higiene básica", instruction: "Escovar os dentes e lavar o rosto já contam.", period: "morning", category: "hygiene", priority: "high", icon: "🦷", points: 10 }),
      item({ title: "Beber água ao longo do dia", period: "afternoon", category: "selfcare", priority: "high", icon: "💧", points: 10 }),
      item({ title: "Sair um pouco do quarto", instruction: "Mudar de ambiente por alguns minutos.", period: "afternoon", category: "selfcare", priority: "medium", icon: "🚶", points: 10 }),
      item({ title: "Organizar um cantinho", instruction: "Só um espaço pequeno, sem precisar arrumar tudo.", period: "afternoon", category: "organization", priority: "medium", icon: "🗂️", points: 10 }),
      item({ title: "Momento de respirar", instruction: "Cinco minutos de pausa, sem tela.", period: "evening", category: "relaxation", priority: "low", icon: "🌿", durationMinutes: 5, points: 5 }),
      item({ title: "Algo só pra você", instruction: "Se sobrar energia. Algo que você goste, sem culpa.", period: "evening", category: "selfcare", priority: "low", icon: "🎨", points: 5 }),
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
    howItWorks:
      "Nenhuma atividade tem horário marcado: elas ficam disponíveis o dia inteiro e são marcadas quando acontecem. Serve para quem se sente cobrado por relógio, ou para dias em que a agenda é imprevisível.",
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
    howItWorks:
      "O dia é dividido em três blocos — manhã, tarde e noite — com uma atividade âncora em cada. Em vez de seguir horários exatos, a pessoa só precisa saber em que parte do dia está. Bom para quem perde a noção do tempo.",
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
    howItWorks:
      "Uma sequência curta de passos encadeados, do acordar até olhar o dia. Cada passo puxa o seguinte, então não é preciso decidir o que fazer depois — o que reduz a paralisia de começar o dia.",
    items: [
      item({ title: "Acordar e alongar", instruction: "Espreguice devagar antes de levantar.", period: "morning", time: "07:30", category: "selfcare", icon: "🌅", priority: "low", points: 5 }),
      item({ title: "Escovar os dentes", period: "morning", time: "07:45", category: "hygiene", icon: "🦷", points: 5 }),
      item({ title: "Tomar café da manhã", period: "morning", time: "08:00", category: "feeding", icon: "🍽️", points: 10 }),
      item({ title: "Tomar a medicação da manhã", period: "morning", time: "08:15", category: "medication", icon: "💊", priority: "essential", points: 15, description: "Confirme com sua profissional se houver dúvida." }),
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
    howItWorks:
      "Os passos vão baixando o estímulo aos poucos: primeiro as telas saem de cena, depois a higiene, depois um momento calmo e só então a cama. A ordem importa mais que o horário exato.",
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
    howItWorks:
      "As atividades começam de tarde, não de noite: o sono depende do que acontece nas horas anteriores. São hábitos para acumular devagar — não se espera acertar todos desde a primeira semana.",
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
    howItWorks:
      "A preparação fica na noite anterior e o estudo em um bloco curto à tarde. A ideia é tirar as decisões da manhã, que é quando costuma dar errado, e manter o estudo em pedaços pequenos.",
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
    howItWorks:
      "Dois blocos de 25 minutos com pausa obrigatória entre eles, e uma revisão leve à noite. A pausa não é opcional: ela é o que permite o segundo bloco existir.",
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
    description: "Lembretes de horários de medicação, todos como indispensáveis.",
    icon: "💊",
    howItWorks:
      "Três horários fixos, todos marcados como indispensáveis — é o único modelo em que nada é opcional. Ajuste os horários conforme a prescrição antes de aplicar, e remova os que não existirem.",
    items: [
      item({ title: "Medicação da manhã", period: "morning", time: "08:00", category: "medication", icon: "💊", priority: "essential", points: 15 }),
      item({ title: "Medicação da tarde", period: "afternoon", time: "14:00", category: "medication", icon: "💊", priority: "essential", points: 15 }),
      item({ title: "Medicação da noite", period: "evening", time: "21:00", category: "medication", icon: "💊", priority: "essential", points: 15 }),
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
    howItWorks:
      "Três momentos curtos espalhados pelo dia, nenhum deles obrigatório. O objetivo é criar espaço para o autocuidado aparecer, não transformá-lo em mais uma cobrança.",
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
    howItWorks:
      "Quatro refeições com horários de referência. Não é sobre o que se come, e sim sobre não passar muitas horas sem comer — o lanche da tarde fica como opcional.",
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
    howItWorks:
      "Só duas atividades, as duas curtas e sem meta de desempenho. A intenção é o corpo se mover um pouco, não treinar — por isso os tempos são baixos e o ritmo é livre.",
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
    howItWorks:
      "São três ferramentas para usar quando a ansiedade aparece, não tarefas para cumprir. Ficam na rotina para já estarem à mão no momento difícil, em vez de precisar lembrar delas na hora.",
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
    howItWorks:
      "Tarefas deliberadamente pequenas: arrumar a cama, um cantinho, o dia seguinte. Nenhuma pede arrumar tudo, porque a versão grande costuma não acontecer.",
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
    howItWorks:
      "Cria uma rotina vazia, sem nenhuma atividade. Serve para montar tudo do zero quando nenhum dos outros modelos se aproxima do que se precisa.",
    items: [],
    createdAt: now,
  },
];

export const TEMPLATE_KIND_LABELS: Record<string, string> = Object.fromEntries(
  SYSTEM_ROUTINE_TEMPLATES.map((t) => [t.kind, t.name])
);
