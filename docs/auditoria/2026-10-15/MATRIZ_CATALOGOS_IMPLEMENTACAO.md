# Catálogos desejados × implementação inspecionada

Os JSONs `catalogo-*.json` são inventários e vocabulários de produto. A matriz abaixo é avaliação separada do checkout local em 15/10/2026; não é saída dos scripts nem prova de que o código já está em `main`.

| Seletor desejado | Estado no editor local | Evidência e lacuna |
| --- | --- | --- |
| Cor | Implementado | `StyleInspector` e materiais das partes; seletor de cor; não é uma grade curada de paletas |
| Gradiente | Implementado parcialmente | Linear/radial 2D e gradiente de partes 3D; sem gestão ICC/CMYK validada |
| Objeto | Implementado parcialmente | Catálogo paramétrico com busca; ainda sem grade visual de thumbnails |
| Pessoa | Implementado parcialmente | Manequim, cabeça, personagens e detalhes compatíveis; não reconhecimento anatômico de imagem |
| Traço | Implementado | Seis padrões, largura, opacidade, terminações e junções; sem certificação de normas |
| Geometria | Implementado | Regulares, irregulares, Bézier e livre; primitivas 3D na biblioteca de assets |
| Estilo de desenho | Pendente como motor global | Trocar traçado/preenchimento não equivale a renderizar grafite ou aquarela |
| Camada | Implementado parcialmente | Isolamento e visibilidade locais; no compartilhado 2D, camadas são definidas na criação |
| Renderização | Implementado parcialmente | Wireframe/preenchido e câmeras de assets; sem motor PBR completo |

| Conteúdo importável desejado | Estado no canvas |
| --- | --- |
| ws-studio | Parser validado de projeto JSON; importação local operacional |
| ws-asset | Formato adicional de assets JSON local; não listado pelo script original |
| SVG | Importador de vetores externos pendente; SVG interno da renderização não comprova importação |
| PNG/JPEG/WebP | Importação editável pendente; exportar PNG ou anexar mídia à tarefa é outro fluxo |
| PDF | Pendente |
| DXF | Pendente; exportar GLB não implementa CAD/DXF |
| Paleta JSON | Pendente como importador de paletas de terceiros |
| Fonte WOFF2 | Pendente como importação de fonte pelo usuário |
| Referência visual | Pendente como camada/referência no editor |
| Texto TXT | Exportação existente; importação direta no Letters ainda pendente |

`lib/studio/assets.ts` usa o registro de 42 modelos em `ws-application/src/main/resources/studio/asset-registry.json`. Isso demonstra cobertura de presets testados, não geração IA irrestrita de qualquer pessoa/objeto. O modelo de seleção do PR #60 fornece a base geométrica. A nova oficina local conecta seleção direcional, laço e polígono à UI, com curvas amostradas e escopo filtrado; gizmos completos e edição direta de segmentos permanecem parciais. Reservas do módulo TS em memória não substituem as reservas transacionais do backend em desenvolvimento.

Autoria, classificação de desenho e classificação de acesso são eixos distintos. Não inferir autoria humana pela ausência de chamada IA registrada, nem permissão de acesso por camada visível, nem conformidade técnica pela escolha de um estilo.


### Evidências adicionais de wireframe e edição avançada (15/10)

[Fluxo de 12 etapas, arquivos editáveis, PDF e pacote](jardim-wireframe/README.md): jardim com 149 elementos, cinco camadas, dois usuários e reserva espacial em três níveis; escritório 3D com 43 partes. Divisórias e rótulos podem ser ocultados; isolamento de camada e foco da reserva são controles visuais. Patches preservam a ordem dos elementos. A colaboração demonstrada é 2D persistida; o estudo 3D é local. Código da aplicação ainda não publicado neste PR de documentação. Não houve chamadas pagas de IA. Os demais estados e lacunas desta matriz permanecem válidos.


### Ampliação de comandos e novos RF (15/10)

[Auditoria do zero em 15 etapas](comandos-do-zero/README.md), [pesquisa de comandos](pesquisa-comandos/COMANDOS_ADICIONAIS.md) e [IA nos quatro níveis](pesquisa-comandos/IA_QUATRO_NIVEIS.md). O Trello recebeu RF51 a RF72, com 158 critérios não concluídos; [especificação](../../produto/requisitos-studio/README.md). Seleção direcional, laço/polígono e atributos foram conectados a uma oficina local da mesma peça; há operações 2D e um novo motor de malhas 3D com booleanas, corte e desmembramento. Não se trata de compatibilidade integral com Illustrator/AutoCAD. Máscaras, UCS, Xrefs e demais lacunas estão explícitos no relatório. O suporte local a furos foi acrescentado na continuidade abaixo; persistência compartilhada desses metadados permanece pendente. Código da aplicação permanece local.


### Continuidade: caminhos compostos e grupos

[Auditoria em 14 etapas](caminhos-compostos/README.md): operações 2D preservam furos; liberar contornos, agrupar/desagrupar, mover conjunto, tesoura por âncora e expansão de traçado aberto têm fluxo local demonstrado. Extrusão de perfil vazado recebeu correção de orientação e teste de volume. 519 testes frontend passaram. Compartilhamento e IA remota desses metadados permanecem bloqueados até atualização do contrato do servidor; não há conclusão integral dos RF.
