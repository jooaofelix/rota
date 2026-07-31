import { Suspense, lazy, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { subscribeToPartners, subscribeToRoomSlots } from "@/services/room";
import type { RoomPartnerDoc, RoomSlotDoc } from "@/types";
import { EmptyState } from "@/components/common/EmptyState";
import {
  HOUR_PX,
  WEEKDAY_ORDER,
  WEEKDAY_SHORT,
  blockGeometry,
  colorForId,
  hourRange,
  layoutDay,
} from "@/utils/agenda";
import { PartnerSheet } from "./PartnerSheet";
import { RoomSlotSheet } from "./RoomSlotSheet";
import { RoomRequestsFeed } from "./RoomRequestsFeed";

const RoomSchedulePdfLink = lazy(() =>
  import("./RoomSchedulePdfLink").then((m) => ({ default: m.RoomSchedulePdfLink }))
);

/**
 * A escala da sala compartilhada: hora × dia da semana, como na planilha que a
 * profissional mantinha à mão. Não tem data porque a escala se repete — quem tem
 * segunda de manhã tem toda segunda de manhã.
 */
export function RoomSchedule({ professionalId, ownerName }: { professionalId: string; ownerName: string }) {
  const [partners, setPartners] = useState<RoomPartnerDoc[]>([]);
  const [slots, setSlots] = useState<RoomSlotDoc[]>([]);
  const [managingPartners, setManagingPartners] = useState(false);
  const [editingSlot, setEditingSlot] = useState<RoomSlotDoc | "new" | null>(null);
  const [focusPartner, setFocusPartner] = useState<string | null>(null);

  useEffect(() => subscribeToPartners(professionalId, setPartners), [professionalId]);
  useEffect(() => subscribeToRoomSlots(professionalId, setSlots), [professionalId]);

  const hours = useMemo(() => hourRange(slots), [slots]);
  const firstHour = hours[0];
  const visiveis = focusPartner ? slots.filter((s) => s.partnerId === focusPartner) : slots;

  const partnerColor = (p: { id: string; color?: string }) => p.color ?? colorForId(p.id);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5 px-4">
        <button
          onClick={() => setFocusPartner(null)}
          className={clsx(
            "rounded-full px-3 py-1.5 text-xs font-bold",
            focusPartner === null ? "bg-brand-500 text-white" : "bg-brand-50 text-brand-600"
          )}
        >
          Todos
        </button>
        {partners.map((p) => (
          <button
            key={p.id}
            onClick={() => setFocusPartner(focusPartner === p.id ? null : p.id)}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold",
              focusPartner === p.id ? "text-white" : "bg-brand-50 text-brand-600"
            )}
            style={focusPartner === p.id ? { backgroundColor: partnerColor(p) } : undefined}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: partnerColor(p) }} />
            {p.name.split(" ")[0]}
          </button>
        ))}
      </div>

      {partners.length === 0 ? (
        <div className="px-4">
          <EmptyState
            icon="🚪"
            title="Nenhum profissional cadastrado"
            description="Cadastre quem divide a sala para montar a escala da semana."
          />
        </div>
      ) : (
        <div className="overflow-x-auto pb-3">
          <div className="min-w-[680px] px-4">
            <div className="flex">
              <div className="w-11 shrink-0" />
              {WEEKDAY_ORDER.map((wd) => (
                <div key={wd} className="flex-1 pb-1.5 text-center">
                  <p className="text-[11px] font-bold uppercase text-brand-400">{WEEKDAY_SHORT[wd]}</p>
                </div>
              ))}
            </div>

            <div className="relative flex">
              <div className="w-11 shrink-0">
                {hours.map((hour) => (
                  <div key={hour} style={{ height: HOUR_PX }} className="relative">
                    <span className="absolute -top-1.5 right-1.5 text-[10px] font-bold text-brand-300">
                      {String(hour).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {WEEKDAY_ORDER.map((wd) => {
                const laid = layoutDay(visiveis.filter((s) => s.weekday === wd));
                return (
                  <div
                    key={wd}
                    className="relative flex-1 border-l border-brand-100"
                    style={{ height: hours.length * HOUR_PX }}
                  >
                    {hours.map((hour) => (
                      <div key={hour} style={{ height: HOUR_PX }} className="border-b border-dashed border-brand-100" />
                    ))}

                    {laid.map(({ item: slot, lane, lanes }) => {
                      const { top, height } = blockGeometry(slot, firstHour);
                      const partner = partners.find((p) => p.id === slot.partnerId);
                      const color = partner ? partnerColor(partner) : colorForId(slot.partnerId);
                      return (
                        <button
                          key={slot.id}
                          onClick={() => setEditingSlot(slot)}
                          style={{
                            top,
                            height,
                            left: `${(lane / lanes) * 100}%`,
                            width: `${100 / lanes}%`,
                            backgroundColor: color,
                          }}
                          className="absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-white"
                        >
                          <p className="truncate text-[11px] font-bold leading-tight">{slot.partnerName}</p>
                          {height > 34 && (
                            <p className="truncate text-[10px] leading-tight opacity-90">
                              {slot.startTime} - {slot.endTime}
                            </p>
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 px-4 pb-4">
        <RoomRequestsFeed professionalId={professionalId} />

        <div className="flex gap-2">
          <button onClick={() => setEditingSlot("new")} className="btn-primary flex-1" disabled={partners.length === 0}>
            + Horário na sala
          </button>
          <button onClick={() => setManagingPartners(true)} className="btn-secondary flex-1">
            Profissionais
          </button>
        </div>

        {slots.length > 0 && (
          <Suspense fallback={<p className="text-center text-xs text-brand-400">Preparando PDF...</p>}>
            <RoomSchedulePdfLink
              ownerName={ownerName}
              partners={partners}
              slots={slots}
              focusPartnerId={focusPartner}
            />
          </Suspense>
        )}
      </div>

      {managingPartners && (
        <PartnerSheet
          professionalId={professionalId}
          partners={partners}
          slots={slots}
          ownerName={ownerName}
          onClose={() => setManagingPartners(false)}
        />
      )}

      {editingSlot && (
        <RoomSlotSheet
          professionalId={professionalId}
          partners={partners}
          existing={editingSlot === "new" ? undefined : editingSlot}
          onClose={() => setEditingSlot(null)}
        />
      )}
    </div>
  );
}
