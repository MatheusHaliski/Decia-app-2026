import type { ReactNode } from "react";
import { AppShell } from "@/components/shell/AppShell";

/** Todas as abas do app (Matrizes A–E) vivem dentro do AppShell; as rotas de auth ficam em app/(auth). */
export default function ShellLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
