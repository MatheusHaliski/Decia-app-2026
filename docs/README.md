# Documentação — Work Station / DECIA

| Pasta / arquivo | Conteúdo |
|---|---|
| [`arquitetura/ARQUITETURA.md`](arquitetura/ARQUITETURA.md) | Plano de arquitetura v1: módulos `ws-*`, persistência poliglota, segurança, gate de CI, AiEngine, ordem de implementação |
| [`arquitetura/TAXONOMIA.md`](arquitetura/TAXONOMIA.md) | Taxonomia completa: 12 contextos, todas as entidades e atributos, enums, equivalência FAI → Work Station |
| [`arquitetura/DIAGRAMA_CLASSES_v1.md`](arquitetura/DIAGRAMA_CLASSES_v1.md) | Diagrama de classes v1 do núcleo (Tarefa, Esquema de Projeto, ProjectTask, Plano Anual, Chancela/Vínculo/Benefício, DecisionTrace, DECIA Points) |
| [`diagramas/`](diagramas/) | Um `README.md` por RF (RF1–RF45) com 5 diagramas Mermaid: classes, atividades, sequência, máquina de estados, componentes + rastreabilidade CA → elemento. Regras em [`diagramas/CONVENCOES.md`](diagramas/CONVENCOES.md) |
| [`design-system/DESIGN_SYSTEM.md`](design-system/DESIGN_SYSTEM.md) | Tokens (4 temas, contraste verificado), catálogo de componentes, ícones próprios, estrutura `packages/ui`, página `/lab/design-system` |
| [`design-system/ANATOMIA_CARDS.md`](design-system/ANATOMIA_CARDS.md) | Anatomia dos cards de tarefa e de projeto: camadas, dimensões, 28 variações de layout/estilo/estado, famílias de arte |
| [`design-system/anatomias/index.html`](design-system/anatomias/index.html) | Galeria estática (tokens, ícones, componentes, 112 pranchas SVG) com seletor de tema; capturas em `anatomias/capturas/` |
| [`produto/DECIA_POINTS.md`](produto/DECIA_POINTS.md) | Pesquisa: DECIA Points por objetivos cumpridos, esquemas chancelados e participação no DECIA; economia, antifraude, nova redação do RF42 |
| [`produto/ABAS_POR_PERFIL.md`](produto/ABAS_POR_PERFIL.md) | Pesquisa: matriz de abas × perfis (EMPREGADO, EMPRESA, CHEFE, CURADOR, ADMIN), guards, Comunicados, Minha equipe; wireframe [`lab/perfis.html`](lab/perfis.html) |
| [`produto/DECIA_SESSAO_E_MESA.md`](produto/DECIA_SESSAO_E_MESA.md) | Pesquisa: fluxo/estados da sessão DECIA, anatomia do Esquema de Sessão, Mesa do DECIA, Minuta Coletiva; PlantUML em `produto/decia/`; wireframes [`lab/decia.html`](lab/decia.html); PoC em `lab/poc-coedicao/` |
| [`design-system/ANATOMIAS_E_ESTUDIO.md`](design-system/ANATOMIAS_E_ESTUDIO.md) | Pesquisa: entidades dos esquemas de tarefa e projeto campo a campo, mapeamento das anatomias do FAI, Estúdio de Arte do Card (layouts, estilos, `CardArtConfig`); wireframe [`lab/anatomias.html`](lab/anatomias.html) |
| [`design-system/TOKENS.md`](design-system/TOKENS.md) · [`GLYPHS.md`](design-system/GLYPHS.md) | Design system v2: tokens `--ws-*` calibrados pelo logo (claro/escuro/alto-contraste/terminal), WS Glyphs e WS Moji ([`glyphs/index.html`](design-system/glyphs/index.html)), artes de fundo (`backgrounds/`) |
| [`diagramas/RENUMERACAO.md`](diagramas/RENUMERACAO.md) | Mapa entre a numeração anterior e a atual do board; versões anteriores em `diagramas/_anterior/` |
| [`legal/`](legal/README.md) | Rascunhos v0.1 dos **Termos de Uso** e da **Política de Privacidade** para órgão público (controlador SECID-PR; encarregado via `WS_LEGAL_DPO_NAME`/`WS_LEGAL_DPO_CONTACT`), versões independentes, regra das traduções de cortesia e o teste que recusa marcadores |
| [`produto/CADASTRO_E_LGPD.md`](produto/CADASTRO_E_LGPD.md) | Plano de implementação dos blocos A (aceite dos termos), B (tipos de perfil e validação) e C (configurações e direitos do titular): ordem, dependências da SEG, componentes `packages/ui`, endpoints, jobs, testes-guarda e a tabela requisito → PR → teste → status |
| [`produto/BIBLIOGRAFIA.md`](produto/BIBLIOGRAFIA.md) | Pesquisa: bibliografia de embasamento teórico por tema (estação de trabalho digital, mensageria empresarial, CSCW/groupware, equipes de alto desempenho, recompensa e gamificação, deliberação assistida por IA, memória institucional, setor público), termos de busca pt/en, glossário e mapa tema → contexto → RF |
| [`DECISOES.md`](DECISOES.md) | Decisões tomadas (D-nn), dúvidas abertas (Q-nn) e índice das perguntas das pesquisas |
| `testes/` | Evidências de teste por RF (preenchido a cada PR) |

Fonte de verdade dos requisitos: board Trello **Work Station** (ex-DECIA SECIDPR).
