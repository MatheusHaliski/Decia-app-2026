# RF74 — Capturar PNG e oferecer prévia fantasma multimodal no Drawings
**HU:** — (sem HU no board; RF especificado em 16/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Drawings (`/drawings`, `/drawings/[pieceId]`); peça aberta a partir de `/tasks/[id]`, `/projects/[id]` e da sessão DECIA `/decia/[sessionId]` · **Página-esqueleto:** registrada em 17/10/2026; editores ainda não implementados (Ondas 3–5 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF74.CA01 … RF74.CA12 — corpo do card = especificação de docs/produto/requisitos-studio/RF74.md (CAs copiados como estão escritos); classes reais: `AiGateway` (`503 IA_INDISPONIVEL`, `422 IA_CONTEUDO_RESTRITO`), `AiBudget` (`429 IA_ORCAMENTO_ESGOTADO`), `AiInferenceLogPort`, `MediaUploadService` e `MagicBytes` (PNG pelo conteúdo, teto de 40 MP; ainda não é bean — D-67), `MediaAccessPolicy`, `MediaObject`, `ResourceAuthorizer`, `AccessPolicy`, `lib/ai/autonomy.ts`, `lib/pieces/patch.ts` (`authorizePatch`, `aiScopeIsBounded`), `lib/pieces/provenance.ts` (`IPTC_DIGITAL_SOURCE`), `lib/pieces/authorship.ts`; o restante (planejado)

Com o modo ativado explicitamente, uma pausa de 1,5 s na edição captura um PNG transparente só da área autorizada, junto com revisão, dimensão, transformação e bounding box, sem overlays nem interface. Capturar não é enviar. A inferência remota só acontece depois que o backend revalida autenticação, ACL, classificação, consentimento, escopo, tamanho, limites e orçamento. Um provedor com suporte efetivo a imagem de entrada e PNG transparente de saída devolve duas variantes ("completar objeto" e "completar cena"). As variantes são verificadas em formato, alpha, dimensões e coordenadas, e aparecem sobre a prancheta a cerca de 50% de opacidade, com borda e máscara, sem interceptar o desenho. O aceite converte por vetorizador validado ou insere asset raster ancorado. Nunca promete vetor editável que não existe.

**Estado em 17/10/2026:** a MATRIZ_RF classifica o RF74 como AUSENTE (0,00) no app. A nota de referência 4,3 do PLANO_ONDAS vem da prévia local de 16/10 (`docs/produto/PREVIEW_PNG_MULTIMODAL_DRAWINGS.md`): ali o PNG fantasma é rasterização local de uma proposta vetorial e o teste usa provedor `TESTE_MOCK`, ou seja, não é geração multimodal. O contrato JSON daquele documento (`contextual_drawing_completion`, `baseRevision`, `scope`, `inputImageRef`, `variants`, `agencyLevel`, `budget`) é proposta, não endpoint. Nenhum provedor está registrado no backend (`AiProvidersConfig` vazio; o enum da TAXONOMIA tem CLAUDE, GEMINI e LOCAL). A escolha anterior de OpenAI e a possibilidade Gemini dependem de prova de saída PNG com alpha. Pelo PLANO_ONDAS o RF74 entra na Onda 5: captura → backend multimodal → duas variantes alpha → ancoragem → aceite, com custo, versão e ACL testados. A conclusão segue a prova do RF72: CA → teste → evidência.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF74.CA01** | Dado modo explicitamente ativado, quando há pausa de 1,5 segundo na edição, então captura PNG transparente da área autorizada e metadados de revisão, dimensão, transformação e bounding box, sem capturar overlays ou interfaces. |
| **RF74.CA02** | Dada imagem pronta, quando solicita inferência remota, então backend revalida autenticação, ACL, classificação, consentimento, escopo, tamanho, limites e orçamento; captura local não equivale a autorização de envio. |
| **RF74.CA03** | Dado provedor com suporte efetivo a entrada de imagem e saída PNG transparente, quando executa, então envia imagem e contexto autorizados e retorna variantes para completar objeto e completar cena; capacidades não suportadas produzem erro explícito. |
| **RF74.CA04** | Dada resposta, quando valida, então verifica formato, alpha, dimensões, limites e coordenadas; não confia em coordenadas do modelo sem validação e não executa conteúdo ativo ou URLs arbitrárias. |
| **RF74.CA05** | Dada proposta válida, quando exibe, então coloca PNG sobre a prancheta com opacidade configurável próxima a 50%, borda e máscara da área; imagem não intercepta ações de desenho. |
| **RF74.CA06** | Dadas variantes, quando navega ou refina, então preserva original e contexto, mostra origem/provedor e distingue rasterização local de vetores de PNG efetivamente gerado por modelo multimodal. |
| **RF74.CA07** | Dado aceite, quando aprova, então converte em vetor por pipeline validado ou insere asset raster suportado com ancoragem explícita; sem suporte não promete vetor editável nem insere imagem como vetor fictício. |
| **RF74.CA08** | Dado Enter, Escape e Tab, quando usa ações, então Enter aceita no alvo correto, Escape rejeita e Tab mantém navegação por padrão; aceitar via Tab exige ativação e foco na prancheta. |
| **RF74.CA09** | Dada revisão, região, camada ou acesso alterado enquanto processa, quando a resposta chega, então descarta ou invalida a prévia, cancela trabalho pendente quando suportado e impede sobrescrita de conteúdo novo. |
| **RF74.CA10** | Dados níveis 1–4, quando utiliza a prévia, então respeita RF51: leitura/sugestão/transformação local/plano agêntico autorizados, checkpoints e limites; publicar ou ampliar escopo não ocorre automaticamente. |
| **RF74.CA11** | Dados indisponibilidade, custo limite, timeout ou falha de vetorização, quando ocorrer, então mantém rascunho, anuncia estado e não inicia ciclos pagos ilimitados; registra uso sem vazar PNG ou segredos em logs. |
| **RF74.CA12** | Dada auditoria, quando valida integração, então separa mock, captura local, PNG gerado por modelo e integração real; testa alpha, alinhamento, revisão obsoleta, aceitação/rejeição, acessibilidade e orçamento com evidências reproduzíveis. |

## Origem da imagem e níveis de autonomia

| Origem exibida no cartão | O que é | Pode ser chamada de "gerada por modelo"? |
|---|---|---|
| `CAPTURA_LOCAL` | PNG da área autorizada, feito no navegador | não |
| `RASTER_LOCAL` | rasterização local de proposta vetorial (prévia de 16/10) | não |
| `TESTE_MOCK` | resposta interceptada em teste | não |
| `MODELO_MULTIMODAL` | PNG devolvido pelo provedor, com provedor, modelo e `inferenceId` | sim, depois da validação de alpha, dimensões e coordenadas |

Os níveis 1–4 da especificação (`LETTERS_DRAWINGS_ENGENHARIA.md` §2) convivem com os cinco modos de `lib/ai/autonomy.ts` (D-136). Este é o mapeamento proposto, a confirmar no RF51: MANUAL = prévia desligada; nível 1 leitura = SOB_SOLICITACAO; nível 2 sugestão = SUGESTOES; nível 3 transformação local = ASSISTIDO (aplica só a proposta revisada na mesma revisão); nível 4 plano agêntico = AGENTE (mandato, checkpoint antes de cada passo, `AGENT_LIMITS`). Em nenhum nível há publicação nem ampliação de escopo.

## 0. Diagrama de casos de uso

Casos de uso derivados dos CAs. Todos são planejados: nenhum provedor multimodal está registrado e a prévia local de 16/10 não está no repositório.

```mermaid
flowchart LR
  classDef ator fill:#fde7d3,stroke:#b4531a,color:#1b1b1b
  classDef atorSis fill:#f1ecf9,stroke:#6a4bb3,color:#1b1b1b
  classDef uc fill:#ffffff,stroke:#3557a6,color:#1b1b1b
  classDef ucPlan fill:#ffffff,stroke:#8a8a8a,stroke-dasharray:4 3,color:#555555
  dono["«ator» Dono do recurso"]:::ator
  colaborador["«ator» Colaborador explícito"]:::ator
  admin["«ator» Administrador"]:::ator
  subgraph SIS["Work Station — RF74 Prévia fantasma PNG"]
    direction TB
    UC1(["UC1 Ativar a prévia fantasma"]):::ucPlan
    UC2(["UC2 Capturar PNG da área autorizada"]):::ucPlan
    UC3(["UC3 Pedir variantes ao modelo multimodal"]):::ucPlan
    UC4(["UC4 Revalidar acesso, consentimento e orçamento"]):::ucPlan
    UC5(["UC5 Validar formato, alpha e coordenadas da resposta"]):::ucPlan
    UC6(["UC6 Navegar e refinar variantes na prancheta"]):::ucPlan
    UC7(["UC7 Aceitar variante como vetor ou raster ancorado"]):::ucPlan
    UC8(["UC8 Rejeitar ou descartar prévia obsoleta"]):::ucPlan
    UC9(["UC9 Auditar a integração multimodal"]):::ucPlan
  end
  ia["«ator» IA (AiGateway)"]:::atorSis
  dono --- UC1
  colaborador --- UC1
  dono --- UC3
  colaborador --- UC3
  dono --- UC6
  colaborador --- UC6
  dono --- UC7
  colaborador --- UC7
  dono --- UC8
  colaborador --- UC8
  admin --- UC9
  UC3 -. "«include»" .-> UC2
  UC3 -. "«include»" .-> UC4
  UC3 -. "«include»" .-> UC5
  UC8 -. "«extend»" .-> UC6
  UC3 --- ia
```

| Caso de uso | Ator(es) | CAs | Situação |
|---|---|---|---|
| UC1 Ativar a prévia fantasma | `dono`, `colaborador` | RF74.CA01, RF74.CA10 | planejado |
| UC2 Capturar PNG da área autorizada | — (incluído por UC3) | RF74.CA01 | planejado (captura local não autoriza envio) |
| UC3 Pedir variantes ao modelo multimodal | `dono`, `colaborador`, `ia` | RF74.CA03, RF74.CA11 | planejado (nenhum provedor registrado) |
| UC4 Revalidar acesso, consentimento e orçamento | — (incluído por UC3) | RF74.CA02, RF74.CA11 | planejado (regras reais em `AiGateway` e `AiBudget`) |
| UC5 Validar formato, alpha e coordenadas da resposta | — (incluído por UC3) | RF74.CA04, RF74.CA09 | planejado |
| UC6 Navegar e refinar variantes na prancheta | `dono`, `colaborador` | RF74.CA05, RF74.CA06, RF74.CA08 | planejado |
| UC7 Aceitar variante como vetor ou raster ancorado | `dono`, `colaborador` | RF74.CA07, RF74.CA08 | planejado |
| UC8 Rejeitar ou descartar prévia obsoleta | `dono`, `colaborador` | RF74.CA08, RF74.CA09 | planejado |
| UC9 Auditar a integração multimodal | `admin` | RF74.CA12 | planejado (separa mock, captura local e modelo real) |

## 1. Diagrama de classes

Legenda: **(real)** = código no repositório em 17/10/2026; demais classes **(planejado)**. `MediaObject` e `AiInferenceLog` seguem a TAXONOMIA; `PieceRevision` segue `LETTERS_DRAWINGS_ENGENHARIA.md` §3.

```mermaid
classDiagram
direction LR
namespace previa_planejado {
  class PngCapture {
    <<entity>>
    +id: UUID
    +pieceId: UUID
    +revision: int
    +layerId: String
    +regionId: String
    +width: int
    +height: int
    +transformJson: JSON
    +bboxJson: JSON
    +excludesOverlays: true
  }
  class GhostPreview {
    <<entity>>
    +captureId: UUID
    +baseRevision: int
    +agencyLevel: int
    +state: GhostPreviewState
    +anchoredAs: VETOR_VALIDADO ou RASTER_ANCORADO
  }
  class GhostVariant {
    <<entity>>
    +kind: COMPLETE_OBJECT ou COMPLETE_SCENE
    +mediaId: UUID
    +origin: ImageOrigin
    +provider: String
    +model: String
    +alphaVerified: boolean
    +validatedBboxJson: JSON
    +opacity: decimal
  }
  class GhostPreviewState {
    <<enum>>
    CAPTURADA
    GERANDO
    VARIANTES
    ANCORADA
    DESCARTADA
  }
  class ImageOrigin {
    <<enum>>
    CAPTURA_LOCAL
    RASTER_LOCAL
    TESTE_MOCK
    MODELO_MULTIMODAL
  }
}
class MultimodalPreviewService {
  <<service>>
  +requestVariants(actor, captureId, consent, budget) GhostPreview
  +accept(actor, variantId, currentRevision) PieceRevision
  +discard(actor, previewId) void
}
class PngResponseValidator {
  <<service>>
  +validate(bytes, expectedCanvas) ValidatedImage
}
class MultimodalImagePort {
  <<port>>
  +complete(image, context, variants) List
  +capabilities() ProviderCapabilities
}
class VectorizerPort {
  <<port>>
  +vectorize(png) Scene
}
class MultimodalProviderAdapter {
  <<adapter>>
}
class AiGateway {
  <<service>>
  +infer(req) AiResult
}
class AiBudget {
  <<service>>
}
class MediaUploadService {
  <<service>>
  +upload(owner, candidate, classification, publicAsset) Stored
}
class AiInferenceLog {
  <<entity>>
  +provider: AiProvider
  +model: String
  +estimatedCostUsd: decimal
  +result: String
}
class PieceRevision {
  <<entity>>
  +origin: IA_ACEITA
}
GhostPreview --> PngCapture
GhostPreview "1" --> "0..2" GhostVariant
GhostPreview --> GhostPreviewState
GhostVariant --> ImageOrigin
MultimodalPreviewService ..> AiGateway : orçamento e sigilo
AiGateway ..> AiBudget
MultimodalPreviewService ..> MultimodalImagePort
MultimodalImagePort <|.. MultimodalProviderAdapter
MultimodalPreviewService ..> PngResponseValidator
PngResponseValidator ..> MediaUploadService : MagicBytes e teto de pixels
MultimodalPreviewService ..> VectorizerPort : só se validado
MultimodalPreviewService --> PieceRevision : aceite cria revisão
AiGateway ..> AiInferenceLog : uso sem PNG nem segredo
note for AiGateway "(real) sem chamador de produção, AiProvidersConfig vazio"
note for VectorizerPort "pendente, sem vetorizador validado não há aceite como vetor"
note for MediaUploadService "(real) escrito, ainda não é bean (D-67)"
```

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph ATOR["Ator: editor da peça"]
    A0(["Ativa explicitamente o modo prévia fantasma"])
    A1["Edita e pausa 1,5 s"]
    A2["Pede variantes e confirma consentimento e orçamento"]
    A3{"Enter, Escape ou Tab?"}
  end
  subgraph FE["Next.js: Studio e png-preview (planejado)"]
    F1["Captura PNG transparente da área autorizada, sem guias, seleção ou overlays"]
    F2["Metadados: revisão, dimensão, transformação, bounding box"]
    F3["Variantes a cerca de 50%, borda e máscara, pointer-events none"]
    F4["Cartão com origem, provedor e modelo, original preservado"]
    F5["Estado anunciado, rascunho mantido"]
  end
  subgraph APP["ws-application (planejado)"]
    P1{"ResourceAuthorizer e AccessPolicy: VIEW e EDIT?"}
    P2{"Classificação permite provedor externo?"}
    P3{"Consentimento, escopo limitado, tamanho e orçamento?"}
    P4{"Provedor declara imagem de entrada e PNG com alpha?"}
    P5["PngResponseValidator: formato, alpha, dimensões, limites, coordenadas"]
    P6{"Revisão, região, camada e acesso iguais aos da captura?"}
    P7{"Vetorizador validado disponível?"}
    P8["Insere asset raster ancorado com bounding box validada"]
    P9["Nova PieceRevision, ContributionEvent AI_PROPOSAL_ACCEPTED, manifesto IPTC"]
  end
  subgraph IA["IA (AiEngine)"]
    I1["AiGateway (real) e adaptador multimodal: duas variantes, uma chamada no orçamento"]
  end
  subgraph PER["Persistência"]
    D1[("S3: PNG temporário com expiração, classe pela classificação")]
    D2[("MySQL: ghost_previews e AiInferenceLog sem base64")]
  end
  A0 --> A1 --> F1 --> F2 --> A2 --> P1
  P1 -->|invisível| E1["404 NAO_ENCONTRADO"]
  P1 -->|sem EDIT| E2["403 ACESSO_NEGADO"]
  P1 -->|sim| P2
  P2 -->|RESTRITO ou SIGILOSO| E3["422 IA_CONTEUDO_RESTRITO"] --> F5
  P2 -->|sim| P3
  P3 -->|PNG grande demais| E4["413 ARQUIVO_GRANDE"] --> F5
  P3 -->|orçamento esgotado| E5["429 IA_ORCAMENTO_ESGOTADO"] --> F5
  P3 -->|ok| D1 --> P4
  P4 -->|não| E6["422 FORMATO_NAO_SUPORTADO: capacidade ausente"] --> F5
  P4 -->|sim| I1
  I1 -->|timeout ou falha| E7["503 IA_INDISPONIVEL, sem nova tentativa automática"] --> F5
  I1 -->|variantes| P5
  P5 -->|inválida| E6
  P5 -->|válida| P6
  P6 -->|não| E8["409 REVISAO_DESATUALIZADA: prévia descartada"] --> F5
  P6 -->|sim| F3 --> F4 --> A3
  A3 -->|Escape| E9["Rejeitada: prévia descartada, foco na prancheta"]
  A3 -->|Tab| F4
  A3 -->|Enter no alvo| P7
  P7 -->|sim| P9
  P7 -->|não| P8 --> P9 --> D2
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
  U->>FE: ativa a prévia fantasma e pausa 1,5 s
  FE->>FE: captura PNG da área autorizada (revisão 12, bbox, transformação)
  Note over FE: nada é enviado sem pedido explícito
  U->>FE: pede variantes, confirma consentimento e orçamento de 1 chamada
  FE->>C: POST /api/pieces/{id}/ghost-previews (PNG, baseRevision 12, escopo, agencyLevel 2)
  C->>S: MultimodalPreviewService.requestVariants
  S->>S: ResourceAuthorizer.require(EDIT), classificação, consentimento, escopo
  alt 404 NAO_ENCONTRADO ou 403 ACESSO_NEGADO
    S-->>FE: 404 se invisível, 403 se sem EDIT
  else 413 ARQUIVO_GRANDE
    S-->>FE: 413 PNG acima do teto de pixels ou bytes
  else 422 FORMATO_NAO_SUPORTADO
    S-->>FE: 422 provedor sem entrada de imagem ou sem PNG com alpha
  else autorizado e suportado
    S->>S3: PNG temporário com expiração
    S->>AI: AiGateway.infer com imagem e contexto autorizados
    alt 503 IA_INDISPONIVEL
      AI-->>S: timeout ou indisponível
      S-->>FE: 503, rascunho mantido, sem repetir chamada paga
    else variantes recebidas
      AI-->>S: duas imagens (objeto e cena)
      S->>S: PngResponseValidator confere assinatura, alpha, dimensões e coordenadas
      S->>DB: AiInferenceLog sem base64, PNG ou segredo
      S-->>FE: variantes validadas com origem MODELO_MULTIMODAL, provedor e modelo
    end
  end
  FE-->>U: variantes a 50% com borda e máscara, foco segue no fluxo normal
  U->>FE: Enter no cartão da variante objeto
  FE->>C: POST /api/pieces/{id}/ghost-previews/{previewId}/accept (currentRevision)
  C->>S: accept
  alt 409 REVISAO_DESATUALIZADA
    S-->>FE: 409 revisão, região, camada ou acesso mudou, prévia invalidada
  else revisão confere
    S->>DB: PieceRevision 13 com asset raster ancorado ou vetor validado
    S-->>FE: 201, foco volta à prancheta
  end
```

## 4. Máquina de estados

Entidade central: `GhostPreview.state` (`GhostPreviewState`, planejado). Cada transição grava origem da imagem, provedor e modelo quando houver, `inferenceId`, custo e autor. Só o aceite gera `PieceRevision` e `ContributionEvent`; o manifesto de proveniência usa o tipo de fonte IPTC de `lib/pieces/provenance.ts` (real).

```mermaid
stateDiagram-v2
  [*] --> CAPTURADA: modo ativado e pausa de 1,5 s
  CAPTURADA --> CAPTURADA: nova pausa substitui a captura local
  CAPTURADA --> GERANDO: pedido explícito, backend revalida acesso e orçamento
  CAPTURADA --> DESCARTADA: modo desativado ou peça fechada
  GERANDO --> VARIANTES: duas variantes validadas (alpha, dimensões, coordenadas)
  GERANDO --> DESCARTADA: 503, 429, 422 ou timeout, rascunho mantido
  GERANDO --> DESCARTADA: revisão, região, camada ou acesso mudou, cancela se suportado
  VARIANTES --> VARIANTES: navegar ou refinar dentro do orçamento
  VARIANTES --> ANCORADA: Enter no alvo, vetor validado ou raster ancorado
  VARIANTES --> DESCARTADA: Escape ou 409 REVISAO_DESATUALIZADA
  ANCORADA --> [*]
  DESCARTADA --> [*]
  note right of VARIANTES
    Opacidade perto de 50%, borda e máscara.
    Não intercepta o ponteiro.
  end note
  note left of GERANDO
    Sem ciclos pagos ilimitados.
    Nível 4 exige checkpoint antes.
  end note
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Frontend Next.js"]
    R1["app/(shell)/drawings: página-esqueleto (real) · [pieceId] (planejado)"]
    R2["png-preview · GhostOverlay · VariantCards (planejado)"]
    R3["lib/ai/autonomy.ts · lib/pieces/patch.ts, provenance.ts, authorship.ts (real)"]
    BFF["app/bff"]
    R1 --> R2 --> R3
    R2 --> BFF
  end
  subgraph WEB["ws-web"]
    GPC["GhostPreviewController (planejado)"]
  end
  subgraph APPL["ws-application"]
    MPS["pieces/MultimodalPreviewService · PngResponseValidator (planejado)"]
    RA["security/ResourceAuthorizer (real)"]
    AG["ai/AiGateway · AiBudget · AiInferenceLogPort (real)"]
    MUS["media/MediaUploadService · MagicBytes (real, ainda não é bean)"]
    PORTS["ports: MultimodalImagePort · VectorizerPort (planejado)"]
  end
  subgraph DOM["ws-domain"]
    ENT["PngCapture · GhostPreview · GhostVariant (planejado) · MediaObject · MediaAccessPolicy (real)"]
  end
  subgraph INFRA["ws-infrastructure"]
    AIP["ai-providers: adaptador multimodal (planejado), AiProvidersConfig vazio"]
    S3A["storage-s3: PNG temporário com expiração"]
    MY["persistence-mysql: ai_inference_log · ghost_previews (planejado)"]
  end
  BFF --> GPC --> MPS
  MPS --> RA --> ENT
  MPS --> MUS
  MPS --> AG --> AIP --> EXT[("Provedor multimodal: a escolher com prova de PNG com alpha")]
  MPS --> PORTS --> AIP
  MPS --> S3A --> S3[("S3 / MinIO")]
  AG --> MY --> MYSQL[("MySQL 8")]
```

## 6. Rastreabilidade

| CA | Classe | Passo | Mensagem | Transição | Componente | Prova exigida (RF72) |
|---|---|---|---|---|---|---|
| **RF74.CA01** | `PngCapture` (revisão, dimensão, transformação, bbox, `excludesOverlays`) | A0 → A1 → F1 → F2 | captura local e Note sem envio | `[*] → CAPTURADA` | `R2` | teste com relógio controlado: só dispara com o modo ativo; PNG com alpha, sem guias nem seleção |
| **RF74.CA02** | `MultimodalPreviewService.requestVariants`, `ResourceAuthorizer`, `AiGateway`, `AiBudget` (real) | A2 → P1 → P2 → P3 | `POST .../ghost-previews` com 404, 403 e 413 | `CAPTURADA → GERANDO` | `MPS`, `RA`, `AG` | teste de serviço: cada verificação recusa sozinha; captura local sem pedido não gera requisição |
| **RF74.CA03** | `MultimodalImagePort.capabilities`, `MultimodalProviderAdapter`, `GhostVariant.kind` | P4 → I1 | 422 `FORMATO_NAO_SUPORTADO` e "duas imagens" | `GERANDO → VARIANTES` | `PORTS`, `AIP` | teste de contrato do adaptador e execução real registrada com provedor, modelo e data |
| **RF74.CA04** | `PngResponseValidator`, `MediaUploadService` e `MagicBytes` (real) | I1 → P5 | `PngResponseValidator confere assinatura, alpha...` | `GERANDO → DESCARTADA` | `MPS`, `MUS` | corpus adverso: JPEG renomeado, PNG sem alpha, dimensão errada, coordenadas fora da área, SVG com script |
| **RF74.CA05** | `GhostVariant.opacity`, `GhostOverlay` | F3 | variantes a 50% com borda e máscara | nota de VARIANTES | `R2` | E2E: clique e arraste atravessam a prévia; opacidade configurável; captura do editor |
| **RF74.CA06** | `ImageOrigin`, `GhostVariant.provider/model`, tabela de origem desta página | F4 | origem `MODELO_MULTIMODAL`, provedor e modelo | `VARIANTES → VARIANTES` | `R2`, `R3` | teste: rótulo de origem correto para captura local, raster local, mock e modelo |
| **RF74.CA07** | `VectorizerPort` (pendente), `GhostPreview.anchoredAs` | P7 → P8 → P9 | `accept` com 201 | `VARIANTES → ANCORADA` | `PORTS`, `MPS` | teste: sem vetorizador o aceite cria asset raster ancorado e nunca objeto vetorial |
| **RF74.CA08** | atalhos do cartão e da prancheta | A3 | Enter no cartão da variante | `VARIANTES → ANCORADA` ou `→ DESCARTADA` | `R2` | E2E de teclado: Enter no alvo, Escape rejeita, Tab navega; aceitar via Tab só com opção ativa e foco na prancheta |
| **RF74.CA09** | `GhostPreview.baseRevision`, `proposalValidity` (real) | P6 → E8 | 409 `REVISAO_DESATUALIZADA` | `GERANDO → DESCARTADA`, `VARIANTES → DESCARTADA` | `MPS`, `R3` | teste: editar, trocar camada ou perder acesso durante a geração descarta a resposta sem sobrescrever |
| **RF74.CA10** | `GhostPreview.agencyLevel`, `MODE_CAPABILITIES` e `AGENT_LIMITS` (real), mapeamento desta página | A2 → P3 | `agencyLevel 2` no pedido | nota de GERANDO | `R3`, `MPS` | teste por nível: nível 1 não aplica, nível 4 grava checkpoint; nenhum nível publica ou amplia escopo |
| **RF74.CA11** | `AiBudget` (429), `AiGateway` (503), `AiInferenceLog` sem base64 | I1 → E7 → F5 | `alt 503 IA_INDISPONIVEL` | `GERANDO → DESCARTADA` | `AG`, `MY` | teste: timeout não repete chamada; inspeção de logs sem PNG, base64 ou chave |
| **RF74.CA12** | `ImageOrigin`, `CaEvidence` do RF72 | todo o fluxo | toda a sequência | toda a máquina | `R2`, `MPS`, `AIP` | relatório separando mock, captura local, PNG de modelo e integração real, com alpha, alinhamento, revisão obsoleta, aceite, rejeição, acessibilidade e orçamento |
