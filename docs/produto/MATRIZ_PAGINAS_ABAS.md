# Páginas, abas e superfícies na jornada

Inventário extraído do registro de páginas. “Código específico” não significa aceite ponta a ponta. Revalidar as rotas dinâmicas, permissões e cada sub-aba na implementação.

| Rota | RFs | Etapa(s) | Implementação observada |
|---|---|---|---|
| `/mural` | RF27, RF18, RF19 | Portfólio e rede | arquivo não localizado |
| `/search` | RF27, RF17 | Portfólio e rede | arquivo não localizado |
| `/memory` | RF33 | DECIA e aprendizado | arquivo não localizado |
| `/companies` | RF28 | Equipe e coordenação | arquivo não localizado |
| `/companies/[slug]` | RF15, RF28, RF25, RF39, RF24 | Portfólio e rede; Equipe e coordenação; Projetos e execução | arquivo não localizado |
| `/departments/[slug]` | RF14, RF28, RF9 | Portfólio e rede; Equipe e coordenação | arquivo não localizado |
| `/models` | RF40 | Portfólio e rede | arquivo não localizado |
| `/messages` | RF46, RF10 | Equipe e coordenação | arquivo não localizado |
| `/messages/[conversationId]` | RF46, RF13 | Equipe e coordenação; Tarefas e peças | arquivo não localizado |
| `/find` | RF47, RF48, RF27, RF33, RF20 | Tarefas e peças; Perfil e direcionamento; Portfólio e rede; DECIA e aprendizado; Projetos e execução | arquivo não localizado |
| `/profile` | RF6, RF19, RF12, RF25, RF44, RF45, RF40 | Portfólio e rede; Tarefas e peças; Projetos e execução; Perfil e direcionamento | arquivo não localizado |
| `/u/[username]` | RF16, RF6, RF18, RF19 | Portfólio e rede | arquivo não localizado |
| `/tasks` | RF41, RF44, RF18, RF13 | Tarefas e peças; Perfil e direcionamento; Portfólio e rede | arquivo não localizado |
| `/tasks/[id]` | RF41, RF19, RF18, RF7, RF34, RF13, RF10 | Tarefas e peças; Portfólio e rede; Projetos e execução; Equipe e coordenação | arquivo não localizado |
| `/tasks/[id]/edit` | RF8, RF11, RF12 | Tarefas e peças | arquivo não localizado |
| `/attachments` | RF41 | Tarefas e peças | arquivo não localizado |
| `/desk` | RF21, RF22, RF44 | Projetos e execução; Perfil e direcionamento | arquivo não localizado |
| `/projects/[id]` | RF7, RF29, RF13, RF10 | Projetos e execução; DECIA e aprendizado; Tarefas e peças; Equipe e coordenação | arquivo não localizado |
| `/projects/[id]/edit` | RF22, RF12, RF8, RF11 | Projetos e execução; Tarefas e peças | arquivo não localizado |
| `/projects/[id]/simulate` | RF31 | Projetos e execução | arquivo não localizado |
| `/projects/[id]/mirror` | RF32 | Projetos e execução | arquivo não localizado |
| `/agents` | RF48, RF47, RF29, RF43 | Perfil e direcionamento; Tarefas e peças; DECIA e aprendizado | arquivo não localizado |
| `/tasks/new` | RF4, RF23, RF34 | Tarefas e peças | arquivo não localizado |
| `/projects/new` | RF5, RF20 | Projetos e execução | arquivo não localizado |
| `/plans` | RF24 | Projetos e execução | arquivo não localizado |
| `/autopilot` | RF30, RF26, RF43 | Projetos e execução; Perfil e direcionamento | arquivo não localizado |
| `/decia` | RF29, RF37 | DECIA e aprendizado | arquivo não localizado |
| `/decia/decisoes/[decisionId]` | RF29 | DECIA e aprendizado | arquivo não localizado |
| `/decia/[sessionId]` | RF29, RF13, RF37, RF46 | DECIA e aprendizado; Tarefas e peças; Equipe e coordenação | arquivo não localizado |
| `/insights` | RF43, RF20, RF26 | Perfil e direcionamento; Projetos e execução | arquivo não localizado |
| `/goals` | RF35, RF24 | Portfólio e rede; Projetos e execução | arquivo não localizado |
| `/points` | RF42 | Portfólio e rede | arquivo não localizado |
| `/store` | RF42, RF40 | Portfólio e rede | arquivo não localizado |
| `/highlights` | RF35 | Portfólio e rede | arquivo não localizado |
| `/benefits` | RF39 | Portfólio e rede | arquivo não localizado |
| `/recognitions` | RF35, RF28 | Portfólio e rede; Equipe e coordenação | arquivo não localizado |
| `/issuer/dashboard` | RF28 | Equipe e coordenação | arquivo não localizado |
| `/companies/[slug]/manage/departments` | RF28, RF9 | Equipe e coordenação | arquivo não localizado |
| `/departments/[slug]/team` | RF9, RF10, RF28, RF43, RF36, RF46 | Equipe e coordenação; Perfil e direcionamento | arquivo não localizado |
| `/seals/review` | RF39, RF28 | Portfólio e rede; Equipe e coordenação | arquivo não localizado |
| `/decia/review` | RF29 | DECIA e aprendizado | arquivo não localizado |
| `/seals` | RF39 | Portfólio e rede | arquivo não localizado |
| `/handoffs` | RF36 | Equipe e coordenação | arquivo não localizado |
| `/curation` | RF28, RF39, RF35 | Equipe e coordenação; Portfólio e rede | arquivo não localizado |
| `/admin` | RF18, RF28, RF43 | Portfólio e rede; Equipe e coordenação; Perfil e direcionamento | arquivo não localizado |
| `/settings` | RF3, RF38 | Perfil e direcionamento; Tarefas e peças | arquivo não localizado |
| `/notifications` |  | Transversal / laboratório | arquivo não localizado |
| `/login` | RF2 | Perfil e direcionamento | arquivo não localizado |
| `/register` | RF1 | Perfil e direcionamento | arquivo não localizado |
| `/password-reset` | RF2 | Perfil e direcionamento | arquivo não localizado |
| `/verify-email` | RF1 | Perfil e direcionamento | arquivo não localizado |
| `/lab/design-system` | RF38 | Tarefas e peças | arquivo não localizado |
| `/lab/anatomias` | RF38, RF11 | Tarefas e peças | arquivo não localizado |
| `/lab/perfis` | RF14, RF15, RF16 | Portfólio e rede | arquivo não localizado |
| `/lab/decia` | RF29, RF37 | DECIA e aprendizado | arquivo não localizado |

## Abas e sub-abas declaradas

Cada conjunto deve receber objetivo, ação principal, público, vazio/erro, acesso ao recurso e próxima etapa. O detalhamento funcional está no plano integrado e no contrato da rede.

- **PROFILE_TABS**: `acervo`, `projetos`, `programas`, `decisoes`, `deliberativo`, `planos`, `projetos-salvos`, `tarefas-salvas`, `tarefa-do-dia`, `kits`, `modelos`, `reconhecimentos`, `points`, `hype`, `deliberativo-completo`.
- **COMPANY_TABS**: `sobre`, `departamentos`, `programas`, `plano-anual`, `chancelas`, `beneficios`, `destaques`, `pessoas`, `comunicados`, `gestao`.
- **DEPARTMENT_TABS**: `sobre`, `projetos`, `sessoes`, `chancelas`, `reconhecimentos`, `equipe`, `minha-equipe`, `dashboard`, `insights`.
- **MURAL_TABS**: `empresa`, `vitrine`, `seguindo`.
- **SEARCH_TABS**: `projetos`, `tarefas`, `pessoas`, `empresas`, `chefes`.
- **MODELS_TABS**: `chancelados`, `comunidade`.
- **INSIGHTS_TABS**: `acervo`, `perfil`, `equipe`, `ranking`, `sugeridos`.
- **ADMIN_TABS**: `dashboard`, `aprovacoes`, `usuarios`, `moderacao`, `ia`, `auditoria`, `sistema`.
- **DESK_TABS**: `minha-mesa`, `equipe`.
- **MESSAGES_TABS**: `conversas`, `atribuicoes`.
- **FIND_TABS**: `encontrar`, `ler`, `extrair`, `lista`.
- **AGENTS_TABS**: `antes`, `execucao`, `transversais`, `encontrar-no-dossie`, `ler-com-mapa`, `extrair-do-dossie`, `lista-de-termos`.
- **SETTINGS_TABS**: `aparencia`, `notificacoes`, `trabalho`, `conta`, `privacidade`, `dados`, `sessoes`, `termos`.
- **POINTS_TABS**: `saldo`, `extrato`, `regras`, `departamentos`.
- **DECIA_TABS**: `atencao`, `decisoes`, `sessoes`, `revisoes`.
- **DECIA_SESSION_TABS**: `abertas`, `minhas`, `encerradas`.
- **SESSION_TABS**: `conversa`, `minuta`, `artefatos`, `decisao`, `participantes`.

O RF50 requer a superfície de Análise de Perfil no Copilot, ainda ausente do registro existente. Letters/Drawer requerem seletor de peças e ferramentas dentro da tarefa; não oferecer rotas/ações como disponíveis antes de seus aceites.
