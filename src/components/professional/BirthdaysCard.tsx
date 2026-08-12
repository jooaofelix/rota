import { useMemo } from "react";
import clsx from "clsx";
import type { PatientOverview } from "@/services/professionalOverview";
import { firstName } from "@/utils/proposals";

const MESES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/**
 * Aniversariantes do mês.
 *
 * Parece enfeite e não é: lembrar do aniversário de quem você acompanha é uma
 * das poucas coisas que sustentam vínculo fora da sessão, e é exatamente o tipo
 * de coisa que passa em branco quando ninguém avisa. O cartão só existe se
 * houver data de nascimento cadastrada — sem isso, some, em vez de ficar
 * pedindo dado.
 */
export function BirthdaysCard({ overview }: { overview: PatientOverview[] }) {
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const diaHoje = hoje.getDate();

  const aniversariantes = useMemo(
    () =>
      overview
        .filter((o) => o.birthDate && o.birthDate.getMonth() === mesAtual)
        .map((o) => ({
          patientId: o.patientId,
          nome: o.name,
          dia: o.birthDate!.getDate(),
          idade: hoje.getFullYear() - o.birthDate!.getFullYear(),
        }))
        .sort((a, b) => a.dia - b.dia),
    [overview, mesAtual, hoje]
  );

  if (aniversariantes.length === 0) return null;

  function parabenizar(nome: string) {
    const texto = `Oi, ${firstName(nome)}! Passei para desejar um feliz aniversário. Que este ano te traga leveza. 🎉`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  }

  return (
    <div className="card">
      <p className="mb-2 text-sm font-bold text-brand-700">
        🎂 Aniversariantes de {MESES[mesAtual]}
      </p>
      <div className="flex flex-col">
        {aniversariantes.map((a) => {
          const hojeMesmo = a.dia === diaHoje;
          const jaPassou = a.dia < diaHoje;
          return (
            <div
              key={a.patientId}
              className="flex items-center gap-2.5 border-b border-brand-50 py-2 last:border-b-0"
            >
              <span
                className={clsx(
                  "flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-xl text-[11px] font-extrabold leading-none",
                  hojeMesmo ? "bg-brand-500 text-white" : jaPassou ? "bg-brand-50 text-brand-300" : "bg-brand-50 text-brand-600"
                )}
              >
                <span className="text-sm">{String(a.dia).padStart(2, "0")}</span>
              </span>
              <div className="min-w-0 flex-1">
                <p className={clsx("truncate text-sm font-bold", jaPassou ? "text-brand-400" : "text-brand-800")}>
                  {a.nome}
                </p>
                <p className="text-xs text-brand-400">
                  {hojeMesmo ? "É hoje!" : `${a.idade} anos`}
                </p>
              </div>
              {!jaPassou && (
                <button
                  onClick={() => parabenizar(a.nome)}
                  className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-[11px] font-bold text-brand-600"
                >
                  Parabenizar
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
