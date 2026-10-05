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
    "summary": "O cadastro local é o Bloco 3 do plano de segurança (ARQUITETURA §6 (c)). Classes marcadas (real) existem em origin/main (Bloco 3, PR #16); as marcadas (planejado) vêm da TAXONOMIA §1.8–1.15 e do CADASTRO_E_LGPD.md (blocos A/B).",
    "route": "/register → /verify-email (BFF app/bff/auth/register → POST /api/auth/register); /termos e /privacidade (D-15)",
    "coverage": "RF1.CA01 … RF1.CA06 (corpo do card vazio → derivados do título + HU1, todos \"(CA a confirmar)\") · RF1.CA07 … RF1.CA13 (§7, controles de segurança D-14) · RF1.CA14 … RF1.CA27 (§8, aceite dos termos e tipos de perfil, D-15…D-22) — regra: o título do card define o RF; os CAs foram atualizados para o código real do Bloco 3 (RegistrationController, RegistrationService, V3__rf1_rf2_autenticacao.sql)",
    "cas": [
      {
        "id": "RF1.CA01",
        "text": "Dado o formulário de cadastro, quando informo profileType (EMPREGADO · EMPRESA · CHEFE_DEPARTAMENTO), fullName (3–160), username (3–30, Usernames.normalize), email, password + confirmPassword (Passwords.problem), telefone opcional (E.164) e acceptTerms, então cada campo é validado e os erros voltam juntos como 422 VALIDACAO com details.fields por campo e correlationId.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA02",
        "text": "Dado um username já em uso, então 409 USERNAME_EM_USO com details.suggestions; nome reservado (admin, root, suporte, secid, decia, workstation, prefixos demo_/e2e_) → 422 NOME_RESERVADO. Dado um e-mail já cadastrado, então a resposta é a mesma 202 Receipt do cadastro novo (sem oráculo, D-27/Q-86): o dono recebe o e-mail \"você já tem conta\" e AuditLog REGISTER_EMAIL_EM_USO. Disponibilidade em GET /api/usernames/{username}/availability e sugestões em GET /api/auth/username-suggestions.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA03",
        "text": "Dado um cadastro válido, então a senha é guardada só como hash Argon2id (Argon2PasswordHasher), nunca aparece em log, evento ou auditoria (SensitiveDataMaskingConverter); e-mail e telefone vão ao banco cifrados (FieldCipher/AesGcmStringConverter, AES-256-GCM enc:v1:, colunas email_enc/phone_enc) e a busca usa emailHash = HMAC-SHA256 com chave derivada de WS_DATA_ENCRYPTION_KEY (HmacEmailHasher, Q-87).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA04",
        "text": "Dado o cadastro criado, então a conta nasce AccountStatus PENDING_EMAIL_VERIFICATION, accountOrigin REAL, com UserPreferences padrão e um VerificationCode (6 dígitos, só o hash, TTL) enviado por MailPort; ao confirmar em POST /api/auth/email-verification/confirm, EMPREGADO → ACTIVE e EMPRESA/CHEFE_DEPARTAMENTO → PENDING_VALIDATION com ApprovalRequest PENDENTE (planejado, RF28.CA01, D-19).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA05",
        "text": "Dado o código confirmado, então RegistrationService.confirmEmail grava emailVerified, AuditLog EMAIL_VERIFIED e abre a sessão pelo IdentityService.openSession (access JWT RS256 + refresh em ws_rt, como no RF2), levando ao shell do app; antes disso o cadastro responde só 202 Receipt {status VERIFICACAO_ENVIADA, maskedEmail, nextStep} e redireciona para /verify-email sem sessão (emitir no register revelaria se a conta era nova, D-27/Q-86).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA06",
        "text": "Dado tentativas repetidas, então o AuthRateLimitFilter limita por IP (register 10/h, resend 10/h, confirm 20/h → 429 MUITAS_TENTATIVAS + Retry-After), o reenvio é silencioso e limitado por pessoa (RateLimitPort email-verification-send), e AuditLog USER_REGISTERED / EMAIL_VERIFIED / EMAIL_VERIFICATION_FALHA são gravados com e-mail mascarado e correlationId.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA07",
        "text": "Dado um cadastro válido, então a senha é guardada com Argon2id nos parâmetros mínimos OWASP (m=19456 KiB, t=2, p=1, salt 16 B, hash 32 B) e needsRehash refaz o hash no próximo login quando os parâmetros mudarem.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA08",
        "text": "Dado o mesmo IP (assinado pelo BFF em X-Ws-Client-Ip/X-Ws-Proxy-Ts/X-Ws-Proxy-Sig; senão X-Real-IP; senão TCP; nunca X-Forwarded-For; IPv6 por /64), então o AuthRateLimitFilter aplica antes do Spring Security POST /api/auth/register 10/h, email-verification/resend 10/h, confirm 20/h, GET /api/auth/username-suggestions 60/10 min e POST /api/auth/uploads 40/h; o excedente recebe 429 MUITAS_TENTATIVAS com Retry-After.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA09",
        "text": "Dado um pico de cadastros, então o HashBulkhead (permits = max(1, min(max(2, núcleos), pool/2)), espera 2 s) limita os Argon2 simultâneos e o excedente recebe 503 AUTENTICACAO_OCUPADA + Retry-After; 60 pedidos paralelos geram zero HTTP 500.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA10",
        "text": "Dado um username que, normalizado, seja reservado (admin, root, suporte, secid, decia, workstation, prefixos demo_/e2e_), então o cadastro responde 422 NOME_RESERVADO com sugestões; a conta ADMIN só nasce pelo AdminBootstrap (WS_ADMIN_BOOTSTRAP_ENABLED=true, WS_ADMIN_INITIAL_PASSWORD ≥ 16 chars sem padrão, só se não existe nenhum ADMIN; nunca promove conta existente sem WS_ADMIN_PROMOTE_EXISTING=true).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA11",
        "text": "Dado o código de verificação, então há no máximo 5 tentativas por código (attempts++ persiste mesmo com erro, @Transactional(noRollbackFor = ApiException.class)) e um contador atômico de 10 tentativas/h por pessoa e finalidade (RateLimitPort); o excedente recebe 429 MUITAS_TENTATIVAS.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA12",
        "text": "Dado o cadastro criado, então users.account_origin nasce REAL (CHECK no V2), fixture_key NULL e test_account gerada = false; contas TEST_SEED/DEMO ficam fora de rankings, HSE, DECIA Points e métricas (RF43), e o e-mail nunca é enviado a .test/.example/.invalid/.localhost.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA13",
        "text": "Dado qualquer log ou evento do cadastro, então o e-mail aparece mascarado (Masking.maskEmail) e nunca há senha, token ou código; a sessão emitida no CA05 segue o RF2 (TTL do access em aberto na Q-49).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA14",
        "text": "Dado o formulário, então o Checkbox \"Li e aceito os Termos de Uso e a Política de Privacidade\" vem desmarcado, com links para os dois documentos (abrem em Sheet ou nova aba sem perder o formulário); \"Criar conta\" fica disabled até marcar.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA15",
        "text": "Dado o pedido sem acceptTerms=true, então 422 VALIDACAO com details.fields.acceptTerms (real); o cliente envia termsVersion/privacyVersion exibidas e, se alguma não for a VIGENTE, recebe 409 VERSAO_DOS_TERMOS_DESATUALIZADA (planejado, Q-70).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA16",
        "text": "Dado o cadastro aceito, então são gravadas duas linhas em policy_acceptances (TERMOS e PRIVACIDADE com version, accepted_at, ip, user_agent, channel), a cópia em users.terms_version/privacy_version (real) e AuditLog POLICY_ACCEPTED; a tabela é append-only, FK RESTRICT, e sobrevive à anonimização (art. 8º §2º).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA17",
        "text": "Dado qualquer caminho que cria conta, então o aceite é capturado: CADASTRO_LOCAL, primeiro login OIDC numa tela de conclusão (OIDC, OidcAccountLinker) e seed (SEED); o admin do AdminBootstrap passa pelo gate (CA18) no primeiro login.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA18",
        "text": "Dado versão VIGENTE mais nova que a aceita, então Dialog bloqueante com o changelog e 403 ACEITE_PENDENTE a tudo, exceto GET /api/me/policies, POST /api/me/policies/accept, logout, exportação e pedido de exclusão (PolicyGateFilter depois do JWT).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA19",
        "text": "Dado /termos e /privacidade, então funcionam sem login e pelo gate, mostram a versão vigente e o histórico (GET /api/legal/{TERMOS|PRIVACIDADE}/current e /versions); PolicyTextGuardTest recusa texto com marcador […] ou \"validar com jurídico\".",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA20",
        "text": "Dado o cadastro, então nenhum consentimento opcional (ConsentPurpose) é pedido junto com o aceite; user_consents nasce vazio (RF3.CA10).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA21",
        "text": "Dado a resposta à Q-63: se menores não podem usar, birthDate não é coletada; se podem, é obrigatória no servidor (422 details.fields.birthDate) e a regra do art. 14 é aplicada.",
        "note": "CA a confirmar, Q-63",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA22",
        "text": "Dado a escolha do tipo com RadioCard, então profileType fora de EMPREGADO/EMPRESA/CHEFE_DEPARTAMENTO (inclusive ADMIN) recebe 422 VALIDACAO details.fields.profileType (real, parseProfileType); CURADOR não é tipo (D-09).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA23",
        "text": "Dado o tipo, então os campos extras são: EMPREGADO jobTitle e intendedDepartmentId opcional (não lota); EMPRESA legalName, companyCnpj, officialSite obrigatório (https://, recusa @perfil), representationDocId; CHEFE companyId existente, departamento e appointmentLink. Erros 422 VALIDACAO por campo.",
        "note": "CA a confirmar, Q-64",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA24",
        "text": "Dado a resposta à Q-62, então EMPREGADO pode exigir domínio institucional; para EMPRESA, e-mail no domínio do officialSite (fora de freeMailDomainsJson) marca o critério REPRESENTACAO automaticamente (RF28.CA15).",
        "note": "CA a confirmar, Q-62",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA25",
        "text": "Dado POST /api/auth/uploads?kind=avatar|identity|representation, então tipo real por magic bytes, limite de bytes e de pixels, reencode sem EXIF/GPS, documentos em restricted/pending/…, PendingUpload.expiresAt = +24 h; o cadastro só aceita upload do mesmo kind e não consumido; PendingUploadCleanupJob apaga os abandonados (teste prova o @Scheduled). A regra de IP (40/h) já está em AuthRateLimitFilter.RULES.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA26",
        "text": "Dado o campo username, então a disponibilidade é consultada com debounce de 400 ms em GET /api/usernames/{username}/availability (real: {username, available, reason, suggestions}) e sugestões em GET /api/auth/username-suggestions?base=.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF1.CA27",
        "text": "Dado EMPRESA ou CHEFE_DEPARTAMENTO, então o ApprovalRequest nasce só depois da confirmação do e-mail (passo C5 do §2); o prazo em dias úteis conta daí (RF28.CA12); enquanto PENDING_VALIDATION, Guard.requireApprovedProfile responde 403 PERFIL_EM_VALIDACAO.",
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
    "summary": "Classes (real) existem em origin/main (Bloco 3, PR #16); (planejado): RedisSessionStore (hoje InMemorySessionStore + espelho JPA refresh_tokens, Q-85), GET/DELETE /api/auth/sessions (Q-89; IdentityService.activeSessions já existe), PKCE/state do OIDC no BFF e cookie ws_rt (Bloco 4, Q-85), conferência TOTP do 2FA (Q-83), SMTP real (Q-84), PolicyGateFilter (D-16). Números adotados: D-25 (TTLs), D-26 (Argon2id e bulkhead), D-27 (cadastro sem oráculo).",
    "route": "/login (BFF app/bff/auth/login → POST /api/auth/login), /login/institucional (POST /api/auth/oidc/login), /forgot-password (POST /api/auth/password-reset/request|confirm); todas as rotas autenticadas passam pelo SessionActiveFilter",
    "coverage": "RF2.CA01 … RF2.CA06 (corpo do card vazio → derivados do título + HU2, todos \"(CA a confirmar)\") · RF2.CA07 … RF2.CA14 (§7, controles de segurança D-14) — regra: o título do card define o RF; CAs alinhados ao código real do Bloco 3 (AuthController, IdentityService, AuthRateLimitFilter, HashBulkhead, SessionActiveFilter, JwtTokenIssuer, OidcService, PasswordResetService)",
    "cas": [
      {
        "id": "RF2.CA01",
        "text": "Dado identifier (username ou e-mail) e password, quando faço POST /api/auth/login, então a senha é conferida contra o hash Argon2id (PasswordHasher.matches, re-hash transparente por needsRehash) e recebo Session {accessToken RS256 15 min (D-25; claims iss, aud, sub, sid=familyId, role, profile_type, username, jti), tokenType Bearer, expiresIn, refreshToken opaco, refreshExpiresAt, family, user, warnings}; o refresh (30 d se rememberMe, 24 h se não — SessionPolicy) é guardado só como SHA-256 (RefreshRecord.tokenHash) com espelho em refresh_tokens; o BFF devolve o refresh só no cookie ws_rt (HttpOnly, Secure, SameSite=Strict).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA02",
        "text": "Dado conta inexistente, senha errada ou conta bloqueada, então 401 CREDENCIAIS_INVALIDAS com a mesma mensagem e tempo (hash falso dummyHash); conta SUSPENDED/ANONYMIZED (AccountStatus.blocksLogin) → 403 CONTA_INDISPONIVEL depois da senha certa; PENDING_VALIDATION e DELETION_SCHEDULED entram com warnings (Q-82; PENDING_EMAIL_VERIFICATION só tem sessão após confirmar o código, D-27); twoFactorEnabled → 401 DOIS_FATORES_NECESSARIO {twoFactorRequired} (conferência TOTP é a Q-83).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA03",
        "text": "Dado \"Entrar com conta institucional\", então o front faz OIDC Authorization Code + PKCE e envia POST /api/auth/oidc/login {idToken, nonce}; OidcService exige ws.oidc.enabled (404 OIDC_DESLIGADO), IdTokenVerifier (Nimbus) valida assinatura JWKS, iss, aud, nonce, exp (401 OIDC_TOKEN_INVALIDO); OidcAccountLinker vincula oidcSubject/oidcIssuer ao User de mesmo emailHash só com email_verified=true (401 OIDC_EMAIL_NAO_VERIFICADO, AuditLog OIDC_LINK_RECUSADO) ou cria conta ACTIVE sem senha; emite a mesma Session (AuditLog OIDC_LOGIN).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA04",
        "text": "Dado um refresh válido, quando o BFF chama POST /api/auth/refresh, então ocorre rotação: novo token da mesma familyId, o anterior recebe revokedAt/rotatedFromHash; reuso de token já rotacionado revoga a família inteira, grava AuditLog REFRESH_REUSO e responde 401 SESSAO_INVALIDA; expirado ou desconhecido → 401 SESSAO_INVALIDA; conta que passou a blocksLogin() → família revogada.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA05",
        "text": "Dado o usuário autenticado, então POST /api/auth/logout revoga a família (AuditLog LOGOUT); PUT /api/auth/password exige a senha atual (mesmo bloqueio do login), grava PASSWORD_CHANGED e revoga as outras famílias (SESSIONS_REVOKED); o SessionActiveFilter recusa a cada requisição access tokens cuja família foi revogada (sid → 401 SESSAO_ENCERRADA). GET /api/auth/sessions e DELETE /api/auth/sessions/{familyId} são planejados (aba Sessões do RF3 §7).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA06",
        "text": "Dado tentativas repetidas, então há limite por IP (AuthRateLimitFilter) e por conta (RateLimitPort login-fail), AuditLog LOGIN_OK / LOGIN_FALHA / LOGIN_BLOQUEADO_TENTATIVAS / REFRESH_REUSO / LOGOUT com correlationId, e-mail mascarado e sem senha ou token; User.lastLoginAt é atualizado; mensagens i18n (pt-BR/en/es). Redefinição por e-mail: POST /api/auth/password-reset/request (resposta igual exista ou não a conta, 5/h por pessoa) e /confirm {token, newPassword} (422 LINK_INVALIDO), que tira a conta do bloqueio.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA07",
        "text": "IdentityService.login (ordem das checagens), dummyHash",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA08",
        "text": "RateLimitPort.tryAcquire/release/reset, RedisRateLimit (Lua), SessionPolicy.maxLoginFailures/lockWindow",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA09",
        "text": "IdentityService.changePassword, AccountService.updateSensitive/requestDeletion",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA10",
        "text": "AuthRateLimitFilter.RULES, ClientIpResolver",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA11",
        "text": "HashBulkhead",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA12",
        "text": "OidcAccountLinker (email_verified), AuthCodes.OIDC_EMAIL_NAO_VERIFICADO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA13",
        "text": "JwtTokenIssuer, JwtKeys, SessionActiveFilter, BFF ws_rt",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA14",
        "text": "AuditActions.LOGIN_OK/LOGIN_FALHA/LOGIN_BLOQUEADO_TENTATIVAS/REFRESH_REUSO/LOGOUT, AuditEvent, Masking",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF3",
    "n": 3,
    "title": "Editar informações pessoais e preferências do perfil do usuário",
    "hu": "COMO usuário autenticado no sistema POSSO editar minhas informações pessoais e preferências de perfil PARA manter meus dados atualizados e personalizar minha experiência na plataforma.",
    "summary": "Classes (real) existem em origin/main (Bloco 3, PR #16); (planejado): UserConsent/ConsentEvent/ConsentChecks, DataExportRequest/DataExportWorker, DataSubjectRequest, PersonalDataRegistry, AccountAnonymizationJob, upload de avatar (PendingUpload/MediaObject, D-22), GET/DELETE /api/auth/sessions, PolicyGateFilter.",
    "route": "/settings com abas na URL ?tab=conta|aparencia|privacidade|dados|sessoes|termos|validacao (ABAS_POR_PERFIL §9); API GET|PATCH /api/me, PATCH /api/me/sensitive, GET|PUT /api/me/preferences, POST|DELETE /api/me/deletion",
    "coverage": "RF3.CA01 … RF3.CA06 (corpo do card vazio → derivados do título + HU3, todos \"(CA a confirmar)\") · RF3.CA07 … RF3.CA24 (§7, configurações e direitos do titular, D-15…D-21) — regra: o título do card define o RF; CAs alinhados ao código real do Bloco 3 (MeController, AccountService, UserPreferences, Guard.requireNotDeletionScheduled)",
    "cas": [
      {
        "id": "RF3.CA01",
        "text": "Dado o usuário autenticado (CurrentUser), quando edito fullName (3–160), displayName (≤ 80), jobTitle (≤ 120), bio (≤ 1000), avatarUrl/coverUrl (https:// ou caminho interno) por PATCH /api/me, então AccountService.update valida e salva com lock otimista (User.version); username é imutável (422 USERNAME_IMUTAVEL); erros voltam como 422 VALIDACAO details.fields; conta DELETION_SCHEDULED → Guard.requireNotDeletionScheduled (403 EXCLUSAO_AGENDADA, D-18).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA02",
        "text": "Dado a troca de e-mail ou telefone (PATCH /api/me/sensitive {currentPassword, email, phone}), então IdentityService.reauthenticate reconfere a senha atual com o mesmo bloqueio do login (login-fail, 6º erro → 429 MUITAS_TENTATIVAS + Retry-After; errada → 401 REAUTENTICACAO_FALHOU; 422 SENHA_ATUAL_INCORRETA é só da troca de senha), o emailHash novo deve ser único (409 EMAIL_EM_USO), emailVerified volta a false, RegistrationService.resendVerification envia o código ao e-mail novo e AuditLog SENSITIVE_DATA_UPDATED grava os campos alterados com e-mail mascarado.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA03",
        "text": "Dado a aba Aparência, quando altero theme (ThemeMode AUTO·CLARO·ESCURO·ALTO_CONTRASTE·BLUEPRINT), language (PT_BR·EN·ES), density, fontScale, reduceMotion, deskSkin (DeskSkin), defaultCardSkin, timezone, wipLimit, aiModeDefault (ECONOMIA·AVANCADO), notificationPrefsJson (inclui dailyTaskAt, RF44.CA10) e dashboardLayoutJson, então o cliente aplica na hora (data-theme, i18n) e persiste por PUT /api/me/preferences (AccountService.updatePreferences, AuditLog PREFERENCES_UPDATED); GET /api/me/preferences devolve os padrões quando ainda não há linha.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA04",
        "text": "Dado a aba Privacidade, quando altero hypeVisibility (PUBLICO·EMPRESA·SO_EU, padrão SO_EU, RF45.CA06) e rankingOptOut (RF43.CA05) no mesmo PATCH /api/me, então valor inválido → 422 details.fields.hypeVisibility, a mudança vale na próxima leitura do perfil/ranking e fica em AuditLog PROFILE_UPDATED (campos alterados, sem valores pessoais).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA05",
        "text": "Dado o upload de avatar ou capa (planejado, D-22), então o arquivo (≤ 5 MB, mime por magic bytes png/jpg/webp, reencode sem EXIF) vira PendingUpload → MediaObject com accessClass PUBLIC, PipelineJob THUMBNAIL gera as variantes e avatarUrl/coverUrl apontam para a variante; o anterior é removido quando substituído.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA06",
        "text": "Dado qualquer alteração de perfil, então AuditLog PROFILE_UPDATED/PREFERENCES_UPDATED com correlationId e, após o commit, o evento UserProfileUpdated (planejado) reindexa a pessoa no OpenSearch ws-people (RF17/RF27) e invalida o cache do cabeçalho do perfil (RF6/RF16); GET /api/users/{id} devolve o UserView público de terceiros (sem e-mail/telefone, Guard.ownerOrAdmin para os campos privados).",
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
        "text": "Dado a troca de e-mail, então ela exige a senha atual com o bloqueio login-fail (IdentityService.reauthenticate: errada → 401 REAUTENTICACAO_FALHOU, 6º erro → 429 MUITAS_TENTATIVAS + Retry-After; real), envia o código ao e-mail novo (real, resendVerification) e um aviso ao antigo (planejado, Q-84); hoje o e-mail novo vale de imediato para login (sem coluna de e-mail pendente — divergência a confirmar); a troca de senha encerra as outras sessões (SESSIONS_REVOKED, real).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA09",
        "text": "Dado a aba Privacidade, então hypeVisibility nasce SO_EU e rankingOptOut false; alterar grava AuditLog PROFILE_UPDATED com os campos alterados (real; o nome PRIVACY_CHANGED do plano não existe em AuditActions) e vale na próxima leitura.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA10",
        "text": "Dado os consentimentos, então existem só para finalidades opcionais (ConsentPurpose: RESUMO_PROFISSIONAL_IA, RF43.CA04; GRAVACAO_REUNIOES_PADRAO); cada uma mostra title, description, legalBasis, article, sensitive, grantedAt, revokedAt, policyVersion (iguais ao OpenAPI, CA24); nunca vem marcada; revogar tem o mesmo esforço que conceder (PUT /api/me/consents/{purpose} {granted}).",
        "note": "CA a confirmar, Q-67",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA11",
        "text": "Dado conceder ou revogar, então grava-se consent_events (append-only) e o estado em user_consents, mais AuditLog CONSENT_GRANTED ou CONSENT_REVOKED; o histórico aparece na aba.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA12",
        "text": "Dado o enum ConsentPurpose, então cada valor tem um ponto de verificação em ConsentChecks; ConsentCoverageTest falha o CI para finalidade sem checagem, e finalidade sem uso não aparece na tela.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA13",
        "text": "Dado \"Quais dados temos\" (art. 9º; art. 18 I e II), então a página lista, por categoria, finalidade, base legal, retenção e compartilhamento (IA mascarada, Google Workspace, Microsoft 365), tudo vindo do PersonalDataRegistry (GET /api/me/data-map).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA14",
        "text": "Dado \"Exportar meus dados\", então POST /api/me/exports cria DataExportRequest REQUESTED e enfileira PipelineJob DATA_EXPORT; limite 3 por dia por pessoa (RateLimitPort, 429 LIMITE_EXPORTACOES); GET /api/me/exports lista com requestedAt e expiresAt.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA15",
        "text": "Dado a exportação pronta, então o arquivo tem nome e tipo corretos (.json + application/json, ou ZIP real), sai no idioma da pessoa, fica em restricted/users/{userId}/exports/, só o dono baixa (OwnMedia, 403), expira em 7 dias (410 EXPORTACAO_EXPIRADA) e há notificação quando pronta.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA16",
        "text": "Dado o conteúdo, então inclui perfil, preferências, aceites, consentimentos; sessões, lotações; tarefas e projetos próprios e as próprias mensagens do DECIA; decisões, pontos, reconhecimentos; inferências de IA e auditoria sobre a pessoa.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA17",
        "text": "Dado uma entidade com coluna de pessoa, então ela está no PersonalDataRegistry ou em EXCLUDED_WITH_REASON; PersonalDataRegistryCoverageTest falha o CI para entidade nova sem classificação.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA18",
        "text": "Dado \"Outros direitos\", então a pessoa abre DataSubjectRequest de revisão de decisão automatizada (art. 20: HSE, ranking, Hype, classificação IA), oposição e informação sobre compartilhamento; cada pedido tem dueAt, status, encarregado e AuditLog DSR_OPENED; o canal (WS_LEGAL_DPO_CONTACT) aparece na aba.",
        "note": "CA a confirmar, Q-71",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA19",
        "text": "Dado \"Encerrar minha conta\", então o pedido exige a senha atual com bloqueio (real: POST /api/me/deletion {currentPassword, reason}, AuditLog ACCOUNT_DELETION_REQUESTED, deletionScheduledAt = +30 d, DeletionReceipt.cancelable); antes de confirmar, o Dialog mostra o que será anonimizado e o que fica (planejado); já agendada → 409 EXCLUSAO_AGENDADA.",
        "note": "CA a confirmar, Q-68",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA20",
        "text": "Dado DELETION_SCHEDULED, então o login devolve warnings com a data (real), o Banner mostra a data e o botão cancelar (DELETE /api/me/deletion, real, ACCOUNT_DELETION_CANCELLED; sem agendamento → 409 EXCLUSAO_NAO_AGENDADA), editar o perfil recebe 403 EXCLUSAO_AGENDADA (Guard.requireNotDeletionScheduled, real) e criar conteúdo receberá o mesmo 403 quando as rotas existirem (D-18); o pedido também encerra as outras sessões.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA21",
        "text": "Dado o prazo vencido, então o AccountAnonymizationJob roda por @Scheduled com lock (ShedLock); teste 1 prova o agendamento; teste 2 (Testcontainers) prova a anonimização no MySQL, S3 restricted/, Cassandra e OpenSearch, a revogação das sessões e ACCOUNT_DELETION_COMPLETED, mantendo policy_acceptances, consent_events e documentos públicos.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA22",
        "text": "Dado as abas Sessões e Termos e políticas, então a primeira lista refresh_tokens por família (deviceName, createdIp, lastUsedAt, atual) com revogação, e a segunda mostra por documento a versão aceita, data, canal e link para a vigente (GET /api/me/policies).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA23",
        "text": "Dado qualquer controle, então valem os padrões LGPD: privacidade por padrão, aceitar e recusar com o mesmo destaque, sem texto que constranja quem recusa, foco visível, teclado e reduceMotion.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA24",
        "text": "Dado o contrato front/back, então os tipos TypeScript são gerados do OpenAPI (springdoc → openapi-typescript) e o CI falha se o gerado divergir do commitado ou se o front ler um campo que o back não declara (D-21).",
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
    "summary": "A tarefa (TaskItem, TAXONOMIA §2.1) é a unidade mínima do Work Station (= peça de roupa). O título do card destaca o que o corpo (RF20) detalha em 5 etapas: (1) Fonte — a aba escolhida define SourceKind e o TaskType sugerido; (2) Detecção por IA — AiEngine capability PREENCHER_TAREFA pré-preenche com confiança por campo e faísca ✦ (pulada no modo Manual ou quando a IA falha, CA03); (3) Dados da tarefa — taxonomia oficial, prazo legal (LegalDeadlineRule), órgão (OrgEntity via busca web); (4) Mais detalhes — chancelas sugeridas (RF39), visibilidade, estado inicial, situação do documento, protocolo, guarda, Balcão (RF40), tags, dependências, projeto/fase; (5) Arte do card — thumbnail assíncrono (RF38/RF11). Antivírus, OCR e thumbnail rodam como PipelineJob após o commit e a tarefa entra no Acervo (RF6/RF41).",
    "route": "Criar Tarefa (/tasks/new; folha \"+ Criar\" do SidebarNav; botão \"Cadastrar nova tarefa\" do Criador de Projetos, RF5); API POST /api/tasks, POST /api/tasks/uploads, POST /api/tasks/detect, GET /api/org-entities/search, GET /api/legal-deadlines/compute",
    "coverage": "RF20.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 · CA15 — corpo do card = card RF20 (o card RF4 está vazio; o criador de tarefas está descrito no corpo do card RF20, cujos CAs são citados aqui como estão escritos; ver RENUMERACAO.md). Nenhuma classe deste RF existe ainda no código: tudo (planejado), exceto os transversais do Bloco 1–3 (SecurityConfig, CorrelationIdFilter, Guard, AuditLogPort, AuthRateLimitFilter, S3StorageConfig, AiProvidersConfig).",
    "cas": [
      {
        "id": "RF20.CA01",
        "text": "UploadService, MediaStoragePort, AntivirusPort, MediaObject, ExternalDocPort",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA02",
        "text": "TaskDetectionService, AiEngine (PREENCHER_TAREFA), AiInferenceLog, TaskItem.aiConfidenceJson/aiGenerated",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA03",
        "text": "TaskDetectionService (fallback vazio)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA04",
        "text": "TaskCreationService.create/validate, TaskRepositoryPort, ProjectTask (RF5)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA05",
        "text": "TaskCreationService.createBatch, TaskType.PASTA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA06",
        "text": "TaskCreationService.fromPaste, SourceKind.COLAR",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA07",
        "text": "ExternalDocPort.watch, TaskVersion, LinkMode, PipelineJob SYNC_EXTERNO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA08",
        "text": "TaskCreationService.fromEmail, EmailInboundAdapter, TaskAttachment",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA09",
        "text": "TaskCreationService.fromProtocol, ProtocolPort, TaskType.PROTOCOLO, TaskItem.protocolNumber",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA10",
        "text": "OrgEntityLookupService, OrgLookupPort, OrgEntity",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA11",
        "text": "DeadlineService, LegalDeadlineRule, TaskItem.legalDueAt/legalOverrideReason",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA12",
        "text": "OcrPort, PipelineJob OCR (REPROCESSAR), TaskAttachment.ocrStatus",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA13",
        "text": "SealSuggestionService, SealBond SUGERIDA→ACEITA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA14",
        "text": "TaskCreationService.validate, GlobalExceptionHandler (ApiError.details)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF20.CA15",
        "text": "ModelOffer, TaskItem.offeredInCounter",
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
    "summary": "O Esquema de Projeto (ProjectScheme, TAXONOMIA §3.1) é a composição ordenada de tarefas (ProjectTask) por 7 fases (ProjectPhase: DEMANDA · PLANEJAMENTO · ELABORAÇÃO · ANÁLISE · APROVAÇÃO · EXECUÇÃO · ENCERRAMENTO). Os selects de cada fase listam somente as unidades de tarefa do Acervo do usuário (RF6/RF41) compatíveis com a fase (mapa categoria → fase, PhaseCompatibility, como SLOT_BY_CATEGORY do FAI): Ofício/Protocolo → DEMANDA; ETP/TR/Cronograma → PLANEJAMENTO; Projeto básico/Planilha/Parecer → ELABORAÇÃO/ANÁLISE; Ata/Portaria → APROVAÇÃO; Contrato/Vistoria → EXECUÇÃO; Relatório final → ENCERRAMENTO; OUTRO em qualquer fase. Layout: Acervo filtrável (esquerda) · slots por fase (centro, SelectList + arrastar) · Ficha do projeto (direita: título, emoji, objetivo, processo ≤ 2, natureza ≤ 2, departamento, exercício, programa RF25, eixo RF24, prioridade, visibilidade herdada do perfil RF3, Manual / Com IA, orientação livre, foto, chancelas vindas das tarefas RF39, pré-visualização com capa-mosaico e PhaseBar RF38).",
    "route": "Criar Projeto (/projects/new; folha \"+ Criar\"); API POST /api/projects, PUT /api/projects/draft, GET /api/me/tasks?phase=&q= (selects), POST /api/projects/compose-ai, POST /api/projects/from-model/{id}, POST /api/projects/{id}/publish, POST /api/projects/{id}/decia-session (RF29)",
    "coverage": "RF21.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 — corpo do card = antigo RF21 (o card RF5 traz os CAs escritos como RF21.CA01–14 e são citados como estão no board; ver RENUMERACAO.md). Todas as classes do RF são (planejado); transversais reais do Bloco 1–3: SecurityConfig, SessionActiveFilter, Guard, CorrelationIdFilter, AuditLogPort, RedisAdaptersConfig, AiProvidersConfig.",
    "cas": [
      {
        "id": "RF21.CA01",
        "text": "PhaseCompatibility.optionsFor, TaskRepositoryPort.findMine",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA02",
        "text": "PhaseCompatibility (contagem), EmptyState",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA03",
        "text": "PhaseCompatibility.phasesFor/optionsFor, TaskOption.disabledReason, TaskRepositoryPort.findSharedWithMe",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA04",
        "text": "ProjectCompositionService.create/resolveDefaults, ProjectTask, TaskStateMachine, SchemeOrigin.CRIAR_PROJETO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA05",
        "text": "ProjectCompositionService.validateMinimum",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA06",
        "text": "ProjectAutopilotService, AiEngine (COMPOR_PROJETO), AiInferenceLog, SchemeOrigin.AUTOPILOTO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA07",
        "text": "SelectList.onCreateNew, TaskCreationService (RF4)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA08",
        "text": "DependencyGraph.assertNoCycle/assertDatesConsistent/criticalPath, ProjectTaskDependency, ProjectScheme.criticalPathJson",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA09",
        "text": "ProjectCompositionService.applySealsFromTasks, SealBond, ProjectScheme.sealIdsJson",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA10",
        "text": "MosaicService, ProjectScheme.coverMode/coverUrl/mosaicJson",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA11",
        "text": "ProjectCompositionService.publish, MuralPort, ProjectStatus.PUBLICADO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA12",
        "text": "DeciaBridgeService.openSessionFromProject, DeciaSession.linkedProjectId, ProjectStatus.EM_DECISAO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA13",
        "text": "ModelImportService.fromModel, ProcessKit, KitItem, SchemeOrigin.MODELO, Remix",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF21.CA14",
        "text": "DraftService, DraftStorePort, ProjectScheme.autosaveDraftJson",
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
    "summary": "O Plano Anual (AnnualPlan, = DNA de Estilo) tem 6 eixos (PlanAxis) com meta, indicador e cor; projetos entram nos eixos por PlanAxisProject (1 eixo por plano). O plano da EMPRESA é o oficial; CHEFE e EMPREGADO derivam (derivedFromPlanId). A IA só interpreta números calculados pelo sistema (D-12): aggregatedRisk vem de ComplianceResult/ProjectScenario (RF31/RF32) e os insights da aba (Insight com scope EQUIPE) citam MetricSnapshot.",
    "route": "Plano Anual (/plans, /plans/new, /plans/[id], /plans/compare?a=&b=) + visão da equipe em /departments/[slug] (sub-aba Plano Anual, RF28) e /insights › Equipe (RF43)",
    "coverage": "RF24.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 (corpo do card) — regra: o título do card define o RF; o corpo contém os CAs do Plano Anual (RF24.CA01–07). O título acrescenta \"insights analíticos gerados por IA\": cobertos pelo CA03 (risco agregado da IA) e pelo CA07 (IA do DECIA cita o eixo e sinaliza projetos sem eixo), com apoio dos insights de equipe do RF43 §4 (citados, não reescritos aqui).",
    "cas": [
      {
        "id": "RF24.CA01",
        "text": "AnnualPlan, PlanAxis (6, position 1..6), PlanService.create",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA02",
        "text": "PlanAxisProject, ProjectScheme.planAxisId, PlanService.linkProject",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA03",
        "text": "PlanAxis.projectsCount/completedPct/nearestDueAt/aggregatedRisk, AxisAggregationService, ComplianceResult, ProjectScenario",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA04",
        "text": "AnnualPlan.derivedFromPlanId, PlanScope, PlanService.derive",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA05",
        "text": "CompareBucket, PlanService.compare",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA06",
        "text": "Reaction/Comment/SavedItem/Share com TargetType PLAN, SealBond tier PLANO, AnnualPlan.visibility/coverUrl",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF24.CA07",
        "text": "DeciaSession.planAxisId, AnalyticalSummary.recommendationsJson[].planAxisId, Insight PROJETO_SEM_EIXO, PlanService.projectsWithoutAxis",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF25",
    "n": 25,
    "title": "Agrupar projetos e tarefas em Programas, Exercícios e Gestões (agrupamentos institucionais)",
    "hu": null,
    "summary": "Tipos (GroupingType): PROGRAMA (= coleção, EMPRESA/CHEFE), EXERCICIO (= temporada, ano orçamentário), GESTAO (= era, período de um chefe ou de uma gestão), FRENTE (= linha de estilo; a única que o EMPREGADO cria, pessoal). Um projeto aponta direto para até três agrupamentos (ProjectScheme.programGroupingId / exerciseGroupingId / managementGroupingId) e GroupingItem registra qualquer item (PROJECT · TASK). Encerrar uma GESTAO dispara o Dossiê de Transição (RF36) por evento AFTER_COMMIT.",
    "route": "sub-aba Programas & Agrupamentos do perfil (/profile?tab=programas, /u/[username]?tab=programas), página do agrupamento (/groupings/[id]), páginas da empresa/departamento (/companies/[slug], /departments/[slug], RF28)",
    "coverage": "RF25.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF25.CA01",
        "text": "Grouping (type, label, periodFrom/To, coverUrl, description), GroupingType, GroupingService.create, Guard.requireRole",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA02",
        "text": "GroupingItem, ProjectScheme.programGroupingId/exerciseGroupingId/managementGroupingId, GroupingService.addItem",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA03",
        "text": "GroupingProgressService.aggregate/decisionTimeline, DecisionTraceNode",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA04",
        "text": "SearchIndexPort.indexGrouping, InstitutionalMemoryDocument, páginas RF28",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF25.CA05",
        "text": "Grouping.closedAt/handoffDossierId, DomainEvents GroupingClosed, HandoffService.generateForGrouping, HandoffDossier",
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
    "summary": "RF26.CA01 Em /autopilot, no criador de tarefas e na Mesa, o botão Sugerir com o Copilot recebe uma frase, e-mail, protocolo ou o contexto atual (projeto aberto, acervo, perfil) e devolve N tarefas em rascunho (tipo, categoria, prazo legal, responsável, dependências) — nada vira DISPONÍVEL sem revisão (= RF43.CA07).",
    "route": "Copilot em /autopilot (sugestões de tarefas e projetos, estende RF30/RF43 §7) e botão Sugerir com o Copilot em /tasks/new, /projects/new e na Mesa (/desk); corpo do card: Meu perfil (/profile, /u/[username])",
    "coverage": "RF19.CA01 … RF19.CA07 (citados como estão escritos — corpo do card = antigo RF19, perfil/portfólio) + RF26.CA01 … RF26.CA05 (CA a confirmar), derivados do título + HU26 (Copilot que sugere tarefas e projetos inteiros) — regra: o título do card define o RF; título e corpo divergem (RENUMERACAO.md).",
    "cas": [
      {
        "id": "RF19.CA01",
        "text": "User, ProfileService.self, contadores",
        "note": "corpo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF19.CA02",
        "text": "ProfileService.ofUser, Visibility, HypeVisibility",
        "note": "corpo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF19.CA03",
        "text": "filtros e paginação por sub-aba (querystring)",
        "note": "corpo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF19.CA04",
        "text": "DailyTask único (userId, taskDate)",
        "note": "corpo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF19.CA05",
        "text": "DeliberativeProfile.deltaJson",
        "note": "corpo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF19.CA06",
        "text": "sub-abas institucionais EMPRESA/CHEFE",
        "note": "corpo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF19.CA07",
        "text": "i18n pt-BR/en/es, responsivo",
        "note": "corpo",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA01",
        "text": "Em /autopilot, no criador de tarefas e na Mesa, o botão Sugerir com o Copilot recebe uma frase, e-mail, protocolo ou o contexto atual (projeto aberto, acervo, perfil) e devolve N tarefas em rascunho (tipo, categoria, prazo legal, responsável, dependências) — nada vira DISPONÍVEL sem revisão (= RF43.CA07).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA02",
        "text": "O Copilot sugere projetos inteiros (até 5 candidatos ordenados por viabilidade) a partir de eixos do plano sem projeto, lacunas do acervo e decisões DECIA sem projeto, cada um com Ficha de Viabilidade (= RF43.CA08, RF30.CA02).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA03",
        "text": "Cada sugestão carrega a faísca ✦, a explicação (\"baseado em: eixo X, modelo chancelado Y, sessão Z\") e o AiInferenceLog; o usuário aceita, edita ou descarta (descartar exige motivo, que alimenta as próximas sugestões).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA04",
        "text": "Tarefas RESTRITO/SIGILOSO no contexto nunca saem para provedor externo (só LocalEngine, com aviso); sem chave externa o Copilot usa regras + modelos chancelados e avisa o fallback (= RF30.CA05, RF43.CA02).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF26.CA05",
        "text": "Aceitar cria TaskItem RASCUNHO com sourceKind AUTOPILOT ou ProjectScheme RASCUNHO com origin AUTOPILOTO e abre o item no criador correspondente (RF4/RF5) ou na Mesa (RF22); cota de IA (AiQuota) é debitada e, sem cota, o botão oferece a Loja (RF42.CA06).",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF27",
    "n": 27,
    "title": "Navegar no Mural (mural da empresa e vitrine de projetos) e Buscar projetos, tarefas, pessoas, empresas e chefes de departamento",
    "hu": null,
    "summary": "O Mural é a projeção cronológica MuralEntry (MySQL) espelhada em Cassandra timeline_by_user (flag cassandra.enabled; sem a flag, consulta MySQL paginada). A Busca é textual (OpenSearch ws-tasks, ws-projects, ws-users, ws-companies; OCR de anexos em TaskAttachment.ocrTextRef) e, opcionalmente, semântica via Memória Institucional (ws-memory, RF33). Toda leitura passa pelo filtro de visibilidade e perfil (VisibilityFilter: itens de outra empresa só se PUBLICA). Seguir é Follow único por (followerId, targetType, targetId).",
    "route": "Mural (/mural, sub-abas Mural da empresa · Vitrine de projetos · Seguindo) e Buscar (/search?q=&tab=PROJETOS|TAREFAS|PESSOAS|EMPRESAS|CHEFES)",
    "coverage": "RF27.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF27.CA01",
        "text": "MuralService.company/showcase/following, TimelinePort.page (20 por página)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA02",
        "text": "SocialService.react, Reaction, MuralItemView.actions",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA03",
        "text": "SearchService.search, SearchIndexPort.search, TaskAttachment.ocrTextRef, contadores por aba",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA04",
        "text": "VisibilityFilter.allowedFor, Visibility, Guard.requireSameCompany",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA05",
        "text": "SearchService.similar, InstitutionalMemoryDocument, AiEngine MEMORIA_BUSCA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF27.CA06",
        "text": "Follow (único), FollowService.follow/unfollow, Notification, fan-out TimelineEvent",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF28",
    "n": 28,
    "title": "Gerir perfis de empresa e chefe de departamento (departamentos, página institucional, chancela de tarefas/projetos e emissão de reconhecimentos)",
    "hu": null,
    "summary": "Perfis: EMPREGADO (= PESSOAL), EMPRESA (= MARCA), CHEFE_DEPARTAMENTO (= CELEBRIDADE), ADMIN; papel contextual CURADOR (CuratorAppointment). EMPRESA e CHEFE nascem PENDING_VALIDATION e passam pelo ADMIN (ApprovalRequest + VerificationPolicy). A EMPRESA cria Departments e lota pessoas (DepartmentMembership, 1 lotação ativa por vez, histórico preservado). A troca de chefe (Department.headUserId) move sessões DECIA, filas de revisão e chancelas pendentes e gera o Dossiê de Transição (RF36). O que já existe em código (sec-b3): User com profileType/status/verified, ProfileType, AccountStatus, Guard.requireRole/ownerOrAdmin, AuditLogPort; Company, Department e o restante são planejados (users.company_id/department_id sem FK até a migration deste RF, D-23).",
    "route": "Empresas & Departamentos (/companies, /companies/[slug], /companies/[slug]/manage, /companies/[slug]/manage/departments, /departments/[slug], /departments/[slug]/team), painel do emissor (/issuer/dashboard), fila do ADMIN (/admin/approvals), central de validação da pessoa (/settings?tab=validacao)",
    "coverage": "RF28.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 (corpo do card, inalterado) + RF28.CA09 … CA17 (CA a confirmar, D-19 — validação institucional com VerificationPolicy versionada, §7) — regra: o título do card define o RF e o corpo traz os próprios CAs; o fluxo de chancelas em si está no RF39 e o Balcão no RF40.",
    "cas": [
      {
        "id": "RF28.CA01",
        "text": "User.profileType/status, ApprovalRequest, ApprovalService.decide, Guard.requireRole, AdminApprovalController.POST_api_admin_approvals_userId",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA02",
        "text": "Department, DepartmentMembership (1 ativa, histórico), CompanyService.createDepartment/assignMember",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA03",
        "text": "CuratorAppointment, CuratorScope, DepartmentService.appointCurator/revokeCurator, AuditLog CURATOR_APPOINTED/REVOKED",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA04",
        "text": "CompanyService.publicPage, DepartmentService.publicPage, Follow (RF27.CA06), MetricSnapshot (métricas públicas)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA05",
        "text": "Recognition, RecognitionService.issue, MuralEntry RECONHECIMENTO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA06",
        "text": "IssuerDashboardService.load, MetricSnapshot, AiInferenceLog (custo de IA), SealBond (fila), BenefitRedemption",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA07",
        "text": "Department.headUserId, CompanyService.changeHead, DomainEvents HeadChanged, HandoffDossier TROCA_CHEFE",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF28.CA08",
        "text": "Guard.requireIssuerOrCurator, Guard.requireRole",
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
        "text": "Dado o pedido, então o prazo é contado em dias úteis (proposta: 3 para a 1ª análise, 2 para reanálise, 30 dias corridos para a pessoa responder a AJUSTES; Q-71) a partir de emailConfirmedAt; antes da confirmação do e-mail a conta não entra na fila.",
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
        "text": "Dado APROVADO, então para EMPRESA o sistema cria a Company com ownerUserId = a pessoa, legalName, cnpj e websiteUrl vindos da extensão; para CHEFE exige antes a confirmação do chefe atual ou do dono da EMPRESA (confirmedBy) e então define Department.headUserId e abre DepartmentMembership CHEFE. User.status → ACTIVE, verified = true.",
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
    "summary": "O Rastro de Decisão (DecisionTrace) é um grafo append-only — DecisionTraceNode (MENSAGEM · CLASSIFICACAO · DIVERGENCIA · PERGUNTA · RESUMO · CENARIO · DECISAO · REVISAO · TAREFA · PROJETO · ARTEFATO · ATA_VIVA · CONFORMIDADE) e DecisionTraceEdge (ORIGINOU · CLASSIFICOU · RESPONDEU · RESUMIU · DECIDIU · REVISOU · TRANSFORMOU_EM · ANEXOU · VERIFICOU) — gravado no MySQL e espelhado em Cassandra trace_by_entity (flag cassandra.enabled). Renderiza-se como o fio de decisão (DecisionThread, RF38.CA07): linha vertical, nós coloridos por classLabel (ARGUMENTO azul · DIVERGENCIA laranja · RISCO vermelho · CONSENSO verde · PERGUNTA roxo), carimbo VALIDADO/DEVOLVIDO no fim (Stamp). Imutável: nenhuma API de UPDATE/DELETE; exclusão de tarefa mantém o nó via snapshotJson (RF23).",
    "route": "botão Abrir sessão DECIA no projeto (/projects/[id], Mesa /desk), sessão (/decia/[sessionId]: composer com anexos do acervo, ação \"Transformar em tarefa\", \"Criar projeto a partir desta sessão\"), painel Por que isto existe? em /tasks/[id] e /projects/[id], indicador em /admin/dashboard (RF18)",
    "coverage": "RF29.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. A sessão em si (tema, mensagens, classificação, resumo, decisão, revisão) está em docs/produto/DECIA_SESSAO_E_MESA.md e nos PlantUML docs/produto/decia/*.puml; aqui só a ponte com o Criador de Projetos e o Rastro de Decisão.",
    "cas": [
      {
        "id": "RF29.CA01",
        "text": "DeciaBridgeService.openSessionFromProject, DeciaSession.linkedProjectId/topic, ProjectStatus EM_DECISAO, nó PROJETO → ANEXOU → SESSAO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA02",
        "text": "DeciaBridgeService.createProjectFromSession, SchemeOrigin DECIA, ProjectScheme.sourceSessionId, SessionArtifact.convertedTaskId",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA03",
        "text": "MessageAttachment (≤ 5, snapshotJson), DeciaBridgeService.attachToMessage, Guard.requireParticipant",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA04",
        "text": "DeciaBridgeService.transformMessageIntoTask, MessageClassification.label, TaskItem sourceKind DECIA, ProjectTask.phase, aresta TRANSFORMOU_EM",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA05",
        "text": "DeciaBridgeService.onDecisionReviewed, FinalDecision.resultingTaskId/stampJson, DecisionReview.outcome/reason, TaskType ATA_REGISTRO, fase APROVACAO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA06",
        "text": "DecisionTraceService.thread, DecisionTraceNode.classLabel/actorId/at, DecisionTraceEdge",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA07",
        "text": "append-only (sem UPDATE/DELETE), DecisionTraceService.export, snapshotJson, PipelineJob EXPORT_PDF",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA08",
        "text": "AnalyticalSummary.recommendationsJson[].affectedTaskIds/affectedProjectIds/planAxisId, SummaryService",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF29.CA09",
        "text": "MetricCalculator.decisionsWithTrace, view vw_decisions_with_trace, MetricSnapshot",
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
    "summary": "Fluxo: demanda (texto, ofício/e-mail colado ou TaskItem DOCUMENTO do acervo) → AiEngine capability AUTOPILOT_PROJETO extrai objetivo, prazo, departamento provável e categoria (CA01) → compõe fases, tarefas, dependências, responsáveis sugeridos e prazos remixando modelos chancelados (SealBond APROVADA, ModelOffer shelf CHANCELADO) e projetos semelhantes da Memória Institucional (RF33) com crédito a cada modelo (ProjectScheme.originalProjectId, TaskItem.originalTaskId, Remix) (CA02) → proposta mostrada na Mesa em rascunho não persistido (ProjectDraft em Redis com TTL; flag redis.enabled, fallback em memória) até o usuário confirmar (CA03) → ProjectScheme origin AUTOPILOTO, faísca ✦ e AiInferenceLog (CA04). Sem chave externa: LocalEngine (regras + modelos chancelados) com aviso (CA05).",
    "route": "Autopiloto (/autopilot), proposta aberta na Mesa em modo rascunho (/desk?draft=), botão Abrir sessão DECIA sobre a proposta (RF29)",
    "coverage": "RF30.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. O RF43 §7 estende o Autopilot (tarefas em lote e Ficha de Viabilidade); o RF26 (Copilot) é a porta de entrada nos criadores.",
    "cas": [
      {
        "id": "RF30.CA01",
        "text": "AutopilotService.extractDemand, DemandInput (texto · colado · TaskItem DOCUMENTO), AiCapability AUTOPILOT_PROJETO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA02",
        "text": "AutopilotService.compose, ModelCatalog.chanceladosFor/similarProjects, SealBond APROVADA, ModelOffer CHANCELADO, Remix, ProjectTaskDependency, CriticalPathService",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA03",
        "text": "ProjectDraft, DraftCachePort (TTL, nada no MySQL), AutopilotService.editDraft",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA04",
        "text": "SchemeOrigin AUTOPILOTO, ProjectScheme.aiGenerated/aiInferenceId, AiInferenceLog (modelo, custo, latência, modelos de referência)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA05",
        "text": "LocalEngine, AiInferenceLog.fallbackUsed, aviso no front",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF30.CA06",
        "text": "AutopilotService.openSessionOnDraft, DeciaBridgeService.openSessionFromDraft",
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
    "summary": "Um ProjectScenario guarda as variáveis (variablesJson: budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps, supplierSwaps, scopeChangeText) e o relatório de impacto (impactReportJson) no mesmo formato dos cenários do resumo analítico (RF11, SummaryScenario). O recálculo de linha do tempo, caminho crítico e risco por fase é determinístico (CriticalPathService, RiskMatrixService, D-12); a IA (SIMULAR_CENARIO) só redige vantagens/desvantagens e cruza com o Espelho (RF32). Salvar cria uma variante (não altera o original); aplicar gera ProjectVersion com sourceScenarioId (RF22). Compartilhar na sessão cria MessageAttachment tipo SCENARIO e SummaryScenario.linkedProjectScenarioId.",
    "route": "Simulador de Cenários (/projects/[id]/simulate, comparação ?compare=a,b,c), compartilhar na sessão (/decia/[sessionId], RF29)",
    "coverage": "RF31.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF31.CA01",
        "text": "ProjectScenario.variablesJson (budgetDeltaPct, scheduleDeltaDays, removedTaskIds, addedTasksJson, responsibleSwaps, supplierSwaps, scopeChangeText), ScenarioService.create",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA02",
        "text": "CriticalPathService, RiskMatrixService, ComplianceService.evaluate, impactReportJson (formato SummaryScenario), AiCapability SIMULAR_CENARIO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA03",
        "text": "ScenarioService.compare/save/apply, ScenarioStatus SALVO/APLICADO, ProjectVersion.sourceScenarioId",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA04",
        "text": "ScenarioService.shareInSession, MessageAttachment SCENARIO, sharedInSessionId, SummaryScenario.linkedProjectScenarioId, FinalDecision.chosenScenarioId, nó CENARIO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF31.CA05",
        "text": "AiInferenceLog (faísca ✦), LocalEngine (prazo/caminho crítico sem IA externa)",
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
    "summary": "ComplianceChecklist (por processTag, empresa ou departamento, com legalBasis, ex.: Lei 14.133/2021) tem ComplianceItems (OBRIGATORIO · RECOMENDADO, expectedPhase, expectedCategory, expectedType, mustPrecedeItemId). Abrir o Espelho gera um ComplianceResult (itemsJson com ATENDIDO · RECOMENDADO_AUSENTE · OBRIGATORIO_AUSENTE · FORA_DE_ORDEM, percent, blockingCount). O cruzamento é determinístico (ComplianceService); a IA (CONFORMIDADE) só sugere qual tarefa atende cada item e redige a explicação ✦. O selo (%) vai para ProjectScheme.conformityPercent/hasBlockingPending; a passagem para APROVACAO com ⛔ pendente exige justificativa do chefe (overrideByUserId/overrideReason, autoridade humana). O resultado entra no resumo analítico (AnalyticalSummary.complianceResultId) e no rastro (nó CONFORMIDADE → VERIFICOU).",
    "route": "Espelho de Conformidade (/projects/[id]/mirror), gestão de checklists na página da empresa/departamento (/companies/[slug]/manage/checklists, /departments/[slug]/checklists), selo de conformidade no ProjectCard",
    "coverage": "RF32.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF32.CA01",
        "text": "ComplianceChecklist, ComplianceItem (requirement, expectedPhase, mustPrecedeItemId), ChecklistService.create/update, Guard.requireRole/requireDeptHead",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA02",
        "text": "ComplianceService.evaluate, ComplianceResult.itemsJson (ItemStatus), AiCapability CONFORMIDADE",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA03",
        "text": "ComplianceService.createMissingTask, TaskItem.checklistItemId, ProjectTask.phase = expectedPhase",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA04",
        "text": "ProjectScheme.conformityPercent/hasBlockingPending, ComplianceService.gateToApproval/override, overrideByUserId/overrideReason, AuditLog COMPLIANCE_OVERRIDE",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA05",
        "text": "AnalyticalSummary.complianceResultId, nó CONFORMIDADE + aresta VERIFICOU, DomainEvents ComplianceEvaluated",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF32.CA06",
        "text": "Guard (chefe revisor lê, não edita), ComplianceService.createMissingTask 403 para revisor",
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
    "summary": "Índice OpenSearch ws-memory (InstitutionalMemoryDocument: sourceType SESSAO · ARTEFATO · DECISAO · PROJETO · TAREFA · DOCUMENTO, embedding dense_vector, metadados empresa/departamento/categoria/exercício/autor/data, visibility, accessClass). Indexação assíncrona por PipelineJob INDEXAR_MEMORIA disparado AFTER_COMMIT quando algo é encerrado/publicado (sessão ARQUIVADA, artefato, decisão VALIDADA, projeto CONCLUIDO, tarefa MODELO_PUBLICO, documento indexável); falha não bloqueia o negócio (PipelineJob FALHA/REPROCESSAR, log em ai_inference_log). Toda consulta passa pelo filtro de visibilidade/perfil; RESTRITO/SIGILOSO nunca é embeddado por provedor externo (só LocalEngine). Respostas carregam Citation[] (sourceType, sourceId, excerpt, url, score); vazio = \"sem precedente\". Flag opensearch.enabled; sem ela, /memory mostra EmptyState \"índice desligado\" e a IA marca tudo \"sem precedente\".",
    "route": "Memória Institucional (/memory: pergunta em linguagem natural, explorador visual por departamento/categoria/exercício), citações dentro da sessão (/decia/[sessionId]), \"projetos parecidos\" em /search (RF27.CA05), indicador em /admin/dashboard (RF18)",
    "coverage": "RF33.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. Base do objetivo 3 (justificativa rastreável correlacionada à base de conhecimento institucional).",
    "cas": [
      {
        "id": "RF33.CA01",
        "text": "InstitutionalMemoryDocument (sourceType, metadados), MemoryIndexer.onClosedOrPublished/index, PipelineJob INDEXAR_MEMORIA, DeciaSession.indexedInMemory",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA02",
        "text": "MemoryService.ask, Citation (excerpt, url, score), MemoryQuery, VisibilityFilter",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA03",
        "text": "CitationService.citeFor/markNoPrecedent, AnalyticalSummary.recommendationsJson[].citations, AiQuestion.citationsJson, FinalDecision.citationsJson",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA04",
        "text": "MemoryService.explore/similar, facets departamento/categoria/exercício, RF27.CA05",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA05",
        "text": "MetricCalculator.decisionsWithSources, view vw_decisions_with_sources, MetricSnapshot",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF33.CA06",
        "text": "DomainEvents AFTER_COMMIT, PipelineJob FALHA/REPROCESSAR, AiInferenceLog ERRO",
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
    "summary": "ExtractionResult (kind QUANTITATIVOS · ITENS_PRAZOS · ESTRUTURAL; rowsJson com confiança por linha; layersJson; status ExtractionStatus PROCESSANDO · PRONTA · REVISADA · CONVERTIDA · FALHA) nasce de uma TaskItem DESENHO_TECNICO (.dwg/.dxf/.ifc) ou DOCUMENTO (.pdf/.docx). A leitura estrutural (camadas/blocos/entidades, OCR) é feita pelo platform (parsers + OCR) e pelo LocalEngine; a interpretação semântica (item, unidade, quantidade, datas, responsáveis) usa AiEngine capabilities EXTRAIR_DESENHO/EXTRAIR_DOCUMENTO; sem provedor externo só a estrutural, com aviso (CA06). O arquivo passa por OwnMedia (restricted/ quando RESTRITO/SIGILOSO), magic bytes, limite por formato e teto de pixels antes de alocar (SEG). Correções do usuário (ExtractionCorrection) ficam por departamento e alimentam as próximas extrações (few-shot/regras locais). Converter cria TaskItem PLANILHA (PLANILHA_ORCAMENTARIA) ou CRONOGRAMA com sourceKind EXTRACAO, originalTaskId = tarefa de origem, faísca ✦, e ProjectTask no mesmo projeto.",
    "route": "ação Extrair com IA no detalhe da tarefa DESENHO_TECNICO / DOCUMENTO (/tasks/[id], painel ExtractionPanel), visualizador 3D (/tasks/[id]/viewer), resultado vira tarefa PLANILHA/CRONOGRAMA no mesmo projeto (RF4/RF5)",
    "coverage": "RF34.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF34.CA01",
        "text": "ExtractionService.extractQuantities, StructuralReader.readCad/readIfc, ExtractionResult.rowsJson (item, unidade, quantidade, área/volume, confiança), ExtractionKind QUANTITATIVOS",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA02",
        "text": "ExtractionService.extractItemsAndDeadlines, StructuralReader.readPdf, OcrPort, ExtractionKind ITENS_PRAZOS",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA03",
        "text": "ExtractionService.convert, TaskService.createDerived, TaskType PLANILHA/CRONOGRAMA, SourceKind EXTRACAO, originalTaskId, ProjectTask, derivedTaskId",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA04",
        "text": "ExtractionService.review, ExtractionCorrection (departmentId), exemplos nas próximas extrações",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA05",
        "text": "ExtractionService.captureFromViewer, Evidence, UploadGuard, tarefa IMAGEM_EDITADA (RF4)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF34.CA06",
        "text": "AiInferenceLog (modelo, custo, latência), LocalEngine (estrutural sem semântica), ExtractionKind ESTRUTURAL, aviso",
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
