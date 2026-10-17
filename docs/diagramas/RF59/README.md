# RF59 — Construir, dividir e desmembrar contornos vetoriais
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF59.CA01 … RF59.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF59.md (CAs copiados como estão escritos); classes reais: `Geometry` e `DrawingNode.parentId` com resolução de descendentes de grupo em `selectedNodeIds` (`lib/studio/selection.ts`), `authorizePatch` (`lib/pieces/patch.ts`), `LayerStack` (`lib/pieces/layers.ts`), `evaluateAiAction`/`proposalValidity` (`lib/ai/autonomy.ts`); o restante (planejado)

O RF59 trata as operações que constroem, dividem e desmembram contornos 2D: booleanas `UNIR`, `SUBTRAIR` e `INTERSECTAR` (Shape Builder fica como `CONSTRUTOR_DE_FORMAS`, fase posterior), `DIVIDIR` em regiões independentes, caminho composto com furo (regra par/ímpar) e `SEPARAR_CAMINHO_COMPOSTO`, `DESAGRUPAR` que só remove o vínculo de grupo, `LIBERAR_MASCARA` que devolve os vetores selecionáveis, e `EXPANDIR` traço ou aparência com aviso de perda de parametrização e versão anterior preservada. Regra central, comum ao RF61: desmembrar nunca descarta propriedades (furos, faces, texto, ordem, estilo) sem avisar; operação que o formato nativo não representa é bloqueada antes de qualquer alteração. Toda operação é acionável por menu, paleta e teclado sobre a seleção corrente (sem exigir arraste, WCAG 2.5.7), com o relatório de preservação lido pelo leitor de tela. Nomes de comando inspirados em Illustrator (Pathfinder, Release Compound Path) e AutoCAD (UNION, EXPLODE), sem promessa de paridade.

Estado real (MATRIZ_RF de 17/10/2026: AUSENTE, 0,00): nesta árvore só existe a hierarquia `parentId` usada pela seleção para alcançar descendentes de grupo e o tipo `path.closed`; não há modelo de furo, máscara nem booleanas. A evidência de 15/10 (`docs/auditoria/2026-10-15/caminhos-compostos/`) mostra furos preservados, liberação de contornos, agrupamento, tesoura e expansão no código local, ainda fora do repositório, e registra que o contrato do servidor não aceita grupos/furos (envio bloqueado para não perder dados). Fontes: `COMANDOS_REFERENCIA_ILLUSTRATOR_AUTOCAD.md` §1, PLANO_ONDAS Onda 5. 3D: booleanas de sólidos e separação de corpos são capacidade futura declarada por operação (RF60.CA05, RF61.CA03).

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF59.CA01** | Dados UNION/Shape Builder, SUBTRACT e INTERSECT, quando combina perfis fechados, então o resultado corresponde à área geométrica esperada. |
| **RF59.CA02** | Dado Pathfinder Divide ou pintura por regiões, quando cruza contornos, então produz regiões independentes selecionáveis e coloríveis. |
| **RF59.CA03** | Dado caminho composto com furo, quando exporta/reabre, então mantém o furo; liberar caminho composto separa contornos explicitamente. |
| **RF59.CA04** | Dado grupo, quando UNGROUP é executado, então remove apenas o vínculo de agrupamento e preserva geometria, texto e ordem. |
| **RF59.CA05** | Dada máscara, quando libera recorte, então mantém os vetores originais e torna os elementos liberados selecionáveis. |
| **RF59.CA06** | Dado Expand/Expand Appearance, quando converte traços ou efeitos, então informa perda de parametrização e preserva versão anterior. |
| **RF59.CA07** | Dada operação não representável no formato nativo, quando é solicitada, então bloqueia sem descartar furos, faces ou conteúdo silenciosamente. |

## 0. Diagrama de casos de uso

O colaborador explícito (e o dono) combina, divide e desmembra contornos 2D; cada operação confere antes se o formato nativo representa o resultado e passa pela verificação de escopo e reserva. Nenhuma dessas operações existe no app.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  colaborador["«ator» Colaborador explícito"]:::ator
  dono["«ator» Dono da peça"]:::ator
  subgraph SIS["Work Station — RF59 Contornos vetoriais"]
    direction TB
    UC1(["UC1 Unir, subtrair ou intersectar perfis"]):::ucPlan
    UC2(["UC2 Dividir contornos em regiões"]):::ucPlan
    UC3(["UC3 Criar caminho composto com furo"]):::ucPlan
    UC4(["UC4 Separar caminho composto"]):::ucPlan
    UC5(["UC5 Desagrupar objetos"]):::ucPlan
    UC6(["UC6 Liberar máscara de recorte"]):::ucPlan
    UC7(["UC7 Expandir traço ou aparência"]):::ucPlan
    UC8(["UC8 Exportar e reabrir mantendo furos"]):::ucPlan
    UC9(["UC9 Verificar representação no formato nativo"]):::ucPlan
    UC10(["UC10 Verificar escopo e reserva (authorizePatch)"]):::ucPlan
    UC11(["UC11 Pedir proposta de operação à IA"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono -- "é um" --> colaborador
  colaborador --- UC1
  colaborador --- UC2
  colaborador --- UC3
  colaborador --- UC4
  colaborador --- UC5
  colaborador --- UC6
  colaborador --- UC7
  colaborador --- UC8
  colaborador --- UC11
  UC1 -. "«include»" .-> UC9
  UC1 -. "«include»" .-> UC10
  UC2 -. "«include»" .-> UC9
  UC2 -. "«include»" .-> UC10
  UC3 -. "«include»" .-> UC9
  UC3 -. "«include»" .-> UC10
  UC4 -. "«include»" .-> UC9
  UC4 -. "«include»" .-> UC10
  UC5 -. "«include»" .-> UC10
  UC6 -. "«include»" .-> UC9
  UC6 -. "«include»" .-> UC10
  UC7 -. "«include»" .-> UC9
  UC7 -. "«include»" .-> UC10
  UC11 -. "«extend»" .-> UC1
  UC11 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Unir, subtrair ou intersectar perfis | `colaborador` | RF59.CA01 | planejado |
| UC2 Dividir contornos em regiões | `colaborador` | RF59.CA02 | planejado |
| UC3 Criar caminho composto com furo | `colaborador` | RF59.CA03 | planejado |
| UC4 Separar caminho composto | `colaborador` | RF59.CA03 | planejado |
| UC5 Desagrupar objetos | `colaborador` | RF59.CA04 | planejado — hierarquia `parentId` em `lib/studio/selection.ts` |
| UC6 Liberar máscara de recorte | `colaborador` | RF59.CA05 | planejado |
| UC7 Expandir traço ou aparência | `colaborador` | RF59.CA06 | planejado |
| UC8 Exportar e reabrir mantendo furos | `colaborador` | RF59.CA03 | planejado |
| UC9 Verificar representação no formato nativo | — (incluído por UC1, UC2, UC3, UC4, UC6, UC7) | RF59.CA06 · CA07 | planejado |
| UC10 Verificar escopo e reserva (authorizePatch) | — (incluído por UC1, UC2, UC3, UC4, UC5, UC6, UC7) | RF59.CA01 · CA04 | planejado — função pura `lib/pieces/patch.ts` |
| UC11 Pedir proposta de operação à IA | `colaborador`, `ia` (estende UC1) | RF59.CA01 · CA07 | planejado — `evaluateAiAction`/`proposalValidity` reais, sem editor |

## 1. Diagrama de classes

**(real)**: `Geometry`, `DrawingNode`, `SelectionEngine`, `PatchAuthorizer`. Demais **(planejado)**; as entidades de servidor não constam de `docs/arquitetura/TAXONOMIA.md`.

```mermaid
classDiagram
direction LR
namespace lib_real {
  class DrawingNode {
    <<entity>>
    +id: string
    +layerId: string
    +parentId: string
    +geometry: Geometry
  }
  class Geometry {
    <<entity>>
    +kind: rect_circle_segment_polygon_path
    +closed: boolean
  }
  class SelectionEngine {
    <<service>>
    +selectedNodeIds(scene, selection) Set~string~
    +editableNodeIds(scene, selection) Set~string~
  }
  class PatchAuthorizer {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
}
namespace front_planejado {
  class CompoundPath {
    <<entity>>
    +outer: List~Point~
    +holes: List~Contour~
    +fillRule: evenodd
  }
  class VectorGroup {
    <<entity>>
    +memberIds: List~string~
    +zOrder: List~string~
  }
  class ClipMask {
    <<entity>>
    +clipPathId: string
    +maskedIds: List~string~
  }
  class BooleanOp {
    <<enum>>
    UNIR
    SUBTRAIR
    INTERSECTAR
    DIVIDIR
    CONSTRUTOR_DE_FORMAS_FUTURO
  }
  class ContourOperation {
    <<service>>
    +boolean(op, operands) List~Geometry~
    +releaseCompound(path) List~Geometry~
    +ungroup(group) List~DrawingNode~
    +releaseMask(mask) List~DrawingNode~
    +expand(nodes) ExpandResult
  }
  class PreservationReport {
    <<entity>>
    +preserved: List~string~
    +lost: List~string~
    +needsConfirmation: boolean
    +blockedReason: string
  }
  class RepresentabilityCheck {
    <<service>>
    +check(op, operands, format) PreservationReport
  }
}
namespace ws_planejado {
  class DrawingCommandService {
    <<service>>
    +apply(actor, pieceId, command) DrawingRevision
  }
  class GeometryKernelPort {
    <<port>>
    +boolean2d(op, operands, tolerance) KernelResult
  }
  class DrawingRepositoryPort {
    <<port>>
    +saveRevision(revision) void
  }
  class MySqlDrawingRepository {
    <<adapter>>
  }
}
DrawingNode --> Geometry
VectorGroup ..> DrawingNode
CompoundPath ..> Geometry
ClipMask ..> DrawingNode
ContourOperation ..> BooleanOp
ContourOperation ..> CompoundPath
ContourOperation ..> VectorGroup
ContourOperation ..> ClipMask
ContourOperation ..> RepresentabilityCheck
RepresentabilityCheck ..> PreservationReport
ContourOperation ..> SelectionEngine
ContourOperation ..> PatchAuthorizer
DrawingCommandService ..> GeometryKernelPort
DrawingCommandService ..> RepresentabilityCheck
DrawingCommandService ..> DrawingRepositoryPort
MySqlDrawingRepository ..|> DrawingRepositoryPort
note for PreservationReport "desmembrar nunca descarta propriedade sem aviso - lost nao vazio exige confirmacao, blockedReason impede a operacao"
note for DrawingNode "(real) parentId ja e usado pela selecao para alcancar descendentes de grupo"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph P["Pessoa"]
    A1["Seleciona operandos (clique, janela, lista navegável ou Ctrl+A no escopo)"]
    A2["Escolhe UNIR, SUBTRAIR, INTERSECTAR, DIVIDIR, SEPARAR_CAMINHO_COMPOSTO, DESAGRUPAR, LIBERAR_MASCARA ou EXPANDIR (menu, paleta ou atalho)"]
    A3["Lê o relatório de preservação e confirma ou cancela"]
    A4["Seleciona e colore as regiões resultantes"]
  end
  subgraph FE["Next.js (App Router) · BFF"]
    F1["editableNodeIds e authorizePatch local (real) antecipam o motivo de bloqueio"]
    F2["RepresentabilityCheck no formato nativo e no contrato do servidor"]
    F3{"Representável?"}
    F4["Bloqueia e explica: nada é alterado nem enviado (furos, faces e conteúdo intactos)"]
    F5{"Há perda de parametrização ou atributo?"}
    F6["Mostra o que se perde (traço vira contorno, efeito vira forma) e que a versão anterior fica guardada"]
    F7["Prévia das regiões com contorno e rótulo, anunciada por aria-live (N regiões, M furos)"]
    F8["POST /api/drawings/[pieceId]/patches com operação, operandos e baseRevision (planejado)"]
  end
  subgraph APP["ws-application"]
    S1{"Peça visível e ator editor?"}
    S2{"Todos os operandos editáveis e fora de reserva alheia?"}
    S3{"GeometryKernelPort: resultado não vazio, sem autointerseção, furos coerentes?"}
    S4["Grava revisão nova, mantém revisão anterior recuperável e o comando inverso"]
    E404["404 NAO_ENCONTRADO"]
    E403["403 ACESSO_NEGADO"]
    E409["409 REGIAO_RESERVADA"]
    E422["422 GEOMETRIA_INVALIDA"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["Pedido explícito: 'separe a janela da parede'"]
    I2["Proposta de operação + PreservationReport, aplicada só após revisão (ASSISTIDO)"]
  end
  subgraph DB["Persistência"]
    D1[("MySQL: drawing_revisions com contornos, furos, grupos e máscaras")]
    D2[("S3: exportação SVG/JSON reaberta para conferir furos (planejado)")]
  end

  A1 --> F1 --> A2 --> F2 --> F3
  F3 -->|"não"| F4
  F3 -->|"sim"| F5
  F5 -->|"sim"| F6 --> A3
  F5 -->|"não"| F7
  A3 -->|"confirma"| F7 --> F8 --> S1
  A3 -->|"cancela"| F4
  S1 -->|"não visível"| E404
  S1 -->|"leitor"| E403
  S1 -->|"ok"| S2 -->|"não"| E409
  S2 -->|"sim"| S3 -->|"não"| E422
  S3 -->|"sim"| S4 --> D1 & D2
  S4 --> A4
  A2 -.->|"assistente"| I1 --> I2 --> F2
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
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)

  U->>N: seleciona dois círculos concêntricos e aciona SUBTRAIR
  N->>N: editableNodeIds e authorizePatch local
  N->>N: RepresentabilityCheck confirma caminho composto com furo
  N-->>U: prévia do anel e aria-live com 1 região e 1 furo
  N->>C: POST /api/drawings/{pieceId}/patches com SUBTRAIR e baseRevision
  C->>S: DrawingCommandService.apply(actor, pieceId, command)
  S->>R: findVisible(pieceId, actor)
  alt peça invisível ou inexistente
    S-->>C: 404 NAO_ENCONTRADO
  else ator sem papel de edição
    S-->>C: 403 ACESSO_NEGADO
  else operando em região reservada por outra pessoa
    S-->>C: 409 REGIAO_RESERVADA e nenhum operando muda
  else resultado vazio ou autointersectante
    S-->>C: 422 GEOMETRIA_INVALIDA e operandos intactos
  else caminho feliz
    S->>R: grava revisão com contorno externo e furo, revisão anterior recuperável
    S-->>C: 200 com nova revisão
    S->>EV: DrawingPatched
  end
  C-->>N: resposta e foco na prancheta
  U->>N: EXPANDIR traço tracejado
  N-->>U: aviso de perda de parametrização do tracejado e versão anterior guardada
  U->>N: confirma
  N->>C: POST /api/drawings/{pieceId}/patches com EXPANDIR
  C->>S: apply com PreservationReport confirmado
  S->>R: grava revisão expandida
  U->>N: exporta e reabre
  N->>C: POST /api/drawings/{pieceId}/exports
  C->>S: exporta a revisão atual
  S->>S3: grava SVG com regra par ou ímpar
  S-->>N: arquivo reaberto mantém o furo
```

## 4. Máquina de estados

Seleção, reserva e comando seguem o RF57; acrescenta-se o **desmembramento** (planejado), que impede perda silenciosa.

```mermaid
stateDiagram-v2
  direction LR
  state Selecao {
    [*] --> VAZIA
    VAZIA --> PARCIAL : operandos em escolha
    PARCIAL --> NOS : operandos editáveis confirmados
    PARCIAL --> REGIAO : pintura por regiões
    NOS --> VAZIA : Escape
    REGIAO --> VAZIA : Escape
  }
  state Reserva {
    [*] --> LIVRE
    LIVRE --> RESERVADA : acquire sem conflito
    RESERVADA --> EXPIRADA : prazo vence
    RESERVADA --> LIBERADA : dono libera
    EXPIRADA --> LIVRE
    LIBERADA --> LIVRE
  }
  state Comando {
    [*] --> EM_EDICAO
    EM_EDICAO --> APLICADO : kernel aprova e revisão é gravada
    APLICADO --> DESFEITO : Ctrl+Z restaura furos, grupo ou máscara
    DESFEITO --> APLICADO : refazer
  }
  state Desmembramento {
    [*] --> ANALISE
    ANALISE --> BLOQUEADO : não representável no formato nativo
    ANALISE --> AVISO_PERDA : perde parametrização ou atributo
    ANALISE --> PRONTO : nada se perde
    AVISO_PERDA --> PRONTO : pessoa confirma
    AVISO_PERDA --> [*] : pessoa cancela
    BLOQUEADO --> [*]
    PRONTO --> [*]
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, página-esqueleto)"]
    ED["DrawingEditor em /drawings/[pieceId] (planejado)"]
    OPS["ContourOperation, RepresentabilityCheck, PreservationReport (planejado)"]
    SEL["lib/studio/selection.ts (real)"]
    PATCH["lib/pieces/patch.ts e layers.ts (real)"]
    AUT["lib/ai/autonomy.ts (real)"]
    UI["components/ui (real)"]
    BFF["BFF /api/drawings (planejado)"]
  end
  subgraph WEB["ws-web"]
    DC["DrawingController (planejado)"]
  end
  subgraph APP["ws-application"]
    DCS["DrawingCommandService (planejado)"]
  end
  subgraph DOM["ws-domain"]
    DD["DrawingRevision, CompoundPath, VectorGroup, ClipMask (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    KER["Vector2dKernelAdapter (planejado)"]
    MY["persistence-mysql (planejado para drawings)"]
    ST["storage-s3 exportações (planejado)"]
  end

  PG --> ED --> OPS & UI & PATCH & AUT
  OPS --> SEL
  ED --> BFF --> DC --> DCS --> DD
  DCS --> KER & MY & ST
```

## 6. Rastreabilidade

| CA | Classe (§1) | Passo da atividade (§2) | Mensagem da sequência (§3) | Transição (§4) | Componente (§5) | Situação |
|---|---|---|---|---|---|---|
| RF59.CA01 | `ContourOperation.boolean`, `BooleanOp`, `GeometryKernelPort.boolean2d` | `A1`, `A2`, `S3`, `E422` | 1–16 | `EM_EDICAO`→`APLICADO` | `OPS`, `KER` | planejado |
| RF59.CA02 | `BooleanOp.DIVIDIR`, `ContourOperation.boolean` | `F7`, `A4` | 4 | `PARCIAL`→`REGIAO` | `OPS`, `SEL` | planejado |
| RF59.CA03 | `CompoundPath` (holes, fillRule), `ContourOperation.releaseCompound` | `F2`, `F7`, `D2` | 3, 12, 22–26 | `APLICADO`→`DESFEITO` | `OPS`, `ST` | planejado (evidência só no código local de 15/10) |
| RF59.CA04 | `VectorGroup`, `ContourOperation.ungroup`, `DrawingNode.parentId` | `A2`, `F5`→`F7` | 5–15 | `ANALISE`→`PRONTO` | `OPS`, `SEL` | `parentId` real; desagrupar planejado |
| RF59.CA05 | `ClipMask`, `ContourOperation.releaseMask` | `A2`, `F7`, `A4` | 5–15 | `ANALISE`→`PRONTO`, `PARCIAL`→`NOS` | `OPS` | planejado |
| RF59.CA06 | `ContourOperation.expand`, `PreservationReport.lost` | `F5`, `F6`, `A3`, `S4` | 16–21 | `ANALISE`→`AVISO_PERDA`→`PRONTO` | `OPS`, `DCS`, `MY` | planejado |
| RF59.CA07 | `RepresentabilityCheck`, `PreservationReport.blockedReason` | `F2`, `F3`, `F4`, `S1`, `S2`, `E404`, `E403`, `E409` | 3, 8–11 | `ANALISE`→`BLOQUEADO` | `OPS`, `DCS` | planejado |

Erros nomeados: `404 NAO_ENCONTRADO`, `403 ACESSO_NEGADO`, `409 REGIAO_RESERVADA`, `422 GEOMETRIA_INVALIDA`; em todos, nenhum operando muda. Nenhum CA é marcado como concluído por este diagrama.
