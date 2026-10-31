# Dados de perfil por tipo — Work Station

**Status:** pesquisa de produto · 2026-10-17 · só documentação; nada aqui altera o modelo.
**Produto:** Work Station (Velion, marca Orange Social) — rede profissional de trabalho com tarefas, projetos e
decisões em grupo (DECIA).
**Gerado em parte por:** [`scripts/pesquisa/perfis/campos.py`](../../scripts/pesquisa/perfis/campos.py). As seções 9 a
13 ficam entre os marcadores `gerado:inicio`/`gerado:fim` e são reescritas pelo script; o resto é texto manual. Dados
estruturados em [`DADOS_DE_PERFIL_POR_TIPO.json`](DADOS_DE_PERFIL_POR_TIPO.json).

## 1. Introdução

Este documento diz **quais dados cada tipo de perfil deve ter** — no cadastro, no perfil público, na conta privada, na
segurança, na privacidade e nas preferências —, **quais não devem ser coletados** e **o que falta no modelo atual**.

Tipos considerados (fonte: `ProfileType.java`, `Role.java`, `TAXONOMIA.md` §1, `ABAS_POR_PERFIL.md` §1.1):

| Tipo | Natureza | No modelo |
|---|---|---|
| **EMPREGADO** | pessoa que trabalha numa empresa ou órgão | `ProfileType.EMPREGADO`; nasce `PENDING_EMAIL_VERIFICATION` → `ACTIVE` |
| **EMPRESA** | organização pública ou privada, operada por uma pessoa responsável | `ProfileType.EMPRESA` + `Company` (`ownerUserId`); nasce `PENDING_VALIDATION` |
| **CHEFE_DEPARTAMENTO** | pessoa com cargo de chefia num departamento | `ProfileType.CHEFE_DEPARTAMENTO` + `Department.headUserId`; nasce `PENDING_VALIDATION` |
| **CURADOR** | papel contextual de um EMPREGADO, nomeado por um chefe | `CuratorAppointment` (escopo FILA_REVISAO · PREMIACAO · AMBOS) |
| **ADMIN** | papel global sobre uma conta-base | `Role.ADMIN` (não é tipo de perfil) |
| **VISITANTE** | quem navega sem conta | sem registro; vê só o grupo Descobrir |

## 2. Metodologia

1. **Leitura do modelo atual.** `User.java`, `UserView.java`, `AccountService` (`ProfileUpdate`, `SensitiveUpdate`),
   `UserPreferences.java`, `lib/preferences/types.ts` e as entidades vizinhas (`Company`, `Department`,
   `EmpresaProfileExtension`, `ChefeProfileExtension`, `CuratorAppointment`, `ApprovalRequest`, `UserConsent`,
   `PolicyAcceptance`, `DataExportRequest`, `Follow`, `RefreshTokenEntity`). O script relê esses arquivos por
   expressão regular a cada execução, então a coluna "Modelo atual" reflete a **árvore de trabalho** no momento em que
   ele roda (inclusive mudanças ainda não commitadas).
2. **Pesquisa de referências** (acesso em 2026-10-17): LinkedIn (perfil e Company Page), XING, Behance, Dribbble,
   GitHub (perfil e organização), Glassdoor, Indeed, Viva Engage, Slack, Teams, gov.br, Lattes, ORCID, Instagram, X e
   Facebook. Para cada uma: campos de cadastro obrigatórios, perfil público, privacidade/visibilidade, segurança e
   verificação (seção 9). Priorizei páginas oficiais de ajuda; quando só havia guia de terceiros, a fonte está marcada
   como "secundária", e o que não foi confirmado está marcado como "não conferido".
3. **Classificação LGPD** de cada campo (Lei 13.709/2018): pessoal comum (art. 5º, I), pessoal com proteção reforçada
   (art. 46), **sensível** (art. 5º, II — não coletar), **proibido sem base legal** (sem finalidade: art. 6º, I e III) e
   não pessoal (dado de pessoa jurídica).
4. **Exigência por tipo** (obrigatório · opcional · não se aplica), **visibilidade padrão** (público · empresa · só eu ·
   interno) e, quando o campo falta, **onde entraria** e **prioridade**.
5. **Geração e verificação.** `python3 scripts/pesquisa/perfis/campos.py` regrava o JSON e a parte gerada deste
   arquivo; `--check` falha se algum dos dois estiver desatualizado em relação ao catálogo ou ao modelo.

## 3. Regras LGPD aplicadas a todos os perfis

- **Finalidade e necessidade (art. 6º, I e III).** Só entra campo que alimenta uma função do produto (descoberta,
  colaboração, validação, segurança). Campo "porque as outras redes têm" não basta: o Lattes exige cor/raça, sexo e
  nome da mãe; o Facebook pede estado civil; aqui nada disso tem finalidade.
- **Bases legais (art. 7º).** Execução do contrato/Termos de Uso (V) para cadastro, perfil e preferências; obrigação
  legal (II) para registros de acesso (Marco Civil, art. 15, 6 meses); legítimo interesse (IX) para segurança e
  prevenção a fraude (sessões, histórico de login, validação de EMPRESA/CHEFE); consentimento (I) só para finalidades
  opcionais (`UserConsent`, D-17). Quando a EMPRESA é órgão público, o tratamento do vínculo funcional segue também o
  art. 23 (guia da ANPD para o Poder Público).
- **Dados sensíveis (art. 5º, II e art. 11).** Origem racial ou étnica, religião, opinião política, filiação sindical
  ou a organização religiosa, filosófica ou política, saúde, vida sexual, dado genético ou biométrico: **não coletar**,
  nem por inferência (foto não vira reconhecimento facial; acessibilidade vira preferência, não diagnóstico).
- **Crianças e adolescentes (art. 14).** O produto é profissional. Sem decisão da Q-63, não coletar data de
  nascimento: basta a declaração "tenho 18 anos ou mais". Se aprendizes ou estagiários menores forem admitidos, a data
  passa a ser obrigatória no servidor, cifrada, com tratamento no melhor interesse do adolescente.
- **Direitos do titular (art. 18 e 20).** Confirmação e acesso ("Quais dados temos"), correção (aba Conta),
  anonimização/eliminação (`DELETION_SCHEDULED` → `ANONYMIZED`), portabilidade (`DataExportRequest`), informação sobre
  compartilhamento e revogação de consentimento (`DataSubjectRequest`, `UserConsent`), revisão de decisão automatizada
  (ranking, Hype). Os campos de privacidade da seção 10 sustentam esses direitos.
- **CPF.** **Não é necessário** para EMPREGADO, CHEFE, CURADOR, ADMIN nem para o responsável da EMPRESA: a identidade
  profissional é provada pelo vínculo (e-mail institucional, ato de nomeação, confirmação do chefe), não pelo CPF.
  Só aparece em dois casos: (a) **login gov.br**, cujo identificador do titular é o CPF — guardar apenas como
  `oidcSubject` cifrado, nunca exibir nem usar como chave de negócio; (b) uma integração futura com folha/RH ou
  assinatura com validade jurídica, com base legal (art. 7º, II/V ou art. 23) e finalidade documentadas antes.
- **CNPJ.** **Necessário para validar a EMPRESA** (RF28): dígitos verificadores, situação cadastral e coerência com a
  razão social e o site oficial. É dado de pessoa jurídica (fora do art. 5º, I), mas o CNPJ de empresário individual
  ou MEI identifica uma pessoa — por isso fica cifrado (`Company.cnpj`) e só é exibido se a organização escolher. Não
  pedir CNPJ a EMPREGADO, CHEFE ou CURADOR: o vínculo deles é com uma `Company` já validada.
- **Visibilidade conservadora.** Padrão "empresa" ou "só eu" para tudo que não é apresentação profissional; nada
  passa a público por mudança de padrão (REDE_PROFISSIONAL_VISIBILIDADE).

## 4. EMPREGADO

Pessoa que trabalha numa empresa ou órgão. É o perfil-base também de CURADOR e, em geral, de ADMIN.

**Cadastro (mínimo).** Nome completo (civil ou social) · e-mail (confirmado por código) · senha *ou* login
institucional (OIDC) · nome de usuário · tipo de perfil · aceite dos Termos e da Política (versões registradas,
separado de qualquer consentimento). Recomendados, sem bloquear o cadastro: cargo e departamento pretendido (este não
lota ninguém; quem lota é o chefe).

**Perfil público** (o que terceiros veem, filtrado pela descoberta e pela visibilidade por campo): nome ou nome de
exibição · @ · foto · capa · headline · cargo · empresa e departamento (vindos da lotação, nunca autodeclarados) ·
bio · competências · localização (só cidade/UF, padrão "empresa") · links profissionais e site · destaques (produções
já publicadas) · conquistas e indicadores escolhidos · selo e tipo de verificação · "membro desde".
Opcionais a acrescentar, como nas referências: pronomes e pronúncia do nome (Slack, Teams, GitHub), experiência e
formação (LinkedIn, Lattes), idiomas e certificações, status e local de trabalho (GitHub, Teams), "aberto a
colaborar/mentorar" (equivalente interno do *Open to* do LinkedIn e do *Hire me* do Behance — nunca "procurando
emprego").

**Perfil privado / conta.** E-mail de acesso e telefone (cifrados, alteração com reconferência de senha) · e-mail de
recuperação · fuso horário · versões aceitas dos Termos e da Política · consentimentos opcionais · pedidos de
exportação e de exclusão · área pessoal (salvos, Tarefa do Dia, DECIA Points, Hype, perfil deliberativo completo),
que nunca aparece a terceiros.

**Segurança.** Senha com hash Argon2id · **2FA TOTP** opcional e recomendado, com segredo cifrado e proteção contra
reuso do mesmo passo · **códigos de recuperação** (uso único, guardados só como hash; gerar um novo conjunto invalida o
anterior, como no GitHub) · **sessões ativas** com dispositivo, IP aproximado, último uso e revogação individual (base:
`RefreshToken`) · **histórico de login** (sucessos e falhas, visível ao titular, como o log de segurança do GitHub) ·
aviso de login em dispositivo novo · reconferência de senha para dados sensíveis e exclusão (já existe).

**Privacidade.** Visibilidade por campo (público · empresa · só eu, à maneira do ORCID) · quem encontra o perfil na
busca e **ocultar do buscador** interno · indexação por buscadores externos (padrão desligado) · **quem pode me seguir**
(todos · mesma empresa · com aprovação) · **quem pode me mencionar** · **quem pode me atribuir tarefas e convidar para
DECIA** (meu departamento · minha empresa · quem eu sigo — a atribuição formal do chefe segue o fluxo institucional) ·
quem pode enviar mensagem · aparecer em sugestões de pessoas (RF50) · ser encontrado por e-mail/telefone · mostrar
quando estou online · bloquear e silenciar · revisar marcações · visibilidade do Hype (padrão só eu) · sair dos
rankings · público padrão das novas produções (padrão privado).

**Preferências.** Tema, idioma, densidade, escala da fonte, reduzir movimento, pele da mesa, arte de fundo, fuso,
notificações por canal e evento, horário de silêncio, horário da Tarefa do Dia, limite WIP, modo e autonomia da IA,
layout do painel.

**Não coletar.** CPF (salvo o caso gov.br acima) · número ou imagem de documento de identidade · data de nascimento
(salvo Q-63) · sexo/gênero · cor/raça · religião, opinião política, filiação sindical · saúde ou deficiência · vida
sexual · biometria · nome da mãe · estado civil · endereço residencial · matrícula funcional (sem integração com base
legal) · pretensão salarial e sinal "procurando emprego" (salvo no Guia de Carreira, RF75, com finalidade, consentimento e área privada — D-147) · registro de quem visitou o perfil.

## 5. EMPRESA

Conta institucional de uma organização pública ou privada, operada por uma pessoa responsável. A página pública é
`/companies/[slug]`; o perfil pessoal do responsável não se confunde com ela.

**Cadastro (mínimo).** Do responsável: nome, e-mail **do domínio institucional** (domínio gratuito não prova
representação), senha, cargo. Da organização: razão social · **CNPJ** · natureza (órgão público, autarquia, estatal,
empresa privada, terceiro setor) · site oficial `https://` · documento de representação (ato de nomeação, procuração
ou contrato social, em `restricted/`) · aceite dos Termos e da Política. Nasce `PENDING_VALIDATION` e só emite
chancelas depois da aprovação do ADMIN (RF28).

**Perfil público (página da organização).** Nome de exibição (fantasia ou sigla) · slug · logotipo · brasão (órgão
público) · capa · sobre · slogan · setor · porte em faixa · sede (cidade/UF) · ano de fundação · site · e-mail e
telefone institucionais de contato · redes da organização · departamentos · selo de verificação com o método
(CNPJ, domínio verificado por DNS como no GitHub) · cor de destaque. Referências: LinkedIn Page (nome, URL, setor,
porte, tipo, slogan), Glassdoor (sede, fundação, setor, tipo, locais, líder), GitHub (domínio verificado), Facebook
(categoria, contato, localização).

**Perfil privado / conta.** Pessoa responsável · documento de representação e histórico da validação · políticas da
organização (DECIA Points, Hype, ranking, gravação, mensagens) · **administradores adicionais** (hoje só há
`ownerUserId`; recomendar pelo menos dois para não depender de uma pessoa).

**Segurança.** **2FA obrigatório** para quem administra a conta (emite chancelas e decide políticas que afetam
pessoas) · códigos de recuperação · sessões e histórico de login de cada administrador · trilha das ações
administrativas · transferência de titularidade com confirmação.

**Privacidade.** A organização é sempre descobrível; os controles servem para menções, mensagens e comentários na
página. A aba Pessoas mostra cada integrante **conforme a visibilidade escolhida por ele**, nunca uma lista nominal
completa. Publicação oficial exige papel e aprovação (REDE_PROFISSIONAL_VISIBILIDADE).

**Preferências.** As do responsável (tema, idioma, notificações). O fuso e a sede da organização alimentam o calendário
de dias úteis dos prazos.

**Não coletar.** CPF ou documento pessoal do responsável além do documento de representação · dados de sócios ·
receita/faturamento e número exato de empregados (o Glassdoor exibe; aqui não há finalidade) · listas nominais de
empregados importadas sem base legal · dados sensíveis de qualquer pessoa.

## 6. CHEFE_DEPARTAMENTO

Pessoa com cargo de chefia. Tem perfil pessoal (`/u/[username]`, como o EMPREGADO) e administra a página do
departamento (`/departments/[slug]`).

**Cadastro (mínimo).** Tudo do EMPREGADO, com e-mail do domínio institucional, mais: órgão/empresa já cadastrada ·
departamento (existente ou nome) · **link do ato de nomeação no Diário Oficial** · confirmação pelo chefe atual ou pela
EMPRESA dona. Nasce `PENDING_VALIDATION`.

**Perfil público.** O do EMPREGADO, com cargo exibido como "Chefe de {departamento}", sigla/monograma do departamento,
período da chefia e selo "chefia verificada" (o link do ato fica privado).

**Perfil privado / conta.** Ato de nomeação e histórico da validação · substituto eventual ou delegação (como os
delegados do ORCID), para ausências e transição (RF36) · equipe em modo gestão (agregada, nunca as sub-abas privadas
dos subordinados).

**Segurança.** **2FA obrigatório** (emite chancelas, vê Insights da Equipe) · demais itens do EMPREGADO.

**Privacidade.** Os mesmos controles do EMPREGADO. No perfil de um subordinado, o chefe vê o mesmo que qualquer colega
da empresa; atribuir tarefa formal não depende da opção "quem pode me atribuir" do subordinado, mas fica registrado.

**Preferências.** As do EMPREGADO.

**Não coletar.** Os itens do EMPREGADO, mais: avaliações de desempenho nominais fora do fluxo formal e dados de saúde
de subordinados (atestados, afastamentos), que pertencem ao RH, não à rede.

## 7. ADMIN e CURADOR

São **papéis** sobre uma conta-base (em geral EMPREGADO), não tipos de perfil. Herdam todos os dados do perfil-base e
acrescentam só o que o papel exige.

**CURADOR — dados próprios.** Departamento e escopo da curadoria (FILA_REVISAO · PREMIACAO · AMBOS), quem nomeou,
quando e a revogação (`CuratorAppointment`). Público: etiqueta "Curador de {sigla}". Segurança: 2FA recomendado.

**ADMIN — dados próprios.** Papel `ADMIN` (nunca exibido publicamente) · **2FA obrigatório** · motivo registrado ao
abrir documento ou dado de terceiro (registro das operações, art. 37) · sem atalho para as sub-abas pessoais de
desempenho de outra pessoa (ABAS_POR_PERFIL §3). O ADMIN não decide o próprio pedido de validação.

**Cadastro.** Nenhum: o papel ADMIN vem do bootstrap ou de outro ADMIN; o de CURADOR, da nomeação por um chefe.
**Privacidade e preferências.** As do perfil-base.
**Não coletar.** Os itens do EMPREGADO; o papel não autoriza coletar mais dados da própria pessoa.

## 8. VISITANTE

Quem navega sem conta. Vê só o grupo Descobrir e os perfis/itens públicos.

**Dados tratados.** Preferências locais (tema, idioma, densidade, escala da fonte, reduzir movimento) guardadas só no
navegador · consentimento de cookies, se houver cookies ou métricas não essenciais · registros de acesso à aplicação
(IP, data e hora), por obrigação do Marco Civil (art. 15), com acesso restrito.

**Não coletar.** Qualquer identificação pessoal, impressão digital do navegador para rastreamento, ou perfil
comportamental. Perfil público de terceiros nunca revela, por contadores ou miniaturas, a existência de itens privados.

<!-- gerado:inicio -->

## 9. Referências pesquisadas

Resumo do que cada site pede e mostra (acesso em 2026-10-17). "Não conferido" marca o que não foi confirmado em fonte acessada nesta rodada.

| Referência | Cadastro (obrigatório) | Perfil público | Privacidade / visibilidade | Segurança | Verificação / selo |
|---|---|---|---|---|---|
| **LinkedIn (perfil pessoal)** | e-mail ou telefone, senha, nome e sobrenome (não conferido nesta rodada) | Intro: nome, foto, foto de fundo, headline, cargo atual (vem de Experiência), formação, localização, setor (um só), informações de contato e 'Open to' (trabalho, contratação, serviços) | opções de visualização de perfil (nome+headline, características privadas, modo privado); perfil público editável e indexação por buscadores; quem pode seguir (todos ou conexões); compartilhar edições do perfil; permitir menções, marcações e colaborações (desligar não apaga as existentes) | verificação em duas etapas e sessões (não conferido nesta rodada) | gratuita: identidade (documento oficial via CLEAR, Persona ou DigiLocker), local de trabalho (e-mail corporativo, Microsoft Entra Verified ID ou licença LinkedIn Learning) e instituição de ensino |
| **LinkedIn (Company Page)** | nome, URL da página, setor, porte (faixa), tipo de organização e declaração de representante autorizado (caixa de seleção); site, logo e slogan (≤120 caracteres) opcionais | nome, logo, slogan, sobre, site, setor, porte, tipo | — | administração da página por pessoas com vínculo e e-mail verificado (fonte secundária) | declaração de representante; vínculo do empregado verificável por e-mail corporativo |
| **XING** | não conferido nesta rodada | carreira (cargos com descrição das atribuições), formação, 'desejos de emprego'; muitos dados ficam visíveis inclusive a não membros | desejos de emprego visíveis só a recrutadores ou a todos os membros; restrições no menu Privacidade | não conferido | não conferido |
| **Behance** | conta Adobe (não conferido) | dados do perfil da comunidade Adobe: ocupação, site, empregador, localização; projetos | interruptor 'mostrar todas as informações no perfil da comunidade' | herdada da conta Adobe (não conferido) | —; disponibilidade 'Hire me' (tempo integral, freelance) leva o perfil à página de contratação |
| **Dribbble** | não conferido | nome, localização, bio, links sociais e site; botão 'hire me' (Pro) | interruptor de disponibilidade (freelance ou tempo integral) | não conferido | —; guia de 2019 cita salário mínimo e valor por hora (pode estar desatualizado) |
| **GitHub (perfil pessoal)** | nome de usuário, e-mail e senha (não conferido); o 'nome do perfil' é obrigatório e não precisa ser o civil | foto, nome, bio (≤160), pronomes (só para logados), localização, hora local opcional com fuso, até 4 redes sociais, ORCID iD, status (mensagem, 'ocupado', expiração) | perfil privado (oculta conquistas, atividade, gráfico de contribuições, contadores e botão seguir; README, bio e foto seguem públicos; não vale para atividade passada); ocultar conquistas; status visível só a uma organização | 2FA com códigos de recuperação de uso único (gerar novo conjunto invalida o anterior); lista de sessões e dispositivos com revogação; log de segurança que não apaga eventos | e-mails verificados (não há selo pessoal) |
| **GitHub (organização)** | não conferido | nome, e-mail e site exibidos no perfil | — | proprietários da organização (não conferido) | domínio verificado por registro DNS TXT dá o selo 'Verified'; site e e-mail exibidos devem estar em domínios verificados |
| **Glassdoor (empresa)** | perfil de empregador reivindicado (não conferido) | site, total de empregados, cidade da sede, ano de fundação, receita anual, setor, indústria, tipo de empresa, situação, concorrentes, locais, história; logo, dados básicos, locais e líder (CEO) compartilhados em todos os perfis | — | não conferido | não conferido |
| **Indeed (candidato)** | não conferido | preferências: cargos, áreas, tipo de vaga, jornada, remuneração, deslocamento, mudança, remoto | lista 'não interessado'; empregadores não veem pretensão salarial nem 'não interessado' (varia por país); opção que decide se empregadores podem encontrar o perfil | não conferido | — |
| **Microsoft Viva Engage (ex-Yammer)** | conta do Microsoft 365 / Entra ID (provisionada pela organização) | nome, departamento e demais propriedades sincronizadas do Entra ID | quem tem conta M365 não edita o perfil no Engage; propriedades 'About Me' não sincronizadas (escolas, expertise, interesses) foram aposentadas | herdada do Entra ID | vínculo garantido pelo diretório |
| **Slack (perfil de membro)** | convite do workspace (não conferido) | nome completo, nome de exibição, gravação e pronúncia do nome, telefone, fuso, cargo; pronomes ocultos até o admin habilitar; campos personalizados pelo admin (local, data de início, redes sociais) | campos com cadeado só o admin edita; campo personalizado pode ou não aparecer na busca; sincronização SCIM com o provedor de identidade | não conferido | vínculo pelo workspace |
| **Microsoft Teams / cartão de perfil M365** | conta do Microsoft 365 / Entra ID | foto, nome, pronúncia do nome, pronomes, contato, disponibilidade, local de trabalho, organograma (gestor e subordinados), cargo, departamento, escritório | parte do cartão é controlada pela organização; o que o admin não sincroniza não aparece | herdada do Entra ID | vínculo garantido pelo diretório |
| **gov.br (conta do cidadão)** | formulário validado nas bases da Receita Federal ou do INSS (identificador CPF), ou presencial | — | — | verificação em duas etapas só a partir do nível prata | níveis bronze (cadastro validado), prata (facial na base da CNH, internet banking credenciado ou SIGEPE) e ouro (facial na base do TSE, QR Code da CIN ou certificado ICP-Brasil) — 'selos de confiabilidade' |
| **Currículo Lattes (CNPq)** | manual de 2018: foto, nomes, data e país de nascimento, cor ou raça, sexo e nome da mãe obrigatórios; CPF e nome da mãe conferidos na Receita Federal | texto de apresentação, formação, atuação profissional (só com vínculo), produção, idiomas, prêmios | identificação pessoal geralmente não divulgada ao público | não conferido | cruzamento com a Receita Federal |
| **ORCID** | nome (sobrenome opcional), e-mail principal confirmado, senha e visibilidade padrão obrigatória; e-mail de backup recomendado | nome, biografia, emprego, educação, obras (cada item com visibilidade própria); o iD é sempre público | por item: Todos, Partes confiáveis, Só eu; e-mail privado por padrão; delegados podem gerir o registro | não conferido | afirmações feitas por organizações confiáveis |
| **Instagram** | não conferido | nome, @, foto, bio; conta profissional com categoria | conta privada (só seguidores aprovados; fora do Explorar e das hashtags); status de atividade (desligar também oculta o dos outros); revisão de marcações; contas profissionais não podem ser privadas (fonte secundária) | 2FA exigido para o Meta Verified | Meta Verified: ≥18 anos, nome completo, foto com rosto, atividade mínima, documento oficial compatível e 2FA; depois de verificado, mudar nome, foto, @ ou data de nascimento exige nova verificação |
| **X (ex-Twitter)** | não conferido | bio, localização, site e foto sempre públicos; data de nascimento com visibilidade própria | ano e dia/mês do nascimento com públicos separados (Público, Seguidores, Quem você segue, Seguem-se mutuamente, Só você — padrão 'Só você' desde 2022); ser encontrado por e-mail/telefone desligável (e-mail e telefone nunca exibidos); perfil e posts públicos podem ser indexados | não conferido | não conferido |
| **Facebook (perfil e Página)** | Página: nome, categoria (até 3), bio (≤101 caracteres, opcional); depois contato, localização, horários; a Página é gerida a partir de um perfil pessoal (fontes secundárias) | perfil: dados do Intro com público por item; Página: nome, categoria, bio, site, telefone, e-mail, endereço | seletor de público (Público, Amigos, Só eu, listas) lembrado entre publicações (página de 2016) | não conferido | Meta Verified (ver Instagram) |

## 10. Tabela de campos por tipo de perfil

Legenda — **Obr** obrigatório · Opc opcional · — não se aplica (ou não coletar). Colunas: EMP = EMPREGADO, CHEFE = CHEFE_DEPARTAMENTO, CUR = CURADOR, ADM = ADMIN, VIS = VISITANTE. Visibilidade padrão: público · empresa (logados da mesma empresa) · só eu · interno (nunca exibido). Modelo atual: conferido por regex em `User.java`, `UserView.java` e entidades vizinhas; "na API" = sai no `UserView`; "editável" = está em `ProfileUpdate`/`SensitiveUpdate`.

### 10.1 Resumo por tipo de perfil

| Perfil | Obrigatórios | Opcionais | Total aplicável | Já existem | Parciais | Lacunas |
|---|---|---|---|---|---|---|
| EMPREGADO | 25 | 66 | 91 | 44 | 8 | 47 |
| EMPRESA | 35 | 40 | 75 | 45 | 5 | 30 |
| CHEFE_DEPARTAMENTO | 39 | 56 | 95 | 48 | 8 | 47 |
| CURADOR | 30 | 62 | 92 | 46 | 8 | 46 |
| ADMIN | 29 | 62 | 91 | 44 | 8 | 47 |
| VISITANTE | 1 | 6 | 7 | 5 | 1 | 2 |

Catálogo: 138 campos, dos quais 16 marcados para **não coletar**.

### 10.2 Identificação

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `nome_usuario` | Nome de usuário (@) | texto 3–80, único; imutável após verificação | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | público | GitHub, X, Instagram, Slack | existe: `User.username` (na API) |
| `nome_completo` | Nome completo (civil ou social) | texto 3–160 | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | público (EMPRESA: só eu) | LinkedIn, XING, gov.br, Currículo Lattes, ORCID, GitHub, Decreto 8.727/2016 | existe: `User.fullName` (na API, editável) |
| `nome_exibicao` | Nome de exibição | texto ≤80 | Opc | — | Opc | Opc | Opc | — | pessoal | público | Slack, GitHub, X, Instagram | existe: `User.displayName` (na API, editável) |
| `pronomes` | Pronomes | texto curto (sugestões + livre) | Opc | — | Opc | Opc | Opc | — | pessoal | empresa | GitHub, Slack, Microsoft Teams / cartão de perfil M365 | ausente |
| `pronuncia_nome` | Pronúncia do nome | texto ≤80 (áudio opcional) | Opc | — | Opc | Opc | Opc | — | pessoal | empresa | Slack, Microsoft Teams / cartão de perfil M365 | ausente |
| `foto_perfil` | Foto de perfil | imagem (URL interna, sem EXIF) | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, GitHub, Instagram, Slack, Microsoft Teams / cartão de perfil M365 | existe: `User.avatarUrl` (na API, editável) |
| `capa` | Imagem de capa | imagem | Opc | Opc | Opc | Opc | Opc | — | pessoal | público | LinkedIn | existe: `User.coverUrl` (na API, editável) |
| `tipo_perfil` | Tipo de perfil | enum EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | público | LinkedIn, LinkedIn, GitHub, GitHub, Facebook | existe: `User.profileType` (na API) |
| `membro_desde` | Membro desde | data (sistema) | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | público | Documentos do Work Station | existe: `User.createdAt` (na API) |
| `localizacao` | Localização (cidade/UF, país) | texto ou código IBGE | Opc | — | Opc | Opc | Opc | — | pessoal | empresa | LinkedIn, GitHub, Dribbble, X | ausente |
| `selo_verificado` | Selo de verificação | booleano (sistema) | Opc | **Obr** | **Obr** | Opc | Opc | — | pessoal | público | LinkedIn, GitHub, Instagram, gov.br | existe: `User.verified` (na API) |
| `verificacao_metodo` | Método e data da verificação | enum (EMAIL_INSTITUCIONAL, DOMINIO, ATO_OFICIAL, CNPJ, GOVBR) + data | Opc | **Obr** | **Obr** | Opc | Opc | — | pessoal | público | LinkedIn, gov.br, GitHub | parcial: `ApprovalRequest.reviewedAt` `ApprovalRequest.policyVersion` |
| `email_institucional_verificado` | Vínculo verificado por e-mail institucional | data + domínio | Opc | — | **Obr** | Opc | Opc | — | pessoal | empresa | LinkedIn | ausente |
| `identificadores_academicos` | ORCID iD / Currículo Lattes | URL validada | Opc | — | Opc | Opc | Opc | — | pessoal | público | GitHub, ORCID, Currículo Lattes | ausente |

### 10.3 Contato

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `email_login` | E-mail de acesso | e-mail (cifrado + hash para busca) | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal (protegido) | só eu | GitHub, ORCID, X, Slack, LinkedIn | existe: `User.email` `User.emailHash` (na API, editável) |
| `email_confirmado` | E-mail confirmado | booleano (sistema) | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | GitHub, ORCID, LinkedIn | existe: `User.emailVerified` (na API) |
| `email_recuperacao` | E-mail secundário de recuperação | e-mail (cifrado) | Opc | Opc | Opc | Opc | Opc | — | pessoal (protegido) | só eu | ORCID | ausente |
| `email_contato_publico` | E-mail de contato exibido no perfil | e-mail | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, GitHub | ausente |
| `telefone` | Telefone celular (E.164) | texto E.164 (cifrado) | Opc | Opc | Opc | Opc | Opc | — | pessoal (protegido) | só eu | Slack, Microsoft Teams / cartão de perfil M365, X | existe: `User.phone` (na API, editável) |
| `site_pessoal` | Site ou portfólio externo | URL https | Opc | — | Opc | Opc | Opc | — | pessoal | público | GitHub, Behance, Dribbble, X | ausente |
| `redes_sociais` | Links profissionais (até 4) | lista de URL https | Opc | Opc | Opc | Opc | Opc | — | pessoal | público | GitHub, Dribbble, Currículo Lattes, Slack | ausente |

### 10.4 Profissional

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `cargo` | Cargo / função | texto ≤120 | Opc | — | **Obr** | Opc | Opc | — | pessoal | público | LinkedIn, Microsoft Teams / cartão de perfil M365, Slack, Microsoft Viva Engage | existe: `User.jobTitle` (na API, editável) |
| `headline` | Título profissional (headline) | texto ≤120 | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, XING | ausente |
| `empresa_atual` | Empresa / órgão atual | referência (lotação) | Opc | — | **Obr** | **Obr** | Opc | — | pessoal | público | LinkedIn, Microsoft Teams / cartão de perfil M365, Microsoft Viva Engage | existe: `User.companyId` |
| `departamento` | Departamento (lotação) | referência | Opc | — | **Obr** | **Obr** | Opc | — | pessoal | público | Microsoft Teams / cartão de perfil M365, Microsoft Viva Engage | existe: `User.departmentId` |
| `departamento_pretendido` | Departamento pretendido no cadastro | referência | Opc | — | — | — | — | — | pessoal | só eu | Documentos do Work Station | ausente |
| `periodo_lotacao` | Início e fim da lotação / chefia | datas (sistema) | Opc | — | **Obr** | **Obr** | Opc | — | pessoal | empresa | Slack, LinkedIn | existe: `DepartmentMembership.startedAt` `DepartmentMembership.endedAt` |
| `experiencia` | Experiência profissional anterior | lista (cargo, organização, período, descrição) | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, XING, Currículo Lattes | ausente |
| `formacao` | Formação acadêmica | lista (curso, instituição, período) | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, Currículo Lattes, ORCID | ausente |
| `competencias` | Competências | lista (vocabulário controlado + termo livre) | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, Microsoft Viva Engage, XING, Documentos do Work Station | ausente |
| `idiomas` | Idiomas e nível | lista (ISO 639 + nível) | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, Currículo Lattes | ausente |
| `certificacoes` | Certificações e licenças | lista (nome, emissor, data, URL) | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn | ausente |
| `bio` | Sobre (bio) | texto ≤1000 | Opc | — | Opc | Opc | Opc | — | pessoal | público | LinkedIn, GitHub, X, Facebook, Dribbble | existe: `User.bio` (na API, editável) |
| `interesses` | Áreas de interesse / atuação | lista | Opc | — | Opc | Opc | Opc | — | pessoal | público | Microsoft Viva Engage, Currículo Lattes | ausente |
| `aberto_a_colaborar` | Aberto a colaborar / mentorar | conjunto (PROJETOS, DECIA, MENTORIA, REVISAO) | Opc | — | Opc | Opc | Opc | — | pessoal | empresa | LinkedIn, Behance, Dribbble | ausente |
| `status_presenca` | Status e disponibilidade (ocupado, ausente até) | texto ≤80 + expiração | Opc | — | Opc | Opc | Opc | — | pessoal | empresa | GitHub, Slack, Microsoft Teams / cartão de perfil M365 | ausente |
| `local_trabalho` | Local de trabalho (unidade, remoto, presencial) | enum + unidade | Opc | — | Opc | Opc | Opc | — | pessoal | empresa | Microsoft Teams / cartão de perfil M365, Slack | ausente |

### 10.5 Portfólio

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `destaques` | Destaques do perfil (itens fixados) | lista ordenada de produções publicadas | Opc | Opc | Opc | Opc | Opc | — | pessoal | público | LinkedIn, GitHub, Behance, Dribbble | ausente |
| `conquistas_visiveis` | Exibir conquistas, chancelas e indicadores | seleção | Opc | — | Opc | Opc | Opc | — | pessoal | público | GitHub | parcial: `DeliberativeProfile.publicIndicatorsJson` |
| `licenca_reuso` | Política padrão de reuso / remix | enum (só leitura, remix com crédito…) | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | ausente |

### 10.6 Social

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `quem_pode_seguir` | Quem pode me seguir | enum TODOS · MESMA_EMPRESA · COM_APROVACAO | **Obr** | — | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | LinkedIn, Instagram | parcial: `Follow.status` |
| `quem_pode_mencionar` | Quem pode me mencionar / marcar | enum TODOS · MESMA_EMPRESA · NINGUEM | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | LinkedIn, Instagram, X | ausente |
| `quem_pode_atribuir` | Quem pode me atribuir tarefas e convidar para DECIA | enum MEU_DEPARTAMENTO · MINHA_EMPRESA · QUEM_EU_SIGO | **Obr** | — | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | Documentos do Work Station | ausente |
| `quem_pode_mensagem` | Quem pode me enviar mensagem direta | enum TODOS · MESMA_EMPRESA · QUEM_EU_SIGO | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | LinkedIn, Instagram | ausente |
| `sugestoes_de_pessoas` | Aparecer em sugestões de pessoas (RF50) | booleano | **Obr** | — | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | X, LinkedIn, Documentos do Work Station | ausente |
| `encontrar_por_contato` | Ser encontrado por e-mail ou telefone | booleano (padrão não) | Opc | — | Opc | Opc | Opc | — | pessoal | só eu | X | ausente |
| `status_online` | Mostrar quando estou online | booleano (padrão não) | Opc | — | Opc | Opc | Opc | — | pessoal | só eu | Instagram, Microsoft Teams / cartão de perfil M365 | ausente |
| `bloqueios` | Pessoas bloqueadas e silenciadas | lista | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | ausente |
| `revisao_marcacoes` | Revisar marcações antes de aparecerem | booleano | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Instagram, X | ausente |
| `compartilhar_edicoes` | Avisar a rede sobre mudanças no perfil | booleano (padrão não) | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | LinkedIn | ausente |

### 10.7 Privacidade

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `descoberta_perfil` | Quem encontra meu perfil na busca | enum PUBLICO · EMPRESA · NINGUEM (padrão EMPRESA) | **Obr** | — | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | LinkedIn, GitHub, Instagram | ausente |
| `indexacao_externa` | Permitir buscadores externos | booleano (padrão não) | **Obr** | — | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | LinkedIn, X | ausente |
| `visibilidade_por_campo` | Visibilidade por campo do perfil | mapa campo → PUBLICO · EMPRESA · SO_EU | **Obr** | — | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | ORCID, X, XING | parcial: `User.hypeVisibility` (na API, editável) |
| `publico_padrao` | Público padrão das novas produções | enum PRIVADA · DEPARTAMENTO · EMPRESA · PUBLICA | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | Facebook, Documentos do Work Station | ausente |
| `hype_visibilidade` | Visibilidade do Hype | enum PUBLICO · EMPRESA · SO_EU (padrão SO_EU) | **Obr** | — | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | Documentos do Work Station | existe: `User.hypeVisibility` (na API, editável) |
| `sair_do_ranking` | Sair dos rankings | booleano | Opc | — | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station, LGPD | existe: `User.rankingOptOut` (na API, editável) |
| `aceite_termos` | Versão aceita dos Termos de Uso | texto (sistema) + histórico | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | LGPD, Documentos do Work Station | existe: `User.termsVersion` `PolicyAcceptance.version` (na API) |
| `aceite_privacidade` | Versão aceita da Política de Privacidade | texto (sistema) + histórico | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | LGPD, Documentos do Work Station | existe: `User.privacyVersion` `PolicyAcceptance.version` (na API) |
| `consentimentos` | Consentimentos opcionais por finalidade | lista (finalidade, concedido, data) | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | LGPD | existe: `UserConsent.purpose` `UserConsent.granted` |
| `exclusao_conta` | Pedido de exclusão (datas e motivo) | datas + texto ≤500 | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | LGPD | existe: `User.deletionRequestedAt` `User.deletionScheduledAt` `User.deletionReason` (na API) |
| `exportacao_dados` | Pedidos de exportação (portabilidade e acesso) | lista | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | LGPD | existe: `DataExportRequest.status` `DataExportRequest.format` |
| `cookies` | Consentimento de cookies não essenciais | registro (finalidade, data) | Opc | Opc | Opc | Opc | Opc | Opc | pessoal | só eu | LGPD | ausente |

### 10.8 Segurança

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `senha` | Senha (hash Argon2id) | hash | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal (protegido) | interno | GitHub, ORCID, gov.br | existe: `User.passwordHash` |
| `login_institucional` | Vínculo de login institucional (emissor + sujeito OIDC) | texto | Opc | Opc | Opc | Opc | Opc | — | pessoal (protegido) | interno | gov.br | existe: `User.oidcIssuer` `User.oidcSubject` |
| `nivel_govbr` | Nível da conta gov.br (bronze, prata, ouro) | enum (do provedor) | Opc | — | Opc | Opc | Opc | — | pessoal | só eu | gov.br | ausente |
| `dois_fatores` | Verificação em duas etapas ativa | booleano + data de ativação | Opc | **Obr** | **Obr** | Opc | **Obr** | — | pessoal (protegido) | só eu | GitHub, gov.br, Instagram | existe: `User.twoFactorEnabled` (na API) |
| `totp_segredo` | Segredo TOTP (cifrado) | Base32 cifrado | Opc | **Obr** | **Obr** | Opc | **Obr** | — | pessoal (protegido) | interno | GitHub | existe: `User.twoFactorSecret` |
| `codigos_recuperacao` | Códigos de recuperação (hash, uso único) | lista de hashes | Opc | **Obr** | **Obr** | Opc | **Obr** | — | pessoal (protegido) | interno | GitHub | existe: `User.twoFactorRecoveryHashes` |
| `chaves_de_acesso` | Chaves de acesso (passkeys / WebAuthn) | credencial pública | Opc | Opc | Opc | Opc | Opc | — | pessoal (protegido) | interno | — | ausente |
| `sessoes_ativas` | Sessões ativas (dispositivo, IP, último uso, revogar) | lista (sistema) | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal (protegido) | só eu | GitHub | existe: `RefreshToken.deviceName` `RefreshToken.userAgent` `RefreshToken.createdIp` `RefreshToken.lastUsedAt` `RefreshToken.revokedAt` |
| `historico_login` | Histórico de login (sucessos e falhas) | lista (data, IP aproximado, dispositivo, resultado) | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal (protegido) | só eu | GitHub | parcial: `User.lastLoginAt` (na API) |
| `registros_acesso` | Registros de acesso à aplicação (IP, data e hora) | log técnico | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | pessoal (protegido) | interno | Marco Civil da Internet | parcial: `RefreshToken.createdIp` |
| `alerta_novo_dispositivo` | Aviso de login em novo dispositivo | booleano (padrão sim) | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | — | ausente |
| `situacao_conta` | Situação da conta | enum AccountStatus | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | Documentos do Work Station | existe: `User.status` (na API) |
| `papel_global` | Papel global (USER / ADMIN) | enum Role | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | só eu | Slack | existe: `User.role` (na API) |
| `origem_conta` | Origem da conta (real, seed, demo, sistema) | enum AccountOrigin | **Obr** | **Obr** | **Obr** | **Obr** | **Obr** | — | pessoal | interno | Documentos do Work Station | existe: `User.accountOrigin` |
| `admin_motivo_acesso` | Motivo registrado ao abrir dado de terceiro | texto na trilha de auditoria | — | — | — | — | **Obr** | — | pessoal | interno | LGPD, Documentos do Work Station | ausente |

### 10.9 Preferências

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `tema` | Tema | enum AUTO · CLARO · ESCURO · ALTO_CONTRASTE · BLUEPRINT | Opc | Opc | Opc | Opc | Opc | Opc | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.theme` `PreferenciasFront.theme` |
| `idioma` | Idioma da interface | enum PT_BR · EN · ES | Opc | Opc | Opc | Opc | Opc | Opc | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.language` `PreferenciasFront.language` |
| `densidade` | Densidade | enum COMPACTA · NORMAL · CONFORTAVEL | Opc | Opc | Opc | Opc | Opc | Opc | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.density` `PreferenciasFront.density` |
| `escala_fonte` | Escala da fonte | decimal 0,50–2,00 | Opc | Opc | Opc | Opc | Opc | Opc | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.fontScale` `PreferenciasFront.fontScale` |
| `reduzir_movimento` | Reduzir movimento | booleano | Opc | Opc | Opc | Opc | Opc | Opc | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.reduceMotion` `PreferenciasFront.reduceMotion` |
| `pele_da_mesa` | Pele da mesa | enum PAPEL · CORTICA · BLUEPRINT · PAPEL_TIMBRADO | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.deskSkin` `PreferenciasFront.deskSkin` |
| `arte_de_fundo` | Arte de fundo | identificador | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | parcial: `PreferenciasFront.backgroundId` |
| `fuso_horario` | Fuso horário | IANA (America/Sao_Paulo) | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | GitHub, Slack | existe: `UserPreferences.timezone` `PreferenciasFront.timezone` |
| `notificacoes` | Notificações (canais e eventos) | JSON (email, push, menções, DECIA, chancelas, pontos, resumo) | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.notificationPrefsJson` `PreferenciasFront.email` `PreferenciasFront.mentions` `PreferenciasFront.weeklyDigest` |
| `horario_silencio` | Horário de silêncio (não perturbe) | intervalo HH:mm | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | — | ausente |
| `horario_tarefa_do_dia` | Horário da Tarefa do Dia | HH:mm | Opc | — | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | existe: `PreferenciasFront.dailyTaskAt` |
| `limite_wip` | Limite pessoal de trabalho em andamento (WIP) | inteiro 1–20 | Opc | — | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.wipLimit` `PreferenciasFront.wipLimit` |
| `modo_ia` | Modo padrão da IA | enum ECONOMIA · AVANCADO | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.aiModeDefault` `PreferenciasFront.aiModeDefault` |
| `autonomia_ia` | Autonomia padrão da IA | enum (SOB_SOLICITACAO…) | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | parcial: `PreferenciasFront.aiAutonomyDefault` |
| `layout_painel` | Layout do painel | JSON | Opc | Opc | Opc | Opc | Opc | — | pessoal | só eu | Documentos do Work Station | existe: `UserPreferences.dashboardLayoutJson` |

### 10.10 Institucional

| Campo | Rótulo | Tipo | EMP | EMPRESA | CHEFE | CUR | ADM | VIS | LGPD | Visib. | Fontes | Modelo atual |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `razao_social` | Razão social | texto ≤200 | — | **Obr** | — | — | — | — | não pessoal | público | Glassdoor, LinkedIn | existe: `Company.legalName` `EmpresaProfileExtension.legalName` |
| `nome_organizacao` | Nome de exibição da organização (fantasia ou sigla) | texto ≤120 | — | **Obr** | — | — | — | — | não pessoal | público | LinkedIn, Facebook | ausente |
| `slug_pagina` | Endereço da página (slug) | texto ≤80, único | — | **Obr** | — | — | — | — | não pessoal | público | LinkedIn | existe: `Company.slug` |
| `cnpj` | CNPJ | 14 dígitos (dígitos verificadores + situação cadastral) | — | **Obr** | — | — | — | — | não pessoal | só eu | LGPD, Documentos do Work Station | existe: `Company.cnpj` `EmpresaProfileExtension.companyCnpj` |
| `tipo_organizacao` | Natureza da organização (órgão público, autarquia, estatal, empresa privada, terceiro setor) | enum | — | **Obr** | — | — | — | — | não pessoal | público | LinkedIn, Glassdoor | ausente |
| `setor` | Setor / área de atuação | lista controlada (CNAE opcional) | — | **Obr** | — | — | — | — | não pessoal | público | LinkedIn, Glassdoor | ausente |
| `porte` | Porte (faixa de pessoas) | enum de faixas | — | Opc | — | — | — | — | não pessoal | público | LinkedIn, Glassdoor | ausente |
| `site_oficial` | Site oficial | URL https | — | **Obr** | — | — | — | — | não pessoal | público | LinkedIn, GitHub, Glassdoor, Facebook | existe: `Company.websiteUrl` `EmpresaProfileExtension.officialSite` |
| `dominio_verificado` | Domínio institucional verificado (DNS TXT) | domínio + data | — | Opc | — | — | — | — | não pessoal | público | GitHub | ausente |
| `logotipo` | Logotipo | imagem | — | Opc | — | — | — | — | não pessoal | público | LinkedIn, Glassdoor | existe: `Company.logoUrl` |
| `brasao` | Brasão (órgão público) | imagem | — | Opc | — | — | — | — | não pessoal | público | Documentos do Work Station | existe: `Company.coatOfArmsUrl` |
| `sobre_organizacao` | Sobre a organização | texto | — | Opc | — | — | — | — | não pessoal | público | LinkedIn, Glassdoor, Facebook | existe: `Company.about` |
| `slogan` | Slogan | texto ≤120 | — | Opc | — | — | — | — | não pessoal | público | LinkedIn | ausente |
| `sede` | Sede (cidade/UF; endereço opcional) | município IBGE + endereço | — | **Obr** | — | — | — | — | não pessoal | público | Glassdoor, Facebook | ausente |
| `ano_fundacao` | Ano de fundação / criação | ano | — | Opc | — | — | — | — | não pessoal | público | Glassdoor | ausente |
| `email_contato_organizacao` | E-mail institucional de contato | e-mail | — | Opc | — | — | — | — | não pessoal | público | Facebook, GitHub | ausente |
| `telefone_organizacao` | Telefone institucional | E.164 | — | Opc | — | — | — | — | não pessoal | público | Facebook | ausente |
| `cor_destaque` | Cor de destaque | token de cor | — | Opc | — | — | — | — | não pessoal | público | Documentos do Work Station | existe: `Company.accentColor` |
| `responsavel_conta` | Pessoa responsável pela conta | referência a User | — | **Obr** | — | — | — | — | pessoal | só eu | LinkedIn | existe: `Company.ownerUserId` |
| `documento_representacao` | Documento de representação (ato de nomeação, procuração, contrato social) | arquivo em restricted/ | — | **Obr** | — | — | — | — | pessoal (protegido) | só eu | LinkedIn, Documentos do Work Station | existe: `EmpresaProfileExtension.representationDocId` |
| `coadministradores` | Administradores adicionais da página | lista (pessoa, papel, desde) | — | Opc | — | — | — | — | pessoal | empresa | LinkedIn | ausente |
| `politicas_organizacao` | Políticas da organização (pontos, Hype, ranking, gravação, mensagens) | JSON | — | **Obr** | — | — | — | — | não pessoal | empresa | Documentos do Work Station | existe: `Company.pointsPolicyJson` `Company.hypePolicyJson` `Company.messagingPolicyJson` `Company.recordingRetentionPolicy` |
| `situacao_organizacao` | Situação da organização / validação | enum | — | **Obr** | — | — | — | — | não pessoal | público | Documentos do Work Station | existe: `Company.status` `ApprovalRequest.status` |
| `orgao_do_chefe` | Órgão / empresa do departamento | referência a Company | — | — | **Obr** | — | — | — | pessoal | público | Documentos do Work Station | existe: `ChefeProfileExtension.companyId` |
| `departamento_chefiado` | Departamento chefiado | referência ou nome | — | — | **Obr** | — | — | — | pessoal | público | Microsoft Teams / cartão de perfil M365 | existe: `ChefeProfileExtension.departmentId` `ChefeProfileExtension.departmentName` `Department.headUserId` |
| `ato_nomeacao` | Link do ato de nomeação (Diário Oficial) | URL https | — | — | **Obr** | — | — | — | pessoal | só eu | Documentos do Work Station | existe: `ChefeProfileExtension.appointmentLink` |
| `confirmacao_chefia` | Confirmação pelo chefe atual ou pela EMPRESA | pessoa + data (sistema) | — | — | **Obr** | — | — | — | pessoal | só eu | Documentos do Work Station | existe: `ApprovalRequest.confirmedBy` `ApprovalRequest.confirmedAt` |
| `substituto_eventual` | Substituto(a) eventual / delegação | pessoa + período + escopo | — | — | Opc | — | — | — | pessoal | empresa | ORCID | ausente |
| `curadoria_escopo` | Departamento e escopo da curadoria | referência + enum FILA_REVISAO · PREMIACAO · AMBOS | — | — | — | **Obr** | — | — | pessoal | público | Documentos do Work Station | existe: `CuratorAppointment.departmentId` `CuratorAppointment.scope` |
| `curadoria_nomeacao` | Quem nomeou, quando e revogação | pessoa + datas + motivo | — | — | — | **Obr** | — | — | pessoal | empresa | Documentos do Work Station | existe: `CuratorAppointment.appointedBy` `CuratorAppointment.appointedAt` `CuratorAppointment.revokedAt` `CuratorAppointment.revokeReason` |

## 11. Campos que não devem ser coletados

Valem para todos os tipos de perfil. Sensível = art. 5º, II (tratamento só nas hipóteses do art. 11); proibido sem base legal = dado comum sem finalidade no produto (art. 6º, I e III).

| Campo | Rótulo | Classificação | Quem coleta nas referências | Por quê / exceção |
|---|---|---|---|---|
| `data_nascimento` | Data de nascimento | **proibido s/ base** | X, Instagram, Currículo Lattes | Só se a Q-63 admitir menores (aprendizes, estagiários): então obrigatória no servidor e cifrada, para aplicar o art. 14. Sem isso, basta a declaração 'tenho 18 anos ou mais'. |
| `cpf` | CPF | **proibido s/ base** | gov.br, Currículo Lattes | Nenhuma função do produto precisa do CPF. Exceção: login gov.br, cujo identificador do titular é o CPF — guardar só como oidcSubject cifrado, sem exibir nem usar como chave de negócio. |
| `documento_identidade` | Documento de identidade (número ou imagem) | **proibido s/ base** | LinkedIn, Instagram | LinkedIn e Meta verificam com documento via parceiro; aqui a verificação é por vínculo (e-mail institucional, ato oficial, CNPJ). O UploadKind 'identity' não deve ser usado para pessoas sem base legal. |
| `sexo_genero` | Sexo / gênero | **proibido s/ base** | Currículo Lattes | Sem finalidade. O Lattes exige 'sexo'; aqui bastam pronomes livres e opcionais. |
| `cor_raca` | Cor, raça ou origem étnica | **SENSÍVEL** | Currículo Lattes, LGPD | Obrigatório no Lattes; sensível pelo art. 5º, II. Não coletar. |
| `religiao_politica_sindicato` | Religião, opinião política, filiação sindical ou partidária | **SENSÍVEL** | LGPD | Dado pessoal sensível (art. 5º, II). NÃO coletar; só nas hipóteses estritas do art. 11. |
| `saude_deficiencia` | Saúde ou deficiência | **SENSÍVEL** | Currículo Lattes, LGPD | Necessidades de acessibilidade entram como preferências (fonte, contraste, movimento), sem declarar condição. |
| `vida_sexual` | Orientação ou vida sexual | **SENSÍVEL** | LGPD | Dado pessoal sensível (art. 5º, II). NÃO coletar; só nas hipóteses estritas do art. 11. |
| `biometria` | Biometria (facial, digital, voz) | **SENSÍVEL** | gov.br, Instagram, LGPD | O gov.br usa reconhecimento facial nos níveis prata/ouro; se o produto precisar de nível alto, delegar ao gov.br e guardar só o nível retornado, nunca a biometria. |
| `nome_mae` | Nome da mãe | **proibido s/ base** | Currículo Lattes | Dado pessoal sem finalidade no produto: coleta vedada pelos princípios da finalidade e da necessidade (art. 6º, I e III) até haver base legal (art. 7º) e finalidade documentadas. |
| `estado_civil` | Estado civil / relacionamento | **proibido s/ base** | Facebook | Dado pessoal sem finalidade no produto: coleta vedada pelos princípios da finalidade e da necessidade (art. 6º, I e III) até haver base legal (art. 7º) e finalidade documentadas. |
| `endereco_residencial` | Endereço residencial | **proibido s/ base** | Currículo Lattes | Dado pessoal sem finalidade no produto: coleta vedada pelos princípios da finalidade e da necessidade (art. 6º, I e III) até haver base legal (art. 7º) e finalidade documentadas. |
| `matricula` | Matrícula funcional | **proibido s/ base** | Microsoft Teams / cartão de perfil M365 | Só com integração de RH/folha e base legal (art. 7º, II/V, ou art. 23 no setor público). |
| `pretensao_salarial` | Pretensão salarial / remuneração | **proibido s/ base**; **permitido no RF75** (D-147) | Indeed, Dribbble | O Indeed esconde a pretensão dos empregadores. No Guia de Carreira (RF75) é salário mínimo aceitável, cifrado, privado, só para filtrar sugestões; nunca exibido nem usado para ordenar. |
| `procurando_emprego` | Sinal 'procurando emprego' | **proibido s/ base**; **permitido no RF75** (D-147) | LinkedIn, XING, Indeed | Numa rede da própria empresa, expõe a pessoa ao empregador; XING e LinkedIn o restringem a recrutadores. No RF75 é o status "Em busca" com três níveis (padrão "só eu"), bloqueio de empresas e consentimento ao ativar o guia. |
| `visitas_ao_perfil` | Registro de quem visitou meu perfil | **proibido s/ base** | LinkedIn | Não implementar: cria monitoramento entre colegas e chefias sem finalidade. |

## 12. Lacunas no modelo atual

Campos recomendados que não existem (ou existem só em parte) nas classes lidas. Ordem: prioridade, depois relevância. "Onde entraria" é proposta — não altera o modelo.

| # | Campo | Rótulo | Situação | Perfis | Onde entraria | Prioridade | Por quê |
|---|---|---|---|---|---|---|---|
| 1 | `competencias` | Competências | ausente | EMP, CHEFE, CUR, ADM | UserSkill (userId, skillId, origem DECLARADA/CHANCELADA, visibilidade) | alta | Base da descoberta e das sugestões de pessoas (RF50): 'competências compartilhadas', separadas da análise de carreira privada (REDE_PROFISSIONAL_VISIBILIDADE). |
| 2 | `descoberta_perfil` | Quem encontra meu perfil na busca | ausente | EMP, CHEFE, CUR, ADM | User.discoverability | alta | LinkedIn separa perfil público e indexável; GitHub tem perfil privado; Instagram, conta privada. A EMPRESA é sempre pública. |
| 3 | `visibilidade_por_campo` | Visibilidade por campo do perfil | parcial | EMP, CHEFE, CUR, ADM | User.profileFieldVisibilityJson (ou tabela profile_field_visibility) | alta | Hoje só o Hype tem visibilidade própria. ORCID usa Todos/Partes confiáveis/Só eu por item; X separa ano e dia/mês do aniversário. |
| 4 | `publico_padrao` | Público padrão das novas produções | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | UserPreferences.defaultVisibility (padrão PRIVADA) | alta | O Facebook lembra o último público; aqui o padrão é conservador e mudar o padrão não republica o acervo. |
| 5 | `quem_pode_atribuir` | Quem pode me atribuir tarefas e convidar para DECIA | ausente | EMP, CHEFE, CUR, ADM | User.assignmentPolicy + User.inviteDeciaPolicy | alta | A atribuição formal pelo chefe segue o fluxo institucional (RF10) e não depende desta opção; convite é sempre revisável (REDE_PROFISSIONAL_VISIBILIDADE). |
| 6 | `sugestoes_de_pessoas` | Aparecer em sugestões de pessoas (RF50) | ausente | EMP, CHEFE, CUR, ADM | User.peopleSuggestionsOptIn | alta | Listado como controle de privacidade em REDE_PROFISSIONAL_VISIBILIDADE; usa só campos descobríveis. |
| 7 | `bloqueios` | Pessoas bloqueadas e silenciadas | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | UserBlock (userId, blockedUserId, tipo BLOQUEIO·SILENCIO, criadoEm) | alta | REDE_PROFISSIONAL_VISIBILIDADE exige bloquear contato e silenciar; não há entidade para isso. |
| 8 | `tipo_organizacao` | Natureza da organização (órgão público, autarquia, estatal, empresa privada, terceiro setor) | ausente | EMPRESA | Company.organizationType + EmpresaProfileExtension (no cadastro) | alta | Define o critério de validação (ato no Diário Oficial × contrato social/procuração) e a base legal (art. 23 para o poder público). |
| 9 | `coadministradores` | Administradores adicionais da página | ausente | EMPRESA | CompanyAdmin (companyId, userId, papel, desde, até) | alta | Hoje a conta institucional depende de uma só pessoa (ownerUserId): risco de continuidade. Recomendar ≥ 2. |
| 10 | `historico_login` | Histórico de login (sucessos e falhas) | parcial | EMP, EMPRESA, CHEFE, CUR, ADM | login_events (ou leitura filtrada do AuditLog) em /api/me/security-log | média | O GitHub mantém um log de segurança visível ao titular; hoje só existe o último login. |
| 11 | `localizacao` | Localização (cidade/UF, país) | ausente | EMP, CHEFE, CUR, ADM | User.locationCity/UF (nunca endereço) | média | Só cidade/região; guias do LinkedIn desaconselham endereço. EMPRESA usa a sede (grupo institucional). |
| 12 | `verificacao_metodo` | Método e data da verificação | parcial | EMP, EMPRESA, CHEFE, CUR, ADM | User.verifiedAt + User.verificationMethod (derivados do ApprovalRequest aprovado) | média | LinkedIn mostra o tipo de verificação (identidade, local de trabalho, instituição); o gov.br mostra selos por nível. Hoje o dado está só no pedido de validação, não no perfil. |
| 13 | `email_institucional_verificado` | Vínculo verificado por e-mail institucional | ausente | EMP, CHEFE, CUR, ADM | User.workEmailVerifiedAt + domínio (VerificationPolicy.freeMailDomainsJson recusa domínios gratuitos) | média | Equivale à verificação de local de trabalho do LinkedIn. |
| 14 | `email_recuperacao` | E-mail secundário de recuperação | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | User.recoveryEmail (cifrado) ou tabela user_emails | média | ORCID recomenda e-mail de backup para não perder o acesso. |
| 15 | `site_pessoal` | Site ou portfólio externo | ausente | EMP, CHEFE, CUR, ADM | user_links (tipo SITE) | média | — |
| 16 | `redes_sociais` | Links profissionais (até 4) | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | user_links (userId, tipo, url, ordem, visibilidade) | média | GitHub limita a 4 links; Slack permite campo personalizado de redes. |
| 17 | `headline` | Título profissional (headline) | ausente | EMP, CHEFE, CUR, ADM | User.headline + ProfileUpdate | média | No LinkedIn aparece na busca ao lado do nome e é gerado do cargo atual quando vazio. |
| 18 | `experiencia` | Experiência profissional anterior | ausente | EMP, CHEFE, CUR, ADM | ProfileExperience (userId, título, organização, início, fim, descrição, visibilidade) | média | — |
| 19 | `formacao` | Formação acadêmica | ausente | EMP, CHEFE, CUR, ADM | ProfileEducation (userId, curso, instituição, período) | média | — |
| 20 | `aberto_a_colaborar` | Aberto a colaborar / mentorar | ausente | EMP, CHEFE, CUR, ADM | User.openToJson | média | Equivale ao 'Open to'/'Hire me' das referências, restrito a colaboração interna — nunca 'procurando emprego'. |
| 21 | `destaques` | Destaques do perfil (itens fixados) | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | ProfileFeatured (userId, targetType, targetId, ordem) | média | Só itens já publicados; fixar não amplia o público do item. |
| 22 | `quem_pode_seguir` | Quem pode me seguir | parcial | EMP, CHEFE, CUR, ADM | User.followPolicy + FollowStatus PENDENTE | média | FollowStatus hoje só tem ATIVO/REMOVIDO: não há pedido pendente nem aprovação. |
| 23 | `quem_pode_mencionar` | Quem pode me mencionar / marcar | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | User.mentionPolicy | média | LinkedIn: desligar não apaga menções existentes; Instagram oferece revisão de marcações. |
| 24 | `quem_pode_mensagem` | Quem pode me enviar mensagem direta | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | User.directMessagePolicy | média | Company.messagingPolicyJson cobre só o prazo de retenção das mensagens. |
| 25 | `indexacao_externa` | Permitir buscadores externos | ausente | EMP, CHEFE, CUR, ADM | User.searchEngineIndexing + meta robots na página /u/[username] | média | O X avisa que bio e posts públicos podem ser indexados. |
| 26 | `registros_acesso` | Registros de acesso à aplicação (IP, data e hora) | parcial | EMP, EMPRESA, CHEFE, CUR, ADM, VIS | access_log com retenção de 6 meses e acesso restrito | média | Marco Civil, art. 15: obrigação legal (base do art. 7º, II), inclusive para visitante. |
| 27 | `admin_motivo_acesso` | Motivo registrado ao abrir dado de terceiro | ausente | ADM | AuditLog com 'reason' obrigatório nas rotas /api/admin/*/documents e de suporte | média | Registro das operações de tratamento (art. 37). |
| 28 | `nome_organizacao` | Nome de exibição da organização (fantasia ou sigla) | ausente | EMPRESA | Company.displayName | média | Hoje a Company tem só razão social e slug; órgãos públicos são conhecidos pela sigla (ex.: SECID). |
| 29 | `setor` | Setor / área de atuação | ausente | EMPRESA | Company.sector | média | — |
| 30 | `dominio_verificado` | Domínio institucional verificado (DNS TXT) | ausente | EMPRESA | Company.verifiedDomain + verifiedDomainAt | média | GitHub só mostra o selo quando site e e-mail exibidos estão em domínios verificados. |
| 31 | `sede` | Sede (cidade/UF; endereço opcional) | ausente | EMPRESA | Company.headquartersCity/UF (+ endereço) | média | A cidade também alimenta o calendário de dias úteis dos prazos (feriados locais). |
| 32 | `email_contato_organizacao` | E-mail institucional de contato | ausente | EMPRESA | Company.contactEmail | média | Caixa institucional (contato@, ouvidoria@), nunca e-mail pessoal. |
| 33 | `substituto_eventual` | Substituto(a) eventual / delegação | ausente | CHEFE | DepartmentDelegate (departmentId, userId, início, fim, escopo) | média | O ORCID admite delegados; garante continuidade nas ausências e na transição (RF36). |
| 34 | `pronomes` | Pronomes | ausente | EMP, CHEFE, CUR, ADM | User.pronouns (≤40) + ProfileUpdate | baixa | Opcional e livre; nunca perguntar sexo/gênero. GitHub mostra só a quem está logado; Slack deixa oculto até o admin habilitar. |
| 35 | `pronuncia_nome` | Pronúncia do nome | ausente | EMP, CHEFE, CUR, ADM | User.namePronunciation | baixa | — |
| 36 | `identificadores_academicos` | ORCID iD / Currículo Lattes | ausente | EMP, CHEFE, CUR, ADM | user_links (tipo ORCID, LATTES) | baixa | — |
| 37 | `email_contato_publico` | E-mail de contato exibido no perfil | ausente | EMP, CHEFE, CUR, ADM | user_links (tipo EMAIL) | baixa | Diferente do e-mail de acesso, que nunca é exibido. |
| 38 | `departamento_pretendido` | Departamento pretendido no cadastro | ausente | EMP | User.intendedDepartmentId (proposta da TAXONOMIA §1.1) | baixa | Não lota ninguém: quem lota é o chefe (RF28.CA02). |
| 39 | `idiomas` | Idiomas e nível | ausente | EMP, CHEFE, CUR, ADM | ProfileLanguage | baixa | — |
| 40 | `certificacoes` | Certificações e licenças | ausente | EMP, CHEFE, CUR, ADM | ProfileCertification | baixa | — |
| 41 | `interesses` | Áreas de interesse / atuação | ausente | EMP, CHEFE, CUR, ADM | UserSkill com tipo INTERESSE | baixa | — |
| 42 | `status_presenca` | Status e disponibilidade (ocupado, ausente até) | ausente | EMP, CHEFE, CUR, ADM | user_status (mensagem, ocupado, expiraEm, visivelPara) | baixa | GitHub permite restringir o status a uma organização. |
| 43 | `local_trabalho` | Local de trabalho (unidade, remoto, presencial) | ausente | EMP, CHEFE, CUR, ADM | user_status.workLocation | baixa | — |
| 44 | `conquistas_visiveis` | Exibir conquistas, chancelas e indicadores | parcial | EMP, CHEFE, CUR, ADM | interruptor geral 'mostrar conquistas' no perfil | baixa | GitHub oculta conquistas sem tornar o perfil privado. |
| 45 | `licenca_reuso` | Política padrão de reuso / remix | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | UserPreferences.defaultRemixPolicy | baixa | REDE_PROFISSIONAL_VISIBILIDADE pede política explícita e conservadora. |
| 46 | `encontrar_por_contato` | Ser encontrado por e-mail ou telefone | ausente | EMP, CHEFE, CUR, ADM | User.findableByContact | baixa | O X separa essa descoberta e nunca exibe e-mail ou telefone. |
| 47 | `status_online` | Mostrar quando estou online | ausente | EMP, CHEFE, CUR, ADM | UserPreferences.showPresence | baixa | Instagram: quem esconde o próprio status também deixa de ver o dos outros. |
| 48 | `revisao_marcacoes` | Revisar marcações antes de aparecerem | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | User.tagReview | baixa | — |
| 49 | `compartilhar_edicoes` | Avisar a rede sobre mudanças no perfil | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | UserPreferences.announceProfileEdits | baixa | — |
| 50 | `cookies` | Consentimento de cookies não essenciais | ausente | EMP, EMPRESA, CHEFE, CUR, ADM, VIS | armazenamento local + ConsentEvent quando logado | baixa | Só necessário se houver cookies ou métricas não essenciais; com cookies estritamente necessários basta aviso. |
| 51 | `nivel_govbr` | Nível da conta gov.br (bronze, prata, ouro) | ausente | EMP, CHEFE, CUR, ADM | User.oidcAssuranceLevel (a partir do acr/amr do token) | baixa | Permite exigir nível prata/ouro para ações críticas sem guardar biometria nem documento. |
| 52 | `chaves_de_acesso` | Chaves de acesso (passkeys / WebAuthn) | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | user_webauthn_credentials | baixa | Não pesquisado nesta rodada; segundo fator resistente a phishing. |
| 53 | `alerta_novo_dispositivo` | Aviso de login em novo dispositivo | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | evento de segurança em notificationPrefsJson (não desligável para ADMIN) | baixa | Prática comum; não conferida nas fontes desta rodada. |
| 54 | `arte_de_fundo` | Arte de fundo | parcial | EMP, EMPRESA, CHEFE, CUR, ADM | coluna UserPreferences.backgroundId (hoje viaja dentro de notificationPrefsJson, Q-100) | baixa | — |
| 55 | `horario_silencio` | Horário de silêncio (não perturbe) | ausente | EMP, EMPRESA, CHEFE, CUR, ADM | notificationPrefsJson.quietHours | baixa | Prática comum; não conferida nas fontes desta rodada. |
| 56 | `autonomia_ia` | Autonomia padrão da IA | parcial | EMP, EMPRESA, CHEFE, CUR, ADM | coluna UserPreferences.aiAutonomyDefault (hoje dentro de notificationPrefsJson) | baixa | — |
| 57 | `porte` | Porte (faixa de pessoas) | ausente | EMPRESA | Company.sizeRange | baixa | Faixa, nunca número exato. |
| 58 | `slogan` | Slogan | ausente | EMPRESA | Company.tagline | baixa | — |
| 59 | `ano_fundacao` | Ano de fundação / criação | ausente | EMPRESA | Company.foundedYear | baixa | — |
| 60 | `telefone_organizacao` | Telefone institucional | ausente | EMPRESA | Company.contactPhone | baixa | — |

## 13. Fontes

Todas acessadas em 2026-10-17, salvo indicação. "Secundária" = guia de terceiros, usado só onde não havia página oficial acessível.

- [LinkedIn Help — Information displayed on the introduction section of your profile](https://www.linkedin.com/help/billing/answer/38579) — oficial; acesso em 2026-10-17.
- [LinkedIn Help — Verifications on LinkedIn (identidade, local de trabalho, instituição)](https://www.linkedin.com/help/linkedin/answer/a1492056) — oficial; acesso em 2026-10-17.
- [LinkedIn Help — Verification on your LinkedIn profile](https://www.linkedin.com/help/linkedin/answer/140551) — oficial; acesso em 2026-10-17.
- [LinkedIn Help — Mentions, tags, and collaborations setting](https://www.linkedin.com/help/learning/answer/85430) — oficial; acesso em 2026-10-17.
- [LinkedIn Privacy Settings: How to Control Who Sees Your Posts (2026 Guide)](https://linkedinpreview.com/blog/linkedin-privacy-settings-2026) — secundária; acesso em 2026-10-17.
- [LinkedIn Help — Claim a LinkedIn Listing Page (representante autorizado)](https://www.linkedin.com/help/linkedin/answer/55962) — oficial; acesso em 2026-10-17.
- [G2 — How to Create a LinkedIn Page for Your Business in 4 Steps](https://learn.g2.com/linkedin-business-page) — secundária; acesso em 2026-10-17.
- [Leuphana Career Service — Your digital profile (XING)](https://www.leuphana.de/en/services/career-service/application/your-digital-profile.html) — secundária; acesso em 2026-10-17.
- [Universität Mannheim — XING information (privacidade)](https://www.uni-mannheim.de/en/data-protection-declaration/xing-information/) — secundária; acesso em 2026-10-17.
- [Behance Help — Guide: Hire Me](https://help.behance.net/hc/en-us/articles/8832406918811-Guide-Hire-Me) — oficial; acesso em 2026-10-17.
- [Adobe Community — Changing your profile information](https://community.adobe.com/announcements-34/changing-your-profile-information-20262) — oficial; acesso em 2026-10-17.
- [Dribbble Stories — Let's get discovered (2020)](https://dribbble.com/stories/2020/04/16/lets-get-discovered) — oficial; acesso em 2026-10-17.
- [Dribbble Stories — How to get the work you love on Dribbble (2019)](https://dribbble.com/stories/2019/09/20/how-to-get-the-work-you-love-on-dribbble) — oficial; acesso em 2026-10-17.
- [GitHub Docs — Personalize your profile](https://docs.github.com/en/account-and-profile/tutorials/personalize-your-profile) — oficial; acesso em 2026-10-17.
- [GitHub Docs — Setting your profile to private](https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/customizing-your-profile/setting-your-profile-to-private) — oficial; acesso em 2026-10-17.
- [GitHub Docs — Configuring two-factor authentication recovery methods](https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/configuring-two-factor-authentication-recovery-methods) — oficial; acesso em 2026-10-17.
- [GitHub Docs — Viewing and managing your sessions](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/viewing-and-managing-your-sessions) — oficial; acesso em 2026-10-17.
- [GitHub Docs — Verifying or approving a domain for your organization](https://docs.github.com/en/enterprise-server@3.20/organizations/managing-organization-settings/verifying-or-approving-a-domain-for-your-organization) — oficial; acesso em 2026-10-17.
- [Glassdoor for Employers — Free employer profile guide](https://www.guide.glassdoor.com/gdprofile) — oficial; acesso em 2026-10-17.
- [Indeed Help — Adding or editing job search preferences](https://www.indeed.com/help/job-seekers/articles/32603395892109-adding-or-editing-job-search-preferences) — oficial; acesso em 2026-10-17.
- [Indeed Help (CA) — preferências visíveis a empregadores](https://support.indeed.com/hc/en-ca/articles/360051197532) — oficial; acesso em 2026-10-17.
- [Microsoft Learn — Manage Viva Engage users across their lifecycle](https://learn.microsoft.com/viva/engage/manage-viva-engage-users/manage-users-across-their-lifecycle) — oficial; acesso em 2026-10-17.
- [Slack Help — Edit your profile](https://slack.com/help/articles/204092246) — oficial; acesso em 2026-10-17.
- [Slack Help — Customize member profiles](https://slack.com/help/articles/212281478-Customize-member-profiles) — oficial; acesso em 2026-10-17.
- [Microsoft Support — Profile cards in Microsoft 365](https://support.microsoft.com/en-us/Outlook/profile-cards-in-microsoft-365) — oficial; acesso em 2026-10-17.
- [gov.br — Níveis da conta gov.br (bronze, prata, ouro)](https://www.gov.br/governodigital/pt-br/identidade/conta-gov-br/niveis-da-conta-govbr) — oficial; acesso em 2026-10-17.
- [CNPq — Manual da Plataforma Lattes](https://www.gov.br/cnpq/pt-br/teste-nova-capa-2024/manuais-de-uso-das-plataformas-do-cnpq/FINAL_Manual_Lattes.pdf) — oficial; acesso em 2026-10-17.
- [UFGD — Manual de cadastramento de Currículo Lattes (2018)](https://files.ufgd.edu.br/arquivos/arquivos/78/INICIACAO-CIENTIFICA-PROPP/Manual%20de%20cadastramento%20de%20Curr%C3%ADculo%20Lattes-CNPq%20-%202018.pdf) — secundária; acesso em 2026-10-17.
- [ORCID Support — Visibility settings](https://support.orcid.org/hc/articles/360006897614) — oficial; acesso em 2026-10-17.
- [ORCID Support — Register your ORCID iD](https://support.orcid.org/hc/articles/360006897454) — oficial; acesso em 2026-10-17.
- [Instagram Help — Eligibility requirements for Meta Verified profiles](https://help.instagram.com/2419286908233223/) — oficial; acesso em 2026-10-17.
- [Dummies — Managing your Instagram privacy settings](https://www.dummies.com/article/technology/social-media/general-social-media/managing-your-instagrams-privacy-settings-261592/) — secundária; acesso em 2026-10-17.
- [X Help — About profile visibility settings (data de nascimento)](https://help.x.com/en/safety-and-security/birthday-visibility-settings) — oficial; acesso em 2026-10-17.
- [X Help — How to customize your profile](https://help.x.com/en/managing-your-account/how-to-customize-your-profile) — oficial; acesso em 2026-10-17.
- [X Help — Email and phone discoverability settings](https://help.x.com/en/safety-and-security/email-and-phone-discoverability-settings) — oficial; acesso em 2026-10-17.
- [Facebook Help (arquivo de 2016) — Basic privacy settings & tools](https://web-wp.archive.org/web/20160601070649/https:/www.facebook.com/help/325807937506242?ref=6pack) — oficial (arquivada); acesso em 2026-10-17.
- [Website Builder Expert — How to create a Facebook business page](https://www.websitebuilderexpert.com/news/create-facebook-business-page/) — secundária; acesso em 2026-10-17.
- [Lei 13.709/2018 (LGPD) — texto compilado no Planalto](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm) — norma; acesso em 2026-10-17. O servidor do Planalto respondeu HTTP 503 na data de acesso; os artigos citados seguem o texto legal vigente e devem ser reconferidos na fonte.
- [ANPD — Guia orientativo: tratamento de dados pessoais pelo Poder Público (v2.0, jun/2023), cópia institucional](https://privacidade.unicamp.br/arquivo/uploads/guia-poder-publico-anpd-versao-final/) — oficial (cópia); acesso em 2026-10-17.
- [Lei 12.965/2014 (Marco Civil da Internet), art. 15 — guarda de registros de acesso por 6 meses](https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm) — norma; acesso em 2026-10-17. Referência normativa; página não acessada nesta rodada.
- [Decreto 8.727/2016 — uso do nome social na administração pública federal](https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8727.htm) — norma; acesso em 2026-10-17. Referência normativa; página não acessada nesta rodada.
- Documentos internos: `docs/arquitetura/TAXONOMIA.md` §1, `docs/produto/ABAS_POR_PERFIL.md`, `docs/produto/CADASTRO_E_LGPD.md`, `docs/produto/REDE_PROFISSIONAL_VISIBILIDADE.md`, `docs/DECISOES.md` (Q-63, Q-64, Q-67, Q-83).

<!-- gerado:fim -->
