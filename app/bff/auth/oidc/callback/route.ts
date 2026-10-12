import type { NextRequest } from "next/server";
import { callback } from "../oidc";

/** RF2.CA03 — volta do IdP: confere PKCE, state e nonce (400 se inválidos), troca o código e abre a sessão (D-63). */
export function GET(req: NextRequest) {
  return callback(req);
}
