# Tokens `--ws-*` — Work Station (v2, paleta do logo)

> **Status: provisório.** O logo oficial (board Trello, card "Identidade visual") não pôde ser baixado nesta sessão (rede bloqueada, ver `DECISOES.md` Q-45). Todos os hex de marca e dos nós foram **derivados da descrição textual** do logo — monitor preto arredondado em estilo clay 3D com prompt `>_` creme, disco central creme, malha de rede laranja ligando nós vermelho/amarelo/verde/azul/marrom/laranja, anel externo preto. **Cada hex abaixo deve ser calibrado com o PNG** (conta-gotas em: carcaça, prompt, disco, linha da malha, um nó de cada cor). Para calibrar basta trocar `BRAND`/`NODES` em [`anatomias/lib/tokens-ws.mjs`](anatomias/lib/tokens-ws.mjs) e rodar `node docs/design-system/anatomias/lib/tokens-ws.mjs` — tudo o que é derivado (`-ink`, `-soft`, `on-*`, contraste) acompanha, e o script falha se algum par reprovar.

Fonte de verdade: [`anatomias/lib/tokens-ws.mjs`](anatomias/lib/tokens-ws.mjs) → gera [`tokens-ws.css`](tokens-ws.css) e as duas tabelas geradas deste arquivo. Temas: `<html data-theme="claro|escuro|contraste|terminal">` (sem `data-theme` ou `auto` segue `prefers-color-scheme`). O enum `ThemeMode` ganha `TERMINAL` (e `BLUEPRINT` sai do v2 — ver Mapa de migração). Regras de contraste: texto ≥ 4,5:1 (≥ 7:1 no alto contraste), glifo/borda/foco ≥ 3:1, `on-*` ≥ 4,5:1 sobre a cor cheia.

## 1. Marca (iguais nos 4 temas — são o logo)

| Token | Hex (provisório) | Cor | Lido de | Uso |
|---|---|---|---|---|
| `--ws-ink` | #17171C | preto-monitor (quase preto, levemente frio) | carcaça do monitor, anel externo | fundo do tema terminal, carcaça dos glyphs clay, texto no claro, `on-accent` |
| `--ws-cream` | #F4ECD8 | creme | prompt `>_`, disco central | texto nos temas escuros, prompt dos WS Moji, disco do gradiente |
| `--ws-orange-500` | #F28C28 | laranja-malha | linhas da malha | acento (escuro/terminal), nó `orange`, malha dos glyphs |
| `--ws-orange-600` | #D9701A | laranja-escuro | lado sombreado do disco/malha | acento no claro, hover, 2º stop do disco |
| `--ws-orange-700` | #B35612 | laranja-queimado | borda inferior clay | active, foco no claro, único laranja ≥ 3:1 sobre o creme |
| `--ws-gradient-brand` | `radial-gradient(circle at 38% 32%, #F28C28 0%, #D9701A 58%, #B35612 100%)` | disco laranja | o disco central com luz no alto-esquerda | fundo do botão-herói, avatar da IA, ficha DP |
| `--ws-gradient-mesh` | dois halos laranja + duas tramas a 60° sobre `#17171C` | malha laranja sobre preto | a malha de rede | fundo de hero, arte de fundo "malha-laranja", tema terminal (cabeçalho) |

No alto contraste ambos os gradientes colapsam para cor chapada (`--ws-accent` e `#000`).

## 2. Nós categóricos (malha do logo)

`--ws-node-{red,yellow,green,blue,brown,orange}` com `-ink` (texto), `-soft` (fundo de etiqueta), `on-node-*` (texto sobre o nó) e `-nome` (string em texto, para daltonismo). Bases provisórias: vermelho #D6453A · amarelo #E8B931 · verde #3BA55D · azul #3C7BD6 · marrom #8B5A2B · laranja #F28C28. São **categóricos** (participantes, departamentos, séries de gráfico, nós do fio de decisão) — nunca carregam significado de estado; para estado use os semânticos. Ordem canônica (horário a partir do topo, como no logo — confirmar no PNG): red → yellow → green → blue → brown → orange.

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

Raios: `--ws-radius-sm` 6 px · `--ws-radius-md` 10 px · `--ws-radius-lg` 16 px · `--ws-radius-pill` 999 px · `--ws-radius-monitor` 22 % (a moldura do monitor nos glyphs e avatares).

Relevo clay: `--ws-shadow-clay` = brilho superior (`inset 0 1px 0` claro) + sombra interna inferior (`inset 0 -2px 3px` escura) + sombra externa macia. No terminal o brilho é laranja translúcido e há um aro laranja de 1 px; no alto contraste `none`. Também `--ws-shadow-1/2` para elevação comum.

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
| `--ws-scrim-tint` | rgba(23,23,28,.35) | rgba(23,23,28,.55) | rgba(0,0,0,.85) | rgba(23,23,28,.55) |
| `--ws-scrim-saturate` | 1.2 | 1.2 | 1.2 (sem efeito, blur 0) | 1.2 |
| `--ws-glass-bg` | rgba(255,255,255,.55) | rgba(27,27,33,.62) | #000000 | rgba(23,23,28,.70) |
| `--ws-glass-border` | rgba(23,23,28,.12) | rgba(244,236,216,.14) | #FFFFFF | rgba(242,140,40,.28) |

Classes utilitárias mínimas em `tokens-ws.css`: `.ws-scrim`, `.ws-glass`, `.ws-clay`. Texto sobre vidro deve ser medido contra o pior fundo possível (a arte de fundo mais clara/escura) — o vidro não entra na tabela automática.

## 7. Tema terminal

Fundo `--ws-surface-0 = --ws-ink` (#17171C), cards um tom acima (#1C1C22), texto creme `#F4ECD8`, texto secundário creme-sépia, bordas quentes, **acento, foco e borda-forte em `--ws-orange-500`**, corpo em mono, relevo clay com brilho laranja. Difere do escuro por: neutros puxados para o ink do logo (não para o cinza-azulado), tipografia mono e todo acento laranja (no escuro o foco é laranja-claro para ganhar 3:1 sem saturar).

<!-- tokens-ws:inicio -->
### Paleta por tema (gerada)

| Token | Claro | Escuro | Alto contraste | Terminal | Cor (texto) | Uso |
|---|---|---|---|---|---|---|
| `--ws-ink` | #17171C | #17171C | #17171C | #17171C | preto-monitor | carcaça do monitor, anel externo, fundo do tema terminal |
| `--ws-cream` | #F4ECD8 | #F4ECD8 | #F4ECD8 | #F4ECD8 | creme | prompt `>_`, disco central, texto nos temas escuros |
| `--ws-orange-500` | #F28C28 | #F28C28 | #F28C28 | #F28C28 | laranja-malha | linhas da malha, acento, foco (terminal) |
| `--ws-orange-600` | #D9701A | #D9701A | #D9701A | #D9701A | laranja-escuro | hover do acento, 2º stop do disco |
| `--ws-orange-700` | #B35612 | #B35612 | #B35612 | #B35612 | laranja-queimado | borda inferior clay, active, foco (claro) |
| `--ws-surface-0` | #F6F0E1 | #121216 | #000000 | #17171C | neutro | fundo do app |
| `--ws-surface-1` | #FFFFFF | #1B1B21 | #000000 | #1C1C22 | neutro | card, painel |
| `--ws-surface-2` | #F3ECDC | #24242B | #0F0F0F | #23232A | neutro | etiqueta, campo |
| `--ws-surface-3` | #E7DEC8 | #2E2E36 | #1A1A1A | #2B2B33 | neutro | trilha, divisória de mosaico |
| `--ws-container` | #FFFFFF | #1B1B21 | #000000 | #1C1C22 | neutro | contêiner de página |
| `--ws-text` | #17171C | #F4ECD8 | #FFFFFF | #F4ECD8 | tinta | texto principal |
| `--ws-text-muted` | #5B5852 | #B9B2A3 | #FFFFFF | #CDBD9C | tinta | texto secundário |
| `--ws-text-faint` | #6B675F | #A39C8E | #E6E6E6 | #B5A685 | tinta | placeholder |
| `--ws-border` | #D8CFB8 | #3A3A44 | #FFFFFF | #3B3426 | — | divisória |
| `--ws-border-strong` | #17171C | #CFC6B0 | #FFFFFF | #F28C28 | — | borda ≥ 3:1 |
| `--ws-focus` | #B35612 | #F6A24A | #FFFF00 | #F28C28 | — | anel de foco |
| `--ws-accent` | #D9701A | #F28C28 | #FFB15C | #F28C28 | laranja | botão primário, link, estado ativo |
| `--ws-accent-ink` | #A55514 | #F28C28 | #FFB15C | #F28C28 | laranja | texto do acento |
| `--ws-accent-soft` | #FAEBDF | #4F3623 | #000000 | #4B3523 | laranja | fundo da etiqueta do acento |
| `--ws-on-accent` | #17171C | #17171C | #17171C | #17171C | laranja | texto sobre o acento |
| `--ws-node-red` | #D63F34 | #D6574C | #E68D86 | #D6574C | vermelho | glifo, nó, borda ≥ 3:1 |
| `--ws-node-red-ink` | #C43228 | #DF7A71 | #E68D86 | #DE786F | vermelho | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-red-soft` | #F9E5E3 | #482527 | #000000 | #452527 | vermelho | fundo da etiqueta |
| `--ws-on-node-red` | #FFFFFF | #17171C | #000000 | #17171C | vermelho | texto sobre a cor cheia |
| `--ws-node-yellow` | #B88E15 | #E8B931 | #E8B931 | #E8B931 | amarelo | glifo, nó, borda ≥ 3:1 |
| `--ws-node-yellow-ink` | #86670F | #E8B931 | #E8B931 | #E8B931 | amarelo | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-yellow-soft` | #FCF5E2 | #4C4125 | #000000 | #493F25 | amarelo | fundo da etiqueta |
| `--ws-on-node-yellow` | #17171C | #17171C | #000000 | #17171C | amarelo | texto sobre a cor cheia |
| `--ws-node-green` | #3BA55D | #3BA55D | #42BA69 | #3BA55D | verde | glifo, nó, borda ≥ 3:1 |
| `--ws-node-green-ink` | #2B7844 | #40B465 | #42BA69 | #40B264 | verde | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-green-soft` | #E4F2E8 | #233C2F | #000000 | #233A2F | verde | fundo da etiqueta |
| `--ws-on-node-green` | #17171C | #17171C | #000000 | #17171C | verde | texto sobre a cor cheia |
| `--ws-node-blue` | #3075D6 | #4680D6 | #7DA7E4 | #4680D6 | azul | glifo, nó, borda ≥ 3:1 |
| `--ws-node-blue-ink` | #2769C5 | #6E9BDF | #7DA7E4 | #6C9ADE | azul | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-blue-soft` | #E4EDF9 | #23324C | #000000 | #23314A | azul | fundo da etiqueta |
| `--ws-on-node-blue` | #FFFFFF | #17171C | #000000 | #17171C | azul | texto sobre a cor cheia |
| `--ws-node-brown` | #8B5A2B | #8F5D2C | #D09A66 | #8F5D2C | marrom | glifo, nó, borda ≥ 3:1 |
| `--ws-node-brown-ink` | #8B5A2B | #C68646 | #D09A66 | #C68444 | marrom | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-brown-soft` | #EFE8E1 | #362A23 | #000000 | #342A24 | marrom | fundo da etiqueta |
| `--ws-on-node-brown` | #FFFFFF | #FFFFFF | #000000 | #FFFFFF | marrom | texto sobre a cor cheia |
| `--ws-node-orange` | #E3780E | #F28C28 | #F28C28 | #F28C28 | laranja | glifo, nó, borda ≥ 3:1 |
| `--ws-node-orange-ink` | #A2560A | #F28C28 | #F28C28 | #F28C28 | laranja | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-node-orange-soft` | #FDEFE1 | #4F3623 | #000000 | #4B3523 | laranja | fundo da etiqueta |
| `--ws-on-node-orange` | #17171C | #17171C | #000000 | #17171C | laranja | texto sobre a cor cheia |
| `--ws-success` | #3BA55D | #3BA55D | #42BA69 | #3BA55D | verde | glifo, nó, borda ≥ 3:1 |
| `--ws-success-ink` | #2B7844 | #40B465 | #42BA69 | #40B264 | verde | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-success-soft` | #E4F2E8 | #233C2F | #000000 | #233A2F | verde | fundo da etiqueta |
| `--ws-on-success` | #17171C | #17171C | #000000 | #17171C | verde | texto sobre a cor cheia |
| `--ws-warning` | #B88E15 | #E8B931 | #E8B931 | #E8B931 | amarelo | glifo, nó, borda ≥ 3:1 |
| `--ws-warning-ink` | #86670F | #E8B931 | #E8B931 | #E8B931 | amarelo | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-warning-soft` | #FCF5E2 | #4C4125 | #000000 | #493F25 | amarelo | fundo da etiqueta |
| `--ws-on-warning` | #17171C | #17171C | #000000 | #17171C | amarelo | texto sobre a cor cheia |
| `--ws-danger` | #D63F34 | #D6574C | #E68D86 | #D6574C | vermelho | glifo, nó, borda ≥ 3:1 |
| `--ws-danger-ink` | #C43228 | #DF7A71 | #E68D86 | #DE786F | vermelho | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-danger-soft` | #F9E5E3 | #482527 | #000000 | #452527 | vermelho | fundo da etiqueta |
| `--ws-on-danger` | #FFFFFF | #17171C | #000000 | #17171C | vermelho | texto sobre a cor cheia |
| `--ws-info` | #3075D6 | #4680D6 | #7DA7E4 | #4680D6 | azul | glifo, nó, borda ≥ 3:1 |
| `--ws-info-ink` | #2769C5 | #6E9BDF | #7DA7E4 | #6C9ADE | azul | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-info-soft` | #E4EDF9 | #23324C | #000000 | #23314A | azul | fundo da etiqueta |
| `--ws-on-info` | #FFFFFF | #17171C | #000000 | #17171C | azul | texto sobre a cor cheia |
| `--ws-ai-spark` | #C78810 | #E39B12 | #E39B12 | #E39B12 | âmbar | glifo, nó, borda ≥ 3:1 |
| `--ws-ai-spark-ink` | #8E610B | #E39B12 | #E39B12 | #E39B12 | âmbar | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-ai-spark-soft` | #FBF1DE | #4B3A1D | #000000 | #48381E | âmbar | fundo da etiqueta |
| `--ws-on-ai-spark` | #17171C | #17171C | #000000 | #17171C | âmbar | texto sobre a cor cheia |
| `--ws-msg-argument` | #3075D6 | #4680D6 | #7DA7E4 | #4680D6 | azul | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-argument-ink` | #2769C5 | #6E9BDF | #7DA7E4 | #6C9ADE | azul | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-argument-soft` | #E4EDF9 | #23324C | #000000 | #23314A | azul | fundo da etiqueta |
| `--ws-on-msg-argument` | #FFFFFF | #17171C | #000000 | #17171C | azul | texto sobre a cor cheia |
| `--ws-msg-divergence` | #E3780E | #F28C28 | #F28C28 | #F28C28 | laranja | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-divergence-ink` | #A2560A | #F28C28 | #F28C28 | #F28C28 | laranja | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-divergence-soft` | #FDEFE1 | #4F3623 | #000000 | #4B3523 | laranja | fundo da etiqueta |
| `--ws-on-msg-divergence` | #17171C | #17171C | #000000 | #17171C | laranja | texto sobre a cor cheia |
| `--ws-msg-risk` | #D63F34 | #D6574C | #E68D86 | #D6574C | vermelho | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-risk-ink` | #C43228 | #DF7A71 | #E68D86 | #DE786F | vermelho | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-risk-soft` | #F9E5E3 | #482527 | #000000 | #452527 | vermelho | fundo da etiqueta |
| `--ws-on-msg-risk` | #FFFFFF | #17171C | #000000 | #17171C | vermelho | texto sobre a cor cheia |
| `--ws-msg-consensus` | #3BA55D | #3BA55D | #42BA69 | #3BA55D | verde | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-consensus-ink` | #2B7844 | #40B465 | #42BA69 | #40B264 | verde | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-consensus-soft` | #E4F2E8 | #233C2F | #000000 | #233A2F | verde | fundo da etiqueta |
| `--ws-on-msg-consensus` | #17171C | #17171C | #000000 | #17171C | verde | texto sobre a cor cheia |
| `--ws-msg-question` | #7B4FC6 | #7B4FC6 | #B39ADE | #7B4FC6 | roxo | glifo, nó, borda ≥ 3:1 |
| `--ws-msg-question-ink` | #7B4FC6 | #A385D7 | #B39ADE | #A385D7 | roxo | texto ≥ 4,5:1 sobre surface-1/2 e -soft |
| `--ws-msg-question-soft` | #EDE6F7 | #322749 | #000000 | #312746 | roxo | fundo da etiqueta |
| `--ws-on-msg-question` | #FFFFFF | #FFFFFF | #000000 | #FFFFFF | roxo | texto sobre a cor cheia |

### Contraste verificado (gerado)

Pares verificados: **360** · falhas: **0** · limites: texto ≥ 4,5:1 (≥ 7:1 no alto contraste), glifo/borda/foco ≥ 3:1 (WCAG 1.4.3 / 1.4.6 / 1.4.11). Gerado por `anatomias/lib/tokens-ws.mjs`.

#### Claro (`data-theme="claro"`) — 90 pares, mínimo 3.02:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ws-text` #17171C | `--ws-surface-0` #F6F0E1 | 15.71:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #17171C | `--ws-surface-1` #FFFFFF | 17.86:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #17171C | `--ws-surface-2` #F3ECDC | 15.18:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #17171C | `--ws-surface-3` #E7DEC8 | 13.34:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #17171C | `--ws-container` #FFFFFF | 17.86:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #5B5852 | `--ws-surface-0` #F6F0E1 | 6.23:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #5B5852 | `--ws-surface-1` #FFFFFF | 7.09:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #5B5852 | `--ws-surface-2` #F3ECDC | 6.02:1 | 4.5:1 | ✓ |
| texto terciário / placeholder | `--ws-text-faint` #6B675F | `--ws-surface-1` #FFFFFF | 5.63:1 | 4.5:1 | ✓ |
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F4ECD8 | `--ws-ink` #17171C | 15.17:1 | 4.5:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28C28 | `--ws-ink` #17171C | 7.28:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #B35612 | `--ws-cream` #F4ECD8 | 4.19:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #17171C | `--ws-cream` #F4ECD8 | 15.17:1 | 4.5:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #A55514 | `--ws-surface-1` #FFFFFF | 5.37:1 | 4.5:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #A55514 | `--ws-accent-soft` #FAEBDF | 4.61:1 | 4.5:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #D9701A | `--ws-surface-1` #FFFFFF | 3.34:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #17171C | `--ws-accent` #D9701A | 5.34:1 | 4.5:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #C43228 | `--ws-surface-1` #FFFFFF | 5.48:1 | 4.5:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #C43228 | `--ws-node-red-soft` #F9E5E3 | 4.52:1 | 4.5:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #C43228 | `--ws-surface-2` #F3ECDC | 4.65:1 | 4.5:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #D63F34 | `--ws-surface-1` #FFFFFF | 4.55:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #FFFFFF | `--ws-node-red` #D63F34 | 4.55:1 | 4.5:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #86670F | `--ws-surface-1` #FFFFFF | 5.30:1 | 4.5:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #86670F | `--ws-node-yellow-soft` #FCF5E2 | 4.87:1 | 4.5:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #86670F | `--ws-surface-2` #F3ECDC | 4.50:1 | 4.5:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #B88E15 | `--ws-surface-1` #FFFFFF | 3.04:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #17171C | `--ws-node-yellow` #B88E15 | 5.88:1 | 4.5:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #2B7844 | `--ws-surface-1` #FFFFFF | 5.42:1 | 4.5:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #2B7844 | `--ws-node-green-soft` #E4F2E8 | 4.69:1 | 4.5:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #2B7844 | `--ws-surface-2` #F3ECDC | 4.61:1 | 4.5:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #3BA55D | `--ws-surface-1` #FFFFFF | 3.12:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #17171C | `--ws-node-green` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #2769C5 | `--ws-surface-1` #FFFFFF | 5.37:1 | 4.5:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #2769C5 | `--ws-node-blue-soft` #E4EDF9 | 4.54:1 | 4.5:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #2769C5 | `--ws-surface-2` #F3ECDC | 4.56:1 | 4.5:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #3075D6 | `--ws-surface-1` #FFFFFF | 4.52:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #FFFFFF | `--ws-node-blue` #3075D6 | 4.52:1 | 4.5:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #8B5A2B | `--ws-surface-1` #FFFFFF | 5.84:1 | 4.5:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #8B5A2B | `--ws-node-brown-soft` #EFE8E1 | 4.81:1 | 4.5:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #8B5A2B | `--ws-surface-2` #F3ECDC | 4.96:1 | 4.5:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #8B5A2B | `--ws-surface-1` #FFFFFF | 5.84:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #FFFFFF | `--ws-node-brown` #8B5A2B | 5.84:1 | 4.5:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #A2560A | `--ws-surface-1` #FFFFFF | 5.42:1 | 4.5:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #A2560A | `--ws-node-orange-soft` #FDEFE1 | 4.81:1 | 4.5:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #A2560A | `--ws-surface-2` #F3ECDC | 4.61:1 | 4.5:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #E3780E | `--ws-surface-1` #FFFFFF | 3.02:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #17171C | `--ws-node-orange` #E3780E | 5.92:1 | 4.5:1 | ✓ |
| success: texto | `--ws-success-ink` #2B7844 | `--ws-surface-1` #FFFFFF | 5.42:1 | 4.5:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #2B7844 | `--ws-success-soft` #E4F2E8 | 4.69:1 | 4.5:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #3BA55D | `--ws-surface-1` #FFFFFF | 3.12:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #17171C | `--ws-success` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| warning: texto | `--ws-warning-ink` #86670F | `--ws-surface-1` #FFFFFF | 5.30:1 | 4.5:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #86670F | `--ws-warning-soft` #FCF5E2 | 4.87:1 | 4.5:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #B88E15 | `--ws-surface-1` #FFFFFF | 3.04:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #17171C | `--ws-warning` #B88E15 | 5.88:1 | 4.5:1 | ✓ |
| danger: texto | `--ws-danger-ink` #C43228 | `--ws-surface-1` #FFFFFF | 5.48:1 | 4.5:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #C43228 | `--ws-danger-soft` #F9E5E3 | 4.52:1 | 4.5:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #D63F34 | `--ws-surface-1` #FFFFFF | 4.55:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #FFFFFF | `--ws-danger` #D63F34 | 4.55:1 | 4.5:1 | ✓ |
| info: texto | `--ws-info-ink` #2769C5 | `--ws-surface-1` #FFFFFF | 5.37:1 | 4.5:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #2769C5 | `--ws-info-soft` #E4EDF9 | 4.54:1 | 4.5:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #3075D6 | `--ws-surface-1` #FFFFFF | 4.52:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #FFFFFF | `--ws-info` #3075D6 | 4.52:1 | 4.5:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #8E610B | `--ws-surface-1` #FFFFFF | 5.43:1 | 4.5:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #8E610B | `--ws-ai-spark-soft` #FBF1DE | 4.85:1 | 4.5:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #C78810 | `--ws-surface-1` #FFFFFF | 3.02:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #17171C | `--ws-ai-spark` #C78810 | 5.92:1 | 4.5:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #2769C5 | `--ws-surface-1` #FFFFFF | 5.37:1 | 4.5:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #2769C5 | `--ws-msg-argument-soft` #E4EDF9 | 4.54:1 | 4.5:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #3075D6 | `--ws-surface-1` #FFFFFF | 4.52:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #FFFFFF | `--ws-msg-argument` #3075D6 | 4.52:1 | 4.5:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #A2560A | `--ws-surface-1` #FFFFFF | 5.42:1 | 4.5:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #A2560A | `--ws-msg-divergence-soft` #FDEFE1 | 4.81:1 | 4.5:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #E3780E | `--ws-surface-1` #FFFFFF | 3.02:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #17171C | `--ws-msg-divergence` #E3780E | 5.92:1 | 4.5:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #C43228 | `--ws-surface-1` #FFFFFF | 5.48:1 | 4.5:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #C43228 | `--ws-msg-risk-soft` #F9E5E3 | 4.52:1 | 4.5:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #D63F34 | `--ws-surface-1` #FFFFFF | 4.55:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #FFFFFF | `--ws-msg-risk` #D63F34 | 4.55:1 | 4.5:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #2B7844 | `--ws-surface-1` #FFFFFF | 5.42:1 | 4.5:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #2B7844 | `--ws-msg-consensus-soft` #E4F2E8 | 4.69:1 | 4.5:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #3BA55D | `--ws-surface-1` #FFFFFF | 3.12:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #17171C | `--ws-msg-consensus` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| msg-question: texto | `--ws-msg-question-ink` #7B4FC6 | `--ws-surface-1` #FFFFFF | 5.56:1 | 4.5:1 | ✓ |
| msg-question: texto na etiqueta | `--ws-msg-question-ink` #7B4FC6 | `--ws-msg-question-soft` #EDE6F7 | 4.57:1 | 4.5:1 | ✓ |
| msg-question: glifo/borda (≥ 3:1) | `--ws-msg-question` #7B4FC6 | `--ws-surface-1` #FFFFFF | 5.56:1 | 3:1 | ✓ |
| msg-question: texto sobre a cor cheia | `--ws-on-msg-question` #FFFFFF | `--ws-msg-question` #7B4FC6 | 5.56:1 | 4.5:1 | ✓ |
| foco sobre surface-0 (≥ 3:1) | `--ws-focus` #B35612 | `--ws-surface-0` #F6F0E1 | 4.34:1 | 3:1 | ✓ |
| foco sobre surface-1 (≥ 3:1) | `--ws-focus` #B35612 | `--ws-surface-1` #FFFFFF | 4.93:1 | 3:1 | ✓ |
| borda forte (≥ 3:1) | `--ws-border-strong` #17171C | `--ws-surface-1` #FFFFFF | 17.86:1 | 3:1 | ✓ |

#### Escuro (`data-theme="escuro"`) — 90 pares, mínimo 3.08:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-0` #121216 | 15.87:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-1` #1B1B21 | 14.56:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-2` #24242B | 13.09:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-3` #2E2E36 | 11.43:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-container` #1B1B21 | 14.56:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #B9B2A3 | `--ws-surface-0` #121216 | 8.86:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #B9B2A3 | `--ws-surface-1` #1B1B21 | 8.13:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #B9B2A3 | `--ws-surface-2` #24242B | 7.31:1 | 4.5:1 | ✓ |
| texto terciário / placeholder | `--ws-text-faint` #A39C8E | `--ws-surface-1` #1B1B21 | 6.29:1 | 4.5:1 | ✓ |
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F4ECD8 | `--ws-ink` #17171C | 15.17:1 | 4.5:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28C28 | `--ws-ink` #17171C | 7.28:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #B35612 | `--ws-cream` #F4ECD8 | 4.19:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #17171C | `--ws-cream` #F4ECD8 | 15.17:1 | 4.5:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #F28C28 | `--ws-surface-1` #1B1B21 | 6.98:1 | 4.5:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #F28C28 | `--ws-accent-soft` #4F3623 | 4.54:1 | 4.5:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #F28C28 | `--ws-surface-1` #1B1B21 | 6.98:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #17171C | `--ws-accent` #F28C28 | 7.28:1 | 4.5:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #DF7A71 | `--ws-surface-1` #1B1B21 | 5.84:1 | 4.5:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #DF7A71 | `--ws-node-red-soft` #482527 | 4.56:1 | 4.5:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #DF7A71 | `--ws-surface-2` #24242B | 5.26:1 | 4.5:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #D6574C | `--ws-surface-1` #1B1B21 | 4.35:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #17171C | `--ws-node-red` #D6574C | 4.53:1 | 4.5:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #E8B931 | `--ws-surface-1` #1B1B21 | 9.32:1 | 4.5:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #E8B931 | `--ws-node-yellow-soft` #4C4125 | 5.46:1 | 4.5:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #E8B931 | `--ws-surface-2` #24242B | 8.38:1 | 4.5:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #E8B931 | `--ws-surface-1` #1B1B21 | 9.32:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #17171C | `--ws-node-yellow` #E8B931 | 9.71:1 | 4.5:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #40B465 | `--ws-surface-1` #1B1B21 | 6.48:1 | 4.5:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #40B465 | `--ws-node-green-soft` #233C2F | 4.51:1 | 4.5:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #40B465 | `--ws-surface-2` #24242B | 5.82:1 | 4.5:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #3BA55D | `--ws-surface-1` #1B1B21 | 5.49:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #17171C | `--ws-node-green` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #6E9BDF | `--ws-surface-1` #1B1B21 | 6.05:1 | 4.5:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #6E9BDF | `--ws-node-blue-soft` #23324C | 4.54:1 | 4.5:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #6E9BDF | `--ws-surface-2` #24242B | 5.44:1 | 4.5:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #4680D6 | `--ws-surface-1` #1B1B21 | 4.34:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #17171C | `--ws-node-blue` #4680D6 | 4.52:1 | 4.5:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #C68646 | `--ws-surface-1` #1B1B21 | 5.63:1 | 4.5:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #C68646 | `--ws-node-brown-soft` #362A23 | 4.56:1 | 4.5:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #C68646 | `--ws-surface-2` #24242B | 5.06:1 | 4.5:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #8F5D2C | `--ws-surface-1` #1B1B21 | 3.08:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #FFFFFF | `--ws-node-brown` #8F5D2C | 5.57:1 | 4.5:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #F28C28 | `--ws-surface-1` #1B1B21 | 6.98:1 | 4.5:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #F28C28 | `--ws-node-orange-soft` #4F3623 | 4.54:1 | 4.5:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #F28C28 | `--ws-surface-2` #24242B | 6.28:1 | 4.5:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #F28C28 | `--ws-surface-1` #1B1B21 | 6.98:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #17171C | `--ws-node-orange` #F28C28 | 7.28:1 | 4.5:1 | ✓ |
| success: texto | `--ws-success-ink` #40B465 | `--ws-surface-1` #1B1B21 | 6.48:1 | 4.5:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #40B465 | `--ws-success-soft` #233C2F | 4.51:1 | 4.5:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #3BA55D | `--ws-surface-1` #1B1B21 | 5.49:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #17171C | `--ws-success` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| warning: texto | `--ws-warning-ink` #E8B931 | `--ws-surface-1` #1B1B21 | 9.32:1 | 4.5:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #E8B931 | `--ws-warning-soft` #4C4125 | 5.46:1 | 4.5:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #E8B931 | `--ws-surface-1` #1B1B21 | 9.32:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #17171C | `--ws-warning` #E8B931 | 9.71:1 | 4.5:1 | ✓ |
| danger: texto | `--ws-danger-ink` #DF7A71 | `--ws-surface-1` #1B1B21 | 5.84:1 | 4.5:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #DF7A71 | `--ws-danger-soft` #482527 | 4.56:1 | 4.5:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #D6574C | `--ws-surface-1` #1B1B21 | 4.35:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #17171C | `--ws-danger` #D6574C | 4.53:1 | 4.5:1 | ✓ |
| info: texto | `--ws-info-ink` #6E9BDF | `--ws-surface-1` #1B1B21 | 6.05:1 | 4.5:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #6E9BDF | `--ws-info-soft` #23324C | 4.54:1 | 4.5:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #4680D6 | `--ws-surface-1` #1B1B21 | 4.34:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #17171C | `--ws-info` #4680D6 | 4.52:1 | 4.5:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #E39B12 | `--ws-surface-1` #1B1B21 | 7.32:1 | 4.5:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #E39B12 | `--ws-ai-spark-soft` #4B3A1D | 4.66:1 | 4.5:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #E39B12 | `--ws-surface-1` #1B1B21 | 7.32:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #17171C | `--ws-ai-spark` #E39B12 | 7.62:1 | 4.5:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #6E9BDF | `--ws-surface-1` #1B1B21 | 6.05:1 | 4.5:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #6E9BDF | `--ws-msg-argument-soft` #23324C | 4.54:1 | 4.5:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #4680D6 | `--ws-surface-1` #1B1B21 | 4.34:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #17171C | `--ws-msg-argument` #4680D6 | 4.52:1 | 4.5:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #F28C28 | `--ws-surface-1` #1B1B21 | 6.98:1 | 4.5:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #F28C28 | `--ws-msg-divergence-soft` #4F3623 | 4.54:1 | 4.5:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #F28C28 | `--ws-surface-1` #1B1B21 | 6.98:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #17171C | `--ws-msg-divergence` #F28C28 | 7.28:1 | 4.5:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #DF7A71 | `--ws-surface-1` #1B1B21 | 5.84:1 | 4.5:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #DF7A71 | `--ws-msg-risk-soft` #482527 | 4.56:1 | 4.5:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #D6574C | `--ws-surface-1` #1B1B21 | 4.35:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #17171C | `--ws-msg-risk` #D6574C | 4.53:1 | 4.5:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #40B465 | `--ws-surface-1` #1B1B21 | 6.48:1 | 4.5:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #40B465 | `--ws-msg-consensus-soft` #233C2F | 4.51:1 | 4.5:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #3BA55D | `--ws-surface-1` #1B1B21 | 5.49:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #17171C | `--ws-msg-consensus` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| msg-question: texto | `--ws-msg-question-ink` #A385D7 | `--ws-surface-1` #1B1B21 | 5.63:1 | 4.5:1 | ✓ |
| msg-question: texto na etiqueta | `--ws-msg-question-ink` #A385D7 | `--ws-msg-question-soft` #322749 | 4.53:1 | 4.5:1 | ✓ |
| msg-question: glifo/borda (≥ 3:1) | `--ws-msg-question` #7B4FC6 | `--ws-surface-1` #1B1B21 | 3.08:1 | 3:1 | ✓ |
| msg-question: texto sobre a cor cheia | `--ws-on-msg-question` #FFFFFF | `--ws-msg-question` #7B4FC6 | 5.56:1 | 4.5:1 | ✓ |
| foco sobre surface-0 (≥ 3:1) | `--ws-focus` #F6A24A | `--ws-surface-0` #121216 | 9.06:1 | 3:1 | ✓ |
| foco sobre surface-1 (≥ 3:1) | `--ws-focus` #F6A24A | `--ws-surface-1` #1B1B21 | 8.31:1 | 3:1 | ✓ |
| borda forte (≥ 3:1) | `--ws-border-strong` #CFC6B0 | `--ws-surface-1` #1B1B21 | 10.09:1 | 3:1 | ✓ |

#### Alto contraste (`data-theme="contraste"`) — 90 pares, mínimo 4.19:1

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
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F4ECD8 | `--ws-ink` #17171C | 15.17:1 | 7:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28C28 | `--ws-ink` #17171C | 7.28:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #B35612 | `--ws-cream` #F4ECD8 | 4.19:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #17171C | `--ws-cream` #F4ECD8 | 15.17:1 | 7:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #FFB15C | `--ws-surface-1` #000000 | 11.70:1 | 7:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #FFB15C | `--ws-accent-soft` #000000 | 11.70:1 | 7:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #FFB15C | `--ws-surface-1` #000000 | 11.70:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #17171C | `--ws-accent` #FFB15C | 9.95:1 | 7:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #E68D86 | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #E68D86 | `--ws-node-red-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #E68D86 | `--ws-surface-2` #0F0F0F | 7.78:1 | 7:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #E68D86 | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #000000 | `--ws-node-red` #E68D86 | 8.52:1 | 7:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #E8B931 | `--ws-surface-1` #000000 | 11.42:1 | 7:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #E8B931 | `--ws-node-yellow-soft` #000000 | 11.42:1 | 7:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #E8B931 | `--ws-surface-2` #0F0F0F | 10.42:1 | 7:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #E8B931 | `--ws-surface-1` #000000 | 11.42:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #000000 | `--ws-node-yellow` #E8B931 | 11.42:1 | 7:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #42BA69 | `--ws-surface-1` #000000 | 8.46:1 | 7:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #42BA69 | `--ws-node-green-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #42BA69 | `--ws-surface-2` #0F0F0F | 7.72:1 | 7:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #42BA69 | `--ws-surface-1` #000000 | 8.46:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #000000 | `--ws-node-green` #42BA69 | 8.46:1 | 7:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #7DA7E4 | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #7DA7E4 | `--ws-node-blue-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #7DA7E4 | `--ws-surface-2` #0F0F0F | 7.78:1 | 7:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #7DA7E4 | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #000000 | `--ws-node-blue` #7DA7E4 | 8.52:1 | 7:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #D09A66 | `--ws-surface-1` #000000 | 8.50:1 | 7:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #D09A66 | `--ws-node-brown-soft` #000000 | 8.50:1 | 7:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #D09A66 | `--ws-surface-2` #0F0F0F | 7.76:1 | 7:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #D09A66 | `--ws-surface-1` #000000 | 8.50:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #000000 | `--ws-node-brown` #D09A66 | 8.50:1 | 7:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #F28C28 | `--ws-surface-1` #000000 | 8.56:1 | 7:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #F28C28 | `--ws-node-orange-soft` #000000 | 8.56:1 | 7:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #F28C28 | `--ws-surface-2` #0F0F0F | 7.81:1 | 7:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #F28C28 | `--ws-surface-1` #000000 | 8.56:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #000000 | `--ws-node-orange` #F28C28 | 8.56:1 | 7:1 | ✓ |
| success: texto | `--ws-success-ink` #42BA69 | `--ws-surface-1` #000000 | 8.46:1 | 7:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #42BA69 | `--ws-success-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #42BA69 | `--ws-surface-1` #000000 | 8.46:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #000000 | `--ws-success` #42BA69 | 8.46:1 | 7:1 | ✓ |
| warning: texto | `--ws-warning-ink` #E8B931 | `--ws-surface-1` #000000 | 11.42:1 | 7:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #E8B931 | `--ws-warning-soft` #000000 | 11.42:1 | 7:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #E8B931 | `--ws-surface-1` #000000 | 11.42:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #000000 | `--ws-warning` #E8B931 | 11.42:1 | 7:1 | ✓ |
| danger: texto | `--ws-danger-ink` #E68D86 | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #E68D86 | `--ws-danger-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #E68D86 | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #000000 | `--ws-danger` #E68D86 | 8.52:1 | 7:1 | ✓ |
| info: texto | `--ws-info-ink` #7DA7E4 | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #7DA7E4 | `--ws-info-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #7DA7E4 | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #000000 | `--ws-info` #7DA7E4 | 8.52:1 | 7:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #E39B12 | `--ws-surface-1` #000000 | 8.96:1 | 7:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #E39B12 | `--ws-ai-spark-soft` #000000 | 8.96:1 | 7:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #E39B12 | `--ws-surface-1` #000000 | 8.96:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #000000 | `--ws-ai-spark` #E39B12 | 8.96:1 | 7:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #7DA7E4 | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #7DA7E4 | `--ws-msg-argument-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #7DA7E4 | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #000000 | `--ws-msg-argument` #7DA7E4 | 8.52:1 | 7:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #F28C28 | `--ws-surface-1` #000000 | 8.56:1 | 7:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #F28C28 | `--ws-msg-divergence-soft` #000000 | 8.56:1 | 7:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #F28C28 | `--ws-surface-1` #000000 | 8.56:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #000000 | `--ws-msg-divergence` #F28C28 | 8.56:1 | 7:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #E68D86 | `--ws-surface-1` #000000 | 8.52:1 | 7:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #E68D86 | `--ws-msg-risk-soft` #000000 | 8.52:1 | 7:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #E68D86 | `--ws-surface-1` #000000 | 8.52:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #000000 | `--ws-msg-risk` #E68D86 | 8.52:1 | 7:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #42BA69 | `--ws-surface-1` #000000 | 8.46:1 | 7:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #42BA69 | `--ws-msg-consensus-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #42BA69 | `--ws-surface-1` #000000 | 8.46:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #000000 | `--ws-msg-consensus` #42BA69 | 8.46:1 | 7:1 | ✓ |
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
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-0` #17171C | 15.17:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-1` #1C1C22 | 14.40:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-2` #23232A | 13.26:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-surface-3` #2B2B33 | 11.92:1 | 4.5:1 | ✓ |
| texto principal | `--ws-text` #F4ECD8 | `--ws-container` #1C1C22 | 14.40:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #CDBD9C | `--ws-surface-0` #17171C | 9.66:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #CDBD9C | `--ws-surface-1` #1C1C22 | 9.17:1 | 4.5:1 | ✓ |
| texto secundário | `--ws-text-muted` #CDBD9C | `--ws-surface-2` #23232A | 8.44:1 | 4.5:1 | ✓ |
| texto terciário / placeholder | `--ws-text-faint` #B5A685 | `--ws-surface-1` #1C1C22 | 7.07:1 | 4.5:1 | ✓ |
| marca: prompt `>_` creme sobre o monitor | `--ws-cream` #F4ECD8 | `--ws-ink` #17171C | 15.17:1 | 4.5:1 | ✓ |
| marca: malha laranja sobre o monitor (glifo ≥ 3:1) | `--ws-orange-500` #F28C28 | `--ws-ink` #17171C | 7.28:1 | 3:1 | ✓ |
| marca: laranja-queimado sobre creme (glifo ≥ 3:1 — único laranja permitido sobre o disco) | `--ws-orange-700` #B35612 | `--ws-cream` #F4ECD8 | 4.19:1 | 3:1 | ✓ |
| marca: ink sobre creme (disco com `>_` invertido) | `--ws-ink` #17171C | `--ws-cream` #F4ECD8 | 15.17:1 | 4.5:1 | ✓ |
| acento: texto/link sobre surface-1 | `--ws-accent-ink` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 4.5:1 | ✓ |
| acento: texto na etiqueta | `--ws-accent-ink` #F28C28 | `--ws-accent-soft` #4B3523 | 4.67:1 | 4.5:1 | ✓ |
| acento: glifo/borda (≥ 3:1) | `--ws-accent` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 3:1 | ✓ |
| acento: texto sobre o botão cheio | `--ws-on-accent` #17171C | `--ws-accent` #F28C28 | 7.28:1 | 4.5:1 | ✓ |
| nó red: texto | `--ws-node-red-ink` #DE786F | `--ws-surface-1` #1C1C22 | 5.67:1 | 4.5:1 | ✓ |
| nó red: texto na etiqueta | `--ws-node-red-ink` #DE786F | `--ws-node-red-soft` #452527 | 4.54:1 | 4.5:1 | ✓ |
| nó red: texto (surface-2) | `--ws-node-red-ink` #DE786F | `--ws-surface-2` #23232A | 5.22:1 | 4.5:1 | ✓ |
| nó red: glifo/nó (≥ 3:1) | `--ws-node-red` #D6574C | `--ws-surface-1` #1C1C22 | 4.30:1 | 3:1 | ✓ |
| nó red: texto sobre o nó cheio | `--ws-on-node-red` #17171C | `--ws-node-red` #D6574C | 4.53:1 | 4.5:1 | ✓ |
| nó yellow: texto | `--ws-node-yellow-ink` #E8B931 | `--ws-surface-1` #1C1C22 | 9.22:1 | 4.5:1 | ✓ |
| nó yellow: texto na etiqueta | `--ws-node-yellow-ink` #E8B931 | `--ws-node-yellow-soft` #493F25 | 5.65:1 | 4.5:1 | ✓ |
| nó yellow: texto (surface-2) | `--ws-node-yellow-ink` #E8B931 | `--ws-surface-2` #23232A | 8.49:1 | 4.5:1 | ✓ |
| nó yellow: glifo/nó (≥ 3:1) | `--ws-node-yellow` #E8B931 | `--ws-surface-1` #1C1C22 | 9.22:1 | 3:1 | ✓ |
| nó yellow: texto sobre o nó cheio | `--ws-on-node-yellow` #17171C | `--ws-node-yellow` #E8B931 | 9.71:1 | 4.5:1 | ✓ |
| nó green: texto | `--ws-node-green-ink` #40B264 | `--ws-surface-1` #1C1C22 | 6.27:1 | 4.5:1 | ✓ |
| nó green: texto na etiqueta | `--ws-node-green-ink` #40B264 | `--ws-node-green-soft` #233A2F | 4.52:1 | 4.5:1 | ✓ |
| nó green: texto (surface-2) | `--ws-node-green-ink` #40B264 | `--ws-surface-2` #23232A | 5.78:1 | 4.5:1 | ✓ |
| nó green: glifo/nó (≥ 3:1) | `--ws-node-green` #3BA55D | `--ws-surface-1` #1C1C22 | 5.43:1 | 3:1 | ✓ |
| nó green: texto sobre o nó cheio | `--ws-on-node-green` #17171C | `--ws-node-green` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| nó blue: texto | `--ws-node-blue-ink` #6C9ADE | `--ws-surface-1` #1C1C22 | 5.91:1 | 4.5:1 | ✓ |
| nó blue: texto na etiqueta | `--ws-node-blue-ink` #6C9ADE | `--ws-node-blue-soft` #23314A | 4.54:1 | 4.5:1 | ✓ |
| nó blue: texto (surface-2) | `--ws-node-blue-ink` #6C9ADE | `--ws-surface-2` #23232A | 5.44:1 | 4.5:1 | ✓ |
| nó blue: glifo/nó (≥ 3:1) | `--ws-node-blue` #4680D6 | `--ws-surface-1` #1C1C22 | 4.29:1 | 3:1 | ✓ |
| nó blue: texto sobre o nó cheio | `--ws-on-node-blue` #17171C | `--ws-node-blue` #4680D6 | 4.52:1 | 4.5:1 | ✓ |
| nó brown: texto | `--ws-node-brown-ink` #C68444 | `--ws-surface-1` #1C1C22 | 5.48:1 | 4.5:1 | ✓ |
| nó brown: texto na etiqueta | `--ws-node-brown-ink` #C68444 | `--ws-node-brown-soft` #342A24 | 4.52:1 | 4.5:1 | ✓ |
| nó brown: texto (surface-2) | `--ws-node-brown-ink` #C68444 | `--ws-surface-2` #23232A | 5.04:1 | 4.5:1 | ✓ |
| nó brown: glifo/nó (≥ 3:1) | `--ws-node-brown` #8F5D2C | `--ws-surface-1` #1C1C22 | 3.04:1 | 3:1 | ✓ |
| nó brown: texto sobre o nó cheio | `--ws-on-node-brown` #FFFFFF | `--ws-node-brown` #8F5D2C | 5.57:1 | 4.5:1 | ✓ |
| nó orange: texto | `--ws-node-orange-ink` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 4.5:1 | ✓ |
| nó orange: texto na etiqueta | `--ws-node-orange-ink` #F28C28 | `--ws-node-orange-soft` #4B3523 | 4.67:1 | 4.5:1 | ✓ |
| nó orange: texto (surface-2) | `--ws-node-orange-ink` #F28C28 | `--ws-surface-2` #23232A | 6.36:1 | 4.5:1 | ✓ |
| nó orange: glifo/nó (≥ 3:1) | `--ws-node-orange` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 3:1 | ✓ |
| nó orange: texto sobre o nó cheio | `--ws-on-node-orange` #17171C | `--ws-node-orange` #F28C28 | 7.28:1 | 4.5:1 | ✓ |
| success: texto | `--ws-success-ink` #40B264 | `--ws-surface-1` #1C1C22 | 6.27:1 | 4.5:1 | ✓ |
| success: texto na etiqueta | `--ws-success-ink` #40B264 | `--ws-success-soft` #233A2F | 4.52:1 | 4.5:1 | ✓ |
| success: glifo/borda (≥ 3:1) | `--ws-success` #3BA55D | `--ws-surface-1` #1C1C22 | 5.43:1 | 3:1 | ✓ |
| success: texto sobre a cor cheia | `--ws-on-success` #17171C | `--ws-success` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| warning: texto | `--ws-warning-ink` #E8B931 | `--ws-surface-1` #1C1C22 | 9.22:1 | 4.5:1 | ✓ |
| warning: texto na etiqueta | `--ws-warning-ink` #E8B931 | `--ws-warning-soft` #493F25 | 5.65:1 | 4.5:1 | ✓ |
| warning: glifo/borda (≥ 3:1) | `--ws-warning` #E8B931 | `--ws-surface-1` #1C1C22 | 9.22:1 | 3:1 | ✓ |
| warning: texto sobre a cor cheia | `--ws-on-warning` #17171C | `--ws-warning` #E8B931 | 9.71:1 | 4.5:1 | ✓ |
| danger: texto | `--ws-danger-ink` #DE786F | `--ws-surface-1` #1C1C22 | 5.67:1 | 4.5:1 | ✓ |
| danger: texto na etiqueta | `--ws-danger-ink` #DE786F | `--ws-danger-soft` #452527 | 4.54:1 | 4.5:1 | ✓ |
| danger: glifo/borda (≥ 3:1) | `--ws-danger` #D6574C | `--ws-surface-1` #1C1C22 | 4.30:1 | 3:1 | ✓ |
| danger: texto sobre a cor cheia | `--ws-on-danger` #17171C | `--ws-danger` #D6574C | 4.53:1 | 4.5:1 | ✓ |
| info: texto | `--ws-info-ink` #6C9ADE | `--ws-surface-1` #1C1C22 | 5.91:1 | 4.5:1 | ✓ |
| info: texto na etiqueta | `--ws-info-ink` #6C9ADE | `--ws-info-soft` #23314A | 4.54:1 | 4.5:1 | ✓ |
| info: glifo/borda (≥ 3:1) | `--ws-info` #4680D6 | `--ws-surface-1` #1C1C22 | 4.29:1 | 3:1 | ✓ |
| info: texto sobre a cor cheia | `--ws-on-info` #17171C | `--ws-info` #4680D6 | 4.52:1 | 4.5:1 | ✓ |
| ai-spark: texto | `--ws-ai-spark-ink` #E39B12 | `--ws-surface-1` #1C1C22 | 7.24:1 | 4.5:1 | ✓ |
| ai-spark: texto na etiqueta | `--ws-ai-spark-ink` #E39B12 | `--ws-ai-spark-soft` #48381E | 4.82:1 | 4.5:1 | ✓ |
| ai-spark: glifo/borda (≥ 3:1) | `--ws-ai-spark` #E39B12 | `--ws-surface-1` #1C1C22 | 7.24:1 | 3:1 | ✓ |
| ai-spark: texto sobre a cor cheia | `--ws-on-ai-spark` #17171C | `--ws-ai-spark` #E39B12 | 7.62:1 | 4.5:1 | ✓ |
| msg-argument: texto | `--ws-msg-argument-ink` #6C9ADE | `--ws-surface-1` #1C1C22 | 5.91:1 | 4.5:1 | ✓ |
| msg-argument: texto na etiqueta | `--ws-msg-argument-ink` #6C9ADE | `--ws-msg-argument-soft` #23314A | 4.54:1 | 4.5:1 | ✓ |
| msg-argument: glifo/borda (≥ 3:1) | `--ws-msg-argument` #4680D6 | `--ws-surface-1` #1C1C22 | 4.29:1 | 3:1 | ✓ |
| msg-argument: texto sobre a cor cheia | `--ws-on-msg-argument` #17171C | `--ws-msg-argument` #4680D6 | 4.52:1 | 4.5:1 | ✓ |
| msg-divergence: texto | `--ws-msg-divergence-ink` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 4.5:1 | ✓ |
| msg-divergence: texto na etiqueta | `--ws-msg-divergence-ink` #F28C28 | `--ws-msg-divergence-soft` #4B3523 | 4.67:1 | 4.5:1 | ✓ |
| msg-divergence: glifo/borda (≥ 3:1) | `--ws-msg-divergence` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 3:1 | ✓ |
| msg-divergence: texto sobre a cor cheia | `--ws-on-msg-divergence` #17171C | `--ws-msg-divergence` #F28C28 | 7.28:1 | 4.5:1 | ✓ |
| msg-risk: texto | `--ws-msg-risk-ink` #DE786F | `--ws-surface-1` #1C1C22 | 5.67:1 | 4.5:1 | ✓ |
| msg-risk: texto na etiqueta | `--ws-msg-risk-ink` #DE786F | `--ws-msg-risk-soft` #452527 | 4.54:1 | 4.5:1 | ✓ |
| msg-risk: glifo/borda (≥ 3:1) | `--ws-msg-risk` #D6574C | `--ws-surface-1` #1C1C22 | 4.30:1 | 3:1 | ✓ |
| msg-risk: texto sobre a cor cheia | `--ws-on-msg-risk` #17171C | `--ws-msg-risk` #D6574C | 4.53:1 | 4.5:1 | ✓ |
| msg-consensus: texto | `--ws-msg-consensus-ink` #40B264 | `--ws-surface-1` #1C1C22 | 6.27:1 | 4.5:1 | ✓ |
| msg-consensus: texto na etiqueta | `--ws-msg-consensus-ink` #40B264 | `--ws-msg-consensus-soft` #233A2F | 4.52:1 | 4.5:1 | ✓ |
| msg-consensus: glifo/borda (≥ 3:1) | `--ws-msg-consensus` #3BA55D | `--ws-surface-1` #1C1C22 | 5.43:1 | 3:1 | ✓ |
| msg-consensus: texto sobre a cor cheia | `--ws-on-msg-consensus` #17171C | `--ws-msg-consensus` #3BA55D | 5.72:1 | 4.5:1 | ✓ |
| msg-question: texto | `--ws-msg-question-ink` #A385D7 | `--ws-surface-1` #1C1C22 | 5.57:1 | 4.5:1 | ✓ |
| msg-question: texto na etiqueta | `--ws-msg-question-ink` #A385D7 | `--ws-msg-question-soft` #312746 | 4.57:1 | 4.5:1 | ✓ |
| msg-question: glifo/borda (≥ 3:1) | `--ws-msg-question` #7B4FC6 | `--ws-surface-1` #1C1C22 | 3.05:1 | 3:1 | ✓ |
| msg-question: texto sobre a cor cheia | `--ws-on-msg-question` #FFFFFF | `--ws-msg-question` #7B4FC6 | 5.56:1 | 4.5:1 | ✓ |
| foco sobre surface-0 (≥ 3:1) | `--ws-focus` #F28C28 | `--ws-surface-0` #17171C | 7.28:1 | 3:1 | ✓ |
| foco sobre surface-1 (≥ 3:1) | `--ws-focus` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 3:1 | ✓ |
| borda forte (≥ 3:1) | `--ws-border-strong` #F28C28 | `--ws-surface-1` #1C1C22 | 6.91:1 | 3:1 | ✓ |

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
