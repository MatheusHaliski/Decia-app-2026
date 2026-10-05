# RF2 — Autenticar usuário na plataforma com credenciais de acesso
**HU:** HU2 · **Sprint (board Work Station):** 1 (card "SPRINT 1 — Cadastro, autenticação, perfil e abertura de sessão") · **Equivalente FAI:** RF2 Login (`AuthController POST /api/auth/login|refresh|logout`, `IdentityService.login/refresh`, família de refresh em Redis) · **Aba/rota:** `/login` (BFF `app/bff/auth/login` → `POST /api/auth/login`), `/login/institucional` (`POST /api/auth/oidc/login`), `/forgot-password` (`POST /api/auth/password-reset/request|confirm`); todas as rotas autenticadas passam pelo `SessionActiveFilter`
**Critérios de aceite cobertos:** RF2.CA01 … RF2.CA06 (corpo do card vazio → derivados do título + HU2, todos "(CA a confirmar)") · RF2.CA07 … RF2.CA14 (§7, controles de segurança D-14) — regra: o título do card define o RF; CAs alinhados ao código real do Bloco 3 (`AuthController`, `IdentityService`, `AuthRateLimitFilter`, `HashBulkhead`, `SessionActiveFilter`, `JwtTokenIssuer`, `OidcService`, `PasswordResetService`)

> **HU2** — COMO usuário cadastrado no sistema POSSO autenticar-me na plataforma com minhas credenciais de acesso PARA acessar minha área pessoal de forma segura.

Classes **(real)** existem em `origin/main` (Bloco 3, PR #16); **(planejado)**: `RedisSessionStore` (hoje `InMemorySessionStore` + espelho JPA `refresh_tokens`, Q-85), `GET/DELETE /api/auth/sessions` (Q-89; `IdentityService.activeSessions` já existe), PKCE/`state` do OIDC no BFF e cookie `ws_rt` (Bloco 4, Q-85), conferência TOTP do 2FA (Q-83), SMTP real (Q-84), `PolicyGateFilter` (D-16). Números adotados: D-25 (TTLs), D-26 (Argon2id e bulkhead), D-27 (cadastro sem oráculo).

## Critérios de aceite derivados da HU2 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF2.CA01** (CA a confirmar) | Dado `identifier` (username ou e-mail) e `password`, quando faço `POST /api/auth/login`, então a senha é conferida contra o hash **Argon2id** (`PasswordHasher.matches`, re-hash transparente por `needsRehash`) e recebo `Session {accessToken RS256 15 min (D-25; claims iss, aud, sub, sid=familyId, role, profile_type, username, jti), tokenType Bearer, expiresIn, refreshToken opaco, refreshExpiresAt, family, user, warnings}`; o refresh (30 d se `rememberMe`, 24 h se não — `SessionPolicy`) é guardado só como SHA-256 (`RefreshRecord.tokenHash`) com espelho em `refresh_tokens`; o BFF devolve o refresh **só** no cookie `ws_rt` (HttpOnly, Secure, SameSite=Strict). |
| **RF2.CA02** (CA a confirmar) | Dado conta inexistente, senha errada ou conta bloqueada, então `401 CREDENCIAIS_INVALIDAS` com a mesma mensagem e tempo (hash falso `dummyHash`); conta `SUSPENDED`/`ANONYMIZED` (`AccountStatus.blocksLogin`) → `403 CONTA_INDISPONIVEL` **depois** da senha certa; `PENDING_VALIDATION` e `DELETION_SCHEDULED` entram com `warnings` (Q-82; `PENDING_EMAIL_VERIFICATION` só tem sessão após confirmar o código, D-27); `twoFactorEnabled` → `401 DOIS_FATORES_NECESSARIO {twoFactorRequired}` (conferência TOTP é a Q-83). |
| **RF2.CA03** (CA a confirmar) | Dado "Entrar com conta institucional", então o front faz OIDC Authorization Code + PKCE e envia `POST /api/auth/oidc/login {idToken, nonce}`; `OidcService` exige `ws.oidc.enabled` (`404 OIDC_DESLIGADO`), `IdTokenVerifier` (Nimbus) valida assinatura JWKS, `iss`, `aud`, `nonce`, `exp` (`401 OIDC_TOKEN_INVALIDO`); `OidcAccountLinker` vincula `oidcSubject/oidcIssuer` ao `User` de mesmo `emailHash` só com `email_verified=true` (`401 OIDC_EMAIL_NAO_VERIFICADO`, `AuditLog OIDC_LINK_RECUSADO`) ou cria conta `ACTIVE` sem senha; emite a mesma `Session` (`AuditLog OIDC_LOGIN`). |
| **RF2.CA04** (CA a confirmar) | Dado um refresh válido, quando o BFF chama `POST /api/auth/refresh`, então ocorre **rotação**: novo token da mesma `familyId`, o anterior recebe `revokedAt`/`rotatedFromHash`; reuso de token já rotacionado **revoga a família inteira**, grava `AuditLog REFRESH_REUSO` e responde `401 SESSAO_INVALIDA`; expirado ou desconhecido → `401 SESSAO_INVALIDA`; conta que passou a `blocksLogin()` → família revogada. |
| **RF2.CA05** (CA a confirmar) | Dado o usuário autenticado, então `POST /api/auth/logout` revoga a família (`AuditLog LOGOUT`); `PUT /api/auth/password` exige a senha atual (mesmo bloqueio do login), grava `PASSWORD_CHANGED` e revoga as **outras** famílias (`SESSIONS_REVOKED`); o `SessionActiveFilter` recusa a cada requisição access tokens cuja família foi revogada (`sid` → `401 SESSAO_ENCERRADA`). `GET /api/auth/sessions` e `DELETE /api/auth/sessions/{familyId}` são **planejados** (aba Sessões do RF3 §7). |
| **RF2.CA06** (CA a confirmar) | Dado tentativas repetidas, então há limite por IP (`AuthRateLimitFilter`) e por conta (`RateLimitPort` `login-fail`), `AuditLog LOGIN_OK / LOGIN_FALHA / LOGIN_BLOQUEADO_TENTATIVAS / REFRESH_REUSO / LOGOUT` com `correlationId`, e-mail mascarado e sem senha ou token; `User.lastLoginAt` é atualizado; mensagens i18n (pt-BR/en/es). Redefinição por e-mail: `POST /api/auth/password-reset/request` (resposta igual exista ou não a conta, 5/h por pessoa) e `/confirm {token, newPassword}` (`422 LINK_INVALIDO`), que tira a conta do bloqueio. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class AuthController {
    <<controller>>
    +login(LoginRequest, RequestContext) Session
    +refresh(RefreshRequest, RequestContext) Session
    +logout(CurrentUser, RequestContext) void
    +changePassword(CurrentUser, ChangePasswordRequest, RequestContext) ResponseEntity
  }
  class OidcController {
    <<controller>>
    +login(OidcLoginRequest, RequestContext) Session
  }
  class PasswordResetController {
    <<controller>>
    +request(RequestBodyDto, RequestContext) Map
    +confirm(ConfirmBodyDto, RequestContext) void
  }
  class IdentityService {
    <<service>>
    -String dummyHash
    +login(LoginCommand, RequestContext) Session
    +refresh(rawRefresh, RequestContext) Session
    +logout(CurrentUser, RequestContext) void
    +changePassword(CurrentUser, current, next, RequestContext) void
    +openSession(User, persistent, deviceName, RequestContext) Session
    +sessionActive(familyId) boolean
    -issue(User, family, rotatedFromHash, persistent, deviceName, ctx) Session
  }
  class OidcService {
    <<service>>
    +enabled() boolean
    +login(idToken, nonce, deviceName, RequestContext) Session
  }
  class OidcAccountLinker {
    <<service>>
    +linkOrCreate(claims, RequestContext) User
  }
  class PasswordResetService {
    <<service>>
    +request(email, RequestContext) void
    +confirm(token, newPassword, confirmPassword, RequestContext) void
  }
  class SessionPolicy {
    <<value>>
    +Duration refreshTtl
    +Duration refreshShortTtl
    +int maxLoginFailures
    +Duration lockWindow
  }
  class Session {
    <<value>>
    +String accessToken
    +String tokenType
    +long expiresIn
    +String refreshToken
    +Instant refreshExpiresAt
    +UUID family
    +UserView user
    +List warnings
  }
  class RefreshRecord {
    <<value>>
    +String tokenHash
    +UUID familyId
    +UUID userId
    +Instant createdAt
    +Instant expiresAt
    +Instant revokedAt
    +String rotatedFromHash
    +boolean persistent
    +String deviceName
  }
  class CurrentUser {
    <<value>>
    +UUID id
    +Role role
    +UUID familyId
  }
  class RateLimitPort {
    <<port>>
    +tryAcquire(owner, bucket, limit, window) boolean
    +status(owner, bucket, limit, window) QuotaStatus
    +release(owner, bucket) void
    +reset(owner, bucket) void
  }
  class SessionStorePort {
    <<port>>
    +save(RefreshRecord) void
    +find(tokenHash) Optional
    +revoke(tokenHash, at) void
    +revokeFamily(familyId, at) void
    +familyActive(familyId, now) boolean
  }
  class RefreshTokenMirrorPort {
    <<port>>
    +saved(RefreshRecord, ctx) void
    +revoked(tokenHash, at) void
    +familyRevoked(familyId, at) void
  }
  class TokenIssuerPort {
    <<port>>
    +issueAccessToken(User, familyId) String
    +accessTokenTtl() Duration
  }
  class IdTokenVerifier {
    <<port>>
    +verify(idToken, nonce) Claims
  }
  class PasswordHasher {
    <<port>>
    +matches(raw, encoded) boolean
    +needsRehash(encoded) boolean
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent) void
  }
  class JwtTokenIssuer {
    <<adapter>>
    +enabled() boolean
  }
  class JwtKeys {
    <<config>>
    RS256 PEM WS_JWT_PRIVATE_KEY_PATH / PUBLIC
  }
  class SessionActiveFilter {
    <<filter>>
    após BearerTokenAuthenticationFilter
  }
  class AuthRateLimitFilter {
    <<filter>>
    +RULES por método e rota
  }
  class HashBulkhead {
    <<component>>
    +tryAcquire(waitMillis) boolean
    +release() void
  }
  class ClientIpResolver {
    <<component>>
    +resolve(request) String
  }
  class InMemorySessionStore {
    <<adapter>>
  }
  class RedisSessionStore {
    <<adapter>>
    planejado
  }
  class JpaIdentityAdapters {
    <<adapter>>
    RefreshTokenEntity espelho
  }
  class NimbusIdTokenVerifier {
    <<adapter>>
  }
  class Argon2PasswordHasher {
    <<adapter>>
  }
  class RedisRateLimit {
    <<adapter>>
    Lua INCR+EXPIRE
  }
  class InMemoryRateLimit {
    <<adapter>>
  }

  class User {
    <<entity>>
    +UUID id
    +String username
    +String emailHash
    +String passwordHash
    +String oidcSubject
    +String oidcIssuer
    +AccountStatus status
    +boolean twoFactorEnabled
    +Instant lastLoginAt
  }
  class RefreshToken {
    <<entity>>
    +String tokenHash
    +UUID familyId
    +UUID userId
    +Instant expiresAt
    +Instant revokedAt
    +UUID rotatedFromId
    +String createdIp
    +String userAgent
    +String deviceName
    +boolean persistent
  }
  class VerificationCode {
    <<entity>>
    +VerificationPurpose purpose
    +String codeHash
    +int attempts
  }
  class AccountStatus {
    <<enum>>
    PENDING_EMAIL_VERIFICATION
    PENDING_VALIDATION
    ACTIVE
    SUSPENDED
    DELETION_SCHEDULED
    ANONYMIZED
    +blocksLogin() boolean
  }
  class AuthCodes {
    <<catalog>>
    CREDENCIAIS_INVALIDAS 401
    CONTA_INDISPONIVEL 403
    DOIS_FATORES_NECESSARIO 401
    MUITAS_TENTATIVAS 429
    SESSAO_INVALIDA 401
    SESSAO_ENCERRADA 401
    SENHA_ATUAL_INCORRETA 422
    LINK_INVALIDO 422
    OIDC_DESLIGADO 404
    OIDC_TOKEN_INVALIDO 401
    OIDC_EMAIL_NAO_VERIFICADO 401
    AUTENTICACAO_INDISPONIVEL 503
  }

  AuthController --> IdentityService
  OidcController --> OidcService
  PasswordResetController --> PasswordResetService
  OidcService --> IdTokenVerifier
  OidcService --> OidcAccountLinker
  OidcService --> IdentityService : openSession
  PasswordResetService --> IdentityService : revoga famílias
  PasswordResetService --> RateLimitPort
  IdentityService --> SessionPolicy
  IdentityService --> RateLimitPort
  IdentityService --> SessionStorePort
  IdentityService --> RefreshTokenMirrorPort
  IdentityService --> TokenIssuerPort
  IdentityService --> PasswordHasher
  IdentityService --> AuditLogPort
  IdentityService ..> Session
  IdentityService ..> RefreshRecord
  SessionActiveFilter --> SessionStorePort : familyActive(sid)
  AuthRateLimitFilter --> ClientIpResolver
  AuthRateLimitFilter --> HashBulkhead
  AuthRateLimitFilter --> RateLimitPort
  TokenIssuerPort <|.. JwtTokenIssuer
  JwtTokenIssuer --> JwtKeys
  SessionStorePort <|.. InMemorySessionStore
  SessionStorePort <|.. RedisSessionStore
  RefreshTokenMirrorPort <|.. JpaIdentityAdapters
  IdTokenVerifier <|.. NimbusIdTokenVerifier
  PasswordHasher <|.. Argon2PasswordHasher
  RateLimitPort <|.. RedisRateLimit
  RateLimitPort <|.. InMemoryRateLimit
  User "1" --> "0..*" RefreshToken : refresh_tokens CASCADE
  User "1" --> "0..*" VerificationCode : PASSWORD_RESET
  User --> AccountStatus
  RefreshRecord ..> RefreshToken : espelho
  note for IdentityService "login: findByIdentifier → tryAcquire(login-fail, 5, 15 min) ANTES do hash → matches → release → blocksLogin → needsRehash → 2FA → reset → LOGIN_OK → openSession"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Usuário cadastrado"]
    A1["Abre /login e informa identifier + senha (ou clica Entrar com conta institucional)"]
    A2["Recarrega a página: BFF renova pelo cookie ws_rt"]
  end
  subgraph FE["Next.js (App Router) · BFF app/bff/auth"]
    F1["POST /bff/auth/login → POST /api/auth/login (X-Correlation-Id, X-Ws-Client-Ip/Ts/Sig)"]
    F2["Grava refresh em ws_rt (HttpOnly, Secure, SameSite=Strict) e access só em memória"]
    F3["POST /api/auth/refresh com o cookie"]
    F4["Fluxo OIDC PKCE no IdP → POST /api/auth/oidc/login {idToken, nonce}"]
  end
  subgraph WEB["ws-web"]
    W1["CorrelationIdFilter"]
    W2["AuthRateLimitFilter: ClientIpResolver (HMAC do BFF › X-Real-IP › TCP, IPv6 /64) → balde IP+método+rota (login 30/10 min)"]
    W3{"Dentro do limite por IP?"}
    W4{"HashBulkhead.tryAcquire 2 s?"}
    W5["AuthController.login / refresh · OidcController.login"]
    W6["SecurityConfig: rotas PUBLIC_POST sem token · demais exigem JWT + SessionActiveFilter"]
    E429["429 MUITAS_TENTATIVAS + Retry-After"]
    E503["503 AUTENTICACAO_OCUPADA + Retry-After"]
    E401["401 CREDENCIAIS_INVALIDAS (mesma mensagem e tempo)"]
    E403["403 CONTA_INDISPONIVEL"]
    E2FA["401 DOIS_FATORES_NECESSARIO"]
    E401S["401 SESSAO_INVALIDA / SESSAO_ENCERRADA"]
    E503J["503 AUTENTICACAO_INDISPONIVEL (sem chave RS256)"]
  end
  subgraph APP["ws-application · IdentityService"]
    S1["findByIdentifier: e-mail → emailHash · username → normalize"]
    S2{"usuário existe?"}
    S3["matches(password, dummyHash) · LOGIN_FALHA usuario_inexistente"]
    S4{"rateLimit.tryAcquire(userId, login-fail, 5, 15 min)?"}
    S5["LOGIN_BLOQUEADO_TENTATIVAS {resetAt} · sem calcular hash"]
    S6{"Argon2 matches?"}
    S7["LOGIN_FALHA senha (a reserva fica)"]
    S8["rateLimit.release · status.blocksLogin()?"]
    S9["needsRehash → hash novo · twoFactorEnabled?"]
    S10["rateLimit.reset · lastLoginAt · LOGIN_OK"]
    S11["openSession → issue: RefreshRecord(sha256, familyId, TTL por rememberMe) · SessionStorePort.save · mirror.saved · issueAccessToken(sid)"]
    R1["refresh: find(sha256) · revokedAt != null → revokeFamily + REFRESH_REUSO · expirado → SESSAO_INVALIDA · revoke(antigo) → issue(mesma família)"]
    O1["OidcService: enabled? → IdTokenVerifier.verify(iss, aud, nonce, exp) → OidcAccountLinker (email_verified) → openSession · OIDC_LOGIN"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: users (lastLoginAt, passwordHash rehash), refresh_tokens (espelho), audit_log")]
    P2[("Redis: RateLimitPort Lua INCR+EXPIRE · RedisSessionStore (planejado) · hoje InMemorySessionStore")]
    P3["JwtKeys: PEM RS256 (WS_JWT_PRIVATE_KEY_PATH)"]
  end

  A1 --> F1 --> W1 --> W2 --> W3
  W3 -->|"não"| E429
  W3 -->|"sim"| W4
  W4 -->|"não"| E503
  W4 -->|"sim"| W5 --> S1 --> S2
  S2 -->|"não"| S3 --> E401
  S2 -->|"sim"| S4
  S4 -->|"não"| S5 --> E401
  S4 -->|"sim"| S6
  S6 -->|"não"| S7 --> E401
  S6 -->|"sim"| S8
  S8 -->|"sim"| E403
  S8 -->|"não"| S9
  S9 -->|"sim"| E2FA
  S9 -->|"não"| S10 --> S11 --> F2
  S11 --> P2
  S11 --> P1
  S11 --> P3
  S11 -->|"JwtTokenIssuer desabilitado"| E503J
  A1 --> F4 --> W1
  W5 --> O1 --> S11
  A2 --> F3 --> W1
  W5 --> R1
  R1 -->|"reuso ou expirado"| E401S
  R1 -->|"ok"| S11
  W2 --> P2
  F2 --> W6
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant R as Repository/MySQL
  participant RD as Redis
  participant AU as AuditLogPort

  U->>N: identifier + senha em /login
  N->>C: POST /api/auth/login (X-Correlation-Id, X-Ws-Client-Ip assinado)
  Note over C: CorrelationIdFilter → AuthRateLimitFilter 30/10 min por IP → HashBulkhead (503 se sem vaga em 2 s)
  C->>S: IdentityService.login(LoginCommand, ctx)
  S->>R: findByEmailHash ou findByUsername
  alt usuário inexistente
    S->>S: hasher.matches(password, dummyHash) (mesmo custo)
    S->>AU: record(LOGIN_FALHA, usuario_inexistente)
    S-->>C: 401 CREDENCIAIS_INVALIDAS
    C-->>N: 401
  else conta bloqueada (5 falhas em 15 min)
    S->>RD: tryAcquire(userId, login-fail, 5, 15 min) = false
    S->>AU: record(LOGIN_BLOQUEADO_TENTATIVAS, resetAt)
    S-->>C: 401 CREDENCIAIS_INVALIDAS (sem calcular hash)
    C-->>N: 401
  else senha errada
    S->>RD: tryAcquire = true (reserva)
    S->>S: Argon2PasswordHasher.matches = false
    S->>AU: record(LOGIN_FALHA, senha)
    S-->>C: 401 CREDENCIAIS_INVALIDAS (reserva fica)
    C-->>N: 401
  else senha certa
    S->>RD: tryAcquire = true
    S->>S: Argon2PasswordHasher.matches = true
    S->>RD: release(userId, login-fail)
    alt status.blocksLogin() (SUSPENDED ou ANONYMIZED)
      S->>AU: record(LOGIN_FALHA, conta_indisponivel)
      S-->>C: 403 CONTA_INDISPONIVEL
      C-->>N: 403
    else twoFactorEnabled
      S-->>C: 401 DOIS_FATORES_NECESSARIO {twoFactorRequired}
      C-->>N: 401 (tela do código, Q-83)
    else ok
      S->>S: needsRehash → passwordHash novo
      S->>RD: reset(userId, login-fail)
      S->>R: save(user.lastLoginAt)
      S->>AU: record(LOGIN_OK, maskEmail, rememberMe)
      S->>S: openSession → issue(RefreshRecord sha256, familyId novo, TTL 30 d ou 24 h)
      S->>RD: SessionStorePort.save(RefreshRecord)
      S->>R: RefreshTokenMirrorPort.saved → refresh_tokens
      S->>S: JwtTokenIssuer.issueAccessToken(user, family) RS256 (sub, sid, role, profile_type)
      S-->>C: Session {accessToken, refreshToken, family, user, warnings}
      C-->>N: 200 Session
      N-->>U: cookie ws_rt + access em memória → shell do app
    end
  end

  Note over U,AU: Renovação (BFF, ao recarregar ou access vencido)
  N->>C: POST /api/auth/refresh {refreshToken do cookie}
  C->>S: IdentityService.refresh(raw, ctx)
  S->>RD: SessionStorePort.find(sha256(raw))
  alt token já rotacionado (reuso)
    S->>RD: revokeFamily(familyId)
    S->>R: mirror.familyRevoked
    S->>AU: record(REFRESH_REUSO, NEGADO)
    S-->>C: 401 SESSAO_INVALIDA
    C-->>N: 401 → /login
  else token válido
    S->>RD: revoke(tokenHash antigo)
    S->>R: mirror.revoked
    S->>S: issue(mesma família, rotatedFromHash)
    S-->>C: Session nova
    C-->>N: 200 (cookie ws_rt rotacionado)
  end

  Note over U,AU: Toda requisição autenticada
  N->>C: GET /api/... Authorization Bearer access
  Note over C: BearerTokenAuthenticationFilter (RS256, iss, aud, exp) → SessionActiveFilter.sessionActive(sid)
  alt família revogada
    C-->>N: 401 SESSAO_ENCERRADA
  else ativa
    C-->>N: 200 (CurrentUserArgumentResolver injeta CurrentUser)
  end
```

## 4. Máquina de estados

Entidade central: a **família de refresh** (`RefreshRecord`/`refresh_tokens`, TAXONOMIA §1.3, estados derivados de `revokedAt`/`rotatedFromHash`/`expiresAt` — não há enum) e, abaixo, o **balde de bloqueio por conta** (`RateLimitPort` `login-fail`). `User.status` é o do RF1 §4.

```mermaid
stateDiagram-v2
  direction LR
  state "Família de refresh" as FAM {
    state "ATIVA (token corrente)" as ATIVA
    state "ROTACIONADA (token antigo com revokedAt, família viva)" as ROT
    state "REVOGADA (família inteira)" as REV
    state "EXPIRADA" as EXP
    [*] --> ATIVA : login, confirmEmail ou OIDC → openSession (familyId novo)
    ATIVA --> ROT : POST /api/auth/refresh válido → revoke(antigo) + issue(novo, rotatedFromHash)
    ROT --> ATIVA : o novo token passa a ser o corrente
    ROT --> REV : reuso do token antigo → revokeFamily + REFRESH_REUSO + 401 SESSAO_INVALIDA
    ATIVA --> REV : logout · changePassword (outras famílias, SESSIONS_REVOKED) · status.blocksLogin() · password-reset confirm
    ATIVA --> EXP : expiresAt vencido (30 d persistente, 24 h sessão) → 401 SESSAO_INVALIDA
    REV --> [*]
    EXP --> [*]
  }
  state "Bloqueio por conta (login-fail)" as LOCK {
    state "Livre" as LIVRE
    state "Contando (n de 5 em 15 min)" as CONT
    state "Bloqueada" as BLOQ
    [*] --> LIVRE
    LIVRE --> CONT : tryAcquire antes do hash (reserva 1)
    CONT --> LIVRE : senha certa → release e reset
    CONT --> CONT : senha errada (reserva fica)
    CONT --> BLOQ : 5ª reserva na janela
    BLOQ --> BLOQ : qualquer tentativa → 401 genérico sem hash · LOGIN_BLOQUEADO_TENTATIVAS
    BLOQ --> LIVRE : janela de 15 min vence · redefinição de senha por e-mail (reset)
  }
  note right of REV
    SessionActiveFilter recusa o access
    da família revogada em toda requisição
    (401 SESSAO_ENCERRADA), antes do TTL.
  end note
  note right of BLOQ
    Mesmo balde para PUT /api/auth/password,
    PATCH /api/me/sensitive e POST /api/me/deletion:
    6º erro → 429 MUITAS_TENTATIVAS + Retry-After.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(auth)/login · login/institucional · forgot-password"]
    UI["packages/ui: Input, Button, Banner (warnings), Toast, Dialog (2FA)"]
    BFF["app/bff/auth/* · cookie ws_rt · access em memória · X-Correlation-Id · HMAC EDGE_PROXY_SECRET → X-Ws-Client-Ip/Ts/Sig"]
    MW["middleware.ts: CSP nonce, HSTS, frame-ancestors none"]
    PG --> UI
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    CIF["CorrelationIdFilter"]
    ARL["AuthRateLimitFilter (@Order antes do Spring Security) · ClientIpResolver · HashBulkhead"]
    SEC["SecurityConfig: STATELESS, oauth2ResourceServer JWT, PUBLIC_POST, jwtAuthenticationConverter role→ROLE_*"]
    SAF["SessionActiveFilter (após BearerTokenAuthenticationFilter)"]
    CUR["CurrentUserArgumentResolver → CurrentUser, RequestContext"]
    AC["AuthController · OidcController · PasswordResetController"]
    JWT["JwtConfig + JwtKeys + JwtTokenIssuer (RS256)"]
    NIM["NimbusIdTokenVerifier + OidcConfig"]
    A2["Argon2PasswordHasher"]
    GEH["GlobalExceptionHandler · ApiErrorAuthenticationEntryPoint · ApiErrorAccessDeniedHandler"]
  end
  subgraph WSAPP["ws-application · identity"]
    IS["IdentityService (login, refresh, logout, changePassword, openSession, sessionActive)"]
    OS["OidcService + OidcAccountLinker + OidcProperties"]
    PR["PasswordResetService"]
    SP["SessionPolicy · AuthCodes · AuditActions · Guard"]
    PORTS["ports: RateLimitPort · SessionStorePort · RefreshTokenMirrorPort · TokenIssuerPort · IdTokenVerifier · PasswordHasher · UserRepositoryPort · AuditLogPort · MailPort"]
    IS --> PORTS
    OS --> IS
    PR --> IS
    IS --> SP
  end
  subgraph WSDOM["ws-domain"]
    DOM["identity: User · AccountStatus.blocksLogin · Role · ProfileType · VerificationPurpose"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: JpaIdentityAdapters (RefreshTokenEntity espelho, UserEntity, VerificationCodeEntity), JpaAuditLog, AesGcmStringConverter, V3"]
    RDS["cache-redis: RedisRateLimit (Lua) · RedisSessionStore (planejado, flag redis.enabled)"]
    MEM["InMemoryRateLimit · InMemorySessionStore (padrão sem Redis)"]
    PLT["platform: MailPort (redefinição de senha)"]
  end
  subgraph EXT["Externos"]
    IDP["IdP institucional OIDC (Google Workspace / Entra ID) · JWKS"]
    DB[("MySQL 8.4 TLS")]
    RD[("Redis 7")]
  end

  BFF -->|"REST JSON"| CIF --> ARL --> SEC --> SAF --> CUR --> AC
  AC --> IS
  AC --> OS
  AC --> PR
  AC --> GEH
  JWT -.implementa TokenIssuerPort.-> PORTS
  NIM -.implementa IdTokenVerifier.-> PORTS
  A2 -.implementa PasswordHasher.-> PORTS
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  MEM -.implementa.-> PORTS
  PLT -.implementa.-> PORTS
  IS --> DOM
  MY --> DB
  RDS --> RD
  PG -->|"Authorization Code + PKCE"| IDP
  NIM -->|"JWKS"| IDP
  SEC --> JWT
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF2.CA01 | `IdentityService.login/openSession/issue`, `SessionPolicy`, `RefreshRecord`, `JwtTokenIssuer`, `Session` | `S1`→`S10`→`S11`→`F2` | 4–5, 27–38 | `[*]`→`ATIVA` | `AC`, `IS`, `JWT`, `BFF` (`ws_rt`) | real |
| RF2.CA02 | `IdentityService.dummyHash`, `AccountStatus.blocksLogin`, `AuthCodes` | `S2`→`S3`→`E401`, `S6`→`S7`→`E401`, `S8`→`E403`, `S9`→`E2FA` | 6–9, 15–19, 22–26 | nota de `BLOQ` | `IS`, `GEH` | real (TOTP: Q-83) |
| RF2.CA03 | `OidcController`, `OidcService`, `IdTokenVerifier`/`NimbusIdTokenVerifier`, `OidcAccountLinker` | `F4`→`O1`→`S11` | — (mesma emissão 32–38) | `[*]`→`ATIVA` | `OS`, `NIM`, `IDP` | real (`OidcTest`, `OidcWebTest`) |
| RF2.CA04 | `IdentityService.refresh`, `SessionStorePort.revoke/revokeFamily`, `RefreshTokenMirrorPort` | `A2`→`F3`→`R1`→`E401S`/`S11` | 39–52 | `ATIVA`→`ROT`→`ATIVA`, `ROT`→`REV`, `ATIVA`→`EXP` | `IS`, `RDS`/`MEM`, `MY` | real |
| RF2.CA05 | `IdentityService.logout/changePassword/revokeOtherSessions/activeSessions/sessionActive`, `SessionActiveFilter`, `CurrentUser` | `W6` | 53–58 | `ATIVA`→`REV` | `SAF`, `CUR`, `AC` | real; `GET/DELETE /api/auth/sessions` planejado (Q-89) |
| RF2.CA06 | `AuthRateLimitFilter`, `RateLimitPort`, `AuditActions`, `PasswordResetService` (`clearLockout`), `Masking` | `W2`→`E429`, `S5`, `S7`, `S10` | 3, 8, 12–13, 17, 30, 44 | `LOCK` inteiro | `ARL`, `RDS`, `PR`, `PLT` | real |
| RF2.CA07 | `IdentityService.login` (ordem das checagens), `dummyHash` | `S3`, `S5`, `S7`, `S8`→`E403`, `S9`→`E2FA` | 6–26 | nota de `BLOQ` | `IS` | real (§7) |
| RF2.CA08 | `RateLimitPort.tryAcquire/release/reset`, `RedisRateLimit` (Lua), `SessionPolicy.maxLoginFailures/lockWindow` | `S4`→`S5`, `S8`, `S10` | 11, 16, 21, 29 | `LIVRE`→`CONT`→`BLOQ`→`LIVRE` | `RDS`, `MEM` | real |
| RF2.CA09 | `IdentityService.changePassword`, `AccountService.updateSensitive/requestDeletion` | — | — | nota de `BLOQ` | `AC`, `IS` | real (mesmo balde) |
| RF2.CA10 | `AuthRateLimitFilter.RULES`, `ClientIpResolver` | `W2`→`W3`→`E429` | 3 | — | `ARL`, `BFF` | real |
| RF2.CA11 | `HashBulkhead` | `W4`→`E503` | 3 | — | `ARL` | real |
| RF2.CA12 | `OidcAccountLinker` (`email_verified`), `AuthCodes.OIDC_EMAIL_NAO_VERIFICADO` | `O1` | — | — | `OS`, `NIM` | real |
| RF2.CA13 | `JwtTokenIssuer`, `JwtKeys`, `SessionActiveFilter`, BFF `ws_rt` | `F2`, `W6`, `E503J` | 35–38, 53–58 | nota de `REV` | `JWT`, `SAF`, `BFF`, `MW` | real (D-24, D-25) |
| RF2.CA14 | `AuditActions.LOGIN_OK/LOGIN_FALHA/LOGIN_BLOQUEADO_TENTATIVAS/REFRESH_REUSO/LOGOUT`, `AuditEvent`, `Masking` | `S3`, `S5`, `S7`, `S10`, `R1` | 7, 12, 17, 23, 30, 44 | — | `MY` (`audit_log` RESTRICT), `CIF` | real |

## 7. Controles de segurança (D-14)

Herdados do RF49 do FAI pela **D-14**; camadas de defesa e rastreabilidade RN/CA → bloco → classe em [`../SEG/README.md`](../SEG/README.md). Todos "(CA a confirmar)" até a Q-48. Onde um CA abaixo refina o CA01–CA06, vale o de baixo. Coluna **Código**: o que já existe em `origin/main` (Bloco 3, PR #16).

| CA | Enunciado (Dado / Quando / Então) | Código |
|---|---|---|
| **RF2.CA07** (CA a confirmar) | **Login sem oráculo.** Dado conta inexistente, senha errada ou conta bloqueada (mesmo com a senha certa), então a resposta é a mesma `401 CREDENCIAIS_INVALIDAS`, com o mesmo tempo (conta inexistente avalia `dummyHash`). `403 CONTA_INDISPONIVEL` (`blocksLogin`: SUSPENDED/ANONYMIZED) e `401 DOIS_FATORES_NECESSARIO` só aparecem **depois da senha certa e fora do bloqueio**. | `IdentityService.login`, `IdentityServiceTest` |
| **RF2.CA08** (CA a confirmar) | **Bloqueio por conta.** Dado 5 tentativas em 15 min (`SessionPolicy`), então a tentativa é reservada **atomicamente antes do hash** (`RateLimitPort.tryAcquire`, INCR+EXPIRE em Lua no `RedisRateLimit`); bloqueada → nem o hash é calculado; senha errada deixa a reserva; senha certa faz `release` e o login completo `reset`; a redefinição por e-mail tira a conta do bloqueio. 40 pedidos paralelos com senha errada avaliam no máximo 5 hashes. | `RateLimitPort`, `RedisRateLimit`, `InMemoryRateLimit`, `RedisRateLimitIT`, `InMemoryRateLimitTest` |
| **RF2.CA09** (CA a confirmar) | **Reconferência de senha.** Dado troca de senha (`PUT /api/auth/password`), dados sensíveis (`PATCH /api/me/sensitive`) ou exclusão (`POST /api/me/deletion`), então o mesmo balde `login-fail` vale e o 6º erro recebe `429 MUITAS_TENTATIVAS` + `Retry-After`. | `IdentityService.changePassword`, `AccountService`, `AccountServiceTest` |
| **RF2.CA10** (CA a confirmar) | **Limite por IP + método + rota** (`AuthRateLimitFilter`, antes do Spring Security): `POST /api/auth/login` 30/10 min · `register` 10/h · `refresh` 120/10 min · `password-reset/request` 10/h · `password-reset/confirm` 20/h · `PUT /api/auth/password` 20/h · `oidc/login` 30/10 min · `two-factor/verify` 20/10 min · `email-verification/*` · `username-suggestions` 60/10 min · `uploads` 40/h. IP = `X-Ws-Client-Ip` assinado (HMAC-SHA256 `EDGE_PROXY_SECRET`, `X-Ws-Proxy-Ts` 60 s) › `X-Real-IP` › TCP; **nunca** `X-Forwarded-For`; IPv6 por /64. | `AuthRateLimitFilter.RULES`, `ClientIpResolver`, `RequestPaths`, `AuthRateLimitFilterTest`, `ClientIpResolverTest` |
| **RF2.CA11** (CA a confirmar) | **Bulkhead de hashes.** Dado um pico de logins, então o `HashBulkhead` (`Semaphore` justo, permits = `max(1, min(max(2, núcleos), pool/2))`, espera `ws.security.auth-hash-wait-ms` = 2 s) devolve `503 AUTENTICACAO_OCUPADA` + `Retry-After` ao excedente; 60 logins paralelos geram zero HTTP 500. | `HashBulkhead`, regras com `hashes=true` |
| **RF2.CA12** (CA a confirmar) | **OIDC.** Dado o `id_token` válido (PKCE, `state`, `nonce`, `iss`, `aud`, `exp`), então ele só é **vinculado a conta existente** de mesmo `emailHash` se o IdP marcar `email_verified=true`; sem isso `401 OIDC_EMAIL_NAO_VERIFICADO` e `AuditLog OIDC_LINK_RECUSADO` (evita takeover). Instância sem OIDC → `404 OIDC_DESLIGADO`. | `OidcService`, `OidcAccountLinker`, `NimbusIdTokenVerifier`, `OidcTest` |
| **RF2.CA13** (CA a confirmar) | **Tokens.** Access JWT RS256 com `iss`, `aud`, `sub`, `sid`, `role`, `profile_type`, `username`, `jti`; TTL **15 min** (`WS_JWT_ACCESS_TTL_MINUTES`, D-25 — padrão da Q-49); chaves por caminho **ou** conteúdo PEM (`JwtKeys`, D-24); sem chave privada configurada → `503 AUTENTICACAO_INDISPONIVEL` (nunca token sem assinatura). `SessionActiveFilter` recusa token de família revogada. Refresh só no cookie `ws_rt`; access só em memória (teste do front falha se aparecer em `localStorage`/`sessionStorage`). | `JwtTokenIssuer`, `JwtKeys`, `JwtKeysAndIssuerTest`, `SessionActiveFilter`, `SessionActiveFilterTest` |
| **RF2.CA14** (CA a confirmar) | **Auditoria.** Eventos `LOGIN_OK`, `LOGIN_FALHA` (`reason` usuario_inexistente · senha · conta_indisponivel · 2fa), `LOGIN_BLOQUEADO_TENTATIVAS` (`resetAt`), `REFRESH_REUSO`, `LOGOUT`, `PASSWORD_CHANGED`, `SESSIONS_REVOKED`, `OIDC_LOGIN`, todos com `correlationId`, e-mail mascarado e sem senha, token ou código. | `AuditActions`, `AuditEvent`, `JpaAuditLog`, `AuditEventTest` |

Tela/aba: `/login` (esqueleto em `app/(auth)/login/page.tsx`) · `/password-reset` (esqueleto em `app/(auth)/password-reset/page.tsx`)
