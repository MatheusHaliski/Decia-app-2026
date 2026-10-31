# Drawings 3D: arquitetura e padrões

Editor 3D do `/drawings` (RF60–RF63), com render fisicamente baseado e path tracing. O código fica em `lib/drawings3d` (lógica e motor) e `components/drawings3d` (interface). A página carrega o editor com `next/dynamic` e `ssr: false`, então three.js e o path tracer não entram no bundle das outras rotas. O path tracer (`three-gpu-pathtracer`) só é baixado quando a pessoa escolhe o modo fotorrealista.

## Camadas

| Camada | Arquivos | Depende de three.js |
|---|---|---|
| Modelo (dados puros) | `model.ts`, `materials.ts`, `commands.ts`, `quality.ts`, `studio-environment.ts` | não |
| Mediador da interface | `useEditor3D.ts` | não |
| Motor | `engine/*` | sim |
| Interface | `components/drawings3d/*` | não (só a fachada) |

## Padrões aplicados (e por quê)

| Padrão | Onde | O que resolve |
|---|---|---|
| Composite | `model.ts` (`parentId`, `subtreeIds`) e `scene-adapter.ts` | A cena é uma árvore. Excluir ou mover um pai leva junto os filhos. Ciclo em `parentId` não trava nem some com objetos. |
| Factory Method | `createObject`, `material-factory.ts`, `geometry-factory.ts`, `textures.ts` | Cada tipo de primitiva nasce com nome, material e apoio no piso coerentes. Cada preset vira um `MeshPhysicalMaterial`. |
| Flyweight | caches das fábricas de material, geometria e textura | Uma geometria por tipo, um material por preset e uma textura por padrão, compartilhados entre todos os objetos. Cem caixas não criam cem malhas. |
| Command | `commands.ts` (`AddObject`, `RemoveObject`, `SetTransform`, `SetMaterial`, `Rename`, `History`) | Desfazer e refazer valem para qualquer origem: gizmo, inspetor ou teclado. Comando sem efeito não entra no histórico. O histórico tem teto de 200. |
| Strategy | `quality.ts` (`interativo`, `alta`, `fotorrealista`) | A viewport aplica a estratégia sem `if` espalhado: resolução de sombra, MSAA, GTAO e path tracing. |
| Mediator | `useEditor3D.ts` | Barra, lista, inspetor, atalhos e viewport não se conhecem. Todos chamam o mediador. |
| Adapter | `engine/scene-adapter.ts` | Traduz o `Scene3D` puro em malhas three.js e toca só o que mudou. |
| Facade | `engine/Viewport3D.ts` | A interface usa `setScene`, `setSelection`, `setQuality`, `capture` e `exportGlb` e não conhece renderer, câmera, pós, gizmo nem path tracer. |
| Decorator | `engine/post.ts` | Cada passe de pós (GTAO, saída) envolve o render anterior. A estratégia decide quais passes entram. |

Ficaram de fora, de propósito: Singleton (as fábricas são módulos com cache, sem estado global além disso), Observer próprio (o React já propaga o estado) e Visitor (a árvore é rasa e percorrida em poucos lugares).

## O que torna o render realista

- **Materiais PBR medidos:** 15 presets com valores de materiais reais:
  - metais com `metalness` 1 e cor igual à refletância F0 em RGB linear (ferro 0,56; ouro 1 / 0,55 / 0,09);
  - vidro com IOR 1,52, transmissão e absorção de Beer–Lambert;
  - cerâmica e madeira com verniz (clearcoat);
  - aço escovado com anisotropia;
  - veludo com sheen.

  Os testes rejeitam valores fora do físico, como metal transmissivo ou IOR acima de 2,333.
- **Texturas procedurais:** madeira, concreto, aço escovado e mármore, cada um com mapa de cor (sRGB), rugosidade e normal. São geradas com ruído determinístico, sem baixar arquivos.
- **Geometria com filete:** caixa arredondada, cilindro com borda de 2 cm, esfera de 128×64 e vaso torneado com parede de 1,2 cm. É o filete que pega o brilho do softbox.
- **Luz de estúdio fotográfico:**
  - HDRI equirretangular gerado no código, com luz principal, preenchimento, recorte e faixa superior sobre um fundo escuro;
  - a mesma textura ilumina o rasterizador (IBL) e o path tracer, e o teste confere que cada softbox está na direção certa;
  - ciclorama curvo ao fundo (sem horizonte), com a parede baixa o bastante para não tapar os softboxes no path tracer.
- **Tone mapping Khronos PBR Neutral:** feito para foto de produto. Mantém a cor de base e comprime só os realces.
- **Modo Alta:** sombras de 4096 px filtradas, oclusão de ambiente GTAO e MSAA 4× em HDR de meia precisão.
- **Modo Fotorrealista:** path tracing progressivo com a câmera parada:
  - 8 rebotes (12 em superfícies transmissivas) e amostragem por importância múltipla;
  - resultado: iluminação global, refração real no vidro (a esfera inverte a imagem atrás dela), reflexos entre objetos e sombras de área;
  - ao girar a câmera ou editar a cena, volta ao rasterizado e recomeça a convergir até 512 amostras.

## Decisões verificadas em captura de tela

As capturas foram feitas com Chromium headless e SwiftShader.

| Mudança | Antes | Depois |
|---|---|---|
| Fundo do HDRI | 0,55–0,9 de radiância: imagem lavada, sem sombras | 0,04–0,2, com os softboxes dominando: contraste e sombras visíveis |
| Tone mapping | AgX dessaturava a madeira e o ouro | PBR Neutral |
| Bloom | O realce do aço se espalhava e apagava a faixa escura que faz o metal parecer metal | Removido |
| Vidro com `DoubleSide` | Dupla refração no rasterizador | Só face frontal; o path tracer trata transmissivo como volume em qualquer caso |
| Montagem da BVH | `setSceneAsync` exige worker, e o CSP só libera `blob:` | `setScene` síncrono: dezenas de ms para cenas de editor |

## Limites conhecidos

- **Vidro no rasterizador:** desloca o fundo pela espessura, mas não inverte a imagem como uma lente esférica. O modo fotorrealista é o que faz isso.
- **Path tracing sem GPU:** sem GPU dedicada (SwiftShader na CPU), converge devagar: 125 amostras em 8 minutos a 760×600, já sem ruído visível (`docs/auditoria/2026-10-31/drawings-3d-fotorrealista.png`). Em GPU integrada ou dedicada, são várias amostras por segundo.
- **Classe do path tracer:** a `WebGLPathTracer` está marcada como obsoleta em favor da `WebGPUPathTracer`. Trocar exige o `WebGPURenderer` e fica para quando o WebGPU estiver disponível nos navegadores que o projeto suporta.
- **Persistência:** a cena é salva só como rascunho local (`localStorage`). A persistência no servidor, junto com o desenho compartilhado do RF66, fica para a Onda 5.
