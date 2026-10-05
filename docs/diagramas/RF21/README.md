# RF21 — Utilizar a mesa de trabalho digital de meu perfil
**HU:** HU21 · **Sprint (board Work Station):** a confirmar (card renomeado em 2026-10-02; origem RF22 Mesa de Trabalho = Sprint 4) · **Equivalente FAI:** RF27 Meu Quarto (Ilha central, Smart Mirror, skins) + RF15 Editor Canvas 2D · **Aba/rota:** Mesa de Trabalho (`/desk`, sub-abas **Minha mesa** · **Mesa da equipe**); a Mesa de um **projeto** continua no RF22 (`/projects/[id]/edit`) e a **Mesa do DECIA** na sessão (`docs/produto/DECIA_SESSAO_E_MESA.md` §C)
**Critérios de aceite cobertos:** RF21.CA01 … RF21.CA07 — corpo do card vazio: CAs derivados do título + HU21 + RF22 (quadro / linha do tempo / canvas, skins, colaboração ≤ 3 s, versões) + Mesa do DECIA §C (mesma família visual); todos marcados "(CA a confirmar)"

> **HU21** — COMO usuário pertencente a alguma empresa ou organização POSSO acessar a mesa de trabalho de minha equipe PARA visualizar de forma estratégica, formal e coerente as metas diárias, semanais e mensais de minha empresa, além de entender o que meus colegas de equipe estão produzindo.

A **Mesa de Trabalho do perfil** é o painel pessoal/da equipe que reúne, sobre a mesma família visual do RF22 (texturas `DeskSkin` PAPEL · CORTIÇA · BLUEPRINT · PAPEL_TIMBRADO, post-its, cartões), **widgets** com três horizontes: **diário** (Tarefa do Dia e HSE, `DailyTask` RF44), **semanal** (`WeekPlan`/`WeekPlanDay`, prazos ≤ 7 dias) e **mensal** (eixos do Plano Anual do departamento `PlanAxis.completedPct`, metas coletivas `CollectiveGoal.progress`, destaques `Highlight`). Tem duas sub-abas: **Minha mesa** (layout em `UserPreferences.dashboardLayoutJson`, skin de `UserPreferences.deskSkin`/`UserSkin`) e **Mesa da equipe** (um canvas por departamento, compartilhado pelos membros com propagação ≤ 3 s via Redis pub/sub, projetos da equipe por fase, linha do tempo de marcos, atividade dos colegas via `TimelineEvent`/`MuralEntry`). Entidades novas **(propostas)**: `TeamDesk` (`id · departmentId · layoutJson · deskSkin · version · updatedBy · updatedAt`) e `DeskNote` (`id · deskScope (PESSOAL · EQUIPE) · scopeId · authorId · contentMd · color · canvasX · canvasY · canvasScale · canvasRotation · canvasLayer · pinned · active`). Três visões do mesmo estado — **Quadro** (projetos da equipe por `ProjectPhase`), **Linha do tempo** (marcos `nextMilestoneAt`, `dueAt`, `legalDueAt`, `votingDeadlineAt`) e **Canvas** (widgets e post-its com x/y/escala/rotação/camada). Abrir um projeto leva à Mesa do projeto (RF22); abrir uma sessão leva à Mesa do DECIA. Limites LGPD: HSE nominal e Tarefa do Dia só do próprio usuário; a equipe vê agregados (RF45.CA10, `ABAS_POR_PERFIL.md` §7.b).

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF21.CA01** (CA a confirmar) | Dado um usuário autenticado com lotação (`DepartmentMembership` vigente), quando abre `/desk`, então vê as sub-abas **Minha mesa** e **Mesa da equipe** (do departamento em que está lotado) com a textura `DeskSkin` das suas preferências ou de uma `UserSkin` comprada (RF38/RF42); conta EMPRESA vê a Mesa de cada departamento em **leitura**; sem lotação, só Minha mesa. |
| **RF21.CA02** (CA a confirmar) | Dado a Mesa, quando carrega, então mostra widgets nos três horizontes: **diário** — Tarefa do Dia + HSE previsto × realizado (RF44, só do próprio usuário); **semanal** — semana planejada `WeekPlanDay` e prazos ≤ 7 dias; **mensal** — eixos do Plano Anual do departamento (`PlanAxis.completedPct`, `aggregatedRisk`), metas coletivas abertas (`CollectiveGoal.progress`) e Destaque do mês (`Highlight`); cada widget linka ao RF de origem. |
| **RF21.CA03** (CA a confirmar) | Dado a Mesa da equipe, quando abro a visão **Quadro**, então vejo os projetos do departamento (visibilidade DEPARTAMENTO/EMPRESA/PUBLICA) agrupados por `ProjectPhase` com responsável, prazo e `hasBlockingPending`; a visão **Linha do tempo** mostra marcos dos próximos 30 dias; o painel **Atividade dos colegas** lista `TimelineEvent`/`MuralEntry` do departamento (projetos publicados, decisões validadas, chancelas, reconhecimentos) — nunca itens PRIVADA nem HSE/Tarefa do Dia de terceiros. |
| **RF21.CA04** (CA a confirmar) | Dado a visão **Canvas**, quando arrasto, redimensiono ou giro um widget ou post-it (`DeskNote`) e troco a skin, então a posição (`canvasX/Y/Scale/Rotation/Layer`) persiste em `UserPreferences.dashboardLayoutJson` (Minha mesa) ou `TeamDesk.layoutJson` (Mesa da equipe) sem gerar versão; trocar de visão reprojeta o mesmo estado sem perder dados (como RF22.CA03). |
| **RF21.CA05** (CA a confirmar) | Dado dois membros editando a Mesa da equipe, quando um move um post-it ou cria uma nota, então o outro recebe a alteração em ≤ 3 s (Redis pub/sub `desk:team:{departmentId}` + WebSocket/polling), com presença visível e conflito resolvido por **último-vence com aviso** (`CONFLITO_ULTIMO_VENCE`, `TeamDesk.version`); só membros do departamento e o chefe escrevem — demais `403 ACESSO_NEGADO`. |
| **RF21.CA06** (CA a confirmar) | Dado um card de projeto na Mesa, quando clico "abrir na Mesa do projeto", então vou para RF22 (`/projects/[id]/edit`) e qualquer alteração estrutural gera `ProjectVersion` (RF22.CA02); "abrir sessão DECIA" leva à Mesa do DECIA; as ações sociais inline seguem RF18/RF19; o widget Tarefa do Dia aceita o feedback do RF44 direto da Mesa. |
| **RF21.CA07** (CA a confirmar) | Dado a Mesa da equipe, quando o chefe (`Department.headUserId`) fixa (`pinned`) uma nota ou define a skin padrão, então ela fica no topo para todos; a Mesa guarda `version` e permite "restaurar layout padrão"; exportar a Mesa em PDF/PNG roda como `PipelineJob EXPORT_PDF` (RF22.CA07). |

| Widget | Horizonte | Entidades lidas | RF origem | Visível na Mesa da equipe? |
|---|---|---|---|---|
| Tarefa do Dia + HSE previsto × realizado | diário | `DailyTask`, `EfficiencyScoreSnapshot` | RF44 | só a própria; equipe vê agregados (quantos CONCLUI/ADIEI/BLOQUEADA/DELEGUEI) |
| Semana planejada + prazos ≤ 7 dias | semanal | `WeekPlan`, `WeekPlanDay`, `TaskItem.dueAt/legalDueAt`, `ProjectTask.dueAt` | RF44, RF41 | prazos da equipe sim (dado operacional) |
| Eixos do Plano Anual | mensal | `AnnualPlan` (scope DEPARTAMENTO/EMPRESA), `PlanAxis` | RF24 | sim |
| Metas coletivas | mensal | `CollectiveGoal`, `GoalParticipant` | RF35 | sim |
| Destaque do mês | mensal | `Highlight` | RF35 | sim |
| Projetos da equipe por fase (Quadro) | contínuo | `ProjectScheme`, `ProjectTask` | RF5/RF22 | sim (visibilidade ≥ DEPARTAMENTO) |
| Marcos (Linha do tempo) | 30 dias | `ProjectScheme.nextMilestoneAt`, `ReopenRequest.votingDeadlineAt`, `Meeting.ratificationDeadlineAt` | RF22, RF14, RF37 | sim |
| Atividade dos colegas | contínuo | `TimelineEvent`, `MuralEntry` | RF27 | sim |
| Post-its (`DeskNote`, proposta) | livre | `DeskNote` | RF21 | sim, com `pinned` pelo chefe |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_mesa {
  class TeamDesk {
    <<entity>>
    +id: UUID
    +departmentId: UUID
    +layoutJson: JSON widgets e posições
    +deskSkin: DeskSkin
    +version: long otimista
    +updatedBy: UUID
    +updatedAt: Instant
  }
  class DeskNote {
    <<entity>>
    +id: UUID
    +deskScope: String PESSOAL EQUIPE
    +scopeId: UUID userId ou departmentId
    +authorId: UUID
    +contentMd: String
    +color: String
    +canvasX: BigDecimal
    +canvasY: BigDecimal
    +canvasScale: BigDecimal
    +canvasRotation: BigDecimal
    +canvasLayer: int
    +pinned: boolean chefe
    +active: boolean
  }
  class UserPreferences {
    <<entity>>
    +userId: UUID
    +deskSkin: DeskSkin
    +dashboardLayoutJson: JSON Minha mesa
    +wipLimit: int
  }
  class UserSkin {
    <<entity>>
    +userId: UUID
    +skinKind: String MESA
    +skinKey: String
    +acquiredVia: String
  }
}

namespace ws_domain_widgets {
  class DailyTask {
    <<entity>>
    +userId: UUID
    +taskDate: LocalDate
    +taskId: UUID
    +hsePredictedJson: JSON
    +hseRealizedJson: JSON
    +feedback: DailyFeedback
  }
  class WeekPlan {
    <<entity>>
    +userId: UUID
    +weekStart: LocalDate
    +streak: int
  }
  class WeekPlanDay {
    <<entity>>
    +weekPlanId: UUID
    +date: LocalDate
    +taskId: UUID
    +loadPct: int
  }
  class AnnualPlan {
    <<entity>>
    +id: UUID
    +scope: PlanScope
    +departmentId: UUID
    +exerciseYear: int
    +status: PlanStatus
  }
  class PlanAxis {
    <<entity>>
    +planId: UUID
    +position: int
    +name: String
    +completedPct: BigDecimal
    +nearestDueAt: LocalDate
    +aggregatedRisk: RiskLevel
  }
  class CollectiveGoal {
    <<entity>>
    +id: UUID
    +departmentId: UUID
    +title: String
    +progress: BigDecimal
    +periodTo: LocalDate
    +status: GoalStatus
  }
  class Highlight {
    <<entity>>
    +departmentId: UUID
    +monthKey: String
    +targetType: String
    +targetId: UUID
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +departmentId: UUID
    +title: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +visibility: Visibility
    +nextMilestoneAt: LocalDate
    +hasBlockingPending: boolean
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +responsibleId: UUID
    +dueAt: LocalDate
    +isCritical: boolean
  }
  class TimelineEvent {
    <<entity>>
    +userId: UUID
    +at: Instant
    +eventType: String
    +targetType: TargetType
    +targetId: UUID
  }
  class MuralEntry {
    <<entity>>
    +departmentId: UUID
    +kind: MuralKind
    +targetId: UUID
    +at: Instant
  }
}

namespace ws_domain_identidade {
  class Department {
    <<entity>>
    +id: UUID
    +companyId: UUID
    +acronym: String
    +headUserId: UUID
  }
  class DepartmentMembership {
    <<entity>>
    +userId: UUID
    +departmentId: UUID
    +endedAt: Instant
  }
  class PipelineJob {
    <<entity>>
    +type: String EXPORT_PDF
    +targetType: String TEAM_DESK
    +status: PipelineJobStatus
  }
}

namespace ws_domain_enums {
  class DeskSkin {
    <<enum>>
    PAPEL
    CORTICA
    BLUEPRINT
    PAPEL_TIMBRADO
  }
  class DeskView {
    <<enum>>
    QUADRO
    LINHA_DO_TEMPO
    CANVAS
  }
  class GoalStatus {
    <<enum>>
    ABERTA
    ATINGIDA
    EXPIRADA
  }
  class ProjectPhase {
    <<enum>>
    DEMANDA
    PLANEJAMENTO
    ELABORACAO
    ANALISE
    APROVACAO
    EXECUCAO
    ENCERRAMENTO
  }
}

namespace ws_application {
  class ProfileDeskService {
    <<service>>
    +loadMyDesk(userId, view) DeskState widgets diário semanal mensal
    +loadTeamDesk(viewerId, departmentId, view) DeskState
    +canEditTeamDesk(userId, departmentId) boolean membro vigente ou chefe
    +saveMyLayout(userId, layoutJson)
    +saveTeamLayout(userId, departmentId, layoutJson, baseVersion) ChangeResult
    +upsertNote(userId, DeskNote) DeskNote
    +pinNote(chefeId, noteId, pinned)
    +setSkin(userId, scope, skinKey)
    +resetTeamLayout(chefeId, departmentId)
    +requestExport(userId, departmentId, format) PipelineJob
  }
  class DeskWidgetService {
    <<service>>
    +daily(userId) DailyTask só o próprio
    +dailyAggregates(departmentId) Map sem HSE nominal
    +weekly(userId, departmentId) WeekPlanDay e prazos 7 dias
    +monthly(departmentId) PlanAxis CollectiveGoal Highlight
    +teamBoard(viewer, departmentId) Map~ProjectPhase, List~ProjectScheme~~
    +milestones(departmentId, days 30) List~Milestone~
    +colleaguesActivity(viewer, departmentId, page) List~TimelineEvent~
  }
  class AccessPolicy {
    <<service>>
    +isDeptMember(user, departmentId) boolean
    +isDeptHead(user, departmentId) boolean
    +visibilityFilter(viewer) Visibility[] nunca PRIVADA de terceiros
  }
  class CollaborationPort {
    <<port>>
    +publish(channel desk team departmentId, ChangeEvent)
    +subscribe(channel) Stream~ChangeEvent~
    +presence(channel) List~UUID~
  }
  class TimelinePort {
    <<port>>
    +readDepartment(departmentId, page) List~TimelineEvent~
  }
  class PdfRenderPort {
    <<port>>
    +renderDesk(DeskState) byte
  }
}

namespace ws_web {
  class ProfileDeskController {
    <<controller>>
    +GET_api_desk_me(view)
    +GET_api_desk_team_departmentId(view)
    +PUT_api_desk_me_layout(body)
    +PUT_api_desk_team_departmentId_layout(body, If_Match)
    +POST_api_desk_notes(body)
    +PATCH_api_desk_notes_noteId(body)
    +PUT_api_desk_skin(scope, skinKey)
    +POST_api_desk_team_departmentId_reset()
    +POST_api_desk_team_departmentId_export(format)
  }
  class DeskRealtimeController {
    <<controller>>
    +WS_ws_desk_team_departmentId()
    +GET_api_desk_team_departmentId_changes_since(ts)
  }
}

namespace ws_infrastructure {
  class RedisPubSubAdapter {
    <<adapter>>
  }
  class CassandraTimelineAdapter {
    <<adapter>>
  }
  class PdfRendererAdapter {
    <<adapter>>
  }
  class MySqlDeskAdapter {
    <<adapter>>
  }
}

TeamDesk "1" --> "1" Department : departmentId
TeamDesk --> DeskSkin
TeamDesk "1" --> "*" DeskNote : deskScope EQUIPE
UserPreferences "1" --> "*" DeskNote : deskScope PESSOAL
UserPreferences --> DeskSkin
UserSkin "*" --> "1" DeskSkin : skinKey
Department "1" --> "*" DepartmentMembership : membros vigentes editam
AnnualPlan "1" --> "*" PlanAxis
WeekPlan "1" --> "*" WeekPlanDay
ProjectScheme "1" --> "*" ProjectTask
ProjectScheme --> ProjectPhase : currentPhase Quadro
CollectiveGoal --> GoalStatus
MuralEntry "1" --> "*" TimelineEvent : fan-out
PipelineJob ..> TeamDesk : export

ProfileDeskController ..> ProfileDeskService
DeskRealtimeController ..> CollaborationPort
ProfileDeskService ..> DeskWidgetService
ProfileDeskService ..> AccessPolicy
ProfileDeskService ..> CollaborationPort : publish ChangeEvent
ProfileDeskService ..> PdfRenderPort
ProfileDeskService ..> TeamDesk
ProfileDeskService ..> DeskNote
ProfileDeskService ..> UserPreferences : dashboardLayoutJson deskSkin
DeskWidgetService ..> DailyTask
DeskWidgetService ..> WeekPlanDay
DeskWidgetService ..> PlanAxis
DeskWidgetService ..> CollectiveGoal
DeskWidgetService ..> Highlight
DeskWidgetService ..> ProjectScheme
DeskWidgetService ..> TimelinePort
RedisPubSubAdapter ..|> CollaborationPort
CassandraTimelineAdapter ..|> TimelinePort
PdfRendererAdapter ..|> PdfRenderPort
MySqlDeskAdapter ..> TeamDesk : team_desks proposta
MySqlDeskAdapter ..> DeskNote : desk_notes proposta

note for TeamDesk "tabela team_desks (proposta) · 1 por departamento · layoutJson com widgets e posições · version otimista, último-vence com aviso (CA04, CA05, CA07)"
note for DeskNote "tabela desk_notes (proposta) · post-it pessoal ou da equipe · canvasX/Y/Scale/Rotation/Layer como ProjectTask (RF22.CA03) · pinned só pelo chefe (CA07)"
note for DeskWidgetService "daily só do próprio usuário · dailyAggregates sem HSE nominal (RF45.CA10) · teamBoard com visibilityFilter, nunca PRIVADA de terceiros (CA02, CA03)"
note for ProfileDeskService "Minha mesa persiste em UserPreferences.dashboardLayoutJson · Mesa da equipe em TeamDesk.layoutJson · canEditTeamDesk = membro vigente OR headUserId (CA01, CA05)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário · Colega · Chefe"]
    U1["Abre /desk"]
    U2["Escolhe sub-aba Minha mesa ou Mesa da equipe"]
    U3["Troca de visão: Quadro / Linha do tempo / Canvas"]
    U4["Arrasta, redimensiona, gira widget ou post-it; cria nota; troca skin"]
    U5["Registra feedback da Tarefa do Dia no widget"]
    U6["Abre projeto na Mesa do projeto (RF22) ou sessão na Mesa do DECIA"]
    U7["Chefe fixa nota, define skin padrão, restaura layout ou exporta"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Carrega DeskState único; textura DeskSkin das preferências ou UserSkin"]
    W2["Troca de visão só reprojeta o mesmo estado"]
    W3["Widgets diário · semanal · mensal; Quadro por fase; Linha do tempo 30 dias; Atividade dos colegas"]
    W4["Envia PUT layout com If-Match = version local"]
    W5["Aplica ChangeEvent via WS ou polling ≤ 3 s; toast se CONFLITO_ULTIMO_VENCE; avatares de presença"]
    W6["Modo somente leitura (EMPRESA, outro departamento)"]
    W7["Navega para /projects/[id]/edit ou /decia/[id]"]
    W8["Aguarda job e oferece download PDF/PNG"]
  end

  subgraph LA["ws-application"]
    A1{"Usuário tem DepartmentMembership vigente?"}
    A2["Só Minha mesa"]
    A3["Minha mesa + Mesa da equipe do departamento"]
    A4["ProfileDeskService.loadMyDesk / loadTeamDesk"]
    A5["DeskWidgetService: daily (só o próprio) · dailyAggregates (sem HSE nominal) · weekly · monthly · teamBoard com visibilityFilter · milestones 30 dias · colleaguesActivity"]
    A6{"canEditTeamDesk? membro vigente ou chefe"}
    A7["403 ACESSO_NEGADO em qualquer escrita na Mesa da equipe"]
    A8{"Escopo da alteração"}
    A9["saveMyLayout → UserPreferences.dashboardLayoutJson"]
    A10{"baseVersion == TeamDesk.version?"}
    A11["Aplica por último-vence e marca warning CONFLITO_ULTIMO_VENCE"]
    A12["saveTeamLayout / upsertNote → TeamDesk.version + 1; CollaborationPort.publish desk:team:{departmentId}"]
    A13["DailyTaskService.registerFeedback (RF44)"]
    A14{"ator é Department.headUserId?"}
    A15["pinNote / setSkin padrão / resetTeamLayout"]
    A16["requestExport → PipelineJob EXPORT_PDF PENDENTE → 202 jobId; worker PdfRenderPort.renderDesk"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: user_preferences, user_skins, department_memberships, departments")]
    P2[("MySQL: daily_tasks, hse_snapshots, week_plans, week_plan_days, annual_plans, plan_axes, collective_goals, highlights, project_schemes, project_tasks, mural_entries")]
    P3[("Cassandra: timeline_by_user — atividade dos colegas")]
    P4[("MySQL: team_desks (proposta), desk_notes (proposta)")]
    P5[("Redis: pub/sub desk:team:{departmentId}, presença")]
    P6[("MySQL: pipeline_jobs · S3: PDF/PNG")]
  end

  U1 --> A1
  A1 -->|"não"| A2 --> A4
  A1 -->|"sim"| A3 --> U2 --> A4
  A4 --> P1
  A4 --> A5 --> P2
  A5 --> P3
  A5 --> W1 --> W3
  W3 --> U3 --> W2
  W3 --> U4 --> A8
  A8 -->|"Minha mesa"| A9 --> P1
  A8 -->|"Mesa da equipe"| A6
  A6 -->|"não"| W6 -.->|"tentativa de escrita"| A7
  A6 -->|"sim"| W4 --> A10
  A10 -->|"não"| A11 --> A12
  A10 -->|"sim"| A12
  A12 --> P4
  A12 --> P5 --> W5
  W3 --> U5 --> A13 --> P2
  W3 --> U6 --> W7
  W3 --> U7 --> A14
  A14 -->|"não"| A7
  A14 -->|"sim, fixar/skin/restaurar"| A15 --> P4
  A15 --> A12
  A14 -->|"sim, exportar"| A16 --> P6
  A16 --> W8

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  class A7 err
  class A11,W6 warn
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário A
  actor B as Colega B
  actor CH as Chefe
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant DB as Repository/MySQL
  participant CS as Cassandra
  participant R as Redis
  participant S3 as S3
  participant DE as DomainEvents (AFTER_COMMIT)

  U->>NX: abre /desk (CA01)
  NX->>C: GET /api/desk/me?view=CANVAS
  C->>S: ProfileDeskService.loadMyDesk(userId, CANVAS)
  S->>DB: user_preferences (deskSkin, dashboardLayoutJson, wipLimit) + user_skins MESA + department_memberships vigente
  S->>DB: DeskWidgetService.daily → daily_tasks hoje + hse_snapshots (só o próprio) (CA02)
  S->>DB: weekly → week_plan_days da semana + tasks e project_tasks com dueAt ≤ 7 dias
  S->>DB: monthly → plan_axes do plano DEPARTAMENTO vigente, collective_goals ABERTA, highlights do mês
  S-->>C: 200 DeskState {skin, layout, widgets diário semanal mensal, teamDeskAvailable true}
  C-->>NX: 200
  NX-->>U: Minha mesa com textura PAPEL_TIMBRADO e widgets

  U->>NX: sub-aba Mesa da equipe, visão Quadro (CA03)
  NX->>C: GET /api/desk/team/UTS?view=QUADRO
  C->>S: ProfileDeskService.loadTeamDesk(viewerId, UTS, QUADRO)
  S->>S: AccessPolicy.isDeptMember OR isDeptHead OR conta EMPRESA (leitura)
  alt viewer de outro departamento sem ser EMPRESA
    S-->>C: 403 ACESSO_NEGADO
    C-->>NX: 403
  else permitido
    S->>DB: team_desks WHERE departmentId = UTS (layoutJson, deskSkin, version) + desk_notes EQUIPE
    S->>DB: teamBoard → project_schemes WHERE departmentId = UTS AND visibility IN (DEPARTAMENTO, EMPRESA, PUBLICA) GROUP BY currentPhase
    S->>DB: milestones 30 dias → nextMilestoneAt, project_tasks.dueAt, reopen_requests.votingDeadlineAt, meetings.ratificationDeadlineAt
    S->>DB: dailyAggregates → COUNT feedback por tipo, HSE médio (sem nominal)
    S->>CS: timeline_by_user dos membros de UTS ORDER BY at DESC LIMIT 20 (atividade dos colegas)
    S->>R: presence desk:team:UTS
    S-->>C: 200 DeskState {editable true, version 7, board por fase, milestones, aggregates, activity, notes, presence}
    C-->>NX: 200
    NX-->>U: Quadro por fase, Linha do tempo e Atividade dos colegas (trocar visão reprojeta o mesmo estado, CA04)
    NX->>C: WS /ws/desk/team/UTS
    C->>R: SUBSCRIBE desk:team:UTS
  end

  U->>NX: visão Canvas, cria post-it "Reunião de alinhamento sexta" e move para x 420, y 160 (CA04)
  NX->>C: POST /api/desk/notes {deskScope EQUIPE, scopeId UTS, contentMd, color, canvasX, canvasY}
  C->>S: ProfileDeskService.upsertNote(userId, note)
  S->>S: canEditTeamDesk(userId, UTS)
  S->>DB: INSERT desk_notes (EQUIPE, UTS, author A, canvas*)
  S->>R: PUBLISH desk:team:UTS NoteCreated {noteId, author A}
  S-->>C: 201 DeskNote
  C-->>NX: 201
  R-->>C: mensagem no canal
  C-->>B: WS push em até 3 s (CA05)
  B->>B: aplica NoteCreated no Canvas

  B->>NX: move o widget Metas do mês com If-Match 7
  NX->>C: PUT /api/desk/team/UTS/layout {layoutJson} If-Match 7
  C->>S: ProfileDeskService.saveTeamLayout(B, UTS, layoutJson, baseVersion 7)
  S->>DB: SELECT version FROM team_desks WHERE departmentId = UTS
  opt version atual 8 diferente de baseVersion 7 (CA05)
    S->>S: aplica mesmo assim, warning CONFLITO_ULTIMO_VENCE
  end
  S->>DB: UPDATE team_desks SET layoutJson, version 9, updatedBy B
  S->>R: PUBLISH desk:team:UTS LayoutChanged {version 9}
  S-->>C: 200 {version 9, warnings [CONFLITO_ULTIMO_VENCE]?}
  C-->>NX: 200
  C-->>U: WS push LayoutChanged, toast se conflito

  U->>NX: no widget Tarefa do Dia marca CONCLUI 3h (CA06)
  NX->>C: POST /api/daily-tasks/today/feedback {CONCLUI, actualHours 3}
  C->>S: DailyTaskService.registerFeedback (RF44)
  S->>DB: UPDATE daily_tasks + INSERT hse_snapshots
  S-->>C: 200
  U->>NX: clica abrir na Mesa do projeto no card P4
  NX-->>U: navega para /projects/P4/edit (RF22 — alterações estruturais geram ProjectVersion)

  CH->>NX: fixa a nota de A no topo e exporta a Mesa em PDF (CA07)
  NX->>C: PATCH /api/desk/notes/{noteId} {pinned true}
  C->>S: ProfileDeskService.pinNote(chefeId, noteId, true)
  S->>S: AccessPolicy.isDeptHead(chefe, UTS)
  alt ator não é headUserId
    S-->>C: 403 ACESSO_NEGADO
  else chefe
    S->>DB: UPDATE desk_notes SET pinned true
    S->>R: PUBLISH desk:team:UTS NotePinned
    S-->>C: 200
  end
  NX->>C: POST /api/desk/team/UTS/export?format=PDF
  C->>S: ProfileDeskService.requestExport(chefe, UTS, PDF)
  S->>DB: INSERT pipeline_jobs (EXPORT_PDF, targetType TEAM_DESK, PENDENTE)
  S-->>C: 202 {jobId}
  DE->>S: worker: PdfRenderPort.renderDesk(DeskState)
  S->>S3: MediaStoragePort.put(pdf)
  S->>DB: UPDATE pipeline_jobs SET status OK, mediaObjectId
  NX->>C: GET /api/jobs/{jobId}
  C-->>NX: 200 {status OK, downloadUrl presign}
  NX-->>CH: download do PDF da Mesa
```

## 4. Máquina de estados

A Mesa do perfil não tem entidade com `status`: `TeamDesk` e `DeskNote` (propostas) só versionam o layout. Os ciclos relevantes são (1) a **visão** da Mesa (`DeskView`, região concorrente como em RF22.CA03) com o **modo de edição** da Mesa da equipe; (2) a **`CollectiveGoal.status`** (`GoalStatus`), estado dos widgets mensais que a HU21 pede ("metas diárias, semanais e mensais"); (3) a **`DeskNote`** (proposta) com `pinned`/`active`.

```mermaid
stateDiagram-v2
  state "Mesa da equipe — sessão de uso (CA01, CA04, CA05)" as MD {
    [*] --> SomenteLeitura : viewer não é membro vigente nem chefe (EMPRESA lê)
    [*] --> Editavel : membro vigente ou Department.headUserId
    state Editavel {
      [*] --> Quadro
      Quadro --> LinhaDoTempo : trocar visão
      LinhaDoTempo --> Canvas : trocar visão
      Canvas --> Quadro : trocar visão
      Canvas --> Canvas : mover widget ou post-it, TeamDesk.version + 1, publish ≤ 3 s
    }
    SomenteLeitura --> Editavel : passa a ter DepartmentMembership vigente
    Editavel --> SomenteLeitura : lotação encerrada (endedAt)
  }
  state "CollectiveGoal.status — widget mensal (CA02)" as CG {
    [*] --> ABERTA : chefe ou EMPRESA cria meta (RF35)
    ABERTA --> ABERTA : progress recalculado, barra no widget
    ABERTA --> ATINGIDA : criterionJson satisfeito, achievedAt, reconhecimento
    ABERTA --> EXPIRADA : passa periodTo sem atingir
    ATINGIDA --> [*]
    EXPIRADA --> [*]
  }
  state "DeskNote (proposta) — CA04, CA07" as DN {
    [*] --> ATIVA : POST desk notes, canvas x y escala rotação camada
    ATIVA --> ATIVA : autor move ou edita, publish NoteMoved
    ATIVA --> FIXADA : chefe pinned true, topo para todos
    FIXADA --> ATIVA : chefe pinned false
    ATIVA --> REMOVIDA : autor ou chefe remove, active false
    FIXADA --> REMOVIDA : chefe remove
    REMOVIDA --> [*]
  }
  note right of MD
    Escrita em SomenteLeitura: 403 ACESSO_NEGADO.
    Conflito concorrente: último-vence com aviso CONFLITO_ULTIMO_VENCE.
    Minha mesa é sempre editável pelo dono (dashboardLayoutJson).
  end note
  note right of CG
    ATINGIDA move a meta para o widget Destaques e dispara DECIA Points (RF35, RF42).
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/desk — sub-abas Minha mesa · Mesa da equipe; visões Quadro · Linha do tempo · Canvas"]
    F2["components/ui: DeskCanvas (BackgroundArt + DeskSkinPicker), WidgetFrame arrastável, DailyTaskCard + HseGauge, WeekStrip, PlanAxisRing, GoalProgressBar, HighlightCard, TeamKanbanBoard por fase, MilestoneTimeline 30 dias, ColleaguesActivityFeed, PostIt (DeskNote), PinButton, PresenceAvatars, ExportMenu PDF/PNG, OpenInProjectDeskButton, OpenInDeciaButton, InteractionBar RF18/RF19"]
    F3["Realtime client: WebSocket com fallback polling 3 s, toast CONFLITO_ULTIMO_VENCE"]
  end

  subgraph WEB["ws-web"]
    C1["ProfileDeskController — /api/desk/me, /api/desk/team/{departmentId}, /layout, /notes, /skin, /reset, /export"]
    C2["DeskRealtimeController — /ws/desk/team/{departmentId}, /changes?since"]
    C3["DailyTaskController RF44 · ProjectDeskController RF22 · InteractionController RF18/RF19 · JobController"]
  end

  subgraph APP["ws-application"]
    S1["ProfileDeskService"]
    S2["DeskWidgetService"]
    S3["AccessPolicy — isDeptMember, isDeptHead, visibilityFilter"]
    S4["DailyTaskService RF44 · PlanService RF24 · GoalService RF35 · MuralService RF27"]
    P1["CollaborationPort"]
    P2["TimelinePort"]
    P3["PdfRenderPort · MediaStoragePort"]
  end

  subgraph DOM["ws-domain"]
    D1["TeamDesk (proposta) · DeskNote (proposta) · UserPreferences.dashboardLayoutJson/deskSkin · UserSkin · enums DeskSkin, DeskView"]
    D2["DailyTask · EfficiencyScoreSnapshot · WeekPlan · WeekPlanDay · AnnualPlan · PlanAxis · CollectiveGoal · Highlight · ProjectScheme · ProjectTask · MuralEntry · TimelineEvent"]
    D3["Department · DepartmentMembership · PipelineJob · MediaObject"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: team_desks (proposta), desk_notes (proposta), user_preferences, user_skins, daily_tasks, hse_snapshots, week_plans, plan_axes, collective_goals, highlights, project_schemes, project_tasks, mural_entries, pipeline_jobs")]
    I2[("cache-redis: RedisPubSubAdapter — canal desk:team:{departmentId}, presença")]
    I3[("persistence-cassandra: CassandraTimelineAdapter timeline_by_user")]
    I4[("storage-s3: PDF/PNG exportado, presign")]
    I5["platform: PdfRendererAdapter, PipelineJob worker EXPORT_PDF, WebSocket endpoint"]
  end

  F1 --- F2
  F1 --- F3
  F1 -->|"HTTPS/JSON"| C1
  F3 -->|"WS / polling"| C2
  F2 -->|"HTTPS/JSON"| C3
  C1 --> S1
  C2 --> P1
  S1 --> S2
  S1 --> S3
  S1 --> P1
  S1 --> P3
  S1 --> D1
  S2 --> S4
  S2 --> P2
  S2 --> D2
  S3 --> D3
  D1 --> I1
  D2 --> I1
  D3 --> I1
  P1 --> I2
  P2 --> I3
  P3 --> I4
  P3 --> I5
  D3 --> I5
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF21.CA01 | Classes `UserPreferences.deskSkin/dashboardLayoutJson`, `UserSkin`, `TeamDesk` (proposta), `DepartmentMembership`, enum `DeskSkin`, `ProfileDeskService.loadMyDesk/loadTeamDesk`, `AccessPolicy.isDeptMember/isDeptHead` · Atividades `U1 → A1 → A2 / A3 → U2 → A4 → P1 → W1` · Sequência msgs 1–9 (`user_preferences … user_skins MESA … department_memberships`, `teamDeskAvailable`) e 13–15 (`isDeptMember OR isDeptHead OR conta EMPRESA`, `alt → 403`) · Estados `[*] → SomenteLeitura / Editavel` · Componentes `app/desk`, `DeskCanvas`, `DeskSkinPicker` |
| RF21.CA02 | Classes `DailyTask`, `EfficiencyScoreSnapshot`, `WeekPlan`, `WeekPlanDay`, `AnnualPlan`, `PlanAxis` (completedPct, aggregatedRisk), `CollectiveGoal` (progress), `Highlight`, `DeskWidgetService.daily/dailyAggregates/weekly/monthly` (nota "daily só do próprio") · Atividades `A5 → P2` · Sequência msgs 5–7 (daily, weekly, monthly) e 20 (`dailyAggregates … sem nominal`) · Máquina *CollectiveGoal.status* · Componentes `DailyTaskCard + HseGauge`, `WeekStrip`, `PlanAxisRing`, `GoalProgressBar`, `HighlightCard` · Tabela de widgets do cabeçalho |
| RF21.CA03 | `ProjectScheme` (currentPhase, visibility, nextMilestoneAt, hasBlockingPending), `ProjectTask`, `TimelineEvent`, `MuralEntry`, `DeskWidgetService.teamBoard/milestones/colleaguesActivity`, `AccessPolicy.visibilityFilter`, `TimelinePort`, enum `ProjectPhase` · Atividades `A5 → P2 / P3 → W3` · Sequência msgs 18–23 (`teamBoard … visibility IN (DEPARTAMENTO, EMPRESA, PUBLICA) GROUP BY currentPhase`, `milestones 30 dias`, `timeline_by_user dos membros`) · Componentes `TeamKanbanBoard`, `MilestoneTimeline`, `ColleaguesActivityFeed`, `persistence-cassandra` |
| RF21.CA04 | `DeskNote` (canvasX/Y/Scale/Rotation/Layer), `TeamDesk.layoutJson`, `UserPreferences.dashboardLayoutJson`, enum `DeskView`, `ProfileDeskService.saveMyLayout/saveTeamLayout/upsertNote/setSkin` · Atividades `U3 → W2`, `U4 → A8 → A9 / A12 → P4` · Sequência msg 24 ("trocar visão reprojeta o mesmo estado") e 27–33 (`POST /api/desk/notes … canvasX, canvasY`) · Região concorrente *Quadro → LinhaDoTempo → Canvas* e transição `Canvas → Canvas`; máquina *DeskNote* `[*] → ATIVA → ATIVA` · Componentes `WidgetFrame arrastável`, `PostIt` |
| RF21.CA05 | `CollaborationPort` (publish/subscribe/presence), `RedisPubSubAdapter`, `DeskRealtimeController`, `TeamDesk.version`, `ProfileDeskService.canEditTeamDesk` (nota) · Atividades `A6 → W6 -.-> A7 403`, `A10 → A11 (último-vence) → A12 → P5 → W5` · Sequência msgs 25–26 (SUBSCRIBE), 31–36 (`PUBLISH … NoteCreated`, `WS push em até 3 s`), 37–46 (`If-Match 7`, `opt version atual 8 … CONFLITO_ULTIMO_VENCE`, `version 9`) · Nota da máquina *Mesa da equipe* · Componentes `Realtime client`, `PresenceAvatars`, `cache-redis pub/sub` |
| RF21.CA06 | `DailyTaskService.registerFeedback` (RF44), `ProjectDeskController` (RF22), `InteractionBar RF18/RF19` · Atividades `U5 → A13 → P2`, `U6 → W7` · Sequência msgs 47–53 (`POST /api/daily-tasks/today/feedback`, "navega para /projects/P4/edit (RF22 — … ProjectVersion)") · Componentes `OpenInProjectDeskButton`, `OpenInDeciaButton`, `DailyTaskController RF44`, `ProjectDeskController RF22` |
| RF21.CA07 | `DeskNote.pinned`, `TeamDesk.deskSkin/version`, `Department.headUserId`, `ProfileDeskService.pinNote/resetTeamLayout/requestExport`, `PipelineJob EXPORT_PDF` (targetType TEAM_DESK), `PdfRenderPort.renderDesk`, `MediaObject` · Atividades `U7 → A14 → A7 403 / A15 → P4 → A12`, `A14 → A16 → P6 → W8` · Sequência msgs 54–72 (`PATCH …/notes/{id} {pinned true}`, `alt ator não é headUserId → 403`, `INSERT pipeline_jobs EXPORT_PDF TEAM_DESK`, `renderDesk`, `downloadUrl presign`) · Transições `ATIVA → FIXADA → ATIVA / REMOVIDA` · Componentes `PinButton`, `ExportMenu PDF/PNG`, `storage-s3`, `platform PdfRendererAdapter` |
