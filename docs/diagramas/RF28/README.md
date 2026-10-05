# RF28 — Gerir perfis de empresa e chefe de departamento (departamentos, página institucional, chancela de tarefas/projetos e emissão de reconhecimentos)
**HU:** HU28 · **Sprint (board Work Station):** Sprint 4 (comprometido) · **Equivalente FAI:** RF14 Aba Marcas + RF22 Perfil institucional (perfis MARCA/CELEBRIDADE; verificação = `IssuerVerificationPolicy`) · **Aba/rota:** Empresas & Departamentos (`/companies`, `/companies/[slug]`, `/companies/[slug]/manage`, `/companies/[slug]/manage/departments`, `/departments/[slug]`, `/departments/[slug]/team`), painel do emissor (`/issuer/dashboard`), fila do ADMIN (`/admin/approvals`), central de validação da pessoa (`/settings?tab=validacao`)
**Critérios de aceite cobertos:** RF28.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 (corpo do card, inalterado) + **RF28.CA09 … CA17 (CA a confirmar, D-19 — validação institucional com `VerificationPolicy` versionada, §7)** — regra: o **título do card** define o RF e o corpo traz os próprios CAs; o fluxo de chancelas em si está no RF39 e o Balcão no RF40.

Perfis: **EMPREGADO** (= PESSOAL), **EMPRESA** (= MARCA), **CHEFE_DEPARTAMENTO** (= CELEBRIDADE), **ADMIN**; papel contextual **CURADOR** (`CuratorAppointment`). EMPRESA e CHEFE nascem `PENDING_VALIDATION` e passam pelo ADMIN (`ApprovalRequest` + `VerificationPolicy`). A EMPRESA cria `Department`s e lota pessoas (`DepartmentMembership`, 1 lotação ativa por vez, histórico preservado). A troca de chefe (`Department.headUserId`) move sessões DECIA, filas de revisão e chancelas pendentes e gera o Dossiê de Transição (RF36). O que já existe em código (`sec-b3`): `User` com `profileType`/`status`/`verified`, `ProfileType`, `AccountStatus`, `Guard.requireRole/ownerOrAdmin`, `AuditLogPort`; `Company`, `Department` e o restante são **planejados** (`users.company_id`/`department_id` sem FK até a migration deste RF, D-23).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_identity {
  class User {
    <<entity>>
    +id: UUID
    +username: String
    +fullName: String
    +profileType: ProfileType
    +role: Role
    +status: AccountStatus
    +jobTitle: String
    +companyId: UUID
    +departmentId: UUID
    +verified: boolean
    +accountOrigin: AccountOrigin
    .. +25 campos (sec-b3) ..
  }
  class Company {
    <<entity>>
    +id: UUID
    +ownerUserId: UUID
    +legalName: String
    +slug: String
    +cnpj: String
    +logoUrl: String
    +coatOfArmsUrl: String
    +about: String
    +websiteUrl: String
    +accentColor: String
    +pointsPolicyJson: JSON
    +hypePolicyJson: JSON
    +recordingRetentionPolicy: String
    +status: String
  }
  class Department {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +name: String
    +acronym: String
    +slug: String
    +color: String
    +monogram: String
    +headUserId: UUID
    +about: String
    +coverUrl: String
    +active: boolean
  }
  class DepartmentMembership {
    <<entity>>
    +id: UUID
    +userId: UUID
    +departmentId: UUID
    +roleInDept: DeptRole
    +startedAt: Instant
    +endedAt: Instant
    +reason: String
  }
  class CuratorAppointment {
    <<entity>>
    +id: UUID
    +departmentId: UUID
    +curatorUserId: UUID
    +appointedBy: UUID
    +appointedAt: Instant
    +revokedAt: Instant
    +revokeReason: String
    +scope: CuratorScope
  }
  class ApprovalRequest {
    <<entity>>
    +id: UUID
    +userId: UUID
    +requestedProfile: ProfileType
    +status: ApprovalStatus
    +policyVersion: String
    +criteriaJson: JSON
    +reasonsJson: JSON
    +note: String
    +attempts: int
    +emailConfirmedAt: Instant
    +submittedAt: Instant
    +dueAt: Instant
    +verificationCode: String
    +documentKeysJson: JSON
    +confirmedBy: UUID
    +reviewedBy: UUID
    +reviewedAt: Instant
  }
  class VerificationPolicy {
    <<entity>>
    +id: UUID
    +version: String
    +profileType: ProfileType
    +criteriaJson: JSON
    +reasonsJson: JSON
    +maxSubmissions: int
    +slaBusinessDays: int
    +status: String
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
  }
  class ApprovalStatus {
    <<enum>>
    PENDENTE
    AJUSTES
    APROVADO
    RECUSADO
  }
  class DeptRole {
    <<enum>>
    MEMBRO
    CHEFE
    CURADOR
  }
  class CuratorScope {
    <<enum>>
    FILA_REVISAO
    PREMIACAO
    AMBOS
  }
}

namespace ws_domain_seals_gamification {
  class Recognition {
    <<entity>>
    +id: UUID
    +issuerUserId: UUID
    +recipientUserId: UUID
    +name: String
    +medalArtJson: JSON
    +criterion: String
    +source: RecognitionSource
    +validUntil: LocalDate
    +issuedAt: Instant
    +publicOnMural: boolean
  }
  class SealBond {
    <<entity>>
    +sealId: UUID
    +status: SealBondStatus
    +requiresReview: boolean
  }
  class HandoffDossier {
    <<entity>>
    +subjectType: String
    +reason: HandoffReason
    +status: HandoffStatus
  }
  class MetricSnapshot {
    <<entity>>
    +metricCode: String
    +scope: MetricScope
    +scopeId: UUID
    +value: BigDecimal
  }
  class AuditLog {
    <<entity>>
    +actorId: UUID
    +action: String
    +resourceType: String
    +resourceId: String
    +result: String
    +correlationId: String
  }
}

namespace ws_application {
  class CompanyService {
    <<service>>
    +update(actor, companyId, CompanyForm) Company
    +createDepartment(actor, companyId, DepartmentForm) Department
    +updateDepartment(actor, deptId, DepartmentForm) Department
    +assignMember(actor, deptId, userId) DepartmentMembership
    +changeHead(actor, deptId, newHeadId) Department
    +publicPage(viewer, slug) CompanyPageView
  }
  class DepartmentService {
    <<service>>
    +publicPage(viewer, slug) DepartmentPageView
    +appointCurator(actor, deptId, userId, scope) CuratorAppointment
    +revokeCurator(actor, appointmentId, reason)
  }
  class RecognitionService {
    <<service>>
    +issue(actor, recipientId, RecognitionForm) Recognition
    -checkMonthlyLimit(issuerId) 409 LIMITE_ESGOTADO
  }
  class ApprovalService {
    <<service>>
    +queue(admin, filters) Page~ApprovalRequest~
    +decide(admin, id, decision, reasons, checklist, note) ApprovalRequest
    +resubmit(actor, evidence) ApprovalRequest
    +confirmHead(actor, deptId, approvalId)
  }
  class IssuerDashboardService {
    <<service>>
    +load(actor, period, deptId) IssuerDashboardView
  }
  class Guard {
    <<service>>
    +requireRole(actor, role)
    +requireDeptHead(actor, deptId)
    +requireApprovedInstitutional(actor)
    +requireIssuerOrCurator(actor, deptId)
  }
  class AuditLogPort {
    <<port>>
    +record(AuditEvent)
  }
  class DomainEvents {
    <<service>>
    +publish(event)
  }
}

namespace ws_web {
  class CompanyController {
    <<controller>>
    +GET_api_companies_slug()
    +PATCH_api_companies_id()
    +POST_api_companies_id_departments()
    +PATCH_api_departments_id()
    +POST_api_departments_id_members(userId)
    +POST_api_departments_id_head(newHeadId)
  }
  class DepartmentController {
    <<controller>>
    +GET_api_departments_slug()
    +POST_api_departments_id_curators(userId, scope)
    +DELETE_api_departments_id_curators_appointmentId(reason)
  }
  class RecognitionController {
    <<controller>>
    +POST_api_recognitions(form)
  }
  class AdminApprovalController {
    <<controller>>
    +GET_api_admin_approvals()
    +POST_api_admin_approvals_userId(decision)
    +GET_api_admin_approvals_id_documents_kind()
  }
  class IssuerDashboardController {
    <<controller>>
    +GET_api_issuer_dashboard(period, deptId)
  }
}

Company "1" o-- "0..*" Department
Company "1" o-- "0..*" User : emprega
Department "1" o-- "0..*" DepartmentMembership : lotacoes
User "1" o-- "0..*" DepartmentMembership : historico
Department "0..1" --> "0..1" User : headUserId
Department "1" o-- "0..*" CuratorAppointment
User "1" --> "0..1" ApprovalRequest
VerificationPolicy "1" o-- "0..*" ApprovalRequest : policyVersion
User "1" o-- "0..*" Recognition : recebe
Department ..> SealBond : fila de revisao RF39
Department ..> HandoffDossier : troca de chefe RF36
CompanyController --> CompanyService
DepartmentController --> DepartmentService
RecognitionController --> RecognitionService
AdminApprovalController --> ApprovalService
IssuerDashboardController --> IssuerDashboardService
CompanyService --> Guard
DepartmentService --> Guard
RecognitionService --> Guard
ApprovalService --> Guard
IssuerDashboardService ..> MetricSnapshot
CompanyService --> AuditLogPort
DepartmentService --> AuditLogPort
RecognitionService --> AuditLogPort
ApprovalService --> AuditLogPort
AuditLogPort ..> AuditLog
CompanyService --> DomainEvents
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (ADMIN · EMPRESA · CHEFE · EMPREGADO)"]
    A0([Entra no app]) --> A1{"Perfil escolhido no cadastro (RF1)"}
    A1 -->|EMPRESA ou CHEFE| A2["Aguarda validação do ADMIN"]
    A1 -->|EMPREGADO| A3["Menu de empregado"]
    A4["ADMIN decide na fila /admin/approvals"]
    A5["EMPRESA cria/edita departamentos e lota empregados"]
    A6["CHEFE nomeia ou revoga curador"]
    A7["EMPRESA/CHEFE emite reconhecimento"]
    A8["EMPRESA/CHEFE abre painel do emissor"]
    A9["EMPRESA troca o chefe do departamento"]
    A10["EMPREGADO tenta abrir o criador de chancela"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/companies · departments · issuer · admin · settings)"]
    F1["Menus e rotas por perfil (SidebarNav grupo Gestão só EMPRESA/CHEFE/CURADOR/ADMIN)"]
    F2["POST /api/admin/approvals/{userId} {decision, reasons, checklist}"]
    F3["POST /api/companies/{id}/departments · POST /api/departments/{id}/members"]
    F4["POST/DELETE /api/departments/{id}/curators"]
    F5["POST /api/recognitions"]
    F6["GET /api/issuer/dashboard?period=&deptId="]
    F7["POST /api/departments/{id}/head"]
    F8["Página pública /companies/[slug] · /departments/[slug] com sub-abas e botão Seguir (RF27.CA06)"]
  end

  subgraph WEB["ws-web"]
    W1["JWT · CorrelationIdFilter · SessionActiveFilter (sec-b3)"]
    W2["GlobalExceptionHandler → {code, message, details, correlationId}"]
  end

  subgraph APP["ws-application"]
    P1{"Guard.requireRole ADMIN e não é o próprio titular?"}
    P1 -->|não| E1["403 ACESSO_NEGADO"]
    P2{"Decisão"}
    P2 -->|APROVAR com obrigatório em aberto| E2["409 CRITERIOS_PENDENTES"]
    P2 -->|AJUSTES/RECUSAR sem motivo| E3["422 VALIDACAO details.reasons"]
    P2 -->|APROVAR ok| P3["User ACTIVE + verified · EMPRESA cria Company · CHEFE define headUserId"]
    P4{"Guard.requireRole EMPRESA e dona da Company?"}
    P4 -->|não| E4["403 ACESSO_NEGADO"]
    P5{"Empregado já tem lotação ativa?"}
    P5 -->|sim| P6["Encerra DepartmentMembership anterior (endedAt, reason) e abre nova"]
    P5 -->|não| P7["Abre DepartmentMembership MEMBRO"]
    P8["Guard.requireDeptHead · CuratorAppointment + AuditLog CURATOR_APPOINTED/REVOKED"]
    P9{"Limite de reconhecimentos do emissor no mês?"}
    P9 -->|esgotado| E5["409 LIMITE_ESGOTADO"]
    P9 -->|ok| P10["Recognition + AuditLog RECOGNITION_ISSUED + MuralEntry RECONHECIMENTO"]
    P11["IssuerDashboardService: projetos por fase · prazos em risco · decisões pendentes · fila de chancelas · custo de IA por departamento · benefícios resgatados"]
    P12["changeHead: move sessões DECIA, filas de revisão e SealBond EM_REVISAO para o novo chefe · DomainEvents HeadChanged"]
    P13["Guard.requireIssuerOrCurator → EMPREGADO recebe 403 no criador de chancela e no painel do emissor"]
  end

  subgraph IA["AiEngine (DOSSIE, RF36)"]
    I1["HandoffService gera Dossiê de Transição TROCA_CHEFE ✦"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL companies · departments · department_memberships · curator_appointments · approval_requests · recognitions · audit_log")]
    D2[("S3 restricted/pending documentos de verificação · logos (storage.s3)")]
    D3[("Redis cache do dashboard (redis.enabled)")]
  end

  A2 --> A4 --> F2 --> W1 --> P1 -->|sim| P2
  P3 --> D1
  A3 --> F1
  A5 --> F3 --> W1 --> P4 -->|sim| P5
  P6 --> D1
  P7 --> D1
  A6 --> F4 --> W1 --> P8 --> D1
  A7 --> F5 --> W1 --> P9
  P10 --> D1
  A8 --> F6 --> W1 --> P11 --> D3
  P11 --> D1
  A9 --> F7 --> W1 --> P4 --> P12 --> D1
  P12 --> I1
  A10 --> P13 --> E1
  F8 --> W1
  P1 --> D2
  E1 --> W2
  E2 --> W2
  E3 --> W2
  E4 --> W2
  E5 --> W2
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  Note over U,EV: CA01 — validação do perfil EMPRESA/CHEFE pelo ADMIN
  U->>FE: ADMIN abre dossiê do pedido e marca o checklist
  FE->>C: GET /api/admin/approvals/{id}/documents/representation
  C->>S: ApprovalService.openDocument(admin, id, kind)
  S->>S: OwnMedia (restricted/pending) + Cache-Control no-store
  S->>S3: get restricted/pending/{uploadId}/representation.jpg
  S->>DB: audit_log APPROVAL_DOCUMENT_VIEWED
  S-->>FE: documento
  FE->>C: POST /api/admin/approvals/{userId} {APROVAR, checklist}
  C->>S: ApprovalService.decide(admin, id, APROVAR, ...)
  S->>S: Guard.requireRole(admin, ADMIN) e admin diferente do titular
  alt admin é o próprio titular
    S-->>C: 403 ACESSO_NEGADO
  else critério obrigatório em aberto
    S-->>C: 409 CRITERIOS_PENDENTES
  else aprovado
    S->>DB: approval_requests APROVADO · users status ACTIVE, verified true
    S->>DB: EMPRESA → insert companies (ownerUserId) · CHEFE → departments.head_user_id + membership CHEFE
    S->>DB: audit_log APPROVAL_DECIDED
    S->>EV: ProfileApproved → Notification + e-mail no idioma da pessoa
    S-->>C: 200
  end

  Note over U,EV: CA02 — EMPRESA cria departamento e lota empregado
  U->>FE: EMPRESA cria SECID-UTS (nome, sigla, cor, monograma, chefe)
  FE->>C: POST /api/companies/{id}/departments
  C->>S: CompanyService.createDepartment(actor, companyId, form)
  S->>S: Guard.requireRole(EMPRESA) + dona da Company
  S->>DB: insert departments
  S-->>C: 201 Department
  FE->>C: POST /api/departments/{id}/members {userId}
  C->>S: CompanyService.assignMember(actor, deptId, userId)
  S->>DB: select department_memberships ativa do userId
  alt já lotado em outro departamento
    S->>DB: update endedAt, reason TRANSFERENCIA
  end
  S->>DB: insert department_memberships MEMBRO · users.department_id
  S->>DB: audit_log MEMBERSHIP_CHANGED
  S->>EV: MembershipChanged → Notification ao empregado

  Note over U,EV: CA03 — CHEFE nomeia curador
  U->>FE: CHEFE nomeia curador (escopo FILA_REVISAO)
  FE->>C: POST /api/departments/{id}/curators {userId, scope}
  C->>S: DepartmentService.appointCurator(actor, deptId, userId, scope)
  S->>S: Guard.requireDeptHead(actor, deptId)
  S->>DB: insert curator_appointments · audit_log CURATOR_APPOINTED
  S-->>C: 201

  Note over U,EV: CA05 — reconhecimento
  U->>FE: CHEFE emite reconhecimento (nome, medalha, critério, validade)
  FE->>C: POST /api/recognitions
  C->>S: RecognitionService.issue(actor, recipientId, form)
  S->>DB: count recognitions do emissor no mês
  alt limite mensal atingido (RF35.CA06)
    S-->>C: 409 LIMITE_ESGOTADO
  else ok
    S->>DB: insert recognitions · audit_log RECOGNITION_ISSUED
    S->>EV: RecognitionIssued → MuralEntry RECONHECIMENTO + Notification
    S-->>C: 201
  end

  Note over U,EV: CA07 — troca de chefe
  U->>FE: EMPRESA troca o chefe do departamento
  FE->>C: POST /api/departments/{id}/head {newHeadId}
  C->>S: CompanyService.changeHead(actor, deptId, newHeadId)
  S->>DB: departments.head_user_id · memberships CHEFE (antiga endedAt, nova)
  S->>DB: decia_sessions.admin_user_id · seal_bonds EM_REVISAO · decision_reviews pendentes → novo chefe
  S->>EV: HeadChanged
  S-->>C: 200
  EV->>S: HandoffService.generate(TROCA_CHEFE)
  S->>AI: run(DOSSIE, pendências do antigo chefe)
  AI-->>S: resumo de contexto ✦ + AiInferenceLog
  S->>DB: insert handoff_dossiers
```

## 4. Máquina de estados

Entidade central: `User.status` (`AccountStatus`, enum existente em `sec-b3`) para os perfis institucionais; o sub-estado da validação (`ApprovalRequest.status`) está em §7.2. `DepartmentMembership` não tem enum: ativa (`endedAt` nulo) ou encerrada.

```mermaid
stateDiagram-v2
  [*] --> PENDING_EMAIL_VERIFICATION: cadastro (RF1) escolhe EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO
  PENDING_EMAIL_VERIFICATION --> ACTIVE: EMPREGADO confirma e-mail
  PENDING_EMAIL_VERIFICATION --> PENDING_VALIDATION: EMPRESA ou CHEFE confirma e-mail → ApprovalRequest PENDENTE (CA01)
  PENDING_VALIDATION --> PENDING_VALIDATION: AJUSTES e reenvio (até 5) · 403 PERFIL_EM_VALIDACAO para publicar
  PENDING_VALIDATION --> ACTIVE: ADMIN aprova → verified = true · Company criada ou headUserId definido (CA01, CA16)
  PENDING_VALIDATION --> SUSPENDED: 5 envios recusados (só ADMIN reabre)
  ACTIVE --> ACTIVE: gere departamentos (CA02) · curadores (CA03) · reconhecimentos (CA05) · troca de chefe (CA07)
  ACTIVE --> SUSPENDED: ADMIN suspende com motivo
  SUSPENDED --> ACTIVE: ADMIN reativa
  ACTIVE --> DELETION_SCHEDULED: titular pede exclusão (RF3, D-18)
  DELETION_SCHEDULED --> ACTIVE: cancela em 30 dias
  DELETION_SCHEDULED --> ANONYMIZED: AccountAnonymizationJob
  ANONYMIZED --> [*]
  note right of ACTIVE
    EMPREGADO ACTIVE nunca acessa criador de chancela
    nem painel do emissor (403, CA08).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/companies · companies/[slug] · companies/[slug]/manage · departments/[slug] · departments/[slug]/team · issuer/dashboard · admin/approvals · settings (validação)"]
    R2["components: SidebarNav (grupo Gestão condicional) · Avatar/Monogram · Medal · DeptForm · ApprovalChecklist · Dashboard tiles · FollowButton · RadioCard (RF1)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
  end
  subgraph WEB["ws-web"]
    CTRL["CompanyController · DepartmentController · RecognitionController · AdminApprovalController · IssuerDashboardController (@Operation RF28.CA01-CA17)"]
    SEC["SecurityConfig · JwtConfig · SessionActiveFilter · CorrelationIdFilter · GlobalExceptionHandler (main/sec-b3)"]
  end
  subgraph APPL["ws-application"]
    CS["identity/CompanyService · DepartmentService"]
    APS["identity/ApprovalService (VerificationPolicy, D-19)"]
    RS["seals/RecognitionService"]
    IDS["facade/IssuerDashboardService"]
    HS["handoff/HandoffService (RF36)"]
    GD["security/Guard (sec-b3: requireRole, ownerOrAdmin · planejado: requireDeptHead, requireIssuerOrCurator, requireApprovedInstitutional)"]
    AUD["audit/AuditLogPort (sec-b3)"]
    OM["security/OwnMedia (restricted/)"]
    DE["events/DomainEvents AFTER_COMMIT"]
    AIE["ai/AiEngine (DOSSIE)"]
  end
  subgraph DOM["ws-domain"]
    ENT["User · ProfileType · AccountStatus · Role (sec-b3) · Company · Department · DepartmentMembership · CuratorAppointment · ApprovalRequest · VerificationPolicy · Recognition (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: V2 users (main) · V3 auth (sec-b3) · V__rf28 companies/departments + FK RESTRICT em users (D-23)"]
    AUDJ["persistence-mysql/audit JpaAuditLog (sec-b3)"]
    S3A["storage-s3 restricted/pending (flag storage.s3)"]
    RD["cache-redis dashboard (flag redis.enabled)"]
    PLAT["platform: e-mail (MailPort, sec-b3)"]
  end
  BFF --> CTRL --> SEC
  CTRL --> CS
  CTRL --> APS
  CTRL --> RS
  CTRL --> IDS
  CS --> GD
  APS --> GD
  APS --> OM
  CS --> AUD
  APS --> AUD
  RS --> AUD
  CS --> DE --> HS --> AIE
  DE --> PLAT
  CS --> ENT --> MY --> MYSQL[("MySQL 8")]
  AUD --> AUDJ --> MYSQL
  OM --> S3A --> S3[("S3 / MinIO")]
  IDS --> RD --> REDIS[("Redis")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF28.CA01 | `User.profileType/status`, `ApprovalRequest`, `ApprovalService.decide`, `Guard.requireRole`, `AdminApprovalController.POST_api_admin_approvals_userId` | A1 → A2 → A4 → F2 → P1 (403) → P2 (409/422) → P3 · F1 (menus por perfil) | 1–18 | `PENDING_EMAIL_VERIFICATION → PENDING_VALIDATION → ACTIVE` | `APS`, `admin/approvals`, `SidebarNav` |
| RF28.CA02 | `Department`, `DepartmentMembership` (1 ativa, histórico), `CompanyService.createDepartment/assignMember` | A5 → F3 → P4 → P5 → P6/P7 | 19–31 | `ACTIVE → self (departamentos)` | `CS`, `DeptForm`, `MY` |
| RF28.CA03 | `CuratorAppointment`, `CuratorScope`, `DepartmentService.appointCurator/revokeCurator`, `AuditLog CURATOR_APPOINTED/REVOKED` | A6 → F4 → P8 | 32–37 | `ACTIVE → self (curadores)` | `AUD`, `AUDJ` |
| RF28.CA04 | `CompanyService.publicPage`, `DepartmentService.publicPage`, `Follow` (RF27.CA06), `MetricSnapshot` (métricas públicas) | F8 | — (GET páginas públicas) | — | `R1 (/companies/[slug], /departments/[slug])`, `FollowButton` |
| RF28.CA05 | `Recognition`, `RecognitionService.issue`, `MuralEntry RECONHECIMENTO` | A7 → F5 → P9 (409 LIMITE_ESGOTADO) → P10 | 38–47 | `ACTIVE → self (reconhecimentos)` | `RS`, `Medal` |
| RF28.CA06 | `IssuerDashboardService.load`, `MetricSnapshot`, `AiInferenceLog` (custo de IA), `SealBond` (fila), `BenefitRedemption` | A8 → F6 → P11 | — (GET /api/issuer/dashboard) | — | `IDS`, `RD`, `issuer/dashboard` |
| RF28.CA07 | `Department.headUserId`, `CompanyService.changeHead`, `DomainEvents HeadChanged`, `HandoffDossier TROCA_CHEFE` | A9 → F7 → P4 → P12 → I1 | 48–58 | `ACTIVE → self (troca de chefe)` | `DE`, `HS`, `AIE` |
| RF28.CA08 | `Guard.requireIssuerOrCurator`, `Guard.requireRole` | A10 → P13 → E1 | — (403 em todo endpoint de emissor) | nota de ACTIVE | `GD`, `SidebarNav` |
| RF28.CA09–CA17 (a confirmar) | `ApprovalRequest`, `VerificationPolicy`, `ApprovalStatus` AJUSTES/RECUSADO, `OwnMedia` | §7 | 1–18 | §7.2 | `APS`, `OM`, `S3A` |

## 7. Validação de perfis EMPRESA e CHEFE_DEPARTAMENTO — política versionada (CA a confirmar, D-19)

Bloco **B** do brief de cadastro e LGPD (`docs/produto/CADASTRO_E_LGPD.md`), adaptado da `IssuerVerificationPolicy`/`IssuerReviewService` do FAI: MARCA → **EMPRESA (órgão)**, CELEBRIDADE → **CHEFE_DEPARTAMENTO**, `FAI-XXXXXX` → `WS-XXXXXX`, `400 FORMULARIO_INVALIDO` → `422 VALIDACAO` com `details`. Entidades em `TAXONOMIA.md` §1.8 (`ApprovalRequest`) e §1.9 (`VerificationPolicy`), ambas **proposta**. O cadastro em si (RadioCard, campos por tipo, `PendingUpload`) está no RF1.

### 7.1 Critérios de aceite (RF28.CA09–CA17)

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF28.CA09** (CA a confirmar) | Dado um `ApprovalRequest`, então ele referencia a `VerificationPolicy` vigente (`policyVersion`), traz o **checklist** de critérios obrigatórios e complementares do tipo (`criteriaJson`, com o resultado automático `OK`/`FALHA`/`ANALISTA` e a marcação do admin) e aceita as decisões `APROVAR`, `AJUSTES` e `RECUSAR`; `ApprovalRequest.status` passa a PENDENTE · **AJUSTES** · APROVADO · **RECUSADO**. |
| **RF28.CA10** (CA a confirmar) | Dado a decisão do ADMIN, então `AJUSTES` e `RECUSAR` exigem **pelo menos um motivo padronizado** (`reasonsJson`; senão `422 VALIDACAO details.reasons`) e `APROVAR` exige todos os critérios obrigatórios marcados (senão `409 CRITERIOS_PENDENTES`, Q-70). A observação livre tem até 500 caracteres e nunca leva dado sensível. |
| **RF28.CA11** (CA a confirmar) | Dado `AJUSTES` ou `RECUSADO`, então a pessoa corrige pela **central de validação** (`/settings?tab=validacao`: status, linha do tempo, critérios, motivos e formulário de reenvio) e reenvia (`POST /api/me/validation/resubmit`); o cadastro conta como 1º envio e há **no máximo 5**; reenvio inválido não grava nada; esgotado o limite, só o ADMIN reabre (`SUSPENDED` com motivo). |
| **RF28.CA12** (CA a confirmar) | Dado o pedido, então o prazo é contado em **dias úteis** (proposta: 3 para a 1ª análise, 2 para reanálise, 30 dias corridos para a pessoa responder a `AJUSTES`; Q-71) a partir de `emailConfirmedAt`; **antes da confirmação do e-mail a conta não entra na fila**. |
| **RF28.CA13** (CA a confirmar) | Dado o ADMIN, então ele **não decide o próprio perfil** (`403 ACESSO_NEGADO`) e cada abertura de documento de verificação (`GET /api/admin/approvals/{id}/documents/{kind}`) responde com `Cache-Control: no-store`, passa por `OwnMedia` (`restricted/pending/`) e gera `AuditLog APPROVAL_DOCUMENT_VIEWED`. |
| **RF28.CA14** (CA a confirmar) | Dado um envio, reenvio ou decisão, então as notificações no app e por e-mail (admins no envio; a pessoa na decisão) saem **depois do commit** (AFTER_COMMIT), no idioma da pessoa. |
| **RF28.CA15** (CA a confirmar) | Dado o modal "Verificar" de um critério de controle (`SITE_OFICIAL`, `ATO_NOMEACAO`), então ele mostra o **link oficial** e o **código de verificação** `WS-` + 6 hex (derivado do `userId`, visível só ao dono na central), com os botões "Confere" e "Não confere → motivo"; o critério `REPRESENTACAO` é marcado automaticamente quando o domínio do e-mail é o mesmo do `officialSite` e não está na lista de e-mails gratuitos. |
| **RF28.CA16** (CA a confirmar, Q-65, Q-66) | Dado `APROVADO`, então para EMPRESA o sistema **cria a `Company`** com `ownerUserId` = a pessoa, `legalName`, `cnpj` e `websiteUrl` vindos da extensão; para CHEFE exige antes a **confirmação do chefe atual ou do dono da EMPRESA** (`confirmedBy`) e então define `Department.headUserId` e abre `DepartmentMembership CHEFE`. `User.status → ACTIVE`, `verified = true`. |
| **RF28.CA17** (CA a confirmar) | Dado o tipo do perfil, então valem os critérios e motivos da tabela §7.3, carregados da política e não fixos nas telas; motivos têm texto i18n (pt-BR, en, es). |

### 7.2 Máquina de estados do `ApprovalRequest` (proposta)

```mermaid
stateDiagram-v2
  direction LR
  state "PENDENTE" as PENDENTE
  state "AJUSTES" as AJUSTES
  state "APROVADO" as APROVADO
  state "RECUSADO" as RECUSADO
  state "ESGOTADO (só ADMIN reabre)" as ESGOTADO

  [*] --> PENDENTE : e-mail confirmado · attempts = 1 · dueAt = emailConfirmedAt + 3 dias úteis
  PENDENTE --> AJUSTES : ADMIN pede ajustes com motivo (CA10) · pessoa tem 30 dias
  PENDENTE --> APROVADO : ADMIN aprova com todos os obrigatórios marcados (CA10, CA16)
  PENDENTE --> RECUSADO : ADMIN recusa com motivo (CA10)
  AJUSTES --> PENDENTE : reenvio válido · attempts + 1 (até 5) · dueAt = submittedAt + 2 dias úteis (CA11, CA12)
  RECUSADO --> PENDENTE : reenvio com novas evidências · attempts + 1 (até 5)
  AJUSTES --> RECUSADO : 30 dias sem resposta
  AJUSTES --> ESGOTADO : attempts = 5
  RECUSADO --> ESGOTADO : attempts = 5
  ESGOTADO --> PENDENTE : ADMIN reabre por contato direto
  APROVADO --> [*]

  note right of PENDENTE
    User.status = PENDING_VALIDATION · só leitura
    403 PERFIL_EM_VALIDACAO (Guard.requireApprovedProfile)
    409 CRITERIOS_PENDENTES se aprovar com obrigatório em aberto
    422 VALIDACAO details.reasons se recusar ou pedir ajustes sem motivo
    403 ACESSO_NEGADO se o ADMIN for o próprio titular
  end note
  note right of APROVADO
    EMPRESA: cria Company{ownerUserId} (Q-65)
    CHEFE: exige confirmedBy (Q-66) · Department.headUserId
    User.status = ACTIVE · verified = true
  end note
  note right of ESGOTADO
    User.status = SUSPENDED com motivo
  end note
```

### 7.3 Critérios e motivos propostos (carregados de `VerificationPolicy` v1.0)

**EMPRESA (órgão)**

| Código | Critério | Como é conferido | Obrigatório |
|---|---|---|---|
| `EMAIL_CONFIRMADO` | e-mail da conta confirmado | automático | sim |
| `CNPJ_VALIDO` | 14 dígitos, não repetidos, dígitos verificadores corretos | automático | sim |
| `CNPJ_ATIVO` | situação ativa na Receita Federal e razão social igual à informada | analista (consulta pública) | sim |
| `ORGAO_PUBLICO` | natureza jurídica de órgão ou entidade da administração pública (ou órgão convidado pela SECID) | analista | sim |
| `SITE_OFICIAL` | `officialSite` aberto pelo analista, no domínio institucional, com o mesmo nome do órgão; `@perfil` recusado no cadastro | automático (link) + analista | sim |
| `REPRESENTACAO` | quem cadastrou representa o órgão: e-mail no domínio do site **ou** código `WS-xxxxxx` publicado numa página do site **ou** documento de representação legível (ato de nomeação, portaria) em `restricted/` | automático (domínio) + analista | sim |
| `SEM_CONFLITO` | não repete `Company` já aprovada nem imita órgão de terceiro | automático (nome/CNPJ aprovado) + analista | sim |
| `PERFIL_COMPLETO` | logo/brasão, descrição e contato institucional | automático | não |

**CHEFE_DEPARTAMENTO**

| Código | Critério | Como é conferido | Obrigatório |
|---|---|---|---|
| `EMAIL_CONFIRMADO` | e-mail da conta confirmado | automático | sim |
| `ORGAO_EXISTENTE` | `companyId` aponta para `Company` aprovada | automático | sim |
| `ATO_NOMEACAO` | `appointmentLink` aberto pelo analista no Diário Oficial, nomeando a pessoa para a chefia do departamento informado | automático (link) + analista | sim |
| `NOME_CONFERE` | nome civil do cadastro igual ao do ato | analista | sim |
| `CONFIRMACAO_INSTITUCIONAL` | chefe atual do departamento ou dono da EMPRESA confirma (`confirmedBy`, Q-66) | automático (confirmação registrada) | sim |
| `SEM_CONFLITO` | departamento sem outro chefe pendente ou aprovado para o mesmo período | automático + analista | sim |
| `PERFIL_COMPLETO` | foto, cargo e descrição do departamento | automático | não |

**Motivos padronizados** (texto mostrado à pessoa fica no i18n): `DOCUMENTO_ILEGIVEL` · `DOCUMENTO_DIVERGENTE` · `CNPJ_INVALIDO_OU_INATIVO` · `NAO_E_ORGAO_PUBLICO` · `SITE_NAO_VERIFICAVEL` · `REPRESENTACAO_NAO_COMPROVADA` · `ATO_NOMEACAO_NAO_LOCALIZADO` · `ORGAO_INEXISTENTE` · `CONFIRMACAO_PENDENTE` · `POSSIVEL_IMPERSONACAO` · `DADOS_INCOMPLETOS` · `VIOLACAO_DOS_TERMOS` · `OUTRO` (exige observação).

Endpoints propostos: `GET /api/admin/approvals` (fila, filtros por status e prazo) · `GET /api/admin/approvals/{id}` (dossiê com checklist e verificações automáticas) · `POST /api/admin/approvals/{userId}` (= `{decision, reasons, checklist, note}`; CA01) · `GET /api/admin/approvals/{id}/documents/{kind}` · `GET /api/me/validation` · `POST /api/me/validation/resubmit` · `POST /api/departments/{id}/head-confirmations/{approvalId}` (chefe atual ou dono da EMPRESA). Auditoria: `APPROVAL_SUBMITTED`, `APPROVAL_DECIDED`, `APPROVAL_DOCUMENT_VIEWED`, `APPROVAL_CONFIRMED` (a acrescentar em `AuditActions`, que hoje tem só os códigos de RF1–RF3).

Tela/aba: `/companies` (esqueleto em `app/(shell)/companies/page.tsx`) · `/companies/[slug]` (esqueleto em `app/(shell)/companies/[slug]/page.tsx`) · `/departments/[slug]` (esqueleto em `app/(shell)/departments/[slug]/page.tsx`) · `/recognitions` (esqueleto em `app/(shell)/recognitions/page.tsx`) · `/issuer/dashboard` (esqueleto em `app/(shell)/issuer/dashboard/page.tsx`) · `/companies/[slug]/manage/departments` (esqueleto em `app/(shell)/companies/[slug]/manage/departments/page.tsx`) · `/departments/[slug]/team` (esqueleto em `app/(shell)/departments/[slug]/team/page.tsx`) · `/seals/review` (esqueleto em `app/(shell)/seals/review/page.tsx`) · `/curation` (esqueleto em `app/(shell)/curation/page.tsx`) · `/admin` (esqueleto em `app/(shell)/admin/page.tsx`)
