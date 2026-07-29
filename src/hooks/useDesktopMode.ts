import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "rota-desktop-mode";

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
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
