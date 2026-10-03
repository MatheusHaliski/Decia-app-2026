# Convenções dos diagramas por RF

Cada RF tem a pasta `docs/diagramas/RFnn/` com um único `README.md` contendo, nesta ordem, **cinco diagramas Mermaid** (renderizam no GitHub sem build):

1. `## 1. Diagrama de classes` — `classDiagram`. Só entidades/enums de `docs/arquitetura/TAXONOMIA.md` (mesmos nomes e atributos; pode listar um subconjunto de atributos e terminar com `.. +N campos ..` em nota). Inclui os serviços de aplicação (`XxxService`), portas (`XxxPort`) e adaptadores relevantes, com estereótipos `<<entity>>`, `<<enum>>`, `<<service>>`, `<<port>>`, `<<adapter>>`, `<<controller>>`.
2. `## 2. Diagrama de atividades` — `flowchart TD` com subgraphs por raia (ator humano · Web/BFF · `wai-application` · IA (AiEngine) · Persistência). Decisões em losango `{}`; erros HTTP nomeados como no CA (`422 VALIDACAO`, `403 ACESSO_NEGADO`, `409 ...`).
3. `## 3. Diagrama de sequência` — `sequenceDiagram` com participantes: `Usuário`, `Next.js (App Router)`, `Controller (wai-web)`, `Service (wai-application)`, `AiEngine`, `Repository/MySQL`, `Cassandra`, `OpenSearch`, `Redis`, `S3`, `DomainEvents (AFTER_COMMIT)` — só os que o RF usa. Mostrar o caminho feliz e pelo menos um `alt` de erro do CA.
4. `## 4. Máquina de estados` — `stateDiagram-v2` da entidade central do RF (ex.: `TaskState`, `ProjectStatus`, `SessionStatus`, `SealBondStatus`, `DecisionStatus`). Quando o RF não tem estados próprios, usar os da entidade que ele afeta e dizer qual.
5. `## 5. Diagrama de componentes` — `flowchart LR` (ou `C4Component`) com os módulos Maven `wai-web → wai-application → wai-domain` e `wai-infrastructure/*` (persistence-mysql, persistence-cassandra, search-opensearch, cache-redis, storage-s3, ai-providers, platform), o frontend Next.js (`app/`, `components/ui`) e serviços externos (Claude/Gemini, Google Workspace, Microsoft 365, e-Protocolo) que o RF toca.

Cabeçalho obrigatório de cada README:

```
# RFnn — <título do card do board>
**HU:** HUnn · **Sprint (board Work Station):** n · **Equivalente FAI:** <texto do card> · **Aba/rota:** <se houver>
**Critérios de aceite cobertos:** RFnn.CA01 … (RF1–RF18 não têm CAs no board: derivar das HUs e marcar "CA a confirmar")
```

Depois dos 5 diagramas: `## 6. Rastreabilidade` — tabela `CA → elemento do diagrama (classe / passo / mensagem / transição / componente)`.

Regras Mermaid: sem `<br>` em `classDiagram`; rótulos com `:` ou `()` entre aspas; ids ASCII sem acento (texto pode ter acento); um diagrama por bloco ```mermaid. Nomes de módulos: `wai-domain`, `wai-application`, `wai-infrastructure`, `wai-web`, `wai-bootstrap`. Pacote Java raiz: `br.gov.pr.secid.workai`.
