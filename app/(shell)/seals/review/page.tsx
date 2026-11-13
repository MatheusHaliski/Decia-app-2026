"use client";
// Fila de chancelas (RF39.CA04, CA07; RF28.CA03): aprovar ou recusar com motivo, com o relatório de critérios do sistema (DEMO).
import { ReviewQueuePage } from "@/components/seals/ReviewQueue";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/seals/review")!;

export default function Page() {
  return <ReviewQueuePage page={PAGE} />;
}
