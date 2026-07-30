import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { createRoutine, subscribeToPatientRoutines, subscribeToRoutineItems, updateRoutineItem } from "@/services/routines";
import { subscribeToCompletionsForDate } from "@/services/completions";
import { getLinkedProfessionalId } from "@/services/patients";
import type { CompletionDoc, RoutineDoc, RoutineItemDoc } from "@/types";
import { TopBar } from "@/components/common/TopBar";
import { ActivityCard } from "@/components/patient/ActivityCard";
import { ActivityActionSheet } from "@/components/patient/ActivityActionSheet";
import { ActivityEditorSheet } from "@/components/patient/ActivityEditorSheet";
import { TemplatePickerSheet } from "@/components/professional/TemplatePickerSheet";
import { EmptyState } from "@/components/common/EmptyState";
import { PriorityBoard, type BoardItem } from "@/components/common/PriorityBoard";
import { useToast } from "@/contexts/ToastContext";
import { todayKey } from "@/utils/date";
import { getTodayStatus, isScheduledOn, sortByPeriodAndTime } from "@/utils/schedule";
import { PERIOD_LABELS } from "@/utils/constants";
import clsx from "clsx";

type Tab = "today" | "priorities" | "upcoming" | "pending" | "late" | "completed";

const TABS: Array<{ key: Tab; label: string }> = [
  { key: "today", label: "Hoje" },
  { key: "priorities", label: "🎯 Prioridades" },
  { key: "upcoming", label: "Próximos dias" },
  { key: "pending", label: "Pendentes" },
  { key: "late", label: "Atrasadas" },
  { key: "completed", label: "Concluídas" },
];

const LOCKED_HINT =
  "Esta atividade foi criada pela sua profissional, então a prioridade dela é definida por ela. Fale com ela se quiser mudar.";

export function RoutinePage() {
  const { firebaseUser } = useAuth();
  const { showToast } = useToast();
  const patientId = firebaseUser?.uid;
  const [items, setItems] = useState<RoutineItemDoc[]>([]);
  const [routines, setRoutines] = useState<RoutineDoc[]>([]);
  const [completions, setCompletions] = useState<CompletionDoc[]>([]);
  const [tab, setTab] = useState<Tab>("today");
  const [activeItem, setActiveItem] = useState<RoutineItemDoc | null>(null);
  const [editingItem, setEditingItem] = useState<RoutineItemDoc | "new" | null>(null);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null>(null);
  const [creatingRoutine, setCreatingRoutine] = useState(false);
  const [pickingTemplate, setPickingTemplate] = useState(false);

  useEffect(() => {
    if (!patientId) return;
    const unsub = [
      subscribeToRoutineItems(patientId, setItems),
      subscribeToPatientRoutines(patientId, setRoutines),
      subscribeToCompletionsForDate(patientId, todayKey(), setCompletions),
    ];
    return () => unsub.forEach((u) => u());
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    getLinkedProfessionalId(patientId).then(setProfessionalId);
  }, [patientId]);

  const activeRoutine = routines.find((r) => r.status === "active") ?? routines[0];

  async function handleNewActivity() {
    if (!patientId || !professionalId) return;
    if (!activeRoutine) {
      setCreatingRoutine(true);
      try {
        const newRoutineId = await createRoutine(professionalId, patientId, { title: "Minha rotina", description: "", templateKind: "custom" });
        setPendingRoutineId(newRoutineId);
      } finally {
        setCreatingRoutine(false);
      }
    }
    setEditingItem("new");
  }

  const completionByItemId = useMemo(() => {
    const map = new Map<string, CompletionDoc>();
    completions.forEach((c) => map.set(c.routineItemId, c));
    return map;
  }, [completions]);

  const todayItems = useMemo(
    () => sortByPeriodAndTime(items.filter((i) => isScheduledOn(i))).map((item) => ({ item, status: getTodayStatus(item, completionByItemId.get(item.id)) })),
    [items, completionByItemId]
  );

  const upcomingItems = useMemo(() => {
    const next7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i + 1);
      return d;
    });
    return next7Days
      .map((date) => ({ date, items: sortByPeriodAndTime(items.filter((i) => isScheduledOn(i, date))) }))
      .filter((day) => day.items.length > 0);
  }, [items]);

  // O quadro de prioridade usa a rotina inteira, não só o que cai hoje.
  const priorityBoardItems: BoardItem[] = useMemo(
    () =>
      sortByPeriodAndTime(items).map((item) => ({
        id: item.id,
        title: item.title,
        icon: item.icon,
        priority: item.priority,
        hint: [PERIOD_LABELS[item.period], item.time].filter(Boolean).join(" · "),
        // As regras do Firestore só deixam o paciente mudar as atividades que ele mesmo criou.
        locked: item.createdBy === "professional",
      })),
    [items]
  );

  async function handlePriorityChange(next: BoardItem[]) {
    const changed = next.filter((b) => items.find((i) => i.id === b.id)?.priority !== b.priority);
    try {
      await Promise.all(changed.map((b) => updateRoutineItem(b.id, { priority: b.priority }, false)));
    } catch {
      showToast("Não foi possível mudar a prioridade agora.");
    }
  }

  const filteredToday = todayItems.filter(({ status }) => {
    if (tab === "pending") return status === "pending";
    if (tab === "late") return status === "late";
    if (tab === "completed") return status === "completed" || status === "partial";
    return true;
  });

  return (
    <div>
      <TopBar
        title="Sua rotina"
        subtitle="Organizada por período do dia"
        action={
          professionalId && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setPickingTemplate(true)}
                className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-brand-500"
              >
                📋 Modelo
              </button>
              <button
                onClick={handleNewActivity}
                disabled={creatingRoutine}
                className="rounded-full bg-brand-500 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
              >
                + Nova atividade
              </button>
            </div>
          )
        }
      />

      <div className="flex gap-2 overflow-x-auto px-4 pb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={clsx(
              "shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition",
              tab === t.key ? "bg-brand-500 text-white" : "bg-white text-brand-500"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="px-4">
        {tab === "priorities" ? (
          priorityBoardItems.length === 0 ? (
            <EmptyState icon="🎯" title="Nada para organizar" description="Sua rotina ainda não tem atividades." />
          ) : (
            <div className="pb-4">
              <p className="mb-3 text-xs leading-snug text-brand-500">
                Segure uma atividade por um instante e arraste até outro quadro, ou toque nela para escolher da lista.
              </p>
              <PriorityBoard items={priorityBoardItems} onChange={handlePriorityChange} lockedHint={LOCKED_HINT} />
            </div>
          )
        ) : tab === "upcoming" ? (
          upcomingItems.length === 0 ? (
            <EmptyState icon="🗓️" title="Nada programado" description="Não há atividades nos próximos dias." />
          ) : (
            upcomingItems.map(({ date, items: dayItems }) => (
              <div key={date.toISOString()} className="mb-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-300">
                  {date.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "2-digit" })}
                </p>
                <div className="flex flex-col gap-2">
                  {dayItems.map((item) => (
                    <ActivityCard key={item.id} item={item} status="pending" onOpen={() => undefined} />
                  ))}
                </div>
              </div>
            ))
          )
        ) : filteredToday.length === 0 ? (
          <EmptyState icon="🌿" title="Nada por aqui" description="Não há atividades nesta categoria no momento." />
        ) : (
          (["morning", "afternoon", "evening"] as const).map((period) => {
            const periodItems = filteredToday.filter((w) => w.item.period === period);
            if (!periodItems.length) return null;
            return (
              <div key={period} className="mb-4">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-300">{PERIOD_LABELS[period]}</p>
                <div className="flex flex-col gap-2">
                  {periodItems.map(({ item, status }) => (
                    <ActivityCard key={item.id} item={item} status={status} onOpen={() => setActiveItem(item)} />
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {activeItem && (
        <ActivityActionSheet
          item={activeItem}
          onClose={() => setActiveItem(null)}
          onEdit={() => {
            setEditingItem(activeItem);
            setActiveItem(null);
          }}
        />
      )}

      {editingItem && patientId && professionalId && (
        <ActivityEditorSheet
          patientId={patientId}
          professionalId={professionalId}
          routineId={activeRoutine?.id ?? pendingRoutineId ?? ""}
          existingItem={editingItem === "new" ? undefined : editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}

      {pickingTemplate && patientId && professionalId && (
        <TemplatePickerSheet
          professionalId={professionalId}
          patientId={patientId}
          createdBy="patient"
          onClose={() => setPickingTemplate(false)}
        />
      )}
    </div>
  );
}
