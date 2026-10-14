# Letters & Drawings — capturas da prévia local

Capturas de 14/10/2026. A identidade é sintética e interceptada no navegador. Não há chamada de IA nem persistência de peças no servidor. As imagens demonstram apenas as operações locais da prévia em `/studio`.

- [Letters: comparação e revisão](01-letters-diff.png)
- [Drawings: grade, nós e edição de coordenadas](02-drawings-nos.png)
- [Drawings: indicadores geométricos](03-drawings-analise.png)
- [Drawings no celular](04-drawings-mobile.png)
- [PNG realmente exportado](desenho-exportado.png)
- [Registro de validação](VALIDACAO.json)

Para baixar no GitHub, abra o arquivo e use **Download raw file**. O PNG exportado é monocromático, sem grade/badges. O projeto editável é exportado separadamente em JSON.

Validação: 375 testes frontend aprovados (43 arquivos), incluindo 12 testes novos da fundação/análise/interface; tipos, lint e build de produção aprovados. Navegador: sem erros de página ou overflow móvel; assinatura PNG válida. Testes posteriores da fundação foram repetidos após limitar geometria adversa.

O seletor tem quatro níveis, mas não executa um agente LLM nesta prévia. Regras linguísticas são limitadas e explicadas; notas de IA não são inventadas. Análise POS completa, narratologia, Munsell/ICC, CAD, DWG/GLB, renderização volumétrica, WYSIWYG completo, colaboração e armazenamento no servidor estão pendentes. Consulte [a especificação de engenharia](../../../produto/LETTERS_DRAWINGS_ENGENHARIA.md).
