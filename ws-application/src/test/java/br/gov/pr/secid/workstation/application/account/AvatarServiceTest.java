package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.audit.AuditLogPort;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserRepositoryPort;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector;
import br.gov.pr.secid.workstation.application.media.MemoryMedia;
import br.gov.pr.secid.workstation.application.security.AuthorizationTrail;
import br.gov.pr.secid.workstation.application.security.ResourceAuthorizer;
import br.gov.pr.secid.workstation.domain.identity.AccountStatus;
import br.gov.pr.secid.workstation.domain.identity.ProfileType;
import br.gov.pr.secid.workstation.domain.identity.Role;
import br.gov.pr.secid.workstation.domain.identity.User;
import br.gov.pr.secid.workstation.domain.plataforma.MediaAccessClass;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.catchThrowableOfType;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/** RF3.CA05 — foto de perfil: reprocessada sem EXIF, orientação aplicada, limites, troca apaga a anterior e leitura com a regra do perfil. */
class AvatarServiceTest {
    /** WEBP real 40×20 (metade esquerda vermelha, direita azul), gerado fora do teste. */
    static final String WEBP = "UklGRnwAAABXRUJQVlA4IHAAAADwBACdASooABQAPjEWiEKiISEYDVQAIAMEoAd7PwD8IOECGAfgBXf+4AAPyjZJEgAA/va+B//8wPKJ5Jf//0cbo43Rxv"
            + "6ON/3q3/vL/+e//54jGCge6/0uCcYANwn/S4MVzbdmt7rQ1rbRtZGgAAAA";
    static final RequestContext CTX = new RequestContext("127.0.0.1", "test");

    final Map<UUID, User> people = new HashMap<>();
    final UserRepositoryPort users = mock(UserRepositoryPort.class);
    final MemoryMedia media = new MemoryMedia();
    final AvatarService service;

    {
        when(users.findById(any())).thenAnswer(inv -> Optional.ofNullable(people.get(inv.<UUID>getArgument(0))));
        when(users.save(any())).thenAnswer(inv -> inv.getArgument(0));
        ResourceAuthorizer authorizer = new ResourceAuthorizer(users, Optional.empty());
        service = new AvatarService(users, authorizer, media.inspector, media.service(authorizer), mock(AuditLogPort.class));
    }

    @AfterEach
    void clean() {
        AuthorizationTrail.clear();
    }

    User person(AccountStatus status) {
        User u = new User();
        u.setId(UUID.randomUUID());
        u.setUsername("pessoa." + people.size());
        u.setFullName("Pessoa");
        u.setRole(Role.USER);
        u.setProfileType(ProfileType.EMPREGADO);
        u.setStatus(status);
        people.put(u.getId(), u);
        return u;
    }

    static CurrentUser cu(User u) {
        return new CurrentUser(u.getId(), u.getRole(), UUID.randomUUID());
    }

    /** Paisagem: esquerda vermelha, direita azul. */
    static BufferedImage halves(int w, int h, int type) {
        BufferedImage img = new BufferedImage(w, h, type);
        Graphics2D g = img.createGraphics();
        g.setColor(Color.RED);
        g.fillRect(0, 0, w / 2, h);
        g.setColor(Color.BLUE);
        g.fillRect(w / 2, 0, w - w / 2, h);
        g.dispose();
        return img;
    }

    static byte[] encode(BufferedImage img, String format) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        ImageIO.write(img, format, out);
        return out.toByteArray();
    }

    /** Insere depois do SOI um APP1 EXIF (Orientation = {@code orientation}) e um comentário com "GPS". */
    static byte[] withExif(byte[] jpeg, int orientation) {
        byte[] tiff = {'I', 'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0, (byte) orientation, 0, 0, 0, 0, 0, 0, 0};
        byte[] exif = concat("Exif\0\0".getBytes(StandardCharsets.ISO_8859_1), tiff);
        byte[] app1 = concat(new byte[] {(byte) 0xFF, (byte) 0xE1, (byte) ((exif.length + 2) >> 8), (byte) (exif.length + 2)}, exif);
        byte[] note = "GPS -25.4284 -49.2733 Celular-X".getBytes(StandardCharsets.ISO_8859_1);
        byte[] com = concat(new byte[] {(byte) 0xFF, (byte) 0xFE, (byte) ((note.length + 2) >> 8), (byte) (note.length + 2)}, note);
        byte[] rest = java.util.Arrays.copyOfRange(jpeg, 2, jpeg.length);
        return concat(new byte[] {(byte) 0xFF, (byte) 0xD8}, concat(app1, concat(com, rest)));
    }

    static byte[] concat(byte[] a, byte[] b) {
        byte[] r = java.util.Arrays.copyOf(a, a.length + b.length);
        System.arraycopy(b, 0, r, a.length, b.length);
        return r;
    }

    byte[] storedBytes(User u) {
        UUID id = AvatarService.mediaIdOf(u).orElseThrow();
        return media.blobs.get(media.rows.get(id).objectKey());
    }

    static BufferedImage decode(byte[] b) throws IOException {
        return ImageIO.read(new ByteArrayInputStream(b));
    }

    static boolean reddish(int rgb) {
        Color c = new Color(rgb);
        return c.getRed() > 180 && c.getBlue() < 90;
    }

    static boolean bluish(int rgb) {
        Color c = new Color(rgb);
        return c.getBlue() > 180 && c.getRed() < 90;
    }

    @Test
    void fotoDoCelularSaiEmPeQuadradaSemExifNemGps() throws IOException {
        User me = person(AccountStatus.ACTIVE);
        byte[] original = withExif(encode(halves(1200, 800, BufferedImage.TYPE_INT_RGB), "jpeg"), 6);
        assertThat(AvatarImage.exifOrientation(original)).isEqualTo(6);
        UserView v = service.upload(cu(me), original, "IMG_0001.JPG", "image/jpeg", CTX);
        assertThat(v.avatarUrl()).matches("/api/people/" + me.getId() + "/avatar\\?v=[0-9a-f-]{36}");
        byte[] out = storedBytes(me);
        String raw = new String(out, StandardCharsets.ISO_8859_1);
        assertThat(raw).doesNotContain("Exif").doesNotContain("GPS").doesNotContain("Celular-X");
        BufferedImage img = decode(out);
        assertThat(img.getWidth()).isEqualTo(512);
        assertThat(img.getHeight()).isEqualTo(512);
        // girada 90° no sentido horário: o lado esquerdo (vermelho) vai para cima
        assertThat(reddish(img.getRGB(256, 30))).as("topo vermelho").isTrue();
        assertThat(bluish(img.getRGB(256, 480))).as("base azul").isTrue();
        assertThat(media.rows.get(AvatarService.mediaIdOf(me).orElseThrow()).accessClass()).isEqualTo(MediaAccessClass.PUBLIC);
    }

    @Test
    void pngComTransparenciaFicaComFundoBrancoESemAumentar() throws IOException {
        User me = person(AccountStatus.ACTIVE);
        BufferedImage alpha = new BufferedImage(300, 300, BufferedImage.TYPE_INT_ARGB);
        service.upload(cu(me), encode(alpha, "png"), "transparente.png", "image/png", CTX);
        BufferedImage img = decode(storedBytes(me));
        assertThat(img.getWidth()).as("menor que 512 não é ampliada").isEqualTo(300);
        assertThat(new Color(img.getRGB(150, 150))).isEqualTo(Color.WHITE);
    }

    @Test
    void webpEntraEViraJpeg() throws IOException {
        User me = person(AccountStatus.ACTIVE);
        service.upload(cu(me), Base64.getDecoder().decode(WEBP), "foto.webp", "image/webp", CTX);
        byte[] out = storedBytes(me);
        assertThat(out[0] & 0xFF).isEqualTo(0xFF);
        assertThat(out[1] & 0xFF).isEqualTo(0xD8);
        assertThat(decode(out).getWidth()).isEqualTo(20);
    }

    @Test
    void recusaArquivoGrandeTipoForaDaListaEConteudoQueNaoEImagem() throws IOException {
        User me = person(AccountStatus.ACTIVE);
        byte[] big = new byte[(int) AvatarService.MAX_BYTES + 1];
        ApiException tooBig = catchThrowableOfType(ApiException.class, () -> service.upload(cu(me), big, "a.png", "image/png", CTX));
        assertThat(tooBig.status()).isEqualTo(413);
        assertThat(tooBig.code()).isEqualTo(MediaUploadInspector.GRANDE);
        byte[] gif = encode(halves(10, 10, BufferedImage.TYPE_INT_RGB), "gif");
        assertThat(catchThrowableOfType(ApiException.class, () -> service.upload(cu(me), gif, "a.gif", "image/gif", CTX)).code())
                .isEqualTo(MediaUploadInspector.TIPO_NAO_PERMITIDO);
        byte[] script = "<svg onload=alert(1)>".getBytes(StandardCharsets.UTF_8);
        assertThat(catchThrowableOfType(ApiException.class, () -> service.upload(cu(me), script, "a.png", "image/png", CTX)).status())
                .isEqualTo(415);
        assertThat(me.getAvatarUrl()).isNull();
        assertThat(media.rows).isEmpty();
    }

    @Test
    void trocarApagaAAnteriorRepetirAMesmaNaoApagaERemoverLimpa() throws IOException {
        User me = person(AccountStatus.ACTIVE);
        byte[] first = encode(halves(600, 600, BufferedImage.TYPE_INT_RGB), "png");
        service.upload(cu(me), first, "a.png", "image/png", CTX);
        UUID firstId = AvatarService.mediaIdOf(me).orElseThrow();
        service.upload(cu(me), first, "a.png", "image/png", CTX);
        assertThat(AvatarService.mediaIdOf(me)).as("mesma foto: dedupe, nada apagado").contains(firstId);
        assertThat(media.rows).hasSize(1);
        service.upload(cu(me), encode(halves(700, 500, BufferedImage.TYPE_INT_RGB), "png"), "b.png", "image/png", CTX);
        UUID secondId = AvatarService.mediaIdOf(me).orElseThrow();
        assertThat(secondId).isNotEqualTo(firstId);
        assertThat(media.rows).containsOnlyKeys(secondId);
        assertThat(media.blobs).hasSize(1);
        assertThat(service.remove(cu(me), CTX).avatarUrl()).isNull();
        assertThat(media.rows).isEmpty();
        assertThat(media.blobs).isEmpty();
    }

    @Test
    void lerSegueORegraDoPerfilEO404EhOMesmo() throws IOException {
        User me = person(AccountStatus.ACTIVE);
        User other = person(AccountStatus.ACTIVE);
        User gone = person(AccountStatus.ACTIVE);
        User external = person(AccountStatus.ACTIVE);
        service.upload(cu(other), encode(halves(64, 64, BufferedImage.TYPE_INT_RGB), "png"), "o.png", "image/png", CTX);
        service.upload(cu(gone), encode(halves(64, 64, BufferedImage.TYPE_INT_RGB), "png"), "g.png", "image/png", CTX);
        gone.setStatus(AccountStatus.DELETION_SCHEDULED);
        external.setAvatarUrl("https://cdn.exemplo.com/antiga.png");
        AvatarService.AvatarBytes img = service.read(cu(me), other.getId());
        assertThat(img.mimeType()).isEqualTo("image/jpeg");
        assertThat(decode(img.content()).getWidth()).isEqualTo(64);
        for (UUID id : new UUID[] {gone.getId(), me.getId(), external.getId(), UUID.randomUUID()}) {
            ApiException e = catchThrowableOfType(ApiException.class, () -> service.read(cu(me), id));
            assertThat(e.status()).isEqualTo(404);
        }
        assertThat(AuthorizationTrail.checked()).isTrue();
    }

    @Test
    void caminhoDeOutraPessoaNaoContaComoFotoEAnonimizarApaga() throws IOException {
        User me = person(AccountStatus.ACTIVE);
        User other = person(AccountStatus.ACTIVE);
        service.upload(cu(other), encode(halves(64, 64, BufferedImage.TYPE_INT_RGB), "png"), "o.png", "image/png", CTX);
        me.setAvatarUrl(other.getAvatarUrl());
        assertThat(AvatarService.mediaIdOf(me)).as("o caminho precisa ser desta conta").isEmpty();
        service.remove(cu(me), CTX);
        assertThat(media.rows).as("remover a minha não apaga a de outra pessoa").hasSize(1);
        service.purge(other);
        assertThat(media.rows).isEmpty();
        assertThat(media.blobs).isEmpty();
    }

    @Test
    void fotoDePerfilSoDaEmpresaResponde404DeForaIgualAContaInexistente() throws IOException {
        UUID secid = UUID.randomUUID();
        User ana = person(AccountStatus.ACTIVE);
        ana.setCompanyId(secid);
        User colega = person(AccountStatus.ACTIVE);
        colega.setCompanyId(secid);
        User fora = person(AccountStatus.ACTIVE);
        service.upload(cu(ana), encode(halves(64, 64, BufferedImage.TYPE_INT_RGB), "png"), "a.png", "image/png", CTX);
        ana.setProfileVisibility(br.gov.pr.secid.workstation.domain.identity.ProfileVisibility.EMPRESA);

        assertThat(service.read(cu(colega), ana.getId()).mimeType()).isEqualTo("image/jpeg");
        assertThat(service.read(cu(ana), ana.getId()).mimeType()).isEqualTo("image/jpeg");
        ApiException hidden = catchThrowableOfType(ApiException.class, () -> service.read(cu(fora), ana.getId()));
        ApiException ghost = catchThrowableOfType(ApiException.class, () -> service.read(cu(fora), UUID.randomUUID()));
        assertThat(hidden.status()).isEqualTo(404);
        assertThat(hidden.getMessage()).isEqualTo(ghost.getMessage());
        assertThat(hidden.code()).isEqualTo(ghost.code());
    }
}
