"use client";
// /projects/[id] — visão do projeto (RF7/RF29/RF13/RF10). Esqueleto com os CAs até a página real; o trabalho no projeto
// acontece na Mesa de Trabalho (/projects/[id]/edit, RF22), linkada aqui.
import { useParams } from "next/navigation";
import { RfPage } from "@/components/shell/RfPage";
import { Button } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/projects/[id]")!;

export default function Page() {
  const params = useParams<{ id: string }>();
  const { t } = useI18n();
  return <RfPage page={PAGE} subtitle={params.id} actions={<Button variant="primary" icon="mesa" href={`/projects/${params.id}/edit`}>{t("pm.ws.openWorkspace")}</Button>} />;
}
