# Dado versionado do Guia de Carreira (RF75.CA19)

A **profissão preferida** (`User.preferredOccupation`: código do ramo + rótulo + visibilidade; opcional; privada por padrão) dá escopo ao Guia de Carreira (RF75) e à Análise de Perfil (RF50). O que esse escopo contém fica aqui, como **dado versionado, não código**: adicionar uma profissão é acrescentar um arquivo e rodar o validador — nenhuma tela nova.

| Arquivo | O que é | Quem lê |
|---|---|---|
| `academic-fields.json` | Catálogo de ramos acadêmicos: as opções do campo (slug estável, rótulos pt-BR/en/es, CINE Brasil, graus, aliases do autocompletar, famílias CBO e ISCO-08/ESCO, conselho, matrículas INEP, relevância dos editores, dados que nunca entram em portfólio, vizinhos). | cadastro, Conta, guia inicial (`lib/career/academicFields.ts`); seed de `users.preferred_occupation_*` (E1) |
| `academic-field.schema.json` | JSON Schema do catálogo. | validador |
| `occupation-packs/<code>.json` | Um `OccupationPack` por família de ocupação: escopo, vocabulário, competências, variantes das perguntas do guia (§4), tarefas-guia L1–L10/D1–D10 parametrizadas (§7), rubrica e pré-checagem, contexto e serviços da IA (RF43 capabilities, RF51 modos, consentimentos), configurações do Work Station, fontes de mercado (RF50.CA07), caminhos vizinhos e aprendizagem. `fields` lista os ramos do catálogo que ele serve; `generico.json` é o fallback de quem não informa profissão. | `CareerPlanService`, `AiGateway` (composição base + pacote), `ProfileAnalysisService`, painel Guia dos editores (`lib/career/occupationPack.ts`); seed de `occupation_packs` (E4, `V63`) |
| `occupation-pack.schema.json` | JSON Schema do pacote; as listas fechadas (serviços, capabilities, modos, ações, consentimentos, modos do Drawings, modelos do Letters) são as mesmas de `lib/career/occupationPack.ts` — o teste `lib/career/career.test.ts` falha se divergirem. | validador |

## Validar

```bash
npm run career:validate
```

Valida o catálogo e todos os pacotes contra os esquemas e faz as checagens cruzadas que um esquema não expressa: códigos e rótulos únicos, vizinhos e `paths.to` que existem, prioridade sem tarefa excluída, parâmetros das três primeiras prioridades, serviços externos declarados em `ai.services`, um pacote por ramo, pacote genérico presente. Arquivos avulsos (ex.: saída de pesquisa): `node scripts/career/validar-pacotes.mjs --ramos arquivo.json --pacote pasta/`. Sem dependências novas: o subconjunto de JSON Schema está implementado no próprio script.

## Versão e status

- `version` (`AAAA.MM.N`) é a versão do **dado**; `schemaVersion` só muda quando o esquema muda de forma incompatível.
- `status` do pacote: `pesquisa` (produzido por pesquisa, ainda não revisado por alguém da área) → `revisado` → `ativo` (semeado em produção). O guia só usa pacotes `ativo`; os demais ficam disponíveis no laboratório.
- `naoConferido` registra o que não foi confirmado na fonte primária, no mesmo espírito da auditoria.

## Regras que todo pacote respeita

- **Não é sinal de busca de emprego (D-147):** nada de salário, status "em busca", disponibilidade ou bloqueio de empresas; um Empregado que quer crescer na própria área também preenche a profissão preferida.
- **Perguntar em vez de inferir; explicar cada pergunta (`why`).** Dados sensíveis e características protegidas nunca entram nem são inferidos (LGPD art. 5º II; Lei 9.029/1995).
- **Progresso por evidência**, nunca score; a IA pré-checa só critérios objetivos (`rubric.objective[].auto`); o selo exige validação humana.
- **Mercado com fonte, data e região** ou "estimativa" (RF50.CA07).
- **Em nenhum modo** a IA publica, segue, envia mensagem ou se candidata sem confirmação.

## Como adicionar uma profissão

1. Acrescente o ramo em `academic-fields.json` (código novo em kebab-case; vizinhos existentes).
2. Copie `occupation-packs/generico.json`, troque `code`, `fields`, `family` e preencha as seções com o vocabulário, as tarefas e as fontes da área (3–5 fontes primárias: conselho, normas, INEP, CBO/ESCO).
3. `npm run career:validate` e `npm test -- lib/career`.
4. Registre a origem em `sources` e o que faltou conferir em `naoConferido`.

Origem: auditoria [`docs/auditoria/2026-10-31/GUIA_DE_CARREIRA.md`](../../docs/auditoria/2026-10-31/GUIA_DE_CARREIRA.md) §4.6 e [`docs/diagramas/RF75/README.md`](../../docs/diagramas/RF75/README.md) (CA19, etapas E1, E4, E6).
