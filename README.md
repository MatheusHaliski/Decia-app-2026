# Work Station / DECIA

Produto da **SECID-PR**: o **Work Station** é o app construtor, organizador e conector de tarefas, projetos e objetivos
institucionais; o **DECIA** (Decisão com Inteligência Artificial) é o centro — mensageria deliberativa em grupo assistida
por IA, ligada ao Criador de Projetos. Requisitos no board Trello **Work Station** (RF1–RF45). Esqueleto herdado do
Fashion AI (FAI), com nomes adaptados (`ws-*`, `br.gov.pr.secid.workstation`, `WS_*`).

Documentos: [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md) ·
[`docs/arquitetura/TAXONOMIA.md`](docs/arquitetura/TAXONOMIA.md) · [`docs/DECISOES.md`](docs/DECISOES.md) ·
[`docs/seguranca/SEGURANCA.md`](docs/seguranca/SEGURANCA.md) · [`docs/design-system/`](docs/design-system/).

## Estado: Bloco 3 — autenticação (RF1–RF3) com os controles do D-14

Backend Java 21 / **Spring Boot 4.1.1** multi-módulo, frontend **Next.js 15** mínimo, CI com gates, Docker e compose.
Bloco 1 = esqueleto; Bloco 2 = `V2__baseline_dominio_base.sql` com a política de `ON DELETE` guardada por teste (D-23);
**Bloco 3** = RF1 (cadastro, verificação de e-mail, username), RF2 (login sem oráculo, bloqueio atômico por conta, JWT RS256,
refresh por família, logout, redefinição de senha, OIDC atrás de flag) e RF3 (conta, dados sensíveis com step-up, exclusão
agendada, preferências), com Argon2id, limite por IP+método+rota, bulkhead de hashes, IP assinado pelo BFF, AES-GCM nos campos
sensíveis, auditoria sem segredo e `V3__rf1_rf2_autenticacao.sql` (`verification_codes`). Tabela controle → classe → teste em
[`docs/seguranca/SEGURANCA.md` §3](docs/seguranca/SEGURANCA.md). O BFF (cookie `ws_rt`, PKCE do OIDC) é o Bloco 4; aceite de
termos (`PolicyDocument`) e anonimização são os blocos LGPD.

### Rotas da API (Bloco 3)

| Rota | Auth | Limite por IP | Resposta |
|---|---|---|---|
| `POST /api/auth/register` | pública | 10/h | `202 VERIFICACAO_ENVIADA` (igual exista ou não o e-mail); `422 VALIDACAO`/`NOME_RESERVADO`; `409 USERNAME_EM_USO` |
| `POST /api/auth/email-verification/confirm` · `/resend` | pública | 20/h · 10/h | sessão (≤ 5 tentativas por código, 10/h) · `202` |
| `GET /api/usernames/{u}/availability` · `GET /api/auth/username-suggestions?base=` | pública | 120 · 60/10 min | `{available, reason, suggestions}` |
| `POST /api/auth/login` | pública | 30/10 min | sessão; `401 CREDENCIAIS_INVALIDAS` único; `403 CONTA_INDISPONIVEL`/`401 DOIS_FATORES_NECESSARIO` só após a senha certa; `503 AUTENTICACAO_OCUPADA` |
| `POST /api/auth/refresh` | pública | 120/10 min | sessão rotacionada; reuso → `401 SESSAO_INVALIDA` e família revogada |
| `POST /api/auth/logout` · `PUT /api/auth/password` | Bearer | — · 20/h | `204` · `{sessionsEnded}`; 6º erro da senha atual → `429 MUITAS_TENTATIVAS` + `Retry-After` |
| `POST /api/auth/password-reset/request` · `/confirm` | pública | 10/h · 20/h | `202` idêntico · `204` / `422 LINK_INVALIDO` |
| `POST /api/auth/oidc/login` | pública (flag `WS_OIDC_ENABLED`) | 30/10 min | sessão; `404 OIDC_DESLIGADO`; `401 OIDC_EMAIL_NAO_VERIFICADO` |
| `GET/PATCH /api/me` · `GET /api/users/{id}` | Bearer | — | perfil; `403 ACESSO_NEGADO` para terceiros; `403 EXCLUSAO_AGENDADA` |
| `PATCH /api/me/sensitive` · `POST/DELETE /api/me/deletion` | Bearer + senha atual | 30/h · 10/h | step-up no mesmo bloqueio do login; exclusão agendada +30 d, cancelável |
| `GET/PUT /api/me/preferences` | Bearer | — | `user_preferences` |

Todo endpoint autenticado exige papel conhecido (`USER`/`ADMIN`) e `sid` vivo (`SessionActiveFilter` → `401 SESSAO_ENCERRADA`).
O refresh token volta no corpo **só para o BFF**, que o guardará no cookie `ws_rt` HttpOnly (Bloco 4); o navegador nunca o vê.

## Rodar em 5 minutos

Pré-requisitos: JDK 21, Maven 3.9+, Node 22, Docker (para o MySQL local e o teste de integração).

```bash
cp .env.example .env                                   # 1. preencha WS_DB_PASSWORD e WS_DB_ROOT_PASSWORD (não há senha padrão)
docker compose -f docker-compose.dev.yml up -d mysql   # 2. MySQL 8.4 em 127.0.0.1:3306
scripts/keys/generate_jwt_keys.sh                      # 3. par RS256 em ./keys/ (fora do git); aponte WS_JWT_*_KEY_PATH no .env
set -a; . ./.env; set +a                               # 4. exporta as variáveis para a JVM
mvn -B -ntp -DskipTests package                        # 5. compila
SPRING_PROFILES_ACTIVE=dev java -jar ws-bootstrap/target/ws-bootstrap-*.jar
curl -s localhost:8080/actuator/health                 # {"status":"UP"}  — única rota pública do Actuator
npm ci && npm run dev                                  # frontend em http://localhost:3000
```

Serviços opcionais (Redis, Cassandra, OpenSearch, MinIO) sobem por perfil do compose e só são usados pela API com a
flag correspondente (`WS_REDIS_ENABLED`, `WS_CASSANDRA_ENABLED`, `WS_OPENSEARCH_ENABLED`, `WS_STORAGE_TYPE=s3`):
`docker compose -f docker-compose.dev.yml --profile redis --profile cassandra up -d`.

Imagem da API: `docker build -f Dockerfile.backend -t work-station-api .` (perfil `prod`: exige todos os segredos).

## Variáveis de ambiente (só nomes; valores nunca entram no repositório)

| Grupo | Variáveis | Observação |
|---|---|---|
| MySQL (obrigatório) | `WS_DB_HOST`, `WS_DB_PORT`, `WS_DB_NAME`, `WS_DB_USER`, **`WS_DB_PASSWORD`**, `WS_DB_SSL_MODE`, `WS_DB_POOL_SIZE` | sem `WS_DB_PASSWORD` a API não sobe em nenhum perfil; prod força `sslMode=REQUIRED` |
| JWT RS256 | **`WS_JWT_PRIVATE_KEY_PATH`**/**`WS_JWT_PRIVATE_KEY_PEM`**, **`WS_JWT_PUBLIC_KEY_PATH`**/**`WS_JWT_PUBLIC_KEY_PEM`**, `WS_JWT_ISSUER`, `WS_JWT_AUDIENCE`, `WS_JWT_ACCESS_TTL_MINUTES`, `WS_REFRESH_TTL`, `WS_REFRESH_SHORT_TTL` | chave por caminho **ou** conteúdo PEM (D-24); uma das formas é obrigatória em prod |
| Criptografia | **`WS_DATA_ENCRYPTION_KEY`** | AES-GCM de `email_enc`/`phone_enc` + HMAC do `email_hash`; obrigatória em prod (fora de prod ausente = efêmera, WARN) |
| Força bruta / IP | `EDGE_PROXY_SECRET`, `WS_EDGE_IP_HEADER`, `WS_TRUSTED_PROXIES`, `WS_AUTH_RATE_LIMIT_ENABLED`, `WS_AUTH_HASH_CONCURRENCY`, `WS_AUTH_HASH_WAIT_MS` | IP assinado pelo BFF (≥ 32 chars; nunca `X-Forwarded-For`); `X-Real-IP` só dos IPs/CIDRs de `WS_TRUSTED_PROXIES` (vazio = ignorado); limite por IP e bulkhead |
| Admin / legal / e-mail / OIDC | `WS_ADMIN_BOOTSTRAP_ENABLED`, `WS_ADMIN_EMAIL`, `WS_ADMIN_USERNAME`, **`WS_ADMIN_INITIAL_PASSWORD`**, `WS_ADMIN_PROMOTE_EXISTING`, `WS_LEGAL_TERMS_VERSION`, `WS_LEGAL_PRIVACY_VERSION`, `WS_MAIL_ECHO_BODY`, `WS_SMTP_*` (reservadas), `WS_OIDC_ENABLED`, `WS_OIDC_ISSUER_URI`, `WS_OIDC_CLIENT_ID`, `WS_OIDC_CLIENT_SECRET` | `AdminBootstrap` só cria se não há ADMIN; e-mail por log em dev; OIDC desligado por padrão |
| Aplicação | `PORT`, `WS_APP_BASE_URL`, `WS_FRONTEND_URL`, `WS_CORS_ALLOWED_ORIGINS`, `WS_API_DOCS_ENABLED`, `WS_MANAGEMENT_EXPOSURE`, `WS_SECRETS_ENFORCE`, `WS_LOG_LEVEL*` | prod: docs desligados, só `health` exposto |
| Stores opcionais | `WS_REDIS_*`, `WS_CASSANDRA_*`, `WS_OPENSEARCH_*`, `WS_STORAGE_TYPE`, `WS_S3_*`, `WS_PLATFORM_ENABLED` | desligados por padrão (ARQUITETURA §3.2) |
| IA | `WS_AI_REMOTE_ENABLED`, `WS_AI_REQUEST_TIMEOUT_SECONDS`, `WS_ANTHROPIC_API_KEY`, `WS_GOOGLE_AI_API_KEY` | desligada = só motor local (RF43) |
| Frontend | `NEXT_PUBLIC_API_BASE_URL` | origem da API na CSP (`connect-src`) |

Lista completa e comentada em [`.env.example`](.env.example); runbook de segredos em
[`docs/seguranca/SEGURANCA.md`](docs/seguranca/SEGURANCA.md).

## Módulos (Maven)

| Módulo | Conteúdo |
|---|---|
| `ws-domain` | domínio puro (sem JPA): `User`, `UserPreferences`, `ProfileType`, `Role`, `AccountStatus`, `HypeVisibility`, `VerificationPurpose`, `AccountOrigin`, `AuditableEntity` |
| `ws-application` | casos de uso e portas: `IdentityService`, `RegistrationService`, `PasswordResetService`, `AccountService`, `AdminBootstrap`, `OidcAccountLinker`/`OidcService`, `Guard`, `AuditEvent`/`AuditLogPort`, `RateLimitPort` (+`InMemoryRateLimit`), `SessionStorePort` (+`InMemorySessionStore`), `PasswordHasher`, `MailPort` (+`LoggingMailAdapter`), `ApiException`, `Masking`, `Hashing` |
| `ws-infrastructure/*` | `persistence-mysql` (Flyway V1–V3, entidades JPA `UserEntity`…, adaptadores das portas, `FieldCipher`/`AesGcmStringConverter`, `ForeignKeyPolicy`), `cache-redis` (`RedisRateLimit` Lua), `persistence-cassandra`, `search-opensearch`, `storage-s3`, `ai-providers`, `platform` — opt-in por `@ConditionalOnProperty(ws.<x>.enabled)` |
| `ws-web` | `AuthRateLimitFilter` (antes do Spring Security), `ClientIpResolver`, `HashBulkhead`, `Argon2PasswordHasher`, `JwtKeys`/`JwtConfig`/`JwtTokenIssuer`, `SessionActiveFilter`, `SecurityConfig`, `CurrentUserArgumentResolver`, controllers (`AuthController`, `RegistrationController`, `PasswordResetController`, `MeController`, `OidcController`), `GlobalExceptionHandler` → `{code, message, details, correlationId}` + `Retry-After` |
| `ws-bootstrap` | `WorkStationApplication`, `application.yml` + `application-{dev,test,prod}.yml`, `RequiredSecretsGuard`, logback com mascaramento |

Frontend na raiz: ver a seção **Frontend** abaixo.

## Frontend (etapa (b) — shell do app e páginas-esqueleto RF1–RF46)

- **Design system v2** em `components/ui/` (tokens `--ws-*` de `styles/tokens-ws.css`, cópia guardada por teste de `docs/design-system/tokens-ws.css`; WS Glyphs/Moji como `<Glyph>`/`<Moji>` gerados dos SVGs; radix para Dialog/Sheet/Popover/Tooltip/Tabs/Switch/Checkbox/Radio/Toast). Único lugar com `<button>`, `<a>`, `<input>`, `<select>`. Cor **só por token**: ESLint barra `style={{ color: "#…" }}` e classes Tailwind de cor fixa; stylelint só aceita `var(--ws-…)`; `scripts/lint-fixtures/no-color-literals.test.ts` varre `components/`, `app/`, `lib/`, `styles/`.
- **Shell** em `components/shell/`: `TopBar` (logo, busca global com atalho `/`, Mensagens, sino de notificações com Popover — mock em `lib/notifications/` até o RF —, ficha DP, tema/idioma, **Central de Perfil**), `SidebarNav` (grupos Descobrir · Meu trabalho · Criar · Jogar e ganhar · Gestão exatamente da Matriz A de `docs/produto/ABAS_POR_PERFIL.md`, recolhível para rail 72 px), `BottomNav` + folha "+ Criar" abaixo de 1024 px, `RfPage` (esqueleto por RF).
- **Rotas** (`app/(shell)/…`, tabela completa em `docs/produto/ABAS_POR_PERFIL.md` §11): `/mural`, `/search`, `/memory`, `/companies[/[slug]]`, `/departments/[slug]`, `/models`, `/messages`, `/profile`, `/u/[username]`, `/tasks[/new|/[id]|/[id]/edit]`, `/attachments`, `/desk`, `/projects/new|[id]|[id]/edit|simulate|mirror`, `/plans`, `/autopilot`, `/decia[/[sessionId]|/review]`, `/insights`, `/goals`, `/points`, `/store`, `/highlights`, `/recognitions`, `/benefits`, `/handoffs`, `/seals[/review]`, `/curation`, `/issuer/dashboard`, `/companies/[slug]/manage/departments`, `/departments/[slug]/team`, `/admin`, `/settings` (RF3 real), `/notifications`, `/lab/{design-system,anatomias,perfis,decia}`; auth fora do shell: `/login`, `/register`, `/verify-email`, `/password-reset` (BFF `app/bff/auth/[action]`: cookie `ws_rt` HttpOnly, access token só em memória, `lib/api/client.ts`).
- **Perfis de visualização do lab** (D-35): na Central de Perfil (ou `/lab/perfis`) troque entre EMPREGADO · EMPRESA · CHEFE · CURADOR · ADMIN · VISITANTE para ver a sidebar, as sub-abas e o 403 simulado de cada perfil — só no front, até a sessão real (`/api/me`) alimentar o mesmo contexto.
- **Preferências (RF3)**: `lib/preferences/` aplica tema (auto/claro/escuro/contraste/terminal), idioma, densidade, fonte, movimento, skin da Mesa, arte de fundo (6 artes "Aura Geometry" do dono em `public/brand/backgrounds/`, D-37), notificações, fuso, WIP e modo de IA — na hora, sem recarregar; sem flash (script inline com nonce da CSP); local agora, `GET/PUT /api/me/preferences` quando houver sessão.
- **Scripts**: `npm run rf:catalog` (READMEs → `lib/rf/catalog.gen.ts`), `npm run glyphs:sprite`, `npm run brand:fundos`, `npm run e2e` (Playwright; local usa `/opt/pw-browsers/chromium`, `CHROMIUM_PATH=""` no CI), `npm run shell:capturas` (13 capturas com nomes fixos + `docs/testes/shell/README.md`, com o app no ar). Evidências em `docs/testes/shell/`.

## Banco (MySQL 8.4 · Flyway)

> **Planilha RF × entidade × atributo × banco de produção:** [`docs/arquitetura/RF_ENTIDADES_ATRIBUTOS.xlsx`](docs/arquitetura/RF_ENTIDADES_ATRIBUTOS.xlsx), gerada de `catalogo-entidades.json` por `docs/arquitetura/gerar-planilha-entidades.py` (abas Atributos · Entidades · RF x Entidade · Bancos · Legenda; contagens por fórmula, recalculadas ao abrir).

Schema 100 % por migration em `ws-infrastructure/persistence-mysql/src/main/resources/db/migration/` (`spring.jpa.hibernate.ddl-auto: none`;
o Hibernate nunca cria nem altera tabela). Migrations aplicadas nunca são editadas: mudança = versão nova. Convenções do V2 (D-23): ids `BINARY(16)` (UUID),
enums `VARCHAR` + `CHECK ck_<tabela>_<coluna>`, FK `fk_<tabela>__<coluna>` com `ON DELETE` explícito seguindo a política por domínio (dono → `CASCADE`;
catálogo institucional, atores e trilhas append-only → `RESTRICT`; `SET NULL` só para filho válido sem pai — D-41). Toda FK tem uma linha em
`ForeignKeyPolicy.POLICY` e `ForeignKeyPolicyTest` compara com `INFORMATION_SCHEMA`. Contas sintéticas: `users.account_origin` com `test_account` gerada.

| Migration | Contexto (TAXONOMIA) | RFs | Tabelas |
|---|---|---|---|
| `V1__baseline.sql` | esqueleto | — | `app_meta` |
| `V2__baseline_dominio_base.sql` | domínio base (Bloco 2) | RF1–RF3, transversal | `users`, `user_preferences`, `refresh_tokens`, `audit_log`, `ai_inference_log`, `feature_flags`, `domain_events`, `media_objects` |
| `V3__rf1_rf2_autenticacao.sql` | autenticação (Bloco 3) | RF1, RF2 | `verification_codes` |
| V4–V9 | reservadas (Bloco 3 / LGPD) | | |
| `V10__rf28_institucional_lgpd.sql` | 1 Identidade institucional + LGPD | RF28, RF1–RF3 | `companies`, `departments`, `department_memberships`, `curator_appointments`, `verification_policies`, `approval_requests`, `pending_uploads`, `user_empresa_ext`, `user_chefe_ext`, `policy_documents`, `policy_acceptances`, `consent_events`, `user_consents`, `data_subject_requests`, `data_export_requests` (+ FKs `users.company_id/department_id`, `ai_inference_log.department_id`) |
| `V11__rf41_acervo_tarefas.sql` | 2 Acervo de Tarefas | RF20, RF41 | `org_entities`, `legal_deadline_rules`, `tasks`, `task_attachments`, `task_versions`, `task_state_log`, `evidences` |
| `V12__rf21_criador_projetos.sql` | 3 Criador de Projetos | RF21, RF22, RF31, RF32 | `project_schemes`, `project_tasks`, `project_task_dependencies`, `project_scenarios`, `project_versions`, `compliance_checklists`, `compliance_items`, `compliance_results`, `process_kits`, `kit_items`, `team_desks`, `desk_notes` |
| `V13__rf24_planejamento.sql` | 4 Planejamento | RF24, RF25 | `annual_plans`, `plan_axes`, `plan_axis_projects`, `groupings`, `grouping_items` |
| `V14__rf4_decia_sessao.sql` | 5 DECIA sessão | RF4–RF17, RF37 | `decia_sessions`, `session_participants`, `message_classifications`, `session_messages_idx`, `message_attachments`, `divergences`, `divergence_replies`, `ai_questions`, `analytical_summaries`, `summary_scenarios`, `final_decisions`, `decision_reviews`, `reopen_requests`, `session_artifacts`, `meetings`, `meeting_transcripts`, `recording_consents` |
| `V15__rf29_rastro_decisao.sql` | 6 Rastro, Memória e Transição | RF29, RF17, RF36 | `decision_trace_nodes`, `decision_trace_edges`, `session_archives`, `handoff_dossiers`, `handoff_items` |
| `V16__rf27_social.sql` | 7 Social & Descoberta | RF26, RF27, RF15 | `reactions`, `comments`, `saved_items`, `shares`, `remixes`, `follows`, `mural_entries`, `notifications`, `announcements` |
| `V17__rf42_gamificacao.sql` | 8 Gamificação e DECIA Points | RF42, RF35, RF43–RF45 | `decia_points_rules`, `decia_points_ledger`, `ai_credit_ledger`, `points_donations`, `collective_goals`, `goal_participants`, `highlights`, `recognitions`, `week_plans`, `week_plan_days`, `daily_tasks`, `hse_weights`, `hse_snapshots`, `hype_bands`, `profile_hype_scores`, `hype_ignored_events`, `deliberative_profiles`, `ranking_weights`, `ranking_entries` |
| `V18__rf39_chancelas.sql` | 9 Chancelas & Vínculos | RF39 | `seals`, `seal_policies`, `seal_bonds`, `seal_proposals`, `benefits`, `benefit_redemptions` |
| `V19__rf40_balcao_loja.sql` | 11 Balcão & Loja | RF40, RF42 | `model_offers`, `store_items`, `store_purchases`, `user_skins` |
| `V20__rf46_mensageria_atribuicao.sql` | 12b Mensageria & Atribuição | RF46, RF10 | `direct_conversations`, `direct_conversation_participants`, `assignments` |
| `V21__rf43_ia_plataforma.sql` | 10 IA do sistema · 12 Plataforma | RF43, RF34, RF33, RF18, RF3 | `ai_quotas`, `insights`, `feasibility_sheets`, `metric_definitions`, `metric_snapshots`, `extraction_results`, `extraction_corrections`, `memory_queries`, `pipeline_jobs` |

As migrations V10–V21, o bloco `GENERATED` da `ForeignKeyPolicy.POLICY` e as entidades JPA (`persistence-mysql/…/mysql/<contexto>/{entity,repository}`)
são **geradas** a partir dos records de `ws-domain` (`@DomainEntity`/`@Attr`, `DomainCatalog`) pelo `SchemaGenerator` (test-scope), e o catálogo legível
por máquina fica em [`docs/arquitetura/catalogo-entidades.json`](docs/arquitetura/catalogo-entidades.json) (D-40). Depois de mudar um record:

```bash
mvn -q -o -pl ws-domain install -DskipTests
java -cp ws-domain/target/classes:ws-domain/target/test-classes br.gov.pr.secid.workstation.domain.catalog.SchemaGenerator .   # só ANTES do 1º deploy da versão
mvn -q -pl ws-domain test -Dtest=EntityCatalogTest -Dcatalog.write=true -Dsurefire.failIfNoSpecifiedTests=false                # reescreve o JSON
```

Migration já aplicada em algum ambiente nunca é regenerada: a mudança vai para `V22+` à mão e o record/catálogo acompanham
(`CatalogSchemaConsistencyTest` cobra a igualdade colunas × catálogo). Mensagens de sessão/diretas, timeline e trace vivem no Cassandra
(`messages_by_session`, `messages_by_conversation`, `timeline_by_user`, `notifications_by_user`, `trace_by_entity`), a Memória Institucional no
OpenSearch (`ws-memory`), cotas/circuit state no Redis — todos descritos no mesmo catálogo com o campo `store`.

## Testes e gates (`mvn -B -ntp verify` · `npm run lint && npm run typecheck && npm test && npm run build`)

Testes-guarda que falham o build antes do deploy:

| Teste | Protege contra |
|---|---|
| `MigrationVersionsTest` (persistence-mysql) | duas branches com a mesma versão `V<n>__` (SQL e Java, ignora `$`); V1/V2 renomeadas; migration Java entrando sem registro |
| `ForeignKeyPolicyUnitTest` (persistence-mysql) | FK nova nas migrations SQL (`CREATE TABLE` ou `ALTER TABLE … ADD CONSTRAINT`) sem linha em `ForeignKeyPolicy.POLICY`, sem nome `fk_<tabela>__<coluna>`, sem `ON DELETE`/`ON UPDATE` explícitos, ou `SET FOREIGN_KEY_CHECKS=0` — roda sem Docker |
| `EntityCatalogTest` (ws-domain) | record `@DomainEntity` fora do `DomainCatalog`; `catalogo-entidades.json` desatualizado; SET NULL em coluna NOT NULL; índice com coluna inexistente |
| `CatalogSchemaConsistencyTest` (persistence-mysql) | coluna no SQL sem atributo no catálogo (ou vice-versa); FK do catálogo ausente/divergente na POLICY; tabela nova sem entidade |
| `DomainStateMachinesTest` / `EntityInvariantsTest` (ws-domain) | transição de estado fora dos diagramas dos RFs; invariantes dos CAs (≤ 5 envios, motivo obrigatório, consentimento para chancela pública, ≤ 2 etiquetas…) |
| `ForeignKeyPolicyTest` (persistence-mysql) | Flyway do zero num MySQL 8.4 real: FK no banco fora da política, política sem FK, regra `ON DELETE` divergente; `users.test_account` deixar de ser gerada; CHECK de `account_origin` aceitar valor inválido (Testcontainers; pulado sem Docker) |
| `IdentityServiceTest` (ws-application) | login com oráculo (401 diferente para conta inexistente/bloqueada), mais de 5 hashes em 40 logins paralelos, reuso de refresh sem revogar a família, 6º chute da senha atual sem 429, senha/token na auditoria |
| `AuthRateLimitFilterTest` · `ClientIpResolverTest` (ws-web) | 31º login do mesmo IP sem 429, `X-Forwarded-For` forjado abrindo balde novo, IPv6 fora do /64, URI codificada escapando da regra, bulkhead sem 503 |
| `AuthControllerWebTest` · `MeControllerWebTest` (ws-web) | 60 logins paralelos com algum HTTP 500; endpoint autenticado sem 401/403; papel desconhecido passando; `sid` revogado aceito |
| `RegistrationServiceTest` · `AdminBootstrapTest` · `OidcTest` (ws-application) | oráculo de e-mail no cadastro, nome reservado aceito, 6ª tentativa de código, promoção de conta a ADMIN sem a flag, vínculo OIDC sem `email_verified` |
| `FieldCipherTest` · `IdentityPersistenceIT` (persistence-mysql) | e-mail em claro no banco, chave AES inválida, segredo em `metadata_json` |
| `JsonContractTest` (ws-bootstrap) | Jackson 3 mudar o contrato com o front: `null` em primitivo → padrão, campo desconhecido ignorado, datas ISO-8601 — montado com o `application.yml` real |
| `AutoConfigurationExclusionsTest` | `spring.autoconfigure.exclude` apontando para classe renomeada (o Boot ignora em silêncio e o Cassandra voltaria a ligar) |
| `ApplicationYmlSecurityTest` | senha/chave padrão em qualquer `application*.yml`, TLS desligado, docs/health abertos em prod |
| `RequiredSecretsGuardTest` | boot em prod com `WS_DB_PASSWORD`, `WS_JWT_*_KEY_PATH` ou `WS_DATA_ENCRYPTION_KEY` vazios (mensagem só com os NOMES) |
| `SensitiveDataMaskingConverterTest` | senha/token/JWT/credencial de URL escapando no log |
| `GlobalExceptionHandlerWebTest` (ws-web) | 400/401/403/404/405/409/415/422/429/503/500 fora do formato `ApiError`, stack trace ou mensagem interna no corpo, header `X-Correlation-Id` ausente, `/actuator/*` aberto |
| `WorkStationApplicationIT` | contexto completo + Flyway (V1 e V2 com `success = 1`, `schema.baseline = bloco-2`) contra MySQL 8.4 real (Testcontainers; pulado sem Docker) |
| `OpenApiContractIT` (ws-bootstrap) · `lib/api/schema.test.ts` (front) | DTO/rota mudar sem regenerar `contracts/openapi/openapi.json` e `lib/api/schema.d.ts` (o CI regenera e exige `git diff` vazio); geração vazia/lixo sem `/api/me/preferences` (Testcontainers; o CI exige que o IT tenha rodado) |
| `forbidden-elements.lint.test.ts` (front) | afrouxar as regras que proíbem elementos nativos fora de `components/ui/**` e cor literal/classe Tailwind de cor fixa em JSX |
| `no-color-literals.test.ts`, `tokens-ws.test.ts`, `sprite.test.ts`, `catalog.test.ts` (front) | cor literal fora de `styles/tokens-ws.css`; `styles/tokens-ws.css` divergir de `docs/design-system/tokens-ws.css`; sprite de glifos ou catálogo de RFs desatualizados em relação aos SVGs/READMEs; RF sem página-esqueleto |
| `scripts/i18n/check.js` | chave faltando/órfã/vazia ou variáveis diferentes entre pt-BR/en/es |

Gates no mesmo `verify`: JaCoCo **≥ 70 % de linhas** em `ws-application` e `ws-web`, Checkstyle (`config/checkstyle.xml`),
SpotBugs (`config/spotbugs-exclude.xml`). OWASP Dependency-Check fica no perfil `mvn -Psecurity verify` (baixa a base
NVD; `NVD_API_KEY` acelera) para não travar o CI por rede. Frontend: ESLint + stylelint (cor só por token), `tsc`,
vitest, `npm audit --omit=dev --audit-level=high`. CI em [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
(backend, frontend, contrato OpenAPI → TypeScript, Trivy na imagem, gitleaks no histórico inteiro, commitlint).

**Trivy (D-70).** O job `trivy` constrói a imagem do `Dockerfile.backend` e falha em vulnerabilidade **HIGH/CRITICAL com
correção disponível** (SO ou jar do app; `--ignore-unfixed`). Achado corrigível se resolve subindo a versão (base da imagem
ou dependência — enquanto o BOM do Boot não alcança, a versão corrigida fica fixada no `pom.xml` da raiz, Q-170). Exceção
só em `.trivyignore`, com justificativa e data de validade em comentário, e listada no PR. Local:
`docker build -f Dockerfile.backend -t work-station-api . && trivy image --scanners vuln --ignore-unfixed --severity HIGH,CRITICAL work-station-api`.

### Contrato OpenAPI → TypeScript (D-71)

`contracts/openapi/openapi.json` é a especificação do `/v3/api-docs` gravada pelo `OpenApiContractIT` (contexto completo,
chaves ordenadas, sem `servers`, saída idêntica entre execuções); `lib/api/schema.d.ts` sai dela pelo `openapi-typescript`
(versão fixa no `package.json`). Os dois são versionados e **nunca editados à mão**. Mudou controller/DTO? Regenere e versione:

```bash
mvn -B -ntp -pl ws-bootstrap -am test -Dtest=OpenApiContractIT -Dsurefire.failIfNoSpecifiedTests=false   # precisa de Docker
npm run api:types
```

No CI o job `backend` confere que o IT rodou e que a especificação não mudou, e o job `api-types` regenera os tipos e
exige `git diff --exit-code` vazio.

## Convenções

- Commits **Conventional Commits** com RF no escopo quando houver: `feat(rf20): …`, `chore(ci): …`, `docs(arch): …`
  (`commitlint.config.mjs`). PRs seguem [`.github/pull_request_template.md`](.github/pull_request_template.md).
- Uma migration Flyway por mudança (`V<n>__rf<nn>_<assunto>.sql`), nunca editar uma aplicada; FK nova = linha nova em `ForeignKeyPolicy.POLICY` no mesmo commit; nunca `SET FOREIGN_KEY_CHECKS=0`.
- Erros HTTP sempre `{code, message, details, correlationId}`; códigos nomeados nos CAs (`VALIDACAO`, `ACESSO_NEGADO`, …).
- Nenhum HTML/CSS solto nas telas (D-11): componente do design system, cor por token, texto por chave i18n.
