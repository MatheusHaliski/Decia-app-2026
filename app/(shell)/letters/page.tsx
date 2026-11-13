"use client";
// /letters — Estúdio Letters (RF52 mínimo, RF53, RF54): minhas peças DEMO e criação a partir de modelo. Os CAs dos RFs
// continuam embaixo, recolhidos, para rastreabilidade. Dados DEMO na memória da aba até existir a API de peças.
import { LettersHome } from "@/components/letters/LettersHome";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/letters")!;

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <LettersHome />
    </RfPage>
  );
}
