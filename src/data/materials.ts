/**
 * Materiais de psicoeducação.
 *
 * Conteúdo fixo, sem banco e sem token: material educativo não é dado de
 * ninguém. Cada um tem um endereço próprio e permanente (/material/sono), o
 * mesmo para todo mundo — ela manda o link no WhatsApp, o paciente abre sem
 * login, e amanhã o link continua valendo.
 *
 * Regra de escrita, que vale para os que vierem depois: falar com um adulto que
 * está sofrendo, não com uma criança. Nada de "tudo vai ficar bem", nada de
 * promessa de cura, nada de lista de vinte técnicas. Explicar o mecanismo,
 * porque entender o próprio funcionamento já reduz vergonha, e oferecer duas ou
 * três coisas concretas para tentar. O material não substitui a sessão: ele
 * serve para o intervalo entre elas.
 */

export type BlocoMaterial =
  | { tipo: "texto"; texto: string }
  | { tipo: "destaque"; texto: string }
  | { tipo: "lista"; titulo?: string; itens: string[] }
  | { tipo: "ciclo"; titulo: string; passos: Array<{ icone: string; titulo: string; texto: string }> }
  | { tipo: "acoes"; titulo: string; itens: Array<{ icone: string; titulo: string; texto: string }> }
  | { tipo: "alerta"; titulo: string; texto: string };

export interface Material {
  slug: string;
  titulo: string;
  subtitulo: string;
  icone: string;
  /** Uma linha, para a lista dela. */
  resumo: string;
  /** Quando faz sentido entregar — some do material, é orientação para ela. */
  quando: string;
  blocos: BlocoMaterial[];
  lembre: string[];
}

export const MATERIAIS: Material[] = [
  {
    slug: "bfrb",
    titulo: "Quando a mão vai sozinha",
    subtitulo: "Comportamentos repetitivos focados no corpo (BFRB)",
    icone: "🫰",
    resumo: "Cutucar a pele, roer unhas, arrancar cabelo: por que acontece e o que ajuda.",
    quando: "Para quem cutuca, rói ou arranca e chega na sessão com vergonha de contar.",
    blocos: [
      {
        tipo: "texto",
        texto:
          "Às vezes o corpo cria um jeito automático de aliviar tensão. A mão vai até o rosto, até a unha, até o cabelo — e quando você percebe, já aconteceu. Isso tem nome: comportamentos repetitivos focados no corpo, ou BFRB.",
      },
      {
        tipo: "destaque",
        texto:
          "Não é falta de força de vontade, não é mania feia e não é loucura. É uma resposta automática que o seu sistema aprendeu porque ela funciona — no curtíssimo prazo.",
      },
      {
        tipo: "lista",
        titulo: "Os mais comuns",
        itens: [
          "Cutucar a pele, espinhas, casquinhas, machucadinhos",
          "Roer unhas ou cutículas",
          "Morder o lábio, a bochecha por dentro, a pele do dedo",
          "Arrancar fios de cabelo, sobrancelha ou cílios",
        ],
      },
      {
        tipo: "ciclo",
        titulo: "Como o ciclo se fecha",
        passos: [
          {
            icone: "🌩️",
            titulo: "Tensão",
            texto: "Alguma coisa incomoda: ansiedade, irritação, tédio, cansaço. Nem sempre dá para nomear.",
          },
          { icone: "✋", titulo: "Impulso", texto: "Vem a vontade. Muitas vezes a mão chega antes do pensamento." },
          { icone: "🔁", titulo: "Comportamento", texto: "Você cutuca, rói, aperta, arranca — e alivia na hora." },
          {
            icone: "🌧️",
            titulo: "Alívio e depois culpa",
            texto: "O alívio é real, mas dura pouco. Aí chega a vergonha, e a vergonha é mais tensão.",
          },
          { icone: "↩️", titulo: "Recomeço", texto: "Mais tensão significa mais impulso. É por isso que se repete." },
        ],
      },
      {
        tipo: "texto",
        texto:
          "Reparou onde o ciclo se fecha? A culpa não freia o comportamento — ela alimenta. É por isso que se cobrar mais forte costuma piorar, e não melhorar.",
      },
      {
        tipo: "acoes",
        titulo: "O que costuma ajudar",
        itens: [
          {
            icone: "👁️",
            titulo: "Perceber antes",
            texto:
              "Por uma semana, só repare: que horas foi, onde você estava, o que estava sentindo. Não precisa parar nada ainda. Perceber já muda.",
          },
          {
            icone: "🏷️",
            titulo: "Dar nome",
            texto:
              "Dizer para si mesmo \"estou ansioso\", \"estou irritado\", \"estou entediado\". Emoção nomeada perde força; emoção sem nome vira ação.",
          },
          {
            icone: "🤲",
            titulo: "Ocupar as mãos",
            texto:
              "Bolinha, tecido, elástico, hidratante, gelo, desenhar. Não é distração boba: o impulso precisa de saída, e uma saída neutra também serve.",
          },
          {
            icone: "⏸️",
            titulo: "Comprar tempo",
            texto:
              "Sessenta segundos: sair do ambiente, beber água, lavar o rosto. O impulso tem pico, e o pico passa.",
          },
          {
            icone: "💛",
            titulo: "Tratar-se como trataria alguém",
            texto:
              "Recaída faz parte. O que interessa não é a semana perfeita, é a curva de meses.",
          },
        ],
      },
      {
        tipo: "alerta",
        titulo: "Quando procurar ajuda mais rápido",
        texto:
          "Se está machucando de verdade, se apareceu infecção, se está evitando sair de casa por causa das marcas, ou se o tempo gasto está atrapalhando o dia — leve isso para a próxima sessão sem esperar melhorar sozinho.",
      },
    ],
    lembre: [
      "Você não faz isso porque quer.",
      "Tem explicação, e tem tratamento.",
      "O objetivo não é nunca mais; é ter escolha onde hoje não tem.",
    ],
  },

  {
    slug: "crise-de-ansiedade",
    titulo: "Quando a ansiedade aperta",
    subtitulo: "O que está acontecendo no corpo e o que fazer agora",
    icone: "🌊",
    resumo: "Explica a crise pelo corpo e dá o que fazer nos primeiros minutos.",
    quando: "Depois do primeiro relato de crise. Peça para salvar o link no celular, antes de precisar.",
    blocos: [
      {
        tipo: "texto",
        texto:
          "Numa crise, o corpo dispara um alarme de perigo. Coração acelera, respiração encurta, mãos formigam, vem a sensação de que algo terrível vai acontecer. O alarme é real — o perigo, na hora da crise, quase nunca é.",
      },
      {
        tipo: "destaque",
        texto:
          "Crise de ansiedade não mata, não enlouquece e não causa infarto. É desconfortável a um ponto que assusta, e passa. O pico costuma durar poucos minutos.",
      },
      {
        tipo: "acoes",
        titulo: "Nos primeiros minutos",
        itens: [
          {
            icone: "💨",
            titulo: "Solte o ar devagar",
            texto:
              "Não tente respirar fundo — tente soltar longo. Inspire em 4, solte em 6 ou 8. É a expiração que desliga o alarme.",
          },
          {
            icone: "🖐️",
            titulo: "Volte para o lugar",
            texto:
              "Cinco coisas que você vê, quatro que ouve, três que toca. Dá trabalho, e é isso que funciona: ocupa a cabeça que estava no futuro.",
          },
          {
            icone: "❄️",
            titulo: "Frio nas mãos ou no rosto",
            texto: "Água fria, gelo, ar da janela. Corta o ciclo pelo corpo quando a cabeça não coopera.",
          },
          {
            icone: "🕰️",
            titulo: "Não fuja se der",
            texto:
              "Sair correndo alivia agora e ensina o cérebro que aquele lugar era mesmo perigoso. Ficar, quando é possível, é o que desmonta a longo prazo.",
          },
        ],
      },
      {
        tipo: "texto",
        texto:
          "Depois que passar, anote: onde você estava, o que veio antes, quanto tempo durou. Não é para vigiar você — é material para a sessão, e o padrão sempre aparece.",
      },
      {
        tipo: "alerta",
        titulo: "Procure atendimento médico",
        texto:
          "Se for a primeira vez, se a dor no peito for forte ou irradiar, se houver desmaio, ou se você tiver qualquer dúvida sobre ser o coração: procure um pronto-socorro. Ansiedade é diagnóstico de exclusão, e não custa nada conferir.",
      },
    ],
    lembre: [
      "O pico passa, sempre.",
      "Você já atravessou outras.",
      "Evitar alivia hoje e cobra caro depois.",
    ],
  },

  {
    slug: "sono",
    titulo: "Sono que não vem",
    subtitulo: "O que atrapalha, o que ajuda e o que não adianta",
    icone: "🌙",
    resumo: "Higiene do sono sem lista impossível: cinco mudanças que mexem no ponteiro.",
    quando: "Quando o sono aparece no relato — e ele aparece em quase todo quadro.",
    blocos: [
      {
        tipo: "texto",
        texto:
          "Dormir não é uma decisão. Ninguém consegue se obrigar a dormir, e é por isso que tentar com mais força piora. O que dá para fazer é preparar o terreno e sair da frente.",
      },
      {
        tipo: "acoes",
        titulo: "As cinco que mais mudam",
        itens: [
          {
            icone: "⏰",
            titulo: "Acordar sempre no mesmo horário",
            texto:
              "Inclusive no fim de semana. O horário de acordar puxa o de dormir, não o contrário. É a mudança que mais funciona e a que menos gente faz.",
          },
          {
            icone: "🛏️",
            titulo: "Cama serve para dormir",
            texto:
              "Se passou uns vinte minutos rolando, levante e faça algo calmo com luz baixa. Ficar deitado tentando ensina o corpo que cama é lugar de angústia.",
          },
          {
            icone: "☀️",
            titulo: "Luz de manhã",
            texto: "Dez a quinze minutos de claridade natural cedo. É o que acerta o relógio para a noite seguinte.",
          },
          {
            icone: "☕",
            titulo: "Café tem meia-vida longa",
            texto:
              "Metade da cafeína das 16h ainda está em você às 22h. Corte depois do meio da tarde antes de concluir que nada funciona.",
          },
          {
            icone: "🧠",
            titulo: "Descarregue a cabeça antes",
            texto:
              "Papel e caneta, dez minutos, o que está pendente e a primeira coisa a fazer amanhã. A preocupação insiste enquanto acha que vai ser esquecida.",
          },
        ],
      },
      {
        tipo: "lista",
        titulo: "O que costuma não resolver sozinho",
        itens: [
          "Dormir mais cedo para compensar (só aumenta o tempo acordado na cama)",
          "Cochilo longo à tarde",
          "Álcool para pegar no sono — ele derruba e depois fragmenta a noite",
          "Ficar conferindo o relógio de madrugada",
        ],
      },
      {
        tipo: "destaque",
        texto:
          "Duas ou três noites ruins não são insônia; são uma semana difícil. Insônia é o padrão que se mantém por semanas — e aí tem tratamento próprio, que funciona bem.",
      },
    ],
    lembre: [
      "O horário de acordar é a alavanca.",
      "Cama é para dormir, não para tentar dormir.",
      "Uma noite ruim não estraga o processo.",
    ],
  },

  {
    slug: "ruminacao",
    titulo: "Quando o pensamento não desliga",
    subtitulo: "A diferença entre resolver e ruminar",
    icone: "🌀",
    resumo: "Ensina a distinguir preocupação útil de ruminação, e o que fazer com cada uma.",
    quando: "Para quem passa horas remoendo e chama isso de 'pensar no assunto'.",
    blocos: [
      {
        tipo: "texto",
        texto:
          "Tem um tipo de pensamento que parece produtivo e não é. Você revisa a mesma cena, imagina o pior, ensaia conversas que não aconteceram. Sai de lá cansado e no mesmo lugar.",
      },
      {
        tipo: "destaque",
        texto:
          "O teste é simples: pensar em algo resolve quando termina numa decisão ou numa ação. Se depois de vinte minutos não existe nenhum próximo passo, não era análise — era ruminação.",
      },
      {
        tipo: "acoes",
        titulo: "O que ajuda",
        itens: [
          {
            icone: "❓",
            titulo: "Pergunte se dá para agir",
            texto:
              "Se dá: escreva o próximo passo e o horário. Se não dá — porque depende de outra pessoa, do futuro ou do passado — não existe volta que resolva.",
          },
          {
            icone: "⏳",
            titulo: "Marque hora para preocupar",
            texto:
              "Vinte minutos, mesmo horário todo dia. Fora dali, anote o assunto e adie. Parece truque bobo; funciona porque a cabeça aceita adiar melhor do que aceita parar.",
          },
          {
            icone: "🚶",
            titulo: "Mude o corpo de lugar",
            texto:
              "Ruminação gruda em cabeça parada. Caminhar, lavar louça, tomar banho — algo que ocupe sem exigir.",
          },
          {
            icone: "📝",
            titulo: "Tire da cabeça",
            texto:
              "Escrito, o pensamento fica do tamanho que tem. Na cabeça, ele fica do tamanho da noite.",
          },
        ],
      },
      {
        tipo: "texto",
        texto:
          "Uma observação que costuma aliviar: você não precisa vencer o pensamento nem provar que ele está errado. Basta parar de discutir com ele. Discussão é o que o mantém em cena.",
      },
    ],
    lembre: [
      "Remoer não é resolver.",
      "Sem próximo passo, não é análise.",
      "Adiar funciona melhor que proibir.",
    ],
  },

  {
    slug: "vontade",
    titulo: "Quando falta vontade de tudo",
    subtitulo: "Por que esperar a vontade chegar não funciona",
    icone: "🪫",
    resumo: "Ativação comportamental explicada sem jargão: a ação vem antes da vontade.",
    quando: "Humor deprimido, apatia, semanas paradas. Um dos materiais mais úteis que existem.",
    blocos: [
      {
        tipo: "texto",
        texto:
          "Quando o humor cai, o corpo pede recolhimento: cancelar, adiar, ficar na cama. Faz sentido — e é justamente o que mantém o quadro. Menos atividade significa menos coisas boas acontecendo, o que significa humor pior, o que significa menos vontade ainda.",
      },
      {
        tipo: "destaque",
        texto:
          "A parte contraintuitiva: a vontade não vem antes. Ela vem depois de começar. Quem espera se sentir bem para agir costuma esperar muito tempo.",
      },
      {
        tipo: "acoes",
        titulo: "Como sair do lugar",
        itens: [
          {
            icone: "🐜",
            titulo: "Comece ridiculamente pequeno",
            texto:
              "Não é \"voltar a caminhar\" — é calçar o tênis e ir até a esquina. A tarefa tem que ser pequena a ponto de parecer boba.",
          },
          {
            icone: "📅",
            titulo: "Marque, não decida na hora",
            texto:
              "Decidir na hora entrega a escolha para o humor daquele momento, e o humor vai dizer não. Combine antes: dia e horário.",
          },
          {
            icone: "🎯",
            titulo: "Misture os dois tipos",
            texto:
              "Coisas que dão prazer e coisas que dão sensação de conta paga. Só prazer não sustenta; só obrigação afunda.",
          },
          {
            icone: "📈",
            titulo: "Anote antes e depois",
            texto:
              "De 0 a 10, como estava antes e como ficou depois. Quase sempre melhora um pouco — e é essa evidência que convence, não o meu argumento.",
          },
        ],
      },
      {
        tipo: "alerta",
        titulo: "Se aparecer pensamento de morte",
        texto:
          "Se vier a ideia de sumir, de se machucar ou de que seria melhor não estar aqui, isso não é para segurar até a próxima sessão. Fale com sua psicóloga, procure alguém de confiança, ou ligue 188 (CVV, 24 horas, de graça). Em emergência, 192.",
      },
    ],
    lembre: [
      "Ação primeiro, vontade depois.",
      "Pequeno demais é o tamanho certo.",
      "Um dia perdido não apaga a semana.",
    ],
  },

  {
    slug: "como-funciona-a-terapia",
    titulo: "Como funciona a terapia",
    subtitulo: "Para quem está começando agora",
    icone: "🪑",
    resumo: "Combina expectativas: sigilo, ritmo, o que esperar das primeiras sessões.",
    quando: "Envie junto com a confirmação da primeira consulta.",
    blocos: [
      {
        tipo: "texto",
        texto:
          "As primeiras sessões servem para entender o que te trouxe e montar um plano junto. Não existe jeito certo de começar: pode chegar sem saber explicar o que está sentindo, e ainda assim dá para trabalhar.",
      },
      {
        tipo: "lista",
        titulo: "O que você pode esperar",
        itens: [
          "Perguntas sobre sua história, sua rotina e o que está pesando agora",
          "Combinar objetivos — o que você quer que esteja diferente daqui a alguns meses",
          "Propostas de coisas para observar ou testar entre uma sessão e outra",
          "Espaço para discordar: se algo não fizer sentido, dizer isso é parte do trabalho",
        ],
      },
      {
        tipo: "destaque",
        texto:
          "O que você conta fica na sessão. O sigilo é obrigação profissional, com pouquíssimas exceções previstas em lei — risco de vida seu ou de alguém — e essas exceções são conversadas com você, não decididas pelas suas costas.",
      },
      {
        tipo: "acoes",
        titulo: "O que ajuda a render",
        itens: [
          {
            icone: "🗒️",
            titulo: "Anote durante a semana",
            texto: "O que apertou, o que foi bom, o que você quer levar. A memória seleciona mal.",
          },
          {
            icone: "🔁",
            titulo: "Constância vale mais que intensidade",
            texto: "Sessões espaçadas demais viram atualização de notícias em vez de trabalho.",
          },
          {
            icone: "🕰️",
            titulo: "Dê tempo",
            texto:
              "Alívio costuma aparecer em algumas semanas; mudança de padrão leva meses. Os dois acontecem, em ritmos diferentes.",
          },
        ],
      },
    ],
    lembre: [
      "Não precisa chegar com o problema organizado.",
      "Falar o que incomoda na terapia é parte da terapia.",
      "Sigilo é regra, não favor.",
    ],
  },
];

export function acharMaterial(slug: string): Material | undefined {
  return MATERIAIS.find((m) => m.slug === slug);
}
