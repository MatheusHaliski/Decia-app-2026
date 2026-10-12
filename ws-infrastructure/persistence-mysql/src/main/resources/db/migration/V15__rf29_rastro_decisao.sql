-- V15 — rf29_rastro_decisao (6 Rastro de Decisão). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- decision_trace_nodes (DecisionTraceNode — 6 Rastro de Decisão; RF29, RF22, RF38, RF41, RF45)
-- Nós do rastro (imutáveis, só INSERT). RESTRICT em sessão e ator: o rastro nunca cascateia.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_trace_nodes (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    node_type               VARCHAR(20)     NOT NULL,
    ref_id                  BINARY(16)      NOT NULL,
    label                   VARCHAR(300)    NOT NULL,
    class_label             VARCHAR(20)     NULL,
    actor_id                BINARY(16)      NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    snapshot_json           JSON            NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_trace_nodes__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_trace_nodes__actor_id FOREIGN KEY (actor_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_trace_nodes_node_type CHECK (node_type IN ('MENSAGEM', 'CLASSIFICACAO', 'DIVERGENCIA', 'PERGUNTA', 'RESUMO', 'CENARIO', 'DECISAO', 'REVISAO', 'TAREFA', 'PROJETO', 'ARTEFATO', 'ATA_VIVA', 'CONFORMIDADE')),
    CONSTRAINT ck_decision_trace_nodes_class_label CHECK (class_label IS NULL OR class_label IN ('ARGUMENTO', 'DIVERGENCIA', 'RISCO', 'CONSENSO', 'PERGUNTA', 'RUIDO')),
    INDEX ix_decision_trace_nodes_session_at (session_id, at),
    INDEX ix_decision_trace_nodes_node_type_ref (node_type, ref_id),
    INDEX ix_decision_trace_nodes_actor (actor_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_trace_edges (DecisionTraceEdge — 6 Rastro de Decisão; RF29, RF22, RF41)
-- Arestas do rastro (imutáveis). RESTRICT nos nós.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_trace_edges (
    id                      BINARY(16)      NOT NULL,
    from_node_id            BINARY(16)      NOT NULL,
    to_node_id              BINARY(16)      NOT NULL,
    relation                VARCHAR(20)     NOT NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_trace_edges_from_node_to_node_relation UNIQUE (from_node_id, to_node_id, relation),
    CONSTRAINT fk_decision_trace_edges__from_node_id FOREIGN KEY (from_node_id) REFERENCES decision_trace_nodes (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_trace_edges__to_node_id FOREIGN KEY (to_node_id) REFERENCES decision_trace_nodes (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_trace_edges_relation CHECK (relation IN ('ORIGINOU', 'CLASSIFICOU', 'RESPONDEU', 'RESUMIU', 'DECIDIU', 'REVISOU', 'TRANSFORMOU_EM', 'ANEXOU', 'VERIFICOU')),
    INDEX ix_decision_trace_edges_to_node (to_node_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- session_archives (SessionArchive — 6 Rastro de Decisão; RF17, RF18, RF33)
-- Um arquivo por sessão encerrada. RESTRICT na sessão (o histórico segura a sessão); mídias SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE session_archives (
    id                      BINARY(16)      NOT NULL,
    session_id              BINARY(16)      NOT NULL,
    export_json_media_id    BINARY(16)      NULL,
    export_pdf_media_id     BINARY(16)      NULL,
    message_count           INT             NOT NULL DEFAULT 0,
    checksum                CHAR(64)        NOT NULL,
    archived_at             TIMESTAMP(6)    NOT NULL,
    closed_without_decision BOOLEAN         NOT NULL DEFAULT FALSE,
    close_reason            VARCHAR(500)    NULL,
    analytics_snapshot_json JSON            NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_session_archives_session_id UNIQUE (session_id),
    CONSTRAINT fk_session_archives__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_session_archives__export_json_media_id FOREIGN KEY (export_json_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_session_archives__export_pdf_media_id FOREIGN KEY (export_pdf_media_id) REFERENCES media_objects (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    INDEX ix_session_archives_archived_at (archived_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- handoff_dossiers (HandoffDossier — 6 Rastro de Decisão; RF36, RF25, RF28)
-- Dossiês de transição. Pessoas RESTRICT (trilha institucional); agrupamento, documento e projeto gerados SET
-- NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE handoff_dossiers (
    id                      BINARY(16)      NOT NULL,
    subject_type            VARCHAR(20)     NOT NULL,
    subject_user_id         BINARY(16)      NULL,
    grouping_id             BINARY(16)      NULL,
    requested_by            BINARY(16)      NOT NULL,
    reason                  VARCHAR(20)     NOT NULL,
    generated_at            TIMESTAMP(6)    NOT NULL,
    content_json            JSON            NOT NULL,
    document_task_id        BINARY(16)      NULL,
    transition_project_id   BINARY(16)      NULL,
    successor_user_id       BINARY(16)      NULL,
    successor_accepted_at   TIMESTAMP(6)    NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'GERADO',
    consent_for_private_items BOOLEAN         NOT NULL DEFAULT FALSE,
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_handoff_dossiers__subject_user_id FOREIGN KEY (subject_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_dossiers__grouping_id FOREIGN KEY (grouping_id) REFERENCES groupings (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_dossiers__requested_by FOREIGN KEY (requested_by) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_dossiers__document_task_id FOREIGN KEY (document_task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_dossiers__transition_project_id FOREIGN KEY (transition_project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_dossiers__successor_user_id FOREIGN KEY (successor_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_dossiers__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_handoff_dossiers_subject_type CHECK (subject_type IN ('EMPREGADO', 'GESTAO')),
    CONSTRAINT ck_handoff_dossiers_reason CHECK (reason IN ('SAIDA', 'TRANSFERENCIA', 'FIM_GESTAO', 'TROCA_CHEFE')),
    CONSTRAINT ck_handoff_dossiers_status CHECK (status IN ('GERADO', 'AGUARDANDO_SUCESSOR', 'TRANSFERIDO', 'RECUSADO', 'CANCELADO')),
    INDEX ix_handoff_dossiers_subject_user_status (subject_user_id, status),
    INDEX ix_handoff_dossiers_grouping (grouping_id),
    INDEX ix_handoff_dossiers_successor_user (successor_user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- handoff_items (HandoffItem — 6 Rastro de Decisão; RF36)
-- Itens do dossiê (filho → CASCADE). Responsáveis RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE handoff_items (
    id                      BINARY(16)      NOT NULL,
    dossier_id              BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    previous_responsible_id BINARY(16)      NULL,
    new_responsible_id      BINARY(16)      NULL,
    transferred_at          TIMESTAMP(6)    NULL,
    note                    VARCHAR(500)    NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_handoff_items__dossier_id FOREIGN KEY (dossier_id) REFERENCES handoff_dossiers (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_items__previous_responsible_id FOREIGN KEY (previous_responsible_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_handoff_items__new_responsible_id FOREIGN KEY (new_responsible_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_handoff_items_target_type CHECK (target_type IN ('TASK', 'PROJECT', 'SESSION', 'REVIEW')),
    INDEX ix_handoff_items_dossier (dossier_id),
    INDEX ix_handoff_items_target_type_target (target_type, target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE project_tasks ADD CONSTRAINT fk_project_tasks__decision_trace_node_id FOREIGN KEY (decision_trace_node_id) REFERENCES decision_trace_nodes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;

ALTER TABLE groupings ADD CONSTRAINT fk_groupings__handoff_dossier_id FOREIGN KEY (handoff_dossier_id) REFERENCES handoff_dossiers (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
