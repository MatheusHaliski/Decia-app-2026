# RF26 — Utilizar o Copilot do WS para criar sugestões de tarefas e projetos de maneira mais prática e funcional
**HU:** HU26 · **Sprint (board Work Station):** Product Backlog (não comprometido na Sprint 4) · **Equivalente FAI:** Autopiloto + "Vista-me" (RF28) e sugestões do Copilot (RF10) para o título · corpo do card = RF6 Perfil Lookbook (+ RF17 perfil de outros) · **Aba/rota:** Copilot / Autopilot (`/autopilot`: *Sugerir tarefas* e *Sugerir projetos*), Insights › Projetos sugeridos (`/insights`, RF43), botão ✦ "Pedir ao Copilot" na folha "+ Criar", no Acervo (RF41) e na Mesa de Trabalho (RF22); a proposta de projeto abre na Mesa em modo rascunho
**Critérios de aceite cobertos:** corpo do card = **RF19.CA01–07 (perfil do usuário: cabeçalho, 15 sub-abas, filtros, Tarefa do Dia, perfil deliberativo, sub-abas institucionais, i18n)** — citados como estão escritos, **corpo do card = antigo RF19 (perfil, ver RF6/RF16 e `_anterior/RF19`)**, não modelados aqui; o **título** (Copilot do WS) é modelado com os CAs já escritos nos cards RF30 e RF43: RF30.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (Autopiloto de Projeto) · RF43.CA06 (modo ECONOMIA/AVANÇADO) · RF43.CA07 (Autopilot de tarefas) · RF43.CA08 (Ficha de Viabilidade, até 5 candidatos) · RF43.CA10 (aceitar/descartar) · RF43.CA11 (motor local sem chave externa) — e RF26.CA01–CA04 derivados da HU26 "(CA a confirmar)"

O **Copilot do WS** é o nome de produto para o par **Autopilot de tarefas** (texto, ofício ou e-mail → N `TaskItem` RASCUNHO com `sourceKind = AUTOPILOT`, RF43.CA07) + **Autopilot de projetos** (demanda → `AutopilotDraft` volátil em Redis → `ProjectScheme` com `origin = AUTOPILOTO` ao confirmar, RF30; ou **até 5 candidatos** com `FeasibilitySheet` ordenados por viabilidade, RF43.CA08). Tudo passa pela `AiEngine` (Strategy + Chain: Claude → Gemini → `LocalEngine`), respeita `AiMode` ECONOMIA/AVANÇADO (`UserPreferences.aiModeDefault`, cota `AiQuota`), nunca envia `accessClass` RESTRITO/SIGILOSO a provedor externo e **nada vira tarefa DISPONÍVEL nem projeto PUBLICADO sem aceite humano**. CAs derivados da HU26 (a confirmar):

- **RF26.CA01 (a confirmar)** O Copilot é acionável de qualquer tela de criação (folha "+ Criar", Acervo, Mesa, página do projeto) e recebe texto livre, documento do Acervo ou projeto/eixo como contexto.
- **RF26.CA02 (a confirmar)** Sugestões de tarefas chegam como rascunhos revisáveis em lote (aceitar, editar, descartar) com faísca ✦ e confiança por campo; só o aceite cria `TaskItem` DISPONÍVEL.
- **RF26.CA03 (a confirmar)** Sugestões de projetos chegam como proposta na Mesa (RF22) ou como Ficha de Viabilidade; aceitar cria `ProjectScheme` RASCUNHO com crédito (`Remix`) aos modelos chancelados usados.
- **RF26.CA04 (a confirmar)** O usuário escolhe o modo ECONOMIA (padrão) ou AVANÇADO por pedido; AVANÇADO debita cota/créditos/DECIA Points com aviso prévio; sem cota, 409 COTA_ESGOTADA com atalho para a Loja.

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_projetos_acervo {
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +departmentId: UUID
    +title: String
    +objective: String
    +creationMode: CreationMode
    +origin: SchemeOrigin AUTOPILOTO
    +originalProjectId: UUID
    +aiOrientation: String
    +status: ProjectStatus
    +currentPhase: ProjectPhase
    +planAxisId: UUID
    +aiGenerated: boolean
    +aiInferenceId: UUID
    .. +25 campos ..
  }
  class ProjectTask {
    <<entity>>
    +id: UUID
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +sortOrder: int
    +responsibleId: UUID
    +dueAt: LocalDate
    +pertOptimistic: BigDecimal
    +pertMostLikely: BigDecimal
    +pertPessimistic: BigDecimal
    +isCritical: boolean
    +moscow: String
  }
  class ProjectTaskDependency {
    <<entity>>
    +predecessorProjectTaskId: UUID
    +successorProjectTaskId: UUID
    +type: String
    +lagDays: int
  }
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +type: TaskType ESTUDO_TECNICO_PRELIMINAR
    +category: TaskCategory
    +accessClass: AccessClassification
    +sourceKind: SourceKind AUTOPILOT
    +state: TaskState RASCUNHO
    +originalTaskId: UUID
    +aiGenerated: boolean
    +aiInferenceId: UUID
    +aiConfidenceJson: JSON
    .. +40 campos ..
  }
  class SealBond {
    <<entity>>
    +sealId: UUID
    +targetType: String PROJECT TASK
    +targetId: UUID
    +status: SealBondStatus APROVADA
  }
  class Remix {
    <<entity>>
    +actorId: UUID
    +sourceType: String
    +sourceId: UUID
    +resultType: String
    +resultId: UUID
    +ledgerEntryId: UUID
  }
  class DeciaSession {
    <<entity>>
    +id: UUID
    +topic: String
    +linkedProjectId: UUID
    +aiMode: AiMode
  }
}

namespace ws_domain_ia {
  class FeasibilitySheet {
    <<entity>>
    +id: UUID
    +candidateTitle: String
    +demandRef: String
    +costJson: JSON p10 p50 p90
    +timeJson: JSON pert cpm
    +deadlineJson: JSON monteCarloRuns pOnTime
    +viabilityScoreJson: JSON total e dimensões
    +risksJson: JSON top 5
    +wbsJson: JSON
    +raciJson: JSON
    +assumptionsJson: JSON
    +unknownsJson: JSON
    +status: SheetStatus
    +discardReason: String
    +resultingProjectId: UUID
    +resultingTaskId: UUID
    +aiInferenceId: UUID
  }
  class AiInferenceLog {
    <<entity>>
    +id: UUID
    +userId: UUID
    +capability: AiCapability
    +hostRf: String RF26
    +provider: AiProvider
    +model: String
    +mode: AiMode
    +latencyMs: int
    +estimatedCostUsd: BigDecimal
    +result: InferenceResult
    +fallbackUsed: boolean
    +maskedFields: String
    +quotaSource: String
    +correlationId: String
  }
  class AiQuota {
    <<entity>>
    +scope: String USER DEPARTMENT
    +scopeId: UUID
    +monthKey: String
    +monthlyLimit: int
    +consumed: int
    +purchasedCredits: int
  }
  class AiProviderCircuitState {
    <<entity>>
    +provider: AiProvider
    +state: CircuitState
    +failures: int
  }
  class InstitutionalMemoryDocument {
    <<entity>>
    +docId: String
    +sourceType: String PROJETO TAREFA
    +sourceId: UUID
    +embedding: float
  }
  class Citation {
    <<entity>>
    +sourceType: String
    +sourceId: UUID
    +excerpt: String
    +score: BigDecimal
  }
  class UserPreferences {
    <<entity>>
    +userId: UUID
    +aiModeDefault: AiMode
  }
}

namespace ws_domain_enums {
  class SchemeOrigin {
    <<enum>>
    CRIAR_PROJETO
    DECIA
    REMIX
    AUTOPILOTO
    MODELO
    CENARIO
    DOSSIE
    ATA_VIVA
  }
  class SheetStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    DESCARTADA
  }
  class AiCapability {
    <<enum>>
    AUTOPILOT_TAREFAS
    AUTOPILOT_PROJETO
    COMPOR_PROJETO
    MEMORIA_BUSCA
    ..27 valores
  }
  class AiMode {
    <<enum>>
    ECONOMIA
    AVANCADO
  }
  class InferenceResult {
    <<enum>>
    OK
    FALLBACK
    ERRO
    BLOQUEADO_SIGILO
  }
  class TaskState {
    <<enum>>
    RASCUNHO
    DISPONIVEL
    EM_USO
    BLOQUEADA
    CONCLUIDA
    ARQUIVADA
    MODELO_PUBLICO
    OFERECIDA
  }
}

namespace ws_application {
  class AutopilotService {
    <<service>>
    +tasksFrom(actorId, source, text, mode) List~TaskItem~ RASCUNHO
    +confirmTasks(actorId, draftIds, edits) List~TaskItem~ DISPONIVEL
    +analyzeDemand(actorId, demandText, documentTaskId, mode) DemandAnalysis
    +proposeScheme(actorId, analysis) AutopilotDraft
    +updateDraft(actorId, draftId, patch) AutopilotDraft
    +confirm(actorId, draftId) ProjectScheme
    +discard(actorId, draftId)
    +suggestProjects(actorId, max5, mode) List~FeasibilitySheet~
    +accept(sheetId, target) ProjectScheme ou DeciaSession
    +discardSheet(sheetId, reason) FeasibilitySheet
  }
  class FeasibilityService {
    <<service>>
    +pert(o, m, p) Estimate
    +cpm(tasks, deps) CriticalPath
    +monteCarlo(tasks, runs1000) ProbabilityOnTime
    +costBands(wbs) P10P50P90
    +riskMatrix(risks) Top5
    +viabilityScore(dims) Score0to100
  }
  class MemoryService {
    <<service>>
    +similarProjects(analysis, companyId, visibilityCtx) List~Citation~
  }
  class DeciaBridgeService {
    <<service>>
    +openSessionFromProject(actorId, projectId) DeciaSession
  }
  class AiEngine {
    <<service>>
    +run(capability, input, accessClass, mode) AiResult
    -guardPrivacy(input, accessClass) MaskedInput
    -guardQuota(userId, departmentId, mode) QuotaSource
    -chain() List~AiProviderPort~
  }
  class CircuitBreaker {
    <<service>>
    +allow(provider) boolean
    +onFailure(provider)
  }
  class AiProviderPort {
    <<port>>
    +infer(prompt, model, timeout) ProviderResult
  }
  class DraftCachePort {
    <<port>>
    +put(draftId, draft, ttl)
    +get(draftId) AutopilotDraft
    +evict(draftId)
  }
  class SearchIndexPort {
    <<port>>
    +knn(index, vector, filters, k) List~Hit~
  }
  class EmbeddingPort {
    <<port>>
    +embed(text) float
  }
}

namespace ws_web {
  class AutopilotController {
    <<controller>>
    +POST_api_autopilot_tasks(source, text, mode)
    +POST_api_autopilot_tasks_confirm(draftIds, edits)
    +POST_api_autopilot_analyze(body)
    +POST_api_autopilot_propose(body)
    +PATCH_api_autopilot_drafts_id(patch)
    +POST_api_autopilot_drafts_id_confirm()
    +POST_api_autopilot_projects(max5, mode)
    +POST_api_feasibility_id_accept(target)
    +POST_api_feasibility_id_discard(reason)
  }
}

namespace ws_infrastructure {
  class ClaudeAdapter {
    <<adapter>>
  }
  class GeminiAdapter {
    <<adapter>>
  }
  class LocalEngine {
    <<adapter>>
    regras + modelos chancelados + heurísticas de PM
  }
  class RedisDraftCache {
    <<adapter>>
  }
  class OpenSearchIndexAdapter {
    <<adapter>>
    índice ws-memory
  }
}

ProjectScheme "1" --> "*" ProjectTask
ProjectScheme "1" --> "*" ProjectTaskDependency
ProjectTask --> TaskItem : taskId
ProjectScheme --> SchemeOrigin
ProjectScheme --> AiInferenceLog : aiInferenceId
ProjectScheme --> ProjectScheme : originalProjectId modelo
TaskItem --> TaskState
TaskItem --> AiInferenceLog : aiInferenceId
Remix --> ProjectScheme : resultId
Remix ..> SealBond : sourceId modelo chancelado
FeasibilitySheet --> SheetStatus
FeasibilitySheet ..> ProjectScheme : resultingProjectId origin AUTOPILOTO
FeasibilitySheet ..> TaskItem : resultingTaskId ESTUDO_TECNICO_PRELIMINAR
FeasibilitySheet ..> DeciaSession : accept SESSAO
DeciaSession --> ProjectScheme : linkedProjectId
AiInferenceLog --> AiCapability
AiInferenceLog --> AiMode
AiInferenceLog --> InferenceResult
UserPreferences --> AiMode : aiModeDefault
AiQuota ..> AiEngine : guardQuota
AiProviderCircuitState ..> CircuitBreaker

AutopilotController ..> AutopilotService
AutopilotService ..> AiEngine : AUTOPILOT_TAREFAS e AUTOPILOT_PROJETO
AutopilotService ..> FeasibilityService : números determinísticos
AutopilotService ..> MemoryService : semelhantes RF33
AutopilotService ..> DraftCachePort : rascunho volátil
AutopilotService ..> DeciaBridgeService : abrir sessão sobre a proposta
AutopilotService ..> Remix : crédito por modelo
AiEngine ..> AiProviderPort : chain primário → alternativo → local
AiEngine ..> CircuitBreaker
AiEngine ..> AiInferenceLog
MemoryService ..> EmbeddingPort
MemoryService ..> SearchIndexPort
MemoryService ..> InstitutionalMemoryDocument
MemoryService ..> Citation
ClaudeAdapter ..|> AiProviderPort
GeminiAdapter ..|> AiProviderPort
LocalEngine ..|> AiProviderPort : fallback provider LOCAL
RedisDraftCache ..|> DraftCachePort
OpenSearchIndexAdapter ..|> SearchIndexPort

note for AutopilotService "Copilot do WS = Autopilot de tarefas (RF43.CA07) + Autopilot de projetos (RF30, RF43.CA08–CA10) · nada vira DISPONIVEL ou PUBLICADO sem aceite humano"
note for AiEngine "Strategy + Chain · guardPrivacy mascara e bloqueia RESTRITO/SIGILOSO · guardQuota créditos → cota mensal → DECIA Points no modo AVANCADO (RF43.CA06) · LocalEngine sem chave externa (RF43.CA11)"
note for TaskItem "tabela tasks · sugestões nascem RASCUNHO com sourceKind AUTOPILOT, aiGenerated e aiConfidenceJson · aceite em lote leva a DISPONIVEL (RF43.CA07)"
note for FeasibilitySheet "tabela feasibility_sheets · até 5 por pedido, ordenadas por viabilityScoreJson.total · PROPOSTA → ACEITA ou DESCARTADA com motivo (RF43.CA08, CA10)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph LU["Usuário"]
    U1["Aciona o Copilot ✦ na folha + Criar, no Acervo, na Mesa ou em /autopilot"]
    U2{"Quer sugestões de tarefas ou de projetos?"}
    U3["Informa texto livre, ofício/e-mail colado ou DOCUMENTO do acervo e escolhe modo ECONOMIA ou AVANCADO"]
    U4["Revisa os rascunhos de tarefa em lote: aceita, edita, descarta"]
    U5["Revisa a proposta na Mesa em modo rascunho ou as fichas de viabilidade"]
    U6{"Aceitar como projeto, abrir sessão DECIA ou descartar?"}
    U7["Informa o motivo do descarte"]
  end

  subgraph LW["Web / BFF (Next.js App Router)"]
    W1["Seletor de modo com custo estimado · aviso prévio quando AVANCADO debita cota"]
    W2["Cards de tarefa rascunho com faísca ✦ e confiança por campo"]
    W3["Mesa RF22 com cartões rascunho e créditos aos modelos · ou FeasibilityCard com P10/P50/P90, PERT/CPM, pOnTime, score, riscos"]
    W4["Aviso de fallback: motor local, redação simplificada"]
    W5["Card do projeto com faísca ✦ e origem AUTOPILOTO · tarefas DISPONIVEL no Acervo"]
  end

  subgraph LA["ws-application"]
    A1{"Entrada vazia ou DOCUMENTO sem permissão?"}
    A2["422 VALIDACAO / 403 ACESSO_NEGADO"]
    A3["AutopilotService.tasksFrom → AiEngine AUTOPILOT_TAREFAS"]
    A4["Persiste N TaskItem RASCUNHO sourceKind AUTOPILOT, aiGenerated, aiConfidenceJson"]
    A5["AutopilotService.confirmTasks: aceitos → DISPONIVEL + TaskStateLog · descartados → ARQUIVADA"]
    A6["AutopilotService.analyzeDemand → proposeScheme: modelos chancelados SealBond APROVADA + MemoryService.similarProjects"]
    A7["AutopilotDraft em Redis com TTL · nada no MySQL"]
    A8["AutopilotService.suggestProjects: candidatos de eixos sem projeto, decisões sem projeto, metas, lacunas"]
    A9["FeasibilityService determinístico: PERT, CPM, Monte Carlo 1000, custo P10/P50/P90, matriz PxI, ROI, WBS, RACI, score"]
    A10["Persiste até 5 FeasibilitySheet PROPOSTA"]
    A11["confirm: ProjectScheme origin AUTOPILOTO creationMode COM_IA · ProjectTask + dependências · Remix por modelo · AiInferenceLog · evict draft"]
    A12["accept PROJETO: ProjectScheme RASCUNHO + TaskItem ESTUDO_TECNICO_PRELIMINAR · FeasibilitySheet ACEITA"]
    A13["accept SESSAO: DeciaBridgeService.openSessionFromProject · projeto EM_DECISAO"]
    A14{"Motivo informado?"}
    A15["422 MOTIVO_OBRIGATORIO"]
    A16["FeasibilitySheet DESCARTADA · discardReason alimenta próximas sugestões"]
    A17{"Rascunho ainda em cache?"}
    A18["409 RASCUNHO_EXPIRADO"]
  end

  subgraph LI["IA (AiEngine)"]
    I1{"accessClass RESTRITO ou SIGILOSO?"}
    I2["guardPrivacy mascara dados pessoais"]
    I3{"guardQuota: créditos → cota mensal → DECIA Points se AVANCADO"}
    I4["409 COTA_ESGOTADA → Loja Work Station"]
    I5{"CircuitBreaker permite primário?"}
    I6["Claude ou Gemini com timeout e retry"]
    I7["LocalEngine: regras + modelos chancelados + heurísticas · result FALLBACK ou BLOQUEADO_SIGILO"]
    I8["Redige só sobre números calculados · AiInferenceLog provider, model, mode, custo, latência, fallbackUsed, correlationId"]
  end

  subgraph LP["Persistência"]
    P1[("MySQL: tasks RASCUNHO/DISPONIVEL, task_state_log")]
    P2[("Redis: autopilot draft TTL · quota · circuit")]
    P3[("MySQL: seal_bonds, project_schemes modelo · OpenSearch: ws-memory kNN")]
    P4[("MySQL: feasibility_sheets, project_schemes, project_tasks, project_task_dependencies, remixes, ai_inference_log")]
    P5[("MySQL: decia_sessions")]
  end

  U1 --> U2
  U2 -->|"tarefas"| U3
  U2 -->|"projetos"| U3
  U3 --> W1 --> A1
  A1 -->|"sim"| A2
  A1 -->|"não"| I1
  I1 -->|"sim"| I7
  I1 -->|"não"| I2 --> I3
  I3 -->|"sem cota"| I4
  I3 -->|"ok"| I5
  I5 -->|"OPEN"| I7
  I5 -->|"CLOSED"| I6
  I6 -->|"falha"| I7
  I6 -->|"ok"| I8
  I7 --> W4
  I7 --> I8
  I8 --> P2
  I8 -->|"tarefas"| A3 --> A4 --> P1
  A4 --> W2 --> U4 --> A5 --> P1
  A5 --> W5
  I8 -->|"projeto a partir de demanda"| A6 --> P3
  A6 --> A7 --> P2
  I8 -->|"projetos sugeridos"| A8 --> A9 --> A10 --> P4
  A7 --> W3
  A10 --> W3
  W3 --> U5 --> U6
  U6 -->|"aceitar proposta da Mesa"| A17
  A17 -->|"não"| A18
  A17 -->|"sim"| A11 --> P4
  U6 -->|"aceitar ficha como projeto"| A12 --> P4
  U6 -->|"abrir sessão DECIA"| A13 --> P5
  U6 -->|"descartar"| U7 --> A14
  A14 -->|"não"| A15
  A14 -->|"sim"| A16 --> P4
  A11 --> W5
  A12 --> W5

  classDef err fill:#ffe3e3,stroke:#c0392b,color:#5a1a12
  classDef warn fill:#fff4d6,stroke:#b7791f,color:#5a3b06
  classDef ai fill:#eef2ff,stroke:#4c51bf,color:#1e1b4b
  class A2,A15,A18,I4 err
  class W4,I7 warn
  class I1,I2,I3,I5,I6,I8 ai
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  actor U as Usuário
  participant NX as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant R as Redis
  participant DE as DomainEvents (AFTER_COMMIT)

  Note over U,DE: Copilot de tarefas (RF43.CA07, RF26.CA02) — ofício colado vira rascunhos revisáveis
  U->>NX: cola um ofício na folha + Criar e clica Pedir ao Copilot, modo ECONOMIA
  NX->>C: POST /api/autopilot/tasks {source COLAR, text, mode ECONOMIA}
  C->>S: AutopilotService.tasksFrom(actorId, COLAR, text, ECONOMIA)
  alt texto vazio
    S-->>C: 422 VALIDACAO
    C-->>NX: 422
  else ok
    S->>AI: run(AUTOPILOT_TAREFAS, {texto, departamento, taxonomia oficial}, accessClass INTERNO, ECONOMIA)
    AI->>R: GET quota:USER:{id}:{mês} e circuit:CLAUDE
    alt sem cota nem créditos (RF43.CA06, RF26.CA04)
      AI-->>S: QuotaExceeded
      S-->>C: 409 COTA_ESGOTADA {storeUrl}
      C-->>NX: 409
      NX-->>U: atalho para a Loja Work Station
    else cota ok
      alt primário falha ou flag desabilitada (RF43.CA11)
        AI->>AI: LocalEngine regras + modelos chancelados
        AI->>DB: INSERT ai_inference_log (provider LOCAL, result FALLBACK, fallbackUsed)
        AI-->>S: tarefas sugeridas simplificadas + aviso de fallback
      else primário ok
        AI->>DB: INSERT ai_inference_log (AUTOPILOT_TAREFAS, provider, model, mode, custo, latência, correlationId)
        AI-->>S: lista de tarefas {title, type, category, prazo sugerido, confiança por campo}
      end
      S->>DB: INSERT tasks x N (state RASCUNHO, sourceKind AUTOPILOT, aiGenerated, aiConfidenceJson, aiInferenceId)
      S-->>C: 201 rascunhos ✦
      C-->>NX: 201
      NX-->>U: cards rascunho com confiança por campo, aceitar, editar ou descartar
    end
  end
  U->>NX: aceita 3 rascunhos editados e descarta 1
  NX->>C: POST /api/autopilot/tasks/confirm {draftIds, edits}
  C->>S: AutopilotService.confirmTasks(actorId, draftIds, edits)
  S->>DB: UPDATE tasks SET state DISPONIVEL · INSERT task_state_log (RASCUNHO → DISPONIVEL, reason COPILOT_ACEITO) · UPDATE tasks SET state ARQUIVADA para o descartado
  S->>DE: publish TaskCreated x3
  S-->>NX: 200 tarefas DISPONIVEL no Acervo RF41
  DE->>OS: indexTask x3

  Note over U,DE: Copilot de projetos a partir de uma demanda (RF30.CA01–CA04, RF26.CA03)
  U->>NX: em /autopilot informa a demanda e escolhe modo AVANCADO
  NX->>C: POST /api/autopilot/analyze {demandText, documentTaskId, mode AVANCADO}
  C->>S: AutopilotService.analyzeDemand(actorId, text, docId, AVANCADO)
  S->>AI: run(AUTOPILOT_PROJETO, demanda, accessClass do DOCUMENTO, AVANCADO)
  alt DOCUMENTO RESTRITO ou SIGILOSO
    AI->>AI: LocalEngine sem saída externa · result BLOQUEADO_SIGILO
    AI-->>S: análise parcial + aviso motor local
  else INTERNO ou PUBLICO
    AI->>R: debita cota AVANCADO (créditos → cota → DECIA Points) com aviso prévio
    AI-->>S: objetivo, prazo, departamento provável, categoria do processo ✦
  end
  S-->>NX: 200 DemandAnalysis
  NX->>C: POST /api/autopilot/propose {analysis}
  C->>S: AutopilotService.proposeScheme(actorId, analysis)
  S->>DB: SELECT seal_bonds APROVADA targetType PROJECT (empresa, departamento) + project_schemes modelo
  S->>OS: kNN ws-memory (MemoryService.similarProjects, filtros de visibilidade e empresa)
  OS-->>S: projetos semelhantes com citações
  S->>AI: run(COMPOR_PROJETO, {analysis, modelos, semelhantes, histórico de responsáveis})
  AI-->>S: fases, tarefas, dependências, responsáveis, prazos, créditos ✦
  S->>R: SET autopilot:draft:{draftId} TTL 24h
  S-->>NX: 200 AutopilotDraft
  NX-->>U: Mesa de Trabalho em modo rascunho (RF22)
  U->>NX: remove uma tarefa, troca outra e confirma
  NX->>C: PATCH /api/autopilot/drafts/{draftId} · POST /api/autopilot/drafts/{draftId}/confirm
  C->>S: AutopilotService.updateDraft · confirm(actorId, draftId)
  S->>R: GET autopilot:draft:{draftId}
  alt rascunho expirou
    S-->>C: 409 RASCUNHO_EXPIRADO
    C-->>NX: 409
  else ok
    S->>DB: INSERT project_schemes (origin AUTOPILOTO, creationMode COM_IA, aiGenerated, aiInferenceId) · project_tasks · project_task_dependencies · tasks (sourceKind AUTOPILOT)
    S->>DB: INSERT remixes (um por modelo chancelado usado) · INSERT ai_inference_log (AUTOPILOT_PROJETO)
    S->>R: DEL autopilot:draft:{draftId}
    S->>DE: publish ProjectCreated (origin AUTOPILOTO)
    S-->>C: 201 ProjectScheme RASCUNHO
    C-->>NX: 201
    NX-->>U: card do projeto com faísca ✦ e créditos
  end
  DE->>DB: thumbnails e mosaico (RF38) · DeciaPointsLedgerEntry para autores remixados (RF42)

  Note over U,DE: Copilot sugere novos projetos com Ficha de Viabilidade (RF43.CA08, CA10)
  U->>NX: Sugerir novos projetos
  NX->>C: POST /api/autopilot/projects {max 5, mode ECONOMIA}
  C->>S: AutopilotService.suggestProjects(actorId, 5, ECONOMIA)
  S->>DB: SELECT plan_axes sem projeto · final_decisions sem projeto · collective_goals · metric_snapshots
  S->>OS: kNN ws-memory (projetos e planilhas semelhantes)
  S->>S: FeasibilityService: PERT, CPM, Monte Carlo 1000, custo P10/P50/P90, matriz PxI, ROI, WBS, RACI, score
  S->>DB: INSERT feasibility_sheets (PROPOSTA x5, assumptionsJson, unknownsJson)
  S->>AI: run(AUTOPILOT_PROJETO, números das fichas, INTERNO, ECONOMIA)
  AI-->>S: narrativa que cita métrica e valor + confiança
  S->>DB: UPDATE feasibility_sheets SET aiInferenceId
  S-->>NX: 200 até 5 fichas ordenadas por viabilidade ✦
  U->>NX: aceita a ficha 2 como projeto e descarta a 4 sem motivo
  NX->>C: POST /api/feasibility/{id2}/accept {PROJETO} · POST /api/feasibility/{id4}/discard {reason vazio}
  C->>S: AutopilotService.accept(id2, PROJETO) · discardSheet(id4, vazio)
  S->>DB: INSERT project_schemes (RASCUNHO, origin AUTOPILOTO) · project_tasks (PERT, isCritical, slackDays) · tasks ESTUDO_TECNICO_PRELIMINAR (RASCUNHO, aiGenerated) · UPDATE feasibility_sheets SET ACEITA, resultingProjectId, resultingTaskId
  alt motivo vazio
    S-->>C: 422 MOTIVO_OBRIGATORIO para a ficha 4
  else motivo informado
    S->>DB: UPDATE feasibility_sheets SET DESCARTADA, discardReason
  end
  S-->>NX: 201 ProjectScheme + 422 na ficha 4
```

## 4. Máquina de estados

Entidades centrais do Copilot: **`FeasibilitySheet.status`** (`SheetStatus`), o **`AutopilotDraft`** volátil (Redis, não é entidade MySQL) e o ciclo de aceite das sugestões — **`TaskItem.state`** (RASCUNHO → DISPONIVEL) e **`ProjectScheme.status`** (nasce RASCUNHO com `origin = AUTOPILOTO`). O corpo do card (perfil, RF19.CA01–07) não tem estados próprios e está em `_anterior/RF19`.

```mermaid
stateDiagram-v2
  direction LR
  state "Sugestão de tarefa — TaskItem sourceKind AUTOPILOT" as T {
    [*] --> RASCUNHO : AUTOPILOT_TAREFAS cria N rascunhos ✦ (RF43.CA07)
    RASCUNHO --> RASCUNHO : usuário edita campos sugeridos
    RASCUNHO --> DISPONIVEL : aceite em lote, TaskStateLog, Acervo RF41
    RASCUNHO --> ARQUIVADA : descartar sugestão
    DISPONIVEL --> [*]
    ARQUIVADA --> [*]
  }
  state "AutopilotDraft (Redis, volátil) → ProjectScheme" as D {
    [*] --> Analisada : POST autopilot/analyze (RF30.CA01)
    Analisada --> Proposta : POST autopilot/propose com modelos chancelados (RF30.CA02)
    Proposta --> Ajustada : PATCH drafts aceitar, remover, trocar (RF30.CA03)
    Ajustada --> Ajustada : novos ajustes
    Proposta --> Expirada : TTL vence, 409 RASCUNHO_EXPIRADO
    Ajustada --> Expirada : TTL vence
    Proposta --> Descartada : DELETE drafts
    Ajustada --> Descartada : DELETE drafts
    Ajustada --> RASCUNHO_P : confirm → ProjectScheme origin AUTOPILOTO ✦ (RF30.CA04)
    Proposta --> RASCUNHO_P : confirm sem ajustes
    state "ProjectScheme RASCUNHO" as RASCUNHO_P
    RASCUNHO_P --> EM_DECISAO : abrir sessão DECIA sobre a proposta (RF30.CA06)
    RASCUNHO_P --> PUBLICADO : publicar
    Expirada --> [*]
    Descartada --> [*]
  }
  state "FeasibilitySheet.status" as F {
    [*] --> PROPOSTA : suggestProjects até 5 ordenadas por viabilidade (RF43.CA08)
    PROPOSTA --> ACEITA : aceitar → ProjectScheme RASCUNHO + ETP ✦ ou DeciaSession (RF43.CA10)
    PROPOSTA --> DESCARTADA : descartar com motivo, 422 MOTIVO_OBRIGATORIO sem motivo
    ACEITA --> [*]
    DESCARTADA --> [*]
  }
  note right of T
    Nada vira DISPONIVEL sem revisão humana.
    Modo ECONOMIA padrão, AVANCADO debita cota com aviso (RF43.CA06).
  end note
  note right of D
    Nada é persistido no MySQL até confirmar (RF30.CA03).
    Fallback local marca fallbackUsed e avisa (RF30.CA05, RF43.CA11).
  end note
  note right of F
    discardReason alimenta as próximas sugestões.
    Sem cota 409 COTA_ESGOTADA antes de gerar.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FE["Frontend Next.js"]
    F1["app/autopilot — Sugerir tarefas · Sugerir projetos · modo ECONOMIA/AVANCADO"]
    F2["app/projects/[id]/desk — Mesa RF22 em modo rascunho"]
    F3["app/insights — Projetos sugeridos RF43 · botão ✦ Pedir ao Copilot na folha + Criar, Acervo e Mesa"]
    F4["components/ui: CopilotSheet, ModeSelector com custo, DraftTaskCard ✦, ConfidenceBadge, BatchReviewBar, DeskCanvas, FeasibilityCard, ScoreBreakdown, RiskMatrix, ModelCreditChip, FallbackBanner, QuotaBanner"]
  end

  subgraph WEB["ws-web"]
    C1["AutopilotController — /api/autopilot/tasks, /tasks/confirm, /analyze, /propose, /drafts/{id}, /drafts/{id}/confirm, /projects · /api/feasibility/{id}/accept, /discard"]
    C2["ProjectDeciaController RF29 — /api/projects/{id}/decia-session"]
  end

  subgraph APP["ws-application"]
    S1["AutopilotService"]
    S2["MemoryService RF33"]
    S3["DeciaBridgeService RF29"]
    S4["AiEngine (Strategy + Chain) · guardPrivacy · guardQuota · CircuitBreaker"]
    P1["AiProviderPort"]
    P2["DraftCachePort"]
    P3["SearchIndexPort ws-memory"]
    P4["EmbeddingPort"]
  end

  subgraph DOM["ws-domain · br.gov.pr.secid.workstation"]
    D1["FeasibilityService (PERT, CPM, Monte Carlo, custo, risco, ROI, WBS, RACI, score)"]
    D2["ProjectScheme · ProjectTask · ProjectTaskDependency · TaskItem · Remix · SealBond · DeciaSession"]
    D3["FeasibilitySheet · AiInferenceLog · AiQuota · AiProviderCircuitState · InstitutionalMemoryDocument · Citation · UserPreferences"]
    D4["SchemeOrigin · SheetStatus · AiCapability · AiMode · InferenceResult · TaskState"]
  end

  subgraph INFRA["ws-infrastructure/*"]
    I1[("persistence-mysql: tasks, task_state_log, project_schemes, project_tasks, project_task_dependencies, remixes, feasibility_sheets, ai_inference_log, ai_quotas, seal_bonds")]
    I2[("cache-redis: RedisDraftCache autopilot draft TTL · quota · circuit state")]
    I3[("search-opensearch: OpenSearchIndexAdapter ws-memory dense_vector")]
    I4["ai-providers: ClaudeAdapter · GeminiAdapter · LocalEngine (regras, modelos chancelados, heurísticas de PM) · PII masker"]
    I5["platform: DomainEventOutbox · FeatureFlag ai.provider.claude, ai.provider.gemini, ai.local.only · AuditLog"]
  end

  subgraph EXT["Serviços externos"]
    E1(("Claude"))
    E2(("Gemini"))
  end

  F1 --- F4
  F2 --- F4
  F3 --- F4
  F1 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C1
  F2 -->|"HTTPS/JSON"| C2
  F3 -->|"HTTPS/JSON"| C1
  C1 --> S1
  C2 --> S3
  S1 --> S2
  S1 --> S3
  S1 --> S4
  S1 --> D1
  S1 --> P2
  S4 --> P1
  S2 --> P3
  S2 --> P4
  S1 --> D2
  S1 --> D3
  S4 --> D3
  D2 --> D4
  D2 --> I1
  D3 --> I1
  P2 --> I2
  S4 --> I2
  P3 --> I3
  P1 --> I4
  P4 --> I4
  I5 --> S4
  I4 -.-> E1
  I4 -.-> E2

  classDef port stroke-dasharray: 4 3
  class P1,P2,P3,P4 port
```

## 6. Rastreabilidade

| CA | Elemento do diagrama (classe / passo / mensagem / transição / componente) |
|---|---|
| RF19.CA01–CA07 (corpo do card = perfil) | **Não modelados aqui** — corpo do card = antigo RF19; ver RF6 (Perfil Empresarial), RF16 (Ver perfil de empregado) e `_anterior/RF19/README.md` (cabeçalho, 15 sub-abas, filtros/URL, Tarefa do Dia, perfil deliberativo, sub-abas institucionais, i18n) |
| RF30.CA01 (demanda em texto, ofício ou DOCUMENTO) | `AutopilotService.analyzeDemand`, `TaskItem.accessClass` do DOCUMENTO · Atividades `U3 → W1 → A1 → A2 (422/403)` · Sequência bloco "Copilot de projetos a partir de uma demanda" (`POST /api/autopilot/analyze`) · Transição `[*] → Analisada` · Componentes `app/autopilot`, `CopilotSheet` |
| RF30.CA02 (proposta remixa modelos chancelados e semelhantes) | `SealBond APROVADA`, `MemoryService.similarProjects`, `InstitutionalMemoryDocument`, `Citation`, `Remix`, `ProjectTaskDependency` · Atividades `A6 → P3` · Sequência `SELECT seal_bonds APROVADA` + `kNN ws-memory` + `run(COMPOR_PROJETO …)` · Transição `Analisada → Proposta` · Componentes `MemoryService RF33`, `search-opensearch`, `ModelCreditChip` |
| RF30.CA03 (rascunho não persistido, ajustes) | `DraftCachePort`, `RedisDraftCache`, `AutopilotService.updateDraft/discard` · Atividades `A7 → P2 → W3 → U5` · Sequência `SET autopilot:draft TTL 24h`, `PATCH /api/autopilot/drafts/{draftId}` · Estados `Proposta → Ajustada → Descartada/Expirada` · Componentes `DeskCanvas`, `cache-redis` |
| RF30.CA04 (confirmar persiste com origem AUTOPILOTO e log) | `ProjectScheme.origin AUTOPILOTO / creationMode COM_IA / aiGenerated / aiInferenceId`, `AiInferenceLog`, `Remix` · Atividades `U6 → A17 → A18 (409) / A11 → P4 → W5` · Sequência `POST /api/autopilot/drafts/{draftId}/confirm` → `INSERT project_schemes … remixes … ai_inference_log` · Transição `Ajustada → RASCUNHO_P` · Componente `persistence-mysql` |
| RF30.CA05 (fallback sem chave ou cota) | `LocalEngine ..|> AiProviderPort`, `AiInferenceLog.fallbackUsed/result FALLBACK`, `CircuitBreaker`, `AiProviderCircuitState` · Atividades `I5 → I7 → W4` · Sequência `alt primário falha ou flag desabilitada` · Nota do estado *D* · Componentes `FallbackBanner`, `ai-providers`, `FeatureFlag ai.local.only` |
| RF30.CA06 (abrir sessão DECIA sobre a proposta) | `DeciaBridgeService.openSessionFromProject`, `DeciaSession.linkedProjectId` · Atividades `U6 → A13 → P5` · Transição `RASCUNHO_P → EM_DECISAO` · Componente `ProjectDeciaController RF29` |
| RF43.CA06 (modo ECONOMIA/AVANÇADO, cota e DECIA Points) | `AiMode`, `UserPreferences.aiModeDefault`, `AiQuota`, `AiEngine.guardQuota`, `AiInferenceLog.mode/quotaSource` · Atividades `U3 → W1`, `I3 → I4 409 COTA_ESGOTADA` · Sequência `GET quota:USER …`, `alt sem cota nem créditos → 409 COTA_ESGOTADA {storeUrl}`, `debita cota AVANCADO … com aviso prévio` · Nota do estado *T* · Componentes `ModeSelector com custo`, `QuotaBanner`, `cache-redis quota` |
| RF43.CA07 (Autopilot de tarefas → rascunhos) | `AutopilotService.tasksFrom/confirmTasks`, `TaskItem` (state RASCUNHO, sourceKind AUTOPILOT, aiGenerated, aiConfidenceJson), enum `AiCapability.AUTOPILOT_TAREFAS` · Atividades `A3 → A4 → P1 → W2 → U4 → A5` · Sequência bloco "Copilot de tarefas" (`POST /api/autopilot/tasks`, `INSERT tasks x N (state RASCUNHO …)`, `POST /api/autopilot/tasks/confirm`) · Estado *T* `RASCUNHO → DISPONIVEL / ARQUIVADA` · Componentes `DraftTaskCard ✦`, `ConfidenceBadge`, `BatchReviewBar` |
| RF43.CA08 (Ficha de Viabilidade, até 5) | `FeasibilitySheet` (costJson, timeJson, deadlineJson, viabilityScoreJson, risksJson, wbsJson, raciJson, assumptionsJson, unknownsJson), `FeasibilityService`, `AutopilotService.suggestProjects(max5)` · Atividades `A8 → A9 → A10 → P4 → W3` · Sequência bloco "Copilot sugere novos projetos" (`POST /api/autopilot/projects`, `INSERT feasibility_sheets (PROPOSTA x5 …)`) · Transição `[*] → PROPOSTA` · Componentes `FeasibilityCard`, `ScoreBreakdown`, `RiskMatrix`, `ws-domain FeasibilityService` |
| RF43.CA10 (aceitar/descartar ficha) | `FeasibilitySheet.status/discardReason/resultingProjectId/resultingTaskId`, `AutopilotService.accept/discardSheet`, `TaskItem ESTUDO_TECNICO_PRELIMINAR` · Atividades `U6 → A12 → P4 → W5`, `U7 → A14 → A15 (422) / A16` · Sequência `POST /api/feasibility/{id2}/accept {PROJETO}` + `alt motivo vazio → 422 MOTIVO_OBRIGATORIO` · Transições `PROPOSTA → ACEITA / DESCARTADA` e nota |
| RF43.CA11 (motor local sem chave externa) | Nota de `AiEngine` (LocalEngine sem chave externa), `FeasibilityService` determinístico · Atividades `I1 (sim) → I7`, `I5 (OPEN) → I7` · Sequência `alt DOCUMENTO RESTRITO ou SIGILOSO → LocalEngine … BLOQUEADO_SIGILO` · Componente `ai-providers LocalEngine`, `FeatureFlag ai.local.only` |
| RF26.CA01 (a confirmar — acionável de qualquer tela de criação) | Atividades `U1` (folha + Criar, Acervo, Mesa, /autopilot) · Componentes `F3` (botão ✦ Pedir ao Copilot), `CopilotSheet` |
| RF26.CA02 (a confirmar — rascunhos revisáveis em lote) | = RF43.CA07 acima · Componente `BatchReviewBar` |
| RF26.CA03 (a confirmar — proposta na Mesa ou Ficha, crédito aos modelos) | = RF30.CA02–CA04 e RF43.CA08–CA10 acima · `Remix`, `ModelCreditChip` |
| RF26.CA04 (a confirmar — escolha de modo e aviso de débito) | = RF43.CA06 acima · `ModeSelector com custo`, `QuotaBanner` |

> Dúvidas para `docs/DECISOES.md`: (1) o card RF26 tem **título Copilot** e **corpo perfil** (RF19.CA01–07) — este README modela o título e remete o corpo a RF6/RF16/`_anterior/RF19`; confirmar se o board será corrigido (ver RENUMERACAO.md e Q-44); (2) "Copilot do WS" e "Autopilot/Autopiloto" (RF30, RF43) são o mesmo recurso? Modelei como sinônimos de produto para o mesmo `AutopilotService`; (3) `AutopilotService.confirmTasks`, endpoint `/api/autopilot/tasks/confirm`, `hostRf RF26`, `TaskStateLog.reason COPILOT_ACEITO` e os CAs RF26.CA01–04 são propostas; (4) `AutopilotDraft` e `DraftCachePort` (Redis, TTL 24 h) continuam proposta herdada do RF30; (5) a HU26 cita "Ref.: RF21 … Critérios de aceite no card RF21" — o RF21 atual é a Mesa de trabalho digital, portanto a referência aponta para o antigo RF21 (criador de projetos, hoje card RF5).
