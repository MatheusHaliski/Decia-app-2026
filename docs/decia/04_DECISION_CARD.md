# DECIA — Decision Card (frente / verso) v1

> Etiquetas: [REF-x], [BOARD RFn], **PRODUCT HYPOTHESIS**, **DESIGN PROPOSAL** (ver `03_MODELO_FUNCIONAL.md`).

## 1. Auditoria dos cards atuais

| Item | Estado em `main` (2026-10-06) | Problema | Severidade |
|---|---|---|---|
| Card genérico `components/ui/Card.tsx` | superfície sem estados, sem interação | não existe card de decisão | P1 |
| Cards de tarefa/projeto/sessão | só em docs (`ANATOMIA_CARDS.md`, `ANATOMIAS_E_ESTUDIO.md`, `DECIA_SESSAO_E_MESA.md` §B.1) e SVG | nada implementado; "último evento DECIA" sem fonte de dados | P1 |
| Card de sessão (spec §B.1) | prevê contadores, Hype da sessão, mosaico, PercentBar, carimbo, selo | mini-dashboard: mais de 10 sinais na frente | P2 |
| Flip / verso | inexistente | o "porquê" da decisão não tem lugar no card | P2 |
| `ProfileHeader` contadores "decisões"/"pontos" | valores fixos "0"/"—" | número sem fonte (duplica domínio) | P2 |
| Cor `spark` (IA) usada para "proposta" em Tabs/Sidebar/PageHeader | dilui o significado ✦ = IA (RF38.CA04) | P2 |
| Estado só por cor/pulso (`/lab/decia`, ponto de não lida) | WCAG 1.4.1 | P2 |
| Informação só em `title` (hover) | `RfPage`, `PageHeader`, `SidebarNav` | P2 |

## 2. Princípio frente / verso

```
FRENTE = O QUÊ / ESTADO / SINAL   — "Esta é a decisão."        ("O que estamos decidindo?")
VERSO  = POR QUÊ / EVIDÊNCIA / LÓGICA — "Esta é a lógica da decisão." ("Por que estamos inclinados a decidir assim?")
WORKSPACE = "Mostre-me toda a estrutura da decisão."
REVISÃO   = "O que aprendemos depois?"
```

O flip tem função semântica (o verso **aprofunda**; nunca corrige falta de informação da frente). Estado, opção atual e
risco crítico ficam sempre visíveis na frente. Base: divulgação progressiva **DESIGN PROPOSAL**; carga de awareness
mínima [REF-DOURISH]; minimalismo **PRODUCT HYPOTHESIS** (heurísticas de Nielsen não estão na bibliografia — Q-156).

## 3. Arquitetura

```
DECISION DOMAIN (Decision + filhos)  →  toDecisionCardViewModel()  →  <DecisionCard mode=…>
```

O card **não guarda dados próprios**: recebe um view model derivado (pure function, `lib/decia/view-model.ts`), que só
lê o domínio e as regras de `lib/decia/rules.ts` (mesmos vetores do Java). Campos do view model:

```ts
{
  decisionId, title, question, status, complexity, kind,
  owner: { id, name }, deadline, lastUpdatedAt,
  selectedAlternative: { label, title } | null,          // decidida
  leadingAlternative: { label, title, score } | null,     // matriz (modelo transparente)
  recommendation: { source: "MODELO" | "IA", label } | null,
  confidence: { pct, band } | null,                       // humana
  evidenceStrength: { level, reason },                    // calculada
  risk: "BAIXO" | "MEDIO" | "ALTO" | "CRITICO" | "NAO_AVALIADO",
  impact, urgency,
  readiness: { level, checks: [{ key, state }] },
  freshness: "FRESCA" | "REVISAO_DEVIDA" | "VENCIDA" | null,
  back: { topEvidence[], topAssumptions[], keyCriteria[], mainTradeOff, principalRisk, rejectedAlternative, nextCheckpoint, sensitivity },
  timeline: [{ status, at }],                             // de decision_events
  nextAction: string                                      // texto, ex.: "Adicionar evidência para Segurança"
}
```

## 4. Wireframes

### 4.1 Frente (STANDARD)

```
┌──────────────────────────────────────────────┐
│ ◆ COMPARANDO                 Confiança ◔ MÉDIA │  ← estado (ícone+texto+cor) · confiança humana
│                                                │
│ Qual infraestrutura devemos usar para suportar │  ← pergunta decisória (serif, 3 linhas máx.)
│ o crescimento dos próximos 12 meses?           │
│                                                │
│ Lidera no modelo: A — Railway  3,8            │  ← opção atual: "Escolhida" (decidida) | "Lidera no modelo" | "Sem opção ainda"
│                                                │
│ Ana Souza · prazo 30 out (em 24 dias)          │  ← responsável · prazo
│                                                │
│ ▲ Risco ALTO   ◎ Impacto ALTO   ▤ Evidência FRACA │ ← chips com ícone+texto
│ ⚠ Pronta para revisão · 2 alertas              │  ← prontidão (texto, nunca número)
│                                   [ Por quê? ↻ ] │  ← botão de flip (rótulo explícito)
└──────────────────────────────────────────────┘
```

Prioridade visual: 1 pergunta · 2 estado · 3 opção atual/recomendação · 4 confiança · 5 responsável/prazo · 6 risco/impacto
· 7 secundários. Leitura em 2–3 s: a pergunta é o maior elemento; no máximo **5 sinais** além dela.

### 4.2 Verso

```
┌──────────────────────────────────────────────┐
│ POR QUE ESTA OPÇÃO?               [ Frente ↻ ] │
│ ●─ Evidência  Teste de carga (SUSTENTA, alta)  │  ← nó "evidência"
│ ●─ Premissa   Volume dobra em 12 meses · 70 %  │  ← nó "premissa" (natureza explícita)
│ ●─ Critérios  Segurança 30 % · Escala 25 %     │
│ ⇄ Trade-off   + mais barato  − menos escalável │
│ ▲ Risco       Limite de região (PROVÁVEL×ALTO) │
│ ✕ Rejeitada   D — Adiar (dominada por C)        │
│ ↯ Sensível    Custo 20→17 % faz B liderar      │
│ ⏱ Checkpoint  15 jan                           │
│                         [ Abrir workspace → ]  │
└──────────────────────────────────────────────┘
```

O verso é um **mapa de lógica resumido** (nós e conexões discretos, motivo "decision tree" abstrato), nunca um gráfico.

## 5. Estados (status → apresentação)

| `DecisionLifecycle` | Rótulo | Ícone (glyph) | Token de cor | Observação |
|---|---|---|---|---|
| RASCUNHO | Rascunho | ✎ | `--ws-text-muted` | borda tracejada |
| ENQUADRAMENTO | Enquadrando | ◇ | `--ws-info` | |
| PESQUISA | Pesquisando | ⌕ | `--ws-info` | |
| COMPARACAO | Comparando | ⇄ | `--ws-accent` | |
| AGUARDANDO_DECISAO | Aguardando decisão | ⧗ | `--ws-warning` | contagem regressiva se houver prazo |
| DECIDIDA | Decidida | ✓ | `--ws-success` | mostra "Escolhida: …" |
| EM_EXECUCAO | Em execução | ▶ | `--ws-success` | progresso por tarefas ligadas (texto) |
| RESOLVIDA | Resolvida | ◉ | `--ws-success` | resultado em texto |
| REVISADA | Revisada | ☑ | `--ws-success-ink` | nunca ✦ (exclusivo da IA) |
| REABERTA | Reaberta | ↺ | `--ws-warning` | |
| ARQUIVADA | Arquivada | ▣ | `--ws-text-muted` | opacidade reduzida |

Estados transversais: **atrasada** (prazo vencido e não DECIDIDA) = rótulo "Atrasada" + ícone ⏰; **risco crítico** =
faixa superior `--ws-danger` + texto "Risco crítico"; **vencida** (frescor) = "Revisão vencida"; **confiança acima da
evidência** = alerta ⚠ textual. Nunca só cor (G11/WCAG 1.4.1) — ver [`DESIGN_SYSTEM.md` §acessibilidade].

## 6. Modos de renderização

| Modo | Onde | Mostra | Flip |
|---|---|---|---|
| **COMPACT** | tabelas, barra lateral, busca, menções | estado · pergunta (1 linha) · responsável · prazo · opção escolhida | não |
| **STANDARD** | quadro de decisões (grade) | + confiança · risco · impacto · prontidão | não (link "Por quê?" abre DETAIL) |
| **DETAIL** | card aberto/foco, caixa de entrada | frente STANDARD + verso | **sim** |
| **HERO** | decisão crítica aberta individualmente / topo da caixa de entrada | + stakeholders · contagem regressiva · resumo executivo | sim |

Performance: COMPACT/STANDARD não calculam sensibilidade nem montam o verso (lazy); nada de IA, gráficos ou animações
pesadas em grade. **DESIGN PROPOSAL**.

## 7. Flip — interação e acessibilidade

- Gatilho: botão explícito "Por quê?" / "Frente" (`<button aria-pressed>` + `aria-controls`), clique/toque/Enter/Espaço.
  **Nunca só hover.** Atalho `F` quando o card está focado (documentado em ajuda contextual).
- As duas faces ficam no DOM; a oculta recebe `inert` + `aria-hidden`; o foco vai para o título da face nova (sem perda
  de foco). Região `aria-live="polite"` anuncia "Mostrando a lógica da decisão".
- Altura fixa pela face maior (grid com as duas faces sobrepostas) → **sem layout shift**; `backface-visibility: hidden`
  + `transform-style: preserve-3d` → sem flicker/backface.
- Duração `--ws-duration-slow` (320 ms), `--ws-ease-in-out`. Com `prefers-reduced-motion` **ou** preferência "Reduzir
  movimento" (`data-reduce-motion`), troca simples de conteúdo (cross-fade ≤ 80 ms ou nenhum), sem 3D.
- Mobile: tocar no card abre o workspace; o botão "Por quê?" faz o flip; detalhes longos em bottom sheet (`Sheet`).
- Evento de analytics `card_flipped` com `{ decisionId, to: "back" | "front", mode }`.

## 8. Tokens (adições ao `styles/tokens-ws.css`, gerados por `tokens-ws.mjs`)

| Token | Valor (referencia tokens existentes) | Uso |
|---|---|---|
| `--ws-decision-card-radius` | `var(--ws-radius-lg)` | |
| `--ws-decision-card-pad` | `var(--ws-space-4)` | |
| `--ws-decision-status-bar` | 4px | faixa de estado no topo |
| `--ws-decision-flip-duration` | `var(--ws-duration-slow)` | |
| `--ws-decision-node` | `var(--ws-node-*)` existentes | nós do verso |
| `--ws-decision-critical` | `var(--ws-danger)` | faixa de risco crítico |

Status usam as famílias existentes (`accent`, `success`, `warning`, `danger`, `info`) com `-ink`/`-soft`; ✦ continua
exclusivo de `--ws-ai-spark*` (corrige o uso para "proposta").

## 9. Componentes

`DecisionCard` (modo, flip) · `DecisionCardFront` · `DecisionCardBack` · `DecisionStatusBadge` · `ConfidenceIndicator` ·
`EvidenceStrengthBadge` · `RiskBadge` · `LevelChip` (impacto/urgência) · `ReadinessCheck` · `StatementNatureChip`
(FATO/PREMISSA/OPINIÃO/PREVISÃO/EVIDÊNCIA) · `AiSuggestion` (✦ + aceitar/descartar) · `CriteriaMatrix` ·
`SensitivityPanel` · `TradeOffView` · `DecisionTimeline` · `DecisionWorkspace` (+ seções). Todos em
`components/decia/`, exportados por `components/decia/index.ts`, só com tokens.

## 10. Testes do card

Vitest (estados): título longo · sem opção ainda · risco ALTO · risco CRÍTICO · confiança BAIXA · sem evidência · muitas
alternativas · atrasada · resolvida · arquivada · confiança ALTA × evidência FRACA. Flip: frente→verso→frente por clique e
teclado, foco preservado, `inert` na face oculta, reduced-motion sem classe 3D. Playwright: flip por teclado e toque em
viewport móvel. Regressão visual (capturas): Rascunho · Comparando · Pronta · Decidida · Crítica · Resolvida · COMPACT ·
STANDARD · DETAIL (frente e verso).
