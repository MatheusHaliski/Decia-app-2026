# Auditoria de requisitos do Work Station — 17/10/2026

Base auditada: `main` em `e8ba2a8`. As correções estão no branch `claude/upbeat-dirac-7sa5n3` e foram todas publicadas, com testes. Notas **técnicas provisórias** na rubrica do projeto, que não é escala oficial de Nielsen, da W3C ou de Amershi et al. Nenhum teste com usuários foi feito: não há SUS, satisfação nem participantes. A qualidade real da IA está **não verificada**, porque nenhum motor de IA está registrado no backend.

## O que foi encontrado primeiro

1. **A auditoria de 16/10 não é reproduzível.**
   - 20 dos 51 componentes que ela cita não existem no repositório, entre eles `components/studio/*`, `components/tasks/*` e `lib/tasks/client.ts`.
   - 50 dos 74 RF se apoiam nesses componentes, e não existe rota `/studio`.
   - Ela própria declara que as correções ficaram "locais".
   - Por isso, todas as notas desta rodada foram refeitas a partir do código publicado.
2. **A CI de `main` estava vermelha** nos jobs de frontend e de contrato.
   - `npm ci` falhava e 9 suítes de componentes nem carregavam.
   - Lint, testes e build do frontend não estavam sendo verificados.
3. **A API real cobre só autenticação, conta e preferências.**
   - Tarefas, projetos, DECIA, rede social e IA tinham tabelas e entidades, mas nenhum serviço nem controller.
   - Perfil, Mural e DECIA rodam com dados de demonstração em memória.
   - Letters e Drawings não existem no app: há só bibliotecas puras e um protótipo fora do app em `docs/exemplo_drawings_letters/`.
4. **O login respondia 503 em qualquer ambiente** configurado como o README manda. As chaves JWT nunca eram lidas (P20); o problema apareceu ao subir a pilha real.

## O que foi corrigido (P0 → P1)

| Prioridade | Correção | Commit |
|---|---|---|
| P0 | CI restaurada: dependências, Vitest 5/oxc, catálogo RF49/RF50, lint | `4c6d05e` |
| P0 | Login: ligação das chaves JWT (`@ConstructorBinding`), com teste de regressão | `b47945c` |
| P0 | **Tarefas reais**: API (V36 `task_briefs`, `TaskService` com `ResourceAuthorizer`, controller, contrato OpenAPI) e telas (criar, listar, abrir, editar, estados) | `97611a0`, `013657a`, `474b6cb` |
| P0 | Privacidade: SIGILOSO = PRIVADA, como no backend; composição de projeto e contadores do perfil sem vazamento | `b602d34` |
| P0 | Drawings (lógica): seleção só do visível; `authorizePatch` único para edição manual e IA (reserva, camada, seleção) | `4c6d05e`, `72f5636` |
| P0/P1 | DECIA: sugestão de IA bloqueada após a decisão, versão correta, transições validadas, alterações de pesos e critérios visíveis | `5866bca` |
| P1 | Autonomia da IA com 5 modos de efeito concreto (Configurações + DECIA) | `c51cb0e` |
| P1 | Estados de tarefa padronizados (A realizar · Em andamento · Bloqueado · Concluído) espelhando o Java | `5ad78ae` |
| P1 | Sessão: renovação antes da 1ª chamada, que reduz a revogação por reuso (P18) | `772257d` |

## Jornada real verificada

UI → BFF → API Java → MySQL 8.4, com duas contas sintéticas e sem IA. Roteiro em [`scripts/jornada.mjs`](scripts/jornada.mjs); resultado em [`evidencias/JORNADA.json`](evidencias/JORNADA.json): **17 de 17 passos ✓**.

| Verificação | Resultado |
|---|---|
| Criar tarefas de **desenvolvimento de software, administração, design, pesquisa, marketing e planejamento**, cada uma com objetivo, entregável, 2 critérios, referência e campos só da própria área | ✓ 3,5–9,9 s por tarefa (automação; não é tempo humano) |
| Sair, entrar de novo e reabrir | ✓ título, objetivo, critérios e campos da área preservados |
| Editar sem perder conteúdo | ✓ entregáveis, critérios e referências mantidos |
| Edição concorrente (duas abas) | ✓ 409 mostrado; o texto da segunda aba é preservado, com a opção "Recarregar versão atual" |
| Iniciar → Bloquear (motivo) → Retomar → marcar critério → Concluir | ✓ concluída fica somente leitura |
| Outra conta abre tarefa privada | ✓ "não existe ou você não tem acesso", sem revelar qual dos dois; o acervo dela não lista tarefas alheias |
| Celular 390 px: lista, criação, detalhe, autonomia, DECIA, perfil | ✓ sem rolagem horizontal |
| DECIA em "Sob solicitação" | ✓ a sugestão da IA só aparece depois do pedido explícito |

Erros de console da jornada: dois 404 esperados (outra conta) e dois avisos de hidratação em `/tasks/new` no modo dev (pendente, P3).

## Capturas

| Fluxo | Desktop | Celular |
|---|---|---|
| Criar tarefa (Design) | [01](evidencias/01-criar-tarefa-design-desktop.png) | [09](evidencias/09-criar-tarefa-celular.png) |
| Detalhe da tarefa | [02](evidencias/02-detalhe-tarefa-design-desktop.png) | [10](evidencias/10-detalhe-tarefa-celular.png) |
| Minhas tarefas | [03](evidencias/03-minhas-tarefas-desktop.png) | [08](evidencias/08-minhas-tarefas-celular.png) |
| Conflito entre abas | [04](evidencias/04-conflito-edicao-desktop.png) | — |
| Bloqueada / concluída | [05](evidencias/05-tarefa-bloqueada-desktop.png) · [06](evidencias/06-tarefa-concluida-desktop.png) | — |
| Outra conta sem acesso | [07](evidencias/07-outra-conta-sem-acesso-desktop.png) | — |
| Autonomia da IA | [14](evidencias/14-autonomia-ia-desktop.png) | [11](evidencias/11-autonomia-ia-celular.png) |
| DECIA: IA sob solicitação → após pedido | [15](evidencias/15-decia-ia-sob-solicitacao-desktop.png) · [16](evidencias/16-decia-ia-apos-pedido-desktop.png) | [12](evidencias/12-decia-ia-sob-solicitacao-celular.png) |
| DECIA: alterações registradas | [17](evidencias/17-decia-alteracoes-registradas-desktop.png) | — |
| Perfil (DEMO; contador Seguindo) | [18](evidencias/18-perfil-contadores-desktop.png) | [13](evidencias/13-perfil-celular.png) |

## Documentos

- [Matriz dos 74 RF](MATRIZ_RF.md) ([JSON](MATRIZ_RF.json), [CSV](MATRIZ_RF.csv)), gerada por [`scripts/gerar-matriz.py`](scripts/gerar-matriz.py), e o [resumo por módulo](RESUMO_MODULOS.md).
- [Problemas com reprodução e gravidade](PROBLEMAS.md) (P01–P23).
- [Antes × depois, arquivos alterados e testes](ANTES_DEPOIS.md).
- [Conectores](CONECTORES.md): nenhum implementado; nenhum logo promete integração inexistente.
- [Fundamentação: Nielsen, WCAG 2.2 e Amershi et al. → verificações](REFERENCIAS.md).
- Decisões e dúvidas novas: [`docs/DECISOES.md`](../../DECISOES.md) (D-93 revista, D-135–D-137, Q-235–Q-239).

## Notas e cobertura

**Média geral dos 74 RF: 1,28 → 1,65.** Tarefas (RF4, RF12, RF41) passaram de 1,52 para 7,02. Identidade (RF1, RF2) foi de 4,89 para 6,30. Ainda há **44 RF ausentes**, 7 só com lógica, 14 em DEMO e 9 com API real parcial. Nenhum RF tem aceite integral.

As notas baixas são deliberadas: zero significa que a jornada não existe para o usuário (página-esqueleto), não falta de acesso. Acessibilidade ficou **n/v** nas telas novas porque não houve verificação com Axe nem com tecnologia assistiva nesta rodada. Essas notas estão marcadas com \* e calculadas sem essa dimensão.

## Avaliação por tema pedido

- **Tarefas profissionais:** campos comuns mais extensões opcionais por área; nenhuma profissão é obrigada a preencher campos de software.
  - Faltam anexos, dependências estruturadas, escolha de outro responsável (não há busca de pessoas) e vínculo com projeto (não há API de projetos). O detalhe da tarefa diz isso explicitamente.
- **Letters:** não existe no app. Não houve como testar formatação, seleção, desfazer, colaboração, nem se a IA respeita a alteração localizada. Pendente (P11).
- **Drawings:** não há canvas. O modelo é vetorial 2D (seleção, camadas, regiões, reservas).
  - A correspondência seleção → alteração e o escopo da IA foram corrigidos na lógica e testados.
  - Falta interface, e com ela as alternativas a arrastar (WCAG 2.5.7).
- **Autonomia da IA:** os 5 modos funcionam e têm efeito concreto.
  - Só o proprietário troca o modo; a troca avisa os participantes e invalida propostas antigas.
  - O agente exige mandato com limites e pode ser interrompido.
  - Conectores privados não são herdados ao compartilhar a sessão.
  - O efeito real hoje está no DECIA. Não há executor de agente nem editor de peças para aplicar a política.
- **Qualidade da IA (Letters, Drawings, DECIA):** **não verificada**. Não há motor registrado (`AiProvidersConfig` vazio) e não foram feitas chamadas pagas. As recomendações do DECIA são cálculos determinísticos testados (pontuação ponderada, sensibilidade), não IA.
- **DECIA:**
  - Problema, alternativas, critérios, evidências e decisão funcionam em DEMO.
  - IA, modelo e decisão do responsável estão separados na interface.
  - Não há votação nem decisão de grupo, então não há como a IA "anunciar consenso". Também não há persistência.
- **Perfil:** os contadores agora respeitam a privacidade. Porém **a conta real logada vê o perfil de demonstração** (P19).
- **Cards:** o card de tarefa real tem identidade própria: tipo, título, objetivo, estado, prazo, prioridade, próxima ação e progresso com regra explícita. O card de projeto continua só em DEMO.
- **Conectores:** nenhum existe, então não houve teste externo a executar.

## Pendências e plano de continuidade

| Ordem | Item | Dependência |
|---|---|---|
| 1 | Decidir Q-237 (janela de tolerância ao reuso do refresh) e Q-236 (ordem do Flyway) antes do deploy | Dono do produto/segurança |
| 2 | Perfil real (P19): cabeçalho, acervo e barra superior a partir de `/api/me` e `/api/tasks` | — |
| 3 | Agregado Projeto com API (RF5, RF20–22, RF7): fases, tarefas, dependências, progresso por regra | V12 já existe |
| 4 | Anexos de tarefa (`MediaUploadService` como bean) e busca de pessoas para o responsável | D-67 |
| 5 | Editor Drawings sobre `lib/studio` + `authorizePatch`, com alternativas a arrastar | — |
| 6 | Letters estruturado com sugestões revisáveis e autoria | — |
| 7 | Motor de IA no `AiGateway` + política de autonomia no servidor + campanha de qualidade com gabarito | Orçamento de IA |
| 8 | API do DECIA com participantes, votação/avaliação e decisão de grupo | V14/V22 |
| 9 | Primeiro conector (escopos mínimos, estados, testes negativos) | Credenciais institucionais |
| 10 | Axe + leitor de tela nas telas novas; testes com usuários (meta proposta: ≥ 90 % de conclusão sem ajuda) | Participantes reais |

**Ambiente da jornada:** MySQL em contêiner, chaves e senhas geradas na hora fora do repositório, perfil `dev`. As contas sintéticas foram ativadas direto no banco local descartável, porque o código de verificação fica mascarado no log (P22). Não use os scripts contra dados de produção.
