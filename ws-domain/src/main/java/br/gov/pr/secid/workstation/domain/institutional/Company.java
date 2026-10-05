package br.gov.pr.secid.workstation.domain.institutional;

import br.gov.pr.secid.workstation.domain.catalog.Attr;
import br.gov.pr.secid.workstation.domain.catalog.DomainEntity;
import br.gov.pr.secid.workstation.domain.catalog.OnDelete;

import java.util.UUID;

/**
 * Empresa / órgão (= FAI BrandProfile) — TAXONOMIA §1.4. Nasce na aprovação do perfil EMPRESA (RF28, Q-65); lida em
 * RF19, RF24, RF25, RF35, RF39, RF42 (política de pontos), RF45 (política de Hype), RF37 (retenção de gravações).
 */
@DomainEntity(context = "1 Identidade & Acesso", table = "companies", rfs = {"RF28", "RF19", "RF24", "RF25", "RF35", "RF39", "RF42", "RF45"},
        migration = 10, versioned = true,
        doc = "Catálogo institucional: empresa/órgão dona de departamentos, políticas de pontos/Hype e retenção. RESTRICT em tudo que a referencia.",
        indexes = {"owner_user_id", "status"})
public record Company(
        @Attr("identificador") UUID id,
        @Attr(value = "usuário EMPRESA dono da conta institucional", ref = "users", onDelete = OnDelete.RESTRICT) UUID ownerUserId,
        @Attr(value = "razão social", len = 200) String legalName,
        @Attr(value = "slug único da página pública", len = 80, unique = true) String slug,
        @Attr(value = "CNPJ cifrado (AES-GCM)", opt = true, len = 512, encrypted = true) String cnpj,
        @Attr(value = "logotipo", opt = true, len = 500) String logoUrl,
        @Attr(value = "brasão", opt = true, len = 500) String coatOfArmsUrl,
        @Attr(value = "sobre a empresa", opt = true, sql = "TEXT") String about,
        @Attr(value = "site oficial (https://)", opt = true, len = 500) String websiteUrl,
        @Attr(value = "cor de destaque (token)", opt = true, len = 40) String accentColor,
        @Attr(value = "tetos, expiração (RF42.CA09) e limite de doação de DECIA Points", opt = true) String pointsPolicyJson,
        @Attr(value = "pesos, meia-vida e nomes das faixas de Hype (RF45.CA07)", opt = true) String hypePolicyJson,
        @Attr(value = "TTL das mensagens diretas (RF46)", opt = true) String messagingPolicyJson,
        @Attr(value = "pesos vigentes de ranking", opt = true, ref = "ranking_weights", onDelete = OnDelete.SET_NULL) UUID rankingWeightsId,
        @Attr(value = "política de retenção de gravações de reunião (RF37.CA05)", opt = true, len = 40) String recordingRetentionPolicy,
        @Attr(value = "situação", def = "'ATIVA'") CompanyStatus status) {
}
