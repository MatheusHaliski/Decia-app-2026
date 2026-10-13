# Documentação — Work Station / DECIA

| Pasta / arquivo | Conteúdo |
|---|---|
| [`arquitetura/ARQUITETURA.md`](arquitetura/ARQUITETURA.md) | Plano de arquitetura v1: módulos `ws-*`, persistência poliglota, segurança, gate de CI, AiEngine, ordem de implementação |
| [`arquitetura/TAXONOMIA.md`](arquitetura/TAXONOMIA.md) | Taxonomia completa: 12 contextos, todas as entidades e atributos, enums, equivalência FAI → Work Station |
| [`arquitetura/DIAGRAMA_CLASSES_v1.md`](arquitetura/DIAGRAMA_CLASSES_v1.md) | Diagrama de classes v1 do núcleo (Tarefa, Esquema de Projeto, ProjectTask, Plano Anual, Chancela/Vínculo/Benefício, DecisionTrace, DECIA Points) |
| [`diagramas/`](diagramas/) | Um `README.md` por RF (RF1–RF45) com 5 diagramas Mermaid: classes, atividades, sequência, máquina de estados, componentes + rastreabilidade CA → elemento. Regras em [`diagramas/CONVENCOES.md`](diagramas/CONVENCOES.md) |
| [`design-system/DESIGN_SYSTEM.md`](design-system/DESIGN_SYSTEM.md) | Tokens (4 temas, contraste verificado), catálogo de componentes, ícones próprios, estrutura `packages/ui`, página `/lab/design-system` |
| [`design-system/ANATOMIA_CARDS.md`](design-system/ANATOMIA_CARDS.md) | Anatomia dos cards de tarefa e de projeto: camadas, dimensões, zonas, famílias de arte; §8 aponta para as variações (50 pranchas) |
| [`design-system/anatomias/index.html`](design-system/anatomias/index.html) | Galeria estática (tokens, ícones, componentes, 200 pranchas SVG = 50 variações × 4 temas, incl. Variações · Visões · Esquemas compostos) com seletor de tema; capturas em `anatomias/capturas/` |
| [`produto/DECIA_POINTS.md`](produto/DECIA_POINTS.md) | Pesquisa: DECIA Points por objetivos cumpridos, esquemas chancelados e participação no DECIA; economia, antifraude, nova redação do RF42 |
| [`produto/ABAS_POR_PERFIL.md`](produto/ABAS_POR_PERFIL.md) | Pesquisa: matriz de abas × perfis (EMPREGADO, EMPRESA, CHEFE, CURADOR, ADMIN), guards, Comunicados, Minha equipe; wireframe [`lab/perfis.html`](lab/perfis.html) |
| [`produto/DECIA_SESSAO_E_MESA.md`](produto/DECIA_SESSAO_E_MESA.md) | Pesquisa: fluxo/estados da sessão DECIA, anatomia do Esquema de Sessão, Mesa do DECIA, Minuta Coletiva; PlantUML em `produto/decia/`; wireframes [`lab/decia.html`](lab/decia.html); PoC em `lab/poc-coedicao/` |
| [`PLANO_EXECUCAO.md`](PLANO_EXECUCAO.md) | **Plano de execução de tudo o que falta**: blocos de segurança 4–8, LGPD A–C, DECIA 7–12 e mensageria, estado e onda de cada um dos 48 RFs, grafo de dependências, reserva de numeração D/Q/V |
| [`decia/00_README.md`](decia/00_README.md) | **DECIA como infraestrutura de decisão (v1)**: auditoria, matriz bibliográfica, modelo funcional (contexto 5b), Decision Card frente/verso, workspace, 5 exemplos, blueprint, backlog; vetores em `contracts/decia/` |
| [`design-system/ANATOMIAS_E_ESTUDIO.md`](design-system/ANATOMIAS_E_ESTUDIO.md) | **Catálogo definitivo (v3)** dos Esquemas de Tarefa (15 fichas por `TaskType`) e de Projeto: variações (estado, favorito, Tarefa do Dia, atribuído, chancela, modelo/Balcão, remix, importada, destaque, conformidade, cenário…), visões Quadro · Linha do tempo · Mesa, esquemas compostos (kit, agrupamento, plano), contexto × layout, contrato visual ↔ dados (`TaskCardVariant`/`ProjectCardVariant`/`SchemeView`, D-50), Estúdio do card (`CardArtConfig`), Q-140…Q-151; wireframe [`lab/anatomias.html`](lab/anatomias.html) |
| [`design-system/TOKENS.md`](design-system/TOKENS.md) · [`GLYPHS.md`](design-system/GLYPHS.md) | Design system v2: tokens `--ws-*` calibrados pelo logo (claro/escuro/alto-contraste/terminal), WS Glyphs e WS Moji ([`glyphs/index.html`](design-system/glyphs/index.html)), artes de fundo (`backgrounds/`) |
| [`diagramas/RENUMERACAO.md`](diagramas/RENUMERACAO.md) | Mapa entre a numeração anterior e a atual do board; versões anteriores em `diagramas/_anterior/` |
| [`legal/`](legal/README.md) | Rascunhos v0.1 dos **Termos de Uso** e da **Política de Privacidade** para órgão público (controlador SECID-PR; encarregado via `WS_LEGAL_DPO_NAME`/`WS_LEGAL_DPO_CONTACT`), versões independentes, regra das traduções de cortesia e o teste que recusa marcadores |
| [`produto/CADASTRO_E_LGPD.md`](produto/CADASTRO_E_LGPD.md) | Plano de implementação dos blocos A (aceite dos termos), B (tipos de perfil e validação) e C (configurações e direitos do titular): ordem, dependências da SEG, componentes `packages/ui`, endpoints, jobs, testes-guarda e a tabela requisito → PR → teste → status |
| [`produto/BIBLIOGRAFIA.md`](produto/BIBLIOGRAFIA.md) | Pesquisa: bibliografia de embasamento teórico por tema (estação de trabalho digital, mensageria empresarial, CSCW/groupware, equipes de alto desempenho, recompensa e gamificação, deliberação assistida por IA, memória institucional, setor público), termos de busca pt/en, glossário e mapa tema → contexto → RF |
| [`DECISOES.md`](DECISOES.md) | Decisões tomadas (D-nn), dúvidas abertas (Q-nn) e índice das perguntas das pesquisas |
| `testes/` | Evidências de teste por RF (preenchido a cada PR) |

Fonte de verdade dos requisitos: board Trello **Work Station** (ex-DECIA SECIDPR).

## Nova proposta de cooperação — RF49

[Estudo aprofundado do Work Station e proposta](produto/ESTUDO_WORK_STATION_RF49.md) · [RF49: Pactos de Desbloqueio e critérios de aceite](diagramas/RF49/README.md). A proposta liga dependências entre equipes a compromissos negociados e entregas verificáveis. Estado: especificado, implementação pendente.

[Arquivos da auditoria e pacote completo para download](auditoria/2026-10-11/README.md). A matriz histórica contém os 48 RF originais; o RF49 é acompanhado separadamente.

## Super Editor e Work Station Letters

[Desenho funcional do Super Editor de Peças e do Letters](produto/WORK_STATION_LETTERS.md): edição técnica/operacional, documentos ligados à execução, assistência de IA durante a edição, revisão, custo, confidencialidade e plano incremental. Proposta ainda não implementada.

## Análise de Perfil — RF50

[RF50: recomendações no Copilot a partir do perfil](diagramas/RF50/README.md): tarefas, projetos, pessoas com perfil semelhante na rede e caminhos profissionais, com justificativas, consentimento, fontes e aceite explícito. Estado: especificado, implementação pendente.

## Plano integrado dos três objetivos

[Plano de execução da jornada](produto/PLANO_INTEGRADO_TRES_OBJETIVOS.md) · [Reestruturação dos 50 RF](produto/MATRIZ_REESTRUTURACAO_RF.md) · [Páginas e abas](produto/MATRIZ_PAGINAS_ABAS.md) · [Rede profissional e visibilidade](produto/REDE_PROFISSIONAL_VISIBILIDADE.md) · [Drawer e editores de peças](produto/DRAWER_EDITOR_DE_PECAS.md). Estado: plano/especificação; não representa conclusão de implementação.
