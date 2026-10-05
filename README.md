# Work Station / DECIA

Produto da **SECID-PR**: o **Work Station** é o app construtor, organizador e conector de tarefas, projetos e objetivos
institucionais; o **DECIA** (Decisão com Inteligência Artificial) é o centro — mensageria deliberativa em grupo assistida
por IA, ligada ao Criador de Projetos. Requisitos no board Trello **Work Station** (RF1–RF45). Esqueleto herdado do
Fashion AI (FAI), com nomes adaptados (`ws-*`, `br.gov.pr.secid.workstation`, `WS_*`).

Documentos: [`docs/arquitetura/ARQUITETURA.md`](docs/arquitetura/ARQUITETURA.md) ·
[`docs/arquitetura/TAXONOMIA.md`](docs/arquitetura/TAXONOMIA.md) · [`docs/DECISOES.md`](docs/DECISOES.md) ·
[`docs/seguranca/SEGURANCA.md`](docs/seguranca/SEGURANCA.md) · [`docs/design-system/`](docs/design-system/).

## Estado: Bloco 1 — esqueleto seguro (fase (a) da ARQUITETURA §6)

Backend Java 21 / **Spring Boot 4.1.1** multi-módulo, frontend **Next.js 15** mínimo, CI com gates, Docker e compose.
Nenhum RF implementado ainda: `V1__baseline.sql` só prova o Flyway; `User` e o baseline real são do Bloco 2.

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
| JWT RS256 | **`WS_JWT_PRIVATE_KEY_PATH`**, **`WS_JWT_PUBLIC_KEY_PATH`**, `WS_JWT_ISSUER`, `WS_JWT_AUDIENCE` | caminhos de PEM gerados por `scripts/keys/generate_jwt_keys.sh`; obrigatórios em prod |
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
| `ws-domain` | entidades JPA, enums, repositórios Spring Data. Hoje: `AuditableEntity` (UUID + carimbos), `AccountOrigin` |
| `ws-application` | casos de uso, portas, eventos, Guard. Hoje: `ApiException(code, status, details)`, `Masking.maskEmail` |
| `ws-infrastructure/*` | `persistence-mysql` (Flyway, sempre ligado), `persistence-cassandra`, `search-opensearch`, `cache-redis`, `storage-s3`, `ai-providers` (Resilience4j), `platform` — cada um opt-in por `@ConditionalOnProperty(ws.<x>.enabled)` |
| `ws-web` | `CorrelationIdFilter`, `GlobalExceptionHandler` → `{code, message, details, correlationId}`, `SecurityConfig` (OAuth2 Resource Server, `/actuator/health` público, resto do Actuator = ADMIN), `JwtConfig` |
| `ws-bootstrap` | `WorkStationApplication`, `application.yml` + `application-{dev,test,prod}.yml`, `RequiredSecretsGuard`, logback com mascaramento |

Frontend na raiz: `app/` (App Router), `components/ui/` (design system — único lugar com `<button>`, `<a>`, `<input>`…),
`styles/tokens.css` (cópia de `docs/design-system/tokens.css`), `lib/i18n/` (pt-BR/en/es + `qps-ploc`), `middleware.ts` (CSP com nonce).

## Testes e gates (`mvn -B -ntp verify` · `npm run lint && npm run typecheck && npm test && npm run build`)

Testes-guarda que falham o build antes do deploy:

| Teste | Protege contra |
|---|---|
| `MigrationVersionsTest` (persistence-mysql) | duas branches com a mesma versão `V<n>__` (SQL e Java, ignora `$`) |
| `JsonContractTest` (ws-bootstrap) | Jackson 3 mudar o contrato com o front: `null` em primitivo → padrão, campo desconhecido ignorado, datas ISO-8601 — montado com o `application.yml` real |
| `AutoConfigurationExclusionsTest` | `spring.autoconfigure.exclude` apontando para classe renomeada (o Boot ignora em silêncio e o Cassandra voltaria a ligar) |
| `ApplicationYmlSecurityTest` | senha/chave padrão em qualquer `application*.yml`, TLS desligado, docs/health abertos em prod |
| `RequiredSecretsGuardTest` | boot em prod com `WS_DB_PASSWORD`, `WS_JWT_*_KEY_PATH` ou `WS_DATA_ENCRYPTION_KEY` vazios (mensagem só com os NOMES) |
| `SensitiveDataMaskingConverterTest` | senha/token/JWT/credencial de URL escapando no log |
| `GlobalExceptionHandlerWebTest` (ws-web) | 400/401/403/404/405/409/415/422/429/503/500 fora do formato `ApiError`, stack trace ou mensagem interna no corpo, header `X-Correlation-Id` ausente, `/actuator/*` aberto |
| `WorkStationApplicationIT` | contexto completo + Flyway contra MySQL 8.4 real (Testcontainers; pulado sem Docker) |
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
- Uma migration Flyway por mudança (`V<n>__rf<nn>_<assunto>.sql`), nunca editar uma aplicada.
- Erros HTTP sempre `{code, message, details, correlationId}`; códigos nomeados nos CAs (`VALIDACAO`, `ACESSO_NEGADO`, …).
- Nenhum HTML/CSS solto nas telas (D-11): componente do design system, cor por token, texto por chave i18n.
