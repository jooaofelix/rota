import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rota-desktop-mode";

/**
 * Sem preferência guardada, quem manda é o tamanho da tela: num computador o app
 * já abre largo, em vez de ficar numa tira estreita no meio do monitor até a
 * pessoa achar o interruptor. Escolhendo pelo botão, a escolha passa a valer.
 */
export function defaultDesktopMode(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(min-width: 900px)").matches;
}

function readStored(): boolean {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "1") return true;
    if (stored === "0") return false;
    return defaultDesktopMode();
  } catch {
    return defaultDesktopMode();
  }
}

export function useDesktopMode() {
  const [desktopMode, setDesktopModeState] = useState(readStored);

  useEffect(() => {
    document.documentElement.classList.toggle("desktop-mode", desktopMode);
  }, [desktopMode]);

  const setDesktopMode = useCallback((enabled: boolean) => {
    setDesktopModeState(enabled);
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // localStorage indisponível, a preferência só vale pra sessão atual
    }
  }, []);

  return { desktopMode, setDesktopMode, toggleDesktopMode: () => setDesktopMode(!desktopMode) };
}
