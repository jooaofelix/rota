import type { OfferKind, ProposalDoc } from "@/types";
import { formatMoney } from "./agenda";
import { formatShortDate } from "./date";

export const OFFER_KIND_LABELS: Record<OfferKind, string> = {
  package: "Pacote de sessões",
  monthly: "Acompanhamento mensal",
  single: "Sessão avulsa",
  assessment: "Avaliação",
  intensive: "Intensivo",
  gift: "Presente",
  other: "Outro",
};

export const OFFER_KIND_ICONS: Record<OfferKind, string> = {
  package: "📦",
  monthly: "🔁",
  single: "🕐",
  assessment: "📋",
  intensive: "⚡",
  gift: "🎁",
  other: "🏷️",
};

export interface OfferTemplate {
  title: string;
  description: string;
  kind: OfferKind;
  sessions: number;
  price: number;
  listPrice?: number;
  installments?: number;
  validityDays?: number;
  /** Para que serve, mostrado ao escolher o modelo. */
  quando: string;
}

/**
 * Modelos prontos para o catálogo.
 *
 * Os valores são só um ponto de partida plausível — ela ajusta na hora de salvar.
 * A variedade aqui é de propósito: o que muda de um caso para o outro não é o
 * mecanismo, é o motivo de mandar. Um pacote fecha frequência; um retorno reabre
 * conversa com quem sumiu; um presente traz alguém que não é paciente ainda.
 */
export const OFFER_TEMPLATES: OfferTemplate[] = [
  {
    title: "Pacote mensal — 4 sessões",
    description:
      "Quatro encontros semanais, pagos de uma vez. Garante o mesmo horário no mês e sai mais barato que avulso.",
    kind: "monthly",
    sessions: 4,
    price: 520,
    listPrice: 600,
    installments: 1,
    validityDays: 45,
    quando: "O arroz com feijão: fecha a frequência semanal e reduz falta.",
  },
  {
    title: "Pacote trimestral — 12 sessões",
    description:
      "Três meses de acompanhamento contínuo, com desconto maior e prazo folgado para remarcar quando precisar.",
    kind: "package",
    sessions: 12,
    price: 1440,
    listPrice: 1800,
    installments: 3,
    validityDays: 120,
    quando: "Para quem já está em processo e quer previsibilidade de custo.",
  },
  {
    title: "Sessão avulsa",
    description: "Um encontro, sem compromisso de continuidade.",
    kind: "single",
    sessions: 1,
    price: 150,
    installments: 1,
    quando: "Serve de referência de preço e para quem não quer pacote.",
  },
  {
    title: "Primeira conversa",
    description:
      "Um primeiro encontro para entender a demanda e ver se faz sentido seguirmos juntos, com valor reduzido.",
    kind: "single",
    sessions: 1,
    price: 90,
    listPrice: 150,
    installments: 1,
    validityDays: 30,
    quando: "Para quem chegou por indicação e ainda está decidindo.",
  },
  {
    title: "Avaliação psicológica com laudo",
    description:
      "Entrevistas, aplicação de instrumentos e devolutiva, com documento escrito ao final.",
    kind: "assessment",
    sessions: 5,
    price: 1200,
    installments: 2,
    validityDays: 90,
    quando: "Demanda de escola, trabalho ou perícia — serviço fechado, com entrega.",
  },
  {
    title: "Intensivo — 8 sessões em 4 semanas",
    description: "Dois encontros por semana durante um mês, para um momento que pede ritmo mais forte.",
    kind: "intensive",
    sessions: 8,
    price: 1040,
    listPrice: 1200,
    installments: 2,
    validityDays: 45,
    quando: "Crise, luto recente, preparação para uma data difícil.",
  },
  {
    title: "Retorno — 4 sessões",
    description:
      "Para retomar o acompanhamento depois de uma pausa, com condição especial de reencontro.",
    kind: "package",
    sessions: 4,
    price: 480,
    listPrice: 600,
    installments: 1,
    validityDays: 60,
    quando: "Reabre conversa com quem parou há meses, sem soar cobrança.",
  },
  {
    title: "Sessão-presente",
    description:
      "Alguém paga o encontro para outra pessoa. Quem recebe marca quando quiser, dentro da validade.",
    kind: "gift",
    sessions: 1,
    price: 150,
    installments: 1,
    validityDays: 180,
    quando: "Familiar que quer ajudar mas não sabe como oferecer.",
  },
];

const TRATAMENTOS = new Set(["dr", "dra", "sr", "sra", "srta", "prof", "profa"]);

/**
 * Primeiro nome de verdade: "Dra. Camila Fernandes" vira "Camila", e não "Dra.".
 * Aparece em saudação e em frase corrida, onde o tratamento sozinho soa esquisito.
 */
export function firstName(fullName: string): string {
  const partes = fullName.trim().split(/\s+/).filter(Boolean);
  for (const parte of partes) {
    const limpa = parte.replace(/\.$/, "").toLowerCase();
    if (!TRATAMENTOS.has(limpa)) return parte;
  }
  return partes[0] ?? fullName;
}

/** Texto da mensagem enviada ao paciente. Ela confere e envia. */
export function proposalMessage(
  proposal: Pick<
    ProposalDoc,
    "patientName" | "professionalName" | "title" | "description" | "sessions" | "price" | "listPrice" | "installments" | "validityDays" | "validUntil"
  >,
  link: string
): string {
  const linhas: string[] = [];
  linhas.push(`Oi, ${firstName(proposal.patientName)}!`);
  linhas.push("");
  linhas.push(`Separei uma condição para o seu acompanhamento: ${proposal.title}.`);
  if (proposal.description) linhas.push(proposal.description);
  linhas.push("");

  if (proposal.sessions > 0) {
    linhas.push(`• ${proposal.sessions} ${proposal.sessions === 1 ? "sessão" : "sessões"}`);
  }
  if (proposal.listPrice && proposal.listPrice > proposal.price) {
    linhas.push(`• ${formatMoney(proposal.price)} (de ${formatMoney(proposal.listPrice)})`);
  } else {
    linhas.push(`• ${formatMoney(proposal.price)}`);
  }
  if (proposal.installments && proposal.installments > 1) {
    linhas.push(`• Em até ${proposal.installments}x de ${formatMoney(proposal.price / proposal.installments)}`);
  }
  if (proposal.validityDays) {
    linhas.push(`• Prazo para usar as sessões: ${proposal.validityDays} dias`);
  }
  linhas.push(`• Vale até ${formatShortDate(proposal.validUntil)}`);
  linhas.push("");
  linhas.push("Para aceitar ou recusar, é só abrir este link:");
  linhas.push(link);
  linhas.push("");
  linhas.push("Sem pressa e sem compromisso — se preferir conversar antes, me chama.");
  linhas.push("");
  linhas.push(proposal.professionalName);

  return linhas.join("\n");
}

/** Quanto de fato entra por sessão, para ela ver se o desconto ainda fecha. */
export function pricePerSession(price: number, sessions: number): number | null {
  return sessions > 0 ? price / sessions : null;
}

export function discountPercent(price: number, listPrice?: number): number | null {
  if (!listPrice || listPrice <= price) return null;
  return Math.round(((listPrice - price) / listPrice) * 100);
}
