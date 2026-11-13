"use client";
import { useEffect, useState } from "react";

/** O conteúdo DEMO (datas relativas ao agora, dados da aba) só é montado no cliente: evita divergência de hidratação. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
