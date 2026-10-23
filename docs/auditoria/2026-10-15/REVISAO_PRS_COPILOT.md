# Revisão dos PRs Copilot e continuidade — 15/10/2026

## Contexto das duas árvores

Os PRs #60–#63 estavam mesclados em `main` na revisão `c0507c6`. Eles foram revisados pelo diff e pelo código. Nessa árvore publicada, o Drawings estava em protótipos e módulos puros. O checkout de desenvolvimento contém adicionalmente o editor `/studio`, os geradores paramétricos e o backend em implementação, ainda não publicados como PR de aplicação. Essa diferença explica as constatações de ausência de UI na auditoria do Copilot; os módulos novos não representam, por si, funcionalidades conectadas ao produto.

As alterações foram incorporadas por arquivo e mesclagem de três vias, preservando as edições locais. O único conflito documental exigiu conciliar a descrição de `lib/studio/selection.ts` com o código local. Nenhuma atualização de dependência do Dependabot foi mesclada neste trabalho.

## PRs revisados

| PR | Entrega confirmada | Continuidade necessária |
| --- | --- | --- |
| [#60](https://github.com/MatheusHaliski/Decia-app-2026/pull/60) | Geometria, hit testing, seleção de grupos/caixa/laço, snap e travas locais | Conectar seleção avançada ao canvas; modelos de curva e câmera exigem adaptação |
| [#61](https://github.com/MatheusHaliski/Decia-app-2026/pull/61) | Taxonomia, guarda de escopo, cálculo por unidades e badge no perfil | Fonte de autoria validada pelo servidor; não converter booleano ou aparência em prova de autoria |
| [#62](https://github.com/MatheusHaliski/Decia-app-2026/pull/62) | Auditoria, classificação por facets e cadeia de eventos de contribuição | Consolidar algoritmos de autoria; validar pesos e limiar de intervenção humana antes de divulgação como métrica |
| [#63](https://github.com/MatheusHaliski/Decia-app-2026/pull/63) | Camadas, wireframe, serviço em memória, reservas puras, manifesto não assinado e scripts | Persistência, autorização e exclusão concorrente no servidor; importadores e seletores conectados à UI |

## Scripts executados

Executados com Python e biblioteca padrão, sem rede ou uso de IA:

```
python3 -B scripts/drawings/catalogar_elementos_ia.py
python3 -B scripts/drawings/catalogar_seletores.py
python3 -B scripts/drawings/catalogar_conteudo_importavel.py
```

Geraram `catalogo-elementos-ia.json`, `catalogo-seletores.json` e `catalogo-conteudo-importavel.json` nesta pasta. Uma segunda execução manteve os mesmos hashes. O registro está em `EXECUCAO_CATALOGOS.json`.

Os seletores e tipos importáveis são um catálogo de necessidades. A extração por expressões regulares não mede cobertura funcional, não executa componentes e não inclui o editor local em `components/studio`. A presença de SVG, PDF ou DXF nesse JSON não demonstra suporte a importação desses formatos.

## Correções de revisão aplicadas no checkout

- Reservas puras agora reconhecem ancestrais/descendentes por IDs hierárquicos com `/`, a raiz e todas as camadas. `A1` continua distinto de `A10`. A autoridade de acesso permanece no servidor.
- Prazos de reserva não finitos e fora do intervalo aceito são rejeitados.
- Classificação por IA rejeita confiança NaN; contraste exige valor finito.
- O cálculo por eventos retorna UNVERIFIED para pesos inválidos, IDs finais duplicados ou frações de intervenção humana inválidas.
- Propriedades herdadas de objetos JavaScript não são interpretadas como intervenção humana no cálculo de autoria.
- Removida variável sem uso no motor de seleção, que impedia o lint do projeto.
- Catálogo de assets do editor local recebeu busca por nome, categoria e identificador.

## Persistência colaborativa em validação local

A continuidade inclui `SharedDrawingService`, `JdbcSharedDrawings`, migration V51 e um editor compartilhado 2D nas rotas Studio e sessão DECIA. O desenho herda as permissões da tarefa. Uma sessão vinculada exige participação explícita; observadores podem ler, mas não reservar nem gravar. ADMIN sem concessão não ganha acesso a SIGILOSO.

As reservas usam o relógio do MySQL, prazo de 60 segundos, token monotônico e bloqueios transacionais. Patches verificam versões dos objetos afetados e mesclam o restante da composição atual. Cena, escopo das reservas e patches são cifrados com AES-GCM. São novos endpoints de desenho por tarefa, separados do serviço em memória do Copilot.

O frontend mantém o rascunho quando a reserva expira ou o servidor rejeita o patch, permite renovar/liberar e consulta atualizações a cada dois segundos. A criação e gestão completa de sessões DECIA continua pendente; o vínculo pressupõe uma sessão persistida válida. Assets 3D, metadados completos, vínculos geométricos e autoria rastreada ainda não integram essa peça compartilhada.

## Limites e próximos passos

O manifesto produzido em `lib/pieces/provenance.ts` é JSON proposto, sem assinatura; não comprova conformidade C2PA, procedência ou identidade. Hash de cadeia sem âncora confiável também não certifica autoria. Existem dois cálculos de autoria com regras distintas; nenhum deve ser tratado como percentual acadêmico validado ou prova jurídica.

Ainda faltam importadores reais de SVG/raster/PDF/DXF/fontes, seleção avançada na UI, classificação completa no fluxo de peças, autoria persistida com inferências aceitas, colaboração 3D e o restante dos RF gerais. Os catálogos não alteram esse estado. O código da aplicação permanece no checkout até a conclusão e validação dos RF, conforme solicitado; PRs documentais podem publicar esta análise e evidências separadamente.

## Evidências verificadas desta continuidade

- 491 testes em 56 arquivos do frontend: aprovados; lint, tipos e build aprovados.
- Backend direcionado: quatro testes do serviço compartilhado, oito de API de tarefas/desenhos, seis de integridade referencial, dois de autorização por caminho e dois de contrato OpenAPI; zero falhas e zero testes ignorados.
- Dois contextos de navegador com login real: reserva A1, conflito ao tentar a região ancestral, reserva C1 independente, aplicação de patches pelos dois usuários e reabertura na revisão 2 com ambos preservados. Não houve simulação dos endpoints de persistência.
- A recuperação da reserva após expiração preserva o rascunho e foi coberta em teste de interface.
- Zero chamadas de IA nesta etapa; o exemplo gráfico foi preparado manualmente como fixture sintética.

As [capturas e seu registro](colaboracao-2d/README.md), a [matriz de implementação](MATRIZ_CATALOGOS_IMPLEMENTACAO.md) e o [registro de validação](VALIDACAO_INCREMENTAL.json) documentam essa fase. Esses resultados não equivalem à conclusão de todos os RF nem à validação de todos os formatos previstos nos catálogos.


### Evidências adicionais de wireframe e edição avançada (15/10)

[Fluxo de 12 etapas, arquivos editáveis, PDF e pacote](jardim-wireframe/README.md): jardim com 149 elementos, cinco camadas, dois usuários e reserva espacial em três níveis; escritório 3D com 43 partes. Divisórias e rótulos podem ser ocultados; isolamento de camada e foco da reserva são controles visuais. Patches preservam a ordem dos elementos. A colaboração demonstrada é 2D persistida; o estudo 3D é local. Código da aplicação ainda não publicado neste PR de documentação. Não houve chamadas pagas de IA. Os demais estados e lacunas desta matriz permanecem válidos.


### Ampliação de comandos e novos RF (15/10)

[Auditoria do zero em 15 etapas](comandos-do-zero/README.md), [pesquisa de comandos](pesquisa-comandos/COMANDOS_ADICIONAIS.md) e [IA nos quatro níveis](pesquisa-comandos/IA_QUATRO_NIVEIS.md). O Trello recebeu RF51 a RF72, com 158 critérios não concluídos; [especificação](../../produto/requisitos-studio/README.md). Seleção direcional, laço/polígono e atributos foram conectados a uma oficina local da mesma peça; há operações 2D e um novo motor de malhas 3D com booleanas, corte e desmembramento. Não se trata de compatibilidade integral com Illustrator/AutoCAD. Furos compostos, máscaras, UCS, Xrefs e demais lacunas estão explícitos no relatório. Código da aplicação permanece local.


### Continuidade: caminhos compostos e grupos

[Auditoria em 14 etapas](caminhos-compostos/README.md): operações 2D preservam furos; liberar contornos, agrupar/desagrupar, mover conjunto, tesoura por âncora e expansão de traçado aberto têm fluxo local demonstrado. Extrusão de perfil vazado recebeu correção de orientação e teste de volume. 519 testes frontend passaram. Compartilhamento e IA remota desses metadados permanecem bloqueados até atualização do contrato do servidor; não há conclusão integral dos RF.
