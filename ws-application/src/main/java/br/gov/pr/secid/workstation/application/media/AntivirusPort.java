package br.gov.pr.secid.workstation.application.media;

import br.gov.pr.secid.workstation.domain.plataforma.MediaScanStatus;

/**
 * Antivírus/quarentena (D-67). O motor real (ClamAV via clamd, serviço do provedor de nuvem…) é a Q-165; até lá vale
 * {@link #NO_OP}, que devolve {@code NAO_VERIFICADO} — e com {@code ws.upload.require-antivirus=true} nada NAO_VERIFICADO é servido.
 * Um motor assíncrono devolve {@code PENDENTE} e atualiza {@code media_scans} depois.
 */
public interface AntivirusPort {

    /** Veredito para o binário já validado pelo {@link MediaUploadInspector}. */
    Verdict scan(byte[] content, DetectedType type);

    /** Situação + motor + ameaça (sem conteúdo do arquivo). */
    record Verdict(MediaScanStatus status, String engine, String threatName) {
        public static Verdict clean(String engine) {
            return new Verdict(MediaScanStatus.LIMPO, engine, null);
        }

        public static Verdict infected(String engine, String threat) {
            return new Verdict(MediaScanStatus.INFECTADO, engine, threat);
        }
    }

    /** Sem motor configurado: nada é varrido, tudo fica NAO_VERIFICADO. */
    AntivirusPort NO_OP = (content, type) -> new Verdict(MediaScanStatus.NAO_VERIFICADO, "none", null);
}
