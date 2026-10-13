# Drawer — desenho integrado ao editor de tarefas

Proposta solicitada pelo usuário. O Drawer e o Letters são editores de peças dentro da tarefa: desenho e documento de texto, respectivamente. Preservam a mesma identidade, autorização, classificação, histórico e vínculo com projetos/DECIA. Estado: especificado, implementação pendente.

## Uma interface, motores distintos

| Modo | Operações pretendidas | Formatos e condição de aceite |
|---|---|---|
| Desenho 2D e imagem | Traços, formas, texto, camadas, medidas, recorte, seleção, desfazer/refazer | PNG com exportação de imagem válida; projeto editável preservado separadamente |
| Modelo 3D | Cena, objetos, transformações, materiais, câmera, medidas, hierarquia e unidades | GLB válido, com teste de importação/exportação e compatibilidade declarada |
| Desenho CAD | Geometria, camadas, cotas, unidades, coordenadas, blocos e propriedades suportadas | DWG exige motor/SDK/conversor validado; informar versões suportadas e perdas. Não renomear PNG/JSON para DWG |

O usuário vê “editar”, “anotar”, “visualizar” ou “converter” conforme a capacidade realmente disponível. Não apresentar todos os formatos como editáveis antes de testes de fidelidade. Arquivos originais são preservados. Importação de referências externas, conteúdo ativo e recursos remotos exige controles próprios; não executar instruções de arquivos ou baixar dependências arbitrárias.

## Experiência dentro da tarefa

Peças à esquerda; área de trabalho central; inspetor de propriedades à direita. Cada peça informa tipo, unidade, versão e salvamento. A tarefa mantém finalidade, prazo, responsáveis e critérios em um painel de contexto. Modo de foco e comandos pesquisáveis tornam a interface didática, sem expor todas as ferramentas simultaneamente.

O usuário cria uma peça, escolhe o modo e define unidades/escala quando aplicável. Desenha e organiza camadas; associa medidas e observações a elementos; salva uma versão; leva a peça ao projeto ou DECIA sem ampliar acesso. Exportar exige escolher formato e capacidades e conferir o resultado. A representação editável e o arquivo exportado são objetos diferentes.

Letters pode referenciar um desenho e sua versão; Drawer pode referenciar um relatório autorizado. Alterar a fonte sinaliza divergência na referência, sem atualizar documentos aprovados silenciosamente. Medidas do modelo dependem de unidades/escala válidas; medida estimada por imagem não vira quantitativo certificado.

## IA assistiva

Comandos explícitos podem explicar ferramentas, sugerir estrutura de camadas, produzir rascunhos geométricos e propor ajustes em elementos selecionados. Mudanças são propostas revisáveis, com unidades e limitações. A IA não atesta viabilidade estrutural, segurança, orçamento ou conformidade técnica. Especialistas revisam quando o uso requer responsabilidade profissional.

Não enviar conteúdo protegido para provedor externo. Aplicar orçamento, consentimento e versão-base. Não gerar chamadas pagas por movimento do mouse. Desfazer, rejeitar e continuar manualmente permanecem disponíveis; proposta antiga não sobrescreve edição recente.

## Entrega e validação

1. Fundação de peças: autorização, armazenamento, versões, recuperação, limites e seleção do editor.
2. Editor 2D com operações básicas, camadas e PNG; testes de coordenadas, desfazer e reabertura.
3. Visualizador/inspector GLB e depois edição 3D com round-trip em biblioteca de arquivos conhecidos.
4. Avaliar motores/SDKs CAD, licença, implantação e compatibilidade DWG; entregar apenas versões/capacidades aprovadas no teste.
5. Propostas de IA sobre seleção, sem chamadas contínuas; integração com Letters, projetos e DECIA.

Aceites: salvar/reabrir mantém elementos e unidades; desfazer não perde outros elementos; exportação produz formato verdadeiro; arquivos adversos não executam código; referências/anexos respeitam ACL; revogação interrompe novas operações; conflitos preservam edições; suporte de teclado, foco, zoom e descrição textual permite acessar comandos e propriedades. Validar velocidade com desenhos representativos e limites explícitos de complexidade.

Integração: RF4/RF8/RF12/RF41 (peças e edição), RF11/RF38 (artes sem confundir decoração com geometria técnica), RF13/RF34 (artefatos e leitura técnica), RF21/RF22 (projetos), RF29 (DECIA) e RF43 (IA). Leitura/extrair quantitativos do RF34 não prova suporte a edição DWG nativa.
