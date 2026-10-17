#!/usr/bin/env python3
"""Catálogo de dados de perfil por tipo — Work Station (Velion / Orange Social).

Contém, como dados estruturados, o catálogo de campos de perfil pesquisado em redes profissionais e sociais
(LinkedIn, Xing, Behance, Dribbble, GitHub, Glassdoor, Indeed, Viva Engage, Slack, Teams, gov.br, Lattes, ORCID,
Instagram, X, Facebook) e classificado pela LGPD (Lei 13.709/2018). Para cada campo diz se já existe no modelo
atual, conferindo por expressão regular os arquivos-fonte (`User.java`, `UserView.java` e entidades vizinhas).

Gera:
  docs/produto/DADOS_DE_PERFIL_POR_TIPO.json
  docs/produto/DADOS_DE_PERFIL_POR_TIPO.md   (só a seção entre <!-- gerado:inicio --> e <!-- gerado:fim -->)

Uso:
  python3 scripts/pesquisa/perfis/campos.py           # regrava os dois arquivos
  python3 scripts/pesquisa/perfis/campos.py --check   # falha (código 1) se algum estiver desatualizado

Só biblioteca padrão. A saída é determinística (sem data de execução), para que o --check seja estável.
A situação "existe/parcial/ausente" reflete a árvore de trabalho no momento da execução.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[3]
SAIDA_JSON = RAIZ / "docs/produto/DADOS_DE_PERFIL_POR_TIPO.json"
SAIDA_MD = RAIZ / "docs/produto/DADOS_DE_PERFIL_POR_TIPO.md"
INICIO = "<!-- gerado:inicio -->"
FIM = "<!-- gerado:fim -->"
DATA_ACESSO = "2026-10-17"
VERSAO_CATALOGO = "1.0"

# --------------------------------------------------------------------------------------------- vocabulário
PERFIS = ("EMPREGADO", "EMPRESA", "CHEFE_DEPARTAMENTO", "CURADOR", "ADMIN", "VISITANTE")
ABREV = {"EMPREGADO": "EMP", "EMPRESA": "EMPRESA", "CHEFE_DEPARTAMENTO": "CHEFE", "CURADOR": "CUR", "ADMIN": "ADM",
         "VISITANTE": "VIS"}
EXIGENCIA = {"O": "obrigatorio", "P": "opcional", "N": "nao_se_aplica"}
EXIGENCIA_MD = {"O": "**Obr**", "P": "Opc", "N": "—"}

GRUPOS = {
    "identificacao": "Identificação",
    "contato": "Contato",
    "profissional": "Profissional",
    "portfolio": "Portfólio",
    "social": "Social",
    "privacidade": "Privacidade",
    "seguranca": "Segurança",
    "preferencias": "Preferências",
    "institucional": "Institucional",
}

LGPD = {
    "nao_pessoal": "Dado de pessoa jurídica ou configuração sem titular identificável (fora do art. 5º, I).",
    "pessoal": "Dado pessoal comum (art. 5º, I), coletado com finalidade declarada (art. 6º, I).",
    "pessoal_protegido": "Dado pessoal comum que pede proteção reforçada — cifragem, acesso mínimo e trilha (art. 46): "
                         "credenciais, contato, IP, documentos.",
    "sensivel": "Dado pessoal sensível (art. 5º, II). NÃO coletar; só nas hipóteses estritas do art. 11.",
    "proibido_sem_base_legal": "Dado pessoal sem finalidade no produto: coleta vedada pelos princípios da finalidade e da "
                               "necessidade (art. 6º, I e III) até haver base legal (art. 7º) e finalidade documentadas.",
}
LGPD_MD = {"nao_pessoal": "não pessoal", "pessoal": "pessoal", "pessoal_protegido": "pessoal (protegido)",
           "sensivel": "**SENSÍVEL**", "proibido_sem_base_legal": "**proibido s/ base**"}

VISIBILIDADE = {
    "publico": "Qualquer pessoa, inclusive visitante — respeitada a descoberta do perfil.",
    "empresa": "Pessoas logadas da mesma empresa (RF19.CA02).",
    "so_eu": "Só o titular; ADMIN apenas por fluxo auditado.",
    "interno": "Nunca exibido, nem ao titular (hash, segredo, log técnico).",
}
VISIBILIDADE_MD = {"publico": "público", "empresa": "empresa", "so_eu": "só eu", "interno": "interno"}
PRIORIDADES = {"P1": "alta", "P2": "média", "P3": "baixa"}

# --------------------------------------------------------------------------------------------- fontes
URLS: dict[str, dict] = {
    "linkedin_intro": {"titulo": "LinkedIn Help — Information displayed on the introduction section of your profile",
                       "url": "https://www.linkedin.com/help/billing/answer/38579", "tipo": "oficial"},
    "linkedin_verif": {"titulo": "LinkedIn Help — Verifications on LinkedIn (identidade, local de trabalho, instituição)",
                       "url": "https://www.linkedin.com/help/linkedin/answer/a1492056", "tipo": "oficial"},
    "linkedin_verif2": {"titulo": "LinkedIn Help — Verification on your LinkedIn profile",
                        "url": "https://www.linkedin.com/help/linkedin/answer/140551", "tipo": "oficial"},
    "linkedin_mentions": {"titulo": "LinkedIn Help — Mentions, tags, and collaborations setting",
                          "url": "https://www.linkedin.com/help/learning/answer/85430", "tipo": "oficial"},
    "linkedin_privacy": {"titulo": "LinkedIn Privacy Settings: How to Control Who Sees Your Posts (2026 Guide)",
                         "url": "https://linkedinpreview.com/blog/linkedin-privacy-settings-2026", "tipo": "secundária"},
    "linkedin_page_claim": {"titulo": "LinkedIn Help — Claim a LinkedIn Listing Page (representante autorizado)",
                            "url": "https://www.linkedin.com/help/linkedin/answer/55962", "tipo": "oficial"},
    "linkedin_page_g2": {"titulo": "G2 — How to Create a LinkedIn Page for Your Business in 4 Steps",
                         "url": "https://learn.g2.com/linkedin-business-page", "tipo": "secundária"},
    "xing_leuphana": {"titulo": "Leuphana Career Service — Your digital profile (XING)",
                      "url": "https://www.leuphana.de/en/services/career-service/application/your-digital-profile.html",
                      "tipo": "secundária"},
    "xing_mannheim": {"titulo": "Universität Mannheim — XING information (privacidade)",
                      "url": "https://www.uni-mannheim.de/en/data-protection-declaration/xing-information/",
                      "tipo": "secundária"},
    "behance_hire": {"titulo": "Behance Help — Guide: Hire Me",
                     "url": "https://help.behance.net/hc/en-us/articles/8832406918811-Guide-Hire-Me", "tipo": "oficial"},
    "behance_adobe": {"titulo": "Adobe Community — Changing your profile information",
                      "url": "https://community.adobe.com/announcements-34/changing-your-profile-information-20262",
                      "tipo": "oficial"},
    "dribbble_discovered": {"titulo": "Dribbble Stories — Let's get discovered (2020)",
                            "url": "https://dribbble.com/stories/2020/04/16/lets-get-discovered", "tipo": "oficial"},
    "dribbble_work": {"titulo": "Dribbble Stories — How to get the work you love on Dribbble (2019)",
                      "url": "https://dribbble.com/stories/2019/09/20/how-to-get-the-work-you-love-on-dribbble",
                      "tipo": "oficial"},
    "github_profile": {"titulo": "GitHub Docs — Personalize your profile",
                       "url": "https://docs.github.com/en/account-and-profile/tutorials/personalize-your-profile",
                       "tipo": "oficial"},
    "github_private": {"titulo": "GitHub Docs — Setting your profile to private",
                       "url": "https://docs.github.com/en/account-and-profile/setting-up-and-managing-your-github-profile/"
                              "customizing-your-profile/setting-your-profile-to-private", "tipo": "oficial"},
    "github_2fa": {"titulo": "GitHub Docs — Configuring two-factor authentication recovery methods",
                   "url": "https://docs.github.com/en/authentication/securing-your-account-with-two-factor-authentication-2fa/"
                          "configuring-two-factor-authentication-recovery-methods", "tipo": "oficial"},
    "github_sessions": {"titulo": "GitHub Docs — Viewing and managing your sessions",
                        "url": "https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/"
                               "viewing-and-managing-your-sessions", "tipo": "oficial"},
    "github_org_domain": {"titulo": "GitHub Docs — Verifying or approving a domain for your organization",
                          "url": "https://docs.github.com/en/enterprise-server@3.20/organizations/"
                                 "managing-organization-settings/verifying-or-approving-a-domain-for-your-organization",
                          "tipo": "oficial"},
    "glassdoor_profile": {"titulo": "Glassdoor for Employers — Free employer profile guide",
                          "url": "https://www.guide.glassdoor.com/gdprofile", "tipo": "oficial"},
    "indeed_prefs": {"titulo": "Indeed Help — Adding or editing job search preferences",
                     "url": "https://www.indeed.com/help/job-seekers/articles/32603395892109-adding-or-editing-job-search-preferences",
                     "tipo": "oficial"},
    "indeed_privacy": {"titulo": "Indeed Help (CA) — preferências visíveis a empregadores",
                       "url": "https://support.indeed.com/hc/en-ca/articles/360051197532", "tipo": "oficial"},
    "viva_lifecycle": {"titulo": "Microsoft Learn — Manage Viva Engage users across their lifecycle",
                       "url": "https://learn.microsoft.com/viva/engage/manage-viva-engage-users/manage-users-across-their-lifecycle",
                       "tipo": "oficial"},
    "slack_edit": {"titulo": "Slack Help — Edit your profile",
                   "url": "https://slack.com/help/articles/204092246", "tipo": "oficial"},
    "slack_custom": {"titulo": "Slack Help — Customize member profiles",
                     "url": "https://slack.com/help/articles/212281478-Customize-member-profiles", "tipo": "oficial"},
    "teams_card": {"titulo": "Microsoft Support — Profile cards in Microsoft 365",
                   "url": "https://support.microsoft.com/en-us/Outlook/profile-cards-in-microsoft-365", "tipo": "oficial"},
    "govbr_niveis": {"titulo": "gov.br — Níveis da conta gov.br (bronze, prata, ouro)",
                     "url": "https://www.gov.br/governodigital/pt-br/identidade/conta-gov-br/niveis-da-conta-govbr",
                     "tipo": "oficial"},
    "lattes_manual": {"titulo": "CNPq — Manual da Plataforma Lattes",
                      "url": "https://www.gov.br/cnpq/pt-br/teste-nova-capa-2024/manuais-de-uso-das-plataformas-do-cnpq/FINAL_Manual_Lattes.pdf",
                      "tipo": "oficial"},
    "lattes_ufgd": {"titulo": "UFGD — Manual de cadastramento de Currículo Lattes (2018)",
                    "url": "https://files.ufgd.edu.br/arquivos/arquivos/78/INICIACAO-CIENTIFICA-PROPP/"
                           "Manual%20de%20cadastramento%20de%20Curr%C3%ADculo%20Lattes-CNPq%20-%202018.pdf",
                    "tipo": "secundária"},
    "orcid_visibility": {"titulo": "ORCID Support — Visibility settings",
                         "url": "https://support.orcid.org/hc/articles/360006897614", "tipo": "oficial"},
    "orcid_register": {"titulo": "ORCID Support — Register your ORCID iD",
                       "url": "https://support.orcid.org/hc/articles/360006897454", "tipo": "oficial"},
    "instagram_verified": {"titulo": "Instagram Help — Eligibility requirements for Meta Verified profiles",
                           "url": "https://help.instagram.com/2419286908233223/", "tipo": "oficial"},
    "instagram_privacy": {"titulo": "Dummies — Managing your Instagram privacy settings",
                          "url": "https://www.dummies.com/article/technology/social-media/general-social-media/"
                                 "managing-your-instagrams-privacy-settings-261592/", "tipo": "secundária"},
    "x_birthday": {"titulo": "X Help — About profile visibility settings (data de nascimento)",
                   "url": "https://help.x.com/en/safety-and-security/birthday-visibility-settings", "tipo": "oficial"},
    "x_profile": {"titulo": "X Help — How to customize your profile",
                  "url": "https://help.x.com/en/managing-your-account/how-to-customize-your-profile", "tipo": "oficial"},
    "x_discover": {"titulo": "X Help — Email and phone discoverability settings",
                   "url": "https://help.x.com/en/safety-and-security/email-and-phone-discoverability-settings",
                   "tipo": "oficial"},
    "facebook_audience": {"titulo": "Facebook Help (arquivo de 2016) — Basic privacy settings & tools",
                          "url": "https://web-wp.archive.org/web/20160601070649/https:/www.facebook.com/help/325807937506242?ref=6pack",
                          "tipo": "oficial (arquivada)"},
    "facebook_page": {"titulo": "Website Builder Expert — How to create a Facebook business page",
                      "url": "https://www.websitebuilderexpert.com/news/create-facebook-business-page/",
                      "tipo": "secundária"},
    "lgpd": {"titulo": "Lei 13.709/2018 (LGPD) — texto compilado no Planalto",
             "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm", "tipo": "norma",
             "obs": "O servidor do Planalto respondeu HTTP 503 na data de acesso; os artigos citados seguem o texto legal "
                    "vigente e devem ser reconferidos na fonte."},
    "anpd_poder_publico": {"titulo": "ANPD — Guia orientativo: tratamento de dados pessoais pelo Poder Público (v2.0, jun/2023), cópia institucional",
                           "url": "https://privacidade.unicamp.br/arquivo/uploads/guia-poder-publico-anpd-versao-final/",
                           "tipo": "oficial (cópia)"},
    "marco_civil": {"titulo": "Lei 12.965/2014 (Marco Civil da Internet), art. 15 — guarda de registros de acesso por 6 meses",
                    "url": "https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm", "tipo": "norma",
                    "obs": "Referência normativa; página não acessada nesta rodada."},
    "decreto_nome_social": {"titulo": "Decreto 8.727/2016 — uso do nome social na administração pública federal",
                            "url": "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2016/decreto/d8727.htm",
                            "tipo": "norma", "obs": "Referência normativa; página não acessada nesta rodada."},
}

# Cada site/referência resume o que a pesquisa encontrou. "(não conferido)" marca o que não foi confirmado em fonte
# acessada nesta rodada.
SITES: dict[str, dict] = {
    "linkedin": {
        "nome": "LinkedIn (perfil pessoal)", "categoria": "rede profissional",
        "cadastro": "e-mail ou telefone, senha, nome e sobrenome (não conferido nesta rodada)",
        "publico": "Intro: nome, foto, foto de fundo, headline, cargo atual (vem de Experiência), formação, localização, "
                   "setor (um só), informações de contato e 'Open to' (trabalho, contratação, serviços)",
        "privacidade": "opções de visualização de perfil (nome+headline, características privadas, modo privado); perfil "
                       "público editável e indexação por buscadores; quem pode seguir (todos ou conexões); compartilhar "
                       "edições do perfil; permitir menções, marcações e colaborações (desligar não apaga as existentes)",
        "seguranca": "verificação em duas etapas e sessões (não conferido nesta rodada)",
        "verificacao": "gratuita: identidade (documento oficial via CLEAR, Persona ou DigiLocker), local de trabalho "
                       "(e-mail corporativo, Microsoft Entra Verified ID ou licença LinkedIn Learning) e instituição de "
                       "ensino",
        "urls": ["linkedin_intro", "linkedin_verif", "linkedin_verif2", "linkedin_mentions", "linkedin_privacy"],
    },
    "linkedin_page": {
        "nome": "LinkedIn (Company Page)", "categoria": "página de organização",
        "cadastro": "nome, URL da página, setor, porte (faixa), tipo de organização e declaração de representante "
                    "autorizado (caixa de seleção); site, logo e slogan (≤120 caracteres) opcionais",
        "publico": "nome, logo, slogan, sobre, site, setor, porte, tipo",
        "privacidade": "—",
        "seguranca": "administração da página por pessoas com vínculo e e-mail verificado (fonte secundária)",
        "verificacao": "declaração de representante; vínculo do empregado verificável por e-mail corporativo",
        "urls": ["linkedin_page_g2", "linkedin_page_claim", "linkedin_verif"],
    },
    "xing": {
        "nome": "XING", "categoria": "rede profissional (DACH)",
        "cadastro": "não conferido nesta rodada",
        "publico": "carreira (cargos com descrição das atribuições), formação, 'desejos de emprego'; muitos dados ficam "
                   "visíveis inclusive a não membros",
        "privacidade": "desejos de emprego visíveis só a recrutadores ou a todos os membros; restrições no menu Privacidade",
        "seguranca": "não conferido", "verificacao": "não conferido",
        "urls": ["xing_leuphana", "xing_mannheim"],
    },
    "behance": {
        "nome": "Behance", "categoria": "portfólio criativo",
        "cadastro": "conta Adobe (não conferido)",
        "publico": "dados do perfil da comunidade Adobe: ocupação, site, empregador, localização; projetos",
        "privacidade": "interruptor 'mostrar todas as informações no perfil da comunidade'",
        "seguranca": "herdada da conta Adobe (não conferido)",
        "verificacao": "—; disponibilidade 'Hire me' (tempo integral, freelance) leva o perfil à página de contratação",
        "urls": ["behance_hire", "behance_adobe"],
    },
    "dribbble": {
        "nome": "Dribbble", "categoria": "portfólio criativo",
        "cadastro": "não conferido",
        "publico": "nome, localização, bio, links sociais e site; botão 'hire me' (Pro)",
        "privacidade": "interruptor de disponibilidade (freelance ou tempo integral)",
        "seguranca": "não conferido",
        "verificacao": "—; guia de 2019 cita salário mínimo e valor por hora (pode estar desatualizado)",
        "urls": ["dribbble_discovered", "dribbble_work"],
    },
    "github": {
        "nome": "GitHub (perfil pessoal)", "categoria": "rede técnica",
        "cadastro": "nome de usuário, e-mail e senha (não conferido); o 'nome do perfil' é obrigatório e não precisa ser o civil",
        "publico": "foto, nome, bio (≤160), pronomes (só para logados), localização, hora local opcional com fuso, até 4 "
                   "redes sociais, ORCID iD, status (mensagem, 'ocupado', expiração)",
        "privacidade": "perfil privado (oculta conquistas, atividade, gráfico de contribuições, contadores e botão seguir; "
                       "README, bio e foto seguem públicos; não vale para atividade passada); ocultar conquistas; status "
                       "visível só a uma organização",
        "seguranca": "2FA com códigos de recuperação de uso único (gerar novo conjunto invalida o anterior); lista de "
                     "sessões e dispositivos com revogação; log de segurança que não apaga eventos",
        "verificacao": "e-mails verificados (não há selo pessoal)",
        "urls": ["github_profile", "github_private", "github_2fa", "github_sessions"],
    },
    "github_org": {
        "nome": "GitHub (organização)", "categoria": "página de organização",
        "cadastro": "não conferido",
        "publico": "nome, e-mail e site exibidos no perfil",
        "privacidade": "—",
        "seguranca": "proprietários da organização (não conferido)",
        "verificacao": "domínio verificado por registro DNS TXT dá o selo 'Verified'; site e e-mail exibidos devem estar "
                       "em domínios verificados",
        "urls": ["github_org_domain"],
    },
    "glassdoor": {
        "nome": "Glassdoor (empresa)", "categoria": "reputação de empregador",
        "cadastro": "perfil de empregador reivindicado (não conferido)",
        "publico": "site, total de empregados, cidade da sede, ano de fundação, receita anual, setor, indústria, tipo de "
                   "empresa, situação, concorrentes, locais, história; logo, dados básicos, locais e líder (CEO) "
                   "compartilhados em todos os perfis",
        "privacidade": "—", "seguranca": "não conferido", "verificacao": "não conferido",
        "urls": ["glassdoor_profile"],
    },
    "indeed": {
        "nome": "Indeed (candidato)", "categoria": "busca de emprego",
        "cadastro": "não conferido",
        "publico": "preferências: cargos, áreas, tipo de vaga, jornada, remuneração, deslocamento, mudança, remoto",
        "privacidade": "lista 'não interessado'; empregadores não veem pretensão salarial nem 'não interessado' (varia "
                       "por país); opção que decide se empregadores podem encontrar o perfil",
        "seguranca": "não conferido", "verificacao": "—",
        "urls": ["indeed_prefs", "indeed_privacy"],
    },
    "viva_engage": {
        "nome": "Microsoft Viva Engage (ex-Yammer)", "categoria": "rede social corporativa",
        "cadastro": "conta do Microsoft 365 / Entra ID (provisionada pela organização)",
        "publico": "nome, departamento e demais propriedades sincronizadas do Entra ID",
        "privacidade": "quem tem conta M365 não edita o perfil no Engage; propriedades 'About Me' não sincronizadas "
                       "(escolas, expertise, interesses) foram aposentadas",
        "seguranca": "herdada do Entra ID", "verificacao": "vínculo garantido pelo diretório",
        "urls": ["viva_lifecycle"],
    },
    "slack": {
        "nome": "Slack (perfil de membro)", "categoria": "comunicação corporativa",
        "cadastro": "convite do workspace (não conferido)",
        "publico": "nome completo, nome de exibição, gravação e pronúncia do nome, telefone, fuso, cargo; pronomes ocultos "
                   "até o admin habilitar; campos personalizados pelo admin (local, data de início, redes sociais)",
        "privacidade": "campos com cadeado só o admin edita; campo personalizado pode ou não aparecer na busca; "
                       "sincronização SCIM com o provedor de identidade",
        "seguranca": "não conferido", "verificacao": "vínculo pelo workspace",
        "urls": ["slack_edit", "slack_custom"],
    },
    "teams": {
        "nome": "Microsoft Teams / cartão de perfil M365", "categoria": "comunicação corporativa",
        "cadastro": "conta do Microsoft 365 / Entra ID",
        "publico": "foto, nome, pronúncia do nome, pronomes, contato, disponibilidade, local de trabalho, organograma "
                   "(gestor e subordinados), cargo, departamento, escritório",
        "privacidade": "parte do cartão é controlada pela organização; o que o admin não sincroniza não aparece",
        "seguranca": "herdada do Entra ID", "verificacao": "vínculo garantido pelo diretório",
        "urls": ["teams_card"],
    },
    "govbr": {
        "nome": "gov.br (conta do cidadão)", "categoria": "identidade digital pública",
        "cadastro": "formulário validado nas bases da Receita Federal ou do INSS (identificador CPF), ou presencial",
        "publico": "—",
        "privacidade": "—",
        "seguranca": "verificação em duas etapas só a partir do nível prata",
        "verificacao": "níveis bronze (cadastro validado), prata (facial na base da CNH, internet banking credenciado ou "
                       "SIGEPE) e ouro (facial na base do TSE, QR Code da CIN ou certificado ICP-Brasil) — 'selos de "
                       "confiabilidade'",
        "urls": ["govbr_niveis"],
    },
    "lattes": {
        "nome": "Currículo Lattes (CNPq)", "categoria": "currículo acadêmico",
        "cadastro": "manual de 2018: foto, nomes, data e país de nascimento, cor ou raça, sexo e nome da mãe obrigatórios; "
                    "CPF e nome da mãe conferidos na Receita Federal",
        "publico": "texto de apresentação, formação, atuação profissional (só com vínculo), produção, idiomas, prêmios",
        "privacidade": "identificação pessoal geralmente não divulgada ao público",
        "seguranca": "não conferido", "verificacao": "cruzamento com a Receita Federal",
        "urls": ["lattes_manual", "lattes_ufgd"],
    },
    "orcid": {
        "nome": "ORCID", "categoria": "identificador de pesquisador",
        "cadastro": "nome (sobrenome opcional), e-mail principal confirmado, senha e visibilidade padrão obrigatória; "
                    "e-mail de backup recomendado",
        "publico": "nome, biografia, emprego, educação, obras (cada item com visibilidade própria); o iD é sempre público",
        "privacidade": "por item: Todos, Partes confiáveis, Só eu; e-mail privado por padrão; delegados podem gerir o registro",
        "seguranca": "não conferido", "verificacao": "afirmações feitas por organizações confiáveis",
        "urls": ["orcid_visibility", "orcid_register"],
    },
    "instagram": {
        "nome": "Instagram", "categoria": "rede social geral",
        "cadastro": "não conferido",
        "publico": "nome, @, foto, bio; conta profissional com categoria",
        "privacidade": "conta privada (só seguidores aprovados; fora do Explorar e das hashtags); status de atividade "
                       "(desligar também oculta o dos outros); revisão de marcações; contas profissionais não podem ser "
                       "privadas (fonte secundária)",
        "seguranca": "2FA exigido para o Meta Verified",
        "verificacao": "Meta Verified: ≥18 anos, nome completo, foto com rosto, atividade mínima, documento oficial "
                       "compatível e 2FA; depois de verificado, mudar nome, foto, @ ou data de nascimento exige nova verificação",
        "urls": ["instagram_verified", "instagram_privacy"],
    },
    "x": {
        "nome": "X (ex-Twitter)", "categoria": "rede social geral",
        "cadastro": "não conferido",
        "publico": "bio, localização, site e foto sempre públicos; data de nascimento com visibilidade própria",
        "privacidade": "ano e dia/mês do nascimento com públicos separados (Público, Seguidores, Quem você segue, "
                       "Seguem-se mutuamente, Só você — padrão 'Só você' desde 2022); ser encontrado por e-mail/telefone "
                       "desligável (e-mail e telefone nunca exibidos); perfil e posts públicos podem ser indexados",
        "seguranca": "não conferido", "verificacao": "não conferido",
        "urls": ["x_birthday", "x_profile", "x_discover"],
    },
    "facebook": {
        "nome": "Facebook (perfil e Página)", "categoria": "rede social geral",
        "cadastro": "Página: nome, categoria (até 3), bio (≤101 caracteres, opcional); depois contato, localização, horários; "
                    "a Página é gerida a partir de um perfil pessoal (fontes secundárias)",
        "publico": "perfil: dados do Intro com público por item; Página: nome, categoria, bio, site, telefone, e-mail, endereço",
        "privacidade": "seletor de público (Público, Amigos, Só eu, listas) lembrado entre publicações (página de 2016)",
        "seguranca": "não conferido", "verificacao": "Meta Verified (ver Instagram)",
        "urls": ["facebook_audience", "facebook_page", "instagram_verified"],
    },
    "lgpd": {"nome": "LGPD (Lei 13.709/2018)", "categoria": "norma", "urls": ["lgpd"]},
    "anpd": {"nome": "ANPD", "categoria": "orientação", "urls": ["anpd_poder_publico"]},
    "marco_civil": {"nome": "Marco Civil da Internet", "categoria": "norma", "urls": ["marco_civil"]},
    "nome_social": {"nome": "Decreto 8.727/2016", "categoria": "norma", "urls": ["decreto_nome_social"]},
    "ws_docs": {"nome": "Documentos do Work Station", "categoria": "interno",
                "urls": []},
}
SITES_PESQUISADOS = [k for k, v in SITES.items() if "cadastro" in v]

# --------------------------------------------------------------------------------------------- modelo atual
_D = "ws-domain/src/main/java/br/gov/pr/secid/workstation/domain"
_A = "ws-application/src/main/java/br/gov/pr/secid/workstation/application"
MODELO: dict[str, tuple[str, str]] = {
    # entidade -> (arquivo, tipo de leitura); "record:Nome" lê os componentes daquele record no arquivo
    "User": (f"{_D}/identity/User.java", "classe"),
    "UserView": (f"{_A}/identity/UserView.java", "record:UserView"),
    "ProfileUpdate": (f"{_A}/account/AccountService.java", "record:ProfileUpdate"),
    "SensitiveUpdate": (f"{_A}/account/AccountService.java", "record:SensitiveUpdate"),
    "UserPreferences": (f"{_D}/identity/UserPreferences.java", "classe"),
    "PreferenciasFront": ("lib/preferences/types.ts", "ts"),
    "Company": (f"{_D}/institutional/Company.java", "record:Company"),
    "Department": (f"{_D}/institutional/Department.java", "record:Department"),
    "DepartmentMembership": (f"{_D}/institutional/DepartmentMembership.java", "record:DepartmentMembership"),
    "CuratorAppointment": (f"{_D}/institutional/CuratorAppointment.java", "record:CuratorAppointment"),
    "EmpresaProfileExtension": (f"{_D}/institutional/EmpresaProfileExtension.java", "record:EmpresaProfileExtension"),
    "ChefeProfileExtension": (f"{_D}/institutional/ChefeProfileExtension.java", "record:ChefeProfileExtension"),
    "ApprovalRequest": (f"{_D}/institutional/ApprovalRequest.java", "record:ApprovalRequest"),
    "UserConsent": (f"{_D}/lgpd/UserConsent.java", "record:UserConsent"),
    "PolicyAcceptance": (f"{_D}/lgpd/PolicyAcceptance.java", "record:PolicyAcceptance"),
    "DataExportRequest": (f"{_D}/lgpd/DataExportRequest.java", "record:DataExportRequest"),
    "DeliberativeProfile": (f"{_D}/gamificacao/DeliberativeProfile.java", "record:DeliberativeProfile"),
    "Follow": (f"{_D}/social/Follow.java", "record:Follow"),
    "RefreshToken": ("ws-infrastructure/persistence-mysql/src/main/java/br/gov/pr/secid/workstation/infrastructure/"
                     "mysql/identity/RefreshTokenEntity.java", "classe"),
}

_STR_OU_COMENT = re.compile(r'"(?:\\.|[^"\\])*"|/\*.*?\*/|//[^\n]*', re.S)
_ANOT = re.compile(r"@\w+(?:\.\w+)*(?:\([^()]*\))?")
_CAMPO_CLASSE = re.compile(r"^\s*private\s+(?:static\s+)?(?:final\s+)?[\w<>\[\],.?\s]+?\s+(\w+)\s*(?:=[^;]*)?;", re.M)
_TS_PROP = re.compile(r"^\s*(?:readonly\s+)?(\w+)\??\s*:", re.M)


def _sem_strings_e_comentarios(texto: str) -> str:
    """Uma passada só: '//' dentro de string (ex.: "https://") não abre comentário."""
    return _STR_OU_COMENT.sub(lambda m: '""' if m.group(0).startswith('"') else " ", texto)


def _limpar_java(texto: str) -> str:
    texto = _sem_strings_e_comentarios(texto)
    anterior = None
    while anterior != texto:  # anotações aninhadas
        anterior, texto = texto, _ANOT.sub(" ", texto)
    return texto


def _componentes_record(texto: str, nome: str) -> set[str]:
    m = re.search(r"\brecord\s+" + re.escape(nome) + r"\s*\(", texto)
    if not m:
        return set()
    i, prof, ini = m.end(), 1, m.end()
    while i < len(texto) and prof:
        prof += {"(": 1, ")": -1}.get(texto[i], 0)
        i += 1
    corpo, partes, atual, ang = texto[ini:i - 1], [], "", 0
    for ch in corpo:
        ang += {"<": 1, ">": -1}.get(ch, 0)
        if ch == "," and ang == 0:
            partes.append(atual)
            atual = ""
        else:
            atual += ch
    partes.append(atual)
    nomes = set()
    for p in partes:
        tokens = re.findall(r"\w+", p)
        if tokens:
            nomes.add(tokens[-1])
    return nomes


def ler_modelo() -> tuple[dict[str, set[str]], list[str]]:
    """Lê os arquivos do modelo por regex. Arquivo ausente vira conjunto vazio e é listado."""
    cache: dict[str, str] = {}
    campos: dict[str, set[str]] = {}
    ausentes: list[str] = []
    for entidade, (rel, modo) in MODELO.items():
        caminho = RAIZ / rel
        if not caminho.exists():
            campos[entidade] = set()
            ausentes.append(rel)
            continue
        bruto = cache.setdefault(rel, caminho.read_text(encoding="utf-8"))
        if modo == "ts":
            campos[entidade] = set(_TS_PROP.findall(_sem_strings_e_comentarios(bruto)))
        elif modo == "classe":
            campos[entidade] = set(_CAMPO_CLASSE.findall(_limpar_java(bruto)))
        else:
            campos[entidade] = _componentes_record(_limpar_java(bruto), modo.split(":", 1)[1])
    return campos, sorted(set(ausentes))


# --------------------------------------------------------------------------------------------- catálogo
@dataclass
class Campo:
    id: str
    rotulo: str
    tipo: str
    grupo: str
    perfis: str  # 6 letras O/P/N na ordem de PERFIS
    lgpd: str
    vis: str
    fontes: str = ""
    modelo: str = ""  # "Entidade.campo" separados por espaço
    prioridade: str = ""  # P1/P2/P3 quando ainda não existe (ou existe só em parte)
    onde: str = ""  # onde entraria no modelo
    nota: str = ""
    parcial: bool = False  # o que existe cobre só parte do campo
    rank: int = 99  # ordem entre as lacunas de mesma prioridade
    vis_por_perfil: dict = field(default_factory=dict)


def C(*a, **k) -> Campo:
    return Campo(*a, **k)


CAMPOS: list[Campo] = [
    # ------------------------------------------------------------------------------------- identificação
    C("nome_usuario", "Nome de usuário (@)", "texto 3–80, único; imutável após verificação", "identificacao", "OOOOON",
      "pessoal", "publico", "github x instagram slack", "User.username"),
    C("nome_completo", "Nome completo (civil ou social)", "texto 3–160", "identificacao", "OOOOON", "pessoal", "publico",
      "linkedin xing govbr lattes orcid github nome_social", "User.fullName",
      nota="Aceitar nome social. Na conta EMPRESA é o nome da pessoa responsável (só ela e o ADMIN veem); a página "
           "pública usa o nome da organização.", vis_por_perfil={"EMPRESA": "so_eu"}),
    C("nome_exibicao", "Nome de exibição", "texto ≤80", "identificacao", "PNPPPN", "pessoal", "publico",
      "slack github x instagram", "User.displayName"),
    C("pronomes", "Pronomes", "texto curto (sugestões + livre)", "identificacao", "PNPPPN", "pessoal", "empresa",
      "github slack teams", prioridade="P3", onde="User.pronouns (≤40) + ProfileUpdate",
      nota="Opcional e livre; nunca perguntar sexo/gênero. GitHub mostra só a quem está logado; Slack deixa oculto até o "
           "admin habilitar."),
    C("pronuncia_nome", "Pronúncia do nome", "texto ≤80 (áudio opcional)", "identificacao", "PNPPPN", "pessoal", "empresa",
      "slack teams", prioridade="P3", onde="User.namePronunciation"),
    C("foto_perfil", "Foto de perfil", "imagem (URL interna, sem EXIF)", "identificacao", "PNPPPN", "pessoal", "publico",
      "linkedin github instagram slack teams", "User.avatarUrl",
      nota="Nunca usar para reconhecimento facial (biometria é dado sensível). EMPRESA usa o logotipo."),
    C("capa", "Imagem de capa", "imagem", "identificacao", "PPPPPN", "pessoal", "publico", "linkedin", "User.coverUrl"),
    C("tipo_perfil", "Tipo de perfil", "enum EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO", "identificacao", "OOOOON",
      "pessoal", "publico", "linkedin linkedin_page github github_org facebook", "User.profileType",
      nota="Perfil de pessoa × página de organização, como LinkedIn, GitHub e Facebook separam."),
    C("membro_desde", "Membro desde", "data (sistema)", "identificacao", "OOOOON", "pessoal", "publico", "ws_docs",
      "User.createdAt"),
    C("localizacao", "Localização (cidade/UF, país)", "texto ou código IBGE", "identificacao", "PNPPPN", "pessoal",
      "empresa", "linkedin github dribbble x", prioridade="P2", onde="User.locationCity/UF (nunca endereço)",
      nota="Só cidade/região; guias do LinkedIn desaconselham endereço. EMPRESA usa a sede (grupo institucional)."),
    C("selo_verificado", "Selo de verificação", "booleano (sistema)", "identificacao", "POOPPN", "pessoal", "publico",
      "linkedin github_org instagram govbr", "User.verified",
      nota="EMPRESA e CHEFE só ficam ACTIVE depois da validação do ADMIN (RF28)."),
    C("verificacao_metodo", "Método e data da verificação", "enum (EMAIL_INSTITUCIONAL, DOMINIO, ATO_OFICIAL, CNPJ, "
      "GOVBR) + data", "identificacao", "POOPPN", "pessoal", "publico", "linkedin govbr github_org",
      "ApprovalRequest.reviewedAt ApprovalRequest.policyVersion", parcial=True, prioridade="P2",
      onde="User.verifiedAt + User.verificationMethod (derivados do ApprovalRequest aprovado)",
      nota="LinkedIn mostra o tipo de verificação (identidade, local de trabalho, instituição); o gov.br mostra selos "
           "por nível. Hoje o dado está só no pedido de validação, não no perfil."),
    C("email_institucional_verificado", "Vínculo verificado por e-mail institucional", "data + domínio",
      "identificacao", "PNOPPN", "pessoal", "empresa", "linkedin", prioridade="P2",
      onde="User.workEmailVerifiedAt + domínio (VerificationPolicy.freeMailDomainsJson recusa domínios gratuitos)",
      nota="Equivale à verificação de local de trabalho do LinkedIn."),
    C("identificadores_academicos", "ORCID iD / Currículo Lattes", "URL validada", "identificacao", "PNPPPN", "pessoal",
      "publico", "github orcid lattes", prioridade="P3", onde="user_links (tipo ORCID, LATTES)"),
    # não coletar
    C("data_nascimento", "Data de nascimento", "data", "identificacao", "NNNNNN", "proibido_sem_base_legal", "so_eu",
      "x instagram lattes",
      nota="Só se a Q-63 admitir menores (aprendizes, estagiários): então obrigatória no servidor e cifrada, para aplicar "
           "o art. 14. Sem isso, basta a declaração 'tenho 18 anos ou mais'."),
    C("cpf", "CPF", "11 dígitos", "identificacao", "NNNNNN", "proibido_sem_base_legal", "interno", "govbr lattes",
      nota="Nenhuma função do produto precisa do CPF. Exceção: login gov.br, cujo identificador do titular é o CPF — "
           "guardar só como oidcSubject cifrado, sem exibir nem usar como chave de negócio."),
    C("documento_identidade", "Documento de identidade (número ou imagem)", "arquivo/texto", "identificacao", "NNNNNN",
      "proibido_sem_base_legal", "interno", "linkedin instagram",
      nota="LinkedIn e Meta verificam com documento via parceiro; aqui a verificação é por vínculo (e-mail institucional, "
           "ato oficial, CNPJ). O UploadKind 'identity' não deve ser usado para pessoas sem base legal."),
    C("sexo_genero", "Sexo / gênero", "enum", "identificacao", "NNNNNN", "proibido_sem_base_legal", "so_eu", "lattes",
      nota="Sem finalidade. O Lattes exige 'sexo'; aqui bastam pronomes livres e opcionais."),
    C("cor_raca", "Cor, raça ou origem étnica", "enum", "identificacao", "NNNNNN", "sensivel", "so_eu", "lattes lgpd",
      nota="Obrigatório no Lattes; sensível pelo art. 5º, II. Não coletar."),
    C("religiao_politica_sindicato", "Religião, opinião política, filiação sindical ou partidária", "texto",
      "identificacao", "NNNNNN", "sensivel", "so_eu", "lgpd"),
    C("saude_deficiencia", "Saúde ou deficiência", "texto", "identificacao", "NNNNNN", "sensivel", "so_eu", "lattes lgpd",
      nota="Necessidades de acessibilidade entram como preferências (fonte, contraste, movimento), sem declarar condição."),
    C("vida_sexual", "Orientação ou vida sexual", "texto", "identificacao", "NNNNNN", "sensivel", "so_eu", "lgpd"),
    C("biometria", "Biometria (facial, digital, voz)", "modelo biométrico", "identificacao", "NNNNNN", "sensivel",
      "interno", "govbr instagram lgpd",
      nota="O gov.br usa reconhecimento facial nos níveis prata/ouro; se o produto precisar de nível alto, delegar ao "
           "gov.br e guardar só o nível retornado, nunca a biometria."),
    C("nome_mae", "Nome da mãe", "texto", "identificacao", "NNNNNN", "proibido_sem_base_legal", "interno", "lattes"),
    C("estado_civil", "Estado civil / relacionamento", "enum", "identificacao", "NNNNNN", "proibido_sem_base_legal",
      "so_eu", "facebook"),
    C("endereco_residencial", "Endereço residencial", "endereço", "identificacao", "NNNNNN", "proibido_sem_base_legal",
      "so_eu", "lattes"),

    # ------------------------------------------------------------------------------------- contato
    C("email_login", "E-mail de acesso", "e-mail (cifrado + hash para busca)", "contato", "OOOOON", "pessoal_protegido",
      "so_eu", "github orcid x slack linkedin", "User.email User.emailHash",
      nota="Para EMPRESA e CHEFE, e-mail do domínio institucional: domínio gratuito não prova representação."),
    C("email_confirmado", "E-mail confirmado", "booleano (sistema)", "contato", "OOOOON", "pessoal", "so_eu",
      "github orcid linkedin", "User.emailVerified"),
    C("email_recuperacao", "E-mail secundário de recuperação", "e-mail (cifrado)", "contato", "PPPPPN",
      "pessoal_protegido", "so_eu", "orcid", prioridade="P2", onde="User.recoveryEmail (cifrado) ou tabela user_emails",
      nota="ORCID recomenda e-mail de backup para não perder o acesso."),
    C("email_contato_publico", "E-mail de contato exibido no perfil", "e-mail", "contato", "PNPPPN", "pessoal", "publico",
      "linkedin github_org", prioridade="P3", onde="user_links (tipo EMAIL)",
      nota="Diferente do e-mail de acesso, que nunca é exibido."),
    C("telefone", "Telefone celular (E.164)", "texto E.164 (cifrado)", "contato", "PPPPPN", "pessoal_protegido", "so_eu",
      "slack teams x", "User.phone",
      nota="Opcional. O X nunca exibe telefone; aqui também não por padrão. SMS como 2FA é o fator mais fraco."),
    C("site_pessoal", "Site ou portfólio externo", "URL https", "contato", "PNPPPN", "pessoal", "publico",
      "github behance dribbble x", prioridade="P2", onde="user_links (tipo SITE)"),
    C("redes_sociais", "Links profissionais (até 4)", "lista de URL https", "contato", "PPPPPN", "pessoal", "publico",
      "github dribbble lattes slack", prioridade="P2", onde="user_links (userId, tipo, url, ordem, visibilidade)",
      nota="GitHub limita a 4 links; Slack permite campo personalizado de redes."),

    # ------------------------------------------------------------------------------------- profissional
    C("cargo", "Cargo / função", "texto ≤120", "profissional", "PNOPPN", "pessoal", "publico",
      "linkedin teams slack viva_engage", "User.jobTitle",
      nota="Recomendado ao EMPREGADO, sem bloquear o cadastro. Na conta EMPRESA guarda o cargo do responsável (privado). "
           "Para o CHEFE aparece como 'Chefe de {departamento}'."),
    C("headline", "Título profissional (headline)", "texto ≤120", "profissional", "PNPPPN", "pessoal", "publico",
      "linkedin xing", prioridade="P2", onde="User.headline + ProfileUpdate",
      nota="No LinkedIn aparece na busca ao lado do nome e é gerado do cargo atual quando vazio."),
    C("empresa_atual", "Empresa / órgão atual", "referência (lotação)", "profissional", "PNOOPN", "pessoal", "publico",
      "linkedin teams viva_engage", "User.companyId",
      nota="Definida pela lotação (RF28), nunca autodeclarada."),
    C("departamento", "Departamento (lotação)", "referência", "profissional", "PNOOPN", "pessoal", "publico",
      "teams viva_engage", "User.departmentId"),
    C("departamento_pretendido", "Departamento pretendido no cadastro", "referência", "profissional", "PNNNNN",
      "pessoal", "so_eu", "ws_docs", prioridade="P3", onde="User.intendedDepartmentId (proposta da TAXONOMIA §1.1)",
      nota="Não lota ninguém: quem lota é o chefe (RF28.CA02)."),
    C("periodo_lotacao", "Início e fim da lotação / chefia", "datas (sistema)", "profissional", "PNOOPN", "pessoal",
      "empresa", "slack linkedin", "DepartmentMembership.startedAt DepartmentMembership.endedAt"),
    C("experiencia", "Experiência profissional anterior", "lista (cargo, organização, período, descrição)",
      "profissional", "PNPPPN", "pessoal", "publico", "linkedin xing lattes", prioridade="P2",
      onde="ProfileExperience (userId, título, organização, início, fim, descrição, visibilidade)"),
    C("formacao", "Formação acadêmica", "lista (curso, instituição, período)", "profissional", "PNPPPN", "pessoal",
      "publico", "linkedin lattes orcid", prioridade="P2", onde="ProfileEducation (userId, curso, instituição, período)"),
    C("competencias", "Competências", "lista (vocabulário controlado + termo livre)", "profissional", "PNPPPN",
      "pessoal", "publico", "linkedin viva_engage xing ws_docs", prioridade="P1", rank=1,
      onde="UserSkill (userId, skillId, origem DECLARADA/CHANCELADA, visibilidade)",
      nota="Base da descoberta e das sugestões de pessoas (RF50): 'competências compartilhadas', separadas da análise "
           "de carreira privada (REDE_PROFISSIONAL_VISIBILIDADE)."),
    C("idiomas", "Idiomas e nível", "lista (ISO 639 + nível)", "profissional", "PNPPPN", "pessoal", "publico",
      "linkedin lattes", prioridade="P3", onde="ProfileLanguage"),
    C("certificacoes", "Certificações e licenças", "lista (nome, emissor, data, URL)", "profissional", "PNPPPN",
      "pessoal", "publico", "linkedin", prioridade="P3", onde="ProfileCertification"),
    C("bio", "Sobre (bio)", "texto ≤1000", "profissional", "PNPPPN", "pessoal", "publico",
      "linkedin github x facebook dribbble", "User.bio",
      nota="GitHub limita a 160 caracteres; a EMPRESA usa 'Sobre a organização'."),
    C("interesses", "Áreas de interesse / atuação", "lista", "profissional", "PNPPPN", "pessoal", "publico",
      "viva_engage lattes", prioridade="P3", onde="UserSkill com tipo INTERESSE"),
    C("aberto_a_colaborar", "Aberto a colaborar / mentorar", "conjunto (PROJETOS, DECIA, MENTORIA, REVISAO)",
      "profissional", "PNPPPN", "pessoal", "empresa", "linkedin behance dribbble", prioridade="P2",
      onde="User.openToJson",
      nota="Equivale ao 'Open to'/'Hire me' das referências, restrito a colaboração interna — nunca 'procurando emprego'."),
    C("status_presenca", "Status e disponibilidade (ocupado, ausente até)", "texto ≤80 + expiração", "profissional",
      "PNPPPN", "pessoal", "empresa", "github slack teams", prioridade="P3",
      onde="user_status (mensagem, ocupado, expiraEm, visivelPara)",
      nota="GitHub permite restringir o status a uma organização."),
    C("local_trabalho", "Local de trabalho (unidade, remoto, presencial)", "enum + unidade", "profissional", "PNPPPN",
      "pessoal", "empresa", "teams slack", prioridade="P3", onde="user_status.workLocation"),
    C("matricula", "Matrícula funcional", "texto", "profissional", "NNNNNN", "proibido_sem_base_legal", "so_eu", "teams",
      nota="Só com integração de RH/folha e base legal (art. 7º, II/V, ou art. 23 no setor público)."),
    C("pretensao_salarial", "Pretensão salarial / remuneração", "valor", "profissional", "NNNNNN",
      "proibido_sem_base_legal", "so_eu", "indeed dribbble",
      nota="O Indeed esconde a pretensão dos empregadores; aqui não há finalidade."),
    C("procurando_emprego", "Sinal 'procurando emprego'", "booleano", "profissional", "NNNNNN",
      "proibido_sem_base_legal", "so_eu", "linkedin xing indeed",
      nota="Numa rede da própria empresa, expõe a pessoa ao empregador; XING e LinkedIn o restringem a recrutadores."),

    # ------------------------------------------------------------------------------------- portfólio
    C("destaques", "Destaques do perfil (itens fixados)", "lista ordenada de produções publicadas", "portfolio",
      "PPPPPN", "pessoal", "publico", "linkedin github behance dribbble", prioridade="P2",
      onde="ProfileFeatured (userId, targetType, targetId, ordem)",
      nota="Só itens já publicados; fixar não amplia o público do item."),
    C("conquistas_visiveis", "Exibir conquistas, chancelas e indicadores", "seleção", "portfolio", "PNPPPN", "pessoal",
      "publico", "github", "DeliberativeProfile.publicIndicatorsJson", parcial=True, prioridade="P3",
      onde="interruptor geral 'mostrar conquistas' no perfil",
      nota="GitHub oculta conquistas sem tornar o perfil privado."),
    C("licenca_reuso", "Política padrão de reuso / remix", "enum (só leitura, remix com crédito…)", "portfolio",
      "PPPPPN", "pessoal", "so_eu", "ws_docs", prioridade="P3", onde="UserPreferences.defaultRemixPolicy",
      nota="REDE_PROFISSIONAL_VISIBILIDADE pede política explícita e conservadora."),

    # ------------------------------------------------------------------------------------- social
    C("quem_pode_seguir", "Quem pode me seguir", "enum TODOS · MESMA_EMPRESA · COM_APROVACAO", "social", "ONOOON",
      "pessoal", "so_eu", "linkedin instagram", "Follow.status", parcial=True, prioridade="P2",
      onde="User.followPolicy + FollowStatus PENDENTE",
      nota="FollowStatus hoje só tem ATIVO/REMOVIDO: não há pedido pendente nem aprovação."),
    C("quem_pode_mencionar", "Quem pode me mencionar / marcar", "enum TODOS · MESMA_EMPRESA · NINGUEM", "social",
      "OOOOON", "pessoal", "so_eu", "linkedin instagram x", prioridade="P2", onde="User.mentionPolicy",
      nota="LinkedIn: desligar não apaga menções existentes; Instagram oferece revisão de marcações."),
    C("quem_pode_atribuir", "Quem pode me atribuir tarefas e convidar para DECIA",
      "enum MEU_DEPARTAMENTO · MINHA_EMPRESA · QUEM_EU_SIGO", "social", "ONOOON", "pessoal", "so_eu", "ws_docs",
      prioridade="P1", rank=5, onde="User.assignmentPolicy + User.inviteDeciaPolicy",
      nota="A atribuição formal pelo chefe segue o fluxo institucional (RF10) e não depende desta opção; convite é "
           "sempre revisável (REDE_PROFISSIONAL_VISIBILIDADE)."),
    C("quem_pode_mensagem", "Quem pode me enviar mensagem direta", "enum TODOS · MESMA_EMPRESA · QUEM_EU_SIGO",
      "social", "OOOOON", "pessoal", "so_eu", "linkedin instagram", prioridade="P2", onde="User.directMessagePolicy",
      nota="Company.messagingPolicyJson cobre só o prazo de retenção das mensagens."),
    C("sugestoes_de_pessoas", "Aparecer em sugestões de pessoas (RF50)", "booleano", "social", "ONOOON", "pessoal",
      "so_eu", "x linkedin ws_docs", prioridade="P1", rank=6, onde="User.peopleSuggestionsOptIn",
      nota="Listado como controle de privacidade em REDE_PROFISSIONAL_VISIBILIDADE; usa só campos descobríveis."),
    C("encontrar_por_contato", "Ser encontrado por e-mail ou telefone", "booleano (padrão não)", "social", "PNPPPN",
      "pessoal", "so_eu", "x", prioridade="P3", onde="User.findableByContact",
      nota="O X separa essa descoberta e nunca exibe e-mail ou telefone."),
    C("status_online", "Mostrar quando estou online", "booleano (padrão não)", "social", "PNPPPN", "pessoal", "so_eu",
      "instagram teams", prioridade="P3", onde="UserPreferences.showPresence",
      nota="Instagram: quem esconde o próprio status também deixa de ver o dos outros."),
    C("bloqueios", "Pessoas bloqueadas e silenciadas", "lista", "social", "PPPPPN", "pessoal", "so_eu", "ws_docs",
      prioridade="P1", rank=7, onde="UserBlock (userId, blockedUserId, tipo BLOQUEIO·SILENCIO, criadoEm)",
      nota="REDE_PROFISSIONAL_VISIBILIDADE exige bloquear contato e silenciar; não há entidade para isso."),
    C("revisao_marcacoes", "Revisar marcações antes de aparecerem", "booleano", "social", "PPPPPN", "pessoal", "so_eu",
      "instagram x", prioridade="P3", onde="User.tagReview"),
    C("compartilhar_edicoes", "Avisar a rede sobre mudanças no perfil", "booleano (padrão não)", "social", "PPPPPN",
      "pessoal", "so_eu", "linkedin", prioridade="P3", onde="UserPreferences.announceProfileEdits"),
    C("visitas_ao_perfil", "Registro de quem visitou meu perfil", "lista", "social", "NNNNNN", "proibido_sem_base_legal",
      "so_eu", "linkedin",
      nota="Não implementar: cria monitoramento entre colegas e chefias sem finalidade."),

    # ------------------------------------------------------------------------------------- privacidade
    C("descoberta_perfil", "Quem encontra meu perfil na busca", "enum PUBLICO · EMPRESA · NINGUEM (padrão EMPRESA)",
      "privacidade", "ONOOON", "pessoal", "so_eu", "linkedin github instagram", prioridade="P1", rank=2,
      onde="User.discoverability",
      nota="LinkedIn separa perfil público e indexável; GitHub tem perfil privado; Instagram, conta privada. A EMPRESA é "
           "sempre pública."),
    C("indexacao_externa", "Permitir buscadores externos", "booleano (padrão não)", "privacidade", "ONOOON", "pessoal",
      "so_eu", "linkedin x", prioridade="P2", onde="User.searchEngineIndexing + meta robots na página /u/[username]",
      nota="O X avisa que bio e posts públicos podem ser indexados."),
    C("visibilidade_por_campo", "Visibilidade por campo do perfil", "mapa campo → PUBLICO · EMPRESA · SO_EU",
      "privacidade", "ONOOON", "pessoal", "so_eu", "orcid x xing", "User.hypeVisibility", parcial=True,
      prioridade="P1", rank=3, onde="User.profileFieldVisibilityJson (ou tabela profile_field_visibility)",
      nota="Hoje só o Hype tem visibilidade própria. ORCID usa Todos/Partes confiáveis/Só eu por item; X separa ano e "
           "dia/mês do aniversário."),
    C("publico_padrao", "Público padrão das novas produções", "enum PRIVADA · DEPARTAMENTO · EMPRESA · PUBLICA",
      "privacidade", "OOOOON", "pessoal", "so_eu", "facebook ws_docs", prioridade="P1", rank=4,
      onde="UserPreferences.defaultVisibility (padrão PRIVADA)",
      nota="O Facebook lembra o último público; aqui o padrão é conservador e mudar o padrão não republica o acervo."),
    C("hype_visibilidade", "Visibilidade do Hype", "enum PUBLICO · EMPRESA · SO_EU (padrão SO_EU)", "privacidade",
      "ONOOON", "pessoal", "so_eu", "ws_docs", "User.hypeVisibility"),
    C("sair_do_ranking", "Sair dos rankings", "booleano", "privacidade", "PNPPPN", "pessoal", "so_eu", "ws_docs lgpd",
      "User.rankingOptOut", nota="Direito de oposição (art. 18, §2º) e revisão de decisão automatizada (art. 20)."),
    C("aceite_termos", "Versão aceita dos Termos de Uso", "texto (sistema) + histórico", "privacidade", "OOOOON",
      "pessoal", "so_eu", "lgpd ws_docs", "User.termsVersion PolicyAcceptance.version"),
    C("aceite_privacidade", "Versão aceita da Política de Privacidade", "texto (sistema) + histórico", "privacidade",
      "OOOOON", "pessoal", "so_eu", "lgpd ws_docs", "User.privacyVersion PolicyAcceptance.version"),
    C("consentimentos", "Consentimentos opcionais por finalidade", "lista (finalidade, concedido, data)", "privacidade",
      "PPPPPN", "pessoal", "so_eu", "lgpd", "UserConsent.purpose UserConsent.granted",
      nota="Nunca pré-marcado; revogar com o mesmo gesto de conceder (art. 8º, §5º)."),
    C("exclusao_conta", "Pedido de exclusão (datas e motivo)", "datas + texto ≤500", "privacidade", "PPPPPN", "pessoal",
      "so_eu", "lgpd", "User.deletionRequestedAt User.deletionScheduledAt User.deletionReason"),
    C("exportacao_dados", "Pedidos de exportação (portabilidade e acesso)", "lista", "privacidade", "PPPPPN", "pessoal",
      "so_eu", "lgpd", "DataExportRequest.status DataExportRequest.format", nota="Art. 18, II e V."),
    C("cookies", "Consentimento de cookies não essenciais", "registro (finalidade, data)", "privacidade", "PPPPPP",
      "pessoal", "so_eu", "lgpd", prioridade="P3", onde="armazenamento local + ConsentEvent quando logado",
      nota="Só necessário se houver cookies ou métricas não essenciais; com cookies estritamente necessários basta aviso."),

    # ------------------------------------------------------------------------------------- segurança
    C("senha", "Senha (hash Argon2id)", "hash", "seguranca", "OOOOON", "pessoal_protegido", "interno",
      "github orcid govbr", "User.passwordHash", nota="Nula em conta só OIDC."),
    C("login_institucional", "Vínculo de login institucional (emissor + sujeito OIDC)", "texto", "seguranca", "PPPPPN",
      "pessoal_protegido", "interno", "govbr", "User.oidcIssuer User.oidcSubject",
      nota="No gov.br o sujeito é o CPF: cifrar e não exibir."),
    C("nivel_govbr", "Nível da conta gov.br (bronze, prata, ouro)", "enum (do provedor)", "seguranca", "PNPPPN",
      "pessoal", "so_eu", "govbr", prioridade="P3", onde="User.oidcAssuranceLevel (a partir do acr/amr do token)",
      nota="Permite exigir nível prata/ouro para ações críticas sem guardar biometria nem documento."),
    C("dois_fatores", "Verificação em duas etapas ativa", "booleano + data de ativação", "seguranca", "POOPON",
      "pessoal_protegido", "so_eu", "github govbr instagram", "User.twoFactorEnabled",
      nota="Obrigatória para EMPRESA, CHEFE e ADMIN (emitem chancelas ou acessam dados de terceiros). O gov.br só "
           "libera 2FA a partir do nível prata; a Meta exige 2FA para o selo."),
    C("totp_segredo", "Segredo TOTP (cifrado)", "Base32 cifrado", "seguranca", "POOPON", "pessoal_protegido", "interno",
      "github", "User.twoFactorSecret", prioridade="P1", rank=0,
      onde="User.twoFactorSecret (cifrado no adaptador) — conferência TOTP é a Q-83",
      nota="Sem o segredo, a conta com 2FA ligado não consegue entrar (IdentityService)."),
    C("codigos_recuperacao", "Códigos de recuperação (hash, uso único)", "lista de hashes", "seguranca", "POOPON",
      "pessoal_protegido", "interno", "github", "User.twoFactorRecoveryHashes", prioridade="P1", rank=0,
      onde="User.twoFactorRecoveryHashes ou tabela user_recovery_codes",
      nota="GitHub: cada código vale uma vez; gerar um novo conjunto invalida o anterior."),
    C("chaves_de_acesso", "Chaves de acesso (passkeys / WebAuthn)", "credencial pública", "seguranca", "PPPPPN",
      "pessoal_protegido", "interno", prioridade="P3", onde="user_webauthn_credentials",
      nota="Não pesquisado nesta rodada; segundo fator resistente a phishing."),
    C("sessoes_ativas", "Sessões ativas (dispositivo, IP, último uso, revogar)", "lista (sistema)", "seguranca",
      "OOOOON", "pessoal_protegido", "so_eu", "github",
      "RefreshToken.deviceName RefreshToken.userAgent RefreshToken.createdIp RefreshToken.lastUsedAt RefreshToken.revokedAt",
      nota="GitHub lista sessões e dispositivos e permite revogar cada um."),
    C("historico_login", "Histórico de login (sucessos e falhas)", "lista (data, IP aproximado, dispositivo, resultado)",
      "seguranca", "OOOOON", "pessoal_protegido", "so_eu", "github", "User.lastLoginAt", parcial=True,
      prioridade="P2", rank=8, onde="login_events (ou leitura filtrada do AuditLog) em /api/me/security-log",
      nota="O GitHub mantém um log de segurança visível ao titular; hoje só existe o último login."),
    C("registros_acesso", "Registros de acesso à aplicação (IP, data e hora)", "log técnico", "seguranca", "OOOOOO",
      "pessoal_protegido", "interno", "marco_civil", "RefreshToken.createdIp", parcial=True, prioridade="P2",
      onde="access_log com retenção de 6 meses e acesso restrito",
      nota="Marco Civil, art. 15: obrigação legal (base do art. 7º, II), inclusive para visitante."),
    C("alerta_novo_dispositivo", "Aviso de login em novo dispositivo", "booleano (padrão sim)", "seguranca", "PPPPPN",
      "pessoal", "so_eu", prioridade="P3", onde="evento de segurança em notificationPrefsJson (não desligável para ADMIN)",
      nota="Prática comum; não conferida nas fontes desta rodada."),
    C("situacao_conta", "Situação da conta", "enum AccountStatus", "seguranca", "OOOOON", "pessoal", "so_eu", "ws_docs",
      "User.status", nota="Terceiros veem só 'perfil indisponível' quando a conta não está ACTIVE."),
    C("papel_global", "Papel global (USER / ADMIN)", "enum Role", "seguranca", "OOOOON", "pessoal", "so_eu", "slack",
      "User.role"),
    C("origem_conta", "Origem da conta (real, seed, demo, sistema)", "enum AccountOrigin", "seguranca", "OOOOON",
      "pessoal", "interno", "ws_docs", "User.accountOrigin"),
    C("admin_motivo_acesso", "Motivo registrado ao abrir dado de terceiro", "texto na trilha de auditoria", "seguranca",
      "NNNNON", "pessoal", "interno", "lgpd ws_docs", prioridade="P2",
      onde="AuditLog com 'reason' obrigatório nas rotas /api/admin/*/documents e de suporte",
      nota="Registro das operações de tratamento (art. 37)."),

    # ------------------------------------------------------------------------------------- preferências
    C("tema", "Tema", "enum AUTO · CLARO · ESCURO · ALTO_CONTRASTE · BLUEPRINT", "preferencias", "PPPPPP", "pessoal",
      "so_eu", "ws_docs", "UserPreferences.theme PreferenciasFront.theme",
      nota="Visitante: só no armazenamento local do navegador."),
    C("idioma", "Idioma da interface", "enum PT_BR · EN · ES", "preferencias", "PPPPPP", "pessoal", "so_eu", "ws_docs",
      "UserPreferences.language PreferenciasFront.language"),
    C("densidade", "Densidade", "enum COMPACTA · NORMAL · CONFORTAVEL", "preferencias", "PPPPPP", "pessoal", "so_eu",
      "ws_docs", "UserPreferences.density PreferenciasFront.density"),
    C("escala_fonte", "Escala da fonte", "decimal 0,50–2,00", "preferencias", "PPPPPP", "pessoal", "so_eu", "ws_docs",
      "UserPreferences.fontScale PreferenciasFront.fontScale"),
    C("reduzir_movimento", "Reduzir movimento", "booleano", "preferencias", "PPPPPP", "pessoal", "so_eu", "ws_docs",
      "UserPreferences.reduceMotion PreferenciasFront.reduceMotion"),
    C("pele_da_mesa", "Pele da mesa", "enum PAPEL · CORTICA · BLUEPRINT · PAPEL_TIMBRADO", "preferencias", "PPPPPN",
      "pessoal", "so_eu", "ws_docs", "UserPreferences.deskSkin PreferenciasFront.deskSkin"),
    C("arte_de_fundo", "Arte de fundo", "identificador", "preferencias", "PPPPPN", "pessoal", "so_eu", "ws_docs",
      "PreferenciasFront.backgroundId", parcial=True, prioridade="P3",
      onde="coluna UserPreferences.backgroundId (hoje viaja dentro de notificationPrefsJson, Q-100)"),
    C("fuso_horario", "Fuso horário", "IANA (America/Sao_Paulo)", "preferencias", "PPPPPN", "pessoal", "so_eu",
      "github slack", "UserPreferences.timezone PreferenciasFront.timezone",
      nota="O GitHub permite exibir a hora local no perfil; aqui fica privado salvo escolha."),
    C("notificacoes", "Notificações (canais e eventos)", "JSON (email, push, menções, DECIA, chancelas, pontos, resumo)",
      "preferencias", "PPPPPN", "pessoal", "so_eu", "ws_docs",
      "UserPreferences.notificationPrefsJson PreferenciasFront.email PreferenciasFront.mentions PreferenciasFront.weeklyDigest"),
    C("horario_silencio", "Horário de silêncio (não perturbe)", "intervalo HH:mm", "preferencias", "PPPPPN", "pessoal",
      "so_eu", prioridade="P3", onde="notificationPrefsJson.quietHours",
      nota="Prática comum; não conferida nas fontes desta rodada."),
    C("horario_tarefa_do_dia", "Horário da Tarefa do Dia", "HH:mm", "preferencias", "PNPPPN", "pessoal", "so_eu",
      "ws_docs", "PreferenciasFront.dailyTaskAt"),
    C("limite_wip", "Limite pessoal de trabalho em andamento (WIP)", "inteiro 1–20", "preferencias", "PNPPPN", "pessoal",
      "so_eu", "ws_docs", "UserPreferences.wipLimit PreferenciasFront.wipLimit"),
    C("modo_ia", "Modo padrão da IA", "enum ECONOMIA · AVANCADO", "preferencias", "PPPPPN", "pessoal", "so_eu", "ws_docs",
      "UserPreferences.aiModeDefault PreferenciasFront.aiModeDefault"),
    C("autonomia_ia", "Autonomia padrão da IA", "enum (SOB_SOLICITACAO…)", "preferencias", "PPPPPN", "pessoal", "so_eu",
      "ws_docs", "PreferenciasFront.aiAutonomyDefault", parcial=True, prioridade="P3",
      onde="coluna UserPreferences.aiAutonomyDefault (hoje dentro de notificationPrefsJson)"),
    C("layout_painel", "Layout do painel", "JSON", "preferencias", "PPPPPN", "pessoal", "so_eu", "ws_docs",
      "UserPreferences.dashboardLayoutJson"),

    # ------------------------------------------------------------------------------------- institucional — EMPRESA
    C("razao_social", "Razão social", "texto ≤200", "institucional", "NONNNN", "nao_pessoal", "publico",
      "glassdoor linkedin_page", "Company.legalName EmpresaProfileExtension.legalName"),
    C("nome_organizacao", "Nome de exibição da organização (fantasia ou sigla)", "texto ≤120", "institucional",
      "NONNNN", "nao_pessoal", "publico", "linkedin_page facebook", prioridade="P2", onde="Company.displayName",
      nota="Hoje a Company tem só razão social e slug; órgãos públicos são conhecidos pela sigla (ex.: SECID)."),
    C("slug_pagina", "Endereço da página (slug)", "texto ≤80, único", "institucional", "NONNNN", "nao_pessoal",
      "publico", "linkedin_page", "Company.slug"),
    C("cnpj", "CNPJ", "14 dígitos (dígitos verificadores + situação cadastral)", "institucional", "NONNNN",
      "nao_pessoal", "so_eu", "lgpd ws_docs", "Company.cnpj EmpresaProfileExtension.companyCnpj",
      nota="Obrigatório para validar a EMPRESA. É dado de PJ, mas de empresário individual/MEI identifica a pessoa: "
           "por isso cifrado e exibido só se a organização quiser."),
    C("tipo_organizacao", "Natureza da organização (órgão público, autarquia, estatal, empresa privada, terceiro setor)",
      "enum", "institucional", "NONNNN", "nao_pessoal", "publico", "linkedin_page glassdoor", prioridade="P1", rank=9,
      onde="Company.organizationType + EmpresaProfileExtension (no cadastro)",
      nota="Define o critério de validação (ato no Diário Oficial × contrato social/procuração) e a base legal "
           "(art. 23 para o poder público)."),
    C("setor", "Setor / área de atuação", "lista controlada (CNAE opcional)", "institucional", "NONNNN", "nao_pessoal",
      "publico", "linkedin_page glassdoor", prioridade="P2", onde="Company.sector"),
    C("porte", "Porte (faixa de pessoas)", "enum de faixas", "institucional", "NPNNNN", "nao_pessoal", "publico",
      "linkedin_page glassdoor", prioridade="P3", onde="Company.sizeRange", nota="Faixa, nunca número exato."),
    C("site_oficial", "Site oficial", "URL https", "institucional", "NONNNN", "nao_pessoal", "publico",
      "linkedin_page github_org glassdoor facebook", "Company.websiteUrl EmpresaProfileExtension.officialSite"),
    C("dominio_verificado", "Domínio institucional verificado (DNS TXT)", "domínio + data", "institucional", "NPNNNN",
      "nao_pessoal", "publico", "github_org", prioridade="P2", onde="Company.verifiedDomain + verifiedDomainAt",
      nota="GitHub só mostra o selo quando site e e-mail exibidos estão em domínios verificados."),
    C("logotipo", "Logotipo", "imagem", "institucional", "NPNNNN", "nao_pessoal", "publico",
      "linkedin_page glassdoor", "Company.logoUrl"),
    C("brasao", "Brasão (órgão público)", "imagem", "institucional", "NPNNNN", "nao_pessoal", "publico", "ws_docs",
      "Company.coatOfArmsUrl"),
    C("sobre_organizacao", "Sobre a organização", "texto", "institucional", "NPNNNN", "nao_pessoal", "publico",
      "linkedin_page glassdoor facebook", "Company.about"),
    C("slogan", "Slogan", "texto ≤120", "institucional", "NPNNNN", "nao_pessoal", "publico", "linkedin_page",
      prioridade="P3", onde="Company.tagline"),
    C("sede", "Sede (cidade/UF; endereço opcional)", "município IBGE + endereço", "institucional", "NONNNN",
      "nao_pessoal", "publico", "glassdoor facebook", prioridade="P2", onde="Company.headquartersCity/UF (+ endereço)",
      nota="A cidade também alimenta o calendário de dias úteis dos prazos (feriados locais)."),
    C("ano_fundacao", "Ano de fundação / criação", "ano", "institucional", "NPNNNN", "nao_pessoal", "publico",
      "glassdoor", prioridade="P3", onde="Company.foundedYear"),
    C("email_contato_organizacao", "E-mail institucional de contato", "e-mail", "institucional", "NPNNNN",
      "nao_pessoal", "publico", "facebook github_org", prioridade="P2", onde="Company.contactEmail",
      nota="Caixa institucional (contato@, ouvidoria@), nunca e-mail pessoal."),
    C("telefone_organizacao", "Telefone institucional", "E.164", "institucional", "NPNNNN", "nao_pessoal", "publico",
      "facebook", prioridade="P3", onde="Company.contactPhone"),
    C("cor_destaque", "Cor de destaque", "token de cor", "institucional", "NPNNNN", "nao_pessoal", "publico", "ws_docs",
      "Company.accentColor"),
    C("responsavel_conta", "Pessoa responsável pela conta", "referência a User", "institucional", "NONNNN", "pessoal",
      "so_eu", "linkedin_page", "Company.ownerUserId",
      nota="Equivale ao 'representante autorizado' da LinkedIn Page."),
    C("documento_representacao", "Documento de representação (ato de nomeação, procuração, contrato social)",
      "arquivo em restricted/", "institucional", "NONNNN", "pessoal_protegido", "so_eu", "linkedin_page ws_docs",
      "EmpresaProfileExtension.representationDocId",
      nota="Aberto só pelo ADMIN validador, com auditoria; descartar após a decisão e o prazo de recurso."),
    C("coadministradores", "Administradores adicionais da página", "lista (pessoa, papel, desde)", "institucional",
      "NPNNNN", "pessoal", "empresa", "linkedin_page", prioridade="P1", rank=10,
      onde="CompanyAdmin (companyId, userId, papel, desde, até)",
      nota="Hoje a conta institucional depende de uma só pessoa (ownerUserId): risco de continuidade. Recomendar ≥ 2."),
    C("politicas_organizacao", "Políticas da organização (pontos, Hype, ranking, gravação, mensagens)", "JSON",
      "institucional", "NONNNN", "nao_pessoal", "empresa", "ws_docs",
      "Company.pointsPolicyJson Company.hypePolicyJson Company.messagingPolicyJson Company.recordingRetentionPolicy"),
    C("situacao_organizacao", "Situação da organização / validação", "enum", "institucional", "NONNNN", "nao_pessoal",
      "publico", "ws_docs", "Company.status ApprovalRequest.status"),

    # ------------------------------------------------------------------------------------- institucional — CHEFE
    C("orgao_do_chefe", "Órgão / empresa do departamento", "referência a Company", "institucional", "NNONNN", "pessoal",
      "publico", "ws_docs", "ChefeProfileExtension.companyId"),
    C("departamento_chefiado", "Departamento chefiado", "referência ou nome", "institucional", "NNONNN", "pessoal",
      "publico", "teams", "ChefeProfileExtension.departmentId ChefeProfileExtension.departmentName Department.headUserId",
      nota="O Teams mostra gestor e subordinados no organograma."),
    C("ato_nomeacao", "Link do ato de nomeação (Diário Oficial)", "URL https", "institucional", "NNONNN", "pessoal",
      "so_eu", "ws_docs", "ChefeProfileExtension.appointmentLink",
      nota="Ato público, mas o perfil mostra só o selo 'chefia verificada'."),
    C("confirmacao_chefia", "Confirmação pelo chefe atual ou pela EMPRESA", "pessoa + data (sistema)", "institucional",
      "NNONNN", "pessoal", "so_eu", "ws_docs", "ApprovalRequest.confirmedBy ApprovalRequest.confirmedAt"),
    C("substituto_eventual", "Substituto(a) eventual / delegação", "pessoa + período + escopo", "institucional",
      "NNPNNN", "pessoal", "empresa", "orcid", prioridade="P2",
      onde="DepartmentDelegate (departmentId, userId, início, fim, escopo)",
      nota="O ORCID admite delegados; garante continuidade nas ausências e na transição (RF36)."),

    # ------------------------------------------------------------------------------------- institucional — CURADOR
    C("curadoria_escopo", "Departamento e escopo da curadoria", "referência + enum FILA_REVISAO · PREMIACAO · AMBOS",
      "institucional", "NNNONN", "pessoal", "publico", "ws_docs",
      "CuratorAppointment.departmentId CuratorAppointment.scope",
      nota="Etiqueta pública 'Curador de {sigla}'."),
    C("curadoria_nomeacao", "Quem nomeou, quando e revogação", "pessoa + datas + motivo", "institucional", "NNNONN",
      "pessoal", "empresa", "ws_docs",
      "CuratorAppointment.appointedBy CuratorAppointment.appointedAt CuratorAppointment.revokedAt "
      "CuratorAppointment.revokeReason"),
]


# --------------------------------------------------------------------------------------------- validação e cálculo
def validar() -> None:
    ids = set()
    for c in CAMPOS:
        assert c.id not in ids, f"campo repetido: {c.id}"
        ids.add(c.id)
        assert c.grupo in GRUPOS, f"{c.id}: grupo {c.grupo}"
        assert len(c.perfis) == len(PERFIS) and set(c.perfis) <= set(EXIGENCIA), f"{c.id}: perfis {c.perfis}"
        assert c.lgpd in LGPD, f"{c.id}: lgpd {c.lgpd}"
        assert c.vis in VISIBILIDADE, f"{c.id}: visibilidade {c.vis}"
        assert all(v in VISIBILIDADE for v in c.vis_por_perfil.values()), c.id
        assert not c.prioridade or c.prioridade in PRIORIDADES, f"{c.id}: prioridade {c.prioridade}"
        for f in c.fontes.split():
            assert f in SITES, f"{c.id}: fonte desconhecida {f}"
        for ref in c.modelo.split():
            assert ref.split(".")[0] in MODELO, f"{c.id}: entidade desconhecida {ref}"
        if c.lgpd in ("sensivel", "proibido_sem_base_legal"):
            assert c.perfis == "N" * len(PERFIS), f"{c.id}: dado {c.lgpd} não pode ser coletado"
    for s in SITES.values():
        for u in s["urls"]:
            assert u in URLS, f"url desconhecida {u}"


def situacao(c: Campo, modelo: dict[str, set[str]]) -> dict:
    refs = c.modelo.split()
    achados = [r for r in refs if r.split(".", 1)[1] in modelo[r.split(".", 1)[0]]]
    faltam = [r for r in refs if r not in achados]
    if not refs or not achados:
        estado = "ausente"
    elif faltam or c.parcial:
        estado = "parcial"
    else:
        estado = "existe"
    user_campos = [r.split(".", 1)[1] for r in achados if r.startswith("User.")]
    return {
        "estado": estado,
        "referencias_encontradas": achados,
        "referencias_nao_encontradas": faltam,
        "na_api_userview": bool(user_campos) and any(n in modelo["UserView"] for n in user_campos),
        "editavel_pelo_titular": bool(user_campos) and any(
            n in modelo["ProfileUpdate"] or n in modelo["SensitiveUpdate"] for n in user_campos),
    }


def coletar_nao(c: Campo) -> bool:
    return c.perfis == "N" * len(PERFIS)


def montar() -> dict:
    validar()
    modelo, ausentes = ler_modelo()
    campos = []
    for c in CAMPOS:
        s = situacao(c, modelo)
        campos.append({
            "id": c.id,
            "rotulo": c.rotulo,
            "tipo": c.tipo,
            "grupo": c.grupo,
            "por_perfil": {p: EXIGENCIA[c.perfis[i]] for i, p in enumerate(PERFIS)},
            "lgpd": c.lgpd,
            "visibilidade_padrao": c.vis,
            "visibilidade_por_perfil": dict(c.vis_por_perfil),
            "fontes": c.fontes.split(),
            "modelo_referencias": c.modelo.split(),
            "modelo_atual": s,
            "recomendacao": "nao_coletar" if coletar_nao(c) else "coletar",
            "lacuna": None if s["estado"] == "existe" or coletar_nao(c) or not c.prioridade else {
                "prioridade": c.prioridade, "prioridade_rotulo": PRIORIDADES[c.prioridade], "onde": c.onde,
                "ordem": c.rank},
            "nota": c.nota,
        })
    resumo = {}
    for i, p in enumerate(PERFIS):
        aplic = [(c, x) for c, x in zip(CAMPOS, campos) if c.perfis[i] != "N"]
        resumo[p] = {
            "obrigatorios": sum(c.perfis[i] == "O" for c, _ in aplic),
            "opcionais": sum(c.perfis[i] == "P" for c, _ in aplic),
            "total_aplicavel": len(aplic),
            "ja_existem": sum(x["modelo_atual"]["estado"] == "existe" for _, x in aplic),
            "parciais": sum(x["modelo_atual"]["estado"] == "parcial" for _, x in aplic),
            "lacunas": sum(x["lacuna"] is not None for _, x in aplic),
        }
    return {
        "titulo": "Dados de perfil por tipo — Work Station",
        "versao_catalogo": VERSAO_CATALOGO,
        "gerado_por": "scripts/pesquisa/perfis/campos.py",
        "data_de_acesso_das_fontes": DATA_ACESSO,
        "perfis": list(PERFIS),
        "legenda": {"exigencia": EXIGENCIA, "grupos": GRUPOS, "lgpd": LGPD, "visibilidade": VISIBILIDADE,
                    "prioridades": PRIORIDADES},
        "modelo_lido": {k: v[0] for k, v in MODELO.items()},
        "modelo_arquivos_ausentes": ausentes,
        "resumo_por_perfil": resumo,
        "campos": campos,
        "nao_coletar": [x["id"] for x in campos if x["recomendacao"] == "nao_coletar"],
        "referencias": {k: {kk: vv for kk, vv in v.items()} for k, v in SITES.items()},
        "urls": {k: dict(v, acesso=DATA_ACESSO) for k, v in URLS.items()},
    }


# --------------------------------------------------------------------------------------------- Markdown
def _cel(t: str) -> str:
    return str(t).replace("|", "\\|").replace("\n", " ")


def _fontes_md(chaves: list[str]) -> str:
    return ", ".join(SITES[k]["nome"].split(" (")[0] for k in chaves) or "—"


def _modelo_md(x: dict) -> str:
    s = x["modelo_atual"]
    if s["estado"] == "ausente":
        return "ausente"
    refs = " ".join(f"`{r}`" for r in s["referencias_encontradas"])
    extra = []
    if s["na_api_userview"]:
        extra.append("na API")
    if s["editavel_pelo_titular"]:
        extra.append("editável")
    return f"{s['estado']}: {refs}" + (f" ({', '.join(extra)})" if extra else "")


def gerar_md(d: dict) -> str:
    L: list[str] = []
    a = L.append
    a("## 9. Referências pesquisadas")
    a("")
    a(f"Resumo do que cada site pede e mostra (acesso em {DATA_ACESSO}). \"Não conferido\" marca o que não foi "
      "confirmado em fonte acessada nesta rodada.")
    a("")
    a("| Referência | Cadastro (obrigatório) | Perfil público | Privacidade / visibilidade | Segurança | Verificação / selo |")
    a("|---|---|---|---|---|---|")
    for k in SITES_PESQUISADOS:
        s = SITES[k]
        a(f"| **{_cel(s['nome'])}** | {_cel(s['cadastro'])} | {_cel(s['publico'])} | {_cel(s['privacidade'])} | "
          f"{_cel(s['seguranca'])} | {_cel(s['verificacao'])} |")
    a("")
    a("## 10. Tabela de campos por tipo de perfil")
    a("")
    a("Legenda — **Obr** obrigatório · Opc opcional · — não se aplica (ou não coletar). Colunas: EMP = EMPREGADO, "
      "CHEFE = CHEFE_DEPARTAMENTO, CUR = CURADOR, ADM = ADMIN, VIS = VISITANTE. Visibilidade padrão: público · empresa "
      "(logados da mesma empresa) · só eu · interno (nunca exibido). Modelo atual: conferido por regex em `User.java`, "
      "`UserView.java` e entidades vizinhas; \"na API\" = sai no `UserView`; \"editável\" = está em `ProfileUpdate`/"
      "`SensitiveUpdate`.")
    a("")
    a("### 10.1 Resumo por tipo de perfil")
    a("")
    a("| Perfil | Obrigatórios | Opcionais | Total aplicável | Já existem | Parciais | Lacunas |")
    a("|---|---|---|---|---|---|---|")
    for p, r in d["resumo_por_perfil"].items():
        a(f"| {p} | {r['obrigatorios']} | {r['opcionais']} | {r['total_aplicavel']} | {r['ja_existem']} | "
          f"{r['parciais']} | {r['lacunas']} |")
    a("")
    total = len(d["campos"])
    a(f"Catálogo: {total} campos, dos quais {len(d['nao_coletar'])} marcados para **não coletar**.")
    a("")
    cabecalho = ("| Campo | Rótulo | Tipo | " + " | ".join(ABREV[p] for p in PERFIS)
                 + " | LGPD | Visib. | Fontes | Modelo atual |")
    sep = "|" + "---|" * (3 + len(PERFIS) + 4)
    n = 1
    for g, rotulo in GRUPOS.items():
        itens = [x for x in d["campos"] if x["grupo"] == g and x["recomendacao"] == "coletar"]
        if not itens:
            continue
        a(f"### 10.{n + 1} {rotulo}")
        n += 1
        a("")
        a(cabecalho)
        a(sep)
        for x in itens:
            letras = [{"obrigatorio": "O", "opcional": "P", "nao_se_aplica": "N"}[x["por_perfil"][p]] for p in PERFIS]
            vis = VISIBILIDADE_MD[x["visibilidade_padrao"]]
            if x["visibilidade_por_perfil"]:
                vis += " (" + ", ".join(f"{ABREV[k]}: {VISIBILIDADE_MD[v]}" for k, v in
                                        x["visibilidade_por_perfil"].items()) + ")"
            a(f"| `{x['id']}` | {_cel(x['rotulo'])} | {_cel(x['tipo'])} | "
              + " | ".join(EXIGENCIA_MD[l] for l in letras)
              + f" | {LGPD_MD[x['lgpd']]} | {vis} | {_cel(_fontes_md(x['fontes']))} | {_cel(_modelo_md(x))} |")
        a("")
    a("## 11. Campos que não devem ser coletados")
    a("")
    a("Valem para todos os tipos de perfil. Sensível = art. 5º, II (tratamento só nas hipóteses do art. 11); proibido "
      "sem base legal = dado comum sem finalidade no produto (art. 6º, I e III).")
    a("")
    a("| Campo | Rótulo | Classificação | Quem coleta nas referências | Por quê / exceção |")
    a("|---|---|---|---|---|")
    for x in d["campos"]:
        if x["recomendacao"] == "nao_coletar":
            a(f"| `{x['id']}` | {_cel(x['rotulo'])} | {LGPD_MD[x['lgpd']]} | {_cel(_fontes_md(x['fontes']))} | "
              f"{_cel(x['nota'] or LGPD[x['lgpd']])} |")
    a("")
    a("## 12. Lacunas no modelo atual")
    a("")
    a("Campos recomendados que não existem (ou existem só em parte) nas classes lidas. Ordem: prioridade, depois "
      "relevância. \"Onde entraria\" é proposta — não altera o modelo.")
    a("")
    a("| # | Campo | Rótulo | Situação | Perfis | Onde entraria | Prioridade | Por quê |")
    a("|---|---|---|---|---|---|---|---|")
    lac = [x for x in d["campos"] if x["lacuna"]]
    lac.sort(key=lambda x: (x["lacuna"]["prioridade"], x["lacuna"]["ordem"]))
    for i, x in enumerate(lac, 1):
        perfis = ", ".join(ABREV[p] for p in PERFIS if x["por_perfil"][p] != "nao_se_aplica")
        a(f"| {i} | `{x['id']}` | {_cel(x['rotulo'])} | {x['modelo_atual']['estado']} | {perfis} | "
          f"{_cel(x['lacuna']['onde'])} | {x['lacuna']['prioridade_rotulo']} | {_cel(x['nota'] or '—')} |")
    if not lac:
        a("| — | — | — | — | — | — | — | — |")
    a("")
    a("## 13. Fontes")
    a("")
    a(f"Todas acessadas em {DATA_ACESSO}, salvo indicação. \"Secundária\" = guia de terceiros, usado só onde não "
      "havia página oficial acessível.")
    a("")
    for k, u in URLS.items():
        obs = f" {u['obs']}" if u.get("obs") else ""
        a(f"- [{u['titulo']}]({u['url']}) — {u['tipo']}; acesso em {DATA_ACESSO}.{obs}")
    a("- Documentos internos: `docs/arquitetura/TAXONOMIA.md` §1, `docs/produto/ABAS_POR_PERFIL.md`, "
      "`docs/produto/CADASTRO_E_LGPD.md`, `docs/produto/REDE_PROFISSIONAL_VISIBILIDADE.md`, `docs/DECISOES.md` "
      "(Q-63, Q-64, Q-67, Q-83).")
    a("")
    return "\n".join(L)


def substituir_regiao(texto: str, gerado: str) -> str:
    if INICIO not in texto or FIM not in texto or texto.index(INICIO) > texto.index(FIM):
        raise SystemExit(f"{SAIDA_MD.relative_to(RAIZ)}: marcadores {INICIO} / {FIM} ausentes ou fora de ordem")
    antes = texto[: texto.index(INICIO) + len(INICIO)]
    depois = texto[texto.index(FIM):]
    return f"{antes}\n\n{gerado}\n{depois}"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("--check", action="store_true", help="falha se o .md ou o .json estiverem desatualizados")
    args = ap.parse_args(argv)

    dados = montar()
    novo_json = json.dumps(dados, ensure_ascii=False, indent=2) + "\n"
    if not SAIDA_MD.exists():
        print(f"ERRO: {SAIDA_MD.relative_to(RAIZ)} não existe (o texto fora dos marcadores é escrito à mão)",
              file=sys.stderr)
        return 2
    md_atual = SAIDA_MD.read_text(encoding="utf-8")
    novo_md = substituir_regiao(md_atual, gerar_md(dados))
    json_atual = SAIDA_JSON.read_text(encoding="utf-8") if SAIDA_JSON.exists() else ""

    if args.check:
        erros = []
        if json_atual != novo_json:
            erros.append(str(SAIDA_JSON.relative_to(RAIZ)))
        if md_atual != novo_md:
            erros.append(str(SAIDA_MD.relative_to(RAIZ)))
        if erros:
            print("DESATUALIZADO: " + ", ".join(erros) + " — rode python3 scripts/pesquisa/perfis/campos.py",
                  file=sys.stderr)
            return 1
        r = dados["resumo_por_perfil"]
        print(f"OK: {len(dados['campos'])} campos; "
              + "; ".join(f"{ABREV[p]} {v['total_aplicavel']} ({v['obrigatorios']} obr.)" for p, v in r.items())
              + f"; {sum(1 for x in dados['campos'] if x['lacuna'])} lacunas; .md e .json em dia")
        return 0

    SAIDA_JSON.write_text(novo_json, encoding="utf-8")
    SAIDA_MD.write_text(novo_md, encoding="utf-8")
    print(f"gerados: {SAIDA_JSON.relative_to(RAIZ)}, {SAIDA_MD.relative_to(RAIZ)} "
          f"({len(dados['campos'])} campos, {sum(1 for x in dados['campos'] if x['lacuna'])} lacunas)")
    if dados["modelo_arquivos_ausentes"]:
        print("aviso: arquivos do modelo não encontrados: " + ", ".join(dados["modelo_arquivos_ausentes"]),
              file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
