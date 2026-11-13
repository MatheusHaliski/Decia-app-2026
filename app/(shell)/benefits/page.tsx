"use client";
// Benefícios (RF39.CA09, CA10): liberados pelas chancelas aprovadas, resgate com confirmação e publicação pelo emissor (DEMO).
import { BenefitsPage } from "@/components/seals/BenefitsPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/benefits")!;

export default function Page() {
  return <BenefitsPage page={PAGE} />;
}
