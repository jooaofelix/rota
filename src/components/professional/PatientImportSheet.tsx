import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { createContactPatient, getExistingPatientNames } from "@/services/patients";
import { formatMoney } from "@/utils/agenda";
import { jaExiste, lerCsvDePacientes, type PacienteImportado, type ResultadoLeitura } from "@/utils/importPatients";

/**
 * Importa a lista de pacientes vinda de outro sistema.
 *
 * O arquivo é lido no navegador dela e nunca sai daí antes de ela conferir: são
 * nomes, CPF e telefone de gente em psicoterapia, e o passo de revisão existe
 * justamente porque importação errada de dado sensível não se desfaz com um
 * Ctrl+Z.
 *
 * Repetido não entra sozinho. Antes ficava só desmarcado, o que bastava até
 * alguém usar "marcar todos" ou reimportar o mesmo arquivo — e a lista dobrou.
 * Agora a conferência é feita duas vezes contra o banco (ao abrir e na hora de
 * gravar) e o nome repetido só passa se ela disser, um por um, que quer mesmo.
 */
export function PatientImportSheet({
  professionalId,
  onClose,
}: {
  professionalId: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [existentes, setExistentes] = useState<string[] | null>(null);
  const [resultado, setResultado] = useState<ResultadoLeitura | null>(null);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [forcados, setForcados] = useState<Set<number>>(new Set());
  const [importando, setImportando] = useState(false);
  const [resumo, setResumo] = useState<{ ok: number; pulados: number } | null>(null);

  useEffect(() => {
    getExistingPatientNames(professionalId)
      .then(setExistentes)
      .catch(() => setExistentes([]));
  }, [professionalId]);

  /** Repetido é quem já está na lista dela ou quem se repete dentro do arquivo. */
  function ehRepetido(p: PacienteImportado): boolean {
    return p.repetidoNoArquivo === true || jaExiste(p.nome, existentes ?? []);
  }

  function carregar(texto: string) {
    const r = lerCsvDePacientes(texto);
    setResultado(r);
    setForcados(new Set());
    // Vem marcado só quem não é repetido e não está encerrado. Numa lista de
    // oitenta e sete, deixar "alta" e "desistência" marcados por padrão obrigaria
    // ela a reconhecer nome por nome para desmarcar.
    setSelecionados(
      new Set(r.pacientes.filter((p) => !ehRepetido(p) && p.situacao !== "encerrado").map((p) => p.linha))
    );
  }

  async function escolherArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    carregar(await arquivo.text());
  }

  function alternar(p: PacienteImportado) {
    if (ehRepetido(p) && !forcados.has(p.linha)) return;
    setSelecionados((prev) => {
      const novo = new Set(prev);
      if (novo.has(p.linha)) novo.delete(p.linha);
      else novo.add(p.linha);
      return novo;
    });
  }

  function forcar(p: PacienteImportado) {
    setForcados((prev) => new Set(prev).add(p.linha));
    setSelecionados((prev) => new Set(prev).add(p.linha));
  }

  async function importar() {
    if (!resultado) return;
    const escolhidos = resultado.pacientes.filter((p) => selecionados.has(p.linha));
    if (escolhidos.length === 0) return;

    setImportando(true);

    // Confere de novo contra o banco, agora. A lista carregada ao abrir pode ter
    // envelhecido — outra aba, outro aparelho, ou a importação anterior desta
    // mesma sessão. É esta segunda conferência que impede a duplicata de verdade.
    let atuais: string[];
    try {
      atuais = await getExistingPatientNames(professionalId);
    } catch {
      atuais = existentes ?? [];
    }

    const jaGravados = [...atuais];
    let ok = 0;
    let pulados = 0;

    for (const p of escolhidos) {
      if (!forcados.has(p.linha) && jaExiste(p.nome, jaGravados)) {
        pulados++;
        continue;
      }
      try {
        await createContactPatient(professionalId, {
          name: p.nome,
          email: p.email,
          phone: p.telefone,
          cpf: p.cpf,
          birthDate: p.nascimento,
          defaultPrice: p.valorSessao,
          ativo: p.situacao !== "encerrado",
        });
        // Entra na lista na hora: duas linhas iguais no mesmo arquivo não passam.
        jaGravados.push(p.nome);
        ok++;
      } catch {
        // Segue com os outros: uma falha isolada não pode derrubar a leva inteira.
      }
    }

    setImportando(false);
    setResumo({ ok, pulados });
    showToast(`${ok} de ${escolhidos.length} pacientes cadastrados.`);
  }

  if (resumo) {
    return (
      <BottomSheet
        open
        onClose={onClose}
        title="Importação concluída"
        footer={
          <button onClick={onClose} className="btn-primary">
            Fechar
          </button>
        }
      >
        <div className="py-4 text-center">
          <p className="text-4xl">✅</p>
          <p className="mt-2 text-lg font-extrabold text-brand-900">
            {resumo.ok} {resumo.ok === 1 ? "paciente cadastrado" : "pacientes cadastrados"}
          </p>
          {resumo.pulados > 0 && (
            <p className="mt-2 rounded-xl bg-cream-100 p-2.5 text-xs leading-snug text-brand-600">
              {resumo.pulados} {resumo.pulados === 1 ? "linha foi pulada" : "linhas foram puladas"} por já
              existir alguém com o mesmo nome na sua lista.
            </p>
          )}
          <p className="mt-2 text-sm leading-relaxed text-brand-500">
            Eles já aparecem na lista, na agenda e nas finanças. Ninguém recebeu convite nem
            e-mail — são cadastros seus, não contas.
            <br />
            <br />
            Cada um ganhou um <span className="font-bold text-brand-700">código de acesso</span>. Se
            algum dia você quiser convidar alguém para usar o aplicativo, o código está na página do
            paciente: com ele a pessoa cria a conta e o acompanhamento já aparece pronto.
          </p>
        </div>
      </BottomSheet>
    );
  }

  const repetidos = resultado?.pacientes.filter(ehRepetido).length ?? 0;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Importar pacientes"
      footer={
        resultado && resultado.pacientes.length > 0 ? (
          <button onClick={importar} disabled={selecionados.size === 0 || importando} className="btn-primary">
            {importando
              ? "Cadastrando..."
              : `Cadastrar ${selecionados.size} ${selecionados.size === 1 ? "paciente" : "pacientes"}`}
          </button>
        ) : (
          <button
            onClick={() => inputRef.current?.click()}
            disabled={existentes === null}
            className="btn-primary"
          >
            {existentes === null ? "Conferindo sua lista..." : "Escolher arquivo CSV"}
          </button>
        )
      }
    >
      <input ref={inputRef} type="file" accept=".csv,text/csv" onChange={escolherArquivo} className="hidden" />

      {!resultado ? (
        <div className="flex flex-col gap-3">
          <div className="rounded-2xl bg-cream-100 p-3">
            <p className="text-xs font-bold text-brand-700">Como preparar o arquivo</p>
            <ol className="mt-1 flex flex-col gap-1 text-xs leading-snug text-brand-600">
              <li>1. Abra a planilha de pacientes no Excel ou no Google Planilhas.</li>
              <li>2. Salve como <span className="font-bold">CSV</span> (Arquivo › Salvar como › CSV).</li>
              <li>3. Escolha esse arquivo aqui.</li>
            </ol>
          </div>

          <p className="text-xs leading-relaxed text-brand-500">
            Aproveito as colunas <span className="font-bold">Nome</span>,{" "}
            <span className="font-bold">Data de Nascimento</span>, <span className="font-bold">E-mail</span>,{" "}
            <span className="font-bold">Telefone</span>, <span className="font-bold">CPF</span> e{" "}
            <span className="font-bold">Valor da sessão</span>. Só o nome é obrigatório; o resto entra
            se estiver lá.
          </p>

          <p className="rounded-2xl bg-brand-50/70 p-3 text-xs leading-relaxed text-brand-600">
            O arquivo é lido aqui no seu aparelho e você confere a lista antes de qualquer coisa ser
            gravada. Quem já está cadastrado não entra de novo, nem se estiver no arquivo duas vezes.
          </p>
        </div>
      ) : resultado.erro ? (
        <div className="flex flex-col gap-3">
          <p className="rounded-2xl bg-rose-50 p-3 text-sm leading-relaxed text-rose-700">{resultado.erro}</p>
          <button onClick={() => setResultado(null)} className="btn-secondary">
            Escolher outro arquivo
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {repetidos > 0 && (
            <p className="rounded-xl bg-amber-50 p-2.5 text-xs leading-snug text-amber-700">
              {repetidos} {repetidos === 1 ? "nome já está" : "nomes já estão"} na sua lista (ou{" "}
              {repetidos === 1 ? "aparece" : "aparecem"} repetido no arquivo). Deixei de fora para não
              duplicar. Se for outra pessoa com o mesmo nome, use "importar mesmo assim".
            </p>
          )}

          {(() => {
            const encerrados = resultado.pacientes.filter(
              (p) => p.situacao === "encerrado" && !ehRepetido(p)
            ).length;
            return encerrados > 0 ? (
              <p className="rounded-xl bg-cream-100 p-2.5 text-xs leading-snug text-brand-600">
                {encerrados} {encerrados === 1 ? "pessoa está" : "pessoas estão"} com acompanhamento
                encerrado na planilha (alta, desistência ou desativado). Deixei{" "}
                {encerrados === 1 ? "desmarcada" : "desmarcadas"} — marque se quiser guardar o
                histórico delas.
              </p>
            ) : null;
          })()}

          <div className="flex items-baseline justify-between gap-2">
            <p className="text-sm font-bold text-brand-700">
              {resultado.pacientes.length} {resultado.pacientes.length === 1 ? "linha lida" : "linhas lidas"}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  setSelecionados(
                    new Set(
                      resultado.pacientes
                        .filter((p) => !ehRepetido(p) || forcados.has(p.linha))
                        .map((p) => p.linha)
                    )
                  )
                }
                className="text-[11px] font-bold text-brand-500"
              >
                Marcar todos
              </button>
              <button onClick={() => setSelecionados(new Set())} className="text-[11px] font-bold text-brand-400">
                Limpar
              </button>
            </div>
          </div>

          {resultado.linhasSemNome.length > 0 && (
            <p className="rounded-xl bg-amber-50 p-2.5 text-xs leading-snug text-amber-700">
              {resultado.linhasSemNome.length}{" "}
              {resultado.linhasSemNome.length === 1 ? "linha foi ignorada" : "linhas foram ignoradas"} por não
              ter nome (linha {resultado.linhasSemNome.slice(0, 5).join(", ")}).
            </p>
          )}

          <div className="flex flex-col">
            {resultado.pacientes.map((p) => (
              <Linha
                key={p.linha}
                paciente={p}
                marcado={selecionados.has(p.linha)}
                repetido={ehRepetido(p)}
                forcado={forcados.has(p.linha)}
                onToggle={() => alternar(p)}
                onForcar={() => forcar(p)}
              />
            ))}
          </div>

          {resultado.colunasIgnoradas.length > 0 && (
            <p className="text-[11px] leading-snug text-brand-400">
              Colunas que não uso e ficaram de fora: {resultado.colunasIgnoradas.slice(0, 8).join(", ")}
              {resultado.colunasIgnoradas.length > 8 ? "..." : ""}
            </p>
          )}
        </div>
      )}
    </BottomSheet>
  );
}

function Linha({
  paciente,
  marcado,
  repetido,
  forcado,
  onToggle,
  onForcar,
}: {
  paciente: PacienteImportado;
  marcado: boolean;
  repetido: boolean;
  forcado: boolean;
  onToggle: () => void;
  onForcar: () => void;
}) {
  const detalhes = [
    paciente.nascimento?.toLocaleDateString("pt-BR"),
    paciente.cpf,
    paciente.valorSessao ? formatMoney(paciente.valorSessao) : undefined,
  ].filter(Boolean);
  const encerrado = paciente.situacao === "encerrado";
  const bloqueado = repetido && !forcado;

  return (
    <div className="flex items-start gap-2.5 border-b border-brand-50 py-2 last:border-b-0">
      <button
        onClick={onToggle}
        disabled={bloqueado}
        className={clsx("flex min-w-0 flex-1 items-start gap-2.5 text-left", bloqueado && "opacity-50")}
      >
        <span
          className={clsx(
            "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 text-[11px] font-bold",
            marcado ? "border-brand-500 bg-brand-500 text-white" : "border-brand-200"
          )}
        >
          {marcado ? "✓" : ""}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-brand-800">{paciente.nome}</span>
          {detalhes.length > 0 && (
            <span className="block truncate text-xs text-brand-400">{detalhes.join(" · ")}</span>
          )}
        </span>
      </button>

      {bloqueado ? (
        <div className="flex shrink-0 flex-col items-end gap-0.5">
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
            {paciente.repetidoNoArquivo ? "repetido" : "já existe"}
          </span>
          <button onClick={onForcar} className="text-[10px] font-bold text-brand-400 underline">
            importar mesmo assim
          </button>
        </div>
      ) : encerrado ? (
        <span className="shrink-0 rounded-full bg-cream-200 px-2 py-0.5 text-[10px] font-bold text-brand-500">
          {paciente.situacaoTexto?.toLowerCase() ?? "encerrado"}
        </span>
      ) : null}
    </div>
  );
}
