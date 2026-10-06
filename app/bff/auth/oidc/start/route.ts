import type { NextRequest } from "next/server";
import { start } from "../oidc";

/** RF2.CA03 — início do login institucional (Authorization Code + PKCE S256 + state + nonce; D-63). 404 com WS_OIDC_ENABLED desligado. */
export function GET(req: NextRequest) {
  return start(req);
}
