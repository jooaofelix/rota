import clsx from "clsx";
import type { Period, Priority, RoutineTemplateDoc } from "@/types";
import { PERIOD_LABELS, PRIORITY_EMOJI, PRIORITY_HINTS, PRIORITY_LABELS, PRIORITY_ORDER, PRIORITY_STYLES } from "@/utils/constants";

interface TemplatePreviewProps {
  template: RoutineTemplateDoc;
  onBack: () => void;
  onConfirm: (template: RoutineTemplateDoc) => void;
  confirmLabel?: string;
  busy?: boolean;
}

const GENERIC_HOW_IT_WORKS =
  "Ao aplicar, as atividades abaixo entram na rotina como estão. Depois é possível editar horários, remover o que não fizer sentido e acrescentar outras atividades.";

/**
 * Prévia de um modelo antes de aplicar: explica como ele funciona e mostra o que
 * vai entrar na rotina. O modelo por prioridade aparece agrupado pelos quatro
 * níveis; reorganizar é feito depois, na aba Prioridades da rotina.
 */
export function TemplatePreview({ template, onBack, onConfirm, confirmLabel = "Aplicar modelo", busy }: TemplatePreviewProps) {
  const items = template.items;
  const groupByPriority = template.kind === "priority";

  function handleConfirm() {
    // No modelo por prioridade a rotina nasce com os indispensáveis no topo.
    const ordered = groupByPriority
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
      ) : (
        <div>
          <p className="mb-2 text-sm font-extrabold text-brand-800">
            {items.length === 1 ? "1 atividade" : `${items.length} atividades`}
          </p>

          {groupByPriority ? (
            <>
              <div className="flex flex-col gap-3">
                {PRIORITY_ORDER.map((priority) => {
                  const group = items.filter((i) => i.priority === priority);
                  if (group.length === 0) return null;
                  const style = PRIORITY_STYLES[priority];
                  return (
                    <section key={priority} className={clsx("rounded-2xl border-2 p-3", style.border, style.bg)}>
                      <p className={clsx("text-sm font-extrabold", style.text)}>
                        {PRIORITY_EMOJI[priority]} {PRIORITY_LABELS[priority]}
                      </p>
                      <p className="mb-2 text-xs leading-snug text-brand-500">{PRIORITY_HINTS[priority]}</p>
                      <div className="flex flex-col gap-1.5">
                        {group.map((item, i) => (
                          <div key={`${item.title}-${i}`} className="flex items-center gap-2 rounded-xl bg-white p-2 shadow-sm">
                            <span className="shrink-0 text-xl">{item.icon}</span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-brand-800">{item.title}</p>
                              <p className="truncate text-xs text-brand-400">
                                {[PERIOD_LABELS[item.period], item.time].filter(Boolean).join(" · ")}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
              <p className="mt-3 rounded-xl bg-cream-100 p-2.5 text-xs leading-snug text-brand-600">
                Depois de aplicar, use a aba <span className="font-bold">Prioridades</span> na sua rotina para arrastar as
                atividades entre os quadros quando quiser.
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-3">
              {(["morning", "afternoon", "evening"] as Period[]).map((period) => {
                const group = items.filter((i) => i.period === period);
                if (group.length === 0) return null;
                return (
                  <div key={period}>
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-300">
                      {PERIOD_LABELS[period]}
                    </p>
                    <div className="flex flex-col gap-1.5">
                      {group.map((item, i) => (
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
          )}
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
