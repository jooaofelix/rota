import { useEffect, useState } from "react";
import clsx from "clsx";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import {
  enderecoDoFeed,
  garantirFeed,
  trocarPrivacidade,
  trocarToken,
  type CalendarFeedDoc,
} from "@/services/calendarFeed";
import { baixarIcs, montarIcs, type PrivacidadeCalendario } from "@/utils/ics";
import { espelharAgora } from "@/services/externalEvents";
import { desligarEspelhoGoogle } from "@/services/calendarFeed";
import type { PersonalEventDoc, SessionDoc } from "@/types";

const OPCOES: Array<{ chave: PrivacidadeCalendario; titulo: string; exemplo: string }> = [
  { chave: "oculto", titulo: "Só “Atendimento”", exemplo: "Atendimento" },
  { chave: "iniciais", titulo: "Iniciais", exemplo: "Atendimento · A.B." },
  { chave: "nome", titulo: "Nome completo", exemplo: "Ana Beatriz Souza" },
];

/**
 * Levar a agenda do ROTA para o Google Agenda.
 *
 * Dois caminhos, porque servem a necessidades diferentes: assinar o endereço,
 * que atualiza sozinho para sempre, e baixar o arquivo, que entra na hora mas
 * é um retrato — remarcou depois, o retrato fica velho.
 *
 * Os dois são mão única. O que ela criar direto no Google não volta para cá, e
 * a tela diz isso antes, para ela não descobrir marcando em cima.
 */
export function CalendarSyncSheet({
  professionalId,
  sessoes,
  pessoais,
  onImportar,
  onVerificarDuplicidade,
  onClose,
}: {
  professionalId: string;
  sessoes: SessionDoc[];
  pessoais: PersonalEventDoc[];
  onImportar: () => void;
  onVerificarDuplicidade: () => void;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [feed, setFeed] = useState<CalendarFeedDoc | null>(null);
  const [erro, setErro] = useState(false);
  const [confirmandoTroca, setConfirmandoTroca] = useState(false);
  const [urlGoogle, setUrlGoogle] = useState("");
  const [espelhando, setEspelhando] = useState(false);

  useEffect(() => {
    if (feed?.googleIcsUrl) setUrlGoogle(feed.googleIcsUrl);
  }, [feed?.googleIcsUrl]);

  useEffect(() => {
    garantirFeed(professionalId)
      .then(setFeed)
      .catch(() => setErro(true));
  }, [professionalId]);

  const endereco = feed ? enderecoDoFeed(feed.token) : "";

  async function copiar() {
    await navigator.clipboard.writeText(endereco);
    showToast("Endereço copiado. Cole no Google Agenda.");
  }

  function baixar() {
    baixarIcs(
      montarIcs(sessoes, pessoais, { privacidade: feed?.privacidade ?? "iniciais" }),
      "agenda-rota.ics"
    );
  }

  return (
    <BottomSheet open onClose={onClose} title="Google Agenda">
      <div className="flex flex-col gap-4">
        <p className="rounded-2xl bg-cream-100 p-3 text-xs leading-relaxed text-brand-600">
          A agenda do ROTA passa a aparecer no seu Google Agenda — e, por tabela, no celular e no
          relógio. <span className="font-bold">É mão única:</span> o que você marcar aqui vai para lá,
          mas o que você criar direto no Google não volta para cá.
        </p>

        <section>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
            Como o paciente aparece lá
          </p>
          <div className="mt-2 flex flex-col gap-1.5">
            {OPCOES.map((o) => (
              <button
                key={o.chave}
                onClick={async () => {
                  if (!feed) return;
                  await trocarPrivacidade(professionalId, o.chave);
                  setFeed({ ...feed, privacidade: o.chave });
                }}
                className={clsx(
                  "flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left",
                  feed?.privacidade === o.chave ? "bg-brand-500 text-white" : "bg-cream-100 text-brand-700"
                )}
              >
                <span
                  className={clsx(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2",
                    feed?.privacidade === o.chave ? "border-white" : "border-brand-200"
                  )}
                >
                  {feed?.privacidade === o.chave && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{o.titulo}</span>
                  <span
                    className={clsx(
                      "block text-[11px]",
                      feed?.privacidade === o.chave ? "text-white/70" : "text-brand-400"
                    )}
                  >
                    aparece como “{o.exemplo}”
                  </span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] leading-snug text-brand-400">
            O padrão é iniciais. Nome de paciente é dado de saúde, e um calendário sincronizado aparece
            em telas que você não controla — a do carro, a do relógio, a que alguém olha por cima do
            ombro.
          </p>
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
            1. Assinar (atualiza sozinho)
          </p>
          {erro ? (
            <p className="mt-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700">
              Não consegui preparar o endereço. Confira a internet e reabra esta tela.
            </p>
          ) : (
            <>
              <p className="mt-2 break-all rounded-xl bg-cream-50 p-2.5 text-[11px] text-brand-500">
                {endereco || "preparando..."}
              </p>
              <div className="mt-2 flex gap-2">
                <button onClick={copiar} disabled={!endereco} className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white">
                  Copiar endereço
                </button>
                <a
                  href="https://calendar.google.com/calendar/u/0/r/settings/addbyurl"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-xl bg-cream-100 px-3 py-2 text-xs font-bold text-brand-600"
                >
                  Abrir o Google
                </a>
              </div>
              <ol className="mt-2 flex flex-col gap-1 text-[11px] leading-snug text-brand-500">
                <li>1. Copie o endereço acima.</li>
                <li>2. No Google Agenda (pelo computador), vá em “Outros calendários” › “Assinar por URL”.</li>
                <li>3. Cole e confirme.</li>
              </ol>
              <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[11px] leading-snug text-amber-800">
                O Google atualiza calendário assinado no ritmo dele — costuma levar de algumas horas até
                um dia. Se você remarcar algo hoje e precisar ver no celular agora, use o arquivo abaixo.
              </p>
            </>
          )}
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
            2. Baixar o arquivo (entra na hora)
          </p>
          <p className="mt-1 text-[11px] leading-snug text-brand-500">
            Um retrato da agenda de agora, que você importa no Google, no iPhone ou no Outlook. Entra
            imediatamente, mas não se atualiza sozinho.
          </p>
          <button onClick={baixar} className="btn-secondary mt-2">
            ⬇ Baixar agenda (.ics)
          </button>
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
            3. Ver o Google aqui dentro (espelho)
          </p>
          <p className="mt-1 text-[11px] leading-snug text-brand-500">
            Cole o <span className="font-bold">endereço secreto em formato iCal</span> do seu Google
            Agenda. O que estiver lá aparece na grade como bloco cinza de ocupado, e o ROTA relê a cada
            meia hora. É leitura: esses blocos não viram atendimento e não podem ser editados aqui.
          </p>
          <input
            value={urlGoogle}
            onChange={(e) => setUrlGoogle(e.target.value)}
            placeholder="https://.../basic.ics"
            className="input-field mt-2 text-xs"
          />
          <ol className="mt-1.5 flex flex-col gap-1 text-[11px] leading-snug text-brand-400">
            <li>1. Google Agenda › passe o mouse no seu calendário › ⋮ › Configurações.</li>
            <li>2. Role até “Endereço secreto em formato iCal” e use o botão de copiar.</li>
            <li>3. Ele termina em <span className="font-bold">/basic.ics</span> — se o seu não termina, veio cortado.</li>
          </ol>
          <p className="mt-1.5 text-[11px] leading-snug text-brand-400">
            Serve qualquer calendário que publique .ics: Google, Outlook, Apple ou o sistema que você
            usava antes. O Google só oferece endereço secreto para calendário <span className="font-bold">seu</span> —
            se for um que você assinou de outro sistema, pegue o endereço lá na origem.
          </p>

          <div className="mt-2 flex gap-2">
            <button
              onClick={async () => {
                setEspelhando(true);
                try {
                  const r = await espelharAgora(urlGoogle.trim());
                  if (r.ok) showToast(`${r.total} compromissos trazidos do Google.`);
                  else showToast(r.erro ?? "Não consegui ler esse calendário.", "error");
                } catch (erro) {
                  // "Não consegui falar com o servidor" servia para tudo, e o
                  // caso mais comum é o único em que insistir nunca resolve:
                  // a função ainda não publicada.
                  const codigo = (erro as { code?: string })?.code ?? "";
                  showToast(
                    codigo === "functions/not-found"
                      ? "A função de espelho ainda não foi publicada. Rode: firebase deploy --only functions:espelharGoogleAgora"
                      : codigo === "functions/unauthenticated" || codigo === "functions/permission-denied"
                        ? "Falta liberar o acesso público da função no Cloud Run (serviço espelhargoogleagora)."
                        : `Não consegui ler o calendário. [${codigo || "sem código"}]`,
                    "error"
                  );
                } finally {
                  setEspelhando(false);
                }
              }}
              disabled={!urlGoogle.trim() || espelhando}
              className="flex-1 rounded-xl bg-brand-500 px-3 py-2 text-xs font-bold text-white"
            >
              {espelhando ? "Lendo..." : feed?.googleAtivo ? "Atualizar agora" : "Ligar espelho"}
            </button>
            {feed?.googleAtivo && (
              <button
                onClick={async () => {
                  await desligarEspelhoGoogle(professionalId);
                  showToast("Espelho desligado. Os blocos somem na próxima atualização.");
                }}
                className="rounded-xl bg-cream-100 px-3 py-2 text-xs font-bold text-brand-600"
              >
                Desligar
              </button>
            )}
          </div>

          {feed?.googleErro && (
            <p className="mt-2 rounded-xl bg-rose-50 p-2.5 text-[11px] leading-snug text-rose-700">
              Última tentativa falhou: {feed.googleErro}
            </p>
          )}
          {feed?.googleAtivo && feed.googleEventos !== undefined && !feed.googleErro && (
            <p className="mt-2 text-[11px] text-brand-400">
              {feed.googleEventos} compromissos espelhados na última leitura.
            </p>
          )}
        </section>

        <section className="rounded-2xl bg-cream-50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-400">
            4. Mudando de casa
          </p>
          <p className="mt-1 text-[11px] leading-snug text-brand-500">
            Se a sua agenda ainda mora no Google e você está mudando de casa, dá para trazer os
            atendimentos de lá — uma vez só, virando sessões de verdade, com paciente e valor.
          </p>
          <button onClick={onImportar} className="btn-secondary mt-2">
            Trazer a agenda do Google
          </button>
          <button
            onClick={onVerificarDuplicidade}
            className="mt-2 w-full rounded-xl bg-cream-100 px-3 py-2 text-xs font-bold text-brand-600"
          >
            🔎 Verificar duplicidade
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-brand-400">
            Se você já trouxe a agenda antes, vale conferir: a varredura procura o mesmo paciente marcado
            duas vezes no mesmo horário.
          </p>
        </section>

        <button
          onClick={() => setConfirmandoTroca(true)}
          className="self-start text-[11px] font-bold text-brand-400"
        >
          Trocar o endereço por segurança
        </button>

        <ConfirmDialog
          open={confirmandoTroca}
          danger
          title="Trocar o endereço do calendário?"
          description="Quem tiver o endereço antigo para de receber — inclusive o seu próprio Google Agenda, que vai precisar assinar de novo. Use se achar que o endereço vazou."
          confirmLabel="Trocar"
          onCancel={() => setConfirmandoTroca(false)}
          onConfirm={async () => {
            const token = await trocarToken(professionalId);
            setFeed((f) => (f ? { ...f, token } : f));
            setConfirmandoTroca(false);
            showToast("Endereço trocado. Assine de novo no Google.");
          }}
        />
      </div>
    </BottomSheet>
  );
}
