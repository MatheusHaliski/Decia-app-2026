"use client";
import { useEffect, useState } from "react";
import { usePreferences } from "@/lib/preferences/PreferencesProvider";

/** true com prefers-reduced-motion OU a preferência "Reduzir movimento" do app (data-reduce-motion, RF3). */
export function useReducedMotion(): boolean {
  const { prefs } = usePreferences();
  const media = useMediaQuery("(prefers-reduced-motion: reduce)");
  return prefs.reduceMotion || media;
}

export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setMatch(mq.matches);
    sync();
    mq.addEventListener?.("change", sync);
    return () => mq.removeEventListener?.("change", sync);
  }, [query]);
  return match;
}

/** Relógio da tela (relativos como "salvo há 3 s"); atualiza a cada `everyMs`. */
export function useNow(everyMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), everyMs);
    return () => window.clearInterval(id);
  }, [everyMs]);
  return now;
}

/** O conteúdo DEMO é montado só no cliente (datas relativas ao agora): evita divergência de hidratação. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}

export const formatDay = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { day: "numeric", month: "short" }).format(new Date(iso));
export const formatDateTime = (iso: string, intl: string) => new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));
export const formatScore = (n: number, intl: string, digits = 1) => new Intl.NumberFormat(intl, { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n);
