# Drawings — objetivo, criação, edições com IA e entrega

Esta sequência demonstra uma jornada completa de um **estudo conceitual fictício de sala de trabalho**, com login real, API real e OpenAI real. Não houve interceptação das chamadas. Aceites e comandos foram executados por roteiro automatizado; não representam homologação profissional humana ou aprovação do usuário.

## Etapas e evidências

| Etapa | Ação e evidência |
|---|---|
| 1 | [Objetivo e critérios](01-objetivo-e-criterios.png): sala 4 × 3 m, sofá, mesa, cadeira, legibilidade e entrega em PNG; 1 unidade de tela = 10 mm |
| 2 | [Geração em andamento](02-ia-gerando-proposta.png): processamento real, mantendo o desenho anterior |
| 3 | [Primeira proposta da IA](03-proposta-ia-para-revisao.png): comparação e proveniência; ainda não aplicada |
| 4 | [Proposta revisada e aplicada](04-primeira-versao-aplicada.png): elementos editáveis na grade e lista de nós |
| 5 | [Edição de cores, gradiente e traçado](05-cores-gradiente-e-tracado.png): ajustes manuais antes da próxima solicitação |
| 6 | [Refinamento pela IA](06-ia-propondo-refinamento.png): nova resposta real, preservando os objetos e melhorando estilos |
| 7 | [Versão refinada e cotas](07-versao-refinada-e-cotas.png): unidade informada, fator de conversão e limites 4000 × 3000 mm |
| 8 | [Conclusão inicial da proposta](08-proposta-concluida.png), seguida por [conferência de legibilidade](08a-revisao-final-legibilidade.png) e [conclusão após ajuste de contraste](08b-proposta-concluida-apos-revisao.png) |
| 9 | [Entrega final exportada](09b-entrega-final-exportada.png): PNG colorido e projeto editável após reimportação e conferência |
| 10 | [Interface no celular](10-jornada-mobile.png): captura da primeira jornada; não é um novo teste de IA |

[PDF com as etapas](JORNADA_DRAWINGS.pdf) · [Pacote completo](PACOTE_JORNADA_DRAWINGS.zip) · [PNG final](PROPOSTA_FINAL.png) · [Projeto editável](PROPOSTA_FINAL.ws-studio.json).

No GitHub, abra o arquivo e use **Download raw file**. Para inspecionar imagens grandes, abra o PNG e amplie; o PDF mantém as capturas completas.

## IA real e consumo

Três chamadas no total: uma resposta recusada pela validação do editor e duas respostas válidas (criação/refinamento). Total registrado pelo provedor: **2.280 tokens de entrada + 1.918 de saída = 4.198 tokens**. Não houve retries automáticos, chamadas por movimento do mouse ou novas chamadas na revisão final.

A primeira tentativa consumiu tokens e não alterou o desenho. O motivo específico do conteúdo recusado não foi retido; antes do teste seguinte, o esquema remoto passou a declarar os mesmos limites de cores, identificadores, números e comprimentos do validador. [Registro da tentativa](TENTATIVA_RECUSADA.json).

[Primeira resposta válida](proposta-ia-1.json) · [Resposta de refinamento](proposta-ia-2.json) · [Evidências e IDs de inferência](EVIDENCIAS.json). As revisões do projeto são contadores locais de sessão; a reimportação inicia outra sessão e não é uma trilha persistente do servidor. O arquivo final reflete a revisão visual posterior e os ajustes de contraste.

## Qualidade técnica e limitações

379 testes frontend aprovados, incluindo validação de estilos/unidades e proteção contra proposta desatualizada. Testes Java: serviço, contratos HTTP e OpenAPI aprovados; build/tipos/lint aprovados. PNG com assinatura válida; nenhuma exceção de página na jornada principal. Reimportação e nova exportação verificadas, sem IA adicional.

O objetivo concluído é o estudo conceitual definido no exemplo. Não é projeto executivo, certificação ABNT, análise ergonômica/estrutural ou aprovação de acessibilidade arquitetônica. Não há persistência de peças no servidor, DWG/GLB, conversão Munsell/ICC, Bézier ou volume 3D nesta entrega.

[Estudo técnico e acadêmico incluído no pacote](DRAWINGS_ESTUDO_TECNICO_ACADEMICO.md) · [Arquitetura incluída no pacote](LETTERS_DRAWINGS_ENGENHARIA.md).
