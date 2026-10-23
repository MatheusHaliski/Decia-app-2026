# RF1 — Cadastrar usuário na plataforma com dados de acesso
**HU:** HU1 · **Sprint (board Work Station):** 1 (card "SPRINT 1 — Cadastro, autenticação, perfil e abertura de sessão") · **Equivalente FAI:** RF1 Cadastro (`AuthController POST /api/auth/register`, `IdentityService.register`, `Argon2PasswordHasher`) · **Aba/rota:** `/register` → `/verify-email` (BFF `app/bff/auth/register` → `POST /api/auth/register`); `/termos` e `/privacidade` (D-15) — **real desde 17/10/2026 (D-143):** páginas públicas `app/(legal)/termos` e `app/(legal)/privacidade`, lidas de `docs/legal/*.md`
**Critérios de aceite cobertos:** RF1.CA01 … RF1.CA06 (corpo do card vazio → derivados do título + HU1, todos "(CA a confirmar)") · RF1.CA07 … RF1.CA13 (§7, controles de segurança D-14) · RF1.CA14 … RF1.CA27 (§8, aceite dos termos e tipos de perfil, D-15…D-22) — regra: o título do card define o RF; os CAs foram atualizados para o código real do Bloco 3 (`RegistrationController`, `RegistrationService`, `V3__rf1_rf2_autenticacao.sql`); atualização de 17/10/2026 (D-143): tipo de usuário explicado em cada opção, aceite dos Termos de Uso e da Política de Privacidade da Velion com links para `/termos` e `/privacidade`, versões 0.2

> **HU1** — COMO visitante do sistema POSSO realizar meu cadastro na plataforma informando meus dados de acesso PARA obter uma conta e acessar as funcionalidades do DECIA.

O cadastro local é o Bloco 3 do plano de segurança (ARQUITETURA §6 (c)). Classes marcadas **(real)** existem em `origin/main` (Bloco 3, PR #16); as marcadas **(planejado)** vêm da TAXONOMIA §1.8–1.15 e do `CADASTRO_E_LGPD.md` (blocos A/B).

**Atualização 17/10/2026 (real, D-143):** no `RegisterForm` (`components/auth/AuthForms.tsx`) cada tipo de usuário do `RadioCards` traz uma explicação (`auth.register.typeHint.EMPREGADO|EMPRESA|CHEFE_DEPARTAMENTO`; EMPRESA e CHEFE_DEPARTAMENTO somam `auth.register.validationNote`, a validação do RF28). O `Checkbox` do aceite diz "Li e aceito os Termos de Uso e a Política de Privacidade da **Velion, dona da Orange Social**", com links que abrem em nova aba as páginas públicas `/termos` e `/privacidade` (`app/(legal)/layout.tsx`, `app/(legal)/termos/page.tsx`, `app/(legal)/privacidade/page.tsx`, `components/legal/LegalDocument.tsx`). As páginas leem `docs/legal/TERMOS_DE_USO.md` e `docs/legal/POLITICA_DE_PRIVACIDADE.md` com `lib/legal/markdown.ts`, que monta uma árvore de dados sem HTML cru, tira as seções internas e destaca os campos `{{...}}` ainda não preenchidos (lista em `docs/legal/CAMPOS_A_PREENCHER.md`; texto v0.2 em rascunho, Q-243). O erro `422 details.fields.acceptTerms` aparece abaixo dos links. As versões gravadas em `users.terms_version/privacy_version` vêm de `ws.legal.current-versions` (`WS_LEGAL_TERMS_VERSION`/`WS_LEGAL_PRIVACY_VERSION`, padrão **0.2**) pela `LegalProperties`. Teste: `components/account/account.test.tsx` ("cadastro: tipo de usuário com explicação e links para os Termos e a Política da Velion"). Evidência: `docs/auditoria/2026-10-17/evidencias/IDENTIDADE.json` passos 3–5 (cadastro exige o aceite, `/termos` público com 25 campos destacados, `/privacidade` público) e capturas `id-02-cadastro-tipo-termos-celular.png` e `id-03-termos-desktop.png` (roteiro `docs/auditoria/2026-10-17/scripts/identidade.mjs`). Continuam **planejados**: `PolicyAcceptance`/`policy_acceptances`, `LegalController` (`GET /api/legal/...`), `PolicyGateFilter` e o histórico de versões.

## Critérios de aceite derivados da HU1 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF1.CA01** (CA a confirmar) | Dado o formulário de cadastro, quando informo `profileType` (EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO), `fullName` (3–160), `username` (3–30, `Usernames.normalize`), `email`, `password` + `confirmPassword` (`Passwords.problem`), telefone opcional (E.164) e `acceptTerms`, então cada campo é validado e os erros voltam juntos como `422 VALIDACAO` com `details.fields` por campo e `correlationId`. |
| **RF1.CA02** (CA a confirmar) | Dado um `username` já em uso, então `409 USERNAME_EM_USO` com `details.suggestions`; nome reservado (`admin`, `root`, `suporte`, `secid`, `decia`, `workstation`, prefixos `demo_`/`e2e_`) → `422 NOME_RESERVADO`. Dado um **e-mail** já cadastrado, então a resposta é a **mesma** `202 Receipt` do cadastro novo (sem oráculo, D-27/Q-86): o dono recebe o e-mail "você já tem conta" e `AuditLog REGISTER_EMAIL_EM_USO`. Disponibilidade em `GET /api/usernames/{username}/availability` e sugestões em `GET /api/auth/username-suggestions`. |
| **RF1.CA03** (CA a confirmar) | Dado um cadastro válido, então a senha é guardada só como hash **Argon2id** (`Argon2PasswordHasher`), nunca aparece em log, evento ou auditoria (`SensitiveDataMaskingConverter`); e-mail e telefone vão ao banco cifrados (`FieldCipher`/`AesGcmStringConverter`, AES-256-GCM `enc:v1:`, colunas `email_enc`/`phone_enc`) e a busca usa `emailHash` = HMAC-SHA256 com chave derivada de `WS_DATA_ENCRYPTION_KEY` (`HmacEmailHasher`, Q-87). |
| **RF1.CA04** (CA a confirmar) | Dado o cadastro criado, então a conta nasce `AccountStatus PENDING_EMAIL_VERIFICATION`, `accountOrigin REAL`, com `UserPreferences` padrão e um `VerificationCode` (6 dígitos, só o hash, TTL) enviado por `MailPort`; ao confirmar em `POST /api/auth/email-verification/confirm`, EMPREGADO → `ACTIVE` e EMPRESA/CHEFE_DEPARTAMENTO → `PENDING_VALIDATION` com `ApprovalRequest PENDENTE` (planejado, RF28.CA01, D-19). |
| **RF1.CA05** (CA a confirmar) | Dado o código confirmado, então `RegistrationService.confirmEmail` grava `emailVerified`, `AuditLog EMAIL_VERIFIED` e abre a sessão pelo `IdentityService.openSession` (access JWT RS256 + refresh em `ws_rt`, como no RF2), levando ao shell do app; antes disso o cadastro responde só `202 Receipt {status VERIFICACAO_ENVIADA, maskedEmail, nextStep}` e redireciona para `/verify-email` **sem sessão** (emitir no `register` revelaria se a conta era nova, D-27/Q-86). |
| **RF1.CA06** (CA a confirmar) | Dado tentativas repetidas, então o `AuthRateLimitFilter` limita por IP (`register` 10/h, `resend` 10/h, `confirm` 20/h → `429 MUITAS_TENTATIVAS` + `Retry-After`), o reenvio é silencioso e limitado por pessoa (`RateLimitPort` `email-verification-send`), e `AuditLog USER_REGISTERED` / `EMAIL_VERIFIED` / `EMAIL_VERIFICATION_FALHA` são gravados com e-mail mascarado e `correlationId`. |

## 0. Diagrama de casos de uso

Quem se cadastra é sempre um visitante: escolhe o tipo de conta, aceita os termos da Velion e confirma o e-mail. Contas EMPRESA e CHEFE ainda dependem da validação do administrador. Atores do catálogo em [`ATORES_E_ATRIBUTOS.md`](../../arquitetura/ATORES_E_ATRIBUTOS.md).

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  classDef ucDemo fill:#fff8e6,stroke:#b26a00,stroke-dasharray:2 2,color:#1b1b1b
  visitante["«ator» Visitante"]:::ator
  admin["«ator» Administrador"]:::ator
  subgraph SIS["Work Station — RF1 Cadastrar usuário"]
    direction TB
    UC1(["UC1 Escolher o tipo de conta"]):::uc
    UC2(["UC2 Informar nome, usuário, e-mail e senha"]):::uc
    UC3(["UC3 Aceitar os Termos e a Política da Velion"]):::uc
    UC4(["UC4 Ler os Termos de Uso e a Política"]):::uc
    UC5(["UC5 Confirmar o e-mail com o código"]):::uc
    UC6(["UC6 Reenviar o código"]):::uc
    UC7(["UC7 Limitar tentativas e picos de cadastro"]):::uc
    UC8(["UC8 Consultar se o nome de usuário está livre"]):::ucPlan
    UC9(["UC9 Enviar documentos de representação"]):::ucPlan
    UC10(["UC10 Validar conta de empresa ou de chefia"]):::ucPlan
    UC11(["UC11 Aceitar nova versão dos termos"]):::ucPlan
    UC12(["UC12 Criar a conta pelo login institucional"]):::ucPlan
  end
  email["«ator» Serviço de e-mail"]:::atorSis
  oidc["«ator» Provedor de login institucional (OIDC)"]:::atorSis
  visitante --- UC1
  visitante --- UC2
  visitante --- UC4
  visitante --- UC5
  visitante --- UC12
  UC2 -. "«include»" .-> UC1
  UC2 -. "«include»" .-> UC3
  UC2 -. "«include»" .-> UC7
  UC3 -. "«include»" .-> UC4
  UC6 -. "«extend»" .-> UC5
  UC8 -. "«extend»" .-> UC2
  UC9 -. "«extend»" .-> UC2
  UC11 -. "«extend»" .-> UC3
  admin --- UC10
  UC5 --- email
  UC6 --- email
  UC12 --- oidc
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Escolher o tipo de conta | Visitante | RF1.CA01, RF1.CA22, RF1.CA23 | real: `RegisterForm` com explicação de cada tipo; EMPRESA e CHEFE nascem em validação |
| UC2 Informar nome, usuário, e-mail e senha | Visitante | RF1.CA01, RF1.CA02, RF1.CA03, RF1.CA04, RF1.CA07, RF1.CA10, RF1.CA12, RF1.CA13, RF1.CA21 | real: `POST /api/auth/register` (`RegistrationService.register`); idade mínima depende da Q-63 |
| UC3 Aceitar os Termos e a Política da Velion | Visitante | RF1.CA14, RF1.CA15, RF1.CA16, RF1.CA20 | real: checkbox com links e `422` sem aceite; versão padrão 0.2 (D-143); `policy_acceptances` planejado |
| UC4 Ler os Termos de Uso e a Política | Visitante | RF1.CA19 | real: `/termos` e `/privacidade` públicos com os campos `{{...}}` destacados; `/api/legal` planejado |
| UC5 Confirmar o e-mail com o código | Visitante, Serviço de e-mail | RF1.CA05, RF1.CA11 | real: `RegistrationService.confirmEmail`, 5 tentativas por código; e-mail só em log (sem SMTP) |
| UC6 Reenviar o código | Visitante, Serviço de e-mail | RF1.CA06 | real: `POST /api/auth/email-verification/resend` |
| UC7 Limitar tentativas e picos de cadastro | (sistema) | RF1.CA06, RF1.CA08, RF1.CA09 | real: `AuthRateLimitFilter`, `ClientIpResolver`, `HashBulkhead` |
| UC8 Consultar se o nome de usuário está livre | Visitante | RF1.CA26 | planejado: a API de disponibilidade existe, a tela ainda não consulta |
| UC9 Enviar documentos de representação | Visitante | RF1.CA24, RF1.CA25 | planejado (D-22, Q-62) |
| UC10 Validar conta de empresa ou de chefia | Administrador | RF1.CA27 | planejado (`ApprovalRequest` só no domínio) |
| UC11 Aceitar nova versão dos termos | Visitante | RF1.CA18 | planejado (gate `403 ACEITE_PENDENTE`) |
| UC12 Criar a conta pelo login institucional | Visitante, Provedor OIDC | RF1.CA17 | planejado: OIDC existe e está desligado por padrão; captura do aceite no primeiro login planejada |

## 1. Diagrama de classes

Entidades e enums da TAXONOMIA §1 (`User`, `UserPreferences`, `VerificationCode`, `AuditLog`) com os nomes do código do Bloco 3; `PolicyDocument`, `PolicyAcceptance`, `ApprovalRequest` e `PendingUpload` são **(planejado)**.

```mermaid
classDiagram
  direction LR

  class RegistrationController {
    <<controller>>
    +register(RegisterRequest, RequestContext) Receipt
    +confirm(ConfirmRequest, RequestContext) Session
    +resend(EmailRequest, RequestContext) Map
    +availability(username) Availability
    +suggestions(base) Map
  }
  class RegistrationService {
    <<service>>
    +register(RegisterCommand, RequestContext) Receipt
    +confirmEmail(email, code, deviceName, RequestContext) Session
    +resendVerification(email, RequestContext) void
    +availability(username) Availability
    -sendVerification(User) void
    -alreadyExists(User, email, RequestContext) Receipt
  }
  class IdentityService {
    <<service>>
    +openSession(User, persistent, deviceName, RequestContext) Session
  }
  class Usernames {
    <<utility>>
    +normalize(raw) String
    +problem(username) String
    RESERVED
  }
  class Passwords {
    <<utility>>
    +problem(raw) Optional
  }
  class EmailHasher {
    <<service>>
    +normalize(raw) String
    +hash(email) String
  }
  class UserRepositoryPort {
    <<port>>
    +findByEmailHash(hash) Optional
    +existsByUsername(username) boolean
    +save(User) User
  }
  class UserPreferencesRepositoryPort {
    <<port>>
    +save(UserPreferences) UserPreferences
  }
  class VerificationCodeRepositoryPort {
    <<port>>
    +findOpen(userId, purpose) List
    +save(VerificationCode) VerificationCode
  }
  class PasswordHasher {
    <<port>>
    +hash(raw) String
    +matches(raw, encoded) boolean
    +needsRehash(encoded) boolean
  }
  class MailPort {
    <<port>>
    +send(MailMessage) void
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent) void
  }
  class RateLimitPort {
    <<port>>
    +tryAcquire(owner, bucket, limit, window) boolean
    +release(owner, bucket) void
    +reset(owner, bucket) void
  }
  class LegalProperties {
    <<config>>
    +String terms
    +String privacy
    +currentVersions() Versions
  }
  class Argon2PasswordHasher {
    <<adapter>>
  }
  class JpaIdentityAdapters {
    <<adapter>>
    users, preferences, codes, refresh
  }
  class JpaAuditLog {
    <<adapter>>
  }
  class LoggingMailAdapter {
    <<adapter>>
  }
  class InMemoryRateLimit {
    <<adapter>>
  }
  class RedisRateLimit {
    <<adapter>>
  }

  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +String email
    +String emailHash
    +boolean emailVerified
    +String phone
    +String passwordHash
    +ProfileType profileType
    +Role role
    +AccountStatus status
    +AccountOrigin accountOrigin
    +String termsVersion
    +String privacyVersion
    +Instant createdAt
    +long version
  }
  class UserPreferences {
    <<entity>>
    +UUID userId
    +String theme
    +String language
    +String timezone
    +int wipLimit
    +String aiModeDefault
  }
  class VerificationCode {
    <<entity>>
    +UUID id
    +UUID userId
    +VerificationPurpose purpose
    +String codeHash
    +int attempts
    +Instant expiresAt
    +Instant consumedAt
  }
  class AuditLog {
    <<entity>>
    +UUID actorId
    +String action
    +String resourceType
    +String resourceId
    +String result
    +String correlationId
    +JSON metadataJson
  }
  class PolicyAcceptance {
    <<entity>>
    +UUID userId
    +PolicyDocumentKind document
    +String version
    +Instant acceptedAt
    +AcceptanceChannel channel
  }
  class ApprovalRequest {
    <<entity>>
    +UUID userId
    +ProfileType requestedProfile
    +ApprovalStatus status
    +Instant emailConfirmedAt
  }
  class PendingUpload {
    <<entity>>
    +UploadKind kind
    +String key
    +Instant expiresAt
    +UUID consumedByUserId
  }

  class ProfileType {
    <<enum>>
    EMPREGADO
    EMPRESA
    CHEFE_DEPARTAMENTO
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
  class AccountOrigin {
    <<enum>>
    REAL
    TEST_SEED
    DEMO
    SYSTEM
  }
  class VerificationPurpose {
    <<enum>>
    EMAIL_VERIFICATION
    PASSWORD_RESET
    TWO_FACTOR
  }
  class Role {
    <<enum>>
    USER
    ADMIN
  }

  RegistrationController --> RegistrationService
  RegistrationService --> IdentityService : abre sessão no confirm
  RegistrationService --> Usernames
  RegistrationService --> Passwords
  RegistrationService --> EmailHasher
  RegistrationService --> UserRepositoryPort
  RegistrationService --> UserPreferencesRepositoryPort
  RegistrationService --> VerificationCodeRepositoryPort
  RegistrationService --> PasswordHasher
  RegistrationService --> MailPort
  RegistrationService --> AuditLogPort
  RegistrationService --> RateLimitPort
  RegistrationService --> LegalProperties
  PasswordHasher <|.. Argon2PasswordHasher
  UserRepositoryPort <|.. JpaIdentityAdapters
  UserPreferencesRepositoryPort <|.. JpaIdentityAdapters
  VerificationCodeRepositoryPort <|.. JpaIdentityAdapters
  AuditLogPort <|.. JpaAuditLog
  MailPort <|.. LoggingMailAdapter
  RateLimitPort <|.. InMemoryRateLimit
  RateLimitPort <|.. RedisRateLimit

  User "1" --> "1" UserPreferences : user_preferences CASCADE
  User "1" --> "0..*" VerificationCode : verification_codes CASCADE
  User "1" --> "0..*" AuditLog : actor_id RESTRICT
  User "1" --> "0..*" PolicyAcceptance : RESTRICT, append-only
  User "1" --> "0..1" ApprovalRequest : EMPRESA ou CHEFE
  User "0..1" --> "0..*" PendingUpload : consumedByUserId
  User --> ProfileType
  User --> AccountStatus
  User --> AccountOrigin
  User --> Role
  VerificationCode --> VerificationPurpose
  note for LegalProperties "(real, D-143) ws.legal.current-versions com terms 0.2 e privacy 0.2, textos da Velion em docs/legal, copiados para users.terms_version e privacy_version no cadastro"
  note for User "AuditableEntity + lock otimista (version). +18 campos (jobTitle, companyId, departmentId, avatarUrl, coverUrl, bio, verified, twoFactorEnabled, hypeVisibility, rankingOptOut, lastLoginAt, fixtureKey, testAccount gerada, deletion*, anonymizedAt...). PolicyAcceptance, ApprovalRequest e PendingUpload: planejado (D-16, D-19, D-22)."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Visitante"]
    A1["Abre /register e escolhe o tipo de perfil (RadioCards com a explicação de cada tipo, real D-143)"]
    A2["Preenche nome, username, e-mail, senha, confirmação, telefone opcional e marca acceptTerms (Termos e Política da Velion, dona da Orange Social)"]
    A3["Lê o e-mail e digita o código de 6 dígitos em /verify-email"]
  end
  subgraph FE["Next.js (App Router) · BFF app/bff/auth"]
    F1["Debounce 400 ms: GET /api/usernames/{username}/availability"]
    F0["Links do aceite abrem em nova aba as páginas públicas /termos e /privacidade: app/(legal) lê docs/legal/*.md com lib/legal/markdown.ts, v0.2 com os campos a preencher destacados (real, D-143)"]
    F2["POST /bff/auth/register → POST /api/auth/register (X-Correlation-Id, IP assinado X-Ws-*)"]
    F3["Mostra Receipt {maskedEmail, nextStep} e vai para /verify-email"]
    F4["POST /api/auth/email-verification/confirm"]
    F5["Grava ws_rt (HttpOnly, Secure, SameSite=Strict) e access em memória"]
  end
  subgraph WEB["ws-web"]
    W1["CorrelationIdFilter"]
    W2["AuthRateLimitFilter: ClientIpResolver → balde IP+método+rota"]
    W3{"Dentro do limite?"}
    W4{"HashBulkhead.tryAcquire (espera 2 s)?"}
    W5["RegistrationController.register / confirm"]
    E429["429 MUITAS_TENTATIVAS + Retry-After"]
    E503["503 AUTENTICACAO_OCUPADA + Retry-After"]
    E422["422 VALIDACAO details.fields"]
    E422R["422 NOME_RESERVADO + suggestions"]
    E409["409 USERNAME_EM_USO + suggestions"]
    E422C["422 CODIGO_INVALIDO / CODIGO_EXPIRADO"]
    E429C["429 MUITAS_TENTATIVAS (10/h por pessoa)"]
  end
  subgraph APP["ws-application · RegistrationService"]
    S1["Valida todos os campos (Usernames, Passwords, EMAIL, PHONE_E164, acceptTerms)"]
    S2{"Campos ok?"}
    S3{"username reservado?"}
    S4{"existsByUsername?"}
    S5{"findByEmailHash existe?"}
    S6["alreadyExists: e-mail 'você já tem conta' + AuditLog REGISTER_EMAIL_EM_USO → mesma Receipt"]
    S7["hasher.hash (Argon2id) · User PENDING_EMAIL_VERIFICATION, REAL, termsVersion/privacyVersion vigentes"]
    S8["save User + UserPreferences padrão (catch DataIntegrityViolation → alreadyExists)"]
    S9["sendVerification: consome códigos abertos, emite código 6 dígitos, grava só o hash, MailPort.send"]
    S10["AuditLog USER_REGISTERED (e-mail mascarado) → Receipt.verificationSent"]
    C1["confirmEmail: requireCodeAttemptQuota (10/h) · attempts++ persistido (noRollbackFor)"]
    C2{"código confere e não expirou?"}
    C3["emailVerified = true · status = ACTIVE (EMPREGADO) ou PENDING_VALIDATION (EMPRESA/CHEFE)"]
    C4["AuditLog EMAIL_VERIFIED · IdentityService.openSession → Session"]
    C5["(planejado) ApprovalRequest PENDENTE nasce aqui, D-19"]
  end
  subgraph PERS["Persistência"]
    P1[("MySQL: users (email_enc, phone_enc, email_hash), user_preferences, verification_codes (V3), audit_log")]
    P2[("Redis ou memória: RateLimitPort baldes por IP e por pessoa")]
    P3["MailPort: LoggingMailAdapter (dev) · SMTP (prod)"]
  end

  A1 --> A2 --> F1
  A2 -.->|"lê antes de aceitar"| F0
  F1 --> F2 --> W1 --> W2 --> W3
  W3 -->|"não"| E429
  W3 -->|"sim"| W4
  W4 -->|"não"| E503
  W4 -->|"sim"| W5 --> S1 --> S2
  S2 -->|"não"| E422
  S2 -->|"sim"| S3
  S3 -->|"sim"| E422R
  S3 -->|"não"| S4
  S4 -->|"sim"| E409
  S4 -->|"não"| S5
  S5 -->|"sim"| S6 --> F3
  S5 -->|"não"| S7 --> S8 --> S9 --> S10 --> F3
  S8 --> P1
  S9 --> P3
  W2 --> P2
  F3 --> A3 --> F4 --> W1
  W5 --> C1 --> C2
  C1 --> P2
  C2 -->|"não"| E422C
  C1 -->|"cota esgotada"| E429C
  C2 -->|"sim"| C3 --> C4 --> F5
  C3 --> C5
  C4 --> P1
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
  participant M as MailPort
  participant AU as AuditLogPort

  Note over U,N: (real, D-143) RegisterForm explica cada tipo de usuário e o aceite cita a Velion com links para /termos e /privacidade (app/(legal), públicas)
  U->>N: preenche /register e envia
  N->>C: POST /api/auth/register (X-Correlation-Id, X-Ws-Client-Ip assinado)
  Note over C: CorrelationIdFilter → AuthRateLimitFilter (10/h por IP) → HashBulkhead
  C->>S: RegistrationService.register(RegisterCommand, RequestContext)
  S->>S: valida campos, Usernames.normalize, Passwords.problem, acceptTerms
  alt campo inválido
    S-->>C: ApiException 422 VALIDACAO details.fields
    C-->>N: 422 {code, message, details, correlationId}
  else username reservado ou em uso
    S->>R: existsByUsername
    S-->>C: 422 NOME_RESERVADO ou 409 USERNAME_EM_USO (details.suggestions)
    C-->>N: erro com sugestões
  else e-mail já cadastrado (sem oráculo)
    S->>R: findByEmailHash(EmailHasher.hash)
    S->>M: send(TEMPLATE_EXISTING, "Você já tem uma conta")
    S->>AU: record(REGISTER_EMAIL_EM_USO, NEGADO, maskEmail)
    S-->>C: Receipt.verificationSent(maskedEmail)
    C-->>N: 202 Receipt (igual ao cadastro novo)
  else cadastro novo
    S->>S: Argon2PasswordHasher.hash(password)
    S->>R: save(User PENDING_EMAIL_VERIFICATION, REAL, termsVersion, privacyVersion)
    S->>R: save(UserPreferences padrão)
    S->>R: save(VerificationCode EMAIL_VERIFICATION, codeHash, expiresAt)
    S->>M: send(TEMPLATE_VERIFY, código 6 dígitos)
    S->>AU: record(USER_REGISTERED, OK, profileType, maskEmail, versões aceitas)
    S-->>C: Receipt {status, maskedEmail, nextStep}
    C-->>N: 202 Receipt
    N-->>U: /verify-email
  end

  U->>N: digita o código
  N->>C: POST /api/auth/email-verification/confirm {email, code}
  C->>S: confirmEmail(email, code, deviceName, ctx)
  S->>RD: tryAcquire(userId, email-verification-attempt, 10, 1h)
  alt cota de tentativas esgotada
    S-->>C: 429 MUITAS_TENTATIVAS + Retry-After
    C-->>N: 429
  else código errado ou vencido
    S->>R: attempts++ (noRollbackFor ApiException)
    S->>AU: record(EMAIL_VERIFICATION_FALHA)
    S-->>C: 422 CODIGO_INVALIDO ou CODIGO_EXPIRADO
    C-->>N: 422
  else código confere
    S->>R: update User emailVerified=true, status=ACTIVE ou PENDING_VALIDATION, VerificationCode consumedAt
    Note over S,R: (planejado) ApprovalRequest PENDENTE para EMPRESA e CHEFE (D-19)
    S->>AU: record(EMAIL_VERIFIED, OK)
    S->>S: IdentityService.openSession(user, false, deviceName, ctx)
    S->>RD: SessionStorePort.save(RefreshRecord) + espelho refresh_tokens
    S-->>C: Session {accessToken, refreshToken, family, user, warnings}
    C-->>N: 200 Session
    N-->>U: cookie ws_rt + access em memória → shell do app
  end
```

## 4. Máquina de estados

Entidade central: **`User.status`** (`AccountStatus`, enum real em `ws-domain`). O trecho do cadastro vai até `ACTIVE`/`PENDING_VALIDATION`; `SUSPENDED`, `DELETION_SCHEDULED` e `ANONYMIZED` são do RF3 §7 e do RF28.

```mermaid
stateDiagram-v2
  direction LR
  state "PENDING_EMAIL_VERIFICATION" as PEV
  state "PENDING_VALIDATION" as PV
  state "ACTIVE" as ACT
  state "SUSPENDED" as SUS
  state "DELETION_SCHEDULED" as DEL
  state "ANONYMIZED" as ANO

  [*] --> PEV : POST /api/auth/register válido [campos ok, username livre] · USER_REGISTERED
  PEV --> PEV : resend (10/h por pessoa, silencioso) · código errado (attempts++, 5º erro invalida o código)
  PEV --> ACT : confirm com código válido [profileType == EMPREGADO] · EMAIL_VERIFIED · openSession
  PEV --> PV : confirm com código válido [EMPRESA ou CHEFE_DEPARTAMENTO] · ApprovalRequest PENDENTE (planejado)
  PV --> ACT : ApprovalRequest APROVADO pelo ADMIN (RF28.CA01)
  PV --> SUS : ApprovalRequest RECUSADO após 5 envios (D-19)
  ACT --> SUS : ADMIN suspende (RF28)
  SUS --> ACT : ADMIN reativa
  ACT --> DEL : POST /api/me/deletion (RF3 §7, D-18)
  PEV --> DEL : POST /api/me/deletion com conta não confirmada
  DEL --> ACT : DELETE /api/me/deletion dentro de 30 d (Reativar conta, D-145) · depois do prazo 409 PRAZO_REATIVACAO_ENCERRADO
  DEL --> PEV : cancelamento com e-mail ainda não confirmado
  DEL --> ANO : fim do prazo de 30 d · AccountAnonymizer de hora em hora · ACCOUNT_ANONYMIZED (real, D-145, RF3 §4)
  ANO --> [*]

  note right of PEV
    Login permitido com warning
    "E-mail ainda não confirmado"
    (IdentityService.issue).
  end note
  note right of PV
    Login permitido com warning;
    ações de emissor: 403 PERFIL_EM_VALIDACAO
    (planejado, Guard.requireApprovedProfile).
  end note
  note right of SUS
    blocksLogin() == true:
    403 CONTA_INDISPONIVEL só após a senha certa.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(auth)/register · app/(auth)/verify-email"]
    UI["packages/ui: RadioCard, Input, Checkbox, Button, Sheet, Toast"]
    LEG["app/(legal)/termos · app/(legal)/privacidade · components/legal/LegalDocument (real, D-143; planejado na D-15)"]
    LMD["lib/legal/markdown.ts lê docs/legal: TERMOS_DE_USO.md · POLITICA_DE_PRIVACIDADE.md v0.2 · CAMPOS_A_PREENCHER.md"]
    PG -->|"links do aceite"| LEG
    LEG --> LMD
    BFF["app/bff/auth/* · cookies httpOnly · X-Correlation-Id · HMAC X-Ws-Client-Ip"]
    PG --> UI
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    CIF["CorrelationIdFilter"]
    ARL["AuthRateLimitFilter + ClientIpResolver + HashBulkhead"]
    SEC["SecurityConfig (PUBLIC_POST: register, confirm, resend · PUBLIC_GET: availability, suggestions)"]
    RC["RegistrationController"]
    GEH["GlobalExceptionHandler → ApiError {code, message, details, correlationId}"]
    A2["Argon2PasswordHasher (adapter de PasswordHasher)"]
  end
  subgraph WSAPP["ws-application"]
    RS["identity.RegistrationService"]
    IS["identity.IdentityService.openSession"]
    PORTS["ports: UserRepositoryPort · UserPreferencesRepositoryPort · VerificationCodeRepositoryPort · PasswordHasher · MailPort · AuditLogPort · RateLimitPort · SessionStorePort"]
    LP["LegalProperties (versões vigentes dos termos · ws.legal.current-versions 0.2, D-143)"]
    MK["common.Masking · Hashing · EmailHasher"]
    RS --> PORTS
    RS --> LP
    RS --> IS
    RS --> MK
  end
  subgraph WSDOM["ws-domain"]
    DOM["identity: User · UserPreferences · AccountStatus · ProfileType · Role · AccountOrigin · VerificationPurpose · common.AuditableEntity"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: JpaIdentityAdapters, UserEntity, UserPreferencesEntity, VerificationCodeEntity, JpaAuditLog, AesGcmStringConverter/FieldCipher, Flyway V1→V2→V3"]
    RDS["cache-redis: RedisRateLimit (flag redis.enabled) · fallback InMemoryRateLimit"]
    PLT["platform: MailPort SMTP (planejado) · LoggingMailAdapter em dev"]
    S3["storage-s3: PendingUpload restricted/pending (planejado, D-22)"]
  end
  subgraph BOOT["ws-bootstrap"]
    B1["RequiredSecretsGuard (WS_DATA_ENCRYPTION_KEY, WS_JWT_*) · SensitiveDataMaskingConverter · application-*.yml"]
  end

  BFF -->|"REST JSON"| CIF --> ARL --> SEC --> RC --> RS
  RC --> GEH
  A2 -.implementa.-> PORTS
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  PLT -.implementa.-> PORTS
  RS --> DOM
  MY --> DB[("MySQL 8.4 · TLS · ws_app")]
  RDS --> RD[("Redis 7")]
  PLT --> SMTP["Servidor de e-mail institucional"]
  LEG --> API_LEGAL["GET /api/legal/{document}/current (planejado)"]
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF1.CA01 | `RegistrationService.register`, `Usernames`, `Passwords`, `EmailHasher` | `S1`→`S2`→`E422` | 4–7 | — | `RC`, `RS`, `GEH`, `UI` | real (Bloco 3, main) |
| RF1.CA02 | `RegistrationService.alreadyExists/availability`, `Usernames.problem`, `UserRepositoryPort.existsByUsername/findByEmailHash` | `S3`→`E422R`, `S4`→`E409`, `S5`→`S6`, `F1` | 8–15 | — | `RC` (`availability`, `suggestions`), `SEC.PUBLIC_GET` | real; sem `409 EMAIL_EM_USO` (anti-enumeração) |
| RF1.CA03 | `Argon2PasswordHasher`, `FieldCipher`/`AesGcmStringConverter`, `HmacEmailHasher`, `Masking` | `S7` | 16–17 | — | `A2`, `MY` (`email_enc`, `phone_enc`), `B1` | real |
| RF1.CA04 | `User.status`, `UserPreferences`, `VerificationCode`, `MailPort`, `ApprovalRequest` (planejado) | `S7`→`S10`, `C3`, `C5` | 17–21, 36 | `[*]`→`PEV`, `PEV`→`ACT`/`PV` | `MY` (V3 `verification_codes`), `PLT` | real + ApprovalRequest planejado |
| RF1.CA05 | `RegistrationService.confirmEmail`, `IdentityService.openSession`, `SessionStorePort` | `C3`→`C4`→`F5`, `F3` | 22–24, 35–42 | `PEV`→`ACT`/`PV` | `IS`, `BFF` (`ws_rt`) | real |
| RF1.CA06 | `AuthRateLimitFilter`, `RateLimitPort`, `AuditLogPort`, `AuditActions` | `W2`→`W3`→`E429`, `C1`→`E429C`, `S10` | 3, 27–33 | `PEV`→`PEV` (resend/erro) | `ARL`, `RDS`, `CIF` | real |
| RF1.CA07 | `Argon2PasswordHasher`, `PasswordHasher.needsRehash` | `S7` | 16 | — | `A2` | real (§7, D-26) |
| RF1.CA08 | `AuthRateLimitFilter.RULES`, `ClientIpResolver` | `W2`→`W3`→`E429` | 3 | — | `ARL`, `BFF` | real (§7) |
| RF1.CA09 | `HashBulkhead` | `W4`→`E503` | 3 | — | `ARL` | real (§7) |
| RF1.CA10 | `Usernames.RESERVED`, `AdminBootstrap` | `S3`→`E422R` | 9 | — | `RS`, `B1` | real (§7) |
| RF1.CA11 | `VerificationCode.attempts`, `RegistrationService.requireCodeAttemptQuota` | `C1`→`C2`→`E422C`/`E429C` | 27–33 | `PEV`→`PEV` | `MY` (V3), `RDS` | real (§7) |
| RF1.CA12 | `AccountOrigin`, `User.accountOrigin/fixtureKey/testAccount` | `S7` | 17 | — | `MY` (V2 CHECK, coluna gerada) | real (§7) |
| RF1.CA13 | `Masking.maskEmail`, `SensitiveDataMaskingConverter`, `AuditEvent` | `S6`, `S10`, `C4` | 11, 20, 31, 37 | — | `MK`, `B1`, `CIF` | real (§7) |
| RF1.CA14 | `Checkbox`, `Sheet` (`packages/ui`), `RegisterForm` (`components/auth/AuthForms.tsx`) | `A2`, `F0` | 1 (nota D-143) | — | `UI`, `LEG`, `LMD` | parcial real (D-143): `Checkbox` desmarcado cita a Velion, links para `/termos` e `/privacidade` em nova aba, erro `acceptTerms` abaixo; botão `disabled` e `Sheet` planejados — teste `account.test.tsx` "cadastro: tipo de usuário…"; evidência `IDENTIDADE.json` passo 3, `id-02` |
| RF1.CA15 | `RegistrationService.register` (`acceptTerms`), `LegalProperties.currentVersions` | `S1`→`E422` | 5–7 | — | `RS`, `LP` | real (`acceptTerms`; versões 0.2 de `ws.legal.current-versions`, D-143; evidência `IDENTIDADE.json` passo 3 "cadastro exige aceitar os termos"); `409 VERSAO_DOS_TERMOS_DESATUALIZADA` planejado |
| RF1.CA16 | `PolicyAcceptance`, `User.termsVersion/privacyVersion` | `S7` | 17, 20 | — | `MY` (`policy_acceptances`, planejado) | parcial: cópia em `users` real, tabela planejada |
| RF1.CA17 | `AcceptanceChannel`, `OidcAccountLinker`, `AdminBootstrap` | — | — | `[*]`→`PEV` | `RS`, `B1` | planejado |
| RF1.CA18 | `PolicyGateFilter` (planejado) | — | — | nota de `ACT` | `SEC` | planejado |
| RF1.CA19 | `PolicyDocument`, `LegalController` (planejado); `app/(legal)/termos`, `app/(legal)/privacidade`, `lib/legal/markdown.ts` (real) | `F0` | 1 (nota D-143) | — | `LEG`, `LMD`, `API_LEGAL` | parcial real (D-143): páginas públicas sem login lendo `docs/legal/*.md` v0.2 (evidência `IDENTIDADE.json` passos 4–5, `id-03-termos-desktop.png`); `GET /api/legal/...`, histórico e `PolicyTextGuardTest` planejados (os campos pendentes usam `{{...}}`, `CAMPOS_A_PREENCHER.md`) |
| RF1.CA20 | `UserConsent` (RF3 §7) | — | — | — | — | planejado |
| RF1.CA21 | `User.birthDate` (condicional Q-63) | `S1` | 5 | — | `RS` | planejado |
| RF1.CA22 | `RegistrationService.parseProfileType`, `RadioCard`, `RegisterForm` | `A1`, `S1`→`E422` | 5–7 | — | `UI`, `RS` | real (`details.fields.profileType`); explicação de cada tipo em `RadioCards` (D-143, `account.test.tsx`, `id-02`) |
| RF1.CA23 | `EmpresaProfileExtension`, `ChefeProfileExtension` (TAXONOMIA §1.1) | `S1` | 5 | — | `RS` | planejado (Q-64) |
| RF1.CA24 | `VerificationPolicy.freeMailDomainsJson` | `S1` | 5 | — | `RS` | planejado (Q-62) |
| RF1.CA25 | `PendingUpload`, `PendingUploadCleanupJob` | — | — | — | `S3`, `ARL` (uploads 40/h) | planejado (D-22); regra de IP já em `AuthRateLimitFilter.RULES` |
| RF1.CA26 | `RegistrationController.availability/suggestions` | `F1` | — | — | `RC`, `SEC.PUBLIC_GET` | real (rota `/api/usernames/{username}/availability`) |
| RF1.CA27 | `ApprovalRequest`, `Guard.requireApprovedProfile` (planejado) | `C5` | 36 | `PEV`→`PV`, `PV`→`ACT`/`SUS` | `RS` | planejado (D-19) |

## 7. Controles de segurança (D-14)

Herdados do RF49 do FAI pela **D-14**; detalhes e rastreabilidade por bloco em [`../SEG/README.md`](../SEG/README.md). Todos "(CA a confirmar)" até a Q-48 decidir se viram CAs deste RF ou um RNF. Os controles do login (sem oráculo, bloqueio por conta, reconferência) estão no RF2 §7; aqui ficam os que tocam o cadastro e a verificação de e-mail. Coluna **Código**: o que já existe em `origin/main` (Bloco 3, PR #16).

| CA | Enunciado (Dado / Quando / Então) | Código |
|---|---|---|
| **RF1.CA07** (CA a confirmar) | Dado um cadastro válido, então a senha é guardada com **Argon2id** nos parâmetros mínimos OWASP (m=19456 KiB, t=2, p=1, salt 16 B, hash 32 B) e `needsRehash` refaz o hash no próximo login quando os parâmetros mudarem. | `Argon2PasswordHasher`, `Argon2PasswordHasherTest` |
| **RF1.CA08** (CA a confirmar) | Dado o mesmo IP (assinado pelo BFF em `X-Ws-Client-Ip`/`X-Ws-Proxy-Ts`/`X-Ws-Proxy-Sig`; senão `X-Real-IP`; senão TCP; nunca `X-Forwarded-For`; IPv6 por /64), então o `AuthRateLimitFilter` aplica **antes do Spring Security** `POST /api/auth/register` 10/h, `email-verification/resend` 10/h, `confirm` 20/h, `GET /api/auth/username-suggestions` 60/10 min e `POST /api/auth/uploads` 40/h; o excedente recebe `429 MUITAS_TENTATIVAS` com `Retry-After`. | `AuthRateLimitFilter.RULES`, `ClientIpResolver`, `AuthRateLimitFilterTest`, `ClientIpResolverTest` |
| **RF1.CA09** (CA a confirmar) | Dado um pico de cadastros, então o `HashBulkhead` (permits = `max(1, min(max(2, núcleos), pool/2))`, espera 2 s) limita os Argon2 simultâneos e o excedente recebe `503 AUTENTICACAO_OCUPADA` + `Retry-After`; 60 pedidos paralelos geram zero HTTP 500. | `HashBulkhead`, regra `register` com `hashes=true` |
| **RF1.CA10** (CA a confirmar) | Dado um `username` que, normalizado, seja reservado (`admin`, `root`, `suporte`, `secid`, `decia`, `workstation`, prefixos `demo_`/`e2e_`), então o cadastro responde `422 NOME_RESERVADO` com sugestões; a conta ADMIN só nasce pelo `AdminBootstrap` (`WS_ADMIN_BOOTSTRAP_ENABLED=true`, `WS_ADMIN_INITIAL_PASSWORD` ≥ 16 chars sem padrão, só se não existe nenhum ADMIN; nunca promove conta existente sem `WS_ADMIN_PROMOTE_EXISTING=true`). | `Usernames`, `AdminBootstrap`, `AdminBootstrapTest`, `UsernamesAndPasswordsTest` |
| **RF1.CA11** (CA a confirmar) | Dado o código de verificação, então há no máximo 5 tentativas por código (`attempts++` persiste mesmo com erro, `@Transactional(noRollbackFor = ApiException.class)`) e um contador atômico de 10 tentativas/h por pessoa e finalidade (`RateLimitPort`); o excedente recebe `429 MUITAS_TENTATIVAS`. | `RegistrationService.confirmEmail`, `V3__rf1_rf2_autenticacao.sql`, `RegistrationServiceTest` |
| **RF1.CA12** (CA a confirmar) | Dado o cadastro criado, então `users.account_origin` nasce `REAL` (CHECK no V2), `fixture_key` NULL e `test_account` gerada = false; contas `TEST_SEED`/`DEMO` ficam fora de rankings, HSE, DECIA Points e métricas (RF43), e o e-mail nunca é enviado a `.test`/`.example`/`.invalid`/`.localhost`. | `AccountOrigin`, `V2__baseline_dominio_base.sql`, `ForeignKeyPolicyTest`, `AccountOriginTest` |
| **RF1.CA13** (CA a confirmar) | Dado qualquer log ou evento do cadastro, então o e-mail aparece mascarado (`Masking.maskEmail`) e nunca há senha, token ou código; a sessão emitida no CA05 segue o RF2 (TTL do access em aberto na **Q-49**). | `Masking`, `SensitiveDataMaskingConverter`, `AuditEvent`, `MaskingTest` |

## 8. Aceite dos termos e tipos de perfil no cadastro (CA a confirmar, D-15…D-22)

Blocos **A** (aceite dos Termos de Uso e da Política de Privacidade) e **B** (tipos de perfil, campos por tipo e envios do cadastro) de `docs/produto/CADASTRO_E_LGPD.md`. Entidades em `TAXONOMIA.md` §1.8–1.15 (**proposta**); dúvidas Q-60…Q-73. O que já existe no Bloco 3: `acceptTerms` obrigatório (`422 details.fields.acceptTerms`), cópia das versões vigentes em `users.terms_version/privacy_version` (`LegalProperties`) e `USER_REGISTERED` com as versões. O resto (tabela `policy_acceptances`, `PolicyGateFilter`, `LegalController`, `PendingUpload`, extensões de perfil) é **planejado**. **Desde 17/10/2026 (D-143, real):** links do aceite para `/termos` e `/privacidade` (páginas públicas em `app/(legal)/*` lendo `docs/legal/`, controladora **Velion, dona da Orange Social**), versões gravadas 0.2 e explicação de cada tipo de usuário.

### 8.1 Bloco A — aceite (RF1.CA14–CA21)

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF1.CA14** (CA a confirmar) | Dado o formulário, então o `Checkbox` "Li e aceito os Termos de Uso e a Política de Privacidade" vem **desmarcado**, com links para os dois documentos (abrem em `Sheet` ou nova aba sem perder o formulário); "Criar conta" fica `disabled` até marcar. **Real (D-143):** desmarcado, texto com a Velion e links que abrem `/termos` e `/privacidade` em nova aba; sem marcar, o envio volta com `422 details.fields.acceptTerms` (o `disabled` e o `Sheet` seguem planejados). |
| **RF1.CA15** (CA a confirmar) | Dado o pedido sem `acceptTerms=true`, então `422 VALIDACAO` com `details.fields.acceptTerms` (**real**); o cliente envia `termsVersion`/`privacyVersion` exibidas e, se alguma não for a `VIGENTE`, recebe `409 VERSAO_DOS_TERMOS_DESATUALIZADA` (planejado, Q-70). |
| **RF1.CA16** (CA a confirmar) | Dado o cadastro aceito, então são gravadas **duas** linhas em `policy_acceptances` (TERMOS e PRIVACIDADE com `version`, `accepted_at`, `ip`, `user_agent`, `channel`), a cópia em `users.terms_version/privacy_version` (**real**) e `AuditLog POLICY_ACCEPTED`; a tabela é append-only, FK `RESTRICT`, e **sobrevive à anonimização** (art. 8º §2º). |
| **RF1.CA17** (CA a confirmar) | Dado qualquer caminho que cria conta, então o aceite é capturado: `CADASTRO_LOCAL`, **primeiro login OIDC** numa tela de conclusão (`OIDC`, `OidcAccountLinker`) e seed (`SEED`); o admin do `AdminBootstrap` passa pelo gate (CA18) no primeiro login. |
| **RF1.CA18** (CA a confirmar) | Dado versão `VIGENTE` mais nova que a aceita, então `Dialog` bloqueante com o `changelog` e `403 ACEITE_PENDENTE` a tudo, **exceto** `GET /api/me/policies`, `POST /api/me/policies/accept`, logout, exportação e pedido de exclusão (`PolicyGateFilter` depois do JWT). |
| **RF1.CA19** (CA a confirmar) | Dado `/termos` e `/privacidade`, então funcionam sem login e pelo gate, mostram a versão vigente e o histórico (`GET /api/legal/{TERMOS\|PRIVACIDADE}/current` e `/versions`); `PolicyTextGuardTest` recusa texto com marcador `[`…`]` ou "validar com jurídico". **Real (D-143):** as duas páginas são públicas e mostram a versão do cabeçalho YAML de `docs/legal/*.md` (0.2, rascunho); histórico, API e o guarda de texto seguem planejados. |
| **RF1.CA20** (CA a confirmar) | Dado o cadastro, então **nenhum** consentimento opcional (`ConsentPurpose`) é pedido junto com o aceite; `user_consents` nasce vazio (RF3.CA10). |
| **RF1.CA21** (CA a confirmar, Q-63) | Dado a resposta à Q-63: se menores não podem usar, `birthDate` não é coletada; se podem, é **obrigatória no servidor** (`422 details.fields.birthDate`) e a regra do art. 14 é aplicada. |

### 8.2 Bloco B — tipos de perfil e envios (RF1.CA22–CA27)

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF1.CA22** (CA a confirmar) | Dado a escolha do tipo com `RadioCard`, então `profileType` fora de EMPREGADO/EMPRESA/CHEFE_DEPARTAMENTO (inclusive `ADMIN`) recebe `422 VALIDACAO details.fields.profileType` (**real**, `parseProfileType`); CURADOR não é tipo (D-09). **Real (D-143):** cada opção traz a explicação do tipo. |
| **RF1.CA23** (CA a confirmar, Q-64) | Dado o tipo, então os campos extras são: EMPREGADO `jobTitle` e `intendedDepartmentId` opcional (não lota); EMPRESA `legalName`, `companyCnpj`, `officialSite` **obrigatório** (`https://`, recusa `@perfil`), `representationDocId`; CHEFE `companyId` existente, departamento e `appointmentLink`. Erros `422 VALIDACAO` por campo. |
| **RF1.CA24** (CA a confirmar, Q-62) | Dado a resposta à Q-62, então EMPREGADO pode exigir domínio institucional; para EMPRESA, e-mail no domínio do `officialSite` (fora de `freeMailDomainsJson`) marca o critério `REPRESENTACAO` automaticamente (RF28.CA15). |
| **RF1.CA25** (CA a confirmar) | Dado `POST /api/auth/uploads?kind=avatar\|identity\|representation`, então tipo real por magic bytes, limite de bytes e de pixels, reencode sem EXIF/GPS, documentos em `restricted/pending/…`, `PendingUpload.expiresAt = +24 h`; o cadastro só aceita upload **do mesmo `kind`** e não consumido; `PendingUploadCleanupJob` apaga os abandonados (teste prova o `@Scheduled`). A regra de IP (40/h) já está em `AuthRateLimitFilter.RULES`. |
| **RF1.CA26** (CA a confirmar) | Dado o campo `username`, então a disponibilidade é consultada com debounce de 400 ms em `GET /api/usernames/{username}/availability` (**real**: `{username, available, reason, suggestions}`) e sugestões em `GET /api/auth/username-suggestions?base=`. |
| **RF1.CA27** (CA a confirmar) | Dado EMPRESA ou CHEFE_DEPARTAMENTO, então o `ApprovalRequest` nasce **só depois da confirmação do e-mail** (passo `C5` do §2); o prazo em dias úteis conta daí (RF28.CA12); enquanto `PENDING_VALIDATION`, `Guard.requireApprovedProfile` responde `403 PERFIL_EM_VALIDACAO`. |

### 8.3 Máquina de estados do aceite (por documento)

Estado derivado por `(users.terms_version, users.privacy_version)` × versão `VIGENTE` de cada `PolicyDocument`; avaliado pelo `PolicyGateFilter` (planejado) depois do JWT e antes dos controllers.

```mermaid
stateDiagram-v2
  direction LR
  state "SEM_ACEITE" as SEM
  state "ACEITO (vN)" as VN
  state "ACEITE_PENDENTE (vigente vN+1)" as PEND
  state "ACEITO (vN+1)" as VN1

  [*] --> SEM : conta criada por OIDC sem tela de conclusão ou AdminBootstrap (CA17)
  [*] --> VN : POST /api/auth/register com acceptTerms e versões vigentes (CA15, CA16) · seed SEED
  SEM --> VN : tela de conclusão OIDC ou gate · POST /api/me/policies/accept (channel OIDC ou REACEITE)
  VN --> PEND : PolicyDocument vN+1 vira VIGENTE (CA19)
  PEND --> VN1 : Dialog bloqueante · POST /api/me/policies/accept {document, vN+1} (REACEITE, CA18)
  VN1 --> PEND : nova versão publicada

  note right of SEM
    403 ACEITE_PENDENTE em toda a API,
    exceto /api/me/policies*, logout,
    exportação e pedido de exclusão.
  end note
  note right of PEND
    Aceitar versão que não é a vigente:
    409 VERSAO_DOS_TERMOS_DESATUALIZADA.
  end note
  note right of VN
    policy_acceptances é append-only e
    sobrevive à anonimização (art. 8º §2º).
  end note
```

Tela/aba: `/register` (esqueleto em `app/(auth)/register/page.tsx`) · `/verify-email` (esqueleto em `app/(auth)/verify-email/page.tsx`) · `/termos` e `/privacidade` (`app/(legal)/*`, real, D-143)
