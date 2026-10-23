# Campos a preencher nos textos legais — `docs/legal/`

Lista dos campos que os Termos de Uso (`TERMOS_DE_USO.md`) e a Política de Privacidade
(`POLITICA_DE_PRIVACIDADE.md`) deixam entre tags para o responsável preencher. Os textos v0.2 têm a **Velion** como
controladora (empresa privada dona da marca e plataforma Orange Social). Os dados da empresa e das pessoas não são
inventados pela engenharia: cada um entra aqui, por quem responde por ele.

## Regras

- Formato único: duas chaves, o nome do campo em letras maiúsculas, dígitos e sublinhado, e duas chaves de fechamento. Nenhum outro formato de marcador é
  aceito, e os textos não usam colchetes (ver `README.md`).
- Os campos desta tabela são os **únicos** permitidos. Em `status: rascunho` eles são esperados. Em `status: vigente`
  **nenhum** `{{...}}` pode sobrar.
- Preencha com o valor final, sem aspas e sem as chaves. Exemplo: a tag `VELION_CNPJ` entre chaves vira o número
  real, no formato `00.000.000/0000-00`.
- Onde o texto traz **"(sugestão: 18)"** junto da tag `IDADE_MINIMA`, apague o parêntese ao preencher.
- A tag `DATA_VIGENCIA` precisa bater com o `effectiveFrom` do cabeçalho YAML do mesmo documento.
- Campo que não se aplica não fica vazio: apague a frase, a linha ou a seção, e registre isso no `changelog`.

## Tabela de campos

Exemplos mostram só o formato. Nenhum é dado real.

| Tag | O que deve conter | Exemplo de formato | Onde aparece | Obrigatória antes de publicar |
|---|---|---|---|---|
| `{{VELION_RAZAO_SOCIAL}}` | Razão social completa da Velion, como no CNPJ | Nome Empresarial Ltda. | Termos: abertura e 15. Política: abertura e 14 | Sim |
| `{{VELION_NOME_FANTASIA}}` | Nome fantasia; se não houver, repetir a razão social | Nome Fantasia | Termos: abertura e 15. Política: abertura e 14 | Sim |
| `{{VELION_CNPJ}}` | CNPJ da Velion, com pontuação | 00.000.000/0000-00 | Termos: abertura e 15. Política: abertura e 14 | Sim |
| `{{VELION_ENDERECO}}` | Logradouro, número, complemento e bairro da sede | Rua Tal, 000, sala 0, Bairro | Termos: abertura e 15. Política: abertura e 14 | Sim |
| `{{VELION_CIDADE_UF}}` | Cidade e sigla do estado da sede | Cidade/UF | Termos: abertura e 15. Política: abertura e 14 | Sim |
| `{{VELION_CEP}}` | CEP da sede | 00000-000 | Termos: abertura e 15. Política: abertura e 14 | Sim |
| `{{VELION_EMAIL_CONTATO}}` | E-mail de atendimento geral, para suporte, avisos de conteúdo e acesso indevido | contato@dominio-da-empresa.com.br | Termos: 5.7, 6.4 e 15. Política: 14 | Sim |
| `{{VELION_TELEFONE}}` | Telefone de atendimento, com DDD | (00) 0000-0000 | Termos: 15. Política: 14 | Não; se não houver telefone público, apagar a menção |
| `{{VELION_SITE}}` | Site institucional da Velion, em texto puro | https://www.dominio-da-empresa.com.br | Termos: 15. Política: 14 | Sim |
| `{{ORANGE_SOCIAL_SITE}}` | Site da Orange Social, em texto puro | https://www.dominio-da-plataforma.com.br | Termos: abertura e 15. Política: abertura e 14 | Sim |
| `{{DPO_NOME}}` | Nome do encarregado (LGPD, art. 41): pessoa ou empresa contratada | Nome Sobrenome, ou Nome da Empresa Ltda. | Termos: 15. Política: abertura e 14 | Sim |
| `{{DPO_EMAIL}}` | E-mail do encarregado, de preferência uma caixa da função e não pessoal | privacidade@dominio-da-empresa.com.br | Termos: 15. Política: abertura, 3, 10 e 14 | Sim |
| `{{FORO_COMARCA}}` | Comarca eleita para disputas com empresas (consumidor usa o próprio domicílio) | Cidade/UF | Termos: 14 | Sim |
| `{{DATA_VIGENCIA}}` | Data em que a versão passa a valer, por extenso; igual ao `effectiveFrom` | 1º de mês de aaaa | Termos: topo. Política: topo | Sim |
| `{{IDADE_MINIMA}}` | Idade mínima para usar, só o número; a sugestão é 18 | 18 | Termos: resumo e 3.1. Política: 12 | Sim |
| `{{PROVEDORES_INFRAESTRUTURA}}` | Operadores de hospedagem, banco de dados, arquivos e e-mail, com nome e país | Empresa A (hospedagem, País), Empresa B (e-mail, País) | Política: 5.1 | Sim |
| `{{PROVEDORES_IA}}` | Provedores externos de IA usados em produção, com nome e país | Empresa C (modelo X, País) | Política: 5.2 | Sim; se nenhum estiver ligado, reescrever 5.2 dizendo que a IA roda só localmente |
| `{{PAISES_TRANSFERENCIA}}` | Países para onde vão dados, ligados aos operadores acima | País 1 e País 2 | Política: 6 | Sim, se houver operador fora do Brasil; se não houver, apagar a seção 6 |

## Como conferir

Contar as tags em todos os documentos:

```sh
grep -o "{{[A-Z0-9_]*}}" docs/legal/*.md | sort | uniq -c
```

Conferir que não sobrou nenhuma tag num documento antes de mudar para `status: vigente`:

```sh
grep -n "{{" docs/legal/TERMOS_DE_USO.md docs/legal/POLITICA_DE_PRIVACIDADE.md
```

O segundo comando precisa voltar vazio. Procure também a palavra "sugestão" nos dois documentos.

As decisões que ainda faltam para preencher estes campos estão na seção "Pendências para o jurídico" de cada
documento e na dúvida **Q-243** de `docs/DECISOES.md`.
