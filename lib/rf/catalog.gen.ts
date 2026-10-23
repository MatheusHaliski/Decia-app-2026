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
    "route": "/register → /verify-email (BFF app/bff/auth/register → POST /api/auth/register); /termos e /privacidade (D-15) — real desde 17/10/2026 (D-143): páginas públicas app/(legal)/termos e app/(legal)/privacidade, lidas de docs/legal/*.md",
    "coverage": "RF1.CA01 … RF1.CA06 (corpo do card vazio → derivados do título + HU1, todos \"(CA a confirmar)\") · RF1.CA07 … RF1.CA13 (§7, controles de segurança D-14) · RF1.CA14 … RF1.CA27 (§8, aceite dos termos e tipos de perfil, D-15…D-22) — regra: o título do card define o RF; os CAs foram atualizados para o código real do Bloco 3 (RegistrationController, RegistrationService, V3__rf1_rf2_autenticacao.sql); atualização de 17/10/2026 (D-143): tipo de usuário explicado em cada opção, aceite dos Termos de Uso e da Política de Privacidade da Velion com links para /termos e /privacidade, versões 0.2",
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
        "text": "Dado o formulário, então o Checkbox \"Li e aceito os Termos de Uso e a Política de Privacidade\" vem desmarcado, com links para os dois documentos (abrem em Sheet ou nova aba sem perder o formulário); \"Criar conta\" fica disabled até marcar. Real (D-143): desmarcado, texto com a Velion e links que abrem /termos e /privacidade em nova aba; sem marcar, o envio volta com 422 details.fields.acceptTerms (o disabled e o Sheet seguem planejados).",
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
        "text": "Dado /termos e /privacidade, então funcionam sem login e pelo gate, mostram a versão vigente e o histórico (GET /api/legal/{TERMOS|PRIVACIDADE}/current e /versions); PolicyTextGuardTest recusa texto com marcador […] ou \"validar com jurídico\". Real (D-143): as duas páginas são públicas e mostram a versão do cabeçalho YAML de docs/legal/*.md (0.2, rascunho); histórico, API e o guarda de texto seguem planejados.",
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
        "text": "Dado a escolha do tipo com RadioCard, então profileType fora de EMPREGADO/EMPRESA/CHEFE_DEPARTAMENTO (inclusive ADMIN) recebe 422 VALIDACAO details.fields.profileType (real, parseProfileType); CURADOR não é tipo (D-09). Real (D-143): cada opção traz a explicação do tipo.",
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
    "summary": "Classes (real) existem em origin/main (Bloco 3, PR #16); RedisSessionStore (ws-infrastructure/cache-redis, ativo com ws.redis.enabled=true; Q-85 resolvida) é (real) e o InMemorySessionStore fica como padrão sem Redis, ambos com espelho JPA refresh_tokens; (planejado): SMTP real (Q-84), PolicyGateFilter (D-16); a conferência TOTP do 2FA (Q-83) é real desde 17/10/2026 (D-144, §9). Números adotados: D-25 (TTLs), D-26 (Argon2id e bulkhead), D-27 (cadastro sem oráculo). Bloco 4 (real, D-60–D-64): proteção de rotas no middleware.ts, renovação silenciosa e logout entre abas, OIDC Authorization Code + PKCE S256/state/nonce no BFF e GET/DELETE /api/auth/sessions com a aba Sessões — §8.",
    "route": "/login (BFF app/bff/auth/login → POST /api/auth/login), /login/institucional (POST /api/auth/oidc/login), /forgot-password (POST /api/auth/password-reset/request|confirm); todas as rotas autenticadas passam pelo SessionActiveFilter; real desde 17/10/2026: passo do código do 2FA no /login e cartão do 2FA em /settings?tab=conta (GET /api/me/2fa, POST /api/me/2fa/setup|enable|disable|recovery-codes, D-144)",
    "coverage": "RF2.CA01 … RF2.CA06 (corpo do card vazio → derivados do título + HU2, todos \"(CA a confirmar)\") · RF2.CA07 … RF2.CA14 (§7, controles de segurança D-14) — regra: o título do card define o RF; CAs alinhados ao código real do Bloco 3 (AuthController, IdentityService, AuthRateLimitFilter, HashBulkhead, SessionActiveFilter, JwtTokenIssuer, OidcService, PasswordResetService); atualização de 17/10/2026: 2FA por aplicativo (D-144: Totp, TwoFactorVerifier, TwoFactorService, TwoFactorController) e sessão no navegador (D-146)",
    "cas": [
      {
        "id": "RF2.CA01",
        "text": "Dado identifier (username ou e-mail) e password, quando faço POST /api/auth/login, então a senha é conferida contra o hash Argon2id (PasswordHasher.matches, re-hash transparente por needsRehash) e recebo Session {accessToken RS256 15 min (D-25; claims iss, aud, sub, sid=familyId, role, profile_type, username, jti), tokenType Bearer, expiresIn, refreshToken opaco, refreshExpiresAt, family, user, warnings}; o refresh (30 d se rememberMe, 24 h se não — SessionPolicy) é guardado só como SHA-256 (RefreshRecord.tokenHash) com espelho em refresh_tokens; o BFF devolve o refresh só no cookie ws_rt (HttpOnly, Secure, SameSite=Strict). Real (D-146, 17/10/2026): sem rememberMe, ws_rt e ws_rt_h são cookies de sessão do navegador (sem Max-Age, setSessionCookies em app/bff/auth/bff-session.ts); com rememberMe, valem até refreshExpiresAt.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA02",
        "text": "Dado conta inexistente, senha errada ou conta bloqueada, então 401 CREDENCIAIS_INVALIDAS com a mesma mensagem e tempo (hash falso dummyHash); conta SUSPENDED/ANONYMIZED (AccountStatus.blocksLogin) → 403 CONTA_INDISPONIVEL depois da senha certa; PENDING_VALIDATION e DELETION_SCHEDULED entram com warnings (Q-82; PENDING_EMAIL_VERIFICATION só tem sessão após confirmar o código, D-27); twoFactorEnabled → 401 DOIS_FATORES_NECESSARIO {twoFactorRequired} (conferência TOTP é a Q-83, respondida pela D-144). Real (D-144, 17/10/2026): LoginCommand.twoFactorCode; IdentityService.verifySecondFactor — sem código → 401 DOIS_FATORES_NECESSARIO (LOGIN_FALHA reason 2fa_pendente) e o LoginForm mostra o campo do código; com código, o balde login-fail é reservado antes de conferir (bloqueado → 401 CREDENCIAIS_INVALIDAS genérico + LOGIN_BLOQUEADO_TENTATIVAS via 2fa); código errado → 401 DOIS_FATORES_INVALIDO (LOGIN_FALHA reason 2fa_codigo, a reserva fica); certo → release e sessão; código de recuperação é consumido e audita TWO_FACTOR_RECOVERY_USED {recoveryCodesLeft}. Conta com prazo de reativação vencido (IdentityService.reactivationExpired, D-145) → 403 CONTA_INDISPONIVEL, como blocksLogin(). Gestão do 2FA (/api/me/2fa/*, erros 409 DOIS_FATORES_JA_ATIVO · 409 DOIS_FATORES_INATIVO · 409 DOIS_FATORES_SEM_CONFIGURACAO · 422 DOIS_FATORES_INVALIDO) em §9.",
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
        "text": "Dado um refresh válido, quando o BFF chama POST /api/auth/refresh, então ocorre rotação: novo token da mesma familyId, o anterior recebe revokedAt/rotatedFromHash; reuso de token já rotacionado revoga a família inteira, grava AuditLog REFRESH_REUSO e responde 401 SESSAO_INVALIDA; expirado ou desconhecido → 401 SESSAO_INVALIDA; conta que passou a blocksLogin() → família revogada. Exceção (real, D-140, 17/10/2026): o consumo é atômico (SessionStorePort.consume → ROTATED · REUSED · EXPIRED · UNKNOWN); no REUSED, se o token foi rotacionado há no máximo SessionPolicy.reuseGraceWindow (padrão 15 s, teto 60 s, 0s desliga), a família segue viva com um só token vivo e claimReuseGrace(tokenHash) é a 1ª reivindicação, o IdentityService.toleratedReuse emite um irmão do sucessor na mesma família e audita REFRESH_REUSO_TOLERADO (resposta perdida na navegação, P18); 2º reuso, fora da janela ou após logout → revogação da família e REFRESH_REUSO como acima. Real (D-145): conta com exclusão agendada cujo prazo venceu (reactivationExpired) → família revogada e 401 SESSAO_INVALIDA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF2.CA05",
        "text": "Dado o usuário autenticado, então POST /api/auth/logout revoga a família (AuditLog LOGOUT); PUT /api/auth/password exige a senha atual (mesmo bloqueio do login), grava PASSWORD_CHANGED e revoga as outras famílias (SESSIONS_REVOKED); o SessionActiveFilter recusa a cada requisição access tokens cuja família foi revogada (sid → 401 SESSAO_ENCERRADA). GET /api/auth/sessions e DELETE /api/auth/sessions/{familyId} são planejados (aba Sessões do RF3 §7). Real (D-146, 17/10/2026): logout em uma aba encerra as outras pelo canal do Bloco 4 e onSessionChange (lib/api/client.ts) faz o CurrentUserProvider voltar a barra para VISITANTE em todas; ativar o 2FA também encerra as outras sessões (revokeOtherSessions, D-144).",
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
        "text": "IdentityService.login (ordem das checagens), dummyHash, verifySecondFactor",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA08",
        "text": "RateLimitPort.tryAcquire/release/reset, RedisRateLimit (Lua), SessionPolicy.maxLoginFailures/lockWindow, IdentityService.verifySecondFactor",
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
        "text": "JwtTokenIssuer, JwtKeys, WsSecurityProperties.Jwt (@ConstructorBinding), SessionActiveFilter, BFF ws_rt",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF2.CA14",
        "text": "AuditActions.LOGIN_OK/LOGIN_FALHA/LOGIN_BLOQUEADO_TENTATIVAS/REFRESH_REUSO/REFRESH_REUSO_TOLERADO/LOGOUT/TWO_FACTOR_SETUP_STARTED/TWO_FACTOR_ENABLED/TWO_FACTOR_DISABLED/TWO_FACTOR_RECOVERY_REGENERATED/TWO_FACTOR_RECOVERY_USED, AuditEvent, Masking",
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
    "summary": "Classes (real) existem em origin/main (Bloco 3, PR #16); (planejado): UserConsent/ConsentEvent/ConsentChecks, DataExportRequest/DataExportWorker, DataSubjectRequest, PersonalDataRegistry, upload de avatar (PendingUpload/MediaObject, D-22), PolicyGateFilter. GET/DELETE /api/auth/sessions e a aba Sessões são reais desde o Bloco 4 (RF2 §8); o AccountAnonymizationJob do plano é real como AccountAnonymizer (D-145).",
    "route": "/settings com abas na URL ?tab=conta|aparencia|privacidade|dados|sessoes|termos|validacao (ABAS_POR_PERFIL §9); API GET|PATCH /api/me, PATCH /api/me/sensitive, GET|PUT /api/me/preferences, POST|DELETE /api/me/deletion; real desde 17/10/2026: abas Conta (AccountPanel + TwoFactorCard, GET /api/me/2fa, POST /api/me/2fa/setup|enable|disable|recovery-codes), Dados (DataPanel) e Termos (TermsPanel) e o aviso DeletionBanner em todas as páginas (D-144, D-145)",
    "coverage": "RF3.CA01 … RF3.CA06 (corpo do card vazio → derivados do título + HU3, todos \"(CA a confirmar)\") · RF3.CA07 … RF3.CA24 (§7, configurações e direitos do titular, D-15…D-21) — regra: o título do card define o RF; CAs alinhados ao código real do Bloco 3 (MeController, AccountService, UserPreferences, Guard.requireNotDeletionScheduled); atualização de 17/10/2026: fim do prazo de 30 dias (AccountService.cancelDeletion → 409 PRAZO_REATIVACAO_ENCERRADO, IdentityService.reactivationExpired, AccountAnonymizer, D-145) e 2FA na aba Conta (D-144)",
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
        "text": "Dado \"Encerrar minha conta\", então o pedido exige a senha atual com bloqueio (real: POST /api/me/deletion {currentPassword, reason}, AuditLog ACCOUNT_DELETION_REQUESTED, deletionScheduledAt = +30 d, DeletionReceipt.cancelable); antes de confirmar, o Dialog mostra o que será anonimizado e o que fica (real, D-145: DataPanel lista as consequências e exige a senha atual, \"entendi\" e a palavra EXCLUIR); já agendada → 409 EXCLUSAO_AGENDADA.",
        "note": "CA a confirmar, Q-68",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA20",
        "text": "Dado DELETION_SCHEDULED, então o login devolve warnings com a data (real), o Banner mostra a data e o botão cancelar (DELETE /api/me/deletion, real, ACCOUNT_DELETION_CANCELLED; sem agendamento → 409 EXCLUSAO_NAO_AGENDADA), editar o perfil recebe 403 EXCLUSAO_AGENDADA (Guard.requireNotDeletionScheduled, real) e criar conteúdo receberá o mesmo 403 quando as rotas existirem (D-18); o pedido também encerra as outras sessões. Real (D-145): o DeletionBanner aparece em todas as páginas com a data e \"Reativar conta\"; depois do prazo o cancelamento recebe 409 PRAZO_REATIVACAO_ENCERRADO, o login 403 CONTA_INDISPONIVEL e o refresh 401 SESSAO_INVALIDA (IdentityService.reactivationExpired).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF3.CA21",
        "text": "Dado o prazo vencido, então o AccountAnonymizationJob roda por @Scheduled com lock (ShedLock); teste 1 prova o agendamento; teste 2 (Testcontainers) prova a anonimização no MySQL, S3 restricted/, Cassandra e OpenSearch, a revogação das sessões e ACCOUNT_DELETION_COMPLETED, mantendo policy_acceptances, consent_events e documentos públicos. Real (parcial, D-145): AccountAnonymizer.run com @Scheduled (de hora em hora, ws.jobs.anonymize.every; SchedulingConfig liga com ws.jobs.enabled), lote de 100, idempotente; anonimiza nome, nome de exibição, e-mail, telefone, senha, OIDC, 2FA, cargo, bio e imagens, troca o usuário por removido-xxxxxxxx, grava anonymizedAt, encerra todas as sessões e audita ACCOUNT_ANONYMIZED (não ACCOUNT_DELETION_COMPLETED); sem ShedLock (réplicas extras usam ws.jobs.enabled=false); S3, Cassandra, OpenSearch e o teste com Testcontainers seguem planejados.",
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
    "coverage": "RF20.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 · CA15 — corpo do card = card RF20 (o card RF4 está vazio; o criador de tarefas está descrito no corpo do card RF20, cujos CAs são citados aqui como estão escritos; ver RENUMERACAO.md). Situação em 17/10/2026 (auditoria docs/auditoria/2026-10-17/, MATRIZ_RF: AUSENTE → API REAL PARCIAL): (real) a criação manual ponta a ponta — /tasks/new (components/tasks/TaskForm.tsx, tasksApi.create em lib/tasks/client.ts) → POST /api/tasks (TaskController.create, TaskRequest) → TaskService.create (TaskInput, ResourceAuthorizer.viewer, erros de campo juntos em 422 VALIDACAO) → TaskItem.create (RASCUNHO, SourceKind.MANUAL — V37) + TaskBrief (V36 task_briefs: objetivo, WorkArea, entregáveis, critérios, referências, extensões opcionais por área) → TaskRepositoryPort.insert → task_state_log → AuditLogPort TASK_CREATED → 201 TaskView (commits 97611a0, 013657a, 474b6cb; jornada real 17/17 com tarefas de 6 áreas), mais os transversais do Bloco 1–3 (SecurityConfig, CorrelationIdFilter, Guard, AuditLogPort, AuthRateLimitFilter, S3StorageConfig, AiProvidersConfig); (planejado) uploads e anexos (UploadService; MediaUploadService existe mas ainda não é bean), detecção por IA (TaskDetectionService, AiEngine), órgãos (/api/org-entities/search), prazos legais (/api/legal-deadlines/compute), lote/.zip, chancelas, Balcão, dependências, escolha de outro responsável (busca /api/people?q=) e vínculo com projeto/peças (Onda 3 do PLANO_ONDAS.md); as fontes ARQUIVO, COLAR, GOOGLE, MICROSOFT, EMAIL, LINK, PROTOCOLO, FOTO e TEXTO_IA existem só como valores do enum SourceKind, sem adaptador.",
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
        "text": "TaskCreationService.create/validate, TaskRepositoryPort, ProjectTask (RF5); real: TaskController.create, TaskService.create, TaskRepositoryPort.insert, TaskBrief",
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
        "text": "TaskCreationService.validate, GlobalExceptionHandler (ApiError.details); real: TaskService.validate (privado), TaskBriefJson.invalid",
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
    "summary": "O título do card recorta, das 15 sub-abas do perfil (Matriz B), as quatro do Perfil Empresarial: Acervo Digital (= Closet: inventário TaskItem com sub-filtros por TaskState), Projetos (ProjectScheme do dono), Projetos salvos e Tarefas salvas (SavedItem). As demais sub-abas (planos, decisões, perfil deliberativo, pontos…) ficam no RF16 (terceiros) e nos RFs de origem (RF24, RF29, RF42, RF45).",
    "route": "Meu perfil (/profile, sub-abas ?tab=acervo|projetos|projetos-salvos|tarefas-salvas, Matriz B de ABAS_POR_PERFIL §3), perfil de terceiros /u/[username] (RF16); Acervo também em /tasks (RF41); API GET /api/me (real), GET /api/me/tasks, GET /api/me/projects, GET /api/me/saved?type=, POST /api/tasks/{id}/state",
    "coverage": "RF6.CA01 … RF6.CA06 — todos \"(CA a confirmar)\": o corpo do card está vazio; os CAs foram derivados do título + HU6 e reaproveitam _anterior/RF19 (sub-abas 1–2 e 7–8), RF41 (estados do Acervo) e RF26.CA04 (salvar). Real: MeController.me, AccountService.me/profile, UserView (Bloco 3); o resto (planejado). Atualização 17/10/2026: TaskController.mine/TaskService.listMine (real); PeopleService, PeopleController e TaskService.listOf (real, em curso, Onda 1) — achado P19.",
    "cas": [
      {
        "id": "RF6.CA01",
        "text": "Dado um usuário autenticado, quando abre /profile, então vê o cabeçalho (UserView: avatar, nome, jobTitle, empresa, departamento; contadores de tarefas, projetos e salvos via Redis) e as sub-abas Acervo Digital, Projetos, Projetos salvos e Tarefas salvas; em /u/[username] um terceiro vê só Acervo Digital e Projetos, filtrados por Visibility (RF16); sub-aba reservada ao dono → 403 ACESSO_NEGADO (Guard.ownerOrAdmin). Real (em curso, Onda 1, P19): cabeçalho do dono por GET /api/me; cabeçalho de terceiro por GET /api/people/by-username/{username} (PublicProfileView, sem contato; conta não ACTIVE → 404 NAO_ENCONTRADO); contadores pela API planejados (no front já contam só o que o viewer vê, b602d34).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA02",
        "text": "Dado a sub-aba Acervo Digital, então ela lista os TaskItem do dono em grade compacta (TaskCard compact) com sub-filtros por estado (TaskState: RASCUNHO · DISPONIVEL · EM_USO · BLOQUEADA · CONCLUIDA · ARQUIVADA · MODELO_PUBLICO · OFERECIDA) com contadores, filtros por categoria/tipo/processo/natureza, ordenação (recentes, mais usadas, nome, prazo), busca (OpenSearch ws-tasks) e paginação (20); a URL reflete filtros e página. Real (base): GET /api/tasks?limit (TaskController.mine → TaskService.listMine, mais recentes primeiro, sem filtros nem contadores por estado); a sub-aba sobre ela está em curso (Onda 1).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA03",
        "text": "Dado um card do meu Acervo, quando aciono uma ação rápida (favoritar ⭐, mudar estado, arquivar, duplicar, levar ao projeto), então a transição passa por TaskStateMachine e grava TaskStateLog; transição inválida → 422 TRANSICAO_INVALIDA; EM_USO é automático ao entrar em projeto ativo e MODELO_PUBLICO só via chancela/publicação; a etiqueta de estado (Tag) aparece no card.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA04",
        "text": "Dado a sub-aba Projetos, então ela lista os ProjectScheme do dono (ProjectCard mosaic) com capa-mosaico, PhaseBar, status e currentPhase, filtráveis por status/fase/exercício e paginados; abrir um card leva ao detalhe (lista por fase, RF7) e, para o dono, à edição (RF8/RF12/RF22).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA05",
        "text": "Dado a sub-aba Projetos salvos ou Tarefas salvas, então ela lista os SavedItem do dono (targetType PROJECT ou TASK) com marcador favorite, respeitando a visibilidade atual do alvo (alvo que ficou PRIVADA aparece como \"indisponível\"); \"Remover dos salvos\" apaga o SavedItem e decrementa savesCount; só o dono acessa.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF6.CA06",
        "text": "Dado o perfil de um terceiro, quando vejo seu Acervo Digital, então só aparecem tarefas com visibility compatível (AccessPolicy.visibilityFilter: PUBLICA; EMPRESA se mesma empresa; DEPARTAMENTO se membro), nunca PRIVADA; cada card oferece \"Levar ao meu acervo\" (RF7/RF23) e interações sociais (RF18/RF19); item fora da visibilidade → 403 ACESSO_NEGADO. Real (17/10/2026): GET /api/people/{id}/tasks → TaskService.listOf devolve só o que AccessPolicy.visible admite (SIGILOSO só dono e colaboradores explícitos, nem ADMIN — AccessPolicy.sigiloso, D-139) (em curso, Onda 1); abrir item invisível responde 404 NAO_ENCONTRADO uniforme, não 403 (GET /api/tasks/{id}, front components/social/TaskDetail.tsx, D-141).",
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
    "summary": "A lista do projeto é a lista de ProjectTask por fase (quadro, linha do tempo ou lista — RF22 §\"Três visões\"); clicar num item abre a folha de detalhe da TaskItem ligada (ProjectTask.taskId) ou, se o autor a excluiu, o TaskSnapshot guardado em ProjectTask.snapshotJson (TAXONOMIA §2.8). O que o viewer vê e pode fazer depende de AccessPolicy (visibilidade da tarefa) e do papel no projeto (dono, responsável, terceiro).",
    "route": "detalhe do projeto /projects/[id] → lista de tarefas por fase → /projects/[id]/tasks/[ptId] (folha de detalhe com URL profunda), atalho para /tasks/[id], ação \"Levar ao meu acervo\" (destino: Acervo Digital, RF6/RF41); API GET /api/projects/{id}, GET /api/projects/{id}/tasks/{ptId}, POST /api/tasks/{id}/extract (compartilhado com RF23), GET /api/media/{id}/presign",
    "coverage": "RF7.CA01 … RF7.CA06 — todos \"(CA a confirmar)\": o corpo do card está vazio; os CAs foram derivados do título + HU7 e reaproveitam _anterior/RF23 (snapshot RF23.CA03, \"Levar ao meu acervo\" RF23.CA01/CA05) e RF41.CA03 (detalhe da tarefa). Todas as classes do RF são (planejado); reais só os transversais (SecurityConfig, SessionActiveFilter, Guard, CorrelationIdFilter, AuditLogPort).",
    "cas": [
      {
        "id": "RF7.CA01",
        "text": "Dado um projeto visível para mim, quando clico num item da lista de tarefas (quadro por fase, linha do tempo ou lista), então abre a folha de detalhe da tarefa com título, tipo (TypeChip), categoria, resumo (3 linhas), estado (Tag com nome em texto), prazo (Due, ⚖ se legal), responsável, anexos com pré-visualização (GET /api/media/{id}/presign), versões, chancelas (Seal), interações (Counters) e o contexto no projeto (fase, ordem, dependências, caminho crítico, percentComplete); a URL fica /projects/{id}/tasks/{ptId}.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA02",
        "text": "Dado um ProjectTask com taskId nulo (tarefa excluída pelo autor, removedByAuthor), quando o abro, então o detalhe mostra o TaskSnapshot (título, tipo, categoria, thumbnail, resumo, ownerName, capturedAt) com o aviso \"removida pelo autor\", sem anexos nem ações de cópia/edição; fases e dependências do projeto continuam íntegras.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA03",
        "text": "Dado que a tarefa tem visibility incompatível com o viewer (PRIVADA de outra pessoa, DEPARTAMENTO sem ser membro), quando clico no item, então o card aparece como \"tarefa privada\" (só fase e ordem) e a API responde 403 ACESSO_NEGADO; ProjectTask inexistente no projeto → 404 TAREFA_NAO_ENCONTRADA; projeto fora da minha visibilidade → 403.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA04",
        "text": "Dado o detalhe de uma tarefa não-PRIVADA que não é minha, quando aciono \"Levar ao meu acervo\", então nasce uma cópia (sourceKind EXTRAIDA_DE_PROJETO, originalTaskId, sourceProjectId, state DISPONIVEL, visibility PRIVADA, anexos por referência ao mesmo MediaObject), reuseCount da original incrementa e o dono é notificado (Notification TAREFA_REUTILIZADA); ação oculta para PRIVADA (403 na API).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA05",
        "text": "Dado que sou o dono da tarefa ou responsável no projeto, então a ação principal é \"Editar\" (abre RF8/RF12) e a alternativa \"Abrir no Acervo\" (/tasks/[id]); para os demais a ação principal é \"Levar ao meu acervo\" e as interações sociais (RF18/RF19); toda abertura incrementa viewsCount (contador desnormalizado, Redis → MySQL em lote).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF7.CA06",
        "text": "Dado a folha aberta, quando fecho ou uso \"voltar\", então retorno à lista do projeto na mesma fase e posição de rolagem; a folha carrega com Skeleton, respeita i18n pt-BR/en/es e layout responsivo (Sheet lateral no desktop, tela cheia no celular).",
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
    "summary": null,
    "route": "/tasks/[id]/edit (ficha + anexos + versões, a partir do Acervo Digital, RF6) e /projects/[id]/edit (ficha do projeto e arquivos das tarefas pela Mesa, RF22); \"Editar no provedor\" abre Google Docs/Sheets ou Word/Excel online; API PATCH /api/tasks/{id}, POST /api/tasks/{id}/attachments, PUT /api/tasks/{id}/attachments/{attId} (substituir), POST /api/tasks/{id}/link/convert, POST /api/tasks/{id}/complete, PATCH /api/projects/{id}, webhook POST /api/integrations/{provider}/changes",
    "coverage": "RF8.CA01 … RF8.CA06 — todos \"(CA a confirmar)\": o corpo do card está vazio; os CAs foram derivados do título + HU8 e reaproveitam RF20.CA07/CA12 (itens vinculados, PipelineJob), RF41.CA02/CA03 (estados, versões) e RF22.CA02/CA06 (versões de projeto, bloqueio). O foco deste RF são os arquivos (anexos, versões, provedor externo); a edição dos dados do esquema é o RF12. Todas as classes do RF são (planejado); reais só os transversais (SecurityConfig, SessionActiveFilter, Guard, AuditLogPort, S3StorageConfig, AiProvidersConfig).",
    "cas": [
      {
        "id": "RF8.CA01",
        "text": "Dado uma tarefa do meu perfil (sou ownerId ou responsibleId), quando edito título, categoria, tags, prazo, descrição ou classificação e salvo com If-Match: version, então o sistema valida como no criador (RF4: 422 VALIDACAO por campo), grava com bloqueio otimista (409 CONFLITO_VERSAO se outra edição venceu), registra AuditLog TASK_UPDATED e reindexa no OpenSearch após o commit; quem não é dono nem responsável → 403 ACESSO_NEGADO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA02",
        "text": "Dado os anexos da tarefa, quando substituo o arquivo principal ou adiciono um novo, então o upload passa por MediaStoragePort + AntivirusPort (422 ARQUIVO_MALICIOSO bloqueia; 415/413 como no RF4), a versão anterior é preservada como TaskVersion (versionNumber + 1, snapshotMediaId do arquivo antigo, changeSummary), e thumbnail/OCR são reprocessados por PipelineJob após o commit (falha → REPROCESSAR, aviso no card).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA03",
        "text": "Dado um item linkMode VINCULADO (Google/Microsoft), quando aciono \"Editar no provedor\", então o documento abre no Google Docs/Sheets ou Word/Excel online com o OAuth do usuário; ao receber o webhook de mudança (ExternalDocPort.watch), AcervoService.syncLinkedVersion cria TaskVersion (externalRevisionId, syncedAt) e atualiza o thumbnail; \"Converter em cópia\" chama convertLinkToSnapshot (linkMode COPIADO, snapshot no S3); token revogado → conversão automática em snapshot com aviso.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA04",
        "text": "Dado um projeto do meu perfil, quando edito a ficha (título, objetivo, prazo, programa, eixo) ou os arquivos das suas tarefas pela Mesa (RF22), então mudanças estruturais geram ProjectVersion com diffJson legível e as não-estruturais só atualizam; projeto CONCLUIDO/ARQUIVADO → 409 PROJETO_BLOQUEADO (reabrir exige justificativa); a visibilidade dos arquivos segue a da tarefa dona (AccessPolicy).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA05",
        "text": "Dado uma tarefa EM_USO ou DISPONIVEL, quando marco \"Concluir\" (POST /api/tasks/{id}/complete), então TaskStateMachine leva a CONCLUIDA com TaskStateLog; se era a última ProjectTask pendente de um projeto, ProjectScheme.status passa a CONCLUIDO e percentComplete = 100; transição inválida → 422 TRANSICAO_INVALIDA; BLOQUEADA precisa ser desbloqueada antes.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF8.CA06",
        "text": "Dado um salvamento bem-sucedido, então após o commit a IA gera um Insight de qualidade (scope ACERVO para tarefa, PROJETO para projeto; metricRefsJson com completude, clareza, prazo, conformidade RF32; actionsJson com correções em 1 clique), exibido com faísca ✦ e \"Por que isto?\", registrado em ai_inference_log (capability INSIGHT, hostRf RF8); accessClass RESTRITO/SIGILOSO → LocalEngine; sem cota → sem insight (nunca bloqueia o salvamento).",
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
    "summary": null,
    "route": "página do departamento /departments/[slug] → aba Equipe → modo Minha equipe (gestão) só para o chefe (/departments/[slug]/team?mode=manage); atalho Minha equipe no grupo Gestão do SidebarNav (ABAS_POR_PERFIL §1.2, §7.b); API GET /api/departments/{id}/members, GET /api/departments/{id}/members/history, POST /api/departments/{id}/members, DELETE /api/departments/{id}/members/{userId}, GET /api/departments/{id}/members/{userId}/pending",
    "coverage": "RF9.CA01 … RF9.CA06 — todos \"(CA a confirmar)\": o corpo do card está vazio e o escopo é novo; os CAs foram derivados do título + HU9 e reaproveitam RF28.CA02 (lotação 1 por vez com histórico em DepartmentMembership), RF28.CA03 (auditoria do chefe), o guard requireDeptHead e a aba \"Minha equipe\" propostos em docs/produto/ABAS_POR_PERFIL.md. Todas as classes do RF são (planejado); reais: Guard.requireRole/ownerOrAdmin, User.companyId/departmentId (colunas sem FK até o RF28, D-23), AuditLogPort, SecurityConfig.",
    "cas": [
      {
        "id": "RF9.CA01",
        "text": "Dado um CHEFE_DEPARTAMENTO com Department.headUserId == eu (ou EMPRESA dona da Company, ou ADMIN — Guard.requireDeptHead), quando abro a aba Equipe no modo Minha equipe, então vejo os DepartmentMembership vigentes (nome, username, jobTitle, roleInDept, startedAt, etiqueta Curador) com busca e paginação (> 50), mais o histórico de lotações encerradas; quem não é chefe vê só a lista pública (RF14) e a API de gestão responde 403 ACESSO_NEGADO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA02",
        "text": "Dado o modo gestão, quando adiciono um usuário (busca por nome/username na mesma Company, AccountStatus ACTIVE), então nasce um DepartmentMembership MEMBRO com startedAt, a lotação vigente anterior (em outro departamento) é encerrada com endedAt e reason TRANSFERENCIA e User.departmentId passa a ser o meu departamento; já membro vigente → 409 MEMBRO_DUPLICADO; usuário de outra empresa, não ACTIVE ou perfil EMPRESA → 422 VALIDACAO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA03",
        "text": "Dado um membro vigente, quando removo informando reason (obrigatório, 422 VALIDACAO), então o DepartmentMembership recebe endedAt e reason (sem apagar), User.departmentId fica nulo, o CuratorAppointment vigente dele é revogado (revokeReason = saída do departamento) e suas tarefas/projetos permanecem com o dono; remover o próprio chefe (headUserId) → 409 CHEFE_NAO_REMOVIVEL (trocar o chefe é RF28).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA04",
        "text": "Dado que o removido tem pendências (responsável em ProjectTask aberta, TaskItem EM_USO/BLOQUEADA como responsável, SessionParticipant em sessão ATIVA, SealBond EM_REVISAO de que é alvo, Assignment ACEITA), quando confirmo a remoção, então o sistema lista as pendências (GET …/pending) e oferece gerar Dossiê de Transição (HandoffDossier reason TRANSFERENCIA/SAIDA, RF36) ou transferir para outro membro; sem escolha, a remoção prossegue e as pendências ficam marcadas \"sem responsável no departamento\".",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF9.CA05",
        "text": "Dado a inclusão ou remoção, então MemberAdded/MemberRemoved (AFTER_COMMIT) gravam AuditLog MEMBER_ADDED/MEMBER_REMOVED com correlationId, notificam o empregado (Notification tipo SISTEMA, categoria SISTEMA: \"você foi adicionado/removido do departamento X\", com motivo), invalidam o cache Redis de métricas/contadores do departamento e atualizam a aba pública Equipe e a página da empresa (RF14/RF15).",
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
    "summary": "A entidade Assignment (TAXONOMIA §12b.4) é compartilhada por três entradas: o chefe em Minha equipe ou no card (este RF, origens MINHA_EQUIPE/BOTAO_ESQUEMA), as ações sociais \"atribuir\"/\"retornar\" de qualquer usuário (RF18, BOTAO_ESQUEMA) e o chat (RF46, CHAT_WS/CHAT_DECIA). O que distingue o RF10 é o papel: Guard.requireDeptHead e o alvo humano precisa ter DepartmentMembership vigente no departamento do chefe.",
    "route": "página do departamento › Equipe › Minha equipe (gestão) (/departments/[slug]/team?mode=manage, origem MINHA_EQUIPE); ação \"Atribuir\" no card de tarefa (/tasks/[id]) e de projeto (/projects/[id], origem BOTAO_ESQUEMA); lado do atribuído: /me/assignments (\"Atribuídas a mim\") e Tarefa do Dia (RF44); API POST /api/assignments, POST /api/assignments/{id}/accept|refuse|give-back, GET /api/me/assignments, GET /api/departments/{id}/assignments",
    "coverage": "RF10.CA01 · RF10.CA02 · RF10.CA03 · RF10.CA04 · RF10.CA05 · RF10.CA06 — corpo do card vazio: CAs derivados do título + HU10 + ABAS_POR_PERFIL §7.b (bloco 3 de Minha equipe) + RF46.CA03–CA05 (mesma entidade Assignment), marcados (CA a confirmar). Todas as classes do RF são (planejado); reais: Guard, AuditLogPort, SecurityConfig, SessionActiveFilter.",
    "cas": [
      {
        "id": "RF10.CA01",
        "text": "Dado um CHEFE (Department.headUserId) em Minha equipe ou num card de tarefa/projeto, quando aciona Atribuir escolhendo pessoa, alvo (TaskItem ou ProjectScheme), prazo opcional e mensagem (≤ 500), então POST /api/assignments cria Assignment com status PROPOSTA, fromUserId = chefe, toUserId, targetType, targetId, dueAt, message, origin (MINHA_EQUIPE ou BOTAO_ESQUEMA), previousResponsibleId = responsável atual, e AuditLog ASSIGNMENT_CREATED.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA02",
        "text": "Dado o pedido, então o serviço exige Guard.requireDeptHead do departamento da pessoa: ator que não é chefe → 403 ACESSO_NEGADO; pessoa sem DepartmentMembership vigente no departamento do chefe → 422 VALIDACAO (FORA_DO_DEPARTAMENTO); alvo que o ator não pode ver (Visibility PRIVADA de terceiro) → 403 ACESSO_NEGADO; alvo em CONCLUIDA/ARQUIVADA (tarefa) ou CONCLUIDO/ARQUIVADO (projeto) → 409 ALVO_ENCERRADO; já existe Assignment PROPOSTA/ACEITA do mesmo alvo para a mesma pessoa → 409 ATRIBUICAO_DUPLICADA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA03",
        "text": "Dado o commit, então o evento AssignmentProposed (AFTER_COMMIT) grava Notification tipo ATRIBUICAO_PROPOSTA, categoria SISTEMA, resourceType ASSIGNMENT, em notifications_by_user (Cassandra) + espelho MySQL, e TimelineEvent do atribuído; o chefe acompanha o estado no bloco 3 de Minha equipe (GET /api/departments/{id}/assignments, por pessoa).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA04",
        "text": "Dado o atribuído (toUserId), quando aceita (POST /api/assignments/{id}/accept), então status ACEITA, respondedAt, TaskItem.responsibleId ou ProjectTask.responsibleId (todas as ProjectTask sem responsável, quando PROJECT) recebe toUserId, TaskStateLog é gravado se a tarefa passa de DISPONIVEL para EM_USO (reason ATRIBUICAO_ACEITA) e o chefe recebe ATRIBUICAO_ACEITA; quando recusa (/refuse), reason é obrigatório (422 MOTIVO_OBRIGATORIO), status RECUSADA e o chefe recebe ATRIBUICAO_RECUSADA; outro usuário respondendo → 403 ACESSO_NEGADO; resposta fora de PROPOSTA → 409 ESTADO_INVALIDO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA05",
        "text": "Dado o atribuído, então /me/assignments (AssignmentService.listForMe) lista as atribuições PROPOSTA e ACEITA (filtros: tipo, prazo, quem atribuiu) com o alvo em TaskCard/ProjectCard compacto; a Assignment ACEITA entra no priorityIndexJson da Tarefa do Dia (RF44) com o fator \"atribuída pelo chefe\" e no Dossiê de Transição (RF36) como item pendente; o chefe vê, por pessoa, as atribuições abertas e vencidas (Due).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF10.CA06",
        "text": "Dado o atribuído com Assignment ACEITA, quando devolve com motivo (POST /api/assignments/{id}/give-back), então status DEVOLVIDA, reason obrigatório (422 MOTIVO_OBRIGATORIO), o responsibleId volta a previousResponsibleId, TaskStateLog registra a volta e o chefe recebe ATRIBUICAO_DEVOLVIDA; DELEGUEI da Tarefa do Dia (RF44) e \"Atribuir\" no chat (RF46) chamam o mesmo AssignmentService com outra origin.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF11",
    "n": 11,
    "title": "Utilizar o editor de arte de fundo para personalizar esquemas de tarefas e projetos",
    "hu": "COMO usuário criando um esquema de tarefa ou projeto POSSO utilizar o editor de arte de fundo PARA personalizar background de esquemas de tarefas ou projetos.",
    "summary": "O Estúdio de Arte do card grava cardArtJson (CardArtConfig, proposta: v, layout, fundo, container, destaques) na TaskItem (coverMode, cardSkin, coverUrl) ou no ProjectScheme (coverMode MOSAICO/FOTO/IA, coverUrl, mosaicJson). A renderização é determinística (CardArtResolver.resolveCardArt) e a mesma em feed, Mural, Vitrine, Balcão e Mesa. A arte com IA usa o AiEngine capability CAPA_IA sob a governança de accessClass e AiQuota.",
    "route": "Estúdio do card dentro de /tasks/[id]/edit (etapa 5 \"Arte do card\" do criador, RF4) e /projects/[id]/edit; API PUT /api/tasks/{id}/card-art, PUT /api/projects/{id}/card-art, POST /api/card-art/ai (arte com IA), POST /api/card-art/upload",
    "coverage": "RF11.CA01 · RF11.CA02 · RF11.CA03 · RF11.CA04 · RF11.CA05 · RF11.CA06 — corpo do card vazio: CAs derivados do título + HU11 + RF38.CA02/CA04/CA08/CA10 + docs/design-system/ANATOMIAS_E_ESTUDIO.md §6 (Estúdio de Arte do card), marcados (CA a confirmar). Todas as classes do RF são (planejado); reais: UserPreferences.defaultCardSkin/reduceMotion (Bloco 3), Guard.ownerOrAdmin, AiProvidersConfig, S3StorageConfig, RedisAdaptersConfig.",
    "cas": [
      {
        "id": "RF11.CA01",
        "text": "Dado o dono de uma tarefa ou projeto (ownerId), quando abre o Estúdio do card, então vê os segmentos Fundo · Layout · Container · Destaques com prévia ao vivo (card do feed + ampliado); o rascunho é local (Cancelar não grava; Restaurar padrão só no rascunho); Aplicar envia PUT /api/tasks/{id}/card-art ou PUT /api/projects/{id}/card-art com CardArtConfig + baseRev; quem não é dono → 403 ACESSO_NEGADO; rev divergente → 409 REVISAO_DESATUALIZADA; JSON fora do schema → 422 VALIDACAO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA02",
        "text": "Dado o segmento Fundo, então o usuário escolhe cor sólida (8 cores de departamento + 6 neutras), gradiente (marca, dept, spark), textura (papel, cortica, blueprint, timbrado), terminal, monograma, malha de nós (argumento, consenso, misto + densidade 1–3), mosaico automático, imagem enviada ou arte com IA; resolveCardArt aplica a precedência (base color → gradient → texture/terminal/monograma; imagem ai/upload → mesh → mosaic); layouts com ownArt (GRADE, PRANCHA, LINHA_TEMPO) desligam o Fundo com explicação; layouts sem dado ficam desabilitados com motivo (effectiveLayout).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA03",
        "text": "Dado o segmento Container, então o usuário escolhe a skin (timbrado padrão, protocolo, carimbo, blueprint, noturno; contraste forçado pelo tema) e a cor do container (nativa, 5 amostras ou livre); a tinta vem de inkOn(hex) por luminância (0,299 R + 0,587 G + 0,114 B > 140 → #1A1714, senão #F5F2EC), garantindo ≥ 4,5:1; skin premium sem UserSkin → 403 SKIN_NAO_ADQUIRIDA com atalho para a Loja (RF42); UserPreferences.defaultCardSkin é o valor inicial.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA04",
        "text": "Dado \"Arte com IA\" (prompt ≤ 300), então o serviço verifica AiQuota (créditos antes da cota mensal; sem saldo → 409 COTA_ESGOTADA + Loja), accessClass RESTRITO/SIGILOSO → LocalEngine (monograma/paleta, result BLOQUEADO_SIGILO para externo), senão AiEngine CAPA_IA com tema mascarado; a imagem vai ao S3 (MediaObject) e fundo.aiArt {url, prompt, generatedAt, inferenceId} é gravado com AiInferenceLog; faísca ✦ obrigatória (RF38.CA04); resposta ≤ 30 s ou estado \"gerando\" com motion spark; imagem enviada passa por MIME real, tamanho e PipelineJob ANTIVIRUS → 422 VALIDACAO se inválida.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA05",
        "text": "Dado o segmento Destaques, então o usuário configura lacre (lugar reservado), tooltip da faísca (curto/completo), barra de fases (projeto), carimbo de estado/decisão (canto/centro/oculto), Hype do autor (respeita HypeVisibility) e movimento (none, pulse, thread); no máximo 2 destaques decorativos → 422 LIMITE_DESTAQUES; o movimento só roda no card ampliado e é desligado por prefers-reduced-motion ou UserPreferences.reduceMotion (RF38.CA10).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF11.CA06",
        "text": "Dado cardArtJson gravado, então a API entrega cardArt no view da tarefa/projeto, a leitura é tolerante (config sem v lê como v1 com padrões PAGINA/MOSAICO + timbrado; valor desconhecido → padrão; color inválido → null); o mesmo resolveCardArt renderiza feed, Mural, Vitrine, Balcão e Mesa; o cache Redis do card é invalidado (DEL card:task:{id} / card:project:{id}) e CardArtChanged (AFTER_COMMIT) dispara CardArtService.rebuildMosaic nos projetos que contêm a tarefa (RF38.CA03).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF12",
    "n": 12,
    "title": "Editar um esquema de tarefa ou projeto de meu perfil",
    "hu": "COMO usuário visualizando um esquema de tarefa ou projeto POSSO editar os dados deste esquema PARA atualizar minha gestão pessoal e empresarial.",
    "summary": "Este RF cobre a edição dos dados (ficha) da TaskItem e do ProjectScheme: validação igual à do criador (RF4/RF5), lock otimista para tarefa e último-vence com aviso para projeto (RF22.CA04), versões (ProjectVersion, TaskStateLog), autosave e bloqueio de itens encerrados. A edição de arquivos (anexos, versões, provedor externo) é o RF8 e a arte do card é o RF11.",
    "route": "Meu perfil (/profile) › sub-abas Acervo Digital e Projetos (RF6) › card › Editar → /tasks/[id]/edit e /projects/[id]/edit (a Mesa completa — Quadro, Linha do tempo, canvas — é o RF21/RF22; os arquivos são o RF8); API GET /api/tasks/{id}/edit-form, PATCH /api/tasks/{id}, PATCH /api/projects/{id}, PUT /api/tasks/{id}/draft, POST /api/tasks/{id}/reopen, POST /api/projects/{id}/reopen",
    "coverage": "RF12.CA01 · RF12.CA02 · RF12.CA03 · RF12.CA04 · RF12.CA05 · RF12.CA06 — corpo do card vazio: CAs derivados do título + HU12 + RF22 (CA01 permissão, CA02 ProjectVersion, CA04 concorrência, CA06 bloqueio) + RF20.CA07/CA11 + RF21.CA14 (autosave) + RF41.CA02 (TaskStateLog), marcados (CA a confirmar). Classes (real) desde 17/10/2026 (97611a0, 013657a, 474b6cb): TaskController.get/update (@AuthorizedBy(\"require\")), TaskRequest, TaskService.get/update (TaskInput, TaskView com version e editable), TaskRepositoryPort.update (versão obrigatória), ResourceAuthorizer, AccessPolicy, TaskState.isReadOnly/locksVisibility, GlobalExceptionHandler (409 EDICAO_CONCORRENTE) e a tela /tasks/[id]/edit com TaskForm modo edit; as demais (projeto, rascunho/autosave, reabrir, prazo legal, eventos AFTER_COMMIT) seguem (planejado); transversais reais: Guard, AuditLogPort, SecurityConfig, SessionActiveFilter, RedisAdaptersConfig.",
    "cas": [
      {
        "id": "RF12.CA01",
        "text": "Dado o usuário no card de uma tarefa ou projeto do seu perfil, quando aciona Editar, então /tasks/[id]/edit (ou /projects/[id]/edit) carrega o formulário com os dados atuais; tarefa: título, resumo, descrição, tipo, categoria/subcategoria, processTags/natureTags (≤ 2 cada), accessClass, prazo e prazo legal, prioridade, responsável, visibilidade, notas, Estúdio do card (RF11); projeto: título, emoji, objetivo, descrição, tags, prioridade, exercício, agrupamentos (RF25), eixo do plano (RF24), visibilidade, lista de tarefas por fase com prazo e responsável, orientação para a IA; AccessPolicy.canEdit = ownerId OU responsibleId (de alguma ProjectTask) OU Department.headUserId; demais → somente leitura e 403 ACESSO_NEGADO na API.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA02",
        "text": "Dado o envio (PATCH /api/tasks/{id} ou PATCH /api/projects/{id} com If-Match: version), então o serviço valida: título ≤ 200, ≤ 2 tags por eixo, categoria compatível com o tipo, prazo legal recalculado por LegalDeadlineRule quando a categoria tem prazo (legalOverrideReason obrigatório para sobrescrever, RF20.CA11), projeto com ≥ 1 tarefa em DEMANDA + 1 em outra fase (RF21.CA05) e sem ciclo de dependências → 422 VALIDACAO; version divergente → 409 CONFLITO_VERSAO para tarefa e último-vence com aviso CONFLITO_ULTIMO_VENCE para projeto (RF22.CA04). Contrato real da tarefa (17/10/2026): PUT /api/tasks/{id} com o TaskRequest completo e version no corpo (não PATCH + If-Match) e 409 EDICAO_CONCORRENTE (não CONFLITO_VERSAO); categoria×tipo, tags por eixo e prazo legal ainda não são validados.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA03",
        "text": "Dado o salvamento, então projeto com alteração estrutural (tarefa adicionada/removida, fase, prazo, responsável, dependência) grava ProjectVersion (versionNumber + 1, authorId, diffJson legível, snapshotJson); mudanças só descritivas também geram versão com reason DADOS; tarefa com mudança de state grava TaskStateLog; tudo com AuditLog TASK_UPDATED/PROJECT_UPDATED e correlationId.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA04",
        "text": "Dado o formulário aberto, então o rascunho é salvo a cada 10 s ou ao sair do campo: projeto em ProjectScheme.autosaveDraftJson (RF21.CA14); tarefa em Redis draft:task:{id}:{userId} com TTL 7 dias (proposta); ao reabrir, o sistema oferece Recuperar rascunho ou Descartar; o rascunho nunca é publicado sem o clique em Salvar.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA05",
        "text": "Dado alvo em TaskState CONCLUIDA/ARQUIVADA ou ProjectStatus CONCLUIDO/ARQUIVADO, então toda escrita devolve 409 TAREFA_BLOQUEADA / 409 PROJETO_BLOQUEADO; Reabrir exige justificativa (≥ 10 caracteres, senão 422 VALIDACAO) e gera TaskStateLog/ProjectVersion.reason REABERTURA + AuditLog TASK_REOPENED/PROJECT_REOPENED; tarefa MODELO_PUBLICO ou OFERECIDA (RF40/RF41) não pode mudar visibility/accessClass sem antes retirar a oferta (409 OFERTA_ATIVA).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF12.CA06",
        "text": "Dado o commit, então eventos AFTER_COMMIT TaskUpdated/ProjectUpdated: reindexam o item no OpenSearch (RF17/RF27), recalculam a capa-mosaico dos projetos que contêm a tarefa (RF38.CA03), invalidam o cache do card (Redis), atualizam ProjectTask.snapshotJson nos projetos de terceiros que referenciam a tarefa (RF23.CA03) e notificam (Notification PRAZO_PROXIMO/SISTEMA) o responsável quando prazo ou responsável mudou; tarefa EM_USO em projeto de outro dono tem mudança de prazo sinalizada no projeto (⛔ hasBlockingPending).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF13",
    "n": 13,
    "title": "Utilizar a funcionalidade gerar artefato dentro de esquemas, chats, abas e feed do Work Station",
    "hu": "COMO usuário conectado dentro do Work Station POSSO clicar em gerar artefato dentro de um esquema ou chat DECIA PARA receber um arquivo produzido por IA e alinhado com os objetivos de minha equipe.",
    "summary": "SessionArtifact (TAXONOMIA §5.14) nasce na sessão DECIA; o título atual do card estende a origem a esquemas (tarefa/projeto), chats (sessão DECIA e mensageria RF46), abas (Acervo, Buscar, Insights, Minha equipe) e feed (Mural). A entidade generalizada é GeneratedArtifact (proposta) com originType/originId, status (ArtifactStatus, proposta) e goalAlignmentJson (objetivos da equipe: PlanAxis, CollectiveGoal). A geração roda pelo AiEngine capability ARTEFATO com citações da Memória Institucional (RF33) e cota (AiQuota, RF42.CA06).",
    "route": "botão Gerar artefato ✦ em /tasks/[id], /projects/[id] (e Mesa), /decia/[sessionId] (aba Artefatos), /messages/[conversationId] (RF46), abas /tasks, /search, /insights, /departments/[slug]/team e itens do /mural; lista em /me/artifacts; API POST /api/artifacts, GET /api/artifacts/{id}, GET /api/me/artifacts, POST /api/artifacts/{id}/to-task, POST /api/artifacts/{id}/regenerate, GET /api/artifacts/{id}/download",
    "coverage": "RF13.CA01 · RF13.CA02 · RF13.CA03 · RF13.CA04 · RF13.CA05 · RF13.CA06 — corpo do card vazio: CAs derivados do título + HU13 + docs/diagramas/_anterior/RF13/README.md (RF13.CA01–CA06 da sessão: geração, EXPORT_PDF, notificação, Transformar em tarefa, Regerar, INDEXAR_MEMORIA) + RF42.CA06 (cota) + RF33.CA03 (citações), marcados (CA a confirmar). Todas as classes do RF são (planejado); reais: Guard, AuditLogPort, SecurityConfig, AiProvidersConfig, S3StorageConfig.",
    "cas": [
      {
        "id": "RF13.CA01",
        "text": "Dado o usuário em um esquema (tarefa/projeto), chat (sessão DECIA ou mensageria RF46), aba (Acervo, Buscar, Insights, Minha equipe) ou item do feed/Mural, quando aciona Gerar artefato ✦, então escolhe o kind compatível com a origem (RELATORIO · ATA · CHECKLIST · RESUMO_PDF · MINUTA_DOCUMENTO · PLANILHA · CRONOGRAMA · APRESENTACAO propostos) e uma instrução (≤ 1 000); POST /api/artifacts {originType, originId, kind, instruction} cria GeneratedArtifact SOLICITADO e devolve 202 {artifactId}; a geração roda em PipelineJob GERAR_ARTEFATO (tipo proposto) com resposta esperada ≤ 30 s; kind incompatível ou instrução vazia → 422 VALIDACAO; origem sem conteúdo → 409 SEM_BASE_PARA_ARTEFATO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA02",
        "text": "Dado o job, então ArtifactContextBuilder monta o contexto por origem: esquema → TaskItem/ProjectScheme + ProjectTasks + decisões vinculadas (DeciaSession.linkedProjectId); chat → SessionMessages + MessageClassification (ou DirectMessages de DirectConversation, RF46); aba → filtros ativos + itens visíveis; feed → MuralEntry alvo; sempre acrescenta os objetivos da equipe (PlanAxis do AnnualPlan do departamento, CollectiveGoal ABERTAS) em goalAlignmentJson; só entra o que o requerente pode ver (AccessPolicy.canView); accessClass RESTRITO/SIGILOSO em qualquer item → motor local (BLOQUEADO_SIGILO para externo) ou item mascarado.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA03",
        "text": "Dado o contexto, então AiEngine (capability ARTEFATO, hostRf RF13, inputSummaryJson.originType) gera title + contentMd fundamentado com citações da Memória Institucional (Citation; \"Sem precedente\" quando vazio, RF33.CA03), após AiQuota.tryConsume (créditos antes da cota mensal; sem saldo → 409 COTA_ESGOTADA + Loja); AiInferenceLog registra provider, modo (ECONOMIA/AVANCADO), tokens e quotaSource; faísca ✦ com tooltip \"gerado por IA em data\" (RF38.CA04); limite de 10 gerações/hora por usuário → 429 LIMITE_GERACAO (proposta, RateLimitPort).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA04",
        "text": "Dado contentMd salvo (GERADO), então PipelineJob EXPORT_PDF (ou XLSX para PLANILHA/CRONOGRAMA) renderiza o arquivo, grava em S3 (MediaObject) e preenche mediaObjectId (PRONTO); PipelineJob INDEXAR_MEMORIA indexa InstitutionalMemoryDocument.sourceType ARTEFATO; falha de render mantém o contentMd legível e o job vai a REPROCESSAR; falha de indexação não bloqueia (RF33.CA06).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA05",
        "text": "Dado o artefato pronto, então Notification ARTEFATO vai ao requerente (e a todos os participantes quando a origem é chat, groupKey = originId); o artefato aparece na origem (painel Artefatos do esquema, aba Artefatos da sessão, mensagem SISTEMA no chat, bloco da aba, comentário do item do feed) e em /me/artifacts; ações: baixar (URL assinada), Transformar em tarefa (TaskItem com sourceKind DECIA se origem for sessão, senão TEXTO_IA; ATA → ATA_REGISTRO, RELATORIO/MINUTA → DOCUMENTO, CHECKLIST → FORMULARIO, PLANILHA → PLANILHA, CRONOGRAMA → CRONOGRAMA; convertedTaskId; repetir → 409 ARTEFATO_JA_CONVERTIDO), Regerar com ajuste (nova linha, anterior preservada, supersedesArtifactId), compartilhar no Mural (RF26.CA05); anexado numa sessão e usado na decisão → MessageAttachment.usedInDecision e DP ARTEFATO_USADO (RF42).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF13.CA06",
        "text": "Dado o pedido, então 403 ACESSO_NEGADO quando o requerente não pode ver a origem (não participante da sessão/chat, item PRIVADO de terceiro, aba de gestão sem requireDeptHead); a visibilidade do artefato herda a da origem (Visibility da tarefa/projeto, participantes do chat, dono da aba); artefatos de origem SIGILOSA nunca vão ao Mural nem à Memória pública; AuditLog ARTIFACT_GENERATED com correlationId.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF14",
    "n": 14,
    "title": "Visualizar perfil de um chefe de departamento",
    "hu": "COMO usuário dentro do sistema Work Station POSSO procurar o perfil de um chefe de departamento PARA obter informação relevante ou realizar alguma funcionalidade.",
    "summary": "O \"perfil do chefe\" é a página do departamento (Department, TAXONOMIA §1.5) que ele chefia (headUserId): cabeçalho institucional, sub-abas públicas e ações por papel (AccessPolicy); a conta pessoal do chefe (/u/[username]) é o RF16. Métricas vêm de MetricSnapshot (scope DEPARTAMENTO) e nunca expõem dados nominais de desempenho (RF45.CA10).",
    "route": "página do departamento /departments/[slug] (Matriz D de ABAS_POR_PERFIL §5 — é o que o board chama de \"perfil do chefe\"), alcançada pela aba Buscar (RF17), por /companies/[slug] › Departamentos (RF15) ou pelo perfil pessoal do chefe (/u/[username], RF16); API GET /api/departments/{slug}, GET /api/departments/{id}/tabs/{tab}, GET /api/departments/{id}/metrics?period=, POST|DELETE /api/follows",
    "coverage": "RF14.CA01 · RF14.CA02 · RF14.CA03 · RF14.CA04 · RF14.CA05 · RF14.CA06 — corpo do card vazio: CAs derivados do título + HU14 + RF28.CA02/CA03/CA04/CA06/CA08 (docs/diagramas/RF28/README.md) + RF27.CA06 (seguir) + RF45.CA06/CA10 (Hype) + Matriz D, marcados (CA a confirmar). Todas as classes do RF são (planejado); reais: User (companyId/departmentId sem FK até o RF28, D-23), Guard, SecurityConfig. Atualização 17/10/2026: o cabeçalho público de pessoa do chefe já tem fonte real em GET /api/people/by-username/{username} (PeopleController → PeopleService.byUsername → PublicProfileView, em curso, Onda 1); a API institucional do departamento segue (planejado).",
    "cas": [
      {
        "id": "RF14.CA01",
        "text": "Dado qualquer usuário (inclusive visitante), quando busca um chefe/departamento (aba Buscar por nome, sigla ou nome do chefe; lista de departamentos da empresa; menção @sigla) e abre /departments/[slug], então vê o cabeçalho: Department.acronym, name, color, monogram, coverUrl, about, chefe (User de headUserId: avatar, fullName, jobTitle → \"Chefe de {acronym}\"), Company (logo + link para RF15), contadores (pessoas com DepartmentMembership vigente, projetos publicados, decisões validadas, chancelas emitidas, seguidores) e botão Seguir; slug inexistente ou active = false → 404 DEPARTAMENTO_NAO_ENCONTRADO. Fonte real do bloco do chefe (em curso, Onda 1): PublicProfileView de GET /api/people/by-username/{username} (avatar, fullName, jobTitle, profileType); o cabeçalho do departamento segue planejado.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA02",
        "text": "Dado o cabeçalho, então as sub-abas públicas são: Sobre · Projetos do departamento (filtros fase, exercício; canView por item) · Sessões DECIA (membro vê as suas, mesma empresa vê PÚBLICAS/encerradas com resumo, visitante não vê) · Chancelas do departamento (Seal ATIVA; a fila de revisão só para chefe/curador) · Reconhecimentos emitidos (Recognition.publicOnMural) · Equipe (modo público: nome, cargo, monograma, etiqueta \"Curador\" por CuratorAppointment ativo); tab + filtros + página ficam na URL.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA03",
        "text": "Dado o período selecionado (padrão: exercício corrente), então as métricas públicas (RF28.CA04) são agregadas: projetos publicados, modelos oficiais/chancelas APROVADAS, decisões VALIDADAS, tempo médio até decisão, pessoas; vêm de MetricSnapshot (DEPARTAMENTO) com cache Redis metrics:department:{id}:{period} TTL 300 s; nunca expõem HSE, Hype ou DECIA Points nominais (RF45.CA10) — só histograma anonimizado quando o viewer é o chefe.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA04",
        "text": "Dado o viewer autenticado, quando aciona Seguir, então é criado Follow {followerId, targetType DEPARTMENT, targetId, status ATIVO} (único; repetir é idempotente → 200 com o mesmo registro); Deixar de seguir → status REMOVIDO; os eventos do departamento (projeto publicado, decisão validada, reconhecimento) entram na sub-aba Seguindo do Mural (RF27) e em TimelineEvent do seguidor; visitante anônimo → 401 NAO_AUTENTICADO com convite a entrar.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA05",
        "text": "Dado o viewer, então as ações da página dependem do papel: membro do departamento → \"Pedir chancela\", \"Indicar colega\", \"Propor chancela\" (RF39.CA06), \"Mensagem ao chefe\" (RF46); mesma empresa → \"Levar ao meu acervo\" nos modelos oficiais (RF41.CA08), \"Mensagem\"; chefe (headUserId) e EMPRESA dona → \"Gerir\" (Minha equipe RF9/RF10, Dashboard do emissor RF28.CA06, Insights da Equipe RF43.CA14); link \"Ver perfil pessoal\" abre /u/[username] do chefe (RF16).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF14.CA06",
        "text": "Dado o viewer, então a visibilidade por item segue AccessPolicy.visibilityFilter: anônimo/outra empresa → só PUBLICA; mesma empresa → + EMPRESA; membro → + DEPARTAMENTO; sub-abas de gestão → 403 ACESSO_NEGADO no serviço para quem não é headUserId nem Company.ownerUserId (curador com escopo FILA_REVISAO/PREMIACAO vê só a fila/premiação); dados pessoais (email, phone) nunca saem na API da equipe; página em pt-BR/en/es e responsiva. Real (17/10/2026): a projeção pública de pessoa (PublicProfileView) já não carrega contato; no front, contadores e composição de projeto contam só o que o viewer vê (b602d34, lib/social/rules.ts).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF15",
    "n": 15,
    "title": "Visualizar perfil de um empresa ou órgão público/privado",
    "hu": "COMO usuário dentro do sistema Work Station POSSO procurar o perfil de uma empresa ou órgão público/privado PARA obter informação relevante ou realizar alguma funcionalidade.",
    "summary": "A página da empresa (Company, TAXONOMIA §1.4; ownerUserId = conta EMPRESA aprovada, RF28.CA01) agrega departamentos (RF14), programas (RF25), plano anual oficial (RF24), chancelas e modelos oficiais (RF39/RF40), benefícios (RF39.CA09), destaques (RF35), pessoas e Comunicados (proposta §7.a). A aba Gestão só existe para Company.ownerUserId e é negada no serviço.",
    "route": "página da empresa /companies/[slug] (Matriz C de ABAS_POR_PERFIL §4), alcançada pela lista /companies, pela aba Buscar (RF17), pelo cabeçalho de qualquer perfil/departamento ou pela barra inferior (5º destino para EMPRESA e visitante); API GET /api/companies, GET /api/companies/{slug}, GET /api/companies/{id}/tabs/{tab}, GET /api/companies/{id}/metrics?period=&dept=, POST|DELETE /api/follows, POST /api/companies/{id}/announcements (proposta)",
    "coverage": "RF15.CA01 · RF15.CA02 · RF15.CA03 · RF15.CA04 · RF15.CA05 · RF15.CA06 — corpo do card vazio: CAs derivados do título + HU15 + RF28.CA01/CA04/CA06/CA08 (docs/diagramas/RF28/README.md) + RF24.CA04 + RF39.CA09/CA11 + RF27.CA06 + Matriz C e §7.a (Comunicados), marcados (CA a confirmar). Todas as classes do RF são (planejado); reais: User.profileType EMPRESA, AccountStatus.PENDING_VALIDATION, Guard, SecurityConfig. Atualização 17/10/2026: o cabeçalho público de pessoa (inclusive da conta EMPRESA dona e dos chefes) já tem fonte real em GET /api/people/by-username/{username} (PeopleController → PeopleService.byUsername → PublicProfileView, em curso, Onda 1); a API institucional da empresa segue (planejado).",
    "cas": [
      {
        "id": "RF15.CA01",
        "text": "Dado qualquer usuário (inclusive visitante), quando busca uma empresa/órgão (Buscar por legalName/sigla, lista /companies, link em perfil ou departamento) e abre /companies/[slug], então vê o cabeçalho: Company.logoUrl, coatOfArmsUrl, legalName, about, websiteUrl, accentColor como cor de destaque, e contadores institucionais (departamentos ativos, pessoas, projetos publicados, modelos oficiais, decisões validadas, seguidores) — sem cargo, departamento, Hype, Tarefa do Dia ou DP; slug inexistente, Company.status inativo ou dona ainda PENDING_VALIDATION → 404 EMPRESA_NAO_ENCONTRADA. Real (17/10/2026): o cabeçalho público da pessoa dona tem fonte em PublicProfileView (GET /api/people/by-username/{username}, em curso, Onda 1; não ACTIVE → 404 NAO_ENCONTRADO); os contadores do front contam só o que o viewer vê (b602d34); o cabeçalho institucional segue planejado.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA02",
        "text": "Dado o cabeçalho, então as sub-abas públicas são: Sobre · Departamentos (Department ativos → RF14) · Programas (Grouping PROGRAMA, RF25) · Plano Anual oficial (AnnualPlan scope EMPRESA PUBLICADO com 6 PlanAxis; botão Derivar, RF24.CA04) · Chancelas e modelos oficiais (Seal ATIVA + ModelOffer shelf CHANCELADO, RF39.CA11) · Benefícios (Benefit DISPONIVEL, RF39.CA09) · Destaques (Highlight do mês, RF35.CA03) · Pessoas (nomes/cargos públicos por departamento) · Comunicados (proposta); tab + filtros + página na URL.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA03",
        "text": "Dado a sub-aba Comunicados (proposta), então EMPRESA dona e CHEFES da empresa publicam Announcement {companyId, departmentId?, authorId, title, bodyMd, attachmentsJson, visibility EMPRESA/PUBLICO, pinned, commentsEnabled, publishedAt, archivedAt}; comunicado de chefe sai com o monograma do departamento; colegas reagem (Reaction) e comentam (Comment, TargetType ANNOUNCEMENT proposto) quando commentsEnabled; fixados ficam no topo; cada publicação entra no Mural como MuralEntry.kind COMUNICADO (proposto) com etiqueta \"Oficial\"; visitante/outra empresa vê só PUBLICO; EMPREGADO/CURADOR que tenta publicar → 403 ACESSO_NEGADO; título vazio → 422 VALIDACAO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA04",
        "text": "Dado o período (padrão: exercício corrente) e o filtro opcional por departamento, então as métricas públicas (RF28.CA04) — projetos publicados, modelos oficiais, decisões validadas, chancelas emitidas, benefícios resgatados — vêm de MetricSnapshot (scope EMPRESA) com cache Redis metrics:company:{id}:{period} TTL 300 s; nunca dados nominais de desempenho (RF45.CA10).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA05",
        "text": "Dado o viewer autenticado, então as ações são: Seguir (Follow COMPANY, único e idempotente; eventos no Seguindo do Mural, RF27.CA06), Derivar o plano oficial (mesma empresa; plano não PUBLICADO → 422 DERIVACAO_INVALIDA, RF24.CA04), Resgatar benefício (exige SealBond APROVADA → senão 409 CHANCELA_INVALIDA, RF39.CA10), Levar ao meu acervo um modelo oficial (RF41.CA08), Propor chancela (EMPREGADO da empresa, RF39.CA06), Mensagem (RF46), abrir departamento (RF14); visitante anônimo → 401 NAO_AUTENTICADO nas ações.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF15.CA06",
        "text": "Dado o viewer, então a aba Gestão (Departamentos & chefes, Pessoas & lotações, Chancelas & políticas, Benefícios, Plano oficial, Programas, Políticas, Dashboard do emissor, Insights da empresa, Dossiês, Comunicados) só aparece para Company.ownerUserId e é negada no serviço (403 ACESSO_NEGADO) para qualquer outro, inclusive CHEFE e ADMIN em escrita; visibilidade por item segue AccessPolicy.visibilityFilter (anônimo/outra empresa → PUBLICA; mesma empresa → + EMPRESA); cnpj (AES) só para a dona e ADMIN; página em pt-BR/en/es e responsiva. Real (17/10/2026): no front, contadores e composição de projeto já seguem a ACL do viewer (SIGILOSO = PRIVADA, lib/social/rules.ts, b602d34); a projeção pública de pessoa (PublicProfileView) não carrega contato.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF16",
    "n": 16,
    "title": "Visualizar perfil de um usuário comum que é empregado dentro de uma empresa",
    "hu": "COMO usuário dentro do sistema Work Station POSSO visualizar o perfil de um usuário que trabalha dentro uma organização PARA realizar alguma funcionalidade.",
    "summary": "O perfil de terceiros é o mesmo /u/[username] do RF6, mas com viewer != owner: só as sub-abas 1–5 (Acervo Digital, Projetos, Planos, Decisões, Perfil deliberativo público), itens filtrados por AccessPolicy.visibilityFilter, Hype conforme User.hypeVisibility e ações sociais inline (RF18/RF19) + \"Levar ao meu acervo\" (RF7). Contas institucionais (EMPRESA/CHEFE) recebem a etiqueta e o atalho para a página da empresa (RF15) ou do departamento (RF14).",
    "route": "perfil de terceiros /u/[username] (Matriz B de ABAS_POR_PERFIL §3, colunas \"terceiros\"); API GET /api/users/{username} (real como GET /api/users/{id} → UserView), GET /api/users/{username}/tabs, GET /api/users/{username}/tabs/{tab}, POST|DELETE /api/follows",
    "coverage": "RF16.CA01 … RF16.CA06 — corpo do card vazio: CAs derivados do título + HU16 + _anterior/RF19 CA02 (perfil de terceiros) e Matriz B (colunas \"terceiros\"); todos marcados \"(CA a confirmar)\". Real (Bloco 3): MeController.profile (GET /api/users/{id}, Guard.ownerOrAdmin para campos privados), AccountService.profile, UserView, User.hypeVisibility; o resto (planejado). Atualização 17/10/2026 (real, em curso, Onda 1, P19): PeopleService (PublicProfileView, byUsername, visibleById, search), PeopleController, ResourceAuthorizer.requireProfileVisible, TaskService.listOf e AccessPolicy.sigiloso (D-139).",
    "cas": [
      {
        "id": "RF16.CA01",
        "text": "Dado um usuário autenticado, quando abre /u/{username} de um EMPREGADO, então vê o cabeçalho público: avatar, nome, cargo (jobTitle), empresa, departamento (sigla, cor, monograma), contadores (tarefas, projetos, decisões, seguidores) e o botão Seguir; username inexistente → 404 USUARIO_NAO_ENCONTRADO; conta SUSPENDED/DELETION_SCHEDULED/ANONYMIZED → 404 (não enumera contas); email/phone nunca saem (UserView público). Real (em curso, Onda 1): GET /api/people/by-username/{username} → PeopleService.byUsername → PublicProfileView (sem contato); o código real da recusa é 404 NAO_ENCONTRADO, igual para inexistente e para qualquer conta não ACTIVE (ResourceAuthorizer.requireProfileVisible). Contadores servidos pela API: (planejado).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA02",
        "text": "Dado o perfil de terceiro, quando a API devolve a lista de sub-abas, então só vêm as sub-abas 1–5 (Acervo Digital · Projetos · Planos · Decisões · Perfil deliberativo público); as 6–15 (salvos, pontos, Tarefa do Dia, HSE, configurações…) são omitidas e uma chamada direta a /tabs/{6..15} responde 403 ACESSO_NEGADO (sem bypass para ADMIN nas sub-abas 9, 13, 14, 15 — dados de desempenho nominal, RF45.CA10).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA03",
        "text": "Dado uma sub-aba 1–4, quando listo os itens, então cada TaskItem, ProjectScheme, AnnualPlan/Grouping e FinalDecision passa pelo visibilityFilter: PUBLICA sempre; EMPRESA se viewer.companyId == owner.companyId; DEPARTAMENTO se o viewer tem DepartmentMembership vigente no departamento do item; PRIVADA nunca; RASCUNHO nunca. Contadores do cabeçalho contam só o que o viewer pode ver. Real (17/10/2026): GET /api/people/{id}/tasks → TaskService.listOf filtra por AccessPolicy.visible (nome real do visibilityFilter); SIGILOSO equivale a PRIVADA — só dono e colaboradores explícitos, sem acesso implícito do ADMIN (AccessPolicy.sigiloso, D-139, AccessPolicyMatrixTest); no front, contadores e composição de projeto já não contam nem titulam tarefas ocultas (b602d34).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA04",
        "text": "Dado o cabeçalho, quando owner.hypeVisibility é PUBLICO então o Hype Score (ProfileHypeScore) aparece para todos; EMPRESA só para a mesma empresa; SO_EU nunca — a API não devolve o campo (nem para CHEFE nem para ADMIN). A sub-aba 5 mostra só DeliberativeProfile.publicIndicatorsJson e badgesJson escolhidos pelo dono.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF16.CA05",
        "text": "Dado uma sub-aba aberta, quando aplico filtros e paginação (?tab=&fase=&categoria=&page=&size=20), então a URL reflete o estado e cada card traz as ações inline do RF18/RF19 (curtir, comentar, salvar, compartilhar, remixar, atribuir) e, no Acervo, \"Levar ao meu acervo\" (RF7/RF41.CA08) — todas respeitando a visibilidade do item.",
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
    "summary": "A busca lê os índices OpenSearch ws-tasks, ws-projects, ws-people e ws-orgs (ARQUITETURA §3.2) com o mesmo AccessPolicy.visibilityFilter dos perfis (RF16), devolve 5 abas com contadores e abre o esquema de terceiro em modo leitura com crédito do autor. \"Projetos parecidos\" usa AiEngine capability MEMORIA_BUSCA (embedding) e kNN em ws-memory (RF33), com fallback textual. A indexação é assíncrona (PipelineJob INDEXAR_BUSCA, proposta) a partir dos eventos de publicação/alteração/arquivamento.",
    "route": "Buscar (/search, abas PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) e páginas de leitura de esquema de terceiros (/tasks/[id], /projects/[id]); API GET /api/search?q=&tab=&filters…&page=, GET /api/search/suggestions, GET /api/projects/{id}/similar, GET /api/tasks/{id}, GET /api/projects/{id}",
    "coverage": "RF17.CA01 … RF17.CA06 — corpo do card vazio: CAs derivados do título + HU17 + RF27 (CA03 busca, CA04 visibilidade, CA05 semântica); todos marcados \"(CA a confirmar)\". O Mural (RF27.CA01/CA02/CA06) continua no RF27. Todas as classes do RF são (planejado); reais: OpenSearchAdaptersConfig (flag opensearch.enabled), AiProvidersConfig, Guard, SecurityConfig. Atualização 17/10/2026 (real): regra de leitura AccessPolicy.visible/decide/sigiloso (D-139), TaskController.get → TaskService.get → ResourceAuthorizer.require com 404 NAO_ENCONTRADO uniforme, TaskService.listOf (em curso, Onda 1) e components/social/TaskDetail.tsx com o mesmo 404 (D-141).",
    "cas": [
      {
        "id": "RF17.CA01",
        "text": "Dado um usuário autenticado em /search, quando digita um termo, então o sistema busca em título, descrição, tags e texto OCR (OpenSearch ws-tasks, ws-projects, ws-people, ws-orgs) e devolve 5 abas com contadores (PROJETOS · TAREFAS · PESSOAS · EMPRESAS · CHEFES DE DEPARTAMENTO) em ≤ 1 s p95; termo vazio mostra sugestões (recentes, em alta, chancelados) via GET /api/search/suggestions.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA02",
        "text": "Dado uma aba, quando aplico filtros (categoria, tipo, fase, departamento, exercício, chancelado, prazo) e pagino (20 por página), então a URL reflete q, tab, filtros e page; a tela mostra Skeleton ao carregar, EmptyState ilustrado e ErrorState com \"tentar de novo\" em erro (503 BUSCA_INDISPONIVEL quando o OpenSearch está fora ou a flag está desligada).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA03",
        "text": "Dado os resultados, quando são devolvidos, então só contêm itens que o viewer pode ver (AccessPolicy.visibilityFilter aplicado como filtro da query): PUBLICA sempre; EMPRESA se mesma empresa; DEPARTAMENTO se membro; PRIVADA só os meus; RASCUNHO nunca aparece para terceiros; accessClass SIGILOSO nunca é indexado e RESTRITO só para o departamento dono. Resultados de outra empresa só se PUBLICA. Real (17/10/2026): a regra item a item já existe em AccessPolicy.visible/decide — SIGILOSO só para dono e colaboradores explícitos, sem acesso implícito do ADMIN (AccessPolicy.sigiloso, D-139, AccessPolicyMatrixTest); a busca que a aplicará segue planejada.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA04",
        "text": "Dado um resultado de tarefa ou projeto de outro usuário, quando o abro, então vejo o esquema completo em modo leitura (ficha, fases e tarefas do projeto, capa, chancelas) com o crédito do autor (avatar + link para RF16/RF14/RF15), as ações inline do RF18/RF19 e \"Levar ao meu acervo\" (RF7/RF41.CA08); edição é 403 ACESSO_NEGADO; item que ficou PRIVADA depois de indexado responde 404 e sai do índice. Real (17/10/2026): GET /api/tasks/{id} → invisível = 404 NAO_ENCONTRADO uniforme (ResourceAuthorizer.require → AccessDecision.NOT_FOUND), também no front (components/social/TaskDetail.tsx, D-141, revisa a D-93); editar sem permissão → PUT /api/tasks/{id} 403 ACESSO_NEGADO; o card de projeto não mostra título nem total de tarefa oculta (lib/social/view-model.ts, b602d34). Leitura de projeto pela API segue planejada (Onda 2).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA05",
        "text": "Dado um projeto aberto, quando clico em \"projetos parecidos com este\", então o sistema gera o embedding (AiEngine MEMORIA_BUSCA) e faz kNN em ws-memory com o mesmo visibilityFilter, devolvendo até 10 projetos com score e motivo (\"mesmo processo, 4 tarefas em comum\"); sem IA disponível cai para \"mais do mesmo processo/departamento\" (busca textual); AiInferenceLog registra a inferência.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF17.CA06",
        "text": "Dado que um autor publica, altera a visibilidade ou arquiva uma tarefa/projeto, quando a transação é confirmada, então o evento AFTER_COMMIT agenda PipelineJob INDEXAR_BUSCA (tipo proposto) e o índice reflete a mudança em ≤ 60 s; falha deixa o job REPROCESSAR sem afetar a operação do autor.",
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
    "summary": "A barra de interações do card tem sete ações. As cinco sociais (Reaction, Comment, SavedItem, Share, Remix, TAXONOMIA §8) são detalhadas no RF19 (que carrega os RF26.CA01–09 no corpo); aqui elas entram como remissão (CA01–CA02). As duas novas — atribuir e retornar — usam a mesma entidade Assignment do RF10 (chefe) e do RF46 (chat), com origin BOTAO_ESQUEMA e sem exigir papel de chefe: qualquer usuário que vê o item pode atribuí-lo a um colega da mesma empresa.",
    "route": "ações inline em todo card de tarefa/projeto (Acervo RF6, Projetos, Mural RF27, Buscar RF17, perfil de terceiros RF16, Mesa RF21/RF22); API /api/interactions/{type}/{id}/reactions|comments|saves|shares|remixes|counters (RF19) + POST /api/assignments (origem BOTAO_ESQUEMA), POST /api/assignments/{id}/accept|refuse|give-back (TAXONOMIA §12b, compartilhada com RF10 e RF46)",
    "coverage": "RF18.CA01 … RF18.CA06 — corpo do card vazio: CA01–CA02 remetem aos RF26.CA01–09 citados no card RF19; CA03–CA06 modelam as duas interações novas do título (\"atribuir\" = Assignment PROPOSTA pelo botão do esquema, \"retornar\" = Assignment → DEVOLVIDA com motivo); todos marcados \"(CA a confirmar)\". Todas as classes do RF são (planejado); reais: Guard, AuditLogPort, SecurityConfig, RedisAdaptersConfig, CassandraAdaptersConfig.",
    "cas": [
      {
        "id": "RF18.CA01",
        "text": "Dado um card de tarefa ou projeto visível para mim, quando abro a barra de interações (Counters), então posso curtir/reagir, comentar, salvar, compartilhar e remixar exatamente como nos RF26.CA01–CA07 (card RF19), com contadores em tempo quase real (Redis → MySQL em lote).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA02",
        "text": "Dado qualquer interação, quando é enviada, então respeita a visibilidade do alvo (RF26.CA08: PRIVADA só dono, DEPARTAMENTO só membros, EMPRESA só mesma empresa → 403 ACESSO_NEGADO, AccessPolicy.canInteract) e gera notificação agrupada por hora ao dono (RF26.CA09, Notification.groupKey).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA03",
        "text": "Dado um usuário que vê a tarefa/projeto, quando clica Atribuir, escolhe um colega da mesma empresa, prazo e nota, então nasce Assignment PROPOSTA (origin BOTAO_ESQUEMA, previousResponsibleId = responsável atual) com AuditLog ASSIGNMENT_CREATED e Notification ATRIBUICAO_PROPOSTA; se o ator é CHEFE e o destinatário membro do seu departamento a origem é MINHA_EQUIPE (RF10); colega de outra empresa → 403 EMPRESA_DIFERENTE; alvo que o ator não pode ver → 403 ACESSO_NEGADO; tarefa ARQUIVADA/CONCLUIDA ou projeto CONCLUIDO/ARQUIVADO → 409 ESTADO_INVALIDO; já existe PROPOSTA/ACEITA para o mesmo alvo e destinatário → 409 ATRIBUICAO_DUPLICADA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA04",
        "text": "Dado uma Assignment PROPOSTA para mim, quando aceito, então ela vai a ACEITA, TaskItem.responsibleId/ProjectTask.responsibleId passam a mim, TaskStateLog registra (DISPONIVEL → EM_USO se era DISPONIVEL), a atribuição entra no índice de prioridade da minha Tarefa do Dia (RF44) e o remetente recebe ATRIBUICAO_ACEITA; quando recuso, informo motivo (reason, senão 422 MOTIVO_OBRIGATORIO) e ela vai a RECUSADA com ATRIBUICAO_RECUSADA; só o destinatário responde (403 ACESSO_NEGADO) e resposta repetida é 409 ATRIBUICAO_JA_RESPONDIDA.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA05",
        "text": "Dado uma Assignment ACEITA minha, quando clico Retornar e informo o motivo (≥ 20 caracteres), então ela vai a DEVOLVIDA, responsibleId volta a previousResponsibleId, TaskStateLog registra com o motivo, AuditLog ASSIGNMENT_RESPONDED grava e o remetente recebe ATRIBUICAO_DEVOLVIDA; o card do remetente mostra Stamp DEVOLVIDO + motivo até ele reatribuir ou retomar; sem Assignment ACEITA para mim → 404 SEM_ATRIBUICAO; motivo curto → 422 MOTIVO_OBRIGATORIO.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF18.CA06",
        "text": "Dado o card, quando o abro, então vejo o histórico de atribuições e retornos (Assignment por alvo: com quem, quando, status e motivo) ao lado dos contadores sociais; o perfil do destinatário (RF16) mostra a etiqueta \"atribuída por …\" nos itens visíveis; DELEGUEI da Tarefa do Dia (RF44) cria uma nova Assignment PROPOSTA (caminho inverso) — regras completas em RF46.CA03–CA05.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF19",
    "n": 19,
    "title": "Curtir, comentar, salvar, compartilhar, retornar, atribuir e remixar tarefas, esquemas de projeto e planos anuais (interações sociais)",
    "hu": "COMO usuário autenticado POSSO curtir, reagir, comentar, salvar, compartilhar e remixar tarefas, esquemas de projeto e planos anuais PARA colaborar, dar retorno de qualidade e reaproveitar o trabalho dos colegas.",
    "summary": "Alvos: TargetType TASK · PROJECT · PLAN (TAXONOMIA §8). Entidades: Reaction (CURTIR + 4 reações qualitativas), Comment (thread, menções), SavedItem, Share (MURAL · SESSAO_DECIA · LINK_EXTERNO), Remix (cópia com crédito). Contadores desnormalizados nas entidades-alvo (likesCount … remixesCount) com Redis para tempo quase real; toda interação gera Notification agrupada por hora e alimenta o DeliberativeProfile (objetivo 2).",
    "route": "ações inline em todos os cards (Acervo RF6, Projetos, Planos Anuais RF24, Mural RF27, Buscar RF17, perfil RF16)",
    "coverage": "RF26.CA01 · RF26.CA02 · RF26.CA03 · RF26.CA04 · RF26.CA05 · RF26.CA06 · RF26.CA07 · RF26.CA08 · RF26.CA09 — citados como estão escritos no card (corpo do card = antigo RF26, ver RENUMERACAO.md). As interações retornar e atribuir constam só no título, sem CA no corpo: estão modeladas no RF18 (CA03–CA06) e aqui aparecem só como remissão. Todas as classes do RF são (planejado); reais: Guard, AuditLogPort, SecurityConfig, RedisAdaptersConfig, CassandraAdaptersConfig.",
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
    "summary": "O \"construtor\" aqui é o painel Adequação do acervo do Criador de Projetos (RF5): mede o Score do Acervo (MetricDefinition/MetricSnapshot, RF43.CA03), monta um projeto hipotético com as tarefas compatíveis do Acervo (PhaseCompatibility, como no RF5) e o avalia contra o Espelho de Conformidade (ComplianceChecklist/ComplianceItem, RF32) sem persistir ProjectScheme nem ComplianceResult. A IA só redige a explicação (AiEngine INSIGHT); o resultado vira um Insight (scope ACERVO) com ações de 1 clique e pode abrir o compositor do RF5 pré-preenchido.",
    "route": "painel Adequação do acervo dentro do Criador de Projetos (/projects/new?painel=adequacao, proposta) e sub-aba Insights › Acervo (/insights/acervo, RF43); API GET /api/insights/acervo/score, POST /api/insights/acervo/evaluate {processTag}, GET /api/insights?scope=ACERVO, POST /api/projects/from-hypothetical",
    "coverage": "RF20.A01 … RF20.A06 — o título define o RF: CAs derivados do título + HU20, numerados RF20.A01…A06 e marcados \"(CA a confirmar)\". Corpo do card = criador de tarefas (RF20.CA01–CA15: Fonte · Detecção por IA · Dados · Mais detalhes · Arte do card) — esses CAs são citados abaixo como estão escritos e estão diagramados no RF4 (Criador de tarefas) e em _anterior/RF20; não são modelados aqui. Todas as classes do RF são (planejado); reais: Guard, AiProvidersConfig, RedisAdaptersConfig.",
    "cas": [
      {
        "id": "RF20.A01",
        "text": "Dado um empregado no Criador de Projetos, quando abre o painel Adequação do acervo, então vê o Score do Acervo (0–100) com decomposição (cobertura por processo, tarefas paradas, duplicadas, \"fantasma\" sem anexo, prazos legais em risco, reutilização) e o mapa de lacunas por processo (ProcessTag × categorias esperadas), calculados por AcervoInsightService sobre MetricDefinition/MetricSnapshot (RF43.CA03); acervo com menos de 3 tarefas mostra \"o que coletar\" em vez de números.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A02",
        "text": "Dado um processo escolhido (ex.: LICITACAO), quando peço \"avaliar adequação\", então o sistema monta um projeto hipotético com as tarefas compatíveis do meu Acervo (PhaseCompatibility.phasesFor, só DISPONIVEL/EM_USO/MODELO_PUBLICO) e roda ComplianceService.evaluateHypothetical contra o checklist ativo da empresa/departamento (RF32.CA01), devolvendo % de conformidade, itens ATENDIDO / RECOMENDADO_AUSENTE / OBRIGATORIO_AUSENTE ⛔ / FORA_DE_ORDEM e qual tarefa satisfaz cada item; nada é persistido como ProjectScheme nem ComplianceResult.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A03",
        "text": "Dado o resultado, quando a IA está disponível, então AiEngine INSIGHT (hostRf RF20) redige em até 3 frases por lacuna \"por que isto falta e o que fazer\", citando métrica e valor (faísca ✦, AiInferenceLog); IA indisponível, sem cota ou accessClass RESTRITO/SIGILOSO → texto-padrão do LocalEngine, com os mesmos números.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A04",
        "text": "Dado uma lacuna OBRIGATORIO_AUSENTE, quando aciono a ação de 1 clique, então posso: criar a tarefa faltante (abre o RF4 pré-preenchido com categoria/tipo/fase esperados e checklistItemId, RF32.CA03), buscar modelo no Balcão (RF40) ou na Buscar (RF17), ou levar ao meu acervo uma tarefa compatível de colega (RF7); a ação fica em Insight.actionsJson e o painel recalcula ao voltar.",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A05",
        "text": "Dado um resultado com conformidade ≥ limiar do checklist e sem ⛔, quando clico Compor projeto com estas tarefas, então o compositor (RF5) abre com as fases pré-preenchidas pelo projeto hipotético e o ProjectScheme nasce RASCUNHO com aiOrientation = processo escolhido; com ⛔ o botão fica disponível com aviso \"projeto nascerá com pendência bloqueante\" (hasBlockingPending) — aviso, não impedimento (RF32.CA04).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.A06",
        "text": "Dado o painel, quando a avaliação termina, então um Insight (scope ACERVO, kind ADEQUACAO_PROCESSO, metricRefsJson, actionsJson, severity) é gravado para o usuário e aparece em Insights › Acervo (RF43) até ser dispensado (dismissedAt) ou até o próximo recálculo; avaliação de acervo de terceiro → 403 ACESSO_NEGADO (RF43.CA04 \"só o dono\"); checklist inexistente para o processo → 404 CHECKLIST_NAO_ENCONTRADO com sugestão de propor um (RF32).",
        "note": "CA a confirmar",
        "kind": "enunciado"
      },
      {
        "id": "RF20.CA01",
        "text": "—",
        "note": "… RF20.CA15 (corpo = criador de tarefas",
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
    "summary": "CollectiveGoal (criador EMPRESA/CHEFE; criterionJson {metricCode, operator, target} sobre o catálogo MetricDefinition; minEffortCheck anti-trivial; progress 0–1 calculado por MetricCalculator em job agendado e AFTER_COMMIT dos eventos relevantes) com GoalParticipants. Meta ATINGIDA → DeciaPointsLedgerEntry META_ATINGIDA por participante com idempotencyKey (ledgerBatchId) e Recognition source META. Highlight do mês por departamento: algoritmo transparente (algorithmScoreJson com critérios visíveis: reações BEM_FUNDAMENTADO/CONFORME, reutilizações, rastro completo, conformidade) + curadoria do chefe (curatedBy); aparece na Vitrine (RF27) e alimenta a Chancela de Excelência (RF39.CA05). Recognition (= cupom/medalha) emitido manualmente, por meta ou por benefício; limite por emissor/mês (Company.pointsPolicyJson) e tudo em AuditLog.",
    "route": "Metas coletivas (/goals), Destaques (/highlights), Reconhecimentos (/recognitions), barra de progresso no Mural (/mural), medalhas no perfil (/profile?tab=reconhecimentos, RF26 corpo/RF19)",
    "coverage": "RF35.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. A moeda é o DECIA Points (RF42); a HU35 ainda diz \"Pontos de Contribuição\" (nome antigo).",
    "cas": [
      {
        "id": "RF35.CA01",
        "text": "CollectiveGoal (criterionJson, period, rewardPointsPerParticipant, recognitionTemplateJson, progress), GoalParticipant, GoalService.create/join/recomputeProgress, MetricCalculator, MuralEntry META",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA02",
        "text": "GoalStatus ATINGIDA, DeciaPointsService.award META_ATINGIDA (idempotencyKey, ledgerBatchId), Recognition source META",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA03",
        "text": "Highlight.algorithmScoreJson/curatedBy/position, HighlightService.computeMonth/curate/publish, MuralEntry DESTAQUE, candidatos RF39.CA05",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA04",
        "text": "Recognition (name, medalArtJson, criterion, validUntil), RecognitionSource MANUAL/META/BENEFICIO, RecognitionService.issue, MuralEntry RECONHECIMENTO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA05",
        "text": "DeliberativeProfile.badgesJson/publicIndicatorsJson, DeciaPointsLedgerEntry.eventCode por origem",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF35.CA06",
        "text": "GoalService.checkMinEffort (422 META_TRIVIAL), RecognitionService.checkMonthlyLimit (409 LIMITE_ESGOTADO, Company.pointsPolicyJson), AuditLog GOAL_ACHIEVED/RECOGNITION_ISSUED",
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
    "summary": "HandoffDossier (subjectType EMPREGADO · GESTAO; reason HandoffReason SAIDA · TRANSFERENCIA · FIM_GESTAO · TROCA_CHEFE; status HandoffStatus GERADO · AGUARDANDO_SUCESSOR · TRANSFERIDO · RECUSADO · CANCELADO) compila em contentJson projetos abertos por fase, tarefas pendentes/bloqueadas com prazos, sessões DECIA em andamento, decisões pendentes de revisão, contatos/fornecedores (OrgEntity) citados e um resumo de contexto por projeto redigido pela IA (DOSSIE) sobre dados do sistema. Materializa-se em TaskItem DOCUMENTO (PDF, sourceKind DOSSIE, faísca ✦) e ProjectScheme \"Transição de [nome]\" (origin DOSSIE) com as tarefas de encaminhamento, ligados ao rastro (nó TAREFA/PROJETO). O sucessor aceita → HandoffItems transferem responsibleId (antigo fica previousResponsibleId), sessões ativas notificam a troca de participante (RF9), histórico intacto. Itens PRIVADOS só com consentForPrivateItems; saída nunca apaga tarefas usadas por outros (snapshot RF23).",
    "route": "ação Gerar dossiê de transição no perfil do empregado visto pelo chefe (/u/[username]), na página do departamento (/departments/[slug]/team) e na GESTAO (/groupings/[id]); lista e detalhe em /handoffs, /handoffs/[id]; aceite do sucessor por notificação",
    "coverage": "RF36.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. Gatilhos externos: RF25.CA05 (encerrar GESTAO), RF28.CA07 (troca de chefe), RF9 (chefe remove empregado).",
    "cas": [
      {
        "id": "RF36.CA01",
        "text": "HandoffService.generateForEmployee/generateForGrouping/collect, HandoffDossier.contentJson (openProjectsByPhase, pendingTasks, blockedTasks, activeSessions, pendingReviews, contacts, contextSummaries), HandoffReason, AiCapability DOSSIE",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA02",
        "text": "HandoffService.materialize, TaskItem DOCUMENTO sourceKind DOSSIE + aiGenerated, ProjectScheme origin DOSSIE, DecisionTraceNode, PipelineJob EXPORT_PDF",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA03",
        "text": "HandoffDossier.successorUserId/successorAcceptedAt, HandoffService.accept/refuse, TransferService, HandoffItem.previousResponsibleId/newResponsibleId, TaskStateLog",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA04",
        "text": "DeciaSessionService.replaceParticipant, SessionParticipant.leftAt/removeReason, Notification PARTICIPANTE_* (RF9), histórico intacto",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF36.CA05",
        "text": "HandoffDossier.consentForPrivateItems, Visibility PRIVADA, ProjectTask.snapshotJson (RF23), nunca DELETE de tarefas usadas por outros",
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
    "summary": "Meeting (sessionId ou projectId, source GRAVACAO_NAVEGADOR · ARQUIVO · TRANSCRICAO_COLADA, status MeetingStatus GRAVANDO · TRANSCREVENDO · ATA_PROPOSTA · CONFIRMADA · CONTESTADA, audioMediaId, minutesTaskId, followUpTaskIdsJson, ratificationDeadlineAt 48 h) com MeetingTranscript (texto AES-GCM, segmentsJson por falante classificado como no RF7) e RecordingConsent por participante (LGPD). Áudio vai para restricted/ (OwnMedia), passa por magic bytes e limite por formato, e é apagado após a transcrição por padrão (Company.recordingRetentionPolicy). A IA (TRANSCREVER, ATA_VIVA) gera a ata estruturada (participantes, pauta, deliberações, encaminhamentos o quê/quem/quando, divergências, pendências); o usuário confirma antes de persistir: ata → TaskItem ATA_REGISTRO (sourceKind ATA_VIVA) no projeto; cada encaminhamento → TaskItem com responsibleId e dueAt + ProjectTaskDependency para a ata. A ata é publicada na sessão como mensagem com anexos (RF29) e entra no rastro (nó ATA_VIVA); participantes ratificam ou contestam em 48 h (Notification), e ratificação credita DP (ATA_RATIFICADA, RF42).",
    "route": "ação Nova reunião na sessão DECIA (/decia/[sessionId]) ou no projeto (/projects/[id]), fluxo em /meetings/new, /meetings/[id] (gravação, upload, transcrição colada, ata proposta, ratificação)",
    "coverage": "RF37.CA01 · CA02 · CA03 · CA04 · CA05 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF37.CA01",
        "text": "Meeting (sessionId/projectId, MeetingSource), MeetingService.start/uploadAudio/pasteTranscript, UploadGuard, OwnMedia",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA02",
        "text": "TranscriptionService.transcribe, MeetingTranscript.segmentsJson (classLabel RF7), AiCapability TRANSCREVER/ATA_VIVA, MeetingService.proposeMinutes",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA03",
        "text": "MeetingService.confirm, TaskItem ATA_REGISTRO sourceKind ATA_VIVA, tarefas de encaminhamento (responsibleId, dueAt), ProjectTaskDependency, minutesTaskId/followUpTaskIdsJson",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA04",
        "text": "DeciaBridgeService.publishMinutes, SessionMessage + MessageAttachment, nó ATA_VIVA, Notification, ratificationDeadlineAt, MeetingService.ratify/contest, DP ATA_RATIFICADA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF37.CA05",
        "text": "RecordingConsent, MeetingService.consent (409 CONSENTIMENTO_PENDENTE), TranscriptionService.purgeAudio, Company.recordingRetentionPolicy, AuditLog MEETING_AUDIO_PURGED, UserConsent GRAVACAO_REUNIOES_PADRAO",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF38",
    "n": 38,
    "title": "Aplicar a identidade visual do Work AI — ícones por tipo de tarefa, thumbnails automáticos, capa-mosaico de projeto, fio de decisão, lacres, etiquetas de estado, temas e skins da Mesa",
    "hu": null,
    "summary": "Regra do design system: nenhum HTML/CSS solto nas telas (D-11); todo elemento visual vem de packages/ui com tokens --ws-* e 4 temas via data-theme (claro · escuro · contraste · blueprint). As variações dos cards são flags derivadas dos dados (taskVariants(TaskView, viewer), projectVariants(ProjectView, viewer)), nunca escritas à mão; tipos vêm do OpenAPI (D-21). O backend contribui com: TaskType → glifo/cor (TypeChip), PipelineJob THUMBNAIL assíncrono (TaskItem.thumbnailUrl/coverMode), ProjectScheme.mosaicJson/coverMode (mosaico 2×3 recomputado AFTER_COMMIT), aiGenerated/aiInferenceId/reviewedBy (faísca ✦), TaskState/ProjectStatus (etiquetas com nome em texto), legalDueAt (⚖), SealBond/Seal.artJson (lacre), Recognition.medalArtJson (medalha), FinalDecision.stampJson (carimbo), DecisionTraceNode.classLabel (fio), Department.color/monogram, Company.logoUrl, UserPreferences.theme/deskSkin/reduceMotion, UserSkin (skins compradas, RF42) e CardArtConfig (card_art_json, Estúdio, proposta Q-58).",
    "route": "transversal — todo card, lista, busca, anexo de mensagem e fio de decisão; preferências em /settings (tema, skin da Mesa, reduceMotion); Estúdio de Arte do card (RF11, /tasks/[id]/art, /projects/[id]/art); galeria /lab/design-system",
    "coverage": "RF38.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. Fontes de detalhe: docs/design-system/DESIGN_SYSTEM.md (§2 tokens, §3 catálogo de componentes, §4 glifos), ANATOMIA_CARDS.md, ANATOMIAS_E_ESTUDIO.md v3 (enums TaskCardLayout, ProjectCardLayout, TaskComposition, ProjectComposition, SchemeView, TaskCardVariant, ProjectCardVariant, CardArtConfig), GLYPHS.md, TOKENS.md.",
    "cas": [
      {
        "id": "RF38.CA01",
        "text": "TaskType → TypeChip, sprite ws-<nome> (16 glifos de tipo), TaskCard em cards/listas/busca/anexos (TaskCardLayout), DecisionThread",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA02",
        "text": "ThumbnailService.onTaskCreatedOrUpdated/render/replaceManual/requestAiCover, PipelineJob THUMBNAIL, TaskItem.thumbnailUrl/coverUrl/coverMode, MediaObject.variantsJson, AiCapability CAPA_IA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA03",
        "text": "MosaicService.recompute, ProjectScheme.mosaicJson/coverMode MOSAICO, ProjectCard layout mosaic, Mosaic, ProgressRing, borda Department.color",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA04",
        "text": "Spark (generatedAt, model, reviewedBy), TaskItem.aiGenerated/aiInferenceId, AiInferenceLog.model/createdAt/reviewedBy, variante GERADA_IA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA05",
        "text": "Tag (nome do estado em texto, estilos por TaskState/ProjectStatus), Due (âmbar ≤ 3 dias, vermelho vencido, ⚖ legalDueAt), variantes PRAZO_LEGAL, BLOQUEADA…",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA06",
        "text": "Seal.artJson/issuerKind/excellence + SealBond APROVADA → Seal (lacre dourado/azul-marinho), Recognition.medalArtJson → Medal, FinalDecision.stampJson → Stamp (VALIDADO/DEVOLVIDO, data, revisor), variantes CHANCELADA, COM_CARIMBO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA07",
        "text": "DecisionTraceNode.classLabel (ARGUMENTO azul · DIVERGENCIA laranja · RISCO vermelho · CONSENSO verde · PERGUNTA roxo) → DecisionThread",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA08",
        "text": "UserPreferences.theme/deskSkin/reduceMotion (existe no main), ThemeMode (4 temas + AUTO), DeskSkin, UserSkin, ThemeProvider, BackgroundArt, SidebarNav recolhível",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA09",
        "text": "Department.color/monogram, Company.logoUrl/accentColor → Monogram, borda do card na cor do departamento",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF38.CA10",
        "text": "Confetti (decisão validada), encaixe animado (drag para fase, SchemeView BOARD), faísca animada (geração), EmptyState ilustrado, prefers-reduced-motion + UserPreferences.reduceMotion",
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
    "summary": "Entidades: Seal (emissor EMPRESA|CHEFE, tier TAREFA|PROJETO|PLANO, artJson do lacre, excellence, ciclo availableFrom/Until, usageLimit/usageCount, autoIssued), SealPolicy (mode AUTO|REVISAO, criteriaJson com SealCriterion CONFORMIDADE_MIN · RASTRO_COMPLETO · PRAZO_CUMPRIDO · REACOES_MIN · REUTILIZACOES_MIN · DECISAO_VALIDADA · SEM_PENDENCIA, recertifyEveryDays), SealBond (item × emissor, único; basis MODELO_MATCH · DEPARTAMENTO_MATCH · PLANO_MATCH · DECISAO_MATCH · POLITICA · INDICACAO · PREMIACAO; status SealBondStatus SUGERIDA → ACEITA/EDITADA/RECUSADA → EM_REVISAO → APROVADA/APROVADA_PRIVADA/REJEITADA → REVOGADA/EXPIRADA; authorConsent; aiInferenceId), SealProposal, Benefit (BenefitType), BenefitRedemption (idempotente, QR, ledgerEntryId). Guards D-14: requireIssuerOrCurator (criar/editar/revisar), requireOwner (aceitar/editar/recusar/consentir), EMPREGADO → 403 no criador. Os critérios são calculados pelo sistema (MetricCalculator); a IA (SUGERIR_CHANCELA, AVALIAR_POLITICA) só sugere/justifica. Tudo em AuditLog com correlationId.",
    "route": "Minhas Chancelas (/seals, sub-aba Recusadas), fila de revisão (/seals/review, CHEFE/CURADOR), Criador de Chancela na página da empresa/departamento (/companies/[slug]/manage, /departments/[slug]), Benefícios (/benefits), curadoria de Excelência (/curation)",
    "coverage": "RF39.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. Detalhe no card \"WORK AI — Chancelas\"; a moeda é DECIA Points (RF42).",
    "cas": [
      {
        "id": "RF39.CA01",
        "text": "Guard.requireIssuerOrCurator, SealService.create/update, CuratorAppointment",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA02",
        "text": "Seal (name, tier, artJson, availableFrom/Until, usageLimit, excellence), SealPolicy (mode, criteriaJson com SealCriterion), 400 PERIODO_INVALIDO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA03",
        "text": "SealBondService.suggest/respond, SealBond.basis/confidence/justification/aiInferenceId, AiCapability SUGERIR_CHANCELA, sub-aba Recusadas",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA04",
        "text": "SealPolicyEvaluator.onRelevantEvent/evaluate, MetricCalculator, criteriaReportJson, Seal.autoIssued, PolicyMode AUTO/REVISAO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA05",
        "text": "SealBondService.awardExcellence, basis PREMIACAO, origin CURADORIA, Highlight (RF35), usageLimit/usageCount → 409 LIMITE_ESGOTADO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA06",
        "text": "SealBondService.indicate (basis INDICACAO → EM_REVISAO), SealService.propose, SealProposal",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA07",
        "text": "SealBond.authorConsent, SealBondService.consent/review, APROVADA_PRIVADA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA08",
        "text": "único (targetId, issuerUserId) → 409 CHANCELA_DUPLICADA, SealBondService.revoke, SealPolicyEvaluator.recertify, REVOGADA/EXPIRADA, AuditLog com correlationId",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA09",
        "text": "Benefit (BenefitType, startsAt/expiresAt, totalQuota, perUserLimit), BenefitService.publish",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA10",
        "text": "BenefitService.redeem (transacional, idempotencyKey), BenefitRedemption, 409 CHANCELA_INVALIDA, AiCreditLedgerEntry, DP BENEFICIO_BONUS",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA11",
        "text": "TaskItem/ProjectScheme/AnnualPlan.sealIdsJson, TaskState MODELO_PUBLICO, Vitrine/Balcão \"chancelado\" (RF27/RF40), métricas do emissor (RF28.CA06)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF39.CA12",
        "text": "Notification CHANCELA_ESTADO/INDICACAO, i18n das mensagens",
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
    "summary": "ModelOffer (targetType TASK · PROJECT · KIT, pricePoints 0 = grátis, license ModelLicense COPIA_LIVRE · ATRIBUICAO · SOMENTE_LEITURA, visibility, shelf COMUNIDADE · CHANCELADO, isHandover repasse, status OfferStatus ATIVA · RETIRADA · ESGOTADA, contadores). O item passa a TaskItem.offeredInCounter = true + TaskState OFERECIDA mantendo o estado de trabalho (TaskStateLog). Remixar = Remix + cópia respeitando a licença + 1 lançamento no ledger que debita o comprador e credita o autor (DeciaPointsLedgerEntry COMPRA_LOJA com counterpartyUserId, idempotencyKey; VENDA_BALCAO espelho) — grátis credita só reuseCount. Saldo insuficiente → 409 SALDO_INSUFICIENTE. Nenhum campo de moeda real, nenhum gateway (CA08). Destacar/converter em chancelado passa pelo fluxo RF39 (indicação → chancela) preservando originalTaskId/originalProjectId.",
    "route": "Balcão de Modelos (/models, prateleiras Chancelados · Comunidade, também pela Loja /store), ação Oferecer como modelo no card (/tasks/[id], /projects/[id], kits), sub-aba Meus modelos oferecidos no perfil (/profile?tab=modelos), \"repassar ao Balcão\" ao arquivar (RF41)",
    "coverage": "RF40.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. A HU40 ainda diz \"Pontos de Contribuição\" (= DECIA Points, RF42).",
    "cas": [
      {
        "id": "RF40.CA01",
        "text": "ModelOffer (pricePoints, license, usageDescription, visibility, availableFrom/Until), ModelCounterService.offer, TaskState OFERECIDA + TaskStateLog, offeredInCounter",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA02",
        "text": "Shelf COMUNIDADE/CHANCELADO, ModelCounterService.browse, filtros e ordenação (remixes · reações · recentes), SealBond APROVADA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA03",
        "text": "DeciaPointsService.transfer (COMPRA_LOJA + VENDA_BALCAO, counterpartyUserId, idempotencyKey), 409 SALDO_INSUFICIENTE, grátis → reuseCount",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA04",
        "text": "LicenseEnforcer.copy, ModelLicense (SOMENTE_LEITURA referência · ATRIBUICAO crédito imutável · COPIA_LIVRE), Remix, originalTaskId/originalProjectId",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA05",
        "text": "ModelCounterService.handoverOnArchive, ModelOffer.isHandover, preço 0, etiqueta repasse (RF41)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA06",
        "text": "ModelOffer.viewsCount/remixCount/pointsEarned, ModelCounterService.myOffers/withdraw, OfferStatus RETIRADA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA07",
        "text": "ModelCounterService.highlight, highlightedBy, SealBondService.indicate (INDICACAO → RF39), Shelf CHANCELADO, crédito preservado",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF40.CA08",
        "text": "invariante: sem campo monetário, sem gateway; todo movimento é DeciaPointsLedgerEntry com AuditLog/correlationId",
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
    "summary": "Estados (TaskState): RASCUNHO · DISPONIVEL · EM_USO (em ≥ 1 projeto ativo, automático) · BLOQUEADA · CONCLUIDA · ARQUIVADA · MODELO_PUBLICO (só via chancela RF39 ou publicação explícita) · OFERECIDA (Balcão RF40); toda transição em TaskStateLog (TaskStateMachine com tabela testada). Sub-filtros: Todas · Favoritas · Disponíveis · Em uso · Bloqueadas · Concluídas · Modelos públicos · Chanceladas · Oferecidas (+ filtros categoria, tipo, processo, natureza, departamento, accessClass, prazo, origem; ordenação recentes, mais/menos usadas, nome, prazo, valor), tudo na querystring (CA09). Prazo legal (legalDueAt, LegalDeadlineRule): card âmbar a 3 dias, vermelho vencido, ⚖, notificação PRAZO_PROXIMO/PRAZO_VENCIDO (job diário) e sugestão na Tarefa do Dia (RF44). Evidências (Evidence: foto com takenAt, geolocalização opcional AES, vínculo a tarefa/projeto, studioStatus) podem virar IMAGEM_EDITADA pelo Estúdio (RF4). Exclusão: projetos de outros mantêm ProjectTask.snapshotJson (RF23) e donos são avisados; tarefa ligada a decisão VALIDADA (FinalDecision.resultingTaskId ou nó TAREFA do rastro) não é excluída, só arquivada (409). Acervo de terceiros: VisibilityFilter + Guard (403 no resto).",
    "route": "Acervo de Tarefas (/tasks?filtro=&categoria=&ordem=&page=), detalhe (/tasks/[id]), Anexos & Evidências (/attachments), acervo de terceiros (/u/[username]?tab=acervo)",
    "coverage": "RF41.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. A criação de tarefas é o RF4 (corpo em RF20); o Acervo alimenta os selects do Criador de Projetos (RF5) e os anexos do DECIA (RF29). Situação em 17/10/2026 (MATRIZ_RF: DEMO EM MEMÓRIA → API REAL PARCIAL): ver «Real × planejado» abaixo.",
    "cas": [
      {
        "id": "RF41.CA01",
        "text": "AcervoService.list/counters, TaskCardView, contadores por sub-filtro em CachePort; real: TaskController.mine, TaskService.listMine, TaskRepositoryPort.findByOwner, PersistedTaskCard, workStatusOf",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA02",
        "text": "TaskStateMachine.transition/onProjectActivated/onProjectLeft, TaskState, TaskStateLog, MODELO_PUBLICO só via chancela/publicação; real: TaskController.transition, TransitionRequest, TaskService.transition, TaskItem.transition/block, TaskState.machine(), TASK_TRANSITIONS",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA03",
        "text": "AcervoService.detail (preview, metadados RF4, TaskVersion, ProjectTask em uso, DecisionTraceNode, SealBond, interações, TaskStateLog)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA04",
        "text": "LegalDeadlineRule, TaskItem.legalDueAt, LegalDeadlineService.scanDueSoon, Notification PRAZO_PROXIMO/PRAZO_VENCIDO, Due (âmbar · vermelho · ⚖), RF44",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA05",
        "text": "AcervoService.delete, ProjectTask.snapshotJson/removedByAuthor (RF23), FinalDecision.resultingTaskId, 409 TAREFA_EM_DECISAO, Notification TAREFA_REUTILIZADA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA06",
        "text": "Evidence (takenAt, latitude/longitude AES, linkedTaskId/ProjectId, studioStatus), EvidenceService.upload/link/toStudio, UploadGuard, OwnMedia, IMAGEM_EDITADA (RF4)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA07",
        "text": "AcervoService.quickAction (FAVORITAR · DUPLICAR · LEVAR_AO_PROJETO · COMPARTILHAR_SESSAO · PEDIR_CHANCELA · OFERECER_BALCAO · ARQUIVAR/REPASSAR), AcervoService.archive",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA08",
        "text": "VisibilityFilter.allowedFor, Guard.requireOwner (403), ação Levar ao meu acervo (RF23)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF41.CA09",
        "text": "querystring (filtro, filtros, ordem, page), 20 por página, i18n, AcervoQuery",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF42",
    "n": 42,
    "title": "Acumular DECIA Points por participação de qualidade no chat DECIA e usá-los em compras dentro do app (Loja Work AI: modelos do Balcão, créditos de IA, capas/skins, impulsos, kits)",
    "hu": null,
    "summary": "Os DECIA Points são a única moeda (sem dinheiro real, sem gateway, CA10). Ganha-se só por participar bem no DECIA: PointsEvent ARGUMENTO_EVIDENCIA (+5, teto 10 msgs/dia/sessão) · CONSENSO (+3) · DIVERGENCIA_RESOLVIDA (+8) · PERGUNTA_RESPONDIDA (+4) · ARTEFATO_USADO (+6 ao autor) · DECISAO_VALIDADA (+15 × multiplicador 0,5–2,0 do perfil deliberativo) · PRESENCA_ENCERRADA (+2) · REACAO_QUALIDADE (+2, teto 20/dia) · ATA_RATIFICADA/ENCAMINHAMENTO_CUMPRIDO (+3/+5) · BENEFICIO_BONUS · META_ATINGIDA; não pontuam ruído, auto-reação, sessão de teste (User.testAccount), repetidas (similarityHash > 90 %). Cada evento confirmado pela IA vira 1 DeciaPointsLedgerEntry idempotente (idempotencyKey = tipo + id do evento + usuário, correlationId, ruleVersionId); regras em DeciaPointsRule versionada (ADMIN/EMPRESA, vigência; não altera o passado). Gasto: StoreItem (StoreItemKind) → StorePurchase transacional (409 SALDO_INSUFICIENTE / ITEM_INDISPONIVEL) com entrega (modelo copiado, AiCreditLedgerEntry, UserSkin, impulso MuralEntry.boostUntil); Balcão credita o autor no mesmo lançamento (RF40). Antifraude suspende (LedgerStatus SUSPENSO) para o chefe confirmar/estornar; expiração (expiresAt, aviso 30 dias) e doação com limite mensal (PointsDonation).",
    "route": "DECIA Points (/points: saldo, extrato, regras, gráfico mensal), Loja Work AI (/store), extrato por sessão no perfil deliberativo (/profile?tab=decia-points), fila de suspensos do chefe (/moderation), dashboard (/admin/dashboard, /issuer/dashboard)",
    "coverage": "RF42.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs. Proposta de nova redação e economia em docs/produto/DECIA_POINTS.md (não adotada aqui; os valores abaixo são os do card).",
    "cas": [
      {
        "id": "RF42.CA01",
        "text": "DeciaPointsService.award, DeciaPointsLedgerEntry (delta, eventCode, sessionId, idempotencyKey, correlationId), PointsEvent, unique idempotencyKey",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA02",
        "text": "DeciaPointsRule (points, caps, validFrom/To, editedBy), PointsRuleEngine.resolve/applyCaps/multiplier, ruleVersionId, qualityMultiplier",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA03",
        "text": "DeciaPointsService.balance/statement, PointsController, regras vigentes, série mensal, i18n",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA04",
        "text": "StoreService.purchase/deliver (transação atômica), StoreItem, StorePurchase (idempotencyKey, deliveryJson), 409 SALDO_INSUFICIENTE / ITEM_INDISPONIVEL",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA05",
        "text": "DeciaPointsService.transfer (COMPRA_LOJA + VENDA_BALCAO, counterpartyUserId), licença RF40",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA06",
        "text": "AiCreditLedgerEntry, AiQuota.purchasedCredits, AiQuotaService.consume, quotaSource CREDITO, aviso + Loja",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA07",
        "text": "AntiFraudService.check/suspend/review, LedgerStatus SUSPENSO/ESTORNADO, User.testAccount, SessionMessage.similarityHash, Guard.requireDeptHead, AuditLog",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA08",
        "text": "extrato por tipo de evento e por sessão no perfil deliberativo (RF19/RF43), pontos por departamento e custo de IA no dashboard (RF18/RF28)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA09",
        "text": "DeciaPointsLedgerEntry.expiresAt, DeciaPointsService.expire/donate, PointsDonation (monthKey, limite), Company.pointsPolicyJson, lançamento EXPIRACAO",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF42.CA10",
        "text": "invariante sem moeda real/gateway; AuditLog com correlationId e metadataJson sanitizado em todo lançamento",
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
    "summary": "Motor (AiEngine, ARQUITETURA §3.1): AiRequest(capability, hostRf, userId, deptId, accessClass, payload, mode) → governança (feature flag por função, AccessClassification RESTRITO/SIGILOSO só LocalEngine, Masking de dados pessoais — existe no main —, AiQuota em Redis, AiBudget teto diário Q-50, consentimento) → Claude (primário) → Gemini (alternativo) → LocalEngine (regras, embeddings locais, PERT/CPM/Monte Carlo/EVM); circuit breaker + retry + timeout (Resilience4j, AiProviderCircuitState); sempre AiInferenceLog (ai_inference_log já existe no V2). Regra de ouro (D-12): a IA só interpreta números calculados pelo sistema — MetricCalculator + MetricDefinition (catálogo §8 em docs/arquitetura/METRICAS_GESTAO.md: fórmula, fonte, proxy, minSamples) → MetricSnapshot → Insight (ACERVO · PERFIL · EQUIPE · PROJETO, metricRefsJson, actionsJson), RankingEntry (dimensões separadas, RankingWeights públicos, rankingOptOut, \"Explique minha posição\"), FeasibilitySheet (custo P10/P50/P90, PERT/CPM, Monte Carlo 1.000 execuções, score decomposto, top 5 riscos, WBS, RACI, premissas e desconhecidos). Nada vira decisão, chancela, ranking oficial ou projeto sem confirmação humana.",
    "route": "Insights (/insights: Acervo · Perfil · Equipe · Ranking · Projetos sugeridos), Autopilot (/autopilot, estende RF30), sessão em modo Avançado (/decia/[sessionId]), painel admin IA do sistema (/admin/ai, RF18), página \"Como o ranking é calculado\"",
    "coverage": "RF43.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 · CA15 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF43.CA01",
        "text": "AiEngine.chain, CircuitBreakerPort, AiProviderCircuitState, AiInferenceLog (model, cost, latency, fallbackUsed, correlationId), aviso de fallback",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA02",
        "text": "AiGovernance.accessClassRoute/mask, Masking (main), InferenceResult BLOQUEADO_SIGILO, maskedFieldsJson",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA03",
        "text": "InsightService.acervo/applyAction, Insight scope ACERVO (Score, paradas, duplicadas, fantasma, lacunas, modelos recomendados, actionsJson), MetricCalculator",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA04",
        "text": "InsightService.perfil, UserConsent RESUMO_PROFISSIONAL_IA (403 CONSENTIMENTO_NECESSARIO), comparação anonimizada, DeliberativeProfile",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA05",
        "text": "RankingService.compute/explain/optOut/updateWeights, RankingEntry.dimension/explanationJson, RankingWeights (vigência, editedBy), User.rankingOptOut (main), nunca volume bruto",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA06",
        "text": "DeciaSession.aiMode AVANCADO, CitationService (RF33), métricas reais do projeto na sessão, débito de cota/DP com aviso",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA07",
        "text": "AutopilotService.tasksFrom, TaskItem RASCUNHO (tipo, categoria, prazo legal, responsável, dependências), nada DISPONIVEL sem revisão (RF4)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA08",
        "text": "AutopilotService.projectCandidates, FeasibilityService.build, FeasibilitySheet (costJson P10/P50/P90, timeJson PERT/CPM, deadlineJson Monte Carlo 1.000, viabilityScoreJson, risksJson top 5, wbsJson, raciJson, assumptionsJson, unknownsJson), até 5 por viabilidade",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA09",
        "text": "MetricCalculator.evm/cpm, ProjectScheme.evmJson/criticalPathJson, burndown/fluxo cumulativo, alerta SPI → RF31",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA10",
        "text": "AutopilotService.accept/discard, ProjectScheme RASCUNHO origin AUTOPILOTO, TaskType ESTUDO_TECNICO_PRELIMINAR, FeasibilitySheet.discardReason, sessão DECIA (RF29)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA11",
        "text": "LocalEngine executa PERT, CPM, Monte Carlo, EVM, scores e métricas integralmente; só redação simplificada",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA12",
        "text": "AdminAiController, agregados de AiInferenceLog por capability/departamento, taxa de fallback, taxa de aceitação, AiQuota, alertas de custo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA13",
        "text": "MetricDefinition (code, formula, sourceDescription, proxyNote, minSamples), MetricCalculator por domínio com testes unitários, METRICAS_GESTAO.md, IA cita a métrica",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA14",
        "text": "InsightService.equipe, Insight scope EQUIPE (carga, gargalos, segurança psicológica, rede, bus factor, eNPS), SurveyService (anônimas, mínimo 5), benchmarks anonimizados, Guard.requireDeptHead/requireRole EMPRESA",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF43.CA15",
        "text": "MetricDefinition.minSamples, mínimo 3 projetos/sinais para domínios A e B, EmptyState explicativo",
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
    "summary": "DailyTask (único userId + taskDate; taskId entre as DISPONIVEL/EM_USO; priorityIndexJson {eisenhower, wsjf, cpmSlack, moscow, pareto, wipAdvice}; hsePredictedJson / hseRealizedJson {total, components[]}; feedback DailyFeedback CONCLUI · ADIEI · BLOQUEADA · DELEGUEI; actualHours, swapReason, swappedFromTaskId, delegatedToUserId, blockedByRef, aiInferenceId). O índice de prioridade (Eisenhower × WSJF × folga CPM × MoSCoW/Pareto × WIP/Little's Law, UserPreferences.wipLimit padrão 3) e o HSE (0–100: eficiência 20 · eficácia 20 · valor WSJF 15 · pontualidade SPI 15 · qualidade 15 · impacto na equipe 10 · foco 5, HseWeights por EMPRESA com versão) são serviços de domínio determinísticos (PriorityIndexService, HseCalculator, D-12, METRICAS_GESTAO.md); a IA (TAREFA_DO_DIA, HSE) só redige a explicação ✦. EfficiencyScoreSnapshot guarda o HSE diário e a média móvel de 7 dias; WeekPlan/WeekPlanDay a semana (prazos legais, reuniões Google/Microsoft, carga ≤ 80 %, streak, fechamento de sexta). Feedback CONCLUI → TaskStateMachine CONCLUIDA (RF41) e notifica dependentes; BLOQUEADA cria dependência; DELEGUEI cria Assignment (RF46) com rastro.",
    "route": "sub-aba Tarefa do Dia no perfil (/profile?tab=tarefa-do-dia), widget no topo do Acervo (/tasks) e da Mesa (/desk), Semana planejada (/profile?tab=semana), notificação diária às 8h (preferências RF3)",
    "coverage": "RF44.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF44.CA01",
        "text": "DailyTask (único userId+taskDate, priorityIndexJson, hsePredictedJson), DailyTaskService.today, PriorityIndexService.rank, HseCalculator.predict",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA02",
        "text": "DailyTaskService.swap, swappedFromTaskId, swapReason (422 sem motivo), ajuste de pesos pessoais",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA03",
        "text": "DailyTaskService.feedback CONCLUI, actualHours, HseCalculator.realize, hseRealizedJson, EfficiencyScoreSnapshot, TaskStateMachine → CONCLUIDA, notificação a dependentes",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA04",
        "text": "feedback ADIEI/BLOQUEADA/DELEGUEI, componentes aplicáveis, blockedByRef, blockedByTaskId/UserId, delegatedToUserId, AssignmentService.propose (RF46) com rastro",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA05",
        "text": "PriorityIndexService.wipAdvice, UserPreferences.wipLimit (padrão 3), Little's Law",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA06",
        "text": "WeekPlan, WeekPlanDay (meetingsJson, loadPct), WeekPlanService.week/reorder/closeFriday, CalendarPort, streak",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA07",
        "text": "DailyTaskService.history (30 dias), EfficiencyScoreSnapshot.movingAvg7, gráfico de componentes",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA08",
        "text": "HseWeights (companyId, version, weightsJson, validFrom), HseWeightsController, METRICAS_GESTAO.md, serviços de domínio testáveis, passado não recalcula",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA09",
        "text": "DailyTask.aiInferenceId, AiCapability TAREFA_DO_DIA/HSE, LocalEngine determinístico com redação simplificada, faísca ✦",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF44.CA10",
        "text": "UserPreferences.notificationPrefsJson.dailyTaskAt (08:00) e timezone (RF3), Notification TAREFA_DO_DIA, i18n",
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
    "summary": "ProfileHypeScore (único userId + scoreDate; score 0–1000; bandCode → HypeBand Iniciante · Contribuinte · Referência · Líder de prática · Lenda do departamento, nomes editáveis pela EMPRESA; blocksJson produção 25 % · reconhecimento social 25 % · participação no DECIA 25 % · eficiência e impacto 15 % · reconhecimentos e chancelas 10 %; bayesianPriorsJson, halfLifeDays 180, percentileInDept, topPositiveEventsJson, topNegativeEventsJson, suggestionsJson, weightsVersion, aiInferenceId, idempotencyKey). Regras estatísticas em HypeCalculator (determinístico, D-12, METRICAS_GESTAO.md seção Hype): média bayesiana por bloco, decaimento meia-vida 180 d, normalização por departamento/empresa (percentil), tetos por dia, ponderação PageRank pela reputação de quem interage (Reaction.actorHypeAtTime do mês anterior, ≤ 3× o peso base), antifraude compartilhado com RF42 (HypeIgnoredEvent NAO_VERIFICADO · AUTO_INTERACAO · ANTIFRAUDE, só User.verified). Exibição: User.hypeVisibility PUBLICO · EMPRESA · SO_EU (padrão; existe no main: HypeVisibility) — a API omite o campo ou responde 403 a quem não pode ver; ocultar não impede o cálculo nem o ranking (RF43, que respeita rankingOptOut). A IA (HYPE_PERFIL) só redige a explicação ✦. Política de uso (LGPD): indicador de reputação e desenvolvimento, não instrumento disciplinar (Company.hypePolicyJson); revisão de decisão automatizada via DataSubjectRequest target HYPE (RF3).",
    "route": "selo no cabeçalho do perfil (/profile, /u/[username], se exibido), página Por que meu Hype é X? (/profile/hype, só o dono), aba \"ignoradas\", página pública \"Como o Hype é calculado\" (/hype/como-e-calculado), controle de exibição em /settings (RF3), recalibração da EMPRESA (/hype/recalibration), histograma no dashboard (/admin/dashboard, /issuer/dashboard)",
    "coverage": "RF45.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 (corpo do card, inalterado) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF45.CA01",
        "text": "ProfileHypeScore (único userId+scoreDate, score, weightsVersion, blocksJson, idempotencyKey), HypeScoreService.recalculateAll/recalculate, PipelineJob RECALC_HYPE",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA02",
        "text": "HypeCalculator.bayesian/decay, bayesianPriorsJson, halfLifeDays 180, flag amostra pequena",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA03",
        "text": "AntiFraudService.isIgnored, HypeIgnoredEvent (IgnoredReason NAO_VERIFICADO · AUTO_INTERACAO · ANTIFRAUDE), User.verified, aba ignoradas",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA04",
        "text": "HypeCalculator.actorWeight, Reaction.actorHypeAtTime (mês anterior, ≤ 3× base)",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA05",
        "text": "HypeScoreService.explain, histórico 12 meses, topPositiveEventsJson/topNegativeEventsJson/suggestionsJson, AiCapability HYPE_PERFIL, aiInferenceId",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA06",
        "text": "User.hypeVisibility (HypeVisibility, main), HypeScoreService.visibleTo, Guard.requireSameCompany, 403/omissão do campo",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA07",
        "text": "HypePolicyService.update, Company.hypePolicyJson (pesos, meia-vida, faixas, validFrom), HypeBand, AuditLog HYPE_POLICY_UPDATED, página \"Como o Hype é calculado\"",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA08",
        "text": "RankingService dimensão HYPE_PERFIL, User.rankingOptOut, nunca expõe SO_EU",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA09",
        "text": "HypeCalculator determinístico com testes unitários (bayesiana, decaimento, normalização, antifraude), METRICAS_GESTAO.md, IA só redige",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF45.CA10",
        "text": "HypeScoreService.distribution, histograma anonimizado por departamento e evolução média, nunca lista nominal",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF46",
    "n": 46,
    "title": "Utilizar chats de mensageria para comunicar-se com outros usuários e atribuir ou receber tarefas e projetos",
    "hu": "como usuário do Work Station posso enviar mensagens e atribuir tarefas ou projetos para usuários conectados pelo chat do WS, pelo chat do DECIA ou clicando em botões de interação social em um esquema, para melhorar a gestão e o fluxo de trabalho da equipe. O RF introduz o chat de mensageria (conversa direta 1:1 ou em grupo, fora da sessão DECIA) e a atribuição como transação com aceite: quem recebe aceita, recusa com motivo ou devolve. Entidades da TAXONOMIA §12b (proposta): DirectConversation, DirectConversationParticipant, DirectMessage (Cassandra messages_by_conversation, TTL), Assignment (AssignmentTargetType TASK · PROJECT, AssignmentOrigin CHAT_WS · CHAT_DECIA · BOTAO_ESQUEMA · MINHA_EQUIPE, AssignmentStatus PROPOSTA · ACEITA · RECUSADA · DEVOLVIDA, previousResponsibleId, traceNodeId). Mesma entidade Assignment para RF10, RF18/RF19 e RF46.",
    "summary": "HU46: como usuário do Work Station posso enviar mensagens e atribuir tarefas ou projetos para usuários conectados pelo chat do WS, pelo chat do DECIA ou clicando em botões de interação social em um esquema, para melhorar a gestão e o fluxo de trabalho da equipe. O RF introduz o chat de mensageria (conversa direta 1:1 ou em grupo, fora da sessão DECIA) e a atribuição como transação com aceite: quem recebe aceita, recusa com motivo ou devolve. Entidades da TAXONOMIA §12b (proposta): DirectConversation, DirectConversationParticipant, DirectMessage (Cassandra messages_by_conversation, TTL), Assignment (AssignmentTargetType TASK · PROJECT, AssignmentOrigin CHAT_WS · CHAT_DECIA · BOTAO_ESQUEMA · MINHA_EQUIPE, AssignmentStatus PROPOSTA · ACEITA · RECUSADA · DEVOLVIDA, previousResponsibleId, traceNodeId). Mesma entidade Assignment para RF10, RF18/RF19 e RF46.",
    "route": "Mensagens (/messages, /messages/[conversationId], ícone na TopBar ao lado de Notificações), ação Atribuir no card de tarefa/projeto (RF18/RF19 \"atribuir\"), no composer da sessão DECIA (/decia/[sessionId]) e na aba Minha equipe do CHEFE (/departments/[slug]/team, RF10), caixa Atribuições recebidas (/messages?tab=atribuicoes)",
    "coverage": "RF46.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 — todos \"(CA a confirmar)\", derivados do título + HU46 (corpo do card vazio) — regra: o título do card define o RF. Relacionados: RF10 (chefe atribui, sem corpo), RF18/RF19 (\"retornar\" e \"atribuir\"), RF44.CA04 (DELEGUEI é o caminho inverso), RF29.CA04 (rastro quando a atribuição nasce no DECIA).",
    "cas": [
      {
        "id": "RF46.CA01",
        "text": "Posso abrir uma conversa direta (1:1) ou em grupo com usuários da mesma empresa, enviar texto e anexar tarefa/projeto como cartão (attachmentsJson com targetType TASK · PROJECT e snapshot); sem IA e sem DECIA Points. Usuário de outra empresa: 403 EMPRESA_DIFERENTE.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA02",
        "text": "Anexo com accessClass RESTRITO ou SIGILOSO só é aceito se todos os participantes têm acesso ao item; caso contrário 403 ACESSO_NEGADO e o cartão não é enviado.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA03",
        "text": "A ação Atribuir — pelo chat do WS (CHAT_WS), pela sessão DECIA (CHAT_DECIA) ou pelo botão no card (BOTAO_ESQUEMA) — cria Assignment PROPOSTA com destinatário, prazo e nota, gera DirectMessage de sistema na conversa e Notification ATRIBUICAO_PROPOSTA.",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA04",
        "text": "O destinatário aceita (ACEITA → TaskItem.responsibleId / ProjectTask.responsibleId, TaskStateLog, alimenta a Tarefa do Dia RF44), recusa com motivo (RECUSADA, 422 MOTIVO_OBRIGATORIO) ou, depois de aceitar, devolve com motivo (DEVOLVIDA); quem atribuiu é notificado. Só o destinatário responde (403); atribuição já respondida não muda (409 ATRIBUICAO_JA_RESPONDIDA).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA05",
        "text": "CHEFE atribui a membros do seu departamento (RF10, requireDeptHead); EMPREGADO propõe a colegas da mesma empresa (sempre com aceite); toda atribuição grava AuditLog, e com origem CHAT_DECIA também um nó DecisionTraceNode TAREFA/PROJETO ligado à mensagem (RF29.CA04).",
        "note": "",
        "kind": "rastreabilidade"
      },
      {
        "id": "RF46.CA06",
        "text": "Mensagens têm TTL por empresa (Company.messagingPolicyJson, proposta), não entram em busca nem na Memória Institucional, e o usuário pode arquivar/sair da conversa; lista e não lidas em tempo real (Redis pub/sub → SSE/WebSocket).",
        "note": "",
        "kind": "rastreabilidade"
      }
    ]
  },
  {
    "id": "RF47",
    "n": 47,
    "title": "Encontrar palavras-chave em documentos — varrer documentos longos de tarefas e projetos para localizar e extrair termos, frases e palavras (com contexto e fonte)",
    "hu": "COMO: usuário autenticado POSSO: encontrar palavras-chave dentro dos documentos das minhas tarefas e projetos (ou em tudo que posso ver), ver cada ocorrência no seu contexto e extrair os termos, frases, valores, prazos e artigos de lei citados PARA: varrer documentos longos (editais, contratos, TRs, pareceres, atas) sem ler página por página e anexar o que encontrei como evidência",
    "summary": "O Encontrar complementa o Buscar (RF27, que acha itens), a Memória Institucional (RF33, busca semântica) e a detecção de palavras-chave do Criador de Tarefas (RF20 · CA02): aqui o foco é dentro do texto dos anexos (TaskAttachment, RF41). Modos (card): (1) Encontrar palavra-chave em documento — escolho uma tarefa/projeto (ou vários) e procuro termos; (2) Só encontrar palavra-chave — procuro em todos os documentos que posso ver. Base (card): recuperação de informação clássica, sem depender de IA — índice invertido com ranking BM25 e analisador em português (stemming RSLP, stopwords, sem acento), concordância KWIC e extração de termos-chave sem treino (YAKE!). A IA é opcional (resumo dos achados) e passa pelo gate do RF43 (AiGateway, D-69). A visibilidade de cada documento é decidida pela mesma política do Bloco 5 (AccessPolicy.visible via ResourceAuthorizer, D-65/D-66), aplicada como filtro dentro da consulta ao índice, nunca depois da paginação.",
    "route": "Encontrar (/find; também como botão \"Encontrar neste documento\" dentro de uma tarefa ou projeto — /tasks/[id], /projects/[id])",
    "coverage": "RF47.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 (corpo do card, inalterado; CA11–CA13 acrescentados pelo dono em 2026-10-06 com a escolha da interface; CA14 em comentário do card de 2026-10-06) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF47.CA01",
        "text": "Dado um usuário autenticado na aba Encontrar, quando informa um ou mais termos (com operadores: frase exata entre aspas, E/OU/NÃO, curinga *, proximidade \"termo1 termo2\"~N) e o escopo (uma tarefa, um projeto, uma seleção ou \"tudo que posso ver\"), então recebe a lista de ocorrências agrupada por documento, com contagem, página/seção e trecho em contexto (KWIC, ±N palavras) com o termo destacado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA02",
        "text": "Dado o escopo, quando a busca roda, então só entram documentos que o usuário pode ver (mesma política de acesso do Bloco 5: dono, colaboradores, visibilidade, departamento); documento invisível nunca aparece nem é contado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA03",
        "text": "Dado um documento PDF, DOCX, XLSX, PPTX, TXT, MD, CSV, EML/MSG ou imagem/PDF digitalizado, quando é anexado, então o texto é extraído (com OCR quando não há camada de texto) e indexado em segundo plano; enquanto não indexa, o documento aparece como \"em processamento\" e a busca avisa que ele ficou de fora.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA04",
        "text": "Dado \"Extrair termos\" sobre um documento ou projeto, quando acionado, então o sistema lista os termos e frases-chave mais relevantes (YAKE!/TF-IDF) com frequência e onde ocorrem, e as entidades reconhecidas por padrão: CNPJ/CPF (mascarados conforme LGPD), valores em R$, datas e prazos, números de processo/protocolo, artigos de lei citados (\"art. 75 da Lei 14.133/2021\"), e-mails e telefones (mascarados).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA05",
        "text": "Dado um glossário/lista de termos salvo (ex.: \"cláusulas de risco\": multa, rescisão, reajuste, garantia, subcontratação), quando aplico a lista a um documento, então vejo quais termos aparecem, quais não aparecem e onde — útil para conferir cláusulas obrigatórias.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA06",
        "text": "Dado o resultado, quando exporto, então baixo CSV/XLSX com termo, documento, página, trecho e link; e posso salvar a busca e anexar o resultado como evidência numa tarefa, projeto ou sessão DECIA (RF29), com o rastro de origem.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA07",
        "text": "Dado um documento classificado RESTRITO ou SIGILOSO, quando é indexado ou resumido, então todo o processamento fica no servidor do Work Station (nunca vai a IA externa — RF43.CA02); o trecho em contexto respeita a classificação de quem vê.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA08",
        "text": "Dado que a busca não acha nada, quando o resultado volta, então o sistema mostra variações tentadas (sem acento, radical) e sugere ampliar o escopo — sem inventar ocorrência.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA09",
        "text": "Dado um documento longo (até o limite configurado, padrão 2 000 páginas), quando busco, então a resposta da busca vem em até 2 s para o primeiro lote (paginação dos demais), medida e registrada.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA10",
        "text": "Dado qualquer busca ou extração, quando executada, então fica na trilha de auditoria (quem, quando, escopo e termos — sem guardar o conteúdo dos documentos no log).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA11",
        "text": "Dado a aba Encontrar, quando busco, então os resultados aparecem como linhas KWIC alinhadas (referência da página · contexto à esquerda · termo ao centro · contexto à direita), com controle do tamanho do contexto (±4 / ±8 / ±16 palavras), alternância agrupar por documento / por termo, filtros laterais (documentos com contagem, classificação) e as ações exportar, salvar busca e anexar como evidência; cada linha abre o documento na posição da ocorrência.",
        "note": "Opção A — tela principal",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA12",
        "text": "Dado a aba \"Extrair termos e entidades\" da mesma tela, quando aberta para o escopo atual, então vejo abas Termos e frases-chave (relevância e ocorrências), Valores (R$), Datas e prazos, Artigos de lei citados e Órgãos, empresas e processos (CPF/CNPJ mascarados), cada linha com \"onde aparece\" e \"Ver no contexto\", que abre a Opção A já filtrada naquele termo; sem IA, com \"Resumir com IA\" opcional.",
        "note": "Opção C — aba Extrair",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA13",
        "text": "Dado o RF48 (aba Agentes), quando abro um dossiê de contratação, então as Opções A e C estão disponíveis com o escopo fixado nos documentos daquele dossiê (ver RF48.CA13–CA15).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF47.CA14",
        "text": "Dado o Encontrar aberto num projeto de categoria Licitação/Contrato, quando aciono \"Testar esta contratação\" (botão no cabeçalho), então a aba Agentes (RF48) abre com o dossiê daquele projeto; e cada resultado do Encontrar pode ser \"Vinculado como evidência\" de um achado do RF48. As quatro ferramentas (A busca com palavra no contexto, B leitor com mapa, C extrair, lista de termos) são as mesmas usadas dentro do RF48 (RF48.CA13–CA19).",
        "note": "Conexão RF47 ↔ RF48",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF48",
    "n": 48,
    "title": "Utilizar a aba Agentes (Copilot de testes) para testar uma contratação antes do início e durante a execução — testes contratuais, orçamentários, comportamentais, de integridade e Score do Contrato, sempre com fundamentação bibliográfica",
    "hu": "COMO: agente de contratação, gestor/fiscal de contrato, controle interno ou chefe POSSO: rodar o Copilot de testes da aba Agentes sobre uma contratação, antes do início e na execução (testes contratuais, orçamentários, comportamentais, de integridade e Score do Contrato), com evidência e bibliografia real em cada achado PARA: saber se vale a pena contratar e acompanhar o contrato com base verificável, com a decisão mantida pela autoridade competente",
    "summary": "Não é o Copilot sugestivo do RF26: aqui o Copilot testa. Cada agente executa uma bateria de testes sobre o dossiê de uma contratação (tarefas e anexos do projeto: ETP, TR, edital, proposta, contrato, medições, aditivos, certidões) e devolve achados verificáveis, nunca uma decisão. Contexto do card: contratações do Governo do Estado do Paraná — Lei 14.133/2021, regulamentação estadual (Decreto Estadual 10.086/2022) e, para contratos antigos, Lei Estadual 15.608/2007. Regra de ouro (IA é crítica, não decisora): todo achado traz evidência (trecho do documento, certidão ou consulta com data) e fundamentação normativa e bibliográfica real (artigo de lei, norma técnica, obra acadêmica ou profissional, com seção/página quando houver). Sem referência, não é achado. Pessoas cuidam do jurídico: o Copilot não decide questão jurídica, não aprova nem reprova empresa ou contrato e não redige conteúdo.",
    "route": "Agentes (/agents; também \"Testar esta contratação\" dentro de um projeto de categoria Licitação/Contrato — /projects/[id])",
    "coverage": "RF48.CA01 · CA02 · CA03 · CA04 · CA05 · CA06 · CA07 · CA08 · CA09 · CA10 · CA11 · CA12 · CA13 · CA14 · CA15 · CA16 · CA17 · CA18 · CA19 (corpo do card, inalterado; CA13–CA15 acrescentados pelo dono em 2026-10-06 com a escolha da interface do RF47; CA16–CA19 em comentário do card de 2026-10-06) — regra: o título do card define o RF e o corpo traz os próprios CAs.",
    "cas": [
      {
        "id": "RF48.CA01",
        "text": "Dado um usuário com acesso ao projeto, quando abre a aba Agentes, então vê o catálogo por fase (antes do início / execução / transversais) com o que cada agente testa, a base normativa e a bibliografia, e pode rodar um agente, um grupo ou todos sobre o dossiê.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA02",
        "text": "Dado um teste executado, quando termina, então o Relatório de Testes lista cada achado com: teste, resultado (✅ conforme · ⚠️ atenção · ⛔ não conforme · ❔ não verificável), evidência (documento e trecho, ou consulta externa com fonte, data e hora) e fundamentação (artigo e/ou referência bibliográfica real da base curada, com versão).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA03",
        "text": "Dado qualquer achado sem evidência ou sem referência da base bibliográfica curada, quando o relatório é montado, então ele não aparece como achado; no máximo aparece em \"Hipóteses não fundamentadas\", rotulado assim e fora do Score.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA04",
        "text": "Dado o papel do Copilot, quando ele responde, então não sugere nem redige conteúdo (isso é RF26/RF13), não aprova nem reprova empresa ou contrato e não emite parecer jurídico; o relatório traz \"não substitui parecer jurídico nem a decisão da autoridade competente\" e a decisão é humana, registrada (RF29).",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA05",
        "text": "Dado uma consulta externa (ex.: CEIS/CNEP pela API do Portal da Transparência, certidões), quando falha, expira ou exige verificação humana (captcha), então o teste fica ❔ não verificado, nunca ✅; cada consulta guarda fonte, data e hora e o hash da resposta.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA06",
        "text": "Dado o agente de Integridade, quando roda, então usa só fontes oficiais públicas, descreve fatos (\"sanção X registrada no CEIS em dd/mm/aaaa, vigente até…\") sem juízo moral sobre pessoas, mascara dados pessoais (LGPD) e permite à área anexar contraditório ou justificativa ao achado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA07",
        "text": "Dado o Score do Contrato, quando calculado, então mostra o valor geral, cada dimensão, o peso e a contribuição de cada uma, e a confiança (proporção de testes verificáveis). Portões não se compensam: sanção impeditiva vigente, certidão obrigatória vencida ou ⛔ crítico marcam o contrato \"bloqueado para verificação\", qualquer que seja o número. Pesos versionados e definidos por EMPRESA/CHEFE.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA08",
        "text": "Dado um contrato em execução, quando ocorre um gatilho (medição lançada, aditivo proposto, certidão a vencer em 15 dias, prorrogação ou ciclo mensal), então os agentes da fase rodam de novo e as mudanças desde a última execução aparecem destacadas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA09",
        "text": "Dado um dossiê com documento RESTRITO ou SIGILOSO, quando um agente usa IA, então o processamento é só local (RF43.CA02), com orçamento de IA (RF43) e registro em ai_inference_log; os testes determinísticos (prazos, limites, datas, índices) rodam sem IA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA10",
        "text": "Dado o relatório, quando exporto ou anexo, então gero PDF/XLSX com sumário, achados, evidências e bibliografia citada (ABNT NBR 6023), e posso anexá-lo como evidência no projeto, no processo (protocolo) ou numa sessão DECIA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA11",
        "text": "Dado o mesmo dossiê e a mesma versão das regras, quando reexecuto os testes determinísticos, então o resultado é idêntico (reprodutível); a versão das regras e da base bibliográfica fica no relatório e na trilha de auditoria.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA12",
        "text": "Dado o perfil de quem roda (agente de contratação, gestor ou fiscal do contrato, controle interno, chefe), quando o catálogo abre, então os agentes recomendados para aquele papel vêm primeiro (art. 8, art. 117, art. 169); o acesso ao dossiê segue a política de autorização do Bloco 5.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA13",
        "text": "Dado o dossiê aberto na aba Agentes, quando aciono \"Encontrar no dossiê\", então uso a busca com palavra no contexto do RF47 (CA11) com o escopo fixado nos documentos da contratação; cada ocorrência tem \"Vincular como evidência\", que a liga a um achado existente ou a uma verificação manual registrada no relatório.",
        "note": "Opção A no dossiê",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA14",
        "text": "Dado o dossiê, quando aciono \"Extrair do dossiê\", então vejo a extração do RF47 (CA12) — termos, valores, datas e prazos, artigos de lei, órgãos/empresas/processos — e os agentes determinísticos a usam como entrada (ex.: Prazos e vigência lê as datas; Aditivos compara valores com o limite do art. 125; Contratual confere artigos citados); cada achado aponta a linha extraída e o trecho de origem.",
        "note": "Opção C no dossiê",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA15",
        "text": "Dado uma lista de termos do RF47 (ex.: \"cláusulas de risco\"), quando o agente Contratual a aplica, então termo ausente vira ⚠️ atenção (\"verificar redação equivalente\"), nunca ⛔ automático, e o resultado entra no relatório com a lista e a versão usadas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA16",
        "text": "Dado o dossiê, quando aciono \"Ler com mapa\", então abro o leitor do RF47 com as ocorrências destacadas, o mapa lateral mostrando também os trechos já usados em achados (cor e forma pelo resultado) e a ação \"Vincular trecho selecionado como evidência\" de um achado ou de uma verificação manual.",
        "note": "Opção B no dossiê",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA17",
        "text": "Dado o dossiê, quando abro as ferramentas, então vejo as abas Encontrar (A) · Ler com mapa (B) · Extrair (C) · Lista de termos, todas com escopo fixo nos documentos da contratação e com a mesma política de acesso e de sigilo do RF47.",
        "note": "Ferramentas do dossiê em abas",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA18",
        "text": "Dado a aba Agentes, quando escolho o modo de visualização, então posso alternar entre: Mesa de testes (dossiê · agentes por fase · score), Assistente passo a passo (contratação → fase e papel → testes recomendados → rodar → revisar), Carteira de contratos (várias contratações com score, portões, achados abertos e próximo gatilho; para gestor, controle interno e chefe) e Matriz de testes (agentes × documentos com o pior resultado em cada célula); o modo escolhido fica salvo por pessoa.",
        "note": "Modos de tela principal",
        "kind": "enunciado"
      },
      {
        "id": "RF48.CA19",
        "text": "Dado qualquer tela do RF48, quando aciono \"Abrir no Encontrar\", então o RF47 abre com o escopo do dossiê; e, dado o RF47 aberto num projeto de categoria Licitação/Contrato, quando aciono \"Testar esta contratação\", então a aba Agentes abre com aquele dossiê. \"Ver no documento\" num achado abre o leitor (B) na posição exata; uma linha do Extrair (C) leva ao achado que a usou.",
        "note": "Conexão RF47 ↔ RF48",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF49",
    "n": 49,
    "title": "Coordenar Pactos de Desbloqueio entre usuários, chefes e departamentos",
    "hu": null,
    "summary": "Trello: RF49 Coordenar Pactos de Desbloqueio entre usuários, chefes e departamentos.",
    "route": "Metas & objetivos (/goals; pacto vinculado a tarefas/projetos dependentes)",
    "coverage": "RF49.CA01 … RF49.CA14 — CAs da especificação deste README (requisito novo do estudo de 12/10/2026, sem HU no board), sem alteração; todos planejados: no código só existem o domínio de apoio (lotações, tarefas, dependências, evidências, reconhecimento, notificação) e as guardas de acesso.",
    "cas": [
      {
        "id": "RF49.CA01",
        "text": "Dado um usuário ativo com acesso ao recurso dependente, quando solicita uma entrega a outro departamento ativo da mesma empresa, então informa entrega esperada, justificativa, critério de aceitação e prazo desejado; o servidor deriva identidade e empresa da sessão e registra SOLICITADO. Alvos inacessíveis não revelam existência.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA02",
        "text": "Dado um pedido, quando o destinatário responde, então aceita, propõe outra data, pede esclarecimento ou recusa com motivo. Só participantes autorizados e chefias atuais dos departamentos envolvidos podem negociar. Propor data não equivale a compromisso aceito.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA03",
        "text": "Dado o acordo das equipes e o aceite explícito do executor autorizado, quando o pacto é confirmado, então registra COMPROMETIDO, responsável e data acordada. Não substitui atribuições ou lotações existentes.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA04",
        "text": "Dado o limite configurado de compromissos simultâneos da equipe, quando uma aceitação o excederia, então bloqueia com conflito explicável. Exceção exige decisão justificada do chefe; a contagem exclui pactos encerrados.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA05",
        "text": "Dado um pacto comprometido, quando o executor apresenta evidência a que os envolvidos possuem acesso, então registra ENTREGUE e a versão do recurso entregue. O solicitante valida ou devolve com critério não atendido e justificativa; cada tentativa permanece no histórico.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA06",
        "text": "Dado o recebimento, quando o solicitante valida a entrega, então registra VALIDADO e permite confirmar separadamente se o trabalho dependente voltou a avançar. Não conclui tarefas nem remove bloqueios automaticamente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA07",
        "text": "Dado um compromisso vigente, quando alguém propõe outra data ou escopo, então requer novo aceite dos envolvidos, preservando acordo anterior, motivo e autoria. O instante de criação não é reiniciado para reduzir artificialmente o tempo de espera.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA08",
        "text": "Dado uma dependência circular ou um conflito de prioridade não resolvido, quando o sistema o identifica, então informa a causa com dados autorizados e permite encaminhar o conflito às chefias. Dependências circulares são rejeitadas antes do commit. Prioridade não é decidida automaticamente pela IA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA09",
        "text": "Dado uma conta ou chefia que perdeu vínculo, quando tenta agir, então as permissões são relidas no servidor. SIGILOSO exige concessão explícita do proprietário também para chefes, administradores e colaboradores do pacto. Agregações e notificações não expõem conteúdo protegido.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA10",
        "text": "Dado edições simultâneas ou repetição de requisição, quando o servidor processa uma operação, então utiliza controle de versão e idempotência, sem duplicar compromisso, evidência ou notificação. Evento, alteração de estado e notificação ficam atomicamente persistidos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA11",
        "text": "Dado o usuário autenticado, quando abre a fila de cooperação, então vê apenas pactos autorizados, com filtros por recebidos/enviados, departamento, estado e prazo, paginação, estados vazio/erro/carregamento e ações operáveis por teclado. “Quem eu posso destravar hoje?” exibe demandas compatíveis com vínculos e permissões atuais.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA12",
        "text": "Dado pactos com datas e eventos verificáveis, quando consulta métricas autorizadas, então mostra mediana/p90 de espera, amostra, devoluções, renegociações e desbloqueios confirmados. Casos abertos/cancelados ficam visíveis no agregado. Ausência de dados não vira zero; atraso evitado estimado não vira resultado comprovado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA13",
        "text": "Dado um pacto validado, quando o solicitante deseja reconhecer a ajuda, então pode registrar reconhecimento contextual vinculado à entrega, integrado ao RF35. Não distribui pontos por criar solicitações nem gera classificação individual de velocidade.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF49.CA14",
        "text": "Dado mudanças relevantes, quando notificadas, então participantes autorizados recebem mensagens genéricas e agrupadas; lembretes respeitam preferências e limites de frequência. Cancelamento, recusa e devolução exigem motivo, com histórico auditável.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF50",
    "n": 50,
    "title": "Analisar o perfil no Copilot e recomendar tarefas, projetos, pessoas da rede e caminhos profissionais",
    "hu": null,
    "summary": "Estado: requisito especificado; implementação pendente. Nome de produto: Análise de Perfil. Origem: solicitação do usuário em 12/10/2026.",
    "route": "Insights da IA (/insights; Análise de Perfil a partir de /profile)",
    "coverage": "RF50.CA01 … RF50.CA18 — CA01–CA15 da tabela principal e CA16–CA18 de \"Pessoas com perfil semelhante\", sem alteração (requisito solicitado pelo usuário em 12/10/2026, sem HU no board); reais só o perfil e as preferências em /api/me, a busca em /api/people e o AiGateway, que não tem motor registrado.",
    "cas": [
      {
        "id": "RF50.CA01",
        "text": "Dado o usuário autenticado, quando inicia Análise de Perfil, então escolhe objetivo da análise, escopo profissional/pessoal e dados que deseja utilizar. O servidor deriva identidade da sessão; a pessoa pode editar e excluir campos antes de confirmar.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA02",
        "text": "Dado currículo, portfólio ou conteúdo selecionado, quando importado, então valida tamanho/formato, sanitiza conteúdo e apresenta dados extraídos para confirmação. Não executa macros, instruções embutidas ou URLs fornecidas como comandos. Recurso inacessível não integra o contexto.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA03",
        "text": "Dado o perfil confirmado, quando analisado, então gera síntese com competências declaradas/evidenciadas, interesses, objetivos, lacunas e incertezas. Cada afirmação referencia campo ou evidência autorizada; informações insuficientes geram perguntas. Inferências ficam identificadas e podem ser corrigidas pelo usuário.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA04",
        "text": "Dado competências e objetivos selecionados, quando pede sugestões de tarefas, então recebe propostas com título, finalidade, competência trabalhada, esforço estimado, pré-requisitos e critério verificável de aceite. Estimativa é identificada como tal; não cria tarefas automaticamente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA05",
        "text": "Dado disponibilidade e objetivo, quando pede sugestões de projetos, então recebe propostas com escopo, resultado, fases, tarefas, riscos e dependências, distinguindo trabalho institucional de projeto pessoal. Não atribui colegas nem compromete recursos da empresa sem autorização e confirmação nos fluxos correspondentes.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA06",
        "text": "Dado interesses, experiência e competências, quando pede caminhos de carreira, então apresenta alternativas com justificativa, requisitos, lacunas e ações de desenvolvimento. A pessoa compara, discorda, refina e escolhe alternativas; não há classificação automática de empregabilidade, aptidão definitiva ou promessa de contratação.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA07",
        "text": "Dado uma afirmação sobre vagas, demanda de mercado, remuneração ou requisito atual, quando apresentada, então cita fonte, data e abrangência geográfica verificáveis. Sem fonte atual disponível, informa a limitação e não apresenta conhecimento geral do modelo como pesquisa atual de mercado. Faixas e projeções são explicitamente estimativas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA08",
        "text": "Dado uma proposta, quando a pessoa aceita, então revisa campos e confirma a criação de rascunho, com proveniência da análise, versão do perfil e inferência utilizada. Aceitar novamente a mesma proposta é idempotente. Sugestão baseada em perfil alterado exige atualização ou confirmação explícita da divergência.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA09",
        "text": "Dado dados de perfil e recomendações pessoais, quando armazenados ou consultados, então permanecem privados por padrão. Chefes, empresa e administradores não recebem acesso automático. Compartilhar uma saída exige seleção explícita de destinatário e conteúdo; não amplia acesso às fontes.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA10",
        "text": "Dado uso de provedor externo, quando uma análise é solicitada, então pede consentimento contextual, mostra quais categorias de dados serão enviadas, aplica minimização, política de classificação e limites de custo. Conteúdo RESTRITO/SIGILOSO não vai ao provedor externo na política atual. Edição do perfil permanece disponível sem saldo ou com IA indisponível.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA11",
        "text": "Dado dados sensíveis ou características protegidas, quando presentes no material, então não os usa para inferir aptidão ou restringir possibilidades de carreira. O Copilot não infere saúde, religião, orientação sexual ou outras características sensíveis. Necessidades de acessibilidade podem orientar preferências informadas, sem reduzir oportunidades por presunção de incapacidade.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA12",
        "text": "Dado resposta da IA, quando exibida, então apresenta propostas separadas de fatos confirmados, fontes, limitações e controles para corrigir, rejeitar ou pedir explicação. Não utiliza Hype Score, pontos ou popularidade como medida de potencial profissional. Não transforma a análise em avaliação de desempenho ou decisão de contratação.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA13",
        "text": "Dado conta trocada, sessão encerrada ou concessão revogada, quando há resposta pendente, então descarta atualizações da sessão anterior e relê autorização antes de persistir ou aplicar propostas. Eventos guardam autoria e referência de inferência sem copiar currículo ou texto sensível para logs.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA14",
        "text": "Dado o usuário, quando deseja excluir análise ou revogar uso futuro dos dados, então consegue fazê-lo nas regras de retenção documentadas. Exportação informa os dados fornecidos e as recomendações produzidas. Histórico e propostas não ficam disponíveis a outra conta no mesmo dispositivo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA15",
        "text": "Dado análise incompleta, falha de provedor ou limite de uso, quando ocorre, então preserva o perfil, informa o estado e oferece nova tentativa explícita, sem repetir automaticamente chamadas cobradas. A interface funciona por teclado, tem estrutura semântica e distingue visualmente informação, hipótese e proposta.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA16",
        "text": "Dado um perfil confirmado, quando solicita pessoas semelhantes, então recomenda somente usuários descobríveis na rede autorizada, não bloqueados e que permitem uso dos campos exibidos para descoberta. Usa competências, interesses, objetivos e experiências compartilhados para esse fim; análise privada de carreira, currículo privado, Hype Score e características sensíveis não entram no pareamento. Não revela nomes, contagens ou evidências de perfis inacessíveis.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA17",
        "text": "Dado uma pessoa recomendada, quando a sugestão aparece, então explica a afinidade com campos visíveis — por exemplo “ambos trabalham com orçamento e têm interesse em BIM” — e pode propor atividade colaborativa concreta. Similaridade é afinidade por critérios declarados, não percentual de personalidade, aptidão ou valor profissional. A pessoa filtra critérios, descarta sugestão e pode explorar perfis complementares para não limitar a descoberta a um grupo homogêneo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF50.CA18",
        "text": "Dado uma recomendação de pessoa, quando o usuário decide interagir, então pode abrir o perfil autorizado, salvar a sugestão ou enviar convite pelos mecanismos de rede/mensageria com confirmação. Não cria vínculo, segue, atribui trabalho, envia mensagem ou compartilha sua análise automaticamente. Revogação da descoberta, alteração de visibilidade, bloqueio ou perda de acesso remove elegibilidade e invalida recomendações pendentes no servidor.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF51",
    "n": 51,
    "title": "Controlar autonomia, escopo e execução da IA em Letters e Drawings",
    "hu": null,
    "summary": "A pessoa escolhe, antes de qualquer análise ou alteração de uma peça Letters ou Drawings, em que modo a IA pode atuar (Manual, Sob solicitação, Sugestões, Assistido ou Agente, D-136), vê o que cada modo pode fazer, recebe só diagnósticos, propostas com diff ou execuções limitadas conforme o modo, e qualquer troca de modo, revisão ou reserva invalida as propostas pendentes sem perder o rascunho; a autorização e a política valem no servidor, e nada é publicado automaticamente.",
    "route": "Configurações › Trabalho › Autonomia da IA (/settings?tab=trabalho), Letters (/letters) e Drawings (/drawings)",
    "coverage": "RF51.CA01 … RF51.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF51.md (CAs copiados como estão escritos); classes reais: lib/ai/autonomy.ts (AiPolicy, AgentCharter, AgentRun, AiProposal, evaluateAiAction, proposalValidity, changeMode), lib/pieces/patch.ts (authorizePatch), lib/pieces/authorship.ts, lib/preferences/types.ts (aiAutonomyDefault), components/decia/WorkspaceSections.tsx, AiGateway/AiBudget/AiEnginePort (sem motor registrado), ResourceAuthorizer, AccessPolicy; o restante (planejado)",
    "cas": [
      {
        "id": "RF51.CA01",
        "text": "Dado o nível 1, quando a análise termina, então somente diagnósticos e métricas explicáveis são exibidos; texto e geometria permanecem idênticos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF51.CA02",
        "text": "Dado o nível 2, quando uma proposta é gerada, então mostra diff e prévia, e só altera conteúdo após aceite explícito; rejeitar preserva o original.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF51.CA03",
        "text": "Dado o nível 3, quando executa uma transformação local autorizada, então restringe objetos/blocos à seleção e registra checkpoint, validações e rollback.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF51.CA04",
        "text": "Dado o nível 4, quando recebe um objetivo, então apresenta plano, ferramentas permitidas, escopo e orçamento; para ao atingir limite, conflito ou incerteza impeditiva.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF51.CA05",
        "text": "Dada uma revisão ou reserva alterada, quando uma proposta antiga é aplicada, então rejeita a proposta sem perder o rascunho e solicita nova análise.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF51.CA06",
        "text": "Dado um documento ou imagem contendo instruções, quando entra no contexto, então é tratado como dado e não altera permissões, ferramentas ou política do agente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF51.CA07",
        "text": "Dada uma inferência paga, quando é solicitada, então informa envio de dados, provedor e limite; registra tokens/custo quando disponíveis, permite cancelamento e não faz repetição automática ilimitada.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF52",
    "n": 52,
    "title": "Editar documentos estruturados no Work Station Letters",
    "hu": null,
    "summary": "A pessoa abre no Letters um documento vinculado a uma tarefa ou a uma sessão DECIA, insere e reorganiza títulos, parágrafos, listas, tabelas, referências e imagens em blocos com identificador estável, formata só o trecho selecionado com desfazer, navega por sumário, busca e numeração de parágrafos sem perder a seleção, importa e exporta apenas formatos habilitados com relatório de fidelidade, e cada gravação é uma revisão autorizada e versionada no servidor.",
    "route": "Letters (/letters, /letters/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF52.CA01 … RF52.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF52.md (CAs copiados como estão escritos); classes reais: lib/pieces/service.ts (WorkPiece, PiecesService em memória), lib/pieces/authorship.ts, TaskService, ResourceAuthorizer, AccessPolicy, página-esqueleto app/(shell)/letters/page.tsx; o restante (planejado)",
    "cas": [
      {
        "id": "RF52.CA01",
        "text": "Dado um documento, quando insere e reorganiza títulos, parágrafos, listas, tabelas, referências e imagens, então mantém estrutura semântica e ordem na reabertura.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF52.CA02",
        "text": "Dada seleção de texto, quando formata estilo, fonte, tamanho, alinhamento, recuo e espaçamento, então afeta apenas o trecho e permite desfazer.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF52.CA03",
        "text": "Dado documento longo, quando navega no sumário, busca ou numeração de parágrafos, então foca o trecho correto sem perder seleção.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF52.CA04",
        "text": "Dada importação de formato suportado, quando valida e abre, então informa limitações de fidelidade e não descarta conteúdo silenciosamente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF52.CA05",
        "text": "Dada exportação TXT, PDF, DOCX ou formato nativo, quando o formato está habilitado, então preserva o conteúdo previsto e tem teste de ida e volta; formatos pendentes não aparecem como operacionais.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF52.CA06",
        "text": "Dado uso por teclado e leitor de tela, quando percorre ferramentas e editor, então há rótulos, foco visível e ações acessíveis.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF52.CA07",
        "text": "Dado conteúdo malformado ou excessivo, quando é importado, então rejeita com motivo, preserva o documento atual e não executa scripts.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF53",
    "n": 53,
    "title": "Analisar língua, morfossintaxe e gramática no Letters",
    "hu": null,
    "summary": "A pessoa seleciona um trecho em português no Letters e pede a análise linguística: o painel marca as classes de palavras com legenda e posição, aponta sujeito, predicado, regência, concordância, crase, flexões, tratamento e tempos verbais como achados ancorados à revisão analisada, explica cada hipótese com regra e referência verificável, troca de idioma só quando há recursos compatíveis e respeita o que a pessoa ignora ou adiciona ao dicionário pessoal, sem enviar cada tecla a um provedor.",
    "route": "Letters (/letters, /letters/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF53.CA01 … RF53.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF53.md (CAs copiados como estão escritos); classes reais: AiGateway/AiBudget (sem motor registrado), ResourceAuthorizer, AccessPolicy, lib/ai/autonomy.ts (evaluateAiAction), página-esqueleto app/(shell)/letters/page.tsx; o restante (planejado)",
    "cas": [
      {
        "id": "RF53.CA01",
        "text": "Dado português selecionado, quando analisa, então diferencia substantivos, verbos, adjetivos, pronomes, advérbios, preposições, conjunções, artigos, numerais e interjeições com legenda e posições no texto.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF53.CA02",
        "text": "Dado um corpus de referência anotado, quando identifica sujeito, predicado, regência, concordância, crase e flexões, então mede desempenho por categoria e expõe casos incertos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF53.CA03",
        "text": "Dado tratamento tu/você e tempos/modos distintos, quando há inconsistência contextual, então explica a hipótese e oferece alternativa preservando intenção.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF53.CA04",
        "text": "Dada uma correção, quando informa a justificativa, então identifica regra e referência bibliográfica consultada; não inventa edição, página ou citação.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF53.CA05",
        "text": "Dada outra língua, quando troca o idioma, então carrega recursos compatíveis ou informa indisponibilidade, sem aplicar regras portuguesas como universais.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF53.CA06",
        "text": "Dada análise em tempo real, quando o texto muda, então atualiza somente achados da revisão correta e não reenvia a cada tecla sem controle de frequência/custo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF53.CA07",
        "text": "Dado nome próprio, variedade regional ou falso positivo, quando o usuário ignora ou adiciona ao dicionário pessoal, então respeita a preferência e permite reversão.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF54",
    "n": 54,
    "title": "Analisar coerência, narrativa, gênero e fontes no Letters",
    "hu": null,
    "summary": "A pessoa escolhe o gênero do texto (técnico, acadêmico, jornalístico ou narrativo) e pede ao Letters uma leitura de coerência, tom, continuidade e fontes: cada achado aponta os trechos de evidência, separa contradição demonstrável de hipótese e de contexto insuficiente, cada indicador por parágrafo mostra rubrica e evidência, cada citação recebe o estado acessível, indisponível ou não verificada, e o relatório declara o que ficou fora da cobertura, sem substituir o julgamento do autor nem reescrever o texto.",
    "route": "Letters (/letters, /letters/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF54.CA01 … RF54.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF54.md (CAs copiados como estão escritos); classes reais: AiGateway/AiBudget (sem motor registrado), ResourceAuthorizer, AccessPolicy, lib/ai/autonomy.ts (evaluateAiAction), página-esqueleto app/(shell)/letters/page.tsx; o restante (planejado)",
    "cas": [
      {
        "id": "RF54.CA01",
        "text": "Dado gênero técnico, acadêmico, jornalístico ou narrativo, quando analisa, então usa critérios do gênero escolhido e explica mudanças de tom.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF54.CA02",
        "text": "Dada notícia neutra com primeira pessoa, quando detecta subjetividade, então sinaliza o trecho sem declarar todo uso como erro obrigatório.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF54.CA03",
        "text": "Dado personagem morto que reaparece depois, quando não há explicação narrativa identificada, então aponta as duas passagens e pede revisão de continuidade.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF54.CA04",
        "text": "Dadas cronologia e entidades ao longo de capítulos, quando analisa, então diferencia contradição demonstrável de hipótese e contexto insuficiente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF54.CA05",
        "text": "Dado indicador por parágrafo de coerência, clareza, sintaxe e tom, quando apresenta nota, então informa rubrica e evidência; heurística não aparece como nota calibrada de IA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF54.CA06",
        "text": "Dadas citações e afirmações factuais, quando verifica fontes, então distingue referência acessível, indisponível e não verificada.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF54.CA07",
        "text": "Dado documento longo, quando segmenta contexto, então mantém vínculos entre achados e trechos e informa limites da cobertura.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF55",
    "n": 55,
    "title": "Revisar, completar e reescrever texto com IA no Letters",
    "hu": null,
    "summary": "A pessoa pede ao Letters uma revisão (ortografia, gramática, parágrafo ou documento), uma continuação a partir do cursor (palavra, frase, parágrafo ou documento) ou uma reescrita autorizada; recebe uma proposta ancorada à revisão e ao trecho de origem, compara removido e adicionado no diff inline, vê destacadas as mudanças em números, nomes e citações, aceita, rejeita, pede explicação ou alternativa, e pode desfazer a operação inteira; proposta desatualizada nunca é inserida em outro trecho e nenhuma nova chamada paga é feita sem pedido.",
    "route": "Letters (/letters, /letters/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF55.CA01 … RF55.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF55.md (CAs copiados como estão escritos); classes reais: lib/ai/autonomy.ts (AiProposal, evaluateAiAction, proposalValidity), lib/pieces/authorship.ts (ContributionEvent, AI_PROPOSAL_ACCEPTED), components/decia/AiSuggestion.tsx, AiGateway/AiBudget (sem motor registrado), ResourceAuthorizer, AccessPolicy; o restante (planejado)",
    "cas": [
      {
        "id": "RF55.CA01",
        "text": "Dado nível básico, quando revisa ortografia, então não reescreve estilo, argumento ou parágrafos sem autorização adicional.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF55.CA02",
        "text": "Dada sugestão, quando abre o diff inline, então distingue removido/adicionado, permite aceitar, rejeitar, explicar motivo e pedir alternativa.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF55.CA03",
        "text": "Dado modo completar, quando escolhe palavra, frase, parágrafo ou documento, então gera continuação a partir do cursor e preserva o texto fora do escopo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF55.CA04",
        "text": "Dada revisão avançada autorizada, quando substitui parágrafos ou documento, então preserva original e permite rollback integral da operação.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF55.CA05",
        "text": "Dado foco/cursor ou seleção alterado durante inferência, quando a resposta retorna, então não a insere automaticamente em outro trecho.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF55.CA06",
        "text": "Dada reescrita com números, nomes e citações, quando propõe mudanças factuais, então destaca essas mudanças e não apresenta invenções como fatos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF55.CA07",
        "text": "Dada proposta rejeitada ou cancelada, quando o usuário segue escrevendo, então mantém seu rascunho e não dispara nova chamada paga automaticamente.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF56",
    "n": 56,
    "title": "Colaborar, comentar e resolver conflitos em documentos Letters no DECIA",
    "hu": null,
    "summary": "Editores autorizados de uma tarefa abrem o mesmo documento Letters dentro de uma sessão DECIA: alterações em blocos diferentes convergem e são persistidas, o mesmo bloco segue uma política explícita de reserva ou merge sem sobrescrita silenciosa, gravações com reserva expirada, desconexão ou acesso revogado são rejeitadas no servidor com rascunho recuperável, comentários e sugestões guardam autor, data, trecho e resolução, observadores só leem, e a versão aprovada vira evidência imutável da decisão sem ser publicada automaticamente.",
    "route": "Letters (/letters, /letters/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF56.CA01 … RF56.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF56.md (CAs copiados como estão escritos); classes reais: lib/pieces/collab.ts (RegionLock, acquireLock, canEditRegions, LOCK_TTL_MS), lib/pieces/patch.ts (authorizePatch, REGIAO_RESERVADA), lib/pieces/authorship.ts, lib/ai/autonomy.ts (SessionRole), ws-domain SessionParticipant/ParticipantRole/DecisionTraceNode, TaskService, ResourceAuthorizer, AccessPolicy, components/decia/*; o restante (planejado)",
    "cas": [
      {
        "id": "RF56.CA01",
        "text": "Dados dois editores autorizados, quando alteram blocos diferentes, então as alterações convergem e são persistidas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF56.CA02",
        "text": "Dados dois editores no mesmo bloco, quando há concorrência, então usa política explícita de bloqueio ou merge e não sobrescreve silenciosamente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF56.CA03",
        "text": "Dada reserva expirada, desconexão ou revogação, quando tenta gravar, então servidor rejeita e preserva rascunho recuperável.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF56.CA04",
        "text": "Dado comentário ou sugestão, quando é resolvido, então mantém autor, data, trecho de origem e estado de resolução.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF56.CA05",
        "text": "Dada sessão DECIA vinculada, quando compartilha documento, então aplica simultaneamente ACL da tarefa e participação/papel válido da sessão.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF56.CA06",
        "text": "Dado usuário observador, quando tenta editar ou aceitar proposta, então bloqueia no servidor.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF56.CA07",
        "text": "Dada versão aprovada, quando vira evidência de decisão, então mantém vínculo imutável à revisão, sem publicar o documento automaticamente.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF57",
    "n": 57,
    "title": "Selecionar objetos, pontos e regiões no Drawings",
    "hu": null,
    "summary": "O RF57 define como a pessoa escolhe o que vai editar no Drawings: clique, janela (arraste esquerda→direita, só objetos totalmente contidos), cruzamento (direita→esquerda, objetos que tocam ou cruzam a borda), laço livre e polígono WP/CP, seleção por atributo (SELECIONAR_SEMELHANTES, com tolerância e contagem), SELECIONAR_TUDO e seleção direta de âncoras, segmentos e alças Bézier. Seleção e permissão são eixos distintos: selectedNodeIds só devolve o que está visível e editableNodeIds ainda retira camadas e nós travados e regiões reservadas por outra pessoa; o servidor repete a decisão com a mesma regra de authorizePatch antes de gravar qualquer transformação (MOVER, REDIMENSIONAR, GIRAR). Todo gesto de arraste tem alternativa por teclado e campos numéricos (WCAG 2.5.7) e o resultado é anunciado ao leitor de tela. Os nomes de comando são inspiração semântica de Illustrator/AutoCAD (referência de 17/10/2026), nunca promessa de paridade.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF57.CA01 … RF57.CA09 — corpo do card = especificação de docs/produto/requisitos-studio/RF57.md (CAs copiados como estão escritos); classes reais: DrawingScene, DrawingNode, DrawingLayer, Selection, selectAtPoint, selectInBounds, selectInPolygon, selectedNodeIds, editableNodeIds, snapPoint (lib/studio/selection.ts), DrawingEditScope/canEditDrawingTarget (lib/drawings/selection.ts), LayerStack (lib/pieces/layers.ts), RegionLock (lib/pieces/collab.ts), authorizePatch (lib/pieces/patch.ts), evaluateAiAction (lib/ai/autonomy.ts); o restante (planejado)",
    "cas": [
      {
        "id": "RF57.CA01",
        "text": "Dado arraste esquerda-direita, quando termina, então seleciona somente objetos totalmente contidos; direita-esquerda inclui objetos que cruzam ou tocam a borda.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA02",
        "text": "Dado laço livre ou WP/CP, quando conclui, então aplica contenção/cruzamento conforme modo visível e desenha prévia azul/verde.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA03",
        "text": "Dado QSELECT/FILTER ou seleção semelhante, quando filtra por camada, cor, espessura, opacidade, tipo, raio ou bloco, então usa tolerância explícita e mostra a contagem.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA04",
        "text": "Dado V, quando transforma seleção múltipla, então move/escala/rotaciona o conjunto no escopo permitido e permite desfazer.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA05",
        "text": "Dado A, quando seleciona âncora ou segmento, então edita somente os pontos/controladores escolhidos e preserva os demais.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA06",
        "text": "Dado Ctrl+A, quando há camadas ocultas, bloqueadas ou regiões de outra pessoa, então não autoriza modificá-las; seleção e permissão são eixos distintos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA07",
        "text": "Dado perfil de atalhos CAD ou vetor, quando L/A têm significados diferentes, então resolve por perfil e não intercepta digitação em campos de texto.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA08",
        "text": "Dados pontos de ancoragem e hastes Bézier, quando converte canto/suave com Shift+C, move âncora ou manipula alça com Alt/Option e Shift, então preserva vizinhos, permite alças independentes, recolher um controle e restringir a múltiplos de 45 graus; cada arraste é uma ação reversível e não causa salto de rolagem.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF57.CA09",
        "text": "Dado guia de pontos e alças, quando utiliza teclado ou leitor de tela, então identifica âncora, entrada, saída e coordenadas, com controles equivalentes ao arraste e indicação clara dos tipos de curva suportados.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF58",
    "n": 58,
    "title": "Criar e editar geometria vetorial e desenho técnico 2D",
    "hu": null,
    "summary": "O RF58 cobre a construção de traçados e perfis 2D com coordenadas e precisão: o núcleo da primeira entrega são os comandos LINHA, POLILINHA, RETANGULO, ELIPSE, POLIGONO, CAMINHO (Bézier) e TEXTO, seguidos de círculo por raio, diâmetro, 2P, 3P e TTR, arco, linha de construção e ponto; edição por aparar, estender, deslocar, unir, quebrar, CORTAR_NO_PONTO e reverter; largura variável e pincel de mancha expandidos em contornos editáveis; auxílios de precisão (OSNAP, ORTHO, POLAR, GRADE, ORIGEM) que só propõem pontos; e medição (DIST, AREA, cotas) calculada sobre a geometria real, nunca sobre o texto digitado. Cada comando aceita entrada numérica por linha de comando ou campos (alternativa ao arraste, WCAG 2.5.7), anuncia o resultado ao leitor de tela e passa pela mesma autorização de patch (camada ativa, escopo, reserva). Nomes como LINE, PLINE e TRIM são inspiração semântica de AutoCAD/Illustrator, sem promessa de paridade.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF58.CA01 … RF58.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF58.md (CAs copiados como estão escritos); classes reais: Geometry (rect, circle, segment, polygon, path), geometryBounds, hitTest, snapPoint (lib/studio/selection.ts), authorizePatch (lib/pieces/patch.ts), DrawingClassification.scale (lib/pieces/classification.ts), toWireframe/RenderMode (lib/pieces/wireframe.ts), evaluateAiAction (lib/ai/autonomy.ts); o restante (planejado)",
    "cas": [
      {
        "id": "RF58.CA01",
        "text": "Dados LINE, PLINE, CIRCLE, ARC, RECTANG, POLYGON, ELLIPSE, SPLINE, XLINE e POINT, quando executados com parâmetros válidos, então criam a geometria esperada e rejeitam degenerações.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF58.CA02",
        "text": "Dado círculo, quando escolhe raio, diâmetro, 2P, 3P ou TTR, então resolve o método e informa ambiguidade ou impossibilidade.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF58.CA03",
        "text": "Dada caneta Bézier ou lápis livre, quando edita controles e simplifica, então informa tolerância/erro máximo e preserva fechamento e pontos protegidos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF58.CA04",
        "text": "Dados TRIM, EXTEND, OFFSET, JOIN/PEDIT, BREAK, tesoura e reversão, quando aplicados, então preservam topologia prevista e mantêm histórico.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF58.CA05",
        "text": "Dados largura variável e pincel de mancha, quando expande, então gera contornos editáveis e mantém aparência dentro da tolerância declarada.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF58.CA06",
        "text": "Dados OSNAP, ORTHO, POLAR, SNAP/GRID, quando habilitados, então mostram ponto/alinhamento proposto sem deslocar objetos fora do escopo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF58.CA07",
        "text": "Dados DIST, AREA, cotas, unidades e escala, quando mede, então calcula sobre geometria real e distingue medida de valor textual digitado.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF59",
    "n": 59,
    "title": "Construir, dividir e desmembrar contornos vetoriais",
    "hu": null,
    "summary": "O RF59 trata as operações que constroem, dividem e desmembram contornos 2D: booleanas UNIR, SUBTRAIR e INTERSECTAR (Shape Builder fica como CONSTRUTOR_DE_FORMAS, fase posterior), DIVIDIR em regiões independentes, caminho composto com furo (regra par/ímpar) e SEPARAR_CAMINHO_COMPOSTO, DESAGRUPAR que só remove o vínculo de grupo, LIBERAR_MASCARA que devolve os vetores selecionáveis, e EXPANDIR traço ou aparência com aviso de perda de parametrização e versão anterior preservada. Regra central, comum ao RF61: desmembrar nunca descarta propriedades (furos, faces, texto, ordem, estilo) sem avisar; operação que o formato nativo não representa é bloqueada antes de qualquer alteração. Toda operação é acionável por menu, paleta e teclado sobre a seleção corrente (sem exigir arraste, WCAG 2.5.7), com o relatório de preservação lido pelo leitor de tela. Nomes de comando inspirados em Illustrator (Pathfinder, Release Compound Path) e AutoCAD (UNION, EXPLODE), sem promessa de paridade.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF59.CA01 … RF59.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF59.md (CAs copiados como estão escritos); classes reais: Geometry e DrawingNode.parentId com resolução de descendentes de grupo em selectedNodeIds (lib/studio/selection.ts), authorizePatch (lib/pieces/patch.ts), LayerStack (lib/pieces/layers.ts), evaluateAiAction/proposalValidity (lib/ai/autonomy.ts); o restante (planejado)",
    "cas": [
      {
        "id": "RF59.CA01",
        "text": "Dados UNION/Shape Builder, SUBTRACT e INTERSECT, quando combina perfis fechados, então o resultado corresponde à área geométrica esperada.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF59.CA02",
        "text": "Dado Pathfinder Divide ou pintura por regiões, quando cruza contornos, então produz regiões independentes selecionáveis e coloríveis.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF59.CA03",
        "text": "Dado caminho composto com furo, quando exporta/reabre, então mantém o furo; liberar caminho composto separa contornos explicitamente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF59.CA04",
        "text": "Dado grupo, quando UNGROUP é executado, então remove apenas o vínculo de agrupamento e preserva geometria, texto e ordem.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF59.CA05",
        "text": "Dada máscara, quando libera recorte, então mantém os vetores originais e torna os elementos liberados selecionáveis.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF59.CA06",
        "text": "Dado Expand/Expand Appearance, quando converte traços ou efeitos, então informa perda de parametrização e preserva versão anterior.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF59.CA07",
        "text": "Dada operação não representável no formato nativo, quando é solicitada, então bloqueia sem descartar furos, faces ou conteúdo silenciosamente.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF60",
    "n": 60,
    "title": "Modelar sólidos, superfícies e malhas 3D no Drawings",
    "hu": null,
    "summary": "O RF60 descreve a modelagem 3D do Drawings: primitivas (caixa, cilindro, esfera, cone, cunha, toro), operações de perfil (extrusão/PRESSPULL, revolução, loft e varredura), volume almofadado (Inflate) identificado como aproximação ou simulação, booleanas de sólidos (UNIR, SUBTRAIR, INTERSECTAR) validadas antes de gravar, acabamento de arestas apenas onde suportado, e transformações 3D (MOVER, GIRAR, REDIMENSIONAR em XYZ) com seleção múltipla, pivô explícito, limites e desfazer. Toda a modelagem 3D é capacidade futura declarada por operação: cada comando expõe na interface se está disponível, parcial ou futuro, qual representação usa (malha poligonal; B-rep só quando houver kernel) e suas limitações, sem prometer equivalência com AutoCAD ou Illustrator. Cada parâmetro tem campo numérico equivalente ao gizmo (WCAG 2.5.7) e o resultado (dimensões, volume, fechamento) é anunciado ao leitor de tela.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF60.CA01 … RF60.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF60.md (CAs copiados como estão escritos); classes reais: authorizePatch (lib/pieces/patch.ts), LayerStack (lib/pieces/layers.ts), RegionLock (lib/pieces/collab.ts), DrawingClassification com técnica TRES_D (lib/pieces/classification.ts), evaluateAiAction (lib/ai/autonomy.ts); o restante (planejado)",
    "cas": [
      {
        "id": "RF60.CA01",
        "text": "Dados BOX, CYLINDER, SPHERE, CONE, WEDGE e TORUS, quando dimensiona, então gera malhas válidas com normais e escala consistente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF60.CA02",
        "text": "Dados EXTRUDE/PRESSPULL e perfil fechado, quando aplica profundidade, então gera volume e rejeita perfil degenerado ou autointersectante.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF60.CA03",
        "text": "Dados REVOLVE, LOFT e SWEEP, quando fornece eixo, seções ou trajetória, então informa correspondência/orientação e valida continuidade e fechamento.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF60.CA04",
        "text": "Dado Inflate, quando cria volume almofadado, então identifica se é aproximação geométrica ou simulação e permite refino.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF60.CA05",
        "text": "Dadas UNION, SUBTRACT e INTERSECT, quando opera sólidos, então valida resultado vazio, fechamento e interseções antes de gravar.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF60.CA06",
        "text": "Dados FILLETEDGE e CHAMFEREDGE, quando seleciona arestas, então aplica raio/chanfro nas arestas suportadas e não promete kernel B-rep onde há apenas malha.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF60.CA07",
        "text": "Dados 3DMOVE, 3DROTATE e 3DSCALE, quando usa campos ou gizmos XYZ, então permite seleção múltipla, pivô explícito, limites e desfazer.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF61",
    "n": 61,
    "title": "Desmembrar e converter estruturas 3D preservando intenção",
    "hu": null,
    "summary": "O RF61 separa operações que a referência CAD costuma misturar: EXPLODIR uma malha em faces independentes (superfícies abertas não são sólidos), converter em superfície preservando coordenadas e materiais, SEPARAR_DISJUNTOS corpos mantendo-os volumétricos, fatiar por plano (SLICE) com original recuperável, recompor em sólido só com malha fechada ou reparo revisável, explodir blocos preservando atributos como texto (BURST), consolidar representação explicando o que se remove e projetar o 3D em vetores 2D editáveis com profundidade zero (FLATTEN/Expand Appearance). Regra central: desmembrar nunca descarta propriedades sem avisar — cada operação gera um relatório de preservação (o que fica, o que se perde, o que exige confirmação) e mantém vínculo de proveniência com o objeto de origem. Toda operação é capacidade futura declarada por operação: a interface informa disponível, parcial, futura ou não suportada (por exemplo, blocos com atributos ainda sem modelo). Plano de corte e câmera de projeção têm campos numéricos equivalentes ao arraste (WCAG 2.5.7) e o relatório é lido pelo leitor de tela. Nomes AutoCAD (EXPLODE, CONVTOSURFACE, SOLIDEDIT, BREP) são inspiração semântica, sem paridade.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF61.CA01 … RF61.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF61.md (CAs copiados como estão escritos); classes reais: authorizePatch (lib/pieces/patch.ts), LayerStack (lib/pieces/layers.ts), RegionLock (lib/pieces/collab.ts), evaluateAiAction/proposalValidity (lib/ai/autonomy.ts); o restante (planejado)",
    "cas": [
      {
        "id": "RF61.CA01",
        "text": "Dado EXPLODE/X ou MESHELEMENTS, quando desmembra malha, então gera faces independentes e identifica que superfícies abertas não são sólidos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF61.CA02",
        "text": "Dado CONVTOSURFACE, quando converte, então preserva coordenadas, materiais e correspondência com objeto de origem.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF61.CA03",
        "text": "Dado SEPARATE/SOLIDEDIT Body Separate, quando há corpos disjuntos, então separa componentes mantendo-os volumétricos quando fechados.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF61.CA04",
        "text": "Dado SLICE, quando define plano por normal/posição ou pontos, então cria partes corretas, preserva original recuperável e informa corte sem interseção.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF61.CA05",
        "text": "Dado CONVTOSOLID, quando recebe malha aberta/não manifold, então recusa ou oferece reparo revisável; não presume volume válido.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF61.CA06",
        "text": "Dado BURST, quando existem atributos de bloco, então converte seus valores para texto sem perda; sem suporte a blocos deve informar indisponibilidade.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF61.CA07",
        "text": "Dado BREP, quando consolida representação suportada, então explica o que é removido; malha consolidada não é rotulada como sólido B-rep.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF61.CA08",
        "text": "Dado FLATTEN/Expand Appearance, quando projeta na câmera/plano escolhido, então cria vetores 2D editáveis com profundidade zero e sem remover o 3D original sem confirmação.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF62",
    "n": 62,
    "title": "Controlar vistas, câmera, perspectiva e coordenadas no Drawings",
    "hu": null,
    "summary": "O RF62 garante que alternar a representação nunca altera a geometria: VISTA orienta a câmera em planta (superior do sistema de coordenadas de trabalho, com o UCS identificado), ponto de vista por vetor (vetor nulo rejeitado), vistas nomeadas (planta, frontal, lateral, isométricas SW/SE/NE/NW) salvas com câmera e projeção, órbita que não move objetos e tem saída explícita, guias visuais (cubo de navegação, ícone do UCS) que não mexem em permissões, ESTILO_VISUAL que só habilita modos implementados (hoje a base é wireframe × preenchido), ORIGEM/UCS orientado por face ou eixos com conversão consistente para o espaço global, e GRADE/grade de perspectiva de 1, 2 ou 3 pontos, isométrica ou cavaleira, cuja ocultação não remove alinhamentos. Câmera pessoal é estado de visualização (não gera patch); salvar uma vista na peça é edição do documento e passa pela reserva de escopo. Toda navegação tem alternativa por teclado e campos numéricos (WCAG 2.5.7) e a vista ativa é anunciada ao leitor de tela. 3D: órbita, estilos sombreado/realista e UCS por face são capacidade futura declarada por operação; nomes PLAN, VPOINT, VIEW e 3DORBIT são inspiração semântica de AutoCAD, sem paridade.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF62.CA01 … RF62.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF62.md (CAs copiados como estão escritos); classes reais: RenderMode/toWireframe (lib/pieces/wireframe.ts), DrawingClassification.projection (lib/pieces/classification.ts), DRAWING_TAXONOMY.perspective (lib/drawings/taxonomy.ts), DrawingEditScope modo VIEW (lib/drawings/selection.ts), snapPoint e selectedNodeIds (lib/studio/selection.ts), authorizePatch (lib/pieces/patch.ts); o restante (planejado)",
    "cas": [
      {
        "id": "RF62.CA01",
        "text": "Dado PLAN, quando executa, então orienta vista superior do sistema de coordenadas de trabalho, identificando o UCS utilizado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF62.CA02",
        "text": "Dado VPOINT, quando informa vetor válido, então orienta a câmera e rejeita vetor nulo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF62.CA03",
        "text": "Dado VIEW, quando salva/restaura planta, frontal, lateral ou isométricas SW/SE/NE/NW, então mantém câmera e projeção associadas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF62.CA04",
        "text": "Dado 3DORBIT/Shift+botão do meio, quando arrasta, então orbita sem mover objetos e permite sair do modo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF62.CA05",
        "text": "Dado NAVVCUBE/UCSICON, quando alterna, então controla guias visuais e não altera permissões nem geometrias.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF62.CA06",
        "text": "Dado VISUALSTYLES/VS, quando escolhe wireframe, sombreado, raios X, conceitual ou realista, então só habilita modos implementados e identifica limitações de materiais/PBR.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF62.CA07",
        "text": "Dado UCS, quando orienta plano de trabalho por face/eixos, então novas geometrias usam esse plano, com conversão consistente para o espaço global.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF62.CA08",
        "text": "Dada grade de perspectiva 1/2/3 pontos ou plano isométrico/cavaleiro, quando desenha, então aplica transformação correta; ocultar grade não remove alinhamentos existentes.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF63",
    "n": 63,
    "title": "Editar cores, gradientes, materiais e estilos de traço",
    "hu": null,
    "summary": "O RF63 define como a pessoa autorizada refina a aparência de uma peça do Drawings — cor sólida, gradientes linear e radial, preenchimento, traço (largura, padrão, opacidade, terminações e junções), hachuras e presets técnicos, paletas inspiradas em Itten, materiais de partes 3D e a alternância wireframe/preenchido — sempre dentro do escopo autorizado pela mesma porta de patch (authorizePatch) que vale para edição manual e para propostas de IA. Toda conversão de cor declara o perfil usado e só é oferecida quando é de fato suportada.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF63.CA01 … RF63.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF63.md (CAs copiados como estão escritos); classes reais: authorizePatch/PatchOrigin/PatchDenial (lib/pieces/patch.ts), PieceLayer/LayerStack (lib/pieces/layers.ts), canEditDrawingTarget (lib/drawings/selection.ts), editableNodeIds (lib/studio/selection.ts), RenderMode/toWireframe (lib/pieces/wireframe.ts), DrawingClassification.accessibility (lib/pieces/classification.ts), AiGateway/AiEnginePort/AiBudget (ws-application, sem motor registrado); o restante (planejado)",
    "cas": [
      {
        "id": "RF63.CA01",
        "text": "Dada seleção de objeto, região ou camada, quando altera cor sólida, gradiente linear/radial e preenchimento, então afeta somente o escopo autorizado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF63.CA02",
        "text": "Dado traço, quando ajusta largura, padrão, opacidade, terminações e junções, então renderiza e exporta a mesma aparência dentro das capacidades declaradas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF63.CA03",
        "text": "Dadas hachuras de seção, cotas e hierarquia de linhas, quando usa preset técnico, então referencia norma/edição aplicável e não declara conformidade sem validação.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF63.CA04",
        "text": "Dadas harmonias Itten e controles inspirados em Munsell, quando recomenda paleta, então identifica o modelo e não confunde HSL/RGB com Munsell calibrado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF63.CA05",
        "text": "Dado RGB/CMYK/ICC, quando converte ou exporta, então informa perfil utilizado e só habilita conversão efetivamente suportada.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF63.CA06",
        "text": "Dado material de parte 3D, quando edita, então conserva geometria, seleção e ordem de camadas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF63.CA07",
        "text": "Dada alternância wireframe/preenchido, quando ocorre, então mantém estruturas selecionáveis e permite recuperar o estado anterior pelo histórico.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF63.CA08",
        "text": "Dada seleção e atributo ativo (preenchimento ou traço), quando usa Shift+X, D ou /, então troca os atributos suportados, restaura branco/preto de 1 unidade ou aplica nenhum ao atributo escolhido; não intercepta texto em campos e rejeita conversões não suportadas sem perda da aparência.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF64",
    "n": 64,
    "title": "Gerar assets, wireframes e detalhes internos parametrizados",
    "hu": null,
    "summary": "O RF64 cobre o catálogo de assets parametrizados do Drawings: buscar objetos, pessoas, personagens e geometrias com nome, categoria, dimensões e prévia; gerar estruturas específicas (sofá, mesa, pessoa) com partes semanticamente nomeadas, nunca uma caixa genérica; entrar no wireframe de um objeto reservado para editar partes internas e acrescentar só detalhes compatíveis; transformar partes preservando relações explícitas; aplicar wireframe a uma área inteira respeitando subáreas autorizadas; e reabrir assets importados ou exportados sem perder estrutura.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF64.CA01 … RF64.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF64.md (CAs copiados como estão escritos); classes reais: SuggestedElement/RenderMode/SubjectKind/toWireframe/completeWireframe (lib/pieces/wireframe.ts), authorizePatch/PatchOrigin (lib/pieces/patch.ts), RegionLock/canEditRegions (lib/pieces/collab.ts), DrawingEditTarget.objectPath (lib/drawings/selection.ts), DrawingNode.parentId/editableNodeIds (lib/studio/selection.ts), AiProposal/proposalValidity (lib/ai/autonomy.ts), AiGateway (ws-application, sem motor registrado); o restante (planejado)",
    "cas": [
      {
        "id": "RF64.CA01",
        "text": "Dado catálogo, quando busca por objeto, pessoa, personagem ou geometria, então oferece nomes, categorias, dimensões e prévia de modelos disponíveis.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF64.CA02",
        "text": "Dado sofá, mesa ou pessoa, quando gera, então cria estrutura específica com partes semanticamente nomeadas, sem substituí-la por caixa genérica.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF64.CA03",
        "text": "Dado objeto reservado, quando entra no wireframe, então seleciona partes internas e oferece somente detalhes compatíveis, como olhos, lábios, puxadores e gavetas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF64.CA04",
        "text": "Dada parte, quando move, rotaciona, substitui ou redimensiona, então preserva relações explícitas com componentes dependentes.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF64.CA05",
        "text": "Dado wireframe de área inteira, quando aplica, então abrange objetos das subáreas autorizadas e exclui camadas/regiões alheias.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF64.CA06",
        "text": "Dada sugestão de substituição por IA, quando aprovada, então valida limites, revisão, hierarquia e escopo antes de aplicar.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF64.CA07",
        "text": "Dado asset importado/exportado, quando reabre, então mantém estrutura, materiais, nomes, dimensões e câmera em formato nativo suportado.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF65",
    "n": 65,
    "title": "Editar regiões hierárquicas e camadas sobrepostas no Drawings",
    "hu": null,
    "summary": "O RF65 organiza o contexto espacial de uma peça do Drawings em quatro eixos independentes — camada, região, objeto e detalhe (DRAWINGS_CAMADAS_COLABORACAO_DECIA.md): subdividir regiões em grades M×N com caminho hierárquico estável, reservar regiões menores ou maiores respeitando reservas alheias, isolar camadas profundas ou superficiais sem perder as demais, ocultar divisórias e rótulos sem liberar reservas e recalcular métricas globais com fórmula declarada. Seleção nunca é autorização: o servidor decide pela geometria transformada inteira, não pelo centro.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF65.CA01 … RF65.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF65.md (CAs copiados como estão escritos); classes reais: PieceLayer/LayerStack/switchActiveLayer/setLayerLocked/canEditInActiveLayer (lib/pieces/layers.ts), RegionLock/acquireLock/canEditRegions (lib/pieces/collab.ts), authorizePatch/PatchDenial (lib/pieces/patch.ts), DrawingEditScope/DrawingEditTarget (lib/drawings/selection.ts), geometryBounds/editableNodeIds (lib/studio/selection.ts), ClassifiedField.rubricVersion (lib/pieces/classification.ts); o restante (planejado)",
    "cas": [
      {
        "id": "RF65.CA01",
        "text": "Dada grade M×N, quando subdivide região, então cria caminho hierárquico estável e permite focar qualquer nível.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF65.CA02",
        "text": "Dada reserva de região menor, quando edita, então limita objetos e geometria à região e camada permitidas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF65.CA03",
        "text": "Dada reserva de região maior, quando transforma, então considera as subáreas incluídas, sem ignorar reservas conflitantes.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF65.CA04",
        "text": "Dadas camadas profundas/superficiais, quando isola uma, então preserva objetos das demais e mantém composição e ordem na reabertura.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF65.CA05",
        "text": "Dadas divisórias, rótulos e badges, quando oculta, então limpa a visualização sem liberar reservas ou alterar a geometria.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF65.CA06",
        "text": "Dada alteração local, quando atualiza métricas globais, então usa fórmula/rubrica declarada, distingue heurística de qualidade profissional e explica a contribuição de cada métrica.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF65.CA07",
        "text": "Dado movimento/rotação, quando o limite físico ultrapassa reserva, então servidor rejeita considerando a geometria transformada, não apenas o centro.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF66",
    "n": 66,
    "title": "Editar desenhos simultaneamente no DECIA com reservas transacionais",
    "hu": null,
    "summary": "O RF66 leva a edição de uma mesma peça do Drawings para várias pessoas ao mesmo tempo, dentro de uma sessão DECIA, com reservas transacionais por camada e região: patches em escopos disjuntos convivem e mantêm a ordem visual; reservas sobrepostas, ancestrais ou descendentes são recusadas sem revelar conteúdo; renovação, liberação e expiração usam relógio do servidor e token de fencing; patch antigo nunca sobrescreve revisão nova; revogação de acesso, SIGILOSO e papel de observador são revalidados no servidor em cada gravação. A IA participa só como proponente, sob as mesmas reservas.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF66.CA01 … RF66.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF66.md (CAs copiados como estão escritos); classes reais: RegionLock/acquireLock/releaseLocks/canEditRegions/LOCK_TTL_MS (lib/pieces/collab.ts), authorizePatch/PatchOrigin/PatchDenial (lib/pieces/patch.ts), LayerStack (lib/pieces/layers.ts), PiecesService em memória (lib/pieces/service.ts), SessionRole/AiProposal/proposalValidity (lib/ai/autonomy.ts), ResourceAuthorizer (ws-application) e AccessPolicy (ws-domain, D-139), DecisionWorkspace/AiSuggestion (components/decia/*), AiGateway (sem motor registrado); o restante (planejado)",
    "cas": [
      {
        "id": "RF66.CA01",
        "text": "Dados usuários autorizados em áreas/camadas disjuntas, quando enviam patches simultâneos, então preserva ambos e mantém ordem visual.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF66.CA02",
        "text": "Dados escopos sobrepostos ou ancestrais/descendentes na mesma camada, quando o segundo tenta reservar, então rejeita com mensagem sem revelar conteúdo não autorizado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF66.CA03",
        "text": "Dada reserva, quando renova/libera/expira, então usa relógio do servidor e token de fencing; cliente antigo não escreve depois da expiração.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF66.CA04",
        "text": "Dada revisão de objeto alterada, quando chega patch antigo, então rejeita sem sobrescrever e preserva rascunho para reconciliação.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF66.CA05",
        "text": "Dada revogação de acesso durante edição, quando tenta gravar, então autorização é revalidada transacionalmente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF66.CA06",
        "text": "Dado desenho SIGILOSO, quando administrador sem concessão explícita tenta acessar, então nega; proprietário e colaboradores autorizados seguem a política definida.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF66.CA07",
        "text": "Dada sessão DECIA, quando entra observador/não participante, então só recebe operações compatíveis com papel e acesso à tarefa; URLs diretas não contornam a regra.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF66.CA08",
        "text": "Dada colaboração 3D, quando é oferecida, então implementa as mesmas garantias no servidor; demonstração 3D local não satisfaz esse aceite.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF67",
    "n": 67,
    "title": "Completar geometria e prever traçados no Drawings",
    "hu": null,
    "summary": "O RF67 define o comando de completar (AI_COMPLETE/AICOMP) e a previsão de traçados no Drawings: o escopo (objeto, wireframe, região menor ou maior) fixa revisão e elementos preservados; arcos e traços lineares recebem pontos fantasma com hipótese e confiança heurística; fachadas simétricas e curvas Bézier são validadas por continuidade, tangência e simetria com tolerância informada; leiautes de mobiliário e roteamentos MEP só usam dimensões, restrições, obstáculos e regras explícitas, com fontes e validação profissional. Nada é aplicado além do nível de autonomia autorizado.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF67.CA01 … RF67.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF67.md (CAs copiados como estão escritos); classes reais: AutonomyMode/MODE_CAPABILITIES/AiProposal/proposalValidity/evaluateAiAction (lib/ai/autonomy.ts), authorizePatch/aiScopeIsBounded (lib/pieces/patch.ts), DrawingEditScope (lib/drawings/selection.ts), Geometry/snapPoint/editableNodeIds (lib/studio/selection.ts), ContributionEvent/ContributionOrigin (lib/pieces/authorship.ts), AiGateway/AiBudget (ws-application, sem motor registrado); o restante (planejado)",
    "cas": [
      {
        "id": "RF67.CA01",
        "text": "Dado AI_COMPLETE/AICOMP, quando escolhe objeto, wireframe, região menor ou maior, então fixa escopo, revisão e elementos preservados.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF67.CA02",
        "text": "Dado arco parcial ou traço linear, quando prevê continuação, então mostra pontos fantasma com hipótese/confiança e só aplica conforme nível autorizado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF67.CA03",
        "text": "Dada fachada simétrica ou curva Bézier, quando completa, então valida continuidade, tangência e simetria dentro de tolerância informada.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF67.CA04",
        "text": "Dado arranjo de mobiliário, quando sugere layout, então recebe dimensões e restrições explícitas e verifica colisões e circulação; não inventa medidas ou normas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF67.CA05",
        "text": "Dado roteamento MEP, quando sugere percurso, então usa obstáculos, conexões e regras da disciplina, identifica fontes e exige validação profissional aplicável.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF67.CA06",
        "text": "Dado usuário que rejeita a predição, quando continua desenhando, então não altera o traço nem repete chamadas pagas sem controle.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF67.CA07",
        "text": "Dado custo/rede indisponível, quando usa hipótese algorítmica local, então identifica sua origem e não a rotula como inferência de LLM.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF68",
    "n": 68,
    "title": "Gerar, auditar, estilizar, otimizar e converter desenhos com IA",
    "hu": null,
    "summary": "O RF68 reúne os cinco comandos de IA do Drawings — gerar (AI_GENERATE/AIGEN), auditar (AI_AUDIT/AIAUD), estilizar (AI_STYLE/AISTY), otimizar (AI_OPTIMIZE/AIOPT) e converter raster ou croqui em vetor (AI_CONVERT/AICONV) — como pedidos rastreáveis que devolvem propostas estruturadas e revisáveis, validadas por ferramentas determinísticas antes de tocar a peça. Cada comando respeita o nível de autonomia do RF51, passa por authorizePatch com origem IA, registra custo, provedor, modelo e versão e nunca publica certificação, aprovação técnica ou autoria humana presumida.",
    "route": "Drawings (/drawings, /drawings/[pieceId]; peça aberta a partir de /tasks/[id] e da sessão DECIA /decia/[sessionId])",
    "coverage": "RF68.CA01 … RF68.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF68.md (CAs copiados como estão escritos); classes reais: AiGateway/AiEnginePort/AiBudget/AiInferenceLogPort/PersonalDataMasker (ws-application, sem motor registrado), AutonomyMode/evaluateAiAction/proposalValidity (lib/ai/autonomy.ts), authorizePatch/PatchOrigin (lib/pieces/patch.ts), computeAuthorship/ContributionEvent (lib/pieces/authorship.ts), buildProvenanceManifest (lib/pieces/provenance.ts), ClassifiedField (lib/pieces/classification.ts), DrawingAnnotation (lib/drawings/taxonomy.ts), AiSuggestion (components/decia); o restante (planejado)",
    "cas": [
      {
        "id": "RF68.CA01",
        "text": "Dado AI_GENERATE/AIGEN, quando envia intenção e restrições, então recebe proposta estruturada de geometrias compatíveis com o motor e uma prévia revisável.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF68.CA02",
        "text": "Dado AI_AUDIT/AIAUD, quando analisa, então aponta duplicatas, perfis abertos, colisões e achados técnicos com localização, regra, tolerância e grau de certeza.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF68.CA03",
        "text": "Dado AI_STYLE/AISTY, quando seleciona referência, então propõe materiais/traços/hachuras sem modificar topologia ou acesso silenciosamente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF68.CA04",
        "text": "Dado AI_OPTIMIZE/AIOPT, quando simplifica, então mede erro máximo, redução de tamanho e preserva cotas, conectividade, furos e partes protegidas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF68.CA05",
        "text": "Dado AI_CONVERT/AICONV, quando vetoriza raster/croqui, então mantém referência, escala declarada e incertezas; permite corrigir contornos antes de gravar.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF68.CA06",
        "text": "Dado nível 1 a 4, quando executa esses comandos, então respeita RF51 e não amplia autonomia por causa do nome do comando.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF68.CA07",
        "text": "Dado resultado não verificável, quando conclui, então informa pendências e não publica certificação ABNT, aprovação técnica ou autoria humana presumida.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF69",
    "n": 69,
    "title": "Salvar, exportar, recuperar e navegar no histórico das peças",
    "hu": null,
    "summary": "Protege o trabalho de Letters e Drawings contra falhas e alterações indesejadas. SALVAR grava uma PieceRevision imutável no servidor e a interface só mostra \"Salvo\" depois do ACK. SALVAR_COMO cria uma cópia com origem ou exporta um formato identificado. Checkpoints periódicos ficam em local declarado, com política de acesso e retenção. DESFAZER, REFAZER, RESTAURAR_APAGADO, CAMADAS_ANTERIOR, REVERTER_AO_SALVO e a recuperação de rascunho nunca apagam a trilha, nunca duplicam IDs e nunca concedem acesso. Toda transição registra autoria (ContributionEvent) e proveniência.",
    "route": "Letters (/letters, /letters/[pieceId]) e Drawings (/drawings, /drawings/[pieceId]); peça aberta a partir de /tasks/[id], /projects/[id] e da sessão DECIA /decia/[sessionId]",
    "coverage": "RF69.CA01 … RF69.CA08 — corpo do card = especificação de docs/produto/requisitos-studio/RF69.md (CAs copiados como estão escritos); classes reais: TaskItem.version e o 409 EDICAO_CONCORRENTE do TaskService/TaskController (padrão de concorrência a reutilizar), ResourceAuthorizer, AccessPolicy, MediaAccessPolicy, MediaObject, MediaUploadService (escrito, ainda não é bean — D-67), lib/pieces/service.ts (WorkPiece/PiecesService em memória), lib/pieces/authorship.ts, lib/pieces/provenance.ts, lib/pieces/patch.ts; o restante (planejado)",
    "cas": [
      {
        "id": "RF69.CA01",
        "text": "Dados QSAVE/Ctrl+S e SAVEAS/Save a Copy, quando executa, então salva versão persistida ou exporta formato identificado, sem simular escrita em servidor.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF69.CA02",
        "text": "Dado SAVETIME/autosalvamento, quando configurado, então registra checkpoints no intervalo, identifica onde estão armazenados e aplica política de acesso e retenção.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF69.CA03",
        "text": "Dado UNDO/REDO ou painel histórico, quando retorna a um estado, então preserva versões e reaplica autorizações/reservas atuais.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF69.CA04",
        "text": "Dado OOPS, quando restaura última exclusão, então não desfaz edições posteriores nem duplica IDs ou recria conteúdo fora de permissão.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF69.CA05",
        "text": "Dado LAYERP, quando restaura visibilidade/configuração anterior, então não altera geometria nem concede acesso.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF69.CA06",
        "text": "Dado Revert/F12, quando volta à última versão salva, então mostra o que será descartado e mantém ponto recuperável.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF69.CA07",
        "text": "Dado RECOVER/RECOVERALL/DRAWINGRECOVERY, quando arquivo/checkpoint falha, então valida integridade, oferece versões recuperáveis e não promete reparar DWG sem suporte real.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF69.CA08",
        "text": "Dada exportação para telas, quando otimiza, então mantém original editável e informa resolução, perfil e perdas.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF70",
    "n": 70,
    "title": "Importar, exportar e referenciar conteúdo técnico nas peças",
    "hu": null,
    "summary": "Permite usar formatos e referências externas nas peças com fidelidade e limites verificáveis. Cada formato tem parser ou conversor validado, limites e mensagem clara para o que não é suportado. O original importado nunca é sobrescrito pela conversão, e as perdas (achatado, aproximado, descartado) aparecem antes do aceite. Referências externas (Xref) guardam vínculo, versão e permissão, sem acesso arbitrário a arquivos ou URLs. Conteúdo ativo (scripts SVG, macros, links remotos) não é executado, e instruções dentro de documentos são dados, nunca comandos.",
    "route": "Letters (/letters, /letters/[pieceId]) e Drawings (/drawings, /drawings/[pieceId]); peça aberta a partir de /tasks/[id], /projects/[id] e da sessão DECIA /decia/[sessionId]",
    "coverage": "RF70.CA01 … RF70.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF70.md (CAs copiados como estão escritos); classes reais: MediaUploadService (escrito, ainda não é bean — D-67), MediaUploadInspector e MagicBytes (tipo real por assinatura, limites por categoria), MediaAccessPolicy, MediaObject, TaskAttachment, ResourceAuthorizer, AccessPolicy, lib/pieces/authorship.ts (origem IMPORT, categoria IMPORTED), lib/pieces/provenance.ts (c2pa.opened); o restante (planejado)",
    "cas": [
      {
        "id": "RF70.CA01",
        "text": "Dados formatos nativos ws-studio/ws-asset, quando exporta e reimporta, então preserva IDs, topologia, camadas, materiais, metadados e câmera suportados.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF70.CA02",
        "text": "Dados SVG, PNG/JPEG/WebP, PDF, DXF/DWG, GLB/IFC, quando o formato está habilitado, então existe parser/conversor validado, limites e mensagem clara para recursos não suportados.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF70.CA03",
        "text": "Dadas fontes WOFF2, paletas JSON e referências visuais, quando importa, então valida origem/formato, não executa conteúdo ativo e mantém associação ao projeto.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF70.CA04",
        "text": "Dado XOPEN/Xref, quando abre referência externa, então preserva vínculo, versão e permissão, sem acesso arbitrário a arquivos ou URLs.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF70.CA05",
        "text": "Dado arquivo malformado, excessivo ou com dependências ausentes, quando abre, então rejeita/solicita correção sem destruir o projeto existente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF70.CA06",
        "text": "Dada perda de fidelidade, quando converte, então informa o que será achatado, aproximado ou descartado antes do aceite.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF70.CA07",
        "text": "Dada exportação GLB, quando valida, então passa validador de formato e preserva unidades, normais e materiais compatíveis; isso não certifica fabricação ou projeto.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF71",
    "n": 71,
    "title": "Integrar peças Letters e Drawings à jornada de tarefas, projetos e DECIA",
    "hu": null,
    "summary": "Transforma produção e decisões em trabalho rastreável e compartilhável. Uma peça Letters ou Drawings nasce de uma tarefa ou projeto, ou é levada a eles, e pode chegar à sessão DECIA, sempre com o mesmo histórico. O vínculo persistente peça → tarefa → projeto → sessão (PieceLink) guarda origem, revisão e acesso em cada transição. Vincular nunca concede acesso: a classificação só restringe, e cada leitura reavalia a ACL do recurso de destino. Uma decisão DECIA vira tarefa proposta, que só é criada com confirmação humana. Publicar no perfil exige escolher a revisão e a audiência. Remix gera derivação com origem, licença, autores e mudanças.",
    "route": "Letters (/letters, /letters/[pieceId]) e Drawings (/drawings, /drawings/[pieceId]); peça aberta a partir de /tasks/[id], /projects/[id] e da sessão DECIA /decia/[sessionId]",
    "coverage": "RF71.CA01 … RF71.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF71.md (CAs copiados como estão escritos); classes reais: TaskItem, TaskBrief (V36 task_briefs), TaskService, TaskController, ResourceAuthorizer, AccessPolicy, ScopedResource, SourceKind.DECIA, lib/tasks/client.ts, components/tasks/TaskForm.tsx, components/decia/*, lib/pieces/service.ts, lib/pieces/authorship.ts, lib/pieces/provenance.ts, lib/ai/autonomy.ts; o restante (planejado)",
    "cas": [
      {
        "id": "RF71.CA01",
        "text": "Dada tarefa/projeto, quando cria peça Letters/Drawings, então mantém vínculo, proprietário, visibilidade e revisão persistida.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF71.CA02",
        "text": "Dada decisão DECIA, quando gera trabalho, então cria tarefa com objetivo, responsável proposto, critério de aceite e referência à evidência revisada.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF71.CA03",
        "text": "Dado perfil profissional, quando publica peça, então exige escolha explícita da revisão e audiência; salvar, seguir, curtir ou compartilhar não concede acesso.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF71.CA04",
        "text": "Dado remix, quando autorizado, então cria derivação com origem, licença, autores e mudanças; não infere porcentagens de autoria como prova.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF71.CA05",
        "text": "Dado comentário, curtida ou compartilhamento, quando a visibilidade muda, então revalida acesso aos derivados e evita vazamento por prévias e contagens.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF71.CA06",
        "text": "Dado chefe/departamento, quando acompanha entregas, então vê apenas dados autorizados e distingue rascunho, revisado, aprovado e publicado.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF71.CA07",
        "text": "Dado usuário de qualquer área profissional, quando percorre o fluxo, então recebe exemplos e instruções claros sem exigir terminologia técnica não explicada.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF72",
    "n": 72,
    "title": "Validar qualidade, desempenho e evidências dos editores",
    "hu": null,
    "summary": "Define a prova de conclusão de todo RF dos editores: cada CA aponta para um teste automatizado ou uma validação manual reproduzível, com versão/commit e evidência guardada. Uma funcionalidade só é \"concluída\" quando todos os CAs do RF têm essa tripla CA → teste → evidência. Notas de qualidade usam rubrica explícita; nota acima de 8 exige medição. Demonstrações do Drawings usam capturas reais do editor. Colaboração se prova com duas sessões autenticadas. IA se avalia com corpus versionado, sem confundir mock com integração real. Acessibilidade e desempenho têm orçamento declarado por tamanho de documento ou cena. O relatório de funcionalidades distingue implementado local, publicado, validado, parcial e pendente; script de inventário não prova implementação.",
    "route": "Letters (/letters, /letters/[pieceId]) e Drawings (/drawings, /drawings/[pieceId]); peça aberta a partir de /tasks/[id], /projects/[id] e da sessão DECIA /decia/[sessionId]",
    "coverage": "RF72.CA01 … RF72.CA07 — corpo do card = especificação de docs/produto/requisitos-studio/RF72.md (CAs copiados como estão escritos); classes reais: .github/workflows/ci.yml (mvn verify, vitest, lint, typecheck, build, contrato OpenAPI, Trivy), docs/diagramas/_tools/checar.py, scripts/rf/gerar-catalogo.mjs (parseReadme) e lib/rf/catalog.test.ts, docs/auditoria/2026-10-17/scripts/gerar-matriz.py (rubrica explícita) e jornada.mjs (Playwright, duas contas, evidencias/JORNADA.json), AiGatewayTest, lib/ai/autonomy.test.ts, lib/pieces/*.test.ts, lib/studio/selection.test.ts, components/tasks/tasks.test.tsx; o restante (planejado)",
    "cas": [
      {
        "id": "RF72.CA01",
        "text": "Dada entrega de RF, quando é marcada como concluída, então cada CA tem evidência, versão/commit e teste ou validação manual reproduzível.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF72.CA02",
        "text": "Dadas notas de qualidade, quando publica auditoria, então usa rubrica explícita; nota superior a 8 exige medição e não apenas novo rótulo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF72.CA03",
        "text": "Dados cenários complexos, quando demonstra Drawings, então mostra etapas de criação, wireframe, refino, câmera e resultado final com capturas reais do editor.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF72.CA04",
        "text": "Dada colaboração, quando valida, então usa duas sessões autenticadas e testa concorrência, expiração, revogação e escopos sobrepostos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF72.CA05",
        "text": "Dados modelos de IA, quando avalia, então usa corpus/benchmark versionado, orçamento de testes e métricas por nível, sem confundir mocks com integração real.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF72.CA06",
        "text": "Dados acessibilidade e desempenho, quando valida, então registra teclado/leitor de tela e orçamento de latência/memória em tamanhos de documento/cena definidos.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF72.CA07",
        "text": "Dado catálogo de funcionalidades desejadas, quando gera relatório, então distingue implementado local, publicado, validado, parcial e pendente; script de inventário não conta como prova de implementação.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF73",
    "n": 73,
    "title": "Separar editor determinístico e Assistente IA com navegação acessível",
    "hu": null,
    "summary": "Separa a edição determinística das propostas de IA sem trocar de documento. O editor e a seleção continuam visíveis enquanto o Assistente IA ocupa uma região complementar lateral, retrátil e nomeada. Abrir o assistente não inicia inferência. Comandos manuais de seleção, geometria, aparência e histórico aplicam direto no documento e nunca chamam o provedor. Cada proposta mostra original, prévia, feedback, aprovar, rejeitar e refinar, com estado assíncrono explícito (idle, loading, suggesting, diff, error). O foco é previsível, carregamento e erro são anunciados por aria-live, um arraste vira uma única ação reversível e a mudança de revisão invalida propostas antigas.",
    "route": "Letters (/letters, /letters/[pieceId]) e Drawings (/drawings, /drawings/[pieceId]); peça aberta a partir de /tasks/[id], /projects/[id] e da sessão DECIA /decia/[sessionId]",
    "coverage": "RF73.CA01 … RF73.CA10 — corpo do card = especificação de docs/produto/requisitos-studio/RF73.md (CAs copiados como estão escritos); classes reais: lib/ai/autonomy.ts (AiProposal, proposalValidity, evaluateAiAction, MODE_CAPABILITIES), lib/pieces/patch.ts (authorizePatch único para MANUAL e IA), lib/pieces/layers.ts, lib/studio/selection.ts, components/decia/AiSuggestion.tsx e decia.test.tsx, AiGateway; o restante (planejado)",
    "cas": [
      {
        "id": "RF73.CA01",
        "text": "Dado um documento aberto, quando abre o Assistente IA, então mantém editor e seleção visíveis, com região complementar retrátil identificada e sem iniciar inferência.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA02",
        "text": "Dados os comandos manuais, quando executa seleção, geometria, aparência ou histórico, então aplica deterministicamente no documento e não aciona o provedor de IA.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA03",
        "text": "Dada proposta de IA, quando apresenta, então distingue original, prévia, feedback, aprovar, rejeitar e refinar; estado assíncrono explicita idle/loading/suggesting/diff/error.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA04",
        "text": "Dado uso por teclado, quando abre/fecha o drawer ou conclui proposta, então gerencia foco de forma previsível e preserva navegação Tab sem armadilha.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA05",
        "text": "Dada sugestão aceita ou rejeitada, quando a operação termina, então devolve foco ao texto, objeto ou prancheta correspondente; falhas permanecem anunciadas no assistente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA06",
        "text": "Dados carregamento e erro, quando surgem, então os anuncia respectivamente por aria-live polite e assertive; controles possuem nomes acessíveis.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA07",
        "text": "Dada troca de painel ou fechamento do assistente, quando reabre, então mantém rascunho, seleção, histórico e proposta ainda válida; alterações de revisão invalidam propostas antigas.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA08",
        "text": "Dado um arraste contínuo, quando solta ou cancela, então registra uma única ação reversível ou descarta o rascunho temporário; comandos devem usar histórico unitário.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA09",
        "text": "Dados componentes, quando altera matemática geométrica, transporte de IA ou acessibilidade, então testes isolados cobrem o módulo e os fluxos integrados cobrem foco, concorrência e rejeição de resposta obsoleta.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF73.CA10",
        "text": "Dados comandos e cards, quando testa a UI, então usa identificadores editor-cmd-{comando}, ai-suggestion-card-{id}, ai-btn-apply/reject e seletores por papel/nome; critérios WCAG são verificados no escopo declarado sem alegar certificação global.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  },
  {
    "id": "RF74",
    "n": 74,
    "title": "Capturar PNG e oferecer prévia fantasma multimodal no Drawings",
    "hu": null,
    "summary": "Com o modo ativado explicitamente, uma pausa de 1,5 s na edição captura um PNG transparente só da área autorizada, junto com revisão, dimensão, transformação e bounding box, sem overlays nem interface. Capturar não é enviar. A inferência remota só acontece depois que o backend revalida autenticação, ACL, classificação, consentimento, escopo, tamanho, limites e orçamento. Um provedor com suporte efetivo a imagem de entrada e PNG transparente de saída devolve duas variantes (\"completar objeto\" e \"completar cena\"). As variantes são verificadas em formato, alpha, dimensões e coordenadas, e aparecem sobre a prancheta a cerca de 50% de opacidade, com borda e máscara, sem interceptar o desenho. O aceite converte por vetorizador validado ou insere asset raster ancorado. Nunca promete vetor editável que não existe.",
    "route": "Drawings (/drawings, /drawings/[pieceId]); peça aberta a partir de /tasks/[id], /projects/[id] e da sessão DECIA /decia/[sessionId]",
    "coverage": "RF74.CA01 … RF74.CA12 — corpo do card = especificação de docs/produto/requisitos-studio/RF74.md (CAs copiados como estão escritos); classes reais: AiGateway (503 IA_INDISPONIVEL, 422 IA_CONTEUDO_RESTRITO), AiBudget (429 IA_ORCAMENTO_ESGOTADO), AiInferenceLogPort, MediaUploadService e MagicBytes (PNG pelo conteúdo, teto de 40 MP; ainda não é bean — D-67), MediaAccessPolicy, MediaObject, ResourceAuthorizer, AccessPolicy, lib/ai/autonomy.ts, lib/pieces/patch.ts (authorizePatch, aiScopeIsBounded), lib/pieces/provenance.ts (IPTC_DIGITAL_SOURCE), lib/pieces/authorship.ts; o restante (planejado)",
    "cas": [
      {
        "id": "RF74.CA01",
        "text": "Dado modo explicitamente ativado, quando há pausa de 1,5 segundo na edição, então captura PNG transparente da área autorizada e metadados de revisão, dimensão, transformação e bounding box, sem capturar overlays ou interfaces.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA02",
        "text": "Dada imagem pronta, quando solicita inferência remota, então backend revalida autenticação, ACL, classificação, consentimento, escopo, tamanho, limites e orçamento; captura local não equivale a autorização de envio.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA03",
        "text": "Dado provedor com suporte efetivo a entrada de imagem e saída PNG transparente, quando executa, então envia imagem e contexto autorizados e retorna variantes para completar objeto e completar cena; capacidades não suportadas produzem erro explícito.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA04",
        "text": "Dada resposta, quando valida, então verifica formato, alpha, dimensões, limites e coordenadas; não confia em coordenadas do modelo sem validação e não executa conteúdo ativo ou URLs arbitrárias.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA05",
        "text": "Dada proposta válida, quando exibe, então coloca PNG sobre a prancheta com opacidade configurável próxima a 50%, borda e máscara da área; imagem não intercepta ações de desenho.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA06",
        "text": "Dadas variantes, quando navega ou refina, então preserva original e contexto, mostra origem/provedor e distingue rasterização local de vetores de PNG efetivamente gerado por modelo multimodal.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA07",
        "text": "Dado aceite, quando aprova, então converte em vetor por pipeline validado ou insere asset raster suportado com ancoragem explícita; sem suporte não promete vetor editável nem insere imagem como vetor fictício.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA08",
        "text": "Dado Enter, Escape e Tab, quando usa ações, então Enter aceita no alvo correto, Escape rejeita e Tab mantém navegação por padrão; aceitar via Tab exige ativação e foco na prancheta.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA09",
        "text": "Dada revisão, região, camada ou acesso alterado enquanto processa, quando a resposta chega, então descarta ou invalida a prévia, cancela trabalho pendente quando suportado e impede sobrescrita de conteúdo novo.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA10",
        "text": "Dados níveis 1–4, quando utiliza a prévia, então respeita RF51: leitura/sugestão/transformação local/plano agêntico autorizados, checkpoints e limites; publicar ou ampliar escopo não ocorre automaticamente.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA11",
        "text": "Dados indisponibilidade, custo limite, timeout ou falha de vetorização, quando ocorrer, então mantém rascunho, anuncia estado e não inicia ciclos pagos ilimitados; registra uso sem vazar PNG ou segredos em logs.",
        "note": "",
        "kind": "enunciado"
      },
      {
        "id": "RF74.CA12",
        "text": "Dada auditoria, quando valida integração, então separa mock, captura local, PNG gerado por modelo e integração real; testa alpha, alinhamento, revisão obsoleta, aceitação/rejeição, acessibilidade e orçamento com evidências reproduzíveis.",
        "note": "",
        "kind": "enunciado"
      }
    ]
  }
];
