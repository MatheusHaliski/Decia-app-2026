package br.gov.pr.secid.workstation.web.account;

import br.gov.pr.secid.workstation.application.account.AvatarService;
import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.identity.CurrentUser;
import br.gov.pr.secid.workstation.application.identity.RequestContext;
import br.gov.pr.secid.workstation.application.identity.UserView;
import br.gov.pr.secid.workstation.web.security.AuthorizedBy;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Duration;
import java.util.Map;
import java.util.UUID;

/**
 * RF3.CA05 — foto de perfil. Envio e remoção só da própria conta; a leitura segue a regra do perfil público (conta ATIVA, senão o mesmo
 * 404). A resposta da imagem não é renderizável como página ({@code nosniff}, CSP {@code sandbox}) e pode ficar em cache privado: o
 * caminho muda a cada troca ({@code ?v=}).
 */
@RestController
@Tag(name = "RF3 Conta")
public class AvatarController {
    private final AvatarService avatars;

    public AvatarController(AvatarService avatars) {
        this.avatars = avatars;
    }

    @Operation(summary = "RF3.CA05 Envia a foto (multipart, campo file): PNG/JPEG/WEBP até 5 MB, reprocessada para JPEG 512 px sem EXIF "
            + "(413 ARQUIVO_GRANDE_DEMAIS, 415 TIPO_NAO_PERMITIDO, 422 IMAGEM_INVALIDA); a anterior é apagada")
    @PostMapping(path = "/api/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public UserView upload(CurrentUser user, @RequestParam("file") MultipartFile file, RequestContext ctx) {
        byte[] content;
        try {
            content = file.getBytes();
        } catch (IOException e) {
            throw ApiException.unprocessable("ARQUIVO_ILEGIVEL", "Não foi possível ler o arquivo enviado.", Map.of());
        }
        return avatars.upload(user, content, file.getOriginalFilename(), file.getContentType(), ctx);
    }

    @Operation(summary = "RF3.CA05 Remove a foto (o arquivo é apagado)")
    @DeleteMapping("/api/me/avatar")
    public UserView remove(CurrentUser user, RequestContext ctx) {
        return avatars.remove(user, ctx);
    }

    @Operation(summary = "RF3.CA05/RF16 Foto de uma conta ativa (404 NAO_ENCONTRADO sem foto ou conta não ativa)")
    @GetMapping(path = "/api/people/{id}/avatar", produces = MediaType.IMAGE_JPEG_VALUE)
    @AuthorizedBy("requireProfileVisible")
    public ResponseEntity<byte[]> read(CurrentUser user, @PathVariable UUID id) {
        AvatarService.AvatarBytes img = avatars.read(user, id);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(img.mimeType()))
                .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePrivate())
                .header("X-Content-Type-Options", "nosniff")
                .header("Content-Security-Policy", "default-src 'none'; sandbox")
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"avatar.jpg\"")
                .body(img.content());
    }
}
