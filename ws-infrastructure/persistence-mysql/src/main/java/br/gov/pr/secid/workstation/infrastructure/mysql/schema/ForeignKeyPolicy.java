package br.gov.pr.secid.workstation.infrastructure.mysql.schema;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.Stream;

/**
 * Política de integridade referencial por domínio (Bloco 2, D-23): toda FK do schema tem uma entrada aqui com a regra
 * de {@code ON DELETE} esperada, e o {@code ForeignKeyPolicyTest} compara esta lista com o que o MySQL realmente tem
 * (INFORMATION_SCHEMA) depois de rodar todas as migrations. FK no banco sem entrada, entrada sem FK ou regra diferente
 * quebram o {@code mvn verify} — a política nasce junto com a tabela, nunca é "arrumada depois".
 *
 * <p>Regras (comentário do {@code V2__baseline_dominio_base.sql}): dado de quem é dono → {@code CASCADE}; catálogo
 * institucional → {@code RESTRICT}; filho que continua válido sem o pai → {@code SET NULL} (só nesse caso); trilhas
 * append-only ({@code audit_log}, {@code ai_inference_log}) → {@code RESTRICT}; conta REAL é anonimizada, não apagada.
 *
 * <p>Cada migration que cria ou altera uma FK acrescenta/ajusta a linha correspondente em {@link #POLICY} no mesmo commit.
 */
public final class ForeignKeyPolicy {

    private static final Pattern IDENT = Pattern.compile("[a-z][a-z0-9_]{0,63}");
    private static final Set<String> ON_DELETE = Set.of("CASCADE", "RESTRICT", "SET NULL");
    private static final int MAX_CONSTRAINT_NAME = 64;

    private static final String READ_SQL = """
            SELECT k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.DELETE_RULE
              FROM information_schema.KEY_COLUMN_USAGE k
              JOIN information_schema.REFERENTIAL_CONSTRAINTS r
                ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
               AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
               AND r.TABLE_NAME = k.TABLE_NAME
             WHERE k.TABLE_SCHEMA = ?
               AND k.REFERENCED_TABLE_NAME IS NOT NULL
             ORDER BY k.TABLE_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME
            """;

    private ForeignKeyPolicy() {
    }

    /**
     * Uma chave estrangeira de uma coluna: {@code table.column → refTable.refColumn ON DELETE onDelete}.
     * Identificadores só em minúsculas, dígitos e sublinhado (≤ 64, como o MySQL); {@code NO ACTION} é normalizado para
     * {@code RESTRICT} porque no InnoDB os dois são checados na hora e são a mesma coisa.
     */
    public record Fk(String table, String column, String refTable, String refColumn, String onDelete) {

        public Fk {
            for (String s : new String[] {table, column, refTable, refColumn}) {
                if (s == null || !IDENT.matcher(s).matches()) {
                    throw new IllegalArgumentException("identificador inválido: " + s);
                }
            }
            onDelete = normalizeRule(onDelete);
            if (!ON_DELETE.contains(onDelete)) {
                throw new IllegalArgumentException("ON DELETE inválido: " + onDelete + " (esperado CASCADE, RESTRICT ou SET NULL)");
            }
        }

        /** Atalho para a forma mais comum: referência à coluna {@code id} do pai. */
        public Fk(String table, String column, String refTable, String onDelete) {
            this(table, column, refTable, "id", onDelete);
        }

        /** Nome da constraint pela convenção do projeto: {@code fk_<tabela>__<coluna>} (cabe nos 64 do MySQL). */
        public String constraintName() {
            String name = "fk_" + table + "__" + column;
            if (name.length() > MAX_CONSTRAINT_NAME) {
                throw new IllegalStateException("nome de constraint maior que 64: " + name);
            }
            return name;
        }

        /** Identidade da FK sem a regra: é por ela que a política e o banco são casados. */
        public String key() {
            return table + "." + column + "->" + refTable + "." + refColumn;
        }

        @Override
        public String toString() {
            return table + "." + column + " → " + refTable + "." + refColumn + " ON DELETE " + onDelete;
        }
    }

    /** Entrada presente nos dois lados com regra diferente. */
    public record Divergence(Fk expected, Fk actual) {
        @Override
        public String toString() {
            return expected.key() + ": política " + expected.onDelete() + " × banco " + actual.onDelete();
        }
    }

    /**
     * Resultado de {@link #compare(List, List)}: {@code missing} está na política e não no banco; {@code extra} está no
     * banco e não na política; {@code divergent} está nos dois com regra diferente.
     */
    public record Diff(List<Fk> missing, List<Fk> extra, List<Divergence> divergent) {

        public Diff {
            missing = List.copyOf(missing);
            extra = List.copyOf(extra);
            divergent = List.copyOf(divergent);
        }

        public boolean isEmpty() {
            return missing.isEmpty() && extra.isEmpty() && divergent.isEmpty();
        }

        /** Texto pronto para a mensagem de falha do teste. */
        public String describe() {
            if (isEmpty()) {
                return "política e banco iguais";
            }
            StringBuilder sb = new StringBuilder();
            if (!missing.isEmpty()) {
                sb.append("FK na POLICY ausente no banco: ").append(missing).append('\n');
            }
            if (!extra.isEmpty()) {
                sb.append("FK no banco sem entrada na POLICY: ").append(extra).append('\n');
            }
            if (!divergent.isEmpty()) {
                sb.append("regra ON DELETE diferente: ").append(divergent).append('\n');
            }
            return sb.toString().trim();
        }
    }

    /**
     * FKs do {@code V2__baseline_dominio_base.sql} (Bloco 2) e {@code V3__rf1_rf2_autenticacao.sql} (Bloco 3), escritas à mão.
     */
    private static final List<Fk> BASELINE_V2 = List.of(
            // → users (dono dos dados: CASCADE; trilhas append-only: RESTRICT)
            new Fk("user_preferences", "user_id", "users", "CASCADE"),
            new Fk("refresh_tokens", "user_id", "users", "CASCADE"),
            new Fk("media_objects", "owner_id", "users", "CASCADE"),
            new Fk("verification_codes", "user_id", "users", "CASCADE"),        // V3 (RF1/RF2): código é dado do dono
            new Fk("audit_log", "actor_id", "users", "RESTRICT"),
            new Fk("ai_inference_log", "user_id", "users", "RESTRICT"),
            new Fk("ai_inference_log", "reviewed_by", "users", "RESTRICT"),
            // → refresh_tokens (o token rotacionado continua válido sem o anterior)
            new Fk("refresh_tokens", "rotated_from_id", "refresh_tokens", "SET NULL")
    );

    // >>> gerado pelo SchemaGenerator (ws-domain) a partir do DomainCatalog — não edite à mão
    private static final List<Fk> GENERATED = List.of(
            // V10 — rf28_institucional_lgpd
            new Fk("companies", "owner_user_id", "users", "RESTRICT"),
            new Fk("companies", "ranking_weights_id", "ranking_weights", "SET NULL"),
            new Fk("departments", "company_id", "companies", "RESTRICT"),
            new Fk("departments", "head_user_id", "users", "RESTRICT"),
            new Fk("department_memberships", "user_id", "users", "CASCADE"),
            new Fk("department_memberships", "department_id", "departments", "RESTRICT"),
            new Fk("curator_appointments", "department_id", "departments", "RESTRICT"),
            new Fk("curator_appointments", "curator_user_id", "users", "CASCADE"),
            new Fk("curator_appointments", "appointed_by", "users", "RESTRICT"),
            new Fk("approval_requests", "user_id", "users", "CASCADE"),
            new Fk("approval_requests", "confirmed_by", "users", "RESTRICT"),
            new Fk("approval_requests", "reviewed_by", "users", "RESTRICT"),
            new Fk("pending_uploads", "consumed_by_user_id", "users", "SET NULL"),
            new Fk("user_empresa_ext", "user_id", "users", "CASCADE"),
            new Fk("user_empresa_ext", "representation_doc_id", "media_objects", "SET NULL"),
            new Fk("user_chefe_ext", "user_id", "users", "CASCADE"),
            new Fk("user_chefe_ext", "company_id", "companies", "RESTRICT"),
            new Fk("user_chefe_ext", "department_id", "departments", "RESTRICT"),
            new Fk("policy_documents", "published_by", "users", "RESTRICT"),
            new Fk("policy_acceptances", "user_id", "users", "RESTRICT"),
            new Fk("consent_events", "user_id", "users", "RESTRICT"),
            new Fk("user_consents", "user_id", "users", "RESTRICT"),
            new Fk("user_consents", "last_event_id", "consent_events", "SET NULL"),
            new Fk("data_subject_requests", "user_id", "users", "RESTRICT"),
            new Fk("data_subject_requests", "assignee_id", "users", "RESTRICT"),
            new Fk("data_export_requests", "user_id", "users", "CASCADE"),
            new Fk("data_export_requests", "job_id", "pipeline_jobs", "SET NULL"),
            new Fk("users", "company_id", "companies", "RESTRICT"),
            new Fk("users", "department_id", "departments", "RESTRICT"),
            new Fk("ai_inference_log", "department_id", "departments", "RESTRICT"),
            // V11 — rf41_acervo_tarefas
            new Fk("legal_deadline_rules", "company_id", "companies", "RESTRICT"),
            new Fk("tasks", "owner_id", "users", "CASCADE"),
            new Fk("tasks", "department_id", "departments", "RESTRICT"),
            new Fk("tasks", "org_entity_id", "org_entities", "RESTRICT"),
            new Fk("tasks", "responsible_id", "users", "SET NULL"),
            new Fk("tasks", "legal_deadline_rule_id", "legal_deadline_rules", "SET NULL"),
            new Fk("tasks", "blocked_by_task_id", "tasks", "SET NULL"),
            new Fk("tasks", "blocked_by_user_id", "users", "SET NULL"),
            new Fk("tasks", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("tasks", "original_task_id", "tasks", "SET NULL"),
            new Fk("tasks", "source_project_id", "project_schemes", "SET NULL"),
            new Fk("tasks", "checklist_item_id", "compliance_items", "SET NULL"),
            new Fk("task_attachments", "task_id", "tasks", "CASCADE"),
            new Fk("task_attachments", "media_object_id", "media_objects", "RESTRICT"),
            new Fk("task_versions", "task_id", "tasks", "CASCADE"),
            new Fk("task_versions", "snapshot_media_id", "media_objects", "SET NULL"),
            new Fk("task_state_log", "task_id", "tasks", "CASCADE"),
            new Fk("task_state_log", "actor_id", "users", "RESTRICT"),
            new Fk("task_state_log", "project_id", "project_schemes", "SET NULL"),
            new Fk("evidences", "owner_id", "users", "CASCADE"),
            new Fk("evidences", "media_object_id", "media_objects", "RESTRICT"),
            new Fk("evidences", "linked_task_id", "tasks", "SET NULL"),
            new Fk("evidences", "linked_project_id", "project_schemes", "SET NULL"),
            new Fk("evidences", "derived_task_id", "tasks", "SET NULL"),
            // V12 — rf21_criador_projetos
            new Fk("project_schemes", "owner_id", "users", "CASCADE"),
            new Fk("project_schemes", "company_id", "companies", "RESTRICT"),
            new Fk("project_schemes", "department_id", "departments", "RESTRICT"),
            new Fk("project_schemes", "original_project_id", "project_schemes", "SET NULL"),
            new Fk("project_schemes", "source_session_id", "decia_sessions", "SET NULL"),
            new Fk("project_schemes", "program_grouping_id", "groupings", "SET NULL"),
            new Fk("project_schemes", "exercise_grouping_id", "groupings", "SET NULL"),
            new Fk("project_schemes", "management_grouping_id", "groupings", "SET NULL"),
            new Fk("project_schemes", "plan_axis_id", "plan_axes", "SET NULL"),
            new Fk("project_schemes", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("project_tasks", "project_id", "project_schemes", "CASCADE"),
            new Fk("project_tasks", "task_id", "tasks", "SET NULL"),
            new Fk("project_tasks", "responsible_id", "users", "SET NULL"),
            new Fk("project_tasks", "decision_trace_node_id", "decision_trace_nodes", "SET NULL"),
            new Fk("project_task_dependencies", "project_id", "project_schemes", "CASCADE"),
            new Fk("project_task_dependencies", "predecessor_project_task_id", "project_tasks", "CASCADE"),
            new Fk("project_task_dependencies", "successor_project_task_id", "project_tasks", "CASCADE"),
            new Fk("project_scenarios", "project_id", "project_schemes", "CASCADE"),
            new Fk("project_scenarios", "author_id", "users", "CASCADE"),
            new Fk("project_scenarios", "applied_version_id", "project_versions", "SET NULL"),
            new Fk("project_scenarios", "shared_in_session_id", "decia_sessions", "SET NULL"),
            new Fk("project_scenarios", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("project_versions", "project_id", "project_schemes", "CASCADE"),
            new Fk("project_versions", "author_id", "users", "RESTRICT"),
            new Fk("project_versions", "restored_from_version_id", "project_versions", "SET NULL"),
            new Fk("project_versions", "source_scenario_id", "project_scenarios", "SET NULL"),
            new Fk("compliance_checklists", "company_id", "companies", "RESTRICT"),
            new Fk("compliance_checklists", "department_id", "departments", "RESTRICT"),
            new Fk("compliance_items", "checklist_id", "compliance_checklists", "CASCADE"),
            new Fk("compliance_items", "must_precede_item_id", "compliance_items", "SET NULL"),
            new Fk("compliance_results", "project_id", "project_schemes", "CASCADE"),
            new Fk("compliance_results", "checklist_id", "compliance_checklists", "RESTRICT"),
            new Fk("compliance_results", "override_by_user_id", "users", "RESTRICT"),
            new Fk("compliance_results", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("process_kits", "owner_id", "users", "CASCADE"),
            new Fk("process_kits", "department_id", "departments", "RESTRICT"),
            new Fk("kit_items", "kit_id", "process_kits", "CASCADE"),
            new Fk("kit_items", "task_id", "tasks", "CASCADE"),
            new Fk("team_desks", "department_id", "departments", "RESTRICT"),
            new Fk("team_desks", "updated_by", "users", "RESTRICT"),
            new Fk("desk_notes", "author_id", "users", "CASCADE"),
            // V13 — rf24_planejamento
            new Fk("annual_plans", "owner_id", "users", "CASCADE"),
            new Fk("annual_plans", "company_id", "companies", "RESTRICT"),
            new Fk("annual_plans", "department_id", "departments", "RESTRICT"),
            new Fk("annual_plans", "derived_from_plan_id", "annual_plans", "SET NULL"),
            new Fk("plan_axes", "plan_id", "annual_plans", "CASCADE"),
            new Fk("plan_axis_projects", "plan_id", "annual_plans", "CASCADE"),
            new Fk("plan_axis_projects", "axis_id", "plan_axes", "CASCADE"),
            new Fk("plan_axis_projects", "project_id", "project_schemes", "CASCADE"),
            new Fk("plan_axis_projects", "linked_by", "users", "RESTRICT"),
            new Fk("groupings", "owner_id", "users", "CASCADE"),
            new Fk("groupings", "company_id", "companies", "RESTRICT"),
            new Fk("groupings", "department_id", "departments", "RESTRICT"),
            new Fk("groupings", "handoff_dossier_id", "handoff_dossiers", "SET NULL"),
            new Fk("grouping_items", "grouping_id", "groupings", "CASCADE"),
            // V14 — rf4_decia_sessao
            new Fk("decia_sessions", "admin_user_id", "users", "RESTRICT"),
            new Fk("decia_sessions", "created_by_user_id", "users", "RESTRICT"),
            new Fk("decia_sessions", "company_id", "companies", "RESTRICT"),
            new Fk("decia_sessions", "department_id", "departments", "RESTRICT"),
            new Fk("decia_sessions", "linked_project_id", "project_schemes", "SET NULL"),
            new Fk("decia_sessions", "plan_axis_id", "plan_axes", "SET NULL"),
            new Fk("decia_sessions", "archive_media_id", "media_objects", "SET NULL"),
            new Fk("session_participants", "session_id", "decia_sessions", "CASCADE"),
            new Fk("session_participants", "user_id", "users", "RESTRICT"),
            new Fk("session_participants", "added_by", "users", "RESTRICT"),
            new Fk("session_participants", "removed_by", "users", "RESTRICT"),
            new Fk("message_classifications", "session_id", "decia_sessions", "CASCADE"),
            new Fk("message_classifications", "linked_task_id", "tasks", "SET NULL"),
            new Fk("message_classifications", "linked_project_id", "project_schemes", "SET NULL"),
            new Fk("message_classifications", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("message_classifications", "confirmed_by_user_id", "users", "RESTRICT"),
            new Fk("session_messages_idx", "session_id", "decia_sessions", "CASCADE"),
            new Fk("session_messages_idx", "author_id", "users", "RESTRICT"),
            new Fk("session_messages_idx", "classification_id", "message_classifications", "SET NULL"),
            new Fk("message_attachments", "session_id", "decia_sessions", "CASCADE"),
            new Fk("divergences", "session_id", "decia_sessions", "CASCADE"),
            new Fk("divergences", "resolved_by_reply_id", "divergence_replies", "SET NULL"),
            new Fk("divergences", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("divergence_replies", "divergence_id", "divergences", "CASCADE"),
            new Fk("divergence_replies", "author_id", "users", "RESTRICT"),
            new Fk("ai_questions", "session_id", "decia_sessions", "CASCADE"),
            new Fk("ai_questions", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("analytical_summaries", "session_id", "decia_sessions", "CASCADE"),
            new Fk("analytical_summaries", "compliance_result_id", "compliance_results", "SET NULL"),
            new Fk("analytical_summaries", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("summary_scenarios", "summary_id", "analytical_summaries", "CASCADE"),
            new Fk("summary_scenarios", "linked_project_scenario_id", "project_scenarios", "SET NULL"),
            new Fk("final_decisions", "session_id", "decia_sessions", "CASCADE"),
            new Fk("final_decisions", "summary_id", "analytical_summaries", "SET NULL"),
            new Fk("final_decisions", "chosen_scenario_id", "summary_scenarios", "SET NULL"),
            new Fk("final_decisions", "review_id", "decision_reviews", "SET NULL"),
            new Fk("final_decisions", "resulting_task_id", "tasks", "SET NULL"),
            new Fk("decision_reviews", "decision_id", "final_decisions", "CASCADE"),
            new Fk("decision_reviews", "reviewer_id", "users", "RESTRICT"),
            new Fk("reopen_requests", "session_id", "decia_sessions", "CASCADE"),
            new Fk("reopen_requests", "decision_id", "final_decisions", "CASCADE"),
            new Fk("reopen_requests", "requested_by", "users", "RESTRICT"),
            new Fk("reopen_requests", "decided_by", "users", "RESTRICT"),
            new Fk("session_artifacts", "session_id", "decia_sessions", "CASCADE"),
            new Fk("session_artifacts", "requested_by", "users", "RESTRICT"),
            new Fk("session_artifacts", "department_id", "departments", "RESTRICT"),
            new Fk("session_artifacts", "media_object_id", "media_objects", "SET NULL"),
            new Fk("session_artifacts", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("session_artifacts", "converted_task_id", "tasks", "SET NULL"),
            new Fk("session_artifacts", "supersedes_artifact_id", "session_artifacts", "SET NULL"),
            new Fk("meetings", "session_id", "decia_sessions", "SET NULL"),
            new Fk("meetings", "project_id", "project_schemes", "SET NULL"),
            new Fk("meetings", "organizer_id", "users", "RESTRICT"),
            new Fk("meetings", "audio_media_id", "media_objects", "SET NULL"),
            new Fk("meetings", "minutes_task_id", "tasks", "SET NULL"),
            new Fk("meetings", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("meeting_transcripts", "meeting_id", "meetings", "CASCADE"),
            new Fk("recording_consents", "meeting_id", "meetings", "CASCADE"),
            new Fk("recording_consents", "user_id", "users", "RESTRICT"),
            // V15 — rf29_rastro_decisao
            new Fk("decision_trace_nodes", "session_id", "decia_sessions", "RESTRICT"),
            new Fk("decision_trace_nodes", "actor_id", "users", "RESTRICT"),
            new Fk("decision_trace_edges", "from_node_id", "decision_trace_nodes", "RESTRICT"),
            new Fk("decision_trace_edges", "to_node_id", "decision_trace_nodes", "RESTRICT"),
            new Fk("session_archives", "session_id", "decia_sessions", "RESTRICT"),
            new Fk("session_archives", "export_json_media_id", "media_objects", "SET NULL"),
            new Fk("session_archives", "export_pdf_media_id", "media_objects", "SET NULL"),
            new Fk("handoff_dossiers", "subject_user_id", "users", "RESTRICT"),
            new Fk("handoff_dossiers", "grouping_id", "groupings", "SET NULL"),
            new Fk("handoff_dossiers", "requested_by", "users", "RESTRICT"),
            new Fk("handoff_dossiers", "document_task_id", "tasks", "SET NULL"),
            new Fk("handoff_dossiers", "transition_project_id", "project_schemes", "SET NULL"),
            new Fk("handoff_dossiers", "successor_user_id", "users", "RESTRICT"),
            new Fk("handoff_dossiers", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("handoff_items", "dossier_id", "handoff_dossiers", "CASCADE"),
            new Fk("handoff_items", "previous_responsible_id", "users", "RESTRICT"),
            new Fk("handoff_items", "new_responsible_id", "users", "RESTRICT"),
            // V16 — rf27_social
            new Fk("reactions", "actor_id", "users", "CASCADE"),
            new Fk("comments", "author_id", "users", "CASCADE"),
            new Fk("comments", "parent_comment_id", "comments", "SET NULL"),
            new Fk("comments", "deleted_by", "users", "RESTRICT"),
            new Fk("saved_items", "user_id", "users", "CASCADE"),
            new Fk("shares", "actor_id", "users", "CASCADE"),
            new Fk("shares", "session_id", "decia_sessions", "SET NULL"),
            new Fk("shares", "image_media_id", "media_objects", "SET NULL"),
            new Fk("remixes", "actor_id", "users", "CASCADE"),
            new Fk("remixes", "model_offer_id", "model_offers", "SET NULL"),
            new Fk("remixes", "ledger_entry_id", "decia_points_ledger", "SET NULL"),
            new Fk("follows", "follower_id", "users", "CASCADE"),
            new Fk("mural_entries", "company_id", "companies", "RESTRICT"),
            new Fk("mural_entries", "department_id", "departments", "RESTRICT"),
            new Fk("mural_entries", "actor_id", "users", "CASCADE"),
            new Fk("notifications", "recipient_id", "users", "CASCADE"),
            new Fk("notifications", "actor_id", "users", "SET NULL"),
            new Fk("announcements", "company_id", "companies", "RESTRICT"),
            new Fk("announcements", "department_id", "departments", "RESTRICT"),
            new Fk("announcements", "author_id", "users", "RESTRICT"),
            // V17 — rf42_gamificacao
            new Fk("decia_points_rules", "edited_by", "users", "RESTRICT"),
            new Fk("decia_points_ledger", "user_id", "users", "RESTRICT"),
            new Fk("decia_points_ledger", "session_id", "decia_sessions", "RESTRICT"),
            new Fk("decia_points_ledger", "rule_version_id", "decia_points_rules", "RESTRICT"),
            new Fk("decia_points_ledger", "reviewed_by", "users", "RESTRICT"),
            new Fk("decia_points_ledger", "counterparty_user_id", "users", "RESTRICT"),
            new Fk("ai_credit_ledger", "user_id", "users", "RESTRICT"),
            new Fk("ai_credit_ledger", "department_id", "departments", "RESTRICT"),
            new Fk("points_donations", "from_user_id", "users", "RESTRICT"),
            new Fk("points_donations", "to_user_id", "users", "RESTRICT"),
            new Fk("points_donations", "ledger_debit_id", "decia_points_ledger", "RESTRICT"),
            new Fk("points_donations", "ledger_credit_id", "decia_points_ledger", "RESTRICT"),
            new Fk("collective_goals", "creator_id", "users", "RESTRICT"),
            new Fk("collective_goals", "company_id", "companies", "RESTRICT"),
            new Fk("collective_goals", "department_id", "departments", "RESTRICT"),
            new Fk("goal_participants", "goal_id", "collective_goals", "CASCADE"),
            new Fk("goal_participants", "user_id", "users", "CASCADE"),
            new Fk("highlights", "company_id", "companies", "RESTRICT"),
            new Fk("highlights", "department_id", "departments", "RESTRICT"),
            new Fk("highlights", "curated_by", "users", "RESTRICT"),
            new Fk("recognitions", "issuer_user_id", "users", "RESTRICT"),
            new Fk("recognitions", "recipient_user_id", "users", "RESTRICT"),
            new Fk("recognitions", "certificate_media_id", "media_objects", "SET NULL"),
            new Fk("week_plans", "user_id", "users", "CASCADE"),
            new Fk("week_plan_days", "week_plan_id", "week_plans", "CASCADE"),
            new Fk("week_plan_days", "task_id", "tasks", "SET NULL"),
            new Fk("daily_tasks", "user_id", "users", "CASCADE"),
            new Fk("daily_tasks", "task_id", "tasks", "RESTRICT"),
            new Fk("daily_tasks", "swapped_from_task_id", "tasks", "SET NULL"),
            new Fk("daily_tasks", "delegated_to_user_id", "users", "SET NULL"),
            new Fk("daily_tasks", "week_plan_day_id", "week_plan_days", "SET NULL"),
            new Fk("daily_tasks", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("hse_weights", "company_id", "companies", "RESTRICT"),
            new Fk("hse_snapshots", "user_id", "users", "CASCADE"),
            new Fk("hype_bands", "company_id", "companies", "RESTRICT"),
            new Fk("profile_hype_scores", "user_id", "users", "CASCADE"),
            new Fk("profile_hype_scores", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("hype_ignored_events", "user_id", "users", "RESTRICT"),
            new Fk("deliberative_profiles", "user_id", "users", "CASCADE"),
            new Fk("ranking_weights", "company_id", "companies", "RESTRICT"),
            new Fk("ranking_weights", "edited_by", "users", "RESTRICT"),
            new Fk("ranking_entries", "user_id", "users", "CASCADE"),
            // V18 — rf39_chancelas
            new Fk("seals", "issuer_user_id", "users", "RESTRICT"),
            new Fk("seals", "company_id", "companies", "RESTRICT"),
            new Fk("seals", "department_id", "departments", "RESTRICT"),
            new Fk("seals", "policy_id", "seal_policies", "SET NULL"),
            new Fk("seal_policies", "seal_id", "seals", "CASCADE"),
            new Fk("seal_bonds", "seal_id", "seals", "RESTRICT"),
            new Fk("seal_bonds", "issuer_user_id", "users", "RESTRICT"),
            new Fk("seal_bonds", "target_owner_id", "users", "RESTRICT"),
            new Fk("seal_bonds", "requested_by", "users", "RESTRICT"),
            new Fk("seal_bonds", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("seal_bonds", "reviewed_by", "users", "RESTRICT"),
            new Fk("seal_proposals", "proposer_id", "users", "CASCADE"),
            new Fk("seal_proposals", "department_id", "departments", "RESTRICT"),
            new Fk("seal_proposals", "resulting_seal_id", "seals", "SET NULL"),
            new Fk("seal_proposals", "decided_by", "users", "RESTRICT"),
            new Fk("benefits", "seal_id", "seals", "RESTRICT"),
            new Fk("benefits", "issuer_user_id", "users", "RESTRICT"),
            new Fk("benefit_redemptions", "benefit_id", "benefits", "RESTRICT"),
            new Fk("benefit_redemptions", "seal_bond_id", "seal_bonds", "RESTRICT"),
            new Fk("benefit_redemptions", "user_id", "users", "RESTRICT"),
            new Fk("benefit_redemptions", "certificate_media_id", "media_objects", "SET NULL"),
            new Fk("benefit_redemptions", "ledger_entry_id", "decia_points_ledger", "RESTRICT"),
            // V19 — rf40_balcao_loja
            new Fk("model_offers", "owner_id", "users", "CASCADE"),
            new Fk("model_offers", "highlighted_by", "users", "RESTRICT"),
            new Fk("store_items", "company_id", "companies", "RESTRICT"),
            new Fk("store_purchases", "buyer_id", "users", "RESTRICT"),
            new Fk("store_purchases", "store_item_id", "store_items", "RESTRICT"),
            new Fk("store_purchases", "ledger_entry_id", "decia_points_ledger", "RESTRICT"),
            new Fk("user_skins", "user_id", "users", "CASCADE"),
            new Fk("user_skins", "purchase_id", "store_purchases", "SET NULL"),
            // V20 — rf46_mensageria_atribuicao
            new Fk("direct_conversations", "company_id", "companies", "RESTRICT"),
            new Fk("direct_conversations", "created_by", "users", "RESTRICT"),
            new Fk("direct_conversation_participants", "conversation_id", "direct_conversations", "CASCADE"),
            new Fk("direct_conversation_participants", "user_id", "users", "CASCADE"),
            new Fk("assignments", "from_user_id", "users", "RESTRICT"),
            new Fk("assignments", "to_user_id", "users", "RESTRICT"),
            new Fk("assignments", "previous_responsible_id", "users", "RESTRICT"),
            new Fk("assignments", "trace_node_id", "decision_trace_nodes", "SET NULL"),
            // V21 — rf43_ia_plataforma
            new Fk("insights", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("feasibility_sheets", "resulting_project_id", "project_schemes", "SET NULL"),
            new Fk("feasibility_sheets", "resulting_task_id", "tasks", "SET NULL"),
            new Fk("feasibility_sheets", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("metric_snapshots", "metric_code", "metric_definitions", "code", "RESTRICT"),
            new Fk("extraction_results", "task_id", "tasks", "CASCADE"),
            new Fk("extraction_results", "derived_task_id", "tasks", "SET NULL"),
            new Fk("extraction_results", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("extraction_corrections", "extraction_id", "extraction_results", "CASCADE"),
            new Fk("extraction_corrections", "user_id", "users", "RESTRICT"),
            new Fk("extraction_corrections", "department_id", "departments", "RESTRICT"),
            new Fk("memory_queries", "user_id", "users", "CASCADE"),
            new Fk("memory_queries", "ai_inference_id", "ai_inference_log", "SET NULL"),
            // V22 — rf29_decisao_estruturada
            new Fk("decisions", "owner_user_id", "users", "RESTRICT"),
            new Fk("decisions", "created_by_user_id", "users", "RESTRICT"),
            new Fk("decisions", "company_id", "companies", "RESTRICT"),
            new Fk("decisions", "department_id", "departments", "RESTRICT"),
            new Fk("decisions", "session_id", "decia_sessions", "SET NULL"),
            new Fk("decisions", "project_id", "project_schemes", "SET NULL"),
            new Fk("decisions", "final_decision_id", "final_decisions", "SET NULL"),
            new Fk("decisions", "supersedes_decision_id", "decisions", "SET NULL"),
            new Fk("decisions", "selected_alternative_id", "decision_alternatives", "SET NULL"),
            new Fk("decision_participants", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_participants", "user_id", "users", "RESTRICT"),
            new Fk("decision_alternatives", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_alternatives", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("decision_alternatives", "summary_scenario_id", "summary_scenarios", "SET NULL"),
            new Fk("decision_alternatives", "project_scenario_id", "project_scenarios", "SET NULL"),
            new Fk("decision_criteria", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_criteria", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("criterion_assessments", "alternative_id", "decision_alternatives", "CASCADE"),
            new Fk("criterion_assessments", "criterion_id", "decision_criteria", "CASCADE"),
            new Fk("criterion_assessments", "assessor_user_id", "users", "RESTRICT"),
            new Fk("decision_evidence", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_evidence", "media_id", "media_objects", "RESTRICT"),
            new Fk("decision_evidence", "task_id", "tasks", "SET NULL"),
            new Fk("decision_evidence", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("decision_evidence", "added_by_user_id", "users", "RESTRICT"),
            new Fk("decision_evidence_links", "evidence_id", "decision_evidence", "CASCADE"),
            new Fk("decision_assumptions", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_assumptions", "owner_user_id", "users", "RESTRICT"),
            new Fk("decision_assumptions", "alternative_id", "decision_alternatives", "SET NULL"),
            new Fk("decision_assumptions", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("decision_risks", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_risks", "alternative_id", "decision_alternatives", "SET NULL"),
            new Fk("decision_risks", "owner_user_id", "users", "RESTRICT"),
            new Fk("decision_risks", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("decision_scenarios", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_scenarios", "alternative_id", "decision_alternatives", "SET NULL"),
            new Fk("decision_scenarios", "project_scenario_id", "project_scenarios", "SET NULL"),
            new Fk("decision_forecasts", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_forecasts", "alternative_id", "decision_alternatives", "SET NULL"),
            new Fk("decision_forecasts", "forecaster_user_id", "users", "RESTRICT"),
            new Fk("decision_forecasts", "resolved_by_user_id", "users", "RESTRICT"),
            new Fk("decision_recommendations", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_recommendations", "alternative_id", "decision_alternatives", "SET NULL"),
            new Fk("decision_recommendations", "ai_inference_id", "ai_inference_log", "SET NULL"),
            new Fk("decision_triggers", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_snapshots", "decision_id", "decisions", "RESTRICT"),
            new Fk("decision_snapshots", "taken_by_user_id", "users", "RESTRICT"),
            new Fk("decision_checkpoints", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_checkpoints", "completed_by_user_id", "users", "RESTRICT"),
            new Fk("decision_outcomes", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_outcomes", "recorded_by_user_id", "users", "RESTRICT"),
            new Fk("decision_retrospectives", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_retrospectives", "outcome_id", "decision_outcomes", "SET NULL"),
            new Fk("decision_retrospectives", "reviewed_by_user_id", "users", "RESTRICT"),
            new Fk("decision_work_links", "decision_id", "decisions", "CASCADE"),
            new Fk("decision_work_links", "created_by_user_id", "users", "RESTRICT"),
            new Fk("decision_events", "decision_id", "decisions", "RESTRICT"),
            new Fk("decision_events", "actor_user_id", "users", "RESTRICT"),
            // V24 — seg_bloco5_quarentena_midia
            new Fk("media_scans", "media_id", "media_objects", "CASCADE")
    );
    // <<< gerado

    /**
     * Todas as FKs do schema: as do V2 ({@link #BASELINE_V2}) mais as das migrations V10+ ({@code GENERATED}, bloco reescrito pelo
     * {@code SchemaGenerator} de ws-domain a partir do {@code DomainCatalog} — a migration e a linha nascem do mesmo record, D-40).
     * Lista imutável; o {@code ForeignKeyPolicyTest} compara com INFORMATION_SCHEMA e o {@code ForeignKeyPolicyUnitTest} com o SQL.
     */
    public static final List<Fk> POLICY = Stream.concat(BASELINE_V2.stream(), GENERATED.stream()).toList();

    /**
     * Lê as FKs reais do schema corrente da conexão ({@link Connection#getCatalog()}) em INFORMATION_SCHEMA.
     * {@code NO ACTION} vira {@code RESTRICT}. FKs compostas aparecem com uma entrada por coluna.
     */
    public static List<Fk> read(Connection connection) throws SQLException {
        String schema = connection.getCatalog();
        if (schema == null || schema.isBlank()) {
            throw new SQLException("conexão sem schema corrente (catalog); use uma URL JDBC com o banco");
        }
        List<Fk> out = new ArrayList<>();
        try (PreparedStatement ps = connection.prepareStatement(READ_SQL)) {
            ps.setString(1, schema);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    out.add(new Fk(lower(rs.getString(1)), lower(rs.getString(2)), lower(rs.getString(3)),
                            lower(rs.getString(4)), rs.getString(5)));
                }
            }
        }
        return List.copyOf(out);
    }

    /** Casa as duas listas pela identidade {@link Fk#key()} e devolve faltantes, extras e divergentes (ordem estável). */
    public static Diff compare(List<Fk> policy, List<Fk> actual) {
        Map<String, Fk> wanted = indexByKey(policy, "POLICY");
        Map<String, Fk> found = indexByKey(actual, "banco");
        List<Fk> missing = new ArrayList<>();
        List<Fk> extra = new ArrayList<>();
        List<Divergence> divergent = new ArrayList<>();
        wanted.forEach((key, fk) -> {
            Fk real = found.get(key);
            if (real == null) {
                missing.add(fk);
            } else if (!real.onDelete().equals(fk.onDelete())) {
                divergent.add(new Divergence(fk, real));
            }
        });
        found.forEach((key, fk) -> {
            if (!wanted.containsKey(key)) {
                extra.add(fk);
            }
        });
        return new Diff(missing, extra, divergent);
    }

    static String normalizeRule(String rule) {
        String r = rule == null ? "" : rule.trim().toUpperCase(Locale.ROOT).replaceAll("\\s+", " ");
        return "NO ACTION".equals(r) ? "RESTRICT" : r;
    }

    private static Map<String, Fk> indexByKey(List<Fk> fks, String side) {
        Map<String, Fk> byKey = new LinkedHashMap<>();
        for (Fk fk : fks) {
            if (byKey.put(fk.key(), fk) != null) {
                throw new IllegalArgumentException("FK repetida em " + side + ": " + fk.key());
            }
        }
        return byKey;
    }

    private static String lower(String s) {
        return s == null ? null : s.toLowerCase(Locale.ROOT);
    }
}
