"use client";
// /tasks — Minhas tarefas (RF41): tarefas persistidas pela API real, filtradas pelo estado padronizado (lib/tasks/status).
import { MyTasks } from "@/components/tasks/PersistedTasks";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/tasks")!;

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <MyTasks />
    </RfPage>
  );
}
