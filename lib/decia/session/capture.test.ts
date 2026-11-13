import { describe, expect, it } from "vitest";
import { detectSpeech, installLocalSpeech, micErrorReason, microphoneAllowedByPolicy, recorderBlock, transcriptLine } from "./capture";

class Rec {}
const withSpeech = (extra: Record<string, unknown>) => ({ webkitSpeechRecognition: Object.assign(Rec, extra) });

describe("transcrição ao vivo só quando o reconhecimento é local (o áudio nunca sai do navegador)", () => {
  it("sem API de fala = AUSENTE; só nuvem (sem API de disponibilidade) = SO_NUVEM", async () => {
    expect(await detectSpeech({})).toBe("AUSENTE");
    expect(await detectSpeech({ SpeechRecognition: class {} })).toBe("SO_NUVEM");
  });
  it("available({ processLocally: true }) decide: available → LOCAL; downloadable → BAIXAVEL; unavailable → SO_NUVEM; erro → SO_NUVEM", async () => {
    const asked: unknown[] = [];
    const win = (status: string) => ({ SpeechRecognition: Object.assign(class {}, { available: async (o: unknown) => { asked.push(o); return status; } }) });
    expect(await detectSpeech(win("available"))).toBe("LOCAL");
    expect(asked[0]).toEqual({ langs: ["pt-BR"], processLocally: true });
    expect(await detectSpeech(win("downloadable"))).toBe("BAIXAVEL");
    expect(await detectSpeech(win("unavailable"))).toBe("SO_NUVEM");
    expect(await detectSpeech({ SpeechRecognition: Object.assign(class {}, { available: async () => { throw new Error("x"); } }) })).toBe("SO_NUVEM");
  });
  it("nome antigo da API (availableOnDevice/installOnDevice) também é entendido", async () => {
    expect(await detectSpeech(withSpeech({ availableOnDevice: async (lang: string) => (lang === "pt-BR" ? "available" : "unavailable") }))).toBe("LOCAL");
    expect(await installLocalSpeech(withSpeech({ installOnDevice: async () => true }))).toBe(true);
    expect(await installLocalSpeech({})).toBe(false);
  });
});

describe("gravador e política do microfone", () => {
  const recorderWin = { MediaRecorder: class {}, navigator: { mediaDevices: { getUserMedia: () => undefined } } };
  it("sem MediaRecorder não grava; política do site com microphone=() bloqueia (D-64); sem informação, tenta e trata o erro", () => {
    expect(recorderBlock({}, {})).toBe("SEM_GRAVADOR");
    expect(recorderBlock(recorderWin, { permissionsPolicy: { allowsFeature: (f: string) => f !== "microphone" } })).toBe("POLITICA_DO_SITE");
    expect(recorderBlock(recorderWin, { featurePolicy: { allowsFeature: () => true } })).toBeNull();
    expect(microphoneAllowedByPolicy({})).toBeNull();
  });
  it("erros do getUserMedia viram motivos legíveis; a linha transcrita leva o nome de quem fala", () => {
    expect(micErrorReason("NotAllowedError")).toBe("PERMISSAO_NEGADA");
    expect(micErrorReason("NotFoundError")).toBe("SEM_MICROFONE");
    expect(micErrorReason("NotReadableError")).toBe("MICROFONE_OCUPADO");
    expect(micErrorReason("SecurityError")).toBe("BLOQUEADO");
    expect(micErrorReason(undefined)).toBe("FALHOU");
    expect(transcriptLine("Ana Exemplo", "  fica aprovado  ")).toBe("Ana Exemplo: fica aprovado");
  });
});
