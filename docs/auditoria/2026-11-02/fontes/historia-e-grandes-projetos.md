# História da profissão e grandes projetos — pesquisa para a aba por profissão (fase 3)

**Frente:** história da profissão e grandes projetos (no mundo, no Brasil e dentro do Work Station).
**Data:** 2026-11-02 · **Autor:** pesquisa assistida (Claude), para revisão do dono do produto.
**Lidos antes:** `contracts/career/README.md`, `contracts/career/occupation-packs/generico.json`, `contracts/career/occupation-pack.schema.json`, `docs/diagramas/RF75/README.md` (CA19, E4, E6), `docs/produto/REDE_PROFISSIONAL_VISIBILIDADE.md`, `docs/auditoria/2026-10-31/GUIA_DE_CARREIRA.md` §3, §4.6 e §7, `docs/produto/ABAS_POR_PERFIL.md` (Vitrine de projetos, RF27).
**Método:** 20 buscas web (WebSearch); nenhuma página foi aberta por WebFetch porque `enciclopedia.itaucultural.org.br` e `museudapessoa.org` não resolvem na rede desta sessão (precisam ser liberados nas configurações de rede do ambiente). Tudo o que não foi confirmado em fonte primária está marcado **não conferido**, no mesmo espírito do campo `naoConferido` dos pacotes.
**Convenção de marcação:** ✅ fato conferido em fonte citada · ⚠️ não conferido (conhecimento geral ou fonte secundária) · 💡 sugestão de produto (não é fato).

---

## 0. Resumo executivo

1. A ideia "Sou um bom engenheiro de software → aba com a história e os grandes projetos da profissão" cabe no RF75.CA19 sem tela nova por profissão: a história e os projetos de referência viram **duas seções novas do `OccupationPack`** (`history`, `landmarkProjects`), dado versionado com fontes, licença e revisão, e uma **terceira fonte dinâmica** (`Showcase`) com o que as pessoas da profissão publicaram no próprio Work Station.
2. Os produtos de referência se dividem em dois modelos: **curadoria editorial** (Google Arts & Culture, Behance, ArchDaily, Computer History Museum, ACM/IEEE) e **colaboração com regras** (Wikipedia/Wikidata, awesome lists, Museu da Pessoa). O formato dominante é **linha do tempo + cards com ficha** (ano, autores, lugar, por que importa, fontes); mapas aparecem como complemento (IEEE Milestones, ArchDaily).
3. Licenças: Wikipedia é CC BY-SA 4.0 (atribuição + compartilhar igual, o que impede copiar texto para dentro de um pacote proprietário sem licenciar igual); Wikidata é CC0 (fatos reutilizáveis sem atribuição); awesome lists usam CC0; acervos de museus e portais brasileiros têm licença **por instituição** — o pacote precisa guardar a licença **por fonte**, não uma só.
4. Recomendação central: **o Work Station não copia textos de terceiros**. A IA (RF43) gera um texto próprio, curto, com **cada marco ligado a uma fonte** (URL, data de acesso, licença); o curador revisa; o pacote só vai a `ativo` depois disso; revisão anual com `reviewedAt`.
5. "Maiores projetos dentro do Work Station" **não é ranking de pessoas**: é uma vitrine de **peças, tarefas e projetos públicos** com opt-in explícito de aparecer na vitrine da profissão, créditos, remix com crédito e validação humana — reaproveitando a Vitrine de projetos do RF27 e as regras de `REDE_PROFISSIONAL_VISIBILIDADE.md`.
6. Proposta: **RF76 — Memória da Profissão** (aba "Minha profissão" em `/profile?tab=profissao`, com sub-abas História · Grandes projetos · No Work Station), 12 critérios de aceite, 4 entidades novas, 3 etapas.

---

## 1. Benchmark (12 referências)

Data de acesso de todas as URLs: **2026-11-02** (via resultados de busca; páginas não abertas diretamente, salvo indicação).

| # | Produto | URL | Formato | Curadoria × colaborativo | Licença / fontes | O que conferimos | Lição para o WS |
|---|---|---|---|---|---|---|---|
| 1 | **Wikipedia** (verbetes e linhas do tempo "History of…") | https://meta.wikimedia.org/wiki/Terms_of_use/Creative_Commons_4.0/FAQ · https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse | verbete longo, infobox, cronologias ("Timeline of…"), categorias | colaborativo aberto com políticas (verificabilidade, fontes) | ✅ CC BY-SA 4.0 para edições desde 2023 (antes 3.0); reuso exige atribuir título, autores, fonte e licença e **compartilhar igual** | ✅ licença e regras de atribuição confirmadas (Creative Commons, 2023-06-29: https://creativecommons.org/2023/06/29/wikipedia-moves-to-cc-4-0-licenses/) | Não copiar texto para o pacote (ShareAlike contaminaria o dado). Usar como **fonte citada** e como fonte de fatos; texto do WS é próprio. |
| 2 | **Wikidata** | https://www.wikidata.org/ (licença citada no FAQ acima) | base de fatos estruturados (itens, propriedades, datas, "inception", "architect", "located in") | colaborativo aberto | ✅ CC0 — fatos reutilizáveis sem atribuição | ✅ CC0 confirmado no FAQ da Wikimedia | Fonte ideal para campos estruturados (ano, autores, lugar, QID) de `landmarkProjects`; guardar `wikidataId` para desambiguar e atualizar. |
| 3 | **Google Arts & Culture** | https://support.google.com/culturalinstitute/partners/answer/4395223 · https://www.theartnewspaper.com/2018/01/19/how-google-became-a-major-producer-of-cultural-content | "stories" (narrativa com imagens, vídeo, texto, scroll), exposições online por instituição, coleções | **curadoria por parceiros** (museus) com ferramenta de storytelling do Google; instituições mantêm direitos | ✅ parceiros mantêm todos os direitos; conteúdo não é livre | ✅ modelo de parceria e formatos (6.000 exposições em 2018, número desatualizado) | Formato "story" (narrativa curta com imagens e legendas) é a melhor referência de **leitura** para a aba História. Não dá para reutilizar imagens. |
| 4 | **ArchDaily** (projetos de arquitetura) | https://www.archdaily.com/projects (listagens por categoria; "Submit a Project") | cards de projeto com ficha padronizada: escritório, área, ano, cidade/país, fabricantes, tags; páginas por categoria | **envio pelos escritórios + seleção editorial** (⚠️ critérios de seleção não conferidos) | ⚠️ conteúdo proprietário; fotos com crédito ao fotógrafo | ✅ campos da ficha (arquiteto, área, ano, local, categoria) | A **ficha padronizada** do card (autores, ano, lugar, tipo, créditos de imagem) é o modelo para `LandmarkProject` e para o `Showcase`. |
| 5 | **Behance** (curated galleries) | https://help.behance.net/hc/en-us/articles/204483974 · https://medium.com/behance-blog/behance-curation-philosophy-and-approach-6e0ae9ab350f | galerias curadas por categoria (mais de 100), selo "featured" na capa, feed | **curadoria humana** sobre publicação aberta: equipe revisa todo projeto publicado; ~1% é destacado; sem garantia | ✅ regras de curadoria publicadas; conteúdo pertence aos autores | ✅ processo de curadoria (equipe humana, filas por categoria, selo) | Modelo direto para "No Work Station": publicação opt-in + **curador humano** destaca; selo "em destaque na profissão", sem ranking numérico. |
| 6 | **GitHub awesome lists** (sindresorhus/awesome) | https://github.com/sindresorhus/awesome · https://awesome.ecosyste.ms/lists/sindresorhus%2Fawesome-lint | listas em Markdown por tema, com linter (`awesome-lint`) e guia de contribuição | colaborativo com **regras de qualidade** (PR revisado) | ✅ CC0-1.0 (listas); ✅ orientação de usar CC0/CC em vez de licença de código | ✅ licença CC0 e existência do linter (fontes secundárias) · ⚠️ Arctic Code Vault não conferido | Modelo de **dado + validador**: o pacote de história passa por um validador (`validar-pacotes.mjs`) como a lista passa pelo linter. |
| 7 | **Computer History Museum — Timeline of Computer History** | https://www.computerhistory.org/timeline/ | linha do tempo por ano (desde 1930s) e por categoria (Computers, Memory & Storage, AI & Robotics…), busca por palavra; exposição online "Revolution" | **curadoria institucional** | ⚠️ copyright do museu; licença de reuso não conferida | ✅ estrutura ano × categoria e busca (listagens do próprio site) | Referência de **estrutura**: marcos por ano com filtro por categoria (ferramentas, linguagens, instituições). |
| 8 | **Museu da Pessoa** | https://museudapessoa.org/ (não abriu nesta sessão) · https://almapreta.com.br/sessao/cultura/museu-da-pessoa-tem-acervo-de-mais-de-30-anos-de-historias-de-vidas-brasileiras/ | histórias de vida (áudio, vídeo, texto, fotos), coleções temáticas (ex.: profissões, "Vidas em cordel") | **colaborativo**: qualquer pessoa conta e envia a própria história; museu virtual desde 1991 | ⚠️ termos de uso do acervo não conferidos (fonte secundária fala em 15 mil histórias e 72 mil documentos, 2023) | ⚠️ formatos e tamanho por fonte secundária | Mostra o valor de **histórias de pessoas comuns da profissão**, não só "grandes nomes". No WS: depoimentos opt-in no Showcase, nunca inferidos. |
| 9 | **IEEE — ETHW e IEEE Milestones** | https://ethw.org/Milestones:IEEE_Milestones_Program · https://ieeemilestones.ethw.org/ | wiki de história (ETHW) + programa de marcos com placa física, mapa e lista; oral histories | **proposta por membros + comitê de história aprova** (desde 1983) | ✅ processo de proposta/aprovação; ⚠️ licença do texto da wiki não conferida | ✅ programa, processo e governança | Modelo de **"marco" como entidade** com proposta, evidência e aprovação; critérios explícitos para entrar na lista. |
| 10 | **ACM — Turing Award / History Committee** | https://awards.acm.org/about/turing-laureate-interviews · https://history.acm.org/ | perfis biográficos com explicação do trabalho premiado, publicações-chave, entrevistas (oral history), vídeos curtos | **curadoria institucional** (historiadores) | ⚠️ copyright ACM | ✅ existência dos perfis e entrevistas | Modelo para "figuras de referência": **perfil curto + por que importa + obras + fonte**, sem culto a personalidade. |
| 11 | **Conselhos profissionais (CAU/BR, CFM)** | https://planalto.gov.br/ccivil_03/_Ato2007-2010/2010/Lei/L12378.htm · https://portal.cfm.org.br/noticias/historia-da-medicina/ · https://portal.cfm.org.br/noticias/fenam-cria-rede-de-museus-da-historia-da-medicina/ | CFM: notícias e artigos de história, acervo do "Jornal Medicina" (desde 1985) online; FENAM: Rede Nacional de Museus de História da Medicina (19 museus). CAU/BR: ⚠️ não encontramos um programa "Acervo" formal; o que existe é o marco legal (Lei 12.378/2010) e apoio do CAU/RS à câmara técnica do CONARQ | institucional | gov.br/planalto: textos legais são de livre reprodução; portais dos conselhos: ⚠️ não conferido | ✅ Lei 12.378/2010 (CAU criado em 31/12/2010, instalado em 01/01/2012; antes Decreto 23.569/1933 e Lei 5.194/1966) · ✅ CFM fundado em 1945 (80 anos em 2025) | Os conselhos são a **fonte primária da seção "regulamentação no Brasil"** de cada pacote; a "história" deles raramente está estruturada — o WS pode estruturar e citar. |
| 12 | **Enciclopédia Itaú Cultural** e **Brasiliana Fotográfica** | https://enciclopedia.itaucultural.org.br/ (não abriu nesta sessão) · https://brasilianafotografica.bn.gov.br/ · https://www.publishnews.com.br/materias/2023/04/11/ims-disponibiliza-para-download-parte-de-seu-acervo-fotografico-e-iconografico | Itaú Cultural: verbetes (artistas, obras, termos), mais de 12 mil imagens; Brasiliana Fotográfica (BN + IMS, 2015, DSpace): acervo fotográfico com 11 instituições, cada uma com sua regra de uso | curadoria institucional (Itaú Cultural recebe contribuições de pesquisadores) | ⚠️ licença dos verbetes do Itaú Cultural não conferida; ✅ IMS libera parte do acervo em domínio público pedindo crédito "autor / Acervo Instituto Moreira Salles"; ✅ Brasiliana agrega instituições com **licenças próprias** | ✅ natureza e parceria da Brasiliana; ⚠️ termos do Itaú Cultural | Imagens históricas brasileiras em domínio público existem, mas a **licença é por item/instituição**: o esquema precisa de `license` e `credit` em cada imagem. |

**Síntese do benchmark**

- **Formatos que funcionam:** linha do tempo por ano com filtro por categoria (CHM); card com ficha padronizada (ArchDaily); "story" narrativa curta com imagem e legenda (Arts & Culture); perfil curto de pessoa com "por que importa" (ACM); lista com regra e validador (awesome). Mapas são complemento (IEEE Milestones), úteis para "diversidade regional" no Brasil.
- **Curadoria × colaboração:** todos os produtos sérios combinam as duas coisas — publicação ou proposta aberta e **aprovação humana** (Behance, IEEE Milestones, awesome via PR). É o mesmo princípio do RF75.CA07 (selo só com validação humana).
- **Licenças:** nenhum pacote do WS deve depender de uma licença única. Guardar `license` por fonte e por imagem; preferir Wikidata (CC0), textos legais (planalto.gov.br) e acervos em domínio público com crédito; **texto do WS é autoral**, gerado pela IA e revisado, com citações (compatível com RF43 e RF75.CA13).

---

## 2. Conteúdo por profissão

### 2.1 Como estruturar "história" (quatro blocos, cada um com fontes)

| Bloco | O que entra | Campo proposto | Exemplo (engenharia de software) |
|---|---|---|---|
| **Marcos** | 8–15 marcos datados, no mundo e no Brasil, com uma frase "por que importa" e fonte | `history.milestones[]` (`year`, `where`: mundo/brasil, `title`, `why`, `sources[]`) | 1968 conferência da OTAN cunha "software engineering" ⚠️; 1991 Linus Torvalds anuncia o Linux ⚠️; 2001 Manifesto Ágil ⚠️ |
| **Regulamentação no Brasil** | lei de criação do conselho, normas de exercício, o que é privativo, o que mudou | `history.regulationTimeline[]` (reaproveita `$defs/regulation` + `year`) | Software: **não há conselho nem regulamentação de exercício** (fato relevante para a pessoa) ⚠️; Arquitetura: Decreto 23.569/1933 → Lei 5.194/1966 → Lei 12.378/2010 ✅ |
| **Figuras de referência** | 5–10 pessoas, com cuidado de **diversidade** (gênero, região, época) e "por que é referência", sem ranking | `history.referencePeople[]` (`name`, `years`, `country`, `why`, `sources[]`, `wikidataId`) | Grace Hopper, Margaret Hamilton, Dennis Ritchie ⚠️; Brasil: equipe do Pix no BCB como instituição, não pessoa 💡 |
| **Evolução das ferramentas** | o que se usava em cada era e o que se usa hoje; liga com `vocabulary.tools` | `history.toolsEvolution[]` (`era`, `tools[]`, `note`) | cartões perfurados → terminais → IDEs → nuvem e assistentes de IA ⚠️ |

Regras editoriais (alinhadas a RF75.CA09, CA13 e CA18): texto curto (cada marco ≤ 300 caracteres), linguagem simples, **toda afirmação com fonte e data**, distinguir "fato" de "interpretação", sem culto a personalidade, sem promessa de mercado. Inclui sempre uma linha "o que isso significa para quem entra hoje" 💡.

### 2.2 Como estruturar "grandes projetos" (critérios de escolha)

Critérios (cada projeto marca os que atende; entra na lista quem atende **pelo menos dois**, e a lista inteira atende diversidade regional):

| Critério | Pergunta | Como evidenciar |
|---|---|---|
| **Impacto** | mudou a vida de muita gente ou de um setor? | número com fonte e data (ex.: usuários, cobertura, extensão) |
| **Inovação** | introduziu técnica, forma ou modelo novo? | fonte técnica ou acadêmica |
| **Reconhecimento** | prêmio, tombamento, lista de patrimônio, adoção internacional? | UNESCO, Iphan, prêmios, normas |
| **Diversidade regional** | a lista cobre regiões do Brasil além do eixo Rio–SP–Brasília? | pelo menos 1 projeto fora do Sudeste/Centro-Oeste por lista 💡 |
| **Vigência / lição** | ainda está em uso ou ensina algo (inclusive fracasso)? | nota "o que a profissão aprendeu" |

Campos do card (`LandmarkProject`): `title`, `scope` (mundo/brasil), `year` ou `period`, `place` (cidade/UF/país), `authors[]` (pessoas e instituições), `criteria[]`, `summary` (≤ 400 caracteres), `whyItMatters`, `figures[]` (número + fonte + data), `image` (url, `license`, `credit`) opcional, `sources[]` (≥ 2), `wikidataId`, `status` (conferido / não conferido).

### 2.3 Exemplos por profissão, com marcação

Legenda: ✅ conferido nesta pesquisa (fonte na tabela) · ⚠️ não conferido (conhecimento geral; validar antes de `ativo`) · 💡 sugestão.

**Engenharia de software / desenvolvimento**

| Projeto | Dados | Status | Fonte conferida |
|---|---|---|---|
| Linux (mundo) | kernel anunciado por Linus Torvalds em 1991; base de Android e da maioria dos servidores | ⚠️ | — (buscar kernel.org / Wikidata Q388) |
| Pix (Brasil) | sistema de pagamentos instantâneos do Banco Central; ~148 milhões de pessoas físicas usuárias em dez/2025 (≈86% da população adulta); 920 milhões de chaves; > R$ 35 trilhões movimentados em 2025 | ✅ números · ⚠️ data de lançamento (16/11/2020) não confirmada na busca | Relatório de Gestão do Pix 2023–2025 (BCB): https://www.bcb.gov.br/content/estabilidadefinanceira/pix/relatorio_de_gestao_pix/relatorio_gestao_pix_2026.pdf · https://movimentoeconomico.com.br/economia/2026/08/11/chaves-pix-chegam-a-920-milhoes-e-sistema-movimenta-r-35-tri-em-2025/ |
| Conecte SUS → **Meu SUS Digital** (Brasil) | app do Ministério da Saúde renomeado em jan/2024; login Gov.br | ✅ renomeação · ⚠️ história anterior (Cartão SUS Digital, DATASUS) | https://www.mobiletime.com.br/noticias/23/02/2024/transformacao-digital-do-ministerio-da-saude-comeca-pelo-app-meu-sus-digital/ |
| Nubank (Brasil) | fundado em 2013; exemplo de produto digital em escala | ⚠️ | — |
| 💡 Acrescentar | Urna eletrônica (TSE, 1996), SPB (2002), Gov.br, Serpro/Dataprev como instituições, Lua (linguagem criada na PUC-Rio, 1993) para diversidade | ⚠️ | — |

**Direito**

| Projeto | Dados | Status |
|---|---|---|
| Constituição de 1988 | promulgada em 5/10/1988 | ⚠️ (texto em planalto.gov.br, livre reprodução) |
| Código de Defesa do Consumidor (Lei 8.078/1990) | 11/09/1990 | ⚠️ |
| Marco Civil da Internet (Lei 12.965/2014) | 23/04/2014 | ⚠️ |
| LGPD (Lei 13.709/2018) | 14/08/2018; já citada no `generico.json` | ⚠️ (data) |
| 💡 Acrescentar | Lei Maria da Penha (11.340/2006), Estatuto da Criança e do Adolescente (1990), Lei da Ficha Limpa, Súmulas vinculantes; mundo: Declaração Universal de 1948, Magna Carta | ⚠️ |

Observação: para Direito, "grandes projetos" são **normas e julgamentos**; o campo `kind` do projeto deve admitir `norma`, `obra`, `sistema`, `programa`, `instituicao`, `pesquisa`.

**Arquitetura e urbanismo**

| Projeto | Dados | Status | Fonte |
|---|---|---|---|
| Brasília (Plano Piloto de Lúcio Costa; edifícios de Niemeyer) | Patrimônio Mundial UNESCO em 1987 (ref. 445; critérios i e iv); concurso de 1957 | ✅ via fontes secundárias; página oficial não aberta | https://www.worldheritagesite.org/list/id/445 · (oficial a conferir) https://whc.unesco.org/en/list/445 |
| Conjunto Moderno da Pampulha (BH) | Niemeyer, Burle Marx, Joaquim Cardozo; anos 1940; UNESCO em 17/07/2016 (ref. 1493; critérios i, ii, iv) | ✅ | https://whc.unesco.org/ES/list/1493 · https://agenciagov.ebc.com.br/noticias/202608/conjunto-moderno-da-pampulha-um-marco-da-arquitetura-brasileira-reconhecido-pela-unesco |
| SESC Pompeia (SP) | Lina Bo Bardi; obras 1977–1986; inaugurado em duas etapas (1982 e 1986); tombado pelo Iphan em 2015 (já tinha proteção municipal) | ✅ | https://en.wikipedia.org/wiki/SESC_Pompeia · https://portal.sescsp.org.br/online/artigo/compartilhar/6692_FABRICA+DE+TALENTOS |
| 💡 Acrescentar (diversidade regional) | Cidade de Goiás e Ouro Preto (patrimônio), Pelourinho (Salvador), Ver-o-Peso (Belém), obras de Severiano Porto (Amazonas), João Filgueiras Lima (Lelé, Rede Sarah) | ⚠️ |

**Medicina**

| Projeto | Dados | Status | Fonte |
|---|---|---|---|
| Programa Nacional de Imunizações (PNI) e Zé Gotinha | PNI criado em 1973 (fontes divergentes citam 1970 e 1975); Zé Gotinha criado em 1986 por Darlan Rosa, nome escolhido por cartas de crianças | ✅ (com divergência registrada) | https://www.gov.br/saude/pt-br/campanhas-da-saude/arquivos/ebook_vacina_final_alta.pdf · https://www.grupomedcof.com.br/blog/grandes-marcos-da-vacinacao-no-brasil/ |
| Instituto Butantan | fundado em 1901 (soro antiofídico; vacinas) | ⚠️ |
| Fiocruz | origem em 1900 (Instituto Soroterápico Federal; Oswaldo Cruz) | ⚠️ |
| SUS | Constituição de 1988 e Lei 8.080/1990 | ⚠️ |
| 💡 Acrescentar | Carlos Chagas (doença de Chagas, 1909), transplante cardíaco de Zerbini (1968), Rede Sarah, Samu; mundo: anestesia, antibióticos, OMS | ⚠️ |

**Engenharia civil**

| Projeto | Dados | Status | Fonte |
|---|---|---|---|
| Itaipu Binacional | tratado em 26/04/1973; entidade formalizada em 17/05/1974; primeira unidade geradora em 05/05/1984; últimas turbinas em 2006 | ✅ | https://en.wikipedia.org/wiki/Itaipu_Dam · https://militares.estrategia.com/portal/atualidades/50-anos-do-tratado-para-a-construcao-da-usina-itaipu/ |
| Ponte Rio–Niterói (Ponte Presidente Costa e Silva) | inaugurada em 04/03/1974; ~13,29 km (uma fonte cita 13,69) | ✅ | https://www.fsa.br/maiores-obras-engenharia-brasil/ · Wikipedia (en) |
| 💡 Acrescentar | Transposição do São Francisco, Rodovia Transamazônica (lição de fracasso), Metrô de SP (1974), Hidrelétrica de Belo Monte (controvérsia socioambiental como aprendizado), Ponte Anita Garibaldi (SC) | ⚠️ |

Para **todas** as profissões: a lista "mundo" deve ter 3–5 itens e a "Brasil" 5–8, com pelo menos um fora do Sudeste e um exemplo de **lição aprendida** (não só glória) 💡.

---

## 3. Manter como dado versionado por pacote de domínio

### 3.1 Extensão proposta de `contracts/career/occupation-pack.schema.json`

Hoje `additionalProperties: false` e `required` lista 21 seções; `version` é `AAAA.MM.N`; `status` é `pesquisa → revisado → ativo`; `sources[]` tem `title/url/accessedAt`; `$defs/regulation`, `$defs/label` (pt-BR/en/es) e `$defs/url` já existem. A proposta **reutiliza esses `$defs`** e acrescenta duas seções **opcionais** (para não quebrar `generico.json`, que não tem profissão) e dois `$defs` novos.

```jsonc
// trecho a acrescentar em "properties" (ambas opcionais; obrigatórias quando fields.length > 0 — checagem cruzada no validador)
"history": {
  "type": "object",
  "required": ["intro", "milestones", "regulationTimeline", "referencePeople", "toolsEvolution", "review"],
  "additionalProperties": false,
  "properties": {
    "intro": { "$ref": "#/$defs/i18nText" },                       // ≤ 600 caracteres por idioma
    "milestones": { "type": "array", "minItems": 6, "maxItems": 20, "items": { "$ref": "#/$defs/milestone" } },
    "regulationTimeline": { "type": "array", "items": { "$ref": "#/$defs/regulationEvent" } }, // pode ser [] com "note" explicando (ex.: software não tem conselho)
    "regulationNote": { "$ref": "#/$defs/i18nText" },
    "referencePeople": { "type": "array", "minItems": 3, "maxItems": 12, "items": { "$ref": "#/$defs/referencePerson" } },
    "toolsEvolution": { "type": "array", "minItems": 2, "maxItems": 8, "items": { "$ref": "#/$defs/toolsEra" } },
    "review": { "$ref": "#/$defs/review" }
  }
},
"landmarkProjects": {
  "type": "object",
  "required": ["criteria", "world", "brazil", "review"],
  "additionalProperties": false,
  "properties": {
    "criteria": { "type": "array", "items": { "enum": ["impacto", "inovacao", "reconhecimento", "diversidade-regional", "licao-aprendida"] } },
    "world":  { "type": "array", "minItems": 3, "maxItems": 6,  "items": { "$ref": "#/$defs/landmarkProject" } },
    "brazil": { "type": "array", "minItems": 4, "maxItems": 10, "items": { "$ref": "#/$defs/landmarkProject" } },
    "showcase": {                                                   // ligação com a fonte dinâmica (§4); nada de pessoas aqui
      "type": "object", "additionalProperties": false,
      "properties": { "enabled": { "type": "boolean" }, "minValidatedItems": { "type": "integer", "minimum": 1 }, "tags": { "type": "array", "items": { "$ref": "#/$defs/slug" } } }
    },
    "review": { "$ref": "#/$defs/review" }
  }
}
```

```jsonc
// $defs novos (reutilizam label/url/date/shortText/text/slug existentes)
"i18nText": { "type": "object", "required": ["pt-BR"], "properties": { "pt-BR": {"type":"string","maxLength":600}, "en": {"type":"string","maxLength":600}, "es": {"type":"string","maxLength":600} }, "additionalProperties": false },
"citedSource": {
  "type": "object", "required": ["title", "url", "accessedAt", "license"], "additionalProperties": false,
  "properties": {
    "title": { "type": "string", "maxLength": 300 }, "url": { "$ref": "#/$defs/url" }, "accessedAt": { "$ref": "#/$defs/date" },
    "publisher": { "$ref": "#/$defs/shortText" }, "publishedAt": { "$ref": "#/$defs/date" },
    "license": { "enum": ["CC0", "CC-BY-4.0", "CC-BY-SA-4.0", "CC-BY-NC-4.0", "dominio-publico", "ato-oficial", "todos-os-direitos-reservados", "desconhecida"] },
    "kind": { "enum": ["norma", "conselho", "orgao-publico", "estatistica", "educacao", "comunidade", "referencia", "museu-acervo", "imprensa", "academico"] },
    "usedFor": { "enum": ["fato", "numero", "citacao-curta", "imagem"] }
  }
},
"verification": { "enum": ["conferido", "nao-conferido", "divergente"] },
"milestone": {
  "type": "object", "required": ["year", "where", "title", "why", "sources", "verification"], "additionalProperties": false,
  "properties": {
    "year": { "type": "integer" }, "yearEnd": { "type": "integer" },
    "where": { "enum": ["mundo", "brasil"] }, "region": { "$ref": "#/$defs/shortText" },       // UF ou país
    "category": { "enum": ["tecnica", "ferramenta", "instituicao", "regulacao", "obra", "evento", "pessoa"] },
    "title": { "$ref": "#/$defs/label" }, "why": { "$ref": "#/$defs/i18nText" },
    "sources": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/citedSource" } },
    "wikidataId": { "type": "string", "pattern": "^Q\\d+$" },
    "verification": { "$ref": "#/$defs/verification" }, "verificationNote": { "$ref": "#/$defs/shortText" }
  }
},
"regulationEvent": { "allOf": [ { "$ref": "#/$defs/regulation" } ], "properties": { "year": {"type":"integer"}, "url": {"$ref":"#/$defs/url"}, "verification": {"$ref":"#/$defs/verification"} } },
"referencePerson": {
  "type": "object", "required": ["name", "why", "sources", "verification"], "additionalProperties": false,
  "properties": {
    "name": { "$ref": "#/$defs/shortText" }, "years": { "$ref": "#/$defs/shortText" }, "country": { "$ref": "#/$defs/shortText" },
    "why": { "$ref": "#/$defs/i18nText" }, "works": { "type": "array", "maxItems": 5, "items": { "$ref": "#/$defs/shortText" } },
    "sources": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/citedSource" } }, "wikidataId": { "type": "string" },
    "verification": { "$ref": "#/$defs/verification" }
  }
},
"toolsEra": { "type": "object", "required": ["era", "tools"], "additionalProperties": false,
  "properties": { "era": { "$ref": "#/$defs/shortText" }, "tools": { "type": "array", "minItems": 1, "items": { "$ref": "#/$defs/shortText" } }, "note": { "$ref": "#/$defs/i18nText" }, "sources": { "type": "array", "items": { "$ref": "#/$defs/citedSource" } } } },
"landmarkProject": {
  "type": "object", "required": ["id", "title", "kind", "scope", "period", "place", "authors", "criteria", "summary", "whyItMatters", "sources", "verification"], "additionalProperties": false,
  "properties": {
    "id": { "$ref": "#/$defs/slug" }, "title": { "$ref": "#/$defs/label" },
    "kind": { "enum": ["obra", "sistema", "norma", "programa", "instituicao", "pesquisa", "produto"] },
    "scope": { "enum": ["mundo", "brasil"] },
    "period": { "type": "object", "required": ["start"], "properties": { "start": {"type":"integer"}, "end": {"type":"integer"}, "ongoing": {"type":"boolean"} } },
    "place": { "type": "object", "properties": { "city": {"$ref":"#/$defs/shortText"}, "uf": {"type":"string","maxLength":2}, "country": {"$ref":"#/$defs/shortText"} } },
    "authors": { "type": "array", "minItems": 1, "items": { "type": "object", "required": ["name", "role"], "properties": { "name": {"$ref":"#/$defs/shortText"}, "role": {"$ref":"#/$defs/shortText"}, "kind": { "enum": ["pessoa", "instituicao", "equipe"] } } } },
    "criteria": { "type": "array", "minItems": 2, "items": { "enum": ["impacto", "inovacao", "reconhecimento", "diversidade-regional", "licao-aprendida"] } },
    "summary": { "$ref": "#/$defs/i18nText" }, "whyItMatters": { "$ref": "#/$defs/i18nText" },
    "figures": { "type": "array", "maxItems": 4, "items": { "type": "object", "required": ["label", "value", "asOf", "source"], "properties": { "label": {"$ref":"#/$defs/shortText"}, "value": {"$ref":"#/$defs/shortText"}, "asOf": {"$ref":"#/$defs/date"}, "source": {"$ref":"#/$defs/citedSource"} } } },
    "image": { "type": "object", "required": ["url", "license", "credit"], "properties": { "url": {"$ref":"#/$defs/url"}, "license": {"type":"string"}, "credit": {"$ref":"#/$defs/shortText"}, "alt": {"$ref":"#/$defs/i18nText"} } },
    "sources": { "type": "array", "minItems": 2, "items": { "$ref": "#/$defs/citedSource" } },
    "wikidataId": { "type": "string", "pattern": "^Q\\d+$" },
    "relatedCompetencies": { "type": "array", "items": { "$ref": "#/$defs/shortText" } },  // liga ao mapa de competências do pacote
    "verification": { "$ref": "#/$defs/verification" }, "verificationNote": { "$ref": "#/$defs/shortText" }
  }
},
"review": {
  "type": "object", "required": ["generatedBy", "generatedAt", "reviewedBy", "reviewedAt", "nextReviewDue", "status"], "additionalProperties": false,
  "properties": {
    "generatedBy": { "enum": ["ia", "pesquisa-humana", "misto"] }, "generatedAt": { "$ref": "#/$defs/date" },
    "model": { "$ref": "#/$defs/shortText" },                 // ex.: "AiGateway local 2026.10"
    "reviewedBy": { "type": ["string", "null"] },            // papel/ID do curador, nunca nome em claro no JSON público
    "reviewedAt": { "type": ["string", "null"], "pattern": "^\\d{4}-\\d{2}-\\d{2}$" },
    "nextReviewDue": { "$ref": "#/$defs/date" },             // generatedAt ou reviewedAt + 12 meses
    "status": { "enum": ["pesquisa", "revisado", "ativo", "vencido"] },
    "changelog": { "type": "array", "items": { "type": "object", "required": ["version", "date", "note"], "properties": { "version": {"type":"string"}, "date": {"$ref":"#/$defs/date"}, "note": {"$ref":"#/$defs/shortText"} } } }
  }
}
```

Exemplo mínimo de um item (Pampulha), já com a marcação que esta pesquisa produziu:

```json
{
  "id": "conjunto-moderno-da-pampulha",
  "title": { "pt-BR": "Conjunto Moderno da Pampulha", "en": "Pampulha Modern Ensemble", "es": "Conjunto Moderno de Pampulha" },
  "kind": "obra", "scope": "brasil",
  "period": { "start": 1940, "end": 1943 },
  "place": { "city": "Belo Horizonte", "uf": "MG", "country": "Brasil" },
  "authors": [
    { "name": "Oscar Niemeyer", "role": "arquitetura", "kind": "pessoa" },
    { "name": "Roberto Burle Marx", "role": "paisagismo", "kind": "pessoa" },
    { "name": "Joaquim Cardozo", "role": "engenharia estrutural", "kind": "pessoa" }
  ],
  "criteria": ["inovacao", "reconhecimento", "diversidade-regional"],
  "summary": { "pt-BR": "Conjunto de edifícios e paisagem à beira da lagoa da Pampulha, projetado nos anos 1940, que inaugurou a linguagem do modernismo brasileiro em concreto curvo." },
  "whyItMatters": { "pt-BR": "Primeiro conjunto moderno brasileiro reconhecido como Patrimônio Mundial; mostra arquitetura, paisagismo, arte e engenharia trabalhando juntos." },
  "figures": [ { "label": "Inscrição na Lista do Patrimônio Mundial", "value": "17/07/2016 (ref. 1493; critérios i, ii, iv)", "asOf": "2026-11-02",
    "source": { "title": "UNESCO World Heritage List — Pampulha Modern Ensemble", "url": "https://whc.unesco.org/ES/list/1493", "accessedAt": "2026-11-02", "license": "todos-os-direitos-reservados", "kind": "referencia", "usedFor": "fato" } } ],
  "sources": [
    { "title": "UNESCO World Heritage List — Pampulha Modern Ensemble", "url": "https://whc.unesco.org/ES/list/1493", "accessedAt": "2026-11-02", "license": "todos-os-direitos-reservados", "kind": "referencia", "usedFor": "fato" },
    { "title": "Agência Gov — Conjunto Moderno da Pampulha, um marco da arquitetura brasileira reconhecido pela UNESCO", "url": "https://agenciagov.ebc.com.br/noticias/202608/conjunto-moderno-da-pampulha-um-marco-da-arquitetura-brasileira-reconhecido-pela-unesco", "accessedAt": "2026-11-02", "license": "ato-oficial", "kind": "orgao-publico", "usedFor": "fato" }
  ],
  "wikidataId": "Q10351261",
  "relatedCompetencies": ["projeto arquitetônico", "paisagismo", "patrimônio"],
  "verification": "conferido",
  "verificationNote": "período 1940–1943 e QID do Wikidata não conferidos nesta sessão"
}
```

(O `wikidataId` acima é ilustrativo — ⚠️ não conferido.)

### 3.2 Checagens cruzadas a acrescentar em `scripts/career/validar-pacotes.mjs`

1. Pacote com `fields.length > 0` e `status = ativo` **exige** `history` e `landmarkProjects` com `review.status = ativo` e `nextReviewDue` no futuro; `generico.json` fica isento.
2. Nenhum `milestone`, `referencePerson` ou `landmarkProject` com `verification = nao-conferido` em pacote `ativo` (pode existir em `pesquisa` e `revisado`).
3. `landmarkProjects.brazil` tem pelo menos um item com `place.uf` fora de {SP, RJ, MG, DF} **ou** o critério `diversidade-regional` justificado em `verificationNote` (regra editorial, pode começar como aviso).
4. Toda `citedSource` com `license = CC-BY-SA-4.0` só pode ter `usedFor ∈ {fato, numero}` — nunca `citacao-curta` ou `imagem` (evita ShareAlike no dado do WS).
5. `image.license` ∈ {CC0, CC-BY-4.0, dominio-publico, licenca-propria-do-ws}; `credit` obrigatório.
6. `review.nextReviewDue ≤ reviewedAt + 12 meses`; o validador avisa "vencido" e o seed (E4) **não semeia** pacote vencido como `ativo` — rebaixa a `revisado` e abre item na fila do curador.
7. Textos pt-BR obrigatórios; `en` e `es` opcionais em `pesquisa`, obrigatórios em `ativo` (mesma regra de `label` do catálogo de ramos).
8. Limite de tamanho: `intro ≤ 600`, `why/summary/whyItMatters ≤ 400` caracteres (CA18: linguagem simples, sem muralha de texto).

### 3.3 Pipeline: geração assistida por IA → curadoria → publicação → revisão anual

| Passo | Quem | Como | Regra do WS que vale |
|---|---|---|---|
| 1. Pesquisa | IA via `AiGateway` (RF43), serviço novo `MEMORIA_PROFISSAO` (capability `ARTEFATO`, modo `SOB_SOLICITACAO`, ação `PROPOR_ALTERACAO`) | gera o JSON de `history` e `landmarkProjects` **com uma `citedSource` por afirmação**; o que não achar fonte marca `nao-conferido`; saída passa no validador | RF43 (citações), RF75.CA13 (fonte, data, região), `claimsPolicy` do pacote |
| 2. Checagem automática | validador | esquema + checagens da §3.2 + ping das URLs (`accessedAt` real) | `naoConferido` do README |
| 3. Curadoria humana | Curador (ator já previsto em RF75 UC7), de preferência alguém da área | revisa fato a fato, troca `nao-conferido` por `conferido` ou remove; preenche `review.reviewedBy/At`; **nunca aprova item sem fonte** | RF75.CA07 (validação humana) |
| 4. Publicação | seed E4 (`occupation_packs`, `V63`) | só `status = ativo`; versão `AAAA.MM.N` incrementa; `changelog` registra | README "Versão e status" |
| 5. Revisão anual | tarefa agendada (laboratório) + curador | 11 meses após `reviewedAt`, a IA propõe um **diff** (novos marcos, números atualizados do tipo "usuários do Pix em 2026", links quebrados); curador aceita item a item; `nextReviewDue` renova | mesma trilha; sem edição automática em produção |
| 6. Correção pela comunidade 💡 | pessoas da profissão autenticadas | botão "sugerir correção" no card abre proposta com fonte para a fila do curador (modelo IEEE Milestones / PR em awesome list); sem edição direta | REDE_PROFISSIONAL_VISIBILIDADE: contribuição revisável, sem auto-publicar |

**Idiomas.** `pt-BR` é a fonte; `en` e `es` são traduções geradas pela IA e revisadas antes de `ativo`; nomes próprios, leis e títulos oficiais **não se traduzem** (ficam em `label` com a mesma string nos três idiomas quando for o caso). As chaves de interface ("História", "Grandes projetos", "No Work Station", "fonte", "conferido em") vão para `lib/i18n/messages/{pt-BR,en,es}.json`, não para o pacote.

**Tamanho.** Um pacote ganha ~15–30 KB; para os 8 pacotes iniciais, irrelevante. Se crescer, `history` e `landmarkProjects` podem virar arquivos irmãos (`occupation-packs/<code>.history.json`) carregados pelo mesmo loader — decisão para depois.

---

## 4. "Maiores projetos dentro do Work Station" (fonte dinâmica)

Objetivo: na sub-aba "No Work Station", a pessoa vê **peças (Letters/Drawings), tarefas e projetos públicos** feitos por pessoas da mesma profissão, para aprender, remixar com crédito e se inspirar — sem ranking de pessoas, sem expor quem não optou.

### 4.1 Regras (derivadas de `REDE_PROFISSIONAL_VISIBILIDADE.md` e `GUIA_DE_CARREIRA.md` §3 e §7)

| Regra | Origem | Como se aplica aqui |
|---|---|---|
| Perfil é portfólio escolhido; popularidade ≠ qualidade | REDE §"O que a rede deve promover" | a vitrine da profissão **não ordena por curtidas, views, Hype Score ou pontos**; ordem padrão: "validados pelo curador" → "mais recentes"; filtros por tipo de peça e competência |
| Quatro controles distintos (descoberta, público, publicação, colaboração) | REDE §"Quatro controles" | aparecer na vitrine da profissão é um **quinto consentimento por item**: "destacar na vitrine da minha profissão" (padrão: desligado), separado de "público" e de "publicar no perfil" |
| Publicar é opt-in; rascunho não vira post | REDE §"Publicar com consciência"; GUIA §7 (f5) | só itens com visibilidade `PUBLICA`, versão publicada e opt-in de vitrine entram; despublicar remove da vitrine |
| Remix só com permissão, com proveniência e crédito | REDE §"Contrato de cada ação"; GUIA §7 D10 e L10 | card mostra "remixar" apenas se o item permite; o remix nasce com autor e versão de origem (já previsto); "revisar esta peça" abre L10 |
| Validação humana gera selo; IA só pré-checa objetivos | GUIA §3 princípio 8; RF75.CA07 | o destaque "validado" vem do curador (ou de validação por par já registrada em `CompetencyEvidence.validatedBy`), nunca de score |
| Sem sinal de busca de emprego, sem dados sensíveis | D-147; GUIA §3 princípios 3 e 6 | a vitrine mostra a peça e os créditos; **não** mostra momento de carreira, tipo de conta, cidade ou qualquer campo do `CareerProfile`; a profissão da pessoa só aparece se `preferredOccupationVisible = true` |
| Não expor existência de itens privados por título, contador ou cache | REDE §"Perfis e espaços" | contagem "n peças da sua profissão" conta só itens elegíveis; `canView` por item no servidor (RF27.CA04) |
| Créditos de coautores e fontes | rubrica `creditos-e-fontes` (generico.json) | o card lista coautores e fontes declarados na peça; falta de crédito impede o destaque |
| Contribuição é revisável; IA nunca publica | REDE §"Comentários e confiança"; CA10 | a IA pode **sugerir** à pessoa "esta peça atende aos critérios da vitrine, quer destacar?"; a ação é da pessoa |

### 4.2 Como funciona

1. **Elegibilidade (servidor):** item ∈ {Letter, Drawing, TaskItem, Project} com `visibility = PUBLICA`, versão publicada, `showcaseOptIn = true` do dono (e de **todos** os coautores), créditos preenchidos, sem denúncia aberta. A profissão da vitrine vem do `preferredOccupationCode` do autor **no momento do opt-in** (gravado no `ShowcaseEntry`, para a troca de profissão não mover itens antigos sem a pessoa saber) — ou de uma tag de profissão escolhida pela pessoa no diálogo de publicação, para quem não quer revelar a profissão preferida 💡.
2. **Curadoria:** fila do curador (mesma de RF75 UC7) com a rubrica do pacote; resultado `destaque` (com motivo curto, ex.: "detalhe construtivo com cotas que fecham e créditos completos") ou `nao-destacado` (sem notificação negativa pública). Modelo Behance: pequena fração destacada; sem garantia; motivo explicado — compatível com "por que recebi isto" (CA09).
3. **Exibição:** sub-aba "No Work Station" com três blocos: **Em destaque** (validados, até 12), **Recentes da profissão** (opt-in, paginado) e **Para remixar** (itens que permitem remix). Card = ficha padronizada (título, tipo, competência, autores/créditos, versão, data, selo "validado por curador", botões abrir · salvar · remixar · revisar). Nunca: curtidas, views, posição, "top".
4. **Reaproveitamento:** a Vitrine de projetos do Mural (RF27, sub-aba `vitrine`, "chancelados e modelos públicos em destaque, remixar", `MuralEntry.kind = DESTAQUE`) é o mesmo mecanismo com **filtro por profissão**; a aba por profissão consome `GET /api/mural?tab=vitrine&occupation=<code>` 💡 e evita uma segunda vitrine.
5. **Saída e revogação:** desligar o opt-in, despublicar ou bloquear alguém remove o item da vitrine na próxima leitura; não se promete apagar cópias já exportadas (regra de remix já existente).
6. **Depoimentos 💡 (inspirado no Museu da Pessoa):** espaço opcional "como cheguei à profissão" (≤ 600 caracteres, L6-like), opt-in separado, sem dados sensíveis, moderado — fonte de "histórias de gente comum" ao lado dos grandes nomes. Fora do v1.

---

## 5. Proposta de requisito

### RF76 — Memória da Profissão: história, grandes projetos e vitrine da profissão preferida

**Aba/rota:** "Minha profissão" em `/profile?tab=profissao` (sub-abas **História** · **Grandes projetos** · **No Work Station**); atalho no Guia de Carreira (RF75) e em Conta ao lado do campo profissão preferida; laboratório para o curador em `/lab/memoria-profissao` 💡.

**História de usuário:** Como pessoa que escolheu uma profissão preferida (ou está decidindo qual), quero uma aba que conte, com fontes, a história dessa profissão no mundo e no Brasil, mostre os projetos de referência e as peças públicas que pessoas da mesma profissão fizeram no Work Station, para entender onde estou entrando, me inspirar em trabalhos reais e remixá-los com crédito — sem que isso me compare, ranqueie ou exponha a mim ou a outras pessoas.

**Critérios de aceite**

| CA | Dado / quando / então |
|---|---|
| RF76.CA01 | Dado `User.preferredOccupation` preenchido com um ramo servido por pacote `ativo`, quando a pessoa abre `/profile?tab=profissao`, então vê as sub-abas História, Grandes projetos e No Work Station com o conteúdo de `history` e `landmarkProjects` desse pacote, no idioma da interface (pt-BR sempre; en/es quando existirem no pacote, senão pt-BR com aviso discreto). |
| RF76.CA02 | Dado que a pessoa não tem profissão preferida ou o pacote não está `ativo`, quando abre a aba, então vê um convite para escolher a profissão (ou o teste de interesses do RF75) e uma prévia do pacote genérico; nenhum erro técnico nem identificador interno aparece (CA18). |
| RF76.CA03 | Dado qualquer marco, pessoa de referência, projeto ou número exibido, quando renderizado, então mostra "fonte" com título, publicador, data de acesso e licença, abre em nova aba, e itens `verification = divergente` exibem "fontes divergem" com a nota; nenhum item `nao-conferido` chega à tela de produção. |
| RF76.CA04 | Dado o texto da aba, quando lido, então é autoral do Work Station (gerado por IA e revisado), não reproduz trechos de fontes sob CC BY-SA ou "todos os direitos reservados", e imagens só aparecem com `license` permitida e `credit` visível. |
| RF76.CA05 | Dado o pacote da profissão, quando `review.nextReviewDue` passa, então o item some do seed como `ativo`, a aba mostra "conteúdo em revisão (última revisão em DD/MM/AAAA)" e um item entra na fila do curador; nada é editado automaticamente em produção. |
| RF76.CA06 | Dado o curador no laboratório, quando pede "propor atualização", então a IA (RF43, serviço `MEMORIA_PROFISSAO`) devolve um diff com fontes por item e marcação `conferido/nao-conferido`; o curador aceita item a item; a versão do pacote incrementa e o `changelog` registra; sem aceite humano nada muda. |
| RF76.CA07 | Dado uma peça, tarefa ou projeto da pessoa, quando ela publica ou edita a publicação, então existe a opção "destacar na vitrine da minha profissão" (padrão desligado), com "quem verá?", "o que muda?" e "vale para itens antigos?"; a opção só fica ativa se o item é `PUBLICA`, tem versão publicada e créditos preenchidos; coautores precisam concordar. |
| RF76.CA08 | Dado a sub-aba No Work Station, quando carregada, então lista só itens elegíveis por `canView` no servidor, ordenados por "validados" e depois por data, sem curtidas, visualizações, posição, Hype Score ou pontos; contadores só contam itens elegíveis; nenhum card mostra momento de carreira, tipo de conta, cidade ou campo do `CareerProfile` (D-147). |
| RF76.CA09 | Dado um item na vitrine, quando o curador o avalia com a rubrica do pacote, então ele recebe `destaque` com motivo curto visível ou permanece sem destaque sem notificação pública; o destaque nunca é calculado por popularidade e pode ser contestado pelo autor. |
| RF76.CA10 | Dado um item em destaque que permite remix, quando a pessoa clica "remixar", então nasce um rascunho derivado com autor e versão de origem (D10) e crédito automático; "revisar" abre L10 com a rubrica; itens que não permitem remix não mostram o botão nem são copiados pela IA ou exportação. |
| RF76.CA11 | Dado que a pessoa desliga o opt-in, despublica, troca de profissão ou bloqueia alguém, quando a vitrine é lida de novo, então o item sai (ou deixa de aparecer para a pessoa bloqueada); a troca de profissão não move itens antigos sem confirmação; não se promete remoção de cópias já exportadas. |
| RF76.CA12 | Dado qualquer tela do RF76, quando renderizada, então funciona por teclado e leitor de tela, linha do tempo tem alternativa em lista, imagens têm `alt`, e a interface distingue fato conferido, divergência e conteúdo do próprio Work Station; nenhuma sugestão da IA publica, destaca, segue ou envia mensagem sem confirmação (RF75.CA10). |

**Entidades**

| Entidade | Onde | Campos principais |
|---|---|---|
| `OccupationPack.history` / `ProfessionHistoryEntry` | dado versionado (`occupation_packs.history_json`) | `year`, `where`, `category`, `title`, `why`, `sources[]` (`CitedSource`), `wikidataId`, `verification` |
| `LandmarkProject` | dado versionado (`occupation_packs.landmark_projects_json`) | `id`, `title`, `kind`, `scope`, `period`, `place`, `authors[]`, `criteria[]`, `summary`, `whyItMatters`, `figures[]`, `image`, `sources[]`, `relatedCompetencies[]`, `verification` |
| `CitedSource` | `$defs` compartilhado (também útil a `MarketClaim`, RF50.CA07) | `title`, `url`, `publisher`, `publishedAt`, `accessedAt`, `license`, `kind`, `usedFor` |
| `ContentReview` | dado versionado (`review`) + tabela `pack_reviews` para a fila | `generatedBy`, `model`, `generatedAt`, `reviewedBy`, `reviewedAt`, `nextReviewDue`, `status`, `changelog[]` |
| `ShowcaseEntry` | tabela nova `showcase_entries` | `id`, `targetType` (LETTER/DRAWING/TASK/PROJECT), `targetId`, `publishedVersion`, `occupationCode` (no momento do opt-in), `ownerId`, `coauthorConsents[]`, `optInAt`, `curation` (`NAO_AVALIADO`/`DESTAQUE`/`SEM_DESTAQUE`), `curationReason`, `curatedBy`, `curatedAt`, `removedAt` |
| `ShowcaseSuggestion` 💡 | tabela `pack_suggestions` | proposta de correção/adição de marco ou projeto por pessoa autenticada, com fonte; vai à fila do curador |

**Integrações**

- **RF75 (pacotes, CA19):** `history` e `landmarkProjects` são seções do mesmo `OccupationPack`; mesma versão, mesmo validador, mesmo seed (`V63`); trocar a profissão troca a aba; `relatedCompetencies` liga projetos ao mapa de competências e às tarefas-guia ("quer treinar o detalhe construtivo? veja D6").
- **RF43 (IA com citações):** serviço `MEMORIA_PROFISSAO` no `AiGateway` com saída estruturada validada pelo esquema; toda afirmação carrega `CitedSource`; provedor externo só com consentimento (regra `provider.externalNeedsConsent` do pacote); "por que esta sugestão" quando a IA sugere destacar uma peça.
- **RF50 (Análise de Perfil):** `CitedSource` substitui/estende o `MarketClaim.citation` para unificar a forma de citar.
- **RF27 (Mural / Vitrine de projetos):** a sub-aba "No Work Station" é a Vitrine filtrada por profissão (`MuralEntry.kind = DESTAQUE`), não um segundo feed.
- **RF16 / RF46 (perfis e contato):** o card leva ao perfil público do autor **só com os campos que ele liberou**; "propor colaboração" e mensagem seguem as permissões de contato; seguir não concede acesso.
- **RF3 bloco C (LGPD):** opt-in de vitrine é consentimento por item, exportável e revogável; nenhum dado sensível ou de carreira entra no `ShowcaseEntry`.
- **RF24/RF25/RF40 (selos):** destaque do curador pode gerar `CompetencyEvidence` validada para o autor, se ele quiser (opt-in), reaproveitando a fila do RF75 UC7.

**Etapas de implementação**

| Etapa | Entrega | CAs | Onde | Verificação |
|---|---|---|---|---|
| **M1 Dado e leitura** | extensão do esquema (`history`, `landmarkProjects`, `citedSource`, `review`), checagens no `validar-pacotes.mjs`, primeiros 3 pacotes preenchidos (Arquitetura e Urbanismo, Engenharia Civil, Desenvolvimento de Software) em `status: pesquisa` → revisão → `ativo`; aba "Minha profissão" só leitura (História e Grandes projetos) em `/profile?tab=profissao`; textos i18n | CA01–CA04, CA12 | `contracts/career/*`, `scripts/career/validar-pacotes.mjs`, `lib/career/occupationPack.ts` (tipos), `components/career/ProfessionMemory/*`, `lib/pages/registry.ts`, `lib/i18n/messages/*` | `npm run career:validate` falha com item `nao-conferido` em pacote `ativo`; teste de renderização dos três idiomas; Axe/teclado; e2e: sem profissão → convite |
| **M2 Curadoria e revisão anual** | serviço `MEMORIA_PROFISSAO` no `AiGateway` (motor simulado nos testes), laboratório do curador com diff item a item, `pack_reviews` (`V65`), tarefa agendada de "vencimento" que rebaixa pacotes; `ShowcaseSuggestion` 💡 (sugerir correção com fonte) | CA05, CA06 | `ws-application/career/PackReviewService`, `AiGateway`, `app/(shell)/lab/memoria-profissao`, migração | teste: pacote vencido não semeia como `ativo`; teste: nada muda sem aceite humano; contrato OpenAPI regenerado |
| **M3 Vitrine da profissão** | `showcase_entries` (`V66`), opt-in "destacar na vitrine da minha profissão" no diálogo de publicação (com consentimento de coautores), fila do curador com rubrica do pacote, sub-aba "No Work Station" consumindo a Vitrine do RF27 filtrada por profissão, remix/revisar a partir do card, remoção por revogação/bloqueio | CA07–CA11 | `ws-application/.../PublicationService` (estensão), `ShowcaseService`, `MuralController` (`?occupation=`), `components/career/ProfessionShowcase/*`, `components/publish/PublishDialog` | teste com duas contas: item sem opt-in nunca aparece, contador não vaza; sem campos de carreira no card (D-147); remix proibido não gera cópia; e2e: destacar → curador → selo com motivo |

Ordem: M1 → M2 → M3 (M3 pode começar em paralelo a M2 após M1, pois só depende da publicação do RF27). Nenhuma chamada paga de IA até M2; o motor simulado basta para os testes.

**Métricas (nunca de empregabilidade):** pacotes `ativo` com revisão em dia; itens conferidos × divergentes; sugestões de correção aceitas; peças com opt-in e destaques por profissão; remixes com crédito a partir da vitrine; contestações de destaque. 

---

## 6. Riscos e decisões em aberto

1. **Direitos de imagem** são o maior risco: a v1 pode ser só texto + link, com imagens apenas de domínio público/CC0 com crédito (IMS, Wikimedia Commons com licença checada por item).
2. **Divergência de fontes** é comum até em fatos simples (PNI 1970/1973/1975; Rio–Niterói 13,29/13,69 km): o esquema precisa do estado `divergente` e a tela precisa mostrá-lo, em vez de escolher silenciosamente.
3. **Viés de "grandes nomes"**: o critério de diversidade regional e o bloco de depoimentos (💡) mitigam; o curador deve ser alguém da área.
4. **Profissões sem conselho** (software, design): a seção de regulamentação precisa poder ser vazia com nota explicativa — é informação útil, não lacuna.
5. **Decisão do dono do produto:** a vitrine da profissão é a Vitrine do RF27 filtrada (recomendado) ou um feed próprio? E a tag de profissão no item pode ser diferente da profissão preferida (para quem não quer revelá-la)?

## 7. Fontes consultadas (acesso em 2026-11-02)

- Creative Commons, "Wikipedia moves to CC 4.0 licenses" — https://creativecommons.org/2023/06/29/wikipedia-moves-to-cc-4-0-licenses/
- Wikimedia, Terms of use / CC 4.0 FAQ — https://meta.wikimedia.org/wiki/Terms_of_use/Creative_Commons_4.0/FAQ
- MediaWiki, Wikimedia APIs / Content reuse — https://www.mediawiki.org/wiki/Wikimedia_APIs/Content_reuse
- Google Arts & Culture, About (partners) — https://support.google.com/culturalinstitute/partners/answer/4395223 · The Art Newspaper (2018) — https://www.theartnewspaper.com/2018/01/19/how-google-became-a-major-producer-of-cultural-content
- ArchDaily, Projects — https://www.archdaily.com/projects
- Behance Help, Curated galleries — https://help.behance.net/hc/en-us/articles/204483974 · Behance blog, Curation philosophy — https://medium.com/behance-blog/behance-curation-philosophy-and-approach-6e0ae9ab350f
- sindresorhus/awesome (CC0) — https://github.com/sindresorhus/awesome · awesome-lint — https://awesome.ecosyste.ms/lists/sindresorhus%2Fawesome-lint
- Computer History Museum, Timeline — https://www.computerhistory.org/timeline/
- Museu da Pessoa (não aberto) — https://museudapessoa.org/ · Alma Preta (2023) — https://almapreta.com.br/sessao/cultura/museu-da-pessoa-tem-acervo-de-mais-de-30-anos-de-historias-de-vidas-brasileiras/
- ETHW, IEEE Milestones Program — https://ethw.org/Milestones:IEEE_Milestones_Program · https://ieeemilestones.ethw.org/
- ACM, Turing laureate interviews — https://awards.acm.org/about/turing-laureate-interviews · ACM History Committee — https://history.acm.org/
- Lei 12.378/2010 (Planalto) — https://planalto.gov.br/ccivil_03/_Ato2007-2010/2010/Lei/L12378.htm · CFM, História da medicina — https://portal.cfm.org.br/noticias/historia-da-medicina/ · CFM/FENAM, Rede de museus — https://portal.cfm.org.br/noticias/fenam-cria-rede-de-museus-da-historia-da-medicina/ · CFM 80 anos — https://portal.cfm.org.br/eventos/cfm-80-anos-historia-compromisso-e-futuro-da-medicina-no-brasil/
- Enciclopédia Itaú Cultural (não aberta) — https://enciclopedia.itaucultural.org.br/ · Brasiliana Fotográfica — https://brasilianafotografica.bn.gov.br/ · PublishNews, IMS libera acervo (2023) — https://www.publishnews.com.br/materias/2023/04/11/ims-disponibiliza-para-download-parte-de-seu-acervo-fotografico-e-iconografico
- BCB, Relatório de Gestão do Pix 2023–2025 — https://www.bcb.gov.br/content/estabilidadefinanceira/pix/relatorio_de_gestao_pix/relatorio_gestao_pix_2026.pdf · Movimento Econômico (2026) — https://movimentoeconomico.com.br/economia/2026/08/11/chaves-pix-chegam-a-920-milhoes-e-sistema-movimenta-r-35-tri-em-2025/
- UNESCO, Pampulha (1493) — https://whc.unesco.org/ES/list/1493 · Agência Gov (2026) — https://agenciagov.ebc.com.br/noticias/202608/conjunto-moderno-da-pampulha-um-marco-da-arquitetura-brasileira-reconhecido-pela-unesco · Brasília (445) — https://www.worldheritagesite.org/list/id/445 (oficial a conferir: https://whc.unesco.org/en/list/445)
- SESC Pompeia — https://en.wikipedia.org/wiki/SESC_Pompeia · SESC SP, "Fábrica de talentos" — https://portal.sescsp.org.br/online/artigo/compartilhar/6692_FABRICA+DE+TALENTOS
- Ministério da Saúde, e-book Vacina — https://www.gov.br/saude/pt-br/campanhas-da-saude/arquivos/ebook_vacina_final_alta.pdf · Grupo MedCof, marcos da vacinação — https://www.grupomedcof.com.br/blog/grandes-marcos-da-vacinacao-no-brasil/
- Itaipu — https://en.wikipedia.org/wiki/Itaipu_Dam · Estratégia, 50 anos do tratado — https://militares.estrategia.com/portal/atualidades/50-anos-do-tratado-para-a-construcao-da-usina-itaipu/ · Ponte Rio–Niterói — https://www.fsa.br/maiores-obras-engenharia-brasil/
- Mobile Time, Conecte SUS → Meu SUS Digital (2024) — https://www.mobiletime.com.br/noticias/23/02/2024/transformacao-digital-do-ministerio-da-saude-comeca-pelo-app-meu-sus-digital/

**Não conferido nesta sessão (lista para o curador):** data de lançamento do Pix (16/11/2020); Linux 1991; Nubank 2013; Butantan 1901; Fiocruz 1900; datas de CF/88, CDC, Marco Civil e LGPD; período de construção da Pampulha; QIDs do Wikidata; licenças dos textos da Enciclopédia Itaú Cultural, do Museu da Pessoa, do ETHW e do CHM; existência de um programa "Acervo" do CAU/BR; critérios de seleção editorial do ArchDaily; inclusão de awesome lists no Arctic Code Vault.
