"use client";
// /today — "Hoje": home de quem tem sessão (a raiz `/` leva aqui com o cookie-sinal da sessão). Tarefa do Dia, primeiros passos e atalhos.
import { TodayView } from "@/components/onboarding/TodayView";

export default function Page() {
  return <TodayView />;
}
