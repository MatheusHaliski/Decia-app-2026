-- V22 — rf29_decisao_estruturada (5b DECIA decisão estruturada). MySQL 8.4, InnoDB, utf8mb4_0900_ai_ci.
-- GERADA pelo SchemaGenerator a partir do catálogo de domínio (ws-domain, @DomainEntity/@Attr — D-40). Nunca edite depois de
-- aplicada: mudança = V22+. Convenções do V2 (D-23): ids BINARY(16); enums VARCHAR + CHECK ck_<tabela>_<coluna>; toda FK
-- fk_<tabela>__<coluna> com ON DELETE/ON UPDATE explícitos e linha em ForeignKeyPolicy.POLICY; nunca SET FOREIGN_KEY_CHECKS = 0.
-- Política de ON DELETE (SEGURANCA §2, D-41): dono → CASCADE; catálogo institucional e trilhas → RESTRICT; filho válido sem o pai
-- → SET NULL; ledgers/provas LGPD → RESTRICT em tudo.

-- ---------------------------------------------------------------------------------------------------------------
-- decisions (Decision — 5b DECIA decisão estruturada; RF29, RF12, RF15, RF31, RF33, RF43)
-- Decisões estruturadas (agregado raiz). Responsável/criador e catálogo institucional RESTRICT; sessão, projeto,
-- FinalDecision, alternativa selecionada e decisão substituída SET NULL. Apagar exige não haver snapshot/evento
-- (RESTRICT nos filhos).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decisions (
    id                      BINARY(16)      NOT NULL,
    title                   VARCHAR(160)    NOT NULL,
    question                VARCHAR(500)    NOT NULL,
    context_md              TEXT            NULL,
    objective               VARCHAR(1000)   NULL,
    constraints_md          TEXT            NULL,
    scope                   VARCHAR(1000)   NULL,
    stakeholders_json       JSON            NULL,
    resources_md            TEXT            NULL,
    dependencies_md         TEXT            NULL,
    target_date             DATE            NULL,
    owner_user_id           BINARY(16)      NOT NULL,
    created_by_user_id      BINARY(16)      NOT NULL,
    company_id              BINARY(16)      NOT NULL,
    department_id           BINARY(16)      NULL,
    session_id              BINARY(16)      NULL,
    project_id              BINARY(16)      NULL,
    final_decision_id       BINARY(16)      NULL,
    supersedes_decision_id  BINARY(16)      NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'RASCUNHO',
    complexity              VARCHAR(20)     NOT NULL DEFAULT 'PADRAO',
    kind                    VARCHAR(20)     NOT NULL,
    impact                  VARCHAR(20)     NOT NULL,
    urgency                 VARCHAR(20)     NOT NULL,
    visibility              VARCHAR(20)     NOT NULL DEFAULT 'PRIVADA',
    access_class            VARCHAR(20)     NOT NULL DEFAULT 'INTERNO',
    weighting_enabled       BOOLEAN         NOT NULL DEFAULT FALSE,
    independent_scoring     BOOLEAN         NOT NULL DEFAULT FALSE,
    template_key            VARCHAR(60)     NULL,
    selected_alternative_id BINARY(16)      NULL,
    decided_at              TIMESTAMP(6)    NULL,
    decision_confidence_pct INT             NULL,
    rationale               TEXT            NULL,
    review_every_days       INT             NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    version                 BIGINT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_decisions__owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decisions__created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decisions__company_id FOREIGN KEY (company_id) REFERENCES companies (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decisions__department_id FOREIGN KEY (department_id) REFERENCES departments (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decisions__session_id FOREIGN KEY (session_id) REFERENCES decia_sessions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decisions__project_id FOREIGN KEY (project_id) REFERENCES project_schemes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decisions__final_decision_id FOREIGN KEY (final_decision_id) REFERENCES final_decisions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decisions__supersedes_decision_id FOREIGN KEY (supersedes_decision_id) REFERENCES decisions (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decisions_status CHECK (status IN ('RASCUNHO', 'ENQUADRAMENTO', 'PESQUISA', 'COMPARACAO', 'AGUARDANDO_DECISAO', 'DECIDIDA', 'EM_EXECUCAO', 'RESOLVIDA', 'REVISADA', 'REABERTA', 'ARQUIVADA')),
    CONSTRAINT ck_decisions_complexity CHECK (complexity IN ('RAPIDA', 'PADRAO', 'PROFUNDA')),
    CONSTRAINT ck_decisions_kind CHECK (kind IN ('ESTRATEGICA', 'TATICA', 'OPERACIONAL', 'TECNICA', 'FINANCEIRA', 'PRODUTO', 'PESSOAS', 'CONTRATACAO', 'RISCO')),
    CONSTRAINT ck_decisions_impact CHECK (impact IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
    CONSTRAINT ck_decisions_urgency CHECK (urgency IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
    CONSTRAINT ck_decisions_visibility CHECK (visibility IN ('PRIVADA', 'DEPARTAMENTO', 'EMPRESA', 'PUBLICA')),
    CONSTRAINT ck_decisions_access_class CHECK (access_class IN ('PUBLICO', 'INTERNO', 'RESTRITO', 'SIGILOSO')),
    CONSTRAINT ck_decisions_c1 CHECK (decision_confidence_pct IS NULL OR (decision_confidence_pct BETWEEN 0 AND 100 AND MOD(decision_confidence_pct, 5) = 0)),
    CONSTRAINT ck_decisions_c2 CHECK (review_every_days IS NULL OR review_every_days > 0),
    INDEX ix_decisions_company_status (company_id, status),
    INDEX ix_decisions_owner_user_status (owner_user_id, status),
    INDEX ix_decisions_department_status (department_id, status),
    INDEX ix_decisions_session (session_id),
    INDEX ix_decisions_project (project_id),
    INDEX ix_decisions_final_decision (final_decision_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_participants (DecisionParticipant — 5b DECIA decisão estruturada; RF29, RF5)
-- Participantes (filho da decisão → CASCADE); usuário RESTRICT. Único (decisão, usuário).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_participants (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    user_id                 BINARY(16)      NOT NULL,
    role                    VARCHAR(20)     NOT NULL,
    joined_at               TIMESTAMP(6)    NOT NULL,
    assessments_submitted_at TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_participants_decision_user UNIQUE (decision_id, user_id),
    CONSTRAINT fk_decision_participants__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_participants__user_id FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_participants_role CHECK (role IN ('CONDUTOR', 'APROVADOR', 'CONTRIBUIDOR', 'INFORMADO')),
    INDEX ix_decision_participants_user_role (user_id, role)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_alternatives (DecisionAlternative — 5b DECIA decisão estruturada; RF29, RF11, RF31, RF43)
-- Alternativas (filho da decisão → CASCADE); cenário do resumo/simulador e inferência de IA SET NULL. Único
-- (decisão, rótulo).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_alternatives (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    label                   VARCHAR(4)      NOT NULL,
    title                   VARCHAR(160)    NOT NULL,
    description             TEXT            NULL,
    do_nothing              BOOLEAN         NOT NULL DEFAULT FALSE,
    pros_json               JSON            NULL,
    cons_json               JSON            NULL,
    estimated_cost          DECIMAL(14,2)   NULL,
    estimated_duration_days INT             NULL,
    dependencies_md         TEXT            NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVA',
    discard_reason          VARCHAR(500)    NULL,
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'HUMANO',
    ai_inference_id         BINARY(16)      NULL,
    summary_scenario_id     BINARY(16)      NULL,
    project_scenario_id     BINARY(16)      NULL,
    position                INT             NOT NULL DEFAULT 0,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_alternatives_decision_label UNIQUE (decision_id, label),
    CONSTRAINT fk_decision_alternatives__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_alternatives__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_alternatives__summary_scenario_id FOREIGN KEY (summary_scenario_id) REFERENCES summary_scenarios (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_alternatives__project_scenario_id FOREIGN KEY (project_scenario_id) REFERENCES project_scenarios (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_alternatives_status CHECK (status IN ('ATIVA', 'DESCARTADA')),
    CONSTRAINT ck_decision_alternatives_origin CHECK (origin IN ('HUMANO', 'IA', 'IMPORTADA')),
    CONSTRAINT ck_decision_alternatives_c1 CHECK (estimated_cost IS NULL OR estimated_cost >= 0),
    CONSTRAINT ck_decision_alternatives_c2 CHECK (estimated_duration_days IS NULL OR estimated_duration_days >= 0),
    CONSTRAINT ck_decision_alternatives_c3 CHECK (position >= 0),
    INDEX ix_decision_alternatives_decision_status_position (decision_id, status, position)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_criteria (DecisionCriterion — 5b DECIA decisão estruturada; RF29, RF31)
-- Critérios (filho da decisão → CASCADE); inferência de IA SET NULL. Peso DECIMAL(5,2) em 0–100. Único (decisão,
-- nome).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_criteria (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    name                    VARCHAR(120)    NOT NULL,
    description             VARCHAR(1000)   NULL,
    direction               VARCHAR(20)     NOT NULL DEFAULT 'MAIOR_MELHOR',
    weight_pct              DECIMAL(5,2)    NULL,
    catalog_key             VARCHAR(60)     NULL,
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'HUMANO',
    ai_inference_id         BINARY(16)      NULL,
    position                INT             NOT NULL DEFAULT 0,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_criteria_decision_name UNIQUE (decision_id, name),
    CONSTRAINT fk_decision_criteria__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_criteria__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_criteria_direction CHECK (direction IN ('MAIOR_MELHOR', 'MENOR_MELHOR')),
    CONSTRAINT ck_decision_criteria_origin CHECK (origin IN ('HUMANO', 'IA', 'IMPORTADA')),
    CONSTRAINT ck_decision_criteria_c1 CHECK (weight_pct IS NULL OR weight_pct BETWEEN 0 AND 100),
    CONSTRAINT ck_decision_criteria_c2 CHECK (position >= 0),
    INDEX ix_decision_criteria_decision_position (decision_id, position)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- criterion_assessments (CriterionAssessment — 5b DECIA decisão estruturada; RF29, RF31)
-- Uma linha por avaliador (filho da alternativa e do critério → CASCADE); avaliador RESTRICT. Nota 1–5 por
-- CHECK.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE criterion_assessments (
    id                      BINARY(16)      NOT NULL,
    alternative_id          BINARY(16)      NOT NULL,
    criterion_id            BINARY(16)      NOT NULL,
    assessor_user_id        BINARY(16)      NOT NULL,
    score                   INT             NOT NULL DEFAULT 0,
    rationale               VARCHAR(1000)   NULL,
    submitted_at            TIMESTAMP(6)    NOT NULL,
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'HUMANO',
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_criterion_assessments_alternative_criterion_assessor_user UNIQUE (alternative_id, criterion_id, assessor_user_id),
    CONSTRAINT fk_criterion_assessments__alternative_id FOREIGN KEY (alternative_id) REFERENCES decision_alternatives (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_criterion_assessments__criterion_id FOREIGN KEY (criterion_id) REFERENCES decision_criteria (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_criterion_assessments__assessor_user_id FOREIGN KEY (assessor_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_criterion_assessments_origin CHECK (origin IN ('HUMANO', 'IA', 'IMPORTADA')),
    CONSTRAINT ck_criterion_assessments_c1 CHECK (score BETWEEN 1 AND 5),
    INDEX ix_criterion_assessments_criterion (criterion_id),
    INDEX ix_criterion_assessments_assessor_user (assessor_user_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_evidence (DecisionEvidence — 5b DECIA decisão estruturada; RF29, RF33, RF41)
-- Evidências (filho da decisão → CASCADE); quem adicionou RESTRICT; arquivo, tarefa e inferência de IA SET NULL
-- (a fonte textual fica).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_evidence (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    nature                  VARCHAR(20)     NOT NULL,
    kind                    VARCHAR(30)     NOT NULL,
    title                   VARCHAR(200)    NOT NULL,
    summary                 TEXT            NOT NULL,
    source_label            VARCHAR(300)    NOT NULL,
    source_url              VARCHAR(2048)   NULL,
    media_id                BINARY(16)      NULL,
    task_id                 BINARY(16)      NULL,
    author_label            VARCHAR(200)    NULL,
    observed_at             TIMESTAMP(6)    NULL,
    retrieved_at            TIMESTAMP(6)    NULL,
    source_quality          VARCHAR(20)     NOT NULL,
    relevance               VARCHAR(20)     NOT NULL,
    reliability             VARCHAR(20)     NOT NULL,
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'HUMANO',
    ai_inference_id         BINARY(16)      NULL,
    added_by_user_id        BINARY(16)      NOT NULL,
    superseded_at           TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_evidence__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_evidence__media_id FOREIGN KEY (media_id) REFERENCES media_objects (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_evidence__task_id FOREIGN KEY (task_id) REFERENCES tasks (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_evidence__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_evidence__added_by_user_id FOREIGN KEY (added_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_evidence_nature CHECK (nature IN ('FATO', 'EVIDENCIA', 'OPINIAO')),
    CONSTRAINT ck_decision_evidence_kind CHECK (kind IN ('DOCUMENTO', 'METRICA', 'CONJUNTO_DADOS', 'PESQUISA', 'FEEDBACK_USUARIO', 'BENCHMARK', 'TESTE_TECNICO', 'OPINIAO_ESPECIALISTA', 'FONTE_EXTERNA', 'NORMA')),
    CONSTRAINT ck_decision_evidence_source_quality CHECK (source_quality IN ('PRIMARIA', 'SECUNDARIA', 'INTERNA', 'ESPECIALISTA', 'NAO_VERIFICADA')),
    CONSTRAINT ck_decision_evidence_relevance CHECK (relevance IN ('BAIXA', 'MEDIA', 'ALTA')),
    CONSTRAINT ck_decision_evidence_reliability CHECK (reliability IN ('BAIXA', 'MEDIA', 'ALTA')),
    CONSTRAINT ck_decision_evidence_origin CHECK (origin IN ('HUMANO', 'IA', 'IMPORTADA')),
    INDEX ix_decision_evidence_decision_superseded_at (decision_id, superseded_at),
    INDEX ix_decision_evidence_added_by_user (added_by_user_id),
    INDEX ix_decision_evidence_task (task_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_evidence_links (EvidenceLink — 5b DECIA decisão estruturada; RF29)
-- Ligações (filho da evidência → CASCADE). Alvo polimórfico (target_type + target_id) sem FK. Único (evidência,
-- alvo).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_evidence_links (
    id                      BINARY(16)      NOT NULL,
    evidence_id             BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    stance                  VARCHAR(20)     NOT NULL,
    note                    VARCHAR(500)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_evidence_links_evidence_target_type_target UNIQUE (evidence_id, target_type, target_id),
    CONSTRAINT fk_decision_evidence_links__evidence_id FOREIGN KEY (evidence_id) REFERENCES decision_evidence (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_evidence_links_target_type CHECK (target_type IN ('ALTERNATIVA', 'CRITERIO', 'PREMISSA', 'RISCO', 'AVALIACAO')),
    CONSTRAINT ck_decision_evidence_links_stance CHECK (stance IN ('SUSTENTA', 'CONTRADIZ', 'CONTEXTO')),
    INDEX ix_decision_evidence_links_target_type_target (target_type, target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_assumptions (DecisionAssumption — 5b DECIA decisão estruturada; RF29, RF31)
-- Premissas (filho da decisão → CASCADE); dono RESTRICT; alternativa e inferência de IA SET NULL. Confiança
-- 0–100 passo 5.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_assumptions (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    statement               VARCHAR(1000)   NOT NULL,
    importance              VARCHAR(20)     NOT NULL,
    confidence_pct          INT             NULL,
    validation_status       VARCHAR(20)     NOT NULL DEFAULT 'NAO_VALIDADA',
    owner_user_id           BINARY(16)      NULL,
    alternative_id          BINARY(16)      NULL,
    validation_note         VARCHAR(1000)   NULL,
    validated_at            TIMESTAMP(6)    NULL,
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'HUMANO',
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_assumptions__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_assumptions__owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_assumptions__alternative_id FOREIGN KEY (alternative_id) REFERENCES decision_alternatives (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_assumptions__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_assumptions_importance CHECK (importance IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
    CONSTRAINT ck_decision_assumptions_validation_status CHECK (validation_status IN ('NAO_VALIDADA', 'EM_VALIDACAO', 'VALIDADA', 'INVALIDADA')),
    CONSTRAINT ck_decision_assumptions_origin CHECK (origin IN ('HUMANO', 'IA', 'IMPORTADA')),
    CONSTRAINT ck_decision_assumptions_c1 CHECK (confidence_pct IS NULL OR (confidence_pct BETWEEN 0 AND 100 AND MOD(confidence_pct, 5) = 0)),
    INDEX ix_decision_assumptions_decision_importance_validation_status (decision_id, importance, validation_status),
    INDEX ix_decision_assumptions_alternative (alternative_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_risks (DecisionRisk — 5b DECIA decisão estruturada; RF29, RF43)
-- Riscos (filho da decisão → CASCADE); dono RESTRICT; alternativa e inferência de IA SET NULL. Severidade
-- calculada (sem coluna).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_risks (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    title                   VARCHAR(200)    NOT NULL,
    description             TEXT            NULL,
    alternative_id          BINARY(16)      NULL,
    likelihood              VARCHAR(20)     NOT NULL,
    impact                  VARCHAR(20)     NOT NULL,
    mitigation              TEXT            NULL,
    owner_user_id           BINARY(16)      NULL,
    source                  VARCHAR(20)     NOT NULL DEFAULT 'MANUAL',
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ABERTO',
    origin                  VARCHAR(20)     NOT NULL DEFAULT 'HUMANO',
    ai_inference_id         BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_risks__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_risks__alternative_id FOREIGN KEY (alternative_id) REFERENCES decision_alternatives (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_risks__owner_user_id FOREIGN KEY (owner_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_risks__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_risks_likelihood CHECK (likelihood IN ('RARA', 'POSSIVEL', 'PROVAVEL', 'QUASE_CERTA')),
    CONSTRAINT ck_decision_risks_impact CHECK (impact IN ('BAIXO', 'MEDIO', 'ALTO', 'CRITICO')),
    CONSTRAINT ck_decision_risks_source CHECK (source IN ('MANUAL', 'PRE_MORTEM', 'RED_TEAM', 'IA')),
    CONSTRAINT ck_decision_risks_status CHECK (status IN ('ABERTO', 'MITIGADO', 'ACEITO', 'OCORREU', 'ENCERRADO')),
    CONSTRAINT ck_decision_risks_origin CHECK (origin IN ('HUMANO', 'IA', 'IMPORTADA')),
    INDEX ix_decision_risks_decision_status (decision_id, status),
    INDEX ix_decision_risks_alternative (alternative_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_scenarios (DecisionScenario — 5b DECIA decisão estruturada; RF29, RF31)
-- Cenários (filho da decisão → CASCADE); alternativa e cenário do simulador SET NULL.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_scenarios (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    alternative_id          BINARY(16)      NULL,
    scenario_case           VARCHAR(20)     NOT NULL,
    description             TEXT            NOT NULL,
    likelihood              VARCHAR(20)     NOT NULL,
    assumption_ids_json     JSON            NULL,
    expected_result         VARCHAR(1000)   NOT NULL,
    project_scenario_id     BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_scenarios__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_scenarios__alternative_id FOREIGN KEY (alternative_id) REFERENCES decision_alternatives (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_scenarios__project_scenario_id FOREIGN KEY (project_scenario_id) REFERENCES project_scenarios (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_scenarios_scenario_case CHECK (scenario_case IN ('MELHOR', 'BASE', 'PIOR')),
    CONSTRAINT ck_decision_scenarios_likelihood CHECK (likelihood IN ('RARA', 'POSSIVEL', 'PROVAVEL', 'QUASE_CERTA')),
    INDEX ix_decision_scenarios_decision_alternative (decision_id, alternative_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_forecasts (DecisionForecast — 5b DECIA decisão estruturada; RF29)
-- Previsões (filho da decisão → CASCADE); previsor e quem resolveu RESTRICT; alternativa SET NULL. Probabilidade
-- 5–95 passo 5.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_forecasts (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    alternative_id          BINARY(16)      NULL,
    statement               VARCHAR(500)    NOT NULL,
    probability_pct         INT             NOT NULL DEFAULT 0,
    resolve_by              DATE            NOT NULL,
    forecaster_user_id      BINARY(16)      NOT NULL,
    resolution              VARCHAR(20)     NOT NULL DEFAULT 'PENDENTE',
    resolved_at             TIMESTAMP(6)    NULL,
    resolved_by_user_id     BINARY(16)      NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_forecasts__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_forecasts__alternative_id FOREIGN KEY (alternative_id) REFERENCES decision_alternatives (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_forecasts__forecaster_user_id FOREIGN KEY (forecaster_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_forecasts__resolved_by_user_id FOREIGN KEY (resolved_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_forecasts_resolution CHECK (resolution IN ('PENDENTE', 'OCORREU', 'NAO_OCORREU', 'ANULADA')),
    CONSTRAINT ck_decision_forecasts_c1 CHECK (probability_pct BETWEEN 5 AND 95 AND MOD(probability_pct, 5) = 0),
    INDEX ix_decision_forecasts_decision_resolution (decision_id, resolution),
    INDEX ix_decision_forecasts_forecaster_user_resolution (forecaster_user_id, resolution),
    INDEX ix_decision_forecasts_resolve_by (resolve_by)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_recommendations (DecisionRecommendation — 5b DECIA decisão estruturada; RF29, RF43)
-- Recomendações (filho da decisão → CASCADE); alternativa e inferência de IA SET NULL. Os 4 porquês são
-- obrigatórios no domínio.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_recommendations (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    alternative_id          BINARY(16)      NULL,
    source                  VARCHAR(20)     NOT NULL,
    reasoning_md            TEXT            NOT NULL,
    supporting_json         JSON            NOT NULL,
    contradicting_json      JSON            NOT NULL,
    critical_assumption_ids_json JSON            NOT NULL,
    limitations_md          TEXT            NOT NULL,
    what_would_change_md    TEXT            NOT NULL,
    model_version           VARCHAR(40)     NOT NULL,
    ai_inference_id         BINARY(16)      NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'SUGERIDA',
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_recommendations__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_recommendations__alternative_id FOREIGN KEY (alternative_id) REFERENCES decision_alternatives (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_recommendations__ai_inference_id FOREIGN KEY (ai_inference_id) REFERENCES ai_inference_log (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_recommendations_source CHECK (source IN ('MODELO', 'IA')),
    CONSTRAINT ck_decision_recommendations_status CHECK (status IN ('SUGERIDA', 'ACEITA', 'DESCARTADA')),
    INDEX ix_decision_recommendations_decision_status (decision_id, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_triggers (DecisionTrigger — 5b DECIA decisão estruturada; RF29)
-- Gatilhos (filho da decisão → CASCADE). Comparador restrito por CHECK; métrica opcional.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_triggers (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    condition_text          VARCHAR(1000)   NOT NULL,
    metric_key              VARCHAR(80)     NULL,
    comparator              VARCHAR(2)      NULL,
    threshold               DECIMAL(18,4)   NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'ATIVO',
    fired_at                TIMESTAMP(6)    NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_triggers__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_triggers_status CHECK (status IN ('ATIVO', 'DISPARADO', 'ARQUIVADO')),
    CONSTRAINT ck_decision_triggers_c1 CHECK (comparator IS NULL OR comparator IN ('<', '<=', '>', '>=', '=', '!=')),
    INDEX ix_decision_triggers_decision_status (decision_id, status),
    INDEX ix_decision_triggers_metric_key (metric_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_snapshots (DecisionSnapshot — 5b DECIA decisão estruturada; RF29, RF33)
-- APPEND-ONLY. Decisão RESTRICT (não se apaga decisão com histórico) e autor RESTRICT. Conteúdo canônico +
-- SHA-256 (G7).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_snapshots (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    kind                    VARCHAR(20)     NOT NULL,
    version_number          INT             NOT NULL DEFAULT 0,
    taken_at                TIMESTAMP(6)    NOT NULL,
    taken_by_user_id        BINARY(16)      NOT NULL,
    content_json            MEDIUMTEXT      NOT NULL,
    content_sha256          CHAR(64)        NOT NULL,
    rationale               TEXT            NOT NULL,
    confidence_pct          INT             NULL,
    selected_alternative_label VARCHAR(4)      NULL,
    model_version           VARCHAR(40)     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_snapshots_decision_version_number UNIQUE (decision_id, version_number),
    CONSTRAINT fk_decision_snapshots__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_snapshots__taken_by_user_id FOREIGN KEY (taken_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_snapshots_kind CHECK (kind IN ('DECISAO', 'REABERTURA', 'CHECKPOINT')),
    CONSTRAINT ck_decision_snapshots_c1 CHECK (CHAR_LENGTH(content_sha256) = 64),
    CONSTRAINT ck_decision_snapshots_c2 CHECK (version_number > 0),
    CONSTRAINT ck_decision_snapshots_c3 CHECK (confidence_pct IS NULL OR (confidence_pct BETWEEN 0 AND 100 AND MOD(confidence_pct, 5) = 0)),
    INDEX ix_decision_snapshots_decision_kind_taken_at (decision_id, kind, taken_at)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_checkpoints (DecisionCheckpoint — 5b DECIA decisão estruturada; RF29)
-- Checkpoints (filho da decisão → CASCADE); quem concluiu RESTRICT. Confiança depois 0–100 passo 5.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_checkpoints (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    due_at                  TIMESTAMP(6)    NOT NULL,
    kind                    VARCHAR(20)     NOT NULL,
    status                  VARCHAR(20)     NOT NULL DEFAULT 'AGENDADO',
    completed_at            TIMESTAMP(6)    NULL,
    completed_by_user_id    BINARY(16)      NULL,
    still_valid             BOOLEAN         NULL,
    assumptions_changed     BOOLEAN         NULL,
    new_evidence            BOOLEAN         NULL,
    confidence_pct_after    INT             NULL,
    action                  VARCHAR(20)     NULL,
    note                    VARCHAR(1000)   NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_checkpoints__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_checkpoints__completed_by_user_id FOREIGN KEY (completed_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_checkpoints_kind CHECK (kind IN ('PROGRAMADO', 'GATILHO')),
    CONSTRAINT ck_decision_checkpoints_status CHECK (status IN ('AGENDADO', 'CONCLUIDO', 'PERDIDO', 'CANCELADO')),
    CONSTRAINT ck_decision_checkpoints_action CHECK (action IS NULL OR action IN ('MANTER', 'AJUSTAR', 'REABRIR')),
    CONSTRAINT ck_decision_checkpoints_c1 CHECK (confidence_pct_after IS NULL OR (confidence_pct_after BETWEEN 0 AND 100 AND MOD(confidence_pct_after, 5) = 0)),
    INDEX ix_decision_checkpoints_decision_status_due_at (decision_id, status, due_at),
    INDEX ix_decision_checkpoints_due_at_status (due_at, status)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_outcomes (DecisionOutcome — 5b DECIA decisão estruturada; RF29, RF33)
-- Resultado (filho da decisão → CASCADE, único por decisão); quem registrou RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_outcomes (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    result                  VARCHAR(20)     NOT NULL,
    observed_at             TIMESTAMP(6)    NOT NULL,
    summary                 TEXT            NOT NULL,
    metrics_json            JSON            NULL,
    recorded_by_user_id     BINARY(16)      NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_outcomes_decision_id UNIQUE (decision_id),
    CONSTRAINT fk_decision_outcomes__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_outcomes__recorded_by_user_id FOREIGN KEY (recorded_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_outcomes_result CHECK (result IN ('SUCESSO', 'PARCIAL', 'FALHOU', 'CANCELADA', 'SUBSTITUIDA'))
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_retrospectives (DecisionRetrospective — 5b DECIA decisão estruturada; RF29, RF33)
-- Retrospectivas (filho da decisão → CASCADE); resultado SET NULL; revisor RESTRICT.
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_retrospectives (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    outcome_id              BINARY(16)      NULL,
    what_happened           TEXT            NOT NULL,
    what_expected           TEXT            NOT NULL,
    what_was_right          TEXT            NOT NULL,
    what_was_wrong          TEXT            NOT NULL,
    failed_assumption_ids_json JSON            NULL,
    process_quality         VARCHAR(20)     NOT NULL,
    lessons_md              TEXT            NOT NULL,
    share_as_lesson         BOOLEAN         NOT NULL DEFAULT FALSE,
    reviewed_by_user_id     BINARY(16)      NOT NULL,
    reviewed_at             TIMESTAMP(6)    NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    updated_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_retrospectives__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_retrospectives__outcome_id FOREIGN KEY (outcome_id) REFERENCES decision_outcomes (id)
        ON DELETE SET NULL ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_retrospectives__reviewed_by_user_id FOREIGN KEY (reviewed_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_retrospectives_process_quality CHECK (process_quality IN ('ADEQUADA', 'PARCIAL', 'INADEQUADA')),
    INDEX ix_decision_retrospectives_decision_reviewed_at (decision_id, reviewed_at),
    INDEX ix_decision_retrospectives_share_as_lesson (share_as_lesson)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_work_links (DecisionWorkLink — 5b DECIA decisão estruturada; RF29, RF21, RF41)
-- Ligações com o trabalho (filho da decisão → CASCADE); criador RESTRICT. Alvo polimórfico sem FK. Único
-- (decisão, alvo).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_work_links (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    target_type             VARCHAR(20)     NOT NULL,
    target_id               BINARY(16)      NOT NULL,
    created_by_user_id      BINARY(16)      NOT NULL,
    created_at              TIMESTAMP(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (id),
    CONSTRAINT ux_decision_work_links_decision_target_type_target UNIQUE (decision_id, target_type, target_id),
    CONSTRAINT fk_decision_work_links__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_work_links__created_by_user_id FOREIGN KEY (created_by_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_work_links_target_type CHECK (target_type IN ('TAREFA', 'PROJETO', 'MARCO')),
    INDEX ix_decision_work_links_target_type_target (target_type, target_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- decision_events (DecisionEvent — 5b DECIA decisão estruturada; RF29, RF43)
-- APPEND-ONLY. Decisão RESTRICT (histórico não se apaga) e ator RESTRICT (nulo = IA/sistema).
-- ---------------------------------------------------------------------------------------------------------------
CREATE TABLE decision_events (
    id                      BINARY(16)      NOT NULL,
    decision_id             BINARY(16)      NOT NULL,
    actor_user_id           BINARY(16)      NULL,
    type                    VARCHAR(30)     NOT NULL,
    payload_json            JSON            NULL,
    at                      TIMESTAMP(6)    NOT NULL,
    correlation_id          VARCHAR(64)     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_decision_events__decision_id FOREIGN KEY (decision_id) REFERENCES decisions (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_decision_events__actor_user_id FOREIGN KEY (actor_user_id) REFERENCES users (id)
        ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT ck_decision_events_type CHECK (type IN ('DECISAO_CRIADA', 'PROBLEMA_ENQUADRADO', 'ESTADO_ALTERADO', 'EVIDENCIA_ADICIONADA', 'EVIDENCIA_SUBSTITUIDA', 'ALTERNATIVA_CRIADA', 'ALTERNATIVA_DESCARTADA', 'CRITERIO_ATUALIZADO', 'AVALIACAO_REGISTRADA', 'PREMISSA_ATUALIZADA', 'RISCO_ALTERADO', 'RECOMENDACAO_GERADA', 'SUGESTAO_IA_ACEITA', 'SUGESTAO_IA_DESCARTADA', 'DECISAO_DESAFIADA', 'DECISAO_FINALIZADA', 'DECISAO_REABERTA', 'TRABALHO_VINCULADO', 'CHECKPOINT_VENCENDO', 'CHECKPOINT_CONCLUIDO', 'GATILHO_DISPARADO', 'RESULTADO_REGISTRADO', 'REVISAO_CONCLUIDA', 'DECISAO_ARQUIVADA')),
    INDEX ix_decision_events_decision_at (decision_id, at),
    INDEX ix_decision_events_type_at (type, at),
    INDEX ix_decision_events_actor_user_at (actor_user_id, at),
    INDEX ix_decision_events_correlation (correlation_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_0900_ai_ci;

-- ---------------------------------------------------------------------------------------------------------------
-- FKs cruzadas: tabelas criadas antes (ou fora do catálogo) que referenciam tabelas desta migration.
-- ---------------------------------------------------------------------------------------------------------------
ALTER TABLE decisions ADD CONSTRAINT fk_decisions__selected_alternative_id FOREIGN KEY (selected_alternative_id) REFERENCES decision_alternatives (id)
        ON DELETE SET NULL ON UPDATE RESTRICT;
