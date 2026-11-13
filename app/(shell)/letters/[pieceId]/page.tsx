// /letters/[pieceId] — peça do Letters com o Copiloto linguístico e narrativo (RF52 mínimo, RF53, RF54; autonomia RF51;
// painel RF73). Dados DEMO em memória até a API de peças (PieceController, planejado).
import { LetterPieceClient } from "./LetterPieceClient";

export default async function Page({ params }: { params: Promise<{ pieceId: string }> }) {
  const { pieceId } = await params;
  return <LetterPieceClient pieceId={pieceId} />;
}
