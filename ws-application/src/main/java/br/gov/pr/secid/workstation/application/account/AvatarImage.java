package br.gov.pr.secid.workstation.application.account;

import br.gov.pr.secid.workstation.application.common.ApiException;
import br.gov.pr.secid.workstation.application.media.MediaUploadInspector;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageReader;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageInputStream;
import javax.imageio.stream.MemoryCacheImageInputStream;
import javax.imageio.stream.MemoryCacheImageOutputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.geom.AffineTransform;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.Iterator;
import java.util.Map;

/**
 * Reprocessa a foto de perfil (RF3.CA05): decodifica, aplica a orientação EXIF (senão a foto do celular sai deitada), recorta ao centro em
 * quadrado, reduz para no máximo {@code side} px e grava JPEG novo SEM metadados (sai EXIF, GPS, modelo do aparelho, comentários e
 * qualquer carga escondida nos segmentos). Transparência vira fundo branco. Só roda depois do {@link MediaUploadInspector}, que já
 * conferiu o tipo real e o teto de pixels.
 */
final class AvatarImage {
    static final float QUALITY = 0.88f;

    private AvatarImage() {
    }

    static byte[] reencode(byte[] content, int side) {
        BufferedImage src = decode(content);
        BufferedImage upright = orient(src, exifOrientation(content));
        int w = upright.getWidth();
        int h = upright.getHeight();
        int crop = Math.min(w, h);
        BufferedImage square = upright.getSubimage((w - crop) / 2, (h - crop) / 2, crop, crop);
        int out = Math.max(1, Math.min(crop, side));
        BufferedImage dst = new BufferedImage(out, out, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = dst.createGraphics();
        try {
            g.setColor(Color.WHITE);
            g.fillRect(0, 0, out, out);
            g.setRenderingHint(RenderingHints.KEY_INTERPOLATION, RenderingHints.VALUE_INTERPOLATION_BICUBIC);
            g.setRenderingHint(RenderingHints.KEY_RENDERING, RenderingHints.VALUE_RENDER_QUALITY);
            g.drawImage(square, 0, 0, out, out, null);
        } finally {
            g.dispose();
        }
        return jpeg(dst);
    }

    private static BufferedImage decode(byte[] content) {
        try (ImageInputStream in = new MemoryCacheImageInputStream(new ByteArrayInputStream(content))) {
            Iterator<ImageReader> readers = ImageIO.getImageReaders(in);
            if (!readers.hasNext()) {
                throw invalid();
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(in, true, true);
                BufferedImage img = reader.read(0);
                if (img == null || img.getWidth() < 1 || img.getHeight() < 1) {
                    throw invalid();
                }
                return img;
            } finally {
                reader.dispose();
            }
        } catch (IOException | RuntimeException e) {
            if (e instanceof ApiException api) {
                throw api;
            }
            throw invalid();
        }
    }

    private static ApiException invalid() {
        return ApiException.unprocessable(MediaUploadInspector.IMAGEM_INVALIDA, "Não foi possível ler a imagem.", Map.of());
    }

    private static byte[] jpeg(BufferedImage img) {
        Iterator<ImageWriter> writers = ImageIO.getImageWritersByFormatName("jpeg");
        if (!writers.hasNext()) {
            throw new IllegalStateException("JPEG writer ausente");
        }
        ImageWriter writer = writers.next();
        ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        try (MemoryCacheImageOutputStream out = new MemoryCacheImageOutputStream(bytes)) {
            writer.setOutput(out);
            ImageWriteParam p = writer.getDefaultWriteParam();
            p.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
            p.setCompressionQuality(QUALITY);
            writer.write(null, new IIOImage(img, null, null), p);
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        } finally {
            writer.dispose();
        }
        return bytes.toByteArray();
    }

    /** Aplica a orientação EXIF 1–8 (rotações e espelhamentos); 1 ou desconhecida = como está. */
    static BufferedImage orient(BufferedImage src, int orientation) {
        if (orientation < 2 || orientation > 8) {
            return src;
        }
        int w = src.getWidth();
        int h = src.getHeight();
        boolean swap = orientation >= 5;
        AffineTransform t = new AffineTransform();
        switch (orientation) {
            case 2 -> { t.translate(w, 0); t.scale(-1, 1); }
            case 3 -> { t.translate(w, h); t.rotate(Math.PI); }
            case 4 -> { t.translate(0, h); t.scale(1, -1); }
            case 5 -> { t.rotate(-Math.PI / 2); t.scale(-1, 1); }
            case 6 -> { t.translate(h, 0); t.rotate(Math.PI / 2); }
            case 7 -> { t.scale(-1, 1); t.translate(-h, 0); t.translate(0, w); t.rotate(3 * Math.PI / 2); }
            case 8 -> { t.translate(0, w); t.rotate(3 * Math.PI / 2); }
            default -> { }
        }
        BufferedImage dst = new BufferedImage(swap ? h : w, swap ? w : h, BufferedImage.TYPE_INT_ARGB);
        Graphics2D g = dst.createGraphics();
        try {
            g.drawImage(src, t, null);
        } finally {
            g.dispose();
        }
        return dst;
    }

    /** Lê a tag 0x0112 (Orientation) do IFD0 do EXIF de um JPEG; 1 quando não há (PNG, WEBP, JPEG sem EXIF ou EXIF ilegível). */
    static int exifOrientation(byte[] b) {
        try {
            if (b.length < 4 || (b[0] & 0xFF) != 0xFF || (b[1] & 0xFF) != 0xD8) {
                return 1;
            }
            int i = 2;
            while (i + 4 <= b.length && (b[i] & 0xFF) == 0xFF) {
                int marker = b[i + 1] & 0xFF;
                int len = ((b[i + 2] & 0xFF) << 8) | (b[i + 3] & 0xFF);
                if (marker == 0xDA || len < 2) {
                    return 1;
                }
                if (marker == 0xE1 && len >= 16 && i + 4 + len - 2 <= b.length && startsWith(b, i + 4, "Exif\0\0")) {
                    return orientationInTiff(b, i + 10, i + 2 + len);
                }
                i += 2 + len;
            }
        } catch (RuntimeException e) {
            return 1;
        }
        return 1;
    }

    private static int orientationInTiff(byte[] b, int tiff, int end) {
        boolean little = b[tiff] == 'I' && b[tiff + 1] == 'I';
        if (!little && !(b[tiff] == 'M' && b[tiff + 1] == 'M')) {
            return 1;
        }
        int ifd = tiff + (int) u32(b, tiff + 4, little);
        if (ifd + 2 > end) {
            return 1;
        }
        int entries = u16(b, ifd, little);
        for (int k = 0; k < entries; k++) {
            int e = ifd + 2 + k * 12;
            if (e + 12 > end) {
                return 1;
            }
            if (u16(b, e, little) == 0x0112) {
                int v = u16(b, e + 8, little);
                return v >= 1 && v <= 8 ? v : 1;
            }
        }
        return 1;
    }

    private static boolean startsWith(byte[] b, int at, String s) {
        for (int k = 0; k < s.length(); k++) {
            if (b[at + k] != (byte) s.charAt(k)) {
                return false;
            }
        }
        return true;
    }

    private static int u16(byte[] b, int at, boolean little) {
        int a = b[at] & 0xFF;
        int c = b[at + 1] & 0xFF;
        return little ? (c << 8) | a : (a << 8) | c;
    }

    private static long u32(byte[] b, int at, boolean little) {
        long a = b[at] & 0xFF;
        long c = b[at + 1] & 0xFF;
        long d = b[at + 2] & 0xFF;
        long e = b[at + 3] & 0xFF;
        return little ? (e << 24) | (d << 16) | (c << 8) | a : (a << 24) | (c << 16) | (d << 8) | e;
    }
}
