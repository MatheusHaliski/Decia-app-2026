# RF1 — Cadastrar usuário na plataforma com dados de acesso
**HU:** HU1 · **Sprint (board Work Station):** 1 · **Equivalente FAI:** RF1 Cadastro (`AuthController POST /api/auth/register`, `IdentityService.register`, `Argon2PasswordHasher`, BFF `/bff/auth/register`) · **Aba/rota:** `/register` → `/verify-email` (BFF `/bff/auth/register`) — rota sugerida
**Critérios de aceite cobertos:** RF1.CA01 … RF1.CA06 (RF1–RF18 não têm CAs no board: derivados da HU1 e marcados "CA a confirmar")

> **HU1** — COMO visitante do sistema POSSO realizar meu cadastro na plataforma informando meus dados de acesso PARA obter uma conta e acessar as funcionalidades do DECIA.

## Critérios de aceite derivados da HU1 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF1.CA01** (CA a confirmar) | Dado o formulário de cadastro, quando informo perfil (`ProfileType` EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO), nome completo, `username`, e-mail, senha e confirmação, então cada campo é validado (formato de e-mail, username normalizado sem reservados, política mínima de senha, senhas iguais) e os erros voltam como `422 VALIDACAO` com `details` por campo e `correlationId`. |
| **RF1.CA02** (CA a confirmar) | Dado um e-mail (`emailHash`) ou `username` já cadastrado, quando envio o formulário, então recebo `409 EMAIL_EM_USO` ou `409 USERNAME_EM_USO`; o sistema oferece sugestões de username livres (`GET /api/auth/username-suggestions`). |
| **RF1.CA03** (CA a confirmar) | Dado um cadastro válido, então a senha é guardada apenas como hash **Argon2id** (parâmetros mínimos OWASP) via `PasswordHasherPort`, nunca aparece em log, evento ou auditoria; e-mail e telefone são cifrados em repouso (`AesGcmStringConverter`, LGPD). |
| **RF1.CA04** (CA a confirmar) | Dado o cadastro criado, então a conta nasce com `AccountStatus PENDING_EMAIL_VERIFICATION` e recebe um código de verificação por e-mail (AFTER_COMMIT); ao confirmar o código, EMPREGADO → `ACTIVE` e EMPRESA/CHEFE_DEPARTAMENTO → `PENDING_VALIDATION` com `ApprovalRequest PENDENTE` para o ADMIN (RF28.CA01). |
| **RF1.CA05** (CA a confirmar) | Dado o cadastro criado, então o sistema cria `UserPreferences` padrão (theme AUTO, language PT_BR, timezone America/Sao_Paulo, wipLimit 3, aiModeDefault ECONOMIA) e já emite a sessão (access JWT 15 min + `RefreshToken` em cookie HttpOnly pelo BFF) como no RF2, levando o usuário para `/verify-email`. |
| **RF1.CA06** (CA a confirmar) | Dado tentativas repetidas, então há limite por IP (`429 LIMITE_ENVIOS`) e por código informado (`429 MUITAS_TENTATIVAS`); `AuditLog USER_REGISTERED` e `EMAIL_VERIFIED` são gravados sem dados sensíveis e com `correlationId`. |

## 1. Diagrama de classes

Entidades de `docs/arquitetura/TAXONOMIA.md` §1 (Identidade & Acesso) e §12 (Plataforma); serviços e portas sugeridos para `ws-application`, adaptadores em `ws-web`/`ws-infrastructure`.

```mermaid
classDiagram
  direction LR

  namespace ws_domain {
    class User {
      <<entity>>
      +id: UUID
      +username: String
      +fullName: String
      +displayName: String
      +email: String
      +emailHash: String
      +emailVerified: boolean
      +phone: String
      +passwordHash: String
      +profileType: ProfileType
      +role: Role
      +status: AccountStatus
      +companyId: UUID
      +departmentId: UUID
      +twoFactorEnabled: boolean
      +lastLoginAt: Instant
    }
    class UserPreferences {
      <<entity>>
      +id: UUID
      +userId: UUID
      +theme: ThemeMode
      +language: UiLanguage
      +timezone: String
      +wipLimit: int
      +aiModeDefault: AiMode
    }
    class RefreshToken {
      <<entity>>
      +tokenHash: String
      +familyId: UUID
      +userId: UUID
      +expiresAt: Instant
      +createdIp: String
      +userAgent: String
      +persistent: boolean
    }
    class ApprovalRequest {
      <<entity>>
      +id: UUID
      +userId: UUID
      +requestedProfile: ProfileType
      +evidenceJson: String
      +status: String
    }
    class AuditLog {
      <<entity>>
      +actorId: UUID
      +action: String
      +resourceType: String
      +resourceId: UUID
      +result: String
      +ip: String
      +correlationId: String
    }
    class ProfileType {
      <<enum>>
      EMPREGADO
      EMPRESA
      CHEFE_DEPARTAMENTO
    }
    class Role {
      <<enum>>
      USER
      ADMIN
    }
    class AccountStatus {
      <<enum>>
      PENDING_EMAIL_VERIFICATION
      PENDING_VALIDATION
      ACTIVE
      SUSPENDED
      DELETION_SCHEDULED
    }
  }

  namespace ws_application {
    class IdentityService {
      <<service>>
      +register(cmd RegisterCommand, ip, userAgent) Session
      +verifyEmail(current CurrentUser, code) UserCard
      +resendEmailVerification(current CurrentUser) void
      +usernameSuggestions(name) List~String~
      -issue(user, familyId, persistent, ip, userAgent) Session
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
    class RefreshTokenStorePort {
      <<port>>
      +save(token RefreshToken) void
      +findByFamily(familyId) List~RefreshToken~
    }
    class EmailSenderPort {
      <<port>>
      +sendVerificationCode(email, code, language) void
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
      +register(cmd RegisterCommand) Session
      +usernameSuggestions(name) Map
      +verifyEmail(code) UserCard
      +resendEmail() void
    }
    class Argon2PasswordHasher {
      <<adapter>>
      +MEMORY_KIB: int
      +ITERATIONS: int
      +PARALLELISM: int
    }
    class JwtTokenIssuer {
      <<adapter>>
      +issuer: String
      +ttl: Duration
    }
  }

  namespace ws_infrastructure {
    class RedisRefreshTokenStore {
      <<adapter>>
      +keyPrefix: String
    }
    class RedisRateLimiter {
      <<adapter>>
    }
    class SmtpEmailSender {
      <<adapter>>
    }
    class OutboxEventPublisher {
      <<adapter>>
    }
  }

  AuthController --> IdentityService : usa
  IdentityService --> PasswordHasherPort
  IdentityService --> TokenIssuerPort
  IdentityService --> RefreshTokenStorePort
  IdentityService --> EmailSenderPort
  IdentityService --> RateLimitPort
  IdentityService --> DomainEventPublisherPort
  Argon2PasswordHasher ..|> PasswordHasherPort
  JwtTokenIssuer ..|> TokenIssuerPort
  RedisRefreshTokenStore ..|> RefreshTokenStorePort
  RedisRateLimiter ..|> RateLimitPort
  SmtpEmailSender ..|> EmailSenderPort
  OutboxEventPublisher ..|> DomainEventPublisherPort

  User "1" --> "1" UserPreferences : preferences
  User "1" --> "*" RefreshToken : sessoes
  User "1" --> "0..1" ApprovalRequest : EMPRESA ou CHEFE
  User --> ProfileType
  User --> Role
  User --> AccountStatus
  AuditLog ..> User : actorId

  note for User "tabela users · .. +14 campos (jobTitle, avatarUrl, bio, verified, hypeVisibility, rankingOptOut, testAccount, oidcSubject, oidcIssuer…) .."
  note for RefreshToken "Redis hash por familyId + espelho MySQL refresh_tokens"
  note for ApprovalRequest "status PENDENTE · APROVADO · REJEITADO (RF28.CA01)"
```

## 2. Diagrama de atividades

Raias: Visitante · Web/BFF · `ws-application` · Persistência (o RF1 não usa o AiEngine).

```mermaid
flowchart TD
  subgraph L1["Ator humano — Visitante"]
    A1(["Acessa /register"]) --> A2["Escolhe o perfil (EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO)"]
    A2 --> A3["Preenche nome completo, username, e-mail, senha e confirmação"]
    A3 --> A4["Envia o formulário"]
    A12["Abre o e-mail e copia o código"] --> A13["Informa o código em /verify-email"]
    A16(["Conta ACTIVE ou aguardando ADMIN"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["Validação client-side e sugestão de username"] --> B2["POST /bff/auth/register → POST /api/auth/register (IP do cliente assinado)"]
    B9["Guarda refresh token em cookie HttpOnly e access token em memória"] --> B10["Redireciona para /verify-email"]
    B14["POST /api/auth/email-verification com Bearer"]
  end

  subgraph L3["ws-application — IdentityService"]
    C1{"Rate limit por IP ok?"}
    C1 -->|não| E429["429 LIMITE_ENVIOS"]
    C1 -->|sim| C2{"Campos válidos? (e-mail, username normalizado e não reservado, política de senha)"}
    C2 -->|não| E422["422 VALIDACAO (details por campo + correlationId)"]
    C2 -->|sim| C3{"emailHash ou username já existem?"}
    C3 -->|sim| E409["409 EMAIL_EM_USO ou 409 USERNAME_EM_USO"]
    C3 -->|não| C4["passwordHash = Argon2id(senha)"]
    C4 --> C5["Cria User status=PENDING_EMAIL_VERIFICATION, role=USER + UserPreferences padrão"]
    C5 --> C6{"profileType EMPRESA ou CHEFE_DEPARTAMENTO?"}
    C6 -->|sim| C7["Cria ApprovalRequest PENDENTE (RF28.CA01)"]
    C6 -->|não| C8
    C7 --> C8["Emite sessão: access JWT 15 min + RefreshToken (familyId nova)"]
    C8 --> C9["Publica UserRegistered (AFTER_COMMIT) → e-mail com código + AuditLog USER_REGISTERED"]
    C14{"Código confere, não expirou e dentro da quota?"}
    C14 -->|quota estourada| E429b["429 MUITAS_TENTATIVAS"]
    C14 -->|não| E401["401 CODIGO_INVALIDO"]
    C14 -->|sim| C15{"profileType EMPREGADO?"}
    C15 -->|sim| C16["emailVerified=true · status → ACTIVE"]
    C15 -->|não| C17["emailVerified=true · status → PENDING_VALIDATION (aguarda ADMIN)"]
  end

  subgraph L5["Persistência"]
    D1[("MySQL: users, user_preferences, approval_requests, refresh_tokens, verification_codes, audit_log")]
    D2[("Redis: rate limit por IP · refresh por familyId")]
    D3["EmailSenderPort → SMTP / Google Workspace"]
  end

  A4 --> B1
  B2 --> C1
  C5 --> D1
  C8 --> D2
  C9 --> D3
  C9 --> B9
  D3 --> A12
  A13 --> B14
  B14 --> C14
  C16 --> D1
  C17 --> D1
  C16 --> A16
  C17 --> A16

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E429,E429b,E422,E409,E401 erro;
```

## 3. Diagrama de sequência

Caminho feliz (cadastro → sessão → verificação de e-mail) e os `alt` de erro dos CA02 e CA06.

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário (visitante)
  participant N as Next.js (App Router) /register + /bff/auth
  participant C as AuthController (ws-web)
  participant S as IdentityService (ws-application)
  participant H as Argon2PasswordHasher
  participant DB as Repository/MySQL
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>N: preenche perfil, nome, username, e-mail, senha
  N->>N: valida no cliente e consulta GET /api/auth/username-suggestions
  N->>C: POST /bff/auth/register → POST /api/auth/register (X-Wai-Client-Ip assinado)
  C->>S: register(RegisterCommand, ip, userAgent)
  S->>R: rateLimit.tryAcquire("register", ip)
  alt limite por IP estourado (CA06)
    S-->>C: 429 LIMITE_ENVIOS
    C-->>N: 429
    N-->>U: "Muitas tentativas, aguarde"
  else dentro do limite
    S->>S: valida campos, normaliza username, política de senha (CA01)
    S->>DB: existsByEmailHash(emailHash) / existsByUsername(username)
    alt já existe (CA02)
      S-->>C: 409 EMAIL_EM_USO ou USERNAME_EM_USO
      C-->>N: 409 + sugestões de username
      N-->>U: destaca o campo e sugere alternativas
    else novo cadastro
      S->>H: hash(senha) → Argon2id (CA03)
      S->>DB: INSERT users (PENDING_EMAIL_VERIFICATION) + user_preferences padrão (CA05)
      opt profileType EMPRESA ou CHEFE_DEPARTAMENTO
        S->>DB: INSERT approval_requests (PENDENTE) (CA04)
      end
      S->>DB: INSERT verification_codes (hash do código, expira em 15 min)
      S->>R: HSET refresh por familyId (tokenHash, TTL 30 d) + INSERT refresh_tokens (espelho)
      S->>DE: publish UserRegistered(userId, correlationId)
      S-->>C: Session (accessToken 15 min, refreshToken, user, status)
      C-->>N: 201 Created
      N-->>U: cookie HttpOnly ws_rt + redireciona /verify-email
      DE->>DE: AFTER_COMMIT → EmailSenderPort.sendVerificationCode + AuditLog USER_REGISTERED
    end
  end

  U->>N: informa o código recebido
  N->>C: POST /api/auth/email-verification (Bearer access token)
  C->>S: verifyEmail(currentUser, code)
  S->>DB: SELECT verification_codes (quota de tentativas)
  alt código errado ou expirado (CA06)
    S-->>C: 401 CODIGO_INVALIDO (ou 429 MUITAS_TENTATIVAS)
  else código confere (CA04)
    S->>DB: UPDATE users SET email_verified=1, status=ACTIVE ou PENDING_VALIDATION
    S->>DE: publish EmailVerified → AuditLog EMAIL_VERIFIED
    S-->>C: 200 UserCard
    C-->>N: 200
    N-->>U: entra no app (EMPREGADO) ou aviso "aguardando validação do ADMIN"
  end
```

## 4. Máquina de estados

Entidade central: `User.status` (`AccountStatus`). O RF1 cobre a criação em `PENDING_EMAIL_VERIFICATION` e as duas saídas da verificação; os demais estados são do RF2/RF28/LGPD e aparecem para contexto.

```mermaid
stateDiagram-v2
  direction LR
  [*] --> PENDING_EMAIL_VERIFICATION : POST /api/auth/register (RF1.CA04)
  PENDING_EMAIL_VERIFICATION --> ACTIVE : código confere e profileType EMPREGADO
  PENDING_EMAIL_VERIFICATION --> PENDING_VALIDATION : código confere e profileType EMPRESA ou CHEFE_DEPARTAMENTO
  PENDING_VALIDATION --> ACTIVE : ADMIN aprova ApprovalRequest (RF28.CA01)
  PENDING_VALIDATION --> SUSPENDED : ADMIN rejeita ApprovalRequest
  ACTIVE --> SUSPENDED : ADMIN suspende (RF18)
  SUSPENDED --> ACTIVE : ADMIN reativa
  ACTIVE --> DELETION_SCHEDULED : titular pede exclusão (LGPD)
  DELETION_SCHEDULED --> ACTIVE : titular cancela dentro do prazo
  DELETION_SCHEDULED --> [*] : purga após o prazo

  note right of PENDING_EMAIL_VERIFICATION
    Pode autenticar (RF2) com aviso,
    mas não abre nem participa de sessão DECIA.
    Código expira em 15 min e pode ser reenviado.
  end note
  note right of PENDING_VALIDATION
    EMPRESA e CHEFE_DEPARTAMENTO aguardam o ADMIN.
    Enquanto isso o acesso é somente leitura.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(auth)/register/page.tsx"]
    FE2["app/(auth)/verify-email/page.tsx"]
    FE3["app/bff/auth/[action]/route.ts (cookie HttpOnly, IP assinado)"]
    FE4["components/ui (Form, Input, PasswordStrength, Toast)"]
  end

  subgraph WEB["ws-web"]
    W1["AuthController /api/auth/register · /email-verification · /username-suggestions"]
    W2["SecurityConfig · AuthRateLimitFilter · CorrelationIdFilter"]
    W3["Argon2PasswordHasher (adapter PasswordHasherPort)"]
    W4["JwtTokenIssuer (adapter TokenIssuerPort)"]
  end

  subgraph APP["ws-application"]
    S1["IdentityService"]
    P1["PasswordHasherPort · TokenIssuerPort · RefreshTokenStorePort"]
    P2["EmailSenderPort · RateLimitPort · DomainEventPublisherPort"]
  end

  subgraph DOM["ws-domain"]
    D1["User · UserPreferences · RefreshToken · ApprovalRequest · AuditLog"]
    D2["ProfileType · Role · AccountStatus"]
    D3["UserRepository · UserPreferencesRepository · ApprovalRequestRepository"]
  end

  subgraph INFRA["ws-infrastructure"]
    I1["persistence-mysql (JPA + Flyway: users, user_preferences, refresh_tokens, approval_requests, audit_log)"]
    I2["cache-redis (RedisRefreshTokenStore, RedisRateLimiter)"]
    I3["platform (OutboxEventPublisher, SmtpEmailSender, AuditLogWriter)"]
  end

  subgraph EXT["Serviços externos"]
    X1["SMTP institucional / Google Workspace (Gmail API)"]
  end

  MY[("MySQL 8")]
  RD[("Redis")]

  FE1 --> FE3
  FE2 --> W1
  FE1 --> FE4
  FE3 -->|HTTPS/JSON| W1
  W1 --> S1
  W2 -.-> W1
  S1 --> P1
  S1 --> P2
  S1 --> D1
  S1 --> D3
  W3 -.->|implementa| P1
  W4 -.->|implementa| P1
  I2 -.->|implementa| P1
  I2 -.->|implementa| P2
  I3 -.->|implementa| P2
  D3 --> I1
  I1 --> MY
  I2 --> RD
  I3 --> X1
  BOOT["ws-bootstrap (Spring Boot, application.yml, flags)"] -.-> WEB
  BOOT -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF1.CA01 | `IdentityService.register`, `User.username/fullName/email`, `ProfileType` | `B1`, `C2` → `E422` | 7 (valida campos) · `else novo cadastro` | — | `FE1`, `FE4`, `W1`, `S1` |
| RF1.CA02 | `User.emailHash`, `User.username`, `IdentityService.usernameSuggestions` | `C3` → `E409` | 8–11 (`existsByEmailHash`, 409) | — | `W1 /username-suggestions`, `D3 UserRepository` |
| RF1.CA03 | `PasswordHasherPort`, `Argon2PasswordHasher`, `User.passwordHash`, `User.email` (AES) | `C4` | 12 (`hash(senha) → Argon2id`) | — | `W3`, `I1` (AesGcmStringConverter) |
| RF1.CA04 | `AccountStatus`, `ApprovalRequest`, `IdentityService.verifyEmail`, `EmailSenderPort` | `C5`, `C6`–`C7`, `C14`–`C17` | 13–15, 22–31 | `[*] → PENDING_EMAIL_VERIFICATION`, `→ ACTIVE`, `→ PENDING_VALIDATION` | `FE2`, `I3 SmtpEmailSender`, `X1` |
| RF1.CA05 | `UserPreferences`, `RefreshToken`, `TokenIssuerPort`, `RefreshTokenStorePort` | `C5`, `C8`, `B9`, `B10` | 13, 17–20 (sessão + cookie HttpOnly) | — | `FE3`, `W4`, `I2 RedisRefreshTokenStore` |
| RF1.CA06 | `RateLimitPort`, `AuditLog`, `DomainEventPublisherPort` | `C1` → `E429`, `C14` → `E429b`/`E401`, `C9` | 5–6, 21, 25–27 | — | `W2 AuthRateLimitFilter`, `I2 RedisRateLimiter`, `I3 AuditLogWriter` |
| RF1.CA07 (CA a confirmar, D-14) | `Argon2PasswordHasher` (m=19456 KiB, t=2, p=1, salt 16, hash 32) | `C4` | 12 | — | `W3` · SEG §1 `Argon2PasswordHasher` |
| RF1.CA08 (CA a confirmar, D-14) | `AuthRateLimitFilter.RULES` (register 10/h, envios do cadastro 40/h, username-suggestions 60/10 min, availability 120/10 min), `ClientIpResolver` | `B2` (IP assinado), `C1` → `E429` | 3, 5–6 | — | `W2 AuthRateLimitFilter`, `FE3` · SEG §2 `D2`–`D4`, §3 3–9 |
| RF1.CA09 (CA a confirmar, D-14) | `HashBulkhead` (bulkhead do `POST /api/auth/register`) | `C1` → `C4` (vaga antes do hash) | 12 | — | `W2` · SEG §2 `D5`–`D6` → `E503`, §3 10–12 |
| RF1.CA10 (CA a confirmar, D-14) | `IdentityService.reservedUsername` (`admin`, `root`, `suporte`, `secid`, `decia`, `workstation`, prefixos `demo_`/`e2e_`) | `C2` → `E422` | 7 | — | `S1` · SEG §1 nota de `IdentityService` |
| RF1.CA11 (CA a confirmar, D-14) | `IdentityService.verifyEmail` (`noRollbackFor`, `MAX_CODE_ATTEMPTS` 5), `requireCodeAttemptQuota` (10/h por pessoa e finalidade) | `C14` → `E429b`/`E401` | 24–27 | — | `S1`, `I2` · SEG §2 `F14` |
| RF1.CA12 (CA a confirmar, D-14) | `User.accountOrigin` (`AccountOrigin` REAL desde o V1), `fixtureKey`, `testAccount` gerada | `C5` | 13 | `[*] → PENDING_EMAIL_VERIFICATION` (nasce `REAL`) | `I1` (V1 baseline) · SEG §1 `AccountOrigin` |
| RF1.CA13 (CA a confirmar, D-14) | `IdentityService.maskEmail`, `AuditLog` sem senha/código, `JwtTokenIssuer` (TTL em aberto, Q-49) | `C8`, `C9` | 17, 21 | — | `W4`, `I3 AuditLogWriter` · SEG §1 notas de `IdentityService` e `JwtTokenIssuer` |

## 7. Controles de segurança (D-14)

Herdados do RF49 do FAI pela **D-14**; detalhes, diagramas e rastreabilidade RN/CA em [`../SEG/README.md`](../SEG/README.md). Todos "(CA a confirmar)": a Q-48 decide se virarão CAs deste RF ou um RNF do board. Os controles do login (sem oráculo, bloqueio por conta, reconferência) estão no RF2 §7; aqui ficam os que tocam o cadastro e a verificação de e-mail.

| CA | Enunciado (Dado / Quando / Então) | Bloco do brief |
|---|---|---|
| **RF1.CA07** (CA a confirmar) | Dado um cadastro válido, então a senha é guardada com **Argon2id** exatamente em m=19456 KiB, t=2, p=1, salt 16 bytes, hash 32 bytes (mínimo OWASP), e `needsRehash` refaz o hash no próximo login quando os parâmetros mudarem. | 3 |
| **RF1.CA08** (CA a confirmar) | Dado o mesmo IP (assinado pelo BFF em `X-Ws-Client-Ip`/`X-Ws-Proxy-Ts`/`X-Ws-Proxy-Sig`; senão `X-Real-IP`; senão TCP; nunca `X-Forwarded-For`; IPv6 por /64), então o `AuthRateLimitFilter` aplica, **antes do Spring Security**, `POST /api/auth/register` 10/h, envios do cadastro 40/h, `GET /api/auth/username-suggestions` 60/10 min e disponibilidade de username 120/10 min; o excedente recebe `429 MUITAS_TENTATIVAS` com `Retry-After` (substitui o `429 LIMITE_ENVIOS` do CA06). | 3 |
| **RF1.CA09** (CA a confirmar) | Dado um pico de cadastros, então o `HashBulkhead` (permits = `max(1, min(max(2, núcleos), poolDoBanco/2))`, espera 2 s) limita os Argon2 simultâneos e o excedente recebe `503 AUTENTICACAO_OCUPADA` + `Retry-After`; 60 pedidos paralelos geram zero HTTP 500. | 3 |
| **RF1.CA10** (CA a confirmar) | Dado um `username` que, depois da normalização, seja `admin`, `root`, `suporte`, `secid`, `decia`, `workstation` ou comece com `demo_`/`e2e_`, então o cadastro responde `422 VALIDACAO` (nome reservado); a conta de administração só nasce pelo `AdminBootstrap` (segredo `WS_ADMIN_PASSWORD`, nunca promove conta existente sem `WS_ADMIN_PROMOTE_EXISTING=true`). | 3 |
| **RF1.CA11** (CA a confirmar) | Dado o código de verificação, então há no máximo 5 tentativas por código (`attempts++` persiste mesmo com erro, `noRollbackFor`) e um contador atômico de 10 tentativas/h por pessoa e finalidade; o excedente recebe `429 MUITAS_TENTATIVAS`. | 3 |
| **RF1.CA12** (CA a confirmar) | Dado o cadastro criado, então `users.account_origin` nasce `REAL` (enum `AccountOrigin` REAL/TEST_SEED/DEMO/SYSTEM desde o `V1__baseline.sql`), com `fixture_key` NULL e `test_account` gerada = false; contas `TEST_SEED`/`DEMO` ficam fora de rankings, HSE, DECIA Points e métricas do RF43, e o e-mail nunca é enviado a `.test`/`.example`/`.invalid`/`.localhost`. | 2, 6 |
| **RF1.CA13** (CA a confirmar) | Dado qualquer log ou evento do cadastro, então o e-mail aparece mascarado (`maskEmail`: `m***@dominio`) e nunca há senha, token ou código; a sessão emitida no CA05 segue o RF2 (TTL do access token em aberto na **Q-49**: 10 min na ARQUITETURA, 15 min aqui). | 1, 3 |
