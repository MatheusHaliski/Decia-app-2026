// GERADO por scripts/rf/gerar-catalogo.mjs a partir de docs/diagramas/RFnn/README.md — não editar à mão.
// Título, HU, Aba/rota, cobertura e CAs copiados dos READMEs (texto-fonte em pt-BR). Teste: lib/rf/catalog.test.ts.

export type CaKind = 'enunciado' | 'rastreabilidade';
export interface RfCa { id: string; text: string; note: string; kind: CaKind }
export interface RfEntry { id: string; n: number; title: string; hu: string | null; summary: string | null; route: string | null; coverage: string | null; cas: RfCa[] }

export const RF_CATALOG: readonly RfEntry[] = [
  {
    "id": "RF1",
    "n": 1,
    "title": "Cadastrar usuário na plataforma com dados de acesso",
    "hu": "COMO visitante do sistema POSSO realizar meu cadastro na plataforma informando meus dados de acesso PARA obter uma conta e acessar as funcionalidades do DECIA.",
    "summary": null,
    "route": "/register → /verify-email (BFF /bff/auth/register) — rota sugerida",
    "coverage": "RF1.CA01 … RF1.CA06 (RF1–RF18 não têm CAs no board: derivados da HU1 e marcados \"CA a confirmar\") · RF1.CA07–CA13 (§7, segurança D-14) · RF1.CA14–CA27 (§8, aceite dos termos e tipos de perfil, D-15…D-22, \"CA a confirmar\")",
    "cas": [
      {
        "id": "RF1.CA01",
        "text": "Dado o formulário de cadastro, quando informo perfil (ProfileType EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO), nome completo, username, e-mail, senha e confirmação, então cada campo é validado (formato de e-mail, username normalizado sem reservados, política mínima de senha, senhas iguais) e os erros voltam como 422 VALIDACAO com details por campo e correlationId.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA02",
        "text": "Dado um username já cadastrado, então 409 USERNAME_EM_USO com details.suggestions (username é público; GET /api/usernames/{u}/availability e GET /api/auth/username-suggestions). Dado um e-mail já cadastrado, então a resposta é a mesma 202 VERIFICACAO_ENVIADA do cadastro novo (sem oráculo) e a pessoa recebe um e-mail \"você já tem uma conta\" em vez do código — não há 409 EMAIL_EM_USO. Implementado em RegistrationService.register.",
        "note": "CA a confirmar — corrigido no Bloco 3, Q-86/D-27",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA03",
        "text": "Dado um cadastro válido, então a senha é guardada apenas como hash Argon2id (parâmetros mínimos OWASP) via PasswordHasherPort, nunca aparece em log, evento ou auditoria; e-mail e telefone são cifrados em repouso (AesGcmStringConverter, LGPD).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA04",
        "text": "Dado o cadastro criado, então a conta nasce com AccountStatus PENDING_EMAIL_VERIFICATION e recebe um código de verificação por e-mail (AFTER_COMMIT); ao confirmar o código, EMPREGADO → ACTIVE e EMPRESA/CHEFE_DEPARTAMENTO → PENDING_VALIDATION com ApprovalRequest PENDENTE para o ADMIN (RF28.CA01).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA05",
        "text": "Dado o cadastro criado, então o sistema cria UserPreferences padrão (theme AUTO, language PT_BR, timezone America/Sao_Paulo, wipLimit 3, aiModeDefault ECONOMIA) e grava terms_version/privacy_version vigentes; a sessão (access JWT 15 min + refresh para o BFF) é emitida só na confirmação do código (POST /api/auth/email-verification/confirm) — emitir no register revelaria se a conta era nova. A tela vai para /verify-email sem sessão.",
        "note": "CA a confirmar — ajustado no Bloco 3, Q-86",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA06",
        "text": "Dado tentativas repetidas, então há limite por IP (429 LIMITE_ENVIOS) e por código informado (429 MUITAS_TENTATIVAS); AuditLog USER_REGISTERED e EMAIL_VERIFIED são gravados sem dados sensíveis e com correlationId.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA07",
        "text": "Dado um cadastro válido, então a senha é guardada com Argon2id exatamente em m=19456 KiB, t=2, p=1, salt 16 bytes, hash 32 bytes (mínimo OWASP), e needsRehash refaz o hash no próximo login quando os parâmetros mudarem.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA08",
        "text": "Dado o mesmo IP (assinado pelo BFF em X-Ws-Client-Ip/X-Ws-Proxy-Ts/X-Ws-Proxy-Sig; senão X-Real-IP; senão TCP; nunca X-Forwarded-For; IPv6 por /64), então o AuthRateLimitFilter aplica, antes do Spring Security, POST /api/auth/register 10/h, envios do cadastro 40/h, GET /api/auth/username-suggestions 60/10 min e disponibilidade de username 120/10 min; o excedente recebe 429 MUITAS_TENTATIVAS com Retry-After (substitui o 429 LIMITE_ENVIOS do CA06).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA09",
        "text": "Dado um pico de cadastros, então o HashBulkhead (permits = max(1, min(max(2, núcleos), poolDoBanco/2)), espera 2 s) limita os Argon2 simultâneos e o excedente recebe 503 AUTENTICACAO_OCUPADA + Retry-After; 60 pedidos paralelos geram zero HTTP 500.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA10",
        "text": "Dado um username que, depois da normalização (Usernames.normalize), seja admin, root, suporte, secid, decia, workstation ou comece com demo_/e2e_, então o cadastro responde 422 NOME_RESERVADO (código próprio, com details.suggestions); a conta de administração só nasce pelo AdminBootstrap (WS_ADMIN_BOOTSTRAP_ENABLED=true, segredo WS_ADMIN_INITIAL_PASSWORD ≥ 16 chars sem padrão, só se não existe nenhum ADMIN; nunca promove conta existente sem WS_ADMIN_PROMOTE_EXISTING=true).",
        "note": "CA a confirmar — ajustado no Bloco 3",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA11",
        "text": "Dado o código de verificação, então há no máximo 5 tentativas por código (attempts++ persiste mesmo com erro, noRollbackFor) e um contador atômico de 10 tentativas/h por pessoa e finalidade; o excedente recebe 429 MUITAS_TENTATIVAS.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA12",
        "text": "Dado o cadastro criado, então users.account_origin nasce REAL (enum AccountOrigin REAL/TEST_SEED/DEMO/SYSTEM desde o V1__baseline.sql), com fixture_key NULL e test_account gerada = false; contas TEST_SEED/DEMO ficam fora de rankings, HSE, DECIA Points e métricas do RF43, e o e-mail nunca é enviado a .test/.example/.invalid/.localhost.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA13",
        "text": "Dado qualquer log ou evento do cadastro, então o e-mail aparece mascarado (maskEmail: m@dominio) e nunca há senha, token ou código; a sessão emitida no CA05 segue o RF2 (TTL do access token em aberto na Q-49*: 10 min na ARQUITETURA, 15 min aqui).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA14",
        "text": "Dado o formulário de cadastro, então o Checkbox \"Li e aceito os Termos de Uso e a Política de Privacidade\" vem desmarcado, com links para os dois documentos que abrem em Sheet ou em nova aba sem perder o formulário; o botão \"Criar conta\" fica disabled até marcar (teste Vitest: sem o checkbox o submit não dispara).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA15",
        "text": "Dado o pedido chegando sem acceptTerms=true, então o servidor responde 422 VALIDACAO com details.acceptTerms (teste de integração); o cliente envia as versões que exibiu (termsVersion, privacyVersion) e, se alguma não for a VIGENTE, recebe 409 VERSAO_DOS_TERMOS_DESATUALIZADA (Q-70).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA16",
        "text": "Dado o cadastro aceito, então são gravadas duas linhas em policy_acceptances (TERMOS e PRIVACIDADE, cada uma com version, accepted_at, ip, user_agent, channel), a cópia em users.terms_version/privacy_version e o AuditLog POLICY_ACCEPTED {document, version, channel}. A tabela é append-only e a FK é ON DELETE RESTRICT: o registro sobrevive à anonimização (art. 8º, § 2º).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA17",
        "text": "Dado qualquer caminho que cria conta, então o aceite é capturado: cadastro local (CADASTRO_LOCAL), primeiro login OIDC numa tela de conclusão de cadastro (OIDC, Q-02) e seed demo (SEED). O admin do AdminBootstrap não recebe aceite automático e passa pelo gate (CA18) no primeiro login.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA18",
        "text": "Dado que a versão VIGENTE de um documento é mais nova que a aceita, então o app abre um Dialog bloqueante com o changelog e a API responde 403 ACEITE_PENDENTE a tudo, exceto GET /api/me/policies, POST /api/me/policies/accept {document, version}, logout, exportação (/api/me/exports) e pedido de exclusão (/api/me/deletion): quem recusa continua exercendo seus direitos. O aceite novo entra com channel REACEITE.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA19",
        "text": "Dado as páginas públicas /termos e /privacidade, então elas funcionam sem login e pelo gate, mostram a versão vigente e o histórico (GET /api/legal/{TERMOS|PRIVACIDADE}/current e /versions), e o PolicyTextGuardTest falha se a versão publicada tiver marcador [ … ] ou \"validar com jurídico\" (regras em docs/legal/README.md).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA20",
        "text": "Dado o cadastro, então nenhum consentimento de finalidade opcional (ConsentPurpose) é pedido junto com o aceite (art. 8º, § 4º); user_consents nasce vazio e os interruptores ficam só em /settings?tab=privacidade (RF3.CA10).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA21",
        "text": "Dado a resposta à Q-63: se menores não podem usar, a data de nascimento não é coletada; se podem, birthDate é obrigatória no servidor (campo vazio → 422 details.birthDate, nunca \"pulado\" como no FAI) e a regra do art. 14 é aplicada.",
        "note": "CA a confirmar, Q-63",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA22",
        "text": "Dado a escolha do tipo, então ela é feita com RadioCard (ícone, título, uma linha do que o perfil pode fazer e o aviso \"precisa de validação\" em EMPRESA e CHEFE_DEPARTAMENTO); ADMIN enviado no corpo recebe 422 VALIDACAO (details.profileType); CURADOR não é tipo (D-09).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA23",
        "text": "Dado o tipo escolhido, então os campos extras são (proposta): EMPREGADO jobTitle e intendedDepartmentId opcional (não lota; quem lota é o chefe, RF28.CA02); EMPRESA legalName, companyCnpj (dígitos verificadores), officialSite obrigatório (normalizado para https://, recusa @perfil) e representationDocId; CHEFE companyId existente, departamento e appointmentLink (Diário Oficial). Erros voltam como 422 VALIDACAO com details por campo.",
        "note": "CA a confirmar, Q-64",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA24",
        "text": "Dado a resposta à Q-62, então EMPREGADO pode exigir e-mail de domínio institucional numa lista permitida (422 details.email); para EMPRESA, se o domínio do e-mail for igual ao do officialSite (fora da lista de e-mails gratuitos), o critério REPRESENTACAO da validação é marcado automaticamente (RF28.CA15).",
        "note": "CA a confirmar, Q-62",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA25",
        "text": "Dado POST /api/auth/uploads?kind=, então kind só pode ser avatar, identity ou representation; há limite de bytes e de pixels (SEG RN49.08), reencode que remove EXIF/GPS, documentos vão para restricted/pending/… e viram PendingUpload com expiresAt = +24 h; o cadastro só aceita URL de envio pendente do mesmo kind (422 details.<campo>); o PendingUploadCleanupJob apaga os abandonados, e um teste prova que o método está agendado (@Scheduled + lock).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA26",
        "text": "Dado o campo username, então a disponibilidade é consultada com debounce de 400 ms (GET /api/auth/username-availability), a lista de reservados normalizada inclui secid, decia, workstation e os prefixos demo_/e2e_ (CA10) e há sugestões (/username-suggestions).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA27",
        "text": "Dado EMPRESA ou CHEFE_DEPARTAMENTO, então o ApprovalRequest nasce só depois da confirmação do e-mail (resolve a divergência entre o CA04 e o passo C7 do §2, onde ele nascia no registro); o prazo em dias úteis conta daí (RF28.CA12); enquanto PENDING_VALIDATION, Guard.requireApprovedProfile responde 403 PERFIL_EM_VALIDACAO e o menu esconde as ações de emissor.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF2",
    "n": 2,
    "title": "Autenticar usuário na plataforma com credenciais de acesso",
    "hu": "COMO usuário cadastrado no sistema POSSO autenticar-me na plataforma com minhas credenciais de acesso PARA acessar minha área pessoal de forma segura.",
    "summary": null,
    "route": "/login (BFF /bff/auth/login, /bff/auth/refresh, /bff/auth/logout, /bff/auth/oidc/[provider]) — rota sugerida",
    "coverage": "RF2.CA01 … RF2.CA06 (RF1–RF18 não têm CAs no board: derivados da HU2 e marcados \"CA a confirmar\")",
    "cas": [
      {
        "id": "RF2.CA01",
        "text": "Dado identifier (username ou e-mail) e senha, quando faço login, então a senha é conferida contra o hash Argon2id (PasswordHasherPort.matches, com re-hash transparente se os parâmetros mudaram) e recebo um access JWT (15 min; claims user_id, sid=familyId, role, profile_type) e um refresh token opaco (30 d se \"lembrar-me\", 24 h se não) guardado como hash no Redis (refresh:{familyId}) com espelho em refresh_tokens; o BFF devolve o refresh só em cookie HttpOnly + Secure + SameSite=Strict (ws_rt).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA02",
        "text": "Dado credenciais erradas, usuário inexistente ou conta bloqueada por tentativas (mesmo com a senha certa), então a resposta é idêntica: 401 CREDENCIAIS_INVALIDAS, mesma mensagem, sem details (conta inexistente avalia um hash falso). Só depois da senha certa e fora do bloqueio: conta SUSPENDED/ANONYMIZED → 403 CONTA_INDISPONIVEL; twoFactorEnabled → 401 DOIS_FATORES_NECESSARIO (details.twoFactorRequired=true; conferência TOTP é a Q-83). DELETION_SCHEDULED entra com aviso (para cancelar a exclusão, D-18); PENDING_EMAIL_VERIFICATION não tem sessão antes de confirmar o código. Implementado em IdentityService.login; testes IdentityServiceTest.",
        "note": "CA a confirmar — corrigido no Bloco 3, Q-82",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA03",
        "text": "Dado o botão \"Entrar com conta institucional\", então o fluxo OAuth2/OIDC Authorization Code + PKCE (Google Workspace ou Microsoft 365 / Entra ID) valida o id_token (assinatura JWKS, iss, aud, nonce, exp), vincula oidcSubject/oidcIssuer ao User existente de mesmo emailHash (ou cria conta ACTIVE, passwordHash nulo, emailVerified true) e emite a mesma sessão do CA01.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA04",
        "text": "Dado um refresh token válido, quando o BFF chama /api/auth/refresh, então ocorre rotação: novo token da mesma família, o anterior fica revokedAt/rotatedFromId; reuso de um token já rotacionado revoga a família inteira e responde 401 SESSAO_INVALIDA (detecção de roubo).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA05",
        "text": "Dado o usuário autenticado, então logout revoga a família; GET /api/auth/sessions lista dispositivos (deviceName, IP, lastUsedAt, atual) e DELETE /api/auth/sessions/{familyId} revoga outra sessão; trocar a senha encerra todas as outras famílias. SessionActiveFilter recusa access tokens cuja família foi revogada (sid).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA06",
        "text": "Dado tentativas repetidas, então há limite por IP e por identifier (429 MUITAS_TENTATIVAS), AuditLog LOGIN_OK / LOGIN_FALHA / REFRESH_REUSO / LOGOUT com correlationId e sem senha, e User.lastLoginAt é atualizado; todas as mensagens são i18n (pt-BR/en/es).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA07",
        "text": "IdentityService.login (hash falso para conta inexistente), PasswordHasherPort.matches",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA08",
        "text": "RateLimitPort.tryAcquire/release/reset (login-fail, 5, 15 min), RedisRateLimiter (Lua)",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA09",
        "text": "IdentityService.passwordMatchesWithLockout/changePassword/reauthenticate",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA10",
        "text": "AuthRateLimitFilter.RULES, ClientIpResolver",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA11",
        "text": "HashBulkhead",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA12",
        "text": "IdentityService.loginOidc, OidcClientPort.validateIdToken (email_verified)",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA13",
        "text": "JwtTokenIssuer.ttl (Q-49), SessionActiveFilter",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA14",
        "text": "AuditLog (LOGIN_OK, LOGIN_FALHA, LOGIN_BLOQUEADO_TENTATIVAS, REFRESH_REUSO), IdentityService.maskEmail",
        "note": "CA a confirmar, D-14",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF3",
    "n": 3,
    "title": "Editar informações pessoais e preferências do perfil do usuário",
    "hu": "COMO usuário autenticado no sistema POSSO editar minhas informações pessoais e preferências de perfil PARA manter meus dados atualizados e personalizar minha experiência na plataforma.",
    "summary": null,
    "route": "Meu perfil → Editar (/profile/edit) e /settings com abas na URL (?tab=conta|aparencia|privacidade|dados|sessoes|termos, §7; substitui /settings/preferences) — rotas sugeridas; a aba Meu perfil é /profile (RF19)",
    "coverage": "RF3.CA01 … RF3.CA06 (RF1–RF18 não têm CAs no board: derivados da HU3 e marcados \"CA a confirmar\") · RF3.CA07–CA24 (§7, configurações e direitos do titular — o \"RF23\" do FAI, Q-46 —, D-15…D-21, \"CA a confirmar\")",
    "cas": [
      {
        "id": "RF3.CA01",
        "text": "Dado o usuário autenticado, quando edito fullName, displayName, jobTitle (cargo), bio, phone, avatarUrl, coverUrl, então os campos são validados (tamanhos da TAXONOMIA, telefone E.164) e salvos via PATCH /api/me; username é imutável após a verificação (422 USERNAME_IMUTAVEL); erros voltam como 422 VALIDACAO com details por campo.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA02",
        "text": "Dado a troca de e-mail/telefone (PATCH /api/me/sensitive), então é exigida a senha atual no mesmo bloqueio do login (401 REAUTENTICACAO_FALHOU; 6º erro → 429 MUITAS_TENTATIVAS + Retry-After), o emailHash deve ser único (409 EMAIL_EM_USO — aceitável: a pessoa já está autenticada), emailVerified volta a false e um novo código é enviado. Divergência a confirmar: hoje o e-mail novo passa a valer imediatamente para login (não há coluna de \"e-mail pendente\" no V2); manter o antigo até confirmar exige V4. OIDC recente como reautenticação: Q-85.",
        "note": "CA a confirmar — ajustado no Bloco 3",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA03",
        "text": "Dado a tela de preferências, quando altero theme (ThemeMode AUTO·CLARO·ESCURO·ALTO_CONTRASTE·BLUEPRINT), language (UiLanguage PT_BR·EN·ES), density, fontScale, reduceMotion, deskSkin (DeskSkin), defaultCardSkin, timezone, wipLimit, aiModeDefault (ECONOMIA·AVANCADO) e notificationPrefsJson (inclui dailyTaskAt 08:00, RF44.CA10), então elas são aplicadas imediatamente no cliente (sem recarregar) e persistidas em user_preferences (PUT /api/me/preferences), respeitando RF38.CA08.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA04",
        "text": "Dado as opções de privacidade, quando altero hypeVisibility (PUBLICO·EMPRESA·SO_EU, RF45.CA06) e rankingOptOut (RF43.CA05), então a mudança vale na próxima leitura do perfil/ranking e fica em AuditLog PRIVACY_CHANGED.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA05",
        "text": "Dado o upload de avatar ou capa, então o arquivo (≤ 5 MB, mime detectado pelo conteúdo: png/jpg/webp) vira MediaObject no S3/MinIO com accessClass PUBLICO, um PipelineJob THUMBNAIL gera as variantes de forma assíncrona e o User.avatarUrl/coverUrl aponta para a variante; o anterior é removido quando substituído.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA06",
        "text": "Dado qualquer alteração de perfil, então ela gera AuditLog PROFILE_UPDATED (sem valores sensíveis, com correlationId) e o evento UserProfileUpdated (AFTER_COMMIT) reindexa a pessoa na busca (OpenSearch, RF27) e invalida o cache do cabeçalho do perfil (RF19); campos LGPD (email, phone) permanecem cifrados com AesGcmStringConverter.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA07",
        "text": "Dado /settings, então as abas usam Tabs de packages/ui com a aba atual na URL (?tab=conta), navegáveis por teclado; nenhuma aba contém HTML/CSS solto (D-11).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA08",
        "text": "Dado a troca de e-mail, então ela exige a senha atual com o bloqueio da SEG RN49.03 (6º erro → 429 MUITAS_TENTATIVAS + Retry-After), envia um código ao e-mail novo e um aviso ao antigo; a troca de senha encerra as outras sessões (RF2.CA05). Refina o CA02.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA09",
        "text": "Dado a aba Privacidade, então hypeVisibility nasce SO_EU e rankingOptOut false; alterar grava AuditLog PRIVACY_CHANGED e vale na próxima leitura (refina o CA04).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA10",
        "text": "Dado os consentimentos, então existem só para finalidades opcionais (ConsentPurpose proposto: RESUMO_PROFISSIONAL_IA, RF43.CA04; GRAVACAO_REUNIOES_PADRAO, preferência — o consentimento por reunião continua no RF37); cada uma mostra title, description, legalBasis, article, sensitive, grantedAt, revokedAt e policyVersion (campos iguais aos do OpenAPI, CA24); nunca vem marcada; revogar tem o mesmo esforço que conceder (PUT /api/me/consents/{purpose} {granted}).",
        "note": "CA a confirmar, Q-67",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA11",
        "text": "Dado conceder ou revogar, então grava-se uma linha em consent_events (append-only) e o estado em user_consents, mais AuditLog CONSENT_GRANTED ou CONSENT_REVOKED; o histórico aparece na própria aba.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA12",
        "text": "Dado o enum ConsentPurpose, então cada valor tem um ponto de verificação registrado em ConsentChecks (mapa finalidade → método que o serviço chama antes do tratamento); ConsentCoverageTest falha o CI para finalidade sem checagem, e finalidade sem uso não aparece na tela.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA13",
        "text": "Dado \"Quais dados temos\" (art. 9º; art. 18 I e II), então a página lista, por categoria, finalidade, base legal, retenção e com quem é compartilhada (provedores de IA com mascaramento, Google Workspace, Microsoft 365), tudo vindo do PersonalDataRegistry (GET /api/me/data-map) — o mesmo registro que a exportação usa.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA14",
        "text": "Dado \"Exportar meus dados\", então POST /api/me/exports cria DataExportRequest REQUESTED e enfileira PipelineJob DATA_EXPORT (assíncrona); limite 3 por dia por pessoa (429 LIMITE_EXPORTACOES); estados REQUESTED → PROCESSING → READY → EXPIRED | FAILED; GET /api/me/exports lista com requestedAt e expiresAt.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA15",
        "text": "Dado a exportação pronta, então o arquivo tem nome e tipo corretos (.json + application/json, ou um ZIP de verdade), sai no idioma da pessoa, fica em restricted/users/{userId}/exports/, só o dono baixa (OwnMedia, 403 para os outros), o link expira em 7 dias (410 EXPORTACAO_EXPIRADA) e há notificação quando fica pronta.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA16",
        "text": "Dado o conteúdo, então inclui perfil, preferências, aceites, consentimentos e histórico; sessões, lotações e nomeações; tarefas e projetos de autoria própria e as próprias mensagens do DECIA (nunca as de outras pessoas); decisões de que participou, pontos, reconhecimentos; inferências de IA sobre a pessoa e a auditoria sobre ela.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA17",
        "text": "Dado uma entidade com coluna de pessoa (userId, authorId, actorId, ownerId, recipientId…), então ela está no PersonalDataRegistry ou em EXCLUDED_WITH_REASON; PersonalDataRegistryCoverageTest falha o CI para entidade nova sem classificação.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA18",
        "text": "Dado \"Outros direitos\", então a pessoa pode abrir DataSubjectRequest de revisão de decisão automatizada (art. 20: HSE, ranking, Hype ou classificação por IA, com targetId), oposição e informação sobre compartilhamento; cada pedido tem prazo (dueAt), status, encarregado responsável e AuditLog DSR_OPENED; o canal do encarregado (WS_LEGAL_DPO_CONTACT) aparece na aba. Correção é pela aba Conta.",
        "note": "CA a confirmar, Q-71",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA19",
        "text": "Dado \"Encerrar minha conta\", então o pedido exige a senha atual com bloqueio, e antes de confirmar o Dialog mostra o que será anonimizado e o que fica guardado e por quê (documentos públicos com guarda legal: atas, decisões validadas, DecisionTrace, chancelas emitidas, ledger; e os aceites — art. 16 e tabela de temporalidade); a conta vai a DELETION_SCHEDULED por 30 dias, cancelável; AuditLog ACCOUNT_DELETION_REQUESTED / ACCOUNT_DELETION_CANCELLED.",
        "note": "CA a confirmar, Q-68",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA20",
        "text": "Dado DELETION_SCHEDULED, então o login mostra um Banner com a data e o botão de cancelar, criar conteúdo recebe 403 EXCLUSAO_AGENDADA e o perfil fica oculto (busca, rankings, Mural).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA21",
        "text": "Dado o prazo vencido, então o AccountAnonymizationJob roda por @Scheduled com lock (ShedLock) que impede execução dupla em várias réplicas; teste 1 prova que o método está agendado; teste 2 (Testcontainers) prova que ele anonimiza os dados pessoais no MySQL, apaga arquivos e documentos de restricted/, limpa as projeções no Cassandra e no OpenSearch, revoga as sessões e grava ACCOUNT_DELETION_COMPLETED, mantendo policy_acceptances, consent_events e os documentos públicos.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA22",
        "text": "Dado as abas Sessões e Termos e políticas, então a primeira reaproveita RF2.CA05 e a segunda mostra, por documento, a versão aceita, a data, o canal e o link para a versão vigente (GET /api/me/policies).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA23",
        "text": "Dado qualquer controle da tela, então valem os padrões LGPD: privacidade por padrão, aceitar e recusar com o mesmo destaque, nenhum texto que constranja quem recusa, foco visível, navegação por teclado e reduceMotion respeitado.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA24",
        "text": "Dado o contrato front/back, então os tipos TypeScript do front são gerados do OpenAPI (springdoc → openapi-typescript) e o CI falha se o arquivo gerado divergir do commitado ou se o front ler um campo que o back não declara (defeito 7 do FAI).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF4",
    "n": 4,
    "title": "Utilizar o criador de tarefas, escolhendo o tipo do arquivo e editando detalhes, em modo manual ou com IA",
    "hu": "COMO usuário logado dentro do sistema WS POSSO acessar a aba criar nova tarefa PARA criar um esquema de tarefa único e personalizado conforme as diretrizes de minha equipe de trabalho.",
    "summary": "A tarefa (TaskItem) é a unidade mínima do Work Station (= peça de roupa). O título atual do card destaca três coisas que o corpo (RF20) detalha: (a) escolher o tipo do arquivo — a aba da fonte na etapa 1 determina SourceKind e o TaskType sugerido (tabela abaixo), editável na etapa 3; (b) editar detalhes — etapas 3 (dados da tarefa, taxonomia oficial) e 4 (Mais detalhes); (c) modo manual ou com IA — no modo Com IA a etapa 2 (TaskDetectionService → AiEngine PREENCHER_TAREFA) pré-preenche o formulário com confiança por campo e faísca ✦, e a aba \"Texto com IA\" redige a tarefa; no modo Manual a detecção é pulada (ou falha, CA03) e o formulário nasce vazio. As 5 etapas são: (1) Fonte; (2) Detecção por IA; (3) Dados da tarefa (prazo legal via DeadlineService, órgão via busca web); (4) Mais detalhes (chancelas RF39, visibilidade, estado inicial, situação do documento, protocolo, guarda, Balcão RF40, tags, dependências, projeto/fase); (5) Arte do card (thumbnail assíncrono RF38). Antivírus (AntivirusPort), OCR (OcrPort) e thumbnail rodam como PipelineJob após o commit e o resultado entra no Acervo (RF6/RF41).",
    "route": "Criar Tarefa (/tasks/new; também pela folha \"+ Criar\" e pelo botão \"Cadastrar nova tarefa\" do Criador de Projetos, RF5)",
    "coverage": "RF20.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 · CA15 — corpo do card = card RF20 (o card RF4 está vazio; o criador de tarefas está descrito no corpo do card RF20, cujos CAs são citados aqui como estão escritos; ver RENUMERACAO.md)",
    "cas": [
      {
        "id": "RF20.CA01",
        "text": "tipo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA02",
        "text": "modo (Com IA)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA03",
        "text": "modo (Manual / fallback)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA04",
        "text": "detalhes",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA05",
        "text": "tipo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA06",
        "text": "tipo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA07",
        "text": "tipo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA08",
        "text": "tipo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA09",
        "text": "tipo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA10",
        "text": "detalhes",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA11",
        "text": "detalhes",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA12",
        "text": "tipo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA13",
        "text": "detalhes (Mais detalhes)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA14",
        "text": "detalhes",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA15",
        "text": "detalhes (Mais detalhes)",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF5",
    "n": 5,
    "title": "Utilizar o criador de projetos, escolhendo em cada fase do projeto as unidades de tarefa, em modo manual ou com IA",
    "hu": "COMO usuário logado dentro do sistema WS POSSO acessar a aba criar novo projeto PARA criar um esquema de projeto único e personalizado conforme as diretrizes de minha equipe de trabalho.",
    "summary": "O Esquema de Projeto (ProjectScheme, = look) é a composição ordenada de tarefas (TaskItem, = peças) em 7 fases (ProjectPhase: DEMANDA · PLANEJAMENTO · ELABORAÇÃO · ANÁLISE · APROVAÇÃO · EXECUÇÃO · ENCERRAMENTO). Cada fase tem um select múltiplo pesquisável cujo conteúdo são as unidades de tarefa do Acervo do usuário (RF6/RF41) compatíveis com a fase (mapa PHASE_BY_CATEGORY, equivalente ao SLOT_BY_CATEGORY do FAI). Cada tarefa selecionada vira um ProjectTask (fase, ordem, responsável, prazo) e as dependências viram ProjectTaskDependency (sem ciclos). O compositor funciona em modo Manual ou Com IA (AiEngine COMPOR_PROJETO devolve 3 propostas usando só tarefas do Acervo), aceita \"Criar a partir de modelo\" (Kit / modelo chancelado, com Remix e crédito), abre o criador de tarefas (RF4, corpo RF20) em modal e mantém autosave do rascunho em ProjectScheme.autosaveDraftJson.",
    "route": "Criar Projeto (/projects/new)",
    "coverage": "RF21.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 — corpo do card = antigo RF21 (o card RF5 traz os CAs escritos como RF21.CA01–14; são citados aqui como estão no board, ver RENUMERACAO.md)",
    "cas": [
      {
        "id": "RF21.CA01",
        "text": "ProjectComposerService.openComposer, AcervoService.countAvailable · Atividades U1 → A1 → A2 (sim) → W1 · Sequência GET /api/projects/composer → else 2 ou mais → \"Acervo à esquerda, 7 selects vazios, ficha à direita\" · Componentes AcervoPanel, PhaseSelect x7, ProjectSheet",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA02",
        "text": "Atividades A2 (não) → W2 (orientação + atalho /tasks/new) · Sequência alt menos de 2 tarefas DISPONIVEIS → {composerEnabled: false, hint: CADASTRE_TAREFAS}",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA03",
        "text": "AcervoService.listCompatible (nota PHASE_BY_CATEGORY, desabilitadas com motivo), tabela PHASE_BY_CATEGORY do cabeçalho, enum TaskState · Atividades U3 → A3 → P1 · Sequência GET /api/acervo/tasks?phase=PLANEJAMENTO&q=ETP → \"BLOQUEADA/ARQUIVADA com disabled e disabledReason\" · Componentes AcervoController, PhaseSelect",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA04",
        "text": "Classes ProjectScheme (origin CRIAR_PROJETO, creationMode, visibility herdada), ProjectTask (nota responsibleId/dueAt padrão), TaskStateLog, AcervoService.markInUse · Atividades U7 → A11 → A12 (sim) → A17 → A18 → P3 · Sequência else válido (CA04): UPDATE project_schemes, INSERT project_tasks, UPDATE tasks EM_USO, INSERT task_state_log · Transição RASC_AUTO → RASC_SALVO e nota",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA05",
        "text": "ProjectComposerService.validateMinimum · Atividades A12 (não) → A13 422 FASES_MINIMAS → W6 · Sequência alt sem tarefa ou só DEMANDA → 422 FASES_MINIMAS · Nota do estado RASC_SALVO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA06",
        "text": "ProjectComposerService.composeWithAi, AiEngine (COMPOR_PROJETO), AiInferenceLog, enums CreationMode.COM_IA, SchemeOrigin.AUTOPILOTO · Atividades U2 (Com IA) → I1 → P4 → U11 · Sequência opt modo Com IA: POST /api/projects/ai-compose → 3 propostas → INSERT ai_inference_log · Componentes AiComposePanel, ai-providers",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA07",
        "text": "TaskCreatorService.save, ProjectController ..> TaskCreatorService · Atividades U4 → W3 → U3 · Sequência \"Cadastrar nova tarefa dentro do select\" → POST /api/tasks (modal RF4) → \"já selecionada na fase\" · Componentes Modal TaskCreator RF4, TaskController RF4",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA08",
        "text": "Classes ProjectTaskDependency (nota 422), ProjectComposerService.validateDependencies/criticalPath, ProjectScheme.criticalPathJson, ProjectTask.isCritical/slackDays · Atividades U5 → A4 → A5/A6 → A7/A8 → A9 · Sequência POST /api/projects/validate-dependencies → alt ciclo ou prazo inválido / else válido (criticalPath CPM) · Componentes DependencyEditor, CriticalPathPreview, D4",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA09",
        "text": "Classes SealBond (TASK ou PROJECT), TaskItem.sealIdsJson, ProjectScheme.sealIdsJson, SealService.inheritFromTasks/suggestForProject · Atividades A10 · Sequência \"chancelas das tarefas em Chancelas do projeto\" e DE->>S: SealService.suggestForProject · Componente SealService RF39",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA10",
        "text": "ProjectScheme.coverMode/coverUrl/mosaicJson, MediaStoragePort.studio · Atividades A14 → A15 (mosaico) / A14 → A16 → P5 (foto tratada) · Sequência UPDATE project_schemes SET coverMode MOSAICO, mosaicJson · Componentes CardPreview, storage-s3",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA11",
        "text": "ProjectComposerService.publish, MuralService.publishProject, MuralEntry, SearchIndexPort · Atividades U9 → A21 → P6 · Sequência POST /api/projects/{id}/publish → status PUBLICADO, INSERT mural_entries, indexProject respeitando visibility · Transição RASC_SALVO → PUBLICADO · Componentes MuralService RF27, search-opensearch",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA12",
        "text": "DeciaSessionService.openFromProject, DeciaSession (topic = objective, linkedProjectId) · Atividades U10 → A22 → P7 · Sequência POST /api/projects/{id}/decia-session → decia_sessions, session_participants, message_attachments, status EM_DECISAO · Transição RASC_SALVO/PUBLICADO → EM_DECISAO e nota · Componente DeciaSessionService RF29",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA13",
        "text": "Classes ProcessKit, KitItem, Remix, ProjectScheme.originalProjectId, enum SchemeOrigin.MODELO/REMIX, ProjectComposerService.fromModel · Atividades U2 (Modelo ou Kit) → A19 → U3 · Componentes ModelPicker Kit/modelo, ProjectController /from-model",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA14",
        "text": "ProjectScheme.autosaveDraftJson, ProjectComposerService.autosave · Atividades U3/U6 → W4 → A20 → P2, U8 → W4, W7 (recupera) · Sequência loop a cada alteração → PUT /api/projects/drafts/{draftId} (sem project_tasks, sem EM_USO) e SELECT ... autosaveDraftJson IS NOT NULL na abertura · Estado RASC_AUTO + nota · Componente Autosave hook",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF6",
    "n": 6,
    "title": "Acessar e gerenciar o Perfil Empresarial (Acervo Digital + Projetos Salvos)",
    "hu": "COMO usuário autenticado dentro do sistema POSSO visualizar meu perfil com tudo o que criei (tarefas, projetos, planos, decisões) em sub-abas e o meu perfil deliberativo gerado pela IA PARA acompanhar e mostrar minha produção e minha evolução desde que entrei no sistema.",
    "summary": "O Perfil Empresarial é o perfil de trabalho do usuário (= Perfil Lookbook do FAI): cabeçalho (avatar, nome, cargo, empresa, departamento, contadores) e as sub-abas que o título do card recorta — Acervo Digital (sub-aba 1 do RF19: TaskItem do dono com os 8 estados do TaskState, RF41) e Projetos (sub-aba 2: ProjectScheme) para todos, mais Projetos salvos / Tarefas salvas (sub-abas 7–8: SavedItem, RF26.CA04) só para o dono. \"Gerenciar\" = ações rápidas do card (favoritar, mudar estado via TaskStateMachine, arquivar, duplicar, levar ao projeto, remover dos salvos). As demais sub-abas da HU6 (planos, decisões, perfil deliberativo) ficam no card RF26 (corpo = antigo RF19) e não são repetidas aqui.",
    "route": "Meu perfil (/profile, sub-abas ?tab=acervo|projetos|projetos-salvos|tarefas-salvas), perfil de terceiros em /u/[username]; Acervo também em /tasks",
    "coverage": "RF6.CA01 … RF6.CA06 — todos \"(CA a confirmar)\": o corpo do card RF6 está vazio; os CAs foram derivados do título + HU6 e reaproveitam o já validado em _anterior/RF19 (sub-abas 1–2 e 7–8), RF41 (estados do Acervo) e RF26.CA04 (salvar)",
    "cas": [
      {
        "id": "RF6.CA01",
        "text": "Dado um usuário autenticado, quando abre /profile, então vê o cabeçalho (avatar, nome, jobTitle, empresa, departamento, contadores de tarefas, projetos e salvos via Redis) e as sub-abas Acervo Digital, Projetos, Projetos salvos e Tarefas salvas; em /u/[username] um terceiro vê só Acervo Digital e Projetos, com itens filtrados por Visibility; sub-aba restrita acessada por terceiro → 403 ACESSO_NEGADO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA02",
        "text": "Dado a sub-aba Acervo Digital, então ela lista os TaskItem do dono em grade compacta com sub-filtros por estado (TaskState: RASCUNHO · DISPONIVEL · EM_USO · BLOQUEADA · CONCLUIDA · ARQUIVADA · MODELO_PUBLICO · OFERECIDA) com contadores, filtros por categoria/tipo/processo/natureza, ordenação (recentes, mais usadas, nome, prazo), busca (OpenSearch), paginação de 20 e querystring restaurável; skeleton, estado vazio ilustrado e \"tentar de novo\" em 503 BUSCA_INDISPONIVEL.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA03",
        "text": "Dado um card do meu Acervo, quando aciono uma ação rápida (favoritar ⭐, mudar estado, arquivar, duplicar, levar ao projeto), então a transição passa por TaskStateMachine e grava TaskStateLog; transição inválida → 422 TRANSICAO_INVALIDA; EM_USO é automático ao entrar em projeto ativo e MODELO_PUBLICO só via chancela/publicação; a etiqueta de estado aparece em texto no topo do card.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA04",
        "text": "Dado a sub-aba Projetos, então ela lista os ProjectScheme do dono com capa-mosaico, barra de fases, status e currentPhase, filtráveis por status/fase/exercício e paginados; abrir um card leva ao detalhe do projeto (lista por fase, RF7) e, para o dono, à edição (RF8/RF22).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA05",
        "text": "Dado a sub-aba Projetos salvos ou Tarefas salvas, então ela lista os SavedItem do dono (targetType PROJECT ou TASK) com marcador favorite, respeitando a visibilidade atual do alvo (alvo que ficou PRIVADO aparece como \"indisponível\"); \"Remover dos salvos\" apaga o SavedItem e decrementa savesCount; só o dono acessa (requireOwner).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA06",
        "text": "Dado o perfil de um terceiro, quando vejo seu Acervo Digital, então só aparecem tarefas com visibility compatível (PUBLICA; EMPRESA se mesma empresa; DEPARTAMENTO se membro), nunca PRIVADA; cada card oferece \"Levar ao meu acervo\" (RF7/RF23) e interações sociais (RF19 atual); a API devolve 403 ACESSO_NEGADO para item fora da visibilidade.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF7",
    "n": 7,
    "title": "Abrir um esquema de tarefa a partir da lista de um esquema de projeto",
    "hu": "COMO usuário visualizando um esquema de projeto POSSO clicar em um item da lista de tarefas PARA visualizar detalhes de uma tarefa e então compreender melhor o escopo do projeto.",
    "summary": "A lista de um Esquema de Projeto (ProjectScheme) é a sequência de ProjectTask por fase (ProjectPhase). Clicar num item abre o detalhe da tarefa (TaskItem, RF41.CA03) no contexto do projeto: além dos dados da tarefa (resumo, anexos com preview via MediaStoragePort.presign, versões TaskVersion, chancelas SealBond, fio de decisão DecisionTraceNode), a folha mostra a fase, a ordem, o responsável e o prazo daquele projeto e as dependências (ProjectTaskDependency) predecessoras/sucessoras. Se a tarefa original foi excluída pelo autor (ProjectTask.taskId nulo, removedByAuthor = true), o detalhe é renderizado a partir do TaskSnapshot em snapshotJson (RF23.CA03). Para tarefas não-PRIVADAS de outras pessoas, a ação principal é \"Levar ao meu acervo\" (cópia EXTRAIDA_DE_PROJETO com crédito, RF23.CA01); para o dono/responsável, \"Editar\" (RF8). O RF7 não altera estado de nenhuma entidade além de viewsCount e da cópia opcional.",
    "route": "detalhe do projeto /projects/[id] → lista de tarefas por fase → /projects/[id]/tasks/[ptId] (folha de detalhe, URL profunda), com atalho para /tasks/[id] e ação \"Levar ao meu acervo\" (destino: Acervo Digital, RF6/RF41)",
    "coverage": "RF7.CA01 … RF7.CA06 — todos \"(CA a confirmar)\": o corpo do card RF7 está vazio; os CAs foram derivados do título + HU7 e reaproveitam _anterior/RF23 (snapshot RF23.CA03, \"Levar ao meu acervo\" RF23.CA01/CA05) e RF41.CA03 (detalhe da tarefa)",
    "cas": [
      {
        "id": "RF7.CA01",
        "text": "Dado um projeto visível para mim, quando clico num item da lista de tarefas (quadro por fase, linha do tempo ou lista), então abre a folha de detalhe da tarefa com título, tipo, categoria, resumo (3 linhas), estado (TaskState em texto), prazo (⚖ se legal), responsável, anexos com pré-visualização (presign), versões, chancelas, interações e o contexto no projeto: fase, ordem, prazo e responsável do ProjectTask, predecessoras e sucessoras; a URL fica profunda (/projects/[id]/tasks/[ptId]) e compartilhável.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA02",
        "text": "Dado um ProjectTask com taskId nulo (tarefa excluída pelo autor), quando o abro, então o detalhe mostra o TaskSnapshot (título, tipo, categoria, thumbnail, resumo, autor, capturedAt) com o aviso \"removida pelo autor\", sem anexos nem ações de cópia/edição; fases e dependências do projeto continuam íntegras.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA03",
        "text": "Dado que a tarefa tem visibility incompatível com o viewer (PRIVADA de outra pessoa, DEPARTAMENTO sem ser membro), quando clico no item, então o card aparece como \"tarefa privada\" (só fase e ordem) e a API responde 403 ACESSO_NEGADO; ProjectTask inexistente no projeto → 404 TAREFA_NAO_ENCONTRADA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA04",
        "text": "Dado o detalhe de uma tarefa não-PRIVADA que não é minha, quando aciono \"Levar ao meu acervo\", então nasce uma cópia (sourceKind EXTRAIDA_DE_PROJETO, originalTaskId, sourceProjectId, state DISPONIVEL, visibility PRIVADA, anexos por referência ao mesmo MediaObject), reuseCount da original incrementa e o dono é notificado; ação oculta para PRIVADA (403 na API).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA05",
        "text": "Dado que sou o dono da tarefa ou responsável no projeto, então a ação principal é \"Editar\" (abre RF8) e a alternativa \"Abrir no Acervo\" (/tasks/[id]); para os demais a ação principal é \"Levar ao meu acervo\" e as interações sociais (RF19 atual); toda abertura incrementa viewsCount (contador desnormalizado, sem evento).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA06",
        "text": "Dado a folha aberta, quando fecho ou uso \"voltar\", então retorno à lista do projeto na mesma fase e posição de rolagem; a folha carrega com skeleton, respeita i18n pt-BR/en/es e layout responsivo (folha lateral no desktop, tela cheia no celular).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF8",
    "n": 8,
    "title": "Editar arquivos de tarefas ou projetos dentro de meu perfil do Work Station",
    "hu": "COMO usuário do sistema Work Station POSSO editar uma tarefa ou projeto de meu perfil PARA concluir projetos e receber insights de feedback da IA a respeito da qualidade do item.",
    "summary": "\"Editar arquivos\" cobre três coisas sobre itens do meu perfil (dono ou responsável): (1) os metadados da tarefa (TaskItem, otimista por version) ou do projeto (ProjectScheme, com ProjectVersion quando a mudança é estrutural, RF22); (2) os arquivos em si — substituir/adicionar anexo (TaskAttachment → novo MediaObject no S3, antivírus, OCR e thumbnail por PipelineJob) preservando a versão anterior em TaskVersion (snapshotMediaId, changeSummary), ou editar no provedor quando o item é VINCULADO (Google Workspace / Microsoft 365: o webhook de mudança cria TaskVersion com externalRevisionId); (3) concluir — a transição EM_USO/DISPONIVEL → CONCLUIDA via TaskStateMachine e, quando todas as ProjectTasks estão concluídas, ProjectScheme → CONCLUIDO. Cada salvamento dispara, após o commit, o feedback de qualidade da IA (Insight com scope ACERVO ou PROJETO via AiEngine INSIGHT): completude dos metadados, clareza do título/resumo, prazo coerente, conformidade (RF32) e sugestões acionáveis; accessClass RESTRITO/SIGILOSO nunca vai à IA externa.",
    "route": "/tasks/[id]/edit (ficha + anexos + versões, a partir do Acervo Digital do perfil RF6) e /projects/[id]/edit (ficha do projeto e arquivos das tarefas pela Mesa, RF22); \"Editar no provedor\" abre Google Docs/Sheets ou Word/Excel online",
    "coverage": "RF8.CA01 … RF8.CA06 — todos \"(CA a confirmar)\": o corpo do card RF8 está vazio; os CAs foram derivados do título + HU8 e reaproveitam RF20.CA07/CA12 (itens vinculados, PipelineJob), RF41.CA02/CA03 (estados, versões) e RF22.CA02/CA06 (versões de projeto, bloqueio)",
    "cas": [
      {
        "id": "RF8.CA01",
        "text": "Dado uma tarefa do meu perfil (sou ownerId ou responsibleId), quando edito título, categoria, tags, prazo, descrição ou classificação e salvo com If-Match: version, então o sistema valida como no criador (RF4: 422 VALIDACAO por campo), grava com bloqueio otimista (409 CONFLITO_VERSAO se outra edição venceu), registra AuditLog TASK_UPDATED e reindexa no OpenSearch; quem não é dono nem responsável recebe 403 ACESSO_NEGADO e vê a ficha somente leitura.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA02",
        "text": "Dado os anexos da tarefa, quando substituo o arquivo principal ou adiciono um novo, então o upload passa por MediaStoragePort + AntivirusPort (422 ARQUIVO_MALICIOSO bloqueia), a versão anterior é preservada como TaskVersion (versionNumber + 1, snapshotMediaId do arquivo antigo, changeSummary), e thumbnail/OCR são reprocessados por PipelineJob após o commit (falha → REPROCESSAR e aviso no card).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA03",
        "text": "Dado um item linkMode VINCULADO (Google/Microsoft), quando aciono \"Editar no provedor\", então o documento abre no Google Docs/Sheets ou Word/Excel online com o OAuth do usuário; ao receber o webhook de mudança, AcervoService.syncLinkedVersion cria TaskVersion (externalRevisionId, syncedAt) e atualiza o thumbnail; \"Converter em cópia\" chama convertLinkToSnapshot (linkMode COPIADO); OAuth revogado converte automaticamente.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA04",
        "text": "Dado um projeto do meu perfil, quando edito a ficha (título, objetivo, prazo, programa, eixo) ou os arquivos das suas tarefas pela Mesa (RF22), então mudanças estruturais geram ProjectVersion com diffJson legível e as não-estruturais só atualizam; projeto CONCLUIDO/ARQUIVADO → 409 PROJETO_BLOQUEADO (reabrir exige justificativa); a visibilidade dos arquivos segue a do projeto.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA05",
        "text": "Dado uma tarefa EM_USO ou DISPONIVEL, quando marco \"Concluir\", então TaskStateMachine leva a CONCLUIDA com TaskStateLog; se era a última ProjectTask pendente de um projeto, ProjectScheme.status passa a CONCLUIDO e percentComplete = 100; transição inválida → 422 TRANSICAO_INVALIDA; BLOQUEADA precisa ser desbloqueada antes.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA06",
        "text": "Dado um salvamento bem-sucedido, então após o commit a IA gera um Insight de qualidade (scope ACERVO para tarefa, PROJETO para projeto; metricRefsJson com completude, clareza, prazo, conformidade RF32; actionsJson com correções em 1 clique), exibido com faísca ✦ e \"Por que isto?\", registrado em ai_inference_log (capability INSIGHT); accessClass RESTRITO/SIGILOSO → BLOQUEADO_SIGILO ou IA local; o usuário pode dispensar (dismissedAt); IA indisponível não bloqueia o salvamento.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF9",
    "n": 9,
    "title": "Permitir que um chefe de departamento possa adicionar ou remover um usuário da sua lista de empregados atuais",
    "hu": "COMO chefe de departamento de uma empresa POSSO adicionar ou remover um usuário de minha lista de empregados ativos PARA melhorar a minha gestão empresarial.",
    "summary": "A lista de empregados atuais de um departamento é o conjunto de DepartmentMembership vigentes (endedAt nulo) daquele Department; User.departmentId espelha a lotação atual (1 por vez, RF28.CA02). O CHEFE (Department.headUserId, guard requireDeptHead, que também aceita a EMPRESA dona da Company e o ADMIN) adiciona (cria DepartmentMembership MEMBRO e encerra a lotação anterior em outro departamento — transferência), remove (fecha endedAt + reason, zera User.departmentId, revoga CuratorAppointment vigente) e transfere (remove + adiciona na mesma transação, com o chefe de destino ou a EMPRESA). O histórico nunca é apagado; remover avisa o empregado e, se ele tem pendências (tarefas EM_USO como responsável, sessões DECIA ativas, chancelas EM_REVISAO), oferece o Dossiê de Transição (RF36) antes de confirmar. A API da equipe só expõe nome, username, cargo e lotação — nunca email/phone (LGPD). Nenhuma IA neste RF.",
    "route": "página do departamento /departments/[slug] → aba Equipe, modo \"Minha equipe\" (gestão) só para o chefe (/departments/[slug]/team); atalho Minha equipe no grupo Gestão do menu",
    "coverage": "RF9.CA01 … RF9.CA06 — todos \"(CA a confirmar)\": o corpo do card RF9 está vazio e o escopo é novo (antes RF9 = participantes da sessão DECIA, preservado em _anterior/RF9); os CAs foram derivados do título + HU9 e reaproveitam RF28.CA02 (lotação 1 por vez com histórico em DepartmentMembership), RF28.CA03 (auditoria do chefe), o guard requireDeptHead e a aba \"Minha equipe\" propostos em docs/produto/ABAS_POR_PERFIL.md §1.2 e §7.b",
    "cas": [
      {
        "id": "RF9.CA01",
        "text": "Dado um CHEFE_DEPARTAMENTO com Department.headUserId == eu (ou EMPRESA dona da Company, ou ADMIN — requireDeptHead), quando abro a aba Equipe no modo Minha equipe, então vejo os DepartmentMembership vigentes (nome, username, jobTitle, roleInDept, startedAt, etiqueta Curador) com busca e paginação (> 50), mais o histórico de lotações encerradas; quem não é chefe não vê o modo gestão no menu e recebe 403 ACESSO_NEGADO na API; a API nunca devolve email/phone.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA02",
        "text": "Dado o modo gestão, quando adiciono um usuário (busca por nome/username na mesma Company, AccountStatus ACTIVE), então nasce um DepartmentMembership MEMBRO com startedAt, a lotação vigente anterior (em outro departamento) é encerrada com endedAt e reason TRANSFERENCIA e User.departmentId passa a ser o meu departamento; já membro vigente → 409 MEMBRO_DUPLICADO; outra empresa → 422 FORA_DA_EMPRESA; conta não ACTIVE → 422 USUARIO_INATIVO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA03",
        "text": "Dado um membro vigente, quando removo informando reason (obrigatório, 422 VALIDACAO), então o DepartmentMembership recebe endedAt e reason (sem apagar), User.departmentId fica nulo, o CuratorAppointment vigente dele é revogado (revokeReason = saída do departamento) e suas tarefas/projetos permanecem com o dono; remover o próprio chefe (headUserId) → 422 CHEFE_NAO_REMOVIVEL (troca de chefe é RF28.CA07).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA04",
        "text": "Dado que o removido tem pendências (responsável em ProjectTask aberta, TaskItem EM_USO/BLOQUEADA como responsável, SessionParticipant em sessão ATIVA, SealBond EM_REVISAO de que é alvo), quando confirmo a remoção, então o sistema lista as pendências e oferece gerar Dossiê de Transição (HandoffDossier reason TRANSFERENCIA/SAIDA, RF36) ou transferir para outro departamento (remover + adicionar na mesma transação); itens PRIVADOS do empregado nunca entram sem consentimento.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA05",
        "text": "Dado a inclusão ou remoção, então MemberAdded/MemberRemoved (AFTER_COMMIT) gravam AuditLog MEMBER_ADDED/MEMBER_REMOVED com correlationId, notificam o empregado (Notification category SISTEMA: \"você foi adicionado/removido do departamento X\", com motivo), invalidam o cache Redis de métricas/contadores do departamento e atualizam a aba pública Equipe e a página da empresa (Pessoas).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA06",
        "text": "Dado o histórico, então re-adicionar alguém cria um novo DepartmentMembership (o anterior permanece encerrado), a linha do tempo de lotações aparece no modo gestão e no perfil do empregado (empresa/departamento atual, RF16), e todas as mensagens são i18n (pt-BR/en/es).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF10",
    "n": 10,
    "title": "Permitir que o chefe de departamento possa atribuir uma tarefa ou projeto a um usuário",
    "hu": "COMO chefe de departamento POSSO clicar em \"Atribuir tarefa ou projeto\" PARA que um empregado possa visualizar sua lista de tarefas ou projetos pendentes dentro de seu escopo de trabalho.",
    "summary": "A atribuição usa a entidade Assignment da TAXONOMIA §12b (contexto Mensageria & Atribuição, marcado proposta na taxonomia): targetType AssignmentTargetType (TASK · PROJECT), fromUserId, toUserId, origin AssignmentOrigin (MINHA_EQUIPE · BOTAO_ESQUEMA · CHAT_WS · CHAT_DECIA), status AssignmentStatus (PROPOSTA · ACEITA · RECUSADA · DEVOLVIDA), dueAt, message, reason, previousResponsibleId, traceNodeId, respondedAt. O RF10 é o caso em que fromUserId é o CHEFE (Department.headUserId) e as origens são MINHA_EQUIPE ou BOTAO_ESQUEMA; o RF46 cobre as origens CHAT_WS/CHAT_DECIA e a proposta entre colegas. O responsibleId (TaskItem §2.1 / ProjectTask §3.2) só é escrito no aceite; previousResponsibleId permite a devolução. Rastro: Assignment + AuditLog + TaskStateLog (quando o aceite muda TaskState) + Notification ATRIBUICAO_PROPOSTA · ATRIBUICAO_ACEITA · ATRIBUICAO_RECUSADA · ATRIBUICAO_DEVOLVIDA (já em NotificationType, §8.8).",
    "route": "página do departamento › Equipe › Minha equipe (gestão) (/departments/[slug]/team?mode=manage, origem MINHA_EQUIPE), ação \"Atribuir\" no card de tarefa (/tasks/[id]) e de projeto (/projects/[id], origem BOTAO_ESQUEMA); lado do atribuído: /me/assignments (\"Atribuídas a mim\") e Tarefa do Dia (RF44); API POST /api/assignments",
    "coverage": "RF10.CA01 · RF10.CA02 · RF10.CA03 · RF10.CA04 · RF10.CA05 · RF10.CA06 — corpo do card vazio: CAs derivados do título + HU10 + ABAS_POR_PERFIL.md §7.b (bloco 3) e P-02 + RF46.CA03–CA05 (mesma entidade Assignment), marcados (CA a confirmar)",
    "cas": [
      {
        "id": "RF10.CA01",
        "text": "Dado um CHEFE (Department.headUserId) em Minha equipe ou num card de tarefa/projeto, quando aciona Atribuir escolhendo pessoa, alvo (TaskItem ou ProjectScheme), prazo opcional e mensagem (≤ 500), então POST /api/assignments cria Assignment com status = PROPOSTA, fromUserId = chefe, toUserId, targetType, targetId, dueAt, message, origin (MINHA_EQUIPE ou BOTAO_ESQUEMA) e previousResponsibleId = responsável atual; AuditLog ASSIGNMENT_CREATED com correlationId.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA02",
        "text": "Dado o pedido, então o serviço exige AccessPolicy.requireDeptHead do departamento da pessoa: ator que não é chefe → 403 ACESSO_NEGADO; pessoa sem DepartmentMembership vigente no departamento do chefe → 422 VALIDACAO (FORA_DO_DEPARTAMENTO); alvo que o ator não pode ver (Visibility.PRIVADA de terceiro) → 403 ACESSO_NEGADO; alvo em CONCLUIDA/ARQUIVADA (tarefa) ou CONCLUIDO/ARQUIVADO (projeto) → 409 ESTADO_INVALIDO; já existe Assignment PROPOSTA ou ACEITA para o mesmo (targetId, toUserId) → 409 ATRIBUICAO_DUPLICADA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA03",
        "text": "Dado o commit, então o evento AssignmentProposed (AFTER_COMMIT) grava Notification tipo ATRIBUICAO_PROPOSTA, categoria SISTEMA, resourceType = ASSIGNMENT, em notifications_by_user (Cassandra) + espelho MySQL, e TimelineEvent do atribuído; o chefe acompanha o estado no bloco 3 de Minha equipe (GET /api/departments/{id}/assignments).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA04",
        "text": "Dado o atribuído (toUserId), quando aceita (POST /api/assignments/{id}/accept), então status = ACEITA, respondedAt, TaskItem.responsibleId ou ProjectTask.responsibleId (todas as ProjectTask sem responsável, quando PROJECT) recebe toUserId, TaskStateLog é gravado se a tarefa passa de DISPONIVEL para EM_USO (reason ATRIBUICAO_ACEITA) e o chefe recebe ATRIBUICAO_ACEITA; quando recusa (/refuse), então reason é obrigatório (422 MOTIVO_OBRIGATORIO), status = RECUSADA e o chefe recebe ATRIBUICAO_RECUSADA; quem não é toUserId → 403 ACESSO_NEGADO; responder atribuição já respondida → 409 ATRIBUICAO_JA_RESPONDIDA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA05",
        "text": "Dado o atribuído, então /me/assignments (AssignmentService.listForMe) lista as atribuições PROPOSTA e ACEITA (filtros: tipo, prazo, quem atribuiu) com o alvo em card LINHA; a Assignment ACEITA entra no priorityIndexJson da Tarefa do Dia (RF44) com o fator \"atribuída pelo chefe\" e no Dossiê de Transição (RF36) como item pendente; o chefe vê, por pessoa, as atribuições abertas em Minha equipe (bloco 2 Carga e bloco 3).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA06",
        "text": "Dado o atribuído com Assignment ACEITA, quando devolve com motivo (POST /api/assignments/{id}/give-back), então status = DEVOLVIDA, reason obrigatório (422 MOTIVO_OBRIGATORIO), o responsibleId volta a previousResponsibleId, TaskStateLog registra a volta e o chefe recebe ATRIBUICAO_DEVOLVIDA; DELEGUEI da Tarefa do Dia (RF44) e \"Atribuir\" no chat (RF46) chamam o mesmo AssignmentService.propose com origin CHAT_WS/CHAT_DECIA; delegação para pessoa de outro departamento exige aceite do chefe dela (a confirmar).",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF11",
    "n": 11,
    "title": "Utilizar o editor de arte de fundo para personalizar esquemas de tarefas e projetos",
    "hu": "COMO usuário criando um esquema de tarefa ou projeto POSSO utilizar o editor de arte de fundo PARA personalizar background de esquemas de tarefas ou projetos.",
    "summary": "Na UI o editor chama-se Estúdio do card (\"arte de fundo\" é o rótulo do segmento Fundo, P-17 de ANATOMIAS_E_ESTUDIO.md). Quatro segmentos — Fundo · Layout · Container · Destaques — gravam um único JSON CardArtConfig v1 na coluna cardArtJson (proposta) de tasks e project_schemes, com colunas planas cardSkin (já na TAXONOMIA §2.1) e cardLayout (proposta). A arte ocupa só as quatro faixas (passe-partout) entre a borda e o container; o container fica sempre legível (tinta por inkOn); a mídia nunca recebe arte. O RF reaproveita do RF38 o CardArtService, a capa por IA (AiEngine CAPA_IA, faísca ✦) e UserSkin (403 SKIN_NAO_ADQUIRIDA).",
    "route": "Estúdio do card dentro de /tasks/[id]/edit (Etapa 5 \"Arte do card\" do criador de tarefas, RF4/RF20) e /projects/[id]/edit; API PUT /api/tasks/{id}/card-art e PUT /api/projects/{id}/card-art",
    "coverage": "RF11.CA01 · RF11.CA02 · RF11.CA03 · RF11.CA04 · RF11.CA05 · RF11.CA06 — corpo do card vazio: CAs derivados do título + HU11 + RF38.CA02/CA04/CA08/CA10 + docs/design-system/ANATOMIAS_E_ESTUDIO.md §5, marcados (CA a confirmar)",
    "cas": [
      {
        "id": "RF11.CA01",
        "text": "Dado o dono de uma tarefa ou projeto (ownerId), quando abre o Estúdio do card, então vê os segmentos Fundo · Layout · Container · Destaques com prévia ao vivo (card do feed + ampliado); o rascunho é local (Cancelar não grava, Restaurar padrão só no rascunho); Aplicar envia PUT /api/tasks/{id}/card-art ou PUT /api/projects/{id}/card-art com CardArtConfig + baseRev; quem não é dono → 403 ACESSO_NEGADO; rev divergente (outra janela aplicou antes) → 409 REVISAO_DESATUALIZADA; JSON fora do schema → 422 VALIDACAO.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA02",
        "text": "Dado o segmento Fundo, então o usuário escolhe cor sólida (catálogo 8 cores de departamento + 6 neutras), gradiente (marca, dept, spark), textura (papel, cortica, blueprint, timbrado), terminal, monograma, malha de nós (argumento, consenso, misto + densidade 1–3), mosaico automático, imagem enviada ou arte com IA; resolveCardArt aplica a precedência (base color → gradient → texture/terminal/monograma; imagem ai/upload → mesh → mosaic); layouts com ownArt (GRADE, PRANCHA, LINHA_TEMPO) desligam o segmento Fundo com a explicação; layouts da seção B ficam desabilitados com motivo quando falta o dado (effectiveLayout).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA03",
        "text": "Dado o segmento Container, então o usuário escolhe a skin (timbrado padrão, protocolo, carimbo, blueprint, noturno; contraste é forçado pelo tema) e a cor do container (nativa da skin, 5 amostras ou livre); a tinta vem de inkOn(hex) por luminância (0,299 R + 0,587 G + 0,114 B > 140 → #1A1714, senão #F5F2EC) garantindo ≥ 4,5:1; skin premium sem UserSkin (e não PADRAO) → 403 SKIN_NAO_ADQUIRIDA com atalho para a Loja; UserPreferences.defaultCardSkin é o valor inicial.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA04",
        "text": "Dado \"Arte com IA\" (prompt ≤ 300) no Fundo, então o serviço verifica AiQuota (créditos comprados antes da cota mensal; sem saldo → 409 COTA_ESGOTADA + Loja), accessClass RESTRITO/SIGILOSO → motor local (monograma/paleta, result = BLOQUEADO_SIGILO para externo), senão AiEngine CAPA_IA com tema mascarado; a imagem vai ao S3 (MediaObject) e fundo.aiArt {url, prompt, generatedAt, inferenceId} é gravado com AiInferenceLog; a faísca ✦ é obrigatória (só o tooltip estendido pode ser ocultado, RF38.CA04); resposta ≤ 30 s ou estado \"gerando\" com motion spark; imagem enviada passa por validação (mime real, tamanho, antivírus PipelineJob ANTIVIRUS) → 422 VALIDACAO se inválida.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA05",
        "text": "Dado o segmento Destaques, então o usuário configura lacre (lugar reservado; zona vem do layout), tooltip da faísca (curto/completo), barra de fases (projeto), carimbo de estado/decisão (canto/centro/oculto), Hype do autor (respeita HypeVisibility) e movimento (none, pulse, thread); no máximo 2 destaques decorativos (carimbo e movimento contam) → 422 LIMITE_DESTAQUES; o movimento só roda no card ampliado e é desligado por prefers-reduced-motion ou UserPreferences.reduceMotion (RF38.CA10).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA06",
        "text": "Dado cardArtJson gravado, então a API entrega cardArt no view da tarefa/projeto (campos planos mesclados), a leitura é tolerante (config sem v lê como v1 com padrões PAGINA/MOSAICO + timbrado; valores desconhecidos caem no padrão; color inválido → null); o mesmo resolveCardArt renderiza feed, Mural, Vitrine, Balcão e Mesa; o cache Redis do card é invalidado (DEL card:task:{id} / card:project:{id}) e o evento CardArtChanged dispara CardArtService.rebuildMosaic nos projetos que contêm a tarefa (RF38.CA03).",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF12",
    "n": 12,
    "title": "Editar um esquema de tarefa ou projeto de meu perfil",
    "hu": "COMO usuário visualizando um esquema de tarefa ou projeto POSSO editar os dados deste esquema PARA atualizar minha gestão pessoal e empresarial.",
    "summary": "Edição dos dados do esquema (formulário), em contraste com o RF22 (manipulação na Mesa). Esquema de Tarefa = TaskItem (+ a sua ProjectTask quando dentro de um projeto); Esquema de Projeto = ProjectScheme + ProjectTasks. Regras reaproveitadas do RF22: canEdit = dono OU responsável OU chefe do departamento (403 fora disso); toda alteração estrutural de projeto gera ProjectVersion com diffJson legível; mudança de estado de tarefa gera TaskStateLog; CONCLUIDO/ARQUIVADO bloqueiam (409) e reabrir exige justificativa; autosave do rascunho em ProjectScheme.autosaveDraftJson (RF21.CA14) e, para tarefas, em Redis (proposta).",
    "route": "Meu perfil (/profile) › sub-abas 1 Acervo de Tarefas e 2 Meus Projetos › card › Editar → /tasks/[id]/edit e /projects/[id]/edit (a Mesa de Trabalho completa — Quadro, Linha do tempo, canvas — é o RF21/RF22)",
    "coverage": "RF12.CA01 · RF12.CA02 · RF12.CA03 · RF12.CA04 · RF12.CA05 · RF12.CA06 — corpo do card vazio: CAs derivados do título + HU12 + docs/diagramas/RF22/README.md (CA01 permissão, CA02 ProjectVersion, CA04 concorrência, CA06 bloqueio) + RF20.CA07/CA11 + RF21.CA14 (autosave) + RF41.CA02 (TaskStateLog), marcados (CA a confirmar)",
    "cas": [
      {
        "id": "RF12.CA01",
        "text": "Dado o usuário no card de uma tarefa ou projeto do seu perfil, quando aciona Editar, então /tasks/[id]/edit (ou /projects/[id]/edit) carrega o formulário com os dados atuais; tarefa: título, resumo, descrição, tipo, categoria/subcategoria, processTags/natureTags (≤ 2 cada), accessClass, prazo e prazo legal, prioridade, responsável, visibilidade, anexos, notas, Estúdio do card (RF11); projeto: título, emoji, objetivo, descrição, tags, prioridade, exercício, agrupamentos (RF25), eixo do plano (RF24), visibilidade, lista de tarefas por fase com prazo e responsável, orientação para a IA; canEdit = ownerId OU responsibleId (de alguma ProjectTask) OU Department.headUserId; demais → formulário somente leitura e 403 ACESSO_NEGADO na API.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA02",
        "text": "Dado o envio (PATCH /api/tasks/{id} ou PATCH /api/projects/{id} com If-Match: version), então o serviço valida: título obrigatório ≤ 200, ≤ 2 tags por eixo, categoria compatível com o tipo, prazo legal recalculado por LegalDeadlineRule quando a categoria tem prazo (legalOverrideReason obrigatório para sobrescrever, RF20.CA11), projeto com ≥ 1 tarefa em DEMANDA + 1 em outra fase (RF21.CA05) e sem ciclo de dependências → 422 VALIDACAO; version divergente → 409 CONFLITO_VERSAO para tarefa e último-vence com aviso CONFLITO_ULTIMO_VENCE para projeto (RF22.CA04).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA03",
        "text": "Dado o salvamento, então: projeto com alteração estrutural (tarefa adicionada/removida, fase, prazo, responsável, dependência) grava ProjectVersion (versionNumber + 1, authorId, diffJson legível, snapshotJson); mudanças só de dados descritivos (título, objetivo, tags) também geram versão com reason = DADOS; tarefa com mudança de state grava TaskStateLog (fromState, toState, actorId, reason); tarefa linkMode = VINCULADO (Google/Microsoft) ganha TaskVersion ao sincronizar (RF20.CA07); tudo com AuditLog e correlationId.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA04",
        "text": "Dado o formulário aberto, então o rascunho é salvo a cada 10 s ou ao sair do campo: projeto em ProjectScheme.autosaveDraftJson (RF21.CA14); tarefa em Redis draft:task:{id}:{userId} com TTL 7 dias (proposta); ao reabrir, o sistema oferece Recuperar rascunho ou Descartar; o rascunho nunca é publicado sem o clique em Salvar.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA05",
        "text": "Dado alvo em TaskState CONCLUIDA/ARQUIVADA ou ProjectStatus CONCLUIDO/ARQUIVADO, então toda escrita devolve 409 TAREFA_BLOQUEADA / 409 PROJETO_BLOQUEADO; Reabrir exige justificativa (≥ 10 caracteres, senão 422 VALIDACAO) e gera TaskStateLog/ProjectVersion.reason + AuditLog (REOPEN); tarefa MODELO_PUBLICO ou OFERECIDA (RF40/RF41) não pode mudar visibility/accessClass sem antes retirar a oferta (409 OFERTA_ATIVA).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA06",
        "text": "Dado o commit, então eventos AFTER_COMMIT: TaskUpdated/ProjectUpdated reindexam o item no OpenSearch (busca RF27), recalculam a capa-mosaico dos projetos que contêm a tarefa (RF38.CA03), invalidam o cache do card (Redis), atualizam ProjectTask.snapshotJson nos projetos de terceiros que referenciam a tarefa (RF23.CA03) e notificam (Notification PRAZO_PROXIMO/SISTEMA) o responsável quando prazo ou responsável mudou; tarefa EM_USO em projeto de outro dono tem mudança de prazo sinalizada no projeto (⛔ hasBlockingPending).",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF13",
    "n": 13,
    "title": "Utilizar a funcionalidade gerar artefato dentro de esquemas, chats, abas e feed do Work Station",
    "hu": "COMO usuário conectado dentro do Work Station POSSO clicar em gerar artefato dentro de um esquema ou chat DECIA PARA receber um arquivo produzido por IA e alinhado com os objetivos de minha equipe.",
    "summary": "A TAXONOMIA §5.14 só prevê SessionArtifact (artefato da sessão, gerado automaticamente ao validar a decisão). Este RF propõe ampliá-lo para GeneratedArtifact (tabela generated_artifacts), com origem ArtifactOrigin (ESQUEMA_TAREFA · ESQUEMA_PROJETO · CHAT_DECIA · CHAT_MENSAGERIA · ABA · FEED), pedido explícito do usuário (requestedBy, instruction) e alinhamento com os objetivos da equipe (goalAlignmentJson: eixo do AnnualPlan do departamento e CollectiveGoal abertas). SessionArtifact vira o caso originType = CHAT_DECIA (geração automática do antigo RF13 continua). Tudo o que era do antigo RF13 se mantém: AiEngine capability ARTEFATO, contentMd como fonte e PDF derivado (PipelineJob EXPORT_PDF), INDEXAR_MEMORIA, Notification, Transformar em tarefa e Regerar. Novo: cota de IA (AiQuota, 409 COTA_ESGOTADA), origem/visibilidade e DECIA Points ARTEFATO_USADO quando o artefato é usado numa decisão (RF42).",
    "route": "botão Gerar artefato ✦ em /tasks/[id], /projects/[id] (e Mesa), /decia/[sessionId] (aba Artefatos), /messages/[conversationId] (RF46), abas /tasks, /search, /insights, /departments/[slug]/team e itens do /mural; lista em /me/artifacts; API POST /api/artifacts",
    "coverage": "RF13.CA01 · RF13.CA02 · RF13.CA03 · RF13.CA04 · RF13.CA05 · RF13.CA06 — corpo do card vazio: CAs derivados do título + HU13 + docs/diagramas/_anterior/RF13/README.md (RF13.CA01–CA06 da sessão: geração, EXPORT_PDF, notificação, Transformar em tarefa, Regerar, INDEXAR_MEMORIA) + RF42.CA06 (cota) + RF33.CA03 (citações), marcados (CA a confirmar)",
    "cas": [
      {
        "id": "RF13.CA01",
        "text": "Dado o usuário em um esquema (tarefa/projeto), chat (sessão DECIA ou mensageria RF46), aba (Acervo, Buscar, Insights, Minha equipe) ou item do feed/Mural, quando aciona Gerar artefato ✦, então escolhe o kind compatível com a origem (RELATORIO · ATA · CHECKLIST · RESUMO_PDF · MINUTA_DOCUMENTO · PLANILHA · CRONOGRAMA · APRESENTACAO (propostos)) e uma instrução (≤ 1 000); POST /api/artifacts {originType, originId, kind, instruction} cria GeneratedArtifact (proposta) status = SOLICITADO e devolve 202 {artifactId}; a geração roda em PipelineJob GERAR_ARTEFATO (tipo proposto) com resposta esperada ≤ 30 s; kind incompatível ou instrução vazia → 422 VALIDACAO; origem sem conteúdo (chat vazio, aba sem itens) → 409 SEM_BASE_PARA_ARTEFATO.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA02",
        "text": "Dado o job, então o serviço monta o contexto por origem: esquema → TaskItem/ProjectScheme + ProjectTasks + decisões vinculadas (DeciaSession.linkedProjectId); chat → SessionMessages + MessageClassification (ou DirectMessages da DirectConversation, TAXONOMIA §12b, RF46); aba → filtros ativos + itens visíveis; feed → MuralEntry alvo; sempre acrescenta os objetivos da equipe (PlanAxis do AnnualPlan do departamento, CollectiveGoal ABERTAS) em goalAlignmentJson; só entra o que o requerente pode ver (canView); accessClass RESTRITO/SIGILOSO em qualquer item → motor local (result = BLOQUEADO_SIGILO para externo) ou item mascarado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA03",
        "text": "Dado o contexto, então AiEngine (capability ARTEFATO, hostRf = RF13, inputSummaryJson.originType) gera title + contentMd fundamentado com citações da Memória Institucional (Citation; \"Sem precedente\" quando vazio, RF33.CA03), após AiQuota.tryConsume (créditos comprados antes da cota mensal; sem saldo → 409 COTA_ESGOTADA + Loja); AiInferenceLog registra provider, modo (ECONOMIA/AVANCADO), tokens e quotaSource; o artefato carrega faísca ✦ com tooltip \"gerado por IA em data\" (RF38.CA04); limite de 10 gerações/hora por usuário → 429 LIMITE_GERACAO (proposta).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA04",
        "text": "Dado contentMd salvo (status = GERADO), então PipelineJob EXPORT_PDF (ou XLSX para PLANILHA/CRONOGRAMA) renderiza o arquivo, grava em S3 (MediaObject) e preenche mediaObjectId; PipelineJob INDEXAR_MEMORIA indexa InstitutionalMemoryDocument.sourceType = ARTEFATO; falha de render mantém o contentMd legível e o job vai a REPROCESSAR; falha de indexação não bloqueia (RF33.CA06).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA05",
        "text": "Dado o artefato pronto, então Notification tipo ARTEFATO vai ao requerente (e a todos os participantes quando a origem é chat, groupKey = originId); o artefato aparece na origem (painel Artefatos do esquema, aba Artefatos da sessão, mensagem SISTEMA no chat, bloco da aba, comentário do item do feed) e em /me/artifacts; ações: baixar (URL assinada), Transformar em tarefa (TaskItem com sourceKind DECIA se origem for sessão, senão TEXTO_IA; ATA → ATA_REGISTRO, RELATORIO/MINUTA → DOCUMENTO, CHECKLIST → FORMULARIO, PLANILHA → PLANILHA, CRONOGRAMA → CRONOGRAMA; convertedTaskId; repetir → 409 ARTEFATO_JA_CONVERTIDO), Regerar com ajuste (nova linha, anterior preservada, supersedesArtifactId), compartilhar no Mural (RF26.CA05); anexado numa sessão e usado na decisão → MessageAttachment.usedInDecision e DP ARTEFATO_USADO (RF42).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA06",
        "text": "Dado o pedido, então 403 ACESSO_NEGADO quando o requerente não pode ver a origem (não participante da sessão/chat, item PRIVADO de terceiro, aba de gestão sem requireDeptHead); a visibilidade do artefato herda a da origem (Visibility da tarefa/projeto, participantes do chat, dono da aba); artefatos de origem SIGILOSA nunca vão ao Mural nem à Memória pública; AuditLog ARTIFACT_GENERATED com correlationId.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF14",
    "n": 14,
    "title": "Visualizar perfil de um chefe de departamento",
    "hu": "COMO usuário dentro do sistema Work Station POSSO procurar o perfil de um chefe de departamento PARA obter informação relevante ou realizar alguma funcionalidade.",
    "summary": "O CHEFE é uma pessoa (perfil pessoal com as 15 sub-abas do RF19 em /u/[username]) e o headUserId de um Department. O \"perfil de chefe\" do board é a página institucional do departamento: cabeçalho com sigla, cor, monograma, capa e o chefe (avatar, nome, cargo \"Chefe de {sigla}\"), métricas públicas do período e sub-abas públicas (Sobre · Projetos · Sessões DECIA · Chancelas · Reconhecimentos · Equipe) + sub-abas de gestão só para o chefe/EMPRESA (Minha equipe RF9/RF10, Dashboard do emissor, Insights da Equipe), negadas no serviço e não só ocultas. Este RF é de leitura; a única escrita própria é Seguir (Follow targetType DEPARTMENT). Reaproveita InstitutionalService.publicPage e RedisMetricsCache do RF28.",
    "route": "página do departamento /departments/[slug] (Matriz D de docs/produto/ABAS_POR_PERFIL.md §5 — é o que o board chama de \"perfil do chefe\"), alcançada pela aba Buscar (RF27), por /companies/[slug] › Departamentos (RF15) ou pelo atalho no perfil pessoal do chefe (/u/[username], RF16/RF19); API GET /api/departments/{slug} + GET /api/departments/{id}/tabs/{tab}",
    "coverage": "RF14.CA01 · RF14.CA02 · RF14.CA03 · RF14.CA04 · RF14.CA05 · RF14.CA06 — corpo do card vazio: CAs derivados do título + HU14 + RF28.CA02/CA03/CA04/CA06/CA08 (docs/diagramas/RF28/README.md) + RF27.CA06 (seguir) + RF45.CA06/CA10 (Hype) + Matriz D, marcados (CA a confirmar)",
    "cas": [
      {
        "id": "RF14.CA01",
        "text": "Dado qualquer usuário (inclusive visitante), quando busca um chefe/departamento (aba Buscar por nome, sigla ou nome do chefe; lista de departamentos da empresa; menção @sigla) e abre /departments/[slug], então vê o cabeçalho: Department.acronym, name, color, monogram, coverUrl, about, chefe (User de headUserId: avatar, fullName, jobTitle → \"Chefe de {acronym}\"), Company (logo + link para RF15), contadores (pessoas com DepartmentMembership vigente, projetos publicados, decisões validadas, chancelas emitidas, seguidores) e botão Seguir; slug inexistente ou active = false → 404 DEPARTAMENTO_NAO_ENCONTRADO.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA02",
        "text": "Dado o cabeçalho, então as sub-abas públicas são: Sobre · Projetos do departamento (filtros fase, exercício; canView por item) · Sessões DECIA (abertas/encerradas: membro vê as suas, mesma empresa vê PÚBLICAS/encerradas com resumo, visitante não vê) · Chancelas do departamento (Seal ativas; a fila de revisão só para chefe/curador) · Reconhecimentos emitidos (Recognition com publicOnMural) · Equipe (modo público: nome, cargo, monograma, etiqueta \"Curador\" por CuratorAppointment ativo); tab + filtros + página ficam na URL (RF19.CA03).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA03",
        "text": "Dado o período selecionado (padrão: exercício corrente), então as métricas públicas (RF28.CA04) são agregadas: projetos publicados, modelos oficiais/chancelas APROVADAS, decisões VALIDADAS, tempo médio até decisão, pessoas; vêm de MetricSnapshot (DEPARTAMENTO) com cache Redis metrics:department:{id}:{period} TTL 300 s; nunca expõem HSE, Hype ou DECIA Points nominais (RF45.CA10) — só histograma anonimizado quando o viewer é chefe.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA04",
        "text": "Dado o viewer autenticado, quando aciona Seguir, então é criado Follow {followerId, targetType DEPARTMENT, targetId, status ATIVO} (único; repetir é idempotente → 200 com o mesmo registro); Deixar de seguir → status REMOVIDO; os eventos do departamento (projeto publicado, decisão validada, reconhecimento) entram na sub-aba Seguindo do Mural (RF27) e em TimelineEvent do seguidor; visitante anônimo → 401 com convite a entrar.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA05",
        "text": "Dado o viewer, então as ações disponíveis a partir da página dependem do papel: membro do departamento → \"Pedir chancela\", \"Indicar colega\", \"Propor chancela\" (RF39.CA06), \"Mensagem ao chefe\" (RF46); mesma empresa → \"Levar ao meu acervo\" nos modelos oficiais (RF41.CA08), \"Mensagem\"; chefe (headUserId) e EMPRESA dona → \"Gerir\" (Minha equipe RF9/RF10, Dashboard do emissor RF28.CA06, Insights da Equipe RF43.CA14); link \"Ver perfil pessoal\" abre /u/[username] do chefe (sub-abas 1–5 e Hype conforme hypeVisibility, RF16/RF19).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA06",
        "text": "Dado o viewer, então a visibilidade por item segue AccessPolicy.visibilityFilter: anônimo/outra empresa → só PUBLICA; mesma empresa → + EMPRESA; membro → + DEPARTAMENTO; sub-abas de gestão → 403 ACESSO_NEGADO no serviço para quem não é headUserId nem Company.ownerUserId (curador com escopo FILA_REVISAO/PREMIACAO vê só a fila/premiação); dados pessoais (email, phone) nunca saem na API da equipe; página em pt-BR/en/es e responsiva (RF19.CA07).",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF15",
    "n": 15,
    "title": "Visualizar perfil de um empresa ou órgão público/privado",
    "hu": "COMO usuário dentro do sistema Work Station POSSO procurar o perfil de uma empresa ou órgão público/privado PARA obter informação relevante ou realizar alguma funcionalidade.",
    "summary": "A empresa/órgão é a conta de perfil EMPRESA (User.profileType = EMPRESA) dona de uma Company (ownerUserId; ex.: Secretaria das Cidades). A página institucional mostra cabeçalho (logo, brasão, nome, sobre, site, cor de destaque, contadores institucionais — sem cargo, departamento ou Hype, RF19.CA06/P-04), métricas públicas do período (RF28.CA04) e sub-abas públicas: Sobre · Departamentos (→ RF14) · Programas (RF25) · Plano Anual oficial (RF24) · Chancelas e modelos oficiais (RF39) · Benefícios (RF39.CA09) · Destaques (RF35.CA03) · Pessoas · Comunicados (proposta §7.a); e a aba Gestão só para a dona (negada no serviço). Este RF é de leitura, com duas escritas: Seguir (Follow COMPANY) e, pela dona/chefes, Comunicados — entidade Announcement (proposta). Órgãos externos (fornecedores, órgãos sem conta) são OrgEntity e não têm página; só ficha (dúvida §6).",
    "route": "página da empresa /companies/[slug] (Matriz C de docs/produto/ABAS_POR_PERFIL.md §4), alcançada pela lista /companies, pela aba Buscar (RF27), pelo cabeçalho de qualquer perfil/departamento ou pela barra inferior (5º destino para EMPRESA e visitante); API GET /api/companies/{slug} + GET /api/companies/{id}/tabs/{tab}",
    "coverage": "RF15.CA01 · RF15.CA02 · RF15.CA03 · RF15.CA04 · RF15.CA05 · RF15.CA06 — corpo do card vazio: CAs derivados do título + HU15 + RF28.CA01/CA04/CA06/CA08 (docs/diagramas/RF28/README.md) + RF24.CA04 + RF39.CA09/CA11 + RF27.CA06 + Matriz C e §7.a (Comunicados), marcados (CA a confirmar)",
    "cas": [
      {
        "id": "RF15.CA01",
        "text": "Dado qualquer usuário (inclusive visitante), quando busca uma empresa/órgão (aba Buscar por legalName/sigla, lista /companies, link em perfil ou departamento) e abre /companies/[slug], então vê o cabeçalho: Company.logoUrl, coatOfArmsUrl, legalName, about, websiteUrl, accentColor aplicado como cor de destaque, e contadores institucionais (departamentos ativos, pessoas, projetos publicados, modelos oficiais, decisões validadas, seguidores) — sem cargo, departamento, Hype, Tarefa do Dia ou DP; slug inexistente, Company.status inativo ou dona ainda em PENDING_VALIDATION (RF28.CA01) → 404 EMPRESA_NAO_ENCONTRADA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA02",
        "text": "Dado o cabeçalho, então as sub-abas públicas são: Sobre · Departamentos (Department ativos com monograma, cor e chefe → /departments/[slug], RF14) · Programas (Grouping tipo PROGRAMA, RF25) · Plano Anual oficial (AnnualPlan scope EMPRESA PUBLICADO com 6 PlanAxis; botão Derivar para mesma empresa, RF24.CA04) · Chancelas e modelos oficiais (Seal ATIVA da empresa + ModelOffer shelf CHANCELADO, RF39.CA11) · Benefícios (Benefit DISPONIVEL, RF39.CA09) · Destaques (Highlight do mês, RF35.CA03) · Pessoas (nomes/cargos públicos por departamento) · Comunicados (proposta); tab + filtros + página na URL (RF19.CA03).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA03",
        "text": "Dado a sub-aba Comunicados (proposta §7.a), então EMPRESA dona e CHEFES da empresa publicam Announcement {companyId, departmentId?, authorId, title, bodyMd, attachmentsJson, visibility EMPRESA/PUBLICO, pinned, commentsEnabled, publishedAt, archivedAt}; comunicado de chefe sai com o monograma do departamento; colegas da mesma empresa reagem (Reaction) e comentam (Comment, TargetType.COMUNICADO proposto) quando commentsEnabled; fixados ficam no topo; cada publicação entra no Mural (RF27) como MuralEntry.kind = COMUNICADO (proposto) com etiqueta \"Oficial\"; visitante/outra empresa vê só PUBLICO; EMPREGADO/CURADOR que tenta publicar → 403 ACESSO_NEGADO; título vazio → 422 VALIDACAO.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA04",
        "text": "Dado o período selecionado (padrão: exercício corrente) e o filtro opcional por departamento, então as métricas públicas (RF28.CA04) — projetos publicados, modelos oficiais, decisões validadas, chancelas emitidas, benefícios resgatados — vêm de MetricSnapshot (scope EMPRESA) com cache Redis metrics:company:{id}:{period} TTL 300 s; nunca dados nominais de desempenho (RF45.CA10).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA05",
        "text": "Dado o viewer autenticado, então as ações a partir da página são: Seguir (Follow targetType COMPANY, único e idempotente; eventos no Seguindo do Mural, RF27.CA06), Derivar o plano oficial (mesma empresa; plano não PUBLICADO → 422 DERIVACAO_INVALIDA, RF24.CA04), Resgatar benefício (exige SealBond APROVADA → senão 409 CHANCELA_INVALIDA, RF39.CA10), Levar ao meu acervo um modelo oficial (RF41.CA08), Propor chancela (EMPREGADO da empresa, RF39.CA06), Mensagem (RF46), abrir departamento (RF14); visitante anônimo → 401 nas ações.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA06",
        "text": "Dado o viewer, então a aba Gestão (Departamentos & chefes, Pessoas & lotações, Chancelas & políticas, Benefícios, Plano oficial, Programas, Políticas, Dashboard do emissor, Insights da empresa, Dossiês, Comunicados) só aparece para Company.ownerUserId e é negada no serviço (403 ACESSO_NEGADO) para qualquer outro, inclusive CHEFE e ADMIN em escrita; visibilidade por item segue AccessPolicy.visibilityFilter (anônimo/outra empresa → PUBLICA; mesma empresa → + EMPRESA); cnpj (AES) só para a dona e ADMIN; página em pt-BR/en/es e responsiva.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF16",
    "n": 16,
    "title": "Visualizar perfil de um usuário comum que é empregado dentro de uma empresa",
    "hu": "COMO usuário dentro do sistema Work Station POSSO visualizar o perfil de um usuário que trabalha dentro de uma organização PARA realizar alguma funcionalidade.",
    "summary": "O RF16 é a visão de terceiros do perfil pessoal (RF19 anterior / RF26 atual): quem abre /u/[username] de um EMPREGADO vê o cabeçalho público (avatar, nome, cargo, empresa, departamento, contadores) e apenas as sub-abas 1–5 (Acervo de Tarefas · Meus Projetos · Programas & Agrupamentos · Decisões · Perfil deliberativo resumo); as sub-abas 6–15 são omitidas na lista e respondem 403 ACESSO_NEGADO em chamada direta. Cada item listado passa pelo filtro de visibilidade (PUBLICA sempre · EMPRESA se mesma empresa · DEPARTAMENTO se membro do departamento · PRIVADA nunca). O Hype Score aparece no cabeçalho só conforme User.hypeVisibility (RF45.CA06). O RF16 é somente leitura; a única escrita é o botão Seguir (Follow, RF27.CA06) e as ações sociais inline dos cards (RF18/RF19), que pertencem aos seus RFs. Se o username for de uma conta EMPRESA ou CHEFE, o cabeçalho oferece o atalho para a página institucional (RF15 / RF14).",
    "route": "perfil de terceiros em /u/[username] (API GET /api/users/{username} e GET /api/users/{username}/tabs/{tab})",
    "coverage": "RF16.CA01 … RF16.CA06 — corpo do card vazio: CAs derivados do título + HU16 + _anterior/RF19 CA02 (perfil de terceiros) e docs/produto/ABAS_POR_PERFIL.md Matriz B (colunas \"terceiros\"); todos marcados \"(CA a confirmar)\"",
    "cas": [
      {
        "id": "RF16.CA01",
        "text": "Dado um usuário autenticado, quando abre /u/{username} de um EMPREGADO, então vê o cabeçalho público: avatar, nome, cargo (jobTitle), empresa, departamento (sigla, cor, monograma), contadores (tarefas, projetos, decisões, seguidores) e o botão Seguir; username inexistente → 404 USUARIO_NAO_ENCONTRADO; conta SUSPENDED/DELETION_SCHEDULED → 404 (não enumera contas).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA02",
        "text": "Dado o perfil de terceiro, quando a API devolve a lista de sub-abas, então só vêm as sub-abas 1–5; as 6–15 são omitidas e uma chamada direta a /tabs/{6..15} responde 403 ACESSO_NEGADO (sem bypass para ADMIN nas sub-abas 9, 13, 14, 15).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA03",
        "text": "Dado uma sub-aba 1–4, quando listo os itens, então cada TaskItem, ProjectScheme, Grouping e FinalDecision passa pelo visibilityFilter: PUBLICA sempre; EMPRESA se viewer.companyId == owner.companyId; DEPARTAMENTO se o viewer tem DepartmentMembership vigente no departamento do item; PRIVADA nunca. Contadores do cabeçalho contam só o que o viewer pode ver.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA04",
        "text": "Dado o cabeçalho, quando owner.hypeVisibility é PUBLICO então o Hype Score aparece para todos; EMPRESA só para a mesma empresa; SO_EU nunca — a API não devolve o campo (nem para CHEFE nem para ADMIN). A sub-aba 5 mostra só DeliberativeProfile.publicIndicatorsJson e badgesJson escolhidos pelo dono.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA05",
        "text": "Dado uma sub-aba aberta, quando aplico filtros e paginação (?tab=&fase=&categoria=&page=&size=20), então a URL reflete o estado e cada card traz as ações inline do RF18/RF19 (curtir, comentar, salvar, compartilhar, remixar) e, no Acervo, \"Levar ao meu acervo\" (RF7/RF41.CA08) — todas respeitando a visibilidade do item.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA06",
        "text": "Dado que o username pertence a uma conta EMPRESA ou CHEFE_DEPARTAMENTO, quando abro o perfil, então o cabeçalho mostra a etiqueta institucional (\"Chefe de {sigla}\" com monograma, ou logo da empresa) e o atalho para a página do departamento (RF14) ou da empresa (RF15); textos em pt-BR/en/es e layout responsivo.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF17",
    "n": 17,
    "title": "Visualizar esquemas de tarefa & projetos criados por outros usuários na rede social do Work Station, através da aba \"Buscar\"",
    "hu": "COMO usuário autenticado no sistema POSSO visualizar esquemas de tarefa ou projeto criados por outros usuários, chefes ou empresas na aba \"Buscar/Explorar\" PARA me inspirar em outras combinações e ampliar minhas referências de projetos.",
    "summary": "A aba Buscar é a porta de descoberta de esquemas de terceiros: busca textual (título, descrição, tags, texto OCR dos anexos via TaskAttachment.ocrTextRef) nos índices OpenSearch ws-tasks, ws-projects, ws-people, ws-orgs, devolvendo 5 abas com contadores. Todo resultado passa pelo visibilityFilter do viewer (outra empresa só vê PUBLICA; accessClass SIGILOSO nunca é indexado para terceiros). Ao abrir um resultado o usuário vê o esquema completo em modo leitura (anatomia do card e ficha — docs/design-system/ANATOMIAS_E_ESTUDIO.md §2/§3) com crédito do autor, as ações sociais inline (RF18/RF19), \"Levar ao meu acervo\" (RF7/RF41.CA08) e, para projetos, \"projetos parecidos com este\" (kNN em ws-memory, RF33). A indexação é assíncrona: publicar ou mudar visibilidade emite evento AFTER_COMMIT → PipelineJob INDEXAR_BUSCA (proposta de novo tipo, hoje só existe INDEXAR_MEMORIA).",
    "route": "Buscar (/search, abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) e páginas de leitura de esquema de terceiros (/tasks/[id], /projects/[id])",
    "coverage": "RF17.CA01 … RF17.CA06 — corpo do card vazio: CAs derivados do título + HU17 + RF27 (CA03 busca, CA04 visibilidade, CA05 semântica); todos marcados \"(CA a confirmar)\". O Mural (RF27.CA01/CA02/CA06) continua no RF27.",
    "cas": [
      {
        "id": "RF17.CA01",
        "text": "Dado um usuário autenticado em /search, quando digita um termo, então o sistema busca em título, descrição, tags e texto OCR (OpenSearch ws-tasks, ws-projects, ws-people, ws-orgs) e devolve 5 abas com contadores (PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) em ≤ 1 s p95; termo vazio mostra sugestões (recentes, em alta, chancelados).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA02",
        "text": "Dado uma aba, quando aplico filtros (categoria, tipo, fase, departamento, exercício, chancelado, prazo) e pagino (20 por página), então a URL reflete q, tab, filtros e page; a tela mostra skeleton ao carregar, estado vazio ilustrado e botão \"tentar de novo\" em erro (503 INDISPONIVEL).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA03",
        "text": "Dado os resultados, quando são devolvidos, então só contêm itens que o viewer pode ver: PUBLICA sempre; EMPRESA se mesma empresa; DEPARTAMENTO se membro; PRIVADA só os meus; RASCUNHO nunca aparece para terceiros; accessClass SIGILOSO nunca é indexado e RESTRITO só para o departamento dono. Resultados de outra empresa só se PUBLICA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA04",
        "text": "Dado um resultado de tarefa ou projeto de outro usuário, quando o abro, então vejo o esquema completo em modo leitura (ficha, fases e tarefas do projeto, capa, chancelas) com o crédito do autor (avatar + link para RF16/RF14/RF15), as ações inline do RF18/RF19 e \"Levar ao meu acervo\" (RF7/RF41.CA08); edição é 403 ACESSO_NEGADO; item que ficou PRIVADA depois de indexado responde 404 e sai do índice.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA05",
        "text": "Dado um projeto aberto, quando clico em \"projetos parecidos com este\", então o sistema gera o embedding (AiEngine MEMORIA_BUSCA) e faz kNN em ws-memory com o mesmo visibilityFilter, devolvendo até 10 projetos com score e motivo (\"mesmo processo, 4 tarefas em comum\"); sem IA disponível cai para \"mais do mesmo processo/departamento\" (busca textual).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA06",
        "text": "Dado que um autor publica, altera a visibilidade ou arquiva uma tarefa/projeto, quando a transação é confirmada, então o evento AFTER_COMMIT agenda PipelineJob INDEXAR_BUSCA e o índice reflete a mudança em ≤ 60 s; falha deixa o job REPROCESSAR sem afetar a operação do autor.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF18",
    "n": 18,
    "title": "Interagir socialmente com tarefas e projetos: curtir, comentar, salvar, compartilhar, remixar, retornar e atribuir",
    "hu": "COMO usuário visualizando um esquema de tarefa ou projeto POSSO utilizar as funcionalidades de rede social do sistema PARA interagir com usuários conectados ou membros de minha equipe, a fim de aumentar minha produtividade e gerar networking.",
    "summary": "O RF18 é a barra de interações de todo card de tarefa (TaskItem) e projeto (ProjectScheme). As seis interações sociais clássicas (curtir/reagir, comentar, salvar, compartilhar, remixar) são as do antigo RF26, detalhadas no card RF19 (RF26.CA01–09) e não repetidas aqui. Este README modela as duas interações novas, que mudam o fluxo de trabalho e não só a reputação, usando a entidade única Assignment (TAXONOMIA §12b, proposta; mesma entidade de RF10 \"chefe atribui\" e RF46 \"atribuir pelo chat\"):",
    "route": "ações inline em todo card de tarefa/projeto (Acervo, Projetos, Mural, Buscar, perfil de terceiros, Mesa)",
    "coverage": "RF18.CA01 … RF18.CA06 — corpo do card vazio: CA01–CA02 remetem aos RF26.CA01–09 citados no card RF19; CA03–CA06 modelam as duas interações novas (\"atribuir\" = RF10/RF46.CA03–CA05 pelo botão do esquema; \"retornar\" = Assignment → DEVOLVIDA com motivo); todos marcados \"(CA a confirmar)\"",
    "cas": [
      {
        "id": "RF18.CA01",
        "text": "Dado um card de tarefa ou projeto visível para mim, quando abro a barra de interações, então posso curtir/reagir, comentar, salvar, compartilhar e remixar exatamente como nos RF26.CA01–CA07 (citados no card RF19), com contadores em tempo quase real.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA02",
        "text": "Dado qualquer interação, quando é enviada, então respeita a visibilidade do alvo (RF26.CA08: PRIVADA só dono, DEPARTAMENTO só membros, EMPRESA só mesma empresa → 403 ACESSO_NEGADO) e gera notificação agrupada por hora ao dono (RF26.CA09).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA03",
        "text": "Dado um usuário que vê a tarefa/projeto, quando clica Atribuir, escolhe um colega da mesma empresa, prazo e nota, então nasce Assignment PROPOSTA (origin BOTAO_ESQUEMA, previousResponsibleId = responsável atual), com AuditLog ASSIGNMENT_CREATED e Notification ATRIBUICAO_PROPOSTA ao destinatário; se o ator é CHEFE e o destinatário membro do seu departamento a origem é MINHA_EQUIPE (RF10); colega de outra empresa → 403 EMPRESA_DIFERENTE; alvo que o ator não pode ver → 403 ACESSO_NEGADO; tarefa ARQUIVADA/CONCLUIDA ou projeto CONCLUIDO/ARQUIVADO → 409 ESTADO_INVALIDO; já existe PROPOSTA/ACEITA para o mesmo alvo e destinatário → 409 ATRIBUICAO_DUPLICADA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA04",
        "text": "Dado uma Assignment PROPOSTA para mim, quando aceito, então ela vai a ACEITA, TaskItem.responsibleId / ProjectTask.responsibleId passam a mim, TaskStateLog registra (DISPONIVEL → EM_USO se era DISPONIVEL), a atribuição entra no índice de prioridade da minha Tarefa do Dia (RF44) e o remetente recebe ATRIBUICAO_ACEITA; quando recuso, informo motivo (reason, sem ele 422 MOTIVO_OBRIGATORIO) e ela vai a RECUSADA com ATRIBUICAO_RECUSADA; só o destinatário responde (403 ACESSO_NEGADO) e resposta repetida é 409 ATRIBUICAO_JA_RESPONDIDA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA05",
        "text": "Dado uma Assignment ACEITA minha, quando clico Retornar e informo o motivo (≥ 20 caracteres), então ela vai a DEVOLVIDA, responsibleId volta a previousResponsibleId, TaskStateLog registra com o motivo, AuditLog ASSIGNMENT_RESPONDED grava e o remetente recebe ATRIBUICAO_DEVOLVIDA; o card do remetente mostra carimbo DEVOLVIDO + motivo até ele reatribuir ou retomar; sem Assignment ACEITA para mim → 404 SEM_ATRIBUICAO; motivo curto → 422 MOTIVO_OBRIGATORIO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA06",
        "text": "Dado o card, quando o abro, então vejo o histórico de atribuições e retornos (Assignment por alvo, com quem, quando, status e motivo) ao lado dos contadores sociais; o perfil do destinatário (RF16) mostra a etiqueta \"atribuída por …\" nos itens visíveis; DELEGUEI da Tarefa do Dia (RF44) cria uma nova Assignment PROPOSTA (caminho inverso) — regras completas em RF46.CA03–CA05.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF19",
    "n": 19,
    "title": "Curtir, comentar, salvar, compartilhar, retornar, atribuir e remixar tarefas, esquemas de projeto e planos anuais (interações sociais)",
    "hu": "COMO usuário autenticado POSSO curtir, reagir, comentar, salvar, compartilhar e remixar tarefas, esquemas de projeto e planos anuais PARA colaborar, dar retorno de qualidade e reaproveitar o trabalho dos colegas. Ref.: RF26 (equivalente às Interações sociais RF19 do FAI).",
    "summary": "Alvo polimórfico TargetType (TASK · PROJECT · PLAN — além de KIT, PROJECT_TASK, MESSAGE, RECOGNITION usados por outros RFs). Seis interações, cada uma com sua entidade: curtir (Reaction CURTIR, única por ator e alvo), reagir (Reaction ÚTIL · BEM_FUNDAMENTADO · INOVADOR · CONFORME), comentar (Comment com thread parentCommentId, edição, exclusão pelo autor ou pelo chefe do departamento, menções → Notification), salvar (SavedItem com marcador favorito → sub-abas Tarefas salvas / Projetos salvos), compartilhar (Share em canal MURAL → MuralEntry RF27, SESSAO_DECIA → MessageAttachment RF29, LINK_EXTERNO com externalToken, expiresAt e imagem exportada imageMediaId) e remixar (Remix + cópia com originalTaskId / originalProjectId / derivedFromPlanId e crédito visível). Contadores desnormalizados (likesCount … remixesCount) em tempo quase real via Redis; toda interação respeita a visibilidade do alvo e gera notificação agrupada por hora (Notification.groupKey) ao dono, alimentando o perfil deliberativo (reações BEM_FUNDAMENTADO e CONFORME pesam na métrica de qualidade).",
    "route": "ações inline em todos os cards (Acervo, Projetos, Planos Anuais, Mural, Buscar, perfil)",
    "coverage": "RF26.CA01 · RF26.CA02 · RF26.CA03 · RF26.CA04 · RF26.CA05 · RF26.CA06 · RF26.CA07 · RF26.CA08 · RF26.CA09 (citados como estão escritos no card — corpo do card = antigo RF26). As interações retornar e atribuir constam só no título, sem CA no corpo: estão modeladas no RF18 (CA03–CA06) e aqui aparecem apenas como remissão.",
    "cas": [
      {
        "id": "RF26.CA01",
        "text": "Curtir/descurtir tarefa, projeto ou plano (1 reação por usuário e alvo, índice único).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA02",
        "text": "Reações qualitativas: ÚTIL, BEM FUNDAMENTADO, INOVADOR, CONFORME (substituem TREND/ELEGANTE/CRIATIVO).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA03",
        "text": "Comentários com resposta (thread), edição, exclusão pelo autor ou pelo chefe do departamento; menções @usuário geram notificação.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA04",
        "text": "Salvar em Tarefas salvas / Projetos salvos com marcador de favorito.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA05",
        "text": "Compartilhar: no Mural da empresa (RF27), dentro de uma sessão DECIA (RF29) ou por link externo com imagem exportada (capa + resumo) e controle de expiração.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA06",
        "text": "Remixar um projeto ou tarefa pública: cria cópia com originalId e crédito visível; o autor original vê \"remixado por N pessoas\".",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA07",
        "text": "Contadores (curtidas, comentários, salvos, compartilhamentos, remixes) em tempo quase real nos cards e no perfil.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA08",
        "text": "Interações respeitam a visibilidade: item PRIVADO não recebe interações de terceiros; item DEPARTAMENTO só de membros do departamento.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA09",
        "text": "Toda interação gera notificação ao dono (agrupada por hora) e alimenta o perfil deliberativo (objetivo 2) — reações BEM FUNDAMENTADO e CONFORME pesam na métrica de qualidade.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF20",
    "n": 20,
    "title": "Utilizar o construtor de projetos do Work Station para compreender se as tarefas de meu acervo são adequadas dentro de meu ambiente empresarial",
    "hu": "COMO usuário autenticado dentro do sistema Work Station POSSO utilizar o construtor de projetos PARA compreender de maneira mais estratégica e funcional se os dados qualitativos ou quantitativos de meu acervo de trabalho constituem projetos sólidos e bem elaborados.",
    "summary": "O construtor de projetos (RF5 ProjectComposerService) ganha um painel de adequação: antes ou durante a composição, o usuário escolhe um processo (ProcessTag: Licitação, Convênio, Obra…) e o sistema responde \"o meu acervo sustenta um projeto sólido deste processo?\" com três leituras: (1) Score do Acervo 0–100 com decomposição e lacunas por processo (RF43 §2 — InsightService.acervo, Insight scope ACERVO, MetricSnapshot); (2) Espelho de Conformidade hipotético (RF32 — ComplianceService.evaluateHypothetical sobre um projeto-rascunho montado automaticamente com as tarefas compatíveis do meu Acervo via PHASE_BY_CATEGORY, devolvendo % de conformidade, itens OBRIGATORIO_AUSENTE ⛔ e FORA_DE_ORDEM); (3) ações de 1 clique: criar a tarefa faltante (abre o Criador de tarefas, RF4 — corpo deste card), buscar modelo no Balcão (RF40) ou na Buscar (RF17), levar tarefa de colega ao meu acervo (RF7), compor o projeto com o que já existe (RF5) ou abrir sessão DECIA. Números vêm de serviços determinísticos; a IA (AiEngine INSIGHT) só redige a explicação com faísca ✦ e cai para texto-padrão sem perder nenhum número.",
    "route": "painel Adequação do acervo dentro do Criador de Projetos (/projects/new?painel=adequacao, proposta) e sub-aba Insights › Acervo (/insights/acervo, RF43)",
    "coverage": "o título define o RF — CAs derivados do título + HU20, numerados RF20.A01 … RF20.A06 e marcados \"(CA a confirmar)\". Corpo do card = criador de tarefas (RF20.CA01–CA15: Fonte · Detecção por IA · Dados · Mais detalhes · Arte do card) — esses CAs são citados abaixo como estão escritos e estão diagramados no RF4 (Criador de tarefas) e em _anterior/RF20; não são modelados aqui.",
    "cas": [
      {
        "id": "RF20.A01",
        "text": "Dado um empregado no Criador de Projetos, quando abre o painel Adequação do acervo, então vê o Score do Acervo (0–100) com decomposição (cobertura por processo, tarefas paradas, duplicadas, \"fantasma\" sem anexo, prazos legais em risco, reutilização) e o mapa de lacunas por processo (ProcessTag × categorias esperadas), calculados por InsightService.acervo sobre MetricDefinition/MetricSnapshot (RF43.CA03); acervo com menos de 3 tarefas mostra \"o que coletar\" em vez de números.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A02",
        "text": "Dado um processo escolhido (ex.: LICITACAO), quando peço \"avaliar adequação\", então o sistema monta um projeto hipotético com as tarefas compatíveis do meu Acervo (AcervoService.listCompatible + PHASE_BY_CATEGORY, só DISPONIVEL/EM_USO/MODELO_PUBLICO) e roda ComplianceService.evaluateHypothetical contra o checklist ativo da empresa/departamento (RF32.CA01), devolvendo % de conformidade, itens ATENDIDO / RECOMENDADO_AUSENTE / OBRIGATORIO_AUSENTE ⛔ / FORA_DE_ORDEM e qual tarefa satisfaz cada item; nada é persistido como ProjectScheme nem ComplianceResult.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A03",
        "text": "Dado o resultado, quando a IA está disponível, então AiEngine INSIGHT redige em até 3 frases por lacuna \"por que isto falta e o que fazer\", citando métrica e valor (faísca ✦, AiInferenceLog); IA indisponível ou accessClass RESTRITO/SIGILOSO → texto-padrão do motor local, com os mesmos números.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A04",
        "text": "Dado uma lacuna OBRIGATORIO_AUSENTE, quando aciono a ação de 1 clique, então posso: criar a tarefa faltante (abre o Criador de tarefas pré-preenchido com categoria/tipo/fase esperados e checklistItemId, RF4/RF32.CA03), buscar modelo no Balcão (RF40) ou na Buscar (RF17), ou levar ao meu acervo uma tarefa compatível de colega (RF7); a ação fica em Insight.actionsJson e o painel recalcula ao voltar.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A05",
        "text": "Dado um resultado com conformidade ≥ limiar do checklist e sem ⛔, quando clico Compor projeto com estas tarefas, então o compositor (RF5) abre com as fases pré-preenchidas pelo projeto hipotético e ProjectScheme nasce RASCUNHO com aiOrientation = processo escolhido; com ⛔ o botão fica disponível com aviso \"projeto nascerá com pendência bloqueante\" (hasBlockingPending) — aviso, não impedimento (RF32.CA04).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A06",
        "text": "Dado o painel, quando a avaliação termina, então um Insight (scope ACERVO, kind ADEQUACAO_PROCESSO, metricRefsJson, actionsJson, severity) é gravado para o usuário e aparece em Insights › Acervo (RF43) até ser dispensado (dismissedAt) ou até o próximo recálculo; avaliação de acervo de terceiro responde 403 ACESSO_NEGADO (RF43.CA04 \"só o dono\"); checklist inexistente para o processo → 404 CHECKLIST_NAO_ENCONTRADO com sugestão de propor um (RF32).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.CA01",
        "text": "RF4 — Criador de tarefas (docs/diagramas/RF4/README.md) e docs/diagramas/_anterior/RF20/README.md",
        "note": "formatos e limite de upload, antivírus · CA02 detecção por IA pré-preenche · CA03 IA sem confiança → formulário vazio · CA04 obrigatórios → Acervo e projeto/fase · CA05 lote/.zip → rascunho por arquivo · CA06 Ctrl+V → TEXTO_MANUAL/PLANILHA/IMAGEM_EDITADA · CA07 vinculado Google/Microsoft sincroniza · CA08 e-mail → tarefa · CA09 protocolo → PROTOCOLO · CA10 busca web de órgão · CA11 prazo legal calculado · CA12 OCR indisponível → job · CA13 chancelas sugeridas · CA14 422 por campo · CA15 Oferecer no Balcão",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF21",
    "n": 21,
    "title": "Utilizar a mesa de trabalho digital de meu perfil",
    "hu": "COMO usuário pertencente a alguma empresa ou organização POSSO acessar a mesa de trabalho de minha equipe PARA visualizar de forma estratégica, formal e coerente as metas diárias, semanais e mensais de minha empresa, além de entender o que meus colegas de equipe estão produzindo.",
    "summary": "A Mesa de Trabalho do perfil é o painel pessoal/da equipe que reúne, sobre a mesma família visual do RF22 (texturas DeskSkin PAPEL · CORTIÇA · BLUEPRINT · PAPEL_TIMBRADO, post-its, cartões), widgets com três horizontes: diário (Tarefa do Dia e HSE, DailyTask RF44), semanal (WeekPlan/WeekPlanDay, prazos ≤ 7 dias) e mensal (eixos do Plano Anual do departamento PlanAxis.completedPct, metas coletivas CollectiveGoal.progress, destaques Highlight). Tem duas sub-abas: Minha mesa (layout em UserPreferences.dashboardLayoutJson, skin de UserPreferences.deskSkin/UserSkin) e Mesa da equipe (um canvas por departamento, compartilhado pelos membros com propagação ≤ 3 s via Redis pub/sub, projetos da equipe por fase, linha do tempo de marcos, atividade dos colegas via TimelineEvent/MuralEntry). Entidades novas (propostas): TeamDesk (id · departmentId · layoutJson · deskSkin · version · updatedBy · updatedAt) e DeskNote (id · deskScope (PESSOAL · EQUIPE) · scopeId · authorId · contentMd · color · canvasX · canvasY · canvasScale · canvasRotation · canvasLayer · pinned · active). Três visões do mesmo estado — Quadro (projetos da equipe por ProjectPhase), Linha do tempo (marcos nextMilestoneAt, dueAt, legalDueAt, votingDeadlineAt) e Canvas (widgets e post-its com x/y/escala/rotação/camada). Abrir um projeto leva à Mesa do projeto (RF22); abrir uma sessão leva à Mesa do DECIA. Limites LGPD: HSE nominal e Tarefa do Dia só do próprio usuário; a equipe vê agregados (RF45.CA10, ABAS_POR_PERFIL.md §7.b).",
    "route": "Mesa de Trabalho (/desk, sub-abas Minha mesa",
    "coverage": "RF21.CA01 … RF21.CA07 — corpo do card vazio: CAs derivados do título + HU21 + RF22 (quadro / linha do tempo / canvas, skins, colaboração ≤ 3 s, versões) + Mesa do DECIA §C (mesma família visual); todos marcados \"(CA a confirmar)\"",
    "cas": [
      {
        "id": "RF21.CA01",
        "text": "Dado um usuário autenticado com lotação (DepartmentMembership vigente), quando abre /desk, então vê as sub-abas Minha mesa e Mesa da equipe (do departamento em que está lotado) com a textura DeskSkin das suas preferências ou de uma UserSkin comprada (RF38/RF42); conta EMPRESA vê a Mesa de cada departamento em leitura; sem lotação, só Minha mesa.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF21.CA02",
        "text": "Dado a Mesa, quando carrega, então mostra widgets nos três horizontes: diário — Tarefa do Dia + HSE previsto × realizado (RF44, só do próprio usuário); semanal — semana planejada WeekPlanDay e prazos ≤ 7 dias; mensal — eixos do Plano Anual do departamento (PlanAxis.completedPct, aggregatedRisk), metas coletivas abertas (CollectiveGoal.progress) e Destaque do mês (Highlight); cada widget linka ao RF de origem.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF21.CA03",
        "text": "Dado a Mesa da equipe, quando abro a visão Quadro, então vejo os projetos do departamento (visibilidade DEPARTAMENTO/EMPRESA/PUBLICA) agrupados por ProjectPhase com responsável, prazo e hasBlockingPending; a visão Linha do tempo mostra marcos dos próximos 30 dias; o painel Atividade dos colegas lista TimelineEvent/MuralEntry do departamento (projetos publicados, decisões validadas, chancelas, reconhecimentos) — nunca itens PRIVADA nem HSE/Tarefa do Dia de terceiros.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF21.CA04",
        "text": "Dado a visão Canvas, quando arrasto, redimensiono ou giro um widget ou post-it (DeskNote) e troco a skin, então a posição (canvasX/Y/Scale/Rotation/Layer) persiste em UserPreferences.dashboardLayoutJson (Minha mesa) ou TeamDesk.layoutJson (Mesa da equipe) sem gerar versão; trocar de visão reprojeta o mesmo estado sem perder dados (como RF22.CA03).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF21.CA05",
        "text": "Dado dois membros editando a Mesa da equipe, quando um move um post-it ou cria uma nota, então o outro recebe a alteração em ≤ 3 s (Redis pub/sub desk:team:{departmentId} + WebSocket/polling), com presença visível e conflito resolvido por último-vence com aviso (CONFLITO_ULTIMO_VENCE, TeamDesk.version); só membros do departamento e o chefe escrevem — demais 403 ACESSO_NEGADO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF21.CA06",
        "text": "Dado um card de projeto na Mesa, quando clico \"abrir na Mesa do projeto\", então vou para RF22 (/projects/[id]/edit) e qualquer alteração estrutural gera ProjectVersion (RF22.CA02); \"abrir sessão DECIA\" leva à Mesa do DECIA; as ações sociais inline seguem RF18/RF19; o widget Tarefa do Dia aceita o feedback do RF44 direto da Mesa.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF21.CA07",
        "text": "Dado a Mesa da equipe, quando o chefe (Department.headUserId) fixa (pinned) uma nota ou define a skin padrão, então ela fica no topo para todos; a Mesa guarda version e permite \"restaurar layout padrão\"; exportar a Mesa em PDF/PNG roda como PipelineJob EXPORT_PDF (RF22.CA07).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF22",
    "n": 22,
    "title": "Editar um Esquema de Projeto na Mesa de Trabalho (quadro por fase, linha do tempo e canvas livre) com versões e histórico",
    "hu": null,
    "summary": "Três visões do mesmo ProjectScheme: Quadro (kanban por ProjectPhase, arrastar e soltar), Linha do tempo (barras por ProjectTask com prazo, ProjectTaskDependency e caminho crítico — Gantt simples) e Mesa (canvas livre: cartões/post-its com canvasX/Y/Scale/Rotation/Layer, conectores de dependência, textura DeskSkin PAPEL · CORTIÇA · BLUEPRINT · PAPEL_TIMBRADO e skins salvas em UserSkin, RF38). Toda alteração estrutural gera uma ProjectVersion com autor, data e diffJson legível; a edição é colaborativa (propagação ≤ 3 s via Redis pub/sub + WebSocket/polling, conflito resolvido por último-vence com aviso); comentários por tarefa usam Comment com targetType = PROJECT_TASK; o painel lateral mostra o fio de decisão (DecisionTraceNode/Edge) da DeciaSession vinculada (RF29); projetos CONCLUÍDO/ARQUIVADO ficam bloqueados (reabrir exige justificativa); exportação em PDF e ZIP roda como PipelineJob EXPORT_PDF com entrega via MediaStoragePort.",
    "route": "/projects/[id]/edit e Mesa de Trabalho (/desk)",
    "coverage": "RF22.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07",
    "cas": [
      {
        "id": "RF22.CA01",
        "text": "ProjectDeskService.canEdit (nota: dono OR responsável OR Department.headUserId), classe Department · Atividades A2 (não) → W5 -.-> A4 403 ACESSO_NEGADO · Sequência canEdit = … e alt viewer sem permissão → 403 ACESSO_NEGADO · Nota do estado Editável · Componentes PresenceAvatars, ProjectDeskController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF22.CA02",
        "text": "Classes ProjectVersion (versionNumber, authorId, diffJson legível, snapshotJson, restoredFromVersionId), ProjectVersionService.record/list/compare/restore · Atividades A6 (sim) → A9 → A10 → P2, U6 → A15 · Sequência INSERT project_versions (19 …), GET …/versions/17/compare/19, POST …/versions/17/restore · Tabela de alterações estruturais do cabeçalho · Componentes VersionHistory + DiffView, ProjectVersionController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF22.CA03",
        "text": "ProjectTask.canvasX/canvasY/canvasScale/canvasRotation/canvasLayer/stickyColor, enum DeskView, ProjectDeskService.saveCanvasPosition · Atividades U2 → W2, U4 → A12 → P1 · Sequência GET …/desk?view=MESA (\"trocar para Quadro reprojeta o mesmo estado\") e PUT …/tasks/T2/canvas (sem nova versão) · Região concorrente Quadro → LinhaDoTempo → Mesa da máquina de estados · Componentes KanbanBoard, GanttTimeline, DeskCanvas",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF22.CA04",
        "text": "CollaborationPort (nota canal desk:{projectId}, ≤ 3 s, último-vence), RedisPubSubAdapter, DeskRealtimeController, ProjectScheme.version · Atividades A7 → A8 (último-vence, warning) → A9 → A11 → P3 → W4 · Sequência opt version atual 18 diferente de baseVersion 17 → warnings: [CONFLITO_ULTIMO_VENCE], PUBLISH desk:42, WS push em até 3 s, \"toast se conflito\" · Componentes Realtime client, cache-redis pub/sub",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF22.CA05",
        "text": "Classes Comment (targetType PROJECT_TASK, mentionsJson), Notification, DecisionTraceNode/Edge, DeciaSession.linkedProjectId, SocialService.comment, DecisionTraceService.threadForProject · Atividades U5 → A13 → P4, U5 → A14 → P5 · Sequência trace_by_entity … (fio de decisão) e POST /api/interactions/PROJECT_TASK/T1/comments → notifications_by_user · Componentes CommentThread, DecisionThreadPanel, InteractionController RF26, persistence-cassandra",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF22.CA06",
        "text": "Enum ProjectStatus (CONCLUIDO, ARQUIVADO), ProjectDeskService.reopen, AuditLog (PROJECT_REOPEN), ProjectVersion.reason · Atividades A3 (sim) → W6 -.-> A5 409 PROJETO_BLOQUEADO, U7 → A16 → A17 422 / A18 → P6 → A10 · Sequência else projeto CONCLUIDO ou ARQUIVADO → 409 PROJETO_BLOQUEADO · Estado composto Bloqueado e transição Bloqueado → Editavel : reabrir com justificativa + nota",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF22.CA07",
        "text": "Classes PipelineJob (EXPORT_PDF), MediaObject, TaskAttachment, PdfRenderPort, MediaStoragePort.presign, ProjectDeskService.requestExport · Atividades U8 → A19 → P7 → W7, A20 · Sequência POST …/export?format=PDF → 202 jobId → worker renderProjectReport → MediaStoragePort.put(pdf) ou ZIP com todos os TaskAttachment → GET /api/jobs/{jobId} → downloadUrl · Componentes ExportMenu PDF/ZIP, JobController, storage-s3, platform PdfRendererAdapter",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF23",
    "n": 23,
    "title": "Importar tarefas ou projetos de outros provedores para dentro de meu perfil do Work Station",
    "hu": null,
    "summary": "O título fala de importar tarefas ou projetos de outros provedores; o corpo descreve extrair uma tarefa de um Esquema de Projeto para o meu Acervo. Este README modela os dois caminhos, que convergem na mesma entidade TaskItem do meu Acervo:",
    "route": "Criar Tarefa (/tasks/new, abas Google Workspace · Microsoft 365 · E-mail · Protocolo) para importar; ação \"Levar ao meu acervo\" no card de tarefa em /projects/[id] para extrair; destino Acervo de Tarefas (/acervo, RF41)",
    "coverage": "RF23.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card — extrair tarefa de projeto + snapshot) · RF20.CA07 · RF20.CA08 · RF20.CA09 (importar de Google/Microsoft, e-mail e e-Protocolo — CAs escritos no card RF20, citados como estão) · RF23.CA06 (CA a confirmar — importar projeto de provedor) — regra: o título do card define o RF; o corpo contém os CAs RF23.CA01–05 de extração (= antigo RF23, ver _anterior/RF23); as fontes externas do título vêm do antigo RF20 etapa 1 (_anterior/RF20)",
    "cas": [
      {
        "id": "RF20.CA07",
        "text": "Classes TaskVersion, TaskItem.linkMode/sourceRef/format, enum LinkMode, ExternalDocPort.fetch/subscribeChanges/revoke, TaskCreatorService.createFromExternal, AcervoService.syncLinkedVersion/convertLinkToSnapshot, ExternalDocWebhookController, GoogleDriveAdapter, MicrosoftGraphAdapter, PipelineJob SYNC_EXTERNO · Atividades U1 → W1 → U2 → A1 → A2 → A4 → A5/A6, A10 → W7, U5 → A11 · Sequência bloco \"Importar de provedor externo\" (POST /api/tasks/sources, alt OAuth expirado → 403 ACESSO_NEGADO, INSERT task_versions, nota do webhook e da revogação) · Estados Importada: VINC → VINC (TaskVersion + 1), VINC → COP (OAuth revogado) · Componentes DrivePicker, OneDrivePicker, LinkModeToggle, VersionBadge, C3, I5 → E1/E2",
        "note": "Google/Microsoft vinculado ou copiado",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA08",
        "text": "TaskCreatorService.createFromEmail, EmailInboundController, EmailInboundAdapter, enum SourceKind.EMAIL, TaskItem.senderOrigin/sourceRef · Atividades U1 → W1 (EmailDrop) → A1 · Componentes EmailDrop, C4, E4 → C4",
        "note": "e-mail",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA09",
        "text": "TaskCreatorService.createFromProtocol, ProtocolPort.lookup, EProtocoloAdapter, TaskItem.protocolNumber, enum SourceKind.PROTOCOLO · Atividades U1 → W1 (ProtocolInput) → A1 · Componentes ProtocolInput, P2 → I5 → E3",
        "note": "protocolo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF23.CA01",
        "text": "TaskItem.sourceKind EXTRAIDA_DE_PROJETO / originalTaskId / sourceProjectId, enum SourceKind, AcervoService.extractToAcervo · Atividades U3 → W3 (não) → A12 → A15 → P3 · Sequência POST /api/projects/77/tasks/PT9/extract → INSERT tasks (… EXTRAIDA_DE_PROJETO, originalTaskId T9, sourceProjectId 77 …) · Transição [] → DISPONIVEL da Cópia* · Componentes TaskCard, CreditBadge, ProjectController /extract",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF23.CA02",
        "text": "TaskAttachment.mediaObjectId (nota \"referência, não duplicação\"), MediaObject, AcervoService.copyAttachmentsByReference, enums TaskState.DISPONIVEL, Visibility.PRIVADA · Atividades A16 · Sequência INSERT task_attachments (mediaObjectId igual ao da original) e state DISPONIVEL, visibility PRIVADA, type, category, tags herdados · Nota da Cópia · Componente storage-s3 (compartilhados por referência)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF23.CA03",
        "text": "ProjectTask.snapshotJson / removedByAuthor / taskId nullable, TaskSnapshot, ProjectTaskDependency, ProjectComposerService.snapshotProjectTasks/renderRemovedByAuthor, AcervoService.deleteTask · Atividades U4 → A19 → A20 → A21 → P5 → A22 → W6 · Sequência bloco \"Exclusão pelo dono\" → alt usada em projetos de terceiros → UPDATE project_tasks SET snapshotJson …, taskId = NULL, removedByAuthor = true + nota \"fases … intactos\" → card removida pelo autor · Estados Original → EXCLUIDA e ProjectTask → RemovidaPeloAutor · Componente RemovedByAuthorCard",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF23.CA04",
        "text": "TaskItem.reuseCount, DeliberativeProfile.reuse, ReputationService.onTaskReused, Notification · Atividades A17 → P3, A18 → P6 → W5 · Sequência UPDATE tasks SET reuseCount + 1, UPDATE deliberative_profiles SET reuse, \"reutilizada N vezes\" · Transição EM_USO_ORIG → EM_USO_ORIG : reuseCount + 1 · Componentes ReuseCounter, ReputationService RF43",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF23.CA05",
        "text": "AcervoService.canExtract (nota PRIVADA → oculta + 403) · Atividades W3 (sim) → W4 (ação oculta) e A13 (não) → A14 403 ACESSO_NEGADO · Sequência alt tarefa PRIVADA ou projeto invisível → 403 ACESSO_NEGADO · Nota da Cópia",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF23.CA06",
        "text": "TaskCreatorService.importFolderAsProject, ExternalDocPort.listFolder, TaskController POST /api/tasks/import-project, ProjectScheme RASCUNHO com uma ProjectTask por arquivo da pasta (ou item do plano Planner/Google Tasks) · Sem passo próprio nos diagramas 2–4 até confirmação do CA",
        "note": "a confirmar — importar projeto de provedor",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF24",
    "n": 24,
    "title": "Visualizar a aba metas & objetivos de minha equipe com insights analíticos gerados por IA",
    "hu": null,
    "summary": "A aba Metas & Objetivos é a visão da equipe (departamento) sobre três fontes já modeladas: (1) o Plano Anual (AnnualPlan = DNA de Estilo, 6 PlanAxis com meta, indicador e cor, projetos ligados por PlanAxisProject, derivação do plano oficial da EMPRESA, comparação entre exercícios); (2) as metas coletivas (CollectiveGoal/GoalParticipant, RF35) com progresso calculado de MetricSnapshot; (3) os insights de equipe (Insight com scope = EQUIPE, RF43 §4) — carga e balanceamento, gargalos, tendência por eixo, recomendações acionáveis — redigidos pela AiEngine somente sobre números do MetricCalculator, com amostra mínima (MetricDefinition.minSamples) e benchmarks anonimizados. CHEFE e EMPRESA veem a aba completa; EMPREGADO vê o plano do departamento, as metas em que pode entrar e os insights agregados (nunca nominais, RF45.CA10).",
    "route": "Plano Anual (/plans, /plans/new, /plans/[id], /plans/compare?a=&b=) + aba Metas & Objetivos da equipe (/departments/[slug]/goals, proposta) que reúne eixos do plano, metas coletivas (/goals, RF35) e Insights › Equipe (/insights/equipe, RF43)",
    "coverage": "RF24.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 (corpo do card — Plano Anual) · RF35.CA01 · RF35.CA02 (metas coletivas, citados como estão) · RF43.CA14 · RF43.CA15 (insights de equipe, citados como estão) — regra: o título do card define o RF; o corpo contém os CAs RF24.CA01–07 do Plano Anual (= _anterior/RF24); o título acrescenta \"da equipe\" e \"insights da IA\", cobertos pelos CAs do RF35 e do RF43 §4",
    "cas": [
      {
        "id": "RF24.CA01",
        "text": "AnnualPlan (exerciseYear, title), PlanAxis (position 1..6, name, goal, indicator, color), relação AnnualPlan \"1\" --> \"6\" PlanAxis, PlanService.create/validateSixAxes · Atividades U2 → A5 → A6 → A7 422 EIXOS_INVALIDOS / P1 → W2 · Sequência (bloco \"Vincular\"/derivação usam o plano criado) · Transição [*] → RASCUNHO + nota · Componentes AxisGrid 6 células, AxisCard, app/plans/new",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA02",
        "text": "PlanAxisProject (nota índice único planId + projectId), ProjectScheme.planAxisId, PlanService.linkProject/validateOnePerPlan · Atividades U3 → A8 → A9 → A10 409 PROJETO_JA_NO_PLANO, A11 → A12 403, A13 → P1 · Sequência POST /api/plans/{planId}/axes/{axisId}/projects → alt P1 já em outro eixo → 409 / INSERT plan_axis_projects · UPDATE project_schemes SET planAxisId · Nota do estado Plan · Componente ProjectDragDrop",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA03",
        "text": "PlanAxis.projectsCount/completedPct/nearestDueAt/aggregatedRisk, enum RiskLevel, PlanService.recomputeAxis, RiskAggregationService.aggregate, ComplianceResult, ProjectScenario, CachePort · Atividades A13 → P2, A13 → I2 → W2 · Sequência recomputeAxis, DE->>AI run(CONFORMIDADE agregada …) → UPDATE plan_axes SET aggregatedRisk, GET /api/departments/{deptId}/goals-tab (agregados do Redis) · Componentes cache-redis, ai-providers",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA04",
        "text": "AnnualPlan.derivedFromPlanId/scope, enum PlanScope, PlanService.derive · Atividades U4 → A14 → A15 → A16 422 / P1 · Sequência POST /api/plans/{officialId}/derive → alt não é EMPRESA publicado → 422 DERIVACAO_INVALIDA / INSERT annual_plans (scope DEPARTAMENTO, derivedFromPlanId …) · Transição PUBLICADO → DERIVADO → RASCUNHO · Componente DeriveButton",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA05",
        "text": "Enum CompareBucket (NOVO, CONCLUIDO, REPROGRAMADO, MANTIDO), PlanService.compare · Atividades U5 → A17 → W4 · Sequência GET /api/plans/compare?a=&b= → CompareResult {porEixo …} · Transição ENCERRADO → ENCERRADO : usado em comparação · Componentes app/plans/compare, CompareColumns",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA06",
        "text": "Reaction (targetType PLAN), SealBond (tier PLANO, PLANO_MATCH), AnnualPlan.visibility/coverUrl/sealIdsJson, SocialService.react, SealService.suggestForPlan · Atividades U6 → A18 → P5 · Sequência POST /api/plans/{planId}/publish · POST /api/interactions/PLAN/{planId}/reactions · Transição PUBLICADO → PUBLICADO : interações RF26, chancela tier PLANO · Componentes InteractionBar RF26, SealWax, InteractionController RF26",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA07",
        "text": "DeciaSession.planAxisId, AnalyticalSummary.recommendationsJson (planAxisId), Insight PROJETO_SEM_EIXO, PlanService.projectsWithoutAxis · Atividades A1 → A23 → P4 → W8, A23 -.-> I3 · Sequência nota final \"RF24.CA07 — … inclui planAxisId em cada recomendação … Insight PROJETO_SEM_EIXO que aparece nesta aba\" · Componentes ai-providers RESUMO_ANALITICO cita eixo, painel \"eixos citados no DECIA\" em W1",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA01",
        "text": "CollectiveGoal (criterionJson, periodFrom/To, rewardPointsPerParticipant, progress), GoalParticipant, GoalService.create/join/recomputeProgress, MetricSnapshot · Atividades U7 → A19 → P3 → W5 · Sequência bloco \"Meta coletiva da equipe\" (POST /api/goals/{goalId}/join) · Estado composto Goal [*] → ABERTA → ABERTA · Componentes app/goals RF35, GoalProgressBar, GoalProgressScheduler",
        "note": "meta coletiva: período, critério mensurável, recompensa",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA02",
        "text": "CollectiveGoal.status/achievedAt, enum GoalStatus, GoalService.recomputeProgress · Atividade A19 (recomputeProgress a partir de MetricSnapshot) · Transição ABERTA → ATINGIDA / EXPIRADA e nota (META_ATINGIDA por participante) · Componente platform GoalProgressScheduler",
        "note": "progresso automático e meta atingida",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA14",
        "text": "Insight (scope EQUIPE, metricRefsJson, actionsJson, severity), InsightService.equipe/applyAction, MetricCalculator, TeamGoalsService.visibleInsights, AiEngine INSIGHT · Atividades A1 → A2 → A3/A4, A20 → A22 → I1 → P4 → W6, U8 → A24 · Sequência bloco \"Abrir a aba\" (InsightService.equipe, MetricCalculator.compute, run(INSIGHT …), viewer EMPREGADO recebe só insights agregados) · Componentes InsightCard ✦, OneClickAction, InsightController RF43, ai-providers INSIGHT",
        "note": "insights de equipe para CHEFE/EMPRESA, benchmarks anonimizados, recomendações acionáveis",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA15",
        "text": "MetricDefinition.minSamples · Atividades A21 (não) → W7 · Sequência alt amostra abaixo de minSamples → 200 aba sem insights + explicação do que falta coletar · Nota de Insight · Componente InsufficientDataState",
        "note": "amostra mínima",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF25",
    "n": 25,
    "title": "Agrupar projetos e tarefas em Programas, Exercícios e Gestões (agrupamentos institucionais)",
    "hu": null,
    "summary": "O Agrupamento (Grouping, = SchemeGrouping do FAI) organiza projetos e tarefas em quatro tipos (GroupingType): PROGRAMA (= coleção, ex.: \"Programa Cidade Acessível 2026\"), EXERCÍCIO (= temporada, ano orçamentário), GESTÃO (= era, período de um chefe ou de uma gestão da empresa) e FRENTE (= linha de estilo, tema transversal). EMPRESA e CHEFE criam qualquer tipo; EMPREGADO só cria FRENTE pessoal. A ligação é GroupingItem (targetType PROJECT | TASK) e, para projetos, os ponteiros desnormalizados ProjectScheme.programGroupingId / exerciseGroupingId / managementGroupingId — um item pode estar em vários agrupamentos de tipos diferentes, mas em no máximo um por tipo. A página do agrupamento mostra capa, projetos em grade, progresso agregado e a linha do tempo de decisões (DecisionTraceNode, RF29). Agrupamentos aparecem na página da empresa/departamento (RF28) e são indexados para Buscar (RF27). Encerrar uma GESTÃO gera automaticamente o Dossiê de Transição (HandoffDossier, RF36) do período.",
    "route": "sub-aba Programas & Agrupamentos no perfil (RF19), página do agrupamento (/groupings/[id]), página da empresa/departamento (RF28)",
    "coverage": "RF25.CA01 · CA02 · CA03 · CA04 · CA05",
    "cas": [
      {
        "id": "RF25.CA01",
        "text": "Grouping (type, label, description, coverUrl, periodFrom/To), enums GroupingType, ProfileType, GroupingService.create/canCreate (nota EMPREGADO só FRENTE), MediaStoragePort · Atividades U1 → A1 → A2 → A3 403 ACESSO_NEGADO / A4 → P1 · Sequência POST /api/groupings → alt EMPREGADO tentando criar … → 403 / INSERT groupings · Transição [*] → ATIVO + nota · Componentes GroupingForm, storage-s3",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA02",
        "text": "GroupingItem (nota 1 por tipo), ProjectScheme.programGroupingId/exerciseGroupingId/managementGroupingId, GroupingService.addItem/validateOnePerType · Atividades U2 → A5 → A6 → A7 409 AGRUPAMENTO_MESMO_TIPO / A8 → P2 · Sequência POST /api/groupings/{gId}/items → alt P5 já em outra GESTAO → 409 / INSERT grouping_items + UPDATE project_schemes SET managementGroupingId · Transição ATIVO → ATIVO · Componente ItemPicker",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA03",
        "text": "GroupingService.page, ProjectTask.percentComplete, DecisionTraceNode (nodeType DECISAO), DeciaSession.linkedProjectId, DecisionTraceService.timelineForProjects, CassandraTraceReadAdapter · Atividades U3 → A9 → A10 → P3 → W2 · Sequência GET /api/groupings/{gId} → AVG percentComplete + COUNT por status → trace_by_entity … nodeType = DECISAO → {cover, projects grid, progress, decisionsTimeline} · Componentes app/groupings/[id], ProgressRing, DecisionTimeline, persistence-cassandra",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA04",
        "text": "GroupingService.listForOrg, SearchIndexPort.indexGrouping, Company, Department · Atividades U4 → A11 → P1 → W4 · Sequência indexGrouping (CA04), GET /api/companies/secid/groupings, GET /api/search?q=… → msearch inclui índice de agrupamentos · Componentes F3 (RF28), SearchController RF27, search-opensearch",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA05",
        "text": "Grouping.status/closedAt/handoffDossierId, enums GroupingStatus, HandoffStatus, HandoffDossier (subjectType GESTAO, reason FIM_GESTAO, contentJson), HandoffItem, GroupingService.close, HandoffService.generateForManagement, AiEngine DOSSIE, Notification · Atividades U5 → A12 → A14 → A13 (sim) → A15 → I1 → A16 → P4 → W5 · Sequência POST /api/groupings/{gId}/close → publish GroupingClosed → HandoffService.generateForManagement → infer(DOSSIE …) → INSERT handoff_dossiers, handoff_items, UPDATE groupings SET handoffDossierId, notificação · Transições ATIVO → ENCERRADO → fim → DOSSIE_GERADO → AGUARDANDO_SUCESSOR → TRANSFERIDO · Componentes CloseManagementDialog, HandoffService RF36, platform outbox GroupingClosed, ai-providers DOSSIE",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF26",
    "n": 26,
    "title": "Utilizar o Copilot do WS para criar sugestões de tarefas e projetos de maneira mais prática e funcional",
    "hu": null,
    "summary": "O Copilot do WS é o nome de produto para o par Autopilot de tarefas (texto, ofício ou e-mail → N TaskItem RASCUNHO com sourceKind = AUTOPILOT, RF43.CA07) + Autopilot de projetos (demanda → AutopilotDraft volátil em Redis → ProjectScheme com origin = AUTOPILOTO ao confirmar, RF30; ou até 5 candidatos com FeasibilitySheet ordenados por viabilidade, RF43.CA08). Tudo passa pela AiEngine (Strategy + Chain: Claude → Gemini → LocalEngine), respeita AiMode ECONOMIA/AVANÇADO (UserPreferences.aiModeDefault, cota AiQuota), nunca envia accessClass RESTRITO/SIGILOSO a provedor externo e nada vira tarefa DISPONÍVEL nem projeto PUBLICADO sem aceite humano. CAs derivados da HU26 (a confirmar):",
    "route": "Copilot / Autopilot (/autopilot: Sugerir tarefas e Sugerir projetos), Insights › Projetos sugeridos (/insights, RF43), botão ✦ \"Pedir ao Copilot\" na folha \"+ Criar\", no Acervo (RF41) e na Mesa de Trabalho (RF22); a proposta de projeto abre na Mesa em modo rascunho",
    "coverage": "corpo do card = RF19.CA01–07 (perfil do usuário: cabeçalho, 15 sub-abas, filtros, Tarefa do Dia, perfil deliberativo, sub-abas institucionais, i18n) — citados como estão escritos, corpo do card = antigo RF19 (perfil, ver RF6/RF16 e _anterior/RF19), não modelados aqui; o título (Copilot do WS) é modelado com os CAs já escritos nos cards RF30 e RF43: RF30.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (Autopiloto de Projeto) · RF43.CA06 (modo ECONOMIA/AVANÇADO) · RF43.CA07 (Autopilot de tarefas) · RF43.CA08 (Ficha de Viabilidade, até 5 candidatos) · RF43.CA10 (aceitar/descartar) · RF43.CA11 (motor local sem chave externa) — e RF26.CA01–CA04 derivados da HU26 \"(CA a confirmar)\"",
    "cas": [
      {
        "id": "RF19.CA01",
        "text": "Não modelados aqui — corpo do card = antigo RF19; ver RF6 (Perfil Empresarial), RF16 (Ver perfil de empregado) e _anterior/RF19/README.md (cabeçalho, 15 sub-abas, filtros/URL, Tarefa do Dia, perfil deliberativo, sub-abas institucionais, i18n)",
        "note": "–CA07 (corpo do card = perfil",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA01",
        "text": "Atividades U1 (folha + Criar, Acervo, Mesa, /autopilot) · Componentes F3 (botão ✦ Pedir ao Copilot), CopilotSheet",
        "note": "a confirmar — acionável de qualquer tela de criação",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA02",
        "text": "= RF43.CA07 acima · Componente BatchReviewBar",
        "note": "a confirmar — rascunhos revisáveis em lote",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA03",
        "text": "= RF30.CA02–CA04 e RF43.CA08–CA10 acima · Remix, ModelCreditChip",
        "note": "a confirmar — proposta na Mesa ou Ficha, crédito aos modelos",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA04",
        "text": "= RF43.CA06 acima · ModeSelector com custo, QuotaBanner",
        "note": "a confirmar — escolha de modo e aviso de débito",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA01",
        "text": "AutopilotService.analyzeDemand, TaskItem.accessClass do DOCUMENTO · Atividades U3 → W1 → A1 → A2 (422/403) · Sequência bloco \"Copilot de projetos a partir de uma demanda\" (POST /api/autopilot/analyze) · Transição [*] → Analisada · Componentes app/autopilot, CopilotSheet",
        "note": "demanda em texto, ofício ou DOCUMENTO",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA02",
        "text": "SealBond APROVADA, MemoryService.similarProjects, InstitutionalMemoryDocument, Citation, Remix, ProjectTaskDependency · Atividades A6 → P3 · Sequência SELECT seal_bonds APROVADA + kNN ws-memory + run(COMPOR_PROJETO …) · Transição Analisada → Proposta · Componentes MemoryService RF33, search-opensearch, ModelCreditChip",
        "note": "proposta remixa modelos chancelados e semelhantes",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA03",
        "text": "DraftCachePort, RedisDraftCache, AutopilotService.updateDraft/discard · Atividades A7 → P2 → W3 → U5 · Sequência SET autopilot:draft TTL 24h, PATCH /api/autopilot/drafts/{draftId} · Estados Proposta → Ajustada → Descartada/Expirada · Componentes DeskCanvas, cache-redis",
        "note": "rascunho não persistido, ajustes",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA04",
        "text": "ProjectScheme.origin AUTOPILOTO / creationMode COM_IA / aiGenerated / aiInferenceId, AiInferenceLog, Remix · Atividades U6 → A17 → A18 (409) / A11 → P4 → W5 · Sequência POST /api/autopilot/drafts/{draftId}/confirm → INSERT project_schemes … remixes … ai_inference_log · Transição Ajustada → RASCUNHO_P · Componente persistence-mysql",
        "note": "confirmar persiste com origem AUTOPILOTO e log",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA05",
        "text": "`LocalEngine ..",
        "note": "fallback sem chave ou cota",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA06",
        "text": "DeciaBridgeService.openSessionFromProject, DeciaSession.linkedProjectId · Atividades U6 → A13 → P5 · Transição RASCUNHO_P → EM_DECISAO · Componente ProjectDeciaController RF29",
        "note": "abrir sessão DECIA sobre a proposta",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA06",
        "text": "AiMode, UserPreferences.aiModeDefault, AiQuota, AiEngine.guardQuota, AiInferenceLog.mode/quotaSource · Atividades U3 → W1, I3 → I4 409 COTA_ESGOTADA · Sequência GET quota:USER …, alt sem cota nem créditos → 409 COTA_ESGOTADA {storeUrl}, debita cota AVANCADO … com aviso prévio · Nota do estado T · Componentes ModeSelector com custo, QuotaBanner, cache-redis quota",
        "note": "modo ECONOMIA/AVANÇADO, cota e DECIA Points",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA07",
        "text": "AutopilotService.tasksFrom/confirmTasks, TaskItem (state RASCUNHO, sourceKind AUTOPILOT, aiGenerated, aiConfidenceJson), enum AiCapability.AUTOPILOT_TAREFAS · Atividades A3 → A4 → P1 → W2 → U4 → A5 · Sequência bloco \"Copilot de tarefas\" (POST /api/autopilot/tasks, INSERT tasks x N (state RASCUNHO …), POST /api/autopilot/tasks/confirm) · Estado T RASCUNHO → DISPONIVEL / ARQUIVADA · Componentes DraftTaskCard ✦, ConfidenceBadge, BatchReviewBar",
        "note": "Autopilot de tarefas → rascunhos",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA08",
        "text": "FeasibilitySheet (costJson, timeJson, deadlineJson, viabilityScoreJson, risksJson, wbsJson, raciJson, assumptionsJson, unknownsJson), FeasibilityService, AutopilotService.suggestProjects(max5) · Atividades A8 → A9 → A10 → P4 → W3 · Sequência bloco \"Copilot sugere novos projetos\" (POST /api/autopilot/projects, INSERT feasibility_sheets (PROPOSTA x5 …)) · Transição [*] → PROPOSTA · Componentes FeasibilityCard, ScoreBreakdown, RiskMatrix, ws-domain FeasibilityService",
        "note": "Ficha de Viabilidade, até 5",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA10",
        "text": "FeasibilitySheet.status/discardReason/resultingProjectId/resultingTaskId, AutopilotService.accept/discardSheet, TaskItem ESTUDO_TECNICO_PRELIMINAR · Atividades U6 → A12 → P4 → W5, U7 → A14 → A15 (422) / A16 · Sequência POST /api/feasibility/{id2}/accept {PROJETO} + alt motivo vazio → 422 MOTIVO_OBRIGATORIO · Transições PROPOSTA → ACEITA / DESCARTADA e nota",
        "note": "aceitar/descartar ficha",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA11",
        "text": "Nota de AiEngine (LocalEngine sem chave externa), FeasibilityService determinístico · Atividades I1 (sim) → I7, I5 (OPEN) → I7 · Sequência alt DOCUMENTO RESTRITO ou SIGILOSO → LocalEngine … BLOQUEADO_SIGILO · Componente ai-providers LocalEngine, FeatureFlag ai.local.only",
        "note": "motor local sem chave externa",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF27",
    "n": 27,
    "title": "Navegar no Mural (mural da empresa e vitrine de projetos) e Buscar projetos, tarefas, pessoas, empresas e chefes de departamento",
    "hu": null,
    "summary": "Mural — três sub-abas: Mural da empresa (MuralEntry da minha empresa: compartilhamentos, decisões validadas, projetos publicados, reconhecimentos — ordem cronológica, filtros por departamento e tipo de item), Vitrine de projetos (= Passarela: projetos chancelados sealIdsJson e modelos MODELO_PUBLICO, capa grande e \"remixar\") e Seguindo (atividade das pessoas/departamentos/empresas que sigo, via Follow + Cassandra timeline_by_user). Páginas de 20 itens, skeleton, estado vazio ilustrado e \"tentar de novo\" em erro; cada item traz as ações do RF26 inline. Buscar — textual (título, descrição, tags, texto OCR de documentos via TaskAttachment.ocrTextRef) nos índices OpenSearch, devolvendo as 5 abas com contadores, respeitando visibilidade e perfil (outra empresa só se PUBLICA); busca semântica opcional (\"projetos parecidos com este\") sobre a Memória Institucional (InstitutionalMemoryDocument, RF33). Seguir/deixar de seguir pessoas, departamentos e empresas com vínculo único.",
    "route": "Mural (/mural, sub-abas Mural da empresa · Vitrine de projetos · Seguindo) e Buscar (/search, abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO)",
    "coverage": "RF27.CA01 · CA02 · CA03 · CA04 · CA05 · CA06",
    "cas": [
      {
        "id": "RF27.CA01",
        "text": "MuralEntry (nota páginas de 20), MuralService.companyFeed/showcase/following, CachePort, TimelinePort · Atividades U1 → W1 (skeleton) → A1 → A2/A3/A4 → W2 (não) → W3 tentar de novo, W4 (sim) → W5 estado vazio, W6 → U2 → W7 próxima página · Sequência GET /api/mural?…&size=20 com alt falha de infraestrutura → 503 … tentar de novo e alt lista vazia → estado vazio ilustrado · Nota de MuralEntry · Componentes FeedSkeleton, EmptyStateIllustrated, RetryButton, InfiniteScroll 20, cache-redis",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA02",
        "text": "Reaction ..> MuralEntry : ações RF26 inline, SocialService · Atividades W6 → U3 → A12 · Sequência \"20 cards com ações do RF26 inline\" · Transição PUBLICADA (nota) · Componentes InteractionBar RF26, InteractionController RF26",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA03",
        "text": "SearchService.search, SearchIndexPort.msearch/count, enum SearchTab, TaskAttachment.ocrTextRef, tabela de índices do cabeçalho · Atividades U4 → A5 → A6 → P3 → W8 · Sequência GET /api/search?q=…&tab=PROJETOS → msearch ws-projects, ws-tasks (title, descriptionMd, tags, ocrText), ws-people, ws-orgs → {tabs: {PROJETOS 12, TAREFAS 31, …}} · Componentes SearchBox, SearchTabs com contadores, SearchFilters, search-opensearch",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA04",
        "text": "SearchService.visibilityFilter (nota outra empresa só PUBLICA), enum Visibility, User.profileType, Department.headUserId (aba CHEFES) · Atividades A5 · Sequência visibilityFilter(viewer) = PUBLICA + EMPRESA (minha empresa) + … e \"resultados de outra empresa só se PUBLICA\"",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA05",
        "text": "InstitutionalMemoryDocument (embedding dense_vector), SearchService.similar, SearchIndexPort.knn, AiEngine.embed · Atividades U5 → A7 → I1 → P4 → W8 · Sequência POST /api/search/similar {PROJECT, P1} → embed(…) MEMORIA_BUSCA → knn ws-memory … accessClass não SIGILOSO · Componentes SimilarProjectsButton, ws-memory kNN, ai-providers embeddings, Claude / Gemini embeddings",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA06",
        "text": "Follow (nota índice único), enums FollowTargetType, FollowStatus, SocialService.follow/unfollow, MuralService.fanOut, TimelineEvent · Atividades U6 → A8 → A9 → A10 / A11 → P5 → W9 · Sequência POST /api/follows {DEPARTMENT, CPOE} → alt já segue → idempotente / INSERT follows (ATIVO) → DELETE /api/follows/DEPARTMENT/CPOE → status REMOVIDO, nota de fan-out · Máquina Follow (NAO_SEGUE → ATIVO → REMOVIDO → ATIVO) · Componentes FollowButton, FollowController, persistence-cassandra timeline_by_user",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF28",
    "n": 28,
    "title": "Gerir perfis EMPRESA e CHEFE DE DEPARTAMENTO (departamentos, página institucional, chancela de tarefas/projetos e emissão de reconhecimentos)",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 1. Identidade & Acesso (User, Company, Department, DepartmentMembership, CuratorAppointment, ApprovalRequest) e 6. Chancelas & Benefícios (só Recognition). Perfis: EMPREGADO (= PESSOAL), EMPRESA (= MARCA, ex.: Secretaria das Cidades), CHEFE_DEPARTAMENTO (= CELEBRIDADE) e ADMIN. Página da empresa: Sobre · Departamentos · Programas (RF25) · Plano Anual (RF24) · Chancelas e modelos oficiais (RF39) · Benefícios (RF39) · Destaques (RF35) · Pessoas. Página do departamento/chefe: Sobre · Projetos · Sessões DECIA · Chancelas e fila de revisão (RF39) · Reconhecimentos (RF35) · Equipe (com curadores). Papel CURADOR é contextual (CuratorAppointment), não um Role.",
    "route": "Empresas & Departamentos (/companies, /companies/[slug], /departments/[slug]); aprovação ADMIN em POST /api/admin/approvals/{userId}",
    "coverage": "RF28.CA01 · RF28.CA02 · RF28.CA03 · RF28.CA04 · RF28.CA05 · RF28.CA06 · RF28.CA07 · RF28.CA08 · RF28.CA09–CA17 (§7, validação de perfis com política versionada, D-19, \"CA a confirmar\")",
    "cas": [
      {
        "id": "RF28.CA01",
        "text": "Classes User.profileType, User.status, ApprovalRequest, AccessPolicy, AdminApprovalController; atividades U1 → W1 → S1 → S2/S3, U2 → S4 → S5/S6; sequência bloco «CA01» (POST /api/admin/approvals/{userId}, alt 403 ACESSO_NEGADO); estados PENDING_EMAIL_VERIFICATION → PENDING_VALIDATION → ACTIVE/SUSPENDED; componentes app/admin/approvals, RoleGate, AdminApprovalController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA02",
        "text": "Classes Company 1→* Department, DepartmentMembership (startedAt/endedAt), User.departmentId; atividades U3 → S7 → S8 (422 VALIDACAO), U4 → S9 → S10; sequência bloco «CA02» (POST .../departments com 422 VALIDACAO, POST .../members, UPDATE endedAt + INSERT); nota do estado ACTIVE; componente CompanyController, DepartmentBadge",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA03",
        "text": "Classes CuratorAppointment, CuratorScope, CuratorService ..> AuditLog, DeptRole.CURADOR; atividades U5 → S11 → S12 → D1/D2 (403 ACESSO_NEGADO); sequência bloco «CA03» (POST .../curators, INSERT audit_log, alt 403); componente CuratorController, app/departments/[slug] Equipe",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA04",
        "text": "Classes Follow ..> Company/Department, InstitutionalService.publicPage, RedisMetricsCache; atividades U6 → W2 → S13 → D3/D1, U7 → S14; sequência bloco «CA04 e CA06» (GET página + cache Redis); componentes app/companies/[slug], cache-redis",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA05",
        "text": "Classes Recognition, RecognitionService, RecognitionController; atividade U8 → S15 (MuralEntry RECONHECIMENTO, 403 para EMPREGADO em E4); sequência bloco «CA05» (POST /api/recognitions, evento → mural_entries + notifications); componentes MedalBadge, RecognitionController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA06",
        "text": "Classe InstitutionalService.issuerDashboard, IssuerDashboardController; atividades U9 → W3 → S16 → D3/D1 (projetos por fase, prazos em risco, decisões EM_REVISAO, fila SealBond, custo de IA, resgates); sequência bloco «CA04 e CA06» (GET /api/issuer/dashboard); componentes app/issuer/dashboard, cache-redis",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA07",
        "text": "Classes Department.headUserId, InstitutionalService.changeHead, HandoffService ..> HandoffDossier; atividades U10 → S17 → S18 → A1 → D4 (move sessões, filas e chancelas pendentes); nota do estado ACTIVE (mais de um departamento); componente HandoffService (RF36)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA08",
        "text": "Classe AccessPolicy.requireIssuer; atividades U11 → S19 → E3/S20; sequência bloco «CA04 e CA06», última troca (403 ACESSO_NEGADO no dashboard para EMPREGADO); nota do estado ACTIVE; componente RoleGate",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA09",
        "text": "Dado um ApprovalRequest, então ele referencia a VerificationPolicy vigente (policyVersion), traz o checklist de critérios obrigatórios e complementares do tipo (criteriaJson, com o resultado automático OK/FALHA/ANALISTA e a marcação do admin) e aceita as decisões APROVAR, AJUSTES e RECUSAR; ApprovalRequest.status passa a PENDENTE · AJUSTES · APROVADO · RECUSADO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA10",
        "text": "Dado a decisão do ADMIN, então AJUSTES e RECUSAR exigem pelo menos um motivo padronizado (reasonsJson; senão 422 VALIDACAO details.reasons) e APROVAR exige todos os critérios obrigatórios marcados (senão 409 CRITERIOS_PENDENTES, Q-70). A observação livre tem até 500 caracteres e nunca leva dado sensível.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA11",
        "text": "Dado AJUSTES ou RECUSADO, então a pessoa corrige pela central de validação (/settings?tab=validacao: status, linha do tempo, critérios, motivos e formulário de reenvio) e reenvia (POST /api/me/validation/resubmit); o cadastro conta como 1º envio e há no máximo 5; reenvio inválido não grava nada; esgotado o limite, só o ADMIN reabre (SUSPENDED com motivo).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA12",
        "text": "Dado o pedido, então o prazo é contado em dias úteis (proposta: 3 para a 1ª análise, 2 para reanálise, 30 dias corridos para a pessoa responder a AJUSTES; Q-71) a partir de emailConfirmedAt; antes da confirmação do e-mail a conta não entra na fila (RF1.CA27).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA13",
        "text": "Dado o ADMIN, então ele não decide o próprio perfil (403 ACESSO_NEGADO) e cada abertura de documento de verificação (GET /api/admin/approvals/{id}/documents/{kind}) responde com Cache-Control: no-store, passa por OwnMedia (restricted/pending/) e gera AuditLog APPROVAL_DOCUMENT_VIEWED.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA14",
        "text": "Dado um envio, reenvio ou decisão, então as notificações no app e por e-mail (admins no envio; a pessoa na decisão) saem depois do commit (AFTER_COMMIT), no idioma da pessoa.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA15",
        "text": "Dado o modal \"Verificar\" de um critério de controle (SITE_OFICIAL, ATO_NOMEACAO), então ele mostra o link oficial e o código de verificação WS- + 6 hex (derivado do userId, visível só ao dono na central), com os botões \"Confere\" e \"Não confere → motivo\"; o critério REPRESENTACAO é marcado automaticamente quando o domínio do e-mail é o mesmo do officialSite e não está na lista de e-mails gratuitos.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA16",
        "text": "Dado APROVADO, então para EMPRESA o sistema cria a Company com ownerUserId = a pessoa (lacuna dos docs: nenhum fluxo criava Company), legalName, cnpj e websiteUrl vindos da extensão; para CHEFE exige antes a confirmação do chefe atual ou do dono da EMPRESA (confirmedBy) e então define Department.headUserId e abre DepartmentMembership CHEFE. User.status → ACTIVE, verified = true.",
        "note": "CA a confirmar, Q-65, Q-66",
        "kind": "enunciado"
      },
      {
        "id": "RF28.CA17",
        "text": "Dado o tipo do perfil, então valem os critérios e motivos da tabela §7.3, carregados da política e não fixos nas telas; motivos têm texto i18n (pt-BR, en, es).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF29",
    "n": 29,
    "title": "Integrar o DECIA ao Criador de Projetos — compartilhar tarefas/artefatos na sessão, abrir sessão a partir de um projeto, transformar argumentos/divergências/decisões em tarefas e manter o Rastro de Decisão",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 5. DECIA (DeciaSession, SessionParticipant, SessionMessage, MessageClassification, MessageAttachment, AnalyticalSummary, FinalDecision, DecisionReview, SessionArtifact, DecisionTraceNode, DecisionTraceEdge), 3. Criador de Projetos (ProjectScheme, ProjectTask) e 2. Acervo (TaskItem). O Rastro de Decisão é um grafo append-only: nós em decision_trace_nodes (MySQL) com espelho Cassandra trace_by_entity; arestas em decision_trace_edges. Visual: fio de decisão (RF38.CA07) — nós coloridos pela MessageClass (ARGUMENTO azul · DIVERGENCIA laranja · RISCO vermelho · CONSENSO verde · PERGUNTA roxo) e carimbo VALIDADO / DEVOLVIDO (FinalDecision.stampJson).",
    "route": "sessão DECIA (/decia/[sessionId]), projeto (/projects/[id], painel \"Por que isto existe?\"), tarefa (/tasks/[id]) — rotas a confirmar (o card não as fixa)",
    "coverage": "RF29.CA01 · RF29.CA02 · RF29.CA03 · RF29.CA04 · RF29.CA05 · RF29.CA06 · RF29.CA07 · RF29.CA08 · RF29.CA09",
    "cas": [
      {
        "id": "RF29.CA01",
        "text": "Classes DeciaSession.linkedProjectId, DeciaBridgeService.openSessionFromProject, ProjectService.changeStatus; atividades U1 → S1 → S2 → A1 → S3 (409 SESSAO_JA_VINCULADA); sequência bloco «CA01» (POST /api/projects/{id}/decia-session, topic = objective, participantes, EM_DECISAO, nós PROJETO/ORIGINOU); transições RASCUNHO/PUBLICADO → EM_DECISAO; componentes app/projects/[id], ProjectDeciaController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA02",
        "text": "Classes ProjectScheme.origin = DECIA, ProjectScheme.sourceSessionId, AiEngine.composeFromSession, SessionArtifact.convertedTaskId, DeciaBridgeService.createProjectFromSession; atividades U6 → A4 → S14; transição inicial [*] → RASCUNHO (origin DECIA); componente SessionBridgeController.createProject",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA03",
        "text": "Classes SessionMessage 1→0..5 MessageAttachment (targetType TASK/PROJECT/PLAN, snapshotJson), DeciaBridgeService.attachToMessage; atividades U2 → S4 → S5 → W1 (422 VALIDACAO máx. 5, 403 ACESSO_NEGADO); sequência bloco «CA03 e CA04» (POST /api/sessions/{id}/messages, alts 422/403); componentes AttachmentChip, CassandraMessageStore",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA04",
        "text": "Classes MessageClassification.label, MessageClass, DeciaBridgeService.toTaskPrefill/transformMessageIntoTask, TaskItem.sourceKind = DECIA, DecisionTraceEdge.relation = TRANSFORMOU_EM; atividades U3 → S7 → A3 → S8 → U4 → S9 (422 para RUIDO); sequência bloco «CA03 e CA04» (GET/POST /api/messages/{id}/to-task, suggestPhase ✦); componentes ToTaskButton, TaskService (RF20)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA05",
        "text": "Classes FinalDecision.resultingTaskId, FinalDecision.stampJson, DecisionReview.outcome/reason, DeciaBridgeService.onDecisionReviewed; atividades U5 → S10 → S11/S12 → S13; sequência bloco «CA05» (ATA_REGISTRO em APROVACAO, stamp VALIDADO, projeto APROVADO); transições revisao → APROVADO e revisao → DEVOLVIDO; componente StampBadge",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA06",
        "text": "Classes DecisionTraceService.threadFor, DecisionTraceNode.classLabel/actorId/at, ProjectTask.decisionTraceNodeId; atividades U7 → S15 → W2 → W3 (link à mensagem original mesmo com sessão ENCERRADA); sequência bloco «CA06 e CA07» (GET /api/tasks/{id}/trace); componentes DecisionThread, app/tasks/[id], app/projects/[id]",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA07",
        "text": "Classes DecisionTraceNode/DecisionTraceEdge (append-only, nota), CassandraTraceMirror, DecisionTraceService.export, MediaStoragePort, DecisionTraceNode.snapshotJson; atividades U8 → S16 → D5/D4, S15 (snapshot RF23); sequência bloco «CA06 e CA07» (GET .../trace/export?format=pdf, S3, audit_log); componentes S3TraceExportAdapter, persistence-cassandra",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA08",
        "text": "Classes AnalyticalSummary.recommendationsJson ({affectedTaskIds, affectedProjectIds, planAxisId}), DeciaBridgeService.enrichSummaryWithTargets, DeciaSession.planAxisId; atividades A5 → S17 → D4; componente AnalyticalSummary em ws-domain E2",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA09",
        "text": "Classe DecisionTraceService.completenessIndicator; atividades U9 → S18 → D6 (vw_decisions_with_trace, metric_snapshots); nota do estado CONCLUIDO; componentes app/admin/dashboard, platform: vw_decisions_with_trace",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF30",
    "n": 30,
    "title": "Gerar um Esquema de Projeto completo com o Autopiloto de Projeto a partir de uma demanda (ofício, e-mail ou frase), reutilizando modelos chancelados",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 3. Criador de Projetos (ProjectScheme com origin = AUTOPILOTO, ProjectTask, ProjectTaskDependency), 2. Acervo (TaskItem com sourceKind = AUTOPILOT), 6. Chancelas (SealBond APROVADA = modelos chancelados), 8. Social (Remix = crédito a cada modelo usado) e 10. IA do sistema (AiInferenceLog capability AUTOPILOT_PROJETO, InstitutionalMemoryDocument para \"projetos semelhantes\", RF33). A proposta não é persistida no MySQL até o usuário confirmar (CA03): vive em Redis (autopilot:draft:{draftId}, TTL) — decisão a confirmar em DECISOES.md.",
    "route": "Autopiloto (/autopilot); proposta exibida na Mesa de Trabalho (RF22) em modo rascunho",
    "coverage": "RF30.CA01 · RF30.CA02 · RF30.CA03 · RF30.CA04 · RF30.CA05 · RF30.CA06",
    "cas": [
      {
        "id": "RF30.CA01",
        "text": "Classes AutopilotService.analyzeDemand, AiEngine.extractDemand, TaskItem (DOCUMENTO de entrada, accessClass); atividades U1 → S1 → S2/S3 → S4 → A1 (422 VALIDACAO, 403 ACESSO_NEGADO); sequência bloco «CA01» (POST /api/autopilot/analyze); transição [*] → Analisada; componente app/autopilot, AutopilotController.analyze",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA02",
        "text": "Classes SealBond APROVADA (modelos chancelados), MemoryService.similarProjects, AiEngine.composeScheme, Remix (crédito), ProjectTaskDependency, ProjectTask.responsibleId/dueAt; atividades S5 → S6 → A2 → S7; sequência bloco «CA02 e CA03» (SELECT seal_bonds, kNN ws-memory, composeScheme ✦); transição Analisada → Proposta; componentes MemoryService, search-opensearch, ModelCreditChip",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA03",
        "text": "Classes DraftCachePort, RedisDraftCache, AutopilotService.updateDraft/discard; atividades S8 → W2 → U2 → U3 → S9 (nada no MySQL); sequência bloco «CA02 e CA03» (SET autopilot:draft TTL, PATCH /api/autopilot/drafts/{id}); estados voláteis Proposta → Ajustada → Descartada/Expirada; componentes DeskCanvas, DraftTaskCard, cache-redis",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA04",
        "text": "Classes ProjectScheme.origin = AUTOPILOTO, creationMode = COM_IA, aiGenerated, aiInferenceId, AiInferenceLog (modelo, custo, latência, inputSummaryJson com modelos de referência); atividades U4 → S10 → S11 → S12 → W3; sequência bloco «CA04» (INSERT project_schemes, remixes, ai_inference_log; 409 RASCUNHO_EXPIRADO); transição Draft → RASCUNHO e nota; componente persistence-mysql",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA05",
        "text": "Classes `LocalAutopilotEngine ..",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA06",
        "text": "Classes DeciaBridgeService.openSessionFromProject, DeciaSession.linkedProjectId; atividades W3 → U5 → S13 → D5; sequência bloco «CA06» (POST /api/projects/{id}/decia-session, EM_DECISAO); transição RASCUNHO → EM_DECISAO; componente ProjectDeciaController (RF29)",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF31",
    "n": 31,
    "title": "Simular cenários sobre um Esquema de Projeto (corte de orçamento, atraso, troca de fornecedor, mudança de escopo) antes de enviá-lo à aprovação",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 3. Criador de Projetos (ProjectScenario, ProjectScheme, ProjectTask com PERT/EVM, ProjectTaskDependency, ProjectVersion.sourceScenarioId, ComplianceResult), 5. DECIA (SummaryScenario.linkedProjectScenarioId, FinalDecision.chosenScenarioId, MessageAttachment targetType SCENARIO) e 10. IA (AiInferenceLog capability SIMULAR_CENARIO). O motor local (CPM/PERT) cobre linha do tempo e caminho crítico sem IA externa; a IA externa acrescenta riscos novos e vantagens/desvantagens no formato dos cenários do RF11 (SummaryScenario).",
    "route": "Simulador de Cenários (/projects/[id]/simulate)",
    "coverage": "RF31.CA01 · RF31.CA02 · RF31.CA03 · RF31.CA04 · RF31.CA05",
    "cas": [
      {
        "id": "RF31.CA01",
        "text": "Classes ProjectScenario.variablesJson (budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps, supplierSwaps, scopeChangeText), ScenarioService.create; atividades U1 → S1 → U2 → S2 → S3 (403 ACESSO_NEGADO, 422 VALIDACAO); sequência bloco «CA01, CA02 e CA05» (POST /api/projects/{id}/scenarios); transição [*] → RASCUNHO; componentes ScenarioForm, app/projects/[id]/simulate",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA02",
        "text": "Classes SchedulePort.recalc/criticalPath/riskByPhase, ProjectScenario.impactReportJson/recalculatedTimelineJson/riskByPhaseJson, ComplianceService.evaluateHypothetical, AiEngine.impactNarrative, ProjectTask.pert*/isCritical/slackDays; atividades S4 → S5 → S6 → A1/A2 → S7 → W1; sequência bloco «CA01, CA02 e CA05» (recalc, evaluateHypothetical, impactNarrative ✦); componentes ImpactReport, TimelineGantt, RiskByPhase, LocalCpmEngine",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA03",
        "text": "Classes ScenarioService.compare/save/apply, ProjectVersion.sourceScenarioId, ProjectScenario.appliedVersionId, ScenarioStatus; atividades U3 → S8 → S9 → W2, U4 → S10/S11 → S12 → W4 (422 máx. 3, 409 VERSAO_CONFLITO); sequência bloco «CA03»; transições RASCUNHO/SALVO → APLICADO e → SALVO; componentes ScenarioCompare, app/projects/[id]/history",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA04",
        "text": "Classes MessageAttachment targetType SCENARIO, ProjectScenario.sharedInSessionId, SummaryScenario.linkedProjectScenarioId, FinalDecision.chosenScenarioId, ScenarioService.shareInSession, DeciaBridgeService; atividades U5 → S14 → U6 → S15; sequência bloco «CA04» (nó CENARIO no rastro); nota do estado SALVO; componentes app/decia/[sessionId], CassandraMessageStore",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA05",
        "text": "Classes AiInferenceLog (SIMULAR_CENARIO, fallbackUsed), ProjectScenario.aiInferenceId, `LocalCpmEngine ..",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF32",
    "n": 32,
    "title": "Verificar a conformidade de um Esquema de Projeto no Espelho de Conformidade (checklists legais e do departamento) e sugerir as tarefas faltantes",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 3. Criador de Projetos (ComplianceChecklist, ComplianceItem, ComplianceResult, ProjectScheme.conformityPercent/hasBlockingPending, ProjectTask), 2. Acervo (TaskItem.checklistItemId = tarefa faltante criada pelo Espelho), 5. DECIA (AnalyticalSummary.complianceResultId, DecisionTraceNode CONFORMIDADE, aresta VERIFICOU) e 10. IA (AiInferenceLog capability CONFORMIDADE). Exemplos de checklist do card: licitação — Lei 14.133/2021 (ETP antes do TR, parecer jurídico antes da APROVACAO, pesquisa de preços); obra — licença ambiental, ART/RRT, projeto básico antes da EXECUCAO. O bloqueio em ⛔ é aviso, não impedimento: o chefe aprova com overrideReason (autoridade humana).",
    "route": "Espelho de Conformidade (/projects/[id]/mirror); manutenção de checklists na página da empresa/departamento (/companies/[slug]/checklists, rota a confirmar)",
    "coverage": "RF32.CA01 · RF32.CA02 · RF32.CA03 · RF32.CA04 · RF32.CA05 · RF32.CA06",
    "cas": [
      {
        "id": "RF32.CA01",
        "text": "Classes ComplianceChecklist (processTag, legalBasis, departmentId null = empresa), ComplianceItem (requirement, expectedPhase, expectedCategory, expectedType, mustPrecedeItemId), ComplianceService.createChecklist/upsertItem, AccessPolicy.requireIssuer; atividades U1 → S1 → S2 → S3 (403 ACESSO_NEGADO, 422 VALIDACAO); sequência bloco «CA01»; componentes app/companies/[slug]/checklists, ComplianceChecklistController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA02",
        "text": "Classes ComplianceService.evaluate, RuleEnginePort, AiEngine.matchItems, ComplianceResult.itemsJson (ATENDIDO com satisfiedByProjectTaskId, RECOMENDADO_AUSENTE, OBRIGATORIO_AUSENTE, FORA_DE_ORDEM); atividades U2 → S4 → S5 → S6 → A1/A2 → S7 → W1; sequência bloco «CA02, CA05 e CA06»; transições de NaoAvaliado no estado Item; componentes ChecklistItemRow, LocalComplianceEngine",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA03",
        "text": "Classes ComplianceService.createMissingTask, TaskItem.checklistItemId, TaskService.create, ProjectTask.phase = expectedPhase; atividades U3 → S9 → S10 → S6 (403 para revisor); sequência bloco «CA03»; transições *_AUSENTE → ATENDIDO; componente CreateMissingTaskButton",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA04",
        "text": "Classes ProjectScheme.conformityPercent/hasBlockingPending, ComplianceResult.percent/blockingCount/overrideByUserId/overrideReason, ComplianceService.gatePhaseChange, AuditLog; atividades S8 → W2, U4 → S11 → W3 → S12 → U5 → S13 (409 CONFORMIDADE_PENDENTE como aviso); sequência bloco «CA04»; estado Gate (ComPendencia → AprovacaoComJustificativa); componentes ConformitySeal, OverrideDialog",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA05",
        "text": "Classes AnalyticalSummary.complianceResultId, DecisionTraceNode nodeType CONFORMIDADE, DecisionTraceService.appendNode; atividade S7 → S15 → D4; sequência bloco «CA02, CA05 e CA06» (evento ConformityEvaluated → analytical_summaries, decision_trace_nodes, trace_by_entity); nota do estado Gate; componentes DecisionTraceService (RF29), CassandraTraceMirror",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA06",
        "text": "Classe AccessPolicy.canEditProject; atividades U6 → S4 → ... → S8 → W4 (modo leitura) e S9 → E4; sequência bloco «CA02, CA05 e CA06» (resposta em modo leitura) e bloco «CA03» alt 403 para revisor; nota do estado Item; componente MirrorController",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF33",
    "n": 33,
    "title": "Consultar a Memória Institucional (busca semântica sobre sessões encerradas, artefatos, projetos e tarefas) e fazer a IA do DECIA citar fontes institucionais",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 10. IA do sistema (InstitutionalMemoryDocument no índice OpenSearch ws-memory, Citation valor embutido, MemoryQuery, AiInferenceLog capability MEMORIA_BUSCA), 5. DECIA (DeciaSession.indexedInMemory, AiQuestion.citationsJson, AnalyticalSummary.recommendationsJson[].citations, FinalDecision.citationsJson, SessionArtifact), 12. Plataforma (DomainEventOutbox, PipelineJob INDEXAR_MEMORIA, FeatureFlag opensearch.enabled). Base do objetivo 3: recomendação sem fonte é marcada \"sem precedente\"; indexação é assíncrona (AFTER_COMMIT) e nunca bloqueia a operação de negócio. Conteúdo RESTRITO/SIGILOSO nunca vai a IA externa: indexa só metadados ou usa embedding local.",
    "route": "Memória Institucional (/memory); explorador visual em /memory/explore (rota a confirmar)",
    "coverage": "RF33.CA01 · RF33.CA02 · RF33.CA03 · RF33.CA04 · RF33.CA05 · RF33.CA06",
    "cas": [
      {
        "id": "RF33.CA01",
        "text": "Classes InstitutionalMemoryDocument (metadados empresa, departamento, categoria, exercício, autor, indexedAt, embedding), MemorySourceType, MemoryIndexingListener.on*, DeciaSession.indexedInMemory; atividades U1 → S1 → S2 → S3 → A1/A2 → S4 → S5; sequência bloco «CA01 e CA06» (PUT ws-memory/_doc); transições PENDENTE → RODANDO → OK; componentes search-opensearch, MemoryIndexingListener",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA02",
        "text": "Classes MemoryService.query, Citation (excerpt, url, score), MemoryQuery, AccessPolicy.visibilityFilter, AiEngine.answerWithCitations; atividades U2 → S7 → S8 → A5 → S9 → A3 → S10 → W1 (422 VALIDACAO, 403 ACESSO_NEGADO ao abrir fonte); sequência bloco «CA02»; nota do estado OK; componentes app/memory, MemoryResultCard, MemoryController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA03",
        "text": "Classes MemoryService.retrieveForSession, AiEngine.recommendWithSources, AiQuestion.citationsJson, AnalyticalSummary.recommendationsJson[].citations, FinalDecision.citationsJson, nota de Citation (vazio = sem precedente); atividades U3 → S11 → S12 → S13/S14 → W2; sequência bloco «CA03»; componentes CitationChip, NoPrecedentBadge, SessionAiController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA04",
        "text": "Classes MemoryService.explore/similarProjects, SearchIndexPort.aggregate; atividades U4 → S15 → D2/D4 → W3; sequência bloco «CA04 e CA05» (aggregate + cache Redis); componentes app/memory/explore, FacetMap, cache-redis",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA05",
        "text": "Classes MemoryService.citationIndicator, MetricSnapshot; atividades U5 → S16 → D5 (vw_decisions_with_sources); sequência bloco «CA04 e CA05» (GET /api/admin/kpis); componentes app/admin/dashboard, persistence-mysql: vw_decisions_with_sources",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA06",
        "text": "Classes DomainEventOutbox, PipelineJob (status, attempts, lastError), PipelineJobStatus, AiInferenceLog result ERRO, OutboxPublisher; atividades S2, S4 -.-> S6 (negócio intacto); sequência bloco «CA01 e CA06» alt «OpenSearch indisponível»; transições RODANDO → REPROCESSAR → RODANDO/FALHA e nota; componentes platform: OutboxPublisher · PipelineJob worker",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF34",
    "n": 34,
    "title": "Extrair informações de desenhos técnicos e documentos (dwg/dxf/ifc/glb/pdf) com IA para gerar quantitativos, planilha orçamentária e cronograma pré-preenchidos",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 2. Acervo (TaskItem tipos DESENHO_TECNICO · DOCUMENTO · PLANILHA · CRONOGRAMA · IMAGEM_EDITADA, TaskAttachment com mimeType, antivirusStatus, ocrStatus, Evidence.studioStatus), 3. Criador de Projetos (ProjectTask da tarefa derivada no mesmo projeto), 10. IA (ExtractionResult kind QUANTITATIVOS · ITENS_PRAZOS · ESTRUTURAL, ExtractionCorrection, AiInferenceLog capability EXTRAIR_DESENHO / EXTRAIR_DOCUMENTO) e 12. Plataforma (MediaObject, PipelineJob OCR). Sem IA externa o motor local lê camadas/blocos (ESTRUTURAL) sem interpretação semântica e avisa. RESTRITO/SIGILOSO nunca vai a IA externa.",
    "route": "ação \"Extrair com IA\" na tarefa DESENHO_TECNICO / DOCUMENTO (/tasks/[id], RF20); visualizador 3D (/tasks/[id]/viewer, rota a confirmar)",
    "coverage": "RF34.CA01 · RF34.CA02 · RF34.CA03 · RF34.CA04 · RF34.CA05 · RF34.CA06",
    "cas": [
      {
        "id": "RF34.CA01",
        "text": "Classes ExtractionService.extractQuantities, CadReaderPort.readLayers, ExtractionResult.kind = QUANTITATIVOS, rowsJson (item, unit, qty, area, volume, confidence), layersJson, AiEngine.interpretCad; atividades U1 → S1 → S2 → S3 → S6 → S7 → A1 → S8 → W1 (403, 409 ANTIVIRUS_PENDENTE, 422 formato); sequência bloco «CA01 e CA06»; transição [*] → PROCESSANDO → PRONTA; componentes ExtractionTable, DxfCadReaderAdapter, IfcCadReaderAdapter",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA02",
        "text": "Classes ExtractionService.extractItemsAndDeadlines, OcrPort, TaskAttachment.ocrStatus/ocrTextRef, PipelineJob OCR, AiEngine.extractFromDocument, ExtractionResult.kind = ITENS_PRAZOS; atividades U2 → S1 → S2 → S4 → S5 → S6 → A2 → S8; sequência bloco «CA02»; componentes TesseractOcrAdapter, search-opensearch: ocrTextRef",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA03",
        "text": "Classes ExtractionService.derive, ExtractionResult.derivedTaskId, TaskItem.originalTaskId/aiGenerated/aiInferenceId, ProjectTask (mesmo projeto), TaskService.create; atividades U4 → S11 → W3; sequência bloco «CA04 e CA03» (POST /api/extractions/{id}/derive, evento thumbnail RF38); transições PRONTA/REVISADA → CONVERTIDA e nota; componente DeriveButton",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA04",
        "text": "Classes ExtractionCorrection (rowIndex, field, oldValue, newValue, departmentId), ExtractionService.correctRow, AiEngine.*(…, departmentCorrections); atividades U3 → S10, S7 (correções como exemplos); sequência bloco «CA04 e CA03» (PATCH /api/extractions/{id}/rows/{i}) e SELECT extraction_corrections no bloco «CA01»; transição PRONTA → REVISADA e nota; componente ExtractionTable (edição)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA05",
        "text": "Classes ExtractionService.viewerUrl/captureAsImage, MediaStoragePort.presign/put, Evidence.studioStatus/derivedTaskId, TaskType.IMAGEM_EDITADA; atividades U5 → S12 → W4 → U6 → S13; sequência bloco «CA05»; componentes app/tasks/[id]/viewer, Viewer3D, MeasureTool, storage-s3",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA06",
        "text": "Classes AiInferenceLog (EXTRAIR_DESENHO / EXTRAIR_DOCUMENTO, modelo, custo, latência, fallbackUsed), `LocalStructuralEngine ..",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF35",
    "n": 35,
    "title": "Participar de Metas coletivas, aparecer nos Destaques e receber Reconhecimentos (gamificação ligada ao perfil deliberativo, com DECIA Points como moeda)",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 9. Gamificação & Reputação (CollectiveGoal, GoalParticipant, Highlight, DeliberativeProfile), 6. Chancelas & Benefícios (Recognition source MANUAL · META · BENEFICIO, Benefit), 7. DECIA Points (DeciaPointsLedgerEntry eventCode META_ATINGIDA idempotente, DeciaPointsRule), 8. Social (MuralEntry kind META · DESTAQUE · RECONHECIMENTO, Reaction BEM_FUNDAMENTADO/CONFORME), 10/12 (MetricSnapshot, AuditLog). Destaques usam algoritmo transparente (critérios visíveis em algorithmScoreJson), não IA externa. Anti-abuso: minEffortCheck contra critério trivial, limite de reconhecimentos por emissor/mês em Company.pointsPolicyJson, tudo em audit_log.",
    "route": "Metas coletivas (/goals), Destaques (/highlights), Reconhecimentos (/recognitions)",
    "coverage": "RF35.CA01 · RF35.CA02 · RF35.CA03 · RF35.CA04 · RF35.CA05 · RF35.CA06",
    "cas": [
      {
        "id": "RF35.CA01",
        "text": "Classes CollectiveGoal (criterionJson, periodFrom/To, rewardPointsPerParticipant, recognitionTemplateJson, progress), GoalParticipant, GoalService.create/join/recomputeProgress, MuralEntry kind META; atividades U1 → S1 → S2 → S3 → W1, U2 → S4, S5 → S6/S7; sequência bloco «CA01 e CA06» e início do bloco «CA02»; transições [*] → ABERTA → ABERTA; componentes app/goals, GoalProgressBar, GoalProgressScheduler",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA02",
        "text": "Classes DeciaPointsLedgerEntry (eventCode META_ATINGIDA, idempotencyKey), CollectiveGoal.ledgerBatchId/achievedAt, DeciaPointsService.credit, RecognitionService.issueFromGoal; atividades S6 → S8 → S9 → S10; sequência bloco «CA02» (loop por participante, idempotencyKey único, INCRBY Redis); transição ABERTA → ATINGIDA e nota; componentes DeciaPointsService (RF42), cache-redis",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA03",
        "text": "Classes Highlight (monthKey, targetType PROJECT/DECISION/USER, algorithmScoreJson, curatedBy, position, publishedAt), HighlightService.compute/curate/publish; atividades S12 → U3 → S13 → U4 → S14 → W2 (A1: sem IA); sequência bloco «CA03»; estado HL (Calculado → Curado → Publicado) e nota (Vitrine, Chancela de Excelência RF39); componentes app/highlights, HighlightCard",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA04",
        "text": "Classes Recognition (name, medalArtJson, criterion, validUntil, source MANUAL/META/BENEFICIO, publicOnMural), RecognitionService.issue/issueFromGoal/issueFromBenefit, MuralEntry kind RECONHECIMENTO; atividades U5 → S1 → S15 → S16 → W3, S10 → W3; sequência bloco «CA04 e CA06»; componentes app/recognitions, MedalBadge, RecognitionController",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA05",
        "text": "Classes DeliberativeProfile.badgesJson/publicIndicatorsJson, DeliberativeProfileService.appendGamification; atividades U6 → S17 → W4; sequência bloco «CA05» (metas ATINGIDA, highlights USER, recognitions, ledger por eventCode); componentes app/profile, PointsByOriginChart",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA06",
        "text": "Classes CollectiveGoal.minEffortCheck, Company.pointsPolicyJson (mínimo de esforço, limite por emissor/mês), RecognitionService.monthlyCount, AuditLog; atividades S2 → E2 (422 META_TRIVIAL), S15 → E3 (429 LIMITE_EMISSOR_MES), S3/S16 (AuditLog); sequência blocos «CA01 e CA06» e «CA04 e CA06» (alts de anti-abuso, INSERT audit_log); transição [*] → ABERTA condicionada ao anti-abuso; componente platform: AuditLog",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF36",
    "n": 36,
    "title": "Gerar o Dossiê de Transição (handoff) quando um empregado muda de departamento, sai ou uma gestão encerra, transferindo projetos, tarefas e pendências com contexto",
    "hu": null,
    "summary": "Contextos da TAXONOMIA: 11. Transição & Memória (HandoffDossier, HandoffItem), 4. Planejamento (Grouping.handoffDossierId, status ENCERRADO), 2/3 (TaskItem DOCUMENTO PDF com sourceKind DOSSIE, ProjectScheme \"Transição de [nome]\" com origin DOSSIE, ProjectTask.responsibleId/snapshotJson), 5. DECIA (DeciaSession ATIVA, SessionParticipant com addedBy/removedBy, FinalDecision EM_REVISAO, DecisionTraceNode), 1 (DepartmentMembership.endedAt), 10/12 (AiInferenceLog capability DOSSIE, MediaObject, Notification). Itens PRIVADA do empregado só entram com consentForPrivateItems; a saída nunca apaga tarefas usadas por outros (snapshot RF23).",
    "route": "ação no perfil/departamento (/handoff); gestão em /companies/[slug]/groupings/[id] (RF25.CA05, rota a confirmar)",
    "coverage": "RF36.CA01 · RF36.CA02 · RF36.CA03 · RF36.CA04 · RF36.CA05",
    "cas": [
      {
        "id": "RF36.CA01",
        "text": "Classes HandoffDossier (subjectType EMPREGADO/GESTAO, reason, contentJson {openProjectsByPhase, pendingTasks, blockedTasks, activeSessions, pendingReviews, contacts, contextSummaries[]}), Grouping.handoffDossierId, HandoffService.generate/compileContent, AiEngine.contextSummaries; atividades U1 → S1 → S2 → S3 → A1/A2 (403 ACESSO_NEGADO, 409 DOSSIE_EM_ANDAMENTO); sequência bloco «CA01, CA02 e CA05»; transição [*] → GERADO; componentes app/handoff, HandoffSummary, app/companies/[slug]/groupings/[id]",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA02",
        "text": "Classes HandoffDossier.documentTaskId/transitionProjectId/aiInferenceId, TaskItem (DOCUMENTO, sourceKind DOSSIE, aiGenerated), ProjectScheme origin DOSSIE, ProjectTask (encaminhamentos), PdfRenderPort, MediaStoragePort, DecisionTraceService; atividades S6 → S7 → S8 → W1; sequência bloco «CA01, CA02 e CA05» (PUT dossie.pdf, INSERT tasks/project_schemes/decision_trace_nodes); nota do estado GERADO; componentes storage-s3, PdfRenderAdapter, DecisionTraceService (RF29)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA03",
        "text": "Classes HandoffDossier.successorUserId/successorAcceptedAt, HandoffItem.previousResponsibleId/newResponsibleId/transferredAt, HandoffService.nominateSuccessor/accept, TaskItem.responsibleId, ProjectTask.responsibleId; atividades U3 → S10 → S11 → U4 → S12 → S13 → S16 → W3 (422, 403); sequência bloco «CA03 e CA04»; transições GERADO → AGUARDANDO_SUCESSOR → TRANSFERIDO e nota; componentes SuccessorPicker, ResponsibleBadge",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA04",
        "text": "Classes SessionParticipant (leftAt, removedBy, removeReason, addedBy), DeciaBridgeService.swapParticipant, HandoffItem targetType SESSION, CassandraSystemMessageWriter; atividades S13 → S14 → W4 → U5; sequência bloco «CA03 e CA04» (loop por sessão ATIVA, mensagem de sistema, notifications_by_user RF9); transição AGUARDANDO_SUCESSOR → TRANSFERIDO; componentes persistence-cassandra, DeciaBridgeService (RF29, RF9)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA05",
        "text": "Classes HandoffDossier.consentForPrivateItems, TaskItem.visibility, ProjectTask.snapshotJson, HandoffService.grantConsent; atividades S4 → S5 → W2 → U2 → S9, S13 → S17; sequência bloco «CA01, CA02 e CA05» (separa PRIVADA, POST .../consent) e nota final do bloco «CA03 e CA04» (snapshot preservado); transição GERADO → GERADO e notas de GERADO/TRANSFERIDO; componente ConsentDialog",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF37",
    "n": 37,
    "title": "Registrar reuniões com a Ata Viva (transcrição ou gravação → ata como tarefa + tarefas de encaminhamento com responsável e prazo dentro do projeto)",
    "hu": null,
    "summary": "Contexto DECIA (bounded context 5). Entidade central: Meeting (status GRAVANDO → TRANSCREVENDO → ATA_PROPOSTA → CONFIRMADA | CONTESTADA). A ata vira TaskItem do tipo ATA_REGISTRO com sourceKind = ATA_VIVA; cada encaminhamento vira TaskItem ligado por ProjectTaskDependency à ata. A publicação na sessão reaproveita SessionMessage + MessageAttachment (RF29) e cria o nó ATA_VIVA no DecisionTrace. Pontos: ATA_RATIFICADA (+3) e ENCAMINHAMENTO_CUMPRIDO (+5) via RF42.",
    "route": "ação \"Nova reunião\" na sessão DECIA ou no projeto (/meetings/new)",
    "coverage": "RF37.CA01 · RF37.CA02 · RF37.CA03 · RF37.CA04 · RF37.CA05",
    "cas": [
      {
        "id": "RF37.CA01",
        "text": "Classes Meeting.sessionId, Meeting.projectId, MeetingSource (GRAVACAO_NAVEGADOR, ARQUIVO, TRANSCRICAO_COLADA); atividades U1→U2→U3/U4/U5, W1, W3, W4, A1 (403 ACESSO_NEGADO); sequência msgs 1–5 e 11–13; transições [] → GRAVANDO e [] → TRANSCREVENDO; componentes app/meetings/new, AudioRecorder, storage-s3, Microsoft 365 / Google Workspace.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA02",
        "text": "Classes MeetingTranscript.segmentsJson, TranscriptionPort, SpeechToTextAdapter, AiEngine, AiCapability (TRANSCREVER, ATA_VIVA), MessageClass; atividades A5, I1, I2, I4, A7; sequência msgs 14–22; estado composto TRANSCREVENDO (Transcrevendo → GerandoAta → DraftPronto, Falha → REPROCESSAR); componentes ai-providers, PipelineJob worker.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA03",
        "text": "Classes TaskItem (type ATA_REGISTRO, sourceKind ATA_VIVA, responsibleId, dueAt), ProjectTask.phase, ProjectTaskDependency, AcervoService.createFromDraft, TaskStateMachine; atividades U7→U8→U9, W5, W6, A7, A8 (422 VALIDACAO), A9, A10; sequência msgs 24–31; transição TRANSCREVENDO → ATA_PROPOSTA (organizador confirma) e nota sobre RASCUNHO → DISPONIVEL; componentes AtaPreview, AcervoService, TaskStateMachine.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA04",
        "text": "Classes SessionMessage, MessageAttachment, DecisionTraceNode (TraceNodeType ATA_VIVA), DecisionTraceEdge (ORIGINOU), Notification, Meeting.ratificationDeadlineAt, DeciaPointsLedgerEntry (ATA_RATIFICADA); atividades A11, A12, A13, U10, U11, A15, A16; sequência msgs 32–43; estados ATA_PROPOSTA → CONFIRMADA / CONTESTADA e nota de pontos; componentes DecisionTraceService, persistence-cassandra, DomainEventOutbox, DecisionThread.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA05",
        "text": "Classes RecordingConsent (consented, at, ip), Company.recordingRetentionPolicy, MediaObject.accessClass, MeetingTranscript.text (AES-GCM), AiInferenceLog.maskedFields; atividades U6, W2, A3, A4 (409 CONSENTIMENTO_PENDENTE), A6, I3, A14, D7; sequência msgs 6–10, 17 (motor local) e 23 (DELETE áudio); transição GRAVANDO → [*] por consentimento negado e Transcrevendo → GerandoAta (áudio apagado); componentes ConsentSheet, storage-s3 (TTL por política), AuditLog.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF38",
    "n": 38,
    "title": "Aplicar a identidade visual do Work Station — ícones por tipo de tarefa, thumbnails automáticos, capa-mosaico de projeto, fio de decisão, lacres, etiquetas de estado, temas e skins da Mesa",
    "hu": null,
    "summary": "Conceito \"a repartição do futuro\": papelaria pública (carimbo, protocolo, pasta suspensa, clipe, lacre) em flat/duotone; tudo que a IA gerou carrega a faísca âmbar ✦. O RF é majoritariamente frontend (componentes do design system), com três pontos de backend: o thumbnail assíncrono (PipelineJob THUMBNAIL → ThumbnailService), a capa-mosaico recalculada por evento (CardArtService) e a capa por IA (AiEngine CAPA_IA). Preferências visuais vivem em UserPreferences; skins adquiridas em UserSkin.",
    "route": "transversal (design system em components/ui); capa manual/IA em /tasks/[id] e /projects/[id]; temas e skins em /settings/preferences",
    "coverage": "RF38.CA01 · RF38.CA02 · RF38.CA03 · RF38.CA04 · RF38.CA05 · RF38.CA06 · RF38.CA07 · RF38.CA08 · RF38.CA09 · RF38.CA10",
    "cas": [
      {
        "id": "RF38.CA01",
        "text": "Enum TaskType (15 valores) e TaskItem.type; atividade W1 (TaskTypeIcon com rótulo textual) e U2; sequência msg 18 (card com TaskTypeIcon); componentes TaskTypeIcon, tokens · cores por TaskType; o mesmo ícone é reutilizado em DecisionThread e anexos de mensagem (W5).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA02",
        "text": "Classes ThumbnailService, ThumbnailStrategy + 5 adapters, PipelineJob (THUMBNAIL), MediaObject.variantsJson, TaskItem.thumbnailUrl/coverUrl/coverMode, CoverMode; atividades A1→A2→A3..A7→A8, W10, U3→U4/U5, A11 (422 VALIDACAO), A13 (409 COTA_ESGOTADA), A14, A15; sequência msgs 1–10 e 19–34; máquina de estados PipelineJob THUMBNAIL e TaskItem.coverMode; componentes ThumbnailService, PipelineJob worker, storage-s3, renderers.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA03",
        "text": "Classes ProjectScheme.mosaicJson/coverUrl/coverMode, ProjectCoverMode, ProjectTask.percentComplete/phase, Department.color, CardArtService.rebuildMosaic/phaseRing; atividades A9, A10, W6; sequência msgs 11–15 (TaskThumbnailReady → rebuildMosaic → DEL cache) e 32; nota da máquina de estados (qualquer mudança dispara rebuild); componentes CardArtService, ProjectMosaicCover, PhaseRing.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA04",
        "text": "Classes TaskItem.aiGenerated/aiInferenceId, ProjectScheme.aiGenerated, AiInferenceLog.createdAt/model/reviewedBy/reviewedAt; atividades U7, I3, A15; sequência msgs 31 e 34 (tooltip gerado por IA em data, revisado por); transição AUTO → IA (faísca ✦); componentes AiSpark ✦.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA05",
        "text": "Enum TaskState (8 valores), TaskItem.dueAt/legalDueAt/legalDeadlineRuleId, LegalDeadlineRule; atividades W2 (nome do estado em texto, estilos tracejado/pulso/cadeado/carimbo/esmaecido/estrela) e W3 (âmbar 3 dias, vermelho vencido, ⚖); sequência msg 18; componentes StateTag, DeadlineBadge.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA06",
        "text": "Classes Seal.artJson/issuerKind/excellence, SealBond.status/sealCode, Recognition.medalArtJson, FinalDecision.stampJson/status, DecisionStatus, CardArtService.sealWaxFor/stampFor; atividade W4; sequência msg 18 (SealWax); componentes SealWax, Medal, DecisionStamp.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA07",
        "text": "Classes DecisionTraceNode.classLabel, DecisionTraceEdge, enum MessageClass com cores; atividade W5; componentes DecisionThread, tokens · cores por MessageClass.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA08",
        "text": "Classes UserPreferences.theme/deskSkin/density/fontScale, ThemeMode (inclui BLUEPRINT), DeskSkin (PAPEL, CORTICA, BLUEPRINT, PAPEL_TIMBRADO), UserSkin, PreferencesService, PreferencesController; atividades U6, W7 (menu recolhível responsivo), A16 (403 SKIN_NAO_ADQUIRIDA); sequência msgs 35–41; componentes ThemeProvider, DeskSkin, settings/preferences, cache-redis.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA09",
        "text": "Classes Department.monogram/color/acronym, Company.logoUrl/coatOfArmsUrl/accentColor, TaskItem.departmentId, ProjectScheme.departmentId; atividades A10 (borda na cor do departamento) e W6 (DeptMonogram, CompanyLogo); componente DeptMonogram.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA10",
        "text": "Classe UserPreferences.reduceMotion; atividade W8 (encaixe animado, confete, faísca animada, empty states; desliga com prefers-reduced-motion); sequência msg 41 (MotionProvider desliga animações); componentes MotionProvider, EmptyState, tokens · prefers-reduced-motion.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF39",
    "n": 39,
    "title": "Criar chancelas (EMPRESA / CHEFE DE DEPARTAMENTO) e concedê-las a tarefas, projetos e planos por vínculo sugerido pela IA, por política de critérios ou por premiação; habilitar benefícios resgatáveis",
    "hu": null,
    "summary": "Contexto Chancelas & Benefícios (bounded context 6). Entidade central: SealBond (SealBondStatus SUGERIDA → ACEITA | EDITADA | RECUSADA → EM_REVISAO → APROVADA | APROVADA_PRIVADA | REJEITADA → REVOGADA | EXPIRADA). Três modos de concessão: vínculo (IA sugere até 3, origin SUGESTAO_IA), política (SealPolicy + SealPolicyEvaluator, modo AUTO ou REVISAO), premiação (Chancela de Excelência, excellence = true, usageLimit + ciclo, por curadoria). A chancela aprovada habilita Benefit → BenefitRedemption (idempotente) e leva o item a MODELO_PUBLICO + prateleira CHANCELADO do Balcão (RF40).",
    "route": "Minhas Chancelas (/seals), Criador de Chancela (página da empresa/departamento), Benefícios (/benefits)",
    "coverage": "RF39.CA01 · RF39.CA02 · RF39.CA03 · RF39.CA04 · RF39.CA05 · RF39.CA06 · RF39.CA07 · RF39.CA08 · RF39.CA09 · RF39.CA10 · RF39.CA11 · RF39.CA12",
    "cas": [
      {
        "id": "RF39.CA01",
        "text": "Classes Seal.issuerUserId/issuerKind, CuratorAppointment, SealService.requireIssuerOrCurator; atividade S1 → E1 (403 ACESSO_NEGADO) e lane L_issuer; componentes SealCreator (só renderizado para EMPRESA/CHEFE/CURADOR), SealController.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA02",
        "text": "Classes Seal (name, tier, artJson, iconUrl, availableFrom/Until, usageLimit, excellence), SealPolicy (criteriaJson, mode), enums SealTier, SealCriterion (7 critérios), PolicyMode; atividades M1, M2, W1, S2 → E2 (400 PERIODO_INVALIDO), S3; componentes PolicyBuilder, storage-s3 (arte do lacre).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA03",
        "text": "Classes SealService.suggest, SealBond (basis MODELO_MATCH/DEPARTAMENTO_MATCH/PLANO_MATCH/DECISAO_MATCH, confidence, justification, origin SUGESTAO_IA), AiCapability SUGERIR_CHANCELA; atividades A1, W2, S4, I1, A2, A3, S6, S7, W8; sequência msgs 1–11; transições [*] → SUGERIDA, SUGERIDA → ACEITA/EDITADA/RECUSADA, RECUSADA → ACEITA (aplicar depois); componente app/seals (Recusadas).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA04",
        "text": "Classes SealPolicyEvaluator.onRelevantEvent/evaluate, SealBond.criteriaReportJson/requiresReview, Seal.autoIssued, AiCapability AVALIAR_POLITICA; atividades S14, I2, S15, S16 → S10 (AUTO) ou S9 (REVISAO); transições [] → consent (AUTO) e [] → EM_REVISAO (REVISAO); componentes SealPolicyEvaluator, platform · scheduler de recertificação.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA05",
        "text": "Classes Seal.excellence/usageLimit/usageCount/availableFrom/availableUntil, Highlight, SealService.award, SealBondBasis.PREMIACAO, SealBondOrigin.CURADORIA; atividades M4, W5, S17 → E3 (409 LIMITE_ESGOTADO); sequência msgs 24–31 (SELECT FOR UPDATE, 409 LIMITE_ESGOTADO); transição [*] → consent (premiação dentro do ciclo e limite).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA06",
        "text": "Classes SealService.nominate, SealBondBasis.INDICACAO, SealProposal (status PENDENTE/CRIADA/RECUSADA); atividades A5, A6, W6, S18 (nenhum emite chancela) → S9; transição [*] → EM_REVISAO (indicação de colega); componente SealBondController.POST seal_bonds_nominate, SealController.POST seal_proposals.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA07",
        "text": "Classe SealBond.authorConsent, estados APROVADA e APROVADA_PRIVADA; atividades A4, S10, S11, S12; sequência msgs 9–10 (consent true) e 17–23; choice consent e transições APROVADA ⇄ APROVADA_PRIVADA.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA08",
        "text": "Classes SealBond (único targetId × issuerUserId, revokeReason, expiresAt, lastRecertifiedAt), SealPolicy.recertifyEveryDays, AuditLog.correlationId, SealService.revoke/recertify; atividades S5 → E5 (409 VINCULO_DUPLICADO), M6, S20, S19; sequência msgs 12 (409 VINCULO_DUPLICADO) e 21 (audit_log correlationId); estado composto APROVADA (Vigente ⇄ Recertificando), transições → REVOGADA, → EXPIRADA; componentes AuditLog, scheduler de recertificação e fim de ciclo.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA09",
        "text": "Classes Benefit (type, startsAt, expiresAt, totalQuota, perUserLimit), enum BenefitType (7 tipos), BenefitService.publish; atividades M5, W7 → S1; componentes BenefitController, BenefitCard, app/benefits.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA10",
        "text": "Classes BenefitRedemption (idempotencyKey, code, status, ledgerEntryId), AiCreditLedgerEntry (source BENEFICIO), DeciaPointsLedgerEntry (BENEFICIO_BONUS), BenefitService.redeem, DeciaPointsService.creditAi; atividades A7, S21 → E4 (409 CHANCELA_INVALIDA), D7 (lock Redis), S22, S23; sequência msgs 32–46 (SET NX, 409 CHANCELA_INVALIDA, resgate existente, ai_credit_ledger); componentes cache-redis · lock de resgate, storage-s3 · certificado PDF.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA11",
        "text": "Classes TaskItem.state MODELO_PUBLICO, TaskItem.sealIdsJson, ModelOffer.shelf CHANCELADO, TaskStateMachine, CounterService.publishChanceled, SealService.issuerMetrics; atividades S13, S25; sequência msgs 18–19 e 23 (lacre no card); transição consent → APROVADA (MODELO_PUBLICO · prateleira CHANCELADO); componentes SealWax, CounterService (RF40), métricas em app/companies/[slug].",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA12",
        "text": "Classe Notification (category CHANCELA); atividade S24 (autor em cada mudança, emissor em pedido/indicação, i18n) → D6; sequência msgs 15, 21, 30, 44 (notifications); nota da máquina de estados (toda transição → Notification + audit_log); componente platform · DomainEventOutbox · i18n.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF40",
    "n": 40,
    "title": "Oferecer tarefas, projetos e kits como modelos no Balcão de Modelos (marketplace interno em DECIA Points, sem dinheiro) e reutilizá-los com crédito ao autor",
    "hu": null,
    "summary": "Contexto Balcão & Loja & DECIA Points (bounded context 7). Entidade central: ModelOffer (status ATIVA → RETIRADA | ESGOTADA) sobre um alvo TASK | PROJECT | KIT. A oferta liga TaskItem.offeredInCounter = true (etiqueta OFERECIDA) sem destruir o estado de trabalho. O remix é uma transferência no ledger de DECIA Points (DeciaPointsService: débito do comprador + crédito do autor na mesma transação, counterpartyUserId, idempotencyKey), registrada em Remix. Não existe moeda real nem gateway (RF40.CA08).",
    "route": "Balcão de Modelos (/models, também acessível pela Loja Work Station), sub-aba \"Meus modelos oferecidos\" no perfil (RF19)",
    "coverage": "RF40.CA01 · RF40.CA02 · RF40.CA03 · RF40.CA04 · RF40.CA05 · RF40.CA06 · RF40.CA07 · RF40.CA08",
    "cas": [
      {
        "id": "RF40.CA01",
        "text": "Classes ModelOffer (pricePoints, license, usageDescription, visibility, availableFrom/Until, targetType TASK/PROJECT/KIT), TaskItem.offeredInCounter, TaskState.OFERECIDA, TaskStateMachine.markOffered, CounterService.offer; atividades O1, O2, W1, S1 (403), S2 (422), S3; sequência msgs 1–8; transições [*] → ATIVA e EstadoDeTrabalho → Oferecida (estado de trabalho preservado); componentes OfferDialog, ModelOfferController.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA02",
        "text": "Classes ModelOffer.shelf (COMUNIDADE, CHANCELADO), enum Shelf, CounterService.browse; atividades B1, W2 (filtros categoria, tipo, departamento, licença, preço; ordenação remixes/reações/recentes), S5; sequência msgs 9–15 (OpenSearch); componentes app/models, search-opensearch, ModelCard.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA03",
        "text": "Classes DeciaPointsService.transfer, DeciaPointsLedgerEntry (counterpartyUserId, idempotencyKey, correlationId, eventCode COMPRA_LOJA/VENDA_BALCAO), Remix.ledgerEntryId, TaskItem.reuseCount; atividades S7 (idempotência), S8, S9 → E4 (409 SALDO_INSUFICIENTE + atalho B6), S10, S11 (grátis: só reuseCount); sequência msgs 16–20, 23–31 (SELECT saldo FOR UPDATE, 409 SALDO_INSUFICIENTE, 2 lançamentos com mesmo correlationId); componentes DeciaPointsService, cache-redis · saldo e lock, BalanceHint.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA04",
        "text": "Enum ModelLicense, AcervoService.copyTask/copyProject/copyKit, CounterService.takeToProject, TaskItem.originalTaskId (crédito imutável), ProjectTask.snapshotJson; atividades S12 → S13 (COPIA_LIVRE), S14 (ATRIBUICAO), S15 (SOMENTE_LEITURA só Levar ao projeto), E5 (409 LICENCA_NAO_PERMITE); sequência msgs 22 e 27 (cópia com crédito imutável por ATRIBUICAO); componente LicenseBadge.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA05",
        "text": "Classes ModelOffer.isHandover, CounterService.offerHandover; atividades O3, S4 (preço 0, etiqueta repasse); transições EstadoDeTrabalho → Arquivada → Oferecida (repasse aceito) e ATIVA → ESGOTADA (repasse levado); componente ModelCard (etiqueta repasse).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA06",
        "text": "Classes ModelOffer.viewsCount/remixCount/pointsEarned/status, CounterService.myOffers/withdraw, OfferStatus; atividades O4, W7, W5, S17 (cópias permanecem); sequência msgs 32–38; transição ATIVA → RETIRADA; componentes app/profile (Meus modelos oferecidos), GET me_model_offers.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA07",
        "text": "Classes ModelOffer.highlightedBy, CounterService.highlight, SealService.nominate, SealBond.basis INDICACAO; atividades B5, W6, S18 (403 para não EMPRESA/CHEFE), S19 (crédito do autor preservado); transições ATIVA → ATIVA (destaque → INDICACAO; APROVADA → shelf CHANCELADO); componente SealService (RF39).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA08",
        "text": "Nota da classe ModelOffer (nenhum campo de moeda real), DeciaPointsLedgerEntry.correlationId, AuditLog; atividade S10 e D3/D5 (ledger + audit_log); sequência msg 30 (audit_log correlationId); nota da máquina de estados (nenhum gateway); componentes platform · AuditLog — não há componente de pagamento no diagrama.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF41",
    "n": 41,
    "title": "Gerir o Acervo de Tarefas (inventário do usuário): estados, sub-filtros, ordenação, prazos legais, anexos & evidências e ações rápidas",
    "hu": null,
    "summary": "Contexto Acervo de Tarefas (bounded context 2). Entidade central: TaskItem com TaskState RASCUNHO → DISPONIVEL → EM_USO ⇄ BLOQUEADA → CONCLUIDA → ARQUIVADA, mais MODELO_PUBLICO (só via chancela RF39 ou publicação explícita) e OFERECIDA (Balcão RF40). Toda transição passa por TaskStateMachine e grava TaskStateLog (equivalente ao wardrobe_availability_log do FAI). O Acervo é o inventário que alimenta os selects do Criador de Projetos (RF21) e os anexos de mensagem do DECIA (RF29). A criação de tarefas é o RF20.",
    "route": "Acervo de Tarefas (/tasks), detalhe da tarefa (/tasks/[id]), Anexos & Evidências (/attachments)",
    "coverage": "RF41.CA01 · RF41.CA02 · RF41.CA03 · RF41.CA04 · RF41.CA05 · RF41.CA06 · RF41.CA07 · RF41.CA08 · RF41.CA09",
    "cas": [
      {
        "id": "RF41.CA01",
        "text": "Classes AcervoService.list/counters, TaskController.GET tasks/tasks_counters; atividades U1, W1 (skeleton + contadores), W2 → W3 (estado vazio ilustrado) / W4 (tentar de novo), S1, S2; sequência msgs 1–11 (skeleton, 503 BUSCA_INDISPONIVEL → tentar de novo, grade de cards); componentes SubFilterTabs, Skeleton, EmptyState, RetryBanner, cache-redis · contadores.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA02",
        "text": "Classes TaskStateMachine (transition, onProjectActivated, onProjectTaskRemoved, canTransition), TaskStateLog, TaskItem.state/blockedBy*/version, enum TaskState; atividades S4 → E2 (422 TRANSICAO_INVALIDA), S5, S6 (EM_USO automático, MODELO_PUBLICO só via chancela/publicação); sequência msgs 21–28; máquina de estados completa (RASCUNHO → DISPONIVEL → EM_USO ⇄ BLOQUEADA → CONCLUIDA → ARQUIVADA, MODELO_PUBLICO, OFERECIDA) e nota do task_state_log; componente TaskStateMachine.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA03",
        "text": "Classes AcervoService.detail, TaskAttachment, TaskVersion, ProjectTask, DecisionTraceNode, SealBond, TaskStateLog, MediaObject.variantsJson; atividades U3, W6, S3; sequência msgs 12–19 (preview, versões, projetos em uso, fio, chancelas, interações, histórico); componentes app/tasks/[id], Viewers (pdf, xlsx, imagem, dwg/dxf 2D, ifc/glb 3D), storage-s3.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA04",
        "text": "Classes LegalDeadlineRule, TaskItem.legalDeadlineRuleId/legalDeadlineBaseDate/legalDueAt, LegalDeadlineScheduler.scanUpcoming/computeLegalDueAt, Notification; atividades S12 (job diário → notificação ao responsável, Prioridade do Dia) e W11 (âmbar 3 dias, vermelho vencido, ⚖); sequência msg 11; componentes DeadlineBadge ⚖, platform · scheduler diário de prazos legais.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA05",
        "text": "Classes AcervoService.delete, ProjectTask.snapshotJson/removedByAuthor, FinalDecision.resultingTaskId; atividades U6, S7 → E3 (409 DECISAO_VINCULADA → S11 só ARQUIVADA), S8, S9 (snapshot preservado + Notification aos donos), S10; sequência msgs 29–37; transições CONCLUIDA/DISPONIVEL → [*] com nota sobre decisão validada.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA06",
        "text": "Classes Evidence (takenAt, latitude/longitude AES, caption, linkedTaskId, linkedProjectId, studioStatus, derivedTaskId), enum StudioStatus, AcervoService.addEvidence/evidenceToTask, EvidenceController; atividades U7, W9, S13 → E4 (422 VALIDACAO), S14 (Estúdio de Documento RF20 → IMAGEM_EDITADA); componentes app/attachments, EvidenceUploader, PipelineJob (ANTIVIRUS, OCR, THUMBNAIL).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA07",
        "text": "Classes AcervoService.favorite/duplicate, SavedItem, TaskController (favorite, duplicate, transition), CounterService, SealService, DecisionTraceService, ProjectService; atividades U4, U5, W7, W8 (Levar ao projeto abre PhaseSelect do RF21, Compartilhar na sessão RF29, Pedir chancela RF39, Oferecer RF40, Arquivar/Repassar); sequência msgs 20–28 (arquivar oferece repasse); transições → OFERECIDA, → ARQUIVADA, → MODELO_PUBLICO; componentes QuickActions, PhaseSelect (RF21).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA08",
        "text": "Classes TaskItem.visibility, enum Visibility, AcervoService.listForViewer/takeToMyAcervo, TaskController.GET users_id_tasks; atividades U8, W10, S15 → E1 (403 ACESSO_NEGADO), S16 (Levar ao meu acervo RF23); sequência msgs 38–44; componente app/users/[id]/tasks.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA09",
        "text": "Classe AcervoService.list (filters, sort, page), SearchPort; atividades U2, U9, W5 (querystring = visão restaurável, 20 por página, i18n), S1 (ordenações recentes, mais/menos usadas, nome, prazo, valor); sequência msgs 1–4 e 10 (querystring, página 20, i18n); componentes app/tasks (querystring, paginação 20), search-opensearch, platform · i18n.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF42",
    "n": 42,
    "title": "Acumular DECIA Points por participação de qualidade no chat DECIA e usá-los em compras dentro do app (Loja Work Station: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits)",
    "hu": null,
    "summary": "Contexto Balcão & Loja & DECIA Points (bounded context 7). Entidade central: DeciaPointsLedgerEntry (status CONFIRMADO | SUSPENSO | ESTORNADO), append-only e idempotente (idempotencyKey = eventCode + refId + userId). Regras vêm de DeciaPointsRule versionada com vigência; o lançamento guarda ruleVersionId, logo alterar a regra não altera o passado. Gastos passam por StoreService (débito atômico + entrega) e AiCreditLedgerEntry (cota comprada consumida antes da mensal). AntiFraudService suspende lançamentos para revisão do chefe. Nenhum campo de moeda real (RF42.CA10).",
    "route": "DECIA Points (/points: saldo, extrato, regras), Loja Work Station (/store)",
    "coverage": "RF42.CA01 · RF42.CA02 · RF42.CA03 · RF42.CA04 · RF42.CA05 · RF42.CA06 · RF42.CA07 · RF42.CA08 · RF42.CA09 · RF42.CA10",
    "cas": [
      {
        "id": "RF42.CA01",
        "text": "Classes DeciaPointsLedgerEntry (idempotencyKey, delta, eventCode, sessionId, correlationId), DeciaPointsService.award, AiEngine (confirma classificação), enum PointsEvent; atividades I1, I2, S1, S2 → X1 (idempotente), S7; sequência msgs 1–9 e 15–18 (chave única, reprocessar não duplica); transição [*] → fraud → CONFIRMADO; componentes DomainEventOutbox (AFTER_COMMIT).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA02",
        "text": "Classes DeciaPointsRule (points, dailyCap, weeklyCap, perSessionCap, oncePerRef, validFrom/validTo, editedBy), DeciaPointsLedgerEntry.ruleVersionId/qualityMultiplier, RulesRepository.activeRule, DeliberativeProfile; atividades S3, S4 → X2, S5; sequência msgs 9–11 (regra vigente em occurredAt, teto); nota da máquina de estados (nova versão não recalcula); componentes AdminRulesController, RulesRepository.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA03",
        "text": "Classes DeciaPointsService.balance/ledger, PointsController (balance, ledger, rules, monthly); atividades U2, W1 (i18n); componentes app/points, LedgerTable, RulesPlainText, MonthlyChart, platform · i18n.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA04",
        "text": "Classes StoreItem, StorePurchase (pricePaid, ledgerEntryId, deliveryJson, status, idempotencyKey), StoreService.purchase/deliver, enums StoreItemKind, PurchaseStatus; atividades U3, W2, S10, S11 → E2 (409 ITEM_INDISPONIVEL), S12 → E1 (409 SALDO_INSUFICIENTE), S13 (transação atômica + entrega); sequência msgs 19–32; componentes StoreController, StoreItemCard, cache-redis · locks.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA05",
        "text": "Classes DeciaPointsService.transfer, DeciaPointsLedgerEntry.counterpartyUserId, CounterService; atividade S13 (MODELO_BALCAO → crédito VENDA_BALCAO ao autor no mesmo lançamento, respeitando a licença); componente CounterService (RF40) · entrega MODELO_BALCAO. Detalhe da transferência no RF40 §3.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA06",
        "text": "Classes AiCreditLedgerEntry (source COMPRA/CONSUMO), AiQuota.purchasedCredits/consumed/monthlyLimit, DeciaPointsService.consumeAiQuota; atividades U4, S14, S15, W6 (origem da cota, aviso + Loja); sequência msgs 33–41 (crédito antes da mensal, 409 COTA_ESGOTADA); componentes QuotaSourceBadge, AiEngine · consome cota, cache-redis · quota mensal.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA07",
        "text": "Classes AntiFraudService (isRepeated, isCollusion, isFakeSession), DeciaPointsLedgerEntry.status/suspendedReason/reviewedBy, SessionMessage.similarityHash, Reaction.ignoredReason, User.testAccount, DeciaPointsService.review; atividades S6 → S8, U6, W4, S18 → E4; sequência msgs 12–14; estados SUSPENSO → CONFIRMADO / ESTORNADO e nota do saldo; componente ReviewQueue.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA08",
        "text": "Classes DeciaPointsLedgerEntry.eventCode/sessionId, DeliberativeProfile, AiCreditLedgerEntry.departmentId; atividade W5 (perfil deliberativo por evento/sessão, dashboard por departamento e custo de IA); componentes app/profile, app/admin e app/companies.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA09",
        "text": "Classes Company.pointsPolicyJson, DeciaPointsLedgerEntry.expiresAt, PointsDonation (monthKey, ledgerDebitId, ledgerCreditId), DeciaPointsService.expire/donate, eventos EXPIRACAO, DOACAO_ENVIADA, DOACAO_RECEBIDA; atividades U5, W3, S16 → E3 (409 LIMITE_DOACAO), S17 (doador sem ganho), S19 (job mensal, aviso 30 dias); estado composto CONFIRMADO (Vigente → AvisoExpiracao → Expirado); componente scheduler mensal de expiração.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA10",
        "text": "Nota da classe DeciaPointsLedgerEntry (sem moeda real), AuditLog.correlationId; atividade D5 e S18 (audit_log); sequência msg 31 (audit_log correlationId, sem dados sensíveis); componente platform · AuditLog — nenhum componente de gateway ou campo monetário em qualquer diagrama.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF43",
    "n": 43,
    "title": "Usar a IA do sistema — insights do Acervo e do Perfil, ranking de usuários, motor do DECIA e Autopilot para criar tarefas e sugerir novos projetos com custo, tempo, prazo e viabilidade (EVM, CPM, PERT, Monte Carlo, ROI, matriz de risco)",
    "hu": null,
    "summary": "Contexto IA do sistema (bounded context 10). Núcleo: AiEngine (Strategy + Chain of Responsibility: ClaudeAdapter → GeminiAdapter → LocalEngine) com AiProviderCircuitState (CLOSED → OPEN → HALF_OPEN), retry/timeout, AiQuota (mensal + créditos comprados, RF42) e FeatureFlag por função. Privacidade: accessClass RESTRITO/SIGILOSO nunca sai para provedor externo. Regra de ouro: a IA só redige sobre números calculados por serviços de domínio testáveis (MetricDefinition, FeasibilityService), nunca inventa. Entidades de saída: Insight, RankingEntry, FeasibilitySheet (status PROPOSTA → ACEITA | DESCARTADA), AiInferenceLog.",
    "route": "Insights (/insights: Acervo · Perfil · Equipe · Ranking · Projetos sugeridos), Autopilot (/autopilot, estende o RF30), painel \"IA do sistema\" no admin (RF18)",
    "coverage": "RF43.CA01 · RF43.CA02 · RF43.CA03 · RF43.CA04 · RF43.CA05 · RF43.CA06 · RF43.CA07 · RF43.CA08 · RF43.CA09 · RF43.CA10 · RF43.CA11 · RF43.CA12 · RF43.CA13 · RF43.CA14 · RF43.CA15",
    "cas": [
      {
        "id": "RF43.CA01",
        "text": "Classes AiEngine.chain, AiProviderPort + ClaudeAdapter/GeminiAdapter/LocalEngine, CircuitBreaker, AiProviderCircuitState, AiInferenceLog (provider, model, estimatedCostUsd, latencyMs, result FALLBACK, fallbackUsed, correlationId); atividades I5–I10, I12; sequência msgs 15–26 (primário falha → alternativo → local, log completo); máquina de estados AiProviderCircuitState (CLOSED → OPEN → HALF_OPEN); componentes ai-providers, FallbackBanner, cache-redis · circuit state.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA02",
        "text": "Classes TaskItem.accessClass, AiEngine.guardPrivacy, AiInferenceLog.maskedFields/result BLOQUEADO_SIGILO, enum InferenceResult; atividades I2 → I10, I3; sequência msgs 12–14 (LocalEngine, BLOQUEADO_SIGILO, maskedFields); componente ai-providers · PII masker.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA03",
        "text": "Classes Insight (scope ACERVO, metricRefsJson, actionsJson, severity), InsightService.acervo/applyAction; atividades U5, W4, S9 (Score 0–100 com decomposição, paradas, duplicadas, fantasma, lacunas, modelos recomendados, ações 1 clique); componentes ScoreBreakdown, OneClickAction, app/insights.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA04",
        "text": "Classes InsightService.perfil(userId, consent), Insight.scope PERFIL; atividades S10 → E2 (403 só o dono), S12 (comparação anonimizada, resumo profissional só com consentimento); componente InsightController.GET insights_perfil.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA05",
        "text": "Classes RankingEntry (dimension, position, explanationJson), RankingWeights (weightsJson, criteriaPublicText, validFrom, editedBy), User.rankingOptOut, enum RankingDimension (7 dimensões), RankingService.compute/explain/updateWeights; atividade S13 (volume bruto nunca é critério); sequência msgs 43–49 (explain-me, opt-out); componentes RankingTable + ExplainMe, PipelineJob RECALC_RANKING, AuditLog (pesos com vigência).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA06",
        "text": "Classes DeciaSession.aiMode, enum AiMode, Citation, AiEngine.guardQuota (créditos → cota → DECIA Points), AiQuota; atividade I4 (modo AVANCADO debita cota ou DP com aviso) e E3; componentes SessionService · modo ECONOMIA/AVANCADO · citações RF33, search-opensearch · ws-memory.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA07",
        "text": "Classes AutopilotService.tasksFrom, TaskItem (state RASCUNHO, sourceKind AUTOPILOT, aiGenerated), AiCapability.AUTOPILOT_TAREFAS; relação AutopilotService → AiEngine (AUTOPILOT_TAREFAS); componente AutopilotController.POST autopilot_tasks — nada vira DISPONIVEL sem revisão (RF20/RF41).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA08",
        "text": "Classes FeasibilitySheet (costJson P10/P50/P90, timeJson PERT/CPM, deadlineJson Monte Carlo 1000, viabilityScoreJson, risksJson top 5, wbsJson, raciJson, assumptionsJson, unknownsJson), FeasibilityService (7 métodos), AutopilotService.suggestProjects(max5); atividades S1, S2, S3, W2, U2; sequência msgs 1–7 e 27–29 (até 5 fichas ordenadas); transição [*] → PROPOSTA; componentes FeasibilityCard, RiskMatrix.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA09",
        "text": "Classes ProjectScheme.evmJson/criticalPathJson, ProjectTask (plannedValue, earnedValue, actualCost, isCritical, slackDays), FeasibilityService.evm/cpm; atividade S14 (EVM PV, EV, AC, CPI, SPI, EAC, ETC, VAC, TCPI, burndown, alerta SPI menor que 0,9 há 2 semanas → Simulador RF31); componentes EvmPanel, AutopilotController.GET projects_id_evm.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA10",
        "text": "Classes FeasibilitySheet.status/discardReason/resultingProjectId/resultingTaskId, AutopilotService.accept/discard, ProjectScheme.origin AUTOPILOTO, TaskItem ESTUDO_TECNICO_PRELIMINAR; atividades U3, W3, S4 → S5/S6, S7 → E1 (422 MOTIVO_OBRIGATORIO), S8; sequência msgs 30–42; transições PROPOSTA → ACEITA / DESCARTADA e nota.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA11",
        "text": "Nota de FeasibilityService (determinístico, sem chave externa), LocalEngine; atividades I1 → I10 (flag desabilitada ou sem provedor → motor local, redação simplificada com aviso); sequência msgs 12–14 e 19–21; componentes ws-domain · FeasibilityService, MetricCalculator, FeatureFlag ai.local.only.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA12",
        "text": "Classes AiInferenceLog (estimatedCostUsd, latencyMs, capability, departmentId, fallbackUsed, quotaSource), AiQuota, FeasibilitySheet.status (taxa de aceitação), AdminAiController; atividades U6, W6; componente app/admin/ai.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA13",
        "text": "Classes MetricDefinition (code, domain, formula, sourceDescription, proxyNote, unit, minSamples), MetricSnapshot, MetricCalculator, Insight.metricRefsJson; atividades S12 (fórmula, fonte, proxy) e I11 (redige só sobre números calculados, cita métrica e valor); nota de MetricCalculator; componente ws-domain · MetricCalculator por métrica A–D (METRICAS_GESTAO.md).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA14",
        "text": "Classes InsightService.equipe(departmentId, viewer), Insight.scope EQUIPE, MetricDefinition.minSamples; atividades S10 (CHEFE/EMPRESA) → E2, S11 (pesquisas D: mínimo 5 respondentes), S12 (benchmarks internos anonimizados, tendência, recomendações acionáveis); componente InsightController.GET insights_equipe.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA15",
        "text": "Classe MetricDefinition.minSamples (A/B: 3 projetos ou sinais); atividades S11 → W5 (tela explica o que falta coletar em vez de números vazios); componente InsufficientDataState.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF44",
    "n": 44,
    "title": "Receber a Tarefa do Dia sugerida pela IA e acompanhar o Hype Score de Eficiência (previsto × realizado), calculado por princípios de gestão empresarial e de projetos, com feedback diário e semana planejada",
    "hu": null,
    "summary": "Contexto Gamificação & Reputação (bounded context 9). Entidade central: DailyTask (única por userId + taskDate), com priorityIndexJson (Eisenhower, WSJF, folga CPM, MoSCoW, Pareto, conselho de WIP), hsePredictedJson × hseRealizedJson e feedback (DailyFeedback CONCLUI | ADIEI | BLOQUEADA | DELEGUEI). Os cálculos são serviços de domínio determinísticos e testáveis (PriorityIndexCalculator, HseCalculator) com pesos versionados em HseWeights por EMPRESA; o AiEngine só redige a explicação (✦) e cai para o motor local sem perder nenhum número (RF44.CA09). WeekPlan/WeekPlanDay compõem a semana planejada.",
    "route": "sub-aba \"Tarefa do Dia\" no perfil (RF19) e widget no topo do Acervo (RF41) e da Mesa (RF22)",
    "coverage": "RF44.CA01 · RF44.CA02 · RF44.CA03 · RF44.CA04 · RF44.CA05 · RF44.CA06 · RF44.CA07 · RF44.CA08 · RF44.CA09 · RF44.CA10",
    "cas": [
      {
        "id": "RF44.CA01",
        "text": "Classes DailyTask (único userId + taskDate, priorityIndexJson, hsePredictedJson), DailyTaskService.getOrCreate, PriorityIndexCalculator.rank, HseCalculator.predict; atividades U1, W1, S1, S2, S3, P1–P4, H1, S6, U2; sequência msgs 1–17 (lock, índice único, 201 com decomposição); transição [*] → Sugerida; componentes ProtocolTicket, PriorityBreakdown, HseGauge.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA02",
        "text": "Classes DailyTask.swapReason/swappedFromTaskId, DailyTaskService.swap, PriorityIndexCalculator.rank(candidates, userWeights); atividades U4, W2, S7 → E1 (422 MOTIVO_OBRIGATORIO), S8 (ajusta pesos pessoais); sequência msgs 18–24; transição Sugerida → Sugerida (swap).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA03",
        "text": "Classes DailyTask.feedback/actualHours/hseRealizedJson, HseCalculator.realize, TaskStateMachine, EfficiencyScoreSnapshot, ProjectTaskDependency; atividades U5, W3, S9 → S10 (HSE realizado, ▲▼, CONCLUIDA, notifica dependentes, movingAvg7); sequência msgs 25–36; transições Sugerida → CONCLUI e EM_USO/DISPONIVEL → CONCLUIDA.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA04",
        "text": "Classes DailyTask.blockedByRef/delegatedToUserId, TaskItem.blockedByTaskId/blockedByUserId, TaskStateLog; atividades U6–U8, S11, S12 (sem penalizar bloqueio de terceiro → insight de equipe, dependência com rastro), S13 (transferência com TaskStateLog); transições Sugerida → ADIEI / BLOQUEADA / DELEGUEI e EM_USO → BLOQUEADA, EM_USO → EM_USO (DELEGUEI).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA05",
        "text": "Classes UserPreferences.wipLimit (padrão 3), PriorityIndexCalculator.wipAdvice, HseCalculator.foco; atividades S4 → S5 (prioriza concluir EM_USO, explica com Little's Law); sequência msgs 8–9.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA06",
        "text": "Classes WeekPlan (streak, closingHse, recommendation), WeekPlanDay (sortOrder, meetingsJson, loadPct), CalendarPort, DailyTaskService.weekPlan/reorder/closeFriday; atividades U9, W4, S14 (prazos legais, reuniões, carga até 80%, reordenar persiste, sexta); sequência msgs 37–42; componentes WeekBoard (drag), StreakBadge, Google Workspace Calendar · Microsoft 365 Calendar.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA07",
        "text": "Classes DailyTaskService.history, EfficiencyScoreSnapshot.movingAvg7; atividades U10, W5, S15 (30 dias, previsto × realizado, média móvel 7 d, gráfico de componentes); componentes app/profile (histórico 30 d), ComponentBars.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA08",
        "text": "Classes HseWeights (companyId, version, weightsJson, validFrom), EfficiencyScoreSnapshot.weightsVersion, PriorityIndexCalculator e HseCalculator em ws-domain; notas das classes (determinístico, testável, METRICAS_GESTAO.md, mudar pesos não recalcula dias passados); lane L_dom; componentes ws-domain · PriorityIndexCalculator, HseCalculator (HseWeights versionado).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA09",
        "text": "Classes DailyTask.suggestedByAi/aiInferenceId, AiInferenceLog, AiCapability TAREFA_DO_DIA e HSE; atividades I1 → I2 (✦) / I3 (motor local, números inalterados), I4; sequência msgs 11–13; componentes AiSpark ✦, LocalEngine (redação simplificada).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA10",
        "text": "Classes UserPreferences.notificationPrefsJson (dailyTaskAt 08:00)/timezone, Notification, NotificationPort; atividade W6 (notificação 8h no fuso, opt-in, i18n); componentes platform · scheduler 8h por fuso, persistence-cassandra · notifications_by_user, i18n.",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF45",
    "n": 45,
    "title": "Calcular com a IA o Hype Score do Perfil (0–1000) a partir de tudo o que o usuário produziu, das interações recebidas (curtidas, reações, comentários, salvos, remixes) e da participação no DECIA — exibível ou oculto a critério do usuário, sempre explicável",
    "hu": null,
    "summary": "Contexto Gamificação & Reputação (bounded context 9). Entidade central: ProfileHypeScore (única por userId + scoreDate, idempotencyKey), com blocksJson em 5 blocos (produção 25, reconhecimento social 25, participação DECIA 25, eficiência e impacto 15, reconhecimentos e chancelas 10), bayesianPriorsJson, halfLifeDays 180, percentileInDept, bandCode (HypeBand). Eventos descartados vão para HypeIgnoredEvent (NAO_VERIFICADO, AUTO_INTERACAO, ANTIFRAUDE). Visibilidade em User.hypeVisibility (HypeVisibility PUBLICO | EMPRESA | SO_EU, padrão SO_EU). O job diário é PipelineJob RECALC_HYPE → HypeScoreService; a IA só redige a explicação.",
    "route": "cabeçalho do perfil (RF19) com o selo do Hype Score (se exibido), página /profile/hype (só o dono) com a decomposição",
    "coverage": "RF45.CA01 · RF45.CA02 · RF45.CA03 · RF45.CA04 · RF45.CA05 · RF45.CA06 · RF45.CA07 · RF45.CA08 · RF45.CA09 · RF45.CA10",
    "cas": [
      {
        "id": "RF45.CA01",
        "text": "Classes ProfileHypeScore (scoreDate, score 0–1000, weightsVersion, blocksJson, idempotencyKey), HypeScoreService.recalculate/runDailyJob, PipelineJob RECALC_HYPE; atividades J1, U1, S1 → X1 (idempotente), S2, S6; sequência msgs 1–4 e 16 (lock, no-op se já calculado, UPSERT); máquina de estados PipelineJob RECALC_HYPE; componentes platform · scheduler diário · PipelineJob RECALC_HYPE.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA02",
        "text": "Classes HypeCalculator.bayesianMean/decay, ProfileHypeScore.bayesianPriorsJson/halfLifeDays; atividades H1 (0,5^(dias ÷ 180), nunca zera), H2 (prior do departamento, flag amostra pequena); sequência msgs 11–12; componente SmallSampleHint.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA03",
        "text": "Classes HypeIgnoredEvent (eventType, eventId, reason), enum IgnoredReason, User.verified, AntiFraudService (isVerified, isSelfInteraction, isCollusion), Reaction.ignoredReason; atividades S3 → S4 (aba ignoradas com motivo); sequência msgs 9–10; componentes IgnoredEventsTable, HypeController.GET profile_hype_ignored, AntiFraudService (RF42).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA04",
        "text": "Classes HypeCalculator.reputationWeight(actorHypePrevMonth, base, cap3x), Reaction.actorHypeAtTime; atividade S5 (Hype do autor no mês anterior, cap 3×); sequência msgs 7 e 11 (Hype dos autores no mês anterior, cap 3x).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA05",
        "text": "Classes ProfileHypeScore.topPositiveEventsJson/topNegativeEventsJson/suggestionsJson/aiInferenceId, HypeScoreService.explain, AiCapability HYPE_PERFIL, AiInferenceLog; atividades U1, W1, H5, I1, I2; sequência msgs 13–16 e 21–26 (score, faixa, blocos, 12 meses, top 5 ±, 3 sugestões ✦); componentes app/profile/hype, BlockBreakdown, HypeHistoryChart, TopEventsList, AiSpark ✦.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA06",
        "text": "Classes User.hypeVisibility, enum HypeVisibility (PUBLICO, EMPRESA, SO_EU padrão), HypeScoreService.visibleTo, PreferencesController; atividades U2, W2, U3, W3, S8, S9, S10 → E1 (403 / campo omitido); sequência msgs 27–36; máquina de estados User.hypeVisibility; componentes HypeBadge, app/settings/preferences.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA07",
        "text": "Classes Company.hypePolicyJson, HypeBand.name/min/max, ProfileHypeScore.weightsVersion, HypeScoreService.updatePolicy, CompanyPolicyController, AuditLog; atividades U4, W4, S11 → E2 (422), W6 (página pública); sequência msgs 37–42 (weightsVersion+1, validFrom futuro, audit_log, meses passados não recalculados); nota da máquina de estados Band; componente app/hype/how-it-works.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA08",
        "text": "Classes RankingEntry (dimension HYPE_PERFIL), User.rankingOptOut, RankingService.compute; atividade S7 (exclui opt-out, nunca expõe número de quem é SÓ EU); sequência msgs 17–19 (ranking sem o número de quem é SO_EU); nota da máquina de estados Vis; componentes RankingService (RF43) · HYPE_PERFIL, cache-redis · ranking HYPE_PERFIL.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA09",
        "text": "Classe HypeCalculator em ws-domain (bayesianMean, decay, normalizePercentile, reputationWeight, blocks, band) com nota (determinístico, testável, METRICAS_GESTAO.md seção Hype do Perfil); lane L_dom (H1–H5); atividade I1 (IA só redige); componente ws-domain · HypeCalculator — testes unitários.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA10",
        "text": "Classes DashboardController.GET dashboard_hype_distribution, MetricSnapshot; atividades U5, W5, S12 (histograma anonimizado por departamento, evolução média, nunca lista nominal de quem ocultou); componentes HypeHistogram, app/admin e app/companies (dashboard).",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF46",
    "n": 46,
    "title": "Utilizar chats de mensageria para comunicar-se com outros usuários e atribuir ou receber tarefas e projetos",
    "hu": "como usuário do Work Station posso enviar mensagens e atribuir tarefas ou projetos para usuários conectados pelo chat do WS, pelo chat do DECIA ou clicando em botões de interação social em um esquema, para melhorar a gestão e o fluxo de trabalho da equipe. O RF introduz um chat de mensageria (conversa direta 1:1 ou em grupo, fora da sessão DECIA) e a atribuição como transação com aceite: quem recebe pode aceitar, recusar com motivo ou devolver. Entidades novas (propostas, a incluir na TAXONOMIA): DirectConversation, DirectConversationParticipant, DirectMessage (Cassandra, TTL) e Assignment.",
    "summary": "HU46: como usuário do Work Station posso enviar mensagens e atribuir tarefas ou projetos para usuários conectados pelo chat do WS, pelo chat do DECIA ou clicando em botões de interação social em um esquema, para melhorar a gestão e o fluxo de trabalho da equipe. O RF introduz um chat de mensageria (conversa direta 1:1 ou em grupo, fora da sessão DECIA) e a atribuição como transação com aceite: quem recebe pode aceitar, recusar com motivo ou devolver. Entidades novas (propostas, a incluir na TAXONOMIA): DirectConversation, DirectConversationParticipant, DirectMessage (Cassandra, TTL) e Assignment.",
    "route": "Mensagens (/messages, /messages/[conversationId]), ícone na barra superior ao lado de Notificações; ação Atribuir no card de tarefa/projeto (RF18/RF19 \"atribuir\"), dentro do chat da sessão DECIA (/decia/[sessionId]) e na aba Minha equipe do CHEFE (RF10)",
    "coverage": "RF46.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 — todos \"(CA a confirmar)\", derivados do título + HU46 (corpo do card vazio); relacionados: RF10 (chefe atribui tarefa/projeto, sem corpo), RF18/RF19 (interações \"retornar\" e \"atribuir\"), RF44.CA DELEGUEI (caminho inverso), RF29.CA04 (rastro quando a atribuição nasce no DECIA)",
    "cas": [
      {
        "id": "RF46.CA01",
        "text": "Posso abrir uma conversa direta (1:1) ou em grupo com usuários da mesma empresa, enviar texto e anexar tarefa/projeto como cartão (attachmentsJson com targetType TASK · PROJECT e snapshot); a conversa fica fora da sessão DECIA, sem IA e sem DECIA Points. Usuário de outra empresa: 403 EMPRESA_DIFERENTE.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA02",
        "text": "Anexo com accessClass RESTRITO ou SIGILOSO só é aceito se todos os participantes têm acesso ao item (mesma visibilidade/departamento); caso contrário 403 ACESSO_NEGADO e o cartão não é enviado.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA03",
        "text": "A ação Atribuir — pelo chat do WS (CHAT_WS), pelo chat da sessão DECIA (CHAT_DECIA) ou pelo botão no card do esquema (BOTAO_ESQUEMA) — cria Assignment com targetType TASK · PROJECT, destinatário, prazo e nota, em status PROPOSTA, gera DirectMessage de sistema na conversa e Notification ATRIBUICAO_PROPOSTA.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA04",
        "text": "O destinatário aceita (ACEITA → TaskItem.responsibleId / ProjectTask.responsibleId atualizados, TaskStateLog, alimenta a Tarefa do Dia RF44), recusa com motivo (RECUSADA, motivo obrigatório, 422 MOTIVO_OBRIGATORIO) ou, depois de aceitar, devolve com motivo (DEVOLVIDA); quem atribuiu é notificado em cada resposta. Só o destinatário responde (403), e uma atribuição já respondida não muda (409 ATRIBUICAO_JA_RESPONDIDA).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA05",
        "text": "CHEFE pode atribuir a membros do seu departamento (RF10, requireDeptHead); EMPREGADO pode propor a colegas da mesma empresa (sempre com aceite); toda atribuição grava AuditLog, e quando a origem é CHAT_DECIA também um nó DecisionTraceNode TAREFA/PROJETO ligado à mensagem (RF29.CA04).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA06",
        "text": "Mensagens têm TTL configurável por empresa (Company.pointsPolicyJson não; nova chave messagingPolicyJson, proposta), não entram no índice de busca nem na memória institucional, e o usuário pode arquivar/sair da conversa; a lista de conversas e as não lidas chegam em tempo real (Redis pub/sub → WebSocket/SSE).",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  }
];
