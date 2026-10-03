# RF3 — Editar informações pessoais e preferências do perfil do usuário
**HU:** HU3 · **Sprint (board Work Station):** 1 · **Equivalente FAI:** RF3 Preferências e conta (`AccountService`, `PreferencesService`, `user_preferences`, `MediaService` para avatar/capa; temas e skins do RF23 FAI) · **Aba/rota:** Meu perfil → Editar (`/profile/edit`) e Preferências (`/settings/preferences`) — rotas sugeridas; a aba *Meu perfil* é `/profile` (RF19)
**Critérios de aceite cobertos:** RF3.CA01 … RF3.CA06 (RF1–RF18 não têm CAs no board: derivados da HU3 e marcados "CA a confirmar")

> **HU3** — COMO usuário autenticado no sistema POSSO editar minhas informações pessoais e preferências de perfil PARA manter meus dados atualizados e personalizar minha experiência na plataforma.

## Critérios de aceite derivados da HU3 (todos "CA a confirmar")

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF3.CA01** (CA a confirmar) | Dado o usuário autenticado, quando edito `fullName`, `displayName`, `jobTitle` (cargo), `bio`, `phone`, `avatarUrl`, `coverUrl`, então os campos são validados (tamanhos da TAXONOMIA, telefone E.164) e salvos via `PATCH /api/me`; `username` é **imutável após a verificação** (`422 USERNAME_IMUTAVEL`); erros voltam como `422 VALIDACAO` com `details` por campo. |
| **RF3.CA02** (CA a confirmar) | Dado a troca de e-mail, quando informo o novo e-mail, então é exigida **reautenticação** (senha atual ou OIDC recente — `401 REAUTENTICACAO_NECESSARIA`), o `emailHash` deve ser único (`409 EMAIL_EM_USO`), `emailVerified` volta a `false` e um novo código é enviado; até confirmar, o e-mail antigo continua valendo para login. |
| **RF3.CA03** (CA a confirmar) | Dado a tela de preferências, quando altero `theme` (`ThemeMode` AUTO·CLARO·ESCURO·ALTO_CONTRASTE·BLUEPRINT), `language` (`UiLanguage` PT_BR·EN·ES), `density`, `fontScale`, `reduceMotion`, `deskSkin` (`DeskSkin`), `defaultCardSkin`, `timezone`, `wipLimit`, `aiModeDefault` (ECONOMIA·AVANCADO) e `notificationPrefsJson` (inclui `dailyTaskAt` 08:00, RF44.CA10), então elas são aplicadas **imediatamente** no cliente (sem recarregar) e persistidas em `user_preferences` (`PUT /api/me/preferences`), respeitando RF38.CA08. |
| **RF3.CA04** (CA a confirmar) | Dado as opções de privacidade, quando altero `hypeVisibility` (PUBLICO·EMPRESA·SO_EU, RF45.CA06) e `rankingOptOut` (RF43.CA05), então a mudança vale na próxima leitura do perfil/ranking e fica em `AuditLog PRIVACY_CHANGED`. |
| **RF3.CA05** (CA a confirmar) | Dado o upload de avatar ou capa, então o arquivo (≤ 5 MB, mime detectado pelo conteúdo: png/jpg/webp) vira `MediaObject` no S3/MinIO com `accessClass PUBLICO`, um `PipelineJob THUMBNAIL` gera as variantes de forma assíncrona e o `User.avatarUrl`/`coverUrl` aponta para a variante; o anterior é removido quando substituído. |
| **RF3.CA06** (CA a confirmar) | Dado qualquer alteração de perfil, então ela gera `AuditLog PROFILE_UPDATED` (sem valores sensíveis, com `correlationId`) e o evento `UserProfileUpdated` (AFTER_COMMIT) reindexa a pessoa na busca (OpenSearch, RF27) e invalida o cache do cabeçalho do perfil (RF19); campos LGPD (`email`, `phone`) permanecem cifrados com `AesGcmStringConverter`. |

## 1. Diagrama de classes

```mermaid
classDiagram
  direction LR

  namespace wai_domain {
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
      +jobTitle: String
      +avatarUrl: String
      +coverUrl: String
      +bio: String
      +hypeVisibility: HypeVisibility
      +rankingOptOut: boolean
      +status: AccountStatus
    }
    class UserPreferences {
      <<entity>>
      +id: UUID
      +userId: UUID
      +theme: ThemeMode
      +language: UiLanguage
      +density: String
      +fontScale: BigDecimal
      +reduceMotion: boolean
      +deskSkin: DeskSkin
      +defaultCardSkin: String
      +notificationPrefsJson: String
      +timezone: String
      +wipLimit: int
      +dashboardLayoutJson: String
      +aiModeDefault: AiMode
    }
    class MediaObject {
      <<entity>>
      +id: UUID
      +bucket: String
      +key: String
      +mimeType: String
      +sizeBytes: long
      +sha256: String
      +ownerId: UUID
      +accessClass: AccessClassification
      +variantsJson: String
    }
    class PipelineJob {
      <<entity>>
      +id: UUID
      +type: String
      +targetType: String
      +targetId: UUID
      +status: String
      +attempts: int
    }
    class AuditLog {
      <<entity>>
      +actorId: UUID
      +action: String
      +resourceType: String
      +resourceId: UUID
      +metadataJson: String
      +correlationId: String
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
    class AiMode {
      <<enum>>
      ECONOMIA
      AVANCADO
    }
    class HypeVisibility {
      <<enum>>
      PUBLICO
      EMPRESA
      SO_EU
    }
  }

  namespace wai_application {
    class AccountService {
      <<service>>
      +me(current CurrentUser) MeView
      +updateProfile(current CurrentUser, cmd ProfileUpdateCommand) MeView
      +changeEmail(current CurrentUser, newEmail, reauth ReauthProof) void
      +updatePrivacy(current CurrentUser, cmd PrivacyCommand) MeView
      +uploadAvatar(current CurrentUser, bytes, mime) MediaView
      +uploadCover(current CurrentUser, bytes, mime) MediaView
    }
    class PreferencesService {
      <<service>>
      +get(current CurrentUser) UserPreferences
      +update(current CurrentUser, cmd PreferencesCommand) UserPreferences
      +defaults(userId) UserPreferences
    }
    class IdentityService {
      <<service>>
      +reauthenticate(userId, password) void
      +resendEmailVerification(current CurrentUser) void
    }
    class MediaStoragePort {
      <<port>>
      +put(bucket, key, bytes, mime) MediaObject
      +delete(bucket, key) void
      +publicUrl(key) String
    }
    class JobQueuePort {
      <<port>>
      +enqueue(job PipelineJob) void
    }
    class SearchIndexPort {
      <<port>>
      +indexPerson(user User) void
    }
    class DomainEventPublisherPort {
      <<port>>
      +publish(event DomainEvent) void
    }
  }

  namespace wai_web {
    class AccountController {
      <<controller>>
      +me() MeView
      +updateProfile(cmd ProfileUpdateCommand) MeView
      +changeEmail(body EmailChangeRequest) void
      +updatePrivacy(cmd PrivacyCommand) MeView
      +uploadAvatar(file MultipartFile) MediaView
      +uploadCover(file MultipartFile) MediaView
      +preferences() UserPreferences
      +updatePreferences(cmd PreferencesCommand) UserPreferences
    }
  }

  namespace wai_infrastructure {
    class S3MediaStorage {
      <<adapter>>
      +bucket: String
    }
    class OpenSearchPeopleIndexer {
      <<adapter>>
    }
    class MysqlJobQueue {
      <<adapter>>
    }
  }

  AccountController --> AccountService
  AccountController --> PreferencesService
  AccountService --> IdentityService : reauthenticate
  AccountService --> MediaStoragePort
  AccountService --> JobQueuePort
  AccountService --> DomainEventPublisherPort
  PreferencesService --> DomainEventPublisherPort
  S3MediaStorage ..|> MediaStoragePort
  OpenSearchPeopleIndexer ..|> SearchIndexPort
  MysqlJobQueue ..|> JobQueuePort
  User "1" --> "1" UserPreferences : preferences
  User "1" --> "0..2" MediaObject : avatar e capa
  MediaObject "1" --> "*" PipelineJob : THUMBNAIL
  UserPreferences --> ThemeMode
  UserPreferences --> UiLanguage
  UserPreferences --> DeskSkin
  UserPreferences --> AiMode
  User --> HypeVisibility
  AuditLog ..> User : PROFILE_UPDATED

  note for User "tabela users · .. +16 campos .. · username imutável após verificação; email e phone cifrados (AesGcmStringConverter)"
  note for UserPreferences "tabela user_preferences (RF3, RF38.CA08); notificationPrefsJson inclui dailyTaskAt 08:00 (RF44.CA10)"
  note for PipelineJob "type THUMBNAIL · status PENDENTE · RODANDO · OK · FALHA · REPROCESSAR"
```

## 2. Diagrama de atividades

Raias: Usuário · Web/BFF · `wai-application` · Persistência (o RF3 não usa o AiEngine). Três sub-fluxos: dados pessoais, troca de e-mail e preferências/avatar.

```mermaid
flowchart TD
  subgraph L1["Ator humano — Usuário autenticado"]
    A1(["Abre Meu perfil → Editar"]) --> A2{"O que editar?"}
    A2 -->|dados pessoais| A3["Altera nome, cargo, bio, telefone"]
    A2 -->|e-mail| A4["Informa novo e-mail e senha atual"]
    A2 -->|preferências| A5["Muda tema, idioma, densidade, fonte, skin da Mesa, fuso, WIP, modo de IA, notificações"]
    A2 -->|avatar ou capa| A6["Seleciona imagem (png, jpg, webp até 5 MB)"]
    A20(["Perfil atualizado"])
  end

  subgraph L2["Web / BFF (Next.js App Router)"]
    B1["PATCH /api/me (Bearer)"]
    B2["PATCH /api/me/email (Bearer + senha atual)"]
    B3["Aplica tema/idioma no cliente na hora (data-theme, next-intl) e PUT /api/me/preferences"]
    B4["POST /api/me/avatar multipart"]
  end

  subgraph L3["wai-application — AccountService / PreferencesService"]
    C1{"Campos válidos?"}
    C1 -->|username alterado| E422a["422 USERNAME_IMUTAVEL"]
    C1 -->|inválido| E422["422 VALIDACAO (details por campo)"]
    C1 -->|sim| C2["Atualiza User (fullName, displayName, jobTitle, bio, phone cifrado)"]
    C2 --> C9["AuditLog PROFILE_UPDATED + publica UserProfileUpdated (AFTER_COMMIT)"]
    C3{"Reautenticação confere?"}
    C3 -->|não| E401["401 REAUTENTICACAO_NECESSARIA"]
    C3 -->|sim| C4{"emailHash livre?"}
    C4 -->|não| E409["409 EMAIL_EM_USO"]
    C4 -->|sim| C5["Grava e-mail pendente cifrado, emailVerified=false, envia código"]
    C5 --> C9
    C6{"Valores dentro dos enums e limites?"}
    C6 -->|não| E422
    C6 -->|sim| C7["Upsert UserPreferences"]
    C7 --> C9
    C8{"Mime detectado é imagem e tamanho ok?"}
    C8 -->|não| E422b["422 ARQUIVO_INVALIDO"]
    C8 -->|sim| C10["MediaObject no S3 (accessClass PUBLICO) + PipelineJob THUMBNAIL"]
    C10 --> C11["User.avatarUrl ou coverUrl → variante; apaga a mídia anterior"]
    C11 --> C9
  end

  subgraph L5["Persistência"]
    D1[("MySQL: users, user_preferences, media_objects, pipeline_jobs, audit_log, domain_events")]
    D2[("S3/MinIO: avatars/, covers/ (+ variantes thumb/preview)")]
    D3[("OpenSearch: índice de pessoas (RF27)")]
    D4["EmailSenderPort → código de verificação do novo e-mail"]
  end

  A3 --> B1 --> C1
  A4 --> B2 --> C3
  A5 --> B3 --> C6
  A6 --> B4 --> C8
  C2 --> D1
  C5 --> D1
  C5 --> D4
  C7 --> D1
  C10 --> D2
  C10 --> D1
  C9 --> D3
  C9 --> A20

  classDef erro fill:#fde2e2,stroke:#c0392b,color:#7b1d1d;
  class E422,E422a,E422b,E401,E409 erro;
```

## 3. Diagrama de sequência

Caminho feliz das preferências e do avatar, com os `alt` de erro do CA01 (username imutável) e do CA02 (reautenticação / e-mail em uso).

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant N as Next.js (App Router) /profile/edit + /settings/preferences
  participant C as AccountController (wai-web)
  participant A as AccountService (wai-application)
  participant P as PreferencesService (wai-application)
  participant DB as Repository/MySQL
  participant S3 as S3
  participant OS as OpenSearch
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>N: edita nome, cargo, bio, telefone
  N->>C: PATCH /api/me (Bearer)
  C->>A: updateProfile(currentUser, ProfileUpdateCommand)
  alt tentou mudar username após verificação (CA01)
    A-->>C: 422 USERNAME_IMUTAVEL
    C-->>N: 422 details.username
  else campos válidos (CA01)
    A->>DB: UPDATE users SET full_name, display_name, job_title, bio, phone (AES-GCM)
    A->>DE: publish UserProfileUpdated(userId, changedFields, correlationId)
    A-->>C: 200 MeView
    C-->>N: 200
    N-->>U: cabeçalho do perfil atualizado
    DE->>DB: AFTER_COMMIT → INSERT audit_log PROFILE_UPDATED (sem valores sensíveis) (CA06)
    DE->>OS: AFTER_COMMIT → reindexa pessoa (nome, cargo, departamento) (CA06)
  end

  U->>N: troca o e-mail (novo e-mail + senha atual)
  N->>C: PATCH /api/me/email
  C->>A: changeEmail(currentUser, newEmail, reauth)
  A->>A: IdentityService.reauthenticate(userId, senha) → Argon2id
  alt senha atual errada (CA02)
    A-->>C: 401 REAUTENTICACAO_NECESSARIA
  else emailHash já existe (CA02)
    A->>DB: existsByEmailHash(newHash)
    A-->>C: 409 EMAIL_EM_USO
  else ok (CA02)
    A->>DB: UPDATE users SET email (AES), email_hash, email_verified=0 + INSERT verification_codes
    A->>DE: publish EmailChangeRequested → EmailSenderPort envia código
    A-->>C: 202 Accepted
    C-->>N: 202 → tela de confirmação do código
  end

  U->>N: muda tema para ESCURO, idioma EN, deskSkin BLUEPRINT, wipLimit 4
  N->>N: aplica na hora (data-theme, locale) (CA03)
  N->>C: PUT /api/me/preferences
  C->>P: update(currentUser, PreferencesCommand)
  P->>P: valida enums ThemeMode, UiLanguage, DeskSkin, AiMode e limites
  P->>DB: UPSERT user_preferences
  P->>DE: publish PreferencesUpdated → AuditLog PREFERENCES_UPDATED
  P-->>C: 200 UserPreferences
  C-->>N: 200

  U->>N: envia nova foto de perfil
  N->>C: POST /api/me/avatar (multipart)
  C->>A: uploadAvatar(currentUser, bytes, mime)
  A->>A: detecta mime pelo conteúdo e confere tamanho (CA05)
  A->>S3: put avatars/{userId}/{sha256}.webp (accessClass PUBLICO)
  A->>DB: INSERT media_objects + INSERT pipeline_jobs (THUMBNAIL, PENDENTE)
  A->>DB: UPDATE users SET avatar_url
  A->>S3: delete avatar anterior (se houver)
  A-->>C: 201 MediaView (url, variantes pendentes)
  C-->>N: 201
  N-->>U: avatar novo (placeholder até o thumbnail ficar OK)
```

## 4. Máquina de estados

O RF3 não cria estados próprios; a entidade afetada é o **`User`** (verificação do e-mail dentro de `ACTIVE`) e o **`PipelineJob THUMBNAIL`** do avatar/capa (`MediaObject`). Os dois ciclos aparecem como estados compostos.

```mermaid
stateDiagram-v2
  direction LR

  state "User ACTIVE — verificação do e-mail (RF3.CA02)" as USER_ACTIVE {
    [*] --> EMAIL_VERIFICADO
    EMAIL_VERIFICADO --> EMAIL_PENDENTE_REVERIFICACAO : PATCH /api/me/email com reautenticação
    EMAIL_PENDENTE_REVERIFICACAO --> EMAIL_VERIFICADO : código do novo e-mail confere
    EMAIL_PENDENTE_REVERIFICACAO --> EMAIL_VERIFICADO : titular cancela a troca (mantém o antigo)
  }

  state "PipelineJob THUMBNAIL do avatar/capa (RF3.CA05)" as JOB {
    [*] --> PENDENTE
    PENDENTE --> RODANDO : worker pega o job
    RODANDO --> OK : variantes thumb e preview gravadas em variantsJson
    RODANDO --> FALHA : erro de decodificação ou S3
    FALHA --> REPROCESSAR : attempts menor que 3
    REPROCESSAR --> RODANDO : nova tentativa com backoff
    FALHA --> [*] : attempts esgotados (avatar fica com a imagem original)
    OK --> [*]
  }

  note right of USER_ACTIVE
    Enquanto EMAIL_PENDENTE_REVERIFICACAO,
    o e-mail antigo continua válido para login (RF2)
    e o novo só passa a valer após o código.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js (App Router)"]
    FE1["app/(app)/profile/edit/page.tsx"]
    FE2["app/(app)/settings/preferences/page.tsx"]
    FE3["components/ui (ThemeProvider data-theme, LocaleSwitcher, AvatarUploader, Form)"]
    FE4["lib/auth/session.tsx (refreshMe após salvar)"]
  end

  subgraph WEB["wai-web"]
    W1["AccountController /api/me · /api/me/email · /api/me/privacy · /api/me/avatar · /api/me/cover · /api/me/preferences"]
    W2["SecurityConfig (JWT) · CurrentUserResolver · multipart limits"]
  end

  subgraph APP["wai-application"]
    S1["AccountService"]
    S2["PreferencesService"]
    S3["IdentityService.reauthenticate"]
    P1["MediaStoragePort · JobQueuePort"]
    P2["SearchIndexPort · EmailSenderPort · DomainEventPublisherPort"]
  end

  subgraph DOM["wai-domain"]
    D1["User · UserPreferences · MediaObject · PipelineJob · AuditLog"]
    D2["ThemeMode · UiLanguage · DeskSkin · AiMode · HypeVisibility"]
    D3["UserRepository · UserPreferencesRepository · MediaObjectRepository"]
  end

  subgraph INFRA["wai-infrastructure"]
    I1["persistence-mysql (users, user_preferences, media_objects, pipeline_jobs, audit_log)"]
    I2["storage-s3 (S3MediaStorage: avatars/, covers/)"]
    I3["search-opensearch (OpenSearchPeopleIndexer)"]
    I4["platform (MysqlJobQueue + ThumbnailWorker, OutboxEventPublisher, SmtpEmailSender)"]
  end

  MY[("MySQL 8")]
  S3B[("S3 / MinIO")]
  OSB[("OpenSearch")]
  X1["SMTP / Google Workspace (e-mail de verificação)"]

  FE1 --> W1
  FE2 --> W1
  FE1 --> FE3
  FE2 --> FE3
  FE1 --> FE4
  W2 -.-> W1
  W1 --> S1
  W1 --> S2
  S1 --> S3
  S1 --> P1
  S1 --> P2
  S2 --> P2
  S1 --> D1
  S2 --> D1
  S1 --> D3
  I2 -.->|implementa| P1
  I4 -.->|implementa| P1
  I3 -.->|implementa| P2
  I4 -.->|implementa| P2
  D3 --> I1
  I1 --> MY
  I2 --> S3B
  I3 --> OSB
  I4 --> X1
  BOOT["wai-bootstrap (flags storage.s3, opensearch.enabled)"] -.-> INFRA
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição de estado (§4) | Componente (§5) |
|---|---|---|---|---|---|
| RF3.CA01 | `AccountService.updateProfile`, `User.fullName/displayName/jobTitle/bio/phone`, `User.username` (imutável) | `A3`, `B1`, `C1` → `E422a`/`E422`, `C2` | 1–9 (`PATCH /api/me`, `422 USERNAME_IMUTAVEL`) | — | `FE1`, `W1 /api/me`, `S1` |
| RF3.CA02 | `AccountService.changeEmail`, `IdentityService.reauthenticate`, `User.email/emailHash/emailVerified` | `A4`, `B2`, `C3` → `E401`, `C4` → `E409`, `C5` | 12–21 | `EMAIL_VERIFICADO → EMAIL_PENDENTE_REVERIFICACAO → EMAIL_VERIFICADO` | `W1 /api/me/email`, `S3`, `I4 SmtpEmailSender`, `X1` |
| RF3.CA03 | `PreferencesService.update`, `UserPreferences.*`, `ThemeMode`, `UiLanguage`, `DeskSkin`, `AiMode` | `A5`, `B3`, `C6`, `C7` | 22–29 (`PUT /api/me/preferences`) | — | `FE2`, `FE3 ThemeProvider`, `W1 /api/me/preferences`, `S2`, `I1 user_preferences` |
| RF3.CA04 | `AccountService.updatePrivacy`, `User.hypeVisibility`, `User.rankingOptOut`, `HypeVisibility`, `AuditLog` | `C2`, `C9` (PRIVACY_CHANGED) | 7, 10 (AuditLog) | — | `W1 /api/me/privacy`, `I4 OutboxEventPublisher` |
| RF3.CA05 | `AccountService.uploadAvatar/uploadCover`, `MediaObject`, `PipelineJob THUMBNAIL`, `MediaStoragePort`, `JobQueuePort` | `A6`, `B4`, `C8` → `E422b`, `C10`, `C11` | 30–39 | `PENDENTE → RODANDO → OK / FALHA → REPROCESSAR` | `FE3 AvatarUploader`, `W1 /api/me/avatar`, `I2 storage-s3`, `I4 ThumbnailWorker` |
| RF3.CA06 | `AuditLog`, `DomainEventPublisherPort`, `SearchIndexPort`/`OpenSearchPeopleIndexer`, `User.email/phone` (AES) | `C9`, `D3` | 8, 10–11 (AFTER_COMMIT → audit_log, reindexa) | — | `I3 search-opensearch`, `I4 OutboxEventPublisher`, `I1` |
