import { BottomSheet } from "@/components/common/BottomSheet";

/**
 * O que nasce quando ela toca num horário vazio da grade.
 *
 * A pergunta é sempre a mesma e tem só duas respostas: atendimento ou vida.
 * Fazer o toque criar direto um atendimento seria adivinhar — a agenda dela tem
 * supervisão, estudo, almoço e academia no meio dos pacientes, e esses horários
 * precisam ocupar o tempo de verdade para ninguém marcar em cima.
 */
export function NovoBlocoSheet({
  data,
  inicio,
  fim,
  onAtendimento,
  onPessoal,
  onClose,
}: {
  data: string;
  inicio: string;
  fim: string;
  onAtendimento: () => void;
  onPessoal: () => void;
  onClose: () => void;
}) {
  const [a, m, d] = data.split("-");

  return (
    <BottomSheet open onClose={onClose} title="O que entra neste horário?">
      <div className="flex flex-col gap-3">
        <p className="rounded-2xl bg-cream-100 p-3 text-center text-sm font-bold text-brand-700">
          {d}/{m}/{a} · {inicio} às {fim}
        </p>

        <button onClick={onAtendimento} className="flex items-center gap-3 rounded-2xl bg-brand-500 p-3.5 text-left">
          <span className="text-2xl">👥</span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-white">Atendimento</span>
            <span className="block text-xs leading-snug text-white/75">
              Sessão de paciente, com valor e pagamento
            </span>
          </span>
        </button>

        <button onClick={onPessoal} className="flex items-center gap-3 rounded-2xl bg-cream-100 p-3.5 text-left">
          <span className="text-2xl">🌿</span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-bold text-brand-800">Pessoal ou lazer</span>
            <span className="block text-xs leading-snug text-brand-500">
              Supervisão, estudo, almoço, academia — ocupa o horário do mesmo jeito
            </span>
          </span>
        </button>

        <p className="text-center text-[11px] leading-snug text-brand-400">
          O horário vem do ponto onde você tocou. Dá para mudar na tela seguinte.
        </p>
      </div>
    </BottomSheet>
  );
}
