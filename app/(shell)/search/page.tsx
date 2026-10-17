"use client";
// Buscar (RF27, RF17; ABAS_POR_PERFIL.md / docs/diagramas). A sub-aba PESSOAS é real (`GET /api/people`, components/people/PeopleSearch);
// as demais continuam como esqueleto até o RF correspondente.
import { PeopleSearch } from "@/components/people/PeopleSearch";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/search")!;

export default function Page() {
  return <RfPage page={PAGE} renderTab={(slug) => (slug === "pessoas" ? <PeopleSearch /> : undefined)} />;
}
