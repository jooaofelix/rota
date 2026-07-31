import { Suspense, lazy, useState } from "react";
import { BottomSheet } from "@/components/common/BottomSheet";
import { useToast } from "@/contexts/ToastContext";
import { deactivatePartner, savePartner } from "@/services/room";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";
import { WEEKDAY_NAMES, WEEKDAY_ORDER, colorForId } from "@/utils/agenda";

const RoomSchedulePdfLink = lazy(() =>
  import("./RoomSchedulePdfLink").then((m) => ({ default: m.RoomSchedulePdfLink }))
);

/** A escala de um profissional em texto, para caber no corpo de um e-mail. */
export function scheduleAsText(partnerName: string, slots: RoomSlotDoc[], ownerName: string): string {
  const linhas = WEEKDAY_ORDER.flatMap((wd) => {
    const doDia = slots
      .filter((s) => s.weekday === wd)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    if (doDia.length === 0) return [];
    const horarios = doDia
      .map((s) => `${s.startTime} às ${s.endTime}${s.room ? ` (${s.room})` : ""}`)
      .join(", ");
    return [`${WEEKDAY_NAMES[wd]}: ${horarios}`];
  });

  return [
    `Olá, ${partnerName.split(" ")[0]}!`,
    "",
    "Segue sua escala fixa da sala:",
    "",
    ...linhas,
    "",
    "A escala se repete toda semana. Qualquer troca, é só avisar.",
    "",
    ownerName,
  ].join("\n");
}

export function PartnerSheet({
  professionalId,
  partners,
  slots,
  ownerName,
  onClose,
}: {
  professionalId: string;
  partners: RoomPartnerDoc[];
  slots: RoomSlotDoc[];
  ownerName: string;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [editing, setEditing] = useState<RoomPartnerDoc | "new" | null>(null);
  const [aberto, setAberto] = useState<string | null>(null);

  if (editing) {
    return (
      <PartnerForm
        professionalId={professionalId}
        existing={editing === "new" ? undefined : editing}
        onClose={onClose}
        onBack={() => setEditing(null)}
      />
    );
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title="Quem divide a sala"
      footer={
        <button onClick={() => setEditing("new")} className="btn-primary">
          + Cadastrar profissional
        </button>
      }
    >
      <div className="flex flex-col gap-2">
        {partners.length === 0 && (
          <p className="py-3 text-center text-sm text-brand-400">
            Nenhum profissional cadastrado ainda.
          </p>
        )}

        {partners.map((p) => {
          const doParceiro = slots.filter((s) => s.partnerId === p.id);
          const corpo = scheduleAsText(p.name, doParceiro, ownerName);
          return (
            <div key={p.id} className="rounded-2xl bg-brand-50/60 p-3">
              <button
                onClick={() => setAberto(aberto === p.id ? null : p.id)}
                className="flex w-full items-center gap-2.5 text-left"
              >
                <span
                  className="h-8 w-8 shrink-0 rounded-full"
                  style={{ backgroundColor: p.color ?? colorForId(p.id) }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold text-brand-800">
                    {p.name}
                    {p.isOwner && <span className="ml-1.5 text-[10px] font-bold text-brand-400">(você)</span>}
                  </span>
                  <span className="block truncate text-xs text-brand-400">
                    {p.profession || "—"} · {doParceiro.length} {doParceiro.length === 1 ? "horário" : "horários"}
                  </span>
                </span>
                <span className="shrink-0 text-brand-300">{aberto === p.id ? "▴" : "▾"}</span>
              </button>

              {aberto === p.id && (
                <div className="mt-3 flex flex-col gap-2">
                  {doParceiro.length === 0 ? (
                    <p className="text-xs text-brand-400">Sem horários na escala ainda.</p>
                  ) : (
                    <pre className="whitespace-pre-wrap rounded-xl bg-white p-2.5 text-xs leading-relaxed text-brand-600">
                      {corpo}
                    </pre>
                  )}

                  {p.email ? (
                    <a
                      href={`mailto:${p.email}?subject=${encodeURIComponent("Sua escala da sala")}&body=${encodeURIComponent(corpo)}`}
                      className="btn-secondary"
                    >
                      ✉️ Enviar por e-mail
                    </a>
                  ) : (
                    <p className="text-xs text-brand-400">
                      Cadastre um e-mail para poder enviar a escala.
                    </p>
                  )}

                  {doParceiro.length > 0 && (
                    <Suspense fallback={<p className="text-center text-xs text-brand-400">Preparando PDF...</p>}>
                      <RoomSchedulePdfLink
                        ownerName={ownerName}
                        partners={[p]}
                        slots={doParceiro}
                        focusPartnerId={p.id}
                      />
                    </Suspense>
                  )}

                  <div className="flex gap-2">
                    <button onClick={() => setEditing(p)} className="flex-1 text-sm font-bold text-brand-600">
                      Editar
                    </button>
                    <button
                      onClick={async () => {
                        await deactivatePartner(p.id);
                        showToast("Profissional removido da sala.");
                      }}
                      className="flex-1 text-sm font-bold text-rose-500"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

      </div>
    </BottomSheet>
  );
}

const CORES = ["#2f9a7c", "#4f46e5", "#c2410c", "#0369a1", "#7c3aed", "#b91c1c", "#a16207", "#be185d"];

function PartnerForm({
  professionalId,
  existing,
  onClose,
  onBack,
}: {
  professionalId: string;
  existing?: RoomPartnerDoc;
  onClose: () => void;
  onBack: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(existing?.name ?? "");
  const [profession, setProfession] = useState(existing?.profession ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [phone, setPhone] = useState(existing?.phone ?? "");
  const [color, setColor] = useState(existing?.color ?? CORES[0]);
  const [isOwner, setIsOwner] = useState(existing?.isOwner ?? false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await savePartner(existing?.id ?? null, {
        professionalId,
        name: name.trim(),
        profession: profession.trim(),
        email: email.trim(),
        phone: phone.trim(),
        color,
        isOwner,
        active: true,
      });
      showToast(existing ? "Dados atualizados." : "Profissional cadastrado.");
      onBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <BottomSheet
      open
      onClose={onClose}
      title={existing ? "Editar profissional" : "Cadastrar profissional"}
      footer={
        <div className="flex gap-2">
          <button onClick={onBack} className="btn-secondary flex-1">
            Voltar
          </button>
          <button className="btn-primary flex-1" onClick={handleSave} disabled={!name.trim() || saving}>
            {saving ? "Salvando..." : "Salvar"}
          </button>
        </div>
      }
    >
      <div className="flex flex-col gap-3">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="input-field" />
        <input
          value={profession}
          onChange={(e) => setProfession(e.target.value)}
          placeholder="Profissão (psicóloga, nutricionista...)"
          className="input-field"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="E-mail (para enviar a escala)"
          className="input-field"
        />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone (opcional)" className="input-field" />

        <label className="flex items-start justify-between gap-3 rounded-xl bg-brand-50/60 p-3">
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-brand-700">Sou eu</span>
            <span className="block text-xs leading-snug text-brand-500">
              Marque no seu próprio cadastro. É assim que o app sabe em quais horários
              a sala é sua e avisa quando um atendimento cai no turno de outra pessoa.
            </span>
          </span>
          <input
            type="checkbox"
            checked={isOwner}
            onChange={(e) => setIsOwner(e.target.checked)}
            className="mt-0.5 h-5 w-5 shrink-0 rounded border-brand-300"
          />
        </label>

        <div>
          <p className="mb-1.5 text-xs font-bold text-brand-500">Cor na escala</p>
          <div className="flex flex-wrap gap-2">
            {CORES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                style={{ backgroundColor: c }}
                className={
                  color === c
                    ? "h-9 w-9 rounded-full ring-2 ring-brand-900 ring-offset-2"
                    : "h-9 w-9 rounded-full"
                }
              />
            ))}
          </div>
        </div>

      </div>
    </BottomSheet>
  );
}
