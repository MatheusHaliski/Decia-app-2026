# Segurança — Work Station / DECIA

> Referência: [`ARQUITETURA.md` §3.3](../arquitetura/ARQUITETURA.md) (controles) e §3.4 (gate de CI). Este documento
> registra, para cada controle, **onde está no código, qual teste o protege e como verificar à mão**. O Bloco 1 preenche
> a base; cada bloco/RF seguinte acrescenta as suas linhas (RBAC/Guard, Argon2id, refresh em Redis, AES-GCM, upload,
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

## 2. Pendências por bloco (linhas a acrescentar nesta tabela)

| Bloco | Controle | Observação |
|---|---|---|
| 2 | Baseline real (`users`, `refresh_tokens`, `audit_log`, `ai_inference_log`, `feature_flags`, `domain_events`, `media_objects`), `AesGcmStringConverter` com `WS_DATA_ENCRYPTION_KEY`, `audit_log` com `correlationId` | `AccountOrigin` já existe em `ws-domain` para marcar contas de seed/demo (não pontuam) |
| 3 | RF1–RF3: Argon2id, JWT 10 min + refresh em Redis com rotação por família e revogação, OIDC institucional (Q-02), RBAC `Guard.requireRole/Owner/Participant/Issuer`, testes 403 em todo endpoint, rate limit por IP/usuário | trocar o decodificador "recusa tudo" sem chave por emissão real; `WS_JWT_PRIVATE_KEY_PATH` passa a ser usado |
| (d)+ | Upload: tipo real (magic bytes), limite por formato, antivírus/quarentena, zip-bomb guard; classificação `PUBLICO/INTERNO/RESTRITO/SIGILOSO` e mascaramento antes de IA externa (RF43.CA02); Trivy nas imagens; Playwright smoke | — |

## 3. Runbook de segredos (só nomes)

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
