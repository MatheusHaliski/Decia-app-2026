# RF72 — Validar qualidade, desempenho e evidências dos editores
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`) e Drawings (`/drawings`, `/drawings/[pieceId]`); peça aberta a partir de `/tasks/[id]`, `/projects/[id]` e da sessão DECIA `/decia/[sessionId]` · **Página-esqueleto:** registrada em 17/10/2026; editores ainda não implementados (Ondas 3–5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF72.CA01 … RF72.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF72.md (CAs copiados como estão escritos); classes reais: `.github/workflows/ci.yml` (mvn verify, vitest, lint, typecheck, build, contrato OpenAPI, Trivy), `docs/diagramas/_tools/checar.py`, `scripts/rf/gerar-catalogo.mjs` (`parseReadme`) e `lib/rf/catalog.test.ts`, `docs/auditoria/2026-10-17/scripts/gerar-matriz.py` (rubrica explícita) e `jornada.mjs` (Playwright, duas contas, `evidencias/JORNADA.json`), `AiGatewayTest`, `lib/ai/autonomy.test.ts`, `lib/pieces/*.test.ts`, `lib/studio/selection.test.ts`, `components/tasks/tasks.test.tsx`; o restante (planejado)

Define a prova de conclusão de todo RF dos editores: cada CA aponta para um teste automatizado ou uma validação manual reproduzível, com versão/commit e evidência guardada. Uma funcionalidade só é "concluída" quando todos os CAs do RF têm essa tripla CA → teste → evidência. Notas de qualidade usam rubrica explícita; nota acima de 8 exige medição. Demonstrações do Drawings usam capturas reais do editor. Colaboração se prova com duas sessões autenticadas. IA se avalia com corpus versionado, sem confundir mock com integração real. Acessibilidade e desempenho têm orçamento declarado por tamanho de documento ou cena. O relatório de funcionalidades distingue implementado local, publicado, validado, parcial e pendente; script de inventário não prova implementação.

**Estado em 17/10/2026:** a MATRIZ_RF classifica o RF72 como LÓGICA SEM INTERFACE (0,30 → 0,60). A CI de `main` estava vermelha (npm ci, vitest de `.tsx`) e foi restaurada em `4c6d05e`; `lib/auth/lease.test.ts` ainda é instável (cerca de 1 em 5). A auditoria de 16/10 não era reproduzível: 20 dos 51 componentes citados não existem no repositório, e 50 dos 74 RF se apoiavam neles. Por isso as notas de 17/10 foram refeitas pelo código publicado, com a rubrica de `gerar-matriz.py` (funcionalidade 30 %, eficiência 20 %, visual 15 %, recuperação 15 %, acessibilidade 10 %, feedback 10 %; "n/v" fica fora da média). A jornada real UI → BFF → API → MySQL passou em 17 de 17 passos com duas contas sintéticas e sem IA. Nenhum teste com usuários foi feito, e a qualidade real da IA continua não verificada. Pelo PLANO_ONDAS o RF72 é transversal (nota de referência 5,35): manter a matriz CA → teste → evidência, benchmarks e amostra com usuários reais por domínio e acessibilidade.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF72.CA01** | Dada entrega de RF, quando é marcada como concluída, então cada CA tem evidência, versão/commit e teste ou validação manual reproduzível. |
| **RF72.CA02** | Dadas notas de qualidade, quando publica auditoria, então usa rubrica explícita; nota superior a 8 exige medição e não apenas novo rótulo. |
| **RF72.CA03** | Dados cenários complexos, quando demonstra Drawings, então mostra etapas de criação, wireframe, refino, câmera e resultado final com capturas reais do editor. |
| **RF72.CA04** | Dada colaboração, quando valida, então usa duas sessões autenticadas e testa concorrência, expiração, revogação e escopos sobrepostos. |
| **RF72.CA05** | Dados modelos de IA, quando avalia, então usa corpus/benchmark versionado, orçamento de testes e métricas por nível, sem confundir mocks com integração real. |
| **RF72.CA06** | Dados acessibilidade e desempenho, quando valida, então registra teclado/leitor de tela e orçamento de latência/memória em tamanhos de documento/cena definidos. |
| **RF72.CA07** | Dado catálogo de funcionalidades desejadas, quando gera relatório, então distingue implementado local, publicado, validado, parcial e pendente; script de inventário não conta como prova de implementação. |

## Formato da prova (vale para RF69–RF74)

Cada README de RF dos editores traz, na §6, a coluna "Prova exigida (RF72)". O registro de conclusão de um CA tem estes campos:

| Campo | Conteúdo | Exemplo real de 17/10/2026 |
|---|---|---|
| CA | id copiado da especificação | RF4 (criar tarefa), passo da jornada |
| Versão | commit publicado (não "local") | `97611a0`, `013657a`, `474b6cb` |
| Teste | arquivo e nome do teste, ou roteiro manual numerado | `docs/auditoria/2026-10-17/scripts/jornada.mjs` |
| Evidência | saída versionada ou captura do editor real | `evidencias/JORNADA.json`, `evidencias/04-conflito-edicao-desktop.png` |
| Origem da IA | `NENHUMA`, `TESTE_MOCK` ou provedor real com modelo e data | jornada sem IA |
| Estado | PENDENTE · IMPLEMENTADO_LOCAL · PUBLICADO · VALIDADO · PARCIAL | ver §4 |

## 1. Diagrama de classes

Legenda: **(real)** = scripts, testes e CI no repositório em 17/10/2026; demais classes **(planejado)**. Os registros de prova não são entidades da TAXONOMIA (vivem no repositório de documentação); `AiInferenceLog` é da TAXONOMIA e alimenta o benchmark.

```mermaid
classDiagram
direction LR
namespace prova_planejado {
  class CaEvidence {
    <<entity>>
    +caId: String
    +rfId: String
    +commit: String
    +testRef: String
    +manualProcedureRef: String
    +evidenceRefs: List
    +aiOrigin: NENHUMA TESTE_MOCK REAL
    +status: EvidenceStatus
    +verifiedAt: Instant
  }
  class EvidenceStatus {
    <<enum>>
    PENDENTE
    IMPLEMENTADO_LOCAL
    PUBLICADO
    VALIDADO
    PARCIAL
  }
  class QualityRubric {
    <<entity>>
    +version: String
    +weightsJson: JSON
    +scale: String
  }
  class QualityScore {
    <<entity>>
    +rfId: String
    +value: decimal
    +rubricVersion: String
    +measurementRef: String
    +partial: boolean
  }
  class AiBenchmarkRun {
    <<entity>>
    +corpusVersion: String
    +level: int
    +budgetUsd: decimal
    +metricsJson: JSON
    +provider: String
    +isMock: boolean
  }
  class PerfBudget {
    <<entity>>
    +sceneSize: String
    +latencyMsP95: int
    +memoryMb: int
  }
  class CollabTestRun {
    <<entity>>
    +sessionA: String
    +sessionB: String
    +scenarios: concorrência expiração revogação escopo
  }
}
namespace ferramentas_real {
  class CiWorkflow {
    <<service>>
    +mvnVerify()
    +vitest()
    +lintTypecheckBuild()
    +openApiDiff()
  }
  class ChecarPy {
    <<service>>
    +checar(path) falhas
  }
  class GerarCatalogo {
    <<service>>
    +parseReadme(id, md) RfEntry
  }
  class GerarMatriz {
    <<service>>
    +rubrica 30 20 15 15 10 10
  }
  class Jornada {
    <<service>>
    +duasContas()
    +capturas()
  }
}
class AiInferenceLog {
  <<entity>>
  +provider: CLAUDE GEMINI LOCAL
  +model: String
  +result: OK FALLBACK ERRO BLOQUEADO_SIGILO
  +estimatedCostUsd: decimal
}
CaEvidence --> EvidenceStatus
QualityScore --> QualityRubric : versão
QualityScore ..> CaEvidence : medição referenciada
AiBenchmarkRun ..> AiInferenceLog : custo e resultado
CollabTestRun ..> CaEvidence : RF65 RF66 RF69
PerfBudget ..> CaEvidence
CiWorkflow ..> CaEvidence : teste automatizado
Jornada ..> CaEvidence : captura e JSON
GerarMatriz ..> QualityScore
GerarCatalogo ..> ChecarPy : mesmos READMEs
note for GerarCatalogo "(real) inventário: não é prova de implementação"
note for Jornada "(real) docs/auditoria/2026-10-17/scripts/jornada.mjs, 17 de 17 passos"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator: desenvolvedor, auditor ou QA"]
    A0(["Marca um RF como concluído"])
    A1(["Publica nota de qualidade"])
    A2(["Demonstra cenário complexo do Drawings"])
    A3(["Gera relatório do catálogo de funcionalidades"])
  end
  subgraph FE["Next.js / BFF sob teste"]
    F1["Playwright com duas contas autenticadas"]
    F2["Capturas reais: criação, wireframe, refino, câmera, resultado"]
    F3["Teclado, leitor de tela e axe no escopo declarado"]
  end
  subgraph APP["ws-application sob teste"]
    P1{"Todo CA tem commit, teste ou roteiro e evidência?"}
    P2{"Nota maior que 8?"}
    P3{"Há medição referenciada?"}
    P4["Concorrência, expiração, revogação e escopos sobrepostos"]
    P5["Orçamento de latência e memória por tamanho de cena"]
    P6{"Item tem prova além do inventário?"}
  end
  subgraph IA["IA (AiEngine)"]
    I1{"Origem da resposta?"}
    I2["TESTE_MOCK: valida fluxo, não qualidade"]
    I3["Real: corpus versionado, orçamento, métricas por nível 1 a 4"]
  end
  subgraph PER["Persistência das provas"]
    D1[("Repositório: docs/auditoria/data/evidencias, MATRIZ_RF.json")]
    D2[("CI: relatórios surefire, JaCoCo, vitest")]
  end
  A0 --> P1
  P1 -->|não| E1["RF permanece PARCIAL ou PENDENTE"]
  P1 -->|sim| D1
  A1 --> P2
  P2 -->|não| D1
  P2 -->|sim| P3
  P3 -->|não| E2["Nota recusada: rótulo novo não é medição"]
  P3 -->|sim| D1
  A2 --> F2 --> D1
  F1 --> P4
  P4 -->|409 REVISAO_DESATUALIZADA esperado| D2
  P4 -->|revogado, 404 NAO_ENCONTRADO esperado| D2
  F3 --> P5 --> D1
  I1 -->|mock| I2 --> D1
  I1 -->|real| I3 --> D1
  I1 -->|503 IA_INDISPONIVEL| E3["Registrado como não verificado, nunca como aprovado"]
  A3 --> P6
  P6 -->|não| E4["Rótulo pendente ou implementado local"]
  P6 -->|sim| D1
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant UA as Usuário (sessão A)
  participant UB as Usuário (sessão B)
  participant FE as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant S3 as S3
  UA->>FE: entra com a conta A e abre /drawings/[pieceId]
  UB->>FE: entra com a conta B (colaborador explícito) e abre a mesma peça
  UA->>FE: SALVAR r5
  FE->>C: POST /api/pieces/{id}/revisions (expectedVersion 4)
  C->>S: save
  S->>DB: versão 4 → 5
  S-->>FE: 201 r5
  UB->>FE: SALVAR sobre a versão 4
  FE->>C: POST /api/pieces/{id}/revisions (expectedVersion 4)
  C->>S: save
  alt 409 REVISAO_DESATUALIZADA
    S-->>FE: 409, rascunho de B preservado
  end
  UA->>FE: revoga a colaboração de B
  FE->>C: DELETE /api/pieces/{id}/collaborators/{b}
  UB->>FE: tenta salvar de novo
  FE->>C: POST /api/pieces/{id}/revisions
  C->>S: save relê ACL
  alt 404 NAO_ENCONTRADO
    S-->>FE: 404 igual para inexistente e invisível
  end
  UA->>FE: roda o benchmark de proposta nível 2 com corpus v3
  FE->>C: POST /api/pieces/{id}/proposals (benchmark, orçamento de testes)
  C->>S: avalia com AiGateway
  alt 503 IA_INDISPONIVEL
    S-->>FE: 503, resultado registrado como não verificado
  else provedor real respondeu
    S->>AI: corpus versionado, nível 2
    AI-->>S: propostas
    S->>DB: AiInferenceLog com provedor, modelo, custo e resultado
    S-->>FE: métricas por nível, separadas das execuções TESTE_MOCK
  end
  FE->>S3: capturas reais e JSON da execução
  Note over UA,S3: Cada passo vira CaEvidence com commit, teste e evidência
```

## 4. Máquina de estados

Entidade central: `CaEvidence.status` (`EvidenceStatus`, planejado), um por CA. O estado do RF é o menor estado entre os seus CAs. Cada transição registra quem verificou, o commit e a evidência; mudar uma rubrica ou um corpus exige nova medição.

```mermaid
stateDiagram-v2
  [*] --> PENDENTE: CA especificado
  PENDENTE --> IMPLEMENTADO_LOCAL: código existe só em máquina local
  IMPLEMENTADO_LOCAL --> PUBLICADO: commit publicado no repositório
  PENDENTE --> PUBLICADO: commit publicado
  PUBLICADO --> VALIDADO: teste ou roteiro reproduzível passa e evidência guardada
  PUBLICADO --> PARCIAL: só parte do CA coberta ou evidência com mock
  PARCIAL --> VALIDADO: cobertura completa medida
  VALIDADO --> PARCIAL: regressão na CI ou teste instável
  note right of VALIDADO
    Inventário ou rótulo não muda estado.
    Nota maior que 8 exige medição.
  end note
  note left of PARCIAL
    TESTE_MOCK nunca prova integração real.
    503 IA_INDISPONIVEL fica não verificado.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    R1["app/(shell)/letters e drawings: página-esqueleto (real) · editores (planejado)"]
    VT["vitest: lib/pieces, lib/ai/autonomy, lib/studio/selection, components/tasks (real)"]
    PW["Playwright: jornada.mjs, duas contas (real) · cenários de editor (planejado)"]
    RF["lib/rf/catalog.gen.ts e catalog.test.ts (real)"]
  end
  subgraph CI["CI .github/workflows/ci.yml (real)"]
    J1["API: mvn verify, JaCoCo, Checkstyle, SpotBugs, Testcontainers"]
    J2["Front: lint, typecheck, vitest, i18n, build, npm audit"]
    J3["Contrato OpenAPI → TypeScript sem diff · Trivy"]
  end
  subgraph WEB["ws-web"]
    CT["controllers sob teste (TaskController real · PieceController planejado)"]
  end
  subgraph APPL["ws-application"]
    SV["serviços sob teste (TaskService, ResourceAuthorizer real)"]
    AG["ai/AiGateway e AiGatewayTest (real)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql: Testcontainers MySQL"]
    S3A["storage-s3: capturas e artefatos de teste"]
    AIP["ai-providers: sem provedor registrado"]
  end
  subgraph DOCS["Repositório de documentação"]
    CK["docs/diagramas/_tools/checar.py · scripts/rf/gerar-catalogo.mjs (inventário)"]
    MX["auditoria: gerar-matriz.py, MATRIZ_RF, evidencias/"]
  end
  R1 --> PW --> CT --> SV --> MY --> MYSQL[("MySQL 8")]
  SV --> AG -.-> AIP -.-> EXT[("Claude / Gemini")]
  SV --> S3A --> S3[("S3 / MinIO")]
  J2 --> VT
  J1 --> SV
  J2 --> RF
  CK --> RF
  PW --> MX
  J1 --> MX
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente | Prova exigida (RF72) |
|---|---|---|---|---|---|---|
| **RF72.CA01** | `CaEvidence` (commit, teste, evidência), coluna "Prova exigida" das §6 de RF69–RF74 | A0 → P1 → E1 | Note final da sequência | `PUBLICADO → VALIDADO` | `CI`, `MX` | toda conclusão de RF lista CA, commit, teste e evidência; RF sem a tripla completa fica PARCIAL |
| **RF72.CA02** | `QualityRubric`, `QualityScore.measurementRef`, `GerarMatriz` (rubrica real) | A1 → P2 → P3 → E2 | — | nota de VALIDADO | `MX` | auditoria publicada traz rubrica versionada; nota > 8 aponta medição reproduzível |
| **RF72.CA03** | `CaEvidence.evidenceRefs` com capturas | A2 → F2 | `FE->>S3` capturas reais | `PUBLICADO → VALIDADO` | `PW`, `S3A` | sequência de capturas do editor publicado: criação, wireframe, refino, câmera e resultado |
| **RF72.CA04** | `CollabTestRun` (sessões A e B) | F1 → P4 | `UB` recebe 409 `REVISAO_DESATUALIZADA` e 404 após revogação | — | `PW`, `CT` | E2E com duas contas autenticadas cobrindo concorrência, expiração, revogação e escopos sobrepostos |
| **RF72.CA05** | `AiBenchmarkRun` (corpus, nível, orçamento, `isMock`), `AiInferenceLog` | I1 → I2 ou I3 → E3 | `alt 503 IA_INDISPONIVEL` e ramo do provedor real | nota de PARCIAL | `AG`, `AIP` | corpus versionado, orçamento declarado, métricas por nível e separação explícita de `TESTE_MOCK` |
| **RF72.CA06** | `PerfBudget`, verificação de teclado e leitor de tela | F3 → P5 | — | `PUBLICADO → VALIDADO` | `PW`, `R1` | relatório com tamanhos de cena definidos, p95 de latência, memória e roteiro de leitor de tela |
| **RF72.CA07** | `EvidenceStatus` (cinco estados), `GerarCatalogo` como inventário | A3 → P6 → E4 | — | toda a máquina | `CK`, `RF`, `MX` | relatório do catálogo com os cinco estados; teste garante que inventário sozinho não marca VALIDADO |
