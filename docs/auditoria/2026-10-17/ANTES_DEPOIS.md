# Antes × depois, arquivos alterados e testes executados

17/10/2026 · base `e8ba2a8` (main) · branch `claude/upbeat-dirac-7sa5n3`. Todas as correções abaixo estão **publicadas no branch**, ao contrário da rodada de 16/10, cujas correções ficaram locais (P02).

## Comparação

| Problema | Antes | Depois | Commit |
|---|---|---|---|
| P01 CI | `npm ci` falhava (lock fora de sincronia; TS 7 incompatível com `openapi-typescript`/`typescript-eslint`); 9 suítes `.tsx` não carregavam (Vite 8/oxc); catálogo RF desatualizado; lint com erro | `npm ci`, lint, typecheck, 416 testes, i18n, build, `api:types` sem diff e `npm audit` passam localmente; `mvn verify` completo verde | `4c6d05e` |
| P20 Login | Chaves JWT nunca ligadas → login 503 com a configuração documentada | Login funciona com `WS_JWT_*_PATH`; teste de ligação | `b47945c` |
| P03 Tarefas | `/tasks/new`, `/tasks/[id]/edit`, `/tasks` esqueletos; sem API | API real + telas: criar (6 áreas), listar, abrir, editar com versão, conflito entre abas, estados, bloqueio com motivo, critérios marcáveis, 404 sem revelar | `97611a0`, `013657a` |
| P04 Privacidade | SIGILOSO visível ao departamento; títulos de tarefas ocultas no card de projeto; “Decisões” sem filtro; sem “Seguindo” | SIGILOSO = PRIVADA; composição filtrada; Decisões só ao dono; Seguindo | `b602d34` |
| P05 Drawings (lógica) | Seleção espacial pegava ocultos; patch ignorava reservas; IA sem seleção alterava camada inteira; camada oculta editável | Seleção = visível; `authorizePatch` único para manual e IA | `4c6d05e`, `72f5636` |
| P06/P07 DECIA | Sugestão IA aceitável após decidir; versão regredia; transições sem validação; mudanças de pesos invisíveis | Guardas, versão correta, “Alterações registradas” | `5866bca` |
| P08 Autonomia | Nenhum controle; “Modo de IA” era custo | 5 modos com efeito concreto; Configurações; DECIA respeita o modo | `c51cb0e` |
| P10 Estados | “Disponível/Em uso/Modelo público” misturados | A realizar · Em andamento · Bloqueado · Concluído · Arquivado; publicação à parte; transições espelham o Java | `5ad78ae` |
| P18 Sessão | Chamadas sem token → 401 → renovação em cascata; navegação abortava rotação e revogava a família | Renovação única antes da 1ª chamada (mitigação); janela no servidor pendente (Q-237) | `772257d` |

## Arquivos alterados (principais)

- **CI e dependências:** `package.json`, `package-lock.json`, `vitest.config.mts`, `lib/rf/catalog.gen.ts`, `lib/rf/catalog.test.ts`, `lib/pages/registry.ts`, `docs/diagramas/RF49/README.md`, `docs/diagramas/RF50/README.md`.
- **Autenticação:** `ws-web/.../config/WsSecurityProperties.java` (+ `WsSecurityPropertiesBindingTest`), `lib/api/client.ts` (+ `client.restore.test.ts`).
- **Tarefas (backend):**
  - Domínio: `ws-domain/.../acervo/{TaskBrief,WorkArea}.java`, `TaskItem.java` (métodos `create`/`withDetails`), `DomainCatalog.java`.
  - Persistência e migração: `V36__acervo_briefing_tarefas.sql`, `TaskBriefEntity`/`TaskBriefRepository` (gerados), `ForeignKeyPolicy.java`, `JpaAcervoAdapters.java`.
  - Aplicação e web: `ws-application/.../acervo/{TaskService,TaskRepositoryPort,TaskBriefJson,TaskBriefParts}.java`, `AuditActions.java`, `ws-web/.../acervo/TaskController.java`.
  - Contratos: `contracts/openapi/openapi.json`, `lib/api/schema.d.ts`, `docs/arquitetura/catalogo-entidades.json`.
- **Tarefas (frontend):** `components/tasks/{TaskForm,PersistedTasks}.tsx`, `lib/tasks/{client,status}.ts`, `app/(shell)/tasks/**`, mensagens i18n pt-BR/en/es.
- **Privacidade/social:** `lib/social/{rules,view-model,fixtures}.ts`, `components/social/{ProfileView,ProfileHeader}.tsx`.
- **Drawings:** `lib/studio/selection.ts`, `lib/pieces/{patch,service}.ts`.
- **DECIA:** `lib/decia/{commands,view-model}.ts`, `components/decia/WorkspaceSections.tsx`.
- **IA:** `lib/ai/autonomy.ts`, `lib/preferences/types.ts`, `app/(shell)/settings/page.tsx`.
- **Documentação:** `docs/DECISOES.md` (D-93 revista, D-135–D-137, Q-235–Q-239) e esta pasta.

## Testes executados

| Conjunto | Resultado | Observação |
|---|---|---|
| `npm ci` · `npm run lint` · `npm run typecheck` · `npm run i18n:check` · `npm run build` · `npm run api:types` (sem diff) · `npm audit --omit=dev` | ✓ | Node 22 |
| `npx vitest run` | ✓ 44 arquivos, 416 testes | `lease.test.ts` instável ~1/5 também sem as mudanças (P21) |
| `mvn -B -ntp verify` (Checkstyle, SpotBugs, JaCoCo ≥ 70 %, Testcontainers MySQL 8.4, `OpenApiContractIT`) | ✓ todos os módulos | Inclui `TaskServiceTest` (8), `TaskControllerWebTest` (5), `TaskPersistenceIT` |
| Testes de regressão que falham sem a correção | ✓ | `WsSecurityPropertiesBindingTest`, `client.restore.test.ts`, `commands.test.ts` (versão), `TaskPersistenceIT` (versão defasada com OPTIMISTIC) |
| Jornada real no navegador (`scripts/jornada.mjs`) | ver `evidencias/JORNADA.json` | MySQL 8.4 + API Java (perfil dev) + Next; 2 contas sintéticas; sem IA |

Nenhuma chamada a provedor de IA e nenhum serviço externo foram executados.
