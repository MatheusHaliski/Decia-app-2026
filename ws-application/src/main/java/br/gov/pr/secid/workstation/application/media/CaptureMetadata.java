package br.gov.pr.secid.workstation.application.media;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

/**
 * Metadados de CAPTURA de uma foto (proveniência), lidos do EXIF ANTES de {@link ImageMetadata#strip} apagá-los do binário: data/hora
 * original ({@code DateTimeOriginal} + {@code OffsetTimeOriginal}), posição GPS (graus decimais, até 7 casas) e fabricante/modelo da
 * câmera. O resultado é dado pessoal (geolocalização, aparelho): quem chama guarda cifrado (AES-GCM, como as coordenadas da evidência) e
 * só mostra a quem pode editar a tarefa. Nunca vai para log nem para a auditoria.
 *
 * <p>Leitura defensiva de TIFF/EXIF (JPEG APP1 {@code Exif\0\0}, PNG {@code eXIf}, WEBP {@code EXIF}): só os IFDs 0, EXIF e GPS, no máximo
 * {@link #MAX_ENTRIES} entradas por IFD, todo offset conferido contra o tamanho; estrutura que não fecha → nada é extraído (vazio).
 */
public final class CaptureMetadata {
    static final int MAX_ENTRIES = 512;
    static final int MAX_TEXT = 64;
    private static final DateTimeFormatter EXIF_DATE = DateTimeFormatter.ofPattern("yyyy:MM:dd HH:mm:ss");
    private static final byte[] EXIF_HEADER = {'E', 'x', 'i', 'f', 0, 0};
    private static final byte[] PNG_SIGNATURE = {(byte) 0x89, 'P', 'N', 'G', '\r', '\n', 0x1A, '\n'};

    private static final int TAG_MAKE = 0x010F;
    private static final int TAG_MODEL = 0x0110;
    private static final int TAG_EXIF_IFD = 0x8769;
    private static final int TAG_GPS_IFD = 0x8825;
    private static final int TAG_DATE_ORIGINAL = 0x9003;
    private static final int TAG_OFFSET_ORIGINAL = 0x9011;

    /**
     * O que foi lido. Campos ausentes ficam nulos; {@code takenAt} é a data local da câmera em ISO-8601 (com o fuso quando o EXIF traz
     * {@code OffsetTimeOriginal}); latitude/longitude em graus decimais como texto (mesmo formato das coordenadas da evidência).
     */
    public record Capture(String takenAt, String latitude, String longitude, String cameraMake, String cameraModel) {
        public boolean isEmpty() {
            return takenAt == null && latitude == null && cameraMake == null && cameraModel == null;
        }

        /** Mapa estável (chaves fixas, sem nulos) para serializar em JSON antes de cifrar. */
        public Map<String, String> asMap() {
            Map<String, String> m = new LinkedHashMap<>();
            put(m, "takenAt", takenAt);
            put(m, "latitude", latitude);
            put(m, "longitude", longitude);
            put(m, "cameraMake", cameraMake);
            put(m, "cameraModel", cameraModel);
            return m;
        }

        public static Capture fromMap(Map<String, String> m) {
            if (m == null) {
                return null;
            }
            return new Capture(m.get("takenAt"), m.get("latitude"), m.get("longitude"), m.get("cameraMake"), m.get("cameraModel"));
        }

        private static void put(Map<String, String> m, String k, String v) {
            if (v != null) {
                m.put(k, v);
            }
        }
    }

    private CaptureMetadata() {
    }

    /** Lê a captura de uma imagem do tipo REAL detectado; documentos e imagens sem EXIF → vazio. */
    public static Optional<Capture> read(DetectedType type, byte[] content) {
        if (type == null || content == null) {
            return Optional.empty();
        }
        try {
            byte[] tiff = switch (type) {
                case JPEG -> jpegExif(content);
                case PNG -> pngExif(content);
                case WEBP -> webpExif(content);
                default -> null;
            };
            if (tiff == null) {
                return Optional.empty();
            }
            Capture c = parseTiff(tiff);
            return c == null || c.isEmpty() ? Optional.empty() : Optional.of(c);
        } catch (RuntimeException e) {
            return Optional.empty();   // EXIF malformado nunca derruba o upload
        }
    }

    // ------------------------------------------------------------------------------------------------ contêineres

    private static byte[] jpegExif(byte[] b) {
        if (b.length < 4 || (b[0] & 0xFF) != 0xFF || (b[1] & 0xFF) != 0xD8) {
            return null;
        }
        int i = 2;
        while (i + 4 <= b.length) {
            if ((b[i] & 0xFF) != 0xFF) {
                return null;
            }
            int marker = b[i + 1] & 0xFF;
            if (marker == 0xD9 || marker == 0xDA) {
                return null;   // EXIF vem antes dos dados da imagem
            }
            if (marker == 0x01 || (marker >= 0xD0 && marker <= 0xD7) || marker == 0xFF) {
                i += marker == 0xFF ? 1 : 2;
                continue;
            }
            int len = ((b[i + 2] & 0xFF) << 8) | (b[i + 3] & 0xFF);
            if (len < 2 || i + 2 + len > b.length) {
                return null;
            }
            int body = i + 4;
            int bodyLen = len - 2;
            if (marker == 0xE1 && bodyLen > EXIF_HEADER.length && Arrays.equals(b, body, body + EXIF_HEADER.length, EXIF_HEADER, 0, EXIF_HEADER.length)) {
                return Arrays.copyOfRange(b, body + EXIF_HEADER.length, body + bodyLen);
            }
            i += 2 + len;
        }
        return null;
    }

    private static byte[] pngExif(byte[] b) {
        if (b.length < 8 || !Arrays.equals(b, 0, 8, PNG_SIGNATURE, 0, 8)) {
            return null;
        }
        int i = 8;
        while (i + 12 <= b.length) {
            long len = ((long) (b[i] & 0xFF) << 24) | ((b[i + 1] & 0xFF) << 16) | ((b[i + 2] & 0xFF) << 8) | (b[i + 3] & 0xFF);
            if (len < 0 || i + 12 + len > b.length) {
                return null;
            }
            String type = new String(b, i + 4, 4, StandardCharsets.ISO_8859_1);
            if (type.equals("eXIf")) {
                byte[] data = Arrays.copyOfRange(b, i + 8, i + 8 + (int) len);
                // alguns gravadores repetem o cabeçalho "Exif\0\0" dentro do chunk
                return data.length > 6 && Arrays.equals(data, 0, 6, EXIF_HEADER, 0, 6) ? Arrays.copyOfRange(data, 6, data.length) : data;
            }
            if (type.equals("IEND")) {
                return null;
            }
            i += 12 + (int) len;
        }
        return null;
    }

    private static byte[] webpExif(byte[] b) {
        if (b.length < 12 || !ascii(b, 0, "RIFF") || !ascii(b, 8, "WEBP")) {
            return null;
        }
        int i = 12;
        while (i + 8 <= b.length) {
            String fourcc = new String(b, i, 4, StandardCharsets.ISO_8859_1);
            long size = (b[i + 4] & 0xFFL) | ((b[i + 5] & 0xFFL) << 8) | ((b[i + 6] & 0xFFL) << 16) | ((b[i + 7] & 0xFFL) << 24);
            if (i + 8 + size > b.length) {
                return null;
            }
            if (fourcc.equals("EXIF")) {
                byte[] data = Arrays.copyOfRange(b, i + 8, i + 8 + (int) size);
                return data.length > 6 && Arrays.equals(data, 0, 6, EXIF_HEADER, 0, 6) ? Arrays.copyOfRange(data, 6, data.length) : data;
            }
            i += 8 + (int) (size + (size & 1));
        }
        return null;
    }

    private static boolean ascii(byte[] b, int at, String s) {
        byte[] p = s.getBytes(StandardCharsets.US_ASCII);
        return b.length >= at + p.length && Arrays.equals(b, at, at + p.length, p, 0, p.length);
    }

    // ------------------------------------------------------------------------------------------------ TIFF

    /** Leitor de TIFF com a ordem de bytes do cabeçalho ({@code II} little-endian, {@code MM} big-endian). */
    private record Tiff(byte[] b, boolean little) {
        int u16(int at) {
            check(at, 2);
            return little ? (b[at] & 0xFF) | (b[at + 1] & 0xFF) << 8 : (b[at] & 0xFF) << 8 | (b[at + 1] & 0xFF);
        }

        long u32(int at) {
            check(at, 4);
            return little
                    ? (b[at] & 0xFFL) | (b[at + 1] & 0xFFL) << 8 | (b[at + 2] & 0xFFL) << 16 | (b[at + 3] & 0xFFL) << 24
                    : (b[at] & 0xFFL) << 24 | (b[at + 1] & 0xFFL) << 16 | (b[at + 2] & 0xFFL) << 8 | (b[at + 3] & 0xFFL);
        }

        void check(int at, int n) {
            if (at < 0 || at + n > b.length) {
                throw new IllegalArgumentException("offset fora do EXIF");
            }
        }
    }

    /** Entrada de IFD: tag, tipo, contagem e a posição do valor (inline nos 4 bytes ou pelo offset). */
    private record Entry(int tag, int type, long count, int valueAt) {
    }

    /** TIFF/EXIF → captura; estrutura que não fecha (offset fora, IFD gigante, cabeçalho errado) → nulo. */
    static Capture parseTiff(byte[] b) {
        try {
            return parseTiffOrThrow(b);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static Capture parseTiffOrThrow(byte[] b) {
        if (b == null || b.length < 8) {
            return null;
        }
        boolean little;
        if (b[0] == 'I' && b[1] == 'I') {
            little = true;
        } else if (b[0] == 'M' && b[1] == 'M') {
            little = false;
        } else {
            return null;
        }
        Tiff t = new Tiff(b, little);
        if (t.u16(2) != 42) {
            return null;
        }
        Map<Integer, Entry> ifd0 = ifd(t, (int) Math.min(Integer.MAX_VALUE, t.u32(4)));
        String make = ascii(t, ifd0.get(TAG_MAKE));
        String model = ascii(t, ifd0.get(TAG_MODEL));
        String takenAt = null;
        Entry exifPtr = ifd0.get(TAG_EXIF_IFD);
        if (exifPtr != null) {
            Map<Integer, Entry> exif = ifd(t, (int) Math.min(Integer.MAX_VALUE, t.u32(exifPtr.valueAt())));
            takenAt = takenAt(ascii(t, exif.get(TAG_DATE_ORIGINAL)), ascii(t, exif.get(TAG_OFFSET_ORIGINAL)));
        }
        String lat = null;
        String lon = null;
        Entry gpsPtr = ifd0.get(TAG_GPS_IFD);
        if (gpsPtr != null) {
            Map<Integer, Entry> gps = ifd(t, (int) Math.min(Integer.MAX_VALUE, t.u32(gpsPtr.valueAt())));
            BigDecimal la = degrees(t, gps.get(2), ascii(t, gps.get(1)), "S", 90);
            BigDecimal lo = degrees(t, gps.get(4), ascii(t, gps.get(3)), "W", 180);
            if (la != null && lo != null) {
                lat = plain(la);
                lon = plain(lo);
            }
        }
        return new Capture(takenAt, lat, lon, make, model);
    }

    private static Map<Integer, Entry> ifd(Tiff t, int at) {
        Map<Integer, Entry> out = new LinkedHashMap<>();
        int n = t.u16(at);
        if (n > MAX_ENTRIES) {
            throw new IllegalArgumentException("IFD grande demais");
        }
        for (int k = 0; k < n; k++) {
            int e = at + 2 + k * 12;
            int tag = t.u16(e);
            int type = t.u16(e + 2);
            long count = t.u32(e + 4);
            int unit = switch (type) {
                case 1, 2, 6, 7 -> 1;
                case 3, 8 -> 2;
                case 4, 9, 11 -> 4;
                case 5, 10, 12 -> 8;
                default -> 0;
            };
            if (unit == 0 || count < 0 || count > 65_535) {
                continue;
            }
            long bytes = unit * count;
            int valueAt = bytes <= 4 ? e + 8 : (int) Math.min(Integer.MAX_VALUE, t.u32(e + 8));
            t.check(valueAt, (int) bytes);
            out.putIfAbsent(tag, new Entry(tag, type, count, valueAt));
        }
        return out;
    }

    /** Texto ASCII (tipo 2) sem o NUL final, só caracteres imprimíveis, até {@link #MAX_TEXT}. */
    private static String ascii(Tiff t, Entry e) {
        if (e == null || e.type() != 2 || e.count() == 0) {
            return null;
        }
        int len = (int) Math.min(e.count(), MAX_TEXT + 1L);
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < len; i++) {
            int c = t.b()[e.valueAt() + i] & 0xFF;
            if (c == 0) {
                break;
            }
            if (c >= 0x20 && c < 0x7F) {
                sb.append((char) c);
            }
        }
        String s = sb.toString().strip();
        if (s.length() > MAX_TEXT) {
            s = s.substring(0, MAX_TEXT);
        }
        return s.isEmpty() ? null : s;
    }

    /** {@code yyyy:MM:dd HH:mm:ss} (+ {@code ±hh:mm}) → ISO-8601; data zerada ou inválida → nulo. */
    static String takenAt(String raw, String offset) {
        if (raw == null) {
            return null;
        }
        try {
            LocalDateTime ldt = LocalDateTime.parse(raw.length() > 19 ? raw.substring(0, 19) : raw, EXIF_DATE);
            if (offset != null && offset.matches("[+-]\\d{2}:\\d{2}")) {
                return ldt + offset;
            }
            return ldt.toString();
        } catch (DateTimeParseException e) {
            return null;
        }
    }

    /** Três RATIONAL (graus, minutos, segundos) → graus decimais com sinal pelo hemisfério; fora de ±limite → nulo. */
    private static BigDecimal degrees(Tiff t, Entry e, String ref, String negative, int limit) {
        if (e == null || e.type() != 5 || e.count() < 3) {
            return null;
        }
        BigDecimal[] parts = new BigDecimal[3];
        for (int i = 0; i < 3; i++) {
            long num = t.u32(e.valueAt() + i * 8);
            long den = t.u32(e.valueAt() + i * 8 + 4);
            if (den == 0) {
                return null;
            }
            parts[i] = BigDecimal.valueOf(num).divide(BigDecimal.valueOf(den), 12, RoundingMode.HALF_UP);
        }
        BigDecimal v = parts[0].add(parts[1].divide(BigDecimal.valueOf(60), 12, RoundingMode.HALF_UP))
                .add(parts[2].divide(BigDecimal.valueOf(3600), 12, RoundingMode.HALF_UP));
        if (negative.equalsIgnoreCase(ref)) {
            v = v.negate();
        }
        if (v.abs().compareTo(BigDecimal.valueOf(limit)) > 0) {
            return null;
        }
        return v.setScale(7, RoundingMode.HALF_UP);
    }

    private static String plain(BigDecimal v) {
        BigDecimal s = v.stripTrailingZeros();
        return s.signum() == 0 ? "0" : s.toPlainString();
    }
}
