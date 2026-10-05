# RF26 — Utilizar o Copilot do WS para criar sugestões de tarefas e projetos de maneira mais prática e funcional
**HU:** HU26 · **Sprint (board Work Station):** Sprint 4 (card RF26 "Interações sociais" comprometido com o título antigo; conteúdo atual do título = Copilot) · **Equivalente FAI:** RF10 Copilot (sugestões) + RF6 Perfil Lookbook (corpo do card) · **Aba/rota:** Copilot em `/autopilot` (sugestões de tarefas e projetos, estende RF30/RF43 §7) e botão **Sugerir com o Copilot** em `/tasks/new`, `/projects/new` e na Mesa (`/desk`); corpo do card: Meu perfil (`/profile`, `/u/[username]`)
**Critérios de aceite cobertos:** **RF19.CA01 … RF19.CA07** (citados como estão escritos — **corpo do card = antigo RF19**, perfil/portfólio) + **RF26.CA01 … RF26.CA05 (CA a confirmar)**, derivados do título + HU26 (Copilot que sugere tarefas e projetos inteiros) — regra: o **título do card** define o RF; título e corpo divergem (`RENUMERACAO.md`).

**CAs derivados do título (a confirmar):**
- **RF26.CA01** Em `/autopilot`, no criador de tarefas e na Mesa, o botão **Sugerir com o Copilot** recebe uma frase, e-mail, protocolo ou o contexto atual (projeto aberto, acervo, perfil) e devolve **N tarefas em rascunho** (tipo, categoria, prazo legal, responsável, dependências) — nada vira DISPONÍVEL sem revisão (= RF43.CA07).
- **RF26.CA02** O Copilot sugere **projetos inteiros** (até 5 candidatos ordenados por viabilidade) a partir de eixos do plano sem projeto, lacunas do acervo e decisões DECIA sem projeto, cada um com Ficha de Viabilidade (= RF43.CA08, RF30.CA02).
- **RF26.CA03** Cada sugestão carrega a faísca ✦, a explicação ("baseado em: eixo X, modelo chancelado Y, sessão Z") e o `AiInferenceLog`; o usuário **aceita, edita ou descarta** (descartar exige motivo, que alimenta as próximas sugestões).
- **RF26.CA04** Tarefas RESTRITO/SIGILOSO no contexto nunca saem para provedor externo (só `LocalEngine`, com aviso); sem chave externa o Copilot usa regras + modelos chancelados e avisa o fallback (= RF30.CA05, RF43.CA02).
- **RF26.CA05** Aceitar cria `TaskItem` RASCUNHO com `sourceKind AUTOPILOT` ou `ProjectScheme` RASCUNHO com `origin AUTOPILOTO` e abre o item no criador correspondente (RF4/RF5) ou na Mesa (RF22); cota de IA (`AiQuota`) é debitada e, sem cota, o botão oferece a Loja (RF42.CA06).

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

namespace ws_domain_ia {
  class FeasibilitySheet {
    <<entity>>
    +id: UUID
    +candidateTitle: String
    +demandRef: String
    +costJson: JSON
    +timeJson: JSON
    +deadlineJson: JSON
    +viabilityScoreJson: JSON
    +risksJson: JSON
    +wbsJson: JSON
    +raciJson: JSON
    +assumptionsJson: JSON
    +status: SheetStatus
    +discardReason: String
    +resultingProjectId: UUID
    +resultingTaskId: UUID
    +aiInferenceId: UUID
  }
  class Insight {
    <<entity>>
    +scope: InsightScope
    +scopeId: UUID
    +kind: String
    +metricRefsJson: JSON
    +actionsJson: JSON
  }
  class AiInferenceLog {
    <<entity>>
    +id: UUID
    +userId: UUID
    +capability: AiCapability
    +provider: AiProvider
    +mode: AiMode
    +result: InferenceResult
    +fallbackUsed: boolean
    +maskedFieldsJson: JSON
    +quotaSource: String
    +correlationId: String
  }
  class AiQuota {
    <<entity>>
    +scope: String
    +scopeId: UUID
    +monthKey: String
    +monthlyLimit: int
    +consumed: int
    +purchasedCredits: int
  }
  class SheetStatus {
    <<enum>>
    PROPOSTA
    ACEITA
    DESCARTADA
  }
}

namespace ws_domain_acervo_projects {
  class TaskItem {
    <<entity>>
    +id: UUID
    +ownerId: UUID
    +title: String
    +type: TaskType
    +category: TaskCategory
    +state: TaskState
    +sourceKind: SourceKind
    +accessClass: AccessClassification
    +legalDueAt: LocalDate
    +responsibleId: UUID
    +aiGenerated: boolean
    +aiInferenceId: UUID
    .. +45 campos ..
  }
  class ProjectScheme {
    <<entity>>
    +id: UUID
    +title: String
    +objective: String
    +origin: SchemeOrigin
    +status: ProjectStatus
    +planAxisId: UUID
    +aiGenerated: boolean
    +aiInferenceId: UUID
    .. +30 campos ..
  }
  class ProjectTask {
    <<entity>>
    +projectId: UUID
    +taskId: UUID
    +phase: ProjectPhase
    +responsibleId: UUID
    +dueAt: LocalDate
    +pertMostLikely: BigDecimal
  }
}

namespace ws_domain_identity_profile {
  class User {
    <<entity>>
    +id: UUID
    +username: String
    +fullName: String
    +jobTitle: String
    +profileType: ProfileType
    +companyId: UUID
    +departmentId: UUID
    +hypeVisibility: HypeVisibility
    +avatarUrl: String
    .. +25 campos ..
  }
  class DeliberativeProfile {
    <<entity>>
    +userId: UUID
    +periodKey: String
    +clarity: BigDecimal
    +evidenceUse: BigDecimal
    +consistency: BigDecimal
    +deltaJson: JSON
  }
  class DailyTask {
    <<entity>>
    +userId: UUID
    +taskDate: LocalDate
    +taskId: UUID
    +feedback: DailyFeedback
    +hseRealizedJson: JSON
  }
}

namespace ws_application {
  class CopilotService {
    <<service>>
    +suggestTasks(actor, CopilotInput) List~TaskDraft~
    +suggestProjects(actor, CopilotContext) List~FeasibilitySheet~
    +accept(actor, suggestionId) AcceptResult
    +discard(actor, suggestionId, reason)
  }
  class AutopilotService {
    <<service>>
    +compose(actor, demand) ProjectDraft
  }
  class AiEngine {
    <<service>>
    +run(AiRequest) AiResponse
    -governance(flag, accessClass, masking, quota, budget)
  }
  class AiBudget {
    <<service>>
    +reserve(userId, estimatedUsd)
  }
  class ProfileService {
    <<service>>
    +self(actor) ProfileView
    +ofUser(viewer, username) PublicProfileView
  }
  class Guard {
    <<service>>
    +requireOwner(actor, ownerId)
    +requireSameCompany(actor, companyId)
  }
  class AiProviderPort {
    <<port>>
    +complete(prompt, model)
  }
  class QuotaPort {
    <<port>>
    +tryConsume(scope, id, units)
  }
}

namespace ws_web {
  class CopilotController {
    <<controller>>
    +POST_api_copilot_tasks(input)
    +POST_api_copilot_projects(context)
    +POST_api_copilot_suggestions_id_accept()
    +POST_api_copilot_suggestions_id_discard(reason)
  }
  class ProfileController {
    <<controller>>
    +GET_api_me_profile()
    +GET_api_users_username_profile()
  }
}

namespace ws_infrastructure {
  class ClaudeProvider {
    <<adapter>>
  }
  class GeminiProvider {
    <<adapter>>
  }
  class LocalEngine {
    <<adapter>>
  }
  class RedisQuotaAdapter {
    <<adapter>>
  }
}

CopilotController --> CopilotService
CopilotService --> AutopilotService
CopilotService --> AiEngine
CopilotService --> Guard
AiEngine --> AiBudget
AiEngine --> AiProviderPort
AiEngine --> QuotaPort
AiEngine ..> AiInferenceLog : grava sempre
QuotaPort ..> AiQuota
CopilotService ..> FeasibilitySheet : cria PROPOSTA
FeasibilitySheet "0..1" --> "0..1" ProjectScheme : resultingProjectId
FeasibilitySheet "0..1" --> "0..1" TaskItem : resultingTaskId ESTUDO_TECNICO_PRELIMINAR
CopilotService ..> TaskItem : RASCUNHO sourceKind AUTOPILOT
CopilotService ..> ProjectScheme : RASCUNHO origin AUTOPILOTO
ProjectScheme "1" *-- "0..*" ProjectTask
CopilotService ..> Insight : lacunas do acervo
ProfileController --> ProfileService
ProfileService ..> User
ProfileService ..> DeliberativeProfile
ProfileService ..> DailyTask
ClaudeProvider ..|> AiProviderPort
GeminiProvider ..|> AiProviderPort
LocalEngine ..|> AiProviderPort
RedisQuotaAdapter ..|> QuotaPort
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator (EMPREGADO · CHEFE · EMPRESA)"]
    A0([Clica Sugerir com o Copilot]) --> A1{"O que pedir?"}
    A1 -->|tarefas| A2["Cola frase, e-mail ou protocolo · ou usa o contexto atual"]
    A1 -->|projetos| A3["Pede projetos sugeridos para o departamento"]
    A4{"Aceitar, editar ou descartar?"}
    A4 -->|descartar| A5["Informa o motivo"]
    A4 -->|aceitar| A6["Abre no criador ou na Mesa"]
  end

  subgraph FE["Next.js / BFF (app/(shell)/autopilot · tasks/new · projects/new · desk)"]
    F1["CopilotPanel com Spark ✦ animada enquanto gera"]
    F2["POST /api/copilot/tasks"]
    F3["POST /api/copilot/projects"]
    F4["Lista de sugestões: TaskCard mini com explicação · ProjectCard com Ficha de Viabilidade"]
    F5["POST /suggestions/{id}/accept ou /discard"]
  end

  subgraph WEB["ws-web · CopilotController"]
    W1["JWT · CorrelationIdFilter · rate limit por usuário"]
    W2["GlobalExceptionHandler"]
  end

  subgraph APP["ws-application · CopilotService"]
    P1["Guard.requireSameCompany · requireOwner do contexto"]
    P2{"Contexto tem tarefa RESTRITO/SIGILOSO?"}
    P2 -->|sim| P3["Força LocalEngine + aviso"]
    P2 -->|não| P4["Masking de dados pessoais"]
    P5{"QuotaPort.tryConsume ok?"}
    P5 -->|não| E1["429 COTA_ESGOTADA + atalho para a Loja"]
    P6{"AiBudget.reserve ok?"}
    P6 -->|não| E2["503 IA_INDISPONIVEL (teto diário, Q-50)"]
    P7["Monta contexto: acervo, perfil deliberativo, eixos sem projeto, decisões sem projeto, modelos chancelados"]
    P8["Aceitar: TaskItem RASCUNHO sourceKind AUTOPILOT ou ProjectScheme RASCUNHO origin AUTOPILOTO + ProjectTask por fase"]
    P9{"Descartar com motivo?"}
    P9 -->|vazio| E3["422 VALIDACAO details.reason"]
    P9 -->|ok| P10["FeasibilitySheet DESCARTADA + motivo alimenta próximas sugestões"]
  end

  subgraph IA["AiEngine (AUTOPILOT_TAREFAS · AUTOPILOT_PROJETO)"]
    I1["Claude (primário)"] -->|falha ou circuito aberto| I2["Gemini (alternativo)"] -->|falha| I3["LocalEngine: regras + modelos chancelados + PERT/CPM/Monte Carlo"]
    I4["AiInferenceLog (modelo, custo, latência, fallbackUsed, maskedFields)"]
    I5["Resposta com explicação, confiança e citações RF33"]
  end

  subgraph DB["Persistência"]
    D1[("MySQL feasibility_sheets · tasks · project_schemes · ai_inference_log")]
    D2[("Redis quota:{scope}:{id}:{month} · circuit state · flag redis.enabled")]
    D3[("OpenSearch ws-memory (modelos semelhantes) · flag opensearch.enabled")]
  end

  A2 --> F1 --> F2 --> W1 --> P1 --> P2
  A3 --> F1 --> F3 --> W1 --> P1
  P3 --> P5
  P4 --> P5
  P5 -->|sim| P6 -->|sim| P7 --> I1
  P7 --> D3
  I1 --> I4
  I2 --> I4
  I3 --> I4
  I4 --> I5 --> D1 --> F4 --> A4
  P5 --> D2
  A5 --> F5 --> W1 --> P9
  A6 --> F5 --> W1 --> P8 --> D1
  P10 --> D1
  E1 --> W2
  E2 --> W2
  E3 --> W2
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
  participant R as Redis
  participant OS as OpenSearch
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>FE: cola ofício e clica Sugerir tarefas
  FE->>C: POST /api/copilot/tasks {text, projectId}
  C->>S: CopilotService.suggestTasks(actor, input)
  S->>S: Guard.requireSameCompany(actor, projeto.companyId)
  S->>DB: carrega acervo, perfil deliberativo, modelos chancelados do departamento
  S->>R: QuotaPort.tryConsume(USER, actor, 1)
  alt cota esgotada e sem créditos comprados
    S-->>C: 429 COTA_ESGOTADA
    C-->>FE: aviso + atalho /store (RF42.CA06)
  else cota ok
    S->>AI: run(AUTOPILOT_TAREFAS, contexto mascarado, mode ECONOMIA)
    alt contexto contém RESTRITO ou SIGILOSO
      AI->>AI: roteia só para LocalEngine (BLOQUEADO_SIGILO para externos)
    else provedor externo
      AI->>OS: busca modelos semelhantes (ws-memory, RF33)
      AI->>AI: Claude → fallback Gemini → fallback LocalEngine
    end
    AI->>DB: insert ai_inference_log
    AI-->>S: N TaskDraft com explicação e confiança ✦
    S-->>C: 200 sugestões (nada persistido ainda)
    C-->>FE: lista de TaskCard mini com Spark
  end

  U->>FE: aceita 3 tarefas e descarta 1 (motivo)
  FE->>C: POST /api/copilot/suggestions/{id}/accept
  C->>S: CopilotService.accept(actor, id)
  S->>DB: insert tasks (RASCUNHO, sourceKind AUTOPILOT, aiGenerated, aiInferenceId)
  S->>EV: TaskCreated → PipelineJob THUMBNAIL
  S-->>FE: redireciona para /tasks/new?draft=
  FE->>C: POST /api/copilot/suggestions/{id}/discard {reason}
  C->>S: CopilotService.discard(actor, id, reason)
  alt motivo vazio
    S-->>C: 422 VALIDACAO details.reason
  else ok
    S->>DB: update feasibility_sheets status DESCARTADA, discardReason
    S-->>C: 204
  end
```

## 4. Máquina de estados

Entidade central: `FeasibilitySheet.status` (`SheetStatus`) para as sugestões de projeto; as sugestões de tarefa não têm estado persistido até serem aceitas (nascem como `TaskItem` RASCUNHO, máquina do RF41). Corpo do card (perfil, RF19) não tem estado próprio.

```mermaid
stateDiagram-v2
  [*] --> PROPOSTA: Copilot devolve candidato com Ficha de Viabilidade ✦ (RF26.CA02)
  PROPOSTA --> PROPOSTA: usuário edita título, tarefas ou premissas (RF26.CA03)
  PROPOSTA --> ACEITA: aceitar → ProjectScheme RASCUNHO origin AUTOPILOTO + tarefa ESTUDO_TECNICO_PRELIMINAR (RF26.CA05)
  PROPOSTA --> DESCARTADA: descartar com motivo obrigatório (422 sem motivo)
  ACEITA --> [*]
  DESCARTADA --> [*]
  note right of PROPOSTA
    Nada é persistido no acervo até ACEITA.
    Cota debitada na geração, não no aceite.
  end note
  note right of DESCARTADA
    discardReason alimenta o próximo
    suggestProjects do mesmo usuário.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js 15"]
    R1["app/(shell)/autopilot · tasks/new · projects/new · desk (botão Copilot)"]
    R2["components: CopilotPanel · Spark ✦ · TaskCard mini · ProjectCard · FeasibilitySheetView · Dialog (motivo)"]
    R3["app/(shell)/profile · u/[username] (corpo do card, RF19)"]
    BFF["app/bff"]
    R1 --> R2 --> BFF
    R3 --> BFF
  end
  subgraph WEB["ws-web"]
    CC["CopilotController (@Operation RF26.CA01-CA05)"]
    PCO["ProfileController (RF19.CA01-CA07)"]
    SEC["SecurityConfig · JwtConfig · CorrelationIdFilter · GlobalExceptionHandler (main)"]
  end
  subgraph APPL["ws-application"]
    CS["ai/CopilotService"]
    AS["projects/AutopilotService (RF30)"]
    AIE["ai/AiEngine (Strategy + Chain) · AiBudget · Masking (main)"]
    PS["identity/ProfileService"]
    GD["security/Guard (sec-b3)"]
    PORTS["ports: AiProviderPort · QuotaPort · SearchIndexPort"]
  end
  subgraph DOM["ws-domain"]
    ENT["FeasibilitySheet · AiInferenceLog · AiQuota · TaskItem · ProjectScheme (planejado) · User (sec-b3)"]
  end
  subgraph INFRA["ws-infrastructure"]
    AIC["ai-providers/ai-claude (flag ai.provider.claude)"]
    AIG["ai-providers/ai-gemini (flag ai.provider.gemini)"]
    AIL["ai-providers/ai-local LocalEngine (ai.local.only)"]
    RD["cache-redis quotas · circuit state"]
    OSA["search-opensearch ws-memory"]
    MY["persistence-mysql"]
  end
  BFF --> CC --> CS
  BFF --> PCO --> PS
  CC --> SEC
  CS --> AS
  CS --> AIE --> PORTS
  CS --> GD
  CS --> ENT --> MY --> MYSQL[("MySQL 8")]
  PORTS --> AIC --> CLAUDE["Claude"]
  PORTS --> AIG --> GEM["Gemini"]
  PORTS --> AIL
  PORTS --> RD --> REDIS[("Redis")]
  PORTS --> OSA --> OPENS[("OpenSearch")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF26.CA01 (a confirmar) | `CopilotService.suggestTasks`, `TaskItem` RASCUNHO, `AiCapability AUTOPILOT_TAREFAS` | A2 → F2 → P1 → P7 → I1..I5 → F4 | 1–20 | — (tarefa segue máquina do RF41) | `CC`, `CS`, `AIE` |
| RF26.CA02 (a confirmar) | `CopilotService.suggestProjects`, `FeasibilitySheet`, `AUTOPILOT_PROJETO` | A3 → F3 → P7 → I1..I5 | — (mesmo fluxo com /projects) | `[*] → PROPOSTA` | `CS`, `AS`, `FeasibilitySheetView` |
| RF26.CA03 (a confirmar) | `AiInferenceLog`, `FeasibilitySheet.discardReason`, `CopilotService.discard` | A4 → A5 → F5 → P9 (422) → P10 | 21–31 | `PROPOSTA → DESCARTADA` · `PROPOSTA → self` | `Spark ✦`, `Dialog` |
| RF26.CA04 (a confirmar) | `AiEngine.governance`, `Masking`, `LocalEngine`, `InferenceResult BLOQUEADO_SIGILO` | P2 → P3 · I1 → I2 → I3 | 11–14 | — | `AIE`, `AIL`, `AIC`, `AIG` |
| RF26.CA05 (a confirmar) | `CopilotService.accept`, `SourceKind AUTOPILOT`, `SchemeOrigin AUTOPILOTO`, `AiQuota`, `QuotaPort` | A6 → P8 · P5 (429 COTA_ESGOTADA) | 6–9, 22–26 | `PROPOSTA → ACEITA` | `RD`, `CS` |
| RF19.CA01 (corpo) | `User`, `ProfileService.self`, contadores | — (corpo do card, ver `RF6`/`_anterior/RF19`) | — | — | `R3`, `PCO`, `PS` |
| RF19.CA02 (corpo) | `ProfileService.ofUser`, `Visibility`, `HypeVisibility` | — | — | — | `R3`, `Guard.requireSameCompany` |
| RF19.CA03 (corpo) | filtros e paginação por sub-aba (querystring) | — | — | — | `R3` |
| RF19.CA04 (corpo) | `DailyTask` único (userId, taskDate) | — (RF44) | — | — | `PS` |
| RF19.CA05 (corpo) | `DeliberativeProfile.deltaJson` | — (RF43/RF45) | — | — | `PS` |
| RF19.CA06 (corpo) | sub-abas institucionais EMPRESA/CHEFE | — (RF28) | — | — | `R3` |
| RF19.CA07 (corpo) | i18n pt-BR/en/es, responsivo | — | — | — | `R3`, `lib/i18n` |
