# SEG — Segurança, integridade e operação herdadas do FAI (RF49)
**HU:** transversal (RF1–RF3 e todo RF com `{id}`, mídia ou IA) · **Sprint (board Work Station):** desde o esqueleto (fase *a* da ARQUITETURA §6) · **Equivalente FAI:** RF49 "Proteger contas e a plataforma: sessão segura, limites contra força bruta, bancos endurecidos, dados demo isolados e entrega confiável" (`docs/novos-rf/RF49_Seguranca_Integridade_Operacao.md`, `docs/diagramas/RF49/*.puml`) · **Aba/rota:** `/bff/auth/*` → `/api/auth/*`, `/api/me/*`, `/api/admin/demo/*`, `/gate`
**Critérios de aceite cobertos:** FAI RF49.CA01 … CA10 e RN49.01 … RN49.12, adaptados ao Work Station e marcados "(CA a confirmar)" — **Q-48:** ainda não está decidido se isto vira um **RF** no board Work Station (ex.: RF47) ou um **RNF**; nenhum card foi criado. Decisões: **D-13** (Spring Boot 4.1.x, JVM 25 LTS) e **D-14** (controles herdados desde o esqueleto). Dúvidas abertas: Q-48 (RF ou RNF), Q-49 (TTL do access token: 10 ou 15 min), Q-50 (teto de gasto `AiBudget`), Q-51 (hospedagem → `infra/<provedor>/`), Q-52 (branch protection na `main`).

> Não é um RF do board: é a pasta pedida pela D-14 e pelo brief de segurança (blocos 0–8). Os cinco diagramas seguem a `CONVENCOES.md`; os nomes já são os do Work Station (`br.gov.pr.secid.workstation`, `ws-*`, `ws_rt`, `X-Ws-*`, `WS_*`). Dois bugs do FAI que só apareceram sob ataque real guiam o desenho: o **hash avaliado em corrida** (40 pedidos paralelos avaliavam 40 senhas) e o **pool do banco esgotado** (60 logins paralelos → 50 respostas 500).

## Regras e critérios herdados (todos "CA a confirmar")

| Id | Enunciado adaptado ao Work Station | Bloco do brief |
|---|---|---|
| **RN49.01** | Nenhum token de sessão no `localStorage`/`sessionStorage`; o refresh fica só no cookie `ws_rt` (HttpOnly, Secure, SameSite=Strict) e o access token só em memória. | 4 |
| **RN49.02** | O login responde igual (401 genérico, mesmo tempo) para conta inexistente (hash falso), senha errada e conta bloqueada — mesmo com a senha certa. `403 CONTA_INDISPONIVEL` e `401 DOIS_FATORES_NECESSARIO` só depois da senha certa e fora do bloqueio. | 3 |
| **RN49.03** | No máximo 5 tentativas de senha por conta em 15 min, reservadas de forma atômica (`tryAcquire` INCR) **antes** do hash; a reserva volta (`release`) só com senha certa. Vale para troca de senha, dados sensíveis, exclusão e todo *step-up* (`429 MUITAS_TENTATIVAS` + `Retry-After`). A redefinição por e-mail tira a conta do bloqueio. | 3 |
| **RN49.04** | O limite por IP usa o IP assinado pelo BFF (`X-Ws-Client-Ip`/`X-Ws-Proxy-Ts`/`X-Ws-Proxy-Sig`, HMAC-SHA256 com `EDGE_PROXY_SECRET`, 60 s) › `X-Real-IP` da borda › TCP; nunca `X-Forwarded-For`; IPv6 conta por /64. | 3 |
| **RN49.05** | Teto de hashes Argon2 simultâneos (`HashBulkhead`, permits = `max(1, min(max(2, núcleos), pool/2))`, espera 2 s); o excedente recebe `503 AUTENTICACAO_OCUPADA` + `Retry-After` sem derrubar o resto da API. | 3 |
| **RN49.06** | Mídia privada (`restricted/`: backups, anexos RESTRITO/SIGILOSO, áudio de reunião) só pelo proxy da API e só para o dono, quem a classificação libera ou ADMIN (`OwnMedia`). | 5 |
| **RN49.07** | Chaves de IA e segredos só no servidor (cabeçalho, host permitido do provedor); e-mail em log sempre mascarado (`maskEmail`); log nunca leva senha, token ou código. | 1, 5 |
| **RN49.08** | Bancos só na rede privada, TLS obrigatório, usuário da aplicação de menor privilégio (`ws_app`) e usuário de backup só leitura (`ws_backup`); Redis com ACL sem `@dangerous`. | 7 |
| **RN49.09** | Política de `ON DELETE` por domínio escrita em cada FK desde o `V1__baseline.sql`: dono → CASCADE; catálogo institucional → RESTRICT; SET NULL só quando o filho continua válido; trilhas append-only → RESTRICT. Nunca `SET FOREIGN_KEY_CHECKS=0`. Conferida por `ForeignKeyPolicyTest`. | 2 |
| **RN49.10** | Só contas `TEST_SEED`/`DEMO` (`account_origin`) podem ser apagadas pelo reset demo; conta `REAL` é anonimizada (LGPD), nunca apagada. | 2, 6 |
| **RN49.11** | Fixtures usam `@example.test` e o prefixo `demo_` (reservado no cadastro, junto com `e2e_`, `admin`, `root`, `suporte`, `secid`, `decia`, `workstation`); o envio de e-mail recusa `.test`, `.example`, `.invalid`, `.localhost`. | 6 |
| **RN49.12** | Versão de migration única (`MigrationVersionsTest`); major de framework é migração, não bump; só JVM LTS na imagem (D-13). | 0, 1 |
| **CA01** | 60 logins em paralelo: nenhum HTTP 500 e no máximo 5 senhas avaliadas por conta. | 3 |
| **CA02** | Conta bloqueada: até a senha certa recebe 401 genérico; passados 15 min, ou depois de redefinir a senha por e-mail, entra. | 3 |
| **CA03** | Sessão roubada: o 6º chute da senha atual na troca de senha recebe `429 MUITAS_TENTATIVAS`. | 3 |
| **CA04** | Mesmo IP: o 31º login em 10 min recebe 429 com `Retry-After`; trocar o fim do IPv6 (mesmo /64) não abre balde novo; `X-Forwarded-For` forjado não muda o balde. | 3 |
| **CA05** | Recarregar a página mantém a sessão pelo cookie `ws_rt`, sem nenhum token no `localStorage` (teste falha se aparecer). | 4 |
| **CA06** | Mídia de outra pessoa ou em `restricted/` não abre para quem não é dono nem ADMIN; todo endpoint com `{id}` tem teste BOLA e toda rota de papel tem teste BFLA (`Guard` relê o papel no banco). | 5 |
| **CA07** | Banco novo (V1 → última versão): a API sobe e o `ForeignKeyPolicyTest` mostra 0 divergências. | 2 |
| **CA08** | O CI fica vermelho com migration repetida, segredo no histórico (gitleaks `fetch-depth: 0`), quebra do contrato JSON ou exclusão de autoconfiguração inexistente. | 1 |
| **CA09** | Um deploy que não sobe não tira a versão anterior do ar (healthcheck `/actuator/health` com timeout cobrindo o Flyway). | 1, 7 |
| **CA10** | Seed demo idempotente (upsert por `fixture_key`); o reset exige `dryRun` → `planHash` → `confirm=<planHash>` e nunca apaga conta `REAL`; `DemoEnvironmentGuard` desligado por padrão e, em produção, exige `WS_DEMO_ALLOW_PRODUCTION=true`. | 6 |

## 0. Diagrama de casos de uso

Os casos de uso de segurança atravessam todos os RF: proteger a conta, negar acesso a recurso alheio, tratar mídia e IA com cuidado e garantir que a operação não perca dados. Atores do catálogo em [`ATORES_E_ATRIBUTOS.md`](../../arquitetura/ATORES_E_ATRIBUTOS.md).

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  classDef ucDemo fill:#fff8e6,stroke:#b26a00,stroke-dasharray:2 2,color:#1b1b1b
  visitante["«ator» Visitante"]:::ator
  autenticado["«ator» Pessoa autenticada"]:::ator
  admin["«ator» Administrador"]:::ator
  subgraph SIS["Work Station — SEG Segurança e operação"]
    direction TB
    UC1(["UC1 Entrar sem revelar se a conta existe"]):::uc
    UC2(["UC2 Bloquear força bruta por conta e por IP"]):::uc
    UC3(["UC3 Manter a sessão só em cookie HttpOnly"]):::uc
    UC4(["UC4 Negar recurso alheio com 404 uniforme"]):::uc
    UC5(["UC5 Abrir mídia privada só pelo proxy da API"]):::ucPlan
    UC6(["UC6 Mascarar dados pessoais antes da IA"]):::uc
    UC7(["UC7 Registrar auditoria sem segredo"]):::uc
    UC8(["UC8 Recusar migração repetida, segredo no histórico ou contrato quebrado"]):::uc
    UC9(["UC9 Recriar dados de demonstração sem tocar contas reais"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  visitante --- UC1
  autenticado --- UC3
  autenticado --- UC4
  autenticado --- UC5
  admin --- UC9
  UC1 -. "«include»" .-> UC2
  UC6 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Entrar sem revelar se a conta existe | Visitante | RN49.02, CA02 | real: hash falso e mesma resposta (`IdentityService.login`) |
| UC2 Bloquear força bruta por conta e por IP | (sistema) | RN49.03, RN49.04, RN49.05, CA01, CA03, CA04 | real: `RateLimitPort`, `AuthRateLimitFilter`, `HashBulkhead` |
| UC3 Manter a sessão só em cookie HttpOnly | Pessoa autenticada | RN49.01, CA05 | real: `ws_rt` HttpOnly; access token só em memória |
| UC4 Negar recurso alheio com 404 uniforme | Pessoa autenticada | CA06 | real: `ResourceAuthorizer`, `AccessPolicy`, `AuthorizationEnforcementAdvice` |
| UC5 Abrir mídia privada só pelo proxy da API | Pessoa autenticada | RN49.06, CA06 | planejado: `MediaAccessPolicy` existe; `MediaUploadService` ainda não é bean |
| UC6 Mascarar dados pessoais antes da IA | IA | RN49.07 | real: `PersonalDataMasker` no `AiGateway`; nenhum motor registrado |
| UC7 Registrar auditoria sem segredo | (sistema) | RN49.07 | real: `AuditLogPort` com e-mail mascarado |
| UC8 Recusar migração repetida, segredo no histórico ou contrato quebrado | (sistema) | RN49.08, RN49.09, RN49.12, CA07, CA08, CA09 | real: CI (`MigrationVersionsTest`, gitleaks, contrato OpenAPI, `ForeignKeyPolicyTest`) |
| UC9 Recriar dados de demonstração sem tocar contas reais | Administrador | RN49.10, RN49.11, CA10 | planejado (seed demo) |

## 1. Diagrama de classes

Freios de autenticação (`ws-web/support` e `ws-web/security`), contador atômico (`RateLimitPort` e adaptadores), identidade e autorização (`ws-application`), origem da conta e política de FKs (`ws-domain`, `ws-infrastructure/persistence-mysql`) e dados demo. Entidades conforme `docs/arquitetura/TAXONOMIA.md` §1 e §12 (subconjunto de atributos).

```mermaid
classDiagram
  direction LR

  namespace ws_web_support {
    class AuthRateLimitFilter {
      <<adapter>>
      +RULES: List~Rule~
      -rateLimit: RateLimitPort
      -clientIp: ClientIpResolver
      -bulkhead: HashBulkhead
      +ruleFor(method, path) Optional~Rule~
      +bucketKey(ip) String
      #doFilterInternal(req, res, chain) void
      -reject(res, status, retryAfter, code) void
    }
    class Rule {
      <<record>>
      +method: String
      +path: String
      +limit: int
      +window: Duration
      +hashes: boolean
      +matches(method, path) boolean
      +bucket() String
    }
    class ClientIpResolver {
      <<adapter>>
      +SIGNED_IP: String
      +SIGNED_TS: String
      +SIGNED_SIG: String
      +MAX_SKEW_SECONDS: long
      +MIN_SECRET_LENGTH: int
      -edgeSecret: byte[]
      -header: String
      +resolve(request) String
      -signedIp(ip, ts, sig) String
      -literalIp(raw) String
      +socketAddress(request) String
    }
    class HashBulkhead {
      <<adapter>>
      -permits: Semaphore
      -waitMillis: long
      +defaultPermits(cores, dbPool) int
      +tryAcquire() boolean
      +release() void
    }
    class CorrelationIdFilter {
      <<adapter>>
      +doFilterInternal(req, res, chain) void
    }
  }

  namespace ws_web_security {
    class Argon2PasswordHasher {
      <<adapter>>
      +MEMORY_KIB: int
      +ITERATIONS: int
      +PARALLELISM: int
      +SALT_LENGTH: int
      +HASH_LENGTH: int
      +hash(raw) String
      +matches(raw, encoded) boolean
      +needsRehash(encoded) boolean
    }
    class JwtTokenIssuer {
      <<adapter>>
      -issuer: String
      -audience: String
      -ttl: Duration
      +issueAccessToken(user, familyId) String
      +accessTokenTtl() Duration
    }
    class SessionActiveFilter {
      <<adapter>>
      -identity: IdentityService
      +doFilterInternal(req, res, chain) void
    }
  }

  namespace ws_application {
    class RateLimitPort {
      <<port>>
      +tryAcquire(owner, bucket, limit, window) boolean
      +status(owner, bucket, limit, window) QuotaStatus
      +reset(owner, bucket) void
      +release(owner, bucket) void
    }
    class QuotaStatus {
      <<value>>
      +limit: int
      +used: long
      +resetAt: Instant
      +exhausted() boolean
    }
    class PasswordHasherPort {
      <<port>>
      +hash(raw) String
      +matches(raw, encoded) boolean
      +needsRehash(encoded) boolean
    }
    class TokenIssuerPort {
      <<port>>
      +issueAccessToken(user, familyId) String
      +accessTokenTtl() Duration
    }
    class IdentityService {
      <<service>>
      +LOGIN_FAIL: String
      -MAX_LOGIN_FAILURES: int
      -LOCK_WINDOW: Duration
      +MAX_CODE_ATTEMPTS: int
      +CODE_ATTEMPTS_PER_HOUR: int
      +RESERVED_USERNAMES: Set~String~
      -dummyHash: String
      +login(cmd LoginCommand, ip, userAgent) Session
      +refresh(rawRefresh, ip, userAgent) Session
      +changePassword(current, familyId, atual, nova, confirma) int
      +reauthenticate(userId, senha) void
      +confirmPasswordReset(token, nova, confirma) void
      +verifyEmail(current, code) UserCard
      +requireCodeAttemptQuota(userId, purpose) void
      +sessionActive(familyId) boolean
      +reservedUsername(normalized) boolean
      +maskEmail(mail) String
      -passwordMatchesWithLockout(user, senha, via) boolean
      -revokeFamily(familyId) void
    }
    class Guard {
      <<service>>
      +requireRole(user, role) void
      +requireOwner(user, ownerId, resource) void
      +requireParticipant(user, sessionId) void
      +requireIssuer(user, sealId) void
      +requireAdmin(user) void
      +deny(user, resource, message) ApiException
    }
    class OwnMedia {
      <<service>>
      +accepts(ownerId, url, classification) boolean
      +require(ownerId, url, field, classification) String
      +requireOrUnchanged(ownerId, url, field, classification, current) String
    }
    class AiBudget {
      <<service>>
      +check(userId, pending) Verdict
      +globalDaily() BigDecimal
      +userDaily() BigDecimal
    }
    class AdminBootstrap {
      <<service>>
      -email: String
      -password: String
      -promoteExisting: boolean
      +ensureAdmin() void
      -promote(user) void
    }
    class DemoEnvironmentGuard {
      <<service>>
      -enabled: boolean
      -allowProduction: boolean
      +requireEnabled() void
      +production() boolean
    }
    class DemoDataAdminPort {
      <<port>>
      +testAccountIds() List~UUID~
      +realAccountsAmong(ids) long
      +plan(ids) ResetCounts
      +lockAccounts(ids) void
      +deleteTestAccounts(ids) long
      +integrityProblems(fixtureKeys) List~String~
    }
  }

  namespace ws_infrastructure {
    class InMemoryRateLimit {
      <<adapter>>
      +DEFAULT_MAX_ENTRIES: int
      -windows: ConcurrentHashMap
      +tryAcquire(owner, bucket, limit, window) boolean
      +release(owner, bucket) void
      -sweep(now) void
    }
    class RedisRateLimit {
      <<adapter>>
      -acquireLua: RedisScript
      -releaseLua: RedisScript
      +tryAcquire(owner, bucket, limit, window) boolean
      +release(owner, bucket) void
    }
    class MysqlDemoDataAdminAdapter {
      <<adapter>>
      -edges() List~Edge~
      -deletedRows(edges) Map
    }
    class ForeignKeyPolicy {
      <<adapter>>
      +POLICY: List~Fk~
      +sameRule(atual, politica) boolean
      +divergences(informationSchema) List~String~
    }
    class Fk {
      <<record>>
      +table: String
      +column: String
      +refTable: String
      +refColumn: String
      +onDelete: String
    }
  }

  namespace ws_domain {
    class User {
      <<entity>>
      +id: UUID
      +username: String
      +emailHash: String
      +passwordHash: String
      +role: Role
      +status: AccountStatus
      +twoFactorEnabled: boolean
      +accountOrigin: AccountOrigin
      +fixtureKey: String
      +testAccount: boolean
      +isTestAccount() boolean
    }
    class AccountOrigin {
      <<enum>>
      REAL
      TEST_SEED
      DEMO
      SYSTEM
      +isTest() boolean
    }
    class AuditLog {
      <<entity>>
      +actorId: UUID
      +action: String
      +result: String
      +ip: String
      +correlationId: String
    }
  }

  AuthRateLimitFilter *-- Rule
  AuthRateLimitFilter --> ClientIpResolver : resolve(request)
  AuthRateLimitFilter --> HashBulkhead : rotas com hashes
  AuthRateLimitFilter --> RateLimitPort : balde por IP
  CorrelationIdFilter ..> ClientIpResolver : ip no MDC
  RateLimitPort ..> QuotaStatus
  RateLimitPort <|.. InMemoryRateLimit
  RateLimitPort <|.. RedisRateLimit
  PasswordHasherPort <|.. Argon2PasswordHasher
  TokenIssuerPort <|.. JwtTokenIssuer
  IdentityService --> RateLimitPort : balde login-fail por conta
  IdentityService --> PasswordHasherPort
  IdentityService --> TokenIssuerPort
  IdentityService ..> User
  IdentityService ..> AuditLog : LOGIN_OK LOGIN_FALHA LOGIN_BLOQUEADO_TENTATIVAS REFRESH_REUSO
  SessionActiveFilter --> IdentityService : sessionActive(sid)
  Guard ..> User : relê o papel no banco
  Guard ..> AuditLog : ACESSO_NEGADO
  AdminBootstrap --> PasswordHasherPort
  AdminBootstrap ..> User : cria ADMIN só se não existe
  DemoDataAdminPort <|.. MysqlDemoDataAdminAdapter
  MysqlDemoDataAdminAdapter ..> ForeignKeyPolicy : confere desvio
  ForeignKeyPolicy *-- Fk
  User --> AccountOrigin
  DemoEnvironmentGuard ..> DemoDataAdminPort : libera seed e reset

  note for AuthRateLimitFilter "OncePerRequestFilter antes do Spring Security. RULES: login 30/10 min, register 10/h, refresh 120/10 min, password-reset request 10/h e confirm 20/h, PUT password 20/h, PATCH me/sensitive 30/h, POST me/deletion 10/h, username availability 120 e suggestions 60/10 min, envios do cadastro 40/h. 429 MUITAS_TENTATIVAS e 503 AUTENTICACAO_OCUPADA, ambos com Retry-After."
  note for ClientIpResolver "Ordem: X-Ws-Client-Ip assinado (HMAC-SHA256 de ip|ts com EDGE_PROXY_SECRET, 60 s, tempo constante) › X-Real-IP › TCP. Nunca X-Forwarded-For. Segredo ausente ou com menos de 32 caracteres: WARN no boot."
  note for HashBulkhead "permits = max(1, min(max(2, núcleos), poolDoBanco/2)). Espera até 2 s e devolve a vaga em finally."
  note for RateLimitPort "Redis: INCR + EXPIRE num script Lua. RELEASE em Lua: GET e DECR só se maior que 0. Memória: teto de 100 mil baldes e varredura dos vencidos. release tem implementação padrão vazia."
  note for IdentityService "Login sem oráculo: conta inexistente avalia dummyHash e responde 401 genérico. tryAcquire antes do hash, matches sempre, release só com senha certa, reset após login completo. Reservados: admin, root, suporte, secid, decia, workstation e prefixos demo_ e e2e_. maskEmail: m***@dominio."
  note for Argon2PasswordHasher "Argon2id m=19456 KiB, t=2, p=1, salt 16, hash 32 (mínimo OWASP). Rehash no login quando os parâmetros mudam."
  note for JwtTokenIssuer "RS256 com iss, aud e claims user_id, sid, role, profile_type. TTL em aberto na Q-49 (10 ou 15 min). Chaves por scripts/keys/generate_jwt_keys.sh, fora do git e da imagem."
  note for AdminBootstrap "Senha de WS_ADMIN_PASSWORD (segredo, mínimo 12). Nunca promove conta existente sem WS_ADMIN_PROMOTE_EXISTING=true."
  note for ForeignKeyPolicy "Lista POLICY conferida pelo ForeignKeyPolicyTest (Testcontainers MySQL) contra INFORMATION_SCHEMA. Dono CASCADE, catálogo RESTRICT, SET NULL só com filho válido, trilhas append-only RESTRICT."
  note for AccountOrigin "users.account_origin desde o V1__baseline.sql, fixture_key UNIQUE e coluna gerada test_account. Contas de teste fora de rankings, HSE, DECIA Points e métricas do RF43."
```

## 2. Diagrama de atividades

Login (e reconferência de senha) atravessando as camadas de defesa. Raias: Pessoa · Borda · Web/BFF (Next.js) · `ws-web` (filtros) · `ws-application` (`IdentityService`) · Persistência. O RF não usa o AiEngine.

```mermaid
flowchart TD
  subgraph L0["Ator humano — Pessoa"]
    A1(["Envia identifier e senha (ou troca de senha, dados sensíveis, exclusão)"])
    A9(["Entra"])
  end

  subgraph LB["Borda — WAF · Turnstile · Cloudflare Access (bloco 8)"]
    B1{"Desafio anti-bot e limites da borda ok?"}
    B1 -->|não| EB["Bloqueado na borda (espelha os limites da API)"]
    B1 -->|sim| B2{"Ambiente dev/test/staging sem gate?"}
    B2 -->|sim| EG["/gate: token por pessoa (8 erros por IP em 15 min)"]
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    C1["middleware.ts: CSP com nonce, HSTS, safeNext"]
    C1 --> C2["POST /bff/auth/login (mesma origem)"]
    C2 --> C3{"EDGE_PROXY_SECRET com 32+ caracteres?"}
    C3 -->|sim| C4["Assina o IP: X-Ws-Client-Ip, X-Ws-Proxy-Ts, X-Ws-Proxy-Sig = HMAC-SHA256(ip|ts)"]
    C3 -->|não| C5["Sem assinatura (a API avisou no boot)"]
    C8["Refresh em cookie ws_rt (HttpOnly, Secure, SameSite=Strict) e access token só em memória"]
  end

  subgraph L3["ws-web — filtros antes do Spring Security"]
    D1["CorrelationIdFilter → idioma → DevGateFilter"]
    D1 --> D2["ClientIpResolver: IP assinado (60 s) › X-Real-IP › TCP, IPv6 por /64, nunca X-Forwarded-For"]
    D2 --> D3["AuthRateLimitFilter: tryAcquire(ip, método+rota) no RateLimitPort"]
    D3 --> D4{"Balde do IP estourado?"}
    D4 -->|sim| E429["429 MUITAS_TENTATIVAS + Retry-After"]
    D4 -->|não| D5{"A rota calcula Argon2?"}
    D5 -->|sim| D6{"HashBulkhead: vaga em até 2 s?"}
    D6 -->|não| E503["503 AUTENTICACAO_OCUPADA + Retry-After"]
    D6 -->|sim| D7["Segue para o AuthController"]
    D5 -->|não| D7
    D9["finally: HashBulkhead.release()"]
  end

  subgraph L4["ws-application — IdentityService"]
    F1{"Conta existe?"}
    F1 -->|não| F2["matches(senha, dummyHash) — mesmo tempo"]
    F2 --> F3["AuditLog LOGIN_FALHA (usuario_inexistente)"]
    F3 --> E401a["401 genérico"]
    F1 -->|sim| F4["tryAcquire(userId, login-fail, 5, 15 min) — reserva atômica ANTES do hash"]
    F4 --> F5["Argon2id matches(senha, passwordHash) — sempre, bloqueada ou não"]
    F5 --> F6{"Reserva acima de 5 na janela?"}
    F6 -->|sim| F7["AuditLog LOGIN_BLOQUEADO_TENTATIVAS"]
    F7 --> E401b["401 genérico no login · 429 MUITAS_TENTATIVAS na reconferência (nem a senha certa entra)"]
    F6 -->|não| F8{"Senha certa?"}
    F8 -->|não| F9["AuditLog LOGIN_FALHA (senha) — a reserva fica"]
    F9 --> E401c["401 genérico (ou SENHA_ATUAL_INCORRETA na reconferência)"]
    F8 -->|sim| F10["release(userId, login-fail) — senha certa não é falha"]
    F10 --> F11{"status SUSPENDED ou DELETION_SCHEDULED?"}
    F11 -->|sim| E403["403 CONTA_INDISPONIVEL (só após a senha certa)"]
    F11 -->|não| F12["needsRehash? refaz o hash com a senha certa"]
    F12 --> F13{"twoFactorEnabled?"}
    F13 -->|sim, sem código| E2FA["401 DOIS_FATORES_NECESSARIO (envia código, só após a senha certa)"]
    F13 -->|sim, código errado| F14["attempts++ (noRollbackFor) · tryAcquire login-fail · AuditLog LOGIN_FALHA (2fa)"]
    F14 --> E401d["401 CODIGO_INVALIDO"]
    F13 -->|não ou código certo| F15["reset(userId, login-fail) · lastLoginAt=now"]
    F15 --> F16["JwtTokenIssuer RS256 (iss, aud, sid) + RefreshToken (familyId nova)"]
    F16 --> F17["AuditLog LOGIN_OK com correlationId (+ aviso de novo dispositivo)"]
  end

  subgraph L5["Persistência"]
    P1[("Redis: baldes ip:* e login-fail (Lua INCR+EXPIRE, RELEASE), refresh por familyId")]
    P2[("MySQL (TLS, ws_app): users, refresh_tokens espelho, verification_codes, audit_log")]
  end

  A1 --> B1
  B2 -->|não| C1
  C4 --> D1
  C5 --> D1
  D7 --> F1
  D3 --> P1
  F4 --> P1
  F10 --> P1
  F15 --> P1
  F1 --> P2
  F16 --> P1
  F17 --> P2
  F17 --> D9
  E401a --> D9
  E401b --> D9
  E401c --> D9
  E403 --> D9
  E2FA --> D9
  E401d --> D9
  D9 --> C8
  C8 --> A9

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class EB,EG,E429,E503,E401a,E401b,E401c,E401d,E403,E2FA erro;
```

## 3. Diagrama de sequência

Login pelo BFF com IP assinado, limite por IP (429), teto de hashes (503), login sem oráculo (401) e caminho feliz (`ws_rt` + access em memória); em seguida o refresh com rotação e o reuso que revoga a família.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router) BFF /bff/auth
  participant F as AuthRateLimitFilter + ClientIpResolver (ws-web)
  participant C as AuthController (ws-web)
  participant S as IdentityService (ws-application)
  participant RL as RateLimitPort (Redis)
  participant H as Argon2PasswordHasher
  participant J as JwtTokenIssuer
  participant DB as Repository/MySQL
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>N: identifier + senha (+ lembrar-me)
  N->>N: ts = agora e sig = HMAC-SHA256(EDGE_PROXY_SECRET, ip|ts)
  N->>F: POST /api/auth/login com X-Ws-Client-Ip, X-Ws-Proxy-Ts, X-Ws-Proxy-Sig
  F->>F: resolve(request) confere a assinatura em tempo constante (60 s) e reduz IPv6 ao /64
  F->>RL: tryAcquire(ip, ip:post:api:auth:login, 30, 10 min)
  alt balde do IP estourado (CA04)
    RL-->>F: false
    F-->>N: 429 MUITAS_TENTATIVAS + Retry-After
    N-->>U: aguarde e tente de novo
  else dentro do limite
    RL-->>F: true
    F->>F: HashBulkhead.tryAcquire (espera até 2 s)
    alt sem vaga no teto de hashes (CA01)
      F-->>N: 503 AUTENTICACAO_OCUPADA + Retry-After 2
      N-->>U: serviço ocupado, tente em instantes
    else com vaga
      F->>C: chain.doFilter
      C->>S: login(LoginCommand, ip, userAgent)
      S->>DB: findByEmailHash ou findByUsernameIgnoreCase
      alt conta não existe (RN49.02)
        S->>H: matches(senha, dummyHash) com o mesmo tempo
        S->>DE: AuditLog LOGIN_FALHA (usuario_inexistente)
        S-->>C: 401 CREDENCIAIS_INVALIDAS
      else conta existe
        S->>RL: tryAcquire(userId, login-fail, 5, 15 min) reserva atômica antes do hash
        S->>H: matches(senha, passwordHash) sempre
        alt reserva acima do limite (CA02)
          S->>DE: AuditLog LOGIN_BLOQUEADO_TENTATIVAS (resetAt)
          S-->>C: 401 CREDENCIAIS_INVALIDAS (nem a senha certa entra)
        else senha errada
          S->>DE: AuditLog LOGIN_FALHA (senha) e a reserva fica
          S-->>C: 401 CREDENCIAIS_INVALIDAS
        else senha certa
          S->>RL: release(userId, login-fail)
          opt status SUSPENDED ou DELETION_SCHEDULED
            S-->>C: 403 CONTA_INDISPONIVEL (só aqui, após a senha certa)
          end
          opt twoFactorEnabled sem código
            S-->>C: 401 DOIS_FATORES_NECESSARIO (só aqui, após a senha certa)
          end
          S->>H: needsRehash e, se preciso, hash(senha)
          S->>RL: reset(userId, login-fail)
          S->>J: issueAccessToken(user, familyId) RS256 com iss, aud, sid
          S->>RL: HSET refresh por familyId (tokenHash, expiresAt)
          S->>DB: INSERT refresh_tokens (espelho) e UPDATE users.last_login_at
          S->>DE: AuditLog LOGIN_OK com correlationId
          S-->>C: Session (accessToken, refreshToken, familyId, user)
        end
      end
      C-->>F: resposta
      F->>F: HashBulkhead.release em finally
      F-->>N: resposta da API
      N-->>U: cookie ws_rt (HttpOnly, Secure, SameSite=Strict) e access token só em memória
    end
  end

  Note over N,RL: Troca de senha, PATCH /api/me/sensitive e POST /api/me/deletion usam a mesma reserva login-fail (CA03). O 6º erro recebe 429 MUITAS_TENTATIVAS + Retry-After.

  U->>N: reabre o app (access expirado)
  N->>F: POST /bff/auth/refresh (cookie ws_rt) → POST /api/auth/refresh
  F->>RL: tryAcquire(ip, ip:post:api:auth:refresh, 120, 10 min)
  F->>C: chain.doFilter (rota sem hash, sem bulkhead)
  C->>S: refresh(rawRefresh, ip, userAgent)
  S->>RL: HGET refresh por tokenHash
  alt token já rotacionado ou revogado (reuso)
    S->>RL: revokeFamily(familyId)
    S->>DB: UPDATE refresh_tokens SET revoked_at (família inteira)
    S->>DE: AuditLog REFRESH_REUSO com correlationId
    S-->>C: 401 SESSAO_INVALIDA
    C-->>N: 401
    N-->>U: apaga o cookie ws_rt e volta ao /login
  else token válido
    S->>RL: novo tokenHash na família, antigo revokedAt + rotatedFromId
    S->>J: issueAccessToken(user, familyId)
    S-->>C: Session renovada
    C-->>N: 200
    N-->>U: novo cookie ws_rt e access token em memória
  end
```

## 4. Máquina de estados

Esta pasta não tem entidade própria na `TAXONOMIA`. O primeiro bloco é o **balde `login-fail`** de uma conta no `RateLimitPort` (5 em 15 min), que o `IdentityService` consulta no login e em toda reconferência de senha. O segundo é a **família de `RefreshToken`** (RF2), aqui só para mostrar o reuso que revoga a família e alimenta `REFRESH_REUSO`.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> Livre : conta criada
  state "Livre (contador 0, sem janela)" as Livre
  state "Contando (1 a 5 reservas, janela fixa de 15 min aberta na primeira)" as Contando
  state "Bloqueada (6 ou mais reservas na janela)" as Bloqueada

  Livre --> Contando : tentativa de senha, reserva atômica tryAcquire (contador 1)
  Contando --> Contando : senha errada ou 2FA errado (a reserva fica)
  Contando --> Contando : senha certa com 2FA pendente (release devolve a reserva)
  Contando --> Livre : login completo (reset do contador)
  Contando --> Livre : a janela de 15 min vence (EXPIRE)
  Contando --> Livre : redefinição de senha por e-mail (reset)
  Contando --> Bloqueada : nova reserva acima de 5 (inclui pedidos em paralelo)
  Bloqueada --> Bloqueada : qualquer tentativa (conta, mas não estende a janela)
  Bloqueada --> Livre : a janela de 15 min vence
  Bloqueada --> Livre : redefinição de senha por e-mail

  note right of Bloqueada
    Login responde 401 genérico e a reconferência 429 MUITAS_TENTATIVAS.
    Nem a senha certa entra (o bloqueio não vira oráculo).
    Audita LOGIN_BLOQUEADO_TENTATIVAS com resetAt.
    O limite por IP e o HashBulkhead ficam ANTES desta máquina.
  end note
  note left of Contando
    Contador no RateLimitPort. Redis INCR+EXPIRE em Lua
    ou memória com teto de 100 mil baldes e varredura.
    No FAI, antes da correção, 40 pedidos paralelos avaliavam 40 senhas.
    Agora, no máximo 5 (CA01).
  end note
```

```mermaid
stateDiagram-v2
  direction LR
  [*] --> ATIVA : login ou loginOidc emite a família (sid no JWT)
  state "ATIVA (token corrente da família)" as ATIVA
  state "ROTACIONADA (revokedAt + rotatedFromId)" as ROTACIONADA
  state "REVOGADA (família inteira)" as REVOGADA
  state "EXPIRADA (expiresAt passou)" as EXPIRADA

  ATIVA --> ROTACIONADA : refresh válido gera o próximo token
  ROTACIONADA --> ATIVA : o novo token passa a ser o corrente
  ATIVA --> EXPIRADA : 30 d (lembrar-me) ou 24 h sem uso
  ATIVA --> REVOGADA : logout, DELETE /api/auth/sessions ou troca de senha
  ROTACIONADA --> REVOGADA : reuso do token antigo (401 SESSAO_INVALIDA, AuditLog REFRESH_REUSO)
  REVOGADA --> [*]
  EXPIRADA --> [*]

  note right of REVOGADA
    SessionActiveFilter confere o claim sid do access token
    contra a família a cada requisição e responde 401 SESSAO_ENCERRADA.
    O refresh só viaja no cookie ws_rt e o access só em memória (RN49.01).
  end note
```

## 5. Diagrama de componentes

Da borda aos bancos: WAF/Turnstile e Cloudflare Access (ou gate), BFF Next.js, filtros do `ws-web`, `ws-application`, `ws-infrastructure` e os bancos endurecidos como código. Hospedagem em aberto (Q-51): `infra/<provedor>/<banco>/start.sh`.

```mermaid
flowchart LR
  P(["Pessoa (usuária, equipe)"])

  subgraph EDGE["Borda (bloco 8) — recomendado"]
    WAF["WAF + Turnstile em login, cadastro e redefinição (limites espelhando a API, alertas de 429, 503 e LOGIN_BLOQUEADO_TENTATIVAS)"]
    CFA["Cloudflare Access ou gate do FAI (dev, test, staging): SSO + MFA, token por pessoa, 8 erros por IP em 15 min"]
  end

  subgraph GH["GitHub (bloco 1)"]
    CI["CI: mvn verify (MigrationVersionsTest, JsonContractTest, AutoConfigurationExclusionsTest, ForeignKeyPolicyTest), gitleaks histórico inteiro, npm audit, Trivy"]
    DEP["Dependabot: Maven, npm, Actions, Docker (major de temurin e maven ignorado)"]
    BP["Branch protection na main (Q-52)"]
  end

  subgraph FE["Next.js 15 (App Router) — bloco 4"]
    MW["middleware.ts: CSP com nonce, HSTS, frame-ancestors none, gate"]
    BFF["app/bff/auth/[action]/route.ts: assina IP (EDGE_PROXY_SECRET), cookie ws_rt HttpOnly"]
    APP["lib/api/client.ts: access token só em memória, encodeURIComponent, safeNext"]
    ADM["Áreas restritas falham fechadas até a API confirmar o papel"]
  end

  subgraph API["API Spring Boot 4.1 (D-13) — Java 21 em JVM 25 LTS"]
    subgraph WEB["ws-web"]
      W1["CorrelationIdFilter · DevGateFilter"]
      W2["ClientIpResolver: IP assinado › X-Real-IP › TCP, IPv6 por /64"]
      W3["AuthRateLimitFilter + HashBulkhead: limite por IP+método+rota, 429 e 503 com Retry-After"]
      W4["Spring Security 7: JWT RS256 (iss, aud), SessionActiveFilter (sid)"]
      W5["Argon2PasswordHasher · JwtTokenIssuer · ErrorWriter {code, message, details, correlationId}"]
    end
    subgraph APPL["ws-application"]
      S1["IdentityService: bloqueio 5/15 min com reserva atômica, login sem oráculo, reconferência, códigos, nomes reservados, maskEmail"]
      S2["Guard (BOLA/BFLA relendo o papel) · OwnMedia (restricted/) · AiBudget (teto USD, Q-50)"]
      S3["AdminBootstrap (WS_ADMIN_*, nunca promove sem WS_ADMIN_PROMOTE_EXISTING)"]
      S4["Demo: DemoEnvironmentGuard (WS_DEMO_ENABLED, WS_DEMO_ALLOW_PRODUCTION) · DemoDataAdminPort · fixtures @example.test demo_"]
      S5["BackupJob: mysqldump diário → restricted/backups/ (ws_backup), restauração mensal"]
    end
    subgraph INFRA["ws-infrastructure"]
      I1["cache-redis: RedisRateLimit (Lua INCR+EXPIRE, RELEASE), RedisRefreshTokenStore"]
      I2["persistence-mysql: Flyway V1__baseline (account_origin, fixture_key, test_account, ON DELETE por domínio) · ForeignKeyPolicy · MysqlDemoDataAdminAdapter"]
      I3["storage-s3: bucket sem listagem pública, prefixo restricted/ só pelo proxy"]
      I4["ai-providers: chaves só no servidor, host permitido por provedor, RESTRITO/SIGILOSO nunca saem"]
      I5["platform: InMemoryRateLimit (fallback, teto 100 mil), AuditLogWriter, e-mail recusa .test .example .invalid .localhost"]
    end
  end

  subgraph DBS["Bancos endurecidos (bloco 7) — rede privada, sem proxy TCP público, start.sh conferido por SHA-256"]
    MY[("MySQL: TLS require_secure_transport, ws_app menor privilégio, ws_backup só leitura")]
    CAS[("Cassandra: autenticação, papéis, TLS com CA própria, contact points por nome")]
    OS[("OpenSearch: plugin de segurança, TLS, papel restrito a ws-*, auditoria")]
    RD[("Redis: usuário ACL sem @dangerous, default desligado")]
    S3[("S3: mídia + restricted/backups/ (RPO e RTO escritos)")]
  end

  IA["IA externa (Claude, Gemini) — chaves só no servidor"]
  DEPLOY["Deploy só após CI verde: healthcheck /actuator/health, versão anterior segue se a nova não sobe"]

  P -->|HTTPS| WAF
  WAF --> CFA
  CFA --> MW
  MW --> APP
  APP --> BFF
  BFF -->|"X-Ws-Client-Ip / Ts / Sig"| W1
  APP -->|Bearer em memória| W1
  W1 --> W2 --> W3 --> W4
  W4 --> S1
  W4 --> S2
  S1 --> W5
  W3 -.->|balde por IP| I1
  S1 -.->|login-fail e refresh| I1
  I1 -.->|sem Redis| I5
  S1 --> I2
  S2 --> I3
  S2 --> I4
  S3 --> I2
  S4 --> I2
  S5 --> MY
  S5 --> S3
  I2 -->|JDBC sslMode=REQUIRED| MY
  I1 --> RD
  I3 --> S3
  I4 --> IA
  APPL -.->|CQL + TLS| CAS
  APPL -.->|HTTPS| OS
  CI --> DEPLOY
  DEP --> CI
  BP -.-> CI
  DEPLOY --> API
  ADM -.-> W4
```

## 6. Rastreabilidade

Cada regra (RN49.01–12) e critério (CA01–CA10) do RF49 do FAI → elemento dos diagramas desta pasta → bloco do brief de segurança (0 plataforma · 1 esqueleto · 2 banco · 3 autenticação · 4 sessão no front · 5 autorização/mídia/IA · 6 dados demo · 7 bancos e backup · 8 Zero Trust camadas 2–4).

| Id (FAI RF49) | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Bloco |
|---|---|---|---|---|---|---|
| RN49.01 | `JwtTokenIssuer`, `SessionActiveFilter` | `C8` | 38 (cookie `ws_rt` + access em memória), 50–55 | nota de `REVOGADA` (bloco 2) | `BFF`, `APP`, `MW` | 4 |
| RN49.02 | `IdentityService.login/dummyHash`, `Argon2PasswordHasher.matches` | `F1`→`F2`→`E401a`, `F6`→`E401b`, `F8`→`E401c`, `F11`→`E403`, `F13`→`E2FA` | 15–18, 21–24, 26–27 (`403`/`401 2FA` só após a senha certa) | nota de `Bloqueada` | `S1` | 3 |
| RN49.03 | `RateLimitPort.tryAcquire/release/reset`, `IdentityService.passwordMatchesWithLockout/changePassword/reauthenticate/confirmPasswordReset`, `RedisRateLimit`, `InMemoryRateLimit` | `F4`, `F5`, `F10`, `F15`, `E401b` | 19–20, 25, 29, nota após 38 (reconferência 429) | bloco 1 inteiro (`Livre`→`Contando`→`Bloqueada`, redefinição → `Livre`) | `S1`, `I1`, `I5` | 3 |
| RN49.04 | `ClientIpResolver`, `AuthRateLimitFilter.bucketKey` | `C3`–`C5`, `D2` | 2–4 | — | `BFF`, `W2` | 3 |
| RN49.05 | `HashBulkhead`, `AuthRateLimitFilter`, `Rule.hashes` | `D5`–`D6`→`E503`, `D9` | 10–12, 36 | nota de `Bloqueada` ("ANTES desta máquina") | `W3` | 3 |
| RN49.06 | `MediaAccessPolicy` (OwnMedia), `ResourceAuthorizer.requireMedia`, `MediaUploadService.authorizeRead`, `MediaKeys` (`restricted/`) | §7.2 | §7.2 | — | `S2`, `I3`, `S3` | 5 |
| RN49.07 | `IdentityService.maskEmail`, `AiBudget`, `AiGateway`, `PersonalDataMasker`, `CorrelationIdFilter` | `F3`, `F17` (auditoria sem segredo) | 17, 33 | — | `S1`, `I4`, `W5`, `IA` | 1, 5 |
| RN49.08 | — | `P2` ("MySQL TLS, ws_app") | — | — | `DBS` (`MY`, `CAS`, `OS`, `RD`), aresta `JDBC sslMode=REQUIRED` | 7 |
| RN49.09 | `ForeignKeyPolicy`, `Fk` | — | — | — | `I2`, `CI` (`ForeignKeyPolicyTest`) | 2 |
| RN49.10 | `AccountOrigin`, `User.accountOrigin/testAccount`, `DemoDataAdminPort.realAccountsAmong/deleteTestAccounts` | — | — | — | `S4`, `I2` | 2, 6 |
| RN49.11 | `IdentityService.RESERVED_USERNAMES/reservedUsername`, `DemoEnvironmentGuard` | — | — | — | `S4`, `I5` (e-mail recusa domínios reservados) | 6 |
| RN49.12 | — | — | — | — | `CI` (`MigrationVersionsTest`), `DEP`, `API` (JVM 25 LTS, D-13) | 0, 1 |
| RF49.CA01 | `HashBulkhead`, `RateLimitPort.tryAcquire` antes do hash | `D6`→`E503`, `F4`→`F5` | 10–12, 19–20 | `Contando`→`Bloqueada` "inclui pedidos em paralelo" | `W3`, `I1` | 3 |
| RF49.CA02 | `IdentityService.login`, `RateLimitPort.status/reset` | `F6`→`F7`→`E401b`, `F15` | 19–22, 29 | `Bloqueada`→`Livre` (janela vence, redefinição por e-mail) | `S1` | 3 |
| RF49.CA03 | `IdentityService.passwordMatchesWithLockout/changePassword/reauthenticate`, `Rule` (PUT password, PATCH me/sensitive, POST me/deletion) | `A1`, `E401b` | nota após 38 | nota de `Bloqueada` (429 na reconferência) | `W3`, `S1` | 3 |
| RF49.CA04 | `AuthRateLimitFilter.RULES/bucketKey`, `ClientIpResolver` | `D2`–`D4`→`E429` | 3–9 | — | `W2`, `W3`, `BFF` | 3 |
| RF49.CA05 | `JwtTokenIssuer`, `SessionActiveFilter` | `C8` | 38, 39–55 (refresh pelo cookie) | bloco 2 (`ATIVA`→`ROTACIONADA`→`ATIVA`) | `BFF`, `APP` | 4 |
| RF49.CA06 | `ResourceAuthorizer`, `AccessPolicy`, `MediaAccessPolicy`, `AuthorizationEnforcementAdvice` (testes `PathVariableAuthorizationTest`, `AuthorizationMatrixWebTest`) | §7.1 | §7.2 | — | `S2`, `I3` | 5 |
| RF49.CA07 | `ForeignKeyPolicy.divergences` | — | — | — | `I2`, `CI` | 2 |
| RF49.CA08 | — | — | — | — | `CI`, `BP`, `DEPLOY` | 1 |
| RF49.CA09 | — | — | — | — | `DEPLOY` | 1, 7 |
| RF49.CA10 | `DemoEnvironmentGuard`, `DemoDataAdminPort.plan/lockAccounts/integrityProblems`, `MysqlDemoDataAdminAdapter` | — | — | — | `S4`, `I2` | 6 |
| (RF2) reuso de refresh | `IdentityService.refresh/revokeFamily`, `SessionActiveFilter` | — | 39–50 (`REFRESH_REUSO`, `401 SESSAO_INVALIDA`), 51–55 (rotação) | `ROTACIONADA`→`REVOGADA` | `W4`, `I1` | 3 |

### Ações que só o time pode fazer (fora do repo)

- Segredos a criar, só por nome: `EDGE_PROXY_SECRET` (mesmo valor no front e na API, nunca `NEXT_PUBLIC_`), `JWT_PRIVATE_KEY_PEM`/`JWT_PUBLIC_KEY_PEM` (`scripts/keys/generate_jwt_keys.sh`), `DATA_ENCRYPTION_KEY`, `WS_ADMIN_EMAIL`/`WS_ADMIN_PASSWORD`, `WS_ADMIN_PROMOTE_EXISTING`, `WS_DEMO_ENABLED`/`WS_DEMO_ALLOW_PRODUCTION`, `MYSQL_APP_PASSWORD`/`MYSQL_BACKUP_PASSWORD`, `REDIS_APP_PASSWORD`, `CASSANDRA_APP_PASSWORD`, `OPENSEARCH_APP_PASSWORD`, `CF_ACCESS_AUD`.
- Branch protection na `main` (Q-52), configuração do IdP institucional (OIDC com `email_verified`, MFA para ADMIN/EMPRESA/CHEFE/CURADOR) e do WAF/Turnstile (bloco 8).
- Respostas às Q-48 (RF ou RNF), Q-49 (TTL), Q-50 (tetos de IA) e Q-51 (hospedagem).

## 7. Bloco 5 — BOLA/BFLA, upload e gate de IA (D-65…D-69)

Controles em `ws-domain` (`domain.security`: políticas puras), `ws-application` (`security.ResourceAuthorizer`, `media.*`, `ai.*`),
`ws-web` (`AuthorizationEnforcementAdvice`, `@AuthorizedBy`/`@AuthorizationExempt`) e adaptadores (`JpaMembershipAdapter`,
`JpaAiInferenceLog`, `RedisAiBudgetCounter`, `LocalMediaStorage`). Tabela controle → teste em `docs/seguranca/SEGURANCA.md` §3.2.

### 7.1 Autorização de recurso (BOLA/BFLA)

```mermaid
flowchart TD
  R[Requisição autenticada com id no caminho] --> H{Handler anotado}
  H -- AuthorizationExempt com motivo --> OK1[Segue sem authorizer]
  H -- AuthorizedBy --> S[Serviço chama o ResourceAuthorizer]
  S --> V[Viewer: papel relido do banco, empresa, departamento, lotações]
  V --> L{Recurso existe}
  L -- não --> NF[404 NAO_ENCONTRADO]
  L -- sim --> P{Política pura do domínio}
  P -- invisível --> NF
  P -- visível sem permissão --> F[403 ACESSO_NEGADO]
  P -- permitido --> T[Marca AuthorizationTrail]
  T --> B[Corpo da resposta]
  B --> A{Advice: trilha marcada}
  A -- sim --> OK[200]
  A -- não --> E[500 ERRO_INTERNO, dado não sai]
```

Visibilidade: dono, colaborador e ADMIN sempre; PUBLICA = autenticado; EMPRESA = mesma empresa; DEPARTAMENTO = lotado;
PRIVADA = ninguém mais. RESTRITO nunca passa de DEPARTAMENTO; SIGILOSO = PRIVADA (Q-166). Decisão: papéis DACI do §8.

### 7.2 Upload e leitura de mídia

```mermaid
sequenceDiagram
  participant C as Cliente
  participant S as MediaUploadService
  participant I as MediaUploadInspector
  participant AV as AntivirusPort
  participant ST as MediaStoragePort
  participant DB as media_objects e media_scans
  C->>S: bytes, nome e Content-Type declarados
  S->>I: inspect
  I->>I: magic bytes, limite por categoria
  I->>I: ZIP: entradas, total, razão, profundidade, zip-slip
  I->>I: imagem: pixels do cabeçalho
  I->>I: extensão e Content-Type batem com o tipo real
  I-->>S: tipo real, SHA-256, nome saneado
  S->>AV: scan
  AV-->>S: LIMPO, PENDENTE, INFECTADO ou NAO_VERIFICADO
  S->>DB: dedupe por dono e SHA-256
  S->>ST: put em restricted/ ou private/ ou public/
  S->>DB: grava objeto e varredura
  C->>S: ler mídia por id
  S->>DB: busca, 404 se não existe
  S->>S: ResourceAuthorizer.requireMedia (OwnMedia)
  S->>DB: quarentena, 423 se não servível
  S->>ST: URL assinada curta ou bytes
```

### 7.3 Gate de IA

```mermaid
flowchart TD
  Q[Pedido de inferência de um RF] --> BU{AiBudget: pessoa e empresa}
  BU -- estourou --> E429[429 IA_ORCAMENTO_ESGOTADO com Retry-After]
  BU -- reservado --> CL{Flag remota ligada e classificação PUBLICO ou INTERNO}
  CL -- sim --> MK[PersonalDataMasker: e-mail, CPF, CNPJ, telefone]
  MK --> RM[Provedor remoto]
  RM -- falhou --> LC{Motor local}
  CL -- não --> LC
  LC -- existe --> LO[Motor local]
  LC -- não existe, RESTRITO ou SIGILOSO --> E422[422 IA_CONTEUDO_RESTRITO, BLOQUEADO_SIGILO]
  LC -- não existe, falha do remoto --> E503[503 IA_INDISPONIVEL]
  RM --> LOG[ai_inference_log: masked_fields_json, rota, sem prompt]
  LO --> LOG
  E422 --> LOG
  E503 --> LOG
```
