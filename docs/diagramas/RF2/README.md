# RF2 — Autenticar usuário na plataforma com credenciais de acesso
**HU:** HU2 · **Sprint (board Work Station):** 1 · **Equivalente FAI:** RF2 Autenticação (`AuthController /api/auth/login|refresh|logout|sessions`, `IdentityService.login/refresh/revokeFamily`, `JwtTokenIssuer`, `RefreshToken` por `familyId`, BFF `/bff/auth` com cookie HttpOnly) · **Aba/rota:** `/login` (BFF `/bff/auth/login`, `/bff/auth/refresh`, `/bff/auth/logout`, `/bff/auth/oidc/[provider]`) — rota sugerida
**Critérios de aceite cobertos:** RF2.CA01 … RF2.CA06 (RF1–RF18 não têm CAs no board: derivados da HU2 e marcados "CA a confirmar")

> **HU2** — COMO usuário cadastrado no sistema POSSO autenticar-me na plataforma com minhas credenciais de acesso PARA acessar minha área pessoal de forma segura.

## Critérios de aceite derivados da HU2 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF2.CA01** (CA a confirmar) | Dado `identifier` (username ou e-mail) e senha, quando faço login, então a senha é conferida contra o hash **Argon2id** (`PasswordHasherPort.matches`, com re-hash transparente se os parâmetros mudaram) e recebo um **access JWT** (15 min; claims `user_id`, `sid`=familyId, `role`, `profile_type`) e um **refresh token** opaco (30 d se "lembrar-me", 24 h se não) guardado como hash no **Redis** (`refresh:{familyId}`) com espelho em `refresh_tokens`; o BFF devolve o refresh só em cookie HttpOnly + Secure + SameSite=Strict (`ws_rt`). |
| **RF2.CA02** (CA a confirmar) | Dado credenciais erradas ou usuário inexistente, então `401 CREDENCIAIS_INVALIDAS` com a mesma mensagem e tempo (sem enumerar contas); conta `SUSPENDED`/`DELETION_SCHEDULED` → `403 CONTA_INDISPONIVEL`; `PENDING_EMAIL_VERIFICATION` entra com aviso; `twoFactorEnabled` → `401 DOIS_FATORES_NECESSARIO` até informar o código. |
| **RF2.CA03** (CA a confirmar) | Dado o botão "Entrar com conta institucional", então o fluxo **OAuth2/OIDC Authorization Code + PKCE** (Google Workspace ou Microsoft 365 / Entra ID) valida o `id_token` (assinatura JWKS, `iss`, `aud`, `nonce`, `exp`), vincula `oidcSubject`/`oidcIssuer` ao `User` existente de mesmo `emailHash` (ou cria conta `ACTIVE`, `passwordHash` nulo, `emailVerified` true) e emite a mesma sessão do CA01. |
| **RF2.CA04** (CA a confirmar) | Dado um refresh token válido, quando o BFF chama `/api/auth/refresh`, então ocorre **rotação**: novo token da mesma família, o anterior fica `revokedAt`/`rotatedFromId`; reuso de um token já rotacionado **revoga a família inteira** e responde `401 SESSAO_INVALIDA` (detecção de roubo). |
| **RF2.CA05** (CA a confirmar) | Dado o usuário autenticado, então `logout` revoga a família; `GET /api/auth/sessions` lista dispositivos (deviceName, IP, lastUsedAt, atual) e `DELETE /api/auth/sessions/{familyId}` revoga outra sessão; trocar a senha encerra todas as outras famílias. `SessionActiveFilter` recusa access tokens cuja família foi revogada (`sid`). |
| **RF2.CA06** (CA a confirmar) | Dado tentativas repetidas, então há limite por IP e por `identifier` (`429 MUITAS_TENTATIVAS`), `AuditLog LOGIN_OK / LOGIN_FALHA / REFRESH_REUSO / LOGOUT` com `correlationId` e sem senha, e `User.lastLoginAt` é atualizado; todas as mensagens são i18n (pt-BR/en/es). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace ws_domain {
    class User {
      <<entity>>
      +id: UUID
      +username: String
      +emailHash: String
      +emailVerified: boolean
      +passwordHash: String
      +oidcSubject: String
      +oidcIssuer: String
      +profileType: ProfileType
      +role: Role
      +status: AccountStatus
      +twoFactorEnabled: boolean
      +lastLoginAt: Instant
    }
    class RefreshToken {
      <<entity>>
      +tokenHash: String
      +familyId: UUID
      +userId: UUID
      +expiresAt: Instant
      +revokedAt: Instant
      +rotatedFromId: UUID
      +createdIp: String
      +userAgent: String
      +deviceName: String
      +lastUsedAt: Instant
      +persistent: boolean
    }
    class AuditLog {
      <<entity>>
      +actorId: UUID
      +action: String
      +result: String
      +ip: String
      +userAgent: String
      +correlationId: String
    }
    class AccountStatus {
      <<enum>>
      PENDING_EMAIL_VERIFICATION
      PENDING_VALIDATION
      ACTIVE
      SUSPENDED
      DELETION_SCHEDULED
    }
    class Role {
      <<enum>>
      USER
      ADMIN
    }
  }

  namespace ws_application {
    class IdentityService {
      <<service>>
      +login(cmd LoginCommand, ip, userAgent) Session
      +loginOidc(cmd OidcExchangeCommand, ip, userAgent) Session
      +refresh(rawRefresh, ip, userAgent) Session
      +logout(current CurrentUser, familyId) void
      +sessions(current CurrentUser, currentFamily) List~SessionView~
      +revokeSession(current CurrentUser, familyId) void
      +revokeOtherSessions(userId, keepFamily) int
      +sessionActive(familyId) boolean
      -issue(user, familyId, rotatedFrom, persistent, ip, userAgent, deviceName) Session
      -revokeFamily(familyId) void
    }
    class Session {
      <<value>>
      +accessToken: String
      +expiresInSeconds: long
      +refreshToken: String
      +refreshExpiresAt: Instant
      +familyId: UUID
      +user: UserCard
      +status: String
      +warnings: List~String~
    }
    class PasswordHasherPort {
      <<port>>
      +matches(raw, encoded) boolean
      +needsRehash(encoded) boolean
    }
    class TokenIssuerPort {
      <<port>>
      +issueAccessToken(user, familyId) String
      +accessTokenTtl() Duration
    }
    class RefreshTokenStorePort {
      <<port>>
      +save(token RefreshToken) void
      +findByTokenHash(hash) RefreshToken
      +findByFamily(familyId) List~RefreshToken~
      +revokeFamily(familyId, at) int
    }
    class OidcClientPort {
      <<port>>
      +authorizationUrl(provider, state, nonce, pkceChallenge) String
      +exchangeCode(provider, code, pkceVerifier) OidcTokens
      +validateIdToken(provider, idToken, nonce) OidcIdentity
    }
    class RateLimitPort {
      <<port>>
      +tryAcquire(key, limit, window) boolean
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
  }

  namespace ws_web {
    class AuthController {
      <<controller>>
      +login(cmd LoginCommand) Session
      +oidcAuthorize(provider) RedirectView
      +oidcExchange(body OidcExchangeRequest) Session
      +refresh(body RefreshRequest) Session
      +logout() void
      +sessions() List~SessionView~
      +revokeSession(familyId) void
      +revokeOthers() Map
    }
    class JwtTokenIssuer {
      <<adapter>>
      +issuer: String
      +ttl: Duration
    }
    class Argon2PasswordHasher {
      <<adapter>>
    }
    class SessionActiveFilter {
      <<adapter>>
      +doFilter(request, response) void
    }
    class AuthRateLimitFilter {
      <<adapter>>
    }
  }

  namespace ws_infrastructure {
    class RedisRefreshTokenStore {
      <<adapter>>
      +keyPrefix: String
    }
    class SpringOidcClientAdapter {
      <<adapter>>
      +providers: Map
    }
    class RedisRateLimiter {
      <<adapter>>
    }
  }

  AuthController --> IdentityService
  SessionActiveFilter --> IdentityService : sessionActive(sid)
  IdentityService --> PasswordHasherPort
  IdentityService --> TokenIssuerPort
  IdentityService --> RefreshTokenStorePort
  IdentityService --> OidcClientPort
  IdentityService --> RateLimitPort
  IdentityService --> DomainEventPublisherPort
  IdentityService ..> Session : devolve
  JwtTokenIssuer ..|> TokenIssuerPort
  Argon2PasswordHasher ..|> PasswordHasherPort
  RedisRefreshTokenStore ..|> RefreshTokenStorePort
  SpringOidcClientAdapter ..|> OidcClientPort
  RedisRateLimiter ..|> RateLimitPort
  User "1" --> "*" RefreshToken : familias de sessao
  User --> AccountStatus
  User --> Role
  AuditLog ..> User : actorId

  note for RefreshToken "Redis hash refresh por familyId (TTL = expiresAt) + espelho MySQL refresh_tokens; só o hash SHA-256 do token é guardado"
  note for User "tabela users · .. +20 campos .. · passwordHash nulo quando o login é só OIDC"
```

## 2. Diagrama de atividades

Raias: Usuário · Web/BFF · `ws-application` · Persistência · Provedor OIDC externo. Cobre login local, login institucional (OIDC) e renovação com rotação.

```mermaid
flowchart TD
  subgraph L1["Ator humano — Usuário cadastrado"]
    A1(["Abre /login"]) --> A2{"Como entrar?"}
    A2 -->|usuário e senha| A3["Informa identifier, senha, lembrar-me"]
    A2 -->|conta institucional| A4["Clica em Entrar com Google Workspace ou Microsoft 365"]
    A9["Autentica no provedor e consente"]
    A20(["Área pessoal carregada"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["POST /bff/auth/login → POST /api/auth/login (IP assinado)"]
    B2["Gera state, nonce e PKCE; redireciona para o provedor"]
    B3["Callback /bff/auth/oidc/callback → POST /api/auth/oidc/exchange"]
    B4["Guarda ws_rt (HttpOnly, Secure, SameSite=Strict, path /bff/auth) e access token em memória"]
    B5["Ao abrir o app ou expirar o access: POST /bff/auth/refresh"]
  end

  subgraph L3["ws-application — IdentityService"]
    C1{"Rate limit por IP e identifier ok?"}
    C1 -->|não| E429["429 MUITAS_TENTATIVAS"]
    C1 -->|sim| C2{"Usuário existe e Argon2id confere?"}
    C2 -->|não| E401["401 CREDENCIAIS_INVALIDAS (mesma mensagem e tempo)"]
    C2 -->|sim| C3{"status permite login?"}
    C3 -->|SUSPENDED ou DELETION_SCHEDULED| E403["403 CONTA_INDISPONIVEL"]
    C3 -->|sim| C4{"twoFactorEnabled sem código?"}
    C4 -->|sim| E2FA["401 DOIS_FATORES_NECESSARIO (envia código)"]
    C4 -->|não| C5["needsRehash? refaz o hash Argon2id"]
    C5 --> C6["Emite sessão: access JWT 15 min + RefreshToken (familyId nova)"]
    C10["Valida id_token (JWKS, iss, aud, nonce, exp)"]
    C10 --> C11{"User com oidcSubject+oidcIssuer?"}
    C11 -->|sim| C6
    C11 -->|não| C12{"User com mesmo emailHash?"}
    C12 -->|sim| C13["Vincula oidcSubject/oidcIssuer ao User"]
    C12 -->|não| C14["Cria User ACTIVE, passwordHash nulo, emailVerified=true"]
    C13 --> C6
    C14 --> C6
    C6 --> C7["lastLoginAt=now · publica UserLoggedIn (AFTER_COMMIT) → AuditLog LOGIN_OK"]
    C15["refresh(rawRefresh)"] --> C16{"tokenHash existe, não expirou e não revogado?"}
    C16 -->|revogado ou rotacionado| C17["Revoga a família inteira · AuditLog REFRESH_REUSO"]
    C17 --> E401b["401 SESSAO_INVALIDA"]
    C16 -->|não existe ou expirado| E401b
    C16 -->|sim| C18["Rotação: novo token da mesma família, antigo revokedAt + rotatedFromId"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL: users, refresh_tokens (espelho), audit_log")]
    D2[("Redis: refresh por familyId · rate limit · oidc state/nonce")]
  end

  subgraph L6["Provedor OIDC externo"]
    X1["Google Workspace / Microsoft Entra ID (authorize, token, JWKS)"]
  end

  A3 --> B1 --> C1
  A4 --> B2 --> X1 --> A9 --> B3 --> C10
  B2 --> D2
  C6 --> D2
  C7 --> D1
  C7 --> B4 --> A20
  B5 --> C15
  C18 --> D2
  C18 --> B4

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E429,E401,E403,E2FA,E401b erro;
```

## 3. Diagrama de sequência

Caminho feliz do login local, refresh com rotação e os `alt` de erro (CA02, CA04); o login OIDC aparece em `opt`.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router) /login + /bff/auth
  participant C as AuthController (ws-web)
  participant S as IdentityService (ws-application)
  participant H as Argon2PasswordHasher
  participant J as JwtTokenIssuer
  participant R as Redis
  participant DB as Repository/MySQL
  participant DE as DomainEvents (AFTER_COMMIT)
  participant IDP as Provedor OIDC (Google / Microsoft)

  U->>N: identifier + senha (+ lembrar-me)
  N->>C: POST /bff/auth/login → POST /api/auth/login (X-Wai-Client-Ip assinado)
  C->>S: login(LoginCommand, ip, userAgent)
  S->>R: rateLimit.tryAcquire("login", ip + identifier)
  alt limite estourado (CA06)
    S-->>C: 429 MUITAS_TENTATIVAS
    C-->>N: 429
  else dentro do limite
    S->>DB: findByUsernameOrEmailHash(identifier)
    S->>H: matches(senha, passwordHash)
    alt senha errada ou usuário inexistente (CA02)
      S->>DE: publish LoginFailed → AuditLog LOGIN_FALHA
      S-->>C: 401 CREDENCIAIS_INVALIDAS
      C-->>N: 401 (mesma mensagem, mesmo tempo)
    else status SUSPENDED ou DELETION_SCHEDULED (CA02)
      S-->>C: 403 CONTA_INDISPONIVEL
    else credenciais ok (CA01)
      opt needsRehash(passwordHash)
        S->>H: hash(senha) e grava o novo hash
      end
      S->>J: issueAccessToken(user, familyId) → JWT 15 min (sid, role, profile_type)
      S->>R: HSET refresh por familyId (tokenHash, expiresAt 30 d ou 24 h)
      S->>DB: INSERT refresh_tokens (espelho) + UPDATE users.last_login_at
      S->>DE: publish UserLoggedIn → AuditLog LOGIN_OK
      S-->>C: Session (accessToken, refreshToken, familyId, user, warnings)
      C-->>N: 200
      N-->>U: cookie HttpOnly ws_rt + access token em memória → área pessoal
    end
  end

  opt Login institucional OIDC (CA03)
    U->>N: Entrar com conta institucional
    N->>R: salva state, nonce, pkceVerifier (TTL 10 min)
    N->>IDP: redirect authorize (code, PKCE S256, scope openid email profile)
    IDP-->>N: callback com code + state
    N->>C: POST /api/auth/oidc/exchange (provider, code, pkceVerifier, nonce)
    C->>S: loginOidc(cmd, ip, userAgent)
    S->>IDP: token endpoint (code → id_token) e JWKS
    S->>S: valida iss, aud, nonce, exp, assinatura
    S->>DB: findByOidcSubjectAndIssuer ou findByEmailHash → vincula ou cria User ACTIVE
    S-->>N: Session (mesmo formato do CA01)
  end

  U->>N: reabre o app (access expirado)
  N->>C: POST /bff/auth/refresh (cookie ws_rt) → POST /api/auth/refresh
  C->>S: refresh(rawRefresh, ip, userAgent)
  S->>R: HGET refresh por tokenHash
  alt token já rotacionado ou revogado (CA04)
    S->>R: revokeFamily(familyId)
    S->>DB: UPDATE refresh_tokens SET revoked_at (família)
    S->>DE: publish RefreshReuseDetected → AuditLog REFRESH_REUSO
    S-->>C: 401 SESSAO_INVALIDA
    C-->>N: 401 → limpa cookie e volta ao /login
  else token válido (CA04)
    S->>R: novo tokenHash na família, antigo revokedAt + rotatedFromId
    S->>J: issueAccessToken(user, familyId)
    S-->>C: Session renovada
    C-->>N: 200 + novo cookie ws_rt
  end

  U->>N: Sair
  N->>C: POST /bff/auth/logout → POST /api/auth/logout
  C->>S: logout(currentUser, sid)
  S->>R: revokeFamily(sid)
  S->>DE: publish UserLoggedOut → AuditLog LOGOUT
  C-->>N: 204 → apaga cookie
```

## 4. Máquina de estados

O RF2 não tem estados próprios na `TAXONOMIA`; usa o ciclo da **família de `RefreshToken`** (a sessão de autenticação), derivado dos campos `expiresAt`, `revokedAt` e `rotatedFromId`. O `User.status` só condiciona a entrada (`ACTIVE`/`PENDING_*` entram; `SUSPENDED`/`DELETION_SCHEDULED` não).

```mermaid
stateDiagram-v2
  direction LR
  [*] --> ATIVO : login ou loginOidc emite a família (RF2.CA01 / CA03)
  state "ATIVO (token corrente da família)" as ATIVO
  state "ROTACIONADO (revokedAt + rotatedFromId)" as ROTACIONADO
  state "REVOGADO (família inteira)" as REVOGADO
  state "EXPIRADO (expiresAt passou)" as EXPIRADO

  ATIVO --> ROTACIONADO : refresh válido gera o próximo token (CA04)
  ROTACIONADO --> ATIVO : o novo token passa a ser o corrente
  ATIVO --> EXPIRADO : 30 d (lembrar-me) ou 24 h sem uso
  ATIVO --> REVOGADO : logout ou DELETE /api/auth/sessions (CA05)
  ATIVO --> REVOGADO : troca de senha encerra as outras famílias (CA05)
  ROTACIONADO --> REVOGADO : reuso do token antigo revoga a família (CA04)
  REVOGADO --> [*]
  EXPIRADO --> [*]

  note right of ROTACIONADO
    Um token rotacionado nunca volta a valer.
    Reusá-lo é sinal de roubo e derruba a família
    (401 SESSAO_INVALIDA + AuditLog REFRESH_REUSO).
  end note
  note right of ATIVO
    SessionActiveFilter confere o claim sid do JWT
    contra a família no Redis a cada requisição.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(auth)/login/page.tsx"]
    FE2["app/bff/auth/[action]/route.ts (login, refresh, logout)"]
    FE3["app/bff/auth/oidc/[provider]/route.ts (authorize + callback)"]
    FE4["lib/auth/session.tsx (access token em memória, refreshMe)"]
    FE5["middleware.ts (rotas protegidas)"]
  end

  subgraph WEB["ws-web"]
    W1["AuthController /api/auth/login · /refresh · /logout · /sessions · /oidc/exchange"]
    W2["SecurityConfig (resource server JWT) · SessionActiveFilter · AuthRateLimitFilter"]
    W3["JwtTokenIssuer (adapter TokenIssuerPort)"]
    W4["Argon2PasswordHasher (adapter PasswordHasherPort)"]
    W5["CurrentUserResolver · AuditAuthenticationEntryPoint"]
  end

  subgraph APP["ws-application"]
    S1["IdentityService"]
    S2["Guard · CurrentUser · RequestActor"]
    P1["TokenIssuerPort · PasswordHasherPort · RefreshTokenStorePort"]
    P2["OidcClientPort · RateLimitPort · DomainEventPublisherPort"]
  end

  subgraph DOM["ws-domain"]
    D1["User · RefreshToken · AuditLog"]
    D2["AccountStatus · Role · ProfileType"]
    D3["UserRepository · RefreshTokenRepository"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql (users, refresh_tokens espelho, audit_log)"]
    I2["cache-redis (RedisRefreshTokenStore, RedisRateLimiter, oidc state)"]
    I3["platform (SpringOidcClientAdapter, OutboxEventPublisher, AuditLogWriter)"]
  end

  subgraph EXT["Serviços externos"]
    X1["Google Workspace (OIDC)"]
    X2["Microsoft 365 / Entra ID (OIDC)"]
  end

  MY[("MySQL 8")]
  RD[("Redis")]

  FE1 --> FE2
  FE1 --> FE3
  FE4 --> FE2
  FE5 -.-> FE4
  FE2 -->|HTTPS/JSON| W1
  FE3 -->|HTTPS/JSON| W1
  FE3 -->|redirect| X1
  FE3 -->|redirect| X2
  W2 -.-> W1
  W1 --> S1
  S1 --> S2
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S1 --> D3
  W3 -.->|implementa| P1
  W4 -.->|implementa| P1
  I2 -.->|implementa| P1
  I2 -.->|implementa| P2
  I3 -.->|implementa| P2
  I3 -->|token + JWKS| X1
  I3 -->|token + JWKS| X2
  D3 --> I1
  I1 --> MY
  I2 --> RD
  BOOT["ws-bootstrap (application.yml: jwt.issuer, access-ttl 15 min, refresh-ttl, oidc.providers)"] -.-> WEB
  BOOT -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF2.CA01 | `IdentityService.login/issue`, `Session`, `TokenIssuerPort`/`JwtTokenIssuer`, `RefreshTokenStorePort`/`RedisRefreshTokenStore`, `RefreshToken` | `A3`, `B1`, `C2`, `C5`, `C6`, `B4` | 2–3, 8–9, 17–22 | `[*] → ATIVO` | `FE1`, `FE2`, `FE4`, `W1`, `W3`, `W4`, `I2` |
| RF2.CA02 | `AccountStatus`, `User.twoFactorEnabled`, `PasswordHasherPort.matches` | `C2` → `E401`, `C3` → `E403`, `C4` → `E2FA` | 10–15 (`401 CREDENCIAIS_INVALIDAS`, `403 CONTA_INDISPONIVEL`) | — | `W1`, `S1`, `W5 AuditAuthenticationEntryPoint` |
| RF2.CA03 | `OidcClientPort`/`SpringOidcClientAdapter`, `User.oidcSubject/oidcIssuer`, `IdentityService.loginOidc` | `A4`, `B2`, `B3`, `X1`, `C10`–`C14` | 25–34 (`opt Login institucional OIDC`) | `[*] → ATIVO` (via loginOidc) | `FE3`, `I3`, `X1`, `X2` |
| RF2.CA04 | `RefreshToken.rotatedFromId/revokedAt`, `IdentityService.refresh/revokeFamily`, `RefreshTokenStorePort.revokeFamily` | `B5`, `C15`–`C18`, `E401b` | 35–48 (refresh, reuso → revoga família) | `ATIVO → ROTACIONADO → ATIVO`, `ROTACIONADO → REVOGADO` | `FE2 refresh`, `I2`, `I1 refresh_tokens` |
| RF2.CA05 | `IdentityService.logout/sessions/revokeSession/revokeOtherSessions/sessionActive`, `SessionActiveFilter`, `RefreshToken.deviceName/lastUsedAt` | (logout em §3) | 49–53 | `ATIVO → REVOGADO` (logout, DELETE sessions, troca de senha) | `W1 /sessions`, `W2 SessionActiveFilter` |
| RF2.CA06 | `RateLimitPort`/`RedisRateLimiter`, `AuthRateLimitFilter`, `AuditLog`, `User.lastLoginAt`, `DomainEventPublisherPort` | `C1` → `E429`, `C7`, `C17` | 4–6, 11, 19–20, 43 | — | `W2 AuthRateLimitFilter`, `I2`, `I3 AuditLogWriter` |
