/**
 * Modelo de anamnese — o padrão da casa.
 *
 * A escolha de fundo aqui foi entre ficha fechada e texto livre. Ficha fechada
 * demais engessa a escuta e produz prontuário que parece formulário de banco;
 * texto livre puro produz esquecimento — some a medicação em uso, some a
 * avaliação de risco, e é justamente isso que faz falta dois anos depois.
 *
 * Então: blocos na ordem em que a conversa costuma acontecer, campos longos e
 * abertos dentro de cada bloco, e nada obrigatório exceto o que a Resolução CFP
 * 001/2009 espera de um prontuário — identificação, demanda, avaliação e plano.
 * Campo vazio simplesmente não aparece no PDF.
 *
 * A avaliação de risco fica em bloco próprio e visível de propósito. Não é
 * burocracia: é a pergunta que ninguém quer fazer na primeira sessão e é a
 * única que, deixada de fora, custa caro.
 */

export type TipoCampo = "curto" | "longo" | "escolha" | "data";

export interface CampoAnamnese {
  id: string;
  rotulo: string;
  tipo: TipoCampo;
  /** Texto de apoio dentro do campo — pergunta que ela pode fazer em voz alta. */
  dica?: string;
  opcoes?: string[];
  /** Ocupa metade da largura em tela larga. */
  meio?: boolean;
}

export interface BlocoAnamnese {
  id: string;
  titulo: string;
  icone: string;
  /** O que este bloco existe para responder. Aparece pequeno, abaixo do título. */
  proposito?: string;
  /** Bloco de risco: destacado na tela e no PDF. */
  risco?: boolean;
  campos: CampoAnamnese[];
}

export const ANAMNESE: BlocoAnamnese[] = [
  {
    id: "identificacao",
    titulo: "Identificação",
    icone: "🪪",
    proposito: "O básico que o prontuário precisa ter para identificar de quem ele é.",
    campos: [
      { id: "nascimento", rotulo: "Data de nascimento", tipo: "data", meio: true },
      { id: "idade", rotulo: "Idade", tipo: "curto", meio: true },
      {
        id: "estadoCivil",
        rotulo: "Estado civil",
        tipo: "escolha",
        meio: true,
        opcoes: ["Solteira(o)", "Casada(o)/união", "Separada(o)", "Viúva(o)"],
      },
      { id: "escolaridade", rotulo: "Escolaridade", tipo: "curto", meio: true },
      { id: "ocupacao", rotulo: "Ocupação", tipo: "curto", meio: true },
      { id: "comQuemMora", rotulo: "Com quem mora", tipo: "curto", meio: true },
      { id: "encaminhadoPor", rotulo: "Como chegou até aqui", tipo: "curto", dica: "Indicação, convênio, busca própria" },
      {
        id: "contatoEmergencia",
        rotulo: "Contato de emergência",
        tipo: "curto",
        dica: "Nome, vínculo e telefone de quem pode ser acionado",
      },
    ],
  },
  {
    id: "demanda",
    titulo: "Demanda",
    icone: "🗣️",
    proposito: "O que trouxe a pessoa, nas palavras dela.",
    campos: [
      {
        id: "queixa",
        rotulo: "Queixa principal",
        tipo: "longo",
        dica: "Entre aspas, do jeito que foi dito. A tradução clínica vem depois, na síntese.",
      },
      { id: "inicio", rotulo: "Quando começou", tipo: "curto", dica: "Há quanto tempo, e o que acontecia na época" },
      {
        id: "evolucao",
        rotulo: "Como evoluiu",
        tipo: "longo",
        dica: "Piorou, estabilizou, vai e volta? O que piora e o que alivia?",
      },
      {
        id: "impacto",
        rotulo: "Impacto na vida",
        tipo: "longo",
        dica: "Trabalho, estudo, relações, sono, autocuidado — onde já está atrapalhando",
      },
      {
        id: "tentativas",
        rotulo: "O que já tentou",
        tipo: "longo",
        dica: "Terapias anteriores, medicação, mudanças por conta própria, o que funcionou e o que não",
      },
      {
        id: "expectativa",
        rotulo: "Expectativa com a terapia",
        tipo: "longo",
        dica: "O que precisa estar diferente para valer a pena ter vindo",
      },
    ],
  },
  {
    id: "saude",
    titulo: "Saúde e antecedentes",
    icone: "🩺",
    proposito: "O que já foi tratado, o que está em curso e o que corre na família.",
    campos: [
      {
        id: "acompanhamentoAnterior",
        rotulo: "Acompanhamento psicológico anterior",
        tipo: "longo",
        dica: "Quando, por quanto tempo, por quê parou",
      },
      {
        id: "psiquiatria",
        rotulo: "Acompanhamento psiquiátrico",
        tipo: "longo",
        dica: "Profissional, diagnóstico informado, internações",
      },
      {
        id: "medicacao",
        rotulo: "Medicação em uso",
        tipo: "longo",
        dica: "Nome, dose, há quanto tempo, quem prescreveu — inclusive as não psiquiátricas",
      },
      { id: "clinico", rotulo: "Condições clínicas", tipo: "longo", dica: "Doenças, cirurgias, dores, alergias" },
      {
        id: "substancias",
        rotulo: "Álcool e outras substâncias",
        tipo: "longo",
        dica: "O que usa, com que frequência, desde quando. Inclui tabaco e remédio para dormir.",
      },
      {
        id: "familiarPsi",
        rotulo: "História familiar",
        tipo: "longo",
        dica: "Transtornos, uso de substâncias, suicídio na família",
      },
    ],
  },
  {
    id: "risco",
    titulo: "Avaliação de risco",
    icone: "🚨",
    risco: true,
    proposito:
      "Perguntar não induz nada — perguntar alivia, e não perguntar deixa o profissional sem saber. Preencher sempre, mesmo quando a resposta for não.",
    campos: [
      {
        id: "ideacao",
        rotulo: "Ideação suicida",
        tipo: "escolha",
        opcoes: ["Ausente", "Passiva (vontade de sumir)", "Ativa, sem plano", "Ativa, com plano"],
      },
      {
        id: "ideacaoDetalhe",
        rotulo: "Detalhamento",
        tipo: "longo",
        dica: "Frequência, intensidade, método considerado, acesso a meios, o que segura",
      },
      {
        id: "tentativas",
        rotulo: "Tentativas anteriores",
        tipo: "longo",
        dica: "Quando, como, houve atendimento, o que mudou depois",
      },
      { id: "autolesao", rotulo: "Autolesão", tipo: "longo", dica: "Método, frequência, função que cumpre" },
      { id: "heteroagressao", rotulo: "Risco a terceiros", tipo: "longo" },
      {
        id: "protecao",
        rotulo: "Fatores de proteção",
        tipo: "longo",
        dica: "Vínculos, filhos, religião, projetos, rede de apoio, motivos para viver",
      },
      {
        id: "conduta",
        rotulo: "Conduta adotada",
        tipo: "longo",
        dica: "Plano de segurança, contato de emergência combinado, encaminhamento, frequência ajustada",
      },
    ],
  },
  {
    id: "historia",
    titulo: "História de vida",
    icone: "📖",
    proposito: "De onde vem o padrão que aparece hoje.",
    campos: [
      {
        id: "infancia",
        rotulo: "Infância",
        tipo: "longo",
        dica: "Como descreve, quem cuidava, clima da casa, memórias marcantes",
      },
      { id: "escola", rotulo: "Escola e aprendizagem", tipo: "longo", dica: "Desempenho, socialização, bullying" },
      { id: "adolescencia", rotulo: "Adolescência", tipo: "longo" },
      {
        id: "marcantes",
        rotulo: "Eventos marcantes",
        tipo: "longo",
        dica: "Perdas, mudanças, separações, acidentes, violências. Registrar o que a pessoa trouxer, no ritmo dela.",
      },
      { id: "sexualidade", rotulo: "Vida afetiva e sexual", tipo: "longo", dica: "Se e quando fizer sentido perguntar" },
    ],
  },
  {
    id: "familia",
    titulo: "Família e rede de apoio",
    icone: "👪",
    campos: [
      { id: "configuracao", rotulo: "Configuração familiar", tipo: "longo", dica: "Quem é quem, idades, vínculos" },
      { id: "relacaoPais", rotulo: "Relação com as figuras de cuidado", tipo: "longo" },
      { id: "relacionamento", rotulo: "Relacionamento atual", tipo: "longo" },
      { id: "filhos", rotulo: "Filhos", tipo: "longo" },
      { id: "apoio", rotulo: "Rede de apoio", tipo: "longo", dica: "Com quem conta de verdade quando aperta" },
    ],
  },
  {
    id: "rotina",
    titulo: "Rotina e hábitos",
    icone: "🕰️",
    proposito: "É daqui que sai a primeira rotina proposta no ROTA.",
    campos: [
      { id: "sono", rotulo: "Sono", tipo: "longo", dica: "Horário, latência, despertares, sonolência no dia" },
      { id: "alimentacao", rotulo: "Alimentação", tipo: "longo" },
      { id: "atividade", rotulo: "Atividade física e lazer", tipo: "longo" },
      { id: "trabalho", rotulo: "Trabalho e estudo", tipo: "longo", dica: "Carga, satisfação, conflitos" },
      { id: "diaTipico", rotulo: "Um dia típico", tipo: "longo", dica: "Do acordar ao dormir — mostra mais que qualquer pergunta" },
    ],
  },
  {
    id: "observacao",
    titulo: "Observação na entrevista",
    icone: "👁️",
    proposito: "O que foi observado, não o que foi relatado.",
    campos: [
      { id: "apresentacao", rotulo: "Apresentação e contato", tipo: "longo", dica: "Cuidado pessoal, postura, contato visual, colaboração" },
      { id: "humor", rotulo: "Humor e afeto", tipo: "longo", dica: "Humor relatado, afeto observado, congruência" },
      { id: "discurso", rotulo: "Discurso e pensamento", tipo: "longo", dica: "Ritmo, organização, conteúdo" },
      { id: "cognicao", rotulo: "Orientação, atenção e memória", tipo: "longo", dica: "Impressão clínica, sem pretensão de testagem" },
    ],
  },
  {
    id: "sintese",
    titulo: "Síntese e hipóteses",
    icone: "🧩",
    proposito: "A leitura clínica dela — o que os blocos anteriores, juntos, sugerem.",
    campos: [
      { id: "sintese", rotulo: "Síntese do caso", tipo: "longo" },
      {
        id: "fatores",
        rotulo: "Fatores predisponentes, precipitantes e mantenedores",
        tipo: "longo",
        dica: "O que preparou o terreno, o que disparou agora, o que mantém funcionando",
      },
      {
        id: "hipoteses",
        rotulo: "Hipóteses diagnósticas",
        tipo: "longo",
        dica: "Hipótese é hipótese: registrar como tal, com CID ou DSM se for usar",
      },
    ],
  },
  {
    id: "plano",
    titulo: "Plano terapêutico",
    icone: "🧭",
    proposito: "O combinado — e é combinado, não prescrição.",
    campos: [
      { id: "objetivos", rotulo: "Objetivos acordados", tipo: "longo", dica: "Nas palavras da pessoa sempre que der" },
      { id: "abordagem", rotulo: "Abordagem e estratégias", tipo: "longo" },
      { id: "frequencia", rotulo: "Frequência e duração previstas", tipo: "curto", meio: true },
      { id: "valor", rotulo: "Valor e forma de pagamento combinados", tipo: "curto", meio: true },
      { id: "encaminhamentos", rotulo: "Encaminhamentos", tipo: "longo", dica: "Psiquiatria, neurologia, exames, serviço social" },
      { id: "contrato", rotulo: "Combinações do contrato", tipo: "longo", dica: "Faltas, remarcação, sigilo e seus limites, canais de contato" },
    ],
  },
];

export function campoDoBloco(blocoId: string, campoId: string) {
  return ANAMNESE.find((b) => b.id === blocoId)?.campos.find((c) => c.id === campoId);
}

/** Chave achatada usada no documento: "demanda.queixa". */
export const chave = (blocoId: string, campoId: string) => `${blocoId}.${campoId}`;

export function totalDeCampos(): number {
  return ANAMNESE.reduce((acc, b) => acc + b.campos.length, 0);
}
