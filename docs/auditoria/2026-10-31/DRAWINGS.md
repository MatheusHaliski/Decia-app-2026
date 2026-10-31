# Revisão da auditoria do Drawings e testes de cenas complexas — 31/10/2026

## Resumo

- **O editor do Drawings não está neste repositório.** O `/drawings` é uma página-esqueleto (`RfPage`) e não há código 3D. O editor `/studio`, os geradores paramétricos, o desenho compartilhado (`SharedDrawingService`, V51) e as reservas hierárquicas ficaram num checkout local de desenvolvimento que nunca foi publicado (`docs/auditoria/2026-10-15/REVISAO_PRS_COPILOT.md`: "o código da aplicação permanece no checkout"). Nenhum branch remoto o contém.
- **As notas de 16/10 (4,3 a 6,95) avaliaram esse checkout**; as de 17/10 (0 a 0,3, "sem rota", "lógica sem interface") avaliaram este repositório. As duas estão certas para o que viram. A matriz de 17/10 continua valendo aqui.
- **O que dá para testar aqui** são as bibliotecas puras: o motor de seleção 2D (`lib/studio/selection.ts`), o escopo de edição (`lib/drawings/selection.ts`), camadas (`lib/pieces/layers.ts`), reservas (`lib/pieces/collab.ts`) e a porta única de patch (`lib/pieces/patch.ts`). Elas foram testadas com cenas 2D complexas; 3D não tem código para testar.
- **Foram encontradas 7 falhas**, corrigidas nas bibliotecas e cobertas por 10 testes novos.
  - Ciclo de grupos travava a tela.
  - O modo "contido" errava em laço côncavo.
  - Laço sem área selecionava objetos.
  - Plantas grandes ficavam lentas (até 99 s).
  - Reservas ignoravam a hierarquia de regiões.
  - Prazo de reserva infinito ou NaN era aceito.
  - Raio inválido gerava caixa NaN.

## Cenas 2D testadas

Cenas geradas com semente fixa e conferidas contra referências independentes (amostragem densa das arestas, comparação com a versão anterior). Scripts em `scripts/` (rodar da raiz com `node --experimental-strip-types`); testes de regressão em `lib/studio/selection.complex.test.ts` e `lib/pieces/collab.test.ts`.

| Cena | O que se verificou | Antes | Depois |
|---|---|---|---|
| Ciclo de grupos (A dentro de B dentro de A) | clique, seleção e edição terminam | trava (laço infinito; cortado aos 5 s) | termina; os envolvidos somem do clique e da edição |
| Laço em U, modo contido | linha e retângulo que atravessam o vão | selecionados (errado) | não selecionados |
| 4.000 cenas aleatórias × 25 objetos | cruzamento igual ao anterior; contido sem ponto fora do laço | 119 "contidos" com trechos fora do laço | 0; cruzamento idêntico em 100.000 decisões |
| Laço sem área (pontos alinhados) | não seleciona | "continha" objetos sobre a linha | nada |
| Coordenadas UTM (~7,2 milhões) | mesmo resultado que perto da origem | igual | igual |
| Círculo de raio 1.000 tocado só no arco | cruzamento | selecionado | selecionado |
| Raio NaN | caixa envolvente | NaN | caixa vazia |

## Desempenho em plantas grandes

`scripts/drawings-desempenho.ts`, mesma máquina, mesmas contagens selecionadas antes e depois.

| Cena | Antes | Depois |
|---|---:|---:|
| Clique em 20.000 objetos | 26 ms | 37 ms |
| Retângulo em 20.000 objetos | 89 ms | 34 ms |
| Laço de 400 vértices, contido, 20.000 objetos | 382 ms | 45 ms |
| Editáveis do laço, 20.000 objetos | 5.771 ms | 51 ms |
| Grupo com 8.000 filhos | 353 ms | 8 ms |
| Laço de 1.000 vértices sobre 300 contornos de 5.000 pontos (contido) | 28.446 ms | 577 ms |
| Mesmo laço longe dos contornos (cruzamento) | 98.901 ms | 61 ms |

Causas e correções:
- **Caixa envolvente:** o motor não descartava pela caixa o que estava longe da seleção. Agora descarta.
- **Faixas horizontais:** o laço comparava cada vértice de cada forma com todas as suas arestas. As arestas agora ficam distribuídas em faixas.
- **Visibilidade e descendência:** eram recalculadas por objeto. Agora são calculadas uma vez por cena, com índice de filhos.

## Reservas colaborativas

| Cenário | Antes | Depois |
|---|---|---|
| Ana reserva "A"; Bruno reserva "A/1" (e o inverso) | permitido (os dois editam a mesma área) | recusado |
| "A1" × "A10" | sem conflito | sem conflito |
| Patch de Bruno em "A/3" com "A" reservada por Ana | aceito | `REGIAO_RESERVADA` |
| Prazo infinito | reserva eterna | recusado |
| Prazo NaN | "reservado", mas sem proteger nada | recusado |
| Prazo acima de 10 min (`MAX_LOCK_TTL_MS`) | aceito | recusado |

## 3D

Não há código 3D neste repositório (malhas, câmera, vistas, conversões). RF60, RF61 e RF62 continuam AUSENTES; não há o que testar. Testar o 3D exige publicar o editor do checkout local ou reimplementá-lo.

## Situação dos RF do Drawings

Sem mudança de nota: a interface continua ausente. A lógica de RF57 (seleção), RF65 (camadas) e RF66 (reservas) foi corrigida e testada. Para RF58–RF64, RF67, RF73 e RF74 não há código.
