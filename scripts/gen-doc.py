"""Gera a documentação do sistema ROTA em PDF."""

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    ListFlowable,
    ListItem,
    NextPageTemplate,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

OUT = "/home/user/rota/docs/ROTA-documentacao.pdf"

BRAND = colors.HexColor("#2f9a7c")
BRAND_DARK = colors.HexColor("#1c6352")
INK = colors.HexColor("#154238")
MUTED = colors.HexColor("#5a8b7d")
LIGHT = colors.HexColor("#eefaf6")
LINE = colors.HexColor("#d4f1e7")
CREAM = colors.HexColor("#fff7eb")

ss = getSampleStyleSheet()


def st(name, **kw):
    base = dict(fontName="Helvetica", fontSize=10, leading=14.5, textColor=INK)
    base.update(kw)
    return ParagraphStyle(name, **base)


S = {
    "capa_titulo": st("capa_titulo", fontName="Helvetica-Bold", fontSize=40, leading=44,
                      textColor=BRAND_DARK, alignment=TA_CENTER),
    "capa_sub": st("capa_sub", fontSize=15, leading=21, textColor=BRAND, alignment=TA_CENTER),
    "capa_meta": st("capa_meta", fontSize=10, leading=16, textColor=MUTED, alignment=TA_CENTER),
    "capa_frase": st("capa_frase", fontSize=11, leading=17, textColor=MUTED,
                     alignment=TA_CENTER, fontName="Helvetica-Oblique"),
    "h1": st("h1", fontName="Helvetica-Bold", fontSize=17, leading=21, textColor=BRAND_DARK,
             spaceBefore=6, spaceAfter=8),
    "h2": st("h2", fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=BRAND,
             spaceBefore=11, spaceAfter=4),
    "body": st("body", alignment=TA_JUSTIFY, spaceAfter=6),
    "bullet": st("bullet", spaceAfter=3, leading=14),
    "small": st("small", fontSize=8.5, leading=12, textColor=MUTED),
    "note": st("note", fontSize=9.5, leading=14, textColor=BRAND_DARK),
    "cell": st("cell", fontSize=8.5, leading=11.5),
    "cellb": st("cellb", fontSize=8.5, leading=11.5, fontName="Helvetica-Bold"),
    "cellh": st("cellh", fontSize=8.5, leading=11.5, fontName="Helvetica-Bold",
                textColor=colors.white),
    "mono": st("mono", fontName="Courier", fontSize=8.5, leading=12.5),
}


def h1(text):
    """Título de seção com uma régua embaixo."""
    rule = Table([[""]], colWidths=[165 * mm], rowHeights=[1.4])
    rule.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), BRAND)]))
    return KeepTogether([Paragraph(text, S["h1"]), rule, Spacer(1, 7)])


def h2(text):
    return Paragraph(text, S["h2"])


def p(text):
    return Paragraph(text, S["body"])


def bullets(items):
    return ListFlowable(
        [ListItem(Paragraph(i, S["bullet"]), leftIndent=12) for i in items],
        bulletType="bullet", bulletFontSize=6, bulletColor=BRAND,
        leftIndent=12, spaceAfter=7,
    )


def box(text, bg=LIGHT):
    """Caixa de destaque para observações."""
    t = Table([[Paragraph(text, S["note"])]], colWidths=[165 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("RIGHTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBEFORE", (0, 0), (0, -1), 2.5, BRAND),
    ]))
    return KeepTogether([t, Spacer(1, 9)])


def table(header, rows, widths):
    data = [[Paragraph(c, S["cellh"]) for c in header]]
    for r in rows:
        data.append([Paragraph(r[0], S["cellb"])] + [Paragraph(c, S["cell"]) for c in r[1:]])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BRAND),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.4, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return KeepTogether([t, Spacer(1, 9)])


def code(lines):
    t = Table([[Paragraph(l.replace(" ", "&nbsp;"), S["mono"])] for l in lines], colWidths=[165 * mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f4faf8")),
        ("LEFTPADDING", (0, 0), (-1, -1), 9),
        ("TOPPADDING", (0, 0), (-1, -1), 1.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 1.5),
        ("BOX", (0, 0), (-1, -1), 0.4, LINE),
    ]))
    return KeepTogether([t, Spacer(1, 9)])


# ---------------------------------------------------------------- conteúdo

story = []

# ------- capa
logo = Image("/home/user/rota/public/logo-icon.png", width=32 * mm, height=32 * mm)
logo.hAlign = "CENTER"

story += [
    Spacer(1, 52 * mm),
    logo,
    Spacer(1, 12),
    Paragraph("ROTA", S["capa_titulo"]),
    Spacer(1, 5),
    Paragraph("Rotina e Acompanhamento", S["capa_sub"]),
    Spacer(1, 16),
    Paragraph(
        "Aplicativo de acompanhamento diário de rotina entre profissional<br/>de saúde e paciente",
        S["capa_frase"]),
    Spacer(1, 34 * mm),
    Paragraph("Documentação do sistema", S["capa_meta"]),
    Paragraph("Atualizada em 30 de julho de 2026", S["capa_meta"]),
    NextPageTemplate("miolo"),
    PageBreak(),
]

# ------- 1
story += [
    h1("1. Resumo da solução"),
    p("O ROTA é um aplicativo web instalável (PWA) para acompanhamento diário de rotina entre uma "
      "profissional de saúde e seus pacientes. Foi desenhado especialmente para público "
      "neurodivergente e para pacientes borderline: telas simples, poucos elementos por vez, "
      "linguagem acolhedora e nunca punitiva."),
    p("São duas áreas completamente separadas dentro do mesmo aplicativo, com navegação e "
      "permissões próprias:"),
    bullets([
        "<b>Paciente</b> — vê o que precisa fazer agora, marca atividades como concluídas, "
        "registra como se sentiu, organiza suas atividades por prioridade, acompanha "
        "pontos e recompensas e recebe lembretes.",
        "<b>Profissional</b> — cria e ajusta a rotina de cada paciente vinculado, acompanha "
        "adesão e sentimentos, entrega recompensas, gera relatórios em PDF e recebe alertas "
        "(sempre não-diagnósticos).",
    ]),
    p("O sistema é mobile-first, instalável na tela inicial do celular e envia notificações push "
      "mesmo com o aplicativo fechado — sempre pedindo permissão com uma tela explicativa antes "
      "de acionar o prompt do navegador."),
    box("<b>Princípio de projeto.</b> Nada no aplicativo cobra o paciente por não ter cumprido "
        "algo. Atividades não realizadas pedem apenas o motivo, sem julgamento, e o nível "
        "de prioridade existe justamente para que um dia difícil possa ser cumprido fazendo "
        "só o essencial."),
]

# ------- 2
story += [
    h1("2. Arquitetura"),
    code([
        "Cliente (React + Vite, PWA)  -----+",
        "                                  |  Firestore (dados) / Auth / Storage / FCM",
        "Cloud Functions (Node, Admin SDK) +",
        "",
        "Front-end hospedado na Cloudflare  |  Backend: Firebase",
    ]),
    p("Parte da lógica fica em Cloud Functions, e não apenas no cliente, por dois motivos. "
      "Primeiro, pontos, sequência de dias e conquistas automáticas não podem depender do "
      "cliente — o paciente poderia manipular o próprio progresso. Segundo, notificações "
      "agendadas e push em segundo plano exigem um processo rodando no servidor, não no "
      "navegador do usuário."),
    box("<b>Cloud Functions exigem o plano Blaze.</b> Pontos, sequência de dias, conquistas "
        "automáticas, push e lembretes agendados dependem das Cloud Functions, que requerem o "
        "plano pago do Firebase (mesmo dentro da faixa gratuita de uso). O vínculo "
        "profissional-paciente é a exceção: não depende de Cloud Function nenhuma.", CREAM),
]

# ------- 3
story += [
    h1("3. Tecnologias"),
    table(
        ["Camada", "Escolha"],
        [
            ["Interface", "React 18, TypeScript, Vite, Tailwind CSS (mobile-first)"],
            ["Navegação", "React Router, com rotas separadas e protegidas por papel"],
            ["Backend", "Firebase: Authentication, Firestore, Storage, Cloud Messaging, "
                        "Cloud Functions (2.ª geração)"],
            ["Relatórios", "@react-pdf/renderer, gerados no cliente"],
            ["Gráficos", "recharts"],
            ["PWA", "vite-plugin-pwa (estratégia injectManifest) com Service Worker próprio, "
                    "combinando cache do app shell e recebimento de push em segundo plano"],
            ["Hospedagem", "Cloudflare, servindo o build estático com fallback de rota para "
                           "aplicação de página única"],
        ],
        [30 * mm, 135 * mm],
    ),
]

# ------- 4
story += [
    h1("4. Telas do paciente"),
    p("Navegação inferior fixa com cinco itens: Hoje, Rotina, Recompensas, Histórico e Perfil."),
    table(
        ["Tela", "Conteúdo"],
        [
            ["Hoje", "Saudação, progresso do dia, próxima atividade, pendentes, recompensa mais "
                     "próxima e avisos da profissional."],
            ["Rotina", "Seis abas: Hoje, Prioridades, Próximos dias, Pendentes, Atrasadas e "
                       "Concluídas. As listas do dia são organizadas por período (manhã, tarde, "
                       "noite); a aba Prioridades organiza a rotina inteira nos quatro quadros "
                       "de prioridade."],
            ["Recompensas", "Pontos, nível, sequência de dias, conquistas e recompensas "
                            "disponíveis."],
            ["Histórico", "Linha do tempo de tudo que foi registrado: sentimentos, comentários "
                          "e motivos de não realização."],
            ["Perfil", "Código de vínculo, notificações agrupadas, política de privacidade, "
                       "termos, exportar dados e excluir conta."],
        ],
        [30 * mm, 135 * mm],
    ),
    h2("Tela de entrada"),
    p("O login ocupa a tela inteira, com partículas animadas ao fundo e uma frase que troca "
      "sozinha entre \"sua rotina\", \"sua direção\", \"seu acompanhamento\", \"seu crescimento\" "
      "e \"seu progresso\". Oferece entrada por e-mail e senha ou por conta Google, recuperação "
      "de senha e um botão opcional de modo desktop para quem usa o aplicativo no computador."),
]

# ------- 5
story += [
    h1("5. Telas da profissional"),
    p("Navegação inferior com cinco itens: Dashboard, Pacientes, Rotinas, Relatórios e Perfil."),
    table(
        ["Tela", "Conteúdo"],
        [
            ["Dashboard", "Indicadores gerais da carteira de pacientes, alertas e sentimentos "
                          "mais registrados."],
            ["Pacientes", "Busca e filtros: com pendências, atrasados, sem acesso recente, "
                          "com alerta."],
            ["Perfil do paciente", "Cinco abas: Visão geral (gráficos), Rotina (criação e edição "
                                   "de atividades e aplicação de modelos), Histórico, "
                                   "Recompensas e Observações privadas."],
            ["Rotinas", "Biblioteca de modelos prontos do sistema mais os modelos personalizados "
                        "da profissional, aplicáveis a qualquer paciente vinculado."],
            ["Relatórios", "Geração em PDF nos formatos resumido, completo, para o paciente, "
                           "para responsáveis, para prontuário e personalizado."],
        ],
        [30 * mm, 135 * mm],
    ),
]

# ------- 6
story += [
    h1("6. Prioridade das atividades"),
    p("Cada atividade tem um entre quatro níveis de prioridade. A intenção do modelo é permitir "
      "que um dia ruim ainda conte como cumprido: se o paciente fizer apenas o que está no "
      "quadro indispensável, o dia está resolvido, e todo o resto é ganho e não cobrança."),
    table(
        ["Nível", "Significado apresentado ao paciente"],
        [
            ["Indispensável", "Não pode faltar hoje, mesmo num dia difícil."],
            ["Alta", "Importante, mas o dia não desanda se sobrar para amanhã."],
            ["Normal", "Faz parte da rotina, sem urgência."],
            ["Baixa", "Só se sobrar energia. É opcional."],
        ],
        [32 * mm, 133 * mm],
    ),
    h2("Quadro de prioridades"),
    p("Na aba Prioridades da tela Rotina, as atividades aparecem distribuídas em quatro quadros "
      "e podem ser movidas de um para outro. Há três formas de mover uma atividade, "
      "deliberadamente redundantes:"),
    bullets([
        "arrastar pelo pegador de pontinhos à esquerda do cartão;",
        "segurar o cartão por um instante e arrastar de qualquer ponto dele;",
        "tocar no cartão e escolher o quadro de destino em uma lista.",
    ]),
    p("A terceira forma existe porque parte do público do aplicativo tem dificuldade motora, e "
      "porque um gesto de arrastar mal calibrado deixaria a tela inutilizável. O gesto nunca é "
      "o único caminho."),
    box("<b>Limite de permissão.</b> O paciente reorganiza livremente as atividades que ele "
        "mesmo criou. As atividades criadas pela profissional aparecem no quadro com um cadeado "
        "e não podem ser movidas pelo paciente — a prioridade delas é definida por ela. Essa "
        "restrição é aplicada nas regras do Firestore, não apenas na interface."),
]

# ------- 7
story += [
    h1("7. Modelos de rotina prontos"),
    p("O sistema oferece quinze modelos, definidos em <font name=\"Courier\" size=\"9\">"
      "src/data/systemTemplates.ts</font>. A profissional pode aplicar qualquer um a um paciente "
      "e editar tudo depois, ou salvar modelos próprios. O paciente também pode aplicar modelos "
      "à própria rotina."),
    bullets([
        "<b>Por prioridade</b> — nove atividades distribuídas nos quatro níveis, do que não pode "
        "faltar ao que é apenas bônus.",
        "<b>Checklist simples do dia</b> — lista curta, sem horários fixos.",
        "<b>Por períodos do dia</b>, <b>rotina matinal</b>, <b>rotina noturna</b>, "
        "<b>higiene do sono</b>, <b>organização escolar</b>, <b>rotina de estudos</b>, "
        "<b>medicação</b>, <b>autocuidado</b>, <b>alimentação</b>, <b>exercícios</b>, "
        "<b>atividades para ansiedade</b> (respiração guiada, técnica 5-4-3-2-1), "
        "<b>organização pessoal</b> e um <b>modelo em branco</b>.",
    ]),
    h2("Prévia antes de aplicar"),
    p("Nenhum modelo é aplicado com um toque só. Ao escolher um modelo, uma prévia mostra o que "
      "ele propõe antes de qualquer coisa ser gravada:"),
    bullets([
        "uma explicação de <b>como o modelo funciona</b> — não o que ele contém, mas por que é "
        "assim. No modelo de higiene do sono, por exemplo, o texto esclarece que as atividades "
        "começam de tarde porque o sono depende do que acontece nas horas anteriores;",
        "quando útil, os <b>passos</b> sugeridos para usar o modelo;",
        "a <b>lista completa das atividades</b>, agrupada por período do dia — ou pelos quatro "
        "níveis de prioridade, no caso do modelo por prioridade;",
        "os botões <b>Voltar</b> e <b>Aplicar</b>, sendo que só o segundo grava algo.",
    ]),
]

# ------- 8
story += [
    h1("8. Notificações"),
    p("Antes de pedir a permissão do navegador, o aplicativo sempre mostra uma tela explicando "
      "o benefício. O token do dispositivo é guardado em "
      "<font name=\"Courier\" size=\"9\">users.fcmTokens</font>, e o envio é feito por Cloud "
      "Functions: um gatilho dispara ao criar qualquer documento em "
      "<font name=\"Courier\" size=\"9\">notifications</font>, e uma função agendada roda a cada "
      "dez minutos cuidando de atividade próxima, no horário e atrasada, do resumo diário às 20h "
      "e dos resumos de período às 7h30, 12h30 e 18h30."),
    h2("Preferências do paciente"),
    p("O paciente escolhe o que quer receber em quatro grupos, e não em uma lista longa de "
      "opções individuais. Quem quiser controle fino abre \"Ajustar em detalhe\" e mexe item "
      "por item — os onze tipos continuam existindo por baixo."),
    table(
        ["Grupo", "O que inclui"],
        [
            ["Lembretes das atividades", "Atividade se aproximando, no horário, atrasada e "
                                         "lembrete de medicação."],
            ["Recados da profissional", "Mensagens dela, nova atividade e atividade alterada."],
            ["Recompensas", "Nova recompensa disponível e recompensa conquistada."],
            ["Resumos", "Resumo por período do dia e resumo do dia."],
        ],
        [42 * mm, 123 * mm],
    ),
]

# ------- 9
story += [
    h1("9. Pontos e recompensas"),
    p("O progresso do paciente é acompanhado por pontos, nível, sequência de dias e medalhas."),
    bullets([
        "<b>Automáticas</b> — primeira atividade concluída, marcos de sequência (3, 7, 14, 30, "
        "60 e 100 dias) e período do dia completo. São calculadas pela Cloud Function disparada "
        "ao criar um registro de conclusão, usando o Admin SDK. Identificadores determinísticos "
        "evitam conquistas duplicadas.",
        "<b>Manuais</b> — a profissional cria recompensas e também pode entregá-las diretamente, "
        "mesmo sem pontuação atingida.",
    ]),
]

# ------- 10
story += [
    h1("10. Relatórios em PDF"),
    p("Os relatórios são gerados no próprio navegador com "
      "<font name=\"Courier\" size=\"9\">@react-pdf/renderer</font>, com prévia antes do "
      "download, a partir de dados agregados em "
      "<font name=\"Courier\" size=\"9\">src/services/reportData.ts</font>. Ao salvar, o arquivo "
      "vai para o Storage e os metadados são gravados na coleção "
      "<font name=\"Courier\" size=\"9\">reports</font>."),
    p("O relatório traz taxa de conclusão, total de atividades concluídas, pontos do período, "
      "adesão por categoria, atividades não realizadas, sentimentos registrados, comentários do "
      "paciente e observação da profissional. Cada seção pode ser incluída ou omitida, e antes "
      "de gerar um relatório destinado ao paciente ou a responsáveis a tela avisa para revisar "
      "o que será incluído."),
    box("Todo relatório é rodapeado com a ressalva de que apresenta informações e padrões de "
        "rotina e <b>não constitui diagnóstico</b>."),
]

# ------- 11
story += [
    h1("11. Banco de dados"),
    p("Firestore, com as seguintes coleções:"),
    table(
        ["Coleção", "Função", "Campos principais"],
        [
            ["users", "Conta de login", "role, name, email, fcmTokens, notificationPrefs"],
            ["professionals", "Dados da profissional", "profession, registrationNumber, bio"],
            ["patients", "Progresso do paciente", "points, level, currentStreak, privateNotes"],
            ["professionalPatientLinks", "Vínculo profissional-paciente", "status"],
            ["routines", "Container da rotina", "title, templateKind, status"],
            ["routineItems", "Cada atividade", "period, frequency, weekdays, category, "
                                               "priority, points, notificationConfig, createdBy"],
            ["completions", "Conclusão por dia", "status, feeling, comment, skipReason, "
                                                 "pointsAwarded"],
            ["emotionRecords", "Histórico de sentimentos", "feeling, category, date"],
            ["rewards", "Recompensas", "criteriaType, pointsRequired, isAutomatic"],
            ["rewardAchievements", "Conquistas efetivas", "awardedBy, pendingApproval"],
            ["notifications", "Notificações e push", "type, recipientId, read"],
            ["reports", "Metadados dos relatórios", "kind, periodStart, periodEnd, fileUrl"],
            ["messages", "Avisos para o paciente", "text, read"],
            ["routineTemplates", "Modelos personalizados", "kind, items[]"],
            ["auditLogs", "Trilha de ações sensíveis", "action, targetId"],
            ["guardians, permissions", "Preparados para acesso futuro de responsáveis", "-"],
        ],
        [36 * mm, 44 * mm, 85 * mm],
    ),
]

# ------- 12
story += [
    h1("12. Papéis e regras de acesso"),
    bullets([
        "<b>patient</b> — acessa somente os próprios documentos.",
        "<b>professional</b> — acessa somente pacientes com vínculo ativo.",
        "<b>guardian</b> — modelado no schema, ainda sem telas (acesso futuro e limitado).",
    ]),
    p("As regras reais ficam em <font name=\"Courier\" size=\"9\">firestore.rules</font> e "
      "<font name=\"Courier\" size=\"9\">storage.rules</font>, e nunca são abertas. O vínculo usa "
      "um identificador determinístico para que as regras validem o acesso diretamente, sem "
      "precisar de consultas dentro delas."),
    h2("Vínculo por código, não por busca"),
    p("Para vincular um paciente, a profissional usa o código dele, visível no aplicativo do "
      "paciente em Perfil. Não existe busca por e-mail. A consequência é que nenhuma "
      "profissional consegue descobrir ou listar pacientes que não estejam vinculados a ela — "
      "e isso é garantido pelo próprio desenho, sem depender de Cloud Function."),
    h2("Edição de atividades"),
    p("A profissional edita qualquer campo de qualquer atividade dos seus pacientes. O paciente "
      "edita livremente as atividades que ele mesmo criou, incluindo prioridade e horário; nas "
      "atividades criadas pela profissional, pode apenas registrar a conclusão."),
]

# ------- 13
story += [
    h1("13. Privacidade e dados"),
    bullets([
        "Termos de uso, política de privacidade e tela de consentimento.",
        "Exportação dos próprios dados em arquivo, a qualquer momento, pelo Perfil.",
        "Exclusão de conta pelo próprio usuário, com apagamento em cascata executado por Cloud "
        "Function e registro em trilha de auditoria.",
        "Observações privadas da profissional são visíveis apenas para ela, nunca para o "
        "paciente.",
    ]),
]

# ------- 14
story += [
    h1("14. Como rodar e publicar"),
    h2("Ambiente local"),
    code([
        "npm install",
        "cp .env.example .env      # preencher com as chaves do Firebase",
        "npm run dev",
    ]),
    h2("Configuração do Firebase"),
    bullets([
        "Criar um projeto no console do Firebase.",
        "Ativar Authentication (e-mail/senha e Google), Firestore, Storage e Cloud Messaging.",
        "Gerar uma chave VAPID em Cloud Messaging e informá-la em "
        "<font name=\"Courier\" size=\"9\">VITE_FIREBASE_VAPID_KEY</font>.",
        "Publicar regras e índices, e depois as Cloud Functions.",
    ]),
    code([
        "firebase deploy --only firestore:rules,firestore:indexes,storage:rules",
        "cd functions && npm install && npm run build && firebase deploy --only functions",
    ]),
    h2("Publicação do front-end"),
    code([
        "git pull",
        "npm run build",
        "npx wrangler deploy",
    ]),
    box("Depois de publicar, é preciso recarregar a página forçando a atualização, ou fechar e "
        "abrir o aplicativo instalado: o Service Worker mantém em cache a versão anterior."),
]

# ------- 15
story += [
    h1("15. Estrutura de pastas"),
    code([
        "src/",
        "  components/   componentes reutilizáveis (common, patient, professional)",
        "  contexts/     autenticação e avisos temporários",
        "  data/         modelos de rotina do sistema",
        "  firebase/     configuração, auth, firestore, storage, messaging",
        "  layouts/      shells com navegação inferior",
        "  pages/        telas por área (auth, legal, patient, professional)",
        "  pdf/          template do relatório em PDF",
        "  routes/       proteção de rotas por papel",
        "  services/     acesso a dados",
        "  sw/           service worker (cache e push)",
        "  types/        modelos de dados compartilhados",
        "  utils/        datas, agenda, pontos, constantes e textos",
        "functions/src/  Cloud Functions (gatilhos, agendadas, chamáveis)",
    ]),
]

# ------- 16
story += [
    h1("16. Mudanças desta versão"),
    table(
        ["Área", "O que mudou"],
        [
            ["Prioridades", "Acrescentado o nível Indispensável, que passa a ser o mais alto dos "
                            "quatro. O nível intermediário passou a se chamar Normal. Rotinas "
                            "já existentes seguem válidas."],
            ["Quadro de prioridades", "Nova aba Prioridades na tela Rotina, com os quatro "
                                      "quadros e três formas de mover uma atividade. Atividades "
                                      "criadas pela profissional aparecem travadas."],
            ["Modelos de rotina", "Todos os modelos do sistema ganharam uma explicação de como "
                                  "funcionam, e nenhum é mais aplicado sem uma prévia. O modelo "
                                  "por prioridade foi de três para nove atividades, cobrindo os "
                                  "quatro níveis."],
            ["Notificações", "As onze opções individuais foram agrupadas em quatro grupos, com o "
                             "controle detalhado disponível em um expansor."],
            ["Tela de entrada", "Redesenhada em tela cheia, com partículas animadas ao fundo, "
                                "frase que troca sozinha e opção de modo desktop."],
        ],
        [36 * mm, 129 * mm],
    ),
]


# ---------------------------------------------------------------- montagem

def rodape(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(22 * mm, 14 * mm, "ROTA — Documentação do sistema")
    canvas.drawRightString(A4[0] - 22 * mm, 14 * mm, str(canvas.getPageNumber()))
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(22 * mm, 18 * mm, A4[0] - 22 * mm, 18 * mm)
    canvas.restoreState()


def capa_fundo(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(BRAND)
    canvas.rect(0, A4[1] - 12 * mm, A4[0], 12 * mm, stroke=0, fill=1)
    canvas.setFillColor(LIGHT)
    canvas.rect(0, 0, A4[0], 8 * mm, stroke=0, fill=1)
    canvas.restoreState()


doc = BaseDocTemplate(OUT, pagesize=A4, title="ROTA — Documentação do sistema",
                      author="ROTA", subject="Documentação do sistema ROTA")
frame = Frame(22 * mm, 22 * mm, 165 * mm, A4[1] - 44 * mm, id="f")
doc.addPageTemplates([
    PageTemplate(id="capa", frames=[frame], onPage=capa_fundo),
    PageTemplate(id="miolo", frames=[frame], onPage=rodape),
])
doc.build(story)
print("gerado:", OUT)
