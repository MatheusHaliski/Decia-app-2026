"use client";
import { PieceEditor } from "@/components/letters/PieceEditor";
import { useMounted } from "@/components/letters/useMounted";
import { RfPage } from "@/components/shell/RfPage";
import { useLetterPiece } from "@/lib/letters/repository";
import { pageByRoute } from "@/lib/pages/registry";

const PAGE = pageByRoute("/letters/[pieceId]")!;

export function LetterPieceClient({ pieceId }: { pieceId: string }) {
  const mounted = useMounted();
  const piece = useLetterPiece(pieceId);
  return (
    <RfPage page={PAGE} subtitle={mounted ? piece?.title : undefined} noEmpty>
      <PieceEditor pieceId={pieceId} />
    </RfPage>
  );
}
