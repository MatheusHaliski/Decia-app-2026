# Pesquisa: perguntas de onboarding para recolocação (fontes)

Pesquisa web feita em 31/10/2026 para `../GUIA_DE_CARREIRA.md`. "Não conferido" quer dizer que não foi possível confirmar na fonte primária. O site do Planalto bloqueou o acesso; o texto da LGPD está apoiado em fontes secundárias e a Lei 9.029 foi conferida no portal da Câmara.

## 1. Como as plataformas de emprego e carreira fazem o onboarding

| Plataforma | O que perguntam e em que ordem | Obrigatório × opcional / privado |
|---|---|---|
| **LinkedIn** (Open to Work) | Preferências: cargos, tipo de local de trabalho, locais, data de início e tipo de contratação. Desde 2022 existe a "pausa na carreira" (Career Break), item opcional na seção Experiência, com tipos como demissão ou corte de vaga, cuidado de familiar e mudança de carreira. | Três níveis de visibilidade: todos os membros (moldura #OpenToWork), só recrutadores (LinkedIn Recruiter) e só você (apenas recomenda vagas). O LinkedIn tenta esconder o status de recrutadores do empregador atual, mas "não pode garantir privacidade completa". Fluxo do primeiro cadastro: não conferido. |
| **Indeed** | Cargos (até 10), horário, tipo de vaga, salário-base mínimo, áreas (até 3), remoto, tempo de deslocamento, mudança de cidade e disponibilidade imediata ("Ready to work"). Lista "Não tenho interesse" (cargos, habilidades, idiomas). | A lista "Não tenho interesse" fica oculta para empregadores e só filtra vagas. A central de ajuda não indica campos obrigatórios. |
| **Gupy** | O cadastro acontece ao se candidatar a uma vaga; currículo pronto (PDF/DOC) ou preenchimento manual; IA cruza currículo e requisitos. | Segundo e-book da Gupy, dados pessoais e de diversidade não entram na ordenação (fonte secundária, não conferido na íntegra). |
| **Catho** | Etapas: cargo de interesse (objetivo profissional), nível hierárquico, pretensão salarial, experiência e formação. | A Catho recomenda informar pretensão salarial; reportagem diz que só 0,09% das vagas pedem o dado de início (secundária). |
| **Vagas.com** | Objetivo profissional com até 5 áreas de interesse e pretensão salarial. | Pretensão não obrigatória, mas é filtro de triagem. "Acesso limitado": a empresa vê só experiência e formação. |
| **InfoJobs BR** | Política de privacidade: coleta pretensão salarial e último salário quando informados. | Dados de uso (candidaturas, avaliações) não aparecem para recrutadores. Menu de visibilidade: não conferido. |
| **Emprega Brasil / SINE** | gov.br: documentação, dados cadastrais, formação, experiências, região e localidades de interesse, "outras áreas de qualificação"; cerca de 15 minutos. Vagas também no app Carteira de Trabalho Digital (desde jan/2025, imprensa). | O gov.br pede para manter as "pretensões profissionais" atualizadas. Exigência de login prata/ouro: não conferida. |
| **Glassdoor** | Perfil visível para recrutadores (opt-in). | Detalhes não conferidos. |
| **Coursera / Google Career Certificates** | Registra um "objetivo de carreira declarado". | Telas não conferidas. |
| **Duolingo** | Idioma → motivo → meta diária → "é iniciante?" (senão, nivelamento) → lembretes. A pessoa usa antes de criar conta. | Análises de terceiros. |

Padrões: objetivo antes dos dados pessoais; preferências privadas por padrão com visibilidade em níveis; salário opcional e explicado; lista privada de "não quero" que só filtra; pausa na carreira como categoria neutra; taxonomia oficial de cargos.

## 2. Modelos de orientação que cabem num questionário

- **Holland RIASEC / O*NET Interest Profiler**: seis tipos (Realista, Investigativo, Artístico, Social, Empreendedor, Convencional). Mini-IP: 30 itens, web, pensado para celular; Short Form: 60 itens, papel; 10–20 minutos. Redistribuível sob licença do O*NET com registro de uso. Escala de respostas e "Job Zones": não conferidos.
- **O*NET Skills / Work Styles**: não conferido; referência de vocabulário.
- **ESCO v1.2**: 3.039 ocupações (ISCO-08) e ~13.900 habilidades/conhecimentos; API com `selectedVersion`.
- **CBO**: busca por título, código e hierarquia no portal do MTE. Download oficial completo: não conferido.
- **Modelo 4S de Schlossberg**: situação (esperada, inesperada, que não aconteceu; outros problemas simultâneos), recursos pessoais (self), rede de apoio, estratégias (mudar a situação, mudar o sentido, lidar com o estresse).
- **Savickas / CAAS**: preocupação, controle, curiosidade, confiança; 24 itens (4×6) ou 12 (CAAS-SF). Licença: não conferida.
- **Perfilamento progressivo**: poucos campos no início, 1–3 por etapa; sensíveis depois; pular o já respondido; medir abandono por etapa; mostrar o ganho de responder (Okta). Dividir em telas não é, por si, perfilamento progressivo. O "+120%" de fornecedores: não conferido.

## 3. Banco de perguntas

Integrado à §4 de `../GUIA_DE_CARREIRA.md` (a1–a6, b1–b9, c1–c6, d1–d5, e1–e5, f1–f5).

## 4. O que não perguntar e acessibilidade

**Base legal**
- LGPD art. 5º II (dados sensíveis): origem racial ou étnica, religião, opinião política, filiação sindical/religiosa/filosófica/política, saúde, vida sexual, dados genéticos e biométricos.
- LGPD art. 11: tratamento só em hipóteses restritas (ex.: consentimento específico e destacado para finalidade definida). Redação literal: não conferida.
- LGPD art. 20: revisão de decisões automatizadas, inclusive as que definem "perfil pessoal, profissional" (secundária: Confidata).
- Lei 9.029/1995 art. 1º (conferida na Câmara): proíbe discriminação no acesso ao trabalho "por motivo de sexo, origem, raça, cor, estado civil, situação familiar, deficiência, reabilitação profissional, idade, entre outros". Art. 2º I: crime exigir teste/atestado/declaração sobre gravidez ou esterilização.
- CLT art. 373-A: proíbe anúncio com referência a sexo, idade, cor ou situação familiar (secundárias).

**Não perguntar**: data de nascimento ou idade (no máximo "tenho 18 anos ou mais", fora do perfil); gênero obrigatório, estado civil, filhos, planos de gravidez; religião, partido, sindicato; raça/cor como triagem; saúde, CID ou deficiência como diagnóstico; foto obrigatória; endereço completo (só cidade); CPF no onboarding (só com integração gov.br); motivo da demissão ou "por que ficou parado" obrigatório; salário obrigatório.

**IA**: não inferir dados sensíveis de textos, fotos ou Drawings; explicar "por que recebi esta sugestão" com contestação (art. 20). Se atender a UE: recrutamento é alto risco no AI Act (Anexo III) e exige supervisão humana; fontes divergem sobre ago/2027 ou dez/2027. PL 2338/2023: não conferido nesta pesquisa.

**Acessibilidade**: "o que deixa o WS mais fácil de usar para você", nunca diagnóstico; configuração de interface, fora do perfil público e de recrutadores.

**Vagas afirmativas ou PcD, se existirem**: opt-in separado, específico, revogável, com finalidade; visível só ao se candidatar a vaga desse tipo; nunca usado para ordenar candidatos. Lei 8.213 art. 93: não conferida.

## Fontes (acessadas em 31/10/2026)

- LinkedIn Help 67405: https://www.linkedin.com/help/linkedin/answer/67405
- LinkedIn Career Breaks: https://www.searchenginejournal.com/linkedin-profiles-can-now-display-career-breaks/441241 ; https://qz.com/work/2136597/linkedin-now-lets-you-explain-a-break-in-your-work-history
- Indeed preferências: https://www.indeed.com/help/job-seekers/articles/32603395892109-adding-or-editing-job-search-preferences
- Gupy: https://www.gupy.io/blog/atualizar-cadastro-gupy ; https://conteudos.gupy.io/hubfs/Ebook_Manual_completo_para_conquistar_a_vaga_dos_sonhos_2.pdf ; https://www.gupy.io/aviso-de-privacidade-candidatos
- Catho: https://www.catho.com.br/carreira-sucesso/como-preencher-o-curriculo-da-catho/
- Vagas.com: https://www.vagas.com.br/blog/?p=1170 ; https://www.vagas.com.br/blog/?p=701 ; https://www.vagas.com.br/candidatos/termos-de-uso
- InfoJobs BR: https://www.infojobs.com.br/legal/politica-de-privacidade-para-candidatos__15728.aspx
- SINE/gov.br: https://www.gov.br/pt-br/servicos/buscar-emprego-no-sistema-nacional-de-emprego-sine ; CTPS e vagas: https://jovempan.com.br/noticias/economia/nova-funcionalidade-da-carteira-de-trabalho-digital-facilita-consulta-a-vagas-de-emprego.html
- Coursera/Google: https://www-cloudfront-alias.coursera.org/collections/google-career-certificates
- Duolingo: https://goodux.appcues.com/blog/duolingo-user-onboarding ; https://decode.agency/article/app-onboarding-examples ; https://uxdesign.cc/duolingos-onboarding-2-years-on-3cbccad139f7
- O*NET IP: https://www.onetcenter.org/IP.html
- ESCO v1.2: https://esco.ec.europa.eu/system/files/2024-05/V1.2%20Launch%20-%20ESCO%20SEC%20combined%20-%20final%20clean.pdf ; https://esco.ec.europa.eu/en/use-esco/use-esco-services-api/esco-web-service-api
- CBO: https://www.gupy.io/blog/cbo ; https://www.pravaler.com.br/consulta-cbo-online/
- Schlossberg 4S: https://ncda.org/aws/NCDA/pt/sd/news_article/621035/_PARENT/CC_layout_details/false ; https://ijpes.com/index.php/ijpes/article/download/1352/604
- CAAS (Savickas): https://www.marksavickas.com/files/Assessments/CAAS/1.%20CAAS%20master.pdf ; https://www.kent.edu/node/696236
- Perfilamento progressivo: https://okta.com/resources/whitepaper-progressive-profiling-a-primer ; https://involve.me/blog/progressive-profiling-101-collect-more-data-without-friction ; https://www.pedowitzgroup.com/reveal-new-fields-over-time-vs.-all-at-once
- Lei 9.029/1995 (Câmara): https://www2.camara.leg.br/legin/fed/lei/1995/lei-9029-13-abril-1995-348798-normaatualizada-pl.html
- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm (acesso bloqueado) ; https://www.migalhas.com.br/depeso/341100/os-dados-pessoais-sensiveis-na-era-do-big-data ; https://confidata.com.br/blog/decisoes-automatizadas-lgpd-direitos-obrigacoes
- CLT 373-A: https://www.aurum.com.br/blog/clt-comentado/art-372-a-378-clt/
- EU AI Act e RH: https://hunton.com/insights/legal/the-impact-of-the-eu-ai-act-on-human-resources-activities
