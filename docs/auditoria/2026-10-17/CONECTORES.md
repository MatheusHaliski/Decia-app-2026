# Conectores, provedores, aplicativos e formatos

17/10/2026 · verificado no repositório (`app/`, `components/`, `lib/`, `public/`, `ws-*`). "Ausente" = nenhum adapter, rota, componente ou ícone encontrado. Nenhum serviço externo foi chamado nesta rodada.

**Resumo:** o Work Station não tem nenhum conector de terceiros implementado. Também não exibe logos de Google, GitHub, Facebook, Word ou Excel: o sprite de glifos (`components/ui/glyphs/sprite.gen.ts`) tem 26 glifos internos e `public/` contém só a arte da marca. Portanto não há logo prometendo uma integração que não funciona. Esse é o estado correto até existir um adapter.

| Conector | Tipo | Finalidade prevista | Ações reais | Dados | Permissões | Estado da conexão | Tratamento de falhas | Teste executado |
|---|---|---|---|---|---|---|---|---|
| OIDC institucional | Provedor de identidade | Entrar com a conta do órgão (RF2) | Botão "Entrar com…" só quando `oidcEnabled` (`components/auth/AuthForms.tsx:88-92`); `POST /api/auth/oidc/login` (`OidcController.java:35`); BFF `app/bff/auth/oidc/*` | Claims de identidade | Escopos do IdP | Não há tela de estado; sem IdP configurado o botão some e aparece "disponível quando a TI habilitar" | Testes `OidcWebTest`, `app/bff/auth/oidc.test.ts` | Testes automatizados (doubles). **IdP real não verificado** |
| SMTP / `MailPort` | Infraestrutura | Verificação de e-mail e recuperação de senha (RF1/RF2) | `RegistrationController` reenviar/confirmar | E-mail do titular, código temporário | — | — | Rate limit e expiração de código (testes) | Testes de serviço. **Entrega real não verificada** |
| Provedor de IA (OpenAI/Claude/Gemini) | Serviço de IA | Sugestões em Letters/Drawings/DECIA, Copilot | **Nenhuma**: `AiGateway` sem chamador de produção; `AiProvidersConfig` vazio; enums citam provedores | Seria: texto mascarado, classe ≤ INTERNO | Orçamento por usuário/empresa; RESTRITO/SIGILOSO nunca saem | — | Gateway trata orçamento, sigilo, fallback local (`AiGatewayTest`) | Testes unitários do gateway. **Qualidade real não verificada** |
| Google Drive / Docs / Gmail / Agenda | Provedor + aplicativos | Importar tarefas/arquivos (RF23) | Ausente | — | — | — | — | Bloqueio: não há adapter. Teste controlado só faz sentido após o adapter |
| Microsoft 365 / OneDrive / Graph | Provedor + aplicativos | Importar/vincular documentos (RF23) | Ausente | — | — | — | — | Idem |
| Word (.docx) | **Formato de arquivo** | Exportar/importar peças Letters | Ausente na UI; `format: "docx"` nos fixtures é só rótulo do card | — | — | — | — | Bloqueio: não há Letters |
| Excel (.xlsx) | **Formato de arquivo** | Planilhas de tarefa | Ausente; tipo `PLANILHA` é rótulo | — | — | — | — | Idem |
| GitHub | Provedor | Vincular issue/PR a tarefa | Ausente. Os links "ver no GitHub" em `RfPage.tsx:69`/`LabEmbed.tsx:23` apontam para a documentação do próprio repositório, não para uma integração | — | — | — | — | — |
| Facebook | Rede externa | — | Ausente; nenhum requisito pede publicação externa | — | — | — | — | — |
| e-Protocolo | Fonte institucional | Importar por número de protocolo (RF23) | Ausente; `SourceKind.PROTOCOLO`, `TaskItem.protocolNumber` existem no domínio | — | — | — | — | — |
| S3 / armazenamento | Infraestrutura | Anexos (RF4/RF41) | `MediaUploadService` escrito, mas não é bean (D-67); módulo `storage-s3` | Mídia com quarentena (`media_scans`) | ACL do recurso | — | Varredura/quarentena (V24) | Não executado |

## Contrato para que um conector apareça na interface

Um conector só pode exibir logo ou o estado "conectado" quando o fluxo a seguir estiver demonstrado de ponta a ponta:

**ação na interface → API → adapter → serviço externo → resultado → atualização da tarefa ou projeto**

Isso exige autenticação com escopos mínimos e estados visíveis (desconectado, conectando, conectado, expirado, revogado, sincronizando, erro). Exige também idempotência e deduplicação, limites, falha recuperável sem perda e testes controlados (401/403/404/409/429/5xx, timeout, resposta inválida).

Regras de identidade visual:
- Usar o asset oficial de cada marca, conforme as diretrizes dela.
- Nome e ação ficam sempre ao lado do logo; a cor nunca é o único indicador de estado.
- Logo e ação têm o mesmo tamanho em todos os conectores.

Regra de sessão compartilhada: compartilhar uma sessão nunca concede acesso às conexões privadas dos participantes. Isso já está codificado para o agente de IA em `lib/ai/autonomy.ts` (`agentConnectors`, `checkCharterConnectors`) e testado.

## Testes controlados

Nenhum adapter existe, então nenhum teste de integração externo foi declarado como executado. A única regra de conector testada nesta rodada é a de isolamento entre participantes (`lib/ai/autonomy.test.ts`, "conectores: só os do autorizador e listados no mandato").
