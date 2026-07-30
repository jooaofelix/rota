import { NavLink } from "react-router-dom";
import clsx from "clsx";

interface NavItem {
  to: string;
  label: string;
  icon: string;
}

const PATIENT_ITEMS: NavItem[] = [
  { to: "/hoje", label: "Hoje", icon: "🏠" },
  { to: "/rotina", label: "Rotina", icon: "📋" },
  { to: "/recompensas", label: "Recompensas", icon: "🏆" },
  { to: "/historico", label: "Histórico", icon: "📅" },
  { to: "/perfil", label: "Perfil", icon: "👤" },
];

const PROFESSIONAL_ITEMS: NavItem[] = [
  { to: "/agenda", label: "Agenda", icon: "🗓️" },
  { to: "/painel", label: "Painel", icon: "📊" },
  { to: "/pacientes", label: "Pacientes", icon: "🧑‍🤝‍🧑" },
  { to: "/rotinas", label: "Rotinas", icon: "📋" },
  { to: "/financas", label: "Finanças", icon: "💰" },
  { to: "/conta", label: "Perfil", icon: "👤" },
];

export function BottomNav({ variant }: { variant: "patient" | "professional" }) {
  const items = variant === "patient" ? PATIENT_ITEMS : PROFESSIONAL_ITEMS;

  return (
    <nav className="safe-bottom sticky bottom-0 z-20 border-t border-brand-100 bg-white/95 backdrop-blur">
      <ul className="nav-inner mx-auto flex max-w-md items-stretch justify-between px-1">
        {items.map((item) => (
          <li key={item.to} className="flex-1">
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex flex-col items-center gap-0.5 px-0.5 py-2.5 text-center text-[10px] font-bold leading-tight transition",
                  isActive ? "text-brand-600" : "text-brand-300"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span className={clsx("text-xl transition-transform", isActive && "scale-110")}>{item.icon}</span>
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
