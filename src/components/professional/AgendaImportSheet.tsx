import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { createSession } from "@/services/sessions";
import { createContactPatient, subscribeToLinkedPatients } from "@/services/patients";
import { getPatientsOverview } from "@/services/professionalOverview";
import { lerIcsDeAgenda, palpitarPaciente, type EventoImportado, type ResultadoIcs } from "@/utils/icsImport";
import { getExternalEvents } from "@/services/externalEvents";
import { todayKey } from "@/utils/date";

/** O que fazer com cada evento do arquivo. */
type Destino =
  | { tipo: "ignorar" }
  | { tipo: "paciente"; patientId: string }
  | { tipo: "novo" };

/**
 * Traz a agenda do Google para dentro do ROTA.
 *
 * É uma mudança de casa, não uma sincronização: roda uma vez, cria atendimentos
 * de verdade — com paciente, valor e situação de pagamento — e depois o ROTA
 * passa a ser a fonte. Bloco de calendário não serviria: é dele que saem as
 * finanças, as pendências de registro e a nota.
 *
 * O trabalho da tela é um só, e é o que decide se a migração dá certo: ligar
 * cada evento a um paciente. O sistema palpita pelo título, ela confirma de
 * relance, e o que não for atendimento sai do caminho.
 */
export function AgendaImportSheet({
  professionalId,
  onClose,
}: {
  professionalId: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pacientes, setPacientes] = useState<Array<{ id: string; name: string }>>([]);
  const [de, setDe] = useState(todayKey());
  const [ate, setAte] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [resultado, setResultado] = useState<ResultadoIcs | null>(null);
  const [arquivo, setArquivo] = useState<string | null>(null);
  /** Quantos blocos já espelhados existem — a fonte mais fácil, quando existe. */
  const [temEspelho, setTemEspelho] = useState<number | null>(null);
  const [carregandoEspelho, setCarregandoEspelho] = useState(false);
  const [destinos, setDestinos] = useState<Record<string, Destino>>({});
  const [valor, setValor] = useState("");
  const [modalidade, setModalidade] = useState<"in_person" | "online">("in_person");
  const [importando, setImportando] = useState(false);
  const [resumo, setResumo] = useState<{ criadas: number; pacientes: number } | null>(null);

  useEffect(() => {
    return subscribeToLinkedPatients(professionalId, async (links) => {
      const overview = await getPatientsOverview(links.map((l) => l.patientId));
      setPacientes(overview.map((o) => ({ id: o.patientId, name: o.name })));
    });
  }, [professionalId]);

  // Se o espelho está ligado, os compromissos já estão aqui: exportar o arquivo
  // do Google de novo seria pedir trabalho por nada.
  useEffect(() => {
    getExternalEvents(professionalId, de, ate)
      .then((itens) => setTemEspelho(itens.filter((e) => e.startTime && e.endTime).length))
      .catch(() => setTemEspelho(0));
  }, [professionalId, de, ate]);

  async function usarEspelho() {
    setCarregandoEspelho(true);
    try {
      const itens = await getExternalEvents(professionalId, de, ate);
      const eventos: EventoImportado[] = itens
        .filter((e) => e.startTime && e.endTime)
        .map((e) => ({
          uid: e.id,
          titulo: e.titulo,
          data: e.date,
          inicio: e.startTime,
          fim: e.endTime,
          diaInteiro: false,
          repetido: false,
        }))
        .sort((a, b) => (a.data + a.inicio).localeCompare(b.data + b.inicio));

      setArquivo(null);
      setResultado({ eventos, naoInterpretados: [] });
      const novos: Record<string, Destino> = {};
      new Set(eventos.map((e) => e.titulo)).forEach((titulo) => {
        const palpite = palpitarPaciente(titulo, pacientes);
        novos[titulo] = palpite ? { tipo: "paciente", patientId: palpite } : { tipo: "ignorar" };
      });
      setDestinos(novos);
    } finally {
      setCarregandoEspelho(false);
    }
  }

  /** Relê o arquivo quando ela muda a janela de datas. */
  useEffect(() => {
    if (!arquivo) return;
    const r = lerIcsDeAgenda(arquivo, de, ate);
    setResultado(r);

    // Um destino por título, e não por evento: "Ana Beatriz" às terças são
    // quinze eventos que ela não deveria ligar quinze vezes.
    const novos: Record<string, Destino> = {};
    new Set(r.eventos.map((e) => e.titulo)).forEach((titulo) => {
      const palpite = palpitarPaciente(titulo, pacientes);
      novos[titulo] = palpite ? { tipo: "paciente", patientId: palpite } : { tipo: "ignorar" };
    });
    setDestinos(novos);
  }, [arquivo, de, ate, pacientes]);

  const porTitulo = useMemo(() => {
    const mapa = new Map<string, EventoImportado[]>();
    resultado?.eventos.forEach((e) => {
      mapa.set(e.titulo, [...(mapa.get(e.titulo) ?? []), e]);
    });
    return [...mapa.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [resultado]);

  const aCriar = useMemo(
    () => resultado?.eventos.filter((e) => destinos[e.titulo]?.tipo !== "ignorar" && !e.diaInteiro).length ?? 0,
    [resultado, destinos]
  );

  async function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setArquivo(await f.text());
  }

  async function importar() {
    if (!resultado) return;
    setImportando(true);

    // Cadastro novo é criado uma vez por título, antes das sessões — senão cada
    // evento do mesmo paciente criaria um cadastro.
    const criados: Record<string, string> = {};
    let novosCadastros = 0;
    for (const [titulo, destino] of Object.entries(destinos)) {
      if (destino.tipo !== "novo") continue;
      try {
        criados[titulo] = await createContactPatient(professionalId, { name: titulo });
        novosCadastros++;
      } catch {
        // Segue: um cadastro que falhou não pode derrubar a leva.
      }
    }

    let criadas = 0;
    for (const evento of resultado.eventos) {
      if (evento.diaInteiro) continue;
      const destino = destinos[evento.titulo];
      if (!destino || destino.tipo === "ignorar") continue;

      const patientId = destino.tipo === "novo" ? criados[evento.titulo] : destino.patientId;
      if (!patientId) continue;
      const nome =
        destino.tipo === "novo"
          ? evento.titulo
          : pacientes.find((p) => p.id === patientId)?.name ?? evento.titulo;

      try {
        await createSession({
          professionalId,
          patientId,
          patientName: nome,
          date: evento.data,
          startTime: evento.inicio,
          endTime: evento.fim,
          modality: modalidade,
          status: "scheduled",
          paymentStatus: "pending",
          ...(valor ? { price: Number(valor.replace(",", ".")) } : {}),
          ...(evento.local ? { note: evento.local } : {}),
        });
        criadas++;
      } catch {
        // idem: uma sessão recusada não interrompe as outras.
      }
    }

    setImportando(false);
    setResumo({ criadas, pacientes: novosCadastros });
  }

  if (resumo) {
    return (
      <BottomSheet
        open
        onClose={onClose}
        title="Importação concluída"
        footer={
          <button onClick={onClose} className="btn-primary">
            Ver na agenda
          </button>
        }
      >
        <div className="py-4 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-2 text-lg font-extrabold text-brand-900">
            {resumo.criadas} {resumo.criadas === 1 ? "atendimento criado" : "atendimentos criados"}
          </p>
          {resumo.pacientes > 0 && (
            <p className="mt-1 text-sm text-brand-500">
              e {resumo.pacientes} {resumo.pacientes === 1 ? "cadastro novo" : "cadastros novos"} de paciente
            </p>
          )}
          <p className="mt-3 text-sm leading-relaxed text-brand-500">
            Todos entraram como <span className="font-bold">agendados</span> e{" "}
            <span className="font-bold">pagamento pendente</span>. Confira a semana antes de confiar — e
            lembre que os que você já tinha marcado aqui continuam lá, então vale olhar se algum ficou
            repetido.
          </p>
        </div>
      </BottomSheet>
    );
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Trazer a agenda do Google"
      footer={
        resultado && resultado.eventos.length > 0 ? (
          <button onClick={importar} disabled={aCriar === 0 || importando} className="btn-primary">
            {importando ? "Criando..." : `Criar ${aCriar} ${aCriar === 1 ? "atendimento" : "atendimentos"}`}
          </button>
        ) : temEspelho ? (
          <button onClick={usarEspelho} disabled={carregandoEspelho} className="btn-primary">
            {carregandoEspelho ? "Carregando..." : `Usar os ${temEspelho} do espelho`}
          </button>
        ) : (
          <button onClick={() => inputRef.current?.click()} className="btn-primary">
            Escolher arquivo .ics
          </button>
        )
      }
    >
      <input ref={inputRef} type="file" accept=".ics,text/calendar" onChange={escolherArquivo} className="hidden" />

      {!resultado ? (
        <div className="flex flex-col gap-3">
          {temEspelho ? (
            <div className="rounded-2xl bg-brand-50/70 p-3">
              <p className="text-xs font-bold text-brand-700">
                {temEspelho} compromissos já estão aqui
              </p>
              <p className="mt-1 text-xs leading-relaxed text-brand-600">
                Vieram do espelho do seu Google Agenda, no período escolhido abaixo. Dá para transformar
                em atendimentos direto, sem exportar arquivo nenhum — você liga cada título a um paciente
                na próxima tela.
              </p>
              <div className="mt-2 flex gap-2">
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] font-bold text-brand-700">De</span>
                  <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="input-field text-xs" />
                </label>
                <label className="flex flex-1 flex-col gap-1">
                  <span className="text-[11px] font-bold text-brand-700">até</span>
                  <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="input-field text-xs" />
                </label>
              </div>
            </div>
          ) : null}

          <div className="rounded-2xl bg-cream-100 p-3">
            <p className="text-xs font-bold text-brand-700">
              {temEspelho ? "Ou exportar do Google" : "Como exportar do Google"}
            </p>
            <ol className="mt-1 flex flex-col gap-1 text-xs leading-snug text-brand-600">
              <li>1. No computador, abra o Google Agenda.</li>
              <li>2. Engrenagem › <span className="font-bold">Configurações</span>.</li>
              <li>3. <span className="font-bold">Importar e exportar</span> › Exportar.</li>
              <li>4. Baixa um .zip — descompacte e escolha aqui o arquivo <span className="font-bold">.ics</span>.</li>
            </ol>
          </div>
          {temEspelho ? (
            <button onClick={() => inputRef.current?.click()} className="btn-secondary">
              Escolher arquivo .ics
            </button>
          ) : null}

          <p className="text-xs leading-relaxed text-brand-500">
            Nada é gravado antes de você conferir a lista e ligar cada evento a um paciente.
          </p>
        </div>
      ) : resultado.erro ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-2xl bg-rose-50 p-3 text-sm leading-relaxed text-rose-700">{resultado.erro}</p>
          <button onClick={() => { setResultado(null); setArquivo(null); }} className="btn-secondary">
            Escolher outro arquivo
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-bold text-brand-700">Trazer de</span>
              <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="input-field" />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-bold text-brand-700">até</span>
              <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="input-field" />
            </label>
          </div>

          <p className="text-sm font-bold text-brand-700">
            {resultado.eventos.length} {resultado.eventos.length === 1 ? "evento" : "eventos"} no período ·{" "}
            {porTitulo.length} {porTitulo.length === 1 ? "título diferente" : "títulos diferentes"}
          </p>

          {resultado.naoInterpretados.length > 0 && (
            <p className="rounded-xl bg-amber-50 p-2.5 text-xs leading-snug text-amber-800">
              Não consegui expandir a repetição de: {resultado.naoInterpretados.join(", ")}. Prefiro avisar
              a inventar horário — marque esses na mão depois.
            </p>
          )}

          <div className="flex gap-2">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-bold text-brand-700">Valor padrão</span>
              <input
                inputMode="decimal"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="opcional"
                className="input-field"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs font-bold text-brand-700">Modalidade</span>
              <select
                value={modalidade}
                onChange={(e) => setModalidade(e.target.value as "in_person" | "online")}
                className="input-field"
              >
                <option value="in_person">Presencial</option>
                <option value="online">Online</option>
              </select>
            </label>
          </div>

          <p className="text-xs leading-snug text-brand-500">
            Ligue cada título a um paciente. O que não for atendimento — almoço, supervisão, aniversário —
            deixe em "ignorar".
          </p>

          <div className="flex flex-col gap-2">
            {porTitulo.map(([titulo, eventos]) => (
              <LinhaTitulo
                key={titulo}
                titulo={titulo}
                eventos={eventos}
                pacientes={pacientes}
                destino={destinos[titulo] ?? { tipo: "ignorar" }}
                onMudar={(d) => setDestinos((prev) => ({ ...prev, [titulo]: d }))}
              />
            ))}
          </div>
        </div>
      )}
    </BottomSheet>
  );
}

function LinhaTitulo({
  titulo,
  eventos,
  pacientes,
  destino,
  onMudar,
}: {
  titulo: string;
  eventos: EventoImportado[];
  pacientes: Array<{ id: string; name: string }>;
  destino: Destino;
  onMudar: (d: Destino) => void;
}) {
  const diaInteiro = eventos.every((e) => e.diaInteiro);
  const primeiro = eventos[0];

  return (
    <div
      className={clsx(
        "rounded-2xl p-3",
        destino.tipo === "ignorar" ? "bg-cream-50" : "bg-white ring-1 ring-brand-200"
      )}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-brand-800">{titulo}</p>
        <span className="shrink-0 text-[11px] font-bold text-brand-400">
          {eventos.length}×{primeiro.repetido ? " (repete)" : ""}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-brand-400">
        {diaInteiro
          ? "dia inteiro — não vira atendimento"
          : `${primeiro.data.split("-").reverse().join("/")} · ${primeiro.inicio}–${primeiro.fim}`}
      </p>

      {!diaInteiro && (
        <select
          value={destino.tipo === "paciente" ? destino.patientId : destino.tipo}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "ignorar") onMudar({ tipo: "ignorar" });
            else if (v === "novo") onMudar({ tipo: "novo" });
            else onMudar({ tipo: "paciente", patientId: v });
          }}
          className="input-field mt-2 text-sm"
        >
          <option value="ignorar">Ignorar — não é atendimento</option>
          <option value="novo">Criar cadastro “{titulo}”</option>
          {pacientes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
