package br.gov.pr.secid.workstation.application.identity;

/** IP (do {@code ClientIpResolver}) e User-Agent da requisição, para sessões e auditoria. */
public record RequestContext(String ip, String userAgent) {
    public static final RequestContext NONE = new RequestContext(null, null);
}
