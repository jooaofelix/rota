import { BottomSheet } from "@/components/common/BottomSheet";
import type { ExternalEventDoc } from "@/services/externalEvents";

/**
 * O que um bloco vindo do Google mostra quando ela toca nele.
 *
 * Ele não é editável aqui, e a folha assume isso em vez de esconder: mostra o
 * compromisso inteiro (o título costuma estar cortado na grade), diz de onde
 * veio, e oferece as duas coisas que fazem sentido — abrir no Google, onde a
 * edição existe de verdade, ou transformar aquele horário num atendimento do
 * ROTA, quando o que estava no Google era uma sessão.
 */
export function GoogleBlockSheet({
  evento,
  onVirarSessao,
  onClose,
}: {
  evento: ExternalEventDoc;
  onVirarSessao: () => void;
  onClose: () => void;
}) {
  const [a, m, d] = evento.date.split("-");

  return (
    <BottomSheet open onClose={onClose} title={evento.titulo}>
      <div className="flex flex-col gap-3">
        <p className="text-sm font-bold text-brand-700">
          {d}/{m}/{a} · {evento.startTime} às {evento.endTime}
        </p>

        <p className="rounded-2xl bg-cream-100 p-3 text-xs leading-relaxed text-brand-600">
          Este compromisso mora no seu <span className="font-bold">Google Agenda</span>. Ele aparece aqui
          para você não marcar paciente em cima, mas quem manda nele é o Google — mudar o horário por aqui
          não mudaria nada lá.
        </p>

        <button onClick={onVirarSessao} className="btn-primary">
          Criar atendimento neste horário
        </button>

        <a
          href="https://calendar.google.com/calendar/u/0/r"
          target="_blank"
          rel="noreferrer"
          className="btn-secondary text-center"
        >
          Abrir o Google Agenda
        </a>

        <p className="text-[11px] leading-snug text-brand-400">
          Se você editar no Google, a mudança aparece aqui na próxima leitura — até meia hora. Para ver na
          hora, use “Atualizar agora” em Sincronizar.
        </p>
      </div>
    </BottomSheet>
  );
}
