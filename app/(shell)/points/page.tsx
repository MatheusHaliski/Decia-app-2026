"use client";
// DECIA Points (RF42.CA03, CA09): saldo, extrato, regras, gráfico mensal e doação — razão DEMO compartilhado (lib/points/ledger.ts).
import { PointsPage } from "@/components/points/PointsPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/points")!;

export default function Page() {
  return <PointsPage page={PAGE} />;
}
