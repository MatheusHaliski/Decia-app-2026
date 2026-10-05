<!-- Título no padrão Conventional Commits: feat(rf20): …, fix(rf4): …, chore(ci): …, docs(arch): … -->

## O que muda

<!-- 2–5 linhas: o problema, a solução e o RF/CA (ex.: RF20.CA02) ou o bloco (ex.: Bloco 1 — esqueleto). -->

## Checklist (ARQUITETURA §3.4 / §6)

- [ ] **CA** — cada critério de aceite tocado está citado no `@Operation(summary = "RFnn.CAnn …")` e coberto por teste
- [ ] **Migração** — mudança de schema em UMA migration Flyway nova (`V<n>__rf<nn>_<assunto>.sql`), nunca editando uma aplicada; `MigrationVersionsTest` verde
- [ ] **Testes** — unitários + integração (Testcontainers) incluindo o **403** de cada endpoint novo; `mvn -B -ntp verify` verde (JaCoCo ≥ 70 % em ws-application/ws-web, Checkstyle, SpotBugs)
- [ ] **Segurança** — nenhum segredo, chave, `.env` ou valor padrão de senha; variáveis novas só pelo NOME em `.env.example` e `docs/seguranca/SEGURANCA.md`; erros no formato `{code, message, details, correlationId}`
- [ ] **i18n** — toda string de UI em `lib/i18n/messages/{pt-BR,en,es}.json` (sem texto solto); `npm run i18n:check` verde
- [ ] **Design system** — nenhum `<button>/<input>/<select>/<a>/<dialog>/<progress>` fora de `components/ui/**`; nenhuma cor hex/rgb fora de `styles/tokens.css`; `npm run lint` verde
- [ ] **Evidência** — capturas/log em `docs/testes/RFnn/` e diagramas atualizados em `docs/diagramas/RFnn/` quando o fluxo mudou
- [ ] **Decisões** — dúvidas novas registradas em `docs/DECISOES.md` (Q-nn) em vez de suposições silenciosas

## Como testar

<!-- comandos/rotas para o revisor reproduzir -->

## Riscos e rollback

<!-- o que pode quebrar, flag/propriedade que desliga, como voltar -->
