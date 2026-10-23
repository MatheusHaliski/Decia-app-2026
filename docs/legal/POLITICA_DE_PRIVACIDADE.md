---
document: PRIVACIDADE
version: "0.2"
status: rascunho
language: pt-BR
effectiveFrom: null
changelog:
  - version: "0.2"
    date: 2026-10-17
    summary: "Troca de controlador. A controladora passa a ser a Velion, empresa privada dona da marca e plataforma Orange Social, e esta Política foi reescrita para essa realidade. As bases legais passam a ser contrato, obrigação legal, legítimo interesse com direito de oposição e consentimento só para o que é opcional, como marketing. Entram a transferência internacional, a lista de cookies, a cifragem do segredo do 2FA e a reativação da conta em até 30 dias. Os dados da empresa e do encarregado ficam em campos a preencher antes da publicação."
  - version: "0.1"
    date: 2026-10-05
    summary: Primeiro rascunho da Política de Privacidade do Work Station, escrito para órgão público (controlador SECID-PR, LGPD art. 23) a partir da estrutura da Política do FAI; finalidades, bases legais e prazos são propostas da engenharia e aguardam o encarregado e o jurídico (Q-60, Q-61, Q-68).
---

# Política de Privacidade do Work Station

**Versão 0.2 — rascunho, ainda sem vigência.** Vigente a partir de {{DATA_VIGENCIA}}.

Esta Política explica quais dados pessoais o **Work Station** trata, para quê, com que base legal, com quem
compartilha, por quanto tempo guarda e como você exerce seus direitos. Ela segue a **Lei Geral de Proteção de Dados
(LGPD, Lei 13.709/2018)** e o **Marco Civil da Internet (Lei 12.965/2014)**.

**Quem é a controladora.** A **{{VELION_RAZAO_SOCIAL}}** ("**{{VELION_NOME_FANTASIA}}**" ou "Velion"), CNPJ
{{VELION_CNPJ}}, com sede em {{VELION_ENDERECO}}, {{VELION_CIDADE_UF}}, CEP {{VELION_CEP}}. A Velion é dona da marca e
da plataforma **Orange Social** ({{ORANGE_SOCIAL_SITE}}). O Work Station é a rede profissional e de trabalho da
Orange Social.

**Quem é o encarregado.** O encarregado pelo tratamento de dados pessoais (LGPD, art. 41) é **{{DPO_NOME}}**. Fale
com ele em **{{DPO_EMAIL}}**.

---

## Resumo em um minuto

- **Tratamos o necessário para o Work Station funcionar:** sua identificação, seu perfil profissional, o que você
  produz e como usa o sistema.
- **Não pedimos dados sensíveis.** Nem CPF no cadastro. O CNPJ só é pedido na validação de contas de EMPRESA.
- **A maior parte do tratamento serve para cumprir o contrato com você** (os Termos de Uso). Algumas coisas a lei
  obriga. Outras se apoiam em legítimo interesse, e você pode se opor.
- **O que é opcional depende de você.** Marketing e recursos extras só com o seu consentimento, desligado por padrão
  e revogável a qualquer momento.
- **Provedores de IA só recebem dados mascarados**, nunca conteúdo RESTRITO ou SIGILOSO.
- **Não vendemos dados pessoais** e não usamos cookies de publicidade.
- **Você pode baixar seus dados e excluir a conta.** A conta fica desativada por 30 dias, e você pode reativá-la nesse
  prazo. Depois, os dados pessoais são anonimizados.

---

## 1. Quais dados tratamos

A lista completa, com finalidade, base legal, prazo e compartilhamento de cada dado, aparece em **Configurações ›
Dados**, na parte "Quais dados temos". Ela sai do mesmo registro que alimenta a exportação (seção 11).

**1.1. Todos os perfis**

- **Cadastro:** nome completo, nome de exibição, nome de usuário, e-mail, senha (guardada só como hash), cargo e tipo
  de perfil.
- **Opcionais:** telefone, foto e bio.
- **Segurança da conta:** se a verificação em duas etapas está ligada, o segredo do aplicativo autenticador e os
  códigos de recuperação (guardados protegidos).
- **Preferências:** tema, idioma, fuso, notificações, modo de autonomia da IA e limites de trabalho.

**1.2. EMPREGADO**

- Cargo e, se você quiser, o departamento ou a empresa em que trabalha.

**1.3. EMPRESA**

- Razão social, CNPJ, site e documento que prova a representação. O CNPJ e o documento servem só à validação da conta.
- Nome e e-mail da pessoa que cria e administra a conta da empresa.

**1.4. CHEFE DE DEPARTAMENTO**

- Empresa, departamento e prova da chefia, usados na validação.

**1.5. Dados gerados pelo uso**

- o que você produz: tarefas, anexos, projetos, planos, mensagens das sessões DECIA, comentários, reações e textos
  que você escreve para a IA;
- vínculos com empresas e departamentos, histórico de tarefas e projetos;
- decisões de que você participou, chancelas, DECIA Points e reconhecimentos;
- indicadores calculados a partir do seu trabalho: índice de eficiência (HSE), Hype do Perfil e posição em rankings;
- resultados da IA sobre o que você escreveu (classificações, resumos, sugestões), com registro de qual modelo os
  gerou;
- **registros de acesso:** endereço IP, data e hora, navegador e identificador da sessão;
- registros de auditoria das ações feitas por você e sobre os seus dados.

**1.6. O que não coletamos**

- **Dados sensíveis** (LGPD, art. 5º, II), como origem racial, religião, opinião política, saúde, vida sexual, dado
  genético ou biométrico. Não pedimos e não queremos esses dados. Se um anexo contiver dado sensível de outra pessoa,
  ele deve ser classificado como RESTRITO ou SIGILOSO.
- **CPF.** Não é pedido no cadastro. Só seria pedido se uma obrigação legal ou um plano pago exigisse, e isso seria
  avisado antes.
- **Data de nascimento.** Não é coletada. No cadastro você declara ter a idade mínima.

## 2. Para que usamos e com qual base legal

| Finalidade | Exemplos | Base legal (LGPD) |
|---|---|---|
| Criar e manter sua conta e prestar o serviço | cadastro, login, tarefas, projetos, sessões DECIA, chancelas, perfil profissional | execução de contrato (art. 7º, V) |
| Validar contas de EMPRESA e de CHEFE | conferência do CNPJ, do site e da prova de representação ou de chefia | execução de contrato (art. 7º, V) e legítimo interesse na prevenção a fraude (art. 7º, IX) |
| Apoio da IA ao trabalho | resumos, classificação de mensagens, sugestões de texto e de chancela, no modo de autonomia que você escolher | execução de contrato (art. 7º, V), com mascaramento antes de qualquer envio externo |
| Comunicações do serviço | códigos de verificação, avisos de segurança, prazos e decisões | execução de contrato (art. 7º, V) |
| Guardar registros de acesso | IP, data e hora de cada acesso por 6 meses | obrigação legal (art. 7º, II; Marco Civil, art. 15) |
| Provar aceites e consentimentos | versão aceita, data, IP e navegador | obrigação legal (art. 7º, II; art. 8º, § 2º) e exercício regular de direitos (art. 7º, VI) |
| Atender autoridades e defender direitos | ordens judiciais, pedidos da ANPD, processos | obrigação legal (art. 7º, II) e exercício regular de direitos (art. 7º, VI) |
| Atender seus pedidos de titular | acesso, correção, exportação, exclusão | obrigação legal (art. 7º, II; art. 18) |
| Segurança e prevenção a fraude | limites de tentativas, bloqueio por IP, detecção de contas múltiplas, auditoria | legítimo interesse (art. 7º, IX) |
| Indicadores e reconhecimento | HSE, Hype do Perfil, rankings, DECIA Points | legítimo interesse (art. 7º, IX), com regras publicadas e direito de revisão (art. 20) |
| Melhorar o serviço | métricas de uso de recursos, de preferência agregadas ou anonimizadas | legítimo interesse (art. 7º, IX) |
| Comunicações de marketing | novidades e ofertas da Orange Social por e-mail | consentimento (art. 7º, I) |
| Recursos opcionais | ver a seção 4 | consentimento (art. 7º, I) |

## 3. Legítimo interesse e seu direito de oposição

Usamos legítimo interesse só nas finalidades marcadas assim na tabela. Para cada uma fizemos um **teste de
balanceamento**:

- **Finalidade legítima:** proteger a plataforma, reconhecer o trabalho e melhorar o serviço.
- **Necessidade:** usamos só os dados indispensáveis para isso.
- **Expectativa:** são usos que uma pessoa espera de uma rede profissional.
- **Proteções:** regras publicadas, visibilidade dos indicadores no padrão "só eu", dados agregados sempre que
  possível e direito de revisão.

O resumo de cada teste pode ser pedido ao encarregado. Você pode **se opor** a esses tratamentos em Configurações ›
Privacidade ou pelo e-mail {{DPO_EMAIL}}. Atendemos a oposição, salvo quando o tratamento for indispensável para a
segurança da conta ou de outros usuários. Nesse caso explicamos o motivo.

## 4. Seus consentimentos

Só o que é **opcional** depende de consentimento. Cada finalidade tem um **interruptor próprio** em Configurações ›
Privacidade. Ele começa **desligado**, pode ser desligado no mesmo lugar e com o mesmo esforço (art. 8º, § 5º) e
nunca é pedido junto com o aceite dos Termos (art. 8º, § 4º). Registramos data e hora de cada concessão e revogação.

| Interruptor | O que permite |
|---|---|
| **Comunicações de marketing** | receber por e-mail novidades e ofertas da Orange Social; todo e-mail traz um link para sair da lista |
| **Resumo profissional por IA** | gerar, com IA, um resumo do seu trabalho e dos seus indicadores para o seu perfil |
| **Gravação de reuniões como padrão** | marcar por padrão a sua anuência à gravação de reuniões; cada reunião continua pedindo o consentimento dela |

Finalidades novas só entram com nova versão desta Política e com interruptor próprio.

## 5. Com quem compartilhamos

**5.1. Operadores de infraestrutura.** Hospedagem, banco de dados, armazenamento de arquivos e envio de e-mails ficam
com {{PROVEDORES_INFRAESTRUTURA}}. Eles tratam dados só para operar o serviço, sob contrato e seguindo nossas
instruções.

**5.2. Provedores de IA.** Quando um recurso usa um provedor externo de IA, os dados vão para
{{PROVEDORES_IA}}. Antes do envio, nomes, e-mails, telefones e identificadores são **mascarados**. Conteúdo RESTRITO
ou SIGILOSO **nunca** sai da plataforma. Exigimos por contrato que esses provedores não usem os dados para treinar
modelos e que os descartem depois da resposta.

**5.3. Sua empresa ou organização, dentro da plataforma.** Se você trabalha no espaço de uma EMPRESA, ela e as
chefias do seu departamento veem o que você produz ali, seu perfil e os indicadores que a visibilidade permitir. A
empresa só vê o que está dentro do espaço dela. Ela não recebe sua senha, seus consentimentos nem seus dados de outros
espaços.

**5.4. Outras pessoas da plataforma.** O que você publica aparece conforme a classificação de acesso e a visibilidade
de cada item. Seu nome, cargo e foto aparecem no seu perfil. Indicadores pessoais começam visíveis só para você.

**5.5. Autoridades.** Quando houver obrigação legal ou ordem judicial, entregamos apenas o que for exigido.

**5.6. Mudança societária.** Se a Velion passar por fusão, aquisição ou venda do Work Station, os dados podem ir para
a nova controladora, que fica obrigada a esta Política. Avisamos antes.

A Velion **não vende** dados pessoais e não os usa para publicidade de terceiros.

## 6. Transferência internacional

Alguns operadores podem tratar dados fora do Brasil, em {{PAISES_TRANSFERENCIA}}. Essas transferências seguem o
art. 33 da LGPD. Usamos as cláusulas-padrão contratuais aprovadas pela ANPD ou outra garantia que a lei reconheça. Os
dados enviados a provedores de IA saem sempre mascarados, como descrito em 5.2.

## 7. Cookies e armazenamento no navegador

Usamos só o **necessário** para você entrar e continuar conectado:

| Nome | Para que serve | Duração |
|---|---|---|
| `ws_rt` | mantém sua sessão; é HttpOnly, então scripts da página não conseguem lê-lo | até a sessão expirar ou você sair |
| `ws_rt_h` | sinal sem segredo que avisa ao app que existe uma sessão | igual ao `ws_rt` |

Tema, idioma e outras preferências ficam no armazenamento local do navegador. O token de acesso fica só na memória
da página. **Não usamos cookies de publicidade**, de medição de audiência de terceiros nem de rastreamento entre sites.

## 8. Como protegemos seus dados

- conexões cifradas (TLS) do navegador até os nossos servidores e entre eles;
- senhas guardadas só como hash **Argon2id**;
- e-mail, telefone, CNPJ e o segredo da verificação em duas etapas **cifrados com AES-GCM** no banco de dados;
- documentos de validação, exportações e anexos RESTRITOS ou SIGILOSOS numa área restrita, entregue só a quem tem
  direito, com registro de cada acesso;
- metadados de localização removidos das imagens enviadas;
- limites de tentativas, bloqueio progressivo e nova conferência de senha em operações sensíveis;
- verificação em duas etapas opcional e "sair em todos os dispositivos";
- acesso interno mínimo e auditoria.

Se houver um incidente de segurança que possa causar risco ou dano relevante, avisamos a ANPD e as pessoas afetadas
(art. 48).

## 9. Por quanto tempo guardamos

| Dado | Prazo |
|---|---|
| Conta, perfil, preferências e conteúdo | enquanto a conta existir; depois do pedido de exclusão, 30 dias para reativar e então anonimização |
| Conteúdo produzido no espaço de uma EMPRESA | fica com a empresa conforme o contrato dela; o seu nome é trocado por um identificador anônimo |
| Registros de acesso (IP, data e hora) | 6 meses (Marco Civil, art. 15), ou mais se houver ordem judicial |
| Prova do aceite dos Termos e da Política | mantida mesmo após a anonimização, pelo tempo necessário para comprovar o aceite (art. 8º, § 2º) |
| Histórico de consentimentos | mantido mesmo após a anonimização, para comprovar concessões e revogações |
| Registros de auditoria sobre dados pessoais | 5 anos a partir do fato |
| Documentos de validação de EMPRESA e CHEFE | até a decisão e por mais 2 anos para eventual contestação; depois são apagados |
| Dados de contrato e cobrança de EMPRESA, se houver | prazo exigido pela legislação fiscal e contábil |
| Arquivo de exportação dos seus dados | 7 dias |
| Arquivos enviados num cadastro não concluído | 24 horas |
| Notificações | cerca de 90 dias |
| Cópias de segurança | ciclo normal de rotação dos backups |

Dados anonimizados podem ser usados em estatísticas, porque deixam de ser dados pessoais (art. 12).

## 10. Seus direitos

Pela LGPD (art. 18) você pode:

- **confirmar** se tratamos seus dados e **acessá-los**;
- **corrigir** dados incompletos, inexatos ou desatualizados;
- pedir **anonimização, bloqueio ou eliminação** de dados desnecessários, excessivos ou tratados fora da lei;
- **levar seus dados** para outro serviço (portabilidade), num arquivo legível por máquina;
- pedir a **eliminação** dos dados tratados com consentimento;
- saber **com quem** compartilhamos seus dados;
- saber o que acontece se **não der** um consentimento;
- **revogar** consentimentos;
- **se opor** a tratamentos baseados em legítimo interesse (seção 3);
- pedir **revisão** de decisões tomadas só com tratamento automatizado que afetem seus interesses (art. 20);
- reclamar à **Autoridade Nacional de Proteção de Dados**, em https://www.gov.br/anpd.

**Como exercer.** Quase tudo está em **Configurações › Dados**: ver "Quais dados temos", baixar seus dados, abrir um
pedido ao encarregado e excluir a conta. Consentimentos e oposição ficam em **Configurações › Privacidade**. Você
também pode escrever para {{DPO_EMAIL}}.

Cada pedido fica registrado, com prazo e resposta. Podemos pedir uma confirmação de identidade para proteger você.

## 11. Exclusão da conta

1. Você pede a exclusão em Configurações › Dados, com a sua senha atual. A tela mostra o que será anonimizado e o que
   ficará guardado, e por quê.
2. A conta fica **desativada e oculta por 30 dias**.
3. Nesse prazo, você pode **reativar**: entre com seu e-mail e senha e escolha **Reativar**. Também pode baixar seus
   dados.
4. Depois de 30 dias, um processo automático:
   - troca nome, nome de usuário, e-mail, telefone, foto, bio e cargo por valores anônimos e invalida a senha;
   - apaga arquivos pessoais, como foto, documentos de validação e exportações;
   - remove seus dados das buscas e das linhas do tempo;
   - encerra todas as sessões;
   - mantém só o que a lei obriga, pelo prazo legal (seção 9).

A anonimização não pode ser desfeita.

## 12. Crianças e adolescentes

O Work Station **não se destina a menores de {{IDADE_MINIMA}} anos** (sugestão: 18). Não coletamos dados de crianças
nem de adolescentes de propósito. Se descobrirmos uma conta de alguém abaixo da idade mínima, ela será encerrada e os
dados serão eliminados, exceto o que a lei obrigar a guardar.

## 13. Mudanças nesta Política

Cada versão tem número, data de vigência e resumo das mudanças, visíveis em /privacidade. Mudanças relevantes, como
nova finalidade, novo compartilhamento ou novo prazo de guarda, são avisadas antes e pedem novo aceite. Uma nova
finalidade opcional pede um novo consentimento. As versões anteriores ficam no histórico.

## 14. Contato

- Controladora: {{VELION_RAZAO_SOCIAL}} ({{VELION_NOME_FANTASIA}}), CNPJ {{VELION_CNPJ}}.
- Endereço: {{VELION_ENDERECO}}, {{VELION_CIDADE_UF}}, CEP {{VELION_CEP}}.
- E-mail geral: {{VELION_EMAIL_CONTATO}}. Telefone: {{VELION_TELEFONE}}.
- Sites: {{VELION_SITE}} e {{ORANGE_SOCIAL_SITE}}.
- Encarregado: {{DPO_NOME}}, {{DPO_EMAIL}}.
- Autoridade Nacional de Proteção de Dados: https://www.gov.br/anpd

---

## Pendências para o jurídico

Esta seção não é publicada. A dúvida registrada é a **Q-243** de `docs/DECISOES.md`; quando um item também depende
de uma dúvida anterior, ela aparece junto.

| Item | Pendência | Q |
|---|---|---|
| Identificação | Dados completos da Velion e da Orange Social (campos `VELION_*` e `ORANGE_SOCIAL_SITE`). Confirmar se a controladora é a própria Velion ou outra empresa do grupo. | Q-243 |
| Encarregado | Nome e e-mail do encarregado (`DPO_NOME`, `DPO_EMAIL`). Pessoa interna ou serviço contratado. | Q-243 |
| Papel da empresa cliente | No espaço de uma EMPRESA, a Velion é controladora de tudo ou operadora do conteúdo de trabalho, com a EMPRESA como controladora? Define as seções 5.3 e 9 e o contrato com as empresas. | Q-243 |
| Bases legais | Confirmar a tabela da seção 2, em especial legítimo interesse para indicadores e rankings e os testes de balanceamento da seção 3. | Q-243 |
| Provedores | Lista nominal de operadores de infraestrutura e de provedores de IA (`PROVEDORES_INFRAESTRUTURA`, `PROVEDORES_IA`). Hoje nenhum provedor de IA está ligado em produção. | Q-243 |
| Transferência internacional | Países de destino (`PAISES_TRANSFERENCIA`) e o mecanismo do art. 33 para cada operador. Se nenhum operador estiver fora do Brasil, a seção 6 sai. | Q-243 |
| Idade mínima | Confirmar 18 anos (`IDADE_MINIMA`) e se a declaração no cadastro basta. Avaliar se o Work Station pode ser considerado de acesso provável por adolescentes, para fins da Lei 15.211/2025 (ECA Digital). | Q-243, Q-63 |
| Consentimentos | Confirmar as três finalidades opcionais da seção 4. Marketing ainda não existe no código e precisa de interruptor próprio e ponto de verificação. | Q-243, Q-67 |
| Conta única na Orange Social | A conta do Work Station é a mesma de outros produtos da Orange Social? Se for, a Política precisa dizer quais dados circulam entre eles. | Q-243 |
| Prazos de guarda | Auditoria 5 anos, documentos de validação 2 anos, dados fiscais de EMPRESA e o destino do conteúdo de trabalho após a anonimização (seção 9). | Q-243, Q-72 |
| Segurança | A seção 8 segue a implementação em andamento do 2FA (segredo cifrado com AES-GCM, códigos de recuperação guardados só como hash) e da cifragem do CNPJ. Conferir quando entrar no `main`. | Q-243, Q-83 |
| Prazo de resposta | Prazo para responder aos pedidos de titular (seção 10). | Q-243, Q-71 |
| Traduções | Traduções de cortesia em inglês e espanhol com aviso de prevalência do pt-BR. | Q-243, Q-69 |
