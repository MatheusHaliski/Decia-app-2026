package br.gov.pr.secid.workstation.application.media;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Set;

/**
 * Remove os metadados embutidos de uma imagem SEM reprocessar os pixels (RF41.CA06, LGPD): a foto de um celular traz no EXIF a posição
 * GPS, o aparelho e a hora — e a geolocalização da evidência só pode existir se a pessoa a enviar de propósito (cifrada, à parte).
 * <ul>
 *   <li>JPEG: tira os segmentos APP1 (EXIF, XMP), APP13 (IPTC/Photoshop), COM e APP2 de multi-imagem (MPF), e descarta o que vier depois
 *       do EOI (imagens secundárias do MPF levam EXIF próprio). O perfil de cor (APP2 ICC) e os demais segmentos ficam.</li>
 *   <li>PNG: tira os chunks {@code eXIf}, {@code tEXt}, {@code zTXt} e {@code iTXt}; nada depois do IEND.</li>
 *   <li>WEBP: tira os chunks {@code EXIF} e {@code XMP }, limpa as marcas no VP8X e recalcula o tamanho do RIFF.</li>
 * </ul>
 * Outros tipos (GIF, documentos) voltam como chegaram. Estrutura que não se reconhece até o fim também volta intacta — quem chama já
 * validou o tipo real ({@link MediaUploadInspector}); aqui não se decide se o arquivo é aceito.
 */
public final class ImageMetadata {
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};
    private static final Set<String> PNG_DROP = Set.of("eXIf", "tEXt", "zTXt", "iTXt");
    private static final Set<String> WEBP_DROP = Set.of("EXIF", "XMP ");

    private ImageMetadata() {
    }

    public static byte[] strip(DetectedType type, byte[] content) {
        if (type == null || content == null) {
            return content;
        }
        byte[] out = switch (type) {
            case JPEG -> jpeg(content);
            case PNG -> png(content);
            case WEBP -> webp(content);
            default -> null;
        };
        return out == null ? content : out;
    }

    // ------------------------------------------------------------------------------------------------ JPEG

    private static byte[] jpeg(byte[] b) {
        if (b.length < 4 || (b[0] & 0xFF) != 0xFF || (b[1] & 0xFF) != 0xD8) {
            return null;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream(b.length);
        out.write(b, 0, 2);
        int i = 2;
        while (i < b.length) {
            if ((b[i] & 0xFF) != 0xFF) {
                return null;
            }
            while (i < b.length && (b[i] & 0xFF) == 0xFF) {
                i++;
            }
            if (i >= b.length) {
                return null;
            }
            int marker = b[i] & 0xFF;
            i++;
            if (marker == 0xD9) {
                out.write(0xFF);
                out.write(marker);
                return out.toByteArray();
            }
            if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                out.write(0xFF);
                out.write(marker);
                continue;
            }
            if (i + 2 > b.length) {
                return null;
            }
            int len = ((b[i] & 0xFF) << 8) | (b[i + 1] & 0xFF);
            if (len < 2 || i + len > b.length) {
                return null;
            }
            boolean drop = marker == 0xE1 || marker == 0xED || marker == 0xFE || (marker == 0xE2 && startsWith(b, i + 2, len - 2, "MPF\0"));
            if (!drop) {
                out.write(0xFF);
                out.write(marker);
                out.write(b, i, len);
            }
            i += len;
            if (marker == 0xDA) {
                int end = scanEntropy(b, i);
                if (end < 0) {
                    return null;
                }
                out.write(b, i, end - i);
                i = end;
            }
        }
        return null;
    }

    /** Posição do próximo marcador real depois de dados entrópicos (pula FF00 e os RSTn); -1 se o arquivo acaba antes. */
    private static int scanEntropy(byte[] b, int from) {
        int i = from;
        while (i + 1 < b.length) {
            if ((b[i] & 0xFF) == 0xFF) {
                int next = b[i + 1] & 0xFF;
                if (next == 0x00 || (next >= 0xD0 && next <= 0xD7) || next == 0xFF) {
                    i += next == 0xFF ? 1 : 2;
                    continue;
                }
                return i;
            }
            i++;
        }
        return -1;
    }

    private static boolean startsWith(byte[] b, int at, int available, String prefix) {
        byte[] p = prefix.getBytes(StandardCharsets.ISO_8859_1);
        return available >= p.length && Arrays.equals(b, at, at + p.length, p, 0, p.length);
    }

    // ------------------------------------------------------------------------------------------------ PNG

    private static byte[] png(byte[] b) {
        if (b.length < PNG_SIGNATURE.length || !Arrays.equals(b, 0, PNG_SIGNATURE.length, PNG_SIGNATURE, 0, PNG_SIGNATURE.length)) {
            return null;
        }
        ByteArrayOutputStream out = new ByteArrayOutputStream(b.length);
        out.write(b, 0, PNG_SIGNATURE.length);
        int i = PNG_SIGNATURE.length;
        while (i + 8 <= b.length) {
            long len = ((long) (b[i] & 0xFF) << 24) | ((b[i + 1] & 0xFF) << 16) | ((b[i + 2] & 0xFF) << 8) | (b[i + 3] & 0xFF);
            long total = 12 + len;
            if (len < 0 || i + total > b.length) {
                return null;
            }
            String chunk = new String(b, i + 4, 4, StandardCharsets.ISO_8859_1);
            if (!PNG_DROP.contains(chunk)) {
                out.write(b, i, (int) total);
            }
            i += (int) total;
            if (chunk.equals("IEND")) {
                return out.toByteArray();
            }
        }
        return null;
    }

    // ------------------------------------------------------------------------------------------------ WEBP

    private static byte[] webp(byte[] b) {
        if (b.length < 12 || !startsWith(b, 0, b.length, "RIFF") || !startsWith(b, 8, b.length - 8, "WEBP")) {
            return null;
        }
        ByteArrayOutputStream body = new ByteArrayOutputStream(b.length);
        int i = 12;
        while (i + 8 <= b.length) {
            String fourcc = new String(b, i, 4, StandardCharsets.ISO_8859_1);
            long size = (b[i + 4] & 0xFFL) | ((b[i + 5] & 0xFFL) << 8) | ((b[i + 6] & 0xFFL) << 16) | ((b[i + 7] & 0xFFL) << 24);
            long padded = size + (size & 1);
            if (i + 8 + size > b.length) {
                return null;
            }
            int chunkEnd = (int) Math.min(b.length, i + 8 + padded);
            if (!WEBP_DROP.contains(fourcc)) {
                byte[] chunk = Arrays.copyOfRange(b, i, chunkEnd);
                if (fourcc.equals("VP8X") && chunk.length > 8) {
                    chunk[8] = (byte) (chunk[8] & ~0x0C);   // marcas de EXIF (0x08) e XMP (0x04)
                }
                body.write(chunk, 0, chunk.length);
            }
            i = chunkEnd;
        }
        byte[] payload = body.toByteArray();
        int riffSize = 4 + payload.length;
        ByteArrayOutputStream out = new ByteArrayOutputStream(payload.length + 12);
        out.write('R');
        out.write('I');
        out.write('F');
        out.write('F');
        out.write(riffSize & 0xFF);
        out.write((riffSize >> 8) & 0xFF);
        out.write((riffSize >> 16) & 0xFF);
        out.write((riffSize >> 24) & 0xFF);
        out.write('W');
        out.write('E');
        out.write('B');
        out.write('P');
        out.write(payload, 0, payload.length);
        return out.toByteArray();
    }
}
