# Textos legais do Work Station — `docs/legal/`

Fonte dos documentos que o app publica em `/termos` e `/privacidade` e que a API serve em
`GET /api/legal/{TERMOS|PRIVACIDADE}/current` e `/versions` (RF1 bloco A, D-15, D-16).

**Controladora: Velion.** O Work Station é um produto da **Velion**, empresa privada dona da marca e plataforma
**Orange Social**; o Work Station é a rede profissional e de trabalho da Orange Social. Os textos v0.2 foram
reescritos para essa realidade. A v0.1, escrita com um órgão público como controlador, fica só no `changelog`.

Nenhum documento está vigente: são **rascunhos v0.2** escritos pela engenharia como proposta, à espera do encarregado
e do jurídico da Velion (Q-243). Até lá o cabeçalho fica `status: rascunho` e `effectiveFrom: null`, e a publicação
é recusada.

| Arquivo | Documento (`PolicyDocumentKind`) | Versão | Status |
|---|---|---|---|
| `TERMOS_DE_USO.md` | `TERMOS` | 0.2 | rascunho |
| `POLITICA_DE_PRIVACIDADE.md` | `PRIVACIDADE` | 0.2 | rascunho |
| `CAMPOS_A_PREENCHER.md` | lista de campos `{{...}}` a preencher antes de publicar | — | apoio |

## Versões independentes

Termos de Uso e Política de Privacidade são **dois documentos com versões próprias** (`PolicyDocument.version`), ao
contrário do FAI, onde um único `TERMS_VERSION` cobria os dois. Mudar a Política não obriga a reaceitar os Termos e
vice-versa: o gate (`403 ACEITE_PENDENTE`) compara `users.terms_version` e `users.privacy_version` com a versão
`VIGENTE` de cada documento separadamente, e o `Dialog` de reaceite mostra só o `changelog` do documento que mudou.
O histórico de aceites fica em `policy_acceptances` (append-only, com `document`, `version`, `ip`, `user_agent`,
`channel`), e sobrevive à anonimização da conta como prova do aceite (LGPD art. 8º, § 2º).

Cabeçalho YAML obrigatório em cada arquivo:

```yaml
---
document: TERMOS | PRIVACIDADE
version: "0.2"            # semver curto; publicar sobe para 1.0
status: rascunho          # rascunho | vigente | substituida
language: pt-BR
effectiveFrom: null       # data ISO quando publicado
changelog:
  - version: "0.2"
    date: 2026-10-17
    summary: "texto mostrado no gate de reaceite"
---
```

Publicar uma versão = mudar `status: vigente`, preencher `effectiveFrom`, subir `version` e inserir a linha em
`policy_documents` (migration ou `POST /api/admin/legal/{document}/publish`, só ADMIN, com auditoria
`POLICY_PUBLISHED`). A versão anterior vira `substituida`; o texto dela continua acessível em `/versions`.

## Idioma oficial e traduções de cortesia

O texto oficial é o **pt-BR**. As versões em inglês e espanhol (`TERMOS_DE_USO.en.md`, `POLITICA_DE_PRIVACIDADE.es.md`
etc., quando existirem) são **traduções de cortesia** com a mesma `version` do original e um aviso fixo no topo de que
o pt-BR prevalece em caso de divergência (Q-69). O aceite registrado é sempre do documento e da versão, não do idioma;
`PolicyAcceptance` não guarda `language`, e o gate não pede novo aceite quando só uma tradução muda.

## Campos a preencher

A engenharia **nunca** inventa razão social, CNPJ, endereço, nome de pessoa, e-mail ou telefone. Esses dados ficam
no texto como tags: duas chaves, o nome do campo em maiúsculas, dígitos e sublinhado, e duas chaves de fechamento
(por exemplo, o CNPJ é a tag `VELION_CNPJ` entre chaves duplas). O responsável preenche depois.

- Os campos permitidos são **exatamente** os listados em `CAMPOS_A_PREENCHER.md`, com o que cada um deve conter, onde
  aparece e se é obrigatório. Campo novo entra primeiro nessa lista.
- Em `status: rascunho` as tags são **esperadas**.
- Em `status: vigente` **nenhum** `{{...}}` pode sobrar: o valor real é escrito no próprio arquivo antes da
  publicação, e a mesma versão vai para `policy_documents`.
- Isso substitui a proposta anterior de injetar o encarregado por variáveis de ambiente (`WS_LEGAL_DPO_NAME` e
  `WS_LEGAL_DPO_CONTACT`, D-15). O encarregado agora são as tags `DPO_NOME` e `DPO_EMAIL`.

Para conferir: `grep -o "{{[A-Z0-9_]*}}" docs/legal/*.md | sort | uniq -c`.

## Teste que recusa marcadores (`PolicyTextGuardTest`)

Roda no `mvn verify` e no `prebuild` do front, sobre cada arquivo de `docs/legal/*.md` com `status: vigente` **e**
sobre o corpo gravado em `policy_documents`. Falha se, depois do cabeçalho YAML, encontrar:

- qualquer colchete `[` ou `]` (é como o FAI deixou `[RAZÃO SOCIAL]`, `[ENCARREGADO/DPO]` e `[DATA]` em produção);
  por isso os textos não usam links em Markdown, só URLs e títulos em texto;
- a expressão "validar com jurídico" ou "a validar", em qualquer caixa;
- a marca "(sugestão:", que acompanha um campo ainda não decidido;
- **qualquer** token `{{...}}`, mesmo os de `CAMPOS_A_PREENCHER.md`;
- `effectiveFrom: null` com `status: vigente`.

Em `status: rascunho` o teste roda em modo aviso: lista as ocorrências sem falhar, para que o rascunho possa evoluir
no repositório. Nesse modo ele também aponta qualquer `{{...}}` que não esteja em `CAMPOS_A_PREENCHER.md`.
Os rascunhos v0.2 não têm colchetes; as únicas ocorrências são as tags da lista e a sugestão de idade mínima.

As lacunas que dependem de resposta humana ficam na seção final **"Pendências para o jurídico"** de cada documento,
sempre citando a Q-nn de `docs/DECISOES.md` (na v0.2, a Q-243), e essa seção é removida do texto publicado pelo
próprio comando de publicação.

## O que não é copiado do FAI

Os textos do FAI são de uma rede social de moda para consumidores (CDC, ECA Digital, loja de itens 3D, cupons de
marcas). Agora o Work Station também é de uma **empresa privada**, então algumas bases se aproximam: a base legal
principal volta a ser **execução de contrato** (art. 7º, V), há **legítimo interesse** com teste de balanceamento e
direito de oposição, e pode haver **relação de consumo** com pessoas físicas, com o CDC valendo no que couber. As
diferenças continuam grandes:

- é uma rede **profissional e de trabalho**, para maiores de idade, sem público infantil;
- convivem consumidor pessoa física e **contrato entre empresas** (contas EMPRESA), tratados de forma equilibrada;
- não há loja, itens virtuais pagos, cupons nem publicidade de terceiros; DECIA Points não são dinheiro;
- o conteúdo produzido no trabalho segue o contrato com o empregador, e o que fica no espaço de uma EMPRESA continua
  com ela após a exclusão da conta, sem o nome do autor;
- consentimento só para o que é opcional, como marketing, nunca junto com o aceite.

O que foi aproveitado: a estrutura por seções, o resumo inicial, a tabela finalidade × base legal e a tabela de
retenção.
