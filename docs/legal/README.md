# Textos legais do Work Station — `docs/legal/`

Fonte dos documentos que o app publica em `/termos` e `/privacidade` e que a API serve em
`GET /api/legal/{TERMOS|PRIVACIDADE}/current` e `/versions` (RF1 bloco A, D-15, D-16). Nenhum deles está vigente:
são **rascunhos v0.1** escritos pela engenharia como proposta e aguardam a validação do encarregado e do jurídico da
SECID-PR (Q-57, Q-58). Até lá o cabeçalho fica `status: rascunho` e `effectiveFrom: null`, e a publicação é recusada.

| Arquivo | Documento (`PolicyDocumentKind`) | Versão | Status |
|---|---|---|---|
| [`TERMOS_DE_USO.md`](TERMOS_DE_USO.md) | `TERMOS` | 0.1 | rascunho |
| [`POLITICA_DE_PRIVACIDADE.md`](POLITICA_DE_PRIVACIDADE.md) | `PRIVACIDADE` | 0.1 | rascunho |

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
version: "0.1"            # semver curto; publicar sobe para 1.0
status: rascunho          # rascunho | vigente | substituida
language: pt-BR
effectiveFrom: null       # data ISO quando publicado
changelog:
  - version: "0.1"
    date: 2026-10-05
    summary: texto mostrado no gate de reaceite
---
```

Publicar uma versão = mudar `status: vigente`, preencher `effectiveFrom`, subir `version` e inserir a linha em
`policy_documents` (migration ou `POST /api/admin/legal/{document}/publish`, só ADMIN, com auditoria
`POLICY_PUBLISHED`). A versão anterior vira `substituida`; o texto dela continua acessível em `/versions`.

## Idioma oficial e traduções de cortesia

O texto oficial é o **pt-BR**. As versões em inglês e espanhol (`TERMOS_DE_USO.en.md`, `POLITICA_DE_PRIVACIDADE.es.md`
etc., quando existirem) são **traduções de cortesia** com a mesma `version` do original e um aviso fixo no topo de que
o pt-BR prevalece em caso de divergência (Q-66). O aceite registrado é sempre do documento e da versão, não do idioma;
`PolicyAcceptance` não guarda `language`, e o gate não pede novo aceite quando só uma tradução muda.

## Valores injetados pela configuração

O texto **nunca** traz nome, e-mail ou telefone de pessoa fixos no código. O encarregado (LGPD art. 41) e o canal de
contato entram no momento da publicação pelos tokens `{{WS_LEGAL_DPO_NAME}}` e `{{WS_LEGAL_DPO_CONTACT}}`, lidos das
variáveis de ambiente de mesmo nome (só o **nome** da variável aparece na documentação; o valor mora no provedor). Se
uma das variáveis estiver vazia, o perfil `prod` falha no boot, como as demais configurações obrigatórias (SEG bloco 1).
Os tokens permitidos são só esses dois; qualquer outro `{{...}}` é tratado como marcador e recusado pelo teste abaixo.

## Teste que recusa marcadores (`PolicyTextGuardTest`)

Roda no `mvn verify` e no `prebuild` do front, sobre cada arquivo de `docs/legal/*.md` com `status: vigente` **e**
sobre o corpo gravado em `policy_documents`. Falha se, depois do cabeçalho YAML, encontrar:

- qualquer colchete `[` ou `]` (é como o FAI deixou `[RAZÃO SOCIAL]`, `[ENCARREGADO/DPO]` e `[DATA]` em produção);
  por isso os textos não usam links em Markdown, só URLs e títulos em texto;
- a expressão "validar com jurídico" ou "a validar", em qualquer caixa;
- um token `{{...}}` que não seja `WS_LEGAL_DPO_NAME` ou `WS_LEGAL_DPO_CONTACT`;
- `effectiveFrom: null` com `status: vigente`.

Em `status: rascunho` o teste roda em modo aviso (lista as ocorrências sem falhar), para que o rascunho possa
evoluir no repositório; mesmo assim os dois rascunhos atuais já passam sem ocorrência. As lacunas que dependem de
resposta humana ficam na seção final **"Pendências para o jurídico"** de cada documento, sempre citando a Q-nn de
`docs/DECISOES.md`, e essa seção é removida do texto publicado pelo próprio comando de publicação.

## O que não é copiado do FAI

Os textos do FAI são de uma rede social de moda para consumidores (CDC, ECA Digital, loja de itens 3D, cupons de
marcas). Aqui o controlador é um **órgão público** (LGPD art. 23) e os usuários são servidores e colaboradores: não
há relação de consumo, a base legal predominante não é contrato nem consentimento, e "excluir" tem limites de guarda
documental (Q-65). O que foi aproveitado: a estrutura por seções, o resumo inicial, a tabela finalidade × base legal e
a tabela de retenção.
