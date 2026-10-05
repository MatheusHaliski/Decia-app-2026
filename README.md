# Work Station / DECIA

Produto da **SECID-PR**: o **Work Station** é o app construtor, organizador e conector de tarefas, projetos e objetivos
institucionais; o **DECIA** (Decisão com Inteligência Artificial) é o centro — mensageria deliberativa em grupo assistida
por IA, ligada ao Criador de Projetos. Requisitos no board Trello **Work Station** (RF1–RF45). Esqueleto herdado do
Fashion AI (FAI), com nomes adaptados (`ws-*`, `br.gov.pr.secid.workstation`, `WS_*`).

Documentos: [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md) ·
[`docs/arquitetura/TAXONOMIA.md`](docs/arquitetura/TAXONOMIA.md) · [`docs/DECISOES.md`](docs/DECISOES.md) ·
[`docs/seguranca/SEGURANCA.md`](docs/seguranca/SEGURANCA.md) · [`docs/design-system/`](docs/design-system/).

## Estado: Bloco 3 (parte 1) — autenticação: Argon2id, bloqueio por conta, limites por IP, JWT

Backend Java 21 / **Spring Boot 4.1.1** multi-módulo, frontend **Next.js 15** mínimo, CI com gates, Docker e compose.
`V2__baseline_dominio_base.sql` cria o domínio base com a política de `ON DELETE` por domínio guardada por teste (D-23).
O Bloco 3 (parte 1) entrega o login local com os controles do D-14: `POST /api/auth/login` sem oráculo (401 genérico
para conta inexistente, senha errada e conta bloqueada), bloqueio de 5 tentativas/15 min com reserva atômica antes do
hash Argon2id, limite por IP+rota antes do Spring Security (IP assinado pelo BFF, IPv6 por /64), teto de hashes
(503 + `Retry-After`), JWT RS256 próprio com `sid` e trilha `audit_log`. Refresh em cookie `ws_rt`, OIDC, RBAC e o
cadastro (RF1) são a parte 2 — controles e testes em [`docs/seguranca/SEGURANCA.md`](docs/seguranca/SEGURANCA.md) §3.

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
| JWT RS256 | **`WS_JWT_PRIVATE_KEY_PATH`**, **`WS_JWT_PUBLIC_KEY_PATH`**, `WS_JWT_ISSUER`, `WS_JWT_AUDIENCE`, `WS_JWT_ACCESS_TTL` | caminhos de PEM gerados por `scripts/keys/generate_jwt_keys.sh`; obrigatórios em prod; sem a privada o login responde 503 |
| Freios de autenticação | `EDGE_PROXY_SECRET`, `WS_CLIENT_IP_HEADER`, `WS_TRUSTED_PROXIES`, `WS_AUTH_HASH_PERMITS`, `WS_AUTH_HASH_WAIT_MILLIS` | segredo do IP assinado pelo BFF (mesmo valor no front, ≥ 32 caracteres); header da borda (`X-Real-IP`), aceito só dos IPs/CIDRs de `WS_TRUSTED_PROXIES` (vazio = ignorado); teto de hashes Argon2 |
| Criptografia | **`WS_DATA_ENCRYPTION_KEY`** | AES-GCM dos campos sensíveis (Bloco 2); obrigatória em prod |
| Aplicação | `PORT`, `WS_APP_BASE_URL`, `WS_FRONTEND_URL`, `WS_CORS_ALLOWED_ORIGINS`, `WS_API_DOCS_ENABLED`, `WS_MANAGEMENT_EXPOSURE`, `WS_SECRETS_ENFORCE`, `WS_LOG_LEVEL*` | prod: docs desligados, só `health` exposto |
| Stores opcionais | `WS_REDIS_*`, `WS_CASSANDRA_*`, `WS_OPENSEARCH_*`, `WS_STORAGE_TYPE`, `WS_S3_*`, `WS_PLATFORM_ENABLED` | desligados por padrão (ARQUITETURA §3.2) |
| IA | `WS_AI_REMOTE_ENABLED`, `WS_AI_REQUEST_TIMEOUT_SECONDS`, `WS_ANTHROPIC_API_KEY`, `WS_GOOGLE_AI_API_KEY` | desligada = só motor local (RF43) |
| Frontend | `NEXT_PUBLIC_API_BASE_URL` | origem da API na CSP (`connect-src`) |

Lista completa e comentada em [`.env.example`](.env.example); runbook de segredos em
[`docs/seguranca/SEGURANCA.md`](docs/seguranca/SEGURANCA.md).

## Módulos (Maven)

| Módulo | Conteúdo |
|---|---|
| `ws-domain` | entidades JPA, enums, repositórios Spring Data. Hoje: `AuditableEntity` (UUID + carimbos), `User` (+ `UserRepository`, `AccountOrigin`, `AccountStatus`, `Role`, `ProfileType`), `AuditLog` append-only |
| `ws-application` | casos de uso e portas. Hoje: `IdentityService` (login sem oráculo, bloqueio atômico, reconferência), `RateLimitPort` + `InMemoryRateLimit`, `PasswordHasherPort`, `TokenIssuerPort`, `AuditPort`, `ApiException`, `Masking` |
| `ws-infrastructure/*` | `persistence-mysql` (Flyway, sempre ligado; `JpaAuditAdapter`), `cache-redis` (`RedisRateLimit`, Lua), `persistence-cassandra`, `search-opensearch`, `storage-s3`, `ai-providers` (Resilience4j), `platform` — cada um opt-in por `@ConditionalOnProperty(ws.<x>.enabled)` |
| `ws-web` | `CorrelationIdFilter`, `ClientIpResolver`, `AuthRateLimitFilter` + `HashBulkhead`, `AuthController` (`POST /api/auth/login`), `Argon2PasswordHasher`, `JwtTokenIssuer`, `GlobalExceptionHandler` → `{code, message, details, correlationId}`, `SecurityConfig` (OAuth2 Resource Server; público: `/actuator/health` e `POST /api/auth/login`; resto do Actuator = ADMIN), `JwtConfig` |
| `ws-bootstrap` | `WorkStationApplication`, `application.yml` + `application-{dev,test,prod}.yml`, `RequiredSecretsGuard`, logback com mascaramento |

Frontend na raiz: `app/` (App Router), `components/ui/` (design system — único lugar com `<button>`, `<a>`, `<input>`…),
`styles/tokens.css` (cópia de `docs/design-system/tokens.css`), `lib/i18n/` (pt-BR/en/es + `qps-ploc`), `middleware.ts` (CSP com nonce).

## Banco (MySQL 8.4 · Flyway)

Schema 100 % por migration em `ws-infrastructure/persistence-mysql/src/main/resources/db/migration/` (`spring.jpa.hibernate.ddl-auto: none`;
o Hibernate nunca cria nem altera tabela). `V1__baseline.sql` (só `app_meta`) e `V2__baseline_dominio_base.sql` (domínio base) nunca são editadas:
mudança = `V3+`. Convenções do V2 (D-23): ids `BINARY(16)` (UUID), enums `VARCHAR` + `CHECK ck_<tabela>_<coluna>`, FK `fk_<tabela>__<coluna>` com
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
| `JsonContractTest` (ws-bootstrap) | Jackson 3 mudar o contrato com o front: `null` em primitivo → padrão, campo desconhecido ignorado, datas ISO-8601 — montado com o `application.yml` real |
| `AutoConfigurationExclusionsTest` | `spring.autoconfigure.exclude` apontando para classe renomeada (o Boot ignora em silêncio e o Cassandra voltaria a ligar) |
| `ApplicationYmlSecurityTest` | senha/chave padrão em qualquer `application*.yml`, TLS desligado, docs/health abertos em prod |
| `RequiredSecretsGuardTest` | boot em prod com `WS_DB_PASSWORD`, `WS_JWT_*_KEY_PATH` ou `WS_DATA_ENCRYPTION_KEY` vazios (mensagem só com os NOMES) |
| `SensitiveDataMaskingConverterTest` | senha/token/JWT/credencial de URL escapando no log |
| `GlobalExceptionHandlerWebTest` (ws-web) | 400/401/403/404/405/409/415/422/429/503/500 fora do formato `ApiError`, stack trace ou mensagem interna no corpo, header `X-Correlation-Id` ausente, `/actuator/*` aberto |
| `IdentityServiceTest` (ws-application) | login virar oráculo (401 diferente para conta inexistente, senha errada ou bloqueada); 403/2FA antes da senha certa; **40 logins em paralelo avaliando mais de 5 senhas reais** (bug do FAI); 6ª reconferência sem 429 |
| `InMemoryRateLimitTest`, `RedisRateLimitIT` (cache-redis, Redis 7 real) | reserva deixar de ser atômica (40 em paralelo → mais de 5 aceitas), `release` negativo, janela estendida por tentativa bloqueada, balde sem TTL |
| `AuthRateLimitFilterTest`, `ClientIpResolverTest`, `AuthControllerWebTest` (ws-web) | 31º login do mesmo IP em 10 min sem 429 + `Retry-After`; IPv6 do mesmo /64 abrindo balde novo; `X-Forwarded-For` forjado mudando o balde; assinatura do BFF errada/vencida aceita; rota com Argon2 sem 503 quando o teto de hashes estoura |
| `Argon2PasswordHasherTest`, `JwtTokenIssuerTest` (ws-web) | parâmetros abaixo do mínimo OWASP; hash fraco sem rehash; token de outra chave aceito; chave inválida vazando conteúdo no erro |
| `WorkStationApplicationIT` | contexto completo + Flyway (V1 e V2 com `success = 1`, `schema.baseline = bloco-2`) contra MySQL 8.4 real (Testcontainers; pulado sem Docker) |
| `forbidden-elements.lint.test.ts` (front) | afrouxar a regra que proíbe elementos nativos fora de `components/ui/**` |
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
