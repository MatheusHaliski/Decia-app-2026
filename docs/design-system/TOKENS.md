# Tokens `--ws-*` — Work Station (v2, paleta do logo)

> **Status: calibrado com o logo oficial** (`public/brand/work-station-logo.png`, 1448×1086, fundo branco #FBFCFD). Os hex de marca e dos nós foram medidos por amostragem no PNG; o resto (`-ink`, `-soft`, `on-*`, neutros por tema) é derivado por [`anatomias/lib/tokens-ws.mjs`](anatomias/lib/tokens-ws.mjs) até cumprir os limites de contraste. Para recalibrar basta trocar `BRAND`/`NODES` no script e rodar `node docs/design-system/anatomias/lib/tokens-ws.mjs` — o script falha se algum par reprovar. Observação de leitura do logo: **o campo da malha é laranja** (não preto) — o preto é o anel externo e o monitor; por isso existe `--ws-gradient-field` (campo laranja) além de `--ws-gradient-mesh` (malha sobre ink, pedida no briefing).

Fonte de verdade: [`anatomias/lib/tokens-ws.mjs`](anatomias/lib/tokens-ws.mjs) → gera [`tokens-ws.css`](tokens-ws.css) e as duas tabelas geradas deste arquivo. Temas: `<html data-theme="claro|escuro|contraste|terminal">` (sem `data-theme` ou `auto` segue `prefers-color-scheme`). O enum `ThemeMode` ganha `TERMINAL` (e `BLUEPRINT` sai do v2 — ver Mapa de migração). Regras de contraste: texto ≥ 4,5:1 (≥ 7:1 no alto contraste), glifo/borda/foco ≥ 3:1, `on-*` ≥ 4,5:1 sobre a cor cheia.

## 1. Marca (iguais nos 4 temas — são o logo)

| Token | Hex (medido) | Cor | Lido de | Uso |
|---|---|---|---|---|
| `--ws-ink` | #242525 | preto-monitor | carcaça do monitor e anel externo (base #212223, tela #47443C, brilho superior #666362) | fundo do tema terminal, carcaça dos glyphs clay, texto no claro, `on-accent` |
| `--ws-cream` | #F1DEC0 | creme | disco central e prompt `>_` (claro #FDF2D7, sombra do disco #D6B892) | texto nos temas escuros, prompt dos WS Moji, disco |
| `--ws-orange-500` | #F28222 | laranja-malha | campo da malha (#F28222 / #F9923C) e linhas (#F78D42) | acento (escuro/terminal), malha dos glyphs, `--ws-msg-divergence` |
| `--ws-orange-600` | #E06A1B | laranja-escuro | escurecido do campo | acento no claro, hover, 2º stop do disco |
| `--ws-orange-700` | #AB2C16 | vermelho-tijolo | anel interno do logo | active, foco no claro, borda inferior clay, único laranja ≥ 3:1 sobre o creme |
| `--ws-gradient-brand` | `radial-gradient(circle at 38% 32%, #F28222 0%, #E06A1B 58%, #AB2C16 100%)` | disco laranja | luz no alto-esquerda, como o relevo clay | botão-herói, avatar da IA, ficha DP, disco dos glyphs clay |
| `--ws-gradient-field` | `radial-gradient(circle, #F28222 0%, #F9923C 60%, #E06A1B 100%)` | campo laranja | o campo da malha | arte de fundo "malha-laranja", hero |
| `--ws-gradient-mesh` | dois halos laranja + duas tramas a 60° sobre `#242525` | malha laranja sobre preto | briefing (malha sobre ink) | fundo de hero, cabeçalho do terminal |
| `--ws-glyph-screen` / `--ws-glyph-shine` / `--ws-glyph-rim` | #47443C / rgba(102,99,98,·) / por tema | tela, brilho e aro do monitor clay | tela do monitor e destaque superior do PNG | WS Glyphs clay |

No alto contraste ambos os gradientes colapsam para cor chapada (`--ws-accent` e `#000`).

## 2. Nós categóricos (malha do logo)

`--ws-node-{red,yellow,green,blue,brown,orange}` com `-ink` (texto), `-soft` (fundo de etiqueta), `on-node-*` (texto sobre o nó) e `-nome` (string em texto, para daltonismo). Bases medidas no PNG: vermelho #FC4E2B · amarelo #F6B507 · verde #7DC549 · azul #019FF4 · marrom #8B4628 · laranja-dourado #FCB809 (o nó "laranja" do logo é dourado; o laranja da malha é `--ws-orange-500`). São **categóricos** (participantes, departamentos, séries de gráfico, nós do fio de decisão) — nunca carregam significado de estado; para estado use os semânticos. Ordem canônica (série categórica): red → yellow → green → blue → brown → orange. No logo os nós se repetem sem ordem fixa; o marrom é o mais raro (usar por último).

## 3. Semânticos

| Token | Base | Significado |
|---|---|---|
| `--ws-success` | nó verde | concluído, validado, consenso |
| `--ws-warning` | nó amarelo | atenção, prazo em ≤ 3 dias |
| `--ws-danger` | nó vermelho | erro, vencido, devolvido |
| `--ws-info` | nó azul | informação, em uso |
| `--ws-ai-spark` | âmbar #E39B12 (+ `--ws-ai-spark-glow`) | tudo que a IA gerou — a faísca ✦ |
| `--ws-msg-argument` / `-divergence` / `-risk` / `-consensus` / `-question` | azul / laranja / vermelho / verde / roxo #7B4FC6 | classificação de mensagem da sessão DECIA (RF7) |

Cada um traz `-ink`, `-soft`, `on-*`, `-nome`.

## 4. Superfícies, bordas, relevo

`--ws-surface-0` (fundo do app) · `--ws-surface-1` (card) · `--ws-surface-2` (etiqueta, campo) · `--ws-surface-3` (trilha) · `--ws-container` · `--ws-text` / `--ws-text-muted` / `--ws-text-faint` · `--ws-border` / `--ws-border-strong` (≥ 3:1) · `--ws-focus` + `--ws-focus-ring` (`0 0 0 2px surface-1, 0 0 0 4px focus`; no alto contraste anel sólido 3 px amarelo).

Logo em vetor: `public/brand/work-station-monitor.svg` (monitor `>_`), `work-station-emblema.svg` (emblema simplificado), `work-station-monograma.svg` (24 px).

Raios: `--ws-radius-sm` 6 px · `--ws-radius-md` 10 px · `--ws-radius-lg` 16 px · `--ws-radius-pill` 999 px · `--ws-radius-monitor` 22 % (a moldura do monitor nos glyphs e avatares).

Relevo clay: `--ws-shadow-clay` = brilho superior (`inset 0 1px 0`, creme-claro #FDF2D7 no claro e cinza #666362 do PNG nos escuros) + sombra interna inferior (`inset 0 -2px 3px` escura) + sombra externa macia. No terminal o brilho é laranja translúcido e há um aro laranja de 1 px; no alto contraste `none`. Também `--ws-shadow-1/2` para elevação comum.

## 5. Tipografia, espaço, movimento

- `--ws-font-display` Source Serif 4 (títulos) · `--ws-font-body` Public Sans (texto) · `--ws-font-mono` IBM Plex Mono (prompt `>_`, etiquetas, nº de protocolo, métricas). `--ws-body-font` é o alias que o `body` usa: no **terminal** aponta para o mono.
- Escala: `--ws-text-display` 2rem · `h1` 1.5 · `h2` 1.25 · `h3` 1.0625 · `body-lg` 1 · `body` .875 · `body-sm` .8125 · `caption` .75 · `label` .6875 (tracking .08em) · `--ws-text-prompt` .9375 rem mono (o `>_`).
- Espaço `--ws-space-0..10` (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px). Controles `--ws-control-sm/md/lg/touch` 34/40/48/44. Camadas `--ws-z-*`.
- Movimento: `--ws-ease` `cubic-bezier(.2,.8,.2,1)` · `--ws-ease-in-out` · `--ws-ease-snap` · `--ws-duration-fast` 80 ms · `--ws-duration-base` 160 · `--ws-duration-slow` 320 · `--ws-duration-blink` 1 s (cursor `▌` do moji "carregando") · `--ws-duration-pulse` 1,8 s · `--ws-duration-spark` 1,2 s. Tudo desliga com `prefers-reduced-motion` ou `data-reduce-motion="true"`.
- Glyphs: `--ws-glyph-size` 24 px · `--ws-glyph-stroke` 1.75.

## 6. Blur, vidro e scrim

| Token | Claro | Escuro | Alto contraste | Terminal |
|---|---|---|---|---|
| `--ws-blur-scrim` | 12px | 12px | **0px** | 12px |
| `--ws-blur-glass` | 20px | 20px | **0px** | 20px |
| `--ws-scrim-tint` | rgba(36,37,37,.35) | rgba(36,37,37,.55) | rgba(0,0,0,.85) | rgba(36,37,37,.55) |
| `--ws-scrim-saturate` | 1.2 | 1.2 | 1.2 (sem efeito, blur 0) | 1.2 |
| `--ws-glass-bg` | rgba(255,255,255,.55) | rgba(30,31,31,.62) | #000000 | rgba(36,37,37,.70) |
| `--ws-glass-border` | rgba(36,37,37,.12) | rgba(241,222,192,.14) | #FFFFFF | rgba(242,130,34,.28) |

Classes utilitárias mínimas em `tokens-ws.css`: `.ws-scrim`, `.ws-glass`, `.ws-clay`. Texto sobre vidro deve ser medido contra o pior fundo possível (a arte de fundo mais clara/escura) — o vidro não entra na tabela automática.

## 7. Tema terminal

Fundo `--ws-surface-0 = --ws-ink` (#242525), cards um tom acima (#2A2B2B), texto creme `#F1DEC0`, texto secundário creme-sépia, bordas quentes, **acento, foco e borda-forte em `--ws-orange-500`**, corpo em mono, relevo clay com brilho laranja. Difere do escuro por: neutros puxados para o ink do logo (não para o cinza-azulado), tipografia mono e todo acento laranja (no escuro o foco é laranja-claro para ganhar 3:1 sem saturar).

<!-- tokens-ws:inicio -->
### Paleta por tema (gerada)

| Token | Claro | Escuro | Alto contraste | Terminal | Cor (texto) | Uso |
|---|---|---|---|---|---|---|
| `--ws-ink` | #242525 | #242525 | #242525 | #242525 | preto-monitor | carcaça do monitor, anel externo, fundo do tema terminal |
| `--ws-cream` | #F1DEC0 | #F1DEC0 | #F1DEC0 | #F1DEC0 | creme | prompt `>_`, disco central, texto nos temas escuros |
| `--ws-orange-500` | #F28222 | #F28222 | #F28222 | #F28222 | laranja-malha | linhas da malha, acento, foco (terminal) |
| `--ws-orange-600` | #E06A1B | #E06A1B | #E06A1B | #E06A1B | laranja-escuro | hover do acento, 2º stop do disco |
| `--ws-orange-700` | #AB2C16 | #AB2C16 | #AB2C16 | #AB2C16 | vermelho-tijolo | borda inferior clay, active, foco (claro) |
| `--ws-surface-0` | #F7EEDC | #151616 | #000000 | #242525 | neutro | fundo do app |
| `--ws-surface-1` | #FFFFFF | #1E1F1F | #000000 | #2A2B2B | neutro | card, painel |
| `--ws-surface-2` | #F6EBD6 | #272828 | #0F0F0F | #313232 | neutro | etiqueta, campo |
| `--ws-surface-3` | #E9DAB9 | #313232 | #1A1A1A | #393A3A | neutro | trilha, divisória de mosaico |
| `--ws-container` | #FFFFFF | #1E1F1F | #000000 | #2A2B2B | neutro | contêiner de página |
| `--ws-text` | #242525 | #F1DEC0 | #FFFFFF | #F1DEC0 | tinta | texto principal |
| `--ws-text-muted` | #5C5A55 | #B8AC95 | #FFFFFF | #CDBB97 | tinta | texto secundário |
| `--ws-text-faint` | #6B6861 | #A39780 | #E6E6E6 | #B8A682 | tinta | placeholder |
| `--ws-border` | #D6C6A4 | #3C3D3C | #FFFFFF | #47443C | — | divisória |
| `--ws-border-strong` | #242525 | #CBBB9C | #FFFFFF | #F28222 | — | borda ≥ 3:1 |
| `--ws-focus` | #AB2C16 | #F9923C | #FFFF00 | #F28222 | — | anel de foco |
| `--ws-accent` | #E06A1B | #F28222 | #FFB15C | #F28222 | laranja | botão primário, link, estado ativo |
| `--ws-accent-ink` | #AC5115 | #F38D35 | #FFB15C | #F59B4D | laranja | texto do acento |
| `--ws-accent-soft` | #FBEADF | #513720 | #000000 | #563E29 | laranja | fundo da etiqueta do acento |
| `--ws-on-accent` | #242525 | #242525 | #242525 | #242525 | laranja | texto sobre o acento |
| `--ws-node-red` | #FC4E2B | #FC4E2B | #FD8067 | #FC4E2B | vermelho | glifo, nó, borda ≥ 3:1 |
| `--ws-node-red-ink` | #CD2503 | #FD7458 | #FD8067 | #FD856C | vermelho | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-red-soft` | #FFE6E1 | #532A22 | #000000 | #58332B | vermelho | fundo da etiqueta |
| `--ws-on-node-red` | #242525 | #242525 | #000000 | #242525 | vermelho | texto sobre a cor cheia |
| `--ws-node-yellow` | #BD8B05 | #F6B507 | #F6B507 | #F6B507 | amarelo | glifo, nó, borda ≥ 3:1 |
| `--ws-node-yellow-ink` | #896504 | #F6B507 | #F6B507 | #F6B507 | amarelo | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-yellow-soft` | #FEF5DC | #524319 | #000000 | #574923 | amarelo | fundo da etiqueta |
| `--ws-on-node-yellow` | #242525 | #242525 | #000000 | #242525 | amarelo | texto sobre a cor cheia |
| `--ws-node-green` | #63A434 | #7DC549 | #7DC549 | #7DC549 | verde | glifo, nó, borda ≥ 3:1 |
| `--ws-node-green-ink` | #487726 | #7DC549 | #7DC549 | #84C853 | verde | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-green-soft` | #EDF7E6 | #354729 | #000000 | #3C4D32 | verde | fundo da etiqueta |
| `--ws-on-node-green` | #242525 | #242525 | #000000 | #242525 | verde | texto sobre a cor cheia |
| `--ws-node-blue` | #019AEC | #019FF4 | #18AEFE | #019FF4 | azul | glifo, nó, borda ≥ 3:1 |
| `--ws-node-blue-ink` | #016FAA | #13ACFE | #18AEFE | #2FB6FE | azul | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-blue-soft` | #DBF2FD | #173E52 | #000000 | #214557 | azul | fundo da etiqueta |
| `--ws-on-node-blue` | #242525 | #242525 | #000000 | #242525 | azul | texto sobre a cor cheia |
| `--ws-node-brown` | #8B4628 | #A5532F | #D89679 | #B55B34 | marrom | glifo, nó, borda ≥ 3:1 |
| `--ws-node-brown-ink` | #8B4628 | #D07D59 | #D89679 | #D48969 | marrom | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-brown-soft` | #EFE5E1 | #382821 | #000000 | #3F312A | marrom | fundo da etiqueta |
| `--ws-on-node-brown` | #FFFFFF | #FFFFFF | #000000 | #FFFFFF | marrom | texto sobre a cor cheia |
| `--ws-node-orange` | #C08B02 | #FCB809 | #FCB809 | #FCB809 | laranja-dourado | glifo, nó, borda ≥ 3:1 |
| `--ws-node-orange-ink` | #886301 | #FCB809 | #FCB809 | #FCB809 | laranja-dourado | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-orange-soft` | #FFF5DD | #53441A | #000000 | #584A24 | laranja-dourado | fundo da etiqueta |
| `--ws-on-node-orange` | #242525 | #242525 | #000000 | #242525 | laranja-dourado | texto sobre a cor cheia |
| `--ws-success` | #63A434 | #7DC549 | #7DC549 | #7DC549 | verde | glifo, nó, borda ≥ 3:1 |
| `--ws-success-ink` | #487726 | #7DC549 | #7DC549 | #84C853 | verde | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-success-soft` | #EDF7E6 | #354729 | #000000 | #3C4D32 | verde | fundo da etiqueta |
| `--ws-on-success` | #242525 | #242525 | #000000 | #242525 | verde | texto sobre a cor cheia |
| `--ws-warning` | #BD8B05 | #F6B507 | #F6B507 | #F6B507 | amarelo | glifo, nó, borda ≥ 3:1 |
| `--ws-warning-ink` | #896504 | #F6B507 | #F6B507 | #F6B507 | amarelo | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-warning-soft` | #FEF5DC | #524319 | #000000 | #574923 | amarelo | fundo da etiqueta |
| `--ws-on-warning` | #242525 | #242525 | #000000 | #242525 | amarelo | texto sobre a cor cheia |
| `--ws-danger` | #FC4E2B | #FC4E2B | #FD8067 | #FC4E2B | vermelho | glifo, nó, borda ≥ 3:1 |
| `--ws-danger-ink` | #CD2503 | #FD7458 | #FD8067 | #FD856C | vermelho | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-danger-soft` | #FFE6E1 | #532A22 | #000000 | #58332B | vermelho | fundo da etiqueta |
| `--ws-on-danger` | #242525 | #242525 | #000000 | #242525 | vermelho | texto sobre a cor cheia |
| `--ws-info` | #019AEC | #019FF4 | #18AEFE | #019FF4 | azul | glifo, nó, borda ≥ 3:1 |
| `--ws-info-ink` | #016FAA | #13ACFE | #18AEFE | #2FB6FE | azul | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-info-soft` | #DBF2FD | #173E52 | #000000 | #214557 | azul | fundo da etiqueta |
| `--ws-on-info` | #242525 | #242525 | #000000 | #242525 | azul | texto sobre a cor cheia |
| `--ws-ai-spark` | #C78810 | #E39B12 | #E39B12 | #E39B12 | âmbar | glifo, nó, borda ≥ 3:1 |
| `--ws-ai-spark-ink` | #8E610B | #E59D12 | #E39B12 | #EDA61F | âmbar | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-ai-spark-soft` | #FBF1DE | #4D3D1C | #000000 | #534426 | âmbar | fundo da etiqueta |
| `--ws-on-ai-spark` | #242525 | #242525 | #000000 | #242525 | âmbar | texto sobre a cor cheia |
| `--ws-msg-argument` | #019AEC | #019FF4 | #18AEFE | #019FF4 | azul | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-argument-ink` | #016FAA | #13ACFE | #18AEFE | #2FB6FE | azul | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-argument-soft` | #DBF2FD | #173E52 | #000000 | #214557 | azul | fundo da etiqueta |
| `--ws-on-msg-argument` | #242525 | #242525 | #000000 | #242525 | azul | texto sobre a cor cheia |
| `--ws-msg-divergence` | #EA730E | #F28222 | #F38A30 | #F28222 | laranja | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-divergence-ink` | #A9530A | #F38D35 | #F38A30 | #F59B4D | laranja | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-divergence-soft` | #FDEEE0 | #513720 | #000000 | #563E29 | laranja | fundo da etiqueta |
| `--ws-on-msg-divergence` | #242525 | #242525 | #000000 | #242525 | laranja | texto sobre a cor cheia |
| `--ws-msg-risk` | #FC4E2B | #FC4E2B | #FD8067 | #FC4E2B | vermelho | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-risk-ink` | #CD2503 | #FD7458 | #FD8067 | #FD856C | vermelho | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-risk-soft` | #FFE6E1 | #532A22 | #000000 | #58332B | vermelho | fundo da etiqueta |
| `--ws-on-msg-risk` | #242525 | #242525 | #000000 | #242525 | vermelho | texto sobre a cor cheia |
| `--ws-msg-consensus` | #63A434 | #7DC549 | #7DC549 | #7DC549 | verde | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-consensus-ink` | #487726 | #7DC549 | #7DC549 | #84C853 | verde | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-consensus-soft` | #EDF7E6 | #354729 | #000000 | #3C4D32 | verde | fundo da etiqueta |
| `--ws-on-msg-consensus` | #242525 | #242525 | #000000 | #242525 | verde | texto sobre a cor cheia |
| `--ws-msg-question` | #7B4FC6 | #7C51C7 | #B39ADE | #875ECB | roxo | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-question-ink` | #7B4FC6 | #A689D9 | #B39ADE | #AF94DC | roxo | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-question-soft` | #EDE6F7 | #342B47 | #000000 | #3C334D | roxo | fundo da etiqueta |
| `--ws-on-msg-question` | #FFFFFF | #FFFFFF | #000000 | #FFFFFF | roxo | texto sobre a cor cheia |

### Contraste verificado (gerado)

Pares verificados: **360** · falhas: **0** · limites: texto ≥ 4,5:1 (≥ 7:1 no alto contraste), glifo/borda/foco ≥ 3:1 (WCAG 1.4.3 / 1.4.6 / 1.4.11). Gerado por `anatomias/lib/tokens-ws.mjs`.

#### Claro (`data-theme="claro"`) — 90 pares, mínimo 3.02:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ws-text` #242525 | `--ws-surface-0` #F7EEDC | 13.33:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #242525 | `--ws-surface-1` #FFFFFF | 15.37:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #242525 | `--ws-surface-2` #F6EBD6 | 13.01:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #242525 | `--ws-surface-3` #E9DAB9 | 11.12:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #242525 | `--ws-container` #FFFFFF | 15.37:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #5C5A55 | `--ws-surface-0` #F7EEDC | 5.98:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #5C5A55 | `--ws-surface-1` #FFFFFF | 6.89:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #5C5A55 | `--ws-surface-2` #F6EBD6 | 5.83:1 | 4.5:1 | ✓ |
| texto terciário / placeholder | `--ws-text-faint` #6B6861 | `--ws-surface-1` #FFFFFF | 5.56:1 | 4.5:1 | ✓ |
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F1DEC0 | `--ws-ink` #242525 | 11.67:1 | 4.5:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28222 | `--ws-ink` #242525 | 5.85:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #AB2C16 | `--ws-cream` #F1DEC0 | 5.14:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #242525 | `--ws-cream` #F1DEC0 | 11.67:1 | 4.5:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #AC5115 | `--ws-surface-1` #FFFFFF | 5.33:1 | 4.5:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #AC5115 | `--ws-accent-soft` #FBEADF | 4.55:1 | 4.5:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #E06A1B | `--ws-surface-1` #FFFFFF | 3.36:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #242525 | `--ws-accent` #E06A1B | 4.57:1 | 4.5:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #CD2503 | `--ws-surface-1` #FFFFFF | 5.44:1 | 4.5:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #CD2503 | `--ws-node-red-soft` #FFE6E1 | 4.57:1 | 4.5:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #CD2503 | `--ws-surface-2` #F6EBD6 | 4.60:1 | 4.5:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #FC4E2B | `--ws-surface-1` #FFFFFF | 3.35:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #242525 | `--ws-node-red` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #896504 | `--ws-surface-1` #FFFFFF | 5.35:1 | 4.5:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #896504 | `--ws-node-yellow-soft` #FEF5DC | 4.92:1 | 4.5:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #896504 | `--ws-surface-2` #F6EBD6 | 4.53:1 | 4.5:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #BD8B05 | `--ws-surface-1` #FFFFFF | 3.06:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #242525 | `--ws-node-yellow` #BD8B05 | 5.02:1 | 4.5:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #487726 | `--ws-surface-1` #FFFFFF | 5.33:1 | 4.5:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #487726 | `--ws-node-green-soft` #EDF7E6 | 4.83:1 | 4.5:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #487726 | `--ws-surface-2` #F6EBD6 | 4.51:1 | 4.5:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #63A434 | `--ws-surface-1` #FFFFFF | 3.05:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #242525 | `--ws-node-green` #63A434 | 5.04:1 | 4.5:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #016FAA | `--ws-surface-1` #FFFFFF | 5.45:1 | 4.5:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #016FAA | `--ws-node-blue-soft` #DBF2FD | 4.70:1 | 4.5:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #016FAA | `--ws-surface-2` #F6EBD6 | 4.61:1 | 4.5:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #019AEC | `--ws-surface-1` #FFFFFF | 3.07:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #242525 | `--ws-node-blue` #019AEC | 5.00:1 | 4.5:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #8B4628 | `--ws-surface-1` #FFFFFF | 6.99:1 | 4.5:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #8B4628 | `--ws-node-brown-soft` #EFE5E1 | 5.65:1 | 4.5:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #8B4628 | `--ws-surface-2` #F6EBD6 | 5.92:1 | 4.5:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #8B4628 | `--ws-surface-1` #FFFFFF | 6.99:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #FFFFFF | `--ws-node-brown` #8B4628 | 6.99:1 | 4.5:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #886301 | `--ws-surface-1` #FFFFFF | 5.48:1 | 4.5:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #886301 | `--ws-node-orange-soft` #FFF5DD | 5.05:1 | 4.5:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #886301 | `--ws-surface-2` #F6EBD6 | 4.64:1 | 4.5:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #C08B02 | `--ws-surface-1` #FFFFFF | 3.03:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #242525 | `--ws-node-orange` #C08B02 | 5.08:1 | 4.5:1 | ✓ |
| success: texto | `--ws-success-ink` #487726 | `--ws-surface-1` #FFFFFF | 5.33:1 | 4.5:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #487726 | `--ws-success-soft` #EDF7E6 | 4.83:1 | 4.5:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #63A434 | `--ws-surface-1` #FFFFFF | 3.05:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #242525 | `--ws-success` #63A434 | 5.04:1 | 4.5:1 | ✓ |
| warning: texto | `--ws-warning-ink` #896504 | `--ws-surface-1` #FFFFFF | 5.35:1 | 4.5:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #896504 | `--ws-warning-soft` #FEF5DC | 4.92:1 | 4.5:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #BD8B05 | `--ws-surface-1` #FFFFFF | 3.06:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #242525 | `--ws-warning` #BD8B05 | 5.02:1 | 4.5:1 | ✓ |
| danger: texto | `--ws-danger-ink` #CD2503 | `--ws-surface-1` #FFFFFF | 5.44:1 | 4.5:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #CD2503 | `--ws-danger-soft` #FFE6E1 | 4.57:1 | 4.5:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #FC4E2B | `--ws-surface-1` #FFFFFF | 3.35:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #242525 | `--ws-danger` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| info: texto | `--ws-info-ink` #016FAA | `--ws-surface-1` #FFFFFF | 5.45:1 | 4.5:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #016FAA | `--ws-info-soft` #DBF2FD | 4.70:1 | 4.5:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #019AEC | `--ws-surface-1` #FFFFFF | 3.07:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #242525 | `--ws-info` #019AEC | 5.00:1 | 4.5:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #8E610B | `--ws-surface-1` #FFFFFF | 5.43:1 | 4.5:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #8E610B | `--ws-ai-spark-soft` #FBF1DE | 4.85:1 | 4.5:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #C78810 | `--ws-surface-1` #FFFFFF | 3.02:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #242525 | `--ws-ai-spark` #C78810 | 5.09:1 | 4.5:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #016FAA | `--ws-surface-1` #FFFFFF | 5.45:1 | 4.5:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #016FAA | `--ws-msg-argument-soft` #DBF2FD | 4.70:1 | 4.5:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #019AEC | `--ws-surface-1` #FFFFFF | 3.07:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #242525 | `--ws-msg-argument` #019AEC | 5.00:1 | 4.5:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #A9530A | `--ws-surface-1` #FFFFFF | 5.35:1 | 4.5:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #A9530A | `--ws-msg-divergence-soft` #FDEEE0 | 4.70:1 | 4.5:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #EA730E | `--ws-surface-1` #FFFFFF | 3.02:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #242525 | `--ws-msg-divergence` #EA730E | 5.09:1 | 4.5:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #CD2503 | `--ws-surface-1` #FFFFFF | 5.44:1 | 4.5:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #CD2503 | `--ws-msg-risk-soft` #FFE6E1 | 4.57:1 | 4.5:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #FC4E2B | `--ws-surface-1` #FFFFFF | 3.35:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #242525 | `--ws-msg-risk` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #487726 | `--ws-surface-1` #FFFFFF | 5.33:1 | 4.5:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #487726 | `--ws-msg-consensus-soft` #EDF7E6 | 4.83:1 | 4.5:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #63A434 | `--ws-surface-1` #FFFFFF | 3.05:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #242525 | `--ws-msg-consensus` #63A434 | 5.04:1 | 4.5:1 | ✓ |
| msg-question: texto | `--ws-msg-question-ink` #7B4FC6 | `--ws-surface-1` #FFFFFF | 5.56:1 | 4.5:1 | ✓ |
| msg-question: texto na etiqueta | `--ws-msg-question-ink` #7B4FC6 | `--ws-msg-question-soft` #EDE6F7 | 4.57:1 | 4.5:1 | ✓ |
| msg-question: glifo/borda (≥ 3:1) | `--ws-msg-question` #7B4FC6 | `--ws-surface-1` #FFFFFF | 5.56:1 | 3:1 | ✓ |
| msg-question: texto sobre a cor cheia | `--ws-on-msg-question` #FFFFFF | `--ws-msg-question` #7B4FC6 | 5.56:1 | 4.5:1 | ✓ |
| foco sobre surface-0 (≥ 3:1) | `--ws-focus` #AB2C16 | `--ws-surface-0` #F7EEDC | 5.87:1 | 3:1 | ✓ |
| foco sobre surface-1 (≥ 3:1) | `--ws-focus` #AB2C16 | `--ws-surface-1` #FFFFFF | 6.77:1 | 3:1 | ✓ |
| borda forte (≥ 3:1) | `--ws-border-strong` #242525 | `--ws-surface-1` #FFFFFF | 15.37:1 | 3:1 | ✓ |

#### Escuro (`data-theme="escuro"`) — 90 pares, mínimo 3.04:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-0` #151616 | 13.77:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-1` #1E1F1F | 12.55:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-2` #272828 | 11.23:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-3` #313232 | 9.77:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-container` #1E1F1F | 12.55:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #B8AC95 | `--ws-surface-0` #151616 | 8.09:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #B8AC95 | `--ws-surface-1` #1E1F1F | 7.37:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #B8AC95 | `--ws-surface-2` #272828 | 6.60:1 | 4.5:1 | ✓ |
| texto terciário / placeholder | `--ws-text-faint` #A39780 | `--ws-surface-1` #1E1F1F | 5.74:1 | 4.5:1 | ✓ |
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F1DEC0 | `--ws-ink` #242525 | 11.67:1 | 4.5:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28222 | `--ws-ink` #242525 | 5.85:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #AB2C16 | `--ws-cream` #F1DEC0 | 5.14:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #242525 | `--ws-cream` #F1DEC0 | 11.67:1 | 4.5:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #F38D35 | `--ws-surface-1` #1E1F1F | 6.82:1 | 4.5:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #F38D35 | `--ws-accent-soft` #513720 | 4.52:1 | 4.5:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #F28222 | `--ws-surface-1` #1E1F1F | 6.29:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #242525 | `--ws-accent` #F28222 | 5.85:1 | 4.5:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #FD7458 | `--ws-surface-1` #1E1F1F | 6.15:1 | 4.5:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #FD7458 | `--ws-node-red-soft` #532A22 | 4.54:1 | 4.5:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #FD7458 | `--ws-surface-2` #272828 | 5.50:1 | 4.5:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #FC4E2B | `--ws-surface-1` #1E1F1F | 4.93:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #242525 | `--ws-node-red` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #F6B507 | `--ws-surface-1` #1E1F1F | 9.07:1 | 4.5:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #F6B507 | `--ws-node-yellow-soft` #524319 | 5.30:1 | 4.5:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #F6B507 | `--ws-surface-2` #272828 | 8.12:1 | 4.5:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #F6B507 | `--ws-surface-1` #1E1F1F | 9.07:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #242525 | `--ws-node-yellow` #F6B507 | 8.44:1 | 4.5:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #7DC549 | `--ws-surface-1` #1E1F1F | 7.83:1 | 4.5:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #7DC549 | `--ws-node-green-soft` #354729 | 4.78:1 | 4.5:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #7DC549 | `--ws-surface-2` #272828 | 7.01:1 | 4.5:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #7DC549 | `--ws-surface-1` #1E1F1F | 7.83:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #242525 | `--ws-node-green` #7DC549 | 7.29:1 | 4.5:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #13ACFE | `--ws-surface-1` #1E1F1F | 6.58:1 | 4.5:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #13ACFE | `--ws-node-blue-soft` #173E52 | 4.53:1 | 4.5:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #13ACFE | `--ws-surface-2` #272828 | 5.89:1 | 4.5:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #019FF4 | `--ws-surface-1` #1E1F1F | 5.72:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #242525 | `--ws-node-blue` #019FF4 | 5.32:1 | 4.5:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #D07D59 | `--ws-surface-1` #1E1F1F | 5.32:1 | 4.5:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #D07D59 | `--ws-node-brown-soft` #382821 | 4.53:1 | 4.5:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #D07D59 | `--ws-surface-2` #272828 | 4.76:1 | 4.5:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #A5532F | `--ws-surface-1` #1E1F1F | 3.05:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #FFFFFF | `--ws-node-brown` #A5532F | 5.41:1 | 4.5:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #FCB809 | `--ws-surface-1` #1E1F1F | 9.44:1 | 4.5:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #FCB809 | `--ws-node-orange-soft` #53441A | 5.43:1 | 4.5:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #FCB809 | `--ws-surface-2` #272828 | 8.45:1 | 4.5:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #FCB809 | `--ws-surface-1` #1E1F1F | 9.44:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #242525 | `--ws-node-orange` #FCB809 | 8.78:1 | 4.5:1 | ✓ |
| success: texto | `--ws-success-ink` #7DC549 | `--ws-surface-1` #1E1F1F | 7.83:1 | 4.5:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #7DC549 | `--ws-success-soft` #354729 | 4.78:1 | 4.5:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #7DC549 | `--ws-surface-1` #1E1F1F | 7.83:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #242525 | `--ws-success` #7DC549 | 7.29:1 | 4.5:1 | ✓ |
| warning: texto | `--ws-warning-ink` #F6B507 | `--ws-surface-1` #1E1F1F | 9.07:1 | 4.5:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #F6B507 | `--ws-warning-soft` #524319 | 5.30:1 | 4.5:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #F6B507 | `--ws-surface-1` #1E1F1F | 9.07:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #242525 | `--ws-warning` #F6B507 | 8.44:1 | 4.5:1 | ✓ |
| danger: texto | `--ws-danger-ink` #FD7458 | `--ws-surface-1` #1E1F1F | 6.15:1 | 4.5:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #FD7458 | `--ws-danger-soft` #532A22 | 4.54:1 | 4.5:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #FC4E2B | `--ws-surface-1` #1E1F1F | 4.93:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #242525 | `--ws-danger` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| info: texto | `--ws-info-ink` #13ACFE | `--ws-surface-1` #1E1F1F | 6.58:1 | 4.5:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #13ACFE | `--ws-info-soft` #173E52 | 4.53:1 | 4.5:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #019FF4 | `--ws-surface-1` #1E1F1F | 5.72:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #242525 | `--ws-info` #019FF4 | 5.32:1 | 4.5:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #E59D12 | `--ws-surface-1` #1E1F1F | 7.21:1 | 4.5:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #E59D12 | `--ws-ai-spark-soft` #4D3D1C | 4.58:1 | 4.5:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #E39B12 | `--ws-surface-1` #1E1F1F | 7.05:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #242525 | `--ws-ai-spark` #E39B12 | 6.56:1 | 4.5:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #13ACFE | `--ws-surface-1` #1E1F1F | 6.58:1 | 4.5:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #13ACFE | `--ws-msg-argument-soft` #173E52 | 4.53:1 | 4.5:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #019FF4 | `--ws-surface-1` #1E1F1F | 5.72:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #242525 | `--ws-msg-argument` #019FF4 | 5.32:1 | 4.5:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #F38D35 | `--ws-surface-1` #1E1F1F | 6.82:1 | 4.5:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #F38D35 | `--ws-msg-divergence-soft` #513720 | 4.52:1 | 4.5:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #F28222 | `--ws-surface-1` #1E1F1F | 6.29:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #242525 | `--ws-msg-divergence` #F28222 | 5.85:1 | 4.5:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #FD7458 | `--ws-surface-1` #1E1F1F | 6.15:1 | 4.5:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #FD7458 | `--ws-msg-risk-soft` #532A22 | 4.54:1 | 4.5:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #FC4E2B | `--ws-surface-1` #1E1F1F | 4.93:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #242525 | `--ws-msg-risk` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #7DC549 | `--ws-surface-1` #1E1F1F | 7.83:1 | 4.5:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #7DC549 | `--ws-msg-consensus-soft` #354729 | 4.78:1 | 4.5:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #7DC549 | `--ws-surface-1` #1E1F1F | 7.83:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #242525 | `--ws-msg-consensus` #7DC549 | 7.29:1 | 4.5:1 | ✓ |
| msg-question: texto | `--ws-msg-question-ink` #A689D9 | `--ws-surface-1` #1E1F1F | 5.67:1 | 4.5:1 | ✓ |
| msg-question: texto na etiqueta | `--ws-msg-question-ink` #A689D9 | `--ws-msg-question-soft` #342B47 | 4.55:1 | 4.5:1 | ✓ |
| msg-question: glifo/borda (≥ 3:1) | `--ws-msg-question` #7C51C7 | `--ws-surface-1` #1E1F1F | 3.04:1 | 3:1 | ✓ |
| msg-question: texto sobre a cor cheia | `--ws-on-msg-question` #FFFFFF | `--ws-msg-question` #7C51C7 | 5.44:1 | 4.5:1 | ✓ |
| foco sobre surface-0 (≥ 3:1) | `--ws-focus` #F9923C | `--ws-surface-0` #151616 | 7.95:1 | 3:1 | ✓ |
| foco sobre surface-1 (≥ 3:1) | `--ws-focus` #F9923C | `--ws-surface-1` #1E1F1F | 7.24:1 | 3:1 | ✓ |
| borda forte (≥ 3:1) | `--ws-border-strong` #CBBB9C | `--ws-surface-1` #1E1F1F | 8.76:1 | 3:1 | ✓ |

#### Alto contraste (`data-theme="contraste"`) — 90 pares, mínimo 5.14:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ws-text` #FFFFFF | `--ws-surface-0` #000000 | 21.00:1 | 7:1 | ✓ |
| texto principal | `--ws-text` #FFFFFF | `--ws-surface-1` #000000 | 21.00:1 | 7:1 | ✓ |
| texto principal | `--ws-text` #FFFFFF | `--ws-surface-2` #0F0F0F | 19.17:1 | 7:1 | ✓ |
| texto principal | `--ws-text` #FFFFFF | `--ws-surface-3` #1A1A1A | 17.40:1 | 7:1 | ✓ |
| texto principal | `--ws-text` #FFFFFF | `--ws-container` #000000 | 21.00:1 | 7:1 | ✓ |
| texto secundário | `--ws-text-muted` #FFFFFF | `--ws-surface-0` #000000 | 21.00:1 | 7:1 | ✓ |
| texto secundário | `--ws-text-muted` #FFFFFF | `--ws-surface-1` #000000 | 21.00:1 | 7:1 | ✓ |
| texto secundário | `--ws-text-muted` #FFFFFF | `--ws-surface-2` #0F0F0F | 19.17:1 | 7:1 | ✓ |
| texto terciário / placeholder | `--ws-text-faint` #E6E6E6 | `--ws-surface-1` #000000 | 16.83:1 | 7:1 | ✓ |
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F1DEC0 | `--ws-ink` #242525 | 11.67:1 | 7:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28222 | `--ws-ink` #242525 | 5.85:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #AB2C16 | `--ws-cream` #F1DEC0 | 5.14:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #242525 | `--ws-cream` #F1DEC0 | 11.67:1 | 7:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #FFB15C | `--ws-surface-1` #000000 | 11.70:1 | 7:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #FFB15C | `--ws-accent-soft` #000000 | 11.70:1 | 7:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #FFB15C | `--ws-surface-1` #000000 | 11.70:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #242525 | `--ws-accent` #FFB15C | 8.56:1 | 7:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #FD8067 | `--ws-surface-1` #000000 | 8.46:1 | 7:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #FD8067 | `--ws-node-red-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #FD8067 | `--ws-surface-2` #0F0F0F | 7.72:1 | 7:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #FD8067 | `--ws-surface-1` #000000 | 8.46:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #000000 | `--ws-node-red` #FD8067 | 8.46:1 | 7:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #F6B507 | `--ws-surface-1` #000000 | 11.53:1 | 7:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #F6B507 | `--ws-node-yellow-soft` #000000 | 11.53:1 | 7:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #F6B507 | `--ws-surface-2` #0F0F0F | 10.53:1 | 7:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #F6B507 | `--ws-surface-1` #000000 | 11.53:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #000000 | `--ws-node-yellow` #F6B507 | 11.53:1 | 7:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #7DC549 | `--ws-surface-1` #000000 | 9.95:1 | 7:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #7DC549 | `--ws-node-green-soft` #000000 | 9.95:1 | 7:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #7DC549 | `--ws-surface-2` #0F0F0F | 9.09:1 | 7:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #7DC549 | `--ws-surface-1` #000000 | 9.95:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #000000 | `--ws-node-green` #7DC549 | 9.95:1 | 7:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #18AEFE | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #18AEFE | `--ws-node-blue-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #18AEFE | `--ws-surface-2` #0F0F0F | 7.78:1 | 7:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #18AEFE | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #000000 | `--ws-node-blue` #18AEFE | 8.52:1 | 7:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #D89679 | `--ws-surface-1` #000000 | 8.56:1 | 7:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #D89679 | `--ws-node-brown-soft` #000000 | 8.56:1 | 7:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #D89679 | `--ws-surface-2` #0F0F0F | 7.81:1 | 7:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #D89679 | `--ws-surface-1` #000000 | 8.56:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #000000 | `--ws-node-brown` #D89679 | 8.56:1 | 7:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #FCB809 | `--ws-surface-1` #000000 | 12.00:1 | 7:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #FCB809 | `--ws-node-orange-soft` #000000 | 12.00:1 | 7:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #FCB809 | `--ws-surface-2` #0F0F0F | 10.95:1 | 7:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #FCB809 | `--ws-surface-1` #000000 | 12.00:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #000000 | `--ws-node-orange` #FCB809 | 12.00:1 | 7:1 | ✓ |
| success: texto | `--ws-success-ink` #7DC549 | `--ws-surface-1` #000000 | 9.95:1 | 7:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #7DC549 | `--ws-success-soft` #000000 | 9.95:1 | 7:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #7DC549 | `--ws-surface-1` #000000 | 9.95:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #000000 | `--ws-success` #7DC549 | 9.95:1 | 7:1 | ✓ |
| warning: texto | `--ws-warning-ink` #F6B507 | `--ws-surface-1` #000000 | 11.53:1 | 7:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #F6B507 | `--ws-warning-soft` #000000 | 11.53:1 | 7:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #F6B507 | `--ws-surface-1` #000000 | 11.53:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #000000 | `--ws-warning` #F6B507 | 11.53:1 | 7:1 | ✓ |
| danger: texto | `--ws-danger-ink` #FD8067 | `--ws-surface-1` #000000 | 8.46:1 | 7:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #FD8067 | `--ws-danger-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #FD8067 | `--ws-surface-1` #000000 | 8.46:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #000000 | `--ws-danger` #FD8067 | 8.46:1 | 7:1 | ✓ |
| info: texto | `--ws-info-ink` #18AEFE | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #18AEFE | `--ws-info-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #18AEFE | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #000000 | `--ws-info` #18AEFE | 8.52:1 | 7:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #E39B12 | `--ws-surface-1` #000000 | 8.96:1 | 7:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #E39B12 | `--ws-ai-spark-soft` #000000 | 8.96:1 | 7:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #E39B12 | `--ws-surface-1` #000000 | 8.96:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #000000 | `--ws-ai-spark` #E39B12 | 8.96:1 | 7:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #18AEFE | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #18AEFE | `--ws-msg-argument-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #18AEFE | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #000000 | `--ws-msg-argument` #18AEFE | 8.52:1 | 7:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #F38A30 | `--ws-surface-1` #000000 | 8.49:1 | 7:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #F38A30 | `--ws-msg-divergence-soft` #000000 | 8.49:1 | 7:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #F38A30 | `--ws-surface-1` #000000 | 8.49:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #000000 | `--ws-msg-divergence` #F38A30 | 8.49:1 | 7:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #FD8067 | `--ws-surface-1` #000000 | 8.46:1 | 7:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #FD8067 | `--ws-msg-risk-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #FD8067 | `--ws-surface-1` #000000 | 8.46:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #000000 | `--ws-msg-risk` #FD8067 | 8.46:1 | 7:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #7DC549 | `--ws-surface-1` #000000 | 9.95:1 | 7:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #7DC549 | `--ws-msg-consensus-soft` #000000 | 9.95:1 | 7:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #7DC549 | `--ws-surface-1` #000000 | 9.95:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #000000 | `--ws-msg-consensus` #7DC549 | 9.95:1 | 7:1 | ✓ |
| msg-question: texto | `--ws-msg-question-ink` #B39ADE | `--ws-surface-1` #000000 | 8.59:1 | 7:1 | ✓ |
| msg-question: texto na etiqueta | `--ws-msg-question-ink` #B39ADE | `--ws-msg-question-soft` #000000 | 8.59:1 | 7:1 | ✓ |
| msg-question: glifo/borda (≥ 3:1) | `--ws-msg-question` #B39ADE | `--ws-surface-1` #000000 | 8.59:1 | 3:1 | ✓ |
| msg-question: texto sobre a cor cheia | `--ws-on-msg-question` #000000 | `--ws-msg-question` #B39ADE | 8.59:1 | 7:1 | ✓ |
| foco sobre surface-0 (≥ 3:1) | `--ws-focus` #FFFF00 | `--ws-surface-0` #000000 | 19.56:1 | 3:1 | ✓ |
| foco sobre surface-1 (≥ 3:1) | `--ws-focus` #FFFF00 | `--ws-surface-1` #000000 | 19.56:1 | 3:1 | ✓ |
| borda forte (≥ 3:1) | `--ws-border-strong` #FFFFFF | `--ws-surface-1` #000000 | 21.00:1 | 3:1 | ✓ |

#### Terminal (`data-theme="terminal"`) — 90 pares, mínimo 3.04:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-0` #242525 | 11.67:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-1` #2A2B2B | 10.79:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-2` #313232 | 9.77:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-surface-3` #393A3A | 8.67:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F1DEC0 | `--ws-container` #2A2B2B | 10.79:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #CDBB97 | `--ws-surface-0` #242525 | 8.16:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #CDBB97 | `--ws-surface-1` #2A2B2B | 7.54:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #CDBB97 | `--ws-surface-2` #313232 | 6.83:1 | 4.5:1 | ✓ |
| texto terciário / placeholder | `--ws-text-faint` #B8A682 | `--ws-surface-1` #2A2B2B | 5.96:1 | 4.5:1 | ✓ |
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F1DEC0 | `--ws-ink` #242525 | 11.67:1 | 4.5:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28222 | `--ws-ink` #242525 | 5.85:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #AB2C16 | `--ws-cream` #F1DEC0 | 5.14:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #242525 | `--ws-cream` #F1DEC0 | 11.67:1 | 4.5:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #F59B4D | `--ws-surface-1` #2A2B2B | 6.54:1 | 4.5:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #F59B4D | `--ws-accent-soft` #563E29 | 4.57:1 | 4.5:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #F28222 | `--ws-surface-1` #2A2B2B | 5.40:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #242525 | `--ws-accent` #F28222 | 5.85:1 | 4.5:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #FD856C | `--ws-surface-1` #2A2B2B | 5.92:1 | 4.5:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #FD856C | `--ws-node-red-soft` #58332B | 4.55:1 | 4.5:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #FD856C | `--ws-surface-2` #313232 | 5.36:1 | 4.5:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #FC4E2B | `--ws-surface-1` #2A2B2B | 4.24:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #242525 | `--ws-node-red` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #F6B507 | `--ws-surface-1` #2A2B2B | 7.80:1 | 4.5:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #F6B507 | `--ws-node-yellow-soft` #574923 | 4.84:1 | 4.5:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #F6B507 | `--ws-surface-2` #313232 | 7.06:1 | 4.5:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #F6B507 | `--ws-surface-1` #2A2B2B | 7.80:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #242525 | `--ws-node-yellow` #F6B507 | 8.44:1 | 4.5:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #84C853 | `--ws-surface-1` #2A2B2B | 7.01:1 | 4.5:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #84C853 | `--ws-node-green-soft` #3C4D32 | 4.51:1 | 4.5:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #84C853 | `--ws-surface-2` #313232 | 6.35:1 | 4.5:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #7DC549 | `--ws-surface-1` #2A2B2B | 6.73:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #242525 | `--ws-node-green` #7DC549 | 7.29:1 | 4.5:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #2FB6FE | `--ws-surface-1` #2A2B2B | 6.25:1 | 4.5:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #2FB6FE | `--ws-node-blue-soft` #214557 | 4.50:1 | 4.5:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #2FB6FE | `--ws-surface-2` #313232 | 5.66:1 | 4.5:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #019FF4 | `--ws-surface-1` #2A2B2B | 4.91:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #242525 | `--ws-node-blue` #019FF4 | 5.32:1 | 4.5:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #D48969 | `--ws-surface-1` #2A2B2B | 5.13:1 | 4.5:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #D48969 | `--ws-node-brown-soft` #3F312A | 4.50:1 | 4.5:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #D48969 | `--ws-surface-2` #313232 | 4.64:1 | 4.5:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #B55B34 | `--ws-surface-1` #2A2B2B | 3.05:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #FFFFFF | `--ws-node-brown` #B55B34 | 4.66:1 | 4.5:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #FCB809 | `--ws-surface-1` #2A2B2B | 8.11:1 | 4.5:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #FCB809 | `--ws-node-orange-soft` #584A24 | 4.96:1 | 4.5:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #FCB809 | `--ws-surface-2` #313232 | 7.35:1 | 4.5:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #FCB809 | `--ws-surface-1` #2A2B2B | 8.11:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #242525 | `--ws-node-orange` #FCB809 | 8.78:1 | 4.5:1 | ✓ |
| success: texto | `--ws-success-ink` #84C853 | `--ws-surface-1` #2A2B2B | 7.01:1 | 4.5:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #84C853 | `--ws-success-soft` #3C4D32 | 4.51:1 | 4.5:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #7DC549 | `--ws-surface-1` #2A2B2B | 6.73:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #242525 | `--ws-success` #7DC549 | 7.29:1 | 4.5:1 | ✓ |
| warning: texto | `--ws-warning-ink` #F6B507 | `--ws-surface-1` #2A2B2B | 7.80:1 | 4.5:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #F6B507 | `--ws-warning-soft` #574923 | 4.84:1 | 4.5:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #F6B507 | `--ws-surface-1` #2A2B2B | 7.80:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #242525 | `--ws-warning` #F6B507 | 8.44:1 | 4.5:1 | ✓ |
| danger: texto | `--ws-danger-ink` #FD856C | `--ws-surface-1` #2A2B2B | 5.92:1 | 4.5:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #FD856C | `--ws-danger-soft` #58332B | 4.55:1 | 4.5:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #FC4E2B | `--ws-surface-1` #2A2B2B | 4.24:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #242525 | `--ws-danger` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| info: texto | `--ws-info-ink` #2FB6FE | `--ws-surface-1` #2A2B2B | 6.25:1 | 4.5:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #2FB6FE | `--ws-info-soft` #214557 | 4.50:1 | 4.5:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #019FF4 | `--ws-surface-1` #2A2B2B | 4.91:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #242525 | `--ws-info` #019FF4 | 5.32:1 | 4.5:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #EDA61F | `--ws-surface-1` #2A2B2B | 6.81:1 | 4.5:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #EDA61F | `--ws-ai-spark-soft` #534426 | 4.53:1 | 4.5:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #E39B12 | `--ws-surface-1` #2A2B2B | 6.06:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #242525 | `--ws-ai-spark` #E39B12 | 6.56:1 | 4.5:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #2FB6FE | `--ws-surface-1` #2A2B2B | 6.25:1 | 4.5:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #2FB6FE | `--ws-msg-argument-soft` #214557 | 4.50:1 | 4.5:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #019FF4 | `--ws-surface-1` #2A2B2B | 4.91:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #242525 | `--ws-msg-argument` #019FF4 | 5.32:1 | 4.5:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #F59B4D | `--ws-surface-1` #2A2B2B | 6.54:1 | 4.5:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #F59B4D | `--ws-msg-divergence-soft` #563E29 | 4.57:1 | 4.5:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #F28222 | `--ws-surface-1` #2A2B2B | 5.40:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #242525 | `--ws-msg-divergence` #F28222 | 5.85:1 | 4.5:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #FD856C | `--ws-surface-1` #2A2B2B | 5.92:1 | 4.5:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #FD856C | `--ws-msg-risk-soft` #58332B | 4.55:1 | 4.5:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #FC4E2B | `--ws-surface-1` #2A2B2B | 4.24:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #242525 | `--ws-msg-risk` #FC4E2B | 4.58:1 | 4.5:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #84C853 | `--ws-surface-1` #2A2B2B | 7.01:1 | 4.5:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #84C853 | `--ws-msg-consensus-soft` #3C4D32 | 4.51:1 | 4.5:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #7DC549 | `--ws-surface-1` #2A2B2B | 6.73:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #242525 | `--ws-msg-consensus` #7DC549 | 7.29:1 | 4.5:1 | ✓ |
| msg-question: texto | `--ws-msg-question-ink` #AF94DC | `--ws-surface-1` #2A2B2B | 5.47:1 | 4.5:1 | ✓ |
| msg-question: texto na etiqueta | `--ws-msg-question-ink` #AF94DC | `--ws-msg-question-soft` #3C334D | 4.56:1 | 4.5:1 | ✓ |
| msg-question: glifo/borda (≥ 3:1) | `--ws-msg-question` #875ECB | `--ws-surface-1` #2A2B2B | 3.04:1 | 3:1 | ✓ |
| msg-question: texto sobre a cor cheia | `--ws-on-msg-question` #FFFFFF | `--ws-msg-question` #875ECB | 4.67:1 | 4.5:1 | ✓ |
| foco sobre surface-0 (≥ 3:1) | `--ws-focus` #F28222 | `--ws-surface-0` #242525 | 5.85:1 | 3:1 | ✓ |
| foco sobre surface-1 (≥ 3:1) | `--ws-focus` #F28222 | `--ws-surface-1` #2A2B2B | 5.40:1 | 3:1 | ✓ |
| borda forte (≥ 3:1) | `--ws-border-strong` #F28222 | `--ws-surface-1` #2A2B2B | 5.40:1 | 3:1 | ✓ |

<!-- tokens-ws:fim -->

## 8. Mapa de migração (tokens.css v1, sem prefixo → `--ws-*`)

| v1 (`tokens.css`) | v2 (`tokens-ws.css`) | Nota |
|---|---|---|
| `--ground` | `--ws-surface-0` | |
| `--surface` | `--ws-surface-1` | |
| `--surface-2` / `--surface-3` | `--ws-surface-2` / `--ws-surface-3` | |
| `--ink` | `--ws-text` | **atenção:** em v2 `--ws-ink` é a cor de marca (preto-monitor), não o texto |
| `--muted` / `--faint` | `--ws-text-muted` / `--ws-text-faint` | |
| `--line` / `--line-soft` | `--ws-border-strong` / `--ws-border` | |
| `--focus` | `--ws-focus` (+ `--ws-focus-ring`) | |
| `--scrim` | `--ws-scrim-tint` + `--ws-blur-scrim` + `--ws-scrim-saturate` | scrim agora é tinta + blur |
| `--primary` / `-strong` / `-soft` / `-ink` / `--on-primary` / `--primary-gradient` | `--ws-accent` / `-strong` / `-soft` / `-ink` / `--ws-on-accent` / `--ws-gradient-brand` | azul-protocolo → laranja do logo |
| `--secondary*` (verde-araucária) | `--ws-node-green*` ou `--ws-success*` | sem secundária própria em v2 |
| `--spark*`, `--spark-glow`, `--on-spark` | `--ws-ai-spark*`, `--ws-ai-spark-glow`, `--ws-on-ai-spark` | |
| `--class-argumento/divergencia/risco/consenso/pergunta` | `--ws-msg-argument/divergence/risk/consensus/question` | inglês no nome do token; `-nome` continua em pt |
| `--class-ruido` | `--ws-text-faint` | |
| `--due-soon` / `--due-over` | `--ws-warning` / `--ws-danger` | |
| `--type-*`, `--ext-*`, `--dept-*`, `--state-*`, `--status-*`, `--seal-*` | **mantidos em `tokens.css` até a etapa (b)**; passam a `--ws-type-*` etc. quando migrarem | fora do briefing v2; dept pode mapear para `--ws-node-*` |
| `--font-editorial` / `--font-ui` / `--font-data` | `--ws-font-display` / `--ws-font-body` / `--ws-font-mono` | |
| `--text-<tok>` (+ `--lh`, `--tracking`) | `--ws-text-<tok>` (+ `--lh`, `--tracking`) | `display-xl`, `title` saem; `prompt` entra |
| `--space-N` / `--radius-xs..xl,pill` | `--ws-space-N` / `--ws-radius-sm,md,lg,pill` (+ `monitor`) | `xs`→`sm`, `xl`→`lg` |
| `--dur-fast` / `--dur` / `--dur-slow` / `--dur-pulse` / `--dur-spark` | `--ws-duration-fast` / `-base` / `-slow` / `-pulse` / `-spark` (+ `-blink`) | |
| `--ease-out` / `--ease-in-out` / `--ease-snap` | `--ws-ease` / `--ws-ease-in-out` / `--ws-ease-snap` | |
| `--shadow-1..3`, `--shadow-aura` | `--ws-shadow-1/2`, `--ws-shadow-clay` | aura → anel de foco; `shadow-3` sai |
| `--skin-*` (Mesa) | **mantidos**; artes de fundo viram catálogo `backgrounds.ts` | |
| `--control-*`, `--z-*` | `--ws-control-*`, `--ws-z-*` | sidebar/header saem (medidas do shell, não tokens) |
| `--card-*` | mantidos em `tokens.css` (ANATOMIA_CARDS.md) | |
| `data-theme="blueprint"` | **sem equivalente**; `terminal` entra | `ThemeMode.BLUEPRINT` → decidir: remover ou manter como skin da Mesa |

Estratégia: `tokens-ws.css` convive com `tokens.css` durante a migração; `components.css` passa a consumir `--ws-*` família por família. Nenhum componente novo usa token sem prefixo.
