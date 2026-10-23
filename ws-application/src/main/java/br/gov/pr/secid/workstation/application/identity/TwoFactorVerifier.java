package br.gov.pr.secid.workstation.application.identity;

import br.gov.pr.secid.workstation.application.common.Hashing;
import br.gov.pr.secid.workstation.domain.identity.User;

import java.security.SecureRandom;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.OptionalLong;
import java.util.stream.Collectors;

/**
 * Confere o segundo fator de uma conta: código TOTP do aplicativo (anti-reuso pelo último passo aceito) ou um código de
 * recuperação de uso único (guardado só como SHA-256; ao ser usado, sai da lista). Muta o {@link User}; quem chama salva.
 * Usado pelo login ({@link IdentityService}) e pelas ações sensíveis do 2FA ({@link TwoFactorService}).
 */
public final class TwoFactorVerifier {
    public static final int RECOVERY_CODES = 10;
    /** Alfabeto sem 0/O/1/l/I: 8 caracteres = 40 bits por código. */
    private static final String RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

    public enum Outcome { TOTP, RECOVERY, INVALID }

    private TwoFactorVerifier() {
    }

    public static Outcome verify(User u, String code, Instant now) {
        if (u == null || code == null || code.isBlank() || u.getTwoFactorSecret() == null) {
            return Outcome.INVALID;
        }
        String raw = code.strip();
        if (raw.replaceAll("\\s", "").matches("\\d{" + Totp.DIGITS + "}")) {
            long last = u.getTwoFactorLastStep() == null ? Long.MIN_VALUE : u.getTwoFactorLastStep();
            OptionalLong step = Totp.verify(u.getTwoFactorSecret(), raw, now, last);
            if (step.isPresent()) {
                u.setTwoFactorLastStep(step.getAsLong());
                return Outcome.TOTP;
            }
            return Outcome.INVALID;
        }
        List<String> hashes = recoveryHashes(u);
        String h = Hashing.sha256(normalizeRecovery(raw));
        if (hashes.remove(h)) {
            u.setTwoFactorRecoveryHashes(String.join(",", hashes));
            return Outcome.RECOVERY;
        }
        return Outcome.INVALID;
    }

    /** Gera novos códigos de recuperação, guarda os hashes no usuário e devolve os códigos em claro (mostrados uma vez só). */
    public static List<String> newRecoveryCodes(User u, SecureRandom random) {
        List<String> codes = new ArrayList<>(RECOVERY_CODES);
        for (int i = 0; i < RECOVERY_CODES; i++) {
            StringBuilder sb = new StringBuilder(9);
            for (int j = 0; j < 8; j++) {
                if (j == 4) {
                    sb.append('-');
                }
                sb.append(RECOVERY_ALPHABET.charAt(random.nextInt(RECOVERY_ALPHABET.length())));
            }
            codes.add(sb.toString());
        }
        u.setTwoFactorRecoveryHashes(codes.stream().map(c -> Hashing.sha256(normalizeRecovery(c))).collect(Collectors.joining(",")));
        return codes;
    }

    public static int recoveryCodesLeft(User u) {
        return recoveryHashes(u).size();
    }

    static String normalizeRecovery(String code) {
        return code.replaceAll("[\\s-]", "").toLowerCase(Locale.ROOT);
    }

    private static List<String> recoveryHashes(User u) {
        String joined = u.getTwoFactorRecoveryHashes();
        if (joined == null || joined.isBlank()) {
            return new ArrayList<>();
        }
        return new ArrayList<>(Arrays.asList(joined.split(",")));
    }
}
