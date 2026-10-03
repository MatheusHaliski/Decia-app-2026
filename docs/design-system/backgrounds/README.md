# Artes de fundo — Work Station

As artes finais são **fornecidas pelo dono do produto**; este diretório só prepara o encaixe: catálogo tipado, placeholders gerados com tokens, miniaturas e seed. Nenhuma arte final foi gerada aqui.

```
backgrounds/
├── backgrounds.ts            ← catálogo (id, labelKey, file, thumb, tone, recommendedTheme, placeholder)
├── gerar.mjs                 ← placeholders SVG 1920×1080 feitos só com tokens --ws-* (não são as artes)
├── placeholders/<id>.svg     ← 6 placeholders
├── backgrounds-thumbs.mjs    ← `npm run backgrounds:thumbs`: miniaturas 320×180 PNG (Chromium headless; alternativa sharp comentada)
├── thumbs/<id>.png           ← 7 miniaturas (inclui "sem-arte")
└── V__backgrounds_seed.sql   ← esboço da seed Flyway (tabela background + traduções)
```

## Catálogo (7 ids)

| id | tone | tema recomendado | o que o dono deve entregar |
|---|---|---|---|
| `sem-arte` | light | claro | nada — opção "sem fundo" (surface-0 do tema) |
| `malha-laranja` | dark | escuro | a malha de rede laranja sobre o preto do monitor, sem nós ou com nós discretos |
| `nos-multicolor` | light | claro | nós coloridos espalhados sobre creme/branco, malha fina |
| `terminal-noturno` | dark | terminal | tela de terminal com `>_` e linhas de comando apagadas, filete laranja |
| `disco-creme` | light | claro | o disco creme do logo sobre o campo laranja, deslocado para a direita (área de leitura à esquerda) |
| `blueprint-de-rede` | dark | escuro | grade de engenharia azul-noite com a malha em creme |
| `grade-minima` | light | contraste | pontos/grade discreta, quase branco (funciona no alto contraste) |

Formatos aceitos: SVG (preferido, escala sem perda), PNG/WebP 1920×1080 (≤ 600 KB) + variante 2× opcional. **Tom** (`tone`) decide o scrim: artes `dark` recebem `--ws-scrim-tint`; artes `light` recebem surface-0 a 72 %. Texto sobre a arte sempre dentro de `.ws-glass`/`.ws-scrim`, nunca direto.

## Adicionar (ou substituir) uma arte = 4 passos

1. **Colocar o arquivo** em `public/backgrounds/<id>.<svg|png|webp>` (nome = id do catálogo).
2. **Rodar `npm run backgrounds:thumbs`** (→ `node docs/design-system/backgrounds/backgrounds-thumbs.mjs`): gera/atualiza `thumbs/<id>.png` 320×180. Commitar a miniatura.
3. **1 entrada no catálogo** `backgrounds.ts` (nova arte) ou trocar `placeholder: true → false` (arte substituindo placeholder). `file` = nome do arquivo, `tone`, `recommendedTheme`.
4. **3 traduções** em `i18n/backgrounds.pt-BR.json`, `backgrounds.en.json`, `backgrounds.es.json` com a chave `background.<id>`. Exemplo: `"background.malha-laranja": "Malha laranja"` / `"Orange mesh"` / `"Malla naranja"`.

Depois: `V<versão>__backgrounds_seed.sql` ganha a linha correspondente (ou um `V<versão>__backgrounds_add_<id>.sql` incremental) para o seletor do servidor (`UserPreferences.backgroundId`, RF3) conhecer o id.

## Scripts (package.json, etapa (b))
```json
"backgrounds:placeholders": "node docs/design-system/backgrounds/gerar.mjs",
"backgrounds:thumbs": "node docs/design-system/backgrounds/backgrounds-thumbs.mjs"
```
`backgrounds-thumbs.mjs` usa o `headless_shell` do Playwright (`CHROME=` ou `--chrome=` para apontar outro binário; com o `chrome --headless=new` a janela ganha ~80 px de barra e a miniatura sai cortada); se o CI não tiver navegador, trocar pelo trecho `sharp` comentado no topo do script (`sharp(file).resize(320,180,{fit:'cover'})`).
