# Gestão de Projetos de TI e Governança de TI no Work Station — mapa da disciplina

Base: aulas de **Gestão de Projetos de TI** (Temas 1–5) e de **Governança de TI** (TE1–TE5), BSI 2026 com foco ENADE; PMBOK 5/6/7,
Scrum Guide 2020, COBIT 2019, ISO/IEC 38500, ITIL 4 e o Guia de PDTIC do SISP. O pedido do dono do produto foi implementar
"todo o conteúdo conceitual e prático da disciplina", além do Gantt. Este documento diz, tópico por tópico, **onde a teoria vive
no app** e **o que ainda falta**.

Legenda: ✔ implementado (frontend, dados DEMO em memória até a API de projetos) · ◐ parcial · ○ planejado.
Onde: abas da **Mesa de Trabalho** (`/projects/[id]/edit`, RF22) — Quadro, Canvas, Linha do tempo, Iniciação, Escopo, Riscos e
equipe, Controle, Governança, Encerramento — e a **janela segmentada** com o Feedback da IA; o **DECIA** (decisões de governança);
o **Acervo** (`/tasks/new`, modelos e checagem por área).

## Tema 1 — Fundamentos

| Tópico | O que a aula pede | Onde no app | Estado |
|---|---|---|---|
| Projeto × operação × programa × portfólio | projeto é temporário e único; portfólio é decisão de governança | Mesa (projeto); seleção e priorização como decisão no DECIA (Governança › "Seleção e priorização") | ◐ (visão de portfólio com vários projetos: ○) |
| Estrutura do PMBOK | 5 grupos de processos × 10 áreas; grupo ≠ fase | Quadro: colunas = fases, com o grupo **dominante**, as áreas de conhecimento, COBIT e entregáveis de cada fase | ✔ |
| Restrição tripla e sêxtupla | escopo, prazo, custo, qualidade, recursos, risco | análise de impacto de cada mudança nas 6 restrições (Controle) | ✔ |
| Ciclos de vida | preditivo, iterativo, ágil, híbrido | Iniciação › Abordagem; o quadro Scrum vale para a Execução no híbrido | ✔ |
| Estrutura organizacional | funcional → projetizada; autoridade do GP e dono do orçamento | Governança › Estrutura organizacional (indicador G_AUTORIDADE_GP) | ✔ |

## Tema 2 — Iniciação

| Tópico | O que a aula pede | Onde no app | Estado |
|---|---|---|---|
| Business case | VPL, TIR, payback simples e descontado, ROI, viabilidade | Iniciação › Business case (fórmulas à vista, fluxo por ano) | ✔ |
| TAP | conteúdo do termo; quem aprova é o patrocinador, não o GP; TAP ≠ plano | Iniciação › TAP, diagnóstico, aprovação com registro de quem lançou; portão da Demanda | ✔ |
| Partes interessadas | poder × interesse (Mendelow) e estratégia de engajamento | Riscos e equipe; bloco do Project Model Canvas | ✔ |
| Seleção de projetos | métodos financeiros, AHP (Saaty, RC < 0,10), pontuação ponderada, GUT | Governança › calculadora AHP, GUT; decisão de seleção no DECIA com critérios VPL/alinhamento/risco/rapidez | ◐ (comparar vários projetos lado a lado: ○) |

## Tema 3 — Planejamento

| Tópico | O que a aula pede | Onde no app | Estado |
|---|---|---|---|
| Escopo e EAP | regra dos 100 %, entregas = substantivos, pacote de trabalho, dicionário | Escopo › EAP com consolidação e problemas junto do nó; feedback Q_EAP_100 e Q_EAP_SUBSTANTIVOS | ✔ |
| Rastreabilidade | origem → requisito → entrega → teste; gold plating × scope creep | Escopo › matriz e cobertura; canvas liga requisito ↔ entrega e parte interessada ↔ requisito | ✔ |
| Cronograma | rede (atividade no nó), FS/SS/FF/SF com defasagem, CPM (ida e volta, folgas), caminho crítico, PERT (TE, σ, probabilidade), Gantt, linha de base | Linha do tempo: Gantt, diagrama de rede, tabela CPM, PERT, dependências; Monte Carlo (viés de fusão e índice de criticidade) | ✔ |
| Orçamento | curva S, reserva de contingência × gerencial | Linha do tempo › curva S com VP/VA/CR; Riscos e equipe › reservas × VME; Governança › linhas de orçamento | ✔ |
| Recursos | matriz RACI com exatamente um A; carga da equipe | Riscos e equipe › RACI editável e diagnóstico; carga por pessoa; feedback de trabalho em grupo | ✔ |
| Riscos | qualitativa (P × I) × quantitativa (VME); respostas a ameaças e oportunidades | Riscos e equipe › registro, matriz 5×5, exposição × reserva | ✔ |
| Project Model Canvas | quadro de uma página (por quê, o quê, quem, como, quando e quanto) | Canvas **conectado**: o que nasce num bloco vira requisito, parte interessada, entrega, risco ou item do TAP | ✔ |
| Qualidade, comunicações, aquisições | plano de qualidade, plano de comunicação, aquisições | revisão por quatro olhos (W_QUATRO_OLHOS); modelos de ETP e TR no Acervo (Administração) | ◐ (plano de comunicação e de qualidade como artefatos: ○) |

## Tema 4 — Execução, monitoramento e controle

| Tópico | O que a aula pede | Onde no app | Estado |
|---|---|---|---|
| M&C transversal | não é fase: acompanha o projeto todo | faixa de monitoramento e controle sob o quadro; Feedback da IA ao lado de qualquer aba | ✔ |
| Controle integrado de mudanças | solicitar → analisar impacto → comitê decide → atualizar linha de base → comunicar; 7 Rs; padrão/normal/emergencial | Controle › mudanças; mudança normal vai ao comitê (CCB/CAB) no DECIA e o resultado volta; scope creep regularizável | ✔ |
| Valor agregado | VP, VA, CR, ONT, VC, VPr, IDC, IDP, ENT (típico, atípico, composto), EPT, VNT, IDPT | Controle › valor agregado com sigla em pt e en, fórmula e conta; progresso por atividade | ✔ |
| Scrum e Kanban | papéis, eventos, artefatos e compromissos; sprint; velocidade, burndown; fluxo, WIP, lead e cycle time | Quadro › modelo Scrum com meta e timebox da sprint, velocidade, burndown, CFD e tempos de fluxo | ✔ |
| Lições aprendidas | registradas ao longo do projeto, não só no fim | Controle e Encerramento › lições por fase (Q_LICOES) | ✔ |

## Tema 5 — Encerramento

| Tópico | O que a aula pede | Onde no app | Estado |
|---|---|---|---|
| Encerramento formal | aceite, contratos, liberação de recursos, relatório final, arquivamento; projeto cancelado também se encerra | Encerramento › checklist, motivo do cancelamento, arquivar (somente leitura) e reabrir, relatório final montado do modelo | ✔ |
| Transição para a operação | SLA × OLA × UC (OLA e UC mais rígidos), catálogo, base de conhecimento, CMDB | Encerramento › transição ITIL com validação dos acordos | ✔ |

## Governança de TI (TE1–TE5)

| Tópico | O que a aula pede | Onde no app | Estado |
|---|---|---|---|
| TE1 Governança × gestão | governança avalia, dirige e monitora (EDM; ISO/IEC 38500, modelo ADM); gestão planeja, constrói, entrega e monitora | portões de fase, mudanças e seleção decididos no **DECIA** (G_DECISOES_PORTAO, G_DECISOES_MUDANCA); Governança › quem decide o quê; 6 princípios da ISO 38500 | ✔ |
| TE2 PETI | alinhamento estratégico, BSC, SWOT | cascata de objetivos PEI/PDTIC/BSC → objetivos do projeto (G_ALINHAMENTO) | ◐ (mapa BSC e SWOT: ○) |
| TE3 PDTIC (Guia SISP) | inventário de necessidades, priorização GUT, metas e ações, pessoas, orçamento Run/Grow/Transform, riscos | tipo de necessidade e GUT; Run/Grow/Transform com distribuição; riscos | ◐ (o documento do PDTIC gerado a partir dos projetos: ○) |
| TE4 COBIT 2019 | domínios EDM/APO/BAI/DSS/MEA, cascata de metas, fatores de desenho, capacidade | domínios por fase no quadro; cascata simplificada | ◐ (fatores de desenho e níveis de capacidade: ○) |
| TE5 ITIL 4 | sistema de valor de serviço, práticas (mudança, incidente, problema, requisição), acordos | mudanças (tipos e CAB/ECAB), acordos SLA/OLA/UC, transição | ◐ (incidentes e problemas: ○) |

## Como a teoria vira feedback

Cada regra acima que dá para verificar virou um **indicador** (`lib/projects/metrics.ts`) com a aula de origem (`pm.ref.*`) e a
aba onde se corrige. O Feedback da IA da janela segmentada separa **qualidade do gerenciamento**, **governança** e **trabalho em
grupo** — sem nota única — e mostra o que mudou a cada edição. Números e achados são do sistema; a IA, quando conectada, só redige a
partir deles (D-12).

## Lacunas, em ordem de valor

1. **Portfólio**: comparar vários projetos (VPL, AHP, GUT, Run/Grow/Transform do conjunto) e decidir no DECIA — liga Tema 2 e TE3.
2. **Plano de comunicação** (o quê, para quem, canal, frequência, responsável) e **plano de qualidade** (métricas do produto,
   PDCA) como artefatos da Mesa, com indicadores.
3. **PDTIC como documento** gerado a partir dos projetos e das necessidades (estrutura do Guia SISP).
4. **COBIT**: níveis de capacidade dos processos e fatores de desenho; **ITIL**: incidentes e problemas ligados ao serviço
   transicionado.
5. **API de projetos** (hoje DEMO em memória) e edição simultânea (RF22.CA04/CA05).
