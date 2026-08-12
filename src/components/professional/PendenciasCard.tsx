import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeToSessionsInRange, subscribeToProfessionalRecords } from "@/services/sessions";
import { subscribeToProposals, isExpired } from "@/services/offers";
import { subscribeToInvoices } from "@/services/invoices";
import { subscribeToRoomRequests } from "@/services/roomRequests";
import type { InvoiceDoc, ProposalDoc, RoomRequestDoc, SessionDoc, SessionRecordDoc } from "@/types";
import { formatMoney } from "@/utils/agenda";
import { todayKey } from "@/utils/date";
import { NFSE_ATIVA } from "@/config/features";

interface Pendencia {
  id: string;
  icone: string;
  texto: string;
  detalhe?: string;
  destino: string;
  /** Vermelho para o que tem prazo ou consequência; âmbar para o resto. */
  grave?: boolean;
}

function diasAtras(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

/**
 * O que está esperando ela.
 *
 * É a diferença entre um painel que mostra números e um que serve para alguma
 * coisa: número informa, pendência cobra. Cada linha aqui nasce de um buraco
 * real no acompanhamento — sessão atendida e não registrada, proposta que
 * ninguém respondeu, nota recusada pela prefeitura — e leva direto ao lugar de
 * resolver.
 */
export function PendenciasCard() {
  const { firebaseUser } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionDoc[]>([]);
  const [records, setRecords] = useState<SessionRecordDoc[]>([]);
  const [proposals, setProposals] = useState<ProposalDoc[]>([]);
  const [invoices, setInvoices] = useState<InvoiceDoc[]>([]);
  const [roomRequests, setRoomRequests] = useState<RoomRequestDoc[]>([]);

  const desde = useMemo(() => diasAtras(45), []);
  const hoje = todayKey();

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToSessionsInRange(firebaseUser.uid, desde, hoje, setSessions);
  }, [firebaseUser, desde, hoje]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToProfessionalRecords(firebaseUser.uid, setRecords);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToProposals(firebaseUser.uid, setProposals);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToInvoices(firebaseUser.uid, setInvoices);
  }, [firebaseUser]);

  useEffect(() => {
    if (!firebaseUser) return;
    return subscribeToRoomRequests(firebaseUser.uid, setRoomRequests);
  }, [firebaseUser]);

  const pendencias = useMemo<Pendencia[]>(() => {
    const lista: Pendencia[] = [];

    // Atendeu e não registrou. É o buraco que mais dói depois, quando ela
    // precisa lembrar do que aconteceu e não tem nada escrito.
    const comRegistro = new Set(records.map((r) => r.sessionId));
    const semRegistro = sessions.filter((s) => s.status === "done" && !comRegistro.has(s.id));
    if (semRegistro.length) {
      lista.push({
        id: "registros",
        icone: "📓",
        texto: `${semRegistro.length} ${semRegistro.length === 1 ? "sessão realizada" : "sessões realizadas"} sem registro`,
        detalhe: semRegistro
          .slice(0, 3)
          .map((s) => s.patientName.split(" ")[0])
          .join(", "),
        destino: "/prontuarios",
        grave: semRegistro.length > 3,
      });
    }

    // Atendeu e não recebeu.
    const naoPagas = sessions.filter(
      (s) => s.status === "done" && s.paymentStatus !== "paid" && s.paymentStatus !== "exempt" && s.price
    );
    if (naoPagas.length) {
      const total = naoPagas.reduce((a, s) => a + (s.price ?? 0), 0);
      lista.push({
        id: "pagamentos",
        icone: "💰",
        texto: `${naoPagas.length} ${naoPagas.length === 1 ? "atendimento" : "atendimentos"} sem pagamento`,
        detalhe: formatMoney(total),
        destino: "/financas",
        grave: true,
      });
    }

    // Com a emissão desligada não há o que cobrar sobre nota: seria pendência de
    // uma coisa que a pessoa não tem como resolver.
    const notasComErro = NFSE_ATIVA ? invoices.filter((n) => n.status === "erro") : [];
    if (notasComErro.length) {
      lista.push({
        id: "notas-erro",
        icone: "⚠️",
        texto: `${notasComErro.length} ${notasComErro.length === 1 ? "nota recusada" : "notas recusadas"}`,
        detalhe: notasComErro[0].erro?.slice(0, 60),
        destino: "/financas",
        grave: true,
      });
    }

    const rascunhos = NFSE_ATIVA ? invoices.filter((n) => n.status === "rascunho") : [];
    if (rascunhos.length) {
      lista.push({
        id: "notas-rascunho",
        icone: "🧾",
        texto: `${rascunhos.length} ${rascunhos.length === 1 ? "nota em rascunho" : "notas em rascunho"}`,
        destino: "/financas",
      });
    }

    const vencidas = proposals.filter((p) => isExpired(p, hoje));
    if (vencidas.length) {
      lista.push({
        id: "propostas-vencidas",
        icone: "⌛",
        texto: `${vencidas.length} ${vencidas.length === 1 ? "proposta venceu" : "propostas venceram"} sem resposta`,
        detalhe: vencidas
          .slice(0, 3)
          .map((p) => p.patientName.split(" ")[0])
          .join(", "),
        destino: "/financas",
      });
    }

    const salaSemResposta = roomRequests.filter((r) => r.status === "pending");
    if (salaSemResposta.length) {
      lista.push({
        id: "sala",
        icone: "🚪",
        texto: `${salaSemResposta.length} ${salaSemResposta.length === 1 ? "aviso de sala" : "avisos de sala"} sem resposta`,
        detalhe: salaSemResposta
          .slice(0, 3)
          .map((r) => r.partnerName.split(" ")[0])
          .join(", "),
        destino: "/agenda",
      });
    }

    return lista;
  }, [sessions, records, proposals, invoices, roomRequests, hoje]);

  return (
    <div className="card">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <p className="text-sm font-bold text-brand-700">Pendências</p>
        {pendencias.length > 0 && (
          <span className="shrink-0 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-extrabold text-rose-600">
            {pendencias.length}
          </span>
        )}
      </div>

      {pendencias.length === 0 ? (
        <div className="py-3 text-center">
          <p className="text-2xl">✨</p>
          <p className="mt-1 text-sm font-bold text-brand-600">Nada esperando você</p>
          <p className="text-xs text-brand-400">
            Registros em dia, pagamentos em dia, nada parado.
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          {pendencias.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(p.destino)}
              className="flex items-start gap-2.5 border-b border-brand-50 py-2.5 text-left last:border-b-0"
            >
              <span className="text-lg leading-none">{p.icone}</span>
              <span className="min-w-0 flex-1">
                <span
                  className={clsx(
                    "block truncate text-sm font-bold",
                    p.grave ? "text-rose-600" : "text-brand-800"
                  )}
                >
                  {p.texto}
                </span>
                {p.detalhe && <span className="block truncate text-xs text-brand-400">{p.detalhe}</span>}
              </span>
              <span className="shrink-0 text-sm text-brand-300">›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
