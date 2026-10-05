package br.gov.pr.secid.workstation.domain.institutional;

/** Tipo de envio do cadastro (RF1 bloco B, D-22); em minúsculas porque viaja no query {@code ?kind=}. */
public enum UploadKind {
    avatar, identity, representation;

    /** identity e representation ficam em {@code restricted/}. */
    public boolean restricted() {
        return this != avatar;
    }
}
