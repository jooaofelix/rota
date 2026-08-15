import { Link } from "react-router-dom";

/**
 * Apresentação pública do ROTA.
 *
 * Existe para o momento anterior ao convite: alguém recebe o link, entende o
 * que vai acontecer e só então decide entrar. Por isso as imagens são capturas
 * reais do aplicativo, e não desenho de vitrine — a tela que a pessoa vê aqui é
 * a tela que ela vai encontrar depois.
 *
 * A seção de sigilo fica junto das outras, e não escondida no rodapé: para quem
 * está em terapia, "quem vê o que eu escrevo" é a primeira pergunta, mesmo
 * quando não é feita em voz alta.
 */

interface Bloco {
  etiqueta: string;
  titulo: string;
  texto: string;
  imagem: string;
  alt: string;
}

const PACIENTE: Bloco[] = [
  {
    etiqueta: "O dia",
    titulo: "A rotina em vez da lista infinita",
    texto:
      "As atividades combinadas em sessão aparecem separadas por manhã, tarde e noite. Marcar que fez leva um toque, e dá para dizer como foi — inclusive quando não deu.",
    imagem: "/apresentacao/rotina.jpg",
    alt: "Tela da rotina do dia, com atividades por período",
  },
  {
    etiqueta: "Prioridades",
    titulo: "Nos dias ruins, o que é essencial",
    texto:
      "Nem todo dia rende. O quadro de prioridades deixa claro o que não pode faltar e o que pode esperar, para o dia difícil não virar dia perdido.",
    imagem: "/apresentacao/prioridades.jpg",
    alt: "Quadro de prioridades com atividades organizadas por importância",
  },
  {
    etiqueta: "Entre as sessões",
    titulo: "Material para ler com calma",
    texto:
      "Sua psicóloga pode mandar material sobre o que vocês conversaram — sono, ansiedade, o pensamento que não desliga. Abre no celular, sem instalar nada.",
    imagem: "/apresentacao/material.jpg",
    alt: "Material de psicoeducação aberto no celular",
  },
];

const PROFISSIONAL: Bloco[] = [
  {
    etiqueta: "Painel",
    titulo: "O que precisa da sua atenção hoje",
    texto:
      "Próximos atendimentos, pendências de registro e cobrança, aniversariantes do mês. O que costuma escapar fica na primeira tela.",
    imagem: "/apresentacao/painel.jpg",
    alt: "Painel da profissional com próximas sessões e pendências",
  },
  {
    etiqueta: "Agenda",
    titulo: "A semana inteira, com a sala junto",
    texto:
      "Grade da semana, arrastar para remarcar, recorrência, e os horários em que a sala é de outra pessoa já sombreados.",
    imagem: "/apresentacao/agenda.jpg",
    alt: "Grade semanal da agenda com atendimentos",
  },
  {
    etiqueta: "Finanças",
    titulo: "Quanto entrou, quanto falta entrar",
    texto:
      "Recebido, em aberto e atrasado por mês, com a evolução do faturamento. Sem planilha paralela.",
    imagem: "/apresentacao/financas.jpg",
    alt: "Tela de finanças com gráfico de evolução do faturamento",
  },
];

export function AboutPage() {
  return (
    <div className="min-h-screen bg-cream-50">
      <header className="mx-auto max-w-3xl px-5 pb-2 pt-12 text-center">
        <img src="/logo-icon.png" alt="" className="mx-auto h-14 w-14" />
        <h1 className="mt-4 text-3xl font-extrabold leading-tight text-brand-900 sm:text-4xl">
          O acompanhamento continua fora da sessão
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-brand-600">
          O ROTA é onde a rotina combinada em terapia vira um dia possível de seguir — e onde a
          profissional acompanha o que aconteceu entre uma sessão e outra.
        </p>
        <div className="mt-6 flex flex-col items-center gap-2">
          <Link to="/login" className="btn-primary max-w-xs">
            Entrar
          </Link>
          <p className="text-xs text-brand-400">
            Recebeu um código da sua psicóloga?{" "}
            <Link to="/cadastro" className="font-bold text-brand-600">
              Criar conta
            </Link>
          </p>
        </div>
      </header>

      <Secao
        titulo="Para quem está em acompanhamento"
        subtitulo="Nada aqui cobra. O aplicativo mostra o combinado e registra o que foi possível."
        blocos={PACIENTE}
      />

      <div className="mx-auto max-w-3xl px-5 py-8">
        <div className="rounded-3xl bg-white p-6 shadow-card">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-400">Sigilo</p>
          <h2 className="mt-1 text-xl font-extrabold text-brand-900">Quem vê o que você escreve</h2>
          <ul className="mt-3 flex flex-col gap-2.5 text-sm leading-relaxed text-brand-600">
            <li>
              <span className="font-bold text-brand-800">Só a sua profissional.</span> Ninguém mais tem
              acesso à sua rotina, ao que você marcou ou ao que você escreveu.
            </li>
            <li>
              <span className="font-bold text-brand-800">O prontuário não é público nem para você
              pelo aplicativo.</span> Ele existe e é seu por direito, mas o acesso passa por ela — para
              vir acompanhado de leitura clínica, como manda a Resolução CFP 001/2009.
            </li>
            <li>
              <span className="font-bold text-brand-800">Você pode sair quando quiser.</span> Dá para
              exportar seus dados e pedir a exclusão da conta, pelo próprio aplicativo.
            </li>
          </ul>
          <p className="mt-3 text-xs leading-relaxed text-brand-400">
            Leia a{" "}
            <Link to="/privacidade" className="font-bold text-brand-500">
              política de privacidade
            </Link>{" "}
            e os{" "}
            <Link to="/termos" className="font-bold text-brand-500">
              termos de uso
            </Link>
            .
          </p>
        </div>
      </div>

      <Secao
        titulo="Para quem atende"
        subtitulo="Agenda, prontuário, finanças e questionários no mesmo lugar — sem trocar de aplicativo três vezes por atendimento."
        blocos={PROFISSIONAL}
      />

      <div className="mx-auto max-w-3xl px-5 pb-16 pt-4 text-center">
        <div className="rounded-3xl bg-brand-500 p-7">
          <p className="text-lg font-extrabold text-white">Pronto para começar?</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-white/80">
            Se sua psicóloga te passou um código de acesso, é com ele que você cria a conta — seu
            acompanhamento já aparece pronto.
          </p>
          <div className="mt-4 flex flex-col items-center gap-2">
            <Link
              to="/cadastro"
              className="w-full max-w-xs rounded-2xl bg-white px-4 py-3.5 text-base font-bold text-brand-700"
            >
              Criar minha conta
            </Link>
            <Link to="/login" className="text-sm font-bold text-white/90">
              Já tenho conta, quero entrar
            </Link>
          </div>
        </div>

        <p className="mt-6 text-[11px] leading-relaxed text-brand-300">
          As imagens são telas reais do aplicativo, com dados fictícios. Nenhuma informação de paciente
          aparece nesta página.
        </p>
      </div>
    </div>
  );
}

function Secao({ titulo, subtitulo, blocos }: { titulo: string; subtitulo: string; blocos: Bloco[] }) {
  return (
    <section className="mx-auto max-w-3xl px-5 py-8">
      <h2 className="text-2xl font-extrabold text-brand-900">{titulo}</h2>
      <p className="mt-1 text-sm leading-relaxed text-brand-500">{subtitulo}</p>

      <div className="mt-5 flex flex-col gap-6">
        {blocos.map((b) => (
          <article key={b.titulo} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
            {/* A imagem tem largura fixa e alta contida: a captura é de um
                celular, e esticar isso numa tela larga só produz borrão. */}
            <img
              src={b.imagem}
              alt={b.alt}
              loading="lazy"
              width={390}
              height={780}
              className="w-full max-w-[240px] self-center rounded-2xl border border-brand-100 shadow-card sm:self-start"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-wide text-brand-400">{b.etiqueta}</p>
              <h3 className="mt-1 text-lg font-extrabold leading-tight text-brand-900">{b.titulo}</h3>
              <p className="mt-2 text-sm leading-relaxed text-brand-600">{b.texto}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
