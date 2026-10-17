"use client";
/**
 * ViewerProvider (D-35, P19): quem está vendo. Com a sessão real (CurrentUserProvider) o perfil vem de `/api/me` — sem sessão é
 * VISITANTE, inclusive numa aba anônima — e o seletor de perfis do laboratório só vale com `NEXT_PUBLIC_WS_LAB=on`. Fora do
 * CurrentUserProvider (testes, laboratório isolado) o perfil é o do seletor, guardado em localStorage (`ws.lab.viewer`).
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useOptionalCurrentUser, type SessionStatus } from "@/lib/session/CurrentUserProvider";
import { VIEWER_USERS, isViewerProfile, viewerUserOf, type ViewerProfile, type ViewerUser } from "./profiles";

export const VIEWER_STORAGE_KEY = "ws.lab.viewer";
/** Laboratório: o seletor de perfis troca o perfil exibido mesmo com sessão real (só em ambiente de demonstração). */
export const labMode = () => (process.env.NEXT_PUBLIC_WS_LAB ?? "").trim().toLowerCase() === "on";

interface ViewerContextValue {
  profile: ViewerProfile;
  user: ViewerUser;
  setProfile: (p: ViewerProfile) => void;
  /** true depois de ler o armazenamento local */
  ready: boolean;
  /** Sessão real: "loading" enquanto restaura; "lab" quando o perfil vem do seletor (testes, laboratório) */
  session: SessionStatus | "lab";
  /** O seletor de perfis do laboratório tem efeito? */
  canSwitch: boolean;
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
  const current = useOptionalCurrentUser();
  const value = useMemo<ViewerContextValue>(() => {
    if (!current || labMode()) {
      return { profile, user: VIEWER_USERS[profile], setProfile, ready, session: "lab", canSwitch: true };
    }
    if (current.status === "authenticated" && current.me) {
      const user = viewerUserOf(current.me);
      return { profile: user.profile, user, setProfile, ready, session: "authenticated", canSwitch: false };
    }
    return { profile: "VISITANTE", user: VIEWER_USERS.VISITANTE, setProfile, ready, session: current.status, canSwitch: false };
  }, [current, profile, setProfile, ready]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useViewer(): ViewerContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useViewer fora do ViewerProvider");
  return ctx;
}
