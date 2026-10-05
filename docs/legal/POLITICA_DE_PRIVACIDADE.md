---
document: PRIVACIDADE
version: "0.1"
status: rascunho
language: pt-BR
effectiveFrom: null
changelog:
  - version: "0.1"
    date: 2026-10-05
    summary: Primeiro rascunho da Política de Privacidade do Work Station, escrito para órgão público (controlador SECID-PR, LGPD art. 23) a partir da estrutura da Política do FAI; finalidades, bases legais e prazos são propostas da engenharia e aguardam o encarregado e o jurídico (Q-60, Q-61, Q-68).
---

# Política de Privacidade do Work Station

**Versão 0.1 — rascunho, ainda sem vigência**

Esta Política explica quais dados pessoais o **Work Station** trata, para quê, com que base legal, com quem
compartilha, por quanto tempo guarda e como você exerce seus direitos. Ela segue a **Lei Geral de Proteção de Dados
(LGPD, Lei 13.709/2018)**, em especial as regras para o poder público (art. 23 a 30), a **Lei de Acesso à Informação
(Lei 12.527/2011)** e o **Marco Civil da Internet (Lei 12.965/2014)**.

O **controlador** é a **Secretaria de Estado das Cidades do Paraná (SECID-PR)**, órgão da administração direta do
Estado do Paraná. O **encarregado** pelo tratamento de dados pessoais (LGPD, art. 41) é **{{WS_LEGAL_DPO_NAME}}**,
e o canal para falar com ele é **{{WS_LEGAL_DPO_CONTACT}}**. Esses dois valores vêm da configuração do sistema e são
atualizados sem nova versão desta Política.

---

## Resumo em um minuto

- **Tratamos o necessário para a plataforma de trabalho funcionar:** sua identificação, seu vínculo, o que você produz
  no trabalho e como usa o sistema.
- **A base legal principal não é consentimento.** Por sermos órgão público, a maior parte do tratamento se apoia na
  execução de políticas públicas e no cumprimento de obrigação legal (art. 7º, II e III; art. 23).
- **O que é opcional depende de um interruptor seu**, desligado por padrão e revogável a qualquer momento, no mesmo
  lugar e com o mesmo esforço.
- **Provedores de IA só recebem dados com mascaramento**, nunca conteúdo RESTRITO ou SIGILOSO.
- **Integrações com Google Workspace e Microsoft 365** só acontecem quando você as conecta, e só para os documentos que
  você vincula.
- **Documentos públicos ficam.** Atas, decisões validadas, rastro de decisão e chancelas seguem a guarda documental do
  Estado mesmo depois do encerramento da conta.
- **Você pode baixar seus dados** em formato legível por máquina e **encerrar sua conta**, com carência de 30 dias e
  anonimização ao fim.
- **Usamos só cookies essenciais.** Nenhum cookie de publicidade ou de rastreamento de terceiros.

---

## 1. Quais dados tratamos

A lista completa, por categoria, com finalidade, base legal, prazo e compartilhamento, aparece na aba **Seus dados →
"Quais dados temos"** e sai do mesmo registro que alimenta a exportação (seção 9). Em resumo:

**1.1. Dados que você informa**

- **Cadastro:** nome completo, nome de exibição, nome de usuário, e-mail, senha (guardada apenas como hash Argon2id),
  cargo, telefone (opcional), tipo de perfil, foto (opcional) e bio (opcional).
- **Perfil de órgão (EMPRESA):** razão social, CNPJ, site oficial e documento de representação (ato de nomeação ou
  portaria), usados só na validação do perfil.
- **Perfil de chefia (CHEFE DE DEPARTAMENTO):** órgão, departamento e link oficial do ato de nomeação no Diário Oficial.
- **Conteúdo do trabalho:** tarefas, anexos, projetos, planos, mensagens das sessões DECIA, comentários, reações,
  propostas de chancela e os textos que você escreve para a IA.
- **Preferências:** tema, idioma, fuso, densidade, notificações, skins e limites de trabalho.

**1.2. Dados gerados pelo uso**

- lotações e nomeações (departamento, chefia, curadoria), histórico de estados das tarefas e projetos;
- decisões de que você participou, rastro de decisão, chancelas recebidas e emitidas, DECIA Points, reconhecimentos;
- indicadores calculados a partir do seu trabalho: índice de eficiência (HSE), Hype do Perfil, perfil deliberativo e
  posição em rankings, com as regras publicadas;
- inferências de IA sobre o que você escreveu (classificação de mensagens, resumos, insights), com o registro de qual
  modelo as gerou;
- **registros de acesso:** endereço IP, data e hora, navegador e identificador de sessão, exigidos pelo Marco Civil;
- registros de auditoria das ações que você faz e das que outras pessoas fazem sobre os seus dados.

**1.3. Dados sensíveis.** O Work Station não pede dados sensíveis (art. 5º, II). Se um documento anexado ao trabalho
contiver dado sensível de terceiros, ele deve ser classificado como RESTRITO ou SIGILOSO e nunca é enviado a provedor
externo de IA.

**1.4. Data de nascimento.** Só será coletada se o uso por menores de dezoito anos for autorizado (seção "Pendências
para o jurídico"); nesse caso servirá apenas à verificação da idade e à aplicação do art. 14.

## 2. Para que usamos e com qual base legal

| Finalidade | Exemplos | Base legal (LGPD) |
|---|---|---|
| Executar as atribuições da SECID e dos órgãos convidados por meio da plataforma | cadastro e autenticação, acervo de tarefas, projetos, planos anuais, sessões DECIA, chancelas, rastro de decisão | execução de políticas públicas previstas em lei e regulamento (art. 7º, III; art. 23) |
| Cumprir obrigações legais e regulatórias | guarda de atos administrativos e atas, Lei de Acesso à Informação, registros de acesso do Marco Civil, auditoria | cumprimento de obrigação legal ou regulatória (art. 7º, II) |
| Validar perfis de órgão e de chefia | conferência de CNPJ, ato de nomeação, site oficial e documento de representação | execução de políticas públicas e prevenção à fraude (art. 7º, III; art. 23) |
| Segurança da plataforma e prevenção a fraude | bloqueio por tentativas, limites por IP, detecção de contas múltiplas, auditoria | execução de políticas públicas e garantia da segurança (art. 6º, VII; art. 7º, III; art. 23) |
| Indicadores de gestão e reconhecimento | HSE, Hype do Perfil, rankings por departamento, DECIA Points, destaques | execução de políticas públicas (art. 7º, III; art. 23), com regras determinísticas publicadas e direito de revisão (art. 20) |
| Apoio de IA ao trabalho | classificação de mensagens, resumos, sugestões de redação e de chancela, extração de dados de desenhos técnicos | execução de políticas públicas (art. 7º, III; art. 23), com mascaramento antes de qualquer envio externo |
| Comunicações do serviço | códigos de verificação, avisos de segurança, notificações de prazo e de decisão | execução de políticas públicas (art. 7º, III) |
| Recursos opcionais | ver a seção 3 | consentimento (art. 7º, I), específico por finalidade |

A SECID não usa legítimo interesse (art. 7º, IX) como base para o tratamento nesta plataforma; essa hipótese não se
aplica ao poder público no exercício de suas atribuições.

## 3. Seus consentimentos

Só o que é **opcional** depende de consentimento. Cada finalidade tem um **interruptor próprio** em **Configurações →
Privacidade**, começa **desligado**, pode ser revogado no mesmo lugar e com o mesmo esforço (art. 8º, § 5º) e nunca é
pedido junto com o aceite dos Termos (art. 8º, § 4º). A revogação vale dali em diante e fica registrada com data e
hora, junto com a concessão.

| Interruptor | O que permite | Onde é conferido |
|---|---|---|
| **Resumo profissional por IA** (`RESUMO_PROFISSIONAL_IA`) | gerar, com IA, um resumo narrativo do seu trabalho e dos seus indicadores para o seu perfil e para a sua chefia | antes de cada geração do resumo |
| **Gravação de reuniões como padrão** (`GRAVACAO_REUNIOES_PADRAO`) | marcar por padrão a sua anuência à gravação nas reuniões de que participa; o consentimento específico de cada reunião continua sendo pedido na própria reunião | ao abrir a gravação de cada reunião |

Finalidades que o sistema não usa não aparecem na tela. Novas finalidades só entram com nova versão desta Política e
seu próprio interruptor.

## 4. Com quem compartilhamos

**4.1. Provedores de IA (operadores).** Anthropic (Claude) e Google (Gemini), conforme o recurso. Antes de qualquer
envio, nomes, e-mails, telefones e identificadores são **mascarados**, e conteúdo classificado como RESTRITO ou
SIGILOSO **nunca** sai da plataforma. Exigimos contratualmente que esses provedores não usem os dados para treinar
seus modelos e que os descartem após a resposta. Há um teto de gasto e um registro de cada inferência.

**4.2. Integrações com Google Workspace e Microsoft 365.** Só quando você conecta a sua conta institucional e vincula
um documento, pasta ou calendário a uma tarefa. Os provedores recebem o necessário para abrir, sincronizar e versionar
aquele item; o Work Station recebe metadados e versões do item vinculado.

**4.3. e-Protocolo e sistemas do Estado.** Quando uma tarefa é protocolada ou um documento é publicado, os dados
necessários seguem para o sistema de destino, por obrigação legal.

**4.4. Hospedagem e infraestrutura (operadores).** Os servidores, bancos de dados e armazenamento de arquivos ficam
com os fornecedores de infraestrutura contratados pela SECID, sob contrato, só para operar o serviço. A lista atual de
fornecedores está disponível mediante pedido ao encarregado.

**4.5. Outras pessoas da plataforma.** O que você produz no trabalho é visível conforme a classificação de acesso e a
visibilidade de cada item (privada, departamento, órgão ou pública). Seu nome, cargo, departamento e foto aparecem no
seu perfil e nos documentos de que você participa. Indicadores pessoais (HSE, Hype) têm visibilidade controlada por
você; o padrão é "só eu".

**4.6. Autoridades e acesso à informação.** Quando houver obrigação legal, ordem judicial ou pedido fundado na Lei de
Acesso à Informação, respeitadas as restrições de sigilo.

**4.7. Transferência internacional.** Os provedores de IA e parte da infraestrutura podem processar dados fora do
Brasil. Essas transferências se apoiam no art. 33 da LGPD, com cláusulas contratuais e as demais salvaguardas
reconhecidas pela ANPD, sempre com os dados mascarados descritos em 4.1.

A SECID **não vende** dados pessoais e não os usa para publicidade.

## 5. Por quanto tempo guardamos

| Dado | Prazo |
|---|---|
| Conta, perfil, preferências e conteúdo pessoal | enquanto a conta existir; depois do pedido de encerramento, 30 dias de carência e então anonimização |
| Documentos públicos de que você participou (atas, decisões validadas, rastro de decisão, chancelas, lançamentos de pontos) | prazo da tabela de temporalidade documental do Estado do Paraná; o seu nome é substituído por identificador quando a guarda não exigir a identificação |
| Registros de acesso (IP, data e hora) | 6 meses, conforme o art. 15 do Marco Civil, ou mais por ordem judicial |
| Registros de auditoria sobre dados pessoais | 5 anos a partir do fato, para responsabilização (art. 6º, X) |
| Registro dos aceites e dos consentimentos | pelo tempo necessário para comprovar que foram dados, inclusive após a anonimização (art. 8º, § 2º) |
| Documentos de validação de perfil (ato de nomeação, documento de representação) | até a decisão da validação e por 2 anos para eventual contestação; depois são apagados |
| Arquivo de exportação dos seus dados | 7 dias; depois o arquivo é apagado e o pedido fica como expirado |
| Envios abandonados no cadastro | 24 horas |
| Notificações | cerca de 90 dias |
| Cópias de segurança | ciclo normal de rotação dos backups, em área restrita |

Dados anonimizados podem ser mantidos para estatística e indicadores agregados (art. 12).

## 6. Como protegemos seus dados

- conexões cifradas (TLS) do navegador à API e da API aos bancos de dados;
- e-mail, telefone, CNPJ e data de nascimento (se coletada) cifrados em repouso; senhas com hash Argon2id;
- documentos de validação, exportações, anexos RESTRITOS e SIGILOSOS e áudio de reuniões em **área restrita**, servida
  só pela API e só a quem tem direito, com cada abertura registrada na auditoria;
- imagens recodificadas na entrada, com remoção de metadados EXIF e de localização;
- limites por tentativa, por IP e por conta, bloqueio progressivo e reconferência de senha em operações sensíveis;
- segregação de ambientes, acesso administrativo mínimo e registro de auditoria.

Se houver incidente de segurança que possa acarretar risco ou dano relevante, comunicaremos a ANPD e os titulares
afetados (art. 48).

## 7. Seus direitos

Pela LGPD (art. 18) você pode, pela aba **Seus dados** ou pelo canal do encarregado:

- **confirmar** o tratamento e **acessar** seus dados ("Quais dados temos");
- **corrigir** dados incompletos ou desatualizados (aba Conta; o que não for editável vira pedido ao encarregado);
- **exportar** seus dados em formato legível por máquina (portabilidade);
- pedir **anonimização, bloqueio ou eliminação** de dados desnecessários ou tratados em desconformidade;
- saber **com quem** compartilhamos seus dados;
- **revogar consentimentos** nos interruptores de Privacidade;
- **opor-se** a um tratamento que considere irregular;
- pedir a **revisão de decisões automatizadas** que afetem seus interesses (art. 20): classificação de mensagens por IA,
  índice de eficiência, Hype do Perfil e rankings;
- **encerrar a conta** (seção 8);
- apresentar reclamação à Autoridade Nacional de Proteção de Dados.

Pedidos de revisão, oposição e informação de compartilhamento abrem uma solicitação registrada, com prazo e resposta
pelo encarregado. Podemos pedir confirmação de identidade para proteger você.

## 8. Encerramento da conta

O pedido exige a senha atual e coloca a conta em carência de **30 dias**, durante os quais o perfil fica oculto, a conta
só pode ler e você pode desistir. Antes de confirmar, a tela mostra o que será anonimizado e o que ficará guardado, e
por quê. Terminado o prazo, um processo automático:

- substitui nome, nome de usuário, e-mail, telefone, foto, bio e cargo por valores anonimizados e invalida a senha;
- apaga arquivos pessoais (avatar, documentos de validação, exportações) e as projeções de busca e de linha do tempo;
- encerra todas as sessões;
- mantém, por obrigação legal, os documentos públicos de que você participou e o registro dos aceites e consentimentos;
- registra a conclusão na auditoria.

Como órgão público, a SECID não pode eliminar documentos sujeitos a guarda legal (art. 16, I e III). O que fica e por
quanto tempo está na seção 5.

## 9. Transparência e registro de dados pessoais

Todas as categorias de dados pessoais desta plataforma estão num **registro único** mantido no código do sistema. Ele
alimenta a página "Quais dados temos", o conteúdo da exportação e o plano de anonimização, e é conferido
automaticamente a cada versão: uma entidade nova com dado pessoal fora do registro impede a publicação da versão.

## 10. Cookies e armazenamento local

Usamos apenas cookies e armazenamento local **essenciais**: a sessão de acesso (cookie HttpOnly), a proteção contra
requisições forjadas, o idioma e o tema. Não usamos cookies de publicidade, de medição de audiência de terceiros ou de
rastreamento entre sites. O token de acesso fica apenas na memória do navegador.

## 11. Mudanças nesta Política

Cada versão tem número, data de vigência e resumo das mudanças, visíveis em /privacidade. Mudanças relevantes, como
nova finalidade, novo compartilhamento ou novo prazo de guarda, exigem novo aceite antes de continuar usando a
plataforma, e nova finalidade opcional exige novo consentimento próprio. Versões anteriores ficam no histórico.

## 12. Contato

- Controlador: Secretaria de Estado das Cidades do Paraná (SECID-PR).
- Encarregado pelo tratamento de dados pessoais: **{{WS_LEGAL_DPO_NAME}}**.
- Canal do encarregado: **{{WS_LEGAL_DPO_CONTACT}}**.
- Autoridade Nacional de Proteção de Dados: https://www.gov.br/anpd

---

## Pendências para o jurídico

Esta seção não é publicada. Cada item cita a dúvida em `docs/DECISOES.md`.

| Item | Pendência | Q |
|---|---|---|
| Encarregado | Nome e canal oficial que preencherão `WS_LEGAL_DPO_NAME` e `WS_LEGAL_DPO_CONTACT`. | Q-60 |
| Texto e bases legais | Revisão integral; confirmar o enquadramento no art. 7º, II e III, e art. 23 (em vez de contrato e legítimo interesse, usados pelo FAI) e a identificação completa do controlador na seção 12. | Q-61 |
| Idade | Menores (aprendizes, estagiários) podem usar? Define a seção 1.4 e a coleta de data de nascimento. | Q-63 |
| Consentimentos | Confirmar as duas finalidades opcionais da seção 3 e se existe alguma outra. | Q-67 |
| Guarda e eliminação | Tabela de temporalidade aplicável, o que é documento público no Work Station e os prazos propostos na seção 5 (auditoria 5 anos, documentos de validação 2 anos). | Q-68 |
| Traduções | Publicar traduções de cortesia em inglês e espanhol com aviso de prevalência do pt-BR. | Q-69 |
| Prazos de resposta | Prazo das solicitações de revisão, oposição e informação (seção 7). | Q-71 |
| Documentos de validação | Retenção dos documentos após a aprovação e quem pode reabrí-los. | Q-72 |
| Fornecedores | Lista nominal de operadores de infraestrutura e provedores de IA a publicar na seção 4, conforme a hospedagem escolhida. | Q-51, Q-73 |
