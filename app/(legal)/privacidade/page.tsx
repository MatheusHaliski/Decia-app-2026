import { LegalDocument } from "@/components/legal/LegalDocument";
import { loadLegal } from "@/lib/legal/load";

// RF1 bloco A, D-143: Política de Privacidade da Velion, lida de docs/legal/POLITICA_DE_PRIVACIDADE.md no build.
export default function PrivacyPage() {
  return <LegalDocument doc={loadLegal("PRIVACIDADE")} otherHref="/termos" otherLabelKey="legal.terms" />;
}
