import { useEffect, useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useToast } from "@/contexts/ToastContext";
import { subscribeToLinkedPatients } from "@/services/patients";
import { getPatientsOverview } from "@/services/professionalOverview";
import {
  createRecurringSessions,
  createSession,
  deleteSession,
  getSessionsInRange,
  SessaoRepetidaError,
  updateSession,
} from "@/services/sessions";
import { getPersonalEventsInRange } from "@/services/personalEvents";
import { getExternalEvents, type ExternalEventDoc } from "@/services/externalEvents";
import { subscribeToPartners, subscribeToRoomSlots } from "@/services/room";
import { checkRoom, type RoomCheck } from "@/utils/roomAvailability";
import { acharChoques, bloqueio, datasDaSerie, type Choque } from "@/utils/conflitos";
import { RoomConflictDialog } from "./RoomConflictDialog";
import { avisosNaData, subscribeToGoals } from "@/services/goals";
import type { GoalDoc, PersonalEventDoc } from "@/types";
import type { PaymentStatus, RoomPartnerDoc, RoomSlotDoc, SessionDoc, SessionModality } from "@/types";

interface SessionEditorSheetProps {
  professionalId: string;
  existing?: SessionDoc;
  defaultDate: string;
  /** Horário sugerido, quando a sessão nasce de um bloco já existente na grade. */
  defaultStart?: string;
  defaultEnd?: string;
  ownerName: string;
  onClose: () => void;
}

const emptyForm = {
  patientId: "",
  date: "",
  startTime: "09:00",
  endTime: "09:50",
  modality: "in_person" as SessionModality,
  price: "",
  paymentStatus: "pending" as PaymentStatus,
  note: "",
  repeat: "none" as "none" | "weekly" | "biweekly",
  repeatWeeks: 8,
};

export function SessionEditorSheet({ professionalId, existing, defaultDate, defaultStart, defaultEnd, ownerName, onClose }: SessionEditorSheetProps) {
  const { showToast } = useToast();
  const [patients, setPatients] = useState<Array<{ id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [partners, setPartners] = useState<RoomPartnerDoc[]>([]);
  const [slots, setSlots] = useState<RoomSlotDoc[]>([]);
  const [conflito, setConflito] = useState<RoomCheck | null>(null);
  const [metas, setMetas] = useState<GoalDoc[]>([]);
  const [agenda, setAgenda] = useState<{
    sessoes: SessionDoc[];
    pessoais: PersonalEventDoc[];
    externos: ExternalEventDoc[];
  } | null>(null);
  const [form, setForm] = useState(() =>
    existing
      ? {
          patientId: existing.patientId,
          date: existing.date,
          startTime: existing.startTime,
          endTime: existing.endTime,
          modality: existing.modality,
          price: existing.price != null ? String(existing.price) : "",
          paymentStatus: existing.paymentStatus,
          note: existing.note ?? "",
          repeat: "none" as const,
          repeatWeeks: 8,
        }
      : {
          ...emptyForm,
          date: defaultDate,
          ...(defaultStart ? { startTime: defaultStart } : {}),
          ...(defaultEnd ? { endTime: defaultEnd } : {}),
        }
  );

  useEffect(() => {
    return subscribeToLinkedPatients(professionalId, async (links) => {
      const overview = await getPatientsOverview(links.map((l) => l.patientId));
      setPatients(overview.map((o) => ({ id: o.patientId, name: o.name })));
    });
  }, [professionalId]);

  useEffect(() => subscribeToGoals(professionalId, setMetas), [professionalId]);
  useEffect(() => subscribeToPartners(professionalId, setPartners), [professionalId]);
  useEffect(() => subscribeToRoomSlots(professionalId, setSlots), [professionalId]);

  // As datas que este agendamento vai ocupar — uma só, ou a série inteira da repetição.
  const datas = existing || form.repeat === "none" ? [form.date] : datasDaSerie(form.date, form.repeatWeeks, form.repeat === "biweekly");

  /**
   * Carrega o que já existe no período para conferir choque de horário.
   *
   * A leitura é avulsa (não fica escutando) porque a folha vive poucos segundos e
   * o que importa é o retrato de agora. Cobre a série inteira quando há repetição:
   * o conflito costuma estar na quinta semana, não na primeira.
   */
  useEffect(() => {
    if (!form.date) return;
    let vivo = true;
    const inicio = datas[0];
    const fim = datas[datas.length - 1];

    Promise.all([
      getSessionsInRange(professionalId, inicio, fim),
      getPersonalEventsInRange(professionalId, inicio, fim).catch(() => [] as PersonalEventDoc[]),
      getExternalEvents(professionalId, inicio, fim).catch(() => [] as ExternalEventDoc[]),
    ])
      .then(([sessoes, pessoais, externos]) => {
        if (vivo) setAgenda({ sessoes, pessoais, externos });
      })
      // Sem a conferência a agenda continua funcionando; o servidor ainda barra a
      // duplicata na hora de gravar. Só o aviso antecipado se perde.
      .catch(() => vivo && setAgenda(null));

    return () => {
      vivo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [professionalId, form.date, form.repeat, form.repeatWeeks]);

  const choquesPorData: Array<{ date: string; choques: Choque[] }> = agenda
    ? datas
        .map((date) => ({
          date,
          choques: acharChoques(
            { date, startTime: form.startTime, endTime: form.endTime, patientId: form.patientId, ignorarSessaoId: existing?.id },
            agenda
          ),
        }))
        .filter((d) => d.choques.length > 0)
    : [];

  const choquesDoDia = choquesPorData.find((d) => d.date === form.date)?.choques ?? [];
  const repetidoNoDia = form.patientId ? bloqueio(choquesDoDia) : undefined;
  const repetidosNaSerie = form.patientId
    ? choquesPorData.filter((d) => d.date !== form.date && bloqueio(d.choques))
    : [];
  const ocupadoPorOutros = choquesDoDia.filter((c) => c.tipo !== "mesmo-paciente");

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  // O fim acompanha o início na primeira escolha, mantendo os 50 minutos habituais.
  function handleStartChange(value: string) {
    const [h, m] = value.split(":").map(Number);
    const end = new Date(2000, 0, 1, h, (m || 0) + 50);
    setForm((prev) => ({
      ...prev,
      startTime: value,
      endTime: `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`,
    }));
  }

  /** Confere a sala antes de gravar; se estiver fora do turno dela, pede confirmação. */
  function handleSave() {
    const check = checkRoom(form.date, form.startTime, form.endTime, slots, partners);
    if (check.status === "taken" || check.status === "free") {
      setConflito(check);
      return;
    }
    persist();
  }

  async function persist() {
    setConflito(null);
    const patient = patients.find((p) => p.id === form.patientId);
    if (!patient || !form.date) return;

    setSaving(true);
    try {
      const payload = {
        professionalId,
        patientId: patient.id,
        patientName: patient.name,
        date: form.date,
        startTime: form.startTime,
        endTime: form.endTime,
        modality: form.modality,
        status: existing?.status ?? ("scheduled" as const),
        price: form.price ? Number(form.price.replace(",", ".")) : undefined,
        paymentStatus: form.paymentStatus,
        note: form.note.trim(),
      };

      if (existing) {
        await updateSession(existing.id, payload);
        showToast("Sessão atualizada.");
      } else if (form.repeat === "none") {
        await createSession(payload);
        showToast("Sessão agendada.");
      } else {
        const created = await createRecurringSessions(payload, form.repeatWeeks, form.repeat === "biweekly");
        const puladas = created.puladas.length;
        showToast(
          puladas === 0
            ? `${created.length} sessões agendadas.`
            : `${created.length} sessões agendadas. ${puladas} ${puladas === 1 ? "data já tinha" : "datas já tinham"} este paciente no horário e ${puladas === 1 ? "foi mantida como estava" : "foram mantidas como estavam"}.`
        );
      }
      onClose();
    } catch (erro) {
      // Última barreira: entre abrir a folha e tocar em salvar, alguém (ou o
      // espelho do Google) pode ter criado a mesma sessão. O aviso diz o que é.
      if (erro instanceof SessaoRepetidaError) {
        showToast(`${erro.existente.patientName} já tem atendimento às ${erro.existente.startTime}. Nada foi criado.`);
      } else {
        throw erro;
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!existing) return;
    await deleteSession(existing.id);
    showToast("Sessão removida.");
    onClose();
  }

  const canSave = !!form.patientId && !!form.date && form.startTime < form.endTime && !repetidoNoDia;

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={existing ? "Editar sessão" : "Nova sessão"}
      footer={
        <div className="flex flex-col gap-2">
          <button className="btn-primary" onClick={handleSave} disabled={!canSave || saving}>
            {saving
              ? "Salvando..."
              : repetidoNoDia
                ? "Horário já ocupado por este paciente"
                : existing
                  ? "Salvar alterações"
                  : "Agendar"}
          </button>
          {existing && (
            <button onClick={() => setConfirmingDelete(true)} className="text-sm font-bold text-rose-500">
              Remover sessão
            </button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <Field label="Paciente">
          <select
            value={form.patientId}
            onChange={(e) => update("patientId", e.target.value)}
            className="input-field"
            disabled={!!existing}
          >
            <option value="">Selecione...</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Data">
          <input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} className="input-field" />

          {/* O aviso que ela deixou para si em Início > Metas. Aparece aqui porque
              é aqui que ele importa: em março ninguém lembra do que anotou em
              outubro sobre julho. Avisa, não bloqueia — a decisão continua dela. */}
          {avisosNaData(metas, form.date).map((aviso) => (
            <p key={aviso.id} className="rounded-xl bg-amber-50 p-2.5 text-xs leading-snug text-amber-800">
              <span className="font-bold">🚫 Você pediu para não marcar nesta data:</span> {aviso.titulo}
              {aviso.detalhe ? ` — ${aviso.detalhe}` : ""}
            </p>
          ))}
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Início">
            <input type="time" value={form.startTime} onChange={(e) => handleStartChange(e.target.value)} className="input-field" />
          </Field>
          <Field label="Fim">
            <input type="time" value={form.endTime} onChange={(e) => update("endTime", e.target.value)} className="input-field" />
          </Field>
        </div>

        {/* Duas conversas diferentes com a mesma tela. O vermelho é erro: a mesma
            pessoa duas vezes no mesmo horário não existe na vida real, então o
            botão de salvar fica travado. O amarelo é informação: o horário está
            ocupado por outra coisa, e há motivo legítimo para marcar assim mesmo
            (encaixe, atendimento de casal, compromisso que ela vai remanejar). */}
        {repetidoNoDia && (
          <p className="rounded-xl bg-rose-50 p-2.5 text-xs leading-snug text-rose-700">
            <span className="font-bold">Este atendimento já está na agenda.</span> {repetidoNoDia.nome} tem
            sessão neste dia das {repetidoNoDia.quando}. Mude o horário ou a data — ou abra a sessão que já
            existe para editar aquela.
          </p>
        )}

        {!repetidoNoDia && ocupadoPorOutros.length > 0 && (
          <p className="rounded-xl bg-amber-50 p-2.5 text-xs leading-snug text-amber-800">
            <span className="font-bold">⚠️ Este horário já tem compromisso:</span>{" "}
            {ocupadoPorOutros.map((c) => `${c.nome} (${c.quando})`).join(", ")}
            {ocupadoPorOutros.some((c) => c.tipo === "google") ? " — vindo do Google Agenda" : ""}. Dá para
            marcar assim mesmo, se for o que você quer.
          </p>
        )}

        {repetidosNaSerie.length > 0 && (
          <p className="rounded-xl bg-amber-50 p-2.5 text-xs leading-snug text-amber-800">
            <span className="font-bold">
              {repetidosNaSerie.length === 1
                ? "1 data da repetição já tem"
                : `${repetidosNaSerie.length} datas da repetição já têm`}
            </span>{" "}
            este paciente neste horário ({repetidosNaSerie.map((d) => diaCurto(d.date)).join(", ")}). Vou pular{" "}
            {repetidosNaSerie.length === 1 ? "essa" : "essas"} e criar o resto.
          </p>
        )}

        <Field label="Modalidade">
          <div className="flex gap-2">
            <Toggle active={form.modality === "in_person"} onClick={() => update("modality", "in_person")}>
              Presencial
            </Toggle>
            <Toggle active={form.modality === "online"} onClick={() => update("modality", "online")}>
              Online
            </Toggle>
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-2">
          <Field label="Valor (R$)">
            <input
              type="text"
              inputMode="decimal"
              placeholder="150,00"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              className="input-field"
            />
          </Field>
          <Field label="Pagamento">
            <select
              value={form.paymentStatus}
              onChange={(e) => update("paymentStatus", e.target.value as PaymentStatus)}
              className="input-field"
            >
              <option value="pending">A pagar</option>
              <option value="paid">Pago</option>
              <option value="exempt">Isento</option>
            </select>
          </Field>
        </div>

        {!existing && (
          <Field label="Repetir">
            <div className="flex gap-2">
              <Toggle active={form.repeat === "none"} onClick={() => update("repeat", "none")}>
                Não
              </Toggle>
              <Toggle active={form.repeat === "weekly"} onClick={() => update("repeat", "weekly")}>
                Semanal
              </Toggle>
              <Toggle active={form.repeat === "biweekly"} onClick={() => update("repeat", "biweekly")}>
                Quinzenal
              </Toggle>
            </div>
            {form.repeat !== "none" && (
              <p className="mt-2 text-xs text-brand-500">
                Serão criadas{" "}
                <select
                  value={form.repeatWeeks}
                  onChange={(e) => update("repeatWeeks", Number(e.target.value))}
                  className="rounded-lg border border-brand-200 px-1.5 py-0.5 font-bold text-brand-700"
                >
                  {[4, 8, 12, 24].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>{" "}
                sessões, uma a cada {form.repeat === "weekly" ? "semana" : "duas semanas"}.
              </p>
            )}
          </Field>
        )}

        <Field label="Observação da agenda (opcional)">
          <textarea
            value={form.note}
            onChange={(e) => update("note", e.target.value)}
            rows={2}
            placeholder="Combinado, lembrete, particularidade do dia..."
            className="input-field resize-none"
          />
          <p className="mt-1 text-xs text-brand-400">
            Isto não é prontuário — o registro clínico fica na própria sessão, depois de realizada.
          </p>
        </Field>

      </div>

      {conflito && (
        <RoomConflictDialog
          check={conflito}
          professionalId={professionalId}
          ownerName={ownerName}
          date={form.date}
          startTime={form.startTime}
          endTime={form.endTime}
          onConfirm={persist}
          onCancel={() => setConflito(null)}
        />
      )}

      <ConfirmDialog
        open={confirmingDelete}
        title="Remover esta sessão?"
        description="A sessão sai da agenda. O registro clínico já escrito, se houver, continua guardado no prontuário."
        confirmLabel="Remover"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmingDelete(false)}
      />
    </BottomSheet>
  );
}

/** "2026-09-14" vira "14/09" — o ano é sempre o mesmo dentro de uma repetição. */
function diaCurto(date: string): string {
  const [, m, d] = date.split("-");
  return `${d}/${m}`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-bold text-brand-500">{label}</p>
      {children}
    </div>
  );
}

function Toggle({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex-1 rounded-xl bg-brand-500 px-3 py-2 text-sm font-bold text-white"
          : "flex-1 rounded-xl bg-brand-50 px-3 py-2 text-sm font-bold text-brand-500"
      }
    >
      {children}
    </button>
  );
}
