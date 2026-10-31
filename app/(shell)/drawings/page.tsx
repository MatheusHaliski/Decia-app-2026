"use client";
// /drawings (RF57–RF74). O modelo 3D (RF60–RF63) é o primeiro editor real da página: carregado só no navegador, para que
// three.js e o path tracer não pesem nas outras rotas. Os CAs do RF continuam abaixo, até as demais abas chegarem.
import dynamic from "next/dynamic";
import { LoadingState } from "@/components/ui";
import { RfPage } from "@/components/shell/RfPage";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/drawings")!;

const Editor3D = dynamic(() => import("@/components/drawings3d/Editor3D"), { ssr: false, loading: () => <LoadingState /> });

export default function Page() {
  return (
    <RfPage page={PAGE} noEmpty>
      <Editor3D />
    </RfPage>
  );
}
