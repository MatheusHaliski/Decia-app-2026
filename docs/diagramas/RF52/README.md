# RF52 — Editar documentos estruturados no Work Station Letters
**HU:** — (sem HU no board; RF especificado em 15/10/2026) · **Sprint (board Work Station):** lista *Requisitos Funcionais* sem sprint atribuída · **Equivalente FAI:** — · **Aba/rota:** Letters (`/letters`, `/letters/[pieceId]`; peça aberta a partir de `/tasks/[id]` e da sessão DECIA `/decia/[sessionId]`) · **Página-esqueleto:** registrada em 17/10/2026; editor ainda não implementado (Onda 4 do PLANO_ONDAS)
**Critérios de aceite cobertos:** RF52.CA01 … RF52.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF52.md (CAs copiados como estão escritos); classes reais: `lib/pieces/service.ts` (WorkPiece, PiecesService em memória), `lib/pieces/authorship.ts`, `TaskService`, `ResourceAuthorizer`, `AccessPolicy`, página-esqueleto `app/(shell)/letters/page.tsx`; o restante (planejado)

A pessoa abre no Letters um documento vinculado a uma tarefa ou a uma sessão DECIA, insere e reorganiza títulos, parágrafos, listas, tabelas, referências e imagens em blocos com identificador estável, formata só o trecho selecionado com desfazer, navega por sumário, busca e numeração de parágrafos sem perder a seleção, importa e exporta apenas formatos habilitados com relatório de fidelidade, e cada gravação é uma revisão autorizada e versionada no servidor.

**Estado em 17/10/2026.** O app não tem editor Letters (MATRIZ_RF: AUSENTE, nota 0,00): existe só a página-esqueleto `/letters` com os CAs e, fora do app, o protótipo `docs/exemplo_drawings_letters/work_station_letters_drawings.tsx` (texto plano, sem blocos persistidos). Reais e reaproveitados: `WorkPiece`/`PiecesService` em memória (`lib/pieces/service.ts`, sem rota HTTP), a cadeia de autoria (`lib/pieces/authorship.ts`), `TaskService` (primeiro chamador de `ResourceAuthorizer`, 409 `EDICAO_CONCORRENTE` por versão, D-135) e `AccessPolicy` (SIGILOSO só dono e colaboradores explícitos, D-139). Planejado: modelo `TextDocument` de blocos (LETTERS_DRAWINGS_ENGENHARIA §3), comandos tipados idempotentes, importação/exportação com teste de ida e volta.

**Heurística × mock × IA real.** Este RF não usa IA: formatação, sumário, busca, numeração e validação de importação são determinísticas (cliente e servidor). Conversores de formato em testes são *mock* e o formato só aparece como operacional quando o adaptador real passa no teste de ida e volta.

Comandos com nomes do próprio produto (não prometem paridade com outros editores): `letters.bloco.inserir`, `letters.bloco.mover`, `letters.trecho.formatar`, `letters.historico.desfazer`, `letters.navegar.sumario`, `letters.navegar.buscar`, `letters.navegar.paragrafo`, `letters.arquivo.importar`, `letters.arquivo.exportar`.

## Critérios de aceite

| CA | Enunciado (Dado / Quando / Então) |
|---|---|
| **RF52.CA01** | Dado um documento, quando insere e reorganiza títulos, parágrafos, listas, tabelas, referências e imagens, então mantém estrutura semântica e ordem na reabertura. |
| **RF52.CA02** | Dada seleção de texto, quando formata estilo, fonte, tamanho, alinhamento, recuo e espaçamento, então afeta apenas o trecho e permite desfazer. |
| **RF52.CA03** | Dado documento longo, quando navega no sumário, busca ou numeração de parágrafos, então foca o trecho correto sem perder seleção. |
| **RF52.CA04** | Dada importação de formato suportado, quando valida e abre, então informa limitações de fidelidade e não descarta conteúdo silenciosamente. |
| **RF52.CA05** | Dada exportação TXT, PDF, DOCX ou formato nativo, quando o formato está habilitado, então preserva o conteúdo previsto e tem teste de ida e volta; formatos pendentes não aparecem como operacionais. |
| **RF52.CA06** | Dado uso por teclado e leitor de tela, quando percorre ferramentas e editor, então há rótulos, foco visível e ações acessíveis. |
| **RF52.CA07** | Dado conteúdo malformado ou excessivo, quando é importado, então rejeita com motivo, preserva o documento atual e não executa scripts. |

## 1. Diagrama de classes

```mermaid
classDiagram
direction LR

class WorkPiece {
  <<entity>>
  +id: UUID
  +taskId: UUID
  +ownerId: UUID
  +kind: PieceKind
  +accessClass: AccessClassification
  +version: long
  +state: PieceState
}
class PieceState {
  <<enum>>
  RASCUNHO
  EM_REVISAO
  PUBLICADA
  ARQUIVADA
}
class PieceRevision {
  <<entity>>
  +id: UUID
  +version: long
  +contentHash: String
  +commandId: UUID
  +origin: ContributionOrigin
}
class TextDocument {
  <<entity>>
  +schemaVersion: String
  +blocks: List~TextBlock~
}
class TextBlock {
  <<entity>>
  +id: String
  +kind: BlockKind
  +order: int
  +paragraphNumber: String
  +marks: List~TextMark~
}
class BlockKind {
  <<enum>>
  TITULO
  PARAGRAFO
  LISTA
  TABELA
  REFERENCIA
  IMAGEM
}
class TextMark {
  <<entity>>
  +start: int
  +end: int
  +style: String
  +font: String
  +size: Decimal
  +align: String
  +indent: Decimal
  +spacing: Decimal
}
class FormatCapability {
  <<entity>>
  +format: String
  +status: CapabilityStatus
  +roundTripTestId: String
}
class ImportReport {
  <<entity>>
  +accepted: boolean
  +fidelityLosses: List~String~
  +rejectedReason: String
}
class PieceService {
  <<service>>
  +open(actor, pieceId) DocumentView
  +applyCommand(actor, pieceId, command) PieceRevision
  +undo(actor, pieceId, commandId) PieceRevision
}
class DocumentTransferService {
  <<service>>
  +importFile(actor, pieceId, upload) ImportReport
  +exportFile(actor, pieceId, format) ExportArtifact
}
class DocumentConverterPort {
  <<port>>
  +read(bytes, format) TextDocument
  +write(doc, format) bytes
}
class ResourceAuthorizer {
  <<service>>
  +require(actor, resource, action) void
}
class TaskService {
  <<service>>
  +get(actor, id) TaskView
}
class PieceController {
  <<controller>>
  +get(pieceId) DocumentView
  +postCommand(pieceId, body) RevisionView
  +postImport(pieceId, file) ImportReport
  +postExport(pieceId, format) ExportView
}

WorkPiece --> PieceState : state
WorkPiece "1" --> "*" PieceRevision : revisões
PieceRevision "1" --> "1" TextDocument : conteúdo
TextDocument "1" --> "*" TextBlock : ordem
TextBlock --> BlockKind
TextBlock "1" --> "*" TextMark : marcas por trecho
PieceController ..> PieceService
PieceController ..> DocumentTransferService
PieceService ..> ResourceAuthorizer : VIEW e EDIT
PieceService ..> TaskService : vínculo com a tarefa
DocumentTransferService ..> DocumentConverterPort
DocumentTransferService ..> FormatCapability : só OPERACIONAL
DocumentTransferService ..> ImportReport

note for WorkPiece "(real) interface TS em lib/pieces/service.ts, (planejado) entidade Java"
note for ResourceAuthorizer "(real) 404 uniforme, SIGILOSO sem ADMIN implícito"
note for TaskService "(real) acervo/TaskService, versão e 409 EDICAO_CONCORRENTE"
note for DocumentConverterPort "(planejado) sem adaptador, formatos pendentes ocultos"
```

Legenda: **(real)** `WorkPiece` (só a interface TS em memória), `ResourceAuthorizer`, `TaskService`; o contrato de revisão por versão segue o já usado em `TaskService`. **(planejado)** `PieceState`, `PieceRevision`, `TextDocument`, `TextBlock`, `BlockKind`, `TextMark`, `FormatCapability`, `ImportReport`, `PieceService`, `DocumentTransferService`, `DocumentConverterPort`, `PieceController` (modelo canônico de `LETTERS_DRAWINGS_ENGENHARIA.md` §3; nenhum HTML arbitrário é fonte confiável).

## 2. Diagrama de atividades

```mermaid
flowchart TD
  subgraph H["Usuário"]
    A0(["Abre peça a partir da tarefa ou da sessão DECIA"])
    A1["Insere ou move blocos, formata a seleção"]
    A2["Navega por sumário, busca ou número de parágrafo"]
    A3["Escolhe arquivo para importar"]
    A4{"Aceita as perdas de fidelidade informadas?"}
    A5["Escolhe formato de exportação"]
  end
  subgraph W["Web/BFF (Next.js)"]
    W1["Editor com regiões rotuladas, foco visível e atalhos acessíveis"]
    W2["Rascunho local até confirmação do servidor"]
    W3["Foca o bloco alvo e restaura a seleção"]
    W4["Lista só formatos OPERACIONAIS"]
    W5["Mostra ImportReport"]
  end
  subgraph S["ws-application"]
    S1{"ResourceAuthorizer: visível?"}
    S2{"EDIT e versão esperada iguais?"}
    S3["Aplica comando tipado e grava revisão"]
    S4{"Tamanho, tipo real e estrutura válidos?"}
    S5["Converte sem executar scripts e lista perdas"]
    S6{"Formato habilitado com teste de ida e volta?"}
    S7["Gera exportação da versão escolhida"]
  end
  subgraph P["Persistência"]
    P1[("PieceRevision e TextDocument, MySQL")]
    P2[("Original importado e exportações, S3")]
  end
  A0 --> S1
  S1 -->|"não"| E404["404 NAO_ENCONTRADO"]
  S1 -->|"sim"| W1 --> A1 --> W2 --> S2
  S2 -->|"sem EDIT"| E403["403 ACESSO_NEGADO"]
  S2 -->|"versão divergente"| E409["409 EDICAO_CONCORRENTE, rascunho preservado e comparação"]
  S2 -->|"ok"| S3 --> P1
  W1 --> A2 --> W3
  W1 --> A3 --> S4
  S4 -->|"não"| E422["422 VALIDACAO motivo IMPORTACAO_REJEITADA, documento atual intacto"]
  S4 -->|"sim"| S5 --> P2
  S5 --> W5 --> A4
  A4 -->|"sim"| S3
  A4 -->|"não"| W1
  W1 --> W4 --> A5 --> S6
  S6 -->|"não"| E422F["422 VALIDACAO motivo FORMATO_INDISPONIVEL"]
  S6 -->|"sim"| S7 --> P2
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
  participant B as S3
  participant E as DomainEvents (AFTER_COMMIT)

  U->>N: Abre /letters/{pieceId}
  N->>C: GET /api/pieces/{id}
  C->>S: PieceService.open(actor, id)
  S->>R: ResourceAuthorizer.require(VIEW)
  alt peça invisível ou inexistente
    S-->>N: 404 NAO_ENCONTRADO
  else visível
    S->>R: última PieceRevision e TextDocument
    S-->>N: blocos ordenados, versão e ETag
  end
  U->>N: letters.bloco.inserir tabela e letters.bloco.mover título
  N->>C: POST /api/pieces/{id}/commands com commandId e expectedVersion
  C->>S: PieceService.applyCommand
  alt versão divergente
    S-->>N: 409 EDICAO_CONCORRENTE, rascunho local preservado
  else leitor sem permissão de edição
    S-->>N: 403 ACESSO_NEGADO
  else aplicado
    S->>R: PieceRevision n+1 com ordem e marcas
    S->>E: PieceRevised
    S-->>N: nova versão, indicador salvo só agora
  end
  U->>N: letters.arquivo.importar
  N->>C: POST /api/pieces/{id}/imports
  C->>S: DocumentTransferService.importFile
  alt malformado, excessivo ou com conteúdo ativo
    S-->>N: 422 VALIDACAO motivo IMPORTACAO_REJEITADA, documento atual intacto
  else suportado
    S->>B: guarda o original sem alteração
    S-->>N: ImportReport com perdas de fidelidade para confirmar
  end
  U->>N: letters.arquivo.exportar em DOCX
  N->>C: POST /api/pieces/{id}/exports
  C->>S: DocumentTransferService.exportFile
  alt formato PENDENTE
    S-->>N: 422 VALIDACAO motivo FORMATO_INDISPONIVEL
  else formato OPERACIONAL com teste de ida e volta
    S->>B: artefato da versão escolhida com expiração
    S-->>N: link e identificação da versão
  end
```

## 4. Máquina de estados

Entidade central: a peça Letters (`WorkPiece.state`, planejado). RF52 não gera propostas de IA; a proposta é mostrada porque o mesmo documento recebe propostas de RF53–RF55 e cada comando manual muda a revisão-base delas.

```mermaid
stateDiagram-v2
  state PecaLetters {
    [*] --> RASCUNHO: criada vazia, de modelo, de importação ou de artefato DECIA
    RASCUNHO --> RASCUNHO: comando tipado gera nova PieceRevision
    RASCUNHO --> EM_REVISAO: pessoa envia versão para revisão
    EM_REVISAO --> RASCUNHO: devolvida ou conteúdo alterado
    EM_REVISAO --> PUBLICADA: publicação explícita por humano autorizado
    PUBLICADA --> RASCUNHO: nova revisão de trabalho, versão publicada preservada
    RASCUNHO --> ARQUIVADA: arquivar
    PUBLICADA --> ARQUIVADA: arquivar
    ARQUIVADA --> RASCUNHO: restaurar
    note right of RASCUNHO
      Importação rejeitada não muda o estado nem a revisão.
      Exportação não publica a peça.
    end note
  }
  state PropostaIA {
    [*] --> PROPOSTA
    PROPOSTA --> ACEITA: aceite explícito na mesma revisão
    PROPOSTA --> REJEITADA: rejeitada
    PROPOSTA --> INVALIDADA_POR_POLITICA: autonomia alterada
    PROPOSTA --> OBSOLETA_POR_REVISAO: comando manual mudou a revisão-base
  }
```

## 5. Diagrama de componentes

```mermaid
flowchart LR
  subgraph FRONT["Next.js app/ e components/"]
    LP["app/(shell)/letters, página-esqueleto (real)"]
    LE["app/(shell)/letters/[pieceId] e LettersEditor (planejado)"]
    UI["components/ui, rótulos e foco (real)"]
    BFF["app/bff"]
  end
  subgraph LIB["lib/*"]
    PS["lib/pieces/service.ts e authorship.ts (real, em memória)"]
  end
  subgraph WEB["ws-web"]
    PC["PieceController (planejado)"]
  end
  subgraph APP["ws-application"]
    PSV["pieces/PieceService e DocumentTransferService (planejado)"]
    TS["acervo/TaskService (real)"]
    RA["security/ResourceAuthorizer (real)"]
  end
  subgraph DOM["ws-domain"]
    AP["security/AccessPolicy (real)"]
    ENT["WorkPiece, PieceRevision, TextDocument (planejado)"]
  end
  subgraph INF["ws-infrastructure"]
    MY["persistence-mysql pieces e piece_revisions (planejado)"]
    S3A["storage-s3 originais e exportações"]
    PLT["platform conversores de formato (planejado)"]
  end
  LP --> LE --> UI
  LE --> PS
  LE --> BFF --> PC --> PSV
  PSV --> RA --> AP
  PSV --> TS
  PSV --> ENT --> MY
  PSV --> S3A
  PSV --> PLT
```

## 6. Rastreabilidade

| CA | Classe | Passo (atividade) | Mensagem (sequência) | Transição | Componente |
|---|---|---|---|---|---|
| **RF52.CA01** | `TextDocument`, `TextBlock` (id estável, `order`, `BlockKind`), `PieceRevision` | A1 → W2 → S2 → S3 → P1 | 1–7 e 8–15 | `RASCUNHO → RASCUNHO` (nova revisão) | `LE`, `PSV`, `MY` |
| **RF52.CA02** | `TextMark` (start, end, style, font, size, align, indent, spacing), `PieceService.undo` | A1 → S3 | 8–15 | `RASCUNHO → RASCUNHO` | `LE`, `PSV` |
| **RF52.CA03** | `TextBlock.paragraphNumber`, sumário derivado dos `TITULO` | A2 → W3 | — (navegação local sobre a versão aberta) | — | `LE` |
| **RF52.CA04** | `ImportReport.fidelityLosses`, `DocumentConverterPort.read`, original preservado | A3 → S4 → S5 → W5 → A4 | 16–21 | `RASCUNHO → RASCUNHO` só após aceite | `PSV`, `PLT`, `S3A` |
| **RF52.CA05** | `FormatCapability` (status, roundTripTestId), `DocumentTransferService.exportFile` | W4 → A5 → S6 → S7, E422F | 22–27 | nenhuma (exportar não publica) | `PSV`, `PLT`, `S3A` |
| **RF52.CA06** | comandos `letters.*` com rótulo acessível e atalho, região nomeada sem `main` aninhado (ARQUITETURA_PAINEIS_EDITOR_IA) | W1 | — | — | `UI`, `LE` |
| **RF52.CA07** | `ImportReport.rejectedReason`, validação de tamanho, tipo real e estrutura | S4 → E422 | 18–19 | nenhuma (documento atual intacto) | `PSV`, `PLT` |

Regras transversais refletidas: autorização no servidor em toda leitura e comando (`ResourceAuthorizer`, 404 uniforme); SIGILOSO só dono e colaboradores explícitos (D-139); macros e scripts nunca executados; exportação e importação não publicam; nenhuma publicação automática.
