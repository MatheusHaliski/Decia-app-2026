"use client";
// Chancelas & políticas (RF39): minhas chancelas, conceder por vínculo sugerido ✦, política ou premiação, e recusadas (DEMO).
import { SealsPage } from "@/components/seals/SealsPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/seals")!;

export default function Page() {
  return <SealsPage page={PAGE} />;
}
