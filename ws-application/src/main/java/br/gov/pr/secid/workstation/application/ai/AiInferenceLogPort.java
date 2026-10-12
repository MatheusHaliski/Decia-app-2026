package br.gov.pr.secid.workstation.application.ai;

import br.gov.pr.secid.workstation.domain.ia.AiInferenceLog;

/** Trilha append-only {@code ai_inference_log} (V2): uma linha por chamada, com {@code masked_fields_json} e SEM o prompt bruto (D-69). */
public interface AiInferenceLogPort {

    void append(AiInferenceLog entry);
}
