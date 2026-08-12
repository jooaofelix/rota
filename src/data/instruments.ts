/**
 * Instrumentos que a profissional pode aplicar dentro do ROTA.
 *
 * A regra que define este catálogo é de licença, não de gosto: teste psicológico
 * de uso restrito (BFP, BAI, BDI-II, escalas Wechsler) tem itens protegidos por
 * direito autoral e uso regulado pelo CFP — não podem ser reproduzidos em um
 * aplicativo, e a aplicação depende do material adquirido pela psicóloga. Por
 * isso aqui só entram, com os itens completos, instrumentos de uso livre; os
 * restritos entram como *registro de resultado*, para que o resultado apurado
 * fora daqui viva no prontuário junto com o resto.
 */

export interface OpcaoResposta {
  valor: number;
  rotulo: string;
}

export interface ItemInstrumento {
  texto: string;
  /** Fator a que o item pertence. Ausente quando a escala é única. */
  fator?: string;
  /** Item invertido: pontua ao contrário da escala. */
  invertido?: boolean;
}

export type TomResultado = "ok" | "atencao" | "alerta";

export interface FaixaResultado {
  /** Limite superior do escore bruto, inclusive. */
  ate: number;
  rotulo: string;
  tom: TomResultado;
  descricao: string;
}

export interface FatorInstrumento {
  id: string;
  nome: string;
  /** O que caracteriza quem pontua alto — e quem pontua baixo. */
  alto: string;
  baixo: string;
}

/** Campo de um instrumento que só pode ser registrado, não aplicado. */
export interface CampoRegistro {
  id: string;
  nome: string;
  min: number;
  max: number;
  sufixo?: string;
  ajuda?: string;
}

export interface Instrumento {
  id: string;
  nome: string;
  sigla: string;
  icone: string;
  /** Uma linha, para a lista de escolha. */
  resumo: string;
  /** O que ela precisa saber antes de aplicar. */
  sobre: string;
  /** Autoria e condição de uso — fica visível, porque muda o que pode ser feito. */
  fonte: string;
  minutos: number;
  /** Instrumento restrito: só registro do resultado apurado fora daqui. */
  somenteRegistro?: boolean;
  /** Enunciado mostrado a quem responde. */
  enunciado?: string;
  escala?: OpcaoResposta[];
  itens?: ItemInstrumento[];
  /** Escala única: faixas do escore bruto total. */
  faixas?: FaixaResultado[];
  /** Perfil: o resultado é um escore por fator, de 0 a 100. */
  fatores?: FatorInstrumento[];
  /**
   * Item que pede atenção imediata quando respondido acima de zero.
   * Aplicar rastreio de depressão a distância sem tratar isso seria irresponsável.
   */
  itemDeRisco?: { indice: number };
  /** Campos do registro manual, para os instrumentos restritos. */
  campos?: CampoRegistro[];
}

/** Frequência das últimas duas semanas — comum ao PHQ-9 e ao GAD-7. */
const FREQUENCIA_QUINZENAL: OpcaoResposta[] = [
  { valor: 0, rotulo: "Nenhuma vez" },
  { valor: 1, rotulo: "Vários dias" },
  { valor: 2, rotulo: "Mais da metade dos dias" },
  { valor: 3, rotulo: "Quase todos os dias" },
];

const CONCORDANCIA: OpcaoResposta[] = [
  { valor: 1, rotulo: "Discordo totalmente" },
  { valor: 2, rotulo: "Discordo" },
  { valor: 3, rotulo: "Nem concordo nem discordo" },
  { valor: 4, rotulo: "Concordo" },
  { valor: 5, rotulo: "Concordo totalmente" },
];

export const INSTRUMENTOS: Instrumento[] = [
  {
    id: "phq9",
    nome: "Rastreio de sintomas depressivos",
    sigla: "PHQ-9",
    icone: "🌧️",
    resumo: "9 itens sobre as últimas duas semanas. O mais usado no mundo para acompanhar humor.",
    sobre:
      "Serve para medir intensidade e, principalmente, para acompanhar: reaplicado a cada quatro ou seis semanas, mostra se o quadro está cedendo. Não fecha diagnóstico sozinho.",
    fonte: "Spitzer, Kroenke & Williams. Uso livre, sem necessidade de autorização.",
    minutos: 3,
    enunciado:
      "Nas últimas 2 semanas, com que frequência você foi incomodado(a) por algum dos problemas abaixo?",
    escala: FREQUENCIA_QUINZENAL,
    itemDeRisco: { indice: 8 },
    itens: [
      { texto: "Pouco interesse ou pouco prazer em fazer as coisas" },
      { texto: "Se sentir para baixo, deprimido(a) ou sem perspectiva" },
      { texto: "Dificuldade para pegar no sono, para continuar dormindo, ou dormir mais que de costume" },
      { texto: "Se sentir cansado(a) ou com pouca energia" },
      { texto: "Falta de apetite ou comer demais" },
      {
        texto:
          "Se sentir mal consigo mesmo(a), achar que é um fracasso ou que decepcionou sua família ou você mesmo(a)",
      },
      { texto: "Dificuldade para se concentrar nas coisas, como ler ou ver televisão" },
      {
        texto:
          "Lentidão para se mover ou falar, a ponto de outras pessoas perceberem — ou o contrário, ficar tão agitado(a) que anda de um lado para o outro muito mais que de costume",
      },
      { texto: "Pensar em se ferir de alguma maneira ou que seria melhor estar morto(a)" },
    ],
    faixas: [
      { ate: 4, rotulo: "Mínimo", tom: "ok", descricao: "Sem indicativo de sintomas depressivos relevantes." },
      { ate: 9, rotulo: "Leve", tom: "ok", descricao: "Sintomas leves. Vale acompanhar a evolução." },
      { ate: 14, rotulo: "Moderado", tom: "atencao", descricao: "Sintomas moderados. Indica avaliação clínica." },
      {
        ate: 19,
        rotulo: "Moderadamente grave",
        tom: "alerta",
        descricao: "Sintomas moderadamente graves. Costuma indicar plano de tratamento ativo.",
      },
      { ate: 27, rotulo: "Grave", tom: "alerta", descricao: "Sintomas graves. Avaliação clínica prioritária." },
    ],
  },
  {
    id: "gad7",
    nome: "Rastreio de ansiedade",
    sigla: "GAD-7",
    icone: "🌀",
    resumo: "7 itens. Mede o quanto a preocupação está tomando o dia.",
    sobre:
      "Feito para ansiedade generalizada, mas sensível também a pânico e ansiedade social. Bom para medir efeito de intervenção ao longo das semanas.",
    fonte: "Spitzer, Kroenke, Williams & Löwe. Uso livre, sem necessidade de autorização.",
    minutos: 2,
    enunciado: "Nas últimas 2 semanas, com que frequência você foi incomodado(a) pelos problemas abaixo?",
    escala: FREQUENCIA_QUINZENAL,
    itens: [
      { texto: "Sentir-se nervoso(a), ansioso(a) ou muito tenso(a)" },
      { texto: "Não conseguir impedir ou controlar as preocupações" },
      { texto: "Preocupar-se muito com diversas coisas" },
      { texto: "Dificuldade para relaxar" },
      { texto: "Ficar tão agitado(a) que se torna difícil permanecer sentado(a)" },
      { texto: "Ficar facilmente aborrecido(a) ou irritado(a)" },
      { texto: "Sentir medo, como se algo terrível fosse acontecer" },
    ],
    faixas: [
      { ate: 4, rotulo: "Mínimo", tom: "ok", descricao: "Sem indicativo de ansiedade clinicamente relevante." },
      { ate: 9, rotulo: "Leve", tom: "ok", descricao: "Ansiedade leve. Vale acompanhar." },
      { ate: 14, rotulo: "Moderado", tom: "atencao", descricao: "Ansiedade moderada. Indica avaliação clínica." },
      { ate: 21, rotulo: "Grave", tom: "alerta", descricao: "Ansiedade grave. Avaliação clínica prioritária." },
    ],
  },
  {
    id: "who5",
    nome: "Índice de bem-estar",
    sigla: "WHO-5",
    icone: "🌤️",
    resumo: "5 frases curtas. Pergunta pelo que está bom, não pelo que está ruim.",
    sobre:
      "Curtinho e bem aceito por quem resiste a questionário de sintoma — mede bem-estar, não doença. Escore final de 0 a 100; abaixo de 50 costuma indicar necessidade de investigar melhor.",
    fonte: "Organização Mundial da Saúde (Centro Colaborador, Copenhague). Uso livre com citação.",
    minutos: 2,
    enunciado:
      "Pense nas últimas 2 semanas. Para cada frase, marque o que mais se aproxima de como você se sentiu.",
    escala: [
      { valor: 5, rotulo: "O tempo todo" },
      { valor: 4, rotulo: "A maior parte do tempo" },
      { valor: 3, rotulo: "Mais da metade do tempo" },
      { valor: 2, rotulo: "Menos da metade do tempo" },
      { valor: 1, rotulo: "De vez em quando" },
      { valor: 0, rotulo: "Em nenhum momento" },
    ],
    itens: [
      { texto: "Eu me senti alegre e de bom humor" },
      { texto: "Eu me senti calmo(a) e relaxado(a)" },
      { texto: "Eu me senti ativo(a) e com disposição" },
      { texto: "Eu acordei me sentindo bem e descansado(a)" },
      { texto: "Meu dia a dia teve coisas que me interessam" },
    ],
    faixas: [
      { ate: 7, rotulo: "Muito baixo", tom: "alerta", descricao: "Bem-estar muito baixo. Indica investigação." },
      { ate: 12, rotulo: "Baixo", tom: "atencao", descricao: "Bem-estar abaixo do ponto de corte da OMS." },
      { ate: 17, rotulo: "Razoável", tom: "ok", descricao: "Bem-estar dentro do esperado." },
      { ate: 25, rotulo: "Bom", tom: "ok", descricao: "Bem-estar preservado." },
    ],
  },
  {
    id: "bigfive-ipip",
    nome: "Cinco Grandes Fatores",
    sigla: "IPIP",
    icone: "🧭",
    resumo: "20 frases. Traça o perfil nos cinco fatores de personalidade.",
    sobre:
      "Itens do International Personality Item Pool, de domínio público. Mede os mesmos cinco fatores que a BFP mede, mas não é a BFP: não tem parecer favorável no SATEPSI e, por isso, não serve para laudo, perícia ou avaliação psicológica formal. Serve para conversa clínica e autoconhecimento.",
    fonte: "International Personality Item Pool (Goldberg; itens breves de Donnellan et al.). Domínio público.",
    minutos: 5,
    enunciado: "Marque o quanto cada frase combina com você. Não existe resposta certa.",
    escala: CONCORDANCIA,
    fatores: [
      {
        id: "extroversao",
        nome: "Extroversão",
        alto: "Busca contato, fala com facilidade, se energiza com gente.",
        baixo: "Reservado; se recompõe sozinho e em ambientes calmos.",
      },
      {
        id: "socializacao",
        nome: "Socialização",
        alto: "Empático, atento ao que o outro sente, tende a ceder.",
        baixo: "Mais direto e cético; menos preocupado em agradar.",
      },
      {
        id: "realizacao",
        nome: "Realização",
        alto: "Organizado, cumpre o que combina, planeja antes.",
        baixo: "Flexível e espontâneo; rotina e prazo custam mais.",
      },
      {
        id: "neuroticismo",
        nome: "Neuroticismo",
        alto: "Reage forte ao estresse; humor oscila com facilidade.",
        baixo: "Estável emocionalmente; se abala menos com contratempos.",
      },
      {
        id: "abertura",
        nome: "Abertura",
        alto: "Curioso, imaginativo, atraído pelo abstrato e pelo novo.",
        baixo: "Prático e concreto; prefere o conhecido ao inédito.",
      },
    ],
    itens: [
      { texto: "Sou a alma da festa", fator: "extroversao" },
      { texto: "Me solidarizo com os sentimentos dos outros", fator: "socializacao" },
      { texto: "Faço logo as tarefas que preciso fazer", fator: "realizacao" },
      { texto: "Tenho mudanças de humor frequentes", fator: "neuroticismo" },
      { texto: "Tenho uma imaginação fértil", fator: "abertura" },
      { texto: "Falo pouco", fator: "extroversao", invertido: true },
      { texto: "Não me interesso pelos problemas dos outros", fator: "socializacao", invertido: true },
      { texto: "Costumo esquecer de colocar as coisas de volta no lugar", fator: "realizacao", invertido: true },
      { texto: "Fico relaxado(a) na maior parte do tempo", fator: "neuroticismo", invertido: true },
      { texto: "Tenho dificuldade para entender ideias abstratas", fator: "abertura", invertido: true },
      { texto: "Converso com muita gente diferente nas festas", fator: "extroversao" },
      { texto: "Percebo as emoções das outras pessoas", fator: "socializacao" },
      { texto: "Gosto de ordem", fator: "realizacao" },
      { texto: "Me irrito com facilidade", fator: "neuroticismo" },
      { texto: "Não me interesso por ideias abstratas", fator: "abertura", invertido: true },
      { texto: "Fico mais na minha, em segundo plano", fator: "extroversao", invertido: true },
      { texto: "Não me interesso de verdade pelos outros", fator: "socializacao", invertido: true },
      { texto: "Faço bagunça com as coisas", fator: "realizacao", invertido: true },
      { texto: "Raramente me sinto triste", fator: "neuroticismo", invertido: true },
      { texto: "Não tenho boa imaginação", fator: "abertura", invertido: true },
    ],
  },
  {
    id: "bfp",
    nome: "Bateria Fatorial de Personalidade",
    sigla: "BFP",
    icone: "📘",
    resumo: "Registrar o resultado de uma aplicação feita com o material oficial.",
    sobre:
      "A BFP é instrumento de uso restrito a psicólogos, com itens protegidos por direito autoral e aplicação vinculada ao material da editora — não pode ser reproduzida aqui nem em nenhum outro aplicativo. Aplique pelo caderno ou pela plataforma da editora e registre os percentis abaixo: o perfil passa a viver no prontuário, aparece na evolução e entra no relatório junto com o resto.",
    fonte: "Nunes, Hutz & Nunes — Vetor Editora. Instrumento com parecer favorável no SATEPSI.",
    minutos: 2,
    somenteRegistro: true,
    campos: [
      { id: "neuroticismo", nome: "Neuroticismo", min: 0, max: 100, sufixo: "percentil" },
      { id: "extroversao", nome: "Extroversão", min: 0, max: 100, sufixo: "percentil" },
      { id: "socializacao", nome: "Socialização", min: 0, max: 100, sufixo: "percentil" },
      { id: "realizacao", nome: "Realização", min: 0, max: 100, sufixo: "percentil" },
      { id: "abertura", nome: "Abertura", min: 0, max: 100, sufixo: "percentil" },
    ],
  },
  {
    id: "registro-livre",
    nome: "Outro instrumento",
    sigla: "Registro",
    icone: "📝",
    resumo: "Anotar o resultado de qualquer teste aplicado fora do ROTA.",
    sobre:
      "Para BAI, BDI-II, escalas Wechsler, HTP, Palográfico — qualquer instrumento restrito ou em papel. Você diz o nome, o escore e o que ele significou; fica no histórico com data, como qualquer outra aplicação.",
    fonte: "O crédito é do instrumento que você aplicou.",
    minutos: 1,
    somenteRegistro: true,
    campos: [{ id: "escore", nome: "Escore", min: 0, max: 1000, ajuda: "Bruto, percentil ou padronizado — como preferir." }],
  },
];

export function acharInstrumento(id: string): Instrumento | undefined {
  return INSTRUMENTOS.find((i) => i.id === id);
}
