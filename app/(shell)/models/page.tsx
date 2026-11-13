"use client";
// Balcão de Modelos (RF40): prateleiras Chancelados · Comunidade, oferecer e reutilizar modelos com crédito ao autor em DECIA Points (DEMO).
import { ModelsPage } from "@/components/models/ModelsPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/models")!;

export default function Page() {
  return <ModelsPage page={PAGE} />;
}
