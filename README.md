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
| Força bruta / IP | `EDGE_PROXY_SECRET`, `WS_EDGE_IP_HEADER`, `WS_AUTH_RATE_LIMIT_ENABLED`, `WS_AUTH_HASH_CONCURRENCY`, `WS_AUTH_HASH_WAIT_MS` | IP assinado pelo BFF (≥ 32 chars; nunca `X-Forwarded-For`), limite por IP e bulkhead |
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
- **Perfis de visualização do lab** (D-32): na Central de Perfil (ou `/lab/perfis`) troque entre EMPREGADO · EMPRESA · CHEFE · CURADOR · ADMIN · VISITANTE para ver a sidebar, as sub-abas e o 403 simulado de cada perfil — só no front, até a sessão real (`/api/me`) alimentar o mesmo contexto.
- **Preferências (RF3)**: `lib/preferences/` aplica tema (auto/claro/escuro/contraste/terminal), idioma, densidade, fonte, movimento, skin da Mesa, arte de fundo (6 artes "Aura Geometry" do dono em `public/brand/backgrounds/`, D-34), notificações, fuso, WIP e modo de IA — na hora, sem recarregar; sem flash (script inline com nonce da CSP); local agora, `GET/PUT /api/me/preferences` quando houver sessão.
- **Scripts**: `npm run rf:catalog` (READMEs → `lib/rf/catalog.gen.ts`), `npm run glyphs:sprite`, `npm run brand:fundos`, `npm run e2e` (Playwright; local usa `/opt/pw-browsers/chromium`, `CHROMIUM_PATH=""` no CI). Evidências em `docs/testes/shell/`.

## Banco (MySQL 8.4 · Flyway)

Schema 100 % por migration em `ws-infrastructure/persistence-mysql/src/main/resources/db/migration/` (`spring.jpa.hibernate.ddl-auto: none`;
o Hibernate nunca cria nem altera tabela). `V1__baseline.sql` (só `app_meta`), `V2__baseline_dominio_base.sql` (domínio base) e
`V3__rf1_rf2_autenticacao.sql` (`verification_codes`) nunca são editadas: mudança = `V4+`. Convenções do V2 (D-23): ids `BINARY(16)` (UUID), enums `VARCHAR` + `CHECK ck_<tabela>_<coluna>`, FK `fk_<tabela>__<coluna>` com
`ON DELETE` explícito seguindo a política por domínio (dono → `CASCADE`; catálogo institucional e trilhas append-only → `RESTRICT`; `SET NULL` só
para filho válido sem pai). Toda FK tem uma linha em `ForeignKeyPolicy.POLICY` — a migration e a linha entram no mesmo commit, e
`ForeignKeyPolicyTest` compara com `INFORMATION_SCHEMA`. Contas sintéticas: `users.account_origin` (REAL · TEST_SEED · DEMO · SYSTEM) com
`test_account` gerada no banco; nunca pontuam (RF42). Tabela de FKs e controles em [`docs/seguranca/SEGURANCA.md`](docs/seguranca/SEGURANCA.md) §2.

## Testes e gates (`mvn -B -ntp verify` · `npm run lint && npm run typecheck && npm test && npm run build`)

Testes-guarda que falham o build antes do deploy:

| Teste | Protege contra |
|---|---|
| `MigrationVersionsTest` (persistence-mysql) | duas branches com a mesma versão `V<n>__` (SQL e Java, ignora `$`); V1/V2 renomeadas; migration Java entrando sem registro |
| `ForeignKeyPolicyUnitTest` (persistence-mysql) | FK nova nas migrations SQL sem linha em `ForeignKeyPolicy.POLICY`, sem nome `fk_<tabela>__<coluna>`, sem `ON DELETE`/`ON UPDATE` explícitos, ou `SET FOREIGN_KEY_CHECKS=0` — roda sem Docker |
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
| `forbidden-elements.lint.test.ts` (front) | afrouxar as regras que proíbem elementos nativos fora de `components/ui/**` e cor literal/classe Tailwind de cor fixa em JSX |
| `no-color-literals.test.ts`, `tokens-ws.test.ts`, `sprite.test.ts`, `catalog.test.ts` (front) | cor literal fora de `styles/tokens-ws.css`; `styles/tokens-ws.css` divergir de `docs/design-system/tokens-ws.css`; sprite de glifos ou catálogo de RFs desatualizados em relação aos SVGs/READMEs; RF sem página-esqueleto |
| `scripts/i18n/check.js` | chave faltando/órfã/vazia ou variáveis diferentes entre pt-BR/en/es |

Gates no mesmo `verify`: JaCoCo **≥ 70 % de linhas** em `ws-application` e `ws-web`, Checkstyle (`config/checkstyle.xml`),
SpotBugs (`config/spotbugs-exclude.xml`). OWASP Dependency-Check fica no perfil `mvn -Psecurity verify` (baixa a base
NVD; `NVD_API_KEY` acelera) para não travar o CI por rede. Frontend: ESLint + stylelint (cor só por token), `tsc`,
vitest, `npm audit --omit=dev --audit-level=high`. CI em [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
(backend, frontend, gitleaks no histórico inteiro, commitlint).

## Convenções

- Commits **Conventional Commits** com RF no escopo quando houver: `feat(rf20): …`, `chore(ci): …`, `docs(arch): …`
  (`commitlint.config.mjs`). PRs seguem [`.github/pull_request_template.md`](.github/pull_request_template.md).
- Uma migration Flyway por mudança (`V<n>__rf<nn>_<assunto>.sql`), nunca editar uma aplicada; FK nova = linha nova em `ForeignKeyPolicy.POLICY` no mesmo commit; nunca `SET FOREIGN_KEY_CHECKS=0`.
- Erros HTTP sempre `{code, message, details, correlationId}`; códigos nomeados nos CAs (`VALIDACAO`, `ACESSO_NEGADO`, …).
- Nenhum HTML/CSS solto nas telas (D-11): componente do design system, cor por token, texto por chave i18n.
