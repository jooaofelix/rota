import { firstName } from "./proposals";
import { formatShortDate } from "./date";

export type ReferralAudience = "colega" | "paciente";
export type ReferralFormat = "curta" | "carta";

export interface ReferralData {
  /** Nome do paciente, ou só as iniciais quando ela ainda não quer identificar. */
  patientLabel: string;
  professionalName: string;
  /** Registro profissional, se ela quiser assinar com ele. */
  professionalRegistro?: string;
  colleagueName?: string;
  /** O que motiva o encaminhamento, escrito por ela. */
  motivo?: string;
  /** O que ela observou em sessão e sustenta o pedido. */
  observado?: string;
  consentimento: boolean;
  urgente: boolean;
  hoje: string;
}

export interface ReferralTemplate {
  id: string;
  especialidade: string;
  icone: string;
  audiencia: ReferralAudience;
  /** Quando usar — aparece na lista, antes de abrir. */
  quando: string;
  /** Sugestão de motivo, para o campo não começar em branco. */
  motivoSugerido?: string;
  /** Miolo da mensagem. O envelope (saudação, consentimento, assinatura) é comum. */
  corpo: (d: ReferralData) => string[];
}

/**
 * Modelos de encaminhamento.
 *
 * Todos seguem a mesma regra de escrita: dizem o que o colega precisa saber para
 * decidir se atende e por onde começar, e param aí. Encaminhamento não é resumo
 * de prontuário — o que foi dito em sessão continua na sessão. Quando o colega
 * precisar de mais, ele pede, e aí ela responde com o que fizer sentido.
 */
export const REFERRAL_TEMPLATES: ReferralTemplate[] = [
  {
    id: "vaga",
    especialidade: "Consulta de vaga",
    icone: "🔎",
    audiencia: "colega",
    quando: "Antes de tudo: saber se o colega está atendendo, sem identificar ninguém.",
    corpo: (d) => [
      `Estou acompanhando um caso que acho que se beneficiaria de ${d.motivo || "avaliação na sua área"}.`,
      "Você está com agenda aberta? Se estiver, te passo o encaminhamento com os detalhes.",
    ],
  },
  {
    id: "psiquiatria",
    especialidade: "Psiquiatria",
    icone: "💊",
    audiencia: "colega",
    quando: "Sintomas que sugerem avaliação medicamentosa, ou revisão de medicação em curso.",
    motivoSugerido: "avaliação psiquiátrica",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para avaliação psiquiátrica.`,
      d.observado
        ? `Do acompanhamento psicológico, destaco: ${d.observado}`
        : "Do acompanhamento psicológico, os sintomas têm se mantido apesar da intervenção em curso.",
      "Sigo com o acompanhamento psicoterápico e fico à disposição para conversarmos sobre a condução conjunta.",
    ],
  },
  {
    id: "neurologia",
    especialidade: "Neurologia",
    icone: "🧠",
    audiencia: "colega",
    quando: "Queixa que pode ter causa neurológica — cefaleia, crises, alteração de memória.",
    motivoSugerido: "investigação neurológica",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para avaliação neurológica.`,
      d.observado
        ? `Motivo: ${d.observado}`
        : "Motivo: queixas que merecem investigação de causa orgânica antes de seguirmos apenas pela via psicológica.",
      "Agradeço se puder me devolver a impressão diagnóstica, para ajustar o plano terapêutico.",
    ],
  },
  {
    id: "neuropsicologia",
    especialidade: "Neuropsicologia",
    icone: "🧩",
    audiencia: "colega",
    quando: "Precisa de avaliação formal de atenção, memória ou funções executivas.",
    motivoSugerido: "avaliação neuropsicológica",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para avaliação neuropsicológica.`,
      d.observado
        ? `A dúvida clínica é: ${d.observado}`
        : "A dúvida clínica envolve o perfil atencional e executivo, que a avaliação formal pode delimitar melhor.",
      "O laudo ajudaria a orientar tanto a psicoterapia quanto as adaptações de rotina.",
    ],
  },
  {
    id: "nutricao",
    especialidade: "Nutrição",
    icone: "🥗",
    audiencia: "colega",
    quando: "Comportamento alimentar, restrição, compulsão, ou rotina alimentar desorganizada.",
    motivoSugerido: "acompanhamento nutricional",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para acompanhamento nutricional.`,
      d.observado
        ? `Contexto: ${d.observado}`
        : "Contexto: a relação com a comida aparece como parte importante do quadro, e um olhar nutricional somaria ao trabalho psicológico.",
      "Trabalho junto com a questão emocional envolvida — podemos alinhar a abordagem se fizer sentido para você.",
    ],
  },
  {
    id: "fono",
    especialidade: "Fonoaudiologia",
    icone: "🗣️",
    audiencia: "colega",
    quando: "Fala, linguagem, leitura ou deglutição.",
    motivoSugerido: "avaliação fonoaudiológica",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para avaliação fonoaudiológica.`,
      d.observado ? `Observado: ${d.observado}` : "Observado: alterações de linguagem que merecem avaliação específica.",
      "Fico à disposição para trocar impressões sobre a evolução.",
    ],
  },
  {
    id: "to",
    especialidade: "Terapia ocupacional",
    icone: "🧵",
    audiencia: "colega",
    quando: "Funcionalidade, autonomia, organização de rotina, questões sensoriais.",
    motivoSugerido: "avaliação em terapia ocupacional",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para avaliação em terapia ocupacional.`,
      d.observado
        ? `O que me leva ao encaminhamento: ${d.observado}`
        : "O que me leva ao encaminhamento: dificuldades de organização e autonomia no dia a dia que extrapolam o manejo em consultório.",
      "Estamos trabalhando a rotina também pela via psicológica, então um alinhamento seria bem-vindo.",
    ],
  },
  {
    id: "clinico",
    especialidade: "Clínica médica",
    icone: "🩺",
    audiencia: "colega",
    quando: "Sintomas físicos que precisam ser descartados antes de seguir só pela psicoterapia.",
    motivoSugerido: "avaliação clínica",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para avaliação clínica.`,
      d.observado
        ? `Queixas relatadas: ${d.observado}`
        : "Há queixas físicas persistentes que considero importante investigar antes de atribuí-las ao quadro emocional.",
      "Agradeço o retorno sobre os achados.",
    ],
  },
  {
    id: "endocrino",
    especialidade: "Endocrinologia",
    icone: "⚖️",
    audiencia: "colega",
    quando: "Suspeita hormonal — tireoide, alterações de peso, energia, sono.",
    motivoSugerido: "avaliação endocrinológica",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para avaliação endocrinológica.`,
      d.observado
        ? `Motivo: ${d.observado}`
        : "Motivo: sintomas de energia, sono e humor que se sobrepõem a quadros hormonais e merecem descarte.",
      "Sigo com o acompanhamento psicológico em paralelo.",
    ],
  },
  {
    id: "psicopedagogia",
    especialidade: "Psicopedagogia",
    icone: "📚",
    audiencia: "colega",
    quando: "Dificuldade escolar, aprendizagem, organização de estudo.",
    motivoSugerido: "acompanhamento psicopedagógico",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para acompanhamento psicopedagógico.`,
      d.observado
        ? `Contexto escolar: ${d.observado}`
        : "Contexto escolar: as dificuldades de aprendizagem persistem e pedem um trabalho específico, além do suporte emocional.",
      "Podemos alinhar as orientações à família para não chegarem em duplicidade.",
    ],
  },
  {
    id: "rede",
    especialidade: "Rede / assistência social",
    icone: "🤝",
    audiencia: "colega",
    quando: "Situação de vulnerabilidade que precisa de serviço público ou proteção.",
    motivoSugerido: "acionamento da rede de apoio",
    corpo: (d) => [
      `Encaminho ${d.patientLabel} para acolhimento na rede.`,
      d.observado
        ? `Situação: ${d.observado}`
        : "Situação: há necessidades que extrapolam o alcance do atendimento em consultório e pedem articulação com a rede de proteção.",
      "Fico à disposição para as informações necessárias ao encaminhamento, dentro do que couber compartilhar.",
    ],
  },
  {
    id: "parecer",
    especialidade: "Pedido de parecer",
    icone: "💬",
    audiencia: "colega",
    quando: "Quer a opinião do colega sem transferir o caso.",
    corpo: (d) => [
      `Estou acompanhando ${d.patientLabel} e gostaria da sua leitura sobre um ponto, sem encaminhar o caso.`,
      d.motivo ? `A dúvida é: ${d.motivo}` : "A dúvida é sobre a conduta mais adequada daqui para frente.",
      "Se puder, me diz um horário em que dê para conversarmos alguns minutos.",
    ],
  },
  {
    id: "contrarreferencia",
    especialidade: "Retorno a quem encaminhou",
    icone: "↩️",
    audiencia: "colega",
    quando: "Alguém te encaminhou o paciente e você devolve notícia — o passo que quase ninguém dá.",
    corpo: (d) => [
      `Sobre ${d.patientLabel}, que você me encaminhou: o acompanhamento está em curso.`,
      d.observado
        ? `Panorama: ${d.observado}`
        : "Panorama: houve boa adesão e já é possível observar movimento no quadro.",
      "Obrigada pela confiança no encaminhamento. Sigo à disposição para o que for necessário.",
    ],
  },
  {
    id: "aviso-paciente",
    especialidade: "Explicar ao paciente",
    icone: "🫱",
    audiencia: "paciente",
    quando: "Contar ao paciente por que está encaminhando, sem soar como dispensa.",
    corpo: (d) => [
      `Pensei numa coisa depois da nossa conversa: acho que somaria muito você ser acompanhado também por ${d.motivo || "outro profissional"}.`,
      "Isso não substitui o nosso trabalho e não quer dizer que ele vai parar — pelo contrário, os dois caminham juntos e um ajuda o outro.",
      d.colleagueName
        ? `Já falei com ${firstName(d.colleagueName)}, que atende com muito cuidado, e posso fazer a ponte.`
        : "Posso indicar alguém de confiança e fazer a ponte, se você quiser.",
      "Me diz o que achou, e a gente decide junto.",
    ],
  },
];

/**
 * Monta a mensagem final.
 *
 * O envelope é comum a todos os modelos porque as partes que protegem — o
 * consentimento e a assinatura — não podem depender de a pessoa lembrar de
 * escrevê-las.
 */
export function buildReferralMessage(
  template: ReferralTemplate,
  d: ReferralData,
  formato: ReferralFormat
): string {
  const linhas: string[] = [];
  const paraColega = template.audiencia === "colega";

  if (formato === "carta" && paraColega) {
    linhas.push(`ENCAMINHAMENTO — ${template.especialidade}`);
    linhas.push(formatShortDate(d.hoje));
    linhas.push("");
  }

  linhas.push(
    paraColega
      ? d.colleagueName
        ? `Olá, ${firstName(d.colleagueName)}!`
        : "Olá, colega!"
      : `Oi, ${firstName(d.patientLabel)}!`
  );
  linhas.push("");

  if (d.urgente && paraColega) {
    linhas.push("Antes de mais nada: considero este um caso de prioridade.");
    linhas.push("");
  }

  template.corpo(d).forEach((p) => {
    linhas.push(p);
    linhas.push("");
  });

  if (paraColega && d.consentimento) {
    linhas.push(
      "O encaminhamento e o compartilhamento destas informações foram acordados com a pessoa atendida."
    );
    linhas.push("");
  }

  if (paraColega) {
    linhas.push("Atenciosamente,");
    linhas.push(d.professionalName + (d.professionalRegistro ? ` — ${d.professionalRegistro}` : ""));
  } else {
    linhas.push(d.professionalName);
  }

  return linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/** "Ana Beatriz Souza" -> "A. B. S." — para consultar vaga sem identificar ninguém. */
export function initialsOf(fullName: string): string {
  return (
    fullName
      .trim()
      .split(/\s+/)
      .filter((p) => p.length > 2 || /^[A-ZÀ-Ú]/.test(p))
      .map((p) => `${p[0]?.toUpperCase()}.`)
      .join(" ") || "paciente"
  );
}
