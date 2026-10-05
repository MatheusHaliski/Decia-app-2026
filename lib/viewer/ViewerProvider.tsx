"use client";
/**
 * ViewerProvider (D-32): perfil de VISUALIZAÇÃO do lab, só no front, para testar a visibilidade das abas por perfil.
 * Guardado em localStorage (`ws.lab.viewer`, try/catch). Quando a sessão real existir (Bloco 3), o perfil passa a vir
 * de /api/me e o seletor fica restrito ao /lab.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { VIEWER_USERS, isViewerProfile, type ViewerProfile, type ViewerUser } from "./profiles";

export const VIEWER_STORAGE_KEY = "ws.lab.viewer";

interface ViewerContextValue {
  profile: ViewerProfile;
  user: ViewerUser;
  setProfile: (p: ViewerProfile) => void;
  /** true depois de ler o armazenamento local */
  ready: boolean;
}

const Ctx = createContext<ViewerContextValue | null>(null);

export function ViewerProvider({ children, initial = "EMPREGADO" }: { children: ReactNode; initial?: ViewerProfile }) {
  const [profile, setProfileState] = useState<ViewerProfile>(initial);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEWER_STORAGE_KEY);
      if (isViewerProfile(saved)) setProfileState(saved);
    } catch { /* armazenamento indisponível */ }
    setReady(true);
  }, []);
  const setProfile = useCallback((p: ViewerProfile) => {
    setProfileState(p);
    try { localStorage.setItem(VIEWER_STORAGE_KEY, p); } catch { /* ignore */ }
  }, []);
  const value = useMemo(() => ({ profile, user: VIEWER_USERS[profile], setProfile, ready }), [profile, setProfile, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useViewer fora do ViewerProvider");
  return ctx;
}
