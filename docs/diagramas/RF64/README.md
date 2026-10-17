# RF64 — Gerar assets, wireframes e detalhes internos parametrizados
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF64.CA01 … RF64.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF64.md (CAs copiados como estão escritos); classes reais: `SuggestedElement`/`RenderMode`/`SubjectKind`/`toWireframe`/`completeWireframe` (`lib/pieces/wireframe.ts`), `authorizePatch`/`PatchOrigin` (`lib/pieces/patch.ts`), `RegionLock`/`canEditRegions` (`lib/pieces/collab.ts`), `DrawingEditTarget.objectPath` (`lib/drawings/selection.ts`), `DrawingNode.parentId`/`editableNodeIds` (`lib/studio/selection.ts`), `AiProposal`/`proposalValidity` (`lib/ai/autonomy.ts`), `AiGateway` (ws-application, sem motor registrado); o restante (planejado)

O RF64 cobre o catálogo de assets parametrizados do Drawings: buscar objetos, pessoas, personagens e geometrias com nome, categoria, dimensões e prévia; gerar estruturas específicas (sofá, mesa, pessoa) com partes semanticamente nomeadas, nunca uma caixa genérica; entrar no wireframe de um objeto reservado para editar partes internas e acrescentar só detalhes compatíveis; transformar partes preservando relações explícitas; aplicar wireframe a uma área inteira respeitando subáreas autorizadas; e reabrir assets importados ou exportados sem perder estrutura.

**Estado em 17/10/2026:** a MATRIZ_RF registra RF64 como LÓGICA SEM INTERFACE (0.30): só `lib/pieces/wireframe.ts` existe, com a conversão para esqueleto (`toWireframe` remove preenchimento e detalhes e lista pendências) e o retorno a preenchido (`completeWireframe`). O catálogo `docs/auditoria/2026-10-15/catalogo-elementos-ia.json` (formas, `subjectKinds` object/person, modos FILLED/WIREFRAME, sete estilos) é evidência de protótipo, não biblioteca de produto; as capturas de `jardim-wireframe` (149 elementos, 43 partes de sete geradores, GLB validado) vêm do checkout de desenvolvimento local. A nota 5.7 do PLANO_ONDAS (Onda 5) pede expandir assets por caso profissional e validar componentes internos, escala e edições com fontes técnicas. Sugestão de substituição por IA é sempre proposta revisável, passa por `authorizePatch` com origem IA e nunca sai do escopo autorizado.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF64.CA01** | Dado catálogo, quando busca por objeto, pessoa, personagem ou geometria, então oferece nomes, categorias, dimensões e prévia de modelos disponíveis. |
| **RF64.CA02** | Dado sofá, mesa ou pessoa, quando gera, então cria estrutura específica com partes semanticamente nomeadas, sem substituí-la por caixa genérica. |
| **RF64.CA03** | Dado objeto reservado, quando entra no wireframe, então seleciona partes internas e oferece somente detalhes compatíveis, como olhos, lábios, puxadores e gavetas. |
| **RF64.CA04** | Dada parte, quando move, rotaciona, substitui ou redimensiona, então preserva relações explícitas com componentes dependentes. |
| **RF64.CA05** | Dado wireframe de área inteira, quando aplica, então abrange objetos das subáreas autorizadas e exclui camadas/regiões alheias. |
| **RF64.CA06** | Dada sugestão de substituição por IA, quando aprovada, então valida limites, revisão, hierarquia e escopo antes de aplicar. |
| **RF64.CA07** | Dado asset importado/exportado, quando reabre, então mantém estrutura, materiais, nomes, dimensões e câmera em formato nativo suportado. |

## Regras de produto

- Gerador sem modelo específico para o pedido responde com a lacuna declarada (“modelo de mesa dobrável ainda não disponível”), nunca com uma caixa genérica rotulada como o objeto.
- Dimensões vêm do modelo paramétrico com unidade explícita (convenção de trabalho, por exemplo 1 unidade = 10 mm); não são medidas certificadas nem normas inferidas.
- Detalhes compatíveis são definidos por `DetailSlot` da parte (rosto aceita olhos e lábios; gaveteiro aceita puxadores e gavetas); detalhes incompatíveis não aparecem na lista.
- Mover, girar, substituir ou redimensionar parte tem alternativa numérica (posição, ângulo, largura, altura) além do arraste (WCAG 2.5.7).
- Conteúdo RESTRITO/SIGILOSO nunca vai a provedor externo: a geração por IA usa motor local ou é recusada; o catálogo determinístico continua disponível.

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: só a conversão para esqueleto (`lib/pieces/wireframe.ts`) existe, sem catálogo nem editor.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  subgraph SIS["Work Station — RF64 Assets e wireframes"]
    direction TB
    UC1(["UC1 Buscar asset no catálogo"]):::ucPlan
    UC2(["UC2 Gerar estrutura com partes nomeadas"]):::ucPlan
    UC3(["UC3 Editar partes internas no wireframe"]):::ucPlan
    UC4(["UC4 Acrescentar detalhe compatível à parte"]):::ucPlan
    UC5(["UC5 Transformar parte preservando relações"]):::ucPlan
    UC6(["UC6 Aplicar wireframe à área inteira"]):::ucPlan
    UC7(["UC7 Revisar sugestão de substituição da IA"]):::ucPlan
    UC8(["UC8 Reabrir asset importado ou exportado"]):::ucPlan
    UC9(["UC9 Verificar o escopo autorizado do patch"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono --- UC1
  colaborador --- UC1
  dono --- UC2
  colaborador --- UC2
  dono --- UC3
  colaborador --- UC3
  dono --- UC4
  colaborador --- UC4
  dono --- UC5
  colaborador --- UC5
  dono --- UC6
  colaborador --- UC6
  dono --- UC7
  colaborador --- UC7
  dono --- UC8
  colaborador --- UC8
  UC5 -. "«include»" .-> UC9
  UC6 -. "«include»" .-> UC9
  UC7 -. "«include»" .-> UC9
  UC4 -. "«extend»" .-> UC3
  UC2 --- ia
  UC7 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Buscar asset no catálogo | `dono`, `colaborador` | RF64.CA01 | planejado |
| UC2 Gerar estrutura com partes nomeadas | `dono`, `colaborador`, `ia` | RF64.CA02 | planejado (gerador sem modelo declara a lacuna) |
| UC3 Editar partes internas no wireframe | `dono`, `colaborador` | RF64.CA03 | planejado |
| UC4 Acrescentar detalhe compatível à parte | `dono`, `colaborador` | RF64.CA03 | planejado |
| UC5 Transformar parte preservando relações | `dono`, `colaborador` | RF64.CA04 | planejado |
| UC6 Aplicar wireframe à área inteira | `dono`, `colaborador` | RF64.CA05 | planejado |
| UC7 Revisar sugestão de substituição da IA | `dono`, `colaborador`, `ia` | RF64.CA06 | planejado (proposta revisável; nenhum motor registrado) |
| UC8 Reabrir asset importado ou exportado | `dono`, `colaborador` | RF64.CA07 | planejado |
| UC9 Verificar o escopo autorizado do patch | — (incluído por UC5, UC6, UC7) | RF64.CA05, RF64.CA06 | planejado (regra pura `authorizePatch` e `canEditRegions`, sem editor) |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR
namespace lib_pieces_real {
  class SuggestedElement {
    <<entity>>
    +id: string
    +kind: SubjectKind
    +name: string
    +mode: RenderMode
    +pendingForUser: List~string~
  }
  class WireframeOps {
    <<service>>
    +toWireframe(el) SuggestedElement
    +completeWireframe(el, fill, details) SuggestedElement
  }
  class AuthorizePatch {
    <<service>>
    +authorizePatch(stack, locks, req, now) PatchVerdict
  }
  class ProposalValidity {
    <<service>>
    +proposalValidity(policy, proposal, rev, editableIds) Verdict
  }
}
namespace ws_domain_assets_planejado {
  class AssetCatalogEntry {
    <<entity>>
    +id: UUID
    +name: String
    +category: String
    +kind: SubjectKind
    +dimensions: Dimensions
    +previewRef: String
    +version: int
  }
  class AssetPart {
    <<entity>>
    +id: UUID
    +parentId: UUID
    +semanticName: String
    +transform: Matrix
    +materialId: UUID
  }
  class PartRelation {
    <<entity>>
    +fromPartId: UUID
    +toPartId: UUID
    +kind: RelationKind
    +constraint: String
  }
  class RelationKind {
    <<enum>>
    ANEXADO_A
    ALINHADO_A
    CONTIDO_EM
    SIMETRICO_A
  }
  class DetailSlot {
    <<entity>>
    +partId: UUID
    +acceptedDetails: List~String~
  }
  class AssetService {
    <<service>>
    +search(query) List~AssetCatalogEntry~
    +generate(templateId, params) AssetInstance
    +enterWireframe(objectId, leaseId) List~AssetPart~
    +transformPart(partId, op) Revision
    +applyAreaWireframe(regionId, leaseId) Revision
  }
  class AssetFormatPort {
    <<port>>
    +export(asset, format) Bytes
    +import(bytes) AssetInstance
  }
  class AiDrawingProposal {
    <<entity>>
    +id: UUID
    +command: String
    +policyVersion: int
    +baseRevision: long
    +targetIds: List~UUID~
    +status: AiProposalStatus
  }
}
AssetCatalogEntry "1" --> "*" AssetPart : gera
AssetPart "1" *-- "*" AssetPart : partes internas
AssetPart "1" --> "*" PartRelation
PartRelation --> RelationKind
AssetPart "1" --> "0..1" DetailSlot
AssetService ..> AuthorizePatch : manual e IA
AssetService ..> WireframeOps
AssetService ..> AssetFormatPort
AiDrawingProposal ..> ProposalValidity : antes de aplicar
AssetService ..> AiDrawingProposal : substituição proposta
note for WireframeOps "real em lib/pieces/wireframe.ts - wireframe nunca traz preenchimento"
note for AssetFormatPort "planejado - formato nativo ws-asset.json com câmera, GLB e SVG como exportação"
note for AiDrawingProposal "planejado - status SOLICITADA, GERADA, EM_REVISAO, ACEITA, REJEITADA, INVALIDADA_POR_POLITICA"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph PES["Pessoa (autor ou colaborador autorizado)"]
    P0(["Busca no catálogo: objeto, pessoa, personagem ou geometria"]) --> P1["Escolhe modelo pela prévia, categoria e dimensões"]
    P1 --> P2(["Gera sofá, mesa ou pessoa com parâmetros"])
    P3(["Reserva o objeto e entra no wireframe"]) --> P4["Seleciona parte interna e escolhe detalhe compatível"]
    P5(["Move, gira, substitui ou redimensiona parte por arraste ou campos numéricos"])
    P6(["Aplica wireframe à área inteira"])
    P7(["Revisa sugestão de substituição da IA"]) --> P8{"Aprova?"}
    P9(["Exporta ou importa asset e reabre"])
  end
  subgraph BFF["Next.js / BFF (app/(shell)/drawings)"]
    B1["Lista com nome, categoria, dimensões, unidade e prévia"]
    B2["Árvore de partes com nomes semânticos e pendências do wireframe"]
    B3["Prévia da proposta separada do desenho, com custo, versão e origem"]
  end
  subgraph APP["ws-application"]
    S1{"Modelo específico disponível?"}
    S2["AssetService.generate cria partes nomeadas e relações"]
    S3{"Reserva válida e authorizePatch ok?"}
    S4["DetailSlot filtra detalhes compatíveis"]
    S5["Resolve PartRelation e propaga aos dependentes"]
    S6["Expande subáreas autorizadas e exclui camadas e regiões alheias"]
    S7{"proposalValidity: política, revisão, hierarquia e escopo"}
    S8{"AiGateway: classe, orçamento e motor"}
    S9{"Formato nativo suportado?"}
  end
  subgraph IA["IA (AiEngine)"]
    I1["Propõe substituição de parte (ex.: braço do sofá) com justificativa"]
  end
  subgraph DB["Persistência"]
    D1[("OpenSearch: índice do catálogo (planejado)")]
    D2[("MySQL: asset, partes, relações e revisões (planejado)")]
    D3[("S3: ws-asset.json, GLB e prévias")]
    D4[("ai_inference_log: custo, modelo e versão")]
  end
  E403["403 ACESSO_NEGADO"]
  E409["409 REGIAO_RESERVADA"]
  E422["422 VALIDACAO (modelo inexistente, detalhe incompatível, relação violada ou formato não suportado)"]
  E429["429 ORCAMENTO_IA"]
  E503["503 IA_INDISPONIVEL"]
  P0 --> D1 --> B1 --> P1
  P2 --> S1
  S1 -->|não| E422
  S1 -->|sim| S2 --> D2 --> B2
  P3 --> S3
  P5 --> S3
  P6 --> S3
  S3 -->|"sem acesso à peça"| E403
  S3 -->|"região de outra pessoa"| E409
  S3 -->|"fora da seleção"| E422
  S3 -->|"ok, wireframe"| S4 --> B2 --> P4
  S3 -->|"ok, transformação"| S5
  S5 -->|"relação violada"| E422
  S5 -->|ok| D2
  S3 -->|"ok, área"| S6 --> D2
  B2 --> S8
  S8 -->|"orçamento esgotado"| E429
  S8 -->|"sem motor ou RESTRITO sem motor local"| E503
  S8 -->|ok| I1 --> D4
  I1 --> B3 --> P7
  P8 -->|sim| S7
  P8 -->|não| B2
  S7 -->|"obsoleta ou fora do escopo"| E422
  S7 -->|ok| S3
  P9 --> S9
  S9 -->|não| E422
  S9 -->|sim| D3
```

## 3. Diagrama de sequência

```mermaid
sequenceDiagram
  autonumber
  participant U as Usuário
  participant N as Next.js (App Router)
  participant C as Controller (ws-web)
  participant S as Service (ws-application)
  participant AI as AiEngine
  participant DB as Repository/MySQL
  participant OS as OpenSearch
  participant S3 as S3
  participant EV as DomainEvents (AFTER_COMMIT)
  U->>N: busca sofá no catálogo
  N->>C: GET /api/drawings/assets?q=sofá
  C->>S: AssetService.search
  S->>OS: consulta catálogo autorizado
  S-->>N: nomes, categorias, dimensões com unidade e prévias
  U->>N: gera sofá de três lugares
  N->>C: POST /api/drawings/pieceId/assets (templateId, parâmetros)
  C->>S: AssetService.generate
  alt modelo específico ausente
    S-->>N: 422 VALIDACAO (lacuna declarada, sem caixa genérica)
  end
  S->>DB: grava partes nomeadas (assento, encosto, braços, pés) e PartRelation
  S-->>N: árvore de partes e revisão
  U->>N: reserva o sofá e entra no wireframe
  N->>C: POST /api/drawings/pieceId/leases (layerId, regionIds, objectPath)
  C->>S: DrawingLeaseService.acquire
  alt sem acesso à peça
    S-->>N: 403 ACESSO_NEGADO
  else região de outra pessoa
    S-->>N: 409 REGIAO_RESERVADA (sem revelar conteúdo)
  end
  S-->>N: lease com fencingToken e expiresAt do servidor
  U->>N: pede à IA substituição do braço
  N->>C: POST /api/drawings/pieceId/ai/proposals (command substituir, targetIds)
  C->>S: AiGateway.infer
  alt orçamento esgotado
    S-->>N: 429 ORCAMENTO_IA (IA_ORCAMENTO_ESGOTADO)
  else sem motor registrado
    S-->>N: 503 IA_INDISPONIVEL (catálogo determinístico segue disponível)
  end
  S->>AI: complete(contexto mascarado da parte)
  AI-->>S: substituição proposta
  S->>DB: AiDrawingProposal EM_REVISAO e ai_inference_log
  S-->>N: prévia separada com custo, modelo e versão
  U->>N: aprova a substituição
  N->>C: POST /api/drawings/pieceId/ai/proposals/id/accept
  C->>S: proposalValidity e authorizePatch IA
  alt revisão, política, hierarquia ou escopo mudou
    S-->>N: 422 VALIDACAO (proposta invalidada, rascunho preservado)
  end
  S->>DB: aplica patch e propaga PartRelation
  S->>EV: AssetChanged após commit
  U->>N: exporta e reabre
  N->>C: GET /api/drawings/pieceId/assets/id/export?format=ws-asset
  C->>S: AssetFormatPort.export
  S->>S3: grava estrutura, materiais, nomes, dimensões e câmera
  S-->>N: arquivo nativo reabrível
```

## 4. Máquina de estados

Entidades: proposta de substituição da IA (`AiDrawingProposal.status`, planejado sobre `AiProposal` real), reserva do objeto (`DrawingLease`, planejado sobre `RegionLock` real) e modo do asset (`RenderMode` real em `lib/pieces/wireframe.ts`).

```mermaid
stateDiagram-v2
  state "Proposta de IA (AiDrawingProposal.status)" as PROP {
    [*] --> SOLICITADA: pedido explícito de substituição
    SOLICITADA --> GERADA: AiGateway devolve parte candidata
    GERADA --> EM_REVISAO: prévia separada com custo e versão
    EM_REVISAO --> ACEITA: aprovada e proposalValidity ok
    EM_REVISAO --> REJEITADA: usuário rejeita
    EM_REVISAO --> INVALIDADA_POR_POLITICA: revisão, hierarquia, política ou escopo mudou
    ACEITA --> [*]
    REJEITADA --> [*]
    INVALIDADA_POR_POLITICA --> [*]
  }
  state "Reserva do objeto (DrawingLease)" as LEASE {
    [*] --> LIVRE
    LIVRE --> RESERVADA: acquire sem conflito na camada
    RESERVADA --> RESERVADA: renovação com fencing token
    RESERVADA --> LIBERADA: dono libera
    RESERVADA --> EXPIRADA: relógio do servidor
    LIBERADA --> [*]
    EXPIRADA --> [*]
  }
  state "Modo do asset (RenderMode)" as RENDER {
    [*] --> FILLED
    FILLED --> WIREFRAME: toWireframe remove preenchimento e detalhes
    WIREFRAME --> FILLED: completeWireframe pelo usuário
  }
```

Entrar no wireframe exige reserva `RESERVADA`; ao expirar, o editor volta a somente leitura e o rascunho local é preservado. Falhas 429/503 não criam proposta.

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    PG["app/(shell)/drawings/page.tsx (real, esqueleto)"]
    ED["AssetWorkbench, PartTree, AiAssistantDrawer (planejado)"]
    LIB["lib/pieces/wireframe.ts, patch.ts, collab.ts e lib/ai/autonomy.ts (real)"]
    PG --> ED --> LIB
  end
  subgraph WEB["ws-web"]
    DC["DrawingAssetController (planejado)"]
  end
  subgraph APPL["ws-application"]
    AS["AssetService e DrawingLeaseService (planejado)"]
    AIS["DrawingAiService (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    GW["ai/AiGateway (real)"]
  end
  subgraph DOM["ws-domain"]
    ENT["AssetCatalogEntry, AssetPart, PartRelation, DetailSlot (planejado)"]
  end
  subgraph INFRA["ws-infrastructure"]
    MY["persistence-mysql"]
    OSA["search-opensearch (catálogo)"]
    S3A["storage-s3 (assets e prévias)"]
    AIP["ai-providers (sem motor)"]
  end
  EXT["Claude / Gemini (não registrados)"]
  ED --> DC --> AS --> RA
  DC --> AIS --> GW --> AIP -.-> EXT
  AS --> ENT --> MY --> MYSQL[("MySQL 8")]
  AS --> OSA --> OPENS[("OpenSearch")]
  AS --> S3A --> S3[("S3 / MinIO")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente |
|---|---|---|---|---|---|
| RF64.CA01 | `AssetCatalogEntry` (name, category, kind, dimensions, previewRef), `AssetService.search` | P0 → D1 → B1 → P1 | GET assets?q= | — | `OSA`, `ED` |
| RF64.CA02 | `AssetService.generate`, `AssetPart.semanticName`, `PartRelation` | P2 → S1 → S2 → D2 → B2 (ou E422) | POST assets, alt 422 lacuna declarada | — | `AS`, `ENT` |
| RF64.CA03 | `DetailSlot.acceptedDetails`, `SuggestedElement.pendingForUser` (real), `editableNodeIds` (real) | P3 → S3 → S4 → B2 → P4 | POST leases, alt 403/409 | LEASE `LIVRE → RESERVADA`; RENDER `FILLED → WIREFRAME` | `LIB`, `AS` |
| RF64.CA04 | `PartRelation` (ANEXADO_A, ALINHADO_A, CONTIDO_EM, SIMETRICO_A), `AssetService.transformPart` | P5 → S3 → S5 → D2 (ou E422) | aplica patch e propaga PartRelation | — | `AS`, `MY` |
| RF64.CA05 | `AssetService.applyAreaWireframe`, `canEditRegions` (real), `canEditDrawingTarget` (real) | P6 → S3 → S6 → D2 | POST leases | LEASE `RESERVADA` | `AS`, `LIB` |
| RF64.CA06 | `AiDrawingProposal`, `ProposalValidity` (real), `AuthorizePatch` origem IA (real), `AiGateway` (real) | B2 → S8 → I1 → B3 → P7 → P8 → S7 → S3 | ai/proposals, accept, alt 422/429/503 | PROP `EM_REVISAO → ACEITA / INVALIDADA_POR_POLITICA` | `AIS`, `GW`, `AIP` |
| RF64.CA07 | `AssetFormatPort` (ws-asset.json nativo, GLB, SVG) | P9 → S9 → D3 (ou E422) | GET export?format=ws-asset | — | `S3A` |
