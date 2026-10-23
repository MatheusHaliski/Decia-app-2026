# Editor principal e Assistente IA — arquitetura de 16/10/2026

A oficina separa edição determinística e propostas de IA sem trocar de documento. O editor permanece visível; o assistente é uma região complementar lateral retrátil em telas largas e uma seção empilhada em telas menores. Nenhuma inferência é iniciada ao abrir o painel.

## Responsabilidades

| Módulo | Responsabilidade | Teste |
| --- | --- | --- |
| `EditorPanels` | Drawer, regiões ARIA, abertura, fechamento e foco; mantém os dois conteúdos montados | Abrir, Escape, foco e preservação de rascunho |
| `Studio` | Peça, seleção compartilhada, camada, escopo, histórico e retorno ao alvo | Integração de edição e propostas sem sobrescrever estado novo |
| `DrawingCommands` | Comandos e atalhos da seleção autorizada; não chama provedor | Teclas em campos não executam comandos; ações respeitam escopo |
| `bezier-edit` | Geometria de âncoras e alças em coordenadas do desenho, inclusive rotação | Tangente, alça independente, ângulo e reabertura |
| `BezierEditor` | Controles de pontos, arraste com rascunho e commit único, edição numérica e guia | Teclado e revisão única por gesto no navegador |
| `appearance` | Troca sólido/nenhum, padrão branco/preto e remoção do atributo ativo | Sem perda de estilo não suportado |
| `DrawingJourney` / `LettersAgent` | Transporte, consentimento, revisão, prévia e aceite/rejeição da IA | Mocks isolados, propostas obsoletas e foco |
| `AssetWorkbench` | Estado do asset e ferramentas locais; controles de IA renderizados no drawer por portal, usando o mesmo asset | Não duplica a cena ao abrir o assistente |
| `png-preview` | Captura transparente local e dados de alinhamento da camada fantasma | Alpha, dimensões, exclusão de guias e origem explícita |

## Usabilidade e acessibilidade

A prancheta e as ferramentas de desenho compartilham a mesma seleção; o canvas duplicado foi removido. Assets, sólidos e colaboração ficam em seções expansíveis. O inspetor adicional fica abaixo da prancheta para não competir com o drawer pela largura.

O drawer não é um modal: não prende o foco nem torna o editor inerte. Ao abrir, o título recebe foco; ao fechar, o foco volta ao botão que o abriu. Aceitar/rejeitar propostas retorna à prancheta ou ao texto correspondente. Carregamentos são anunciados com `aria-live="polite"`; erros do assistente usam `assertive`. A página já possui seu landmark principal, portanto a oficina usa uma região nomeada, sem criar landmarks `main` aninhados.

Âncoras e controles SVG têm papel de botão e são acessíveis por Tab/Enter; os campos numéricos oferecem operação equivalente ao arraste. Shift+C converte pontos no editor de alças; Alt/Option permite controles independentes; Shift restringe a direção a múltiplos de 45°. Recolher um controle não transforma necessariamente todo o segmento em uma reta: o outro controle cúbico também influencia a curva.

Shift+X troca preenchimento/traço nos casos representáveis; D restaura preenchimento branco e traço preto de uma unidade; / aplica nenhum ao atributo ativo. Gradientes/hachuras que exigiriam traço composto são recusados sem perda. Campos de texto não disparam esses comandos.

## Estado, histórico e contratos

A implementação atual preserva o histórico existente e garante commit unitário para o novo arraste Bézier; cancelar o gesto não muda a peça. Ainda não existe um barramento de comandos uniforme para todas as ferramentas legadas. Undo/redo global, histórico 3D e ferramentas antigas precisam de migração progressiva antes de declarar Command Pattern completo para toda a suíte.

Os estados de IA distinguem `idle`, `loading`, `diff` e `error` nas interfaces atuais. Um pipeline completo com estado `suggesting`, fila multimodal, cancelamento remoto e orçamento transacional permanece na especificação RF74.

Seletores padronizados incluem `editor-cmd-toggle-ai`, `editor-cmd-execute-2d`, `editor-cmd-convert-anchor-corner`, `editor-cmd-convert-anchor-smooth`, `ai-suggestion-card-{id}`, `ai-btn-apply`, `ai-btn-reject` e `ai-btn-accept`. Testes devem localizar os botões dentro do painel ou card correspondente, pois o mesmo tipo de ação pode existir em contextos diferentes.

## Cobertura real dos comandos propostos

| Comando da especificação | Estado atual |
| --- | --- |
| `cmd.file.new` | Pendente como comando formal |
| `cmd.file.open` | Formatos nativos locais; demais formatos seguem matriz |
| `cmd.file.save` | Exportação local; não equivale a salvar toda peça no servidor |
| `cmd.file.export` | JSON/PNG e GLB conforme editor; SVG/PDF genéricos ainda parciais |
| `cmd.history.undo/redo` | Histórico local existente; unificação de todos os motores pendente |
| `cmd.edit.select_all` | Seleção no escopo permitido |
| `cmd.edit.duplicate/delete` | Pendente como comandos completos e uniformes |
| `cmd.vector.convert_anchor/break_handle` | Curvas cúbicas abertas; teste de movimento, alças, ângulo e histórico |
| `cmd.vector.join_paths/simplify` | Pendente na UI |
| `cmd.transform.scale/rotate` | Campos e ferramentas existentes; gizmos/pivô de grupo completos pendentes |
| `cmd.transform.flip_h/flip_v` | Pendente |
| `cmd.arrange.bring_forward/send_backward/align` | Pendente como comandos uniformes |
| `ai.cmd.generate.vector` | Propostas vetoriais estruturadas; testes deste pacote são mock |
| `ai.cmd.generate.text_copy` | Revisão/continuação no Letters; não é gerador universal de layout |
| `ai.cmd.generate.color_palette` | Pendente como comando dedicado |
| `ai.cmd.edit.expand_vector` | Completar proposta existente; limites e escopo precisam de revisão |
| `ai.cmd.edit.restyle` | Refino de asset disponível; transformação irrestrita de estilo pendente |
| `ai.cmd.edit.vectorize_raster` | Pendente |
| `ai.cmd.edit.auto_layout` | Pendente como solver validado de restrições |
| `ai.cmd.feedback.contrast_check` | Pendente como recurso de produto; Axe do pacote avalia a UI |
| `ai.cmd.feedback.review_spelling` | Quatro regras locais e integração contextual existente; cobertura linguística integral pendente |
| `ai.cmd.feedback.design_critique/alt_text` | Pendente como comandos dedicados |
| `ai.cmd.action.accept/reject` | Revisão, controle de versão e retorno de foco |
| `ai.cmd.action.refine` | Novo pedido pelo formulário; refinamento dedicado de variante pendente |
| `ai.cmd.action.diff_toggle` | Comparação original/prévia e overlay; alternador completo de diferenças pendente |

O catálogo é uma especificação de evolução, não uma contagem de comandos concluídos. Código da aplicação ainda local; documentação e evidências são publicadas separadamente.
