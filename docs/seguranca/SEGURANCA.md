# Segurança — Work Station / DECIA

> Referência: [`ARQUITETURA.md` §3.3](../arquitetura/ARQUITETURA.md) (controles) e §3.4 (gate de CI). Este documento
> registra, para cada controle, **onde está no código, qual teste o protege e como verificar à mão**. O Bloco 1 preenche
> a base, o Bloco 2 o banco; cada bloco/RF seguinte acrescenta as suas linhas (RBAC/Guard, Argon2id, refresh em Redis, AES-GCM, upload,
> rate limit, audit_log, classificação de acesso para IA…). Nenhum valor de segredo aparece aqui — só nomes de variáveis.

## 1. Controles entregues no Bloco 1

| Controle | Onde está | Teste | Como verificar à mão |
|---|---|---|---|
| Sem senha/chave padrão em configuração | `ws-bootstrap/src/main/resources/application*.yml` (`${WS_DB_PASSWORD}` sem default; demais segredos `${VAR:}` vazios) | `ApplicationYmlSecurityTest` (`nenhumArquivoTrazSenhaOuChavePadrao`, `senhaDoBancoEObrigatoriaSemPadrao`) | `grep -rn 'password' ws-bootstrap/src/main/resources/` só mostra placeholders; subir a API sem `WS_DB_PASSWORD` falha em `Could not resolve placeholder 'WS_DB_PASSWORD'` |
| Boot em prod falha com segredo vazio | `RequiredSecretsProperties` + `RequiredSecretsGuard` (`ws.secrets.enforce=true` em `application-prod.yml`); mensagem lista só NOMES | `RequiredSecretsGuardTest` | `SPRING_PROFILES_ACTIVE=prod WS_DB_PASSWORD= java -jar …` → `IllegalStateException: Variáveis de ambiente obrigatórias ausentes ou vazias: WS_DATA_ENCRYPTION_KEY, WS_DB_PASSWORD, WS_JWT_PRIVATE_KEY_PATH, WS_JWT_PUBLIC_KEY_PATH` |
| TLS com o MySQL | `spring.datasource.url` com `sslMode=${WS_DB_SSL_MODE:PREFERRED}` e `allowPublicKeyRetrieval=false`; prod força `REQUIRED` | `ApplicationYmlSecurityTest.tlsPreferidoPorPadraoEObrigatorioEmProd` | ler a URL JDBC no log de boot (DEBUG) ou `SHOW STATUS LIKE 'Ssl_cipher'` na sessão da API |
| Schema só por Flyway, sem `ddl-auto` | `spring.jpa.hibernate.ddl-auto: none`; `persistence-mysql/src/main/resources/db/migration/` | `ApplicationYmlSecurityTest.jacksonEErrosComOContratoDoBoot4`, `MigrationVersionsTest`, `WorkStationApplicationIT.flywayAplicouOBaseline` | `SELECT version, success FROM flyway_schema_history` |
| Actuator fechado (só `GET /actuator/health` público) | `SecurityConfig` (`permitAll` só em health e OpenAPI; `/actuator/**` = `ROLE_ADMIN`); `management.endpoints.web.exposure.include=health` em prod; `show-details: never` em prod | `GlobalExceptionHandlerWebTest.healthEPublicoERestoDoActuatorExigeAdmin`, `WorkStationApplicationIT.healthEPublicoEOResto401EmJson`, `ApplicationYmlSecurityTest.prodExige…` | `curl -i /actuator/health` → 200; `curl -i /actuator/info` → 401 JSON; com token EMPREGADO → 403 |
| API stateless com JWT RS256 (OAuth2 Resource Server) | `SecurityConfig` (CSRF off, `STATELESS`, `oauth2ResourceServer().jwt()`), `JwtConfig` (chave pública PEM de `WS_JWT_PUBLIC_KEY_PATH`; valida `iss`, `aud`, `exp`; sem chave → nenhum token aceito) | `JwtConfigTest` (issuer/audience/expiração; arquivo inválido não vaza conteúdo), `GlobalExceptionHandlerWebTest.semTokenRecebe401EmJsonComCorrelacao` | `curl -i -H 'Authorization: Bearer lixo' /api/x` → 401 `NAO_AUTENTICADO` + `WWW-Authenticate: Bearer` |
| Papel vindo do claim `role` → `ROLE_*` | `SecurityConfig.jwtAuthenticationConverter` | `GlobalExceptionHandlerWebTest` (ADMIN × EMPREGADO em `/actuator/metrics`) | token com `"role":"ADMIN"` acessa `/actuator/*`; outro papel → 403 |
| Erros sem stack trace, formato único `{code, message, details, correlationId}` | `GlobalExceptionHandler` (400/401/403/404/405/409/413/415/422/429/503/500), `ApiError`, `ErrorWriter`, `ApiErrorAuthenticationEntryPoint`, `ApiErrorAccessDeniedHandler`; `spring.web.error.include-stacktrace: never`, `include-message: never` | `GlobalExceptionHandlerWebTest` (corpo não contém `Exception`, stack nem a mensagem interna), `GlobalExceptionHandlerUnitTest` | provocar um 500 e conferir que o corpo traz só `ERRO_INTERNO` + `correlationId`; a stack fica no log do servidor com o mesmo id |
| Correlation id em header, log e erro | `CorrelationIdFilter` (aceita só `[A-Za-z0-9-]{8,64}` do cliente; MDC `correlationId`), `logback-spring.xml` (`[%X{correlationId:-}]`) | `CorrelationIdFilterTest`, `GlobalExceptionHandlerWebTest` | `curl -i -H 'X-Correlation-Id: teste-123456' …` devolve o mesmo header; id inválido é substituído por UUID |
| Cabeçalhos de segurança na API | `SecurityConfig.headers` (HSTS 1 ano + subdomínios, CSP `default-src 'none'; frame-ancestors 'none'`, `Referrer-Policy: no-referrer`, `Permissions-Policy`, COOP, nosniff) | `GlobalExceptionHandlerWebTest.cabecalhosDeSegurancaEmTodaResposta` | `curl -I https://<api>/actuator/health` |
| CORS restrito ao BFF | `SecurityConfig.corsConfigurationSource` ← `WS_CORS_ALLOWED_ORIGINS` (lista explícita, sem `*`) | `JwtConfigTest.propriedadesTemPadroesSeguros` (parse da lista) | `curl -i -H 'Origin: https://outro' -X OPTIONS …` sem `Access-Control-Allow-Origin` |
| Mascaramento de dados pessoais em texto | `Masking.maskEmail` (`m***@g***.com`), `Masking.maskTail` | `MaskingTest` | — |
| Log sem segredo | `SensitiveDataMaskingConverter` (`%mmsg`: `password=`, `senha:`, `token`, `api_key`, `Bearer …`, JWT `eyJ…`, `user:pass@host`) | `SensitiveDataMaskingConverterTest` | logar de propósito `password=x` em dev e ver `password=***` |
| Contrato JSON estável (Jackson 3) | `spring.jackson.deserialization.fail-on-null-for-primitives/unknown-properties: false`, datas ISO-8601 | `JsonContractTest` | `POST` com `"flag":null` e campo extra chega à validação, não vira 400 |
| Autoconfiguração de store opcional não liga sozinha | `spring.autoconfigure.exclude` (5 classes do Cassandra, nomes do Boot 4); adaptadores `@ConditionalOnProperty(ws.<x>.enabled)` | `AutoConfigurationExclusionsTest` (cada classe existe e é `@AutoConfiguration`) | subir sem Cassandra/Redis/OpenSearch e ver a API `UP` |
| Segredos fora do repositório e da imagem | `.gitignore` (`.env`, `keys/`, `*.pem`…), `.dockerignore`, `scripts/keys/generate_jwt_keys.sh` (umask 077, nunca sobrescreve, nunca imprime a chave), `.env.example` só com nomes | job `secrets` do CI (gitleaks no histórico inteiro, `--redact`) | `git ls-files | grep -E '\.env$|\.pem$'` vazio |
| Imagem Docker endurecida | `Dockerfile.backend`: multi-stage, `eclipse-temurin:25-jre-noble`, usuário `ws` (uid 10001), `WS_API_DOCS_ENABLED=false`, `WS_MANAGEMENT_EXPOSURE=health`, `HEALTHCHECK` em `/actuator/health` (start-period 120 s para o Flyway) | — (Trivy entra no CI no próximo bloco) | `docker run --rm work-station-api id` → uid 10001 |
| Compose dev sem credencial padrão e sem exposição | `docker-compose.dev.yml`: `${WS_DB_PASSWORD:?…}`, portas em `127.0.0.1` | — | `docker compose -f docker-compose.dev.yml config` sem `.env` falha com a mensagem |
| Frontend: CSP com nonce, clickjacking, HSTS | `middleware.ts` (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`, `object-src 'none'`, `connect-src 'self' <API>`), `next.config.ts` (nosniff, `X-Frame-Options: DENY`, HSTS, Permissions-Policy, COOP) | `middleware.test.ts` | `curl -I http://localhost:3000/` |
| Frontend: só componentes do design system / cor só por token | `eslint.config.mjs` (`no-restricted-syntax` fora de `components/ui/**`), `stylelint.config.mjs` (`color-no-hex`, funções de cor proibidas fora de `styles/tokens.css`) | `scripts/lint-fixtures/forbidden-elements.lint.test.ts`; `npm run lint` | criar `<button>` numa tela → `npm run lint` falha |
| Dependências vulneráveis | `npm audit --omit=dev --audit-level=high` (CI), `overrides.postcss`; OWASP Dependency-Check (`mvn -Psecurity verify`, `config/dependency-check-suppressions.xml`); Dependabot (maven/npm/actions/docker) | job `frontend` do CI | `npm audit`; `mvn -Psecurity verify` (precisa de rede; `NVD_API_KEY` acelera) |
| Cobertura e análise estática obrigatórias | JaCoCo ≥ 70 % linhas (`ws-application`, `ws-web`), Checkstyle, SpotBugs — no `mvn verify` | próprio build | `mvn -B -ntp verify` |

## 2. Controles entregues no Bloco 2 — banco: integridade e origem dos dados

Baseline real em `ws-infrastructure/persistence-mysql/src/main/resources/db/migration/V2__baseline_dominio_base.sql` (D-23, Q-76).
Fonte de verdade do schema é a migration; `TAXONOMIA.md` foi alinhada a ela.

| Controle | Onde está | Teste | Como verificar à mão |
|---|---|---|---|
| Política de `ON DELETE` por domínio codificada e comparada com o banco | `ForeignKeyPolicy.POLICY` (`persistence-mysql/.../mysql/schema/`), FKs nomeadas `fk_<tabela>__<coluna>` com `ON DELETE`/`ON UPDATE` explícitos no V2 | `ForeignKeyPolicyTest` (Testcontainers MySQL 8.4, Flyway do zero: FK extra, faltante ou divergente falha), `ForeignKeyPolicyUnitTest` (mesma comparação contra o texto das migrations, sem Docker) | `SELECT k.TABLE_NAME, k.COLUMN_NAME, r.DELETE_RULE FROM information_schema.KEY_COLUMN_USAGE k JOIN information_schema.REFERENTIAL_CONSTRAINTS r USING (CONSTRAINT_SCHEMA, CONSTRAINT_NAME) WHERE k.TABLE_SCHEMA = DATABASE()` e conferir com a tabela abaixo |
| Trilhas append-only nunca cascateiam | `audit_log.actor_id`, `ai_inference_log.user_id`/`reviewed_by` → `users` `RESTRICT` | `ForeignKeyPolicyUnitTest.trilhasAppendOnlyNuncaCascateiam`, `ForeignKeyPolicyTest.trilhaAppendOnlySeguraOUsuarioEDadoDoDonoVaiJunto` | `DELETE FROM users WHERE …` com linha em `audit_log` → erro `fk_audit_log__actor_id` |
| Conta sintética marcada no banco, não na aplicação | `users.account_origin` (`VARCHAR` + `CHECK ck_users_account_origin`: REAL · TEST_SEED · DEMO · SYSTEM), `fixture_key` único, `test_account` **gerada** (`account_origin IN ('TEST_SEED','DEMO')` STORED, indexada); enum `AccountOrigin` em `ws-domain` | `ForeignKeyPolicyTest.testAccountEColunaGeradaDaOrigemDaConta`, `.checkDeAccountOriginBarraValorInvalidoEGeradaSegueAOrigem`, `AccountOriginTest` | `INSERT … account_origin = 'X'` → `Check constraint 'ck_users_account_origin' is violated`; `SELECT EXTRA FROM information_schema.COLUMNS WHERE TABLE_NAME='users' AND COLUMN_NAME='test_account'` → `STORED GENERATED` |
| Nunca `SET FOREIGN_KEY_CHECKS=0`; toda FK com nome e regras explícitas | V2 (cabeçalho) | `ForeignKeyPolicyUnitTest.migrationsNuncaDesligamAChecagemDeFk`, `.politicaEspelhaAsFksDeclaradasNasMigrationsSql` | `grep -rn FOREIGN_KEY_CHECKS ws-infrastructure/persistence-mysql/src/main/resources/db/migration/` só no comentário |
| Migrations imutáveis e versionadas sem colisão | `V1__baseline.sql`, `V2__baseline_dominio_base.sql`; `spring.flyway.validate-on-migrate: true` | `MigrationVersionsTest` (V1/V2 pelo nome, versões únicas, nenhuma migration Java ainda), `WorkStationApplicationIT.historicoDoFlywayTemV1EV2ComSucesso`, `ForeignKeyPolicyTest.v1EV2EstaoNoHistoricoDoFlywayEBaselineEBloco2` | `SELECT version, script, success FROM flyway_schema_history`; `SELECT meta_value FROM app_meta WHERE meta_key='schema.baseline'` → `bloco-2` |
| Schema só por Flyway (Hibernate não cria nem altera tabela) | `spring.jpa.hibernate.ddl-auto: none` em `application.yml`; nenhuma entidade de domínio neste bloco (auth é o Bloco 3) | `ApplicationYmlSecurityTest`, `WorkStationApplicationIT` (lista de tabelas = a do V2) | subir a API e conferir que `SHOW TABLES` só tem as tabelas das migrations |
| Stores opcionais e IA externa nascem desligados | `feature_flags`: `redis.enabled`, `cassandra.enabled`, `opensearch.enabled`, `storage.s3`, `ai.provider.claude`, `ai.provider.gemini` = FALSE; `ai.local.only` = TRUE | `ForeignKeyPolicyTest.v1EV2EstaoNoHistoricoDoFlywayEBaselineEBloco2` (só `ai.local.only` ligada) | `SELECT flag_key, enabled FROM feature_flags` |
| Dados pessoais cifrados no banco, hash para busca | `users.email_enc`, `users.phone_enc` (AES-GCM, `WS_DATA_ENCRYPTION_KEY`), `users.email_hash` único; `refresh_tokens.token_hash` (só o hash do token) | — (o `AesGcmStringConverter` e o `UserEntity` entram no Bloco 3 junto com a auth) | `SELECT email_enc FROM users` nunca mostra e-mail em claro |

### 2.1 Política de FK (`ForeignKeyPolicy.POLICY` = FKs do V2)

| tabela.coluna | → referência | ON DELETE | Motivo |
|---|---|---|---|
| `user_preferences.user_id` | `users.id` | **CASCADE** | preferências são dado do dono; somem com a conta sintética apagada |
| `refresh_tokens.user_id` | `users.id` | **CASCADE** | sessões são do dono; apagar conta = revogar tudo |
| `refresh_tokens.rotated_from_id` | `refresh_tokens.id` | **SET NULL** | o token rotacionado continua válido como histórico sem o anterior (único caso de SET NULL) |
| `media_objects.owner_id` | `users.id` | **CASCADE** | mídia enviada pertence ao dono |
| `audit_log.actor_id` | `users.id` | **RESTRICT** | trilha append-only: apagar usuário com trilha é erro, não limpeza; `NULL` = sistema/anônimo |
| `ai_inference_log.user_id` | `users.id` | **RESTRICT** | trilha append-only de custo/mascaramento/fallback; nunca cascateia |
| `ai_inference_log.reviewed_by` | `users.id` | **RESTRICT** | revisão humana faz parte da trilha |

Sem FK ainda (entram com a tabela-pai e a linha na POLICY no mesmo commit): `users.company_id`/`department_id` e
`ai_inference_log.department_id` → RF28 (`RESTRICT`, catálogo institucional). `domain_events` não tem FK por desenho
(outbox sobrevive ao agregado). Conta `REAL` nunca recebe `DELETE`: é anonimizada (D-18); o `DELETE` físico só existe
para `TEST_SEED`/`DEMO` no reset de ambiente e, por causa do `RESTRICT`, esse reset apaga a trilha antes (Q-80).

## 3. Pendências por bloco (linhas a acrescentar nesta tabela)

| Bloco | Controle | Observação |
|---|---|---|
| 2 → 3 | ~~Baseline real~~ (entregue na seção 2). Ficam para o Bloco 3, junto com `UserEntity` e a auth: `AesGcmStringConverter` com `WS_DATA_ENCRYPTION_KEY` (grava `email_enc`/`phone_enc`), escrita do `audit_log` com `correlationId` do `CorrelationIdFilter`, espelho Redis ↔ `refresh_tokens` | colunas já existem no V2; a FK de `companies`/`departments` entra no RF28 |
| 3 | RF1–RF3: Argon2id, JWT 10 min + refresh em Redis com rotação por família e revogação, OIDC institucional (Q-02), RBAC `Guard.requireRole/Owner/Participant/Issuer`, testes 403 em todo endpoint, rate limit por IP/usuário | trocar o decodificador "recusa tudo" sem chave por emissão real; `WS_JWT_PRIVATE_KEY_PATH` passa a ser usado |
| (d)+ | Upload: tipo real (magic bytes), limite por formato, antivírus/quarentena, zip-bomb guard; classificação `PUBLICO/INTERNO/RESTRITO/SIGILOSO` e mascaramento antes de IA externa (RF43.CA02); Trivy nas imagens; Playwright smoke | — |

## 4. Runbook de segredos (só nomes)

| Segredo | Variável | Gerar | Onde fica | Rotação |
|---|---|---|---|---|
| Senha do MySQL da aplicação | `WS_DB_PASSWORD` | gerador do provedor/cofre (≥ 24 caracteres aleatórios) | cofre do ambiente / secret do orquestrador; local: `.env` | trocar no banco e no cofre, reiniciar a API; nunca reaproveitar entre ambientes |
| Senha root do MySQL (só dev) | `WS_DB_ROOT_PASSWORD` | idem | `.env` local; nunca em prod (o provedor gerencia) | a cada recriação do volume |
| Par RS256 do JWT | `WS_JWT_PRIVATE_KEY_PATH`, `WS_JWT_PUBLIC_KEY_PATH` | `scripts/keys/generate_jwt_keys.sh [dir] [bits≥2048]` | arquivos PEM montados como *file secret*; local: `./keys/` (ignorado) | gerar novo par, publicar a pública, trocar a privada no serviço emissor → tokens antigos expiram em ≤ 10 min; usuários entram de novo |
| Chave AES-GCM dos campos sensíveis | `WS_DATA_ENCRYPTION_KEY` | `openssl rand -base64 32` | cofre; nunca em log, nunca em `application*.yml` | rotação exige recriptografar (job do Bloco 2); planejar versionamento da chave (`kid`) |
| Credenciais de stores opcionais | `WS_REDIS_PASSWORD`, `WS_CASSANDRA_PASSWORD`, `WS_OPENSEARCH_PASSWORD`, `WS_S3_SECRET_ACCESS_KEY` | provedor | cofre; só quando a flag do store estiver ligada | conforme o provedor |
| Chaves de IA externa | `WS_ANTHROPIC_API_KEY`, `WS_GOOGLE_AI_API_KEY` | console do provedor, com teto de gasto | cofre; `WS_AI_REMOTE_ENABLED=false` sem elas | revogar no console e trocar no cofre |
| Varredura de dependências | `NVD_API_KEY` | nvd.nist.gov | secret do CI | anual |

Regras: (1) `.env` nunca é commitado; o CI falha no gitleaks se um valor aparecer no histórico — nesse caso **troque o
segredo** antes de reescrever o histórico; (2) documentação e `.env.example` citam só o nome; (3) a API em prod não
sobe com segredo vazio (seção 1) — não contorne com `WS_SECRETS_ENFORCE=false`; (4) falsos positivos do gitleaks
entram em `.gitleaksignore` com commit, arquivo, regra, linha e motivo.
