-- V14 — rf4_decia_sessao (5 DECIA sessão). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- decia_sessions (DeciaSession — 5 DECIA sessão; RF4, RF5, RF9, RF6, RF11, RF12, RF14, RF15, RF17, RF29, RF33)
-- Sessões DECIA. Admin/criador RESTRICT (trilha deliberativa); catálogos RESTRICT; projeto/eixo de origem SET
-- NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decia_sessions (
    id                      BINARY(16)      NOT NULL,
    topic                   VARCHAR(300)    NOT NULL,
    description             TEXT            NULL,
    admin_user_id           BINARY(16)      NOT NULL,
    created_by_user_id      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NULL,
    department_id           BINARY(16)      NULL,
    access_mode             VARCHAR(20)     NOT NULL DEFAULT 'FECHADA',
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PROPOSTA',
    ai_mode                 VARCHAR(20)     NOT NULL DEFAULT 'ECONOMIA',
    linked_project_id       BINARY(16)      NULL,
    plan_axis_id            BINARY(16)      NULL,
    started_at              TIMESTAMP(6)    NULL,
    closed_at               TIMESTAMP(6)    NULL,
    archived_at             TIMESTAMP(6)    NULL,
    message_count           INT             NOT NULL DEFAULT 0,
    participant_count       INT             NOT NULL DEFAULT 0,
    message_ttl_days        INT             NOT NULL DEFAULT 365,
    archive_media_id        BINARY(16)      NULL,
    indexed_in_memory       BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_decia_sessions__admin_user_id FOREIGN KEY (admin_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_sessions__created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_sessions__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_sessions__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_sessions__linked_project_id FOREIGN KEY (linked_project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_sessions__plan_axis_id FOREIGN KEY (plan_axis_id) REFERENCES plan_axes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decia_sessions__archive_media_id FOREIGN KEY (archive_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decia_sessions_access_mode CHECK (access_mode IN ('FECHADA', 'DEPARTAMENTO', 'EMPRESA')),
    CONSTRAINT ck_decia_sessions_status CHECK (status IN ('PROPOSTA', 'ATIVA', 'EM_RESUMO', 'EM_DECISAO', 'EM_REVISAO', 'REABERTA', 'ENCERRADA', 'ARQUIVADA')),
    CONSTRAINT ck_decia_sessions_ai_mode CHECK (ai_mode IN ('ECONOMIA', 'AVANCADO')),
    INDEX ix_decia_sessions_status_started_at (status, started_at),
    INDEX ix_decia_sessions_company_status (company_id, status),
    INDEX ix_decia_sessions_department_status (department_id, status),
    INDEX ix_decia_sessions_admin_user (admin_user_id),
    INDEX ix_decia_sessions_linked_project (linked_project_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- session_participants (SessionParticipant — 5 DECIA sessão; RF5, RF9, RF10, RF42)
-- Participantes por sessão (filho → CASCADE). user_id RESTRICT: presença é trilha deliberativa (pontos RF42).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE session_participants (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    role                    VARCHAR(20)     NOT NULL DEFAULT 'MEMBRO',
    joined_at               TIMESTAMP(6)    NOT NULL,
    left_at                 TIMESTAMP(6)    NULL,
    added_by                BINARY(16)      NULL,
    removed_by              BINARY(16)      NULL,
    remove_reason           VARCHAR(300)    NULL,
    can_reply_divergence    BOOLEAN         NOT NULL DEFAULT FALSE,
    last_read_at            TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_session_participants_session_user UNIQUE (session_id, user_id),
    CONSTRAINT fk_session_participants__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_session_participants__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_session_participants__added_by FOREIGN KEY (added_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_session_participants__removed_by FOREIGN KEY (removed_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_session_participants_role CHECK (role IN ('ADMIN', 'MEMBRO', 'OBSERVADOR', 'IA')),
    INDEX ix_session_participants_user_left_at (user_id, left_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- message_classifications (MessageClassification — 5 DECIA sessão; RF7, RF8, RF11, RF29, RF42)
-- Rótulo, confiança e evidência por mensagem. Filho da sessão → CASCADE; vínculos a tarefa/projeto SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE message_classifications (
    id                      BINARY(16)      NOT NULL,
    message_id              BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    label                   VARCHAR(20)     NOT NULL,
    confidence              DECIMAL(4,3)    NOT NULL,
    has_evidence            BOOLEAN         NOT NULL DEFAULT FALSE,
    evidence_refs_json      JSON            NULL,
    linked_task_id          BINARY(16)      NULL,
    linked_project_id       BINARY(16)      NULL,
    rationale               VARCHAR(1000)   NULL,
    ai_inference_id         BINARY(16)      NULL,
    confirmed_by_user_id    BINARY(16)      NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_message_classifications__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_message_classifications__linked_task_id FOREIGN KEY (linked_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_message_classifications__linked_project_id FOREIGN KEY (linked_project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_message_classifications__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_message_classifications__confirmed_by_user_id FOREIGN KEY (confirmed_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_message_classifications_label CHECK (label IN ('ARGUMENTO', 'DIVERGENCIA', 'RISCO', 'CONSENSO', 'PERGUNTA', 'RUIDO')),
    INDEX ix_message_classifications_session_label (session_id, label),
    INDEX ix_message_classifications_message (message_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- session_messages_idx (SessionMessageIndex — 5 DECIA sessão; RF6, RF7, RF17, RF18, RF42)
-- Índice leve das mensagens do Cassandra (id = TIMEUUID). Filho da sessão → CASCADE; autor RESTRICT (trilha).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE session_messages_idx (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    author_id               BINARY(16)      NOT NULL,
    author_kind             VARCHAR(20)     NOT NULL,
    sent_at                 TIMESTAMP(6)    NOT NULL,
    classification_id       BINARY(16)      NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_session_messages_idx__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_session_messages_idx__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_session_messages_idx__classification_id FOREIGN KEY (classification_id) REFERENCES message_classifications (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_session_messages_idx_author_kind CHECK (author_kind IN ('HUMANO', 'IA', 'SISTEMA')),
    INDEX ix_session_messages_idx_session_sent_at (session_id, sent_at),
    INDEX ix_session_messages_idx_author_sent_at (author_id, sent_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- message_attachments (MessageAttachment — 5 DECIA sessão; RF29, RF42, RF6)
-- Anexos do acervo nas mensagens (alvo polimórfico com snapshot). Filho da sessão → CASCADE.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE message_attachments (
    id                      BINARY(16)      NOT NULL,
    message_id              BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    snapshot_json           JSON            NULL,
    used_in_decision        BOOLEAN         NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_message_attachments__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_message_attachments_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'PLAN', 'SCENARIO', 'ARTIFACT', 'EVIDENCE')),
    INDEX ix_message_attachments_message (message_id),
    INDEX ix_message_attachments_target_type_target (target_type, target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- divergences (Divergence — 5 DECIA sessão; RF8, RF10, RF11, RF42)
-- Divergências por sessão (filho → CASCADE). Resolução referencia a resposta (SET NULL).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE divergences (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    origin_message_id       BINARY(16)      NOT NULL,
    detected_by_ai          BOOLEAN         NOT NULL DEFAULT FALSE,
    summary                 VARCHAR(1000)   NOT NULL,
    parties_json            JSON            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ABERTA',
    resolved_by_reply_id    BINARY(16)      NULL,
    resolved_at             TIMESTAMP(6)    NULL,
    notified_at             TIMESTAMP(6)    NULL,
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_divergences__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_divergences__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_divergences_status CHECK (status IN ('ABERTA', 'EM_RESPOSTA', 'RESOLVIDA', 'SEM_CONSENSO')),
    INDEX ix_divergences_session_status (session_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- divergence_replies (DivergenceReply — 5 DECIA sessão; RF10, RF42)
-- Respostas (filho da divergência → CASCADE). Autor RESTRICT (pontua em RF42).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE divergence_replies (
    id                      BINARY(16)      NOT NULL,
    divergence_id           BINARY(16)      NOT NULL,
    author_id               BINARY(16)      NOT NULL,
    message_id              BINARY(16)      NOT NULL,
    resolves                BOOLEAN         NOT NULL DEFAULT FALSE,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_divergence_replies__divergence_id FOREIGN KEY (divergence_id) REFERENCES divergences (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_divergence_replies__author_id FOREIGN KEY (author_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    INDEX ix_divergence_replies_divergence_at (divergence_id, at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- ai_questions (AiQuestion — 5 DECIA sessão; RF8, RF16, RF33, RF42)
-- Perguntas formuladas pela IA (filho da sessão → CASCADE).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE ai_questions (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    kind                    VARCHAR(20)     NOT NULL,
    question_text           TEXT            NOT NULL,
    basis_message_ids_json  VARCHAR(255)    NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ABERTA',
    answered_by_message_id  BINARY(16)      NULL,
    answered_with_evidence  BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_inference_id         BINARY(16)      NULL,
    citations_json          JSON            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_ai_questions__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_ai_questions__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_ai_questions_kind CHECK (kind IN ('RISCO', 'PONTO_CRITICO', 'ESCLARECIMENTO')),
    CONSTRAINT ck_ai_questions_status CHECK (status IN ('ABERTA', 'RESPONDIDA', 'IGNORADA')),
    INDEX ix_ai_questions_session_status (session_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- analytical_summaries (AnalyticalSummary — 5 DECIA sessão; RF11, RF12, RF29, RF31, RF32, RF33)
-- Resumos versionados por sessão (filho → CASCADE).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE analytical_summaries (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    version_number          INT             NOT NULL DEFAULT 0,
    generated_at            TIMESTAMP(6)    NOT NULL,
    arguments_json          JSON            NULL,
    consensus_json          JSON            NULL,
    divergences_json        JSON            NULL,
    risks_json              JSON            NULL,
    attention_points_json   JSON            NULL,
    recommendations_json    JSON            NULL,
    evaluation_criteria_json JSON            NULL,
    compliance_result_id    BINARY(16)      NULL,
    ai_inference_id         BINARY(16)      NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_analytical_summaries_session_version_number UNIQUE (session_id, version_number),
    CONSTRAINT fk_analytical_summaries__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_analytical_summaries__compliance_result_id FOREIGN KEY (compliance_result_id) REFERENCES compliance_results (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_analytical_summaries__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_analytical_summaries_status CHECK (status IN ('RASCUNHO', 'PUBLICADO'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- summary_scenarios (SummaryScenario — 5 DECIA sessão; RF11, RF12, RF31)
-- Cenários do resumo (filho → CASCADE); cenário do simulador SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE summary_scenarios (
    id                      BINARY(16)      NOT NULL,
    summary_id              BINARY(16)      NOT NULL,
    name                    VARCHAR(120)    NOT NULL,
    description             TEXT            NULL,
    advantages_json         JSON            NULL,
    disadvantages_json      JSON            NULL,
    criteria_scores_json    JSON            NULL,
    linked_project_scenario_id BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_summary_scenarios__summary_id FOREIGN KEY (summary_id) REFERENCES analytical_summaries (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_summary_scenarios__linked_project_scenario_id FOREIGN KEY (linked_project_scenario_id) REFERENCES project_scenarios (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    INDEX ix_summary_scenarios_summary (summary_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- final_decisions (FinalDecision — 5 DECIA sessão; RF12, RF14, RF15, RF29, RF42)
-- Decisões por sessão (filho → CASCADE). Revisão/cenário/ata SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE final_decisions (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    summary_id              BINARY(16)      NULL,
    decision_text           TEXT            NOT NULL,
    rationale               TEXT            NULL,
    chosen_scenario_id      BINARY(16)      NULL,
    proposed_by_ai          BOOLEAN         NOT NULL DEFAULT FALSE,
    proposed_at             TIMESTAMP(6)    NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PROPOSTA',
    review_id               BINARY(16)      NULL,
    resulting_task_id       BINARY(16)      NULL,
    stamp_json              JSON            NULL,
    citations_json          JSON            NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_final_decisions__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_final_decisions__summary_id FOREIGN KEY (summary_id) REFERENCES analytical_summaries (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_final_decisions__chosen_scenario_id FOREIGN KEY (chosen_scenario_id) REFERENCES summary_scenarios (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_final_decisions__resulting_task_id FOREIGN KEY (resulting_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_final_decisions_status CHECK (status IN ('PROPOSTA', 'EM_REVISAO', 'VALIDADA', 'DEVOLVIDA', 'SUBSTITUIDA')),
    INDEX ix_final_decisions_session_status (session_id, status),
    INDEX ix_final_decisions_resulting_task (resulting_task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_reviews (DecisionReview — 5 DECIA sessão; RF15, RF29, RF42)
-- Revisões (filho da decisão → CASCADE); revisor RESTRICT (trilha).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_reviews (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    reviewer_id             BINARY(16)      NOT NULL,
    outcome                 VARCHAR(20)     NOT NULL,
    reason                  VARCHAR(1000)   NULL,
    reviewed_at             TIMESTAMP(6)    NOT NULL,
    notified_group_at       TIMESTAMP(6)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_reviews__decision_id FOREIGN KEY (decision_id) REFERENCES final_decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_reviews__reviewer_id FOREIGN KEY (reviewer_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_reviews_outcome CHECK (outcome IN ('VALIDADA', 'DEVOLVIDA')),
    INDEX ix_decision_reviews_decision_reviewed_at (decision_id, reviewed_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- reopen_requests (ReopenRequest — 5 DECIA sessão; RF14, RF29)
-- Pedidos de reabertura (filho da sessão/decisão → CASCADE). Quem pediu/decidiu RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE reopen_requests (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    requested_by            BINARY(16)      NULL,
    justification           VARCHAR(2000)   NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    votes_json              JSON            NULL,
    voting_deadline_at      TIMESTAMP(6)    NULL,
    decided_by              BINARY(16)      NULL,
    decided_at              TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_reopen_requests__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_reopen_requests__decision_id FOREIGN KEY (decision_id) REFERENCES final_decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_reopen_requests__requested_by FOREIGN KEY (requested_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_reopen_requests__decided_by FOREIGN KEY (decided_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_reopen_requests_status CHECK (status IN ('PENDENTE', 'ACEITA', 'RECUSADA')),
    INDEX ix_reopen_requests_decision_status (decision_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- session_artifacts (SessionArtifact — 5 DECIA sessão; RF13, RF29, RF33)
-- Artefatos (relatório, ata, checklist…). session_id opcional (origem pode ser esquema/aba/feed); solicitante
-- RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE session_artifacts (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NULL,
    origin_type             VARCHAR(20)     NOT NULL,
    origin_id               BINARY(16)      NULL,
    requested_by            BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    kind                    VARCHAR(20)     NOT NULL,
    title                   VARCHAR(200)    NOT NULL,
    instruction             TEXT            NULL,
    content_md              MEDIUMTEXT      NULL,
    media_object_id         BINARY(16)      NULL,
    goal_alignment_json     JSON            NULL,
    citations_json          JSON            NULL,
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'DEPARTAMENTO',
    access_class            VARCHAR(20)     NOT NULL DEFAULT 'INTERNO',
    status                  VARCHAR(20)     NOT NULL DEFAULT 'SOLICITADO',
    generated_at            TIMESTAMP(6)    NULL,
    ai_inference_id         BINARY(16)      NULL,
    notified_at             TIMESTAMP(6)    NULL,
    converted_task_id       BINARY(16)      NULL,
    supersedes_artifact_id  BINARY(16)      NULL,
    correlation_id          VARCHAR(64)     NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_session_artifacts__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_session_artifacts__requested_by FOREIGN KEY (requested_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_session_artifacts__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_session_artifacts__media_object_id FOREIGN KEY (media_object_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_session_artifacts__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_session_artifacts__converted_task_id FOREIGN KEY (converted_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_session_artifacts__supersedes_artifact_id FOREIGN KEY (supersedes_artifact_id) REFERENCES session_artifacts (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_session_artifacts_origin_type CHECK (origin_type IN ('ESQUEMA_TAREFA', 'ESQUEMA_PROJETO', 'CHAT_DECIA', 'CHAT_MENSAGERIA', 'ABA', 'FEED')),
    CONSTRAINT ck_session_artifacts_kind CHECK (kind IN ('RELATORIO', 'ATA', 'CHECKLIST', 'RESUMO_PDF', 'MINUTA_DOCUMENTO', 'PLANILHA', 'CRONOGRAMA', 'APRESENTACAO')),
    CONSTRAINT ck_session_artifacts_visibility CHECK (visibility IN ('PRIVADA', 'DEPARTAMENTO', 'EMPRESA', 'PUBLICA')),
    CONSTRAINT ck_session_artifacts_access_class CHECK (access_class IN ('PUBLICO', 'INTERNO', 'RESTRITO', 'SIGILOSO')),
    CONSTRAINT ck_session_artifacts_status CHECK (status IN ('SOLICITADO', 'GERANDO', 'GERADO', 'ARQUIVO_PRONTO', 'FALHA', 'BLOQUEADO_SIGILO', 'CONVERTIDO', 'SUBSTITUIDO')),
    INDEX ix_session_artifacts_session_kind (session_id, kind),
    INDEX ix_session_artifacts_requested_by_generated_at (requested_by, generated_at),
    INDEX ix_session_artifacts_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- meetings (Meeting — 5 DECIA sessão; RF37, RF29, RF42)
-- Reuniões gravadas/transcritas. Organizador RESTRICT; sessão/projeto/ata SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE meetings (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NULL,
    project_id              BINARY(16)      NULL,
    organizer_id            BINARY(16)      NOT NULL,
    title                   VARCHAR(200)    NOT NULL,
    started_at              TIMESTAMP(6)    NOT NULL,
    ended_at                TIMESTAMP(6)    NULL,
    source                  VARCHAR(20)     NOT NULL,
    audio_media_id          BINARY(16)      NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'GRAVANDO',
    minutes_task_id         BINARY(16)      NULL,
    follow_up_task_ids_json JSON            NULL,
    ratification_deadline_at TIMESTAMP(6)    NULL,
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_meetings__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_meetings__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_meetings__organizer_id FOREIGN KEY (organizer_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_meetings__audio_media_id FOREIGN KEY (audio_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_meetings__minutes_task_id FOREIGN KEY (minutes_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_meetings__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_meetings_source CHECK (source IN ('GRAVACAO_NAVEGADOR', 'ARQUIVO', 'TRANSCRICAO_COLADA')),
    CONSTRAINT ck_meetings_status CHECK (status IN ('GRAVANDO', 'TRANSCREVENDO', 'ATA_PROPOSTA', 'CONFIRMADA', 'CONTESTADA')),
    INDEX ix_meetings_organizer_started_at (organizer_id, started_at),
    INDEX ix_meetings_session (session_id),
    INDEX ix_meetings_project (project_id),
    INDEX ix_meetings_status (status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- meeting_transcripts (MeetingTranscript — 5 DECIA sessão; RF37)
-- Transcrição (uma por reunião, filho → CASCADE). Texto cifrado.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE meeting_transcripts (
    id                      BINARY(16)      NOT NULL,
    meeting_id              BINARY(16)      NOT NULL,
    text_enc                LONGTEXT        NOT NULL,
    segments_json           JSON            NULL,
    language                VARCHAR(10)     NOT NULL DEFAULT 'pt-BR',
    provider                VARCHAR(40)     NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_meeting_transcripts_meeting_id UNIQUE (meeting_id),
    CONSTRAINT fk_meeting_transcripts__meeting_id FOREIGN KEY (meeting_id) REFERENCES meetings (id)
        ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- recording_consents (RecordingConsent — 5 DECIA sessão; RF37, RF3)
-- Consentimento por reunião (filho → CASCADE); user_id RESTRICT (prova de consentimento, LGPD).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE recording_consents (
    id                      BINARY(16)      NOT NULL,
    meeting_id              BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    consented               BOOLEAN         NOT NULL DEFAULT FALSE,
    at                      TIMESTAMP(6)    NOT NULL,
    ip                      VARCHAR(45)     NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_recording_consents_meeting_user UNIQUE (meeting_id, user_id),
    CONSTRAINT fk_recording_consents__meeting_id FOREIGN KEY (meeting_id) REFERENCES meetings (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_recording_consents__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE project_schemes ADD CONSTRAINT fk_project_schemes__source_session_id FOREIGN KEY (source_session_id) REFERENCES decia_sessions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE project_scenarios ADD CONSTRAINT fk_project_scenarios__shared_in_session_id FOREIGN KEY (shared_in_session_id) REFERENCES decia_sessions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE divergences ADD CONSTRAINT fk_divergences__resolved_by_reply_id FOREIGN KEY (resolved_by_reply_id) REFERENCES divergence_replies (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE final_decisions ADD CONSTRAINT fk_final_decisions__review_id FOREIGN KEY (review_id) REFERENCES decision_reviews (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
