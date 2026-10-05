# Design system Work Station / DECIA — v1 (RF38)

> Conceito visual (card "Identidade visual e estética" do board): **"a repartição do futuro"** — a papelaria da repartição pública (carimbo, protocolo, pasta suspensa, clipe, lacre) reinterpretada em flat/duotone; a IA é sempre a **faísca âmbar ✦**. Tudo que a IA gerou carrega a faísca (transparência = objetivo do projeto).
> Fonte de verdade dos tokens: [`anatomias/lib/tokens.mjs`](anatomias/lib/tokens.mjs) → gera [`tokens.css`](tokens.css), a tabela de contraste abaixo, os `<style>` dos SVGs e a galeria [`anatomias/index.html`](anatomias/index.html). Regra: **nenhuma tela usa HTML/CSS solto**; todo elemento visual é um componente de `packages/ui` com estes tokens. Anatomia dos cards em [`ANATOMIA_CARDS.md`](ANATOMIA_CARDS.md).

> **v2 (`--ws-*`, paleta do logo):** tokens em [`TOKENS.md`](TOKENS.md) / [`tokens-ws.css`](tokens-ws.css) (gerados por `anatomias/lib/tokens-ws.mjs`, 4 temas: claro · escuro · contraste · terminal, com mapa de migração), ícones WS Glyphs em [`GLYPHS.md`](GLYPHS.md) / `glyphs/`, artes de fundo em `backgrounds/`. Este documento descreve a v1; os tokens sem prefixo continuam válidos até a migração da etapa (b).

## 1. Como usar
```
docs/design-system/
├── tokens.css              ← gerado; copiar para packages/ui/src/styles/tokens.css
├── components.css          ← referência CSS dos componentes (ws-*), base dos componentes React
├── anatomias/gerar.mjs     ← `node docs/design-system/anatomias/gerar.mjs` regenera tudo e falha se algum par de contraste reprovar
├── anatomias/lib/          ← tokens.mjs · cor.mjs (WCAG) · icons.mjs (66 glifos) · svg.mjs (primitivas) · cards.mjs (28 variações) · galeria.mjs
├── anatomias/icones/*.svg  ← ícones próprios, 24 px, traço 1,8, currentColor
├── anatomias/svg/*.svg     ← 112 pranchas de anatomia (28 variações × 4 temas)
├── anatomias/index.html    ← galeria estática: tokens, tipografia, ícones, componentes, anatomias; seletor de tema e densidade
└── anatomias/capturas/*.png← capturas da galeria nos 4 temas (Chromium headless)
```
Temas: `<html data-theme="claro|escuro|contraste|blueprint">`; sem `data-theme` (ou `auto`) segue `prefers-color-scheme`. Preferências do usuário (RF3, `UserPreferences`): `data-density="compacta"`, `data-reduce-motion="true"`, `--font-scale`. O valor gravado em `user_preferences.theme` é o mesmo nome do `data-theme` (`ThemeMode` CLARO·ESCURO·ALTO_CONTRASTE·BLUEPRINT·AUTO).

## 2. Tokens

### 2.1 Neutros e superfícies (por tema)
`--ground` (fundo do app) · `--surface` (card, painel) · `--surface-2` (etiqueta, campo) · `--surface-3` (trilha, borda de mosaico) · `--ink` (texto) · `--muted` (texto secundário) · `--faint` (placeholder) · `--line` (borda forte, ≥ 3:1) · `--line-soft` (divisórias) · `--focus` (anel de foco, ≥ 3:1) · `--scrim` (fundo de modal).

| Tema | ground | surface | ink | focus | Caráter |
|---|---|---|---|---|---|
| claro | #F3F1EA | #FFFFFF | #1B1F26 | #1B4F8A | papel timbrado, azul-protocolo |
| escuro | #121417 | #1C1F24 | #ECEAE4 | #8DBFF2 | repartição à noite |
| contraste | #000000 | #000000 | #FFFFFF | #FFFF00 | preto/branco, foco amarelo, sem sombras, texto ≥ 7:1 |
| blueprint | #0A2748 | #0F3260 | #EAF2FF | #FFD166 | papel azul-engenharia com grade, traço claro (obras) |

### 2.2 Marca
- **Primária institucional** `--primary` / `--primary-strong` / `--primary-soft` / `--on-primary` / `--primary-ink` + **gradiente** `--primary-gradient` (135°, azul-protocolo #123A66 → #1B4F8A → #2F7BC4). Nome em texto `--primary-nome: "azul-protocolo"`.
- **Secundária** `--secondary*` verde-araucária (#1F7A4B).
- **Faísca ✦ da IA** `--spark` (#E39B12 âmbar) / `--spark-ink` / `--spark-soft` / `--spark-glow` / `--on-spark`. Usada em: ícone TEXTO_IA, etiqueta "gerado por IA", botão `.ws-btn--spark`, ficha DP, animação de geração.

### 2.3 Famílias semânticas (cada uma com `fill`, `-ink`, `-soft`, `-nome`, `on-`)
| Família | Tokens | Valores (tema claro) |
|---|---|---|
| Classificação de mensagem (RF7, RF38.CA07) | `--class-argumento` azul #2F7BC4 · `--class-divergencia` laranja #E8761E · `--class-risco` vermelho #D1343A · `--class-consenso` verde #2E9D5B · `--class-pergunta` roxo #7B4FC6 · `--class-ruido` cinza | nós do fio de decisão, etiquetas de mensagem, bordas de anexo |
| Tipo de tarefa (RF38.CA01, tabela do board) | `--type-texto-manual` grafite · `--type-texto-ia` âmbar · `--type-imagem-web` azul · `--type-imagem-editada` violeta · `--type-planilha` verde · `--type-documento` ardósia (cor final por extensão) · `--type-pasta` marrom · `--type-link` ciano · `--type-desenho-tecnico` laranja · `--type-formulario` teal · `--type-ata-registro` vermelho institucional · `--type-email` azul-ardósia · `--type-protocolo` oliva · `--type-cronograma` índigo · `--type-estudo-tecnico-preliminar` ameixa | ícone do tipo, chip, monograma, borda do thumbnail |
| Extensão de DOCUMENTO | `--ext-docx` azul · `--ext-pdf` vermelho · `--ext-xlsx` verde · `--ext-pptx` laranja · `--ext-md` cinza | selo da extensão no thumbnail |
| Prazo (RF38.CA05) | `--due-soon` âmbar (≤ 3 dias) · `--due-over` vermelho (vencido) | etiqueta de prazo, ⚖ prazo legal |
| Departamento (RF38.CA09) | `--dept-gralha-azul` · `--dept-araucaria` · `--dept-ipe-roxo` · `--dept-ipe-amarelo` · `--dept-terracota` · `--dept-ardosia` · `--dept-pinhao` · `--dept-cinza-pedra` | borda de tudo que o departamento produz, monograma |
| Estado de tarefa (`TaskState`) | `--state-rascunho` … `--state-oferecida` (+ `-ink`, `-soft`, `-nome`) | etiqueta de protocolo (ver §3 Tag) |
| Status de projeto (`ProjectStatus`) | `--status-rascunho` … `--status-devolvido` | idem |
| Lacres (chancela, RF38.CA06) | `--seal-gold*` (empresa) · `--seal-navy*` (chefe) · `--seal-ribbon` (Excelência) · `--seal-broken` (recusada/caducada) | componente Seal |

Toda família traz **o nome da cor em texto** (`--*-nome`) para a etiqueta falar a cor (daltonismo, card "Identidade visual" §11).

### 2.4 Tipografia (três papéis, como no FAI)
`--font-editorial` Source Serif 4 (títulos de card/página, número-herói) · `--font-ui` Public Sans (texto) · `--font-data` IBM Plex Mono (etiquetas, nº de protocolo, carimbos, métricas). Escala `--text-display-xl` 2.5rem → `--text-label` 0.6875rem, cada token com `--lh`, `--tracking`, `--font`, `--weight` (lista completa em `tokens.mjs` §3). Números sempre `tabular-nums`.

### 2.5 Espaço, raio, camadas, controles
`--space-1..10` (4→64 px) · `--radius-xs..xl, pill` · `--z-sticky/header/popover/dialog/toast/skip` · `--control-sm/md/lg` (34/40/48), `--control-touch` 44, `--control-header` 56, `--control-sidebar` 264, `--control-sidebar-rail` 72.

### 2.6 Sombras e auras
`--shadow-1..3` (relevo do container; `none` no alto contraste) · `--shadow-aura` (luz de contorno do card em foco/hover, cor primária).

### 2.7 Movimento (RF38.CA10)
`--dur-fast` 80 ms · `--dur` 160 ms · `--dur-slow` 320 ms · `--dur-pulse` 1,8 s (EM_USO / EM_DECISAO) · `--dur-spark` 1,2 s (faísca gerando) · `--ease-out`, `--ease-in-out`, `--ease-snap` (encaixe da tarefa na fase). Tudo desliga com `prefers-reduced-motion` ou `data-reduce-motion`.

### 2.8 Skins da Mesa (RF22, RF38.CA08) e dimensões de card
`--skin-papel` · `--skin-cortica` · `--skin-blueprint` · `--skin-papel-timbrado` (gradientes CSS por tema). Dimensões `--card-*` em [`ANATOMIA_CARDS.md`](ANATOMIA_CARDS.md) §2.

### 2.9 Contraste verificado
<!-- contraste:inicio -->
Pares verificados: **732** · falhas: **0** · limite: 4,5:1 para texto (7:1 no alto contraste), 3:1 para glifos, bordas e foco (WCAG 1.4.3 / 1.4.6 / 1.4.11). Gerado por `anatomias/gerar.mjs` (função `contrastReport` em `lib/tokens.mjs`).

### Claro (`data-theme="claro"`) — 183 pares, mínimo 3.00:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ink` #1B1F26 | `--surface` #FFFFFF | 16.53:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #5A6069 | `--surface` #FFFFFF | 6.34:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #1B1F26 | `--surface-2` #F4F2EC | 14.76:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #5A6069 | `--surface-2` #F4F2EC | 5.66:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #1B1F26 | `--surface-3` #E8E5DB | 13.11:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #5A6069 | `--surface-3` #E8E5DB | 5.03:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #1B1F26 | `--ground` #F3F1EA | 14.62:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #5A6069 | `--ground` #F3F1EA | 5.61:1 | 4.5:1 | ✓ |
| texto terciário (placeholder) | `--faint` #666D76 | `--surface` #FFFFFF | 5.23:1 | 4.5:1 | ✓ |
| texto sobre botão primário | `--on-primary` #FFFFFF | `--primary` #1B4F8A | 8.29:1 | 4.5:1 | ✓ |
| link / texto primário | `--primary-ink` #1B4F8A | `--surface` #FFFFFF | 8.29:1 | 4.5:1 | ✓ |
| texto primário na etiqueta | `--primary-ink` #1B4F8A | `--primary-soft` #E3ECF7 | 6.95:1 | 4.5:1 | ✓ |
| texto sobre botão secundário | `--on-secondary` #FFFFFF | `--secondary` #1F7A4B | 5.32:1 | 4.5:1 | ✓ |
| texto secundário (verde) | `--secondary-ink` #1F7A4B | `--surface` #FFFFFF | 5.32:1 | 4.5:1 | ✓ |
| texto da faísca ("gerado por IA") | `--spark-ink` #93650C | `--surface` #FFFFFF | 5.11:1 | 4.5:1 | ✓ |
| texto da faísca na etiqueta | `--spark-ink` #93650C | `--spark-soft` #FBF1DE | 4.56:1 | 4.5:1 | ✓ |
| glifo ✦ (não-texto ≥ 3:1) | `--spark` #C78810 | `--surface` #FFFFFF | 3.02:1 | 3:1 | ✓ |
| class·argumento texto | `--class-argumento-ink` #2A6DAE | `--surface` #FFFFFF | 5.39:1 | 4.5:1 | ✓ |
| class·argumento texto na etiqueta | `--class-argumento-ink` #2A6DAE | `--class-argumento-soft` #E2EDF7 | 4.54:1 | 4.5:1 | ✓ |
| class·argumento texto (surface-2) | `--class-argumento-ink` #2A6DAE | `--surface-2` #F4F2EC | 4.81:1 | 4.5:1 | ✓ |
| class·argumento glifo/borda (não-texto ≥ 3:1) | `--class-argumento` #2F79C0 | `--surface` #FFFFFF | 4.55:1 | 3:1 | ✓ |
| class·argumento texto sobre a cor cheia | `--on-class-argumento` #FFFFFF | `--class-argumento` #2F79C0 | 4.55:1 | 4.5:1 | ✓ |
| class·divergencia texto | `--class-divergencia-ink` #AB5411 | `--surface` #FFFFFF | 5.24:1 | 4.5:1 | ✓ |
| class·divergencia texto na etiqueta | `--class-divergencia-ink` #AB5411 | `--class-divergencia-soft` #FCECDF | 4.54:1 | 4.5:1 | ✓ |
| class·divergencia texto (surface-2) | `--class-divergencia-ink` #AB5411 | `--surface-2` #F4F2EC | 4.68:1 | 4.5:1 | ✓ |
| class·divergencia glifo/borda (não-texto ≥ 3:1) | `--class-divergencia` #E8751C | `--surface` #FFFFFF | 3.00:1 | 3:1 | ✓ |
| class·divergencia texto sobre a cor cheia | `--on-class-divergencia` #0B0D10 | `--class-divergencia` #E8751C | 6.48:1 | 4.5:1 | ✓ |
| class·risco texto | `--class-risco-ink` #C42C32 | `--surface` #FFFFFF | 5.59:1 | 4.5:1 | ✓ |
| class·risco texto na etiqueta | `--class-risco-ink` #C42C32 | `--class-risco-soft` #F9E3E3 | 4.56:1 | 4.5:1 | ✓ |
| class·risco texto (surface-2) | `--class-risco-ink` #C42C32 | `--surface-2` #F4F2EC | 5.00:1 | 4.5:1 | ✓ |
| class·risco glifo/borda (não-texto ≥ 3:1) | `--class-risco` #D1343A | `--surface` #FFFFFF | 4.93:1 | 3:1 | ✓ |
| class·risco texto sobre a cor cheia | `--on-class-risco` #FFFFFF | `--class-risco` #D1343A | 4.93:1 | 4.5:1 | ✓ |
| class·consenso texto | `--class-consenso-ink` #247A46 | `--surface` #FFFFFF | 5.32:1 | 4.5:1 | ✓ |
| class·consenso texto na etiqueta | `--class-consenso-ink` #247A46 | `--class-consenso-soft` #E2F1E8 | 4.56:1 | 4.5:1 | ✓ |
| class·consenso texto (surface-2) | `--class-consenso-ink` #247A46 | `--surface-2` #F4F2EC | 4.75:1 | 4.5:1 | ✓ |
| class·consenso glifo/borda (não-texto ≥ 3:1) | `--class-consenso` #2E9D5B | `--surface` #FFFFFF | 3.45:1 | 3:1 | ✓ |
| class·consenso texto sobre a cor cheia | `--on-class-consenso` #0B0D10 | `--class-consenso` #2E9D5B | 5.64:1 | 4.5:1 | ✓ |
| class·pergunta texto | `--class-pergunta-ink` #7B4FC6 | `--surface` #FFFFFF | 5.56:1 | 4.5:1 | ✓ |
| class·pergunta texto na etiqueta | `--class-pergunta-ink` #7B4FC6 | `--class-pergunta-soft` #EDE6F7 | 4.57:1 | 4.5:1 | ✓ |
| class·pergunta texto (surface-2) | `--class-pergunta-ink` #7B4FC6 | `--surface-2` #F4F2EC | 4.97:1 | 4.5:1 | ✓ |
| class·pergunta glifo/borda (não-texto ≥ 3:1) | `--class-pergunta` #7B4FC6 | `--surface` #FFFFFF | 5.56:1 | 3:1 | ✓ |
| class·pergunta texto sobre a cor cheia | `--on-class-pergunta` #FFFFFF | `--class-pergunta` #7B4FC6 | 5.56:1 | 4.5:1 | ✓ |
| class·ruido texto | `--class-ruido-ink` #676E76 | `--surface` #FFFFFF | 5.16:1 | 4.5:1 | ✓ |
| class·ruido texto na etiqueta | `--class-ruido-ink` #676E76 | `--class-ruido-soft` #EFF0F1 | 4.52:1 | 4.5:1 | ✓ |
| class·ruido texto (surface-2) | `--class-ruido-ink` #676E76 | `--surface-2` #F4F2EC | 4.61:1 | 4.5:1 | ✓ |
| class·ruido glifo/borda (não-texto ≥ 3:1) | `--class-ruido` #8C939B | `--surface` #FFFFFF | 3.11:1 | 3:1 | ✓ |
| class·ruido texto sobre a cor cheia | `--on-class-ruido` #0B0D10 | `--class-ruido` #8C939B | 6.27:1 | 4.5:1 | ✓ |
| type·texto-manual texto | `--type-texto-manual-ink` #4F5560 | `--surface` #FFFFFF | 7.50:1 | 4.5:1 | ✓ |
| type·texto-manual texto na etiqueta | `--type-texto-manual-ink` #4F5560 | `--type-texto-manual-soft` #E6E7E9 | 6.06:1 | 4.5:1 | ✓ |
| type·texto-manual texto (surface-2) | `--type-texto-manual-ink` #4F5560 | `--surface-2` #F4F2EC | 6.70:1 | 4.5:1 | ✓ |
| type·texto-manual glifo/borda (não-texto ≥ 3:1) | `--type-texto-manual` #4F5560 | `--surface` #FFFFFF | 7.50:1 | 3:1 | ✓ |
| type·texto-ia texto | `--type-texto-ia-ink` #93650C | `--surface` #FFFFFF | 5.11:1 | 4.5:1 | ✓ |
| type·texto-ia texto na etiqueta | `--type-texto-ia-ink` #93650C | `--type-texto-ia-soft` #FBF1DE | 4.56:1 | 4.5:1 | ✓ |
| type·texto-ia texto (surface-2) | `--type-texto-ia-ink` #93650C | `--surface-2` #F4F2EC | 4.57:1 | 4.5:1 | ✓ |
| type·texto-ia glifo/borda (não-texto ≥ 3:1) | `--type-texto-ia` #C78810 | `--surface` #FFFFFF | 3.02:1 | 3:1 | ✓ |
| type·imagem-web texto | `--type-imagem-web-ink` #2A6DAE | `--surface` #FFFFFF | 5.39:1 | 4.5:1 | ✓ |
| type·imagem-web texto na etiqueta | `--type-imagem-web-ink` #2A6DAE | `--type-imagem-web-soft` #E2EDF7 | 4.54:1 | 4.5:1 | ✓ |
| type·imagem-web texto (surface-2) | `--type-imagem-web-ink` #2A6DAE | `--surface-2` #F4F2EC | 4.81:1 | 4.5:1 | ✓ |
| type·imagem-web glifo/borda (não-texto ≥ 3:1) | `--type-imagem-web` #2F79C0 | `--surface` #FFFFFF | 4.55:1 | 3:1 | ✓ |
| type·imagem-editada texto | `--type-imagem-editada-ink` #7E4CD2 | `--surface` #FFFFFF | 5.45:1 | 4.5:1 | ✓ |
| type·imagem-editada texto na etiqueta | `--type-imagem-editada-ink` #7E4CD2 | `--type-imagem-editada-soft` #EFE8F9 | 4.56:1 | 4.5:1 | ✓ |
| type·imagem-editada texto (surface-2) | `--type-imagem-editada-ink` #7E4CD2 | `--surface-2` #F4F2EC | 4.87:1 | 4.5:1 | ✓ |
| type·imagem-editada glifo/borda (não-texto ≥ 3:1) | `--type-imagem-editada` #8A5CD6 | `--surface` #FFFFFF | 4.58:1 | 3:1 | ✓ |
| type·planilha texto | `--type-planilha-ink` #247A46 | `--surface` #FFFFFF | 5.32:1 | 4.5:1 | ✓ |
| type·planilha texto na etiqueta | `--type-planilha-ink` #247A46 | `--type-planilha-soft` #E2F1E8 | 4.56:1 | 4.5:1 | ✓ |
| type·planilha texto (surface-2) | `--type-planilha-ink` #247A46 | `--surface-2` #F4F2EC | 4.75:1 | 4.5:1 | ✓ |
| type·planilha glifo/borda (não-texto ≥ 3:1) | `--type-planilha` #2E9D5B | `--surface` #FFFFFF | 3.45:1 | 3:1 | ✓ |
| type·documento texto | `--type-documento-ink` #636976 | `--surface` #FFFFFF | 5.51:1 | 4.5:1 | ✓ |
| type·documento texto na etiqueta | `--type-documento-ink` #636976 | `--type-documento-soft` #EAEBED | 4.62:1 | 4.5:1 | ✓ |
| type·documento texto (surface-2) | `--type-documento-ink` #636976 | `--surface-2` #F4F2EC | 4.92:1 | 4.5:1 | ✓ |
| type·documento glifo/borda (não-texto ≥ 3:1) | `--type-documento` #6B7280 | `--surface` #FFFFFF | 4.83:1 | 3:1 | ✓ |
| type·pasta texto | `--type-pasta-ink` #8B5E34 | `--surface` #FFFFFF | 5.60:1 | 4.5:1 | ✓ |
| type·pasta texto na etiqueta | `--type-pasta-ink` #8B5E34 | `--type-pasta-soft` #EFE8E3 | 4.62:1 | 4.5:1 | ✓ |
| type·pasta texto (surface-2) | `--type-pasta-ink` #8B5E34 | `--surface-2` #F4F2EC | 5.00:1 | 4.5:1 | ✓ |
| type·pasta glifo/borda (não-texto ≥ 3:1) | `--type-pasta` #8B5E34 | `--surface` #FFFFFF | 5.60:1 | 3:1 | ✓ |
| type·link texto | `--type-link-ink` #0B7587 | `--surface` #FFFFFF | 5.37:1 | 4.5:1 | ✓ |
| type·link texto na etiqueta | `--type-link-ink` #0B7587 | `--type-link-soft` #DDEFF3 | 4.53:1 | 4.5:1 | ✓ |
| type·link texto (surface-2) | `--type-link-ink` #0B7587 | `--surface-2` #F4F2EC | 4.80:1 | 4.5:1 | ✓ |
| type·link glifo/borda (não-texto ≥ 3:1) | `--type-link` #0E8FA6 | `--surface` #FFFFFF | 3.82:1 | 3:1 | ✓ |
| type·desenho-tecnico texto | `--type-desenho-tecnico-ink` #AC5115 | `--surface` #FFFFFF | 5.33:1 | 4.5:1 | ✓ |
| type·desenho-tecnico texto na etiqueta | `--type-desenho-tecnico-ink` #AC5115 | `--type-desenho-tecnico-soft` #FBEADF | 4.55:1 | 4.5:1 | ✓ |
| type·desenho-tecnico texto (surface-2) | `--type-desenho-tecnico-ink` #AC5115 | `--surface-2` #F4F2EC | 4.76:1 | 4.5:1 | ✓ |
| type·desenho-tecnico glifo/borda (não-texto ≥ 3:1) | `--type-desenho-tecnico` #E06A1B | `--surface` #FFFFFF | 3.36:1 | 3:1 | ✓ |
| type·formulario texto | `--type-formulario-ink` #0E756C | `--surface` #FFFFFF | 5.56:1 | 4.5:1 | ✓ |
| type·formulario texto na etiqueta | `--type-formulario-ink` #0E756C | `--type-formulario-soft` #DDEDEC | 4.60:1 | 4.5:1 | ✓ |
| type·formulario texto (surface-2) | `--type-formulario-ink` #0E756C | `--surface-2` #F4F2EC | 4.96:1 | 4.5:1 | ✓ |
| type·formulario glifo/borda (não-texto ≥ 3:1) | `--type-formulario` #0F8077 | `--surface` #FFFFFF | 4.80:1 | 3:1 | ✓ |
| type·ata-registro texto | `--type-ata-registro-ink` #A6192E | `--surface` #FFFFFF | 7.50:1 | 4.5:1 | ✓ |
| type·ata-registro texto na etiqueta | `--type-ata-registro-ink` #A6192E | `--type-ata-registro-soft` #F3DFE2 | 5.88:1 | 4.5:1 | ✓ |
| type·ata-registro texto (surface-2) | `--type-ata-registro-ink` #A6192E | `--surface-2` #F4F2EC | 6.70:1 | 4.5:1 | ✓ |
| type·ata-registro glifo/borda (não-texto ≥ 3:1) | `--type-ata-registro` #A6192E | `--surface` #FFFFFF | 7.50:1 | 3:1 | ✓ |
| type·email texto | `--type-email-ink` #4D6B97 | `--surface` #FFFFFF | 5.43:1 | 4.5:1 | ✓ |
| type·email texto na etiqueta | `--type-email-ink` #4D6B97 | `--type-email-soft` #E6EBF1 | 4.53:1 | 4.5:1 | ✓ |
| type·email texto (surface-2) | `--type-email-ink` #4D6B97 | `--surface-2` #F4F2EC | 4.85:1 | 4.5:1 | ✓ |
| type·email glifo/borda (não-texto ≥ 3:1) | `--type-email` #4F6D9A | `--surface` #FFFFFF | 5.27:1 | 3:1 | ✓ |
| type·protocolo texto | `--type-protocolo-ink` #617028 | `--surface` #FFFFFF | 5.45:1 | 4.5:1 | ✓ |
| type·protocolo texto na etiqueta | `--type-protocolo-ink` #617028 | `--type-protocolo-soft` #EBEDE2 | 4.60:1 | 4.5:1 | ✓ |
| type·protocolo texto (surface-2) | `--type-protocolo-ink` #617028 | `--surface-2` #F4F2EC | 4.86:1 | 4.5:1 | ✓ |
| type·protocolo glifo/borda (não-texto ≥ 3:1) | `--type-protocolo` #6C7D2D | `--surface` #FFFFFF | 4.56:1 | 3:1 | ✓ |
| type·cronograma texto | `--type-cronograma-ink` #3F51B5 | `--surface` #FFFFFF | 6.87:1 | 4.5:1 | ✓ |
| type·cronograma texto na etiqueta | `--type-cronograma-ink` #3F51B5 | `--type-cronograma-soft` #E4E7F5 | 5.58:1 | 4.5:1 | ✓ |
| type·cronograma texto (surface-2) | `--type-cronograma-ink` #3F51B5 | `--surface-2` #F4F2EC | 6.14:1 | 4.5:1 | ✓ |
| type·cronograma glifo/borda (não-texto ≥ 3:1) | `--type-cronograma` #3F51B5 | `--surface` #FFFFFF | 6.87:1 | 3:1 | ✓ |
| type·estudo-tecnico-preliminar texto | `--type-estudo-tecnico-preliminar-ink` #8E3B6B | `--surface` #FFFFFF | 7.03:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar texto na etiqueta | `--type-estudo-tecnico-preliminar-ink` #8E3B6B | `--type-estudo-tecnico-preliminar-soft` #EFE4EA | 5.67:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar texto (surface-2) | `--type-estudo-tecnico-preliminar-ink` #8E3B6B | `--surface-2` #F4F2EC | 6.28:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar glifo/borda (não-texto ≥ 3:1) | `--type-estudo-tecnico-preliminar` #8E3B6B | `--surface` #FFFFFF | 7.03:1 | 3:1 | ✓ |
| ext·docx texto | `--ext-docx-ink` #2B5797 | `--surface` #FFFFFF | 7.21:1 | 4.5:1 | ✓ |
| ext·docx texto na etiqueta | `--ext-docx-ink` #2B5797 | `--ext-docx-soft` #E1E7F0 | 5.80:1 | 4.5:1 | ✓ |
| ext·docx texto (surface-2) | `--ext-docx-ink` #2B5797 | `--surface-2` #F4F2EC | 6.44:1 | 4.5:1 | ✓ |
| ext·docx glifo/borda (não-texto ≥ 3:1) | `--ext-docx` #2B5797 | `--surface` #FFFFFF | 7.21:1 | 3:1 | ✓ |
| ext·pdf texto | `--ext-pdf-ink` #C03329 | `--surface` #FFFFFF | 5.60:1 | 4.5:1 | ✓ |
| ext·pdf texto na etiqueta | `--ext-pdf-ink` #C03329 | `--ext-pdf-soft` #F7E3E1 | 4.55:1 | 4.5:1 | ✓ |
| ext·pdf texto (surface-2) | `--ext-pdf-ink` #C03329 | `--surface-2` #F4F2EC | 5.01:1 | 4.5:1 | ✓ |
| ext·pdf glifo/borda (não-texto ≥ 3:1) | `--ext-pdf` #C8352B | `--surface` #FFFFFF | 5.25:1 | 3:1 | ✓ |
| ext·xlsx texto | `--ext-xlsx-ink` #1D6F42 | `--surface` #FFFFFF | 6.17:1 | 4.5:1 | ✓ |
| ext·xlsx texto na etiqueta | `--ext-xlsx-ink` #1D6F42 | `--ext-xlsx-soft` #DFEBE5 | 5.04:1 | 4.5:1 | ✓ |
| ext·xlsx texto (surface-2) | `--ext-xlsx-ink` #1D6F42 | `--surface-2` #F4F2EC | 5.51:1 | 4.5:1 | ✓ |
| ext·xlsx glifo/borda (não-texto ≥ 3:1) | `--ext-xlsx` #1D6F42 | `--surface` #FFFFFF | 6.17:1 | 3:1 | ✓ |
| ext·pptx texto | `--ext-pptx-ink` #B94019 | `--surface` #FFFFFF | 5.51:1 | 4.5:1 | ✓ |
| ext·pptx texto na etiqueta | `--ext-pptx-ink` #B94019 | `--ext-pptx-soft` #F7E5DF | 4.52:1 | 4.5:1 | ✓ |
| ext·pptx texto (surface-2) | `--ext-pptx-ink` #B94019 | `--surface-2` #F4F2EC | 4.92:1 | 4.5:1 | ✓ |
| ext·pptx glifo/borda (não-texto ≥ 3:1) | `--ext-pptx` #C4441B | `--surface` #FFFFFF | 5.01:1 | 3:1 | ✓ |
| ext·md texto | `--ext-md-ink` #676B72 | `--surface` #FFFFFF | 5.35:1 | 4.5:1 | ✓ |
| ext·md texto na etiqueta | `--ext-md-ink` #676B72 | `--ext-md-soft` #ECEDEE | 4.57:1 | 4.5:1 | ✓ |
| ext·md texto (surface-2) | `--ext-md-ink` #676B72 | `--surface-2` #F4F2EC | 4.78:1 | 4.5:1 | ✓ |
| ext·md glifo/borda (não-texto ≥ 3:1) | `--ext-md` #7A7F87 | `--surface` #FFFFFF | 4.03:1 | 3:1 | ✓ |
| due·soon texto | `--due-soon-ink` #956107 | `--surface` #FFFFFF | 5.26:1 | 4.5:1 | ✓ |
| due·soon texto na etiqueta | `--due-soon-ink` #956107 | `--due-soon-soft` #FAEFDD | 4.62:1 | 4.5:1 | ✓ |
| due·soon texto (surface-2) | `--due-soon-ink` #956107 | `--surface-2` #F4F2EC | 4.70:1 | 4.5:1 | ✓ |
| due·soon glifo/borda (não-texto ≥ 3:1) | `--due-soon` #CA840A | `--surface` #FFFFFF | 3.08:1 | 3:1 | ✓ |
| due·over texto | `--due-over-ink` #C62828 | `--surface` #FFFFFF | 5.62:1 | 4.5:1 | ✓ |
| due·over texto na etiqueta | `--due-over-ink` #C62828 | `--due-over-soft` #F7E1E1 | 4.50:1 | 4.5:1 | ✓ |
| due·over texto (surface-2) | `--due-over-ink` #C62828 | `--surface-2` #F4F2EC | 5.02:1 | 4.5:1 | ✓ |
| due·over glifo/borda (não-texto ≥ 3:1) | `--due-over` #C62828 | `--surface` #FFFFFF | 5.62:1 | 3:1 | ✓ |
| dept·gralha-azul texto | `--dept-gralha-azul-ink` #1B4F8A | `--surface` #FFFFFF | 8.29:1 | 4.5:1 | ✓ |
| dept·gralha-azul texto na etiqueta | `--dept-gralha-azul-ink` #1B4F8A | `--dept-gralha-azul-soft` #DFE6EF | 6.60:1 | 4.5:1 | ✓ |
| dept·gralha-azul texto (surface-2) | `--dept-gralha-azul-ink` #1B4F8A | `--surface-2` #F4F2EC | 7.41:1 | 4.5:1 | ✓ |
| dept·gralha-azul glifo/borda (não-texto ≥ 3:1) | `--dept-gralha-azul` #1B4F8A | `--surface` #FFFFFF | 8.29:1 | 3:1 | ✓ |
| dept·gralha-azul texto sobre a cor cheia | `--on-dept-gralha-azul` #FFFFFF | `--dept-gralha-azul` #1B4F8A | 8.29:1 | 4.5:1 | ✓ |
| dept·araucaria texto | `--dept-araucaria-ink` #1E784A | `--surface` #FFFFFF | 5.47:1 | 4.5:1 | ✓ |
| dept·araucaria texto na etiqueta | `--dept-araucaria-ink` #1E784A | `--dept-araucaria-soft` #E0ECE6 | 4.51:1 | 4.5:1 | ✓ |
| dept·araucaria texto (surface-2) | `--dept-araucaria-ink` #1E784A | `--surface-2` #F4F2EC | 4.88:1 | 4.5:1 | ✓ |
| dept·araucaria glifo/borda (não-texto ≥ 3:1) | `--dept-araucaria` #1F7A4B | `--surface` #FFFFFF | 5.32:1 | 3:1 | ✓ |
| dept·araucaria texto sobre a cor cheia | `--on-dept-araucaria` #FFFFFF | `--dept-araucaria` #1F7A4B | 5.32:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto | `--dept-ipe-roxo-ink` #7B4FC6 | `--surface` #FFFFFF | 5.56:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto na etiqueta | `--dept-ipe-roxo-ink` #7B4FC6 | `--dept-ipe-roxo-soft` #EDE6F7 | 4.57:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto (surface-2) | `--dept-ipe-roxo-ink` #7B4FC6 | `--surface-2` #F4F2EC | 4.97:1 | 4.5:1 | ✓ |
| dept·ipe-roxo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-roxo` #7B4FC6 | `--surface` #FFFFFF | 5.56:1 | 3:1 | ✓ |
| dept·ipe-roxo texto sobre a cor cheia | `--on-dept-ipe-roxo` #FFFFFF | `--dept-ipe-roxo` #7B4FC6 | 5.56:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto | `--dept-ipe-amarelo-ink` #956107 | `--surface` #FFFFFF | 5.26:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto na etiqueta | `--dept-ipe-amarelo-ink` #956107 | `--dept-ipe-amarelo-soft` #FAEFDD | 4.62:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto (surface-2) | `--dept-ipe-amarelo-ink` #956107 | `--surface-2` #F4F2EC | 4.70:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-amarelo` #CA840A | `--surface` #FFFFFF | 3.08:1 | 3:1 | ✓ |
| dept·ipe-amarelo texto sobre a cor cheia | `--on-dept-ipe-amarelo` #0B0D10 | `--dept-ipe-amarelo` #CA840A | 6.32:1 | 4.5:1 | ✓ |
| dept·terracota texto | `--dept-terracota-ink` #A85036 | `--surface` #FFFFFF | 5.43:1 | 4.5:1 | ✓ |
| dept·terracota texto na etiqueta | `--dept-terracota-ink` #A85036 | `--dept-terracota-soft` #F5E7E3 | 4.51:1 | 4.5:1 | ✓ |
| dept·terracota texto (surface-2) | `--dept-terracota-ink` #A85036 | `--surface-2` #F4F2EC | 4.85:1 | 4.5:1 | ✓ |
| dept·terracota glifo/borda (não-texto ≥ 3:1) | `--dept-terracota` #B4553A | `--surface` #FFFFFF | 4.88:1 | 3:1 | ✓ |
| dept·terracota texto sobre a cor cheia | `--on-dept-terracota` #FFFFFF | `--dept-terracota` #B4553A | 4.88:1 | 4.5:1 | ✓ |
| dept·ardosia texto | `--dept-ardosia-ink` #4D6B97 | `--surface` #FFFFFF | 5.43:1 | 4.5:1 | ✓ |
| dept·ardosia texto na etiqueta | `--dept-ardosia-ink` #4D6B97 | `--dept-ardosia-soft` #E6EBF1 | 4.53:1 | 4.5:1 | ✓ |
| dept·ardosia texto (surface-2) | `--dept-ardosia-ink` #4D6B97 | `--surface-2` #F4F2EC | 4.85:1 | 4.5:1 | ✓ |
| dept·ardosia glifo/borda (não-texto ≥ 3:1) | `--dept-ardosia` #4F6D9A | `--surface` #FFFFFF | 5.27:1 | 3:1 | ✓ |
| dept·ardosia texto sobre a cor cheia | `--on-dept-ardosia` #FFFFFF | `--dept-ardosia` #4F6D9A | 5.27:1 | 4.5:1 | ✓ |
| dept·pinhao texto | `--dept-pinhao-ink` #8B5E34 | `--surface` #FFFFFF | 5.60:1 | 4.5:1 | ✓ |
| dept·pinhao texto na etiqueta | `--dept-pinhao-ink` #8B5E34 | `--dept-pinhao-soft` #EFE8E3 | 4.62:1 | 4.5:1 | ✓ |
| dept·pinhao texto (surface-2) | `--dept-pinhao-ink` #8B5E34 | `--surface-2` #F4F2EC | 5.00:1 | 4.5:1 | ✓ |
| dept·pinhao glifo/borda (não-texto ≥ 3:1) | `--dept-pinhao` #8B5E34 | `--surface` #FFFFFF | 5.60:1 | 3:1 | ✓ |
| dept·pinhao texto sobre a cor cheia | `--on-dept-pinhao` #FFFFFF | `--dept-pinhao` #8B5E34 | 5.60:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto | `--dept-cinza-pedra-ink` #5A6069 | `--surface` #FFFFFF | 6.34:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto na etiqueta | `--dept-cinza-pedra-ink` #5A6069 | `--dept-cinza-pedra-soft` #E8E9EA | 5.22:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto (surface-2) | `--dept-cinza-pedra-ink` #5A6069 | `--surface-2` #F4F2EC | 5.66:1 | 4.5:1 | ✓ |
| dept·cinza-pedra glifo/borda (não-texto ≥ 3:1) | `--dept-cinza-pedra` #5A6069 | `--surface` #FFFFFF | 6.34:1 | 3:1 | ✓ |
| dept·cinza-pedra texto sobre a cor cheia | `--on-dept-cinza-pedra` #FFFFFF | `--dept-cinza-pedra` #5A6069 | 6.34:1 | 4.5:1 | ✓ |
| foco (anel) sobre surface (≥ 3:1) | `--focus` #1B4F8A | `--surface` #FFFFFF | 8.29:1 | 3:1 | ✓ |
| foco sobre ground (≥ 3:1) | `--focus` #1B4F8A | `--ground` #F3F1EA | 7.34:1 | 3:1 | ✓ |
| linha forte (≥ 3:1) | `--line` #1B1F26 | `--surface` #FFFFFF | 16.53:1 | 3:1 | ✓ |
| carimbo VALIDADO (tinta verde) sobre surface | `--class-consenso-ink` #247A46 | `--surface` #FFFFFF | 5.32:1 | 4.5:1 | ✓ |
| carimbo DEVOLVIDO (tinta vermelha) | `--class-risco-ink` #C42C32 | `--surface` #FFFFFF | 5.59:1 | 4.5:1 | ✓ |
| lacre dourado: aro contra o card (≥ 3:1) | `--seal-gold-edge` #8F6E12 | `--surface` #FFFFFF | 4.77:1 | 3:1 | ✓ |
| lacre azul-marinho: aro contra o card (≥ 3:1) | `--seal-navy-edge` #0F1F3C | `--surface` #FFFFFF | 16.39:1 | 3:1 | ✓ |
| fita vermelha da Excelência (≥ 3:1) | `--seal-ribbon` #B3202E | `--surface` #FFFFFF | 6.64:1 | 3:1 | ✓ |

### Escuro (`data-theme="escuro"`) — 183 pares, mínimo 3.01:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ink` #ECEAE4 | `--surface` #1C1F24 | 13.74:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #AEB3BB | `--surface` #1C1F24 | 7.84:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #ECEAE4 | `--surface-2` #23272E | 12.46:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #AEB3BB | `--surface-2` #23272E | 7.11:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #ECEAE4 | `--surface-3` #2C313A | 10.86:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #AEB3BB | `--surface-3` #2C313A | 6.20:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #ECEAE4 | `--ground` #121417 | 15.34:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #AEB3BB | `--ground` #121417 | 8.76:1 | 4.5:1 | ✓ |
| texto terciário (placeholder) | `--faint` #9CA2AB | `--surface` #1C1F24 | 6.43:1 | 4.5:1 | ✓ |
| texto sobre botão primário | `--on-primary` #0B1A2C | `--primary` #5E9FE6 | 6.32:1 | 4.5:1 | ✓ |
| link / texto primário | `--primary-ink` #5E9FE6 | `--surface` #1C1F24 | 5.96:1 | 4.5:1 | ✓ |
| texto primário na etiqueta | `--primary-ink` #5E9FE6 | `--primary-soft` #1E3350 | 4.61:1 | 4.5:1 | ✓ |
| texto sobre botão secundário | `--on-secondary` #06301A | `--secondary` #4CB87E | 5.86:1 | 4.5:1 | ✓ |
| texto secundário (verde) | `--secondary-ink` #4CB87E | `--surface` #1C1F24 | 6.66:1 | 4.5:1 | ✓ |
| texto da faísca ("gerado por IA") | `--spark-ink` #E59D12 | `--surface` #1C1F24 | 7.21:1 | 4.5:1 | ✓ |
| texto da faísca na etiqueta | `--spark-ink` #E59D12 | `--spark-soft` #4C3D20 | 4.59:1 | 4.5:1 | ✓ |
| glifo ✦ (não-texto ≥ 3:1) | `--spark` #E39B12 | `--surface` #1C1F24 | 7.05:1 | 3:1 | ✓ |
| class·argumento texto | `--class-argumento-ink` #64A0DB | `--surface` #1C1F24 | 5.97:1 | 4.5:1 | ✓ |
| class·argumento texto na etiqueta | `--class-argumento-ink` #64A0DB | `--class-argumento-soft` #21354A | 4.54:1 | 4.5:1 | ✓ |
| class·argumento texto (surface-2) | `--class-argumento-ink` #64A0DB | `--surface-2` #23272E | 5.42:1 | 4.5:1 | ✓ |
| class·argumento glifo/borda (não-texto ≥ 3:1) | `--class-argumento` #2F7DC8 | `--surface` #1C1F24 | 3.85:1 | 3:1 | ✓ |
| class·argumento texto sobre a cor cheia | `--on-class-argumento` #0B0D10 | `--class-argumento` #2F7DC8 | 4.53:1 | 4.5:1 | ✓ |
| class·divergencia texto | `--class-divergencia-ink` #EC8B41 | `--surface` #1C1F24 | 6.56:1 | 4.5:1 | ✓ |
| class·divergencia texto na etiqueta | `--class-divergencia-ink` #EC8B41 | `--class-divergencia-soft` #4D3423 | 4.55:1 | 4.5:1 | ✓ |
| class·divergencia texto (surface-2) | `--class-divergencia-ink` #EC8B41 | `--surface-2` #23272E | 5.95:1 | 4.5:1 | ✓ |
| class·divergencia glifo/borda (não-texto ≥ 3:1) | `--class-divergencia` #E8761E | `--surface` #1C1F24 | 5.54:1 | 3:1 | ✓ |
| class·divergencia texto sobre a cor cheia | `--on-class-divergencia` #0B0D10 | `--class-divergencia` #E8761E | 6.52:1 | 4.5:1 | ✓ |
| class·risco texto | `--class-risco-ink` #E0777B | `--surface` #1C1F24 | 5.58:1 | 4.5:1 | ✓ |
| class·risco texto na etiqueta | `--class-risco-ink` #E0777B | `--class-risco-soft` #472429 | 4.57:1 | 4.5:1 | ✓ |
| class·risco texto (surface-2) | `--class-risco-ink` #E0777B | `--surface-2` #23272E | 5.06:1 | 4.5:1 | ✓ |
| class·risco glifo/borda (não-texto ≥ 3:1) | `--class-risco` #D1343A | `--surface` #1C1F24 | 3.35:1 | 3:1 | ✓ |
| class·risco texto sobre a cor cheia | `--on-class-risco` #FFFFFF | `--class-risco` #D1343A | 4.93:1 | 4.5:1 | ✓ |
| class·consenso texto | `--class-consenso-ink` #36B76A | `--surface` #1C1F24 | 6.40:1 | 4.5:1 | ✓ |
| class·consenso texto na etiqueta | `--class-consenso-ink` #36B76A | `--class-consenso-soft` #203D31 | 4.59:1 | 4.5:1 | ✓ |
| class·consenso texto (surface-2) | `--class-consenso-ink` #36B76A | `--surface-2` #23272E | 5.81:1 | 4.5:1 | ✓ |
| class·consenso glifo/borda (não-texto ≥ 3:1) | `--class-consenso` #2E9D5B | `--surface` #1C1F24 | 4.79:1 | 3:1 | ✓ |
| class·consenso texto sobre a cor cheia | `--on-class-consenso` #0B0D10 | `--class-consenso` #2E9D5B | 5.64:1 | 4.5:1 | ✓ |
| class·pergunta texto | `--class-pergunta-ink` #A689D9 | `--surface` #1C1F24 | 5.67:1 | 4.5:1 | ✓ |
| class·pergunta texto na etiqueta | `--class-pergunta-ink` #A689D9 | `--class-pergunta-soft` #332B4B | 4.54:1 | 4.5:1 | ✓ |
| class·pergunta texto (surface-2) | `--class-pergunta-ink` #A689D9 | `--surface-2` #23272E | 5.14:1 | 4.5:1 | ✓ |
| class·pergunta glifo/borda (não-texto ≥ 3:1) | `--class-pergunta` #7C51C7 | `--surface` #1C1F24 | 3.04:1 | 3:1 | ✓ |
| class·pergunta texto sobre a cor cheia | `--on-class-pergunta` #FFFFFF | `--class-pergunta` #7C51C7 | 5.44:1 | 4.5:1 | ✓ |
| class·ruido texto | `--class-ruido-ink` #9FA5AC | `--surface` #1C1F24 | 6.65:1 | 4.5:1 | ✓ |
| class·ruido texto na etiqueta | `--class-ruido-ink` #9FA5AC | `--class-ruido-soft` #373B41 | 4.53:1 | 4.5:1 | ✓ |
| class·ruido texto (surface-2) | `--class-ruido-ink` #9FA5AC | `--surface-2` #23272E | 6.03:1 | 4.5:1 | ✓ |
| class·ruido glifo/borda (não-texto ≥ 3:1) | `--class-ruido` #8C939B | `--surface` #1C1F24 | 5.32:1 | 3:1 | ✓ |
| class·ruido texto sobre a cor cheia | `--on-class-ruido` #0B0D10 | `--class-ruido` #8C939B | 6.27:1 | 4.5:1 | ✓ |
| type·texto-manual texto | `--type-texto-manual-ink` #8C93A0 | `--surface` #1C1F24 | 5.35:1 | 4.5:1 | ✓ |
| type·texto-manual texto na etiqueta | `--type-texto-manual-ink` #8C93A0 | `--type-texto-manual-soft` #282C32 | 4.54:1 | 4.5:1 | ✓ |
| type·texto-manual texto (surface-2) | `--type-texto-manual-ink` #8C93A0 | `--surface-2` #23272E | 4.85:1 | 4.5:1 | ✓ |
| type·texto-manual glifo/borda (não-texto ≥ 3:1) | `--type-texto-manual` #636A78 | `--surface` #1C1F24 | 3.04:1 | 3:1 | ✓ |
| type·texto-ia texto | `--type-texto-ia-ink` #E59D12 | `--surface` #1C1F24 | 7.21:1 | 4.5:1 | ✓ |
| type·texto-ia texto na etiqueta | `--type-texto-ia-ink` #E59D12 | `--type-texto-ia-soft` #4C3D20 | 4.59:1 | 4.5:1 | ✓ |
| type·texto-ia texto (surface-2) | `--type-texto-ia-ink` #E59D12 | `--surface-2` #23272E | 6.54:1 | 4.5:1 | ✓ |
| type·texto-ia glifo/borda (não-texto ≥ 3:1) | `--type-texto-ia` #E39B12 | `--surface` #1C1F24 | 7.05:1 | 3:1 | ✓ |
| type·imagem-web texto | `--type-imagem-web-ink` #64A0DB | `--surface` #1C1F24 | 5.97:1 | 4.5:1 | ✓ |
| type·imagem-web texto na etiqueta | `--type-imagem-web-ink` #64A0DB | `--type-imagem-web-soft` #21354A | 4.54:1 | 4.5:1 | ✓ |
| type·imagem-web texto (surface-2) | `--type-imagem-web-ink` #64A0DB | `--surface-2` #23272E | 5.42:1 | 4.5:1 | ✓ |
| type·imagem-web glifo/borda (não-texto ≥ 3:1) | `--type-imagem-web` #2F7DC8 | `--surface` #1C1F24 | 3.85:1 | 3:1 | ✓ |
| type·imagem-editada texto | `--type-imagem-editada-ink` #AC8BE2 | `--surface` #1C1F24 | 5.94:1 | 4.5:1 | ✓ |
| type·imagem-editada texto na etiqueta | `--type-imagem-editada-ink` #AC8BE2 | `--type-imagem-editada-soft` #362E4F | 4.54:1 | 4.5:1 | ✓ |
| type·imagem-editada texto (surface-2) | `--type-imagem-editada-ink` #AC8BE2 | `--surface-2` #23272E | 5.39:1 | 4.5:1 | ✓ |
| type·imagem-editada glifo/borda (não-texto ≥ 3:1) | `--type-imagem-editada` #8A5CD6 | `--surface` #1C1F24 | 3.61:1 | 3:1 | ✓ |
| type·planilha texto | `--type-planilha-ink` #36B76A | `--surface` #1C1F24 | 6.40:1 | 4.5:1 | ✓ |
| type·planilha texto na etiqueta | `--type-planilha-ink` #36B76A | `--type-planilha-soft` #203D31 | 4.59:1 | 4.5:1 | ✓ |
| type·planilha texto (surface-2) | `--type-planilha-ink` #36B76A | `--surface-2` #23272E | 5.81:1 | 4.5:1 | ✓ |
| type·planilha glifo/borda (não-texto ≥ 3:1) | `--type-planilha` #2E9D5B | `--surface` #1C1F24 | 4.79:1 | 3:1 | ✓ |
| type·documento texto | `--type-documento-ink` #969BA7 | `--surface` #1C1F24 | 5.94:1 | 4.5:1 | ✓ |
| type·documento texto na etiqueta | `--type-documento-ink` #969BA7 | `--type-documento-soft` #2F333A | 4.56:1 | 4.5:1 | ✓ |
| type·documento texto (surface-2) | `--type-documento-ink` #969BA7 | `--surface-2` #23272E | 5.38:1 | 4.5:1 | ✓ |
| type·documento glifo/borda (não-texto ≥ 3:1) | `--type-documento` #6B7280 | `--surface` #1C1F24 | 3.42:1 | 3:1 | ✓ |
| type·pasta texto | `--type-pasta-ink` #C28D5C | `--surface` #1C1F24 | 5.71:1 | 4.5:1 | ✓ |
| type·pasta texto na etiqueta | `--type-pasta-ink` #C28D5C | `--type-pasta-soft` #372E28 | 4.58:1 | 4.5:1 | ✓ |
| type·pasta texto (surface-2) | `--type-pasta-ink` #C28D5C | `--surface-2` #23272E | 5.18:1 | 4.5:1 | ✓ |
| type·pasta glifo/borda (não-texto ≥ 3:1) | `--type-pasta` #8D5F35 | `--surface` #1C1F24 | 3.01:1 | 3:1 | ✓ |
| type·link texto | `--type-link-ink` #11ADC9 | `--surface` #1C1F24 | 6.17:1 | 4.5:1 | ✓ |
| type·link texto na etiqueta | `--type-link-ink` #11ADC9 | `--type-link-soft` #193A43 | 4.54:1 | 4.5:1 | ✓ |
| type·link texto (surface-2) | `--type-link-ink` #11ADC9 | `--surface-2` #23272E | 5.60:1 | 4.5:1 | ✓ |
| type·link glifo/borda (não-texto ≥ 3:1) | `--type-link` #0E8FA6 | `--surface` #1C1F24 | 4.33:1 | 3:1 | ✓ |
| type·desenho-tecnico texto | `--type-desenho-tecnico-ink` #E98745 | `--surface` #1C1F24 | 6.31:1 | 4.5:1 | ✓ |
| type·desenho-tecnico texto na etiqueta | `--type-desenho-tecnico-ink` #E98745 | `--type-desenho-tecnico-soft` #4B3122 | 4.55:1 | 4.5:1 | ✓ |
| type·desenho-tecnico texto (surface-2) | `--type-desenho-tecnico-ink` #E98745 | `--surface-2` #23272E | 5.72:1 | 4.5:1 | ✓ |
| type·desenho-tecnico glifo/borda (não-texto ≥ 3:1) | `--type-desenho-tecnico` #E06A1B | `--surface` #1C1F24 | 4.92:1 | 3:1 | ✓ |
| type·formulario texto | `--type-formulario-ink` #14AB9F | `--surface` #1C1F24 | 5.79:1 | 4.5:1 | ✓ |
| type·formulario texto na etiqueta | `--type-formulario-ink` #14AB9F | `--type-formulario-soft` #193638 | 4.52:1 | 4.5:1 | ✓ |
| type·formulario texto (surface-2) | `--type-formulario-ink` #14AB9F | `--surface-2` #23272E | 5.25:1 | 4.5:1 | ✓ |
| type·formulario glifo/borda (não-texto ≥ 3:1) | `--type-formulario` #0F8077 | `--surface` #1C1F24 | 3.44:1 | 3:1 | ✓ |
| type·ata-registro texto | `--type-ata-registro-ink` #E76275 | `--surface` #1C1F24 | 5.04:1 | 4.5:1 | ✓ |
| type·ata-registro texto na etiqueta | `--type-ata-registro-ink` #E76275 | `--type-ata-registro-soft` #3D1E26 | 4.53:1 | 4.5:1 | ✓ |
| type·ata-registro texto (surface-2) | `--type-ata-registro-ink` #E76275 | `--surface-2` #23272E | 4.57:1 | 4.5:1 | ✓ |
| type·ata-registro glifo/borda (não-texto ≥ 3:1) | `--type-ata-registro` #CC1F38 | `--surface` #1C1F24 | 3.01:1 | 3:1 | ✓ |
| type·email texto | `--type-email-ink` #819ABE | `--surface` #1C1F24 | 5.74:1 | 4.5:1 | ✓ |
| type·email texto na etiqueta | `--type-email-ink` #819ABE | `--type-email-soft` #283240 | 4.50:1 | 4.5:1 | ✓ |
| type·email texto (surface-2) | `--type-email-ink` #819ABE | `--surface-2` #23272E | 5.21:1 | 4.5:1 | ✓ |
| type·email glifo/borda (não-texto ≥ 3:1) | `--type-email` #4F6D9A | `--surface` #1C1F24 | 3.14:1 | 3:1 | ✓ |
| type·protocolo texto | `--type-protocolo-ink` #8FA53C | `--surface` #1C1F24 | 5.99:1 | 4.5:1 | ✓ |
| type·protocolo texto na etiqueta | `--type-protocolo-ink` #8FA53C | `--type-protocolo-soft` #303626 | 4.53:1 | 4.5:1 | ✓ |
| type·protocolo texto (surface-2) | `--type-protocolo-ink` #8FA53C | `--surface-2` #23272E | 5.44:1 | 4.5:1 | ✓ |
| type·protocolo glifo/borda (não-texto ≥ 3:1) | `--type-protocolo` #70812F | `--surface` #1C1F24 | 3.83:1 | 3:1 | ✓ |
| type·cronograma texto | `--type-cronograma-ink` #8390D4 | `--surface` #1C1F24 | 5.43:1 | 4.5:1 | ✓ |
| type·cronograma texto na etiqueta | `--type-cronograma-ink` #8390D4 | `--type-cronograma-soft` #242B47 | 4.57:1 | 4.5:1 | ✓ |
| type·cronograma texto (surface-2) | `--type-cronograma-ink` #8390D4 | `--surface-2` #23272E | 4.93:1 | 4.5:1 | ✓ |
| type·cronograma glifo/borda (não-texto ≥ 3:1) | `--type-cronograma` #5062C2 | `--surface` #1C1F24 | 3.04:1 | 3:1 | ✓ |
| type·estudo-tecnico-preliminar texto | `--type-estudo-tecnico-preliminar-ink` #C879A6 | `--surface` #1C1F24 | 5.30:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar texto na etiqueta | `--type-estudo-tecnico-preliminar-ink` #C879A6 | `--type-estudo-tecnico-preliminar-soft` #372635 | 4.52:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar texto (surface-2) | `--type-estudo-tecnico-preliminar-ink` #C879A6 | `--surface-2` #23272E | 4.81:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar glifo/borda (não-texto ≥ 3:1) | `--type-estudo-tecnico-preliminar` #A9467F | `--surface` #1C1F24 | 3.04:1 | 3:1 | ✓ |
| ext·docx texto | `--ext-docx-ink` #6894D4 | `--surface` #1C1F24 | 5.33:1 | 4.5:1 | ✓ |
| ext·docx texto na etiqueta | `--ext-docx-ink` #6894D4 | `--ext-docx-soft` #202C40 | 4.53:1 | 4.5:1 | ✓ |
| ext·docx texto (surface-2) | `--ext-docx-ink` #6894D4 | `--surface-2` #23272E | 4.84:1 | 4.5:1 | ✓ |
| ext·docx glifo/borda (não-texto ≥ 3:1) | `--ext-docx` #3469B7 | `--surface` #1C1F24 | 3.03:1 | 3:1 | ✓ |
| ext·pdf texto | `--ext-pdf-ink` #E0766F | `--surface` #1C1F24 | 5.50:1 | 4.5:1 | ✓ |
| ext·pdf texto na etiqueta | `--ext-pdf-ink` #E0766F | `--ext-pdf-soft` #452426 | 4.56:1 | 4.5:1 | ✓ |
| ext·pdf texto (surface-2) | `--ext-pdf-ink` #E0766F | `--surface-2` #23272E | 4.99:1 | 4.5:1 | ✓ |
| ext·pdf glifo/borda (não-texto ≥ 3:1) | `--ext-pdf` #C8352B | `--surface` #1C1F24 | 3.15:1 | 3:1 | ✓ |
| ext·xlsx texto | `--ext-xlsx-ink` #2DA965 | `--surface` #1C1F24 | 5.49:1 | 4.5:1 | ✓ |
| ext·xlsx texto na etiqueta | `--ext-xlsx-ink` #2DA965 | `--ext-xlsx-soft` #1C322B | 4.53:1 | 4.5:1 | ✓ |
| ext·xlsx texto (surface-2) | `--ext-xlsx-ink` #2DA965 | `--surface-2` #23272E | 4.98:1 | 4.5:1 | ✓ |
| ext·xlsx glifo/borda (não-texto ≥ 3:1) | `--ext-xlsx` #207948 | `--surface` #1C1F24 | 3.06:1 | 3:1 | ✓ |
| ext·pptx texto | `--ext-pptx-ink` #E77651 | `--surface` #1C1F24 | 5.59:1 | 4.5:1 | ✓ |
| ext·pptx texto na etiqueta | `--ext-pptx-ink` #E77651 | `--ext-pptx-soft` #442822 | 4.52:1 | 4.5:1 | ✓ |
| ext·pptx texto (surface-2) | `--ext-pptx-ink` #E77651 | `--surface-2` #23272E | 5.07:1 | 4.5:1 | ✓ |
| ext·pptx glifo/borda (não-texto ≥ 3:1) | `--ext-pptx` #C4441B | `--surface` #1C1F24 | 3.30:1 | 3:1 | ✓ |
| ext·md texto | `--ext-md-ink` #9C9FA5 | `--surface` #1C1F24 | 6.23:1 | 4.5:1 | ✓ |
| ext·md texto na etiqueta | `--ext-md-ink` #9C9FA5 | `--ext-md-soft` #33363C | 4.57:1 | 4.5:1 | ✓ |
| ext·md texto (surface-2) | `--ext-md-ink` #9C9FA5 | `--surface-2` #23272E | 5.65:1 | 4.5:1 | ✓ |
| ext·md glifo/borda (não-texto ≥ 3:1) | `--ext-md` #7A7F87 | `--surface` #1C1F24 | 4.10:1 | 3:1 | ✓ |
| due·soon texto | `--due-soon-ink` #E5960C | `--surface` #1C1F24 | 6.85:1 | 4.5:1 | ✓ |
| due·soon texto na etiqueta | `--due-soon-ink` #E5960C | `--due-soon-soft` #493A1E | 4.56:1 | 4.5:1 | ✓ |
| due·soon texto (surface-2) | `--due-soon-ink` #E5960C | `--surface-2` #23272E | 6.21:1 | 4.5:1 | ✓ |
| due·soon glifo/borda (não-texto ≥ 3:1) | `--due-soon` #D98E0B | `--surface` #1C1F24 | 6.16:1 | 3:1 | ✓ |
| due·over texto | `--due-over-ink` #E27272 | `--surface` #1C1F24 | 5.42:1 | 4.5:1 | ✓ |
| due·over texto na etiqueta | `--due-over-ink` #E27272 | `--due-over-soft` #452125 | 4.60:1 | 4.5:1 | ✓ |
| due·over texto (surface-2) | `--due-over-ink` #E27272 | `--surface-2` #23272E | 4.91:1 | 4.5:1 | ✓ |
| due·over glifo/borda (não-texto ≥ 3:1) | `--due-over` #CA2929 | `--surface` #1C1F24 | 3.04:1 | 3:1 | ✓ |
| dept·gralha-azul texto | `--dept-gralha-azul-ink` #5494DE | `--surface` #1C1F24 | 5.25:1 | 4.5:1 | ✓ |
| dept·gralha-azul texto na etiqueta | `--dept-gralha-azul-ink` #5494DE | `--dept-gralha-azul-soft` #1C2B3C | 4.57:1 | 4.5:1 | ✓ |
| dept·gralha-azul texto (surface-2) | `--dept-gralha-azul-ink` #5494DE | `--surface-2` #23272E | 4.76:1 | 4.5:1 | ✓ |
| dept·gralha-azul glifo/borda (não-texto ≥ 3:1) | `--dept-gralha-azul` #246AB9 | `--surface` #1C1F24 | 3.02:1 | 3:1 | ✓ |
| dept·gralha-azul texto sobre a cor cheia | `--on-dept-gralha-azul` #FFFFFF | `--dept-gralha-azul` #246AB9 | 5.47:1 | 4.5:1 | ✓ |
| dept·araucaria texto | `--dept-araucaria-ink` #2CAD6A | `--surface` #1C1F24 | 5.74:1 | 4.5:1 | ✓ |
| dept·araucaria texto na etiqueta | `--dept-araucaria-ink` #2CAD6A | `--dept-araucaria-soft` #1D352D | 4.56:1 | 4.5:1 | ✓ |
| dept·araucaria texto (surface-2) | `--dept-araucaria-ink` #2CAD6A | `--surface-2` #23272E | 5.20:1 | 4.5:1 | ✓ |
| dept·araucaria glifo/borda (não-texto ≥ 3:1) | `--dept-araucaria` #1F7A4B | `--surface` #1C1F24 | 3.10:1 | 3:1 | ✓ |
| dept·araucaria texto sobre a cor cheia | `--on-dept-araucaria` #FFFFFF | `--dept-araucaria` #1F7A4B | 5.32:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto | `--dept-ipe-roxo-ink` #A689D9 | `--surface` #1C1F24 | 5.67:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto na etiqueta | `--dept-ipe-roxo-ink` #A689D9 | `--dept-ipe-roxo-soft` #332B4B | 4.54:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto (surface-2) | `--dept-ipe-roxo-ink` #A689D9 | `--surface-2` #23272E | 5.14:1 | 4.5:1 | ✓ |
| dept·ipe-roxo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-roxo` #7C51C7 | `--surface` #1C1F24 | 3.04:1 | 3:1 | ✓ |
| dept·ipe-roxo texto sobre a cor cheia | `--on-dept-ipe-roxo` #FFFFFF | `--dept-ipe-roxo` #7C51C7 | 5.44:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto | `--dept-ipe-amarelo-ink` #E5960C | `--surface` #1C1F24 | 6.85:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto na etiqueta | `--dept-ipe-amarelo-ink` #E5960C | `--dept-ipe-amarelo-soft` #493A1E | 4.56:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto (surface-2) | `--dept-ipe-amarelo-ink` #E5960C | `--surface-2` #23272E | 6.21:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-amarelo` #D98E0B | `--surface` #1C1F24 | 6.16:1 | 3:1 | ✓ |
| dept·ipe-amarelo texto sobre a cor cheia | `--on-dept-ipe-amarelo` #0B0D10 | `--dept-ipe-amarelo` #D98E0B | 7.25:1 | 4.5:1 | ✓ |
| dept·terracota texto | `--dept-terracota-ink` #D1856F | `--surface` #1C1F24 | 5.74:1 | 4.5:1 | ✓ |
| dept·terracota texto na etiqueta | `--dept-terracota-ink` #D1856F | `--dept-terracota-soft` #402C29 | 4.53:1 | 4.5:1 | ✓ |
| dept·terracota texto (surface-2) | `--dept-terracota-ink` #D1856F | `--surface-2` #23272E | 5.21:1 | 4.5:1 | ✓ |
| dept·terracota glifo/borda (não-texto ≥ 3:1) | `--dept-terracota` #B4553A | `--surface` #1C1F24 | 3.38:1 | 3:1 | ✓ |
| dept·terracota texto sobre a cor cheia | `--on-dept-terracota` #FFFFFF | `--dept-terracota` #B4553A | 4.88:1 | 4.5:1 | ✓ |
| dept·ardosia texto | `--dept-ardosia-ink` #819ABE | `--surface` #1C1F24 | 5.74:1 | 4.5:1 | ✓ |
| dept·ardosia texto na etiqueta | `--dept-ardosia-ink` #819ABE | `--dept-ardosia-soft` #283240 | 4.50:1 | 4.5:1 | ✓ |
| dept·ardosia texto (surface-2) | `--dept-ardosia-ink` #819ABE | `--surface-2` #23272E | 5.21:1 | 4.5:1 | ✓ |
| dept·ardosia glifo/borda (não-texto ≥ 3:1) | `--dept-ardosia` #4F6D9A | `--surface` #1C1F24 | 3.14:1 | 3:1 | ✓ |
| dept·ardosia texto sobre a cor cheia | `--on-dept-ardosia` #FFFFFF | `--dept-ardosia` #4F6D9A | 5.27:1 | 4.5:1 | ✓ |
| dept·pinhao texto | `--dept-pinhao-ink` #C28D5C | `--surface` #1C1F24 | 5.71:1 | 4.5:1 | ✓ |
| dept·pinhao texto na etiqueta | `--dept-pinhao-ink` #C28D5C | `--dept-pinhao-soft` #372E28 | 4.58:1 | 4.5:1 | ✓ |
| dept·pinhao texto (surface-2) | `--dept-pinhao-ink` #C28D5C | `--surface-2` #23272E | 5.18:1 | 4.5:1 | ✓ |
| dept·pinhao glifo/borda (não-texto ≥ 3:1) | `--dept-pinhao` #8D5F35 | `--surface` #1C1F24 | 3.01:1 | 3:1 | ✓ |
| dept·pinhao texto sobre a cor cheia | `--on-dept-pinhao` #FFFFFF | `--dept-pinhao` #8D5F35 | 5.50:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto | `--dept-cinza-pedra-ink` #9097A0 | `--surface` #1C1F24 | 5.60:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto na etiqueta | `--dept-cinza-pedra-ink` #9097A0 | `--dept-cinza-pedra-soft` #2B2F35 | 4.56:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto (surface-2) | `--dept-cinza-pedra-ink` #9097A0 | `--surface-2` #23272E | 5.08:1 | 4.5:1 | ✓ |
| dept·cinza-pedra glifo/borda (não-texto ≥ 3:1) | `--dept-cinza-pedra` #636A74 | `--surface` #1C1F24 | 3.03:1 | 3:1 | ✓ |
| dept·cinza-pedra texto sobre a cor cheia | `--on-dept-cinza-pedra` #FFFFFF | `--dept-cinza-pedra` #636A74 | 5.46:1 | 4.5:1 | ✓ |
| foco (anel) sobre surface (≥ 3:1) | `--focus` #8DBFF2 | `--surface` #1C1F24 | 8.55:1 | 3:1 | ✓ |
| foco sobre ground (≥ 3:1) | `--focus` #8DBFF2 | `--ground` #121417 | 9.55:1 | 3:1 | ✓ |
| linha forte (≥ 3:1) | `--line` #C8CCD3 | `--surface` #1C1F24 | 10.26:1 | 3:1 | ✓ |
| carimbo VALIDADO (tinta verde) sobre surface | `--class-consenso-ink` #36B76A | `--surface` #1C1F24 | 6.40:1 | 4.5:1 | ✓ |
| carimbo DEVOLVIDO (tinta vermelha) | `--class-risco-ink` #E0777B | `--surface` #1C1F24 | 5.58:1 | 4.5:1 | ✓ |
| lacre dourado: aro contra o card (≥ 3:1) | `--seal-gold-edge` #F2DC8A | `--surface` #1C1F24 | 12.10:1 | 3:1 | ✓ |
| lacre azul-marinho: aro contra o card (≥ 3:1) | `--seal-navy-edge` #8DB0E0 | `--surface` #1C1F24 | 7.41:1 | 3:1 | ✓ |
| fita vermelha da Excelência (≥ 3:1) | `--seal-ribbon` #D23B4A | `--surface` #1C1F24 | 3.51:1 | 3:1 | ✓ |

### Alto contraste (`data-theme="contraste"`) — 183 pares, mínimo 7.71:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ink` #FFFFFF | `--surface` #000000 | 21.00:1 | 7:1 | ✓ |
| texto secundário | `--muted` #FFFFFF | `--surface` #000000 | 21.00:1 | 7:1 | ✓ |
| texto principal | `--ink` #FFFFFF | `--surface-2` #0F0F0F | 19.17:1 | 7:1 | ✓ |
| texto secundário | `--muted` #FFFFFF | `--surface-2` #0F0F0F | 19.17:1 | 7:1 | ✓ |
| texto principal | `--ink` #FFFFFF | `--surface-3` #1A1A1A | 17.40:1 | 7:1 | ✓ |
| texto secundário | `--muted` #FFFFFF | `--surface-3` #1A1A1A | 17.40:1 | 7:1 | ✓ |
| texto principal | `--ink` #FFFFFF | `--ground` #000000 | 21.00:1 | 7:1 | ✓ |
| texto secundário | `--muted` #FFFFFF | `--ground` #000000 | 21.00:1 | 7:1 | ✓ |
| texto terciário (placeholder) | `--faint` #E6E6E6 | `--surface` #000000 | 16.83:1 | 7:1 | ✓ |
| texto sobre botão primário | `--on-primary` #000000 | `--primary` #FFD400 | 14.67:1 | 7:1 | ✓ |
| link / texto primário | `--primary-ink` #FFD400 | `--surface` #000000 | 14.67:1 | 7:1 | ✓ |
| texto primário na etiqueta | `--primary-ink` #FFD400 | `--primary-soft` #000000 | 14.67:1 | 7:1 | ✓ |
| texto sobre botão secundário | `--on-secondary` #000000 | `--secondary` #7CF2B2 | 15.20:1 | 7:1 | ✓ |
| texto secundário (verde) | `--secondary-ink` #7CF2B2 | `--surface` #000000 | 15.20:1 | 7:1 | ✓ |
| texto da faísca ("gerado por IA") | `--spark-ink` #E39B12 | `--surface` #000000 | 8.96:1 | 7:1 | ✓ |
| texto da faísca na etiqueta | `--spark-ink` #E39B12 | `--spark-soft` #000000 | 8.96:1 | 7:1 | ✓ |
| glifo ✦ (não-texto ≥ 3:1) | `--spark` #E39B12 | `--surface` #000000 | 8.96:1 | 3:1 | ✓ |
| class·argumento texto | `--class-argumento-ink` #74AADE | `--surface` #000000 | 8.55:1 | 7:1 | ✓ |
| class·argumento texto na etiqueta | `--class-argumento-ink` #74AADE | `--class-argumento-soft` #000000 | 8.55:1 | 7:1 | ✓ |
| class·argumento texto (surface-2) | `--class-argumento-ink` #74AADE | `--surface-2` #0F0F0F | 7.80:1 | 7:1 | ✓ |
| class·argumento glifo/borda (não-texto ≥ 3:1) | `--class-argumento` #74AADE | `--surface` #000000 | 8.55:1 | 3:1 | ✓ |
| class·argumento texto sobre a cor cheia | `--on-class-argumento` #0B0D10 | `--class-argumento` #74AADE | 7.92:1 | 7:1 | ✓ |
| class·divergencia texto | `--class-divergencia-ink` #EC8D43 | `--surface` #000000 | 8.46:1 | 7:1 | ✓ |
| class·divergencia texto na etiqueta | `--class-divergencia-ink` #EC8D43 | `--class-divergencia-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| class·divergencia texto (surface-2) | `--class-divergencia-ink` #EC8D43 | `--surface-2` #0F0F0F | 7.72:1 | 7:1 | ✓ |
| class·divergencia glifo/borda (não-texto ≥ 3:1) | `--class-divergencia` #EC8D43 | `--surface` #000000 | 8.46:1 | 3:1 | ✓ |
| class·divergencia texto sobre a cor cheia | `--on-class-divergencia` #0B0D10 | `--class-divergencia` #EC8D43 | 7.84:1 | 7:1 | ✓ |
| class·risco texto | `--class-risco-ink` #E58D91 | `--surface` #000000 | 8.55:1 | 7:1 | ✓ |
| class·risco texto na etiqueta | `--class-risco-ink` #E58D91 | `--class-risco-soft` #000000 | 8.55:1 | 7:1 | ✓ |
| class·risco texto (surface-2) | `--class-risco-ink` #E58D91 | `--surface-2` #0F0F0F | 7.80:1 | 7:1 | ✓ |
| class·risco glifo/borda (não-texto ≥ 3:1) | `--class-risco` #E58D91 | `--surface` #000000 | 8.55:1 | 3:1 | ✓ |
| class·risco texto sobre a cor cheia | `--on-class-risco` #0B0D10 | `--class-risco` #E58D91 | 7.92:1 | 7:1 | ✓ |
| class·consenso texto | `--class-consenso-ink` #37BB6C | `--surface` #000000 | 8.49:1 | 7:1 | ✓ |
| class·consenso texto na etiqueta | `--class-consenso-ink` #37BB6C | `--class-consenso-soft` #000000 | 8.49:1 | 7:1 | ✓ |
| class·consenso texto (surface-2) | `--class-consenso-ink` #37BB6C | `--surface-2` #0F0F0F | 7.75:1 | 7:1 | ✓ |
| class·consenso glifo/borda (não-texto ≥ 3:1) | `--class-consenso` #37BB6C | `--surface` #000000 | 8.49:1 | 3:1 | ✓ |
| class·consenso texto sobre a cor cheia | `--on-class-consenso` #0B0D10 | `--class-consenso` #37BB6C | 7.86:1 | 7:1 | ✓ |
| class·pergunta texto | `--class-pergunta-ink` #B39ADE | `--surface` #000000 | 8.59:1 | 7:1 | ✓ |
| class·pergunta texto na etiqueta | `--class-pergunta-ink` #B39ADE | `--class-pergunta-soft` #000000 | 8.59:1 | 7:1 | ✓ |
| class·pergunta texto (surface-2) | `--class-pergunta-ink` #B39ADE | `--surface-2` #0F0F0F | 7.84:1 | 7:1 | ✓ |
| class·pergunta glifo/borda (não-texto ≥ 3:1) | `--class-pergunta` #B39ADE | `--surface` #000000 | 8.59:1 | 3:1 | ✓ |
| class·pergunta texto sobre a cor cheia | `--on-class-pergunta` #0B0D10 | `--class-pergunta` #B39ADE | 7.96:1 | 7:1 | ✓ |
| class·ruido texto | `--class-ruido-ink` #9FA5AC | `--surface` #000000 | 8.45:1 | 7:1 | ✓ |
| class·ruido texto na etiqueta | `--class-ruido-ink` #9FA5AC | `--class-ruido-soft` #000000 | 8.45:1 | 7:1 | ✓ |
| class·ruido texto (surface-2) | `--class-ruido-ink` #9FA5AC | `--surface-2` #0F0F0F | 7.71:1 | 7:1 | ✓ |
| class·ruido glifo/borda (não-texto ≥ 3:1) | `--class-ruido` #9FA5AC | `--surface` #000000 | 8.45:1 | 3:1 | ✓ |
| class·ruido texto sobre a cor cheia | `--on-class-ruido` #0B0D10 | `--class-ruido` #9FA5AC | 7.83:1 | 7:1 | ✓ |
| type·texto-manual texto | `--type-texto-manual-ink` #9FA5B0 | `--surface` #000000 | 8.48:1 | 7:1 | ✓ |
| type·texto-manual texto na etiqueta | `--type-texto-manual-ink` #9FA5B0 | `--type-texto-manual-soft` #000000 | 8.48:1 | 7:1 | ✓ |
| type·texto-manual texto (surface-2) | `--type-texto-manual-ink` #9FA5B0 | `--surface-2` #0F0F0F | 7.74:1 | 7:1 | ✓ |
| type·texto-manual glifo/borda (não-texto ≥ 3:1) | `--type-texto-manual` #9FA5B0 | `--surface` #000000 | 8.48:1 | 3:1 | ✓ |
| type·texto-ia texto | `--type-texto-ia-ink` #E39B12 | `--surface` #000000 | 8.96:1 | 7:1 | ✓ |
| type·texto-ia texto na etiqueta | `--type-texto-ia-ink` #E39B12 | `--type-texto-ia-soft` #000000 | 8.96:1 | 7:1 | ✓ |
| type·texto-ia texto (surface-2) | `--type-texto-ia-ink` #E39B12 | `--surface-2` #0F0F0F | 8.18:1 | 7:1 | ✓ |
| type·texto-ia glifo/borda (não-texto ≥ 3:1) | `--type-texto-ia` #E39B12 | `--surface` #000000 | 8.96:1 | 3:1 | ✓ |
| type·imagem-web texto | `--type-imagem-web-ink` #74AADE | `--surface` #000000 | 8.55:1 | 7:1 | ✓ |
| type·imagem-web texto na etiqueta | `--type-imagem-web-ink` #74AADE | `--type-imagem-web-soft` #000000 | 8.55:1 | 7:1 | ✓ |
| type·imagem-web texto (surface-2) | `--type-imagem-web-ink` #74AADE | `--surface-2` #0F0F0F | 7.80:1 | 7:1 | ✓ |
| type·imagem-web glifo/borda (não-texto ≥ 3:1) | `--type-imagem-web` #74AADE | `--surface` #000000 | 8.55:1 | 3:1 | ✓ |
| type·imagem-editada texto | `--type-imagem-editada-ink` #B497E5 | `--surface` #000000 | 8.50:1 | 7:1 | ✓ |
| type·imagem-editada texto na etiqueta | `--type-imagem-editada-ink` #B497E5 | `--type-imagem-editada-soft` #000000 | 8.50:1 | 7:1 | ✓ |
| type·imagem-editada texto (surface-2) | `--type-imagem-editada-ink` #B497E5 | `--surface-2` #0F0F0F | 7.76:1 | 7:1 | ✓ |
| type·imagem-editada glifo/borda (não-texto ≥ 3:1) | `--type-imagem-editada` #B497E5 | `--surface` #000000 | 8.50:1 | 3:1 | ✓ |
| type·planilha texto | `--type-planilha-ink` #37BB6C | `--surface` #000000 | 8.49:1 | 7:1 | ✓ |
| type·planilha texto na etiqueta | `--type-planilha-ink` #37BB6C | `--type-planilha-soft` #000000 | 8.49:1 | 7:1 | ✓ |
| type·planilha texto (surface-2) | `--type-planilha-ink` #37BB6C | `--surface-2` #0F0F0F | 7.75:1 | 7:1 | ✓ |
| type·planilha glifo/borda (não-texto ≥ 3:1) | `--type-planilha` #37BB6C | `--surface` #000000 | 8.49:1 | 3:1 | ✓ |
| type·documento texto | `--type-documento-ink` #9FA5AF | `--surface` #000000 | 8.48:1 | 7:1 | ✓ |
| type·documento texto na etiqueta | `--type-documento-ink` #9FA5AF | `--type-documento-soft` #000000 | 8.48:1 | 7:1 | ✓ |
| type·documento texto (surface-2) | `--type-documento-ink` #9FA5AF | `--surface-2` #0F0F0F | 7.74:1 | 7:1 | ✓ |
| type·documento glifo/borda (não-texto ≥ 3:1) | `--type-documento` #9FA5AF | `--surface` #000000 | 8.48:1 | 3:1 | ✓ |
| type·pasta texto | `--type-pasta-ink` #CA9C72 | `--surface` #000000 | 8.51:1 | 7:1 | ✓ |
| type·pasta texto na etiqueta | `--type-pasta-ink` #CA9C72 | `--type-pasta-soft` #000000 | 8.51:1 | 7:1 | ✓ |
| type·pasta texto (surface-2) | `--type-pasta-ink` #CA9C72 | `--surface-2` #0F0F0F | 7.77:1 | 7:1 | ✓ |
| type·pasta glifo/borda (não-texto ≥ 3:1) | `--type-pasta` #CA9C72 | `--surface` #000000 | 8.51:1 | 3:1 | ✓ |
| type·link texto | `--type-link-ink` #12B5D3 | `--surface` #000000 | 8.58:1 | 7:1 | ✓ |
| type·link texto na etiqueta | `--type-link-ink` #12B5D3 | `--type-link-soft` #000000 | 8.58:1 | 7:1 | ✓ |
| type·link texto (surface-2) | `--type-link-ink` #12B5D3 | `--surface-2` #0F0F0F | 7.83:1 | 7:1 | ✓ |
| type·link glifo/borda (não-texto ≥ 3:1) | `--type-link` #12B5D3 | `--surface` #000000 | 8.58:1 | 3:1 | ✓ |
| type·desenho-tecnico texto | `--type-desenho-tecnico-ink` #EA8E51 | `--surface` #000000 | 8.49:1 | 7:1 | ✓ |
| type·desenho-tecnico texto na etiqueta | `--type-desenho-tecnico-ink` #EA8E51 | `--type-desenho-tecnico-soft` #000000 | 8.49:1 | 7:1 | ✓ |
| type·desenho-tecnico texto (surface-2) | `--type-desenho-tecnico-ink` #EA8E51 | `--surface-2` #0F0F0F | 7.75:1 | 7:1 | ✓ |
| type·desenho-tecnico glifo/borda (não-texto ≥ 3:1) | `--type-desenho-tecnico` #EA8E51 | `--surface` #000000 | 8.49:1 | 3:1 | ✓ |
| type·formulario texto | `--type-formulario-ink` #16B9AC | `--surface` #000000 | 8.57:1 | 7:1 | ✓ |
| type·formulario texto na etiqueta | `--type-formulario-ink` #16B9AC | `--type-formulario-soft` #000000 | 8.57:1 | 7:1 | ✓ |
| type·formulario texto (surface-2) | `--type-formulario-ink` #16B9AC | `--surface-2` #0F0F0F | 7.82:1 | 7:1 | ✓ |
| type·formulario glifo/borda (não-texto ≥ 3:1) | `--type-formulario` #16B9AC | `--surface` #000000 | 8.57:1 | 3:1 | ✓ |
| type·ata-registro texto | `--type-ata-registro-ink` #ED8796 | `--surface` #000000 | 8.51:1 | 7:1 | ✓ |
| type·ata-registro texto na etiqueta | `--type-ata-registro-ink` #ED8796 | `--type-ata-registro-soft` #000000 | 8.51:1 | 7:1 | ✓ |
| type·ata-registro texto (surface-2) | `--type-ata-registro-ink` #ED8796 | `--surface-2` #0F0F0F | 7.77:1 | 7:1 | ✓ |
| type·ata-registro glifo/borda (não-texto ≥ 3:1) | `--type-ata-registro` #ED8796 | `--surface` #000000 | 8.51:1 | 3:1 | ✓ |
| type·email texto | `--type-email-ink` #90A6C6 | `--surface` #000000 | 8.46:1 | 7:1 | ✓ |
| type·email texto na etiqueta | `--type-email-ink` #90A6C6 | `--type-email-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| type·email texto (surface-2) | `--type-email-ink` #90A6C6 | `--surface-2` #0F0F0F | 7.72:1 | 7:1 | ✓ |
| type·email glifo/borda (não-texto ≥ 3:1) | `--type-email` #90A6C6 | `--surface` #000000 | 8.46:1 | 3:1 | ✓ |
| type·protocolo texto | `--type-protocolo-ink` #98B040 | `--surface` #000000 | 8.62:1 | 7:1 | ✓ |
| type·protocolo texto na etiqueta | `--type-protocolo-ink` #98B040 | `--type-protocolo-soft` #000000 | 8.62:1 | 7:1 | ✓ |
| type·protocolo texto (surface-2) | `--type-protocolo-ink` #98B040 | `--surface-2` #0F0F0F | 7.87:1 | 7:1 | ✓ |
| type·protocolo glifo/borda (não-texto ≥ 3:1) | `--type-protocolo` #98B040 | `--surface` #000000 | 8.62:1 | 3:1 | ✓ |
| type·cronograma texto | `--type-cronograma-ink` #98A2DB | `--surface` #000000 | 8.53:1 | 7:1 | ✓ |
| type·cronograma texto na etiqueta | `--type-cronograma-ink` #98A2DB | `--type-cronograma-soft` #000000 | 8.53:1 | 7:1 | ✓ |
| type·cronograma texto (surface-2) | `--type-cronograma-ink` #98A2DB | `--surface-2` #0F0F0F | 7.78:1 | 7:1 | ✓ |
| type·cronograma glifo/borda (não-texto ≥ 3:1) | `--type-cronograma` #98A2DB | `--surface` #000000 | 8.53:1 | 3:1 | ✓ |
| type·estudo-tecnico-preliminar texto | `--type-estudo-tecnico-preliminar-ink` #D293B7 | `--surface` #000000 | 8.60:1 | 7:1 | ✓ |
| type·estudo-tecnico-preliminar texto na etiqueta | `--type-estudo-tecnico-preliminar-ink` #D293B7 | `--type-estudo-tecnico-preliminar-soft` #000000 | 8.60:1 | 7:1 | ✓ |
| type·estudo-tecnico-preliminar texto (surface-2) | `--type-estudo-tecnico-preliminar-ink` #D293B7 | `--surface-2` #0F0F0F | 7.85:1 | 7:1 | ✓ |
| type·estudo-tecnico-preliminar glifo/borda (não-texto ≥ 3:1) | `--type-estudo-tecnico-preliminar` #D293B7 | `--surface` #000000 | 8.60:1 | 3:1 | ✓ |
| ext·docx texto | `--ext-docx-ink` #82A7DB | `--surface` #000000 | 8.50:1 | 7:1 | ✓ |
| ext·docx texto na etiqueta | `--ext-docx-ink` #82A7DB | `--ext-docx-soft` #000000 | 8.50:1 | 7:1 | ✓ |
| ext·docx texto (surface-2) | `--ext-docx-ink` #82A7DB | `--surface-2` #0F0F0F | 7.76:1 | 7:1 | ✓ |
| ext·docx glifo/borda (não-texto ≥ 3:1) | `--ext-docx` #82A7DB | `--surface` #000000 | 8.50:1 | 3:1 | ✓ |
| ext·pdf texto | `--ext-pdf-ink` #E58E88 | `--surface` #000000 | 8.56:1 | 7:1 | ✓ |
| ext·pdf texto na etiqueta | `--ext-pdf-ink` #E58E88 | `--ext-pdf-soft` #000000 | 8.56:1 | 7:1 | ✓ |
| ext·pdf texto (surface-2) | `--ext-pdf-ink` #E58E88 | `--surface-2` #0F0F0F | 7.81:1 | 7:1 | ✓ |
| ext·pdf glifo/borda (não-texto ≥ 3:1) | `--ext-pdf` #E58E88 | `--surface` #000000 | 8.56:1 | 3:1 | ✓ |
| ext·xlsx texto | `--ext-xlsx-ink` #31BC70 | `--surface` #000000 | 8.56:1 | 7:1 | ✓ |
| ext·xlsx texto na etiqueta | `--ext-xlsx-ink` #31BC70 | `--ext-xlsx-soft` #000000 | 8.56:1 | 7:1 | ✓ |
| ext·xlsx texto (surface-2) | `--ext-xlsx-ink` #31BC70 | `--surface-2` #0F0F0F | 7.81:1 | 7:1 | ✓ |
| ext·xlsx glifo/borda (não-texto ≥ 3:1) | `--ext-xlsx` #31BC70 | `--surface` #000000 | 8.56:1 | 3:1 | ✓ |
| ext·pptx texto | `--ext-pptx-ink` #EB8D6E | `--surface` #000000 | 8.57:1 | 7:1 | ✓ |
| ext·pptx texto na etiqueta | `--ext-pptx-ink` #EB8D6E | `--ext-pptx-soft` #000000 | 8.57:1 | 7:1 | ✓ |
| ext·pptx texto (surface-2) | `--ext-pptx-ink` #EB8D6E | `--surface-2` #0F0F0F | 7.82:1 | 7:1 | ✓ |
| ext·pptx glifo/borda (não-texto ≥ 3:1) | `--ext-pptx` #EB8D6E | `--surface` #000000 | 8.57:1 | 3:1 | ✓ |
| ext·md texto | `--ext-md-ink` #A2A6AB | `--surface` #000000 | 8.58:1 | 7:1 | ✓ |
| ext·md texto na etiqueta | `--ext-md-ink` #A2A6AB | `--ext-md-soft` #000000 | 8.58:1 | 7:1 | ✓ |
| ext·md texto (surface-2) | `--ext-md-ink` #A2A6AB | `--surface-2` #0F0F0F | 7.83:1 | 7:1 | ✓ |
| ext·md glifo/borda (não-texto ≥ 3:1) | `--ext-md` #A2A6AB | `--surface` #000000 | 8.58:1 | 3:1 | ✓ |
| due·soon texto | `--due-soon-ink` #E3940B | `--surface` #000000 | 8.51:1 | 7:1 | ✓ |
| due·soon texto na etiqueta | `--due-soon-ink` #E3940B | `--due-soon-soft` #000000 | 8.51:1 | 7:1 | ✓ |
| due·soon texto (surface-2) | `--due-soon-ink` #E3940B | `--surface-2` #0F0F0F | 7.77:1 | 7:1 | ✓ |
| due·soon glifo/borda (não-texto ≥ 3:1) | `--due-soon` #E3940B | `--surface` #000000 | 8.51:1 | 3:1 | ✓ |
| due·over texto | `--due-over-ink` #E88B8B | `--surface` #000000 | 8.50:1 | 7:1 | ✓ |
| due·over texto na etiqueta | `--due-over-ink` #E88B8B | `--due-over-soft` #000000 | 8.50:1 | 7:1 | ✓ |
| due·over texto (surface-2) | `--due-over-ink` #E88B8B | `--surface-2` #0F0F0F | 7.76:1 | 7:1 | ✓ |
| due·over glifo/borda (não-texto ≥ 3:1) | `--due-over` #E88B8B | `--surface` #000000 | 8.50:1 | 3:1 | ✓ |
| dept·gralha-azul texto | `--dept-gralha-azul-ink` #74A8E4 | `--surface` #000000 | 8.46:1 | 7:1 | ✓ |
| dept·gralha-azul texto na etiqueta | `--dept-gralha-azul-ink` #74A8E4 | `--dept-gralha-azul-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| dept·gralha-azul texto (surface-2) | `--dept-gralha-azul-ink` #74A8E4 | `--surface-2` #0F0F0F | 7.73:1 | 7:1 | ✓ |
| dept·gralha-azul glifo/borda (não-texto ≥ 3:1) | `--dept-gralha-azul` #74A8E4 | `--surface` #000000 | 8.46:1 | 3:1 | ✓ |
| dept·gralha-azul texto sobre a cor cheia | `--on-dept-gralha-azul` #0B0D10 | `--dept-gralha-azul` #74A8E4 | 7.84:1 | 7:1 | ✓ |
| dept·araucaria texto | `--dept-araucaria-ink` #30BB73 | `--surface` #000000 | 8.48:1 | 7:1 | ✓ |
| dept·araucaria texto na etiqueta | `--dept-araucaria-ink` #30BB73 | `--dept-araucaria-soft` #000000 | 8.48:1 | 7:1 | ✓ |
| dept·araucaria texto (surface-2) | `--dept-araucaria-ink` #30BB73 | `--surface-2` #0F0F0F | 7.74:1 | 7:1 | ✓ |
| dept·araucaria glifo/borda (não-texto ≥ 3:1) | `--dept-araucaria` #30BB73 | `--surface` #000000 | 8.48:1 | 3:1 | ✓ |
| dept·araucaria texto sobre a cor cheia | `--on-dept-araucaria` #0B0D10 | `--dept-araucaria` #30BB73 | 7.86:1 | 7:1 | ✓ |
| dept·ipe-roxo texto | `--dept-ipe-roxo-ink` #B39ADE | `--surface` #000000 | 8.59:1 | 7:1 | ✓ |
| dept·ipe-roxo texto na etiqueta | `--dept-ipe-roxo-ink` #B39ADE | `--dept-ipe-roxo-soft` #000000 | 8.59:1 | 7:1 | ✓ |
| dept·ipe-roxo texto (surface-2) | `--dept-ipe-roxo-ink` #B39ADE | `--surface-2` #0F0F0F | 7.84:1 | 7:1 | ✓ |
| dept·ipe-roxo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-roxo` #B39ADE | `--surface` #000000 | 8.59:1 | 3:1 | ✓ |
| dept·ipe-roxo texto sobre a cor cheia | `--on-dept-ipe-roxo` #0B0D10 | `--dept-ipe-roxo` #B39ADE | 7.96:1 | 7:1 | ✓ |
| dept·ipe-amarelo texto | `--dept-ipe-amarelo-ink` #E3940B | `--surface` #000000 | 8.51:1 | 7:1 | ✓ |
| dept·ipe-amarelo texto na etiqueta | `--dept-ipe-amarelo-ink` #E3940B | `--dept-ipe-amarelo-soft` #000000 | 8.51:1 | 7:1 | ✓ |
| dept·ipe-amarelo texto (surface-2) | `--dept-ipe-amarelo-ink` #E3940B | `--surface-2` #0F0F0F | 7.77:1 | 7:1 | ✓ |
| dept·ipe-amarelo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-amarelo` #E3940B | `--surface` #000000 | 8.51:1 | 3:1 | ✓ |
| dept·ipe-amarelo texto sobre a cor cheia | `--on-dept-ipe-amarelo` #0B0D10 | `--dept-ipe-amarelo` #E3940B | 7.88:1 | 7:1 | ✓ |
| dept·terracota texto | `--dept-terracota-ink` #D79582 | `--surface` #000000 | 8.51:1 | 7:1 | ✓ |
| dept·terracota texto na etiqueta | `--dept-terracota-ink` #D79582 | `--dept-terracota-soft` #000000 | 8.51:1 | 7:1 | ✓ |
| dept·terracota texto (surface-2) | `--dept-terracota-ink` #D79582 | `--surface-2` #0F0F0F | 7.77:1 | 7:1 | ✓ |
| dept·terracota glifo/borda (não-texto ≥ 3:1) | `--dept-terracota` #D79582 | `--surface` #000000 | 8.51:1 | 3:1 | ✓ |
| dept·terracota texto sobre a cor cheia | `--on-dept-terracota` #0B0D10 | `--dept-terracota` #D79582 | 7.89:1 | 7:1 | ✓ |
| dept·ardosia texto | `--dept-ardosia-ink` #90A6C6 | `--surface` #000000 | 8.46:1 | 7:1 | ✓ |
| dept·ardosia texto na etiqueta | `--dept-ardosia-ink` #90A6C6 | `--dept-ardosia-soft` #000000 | 8.46:1 | 7:1 | ✓ |
| dept·ardosia texto (surface-2) | `--dept-ardosia-ink` #90A6C6 | `--surface-2` #0F0F0F | 7.72:1 | 7:1 | ✓ |
| dept·ardosia glifo/borda (não-texto ≥ 3:1) | `--dept-ardosia` #90A6C6 | `--surface` #000000 | 8.46:1 | 3:1 | ✓ |
| dept·ardosia texto sobre a cor cheia | `--on-dept-ardosia` #0B0D10 | `--dept-ardosia` #90A6C6 | 7.83:1 | 7:1 | ✓ |
| dept·pinhao texto | `--dept-pinhao-ink` #CA9C72 | `--surface` #000000 | 8.51:1 | 7:1 | ✓ |
| dept·pinhao texto na etiqueta | `--dept-pinhao-ink` #CA9C72 | `--dept-pinhao-soft` #000000 | 8.51:1 | 7:1 | ✓ |
| dept·pinhao texto (surface-2) | `--dept-pinhao-ink` #CA9C72 | `--surface-2` #0F0F0F | 7.77:1 | 7:1 | ✓ |
| dept·pinhao glifo/borda (não-texto ≥ 3:1) | `--dept-pinhao` #CA9C72 | `--surface` #000000 | 8.51:1 | 3:1 | ✓ |
| dept·pinhao texto sobre a cor cheia | `--on-dept-pinhao` #0B0D10 | `--dept-pinhao` #CA9C72 | 7.88:1 | 7:1 | ✓ |
| dept·cinza-pedra texto | `--dept-cinza-pedra-ink` #A0A5AD | `--surface` #000000 | 8.48:1 | 7:1 | ✓ |
| dept·cinza-pedra texto na etiqueta | `--dept-cinza-pedra-ink` #A0A5AD | `--dept-cinza-pedra-soft` #000000 | 8.48:1 | 7:1 | ✓ |
| dept·cinza-pedra texto (surface-2) | `--dept-cinza-pedra-ink` #A0A5AD | `--surface-2` #0F0F0F | 7.74:1 | 7:1 | ✓ |
| dept·cinza-pedra glifo/borda (não-texto ≥ 3:1) | `--dept-cinza-pedra` #A0A5AD | `--surface` #000000 | 8.48:1 | 3:1 | ✓ |
| dept·cinza-pedra texto sobre a cor cheia | `--on-dept-cinza-pedra` #0B0D10 | `--dept-cinza-pedra` #A0A5AD | 7.86:1 | 7:1 | ✓ |
| foco (anel) sobre surface (≥ 3:1) | `--focus` #FFFF00 | `--surface` #000000 | 19.56:1 | 3:1 | ✓ |
| foco sobre ground (≥ 3:1) | `--focus` #FFFF00 | `--ground` #000000 | 19.56:1 | 3:1 | ✓ |
| linha forte (≥ 3:1) | `--line` #FFFFFF | `--surface` #000000 | 21.00:1 | 3:1 | ✓ |
| carimbo VALIDADO (tinta verde) sobre surface | `--class-consenso-ink` #37BB6C | `--surface` #000000 | 8.49:1 | 7:1 | ✓ |
| carimbo DEVOLVIDO (tinta vermelha) | `--class-risco-ink` #E58D91 | `--surface` #000000 | 8.55:1 | 7:1 | ✓ |
| lacre dourado: aro contra o card (≥ 3:1) | `--seal-gold-edge` #FFFFFF | `--surface` #000000 | 21.00:1 | 3:1 | ✓ |
| lacre azul-marinho: aro contra o card (≥ 3:1) | `--seal-navy-edge` #FFFFFF | `--surface` #000000 | 21.00:1 | 3:1 | ✓ |
| fita vermelha da Excelência (≥ 3:1) | `--seal-ribbon` #FF8080 | `--surface` #000000 | 8.65:1 | 3:1 | ✓ |

### Blueprint (`data-theme="blueprint"`) — 183 pares, mínimo 3.00:1

| Uso | Frente | Fundo | Razão | Limite | OK |
|---|---|---|---|---|---|
| texto principal | `--ink` #EAF2FF | `--surface` #0F3260 | 11.33:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #B5CBEA | `--surface` #0F3260 | 7.72:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #EAF2FF | `--surface-2` #143A6C | 10.07:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #B5CBEA | `--surface-2` #143A6C | 6.86:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #EAF2FF | `--surface-3` #1A4479 | 8.68:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #B5CBEA | `--surface-3` #1A4479 | 5.91:1 | 4.5:1 | ✓ |
| texto principal | `--ink` #EAF2FF | `--ground` #0A2748 | 13.35:1 | 4.5:1 | ✓ |
| texto secundário | `--muted` #B5CBEA | `--ground` #0A2748 | 9.09:1 | 4.5:1 | ✓ |
| texto terciário (placeholder) | `--faint` #A1BBDF | `--surface` #0F3260 | 6.50:1 | 4.5:1 | ✓ |
| texto sobre botão primário | `--on-primary` #07203F | `--primary` #8EC5FF | 9.00:1 | 4.5:1 | ✓ |
| link / texto primário | `--primary-ink` #8EC5FF | `--surface` #0F3260 | 7.04:1 | 4.5:1 | ✓ |
| texto primário na etiqueta | `--primary-ink` #8EC5FF | `--primary-soft` #1E4B82 | 4.86:1 | 4.5:1 | ✓ |
| texto sobre botão secundário | `--on-secondary` #06301A | `--secondary` #7FE3A6 | 9.30:1 | 4.5:1 | ✓ |
| texto secundário (verde) | `--secondary-ink` #7FE3A6 | `--surface` #0F3260 | 8.17:1 | 4.5:1 | ✓ |
| texto da faísca ("gerado por IA") | `--spark-ink` #F0B442 | `--surface` #0F3260 | 6.87:1 | 4.5:1 | ✓ |
| texto da faísca na etiqueta | `--spark-ink` #F0B442 | `--spark-soft` #4A4F4A | 4.51:1 | 4.5:1 | ✓ |
| glifo ✦ (não-texto ≥ 3:1) | `--spark` #E39B12 | `--surface` #0F3260 | 5.45:1 | 3:1 | ✓ |
| class·argumento texto | `--class-argumento-ink` #88B7E3 | `--surface` #0F3260 | 6.03:1 | 4.5:1 | ✓ |
| class·argumento texto na etiqueta | `--class-argumento-ink` #88B7E3 | `--class-argumento-soft` #18467C | 4.50:1 | 4.5:1 | ✓ |
| class·argumento texto (surface-2) | `--class-argumento-ink` #88B7E3 | `--surface-2` #143A6C | 5.36:1 | 4.5:1 | ✓ |
| class·argumento glifo/borda (não-texto ≥ 3:1) | `--class-argumento` #307EC8 | `--surface` #0F3260 | 3.00:1 | 3:1 | ✓ |
| class·argumento texto sobre a cor cheia | `--on-class-argumento` #0B0D10 | `--class-argumento` #307EC8 | 4.58:1 | 4.5:1 | ✓ |
| class·divergencia texto | `--class-divergencia-ink` #F0A46A | `--surface` #0F3260 | 6.21:1 | 4.5:1 | ✓ |
| class·divergencia texto na etiqueta | `--class-divergencia-ink` #F0A46A | `--class-divergencia-soft` #4C454E | 4.51:1 | 4.5:1 | ✓ |
| class·divergencia texto (surface-2) | `--class-divergencia-ink` #F0A46A | `--surface-2` #143A6C | 5.52:1 | 4.5:1 | ✓ |
| class·divergencia glifo/borda (não-texto ≥ 3:1) | `--class-divergencia` #E8761E | `--surface` #0F3260 | 4.28:1 | 3:1 | ✓ |
| class·divergencia texto sobre a cor cheia | `--on-class-divergencia` #0B0D10 | `--class-divergencia` #E8761E | 6.52:1 | 4.5:1 | ✓ |
| class·risco texto | `--class-risco-ink` #E58B8F | `--surface` #0F3260 | 5.12:1 | 4.5:1 | ✓ |
| class·risco texto na etiqueta | `--class-risco-ink` #E58B8F | `--class-risco-soft` #453355 | 4.53:1 | 4.5:1 | ✓ |
| class·risco texto (surface-2) | `--class-risco-ink` #E58B8F | `--surface-2` #143A6C | 4.55:1 | 4.5:1 | ✓ |
| class·risco glifo/borda (não-texto ≥ 3:1) | `--class-risco` #D64B50 | `--surface` #0F3260 | 3.03:1 | 3:1 | ✓ |
| class·risco texto sobre a cor cheia | `--on-class-risco` #0B0D10 | `--class-risco` #D64B50 | 4.62:1 | 4.5:1 | ✓ |
| class·consenso texto | `--class-consenso-ink` #57CE87 | `--surface` #0F3260 | 6.43:1 | 4.5:1 | ✓ |
| class·consenso texto na etiqueta | `--class-consenso-ink` #57CE87 | `--class-consenso-soft` #18505F | 4.50:1 | 4.5:1 | ✓ |
| class·consenso texto (surface-2) | `--class-consenso-ink` #57CE87 | `--surface-2` #143A6C | 5.72:1 | 4.5:1 | ✓ |
| class·consenso glifo/borda (não-texto ≥ 3:1) | `--class-consenso` #2E9D5B | `--surface` #0F3260 | 3.70:1 | 3:1 | ✓ |
| class·consenso texto sobre a cor cheia | `--on-class-consenso` #0B0D10 | `--class-consenso` #2E9D5B | 5.64:1 | 4.5:1 | ✓ |
| class·pergunta texto | `--class-pergunta-ink` #B8A0E0 | `--surface` #0F3260 | 5.56:1 | 4.5:1 | ✓ |
| class·pergunta texto na etiqueta | `--class-pergunta-ink` #B8A0E0 | `--class-pergunta-soft` #2D3A7D | 4.54:1 | 4.5:1 | ✓ |
| class·pergunta texto (surface-2) | `--class-pergunta-ink` #B8A0E0 | `--surface-2` #143A6C | 4.94:1 | 4.5:1 | ✓ |
| class·pergunta glifo/borda (não-texto ≥ 3:1) | `--class-pergunta` #8E68CE | `--surface` #0F3260 | 3.05:1 | 3:1 | ✓ |
| class·pergunta texto sobre a cor cheia | `--on-class-pergunta` #0B0D10 | `--class-pergunta` #8E68CE | 4.65:1 | 4.5:1 | ✓ |
| class·ruido texto | `--class-ruido-ink` #B8BCC1 | `--surface` #0F3260 | 6.69:1 | 4.5:1 | ✓ |
| class·ruido texto na etiqueta | `--class-ruido-ink` #B8BCC1 | `--class-ruido-soft` #324D71 | 4.52:1 | 4.5:1 | ✓ |
| class·ruido texto (surface-2) | `--class-ruido-ink` #B8BCC1 | `--surface-2` #143A6C | 5.94:1 | 4.5:1 | ✓ |
| class·ruido glifo/borda (não-texto ≥ 3:1) | `--class-ruido` #8C939B | `--surface` #0F3260 | 4.11:1 | 3:1 | ✓ |
| class·ruido texto sobre a cor cheia | `--on-class-ruido` #0B0D10 | `--class-ruido` #8C939B | 6.27:1 | 4.5:1 | ✓ |
| type·texto-manual texto | `--type-texto-manual-ink` #9FA6B1 | `--surface` #0F3260 | 5.20:1 | 4.5:1 | ✓ |
| type·texto-manual texto na etiqueta | `--type-texto-manual-ink` #9FA6B1 | `--type-texto-manual-soft` #213C60 | 4.56:1 | 4.5:1 | ✓ |
| type·texto-manual texto (surface-2) | `--type-texto-manual-ink` #9FA6B1 | `--surface-2` #143A6C | 4.63:1 | 4.5:1 | ✓ |
| type·texto-manual glifo/borda (não-texto ≥ 3:1) | `--type-texto-manual` #747D8D | `--surface` #0F3260 | 3.08:1 | 3:1 | ✓ |
| type·texto-ia texto | `--type-texto-ia-ink` #F0B442 | `--surface` #0F3260 | 6.87:1 | 4.5:1 | ✓ |
| type·texto-ia texto na etiqueta | `--type-texto-ia-ink` #F0B442 | `--type-texto-ia-soft` #4A4F4A | 4.51:1 | 4.5:1 | ✓ |
| type·texto-ia texto (surface-2) | `--type-texto-ia-ink` #F0B442 | `--surface-2` #143A6C | 6.11:1 | 4.5:1 | ✓ |
| type·texto-ia glifo/borda (não-texto ≥ 3:1) | `--type-texto-ia` #E39B12 | `--surface` #0F3260 | 5.45:1 | 3:1 | ✓ |
| type·imagem-web texto | `--type-imagem-web-ink` #88B7E3 | `--surface` #0F3260 | 6.03:1 | 4.5:1 | ✓ |
| type·imagem-web texto na etiqueta | `--type-imagem-web-ink` #88B7E3 | `--type-imagem-web-soft` #18467C | 4.50:1 | 4.5:1 | ✓ |
| type·imagem-web texto (surface-2) | `--type-imagem-web-ink` #88B7E3 | `--surface-2` #143A6C | 5.36:1 | 4.5:1 | ✓ |
| type·imagem-web glifo/borda (não-texto ≥ 3:1) | `--type-imagem-web` #307EC8 | `--surface` #0F3260 | 3.00:1 | 3:1 | ✓ |
| type·imagem-editada texto | `--type-imagem-editada-ink` #BFA5E8 | `--surface` #0F3260 | 5.93:1 | 4.5:1 | ✓ |
| type·imagem-editada texto na etiqueta | `--type-imagem-editada-ink` #BFA5E8 | `--type-imagem-editada-soft` #313E81 | 4.57:1 | 4.5:1 | ✓ |
| type·imagem-editada texto (surface-2) | `--type-imagem-editada-ink` #BFA5E8 | `--surface-2` #143A6C | 5.27:1 | 4.5:1 | ✓ |
| type·imagem-editada glifo/borda (não-texto ≥ 3:1) | `--type-imagem-editada` #9064D8 | `--surface` #0F3260 | 3.04:1 | 3:1 | ✓ |
| type·planilha texto | `--type-planilha-ink` #57CE87 | `--surface` #0F3260 | 6.43:1 | 4.5:1 | ✓ |
| type·planilha texto na etiqueta | `--type-planilha-ink` #57CE87 | `--type-planilha-soft` #18505F | 4.50:1 | 4.5:1 | ✓ |
| type·planilha texto (surface-2) | `--type-planilha-ink` #57CE87 | `--surface-2` #143A6C | 5.72:1 | 4.5:1 | ✓ |
| type·planilha glifo/borda (não-texto ≥ 3:1) | `--type-planilha` #2E9D5B | `--surface` #0F3260 | 3.70:1 | 3:1 | ✓ |
| type·documento texto | `--type-documento-ink` #ACB0B9 | `--surface` #0F3260 | 5.87:1 | 4.5:1 | ✓ |
| type·documento texto na etiqueta | `--type-documento-ink` #ACB0B9 | `--type-documento-soft` #294469 | 4.55:1 | 4.5:1 | ✓ |
| type·documento texto (surface-2) | `--type-documento-ink` #ACB0B9 | `--surface-2` #143A6C | 5.22:1 | 4.5:1 | ✓ |
| type·documento glifo/borda (não-texto ≥ 3:1) | `--type-documento` #747C8B | `--surface` #0F3260 | 3.04:1 | 3:1 | ✓ |
| type·pasta texto | `--type-pasta-ink` #CCA178 | `--surface` #0F3260 | 5.43:1 | 4.5:1 | ✓ |
| type·pasta texto na etiqueta | `--type-pasta-ink` #CCA178 | `--type-pasta-soft` #323E54 | 4.58:1 | 4.5:1 | ✓ |
| type·pasta texto (surface-2) | `--type-pasta-ink` #CCA178 | `--surface-2` #143A6C | 4.83:1 | 4.5:1 | ✓ |
| type·pasta glifo/borda (não-texto ≥ 3:1) | `--type-pasta` #A5703E | `--surface` #0F3260 | 3.03:1 | 3:1 | ✓ |
| type·link texto | `--type-link-ink` #14C8E8 | `--surface` #0F3260 | 6.35:1 | 4.5:1 | ✓ |
| type·link texto na etiqueta | `--type-link-ink` #14C8E8 | `--type-link-soft` #0F4C74 | 4.53:1 | 4.5:1 | ✓ |
| type·link texto (surface-2) | `--type-link-ink` #14C8E8 | `--surface-2` #143A6C | 5.65:1 | 4.5:1 | ✓ |
| type·link glifo/borda (não-texto ≥ 3:1) | `--type-link` #0E8FA6 | `--surface` #0F3260 | 3.34:1 | 3:1 | ✓ |
| type·desenho-tecnico texto | `--type-desenho-tecnico-ink` #EDA06C | `--surface` #0F3260 | 5.98:1 | 4.5:1 | ✓ |
| type·desenho-tecnico texto na etiqueta | `--type-desenho-tecnico-ink` #EDA06C | `--type-desenho-tecnico-soft` #4A424D | 4.52:1 | 4.5:1 | ✓ |
| type·desenho-tecnico texto (surface-2) | `--type-desenho-tecnico-ink` #EDA06C | `--surface-2` #143A6C | 5.32:1 | 4.5:1 | ✓ |
| type·desenho-tecnico glifo/borda (não-texto ≥ 3:1) | `--type-desenho-tecnico` #E06A1B | `--surface` #0F3260 | 3.80:1 | 3:1 | ✓ |
| type·formulario texto | `--type-formulario-ink` #17C6BA | `--surface` #0F3260 | 5.97:1 | 4.5:1 | ✓ |
| type·formulario texto na etiqueta | `--type-formulario-ink` #17C6BA | `--type-formulario-soft` #0F4866 | 4.59:1 | 4.5:1 | ✓ |
| type·formulario texto (surface-2) | `--type-formulario-ink` #17C6BA | `--surface-2` #143A6C | 5.31:1 | 4.5:1 | ✓ |
| type·formulario glifo/borda (não-texto ≥ 3:1) | `--type-formulario` #108B82 | `--surface` #0F3260 | 3.06:1 | 3:1 | ✓ |
| type·ata-registro texto | `--type-ata-registro-ink` #ED8594 | `--surface` #0F3260 | 5.09:1 | 4.5:1 | ✓ |
| type·ata-registro texto na etiqueta | `--type-ata-registro-ink` #ED8594 | `--type-ata-registro-soft` #392B52 | 5.11:1 | 4.5:1 | ✓ |
| type·ata-registro texto (surface-2) | `--type-ata-registro-ink` #ED8594 | `--surface-2` #143A6C | 4.53:1 | 4.5:1 | ✓ |
| type·ata-registro glifo/borda (não-texto ≥ 3:1) | `--type-ata-registro` #E23C54 | `--surface` #0F3260 | 3.04:1 | 3:1 | ✓ |
| type·email texto | `--type-email-ink` #9EB1CD | `--surface` #0F3260 | 5.85:1 | 4.5:1 | ✓ |
| type·email texto na etiqueta | `--type-email-ink` #9EB1CD | `--type-email-soft` #214370 | 4.58:1 | 4.5:1 | ✓ |
| type·email texto (surface-2) | `--type-email-ink` #9EB1CD | `--surface-2` #143A6C | 5.20:1 | 4.5:1 | ✓ |
| type·email glifo/borda (não-texto ≥ 3:1) | `--type-email` #5E7DAC | `--surface` #0F3260 | 3.04:1 | 3:1 | ✓ |
| type·protocolo texto | `--type-protocolo-ink` #A2BB43 | `--surface` #0F3260 | 5.91:1 | 4.5:1 | ✓ |
| type·protocolo texto na etiqueta | `--type-protocolo-ink` #A2BB43 | `--type-protocolo-soft` #2A4852 | 4.53:1 | 4.5:1 | ✓ |
| type·protocolo texto (surface-2) | `--type-protocolo-ink` #A2BB43 | `--surface-2` #143A6C | 5.25:1 | 4.5:1 | ✓ |
| type·protocolo glifo/borda (não-texto ≥ 3:1) | `--type-protocolo` #71832F | `--surface` #0F3260 | 3.03:1 | 3:1 | ✓ |
| type·cronograma texto | `--type-cronograma-ink` #9CA6DC | `--surface` #0F3260 | 5.41:1 | 4.5:1 | ✓ |
| type·cronograma texto na etiqueta | `--type-cronograma-ink` #9CA6DC | `--type-cronograma-soft` #1C3B78 | 4.57:1 | 4.5:1 | ✓ |
| type·cronograma texto (surface-2) | `--type-cronograma-ink` #9CA6DC | `--surface-2` #143A6C | 4.81:1 | 4.5:1 | ✓ |
| type·cronograma glifo/borda (não-texto ≥ 3:1) | `--type-cronograma` #6776CA | `--surface` #0F3260 | 3.05:1 | 3:1 | ✓ |
| type·estudo-tecnico-preliminar texto | `--type-estudo-tecnico-preliminar-ink` #D191B6 | `--surface` #0F3260 | 5.13:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar texto na etiqueta | `--type-estudo-tecnico-preliminar-ink` #D191B6 | `--type-estudo-tecnico-preliminar-soft` #333563 | 4.61:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar texto (surface-2) | `--type-estudo-tecnico-preliminar-ink` #D191B6 | `--surface-2` #143A6C | 4.56:1 | 4.5:1 | ✓ |
| type·estudo-tecnico-preliminar glifo/borda (não-texto ≥ 3:1) | `--type-estudo-tecnico-preliminar` #BB5B92 | `--surface` #0F3260 | 3.05:1 | 3:1 | ✓ |
| ext·docx texto | `--ext-docx-ink` #85A8DC | `--surface` #0F3260 | 5.25:1 | 4.5:1 | ✓ |
| ext·docx texto na etiqueta | `--ext-docx-ink` #85A8DC | `--ext-docx-soft` #173C6F | 4.51:1 | 4.5:1 | ✓ |
| ext·docx texto (surface-2) | `--ext-docx-ink` #85A8DC | `--surface-2` #143A6C | 4.66:1 | 4.5:1 | ✓ |
| ext·docx glifo/borda (não-texto ≥ 3:1) | `--ext-docx` #457BCA | `--surface` #0F3260 | 3.00:1 | 3:1 | ✓ |
| ext·pdf texto | `--ext-pdf-ink` #E58C86 | `--surface` #0F3260 | 5.12:1 | 4.5:1 | ✓ |
| ext·pdf texto na etiqueta | `--ext-pdf-ink` #E58C86 | `--ext-pdf-soft` #433351 | 4.60:1 | 4.5:1 | ✓ |
| ext·pdf texto (surface-2) | `--ext-pdf-ink` #E58C86 | `--surface-2` #143A6C | 4.55:1 | 4.5:1 | ✓ |
| ext·pdf glifo/borda (não-texto ≥ 3:1) | `--ext-pdf` #D74C43 | `--surface` #0F3260 | 3.04:1 | 3:1 | ✓ |
| ext·xlsx texto | `--ext-xlsx-ink` #33C273 | `--surface` #0F3260 | 5.53:1 | 4.5:1 | ✓ |
| ext·xlsx texto na etiqueta | `--ext-xlsx-ink` #33C273 | `--ext-xlsx-soft` #134358 | 4.62:1 | 4.5:1 | ✓ |
| ext·xlsx texto (surface-2) | `--ext-xlsx-ink` #33C273 | `--surface-2` #143A6C | 4.92:1 | 4.5:1 | ✓ |
| ext·xlsx glifo/borda (não-texto ≥ 3:1) | `--ext-xlsx` #258D54 | `--surface` #0F3260 | 3.05:1 | 3:1 | ✓ |
| ext·pptx texto | `--ext-pptx-ink` #EB8D6F | `--surface` #0F3260 | 5.21:1 | 4.5:1 | ✓ |
| ext·pptx texto na etiqueta | `--ext-pptx-ink` #EB8D6F | `--ext-pptx-soft` #42374D | 4.55:1 | 4.5:1 | ✓ |
| ext·pptx texto (surface-2) | `--ext-pptx-ink` #EB8D6F | `--surface-2` #143A6C | 4.63:1 | 4.5:1 | ✓ |
| ext·pptx glifo/borda (não-texto ≥ 3:1) | `--ext-pptx` #D84B1E | `--surface` #0F3260 | 3.01:1 | 3:1 | ✓ |
| ext·md texto | `--ext-md-ink` #B2B5BA | `--surface` #0F3260 | 6.21:1 | 4.5:1 | ✓ |
| ext·md texto na etiqueta | `--ext-md-ink` #B2B5BA | `--ext-md-soft` #2D486B | 4.54:1 | 4.5:1 | ✓ |
| ext·md texto (surface-2) | `--ext-md-ink` #B2B5BA | `--surface-2` #143A6C | 5.52:1 | 4.5:1 | ✓ |
| ext·md glifo/borda (não-texto ≥ 3:1) | `--ext-md` #7A7F87 | `--surface` #0F3260 | 3.17:1 | 3:1 | ✓ |
| due·soon texto | `--due-soon-ink` #F4AD2F | `--surface` #0F3260 | 6.60:1 | 4.5:1 | ✓ |
| due·soon texto na etiqueta | `--due-soon-ink` #F4AD2F | `--due-soon-soft` #484C48 | 4.52:1 | 4.5:1 | ✓ |
| due·soon texto (surface-2) | `--due-soon-ink` #F4AD2F | `--surface-2` #143A6C | 5.87:1 | 4.5:1 | ✓ |
| due·soon glifo/borda (não-texto ≥ 3:1) | `--due-soon` #D98E0B | `--surface` #0F3260 | 4.76:1 | 3:1 | ✓ |
| due·over texto | `--due-over-ink` #E78989 | `--surface` #0F3260 | 5.07:1 | 4.5:1 | ✓ |
| due·over texto na etiqueta | `--due-over-ink` #E78989 | `--due-over-soft` #422F50 | 4.75:1 | 4.5:1 | ✓ |
| due·over texto (surface-2) | `--due-over-ink` #E78989 | `--surface-2` #143A6C | 4.50:1 | 4.5:1 | ✓ |
| due·over glifo/borda (não-texto ≥ 3:1) | `--due-over` #DA4747 | `--surface` #0F3260 | 3.02:1 | 3:1 | ✓ |
| dept·gralha-azul texto | `--dept-gralha-azul-ink` #71A7E3 | `--surface` #0F3260 | 5.07:1 | 4.5:1 | ✓ |
| dept·gralha-azul texto na etiqueta | `--dept-gralha-azul-ink` #71A7E3 | `--dept-gralha-azul-soft` #123A6C | 4.51:1 | 4.5:1 | ✓ |
| dept·gralha-azul texto (surface-2) | `--dept-gralha-azul-ink` #71A7E3 | `--surface-2` #143A6C | 4.50:1 | 4.5:1 | ✓ |
| dept·gralha-azul glifo/borda (não-texto ≥ 3:1) | `--dept-gralha-azul` #2D7CD6 | `--surface` #0F3260 | 3.02:1 | 3:1 | ✓ |
| dept·gralha-azul texto sobre a cor cheia | `--on-dept-gralha-azul` #0B0D10 | `--dept-gralha-azul` #2D7CD6 | 4.60:1 | 4.5:1 | ✓ |
| dept·araucaria texto | `--dept-araucaria-ink` #33C579 | `--surface` #0F3260 | 5.71:1 | 4.5:1 | ✓ |
| dept·araucaria texto na etiqueta | `--dept-araucaria-ink` #33C579 | `--dept-araucaria-soft` #13465A | 4.58:1 | 4.5:1 | ✓ |
| dept·araucaria texto (surface-2) | `--dept-araucaria-ink` #33C579 | `--surface-2` #143A6C | 5.08:1 | 4.5:1 | ✓ |
| dept·araucaria glifo/borda (não-texto ≥ 3:1) | `--dept-araucaria` #248C56 | `--surface` #0F3260 | 3.01:1 | 3:1 | ✓ |
| dept·araucaria texto sobre a cor cheia | `--on-dept-araucaria` #0B0D10 | `--dept-araucaria` #248C56 | 4.60:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto | `--dept-ipe-roxo-ink` #B8A0E0 | `--surface` #0F3260 | 5.56:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto na etiqueta | `--dept-ipe-roxo-ink` #B8A0E0 | `--dept-ipe-roxo-soft` #2D3A7D | 4.54:1 | 4.5:1 | ✓ |
| dept·ipe-roxo texto (surface-2) | `--dept-ipe-roxo-ink` #B8A0E0 | `--surface-2` #143A6C | 4.94:1 | 4.5:1 | ✓ |
| dept·ipe-roxo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-roxo` #8E68CE | `--surface` #0F3260 | 3.05:1 | 3:1 | ✓ |
| dept·ipe-roxo texto sobre a cor cheia | `--on-dept-ipe-roxo` #0B0D10 | `--dept-ipe-roxo` #8E68CE | 4.65:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto | `--dept-ipe-amarelo-ink` #F4AD2F | `--surface` #0F3260 | 6.60:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto na etiqueta | `--dept-ipe-amarelo-ink` #F4AD2F | `--dept-ipe-amarelo-soft` #484C48 | 4.52:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo texto (surface-2) | `--dept-ipe-amarelo-ink` #F4AD2F | `--surface-2` #143A6C | 5.87:1 | 4.5:1 | ✓ |
| dept·ipe-amarelo glifo/borda (não-texto ≥ 3:1) | `--dept-ipe-amarelo` #D98E0B | `--surface` #0F3260 | 4.76:1 | 3:1 | ✓ |
| dept·ipe-amarelo texto sobre a cor cheia | `--on-dept-ipe-amarelo` #0B0D10 | `--dept-ipe-amarelo` #D98E0B | 7.25:1 | 4.5:1 | ✓ |
| dept·terracota texto | `--dept-terracota-ink` #D89A88 | `--surface` #0F3260 | 5.41:1 | 4.5:1 | ✓ |
| dept·terracota texto na etiqueta | `--dept-terracota-ink` #D89A88 | `--dept-terracota-soft` #3D3C55 | 4.50:1 | 4.5:1 | ✓ |
| dept·terracota texto (surface-2) | `--dept-terracota-ink` #D89A88 | `--surface-2` #143A6C | 4.81:1 | 4.5:1 | ✓ |
| dept·terracota glifo/borda (não-texto ≥ 3:1) | `--dept-terracota` #C25F43 | `--surface` #0F3260 | 3.05:1 | 3:1 | ✓ |
| dept·terracota texto sobre a cor cheia | `--on-dept-terracota` #0B0D10 | `--dept-terracota` #C25F43 | 4.64:1 | 4.5:1 | ✓ |
| dept·ardosia texto | `--dept-ardosia-ink` #9EB1CD | `--surface` #0F3260 | 5.85:1 | 4.5:1 | ✓ |
| dept·ardosia texto na etiqueta | `--dept-ardosia-ink` #9EB1CD | `--dept-ardosia-soft` #214370 | 4.58:1 | 4.5:1 | ✓ |
| dept·ardosia texto (surface-2) | `--dept-ardosia-ink` #9EB1CD | `--surface-2` #143A6C | 5.20:1 | 4.5:1 | ✓ |
| dept·ardosia glifo/borda (não-texto ≥ 3:1) | `--dept-ardosia` #5E7DAC | `--surface` #0F3260 | 3.04:1 | 3:1 | ✓ |
| dept·ardosia texto sobre a cor cheia | `--on-dept-ardosia` #0B0D10 | `--dept-ardosia` #5E7DAC | 4.64:1 | 4.5:1 | ✓ |
| dept·pinhao texto | `--dept-pinhao-ink` #CCA178 | `--surface` #0F3260 | 5.43:1 | 4.5:1 | ✓ |
| dept·pinhao texto na etiqueta | `--dept-pinhao-ink` #CCA178 | `--dept-pinhao-soft` #323E54 | 4.58:1 | 4.5:1 | ✓ |
| dept·pinhao texto (surface-2) | `--dept-pinhao-ink` #CCA178 | `--surface-2` #143A6C | 4.83:1 | 4.5:1 | ✓ |
| dept·pinhao glifo/borda (não-texto ≥ 3:1) | `--dept-pinhao` #A5703E | `--surface` #0F3260 | 3.03:1 | 3:1 | ✓ |
| dept·pinhao texto sobre a cor cheia | `--on-dept-pinhao` #0B0D10 | `--dept-pinhao` #A5703E | 4.62:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto | `--dept-cinza-pedra-ink` #A4A9B1 | `--surface` #0F3260 | 5.40:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto na etiqueta | `--dept-cinza-pedra-ink` #A4A9B1 | `--dept-cinza-pedra-soft` #243F63 | 4.52:1 | 4.5:1 | ✓ |
| dept·cinza-pedra texto (surface-2) | `--dept-cinza-pedra-ink` #A4A9B1 | `--surface-2` #143A6C | 4.80:1 | 4.5:1 | ✓ |
| dept·cinza-pedra glifo/borda (não-texto ≥ 3:1) | `--dept-cinza-pedra` #747C87 | `--surface` #0F3260 | 3.02:1 | 3:1 | ✓ |
| dept·cinza-pedra texto sobre a cor cheia | `--on-dept-cinza-pedra` #0B0D10 | `--dept-cinza-pedra` #747C87 | 4.61:1 | 4.5:1 | ✓ |
| foco (anel) sobre surface (≥ 3:1) | `--focus` #FFD166 | `--surface` #0F3260 | 8.85:1 | 3:1 | ✓ |
| foco sobre ground (≥ 3:1) | `--focus` #FFD166 | `--ground` #0A2748 | 10.43:1 | 3:1 | ✓ |
| linha forte (≥ 3:1) | `--line` #DCE9FB | `--surface` #0F3260 | 10.39:1 | 3:1 | ✓ |
| carimbo VALIDADO (tinta verde) sobre surface | `--class-consenso-ink` #57CE87 | `--surface` #0F3260 | 6.43:1 | 4.5:1 | ✓ |
| carimbo DEVOLVIDO (tinta vermelha) | `--class-risco-ink` #E58B8F | `--surface` #0F3260 | 5.12:1 | 4.5:1 | ✓ |
| lacre dourado: aro contra o card (≥ 3:1) | `--seal-gold-edge` #F6E39A | `--surface` #0F3260 | 9.95:1 | 3:1 | ✓ |
| lacre azul-marinho: aro contra o card (≥ 3:1) | `--seal-navy-edge` #DCE9FB | `--surface` #0F3260 | 10.39:1 | 3:1 | ✓ |
| fita vermelha da Excelência (≥ 3:1) | `--seal-ribbon` #FF8A8A | `--surface` #0F3260 | 5.62:1 | 3:1 | ✓ |

<!-- contraste:fim -->

## 3. Catálogo de componentes (`components/ui`, implementação real da etapa (b))
Classes de referência em [`components.css`](components.css); em React cada um é um componente tipado em **`components/ui/`** (sem pacote separado por enquanto — D-30: `packages/ui` fica para quando houver um 2º app), sobre radix (`@radix-ui/react-{dialog,popover,tooltip,tabs,switch,checkbox,radio-group,toast}`, versões fixas) e tokens **v2 `--ws-*`** (`styles/tokens-ws.css`, cópia de [`tokens-ws.css`](tokens-ws.css) guardada por teste). Regras gerais: ícone sempre com rótulo (visível ou `aria-label`); estado sempre com nome em texto; foco visível com `--ws-focus-ring`; alvo mínimo 44 px em toque; **nenhuma cor literal** (ESLint + stylelint + teste de varredura).

**Implementado em `components/ui/` (etapa (b)):**

| Componente | Arquivo | Notas |
|---|---|---|
| `Button` (variants default · primary · gradient · secondary · ghost · danger · spark; sizes sm · md · lg · icon; `icon`, `busy`, `href`) · `IconButton` | `Button.tsx` | único lugar com `<button>`/`<a>` ao lado de `Link` e `Form` |
| `Glyph` (17 WS Glyphs, outline/clay) · `Moji` (9 WS Moji) | `glyphs/Glyph.tsx` + `glyphs/sprite.gen.ts` (gerado por `scripts/glyphs/gerar-sprite.mjs` dos SVGs de [`glyphs/`](glyphs/)) | rótulo i18n obrigatório (RF38.CA01) |
| `Avatar` · `Monogram` | `Avatar.tsx` | monograma do departamento na cor do nó |
| `Badge` · `Tag` · `RfChip` | `Badge.tsx` | tons semânticos por token; `count`, `dashed`, `pulse`, `filled` |
| `Tooltip` · `Popover` · `Dialog` · `Sheet` (left/right/bottom) | `Tooltip.tsx`, `Popover.tsx`, `Dialog.tsx` | radix: foco preso, Esc fecha, scrim `.ws-scrim` |
| `Tabs` (roles tablist/tab/tabpanel, setas, Home/End, `?tab=` na URL) | `Tabs.tsx` | sub-abas das Matrizes A–E |
| `Field` · `Input` · `Textarea` · `Select` · `Switch` · `Checkbox` · `RadioCards` · `SelectList` | `Form.tsx` | erro por campo via `aria-describedby` (422 `details`) |
| `Toast` (`ToastProvider`/`useToast`) · `EmptyState` · `ErrorState` · `LoadingState` · `Skeleton` | `Toast.tsx`, `States.tsx`, `Skeleton.tsx` | estados vazios com WS Moji; "tentar de novo" |
| `PercentBar` | `PercentBar.tsx` | "rumo à decisão" (DECIA_SESSAO_E_MESA §B.5), `role=progressbar` |
| `BackgroundArt` (catálogo `WS_BACKGROUNDS`: 6 artes Aura Geometry + 6 placeholders; skins da Mesa) | `BackgroundArt.tsx` + `backgrounds/aura.gen.ts` (gerado por `scripts/brand/gerar-fundos.mjs`) | tom pela luminância medida (D-34) |
| `Link` (inline · nav · card · plain) · `Card` · `MenuOption` | `Link.tsx`, `Card.tsx`, `Menu.tsx` | — |

Shell em **`components/shell/`**: `AppShell`, `TopBar` (busca `/`, Mensagens, sino `NotificationsBell`, ficha DP, `ThemeLanguageMenu`, `UserPanel` = Central de Perfil), `SidebarNav` (rail 72 px), `BottomNav`, `CreateSheet`, `PageHeader`, `RfPage` (página-esqueleto), `ProfileHeader`, `LabEmbed`, `Providers`. Os itens abaixo que ainda não têm componente (TypeChip, Due, Spark, Stamp, Seal, DpChip completo, Medal, PhaseBar, ProgressRing, Mosaic, TaskCard, ProjectCard, DecisionThread, PostIt, Counters, Confetti) chegam com os RFs que os usam.

| Componente | Props principais | Estados / variantes | RF |
|---|---|---|---|
| **Button** | `variant` primary · gradient · secondary · ghost · danger · spark; `size` sm·md·lg·icon; `icon` (nome do catálogo); `busy`, `disabled` | hover, active, busy (spinner no ícone), disabled | todos |
| **Ícones de ação** (SVG próprios) | `criar-tarefa`, `criar-projeto`, `abrir-decia`, `chancelar`, `oferecer-balcao`, `transformar-tarefa`, `validar-decisao`, `devolver-decisao` | 24 px, traço 1,8, `currentColor` | RF20, RF21, RF29, RF39, RF40, RF15 |
| **Tag** (etiqueta de protocolo) | `state` (TaskState) · `status` (ProjectStatus) · `class` (MessageClass) · `filled` · `pulse` | tracejado (RASCUNHO), sólido, pulso (EM_USO/EM_DECISAO), cadeado (BLOQUEADA), carimbo (CONCLUÍDA), esmaecido (ARQUIVADA), estrela (MODELO_PÚBLICO), ficha (OFERECIDA) | RF38.CA05, RF41 |
| **TypeChip** | `type` (TaskType), `ext` | ícone + nome do tipo, cor da família | RF38.CA01 |
| **Due** | `date`, `kind` ok·soon·over, `legal` | âmbar ≤ 3 dias, vermelho vencido, ⚖ prazo legal | RF38.CA05, RF41.CA04 |
| **Spark ✦** | `generatedAt`, `model`, `reviewedBy`, `busy` | tooltip "gerado por IA em [data] · revisado por [pessoa]"; anima enquanto gera | RF38.CA04 |
| **Stamp** (carimbo) | `kind` VALIDADO · DEVOLVIDO, `date`, `reviewer`, `reason`, `mini` | verde / vermelho, rotação −8°, borda 2,5 px | RF15, RF29.CA05, RF38.CA06 |
| **Seal** (lacre) | `issuer` empresa (dourado) · chefe (azul-marinho), `excellence` (fita vermelha), `broken`, `size` | tooltip emissor, critério (`SealBondBasis`), validade | RF39, RF38.CA06 |
| **DpChip** (ficha DP) | `points`, `delta` | faísca âmbar | RF42 |
| **Medal** | `name`, `issuer` | reconhecimento no perfil | RF35 |
| **PhaseBar** | `current` 0..6, `done[]`, `slots` (modo Criador com select por fase) | fase atual com aro, nome em texto | RF21, RF38 |
| **ProgressRing** | `value/total` | anel por fase na capa-mosaico | RF38.CA03 |
| **Mosaic** | `tiles[]` (≤ 6 thumbnails), `empty` | grid 2×3, pasta em branco quando vazio | RF38.CA03 |
| **TaskCard** | `task`, `layout` compact · list · expanded · attachment · mini, `family` protocolo · carimbo · pasta · blueprint · monograma | ver ANATOMIA_CARDS.md | RF20, RF41, RF29 |
| **ProjectCard** | `project`, `layout` mosaic · hero · mural · postit, `cover` mosaico · foto · ia | ver ANATOMIA_CARDS.md | RF21, RF27, RF22 |
| **SelectList** | `options[]` ({id, title, thumb, icon, state, disabledReason}), `multiple`, `searchable`, `phase` (filtro de compatibilidade), `onCreateNew` ("Cadastrar nova tarefa" abre RF20 em modal) | opção desabilitada com motivo (BLOQUEADA/ARQUIVADA), selecionada com check, busca por texto, teclado completo | RF21.CA03/CA07 |
| **DecisionThread** (fio de decisão) | `nodes[]` ({kind, class, label, actor, at, ref}), `stamp` | linha vertical, nós coloridos por classificação, carimbo no fim | RF29, RF38.CA07 |
| **SidebarNav** | `groups` Descobrir · Meu trabalho · Criar · Jogar e ganhar · Gestão; `collapsed`; `badges` | recolhível (rail 72 px), bottom-nav no celular | RF38.CA08 |
| **TopBar** | busca global, notificações (badge), DP (saldo), tema, idioma, conta | sticky, `--control-header` | RF27, RF42 |
| **BackgroundArt** | `skin` papel · cortica · blueprint · papel-timbrado | fundo da Mesa; salvo em `user_preferences.deskSkin` | RF22, RF38.CA08 |
| **PostIt** | `color`, `rotation`, `pinned` | tarefa na Mesa (canvas livre) | RF22.CA03 |
| **Avatar / Monogram** | `initials`, `src`, `dept` | monograma do departamento na cor | RF38.CA09 |
| **Counters** | likes, comments, saves, shares, remixes | linha de interações (RF26) | RF26.CA07 |
| **Toast · EmptyState · ErrorState · Skeleton** | `kind`, `illustration`, `retry` | empty states ilustrados (mesa vazia, pasta vazia, sessão sem mensagens); "tentar de novo" | RF27.CA01, RF41.CA01 |
| **Confetti** | disparado na decisão validada | discreto; respeita reduced-motion | RF38.CA10 |
| **Input / Select / Textarea / Checkbox / Switch** | radix | erro por campo (422 `details`) com mensagem i18n | RF20.CA14 |
| **Dialog / Sheet / Popover / Tooltip** | radix | foco preso, Esc fecha | — |

## 4. Ícones (66 glifos próprios)
Grupos: **tipos de tarefa** (16: folha com caneta, folha com faísca, moldura com globo, moldura com pincel, grade, pasta com aba, pasta com zíper, clipe, esquadro+compasso, cubo 3D, prancheta com check, carimbo, envelope, comprovante picotado, Gantt, folha com lupa) · **ações** (8) · **navegação** (11) · **estado/prazo/IA/chancela** (12) · **social e reações** (9: curtir, comentar, salvar, compartilhar, remixar, útil, bem fundamentado, inovador, conforme) · **chrome** (10). Sprite `<symbol id="ws-<nome>">` gerado por `icons.mjs`; nunca emoji do sistema (RF38.CA01).

## 5. Estrutura real (Next.js 15 + Tailwind 4 + radix) — etapa (b)
```
styles/tokens-ws.css             ← cópia de docs/design-system/tokens-ws.css (styles/tokens-ws.test.ts falha se divergir)
styles/preferences.css           ← data-density / data-font-scale (medidas, sem cor)
app/globals.css                  ← @theme inline: bg-ws-*/text-ws-*/border-ws-* ← var(--ws-*); medidas do shell; animações dos glifos
components/ui/                   ← design system (tabela do §3); index.ts exporta tudo
components/ui/glyphs/sprite.gen.ts        ← gerado: scripts/glyphs/gerar-sprite.mjs (teste scripts/glyphs/sprite.test.ts)
components/ui/backgrounds/aura.gen.ts     ← gerado: scripts/brand/gerar-fundos.mjs (artes em public/brand/backgrounds/)
components/shell/                ← AppShell, TopBar, SidebarNav, BottomNav, CreateSheet, PageHeader, RfPage, UserPanel…
lib/preferences/                 ← PreferencesProvider (RF3): lê local/API → data-theme/density/font-scale/reduce-motion/lang; bootScript com nonce
lib/viewer/                      ← perfil de VISUALIZAÇÃO do lab (D-32)
lib/nav/matrix.ts · lib/pages/registry.ts   ← Matriz A e registro rota → RF → acesso (ABAS_POR_PERFIL §11)
lib/rf/catalog.gen.ts            ← gerado: scripts/rf/gerar-catalogo.mjs dos READMEs (teste lib/rf/catalog.test.ts)
lib/i18n/messages/{pt-BR,en,es}.json        ← todos os rótulos (glifos, mojis, abas, preferências, erros)
```
`packages/ui` (pacote separado) fica para quando houver um segundo app (D-30). Tailwind consome os tokens via `@theme inline` (`--color-ws-accent: var(--ws-accent)` …); classes utilitárias só para layout; cor, tipo e raio sempre por token — classes de cor fixa do Tailwind (`bg-red-500`…) e `style={{ color: "#…" }}` são barradas pelo ESLint (`eslint.config.mjs`, fixture `scripts/lint-fixtures/color-literals.tsx`).

## 6. Página `/lab/design-system` (Storybook leve) — implementada
`app/(shell)/lab/design-system/page.tsx` renderiza, com os componentes reais, tokens (swatches lidos do CSS computado), tipografia, WS Glyphs/Moji, cada componente em todos os estados e os cards; tema/densidade/idioma trocam pela barra superior. `/lab/anatomias`, `/lab/perfis` e `/lab/decia` combinam componentes reais com os wireframes de `docs/lab/*.html` (cópia em `public/lab-static/`, incorporada sem scripts por causa da CSP). O smoke Playwright (`e2e/shell.spec.ts`) captura o shell, o sino, a Central de Perfil, `/settings` e `/lab/design-system` em `docs/testes/shell/`.

## 7. Acessibilidade (resumo)
Texto ≥ 4,5:1 (7:1 no alto contraste), glifos/bordas/foco ≥ 3:1 (tabela §2.9) · nome do estado e da cor em texto · ícone sempre com rótulo · ordem de Tab: um destino por link (a foto não é focável; o título é o link) · `prefers-reduced-motion` e `forced-colors` respeitados · alvos ≥ 44 px em toque · i18n em todos os rótulos.
