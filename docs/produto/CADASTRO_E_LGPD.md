# Cadastro, aceite dos termos e direitos do titular (LGPD) — plano de implementação

**Status:** plano · 2026-10-05 · só documentação; o código vem depois, um PR por bloco, CI verde antes do próximo.
**Escopo:** blocos **A** (aceite dos Termos e da Política, RF1), **B** (tipos de perfil no cadastro e validação,
RF1 + RF28) e **C** (configurações e direitos do titular, RF3 — o "RF23" do FAI, Q-46) do brief
`PROMPT_DECIA_CADASTRO_LGPD`. Decisões D-15…D-22 e dúvidas Q-60…Q-73 em `docs/DECISOES.md`; entidades (todas
**proposta**) em `docs/arquitetura/TAXONOMIA.md` §1.8–1.15, §12.6, §12.9; CAs novos ("CA a confirmar") em
`docs/diagramas/RF1/README.md` §8, `RF28/README.md` §7 e `RF3/README.md` §7; textos legais em `docs/legal/`.

Convenções: commits `feat(rf1): …`, `feat(rf28): …`, `feat(rf3): …` e `@Operation(tags = "rf1" …)`; erros
`422 VALIDACAO` com `details` por campo; ações de auditoria em **inglês**, códigos de erro em **português**; i18n
pt-BR/en/es em todo texto, e-mails e exportação no idioma da pessoa.

## 1. Ordem e dependências

```
SEG bloco 3 (reconferência de senha com bloqueio 429 · limites por IP · OwnMedia · restricted/)
        │
        ▼
PR 0  packages/ui: Checkbox · RadioCard · Switch · Dialog · Tabs · Banner · FormField · Sheet   (D-11)
        │
        ├──► PR A1  PolicyDocument + /termos /privacidade + /api/legal + PolicyTextGuardTest
        │         └► PR A2  aceite no cadastro (checkbox, 422/409), policy_acceptances, OIDC, seed, AdminBootstrap
        │                 └► PR A3  gate 403 ACEITE_PENDENTE + GET/POST /api/me/policies + Dialog de reaceite
        │
        ├──► PR B1  RadioCard + campos por tipo + PendingUpload (/api/auth/uploads) + job de limpeza
        │         └► PR B2  VerificationPolicy + ApprovalRequest (AJUSTES/RECUSADO) + fila do ADMIN + decisão
        │                 └► PR B3  central de validação + reenvio (≤5) + confirmação do CHEFE + criação da Company
        │
        └──► PR C1  /settings (Tabs) + Conta/Aparência/Privacidade/Sessões/Termos + consentimentos + ConsentCoverageTest
                  └► PR C2  PersonalDataRegistry + "Quais dados temos" + exportação assíncrona + CoverageTest
                          └► PR C3  DataSubjectRequest + encerramento (DELETION_SCHEDULED) + AccountAnonymizationJob
                                  └► PR C4  OpenAPI → openapi-typescript no CI (fecha o defeito 7)   (D-21)
```

| Dependência | O que é reutilizado | Se ainda não existir |
|---|---|---|
| SEG bloco 3 (`PROMPT_DECIA_SEGURANCA`) | `IdentityService.reauthenticate` com reserva atômica e `429 MUITAS_TENTATIVAS` + `Retry-After` (troca de e-mail/senha, exclusão); `AuthRateLimitFilter.RULES` (register 10/h, uploads 40/h, username 120 e 60/10 min, `POST /api/me/deletion` 10/h); `OwnMedia`; prefixo `restricted/` servido só pelo proxy; `ClientIpResolver` (IP do aceite) | implementar o mínimo usado aqui: reconferência com bloqueio, limites das rotas acima, `OwnMedia` para `restricted/pending/` e `restricted/users/{id}/exports/` |
| SEG bloco 1 | `MigrationVersionsTest`, `JsonContractTest`, corpo de erro `{code, message, details, correlationId}`, `CorrelationIdFilter` | pré-requisito do esqueleto |
| SEG bloco 2 | `ForeignKeyPolicyTest`: as novas FKs entram na `POLICY` (`policy_acceptances`/`consent_events` → `users` **RESTRICT**; `user_consents`, `data_export_requests`, `data_subject_requests`, `pending_uploads.consumed_by_user_id` → `users` **CASCADE**… ver §4) | — |
| D-13 | Spring Boot 4.1, springdoc 3 (gera o OpenAPI do PR C4), ShedLock compatível com Boot 4 | — |
| RF2 | `loginOidc` ganha a tela de conclusão de cadastro (aceite + tipo de perfil); `GET /api/auth/sessions` alimenta a aba Sessões | — |

## 2. PR 0 — componentes `packages/ui` (antes de qualquer tela, D-11)

Todos com tokens (4 temas via `data-theme`), foco visível (`--focus`), alvo ≥ 44 px, rótulos i18n (ICU), estado em
texto, `reduceMotion` respeitado e erro por campo vindo de `422 details`. Nenhum HTML/CSS solto nas telas.

| Componente | Props principais | Usado em | Testes (Vitest + axe) |
|---|---|---|---|
| **Checkbox** | `checked`, `onCheckedChange`, `label` (ReactNode: aceita links), `description`, `error`, `required` | aceite dos termos (A2), checklist do admin (B2) | desmarcado por padrão; `aria-invalid` com erro; teclado (Space) |
| **RadioCard** | `options[{value, icon, title, line, badge}]`, `value`, `onChange`, `error` | tipo de perfil (B1), kind do pedido ao encarregado (C3) | setas do teclado; badge "precisa de validação"; `role=radiogroup` |
| **Switch** | `checked`, `onCheckedChange`, `label`, `description`, `busy`, `disabled` | consentimentos, `rankingOptOut` (C1) | **nunca pré-marcado** por padrão; revogar = mesmo gesto que conceder; estado em texto |
| **Dialog** | `open`, `title`, `description`, `actions[]` (mesmo destaque para confirmar/recusar), `blocking`, `size` | gate de reaceite (A3), "Verificar" (B2), encerramento da conta (C3) | foco preso; `Esc` fecha (não quando `blocking`); `aria-modal` |
| **Tabs** | `tabs[{id, label, badge}]`, `value`, `onValueChange` (sincroniza `?tab=`), `orientation` | `/settings` (C1), central de validação (B3) | setas; aba atual na URL; deep link |
| **Banner** | `kind` info · warning · danger · success, `title`, `body`, `actions[]`, `dismissible` | exclusão agendada no login (C3), perfil em validação (B3), aceite pendente (A3) | `role=status`/`alert`; contraste por tema |
| **FormField** | `label`, `hint`, `error` (string de `details[campo]`), `required`, `htmlFor` | todos os formulários | associa `aria-describedby`; mostra o erro do 422 |
| **Sheet** | `open`, `side`, `title`, children (ex.: texto dos Termos) | links dos Termos/Política **sem perder o formulário** (A2), dossiê do admin (B2) | foco preso; `Esc`; o formulário atrás mantém o estado |

Entram em `packages/ui/src/components/{checkbox,radio-card,switch,dialog,tabs,banner,form/form-field,sheet}` e na
página `/lab/design-system` (DESIGN_SYSTEM.md §6) nos 4 temas, com captura Playwright.

## 3. Endpoints (todos com `@Operation(tags = "rfN")` e tipos gerados no front)

| Bloco | Método e rota | Papel | Respostas de erro |
|---|---|---|---|
| A | `GET /api/legal/{TERMOS\|PRIVACIDADE}/current` · `GET /api/legal/{document}/versions` | público | `404` |
| A | `POST /api/admin/legal/{document}/publish {version, effectiveFrom, changelog}` | ADMIN | `422` (marcador no texto, `PolicyTextGuard`), `409` versão já publicada |
| A | `POST /api/auth/register` (+ `acceptTerms`, `termsVersion`, `privacyVersion`, `profileType`, extensões) | público | `422 VALIDACAO` (`details.acceptTerms`, `details.profileType`, `details.birthDate`…), `409 VERSAO_DOS_TERMOS_DESATUALIZADA`, `409 EMAIL_EM_USO`/`USERNAME_EM_USO`, `429`, `503` |
| A | `POST /api/auth/oidc/complete {acceptTerms, termsVersion, privacyVersion, profileType, …}` | sessão OIDC incompleta | mesmos do register |
| A | `GET /api/me/policies` · `POST /api/me/policies/accept {document, version}` | autenticado (passa pelo gate) | `409 VERSAO_DOS_TERMOS_DESATUALIZADA` |
| A | **gate** `PolicyGateFilter` → `403 ACEITE_PENDENTE` em tudo, exceto `/api/me/policies*`, `POST /api/auth/logout`, `/api/me/exports*`, `/api/me/deletion*` | — | — |
| B | `POST /api/auth/uploads?kind=avatar\|identity\|representation` | público (40/h por IP) | `422 ARQUIVO_INVALIDO` (tipo, bytes, pixels), `422 VALIDACAO details.kind` |
| B | `GET /api/auth/username-availability?username=` · `GET /api/auth/username-suggestions?name=` | público | `429` |
| B | `GET /api/admin/approvals` · `GET /api/admin/approvals/{id}` · `POST /api/admin/approvals/{id}/decision {decision, reasons, checklist, note}` · `GET /api/admin/approvals/{id}/documents/{kind}` (`no-store`) | ADMIN (não o próprio) | `403 ACESSO_NEGADO`, `409 CRITERIOS_PENDENTES`, `422 VALIDACAO details.reasons`, `404` |
| B | `GET /api/me/validation` · `POST /api/me/validation/resubmit` | EMPRESA/CHEFE pendente | `409 LIMITE_DE_ENVIOS` (5), `422 VALIDACAO` |
| B | `POST /api/departments/{id}/head-confirmations/{approvalId}` | chefe atual ou dono da EMPRESA (Q-66) | `403 ACESSO_NEGADO` |
| B | **guard** `Guard.requireApprovedProfile` → `403 PERFIL_EM_VALIDACAO` nas ações de emissor | — | — |
| C | `PATCH /api/me/email {newEmail, currentPassword}` · `PUT /api/auth/password` · `PATCH /api/me/privacy` | autenticado | `429 MUITAS_TENTATIVAS`, `401 REAUTENTICACAO_NECESSARIA`, `409 EMAIL_EM_USO` |
| C | `GET /api/me/consents` · `PUT /api/me/consents/{purpose} {granted}` | autenticado | `422 VALIDACAO` (finalidade desconhecida ou sem uso) |
| C | `GET /api/me/data-map` | autenticado | — |
| C | `POST /api/me/exports` · `GET /api/me/exports` · `GET /api/me/exports/{id}/download` | autenticado (dono) | `429 LIMITE_EXPORTACOES`, `403`, `410 EXPORTACAO_EXPIRADA`, `404` |
| C | `POST /api/me/requests {kind, target, targetId, description}` · `GET /api/me/requests` | autenticado | `422 VALIDACAO` |
| C | `POST /api/me/deletion {currentPassword, reason?}` · `DELETE /api/me/deletion` | autenticado | `429 MUITAS_TENTATIVAS`, `409` (já agendada / não agendada) |
| C | **guard** `Guard.requireNotDeletionScheduled` → `403 EXCLUSAO_AGENDADA` ao criar conteúdo | — | — |

Auditoria (inglês): `POLICY_PUBLISHED`, `POLICY_ACCEPTED`, `USER_REGISTERED`, `EMAIL_VERIFIED`, `APPROVAL_SUBMITTED`,
`APPROVAL_DECIDED`, `APPROVAL_DOCUMENT_VIEWED`, `APPROVAL_CONFIRMED`, `PRIVACY_CHANGED`, `CONSENT_GRANTED`,
`CONSENT_REVOKED`, `DATA_EXPORT_REQUESTED`, `DATA_EXPORT_READY`, `DATA_EXPORT_DOWNLOADED`, `DSR_OPENED`,
`DSR_RESPONDED`, `ACCOUNT_DELETION_REQUESTED`, `ACCOUNT_DELETION_CANCELLED`, `ACCOUNT_DELETION_COMPLETED`.

## 4. Migrations e política de FKs (SEG bloco 2)

| Tabela | FK → `users` | Motivo |
|---|---|---|
| `policy_documents` | — (publishedBy sem FK) | catálogo |
| `policy_acceptances` | **RESTRICT** | prova do aceite sobrevive à anonimização (D-16) |
| `user_consents` | CASCADE | estado atual; o histórico está em `consent_events` |
| `consent_events` | **RESTRICT** | append-only, prova da revogação (D-17) |
| `data_subject_requests` | RESTRICT | trilha do encarregado |
| `data_export_requests` | CASCADE | o arquivo já expira; registro sem valor após anonimização |
| `pending_uploads.consumed_by_user_id` | SET NULL | upload sobrevive ao consumidor até o job apagar |
| `approval_requests` | RESTRICT | histórico da validação (Q-72) |
| `verification_policies` | — | catálogo versionado |
| `user_empresa_ext`, `user_chefe_ext` | CASCADE | dado de quem é dono |

`users` ganha `terms_version`, `privacy_version`, `birth_date` (condicional, Q-63), `deletion_requested_at`,
`deletion_scheduled_at`, `deletion_reason`, `anonymized_at`, `intended_department_id`; `AccountStatus` ganha
`ANONYMIZED`; `approval_requests.status` ganha `AJUSTES` e `REJEITADO` vira `RECUSADO` (D-19); `pipeline_jobs.type`
ganha `DATA_EXPORT`. Como o banco nasce agora (SEG bloco 2), tudo entra no `V1__baseline.sql` ou nas primeiras
migrations, renumeradas contra o `main` antes do merge (`MigrationVersionsTest`).

## 5. Jobs agendados (todos com teste de agendamento e lock)

| Job | Cron (proposta) | Lock | O que faz | Testes |
|---|---|---|---|---|
| `PendingUploadCleanupJob` | a cada hora | ShedLock (`shedlock` no MySQL, `lockAtMostFor 30m`) | apaga `pending_uploads` com `expiresAt` vencido e não consumido (S3 + linha) | `ScheduledJobsTest` (reflexão: método tem `@Scheduled` e `@SchedulerLock`); IT: upload vencido some, consumido fica |
| `ExportExpiryJob` | a cada hora | ShedLock | `READY` com `expiresAt` vencido → apaga arquivo, `EXPIRED` | agendamento; IT: download após expirar → `410` |
| `AccountAnonymizationJob` | diário 03:10 (America/Sao_Paulo) | ShedLock | para cada `DELETION_SCHEDULED` vencido: anonimiza `users` pelo `PersonalDataRegistry`, apaga `restricted/` da pessoa, limpa Cassandra (`messages_by_session` authorId → anon, `timeline_by_user`, `notifications_by_user`) e OpenSearch (`ws-people`, docs por `authorId`), revoga sessões, `ANONYMIZED`, `ACCOUNT_DELETION_COMPLETED` | **teste 1** agendamento (defeito 1 do FAI); **teste 2** IT com Testcontainers MySQL + Cassandra + OpenSearch + MinIO conferindo os 4 stores e que `policy_acceptances`/`consent_events`/documentos públicos ficam |
| `ApprovalDeadlineJob` | diário | ShedLock | `AJUSTES` há 30 d sem resposta → `RECUSADO`; avisa ADMIN de pedidos com `dueAt` vencido | agendamento; IT: dias úteis com feriado |

`ScheduledJobsTest` varre o `ApplicationContext` e falha se um bean `*Job` tiver método público sem `@Scheduled`
**ou** `@Scheduled` sem `@SchedulerLock`, além de conferir `@EnableScheduling` no `ws-bootstrap`.

## 6. Testes-guarda no CI (quebram o build)

| Teste | O que confere | Defeito do FAI evitado |
|---|---|---|
| `PolicyTextGuardTest` | nenhum `PolicyDocument` vigente (arquivo `docs/legal/*.md` ou linha em `policy_documents`) tem `[`…`]`, "validar com jurídico"/"a validar", token `{{…}}` fora de `WS_LEGAL_DPO_NAME`/`WS_LEGAL_DPO_CONTACT`, ou `effectiveFrom` nulo | 2 |
| `ConsentCoverageTest` | todo `ConsentPurpose` tem entrada em `ConsentChecks` (finalidade → método que o serviço chama antes do tratamento, provado por ArchUnit: o método é referenciado em `ws-application`); finalidade sem checagem falha; a tela só lista as cobertas | 6 |
| `PersonalDataRegistryCoverageTest` | toda entidade JPA e tabela Cassandra com coluna `userId`/`authorId`/`actorId`/`ownerId`/`recipientId`/`issuerUserId`/`curatorUserId`/… está em `PersonalDataRegistry` ou em `EXCLUDED_WITH_REASON` (com texto); entidade nova sem classificação falha | 1, 8 |
| `ScheduledJobsTest` | §5 | 1 |
| `ForeignKeyPolicyTest` | §4 (SEG) | — |
| `ContractDriftTest` + `npm run api:types -- --check` | `openapi.json` do springdoc → `lib/api/types.gen.ts` por `openapi-typescript`; arquivo gerado ≠ commitado falha; teste do front falha se um componente ler campo ausente do schema (`tsc` com `noPropertyAccessFromIndexSignature`) | 7 |
| `RegisterAcceptTermsIT` | sem `acceptTerms` → `422 details.acceptTerms`; versão antiga → `409`; duas linhas em `policy_acceptances` com ip/ua/channel | 3, 4 |
| `PolicyGateIT` | publicar v2 → `403 ACEITE_PENDENTE` em `/api/me`, mas `200` em `/api/me/policies`, logout, `/api/me/exports`, `/api/me/deletion` | 3 |
| `BirthDateServerRuleIT` (condicional Q-63) | campo vazio → `422 details.birthDate` | 5 |
| BOLA/BFLA | `GET /api/me/exports/{id}/download` de outra pessoa → `403`; `/api/admin/approvals/*` com EMPREGADO → `403`; ADMIN no próprio pedido → `403` | — |

## 7. Tabela inicial requisito → PR → teste → status

Status de todos: **planejado** (nenhum PR aberto; a documentação é a entrega desta rodada).

| Requisito (DoD do brief) | CA | PR | Teste | Status |
|---|---|---|---|---|
| Componentes Checkbox, RadioCard, Switch, Dialog, Tabs, Banner, FormField, Sheet nos 4 temas | D-11 | PR 0 | Vitest + axe por componente; Playwright nos 4 temas em `/lab/design-system` | planejado |
| Páginas `/termos` e `/privacidade` com versão vigente e histórico; API `/api/legal` | RF1.CA19 | A1 | `LegalControllerIT`; `PolicyTextGuardTest`; Playwright sem login | planejado |
| 1. Sem o checkbox o botão fica desabilitado; pedido sem aceite recebe `422 details.acceptTerms` | RF1.CA14, CA15 | A2 | Vitest `register.test.tsx`; `RegisterAcceptTermsIT` | planejado |
| 2. Versão antiga → `409`; histórico com IP, UA, canal e versão por documento | RF1.CA15, CA16 | A2 | `RegisterAcceptTermsIT`; `PolicyAcceptanceAppendOnlyTest` (UPDATE/DELETE recusados) | planejado |
| 4. OIDC e seed registram o aceite; admin do bootstrap passa pelo gate | RF1.CA17 | A2 | `OidcCompleteIT`; `DemoSeedAcceptanceTest`; `AdminBootstrapGateIT` | planejado |
| 3. Versão nova bloqueia com `ACEITE_PENDENTE`; exportar, excluir e sair liberados | RF1.CA18 | A3 | `PolicyGateIT`; Vitest do `Dialog` bloqueante | planejado |
| Aceite nunca junto com consentimento | RF1.CA20 | A2 | `RegisterAcceptTermsIT` (nenhum `ConsentPurpose` no comando) | planejado |
| Idade conforme Q-63 (coleta ou regra no servidor) | RF1.CA21 | A2 | `BirthDateServerRuleIT` | planejado (aguarda Q-63) |
| 5. ADMIN no cadastro → `422`; RadioCard; campos por tipo | RF1.CA22, CA23 | B1 | `RegisterProfileTypeIT`; Vitest `RadioCard` | planejado (aguarda Q-64) |
| Uploads do cadastro: kind, bytes, pixels, EXIF, `restricted/pending/`, mesmo kind, 24 h | RF1.CA25 | B1 | `PreRegistrationUploadIT`; `ScheduledJobsTest`; `PendingUploadCleanupIT` | planejado |
| Username reservado, disponibilidade 400 ms, sugestões | RF1.CA26 | B1 | `UsernameAvailabilityIT`; Vitest debounce | planejado |
| 5. EMPRESA/CHEFE pendentes só leitura (`403 PERFIL_EM_VALIDACAO`) e só entram na fila após o e-mail | RF1.CA27, RF28.CA12 | B2 | `ApprovalQueueAfterEmailIT`; `GuardApprovedProfileIT` | planejado |
| 6. Aprovar sem critérios → `409 CRITERIOS_PENDENTES`; recusar sem motivo → `422`; admin não decide o próprio; documento auditado | RF28.CA09, CA10, CA13 | B2 | `ApprovalDecisionIT` (os quatro casos); `ApprovalDocumentAuditIT` (`no-store`) | planejado |
| Notificações AFTER_COMMIT; modal "Verificar" com `WS-xxxxxx`; REPRESENTACAO automática | RF28.CA14, CA15 | B2 | `ApprovalNotificationsIT`; `VerificationPolicyTest` (código, domínio, CNPJ) | planejado |
| Reenvio ≤ 5; central de validação; confirmação do CHEFE; criação da `Company` | RF28.CA11, CA16 | B3 | `ResubmitLimitIT`; `HeadConfirmationIT`; `ApproveCreatesCompanyIT` | planejado (aguarda Q-65, Q-66) |
| `/settings` com abas na URL; Conta com reconferência 429; Aparência; Privacidade; Sessões; Termos | RF3.CA07–CA09, CA22 | C1 | Vitest `Tabs` deep link; `ChangeEmailLockoutIT` (6º erro → 429) | planejado |
| Consentimentos nunca marcados, revogar = conceder, histórico, auditoria | RF3.CA10, CA11 | C1 | `ConsentServiceIT`; Vitest `Switch` | planejado (aguarda Q-67) |
| 7. Finalidade sem checagem quebra o CI | RF3.CA12 | C1 | `ConsentCoverageTest` | planejado |
| Transparência "Quais dados temos" do registro único | RF3.CA13 | C2 | `DataMapControllerIT` (categorias = registro) | planejado |
| 8. Exportação assíncrona, 3/dia, nome e tipo certos, só do dono, `410` | RF3.CA14–CA16 | C2 | `ExportLifecycleIT` (estados, 429, 403, 410, `Content-Type`); `ExportContentTest` (só as próprias mensagens) | planejado |
| 7. Entidade com dado pessoal fora do registro quebra o CI | RF3.CA17 | C2 | `PersonalDataRegistryCoverageTest` | planejado |
| Revisão art. 20, oposição, informação sobre compartilhamento com prazo e encarregado | RF3.CA18 | C3 | `DataSubjectRequestIT`; Vitest do formulário (canal do encarregado visível) | planejado (aguarda Q-60, Q-71) |
| 9. Encerramento agendado, cancelável, `Dialog` com o que fica; `403 EXCLUSAO_AGENDADA`; perfil oculto | RF3.CA19, CA20 | C3 | `DeletionRequestIT`; `DeletionScheduledGuardIT`; Vitest `Banner`/`Dialog` | planejado (aguarda Q-68) |
| 9. Job conclui a anonimização no MySQL, Cassandra, OpenSearch e S3; aceites ficam | RF3.CA21 | C3 | `ScheduledJobsTest` (teste 1); `AccountAnonymizationIT` (teste 2) | planejado |
| Padrões de interface LGPD (destaque igual, sem constrangimento, teclado, reduceMotion) | RF3.CA23 | C1–C3 | axe + Playwright com `prefers-reduced-motion` | planejado |
| 10. Tipos do front gerados do OpenAPI; divergência quebra o CI | RF3.CA24 / D-21 | C4 | `ContractDriftTest`; `npm run api:types -- --check` | planejado |
| 11. Nenhum texto legal publicado tem marcador | RF1.CA19 / D-15 | A1 | `PolicyTextGuardTest` | planejado (textos v0.1 já passam) |

## 8. Ações que só o time pode fazer

1. **Nome e contato do encarregado** → valores de `WS_LEGAL_DPO_NAME` e `WS_LEGAL_DPO_CONTACT` no provedor (Q-60).
2. **Validação dos textos legais** v0.1 pelo jurídico e pelo encarregado, item a item nas seções "Pendências para o
   jurídico" (Q-61, Q-63, Q-67, Q-68, Q-69, Q-71, Q-72).
3. **Lista de domínios institucionais** permitidos no cadastro (Q-62) e listas de referência da validação (Q-73).
4. Respostas de produto: campos por tipo (Q-64), criação da `Company` na aprovação (Q-65), quem confirma o CHEFE
   (Q-66), catálogo de códigos (Q-70).
