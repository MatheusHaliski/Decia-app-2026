"use client";
// Loja Work AI (RF42.CA04–CA06): skins da Mesa, créditos de IA, impulso no Mural, modelos e kits do Balcão — compra em DECIA Points (DEMO).
import { StorePage } from "@/components/store/StorePage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/store")!;

export default function Page() {
  return <StorePage page={PAGE} />;
}
