# WS Glyphs — catálogo (v2)

> Gerado por [`glyphs/gerar.mjs`](glyphs/gerar.mjs). Catálogo TS em [`glyphs/catalog.ts`](glyphs/catalog.ts), SVGs em `glyphs/svg/`, preview em [`glyphs/index.html`](glyphs/index.html) (`/lab/glyphs`), capturas em `glyphs/capturas/`.

**Regra de forma:** todo ícone nasce do **monitor do logo** (moldura arredondada rx 2,5 + pescoço + base, tela útil 14×7,5 px) ou da **malha de nós** (anel + disco + nós coloridos). Grade 24 px, traço 1,75, pontas e junções redondas. Duas variantes: **outline** (`currentColor`, para navegação, botões e listas) e **clay** (carcaça `--ws-ink` com brilho superior `--ws-glyph-shine`, aro `--ws-glyph-rim` nos temas escuros, detalhes `--ws-cream`, nós `--ws-node-*`, disco `--ws-gradient-brand`; para heróis, estados vazios, cards de destaque, ≥ 32 px). Os nós são **detalhe**, nunca o único portador de significado (daltonismo) — o rótulo i18n (`labelKey`) é obrigatório (RF38.CA01). Tamanho mínimo: 20 px outline, 32 px clay (a 24 px o clay lê, mas o detalhe interno fica no limite — ver capturas).

## Glyphs (17)

| Nome | Função | Forma | Nós | labelKey |
|---|---|---|---|---|
| `criar-tarefa` | Criar tarefa | monitor com `>+` na tela: o prompt abre e o sinal de mais cria | green | `glyph.criar-tarefa` |
| `criar-projeto` | Criar projeto | três monitores pequenos ligados em triângulo pela malha; cada tela tem um nó | red, blue, green | `glyph.criar-projeto` |
| `sessao-decia` | Sessão DECIA | monitor com balão de fala e o prompt `>_` dentro do balão | orange | `glyph.sessao-decia` |
| `notificacoes` | Notificações | monitor com um nó pulsando no centro da tela (anéis concêntricos) | orange | `glyph.notificacoes` |
| `perfil` | Perfil | monitor com avatar (cabeça e ombros) na tela | — | `glyph.perfil` |
| `configuracoes` | Configurações | monitor com engrenagem na tela | — | `glyph.configuracoes` |
| `acervo` | Acervo | pilha de telas: dois monitores atrás, um na frente com base | blue | `glyph.acervo` |
| `mesa` | Mesa | monitor com grade kanban: três colunas e cartões (nós) distribuídos | red, yellow, green | `glyph.mesa` |
| `tarefa-do-dia` | Tarefa do dia | monitor com sol nascendo no horizonte da tela | yellow | `glyph.tarefa-do-dia` |
| `hype` | Hype | monitor com gráfico subindo; os pontos do gráfico são nós | red, yellow, green | `glyph.hype` |
| `decia-points` | DECIA Points | nó-moeda: anel externo (anel do logo), disco com "DP", três nós da malha encostados no anel | yellow, orange, red | `glyph.decia-points` |
| `chancela` | Chancela | nó-lacre: anel externo com nó central (disco) e duas fitas; o lacre é um nó da malha com peso | orange, red | `glyph.chancela` |
| `balcao` | Balcão | monitor com etiqueta de preço na tela (aba à esquerda, furo, ponta à direita) | yellow | `glyph.balcao` |
| `insights-ia` | Insights da IA | monitor com a faísca ✦ grande e uma faísca pequena na tela | — | `glyph.insights-ia` |
| `buscar` | Buscar | monitor com lupa na tela | — | `glyph.buscar` |
| `mural` | Mural | mosaico 2×2 de telas sobre uma única base; uma tela carrega um nó | red | `glyph.mural` |
| `sair` | Sair | monitor com seta saindo pela borda direita da tela | — | `glyph.sair` |

## WS Moji (9) — rostos de monitor com sintaxe de terminal

Monitor (mesma moldura) com o rosto em `--ws-font-mono` (fallback DejaVu Sans Mono, que cobre ✓ § ✦ ⚖ ♥ ▌). Uso: feedback de reação, estados de sucesso/erro/carregando/vazio. Sempre acompanhado de texto — o `face` é também o texto alternativo. Tamanho recomendado 32–96 px.

| Nome | Rosto | Função | labelKey |
|---|---|---|---|
| `util` | `>✓` | reação "útil" | `moji.util` |
| `bem-fundamentado` | `>§` | reação "bem fundamentado" | `moji.bem-fundamentado` |
| `inovador` | `>✦` | reação "inovador" | `moji.inovador` |
| `conforme` | `>⚖` | reação "conforme" | `moji.conforme` |
| `curtir` | `>♥` | reação "curtir" | `moji.curtir` |
| `ok` | `^_^` | sucesso, confirmação | `moji.ok` |
| `erro` | `x_x` | falha, estado de erro | `moji.erro` |
| `carregando` | `>_▌` | carregamento; o cursor ▌ pisca (CSS, respeita prefers-reduced-motion) | `moji.carregando` |
| `vazio` | `>_ ?` | estado vazio, nada encontrado | `moji.vazio` |

## i18n (pt-BR como referência; en/es na etapa (b))

```json
{
  "glyph.criar-tarefa": "Criar tarefa",
  "glyph.criar-projeto": "Criar projeto",
  "glyph.sessao-decia": "Sessão DECIA",
  "glyph.notificacoes": "Notificações",
  "glyph.perfil": "Perfil",
  "glyph.configuracoes": "Configurações",
  "glyph.acervo": "Acervo",
  "glyph.mesa": "Mesa",
  "glyph.tarefa-do-dia": "Tarefa do dia",
  "glyph.hype": "Hype",
  "glyph.decia-points": "DECIA Points",
  "glyph.chancela": "Chancela",
  "glyph.balcao": "Balcão",
  "glyph.insights-ia": "Insights da IA",
  "glyph.buscar": "Buscar",
  "glyph.mural": "Mural",
  "glyph.sair": "Sair",
  "moji.util": "Útil",
  "moji.bem-fundamentado": "Bem fundamentado",
  "moji.inovador": "Inovador",
  "moji.conforme": "Conforme",
  "moji.curtir": "Curtir",
  "moji.ok": "OK",
  "moji.erro": "Erro",
  "moji.carregando": "Carregando",
  "moji.vazio": "Vazio"
}
```

## Movimento
`notificacoes` (anel `.ws-pulse`, `--ws-duration-pulse`) e `carregando` (cursor `.ws-blink`, `--ws-duration-blink`, `steps(1)`) animam por CSS; `@media (prefers-reduced-motion: reduce)` e `data-reduce-motion="true"` desligam e deixam o elemento visível e estático.
