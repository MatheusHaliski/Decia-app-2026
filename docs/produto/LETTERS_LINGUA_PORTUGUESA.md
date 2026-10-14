# Letters — estrutura de análise da Língua Portuguesa

## Pesquisa reproduzível e limites

O script `scripts/studio/consultar-bibliografia-portugues.py` consulta metadados públicos do catálogo Open Library. A execução de 14/10/2026 obteve seis respostas, cinco com registros candidatos. Os resultados estão em `pesquisa/portugues-bibliografia.json`, incluindo consulta, fonte, autoria retornada e ano da primeira publicação. Esse ano não identifica edição consultada. Nenhum livro foi baixado, lido integralmente ou convertido em regras por essa consulta. Registros candidatos devem ser conferidos antes de citação acadêmica de página ou edição.

Consulta bibliográfica, gramática normativa, descrição de uso e decisão editorial são funções diferentes. O editor deve distinguir convenções normativas, variação linguística legítima, gênero textual e preferências do autor. Não declarar que um script consultou “toda a língua” nem apresentar uma LLM como autoridade gramatical infalível.

## Taxonomia funcional

| Ramo | Elementos a analisar | Evidência esperada |
| --- | --- | --- |
| Ortografia | Grafia, acentuação, hífen, maiúsculas, segmentação e abreviaturas | Dicionário licenciado, versão, variante pt-BR/pt-PT e posição do token |
| Morfologia | Substantivo, artigo, adjetivo, numeral, pronome, verbo, advérbio, preposição, conjunção e interjeição | Token, lema, classe e alternativas ambíguas |
| Flexão nominal | Gênero, número, graus e concordância | Núcleo, dependentes e contexto |
| Flexão verbal | Pessoa, número, voz, tempo, modo e formas nominais | Verbo, sujeito e contexto temporal |
| Sintaxe | Sujeito simples/composto/oculto/indeterminado, oração sem sujeito; predicado nominal/verbal/verbo-nominal | Constituintes e justificativa, sem classificar apenas por palavra-chave |
| Complementação | Objetos, predicativos, complementos nominais, adjuntos, aposto, vocativo, regência e crase | Relação sintática e hipótese concorrente |
| Período | Coordenação; subordinação substantiva/adjetiva/adverbial; redução, correlação e pontuação | Limites das orações e relações |
| Pronomes | Referência, colocação, tratamento, tu/você e variação regional | Antecedente e consistência contextual |
| Semântica | Ambiguidade, pressuposição, inferência, polissemia e compatibilidade de termos | Trechos ancorados; não confundir inferência com fato |
| Texto e discurso | Coesão, coerência, progressão temática, conectores, gênero e adequação ao público | Diagnóstico com exemplos do próprio texto |
| Narrativa | Personagens, eventos, tempo, espaço, narrador e continuidade | Linha de eventos e evidência em trechos; reconhecer flashback, discurso indireto e hipótese |
| Interpretação | Informação explícita, inferência, argumento, causa, conclusão e intenção | Citação do trecho, justificativa e incerteza |

### Tempos, modos e formas

Indicativo: presente; pretéritos perfeito, imperfeito e mais-que-perfeito; futuros do presente e do pretérito. Subjuntivo: presente, pretérito imperfeito e futuro. Imperativo: afirmativo e negativo. Formas nominais: infinitivo pessoal/impessoal, gerúndio e particípio. Formas compostas, auxiliares, voz passiva analítica/sintética e construções aspectuais exigem análise da locução e contexto, não só terminações. Tratamento uniforme não deve apagar falas de personagens ou citações com outro registro.

## Níveis e modos de atuação implementados

1. Ortografia local: quatro padrões explícitos, apresentados para revisão. Ainda não é um corretor ortográfico completo nem análise baseada num dicionário acadêmico.
2. Gramática e sintaxe: endpoint real solicita preservar argumento, tom e estrutura; a pessoa confere a proposta. A intenção do prompt não garante preservação semântica.
3. Parágrafo: somente o bloco selecionado é proposto para substituição.
4. Documento: textos dos blocos são revisados numa lista ordenada; quantidade e limites são validados antes de aplicação atômica.

Completar é um modo separado: Palavra, Frase, Parágrafo e Continuação do documento. A inserção preserva o texto ao redor do cursor. O modo automático local sugere sufixos de palavras já presentes no documento. Propostas remotas exigem solicitação explícita e consentimento, com orçamento de saída por alcance; nenhuma chamada é disparada automaticamente por digitação. Revisão do texto ou mudança de cursor, nível, modo ou instrução invalida a proposta. Desfazer recupera a versão anterior da sessão.

## Trabalho restante para análise linguística abrangente

Incorporar dicionários licenciados de variantes explícitas, corpus e analisador morfossintático; documentar licenças e cobertura. Avaliar com exemplos positivos e contraexemplos, incluindo citações, nomes próprios, regionalismos e linguagem técnica. Medir falsos positivos por categoria e variante. Ancorar sugestões por intervalo e revisão; oferecer feedback, aceitar/rejeitar, explicação, privacidade e histórico. Modelos remotos não substituem validação profissional, corpus nem referência bibliográfica.
