# RF3 — Editar informações pessoais e preferências do perfil do usuário
**HU:** HU3 · **Sprint (board Work Station):** 1 (card "SPRINT 1 — Cadastro, autenticação, perfil e abertura de sessão"; o shell + preferências é a fase (b) da ARQUITETURA §6, D-11) · **Equivalente FAI:** RF3 Editar perfil (`UserController PATCH /api/me`, `UserPreferences`) + o "RF23" Configurações/LGPD do FAI (Q-46) · **Aba/rota:** `/settings` com abas na URL `?tab=conta|aparencia|privacidade|dados|sessoes|termos|validacao` (ABAS_POR_PERFIL §9); API `GET|PATCH /api/me`, `PATCH /api/me/sensitive`, `GET|PUT /api/me/preferences`, `POST|DELETE /api/me/deletion`
**Critérios de aceite cobertos:** RF3.CA01 … RF3.CA06 (corpo do card vazio → derivados do título + HU3, todos "(CA a confirmar)") · RF3.CA07 … RF3.CA24 (§7, configurações e direitos do titular, D-15…D-21) — regra: o título do card define o RF; CAs alinhados ao código real do Bloco 3 (`MeController`, `AccountService`, `UserPreferences`, `Guard.requireNotDeletionScheduled`)

> **HU3** — COMO usuário autenticado no sistema POSSO editar minhas informações pessoais e preferências de perfil PARA manter meus dados atualizados e personalizar minha experiência na plataforma.

Classes **(real)** existem em `origin/main` (Bloco 3, PR #16); **(planejado)**: `UserConsent`/`ConsentEvent`/`ConsentChecks`, `DataExportRequest`/`DataExportWorker`, `DataSubjectRequest`, `PersonalDataRegistry`, `AccountAnonymizationJob`, upload de avatar (`PendingUpload`/`MediaObject`, D-22), `GET/DELETE /api/auth/sessions`, `PolicyGateFilter`.

## Critérios de aceite derivados da HU3 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF3.CA01** (CA a confirmar) | Dado o usuário autenticado (`CurrentUser`), quando edito `fullName` (3–160), `displayName` (≤ 80), `jobTitle` (≤ 120), `bio` (≤ 1000), `avatarUrl`/`coverUrl` (`https://` ou caminho interno) por `PATCH /api/me`, então `AccountService.update` valida e salva com lock otimista (`User.version`); `username` é imutável (`422 USERNAME_IMUTAVEL`); erros voltam como `422 VALIDACAO details.fields`; conta `DELETION_SCHEDULED` → `Guard.requireNotDeletionScheduled` (`409 EXCLUSAO_AGENDADA`). |
| **RF3.CA02** (CA a confirmar) | Dado a troca de e-mail ou telefone (`PATCH /api/me/sensitive {currentPassword, email, phone}`), então a senha atual é reconferida com o **mesmo bloqueio do login** (`login-fail`, 6º erro → `429 MUITAS_TENTATIVAS`; errada → `422 SENHA_ATUAL_INCORRETA`), o `emailHash` novo deve ser único (`409 EMAIL_EM_USO`), `emailVerified` volta a `false`, `RegistrationService.resendVerification` envia o código ao e-mail novo e `AuditLog SENSITIVE_DATA_UPDATED` grava os campos alterados com e-mail mascarado. |
| **RF3.CA03** (CA a confirmar) | Dado a aba Aparência, quando altero `theme` (`ThemeMode` AUTO·CLARO·ESCURO·ALTO_CONTRASTE·BLUEPRINT), `language` (PT_BR·EN·ES), `density`, `fontScale`, `reduceMotion`, `deskSkin` (`DeskSkin`), `defaultCardSkin`, `timezone`, `wipLimit`, `aiModeDefault` (ECONOMIA·AVANCADO), `notificationPrefsJson` (inclui `dailyTaskAt`, RF44.CA10) e `dashboardLayoutJson`, então o cliente aplica **na hora** (`data-theme`, i18n) e persiste por `PUT /api/me/preferences` (`AccountService.updatePreferences`, `AuditLog PREFERENCES_UPDATED`); `GET /api/me/preferences` devolve os padrões quando ainda não há linha. |
| **RF3.CA04** (CA a confirmar) | Dado a aba Privacidade, quando altero `hypeVisibility` (PUBLICO·EMPRESA·SO_EU, padrão SO_EU, RF45.CA06) e `rankingOptOut` (RF43.CA05) no mesmo `PATCH /api/me`, então valor inválido → `422 details.fields.hypeVisibility`, a mudança vale na próxima leitura do perfil/ranking e fica em `AuditLog PROFILE_UPDATED` (campos alterados, sem valores pessoais). |
| **RF3.CA05** (CA a confirmar) | Dado o upload de avatar ou capa (**planejado**, D-22), então o arquivo (≤ 5 MB, mime por magic bytes png/jpg/webp, reencode sem EXIF) vira `PendingUpload` → `MediaObject` com `accessClass PUBLIC`, `PipelineJob THUMBNAIL` gera as variantes e `avatarUrl`/`coverUrl` apontam para a variante; o anterior é removido quando substituído. |
| **RF3.CA06** (CA a confirmar) | Dado qualquer alteração de perfil, então `AuditLog PROFILE_UPDATED`/`PREFERENCES_UPDATED` com `correlationId` e, após o commit, o evento `UserProfileUpdated` (**planejado**) reindexa a pessoa no OpenSearch `ws-people` (RF17/RF27) e invalida o cache do cabeçalho do perfil (RF6/RF16); `GET /api/users/{id}` devolve o `UserView` público de terceiros (sem e-mail/telefone, `Guard.ownerOrAdmin` para os campos privados). |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  class MeController {
    <<controller>>
    +me(CurrentUser) UserView
    +profile(CurrentUser, UUID id) UserView
    +update(CurrentUser, ProfileRequest, ctx) UserView
    +sensitive(CurrentUser, SensitiveRequest, ctx) UserView
    +requestDeletion(CurrentUser, DeletionBody, ctx) DeletionReceipt
    +cancelDeletion(CurrentUser, ctx) DeletionReceipt
    +preferences(CurrentUser) UserPreferences
    +updatePreferences(CurrentUser, PreferencesRequest, ctx) UserPreferences
  }
  class AccountService {
    <<service>>
    +DELETION_GRACE = 30 d
    +me(CurrentUser) UserView
    +profile(CurrentUser, userId) UserView
    +update(CurrentUser, ProfileUpdate, ctx) UserView
    +updateSensitive(CurrentUser, SensitiveUpdate, ctx) UserView
    +requestDeletion(CurrentUser, DeletionRequest, ctx) DeletionReceipt
    +cancelDeletion(CurrentUser, ctx) DeletionReceipt
    +preferences(CurrentUser) UserPreferences
    +updatePreferences(CurrentUser, UserPreferences, ctx) UserPreferences
  }
  class ProfileUpdate {
    <<value>>
    +String fullName
    +String displayName
    +String jobTitle
    +String bio
    +String avatarUrl
    +String coverUrl
    +String hypeVisibility
    +Boolean rankingOptOut
  }
  class SensitiveUpdate {
    <<value>>
    +String currentPassword
    +String email
    +String phone
  }
  class UserView {
    <<value>>
    +UUID id
    +String username
    +String fullName
    +String displayName
    +String email
    +boolean emailVerified
    +ProfileType profileType
    +AccountStatus status
    +String jobTitle
    +String avatarUrl
  }
  class Guard {
    <<service>>
    +requireRole(CurrentUser, Role) void
    +ownerOrAdmin(CurrentUser, ownerId) void
    +requireNotDeletionScheduled(User) void
  }
  class RegistrationService {
    <<service>>
    +resendVerification(email, ctx) void
  }
  class IdentityService {
    <<service>>
    +passwordMatchesWithLockout(User, raw, ctx) boolean
  }
  class UserRepositoryPort {
    <<port>>
    +findById(id) Optional
    +existsByEmailHash(hash) boolean
    +save(User) User
  }
  class UserPreferencesRepositoryPort {
    <<port>>
    +find(userId) Optional
    +save(UserPreferences) UserPreferences
  }
  class RateLimitPort {
    <<port>>
    +tryAcquire(owner, bucket, limit, window) boolean
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent) void
  }
  class MediaStoragePort {
    <<port>>
    planejado D-22
  }
  class ConsentService {
    <<service>>
    planejado D-17
  }
  class DataExportService {
    <<service>>
    planejado D-20
  }
  class PersonalDataRegistry {
    <<service>>
    planejado D-18
  }

  class User {
    <<entity>>
    +UUID id
    +String username
    +String fullName
    +String displayName
    +String email
    +String emailHash
    +boolean emailVerified
    +String phone
    +String jobTitle
    +String avatarUrl
    +String coverUrl
    +String bio
    +HypeVisibility hypeVisibility
    +boolean rankingOptOut
    +AccountStatus status
    +Instant deletionRequestedAt
    +Instant deletionScheduledAt
    +String deletionReason
    +long version
  }
  class UserPreferences {
    <<entity>>
    +UUID userId
    +String theme
    +String language
    +String density
    +BigDecimal fontScale
    +boolean reduceMotion
    +String deskSkin
    +String defaultCardSkin
    +String notificationPrefsJson
    +String timezone
    +int wipLimit
    +String dashboardLayoutJson
    +String aiModeDefault
    +long version
  }
  class UserConsent {
    <<entity>>
    +ConsentPurpose purpose
    +boolean granted
    +String policyVersion
  }
  class DataExportRequest {
    <<entity>>
    +ExportStatus status
    +String fileKey
    +Instant expiresAt
  }
  class DataSubjectRequest {
    <<entity>>
    +DsrKind kind
    +DsrStatus status
    +Instant dueAt
  }
  class MediaObject {
    <<entity>>
    +String objectKey
    +String mimeType
    +String accessClass
    +JSON variantsJson
  }
  class ThemeMode {
    <<enum>>
    AUTO
    CLARO
    ESCURO
    ALTO_CONTRASTE
    BLUEPRINT
  }
  class UiLanguage {
    <<enum>>
    PT_BR
    EN
    ES
  }
  class DeskSkin {
    <<enum>>
    PAPEL
    CORTICA
    BLUEPRINT
    PAPEL_TIMBRADO
  }
  class HypeVisibility {
    <<enum>>
    PUBLICO
    EMPRESA
    SO_EU
  }
  class AiMode {
    <<enum>>
    ECONOMIA
    AVANCADO
  }
  class AccountStatus {
    <<enum>>
    PENDING_EMAIL_VERIFICATION
    PENDING_VALIDATION
    ACTIVE
    SUSPENDED
    DELETION_SCHEDULED
    ANONYMIZED
  }

  MeController --> AccountService
  AccountService --> Guard
  AccountService --> RegistrationService : reenvia código ao e-mail novo
  AccountService --> IdentityService : reconfere senha com bloqueio
  AccountService --> UserRepositoryPort
  AccountService --> UserPreferencesRepositoryPort
  AccountService --> RateLimitPort
  AccountService --> AuditLogPort
  AccountService ..> ProfileUpdate
  AccountService ..> SensitiveUpdate
  AccountService ..> UserView
  AccountService ..> MediaStoragePort
  User "1" --> "1" UserPreferences : user_preferences CASCADE
  User "1" --> "0..*" UserConsent : planejado
  User "1" --> "0..*" DataExportRequest : planejado
  User "1" --> "0..*" DataSubjectRequest : planejado
  User "1" --> "0..*" MediaObject : media_objects CASCADE
  User --> HypeVisibility
  User --> AccountStatus
  UserPreferences ..> ThemeMode : theme
  UserPreferences ..> UiLanguage : language
  UserPreferences ..> DeskSkin : deskSkin
  UserPreferences ..> AiMode : aiModeDefault
  ConsentService --> UserConsent
  DataExportService --> DataExportRequest
  DataExportService --> PersonalDataRegistry
  note for UserPreferences "No código os enums viajam como String com padrões AUTO, PT_BR, NORMAL, 1.0, PAPEL, America/Sao_Paulo, 3, ECONOMIA (UserPreferences.java). Enums da TAXONOMIA §13."
  note for User "+15 campos (passwordHash, oidc*, role, companyId, departmentId, verified, twoFactorEnabled, accountOrigin, fixtureKey, termsVersion, privacyVersion, anonymizedAt, lastLoginAt...). Campos sensíveis cifrados: email_enc, phone_enc."
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Usuário autenticado"]
    A1["Abre /settings?tab=conta e edita nome, cargo, bio, avatar"]
    A2["Aba Privacidade: hypeVisibility, rankingOptOut"]
    A3["Aba Conta: trocar e-mail ou telefone (pede a senha atual)"]
    A4["Aba Aparência: tema, idioma, densidade, skin da Mesa, WIP, modo IA"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["Tabs com aba na URL · formulário com erro por campo (422 details.fields)"]
    F2["PATCH /bff/me → PATCH /api/me"]
    F3["PATCH /api/me/sensitive"]
    F4["PUT /api/me/preferences · aplica data-theme e locale na hora (optimistic)"]
    F5["Toast de sucesso · Banner se DELETION_SCHEDULED"]
  end
  subgraph WEB["ws-web"]
    W1["CorrelationIdFilter → JWT (SecurityConfig) → SessionActiveFilter → CurrentUserArgumentResolver"]
    W2["AuthRateLimitFilter: PATCH /api/me/sensitive 30/h · POST /api/me/deletion 10/h (hashes=true)"]
    W3["MeController.update / sensitive / updatePreferences"]
    E401["401 NAO_AUTENTICADO / SESSAO_ENCERRADA"]
    E422["422 VALIDACAO details.fields"]
    E422U["422 USERNAME_IMUTAVEL"]
    E422S["422 SENHA_ATUAL_INCORRETA"]
    E429["429 MUITAS_TENTATIVAS + Retry-After"]
    E409E["409 EMAIL_EM_USO"]
    E409D["409 EXCLUSAO_AGENDADA"]
  end
  subgraph APP["ws-application · AccountService"]
    S1["findById(current.id) · Guard.requireNotDeletionScheduled"]
    S2{"DELETION_SCHEDULED?"}
    S3["Valida tamanhos (fullName 3–160, displayName 80, jobTitle 120, bio 1000, URLs https) e HypeVisibility"]
    S4{"Campos ok?"}
    S5["save(User) lock otimista · AuditLog PROFILE_UPDATED {fields}"]
    T1["IdentityService: tryAcquire(login-fail) → Argon2 matches senha atual"]
    T2{"bloqueado / senha errada?"}
    T3{"e-mail novo já existe (emailHash)?"}
    T4["email/phone cifrados · emailVerified=false · resendVerification · AuditLog SENSITIVE_DATA_UPDATED"]
    P1["updatePreferences: valida enums (ThemeMode, UiLanguage, DeskSkin, AiMode), wipLimit ≥ 1, fontScale · save · AuditLog PREFERENCES_UPDATED"]
    EV["(planejado) UserProfileUpdated AFTER_COMMIT → reindexa ws-people · invalida cache do cabeçalho"]
  end
  subgraph PERS["Persistência"]
    D1[("MySQL: users (email_enc, phone_enc, hype_visibility, ranking_opt_out), user_preferences, audit_log")]
    D2[("Redis: balde login-fail (RateLimitPort)")]
    D3[("OpenSearch ws-people · Redis cache perfil (planejado)")]
    D4["MailPort: código ao e-mail novo"]
  end

  A1 --> F1 --> F2 --> W1 --> W3 --> S1 --> S2
  A2 --> F2
  W1 -->|"sem token ou família revogada"| E401
  S2 -->|"sim"| E409D
  S2 -->|"não"| S3 --> S4
  S4 -->|"não"| E422
  S3 -->|"username no corpo"| E422U
  S4 -->|"sim"| S5 --> F5
  S5 --> D1
  S5 --> EV --> D3
  A3 --> F3 --> W2 --> W1
  W2 -->|"excedeu IP"| E429
  W3 --> T1 --> T2
  T1 --> D2
  T2 -->|"6º erro"| E429
  T2 -->|"senha errada"| E422S
  T2 -->|"ok"| T3
  T3 -->|"sim"| E409E
  T3 -->|"não"| T4 --> D1
  T4 --> D4
  T4 --> F5
  A4 --> F4 --> W1
  W3 --> P1 --> D1
  P1 --> F5
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
  participant OS as OpenSearch
  participant AU as AuditLogPort
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: edita nome, cargo, bio, privacidade em /settings
  N->>C: PATCH /api/me {fullName, displayName, jobTitle, bio, avatarUrl, coverUrl, hypeVisibility, rankingOptOut}
  Note over C: JWT RS256 → SessionActiveFilter(sid) → CurrentUserArgumentResolver
  C->>S: AccountService.update(current, ProfileUpdate, ctx)
  S->>R: findById(current.id)
  S->>S: Guard.requireNotDeletionScheduled(user)
  alt conta com exclusão agendada
    S-->>C: 409 EXCLUSAO_AGENDADA
    C-->>N: 409
  else campo inválido
    S-->>C: 422 VALIDACAO details.fields (fullName, bio, hypeVisibility...)
    C-->>N: 422 (erro por campo, i18n)
  else ok
    S->>R: save(user) com version (lock otimista)
    S->>AU: record(PROFILE_UPDATED, OK, fields alterados)
    S-->>C: UserView
    C-->>N: 200 UserView
    EV-->>OS: (planejado) UserProfileUpdated → reindexa ws-people
    EV-->>RD: (planejado) DEL profile:header:{userId}
    N-->>U: Toast "Perfil atualizado"
  end

  U->>N: troca de e-mail com a senha atual
  N->>C: PATCH /api/me/sensitive {currentPassword, email, phone}
  Note over C: AuthRateLimitFilter 30/h por IP, hashes=true (HashBulkhead)
  C->>S: AccountService.updateSensitive(current, SensitiveUpdate, ctx)
  S->>RD: tryAcquire(userId, login-fail, 5, 15 min)
  alt bloqueado (6º erro)
    S-->>C: 429 MUITAS_TENTATIVAS + Retry-After
    C-->>N: 429
  else senha atual errada
    S->>S: Argon2PasswordHasher.matches = false (reserva fica)
    S-->>C: 422 SENHA_ATUAL_INCORRETA
    C-->>N: 422
  else e-mail já usado por outra conta
    S->>R: existsByEmailHash(hash novo) = true
    S-->>C: 409 EMAIL_EM_USO
    C-->>N: 409
  else ok
    S->>R: save(user email_enc, email_hash, emailVerified=false, phone_enc)
    S->>S: RegistrationService.resendVerification(email novo) → MailPort
    S->>AU: record(SENSITIVE_DATA_UPDATED, fields, maskEmail)
    S-->>C: UserView
    C-->>N: 200 (aviso: confirme o e-mail novo)
  end

  U->>N: muda tema para ESCURO e idioma para EN
  N->>N: aplica data-theme e locale imediatamente
  N->>C: PUT /api/me/preferences {theme, language, density, fontScale, reduceMotion, deskSkin, timezone, wipLimit, aiModeDefault, notificationPrefsJson}
  C->>S: AccountService.updatePreferences(current, prefs, ctx)
  alt valor fora do enum ou wipLimit inválido
    S-->>C: 422 VALIDACAO details.fields
    C-->>N: 422 (desfaz a aplicação otimista)
  else ok
    S->>R: save(user_preferences) version
    S->>AU: record(PREFERENCES_UPDATED)
    S-->>C: UserPreferences
    C-->>N: 200 UserPreferences
  end
```

## 4. Máquina de estados

Entidade central: **`User.status`** (`AccountStatus`) no recorte do RF3 — a edição só é permitida fora de `DELETION_SCHEDULED`/`ANONYMIZED`; o pedido de exclusão (CA19–CA21) e a exportação (CA14–CA15) têm as máquinas completas em §7.3. `UserPreferences` não tem estados próprios.

```mermaid
stateDiagram-v2
  direction LR
  state "ACTIVE (edição liberada)" as ACT
  state "PENDING_EMAIL_VERIFICATION" as PEV
  state "PENDING_VALIDATION (edição liberada, ações de emissor bloqueadas)" as PV
  state "DELETION_SCHEDULED (409 EXCLUSAO_AGENDADA em PATCH /api/me)" as DEL
  state "ANONYMIZED" as ANO

  [*] --> PEV : cadastro (RF1)
  PEV --> ACT : confirmEmail (EMPREGADO)
  PEV --> PV : confirmEmail (EMPRESA ou CHEFE)
  PV --> ACT : ApprovalRequest APROVADO (RF28)
  ACT --> ACT : PATCH /api/me · PATCH /api/me/sensitive · PUT /api/me/preferences (sempre permitidos)
  ACT --> PEV : PATCH /api/me/sensitive troca o e-mail → emailVerified=false (status mantido, warning no login)
  ACT --> DEL : POST /api/me/deletion com senha atual (bloqueio login-fail) · ACCOUNT_DELETION_REQUESTED · deletionScheduledAt = +30 d
  PEV --> DEL : POST /api/me/deletion
  DEL --> ACT : DELETE /api/me/deletion dentro do prazo · ACCOUNT_DELETION_CANCELLED
  DEL --> PEV : cancelamento com e-mail não confirmado
  DEL --> ANO : AccountAnonymizationJob (planejado, D-18)
  ANO --> [*]
  note right of DEL
    Preferências e leitura continuam.
    Escrita de perfil: Guard.requireNotDeletionScheduled.
    Exportar e cancelar continuam liberados (D-18).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend · Next.js 15 App Router"]
    PG["app/(shell)/settings · ?tab=conta|aparencia|privacidade|dados|sessoes|termos|validacao"]
    UI["packages/ui: Tabs, Input, Textarea, Select, Switch, Button, Avatar, Banner, Dialog, Toast"]
    TH["data-theme (claro · escuro · contraste · blueprint) + lib/i18n (pt-BR/en/es) aplicados na hora"]
    BFF["app/bff/me/* · cookie ws_rt → Authorization Bearer · X-Correlation-Id"]
    PG --> UI
    PG --> TH
    PG --> BFF
  end
  subgraph WSWEB["ws-web"]
    SEC["SecurityConfig (anyRequest hasAnyRole USER, ADMIN) · SessionActiveFilter · CurrentUserArgumentResolver"]
    ARL["AuthRateLimitFilter (PATCH /api/me/sensitive, POST /api/me/deletion) + HashBulkhead"]
    MC["MeController"]
    GEH["GlobalExceptionHandler"]
  end
  subgraph WSAPP["ws-application"]
    AS["account.AccountService"]
    GD["security.Guard"]
    IS["identity.IdentityService (reconferência) · RegistrationService (reenvio)"]
    PORTS["ports: UserRepositoryPort · UserPreferencesRepositoryPort · RateLimitPort · AuditLogPort · MailPort · MediaStoragePort (planejado)"]
    LG["lgpd (planejado): ConsentService · ConsentChecks · DataExportService · PersonalDataRegistry · DataSubjectRequestService"]
    AS --> GD
    AS --> IS
    AS --> PORTS
  end
  subgraph WSDOM["ws-domain"]
    DOM["identity: User · UserPreferences · HypeVisibility · AccountStatus · ProfileType"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: UserEntity, UserPreferencesEntity, JpaIdentityAdapters, JpaAuditLog, AesGcmStringConverter"]
    RDS["cache-redis: RedisRateLimit · cache do cabeçalho do perfil (planejado)"]
    OSE["search-opensearch: índice ws-people (planejado, RF17/RF27)"]
    S3["storage-s3: avatar/capa via PendingUpload → MediaObject (planejado, D-22) · restricted/users/{id}/exports (planejado, D-20)"]
    PLT["platform: MailPort (código do e-mail novo)"]
  end
  subgraph BOOT["ws-bootstrap"]
    JOBS["schedulers (planejado): AccountAnonymizationJob · ExportExpiryJob · PendingUploadCleanupJob (ShedLock)"]
  end

  BFF -->|"REST JSON"| ARL --> SEC --> MC --> AS
  MC --> GEH
  MY -.implementa.-> PORTS
  RDS -.implementa.-> PORTS
  PLT -.implementa.-> PORTS
  S3 -.implementa.-> PORTS
  AS --> DOM
  AS -.-> LG
  MY --> DB[("MySQL 8.4")]
  RDS --> RD[("Redis 7")]
  OSE --> OSX[("OpenSearch 2.19")]
  S3 --> MINIO[("S3 / MinIO")]
  JOBS --> MY
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF3.CA01 | `MeController.update`, `AccountService.update`, `ProfileUpdate`, `Guard.requireNotDeletionScheduled`, `User.version` | `S1`→`S5`, `E422`, `E422U`, `E409D` | 2–17 | `ACT`→`ACT`, nota de `DEL` | `MC`, `AS`, `GD`, `UI` | real (Bloco 3, main) |
| RF3.CA02 | `AccountService.updateSensitive`, `SensitiveUpdate`, `IdentityService` (bloqueio), `RegistrationService.resendVerification`, `AesGcmStringConverter` | `A3`→`T1`→`T4`, `E429`, `E422S`, `E409E` | 21–38 | `ACT`→`PEV` (e-mail novo) | `ARL`, `AS`, `IS`, `PLT`, `MY` | real |
| RF3.CA03 | `UserPreferences`, `AccountService.updatePreferences/preferences`, `ThemeMode`, `UiLanguage`, `DeskSkin`, `AiMode` | `A4`→`F4`→`P1` | 39–48 | — | `TH`, `MC`, `MY` (`user_preferences` CASCADE) | real |
| RF3.CA04 | `ProfileUpdate.hypeVisibility/rankingOptOut`, `HypeVisibility` | `A2`→`F2`→`S3`→`S5` | 2–16 | — | `AS`, `UI` (`Switch`) | real (`AuditLog PROFILE_UPDATED`) |
| RF3.CA05 | `MediaStoragePort`, `MediaObject`, `PendingUpload`, `PipelineJob THUMBNAIL` | — | — | — | `S3`, `JOBS` | planejado (D-22) |
| RF3.CA06 | `AuditLogPort`, `AuditActions.PROFILE_UPDATED/PREFERENCES_UPDATED`, `UserView`, evento `UserProfileUpdated` | `S5`→`EV`→`D3` | 14, 18–19 | — | `OSE`, `RDS`, `MC.profile` | auditoria real; evento e índice planejados |
| RF3.CA07 | `Tabs` (`packages/ui`) | `F1` | — | — | `PG`, `UI` | planejado (§7) |
| RF3.CA08 | `AccountService.updateSensitive`, balde `login-fail` | `T1`→`T2` | 25–38 | — | `ARL`, `IS` | real; aviso ao e-mail antigo planejado |
| RF3.CA09 | `User.hypeVisibility/rankingOptOut` | `S3`→`S5` | 14 | — | `AS` | real (grava `PROFILE_UPDATED`, não `PRIVACY_CHANGED`) |
| RF3.CA10 | `UserConsent`, `ConsentPurpose`, `ConsentService` | — | — | — | `LG` | planejado (D-17, Q-67) |
| RF3.CA11 | `ConsentEvent` | — | — | — | `LG`, `MY` | planejado |
| RF3.CA12 | `ConsentChecks`, `ConsentCoverageTest` | — | — | — | `LG` | planejado |
| RF3.CA13 | `PersonalDataRegistry`, `GET /api/me/data-map` | — | — | — | `LG` | planejado (D-18) |
| RF3.CA14 | `DataExportRequest`, `DataExportService`, `PipelineJob DATA_EXPORT` | — | — | §7.3 bloco 1 | `LG`, `S3`, `JOBS` | planejado (D-20) |
| RF3.CA15 | `DataExportRequest.fileKey/expiresAt`, `OwnMedia` | — | — | `READY`→`EXPIRED` | `S3` | planejado |
| RF3.CA16 | `PersonalDataRegistry.exportSection` | — | — | — | `LG` | planejado |
| RF3.CA17 | `PersonalDataRegistryCoverageTest` | — | — | — | `LG` | planejado |
| RF3.CA18 | `DataSubjectRequest`, `DsrKind`, `DsrStatus` | — | — | — | `LG` | planejado (Q-71) |
| RF3.CA19 | `AccountService.requestDeletion`, `DeletionRequest`, `DeletionReceipt`, `DELETION_GRACE` | — | — | `ACT`→`DEL`, §7.3 bloco 2 | `MC`, `AS`, `ARL` (10/h) | real (409 `EXCLUSAO_AGENDADA` se já agendada) |
| RF3.CA20 | `Guard.requireNotDeletionScheduled`, `Session.warnings` | `S2`→`E409D` | 7–8 | nota de `DEL` | `GD`, `UI` (`Banner`) | real (hoje `409`, D-18 prevê `403 EXCLUSAO_AGENDADA` para criar conteúdo — Q proposta) |
| RF3.CA21 | `AccountAnonymizationJob`, `AccountStatus.ANONYMIZED` | — | — | `DEL`→`ANO` | `JOBS` | planejado (D-18) |
| RF3.CA22 | `GET /api/auth/sessions`, `GET /api/me/policies` | — | — | — | `PG` (abas Sessões e Termos) | planejado |
| RF3.CA23 | padrões LGPD de interface (`packages/ui`) | `F1` | — | — | `UI` | planejado |
| RF3.CA24 | `openapi-typescript` → `lib/api/types.gen.ts` | — | — | — | `BFF` | planejado (D-21) |

## 7. Configurações e direitos do titular — `/settings` (CA a confirmar, D-15…D-21; o "RF23" do FAI, Q-46)

Bloco **C** de `docs/produto/CADASTRO_E_LGPD.md`: a tela de configurações é o **ponto de cumprimento** da LGPD. Entidades em `TAXONOMIA.md` §1.12–1.14, §12.6 e §12.9 (**proposta**). O que já existe no Bloco 3: abas Conta (`PATCH /api/me`, `PATCH /api/me/sensitive`), Aparência (`PUT /api/me/preferences`), Privacidade sem consentimentos (`hypeVisibility`, `rankingOptOut`) e o pedido/cancelamento de exclusão (`POST|DELETE /api/me/deletion`, `DeletionReceipt`). O resto é **planejado**. Defeitos do FAI evitados: exclusão que nunca conclui (1), consentimentos não respeitados e histórico sobrescrito (6), front lendo campos que o back não manda (7), exportação síncrona com nome `.zip` e JSON dentro (8).

### 7.1 Abas (`Tabs`, aba atual na URL `?tab=`)

| Aba | O que tem | CAs | Código |
|---|---|---|---|
| **Conta** | RF3.CA01 e CA02 (correção, art. 18 III); troca de e-mail com senha atual e bloqueio; troca de senha (`PUT /api/auth/password`) encerra as outras sessões | CA08 | real |
| **Aparência** | RF3.CA03 aplicada na hora e persistida | CA03 | real |
| **Privacidade** | `hypeVisibility` (padrão SO_EU), `rankingOptOut` e os **consentimentos** | CA09–CA12 | parcial |
| **Seus dados** | "Quais dados temos", exportação, outros direitos (art. 20, oposição, compartilhamento), encerramento da conta | CA13–CA21 | exclusão real; resto planejado |
| **Sessões** | RF2.CA05: lista e revogação por dispositivo | CA22 | planejado |
| **Termos e políticas** | versões aceitas, datas, canal e links para `/termos` e `/privacidade` | CA22 | planejado (D-15/D-16) |
| **Validação** (só EMPRESA/CHEFE pendentes) | central de validação do RF28.CA11 | RF28 | planejado (D-19) |

### 7.2 Critérios de aceite (RF3.CA07–CA24)

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF3.CA07** (CA a confirmar) | Dado `/settings`, então as abas usam `Tabs` de `packages/ui` com a aba atual na URL (`?tab=conta`), navegáveis por teclado; nenhuma aba contém HTML/CSS solto (D-11). |
| **RF3.CA08** (CA a confirmar) | Dado a troca de e-mail, então ela exige a **senha atual com o bloqueio** `login-fail` (6º erro → `429 MUITAS_TENTATIVAS` + `Retry-After`; **real**), envia o código ao e-mail novo (**real**, `resendVerification`) e um **aviso ao antigo** (planejado); a troca de senha encerra as outras sessões (`SESSIONS_REVOKED`, real). |
| **RF3.CA09** (CA a confirmar) | Dado a aba Privacidade, então `hypeVisibility` nasce `SO_EU` e `rankingOptOut` `false`; alterar grava `AuditLog PROFILE_UPDATED` com os campos alterados (**real**; o nome `PRIVACY_CHANGED` do plano não existe em `AuditActions`) e vale na próxima leitura. |
| **RF3.CA10** (CA a confirmar, Q-67) | Dado os consentimentos, então existem só para **finalidades opcionais** (`ConsentPurpose`: `RESUMO_PROFISSIONAL_IA`, RF43.CA04; `GRAVACAO_REUNIOES_PADRAO`); cada uma mostra `title`, `description`, `legalBasis`, `article`, `sensitive`, `grantedAt`, `revokedAt`, `policyVersion` (iguais ao OpenAPI, CA24); **nunca vem marcada**; revogar tem o mesmo esforço que conceder (`PUT /api/me/consents/{purpose} {granted}`). |
| **RF3.CA11** (CA a confirmar) | Dado conceder ou revogar, então grava-se `consent_events` (append-only) e o estado em `user_consents`, mais `AuditLog CONSENT_GRANTED` ou `CONSENT_REVOKED`; o histórico aparece na aba. |
| **RF3.CA12** (CA a confirmar) | Dado o enum `ConsentPurpose`, então cada valor tem um **ponto de verificação** em `ConsentChecks`; `ConsentCoverageTest` falha o CI para finalidade sem checagem, e finalidade sem uso **não aparece** na tela. |
| **RF3.CA13** (CA a confirmar) | Dado "Quais dados temos" (art. 9º; art. 18 I e II), então a página lista, por categoria, finalidade, base legal, retenção e compartilhamento (IA mascarada, Google Workspace, Microsoft 365), tudo vindo do `PersonalDataRegistry` (`GET /api/me/data-map`). |
| **RF3.CA14** (CA a confirmar) | Dado "Exportar meus dados", então `POST /api/me/exports` cria `DataExportRequest REQUESTED` e enfileira `PipelineJob DATA_EXPORT`; limite **3 por dia por pessoa** (`RateLimitPort`, `429 LIMITE_EXPORTACOES`); `GET /api/me/exports` lista com `requestedAt` e `expiresAt`. |
| **RF3.CA15** (CA a confirmar) | Dado a exportação pronta, então o arquivo tem nome e tipo corretos (`.json` + `application/json`, ou ZIP real), sai no idioma da pessoa, fica em `restricted/users/{userId}/exports/`, só o dono baixa (`OwnMedia`, `403`), expira em **7 dias** (`410 EXPORTACAO_EXPIRADA`) e há notificação quando pronta. |
| **RF3.CA16** (CA a confirmar) | Dado o conteúdo, então inclui perfil, preferências, aceites, consentimentos; sessões, lotações; tarefas e projetos próprios e **as próprias mensagens** do DECIA; decisões, pontos, reconhecimentos; inferências de IA e auditoria sobre a pessoa. |
| **RF3.CA17** (CA a confirmar) | Dado uma entidade com coluna de pessoa, então ela está no `PersonalDataRegistry` ou em `EXCLUDED_WITH_REASON`; `PersonalDataRegistryCoverageTest` falha o CI para entidade nova sem classificação. |
| **RF3.CA18** (CA a confirmar, Q-71) | Dado "Outros direitos", então a pessoa abre `DataSubjectRequest` de **revisão de decisão automatizada** (art. 20: HSE, ranking, Hype, classificação IA), **oposição** e **informação sobre compartilhamento**; cada pedido tem `dueAt`, status, encarregado e `AuditLog DSR_OPENED`; o canal (`WS_LEGAL_DPO_CONTACT`) aparece na aba. |
| **RF3.CA19** (CA a confirmar, Q-68) | Dado "Encerrar minha conta", então o pedido exige a **senha atual com bloqueio** (**real**: `POST /api/me/deletion {currentPassword, reason}`, `AuditLog ACCOUNT_DELETION_REQUESTED`, `deletionScheduledAt = +30 d`, `DeletionReceipt.cancelable`); antes de confirmar, o `Dialog` mostra o que será anonimizado e o que fica (planejado); já agendada → `409 EXCLUSAO_AGENDADA`. |
| **RF3.CA20** (CA a confirmar) | Dado `DELETION_SCHEDULED`, então o login devolve `warnings` com a data (**real**), o `Banner` mostra a data e o botão cancelar (`DELETE /api/me/deletion`, **real**, `ACCOUNT_DELETION_CANCELLED`; sem agendamento → `409 EXCLUSAO_NAO_AGENDADA`), editar o perfil recebe `409 EXCLUSAO_AGENDADA` (`Guard.requireNotDeletionScheduled`, **real**) e criar conteúdo receberá `403 EXCLUSAO_AGENDADA` (D-18, planejado — divergência de código a registrar). |
| **RF3.CA21** (CA a confirmar) | Dado o prazo vencido, então o `AccountAnonymizationJob` roda por `@Scheduled` com **lock** (ShedLock); teste 1 prova o agendamento; teste 2 (Testcontainers) prova a anonimização no MySQL, S3 `restricted/`, Cassandra e OpenSearch, a revogação das sessões e `ACCOUNT_DELETION_COMPLETED`, mantendo `policy_acceptances`, `consent_events` e documentos públicos. |
| **RF3.CA22** (CA a confirmar) | Dado as abas Sessões e Termos e políticas, então a primeira lista `refresh_tokens` por família (`deviceName`, `createdIp`, `lastUsedAt`, atual) com revogação, e a segunda mostra por documento a versão aceita, data, canal e link para a vigente (`GET /api/me/policies`). |
| **RF3.CA23** (CA a confirmar) | Dado qualquer controle, então valem os padrões LGPD: privacidade por padrão, aceitar e recusar com o **mesmo destaque**, sem texto que constranja quem recusa, foco visível, teclado e `reduceMotion`. |
| **RF3.CA24** (CA a confirmar) | Dado o contrato front/back, então os tipos TypeScript são **gerados do OpenAPI** (springdoc → `openapi-typescript`) e o CI falha se o gerado divergir do commitado ou se o front ler um campo que o back não declara (D-21). |

### 7.3 Máquinas de estado novas

**Bloco 1 — `DataExportRequest.status` (`ExportStatus`, planejado D-20)**

```mermaid
stateDiagram-v2
  direction LR
  state "REQUESTED" as REQ
  state "PROCESSING" as PROC
  state "READY" as READY
  state "EXPIRED" as EXP
  state "FAILED" as FAIL

  [*] --> REQ : POST /api/me/exports · 3 por dia (429 LIMITE_EXPORTACOES) · PipelineJob DATA_EXPORT enfileirado
  REQ --> PROC : DataExportWorker pega o job · monta JSON pelo PersonalDataRegistry no idioma da pessoa
  PROC --> READY : arquivo em restricted/users/{userId}/exports/ · expiresAt = now + 7 d · Notification
  PROC --> FAIL : erro (attempts esgotados) · failureReason · a pessoa pode pedir de novo
  READY --> EXP : ExportExpiryJob apaga o arquivo · download responde 410 EXPORTACAO_EXPIRADA
  EXP --> [*]
  FAIL --> [*]
  note right of READY
    GET /api/me/exports/{id}/download
    só pelo dono (OwnMedia, 403 para os outros)
    nome .json + application/json, ou ZIP real
  end note
```

**Bloco 2 — `User.status` no encerramento da conta (`AccountStatus`, D-18; pedido e cancelamento reais)**

```mermaid
stateDiagram-v2
  direction LR
  state "ACTIVE" as ACT
  state "DELETION_SCHEDULED (30 d, cancelável)" as DEL
  state "ANONYMIZED" as ANO

  ACT --> DEL : POST /api/me/deletion com senha atual (bloqueio 429) · ACCOUNT_DELETION_REQUESTED · DeletionReceipt
  DEL --> ACT : DELETE /api/me/deletion dentro do prazo · ACCOUNT_DELETION_CANCELLED (volta a PENDING_EMAIL_VERIFICATION se o e-mail não estava confirmado)
  DEL --> DEL : POST /api/me/deletion de novo → 409 EXCLUSAO_AGENDADA
  DEL --> ANO : AccountAnonymizationJob (@Scheduled + ShedLock) após deletionScheduledAt · ACCOUNT_DELETION_COMPLETED (planejado)
  ANO --> [*]
  note right of DEL
    Login com warning e Banner · perfil oculto
    PATCH /api/me: 409 EXCLUSAO_AGENDADA (real)
    criar conteúdo: 403 EXCLUSAO_AGENDADA (D-18)
    exportar e cancelar continuam liberados
  end note
  note right of ANO
    MySQL: nome, username, e-mail, telefone, foto, bio, cargo anonimizados · senha invalidada
    S3: apaga restricted/ da pessoa e avatar
    Cassandra e OpenSearch: projeções removidas · sessões revogadas (blocksLogin)
    Ficam: policy_acceptances, consent_events, atas, decisões validadas,
    DecisionTrace, chancelas emitidas, ledger (guarda legal, art. 16)
  end note
```

Endpoints propostos da aba Seus dados: `GET /api/me/data-map` · `POST|GET /api/me/exports` · `GET /api/me/exports/{id}/download` · `POST|GET /api/me/requests` · `GET /api/me/policies` · `GET|PUT /api/me/consents/{purpose}`. Já existentes: `POST|DELETE /api/me/deletion`. Jobs agendados (planejado): `AccountAnonymizationJob` (diário), `ExportExpiryJob` (horário), ambos com `@Scheduled`, lock e teste de agendamento.
