package br.gov.pr.secid.workstation.application.media;

import java.util.Optional;

/**
 * Largura × altura lidas do CABEÇALHO da imagem, sem decodificar pixels (D-67): o teto de pixels recusa a bomba de descompressão
 * (um PNG de poucos KB que declara 50 000 × 50 000) antes de qualquer biblioteca de imagem abrir o arquivo. Cabeçalho ilegível →
 * vazio (o inspetor recusa como imagem inválida).
 */
public final class ImageDimensions {

    /** Dimensões declaradas. */
    public record Size(int width, int height) {
        public long pixels() {
            return (long) width * height;
        }
    }

    private ImageDimensions() {
    }

    public static Optional<Size> read(DetectedType type, byte[] b) {
        try {
            return switch (type) {
                case PNG -> png(b);
                case GIF -> gif(b);
                case WEBP -> webp(b);
                case JPEG -> jpeg(b);
                default -> Optional.empty();
            };
        } catch (ArrayIndexOutOfBoundsException e) {
            return Optional.empty();
        }
    }

    /** PNG: o primeiro chunk é IHDR (largura/altura uint32 big-endian em 16 e 20). */
    private static Optional<Size> png(byte[] b) {
        if (b.length < 24 || !MagicBytes.ascii(b, 12, "IHDR")) {
            return Optional.empty();
        }
        return size(be32(b, 16), be32(b, 20));
    }

    /** GIF: tela lógica uint16 little-endian em 6 e 8. */
    private static Optional<Size> gif(byte[] b) {
        if (b.length < 10) {
            return Optional.empty();
        }
        return size(le16(b, 6), le16(b, 8));
    }

    /** WebP: VP8 (com perdas), VP8L (sem perdas) ou VP8X (estendido, canvas 24 bits + 1). */
    private static Optional<Size> webp(byte[] b) {
        if (b.length < 30) {
            return Optional.empty();
        }
        if (MagicBytes.ascii(b, 12, "VP8 ")) {
            if (MagicBytes.u8(b, 23) != 0x9D || MagicBytes.u8(b, 24) != 0x01 || MagicBytes.u8(b, 25) != 0x2A) {
                return Optional.empty();
            }
            return size(le16(b, 26) & 0x3FFF, le16(b, 28) & 0x3FFF);
        }
        if (MagicBytes.ascii(b, 12, "VP8L")) {
            if (MagicBytes.u8(b, 20) != 0x2F) {
                return Optional.empty();
            }
            int b1 = b[21] & 0xFF;
            int b2 = b[22] & 0xFF;
            int b3 = b[23] & 0xFF;
            int b4 = b[24] & 0xFF;
            int w = 1 + (b1 | (b2 & 0x3F) << 8);
            int h = 1 + ((b2 >> 6) | b3 << 2 | (b4 & 0x0F) << 10);
            return size(w, h);
        }
        if (MagicBytes.ascii(b, 12, "VP8X")) {
            return size(1 + le24(b, 24), 1 + le24(b, 27));
        }
        return Optional.empty();
    }

    /** JPEG: percorre os segmentos até o SOFn (exceto DHT C4, JPG C8, DAC CC); altura/largura big-endian. */
    private static Optional<Size> jpeg(byte[] b) {
        int i = 2;
        while (i + 3 < b.length) {
            if ((b[i] & 0xFF) != 0xFF) {
                return Optional.empty();
            }
            int marker = b[i + 1] & 0xFF;
            if (marker == 0xFF) {
                i++;                                            // byte de preenchimento
                continue;
            }
            if (marker == 0xD8 || marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7)) {
                i += 2;                                         // marcadores sem comprimento
                continue;
            }
            if (marker == 0xD9 || marker == 0xDA) {
                return Optional.empty();                        // fim/início dos dados sem SOF antes
            }
            int len = be16(b, i + 2);
            if (len < 2) {
                return Optional.empty();
            }
            boolean sof = marker >= 0xC0 && marker <= 0xCF && marker != 0xC4 && marker != 0xC8 && marker != 0xCC;
            if (sof) {
                if (i + 8 >= b.length) {
                    return Optional.empty();
                }
                return size(be16(b, i + 7), be16(b, i + 5));
            }
            i += 2 + len;
        }
        return Optional.empty();
    }

    private static Optional<Size> size(long w, long h) {
        if (w <= 0 || h <= 0 || w > Integer.MAX_VALUE || h > Integer.MAX_VALUE) {
            return Optional.empty();
        }
        return Optional.of(new Size((int) w, (int) h));
    }

    private static long be32(byte[] b, int i) {
        return (b[i] & 0xFFL) << 24 | (b[i + 1] & 0xFFL) << 16 | (b[i + 2] & 0xFFL) << 8 | (b[i + 3] & 0xFFL);
    }

    private static int be16(byte[] b, int i) {
        return (b[i] & 0xFF) << 8 | (b[i + 1] & 0xFF);
    }

    private static int le16(byte[] b, int i) {
        return (b[i] & 0xFF) | (b[i + 1] & 0xFF) << 8;
    }

    private static int le24(byte[] b, int i) {
        return (b[i] & 0xFF) | (b[i + 1] & 0xFF) << 8 | (b[i + 2] & 0xFF) << 16;
    }
}
