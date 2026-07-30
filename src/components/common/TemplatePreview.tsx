import { useState } from "react";
import clsx from "clsx";
import type { Priority, RoutineTemplateDoc, RoutineTemplateItem } from "@/types";
import { PERIOD_LABELS, PRIORITY_EMOJI, PRIORITY_LABELS, PRIORITY_ORDER, PRIORITY_STYLES } from "@/utils/constants";
import { PriorityBoard, type BoardItem } from "./PriorityBoard";

interface TemplatePreviewProps {
  template: RoutineTemplateDoc;
  onBack: () => void;
  /** Recebe o modelo já com as atividades organizadas pelo usuário. */
  onConfirm: (template: RoutineTemplateDoc) => void;
  confirmLabel?: string;
  busy?: boolean;
}

const GENERIC_HOW_IT_WORKS =
  "Ao aplicar, as atividades abaixo entram na rotina como estão. Depois é possível editar horários, remover o que não fizer sentido e acrescentar outras atividades.";

/**
 * Prévia de um modelo antes de aplicar: explica como ele funciona e mostra o que
 * vai entrar na rotina. No modelo por prioridade a prévia é editável — as
 * atividades vêm distribuídas nos quadros e podem ser rearranjadas antes de aplicar.
 */
export function TemplatePreview({ template, onBack, onConfirm, confirmLabel = "Aplicar modelo", busy }: TemplatePreviewProps) {
  const [items, setItems] = useState<RoutineTemplateItem[]>(template.items);
  const isPriorityBoard = template.kind === "priority" && items.length > 0;

  const boardItems: BoardItem[] = items.map((item, index) => ({
    id: String(index),
    title: item.title,
    icon: item.icon,
    priority: item.priority,
    hint: [PERIOD_LABELS[item.period], item.time].filter(Boolean).join(" · "),
  }));

  function handleBoardChange(next: BoardItem[]) {
    const priorityById = new Map(next.map((b) => [b.id, b.priority]));
    setItems(items.map((item, index) => ({ ...item, priority: priorityById.get(String(index)) ?? item.priority })));
  }

  function handleConfirm() {
    // No quadro de prioridade a ordem visual é a ordem da rotina: indispensáveis primeiro.
    const ordered = isPriorityBoard
      ? [...items].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))
      : items;
    onConfirm({ ...template, items: ordered });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">{template.icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-base font-extrabold text-brand-900">{template.name}</p>
          <p className="mt-0.5 text-sm leading-snug text-brand-500">{template.description}</p>
        </div>
      </div>

      <div className="rounded-2xl bg-brand-50 p-3">
        <p className="mb-1 text-xs font-extrabold uppercase tracking-wide text-brand-600">Como funciona</p>
        <p className="text-sm leading-relaxed text-brand-700">{template.howItWorks ?? GENERIC_HOW_IT_WORKS}</p>
        {template.steps && template.steps.length > 0 && (
          <ol className="mt-2 flex flex-col gap-1.5">
            {template.steps.map((step, i) => (
              <li key={step} className="flex gap-2 text-sm leading-snug text-brand-700">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-[11px] font-bold text-white">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        )}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl bg-cream-100 p-3 text-sm text-brand-600">
          Este modelo começa vazio. A rotina é criada em branco e as atividades são adicionadas uma a uma.
        </p>
      ) : isPriorityBoard ? (
        <div>
          <p className="mb-1 text-sm font-extrabold text-brand-800">Organize por prioridade</p>
          <p className="mb-3 text-xs leading-snug text-brand-500">
            Arraste pelo <span className="font-bold">⠿</span> para mover uma atividade de quadro, ou toque nela para
            escolher da lista. Nada é definitivo — dá para mudar depois.
          </p>
          <PriorityBoard items={boardItems} onChange={handleBoardChange} />
        </div>
      ) : (
        <div>
          <p className="mb-2 text-sm font-extrabold text-brand-800">
            {items.length === 1 ? "1 atividade" : `${items.length} atividades`}
          </p>
          <div className="flex flex-col gap-3">
            {(["morning", "afternoon", "evening"] as const).map((period) => {
              const periodItems = items.filter((i) => i.period === period);
              if (periodItems.length === 0) return null;
              return (
                <div key={period}>
                  <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-300">
                    {PERIOD_LABELS[period]}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    {periodItems.map((item, i) => (
                      <div key={`${item.title}-${i}`} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                        <span className="shrink-0 text-xl">{item.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold text-brand-800">{item.title}</p>
                          {(item.time || item.instruction) && (
                            <p className="truncate text-xs text-brand-400">
                              {item.time ? `${item.time} · ` : ""}
                              {item.instruction ?? ""}
                            </p>
                          )}
                        </div>
                        <PriorityChip priority={item.priority} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={onBack} className="btn-secondary flex-1" disabled={busy}>
          Voltar
        </button>
        <button type="button" onClick={handleConfirm} className="btn-primary flex-1" disabled={busy}>
          {busy ? "Aplicando..." : confirmLabel}
        </button>
      </div>
    </div>
  );
}

function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span className={clsx("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold", PRIORITY_STYLES[priority].chip)}>
      {PRIORITY_EMOJI[priority]} {PRIORITY_LABELS[priority]}
    </span>
  );
}
