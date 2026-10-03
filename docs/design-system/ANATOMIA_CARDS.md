# Anatomia dos cards — esquema de tarefa e esquema de projeto (v1)

> Equivalente ao `docs/anatomias/anatomias_card_v19.html` do FAI (card da peça = **card de tarefa**; card do look = **card de projeto**). Pranchas em [`anatomias/svg/`](anatomias/svg/) (28 variações × 4 temas, geradas por [`anatomias/gerar.mjs`](anatomias/gerar.mjs) a partir de [`anatomias/lib/cards.mjs`](anatomias/lib/cards.mjs)); galeria em [`anatomias/index.html`](anatomias/index.html). As pranchas são **diagramas**, não capturas do produto; cada número é uma camada, cada letra um elemento de conteúdo.

## 1. Camadas, empilhamento e recorte (iguais nos dois cards)
| # | Camada | Classe | Regra |
|---|---|---|---|
| 1 | **Superfície externa** | `article.ws-card` / `article.ws-project` | borda `--card-dept-border` (2 px) na **cor do departamento** (RF38.CA09), raio `--card-r-out`, `overflow:hidden` recorta tudo o que é decorativo. RASCUNHO = borda tracejada. `container-type: inline-size` (os `cqi` resolvem no próprio card). |
| 2 | **Área artística** | `.ws-card__art` (z 0) | família de arte (§4) só visível nas **quatro faixas** entre a borda e o container; `aria-hidden`, `pointer-events:none`, `contain:paint`. No card de projeto a arte é a própria capa (não há faixas). |
| 3 | **Container de conteúdo** | `.ws-card__frame > .ws-card__content` (z 1) | fundo `--surface`, raio `--card-r-in` (70 % do externo, mín. 4 px), relevo `--shadow-1`; tudo o que é interativo mora aqui. |
| 4 | **Área da mídia** | `.ws-card__media` / `.ws-project__cover` | tarefa: thumbnail automático 3:2 (`--card-media-ratio`) com selo da extensão; projeto: **mosaico 2×3** dos thumbnails + anel de progresso por fase. Nada da arte passa por cima. |
| 5 | **Efeitos** | `--shadow-aura`, pulso, confete | aura em hover/foco, pulso em EM_USO/EM_DECISAO, confete na decisão validada; nenhum recebe clique ou foco. |

**Decorativo × interativo:** arte, aura, partículas → sem clique, sem foco. Thumbnail → abre o detalhe mas fora da ordem de Tab (o título é o link). Título, @usuário, departamento → links. Curtir/comentar/salvar/compartilhar/remixar → botões com contagem no nome acessível e `aria-pressed`. Lacre, faísca, prazo → `aria-label` com tooltip.

## 2. Dimensões, tokens e zona segura
| Token | Compacto (grade) | Ampliado (detalhe) |
|---|---|---|
| `--card-x` laterais | `clamp(10px, 5cqi, 16px)` | `--card-x-lg` = `clamp(16px, 3cqi, 28px)` |
| `--card-top` / `--card-bottom` | `--card-x × 1,3` cada; soma constante **2,6 × --card-x** → cards da mesma linha têm a mesma altura; famílias com ênfase mudam a divisão (pasta 22/10, blueprint 10/22) mantendo a soma | idem |
| Raio | `--card-r-out` = `--radius-md` 10 px; `--card-r-in` = 70 % | mín. 14 px |
| Padding do container | `--card-pad` 10 px | `--card-pad-lg` 16 px |
| Mídia | 3:2, largura do container; thumb mini 32 px, thumb lista 64 px | 3:2, toque amplia (lightbox) |
| Mosaico (projeto) | 2×3, `--card-mosaic-gap` 2 px, anel `--card-ring-size` 36 px / `--card-ring-w` 4 px | hero 16:9 |
| Avatar / lacre / faísca / etiqueta | 20 px / 36 px (22 sm) / 14 px / 22 px | 24 / 36 / 14 / 22 |
| Barra de fases | `--card-phasebar-h` 6 px, gap 2 px | idem + nome da fase em texto |
| Fio de decisão | `--card-thread-w` 2 px, nó 10 px (14 no destaque) | idem |
| Carimbo | borda `--card-stamp-border` 2,5 px, rotação −8° | idem |

**Zona segura** = todo o container: a arte ocupa apenas as faixas. Consequência: a mídia tem a mesma escala em qualquer família, e cards vizinhos alinham.

## 3. Card de tarefa — elementos (a…i) e variações de layout
Elementos (card "Identidade visual" §7): **a** ícone do tipo (glifo próprio + cor da família, chip) · **b** categoria/origem (label mono: `TaskCategory` · departamento · formato) · **c** título (serif, 2 linhas, link) · **d** etiqueta de estado (`TaskState`, nome em texto) · **e** prazo (relógio; ⚖ se prazo legal; âmbar/vermelho) · **f** responsável (avatar iniciais + nome) · **g** contadores sociais (curtir · comentar · salvar · remixar) · **h** faísca ✦ se `aiGenerated` · **i** lacre de chancela se `SealBond` APROVADA. Extras por estado: EM_USO mostra "em uso em: projeto"; BLOQUEADA mostra "por quem/o quê"; OFERECIDA mostra ficha DP com preço e licença.

| Variação | Arquivo | Onde | O que muda |
|---|---|---|---|
| **Compacto** | `tarefa-compacto` | grade do Acervo (RF41), Balcão (RF40), busca (RF27) | 240 px, mídia 3:2, todos os elementos a–i |
| **Lista** (linha) | `tarefa-lista` | listas densas, Meu trabalho, fila de revisão, Dossiê | thumb 64 px à esquerda, título + categoria + estado + prazo + responsável numa linha, ações à direita |
| **Ampliado** (detalhe) | `tarefa-ampliado` | modal ou `/tasks/[id]` (RF41.CA03) | cabeçalho do dono/origem/protocolo, transparência da IA ("gerado por IA em … revisado por …"), resumo 3 linhas, metadados agrupados (prazo, prazo legal com base, acesso, situação, esforço, origem), **ação principal única** ("Adicionar ao projeto" / "Transformar em tarefa"), linha de interações completa (RF26) |
| **Anexo de mensagem** | `tarefa-anexo` | inline no chat do DECIA (`MessageAttachment`, RF29.CA03) | 66×44 thumb, título, categoria, estado; borda na cor da classificação da mensagem; "abrir" se tiver permissão |
| **Mini** | `tarefa-mini` | `SelectList` por fase (RF21.CA03), slot da PhaseBar, ficha na Mesa | 32 px thumb + ícone + título 1 linha + estado·categoria; desabilitada com motivo em itálico |

### 3.1 Estados (etiquetas de protocolo, RF38.CA05)
| Estado | Prancha | Estilo |
|---|---|---|
| RASCUNHO | `tarefa-estado-rascunho` | borda tracejada, título esmaecido, contadores zerados |
| DISPONÍVEL | (padrão) | etiqueta sólida primária |
| EM_USO | `tarefa-estado-em-uso` | pulso suave + "em uso em: projeto" |
| BLOQUEADA | `tarefa-estado-bloqueada` | cadeado + motivo/quem bloqueia |
| CONCLUÍDA | `tarefa-estado-concluida` | carimbo verde sobre a mídia |
| ARQUIVADA | `tarefa-estado-arquivada` | `--opacity-arquivado` .62 + `--saturate-arquivado` .35 (1 no alto contraste) |
| MODELO_PÚBLICO | `tarefa-estado-modelo-publico` | estrela + lacre (modelo oficial) |
| OFERECIDA | `tarefa-estado-oferecida` | ficha DP com preço e licença (Balcão) |
| Prazo legal vencido | `tarefa-prazo-vencido` | prazo vermelho + ⚖ |

## 4. Famílias de arte do card de tarefa (camada 2)
| Família | Prancha | Composição | Uso sugerido |
|---|---|---|---|
| **Protocolo** (padrão) | `tarefa-compacto` | papel pautado + picote no topo, "PROTOCOLO Nº …" em mono | qualquer tipo |
| **Carimbo** | `tarefa-familia-carimbo` | carimbo circular vermelho institucional rotacionado no canto | ATA_REGISTRO, decisões, portarias |
| **Pasta suspensa** | `tarefa-familia-pasta` | aba de pasta marrom no topo (faixa 22/10) | PASTA (zip), dossiês, kits |
| **Blueprint** | `tarefa-familia-blueprint` | papel azul-engenharia com grade e cantoneiras, legenda na base (faixa 10/22) | DESENHO_TECNICO, projeto básico/executivo |
| **Monograma** | `tarefa-familia-monograma` | iniciais do título em serif gigante sobre a cor da categoria | TEXTO_MANUAL / TEXTO_IA, ofícios, minutas |

O usuário pode trocar a família (skin do card) e a capa (thumbnail automático · imagem manual · capa pela IA, RF38.CA02); a escolha fica em `TaskItem.cardSkin` / `coverMode`.

## 5. Card de projeto — elementos (a…h) e variações
Elementos (card "Identidade visual" §8): **a** título (serif, 2 linhas) · **b** departamento (monograma + sigla na cor) · **c** etiqueta de status (`ProjectStatus`) · **d** **barra de 7 fases** DEMANDA→ENCERRAMENTO com a atual destacada e nome em texto · **e** próximo marco/prazo · **f** "n tarefas · n pessoas" · **g** último evento DECIA ("decisão validada há 2 dias", cor da classe) · **h** contadores sociais. Capa (camada 4): mosaico 2×3 + anel de progresso + borda na cor do departamento; faísca ✦ se `aiGenerated`; lacres se chancelado.

| Variação | Arquivo | Onde | O que muda |
|---|---|---|---|
| **Mosaico 2×3 padrão** | `projeto-mosaico` | grade de projetos, Criar projeto (pré-visualização, RF21), Balcão | capa-mosaico 3:2 + anel; a–h |
| **Hero da Vitrine** | `projeto-hero-vitrine` | destaque do mês (RF35), topo da Vitrine (RF27) | capa 16:9 grande, título h2, objetivo, barra de fases larga, "remixar" em destaque |
| **Linha do Mural** | `projeto-linha-mural` | feed social (`MuralEntry`, RF27) | avatar do ator + verbo ("publicou", "decisão validada"), capa 64 px, ações do RF26 inline |
| **Post-it da Mesa** | `projeto-postit-mesa` | Mesa de Trabalho (RF22) | papel colorido, pino, rotação ±3°, sobre skin papel/cortiça/blueprint |
| **Capa IA** | `projeto-capa-ia` | `coverMode = IA` | ilustração flat do tema no lugar do mosaico; faísca ✦ e tooltip de transparência |

### 5.1 Estados
| Status | Prancha | Estilo |
|---|---|---|
| RASCUNHO | `projeto-estado-rascunho` | tracejado, capa "pasta em branco", fase 0 |
| PUBLICADO | (padrão) | sólido |
| EM_DECISÃO | `projeto-estado-em-decisao` | pulso roxo (classe pergunta), último evento da sessão |
| APROVADO | `projeto-estado-aprovado` | **carimbo VALIDADO** com data e revisor sobre a capa |
| DEVOLVIDO | `projeto-estado-devolvido` | carimbo vermelho DEVOLVIDO + motivo |
| ARQUIVADO | `projeto-estado-arquivado` | esmaecido |
| Chancelado | `projeto-chancelado` | lacre dourado (empresa) e azul-marinho (chefe) na zona do selo; vira modelo oficial |

## 6. Acessibilidade e regras compartilhadas
- Nome do estado, da fase, da classificação e da cor sempre em **texto** (nunca só cor/ícone).
- Thumbnail/capa `alt` = título; arte `aria-hidden`.
- Cards da mesma linha: mesma altura (soma topo+base constante); títulos limitados a 2 linhas com reticências.
- Lacre e faísca têm `aria-label` e tooltip (emissor/critério; "gerado por IA em … revisado por …").
- Hover/foco: aura + elevação `--shadow-2`; arrastar para a fase: "encaixe" com `--ease-snap` (desligado em reduced-motion).
- Contadores em tempo quase real (RF26.CA07) via `CounterStorePort` (Redis) sem relayout.

## 7. Contrato visual compartilhado (frontend ↔ backend)
O card lê exatamente estes campos da API (ver TAXONOMIA.md): tarefa → `type, category, state, visibility, dueAt, legalDueAt, responsible{initials,name}, department{acronym,color,monogram}, aiGenerated, aiInferenceId, thumbnailUrl, coverMode, cardSkin, sealIdsJson, counters{likes,comments,saves,shares,remixes}, offeredInCounter, blockReason, projectUsage[]`; projeto → `title, emoji, department, status, currentPhase, mosaicJson, coverUrl, coverMode, nextMilestoneAt, tasksCount, peopleCount, lastDeciaEventLabel/At, aiGenerated, sealIdsJson, counters, conformityPercent, hasBlockingPending`.
