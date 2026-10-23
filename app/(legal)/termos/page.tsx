import { LegalDocument } from "@/components/legal/LegalDocument";
import { loadLegal } from "@/lib/legal/load";

// RF1 bloco A, D-143: Termos de Uso da Velion (dona da Orange Social), lidos de docs/legal/TERMOS_DE_USO.md no build.
export default function TermsPage() {
  return <LegalDocument doc={loadLegal("TERMOS")} otherHref="/privacidade" otherLabelKey="legal.privacy" />;
}
