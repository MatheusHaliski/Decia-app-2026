package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.audit.AuditActions;
import br.gov.pr.secid.workstation.application.audit.AuditEvent;
import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.application.media.DetectedType;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.InspectedUpload;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector.UploadCandidate;
import br.gov.pr.secid.workstation.application.media.MediaUploadService;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.common.AccessClassification;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.plataforma.MediaObject;
import br.gov.pr.secid.workstation.domain.security.Viewer;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.EnumSet;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Foto de perfil (RF3.CA05; auditoria Onda 1). Recebe PNG, JPEG ou WEBP até 5 MB; o {@link MediaUploadInspector} confere o tipo real
 * pelos magic bytes e o teto de pixels; {@link AvatarImage} reprocessa para JPEG quadrado de até 512 px sem EXIF/GPS; o pipeline de
 * mídia (antivírus, dedupe por dono, chave segura) grava como PUBLIC. {@code avatarUrl} passa a ser só o caminho interno
 * {@code /api/people/{id}/avatar?v={mídia}} — URL externa não é mais aceita (rastreamento, conteúdo de terceiros). A foto anterior é
 * apagada ao trocar ou remover, e na anonimização. Ler a foto de alguém segue a mesma regra do perfil público: conta ATIVA, senão 404.
 */
@Service
public class AvatarService {
    static final long MAX_BYTES = 5L * 1024 * 1024;
    static final int SIDE = 512;
    /** Teto mais baixo que o geral: decodificar a foto ocupa memória proporcional aos pixels. */
    static final long MAX_PIXELS = 24_000_000L;
    static final Set<DetectedType> ACCEPTED = EnumSet.of(DetectedType.PNG, DetectedType.JPEG, DetectedType.WEBP);
    private static final Pattern URL = Pattern.compile("^/api/people/([0-9a-f-]{36})/avatar\\?v=([0-9a-f-]{36})$");

    private final UserRepositoryPort users;
    private final ResourceAuthorizer authorizer;
    private final MediaUploadInspector inspector;
    private final MediaUploadService media;
    private final AuditLogPort audit;

    public AvatarService(UserRepositoryPort users, ResourceAuthorizer authorizer, MediaUploadInspector inspector, MediaUploadService media,
                         AuditLogPort audit) {
        this.users = users;
        this.authorizer = authorizer;
        this.inspector = inspector;
        this.media = media;
        this.audit = audit;
    }

    /** Bytes da foto de alguém, já autorizados. */
    public record AvatarBytes(String mimeType, byte[] content) {
    }

    @Transactional
    public UserView upload(CurrentUser actor, byte[] content, String declaredName, String declaredType, RequestContext ctx) {
        User u = authorizer.ownAccount(actor);
        Viewer viewer = authorizer.viewer(actor);
        if (content != null && content.length > MAX_BYTES) {
            throw new ApiException(MediaUploadInspector.GRANDE, 413, "Foto acima de 5 MB.", Map.of("maxBytes", MAX_BYTES));
        }
        InspectedUpload ok = inspector.inspect(new UploadCandidate(content, declaredName, declaredType, ACCEPTED));
        if (ok.width() != null && ok.height() != null && (long) ok.width() * ok.height() > MAX_PIXELS) {
            throw ApiException.unprocessable(MediaUploadInspector.IMAGEM_GRANDE, "Foto com resolução acima do permitido.",
                    Map.of("width", ok.width(), "height", ok.height(), "maxPixels", MAX_PIXELS));
        }
        byte[] jpeg = AvatarImage.reencode(content, SIDE);
        MediaObject stored = media.upload(viewer, new UploadCandidate(jpeg, "avatar.jpg", "image/jpeg", EnumSet.of(DetectedType.JPEG)),
                AccessClassification.PUBLICO, true).media();
        Optional<UUID> previous = mediaIdOf(u);
        u.setAvatarUrl(urlOf(u.getId(), stored.id()));
        users.save(u);
        previous.filter(p -> !p.equals(stored.id())).ifPresent(p -> deleteOwned(u.getId(), p));
        record(u, ctx, "upload");
        return UserView.of(u);
    }

    @Transactional
    public UserView remove(CurrentUser actor, RequestContext ctx) {
        User u = authorizer.ownAccount(actor);
        Optional<UUID> previous = mediaIdOf(u);
        u.setAvatarUrl(null);
        users.save(u);
        previous.ifPresent(p -> deleteOwned(u.getId(), p));
        record(u, ctx, "remove");
        return UserView.of(u);
    }

    /** Foto atual de uma conta ATIVA; sem foto, conta não ativa ou inexistente → o mesmo 404. */
    public AvatarBytes read(CurrentUser actor, UUID userId) {
        User target = userId == null ? null : users.findById(userId).orElse(null);
        Viewer viewer = authorizer.requireProfileVisible(actor, target);
        if (target == null) {
            // o autorizador já recusou com 404; a guarda deixa isso explícito para quem lê (e para a análise estática)
            throw ApiException.notFound("Foto");
        }
        UUID mediaId = mediaIdOf(target).orElseThrow(() -> ApiException.notFound("Foto"));
        MediaUploadService.ReadGrant grant = media.authorizeRead(viewer, mediaId, true);
        if (!grant.media().ownerId().equals(target.getId())) {
            throw ApiException.notFound("Foto");
        }
        return new AvatarBytes(grant.media().mimeType(), media.read(grant));
    }

    /** Apaga a foto de uma conta que está sendo anonimizada (LGPD: a imagem também é dado pessoal). */
    public void purge(User u) {
        mediaIdOf(u).ifPresent(p -> deleteOwned(u.getId(), p));
    }

    static String urlOf(UUID userId, UUID mediaId) {
        return "/api/people/" + userId + "/avatar?v=" + mediaId;
    }

    /** Id da mídia da foto, só quando o caminho é o interno DESTA conta (URL externa antiga ou de outra pessoa → vazio). */
    static Optional<UUID> mediaIdOf(User u) {
        if (u == null || u.getAvatarUrl() == null) {
            return Optional.empty();
        }
        Matcher m = URL.matcher(u.getAvatarUrl());
        if (!m.matches() || !m.group(1).equals(u.getId().toString())) {
            return Optional.empty();
        }
        try {
            return Optional.of(UUID.fromString(m.group(2)));
        } catch (IllegalArgumentException e) {
            return Optional.empty();
        }
    }

    private void deleteOwned(UUID ownerId, UUID mediaId) {
        media.find(mediaId).filter(m -> m.ownerId().equals(ownerId)).ifPresent(media::delete);
    }

    private void record(User u, RequestContext ctx, String what) {
        audit.record(AuditEvent.of(u.getId(), AuditActions.PROFILE_UPDATED, "user", u.getId().toString(), AuditEvent.OK,
                ctx == null ? null : ctx.ip(), ctx == null ? null : ctx.userAgent(), Map.of("avatar", what)));
    }
}
