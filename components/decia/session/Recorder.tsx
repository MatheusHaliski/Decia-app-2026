"use client";
/**
 * Gravação da reunião no navegador (RF37.CA01) com transcrição ao vivo só quando o reconhecimento de fala é LOCAL. O áudio fica
 * num Blob desta aba (ouvir e descartar); nada é enviado. Sem suporte, a tela explica o motivo e a pessoa cola ou envia a
 * transcrição. A detecção e as regras estão em lib/decia/session/capture.ts.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Field, Select } from "@/components/ui";
import { useI18n } from "@/lib/i18n/useI18n";
import {
  detectSpeech, installLocalSpeech, micErrorReason, recorderBlock, speechCtor, transcriptLine, type RecorderBlock, type SpeechRecognitionLike, type SpeechSupport,
} from "@/lib/decia/session/capture";

export interface RecorderProps {
  speakers: { userId: string; name: string }[];
  defaultSpeaker: string;
  /** consentimento de todos os participantes (RF37.CA05) */
  consentOk: boolean;
  onLine: (line: string) => void;
}

type MicError = ReturnType<typeof micErrorReason>;

export function Recorder({ speakers, defaultSpeaker, consentOk, onLine }: RecorderProps) {
  const { t } = useI18n();
  const [block, setBlock] = useState<RecorderBlock | "VERIFICANDO">("VERIFICANDO");
  const [speech, setSpeech] = useState<SpeechSupport | "VERIFICANDO">("VERIFICANDO");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<MicError | null>(null);
  const [interim, setInterim] = useState("");
  const [speaker, setSpeaker] = useState(defaultSpeaker);
  const [installing, setInstalling] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null);
  const recognition = useRef<SpeechRecognitionLike | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const live = useRef(false);
  const speakerName = speakers.find((s) => s.userId === speaker)?.name ?? speaker;
  const speakerRef = useRef(speakerName);
  useEffect(() => {
    speakerRef.current = speakerName;
  }, [speakerName]);

  useEffect(() => {
    setBlock(recorderBlock(window, document));
    let alive = true;
    void detectSpeech(window).then((s) => alive && setSpeech(s));
    return () => {
      alive = false;
    };
  }, []);

  const stopAll = useCallback(() => {
    live.current = false;
    try { recognition.current?.stop(); } catch { /* já parado */ }
    recognition.current = null;
    if (recorder.current && recorder.current.state !== "inactive") recorder.current.stop();
    stream.current?.getTracks().forEach((tr) => tr.stop());
    stream.current = null;
    setRecording(false);
    setInterim("");
  }, []);

  useEffect(() => () => stopAll(), [stopAll]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);
  useEffect(() => {
    if (!recording) return;
    const id = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [recording]);

  const startSpeech = () => {
    const C = speechCtor(window);
    if (!C || speech !== "LOCAL") return;
    const r = new C();
    r.lang = "pt-BR";
    r.continuous = true;
    r.interimResults = true;
    r.processLocally = true; // nunca o serviço na nuvem do navegador
    r.onresult = (e) => {
      let partial = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i]!;
        const text = res[0].transcript;
        if (res.isFinal) {
          if (text.trim()) onLine(transcriptLine(speakerRef.current, text));
        } else partial += text;
      }
      setInterim(partial);
    };
    r.onerror = () => setInterim("");
    // o reconhecimento para sozinho depois de um silêncio: recomeça enquanto a gravação continuar
    r.onend = () => {
      if (live.current) {
        try { r.start(); } catch { /* já reiniciado */ }
      }
    };
    recognition.current = r;
    r.start();
  };

  const start = async () => {
    setError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = media;
      const chunks: Blob[] = [];
      const rec = new MediaRecorder(media);
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/webm" });
        setAudioUrl((old) => {
          if (old) URL.revokeObjectURL(old);
          return URL.createObjectURL(blob);
        });
      };
      recorder.current = rec;
      rec.start();
      live.current = true;
      setElapsed(0);
      setRecording(true);
      startSpeech();
    } catch (e) {
      setError(micErrorReason((e as { name?: string })?.name));
      stopAll();
    }
  };

  const discard = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
  };

  const install = async () => {
    setInstalling(true);
    const ok = await installLocalSpeech(window);
    setInstalling(false);
    if (ok) setSpeech(await detectSpeech(window));
  };

  const mm = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  if (block === "VERIFICANDO") return <p className="text-[length:var(--ws-text-body-sm)] text-ws-text-muted">{t("ata.rec.checking")}</p>;
  if (block) {
    return (
      <div role="note" className="grid gap-1 rounded-[var(--ws-radius-md)] border border-ws-border bg-ws-warning-soft p-[var(--ws-space-3)] text-[length:var(--ws-text-body-sm)]" data-testid="recorder-blocked">
        <p className="font-semibold">{t(`ata.rec.block.${block}`)}</p>
        <p className="text-ws-text-muted">{t("ata.rec.useAlternatives")}</p>
      </div>
    );
  }
  return (
    <div className="grid gap-[var(--ws-space-3)]" data-testid="recorder">
      <div className="grid gap-1 text-[length:var(--ws-text-body-sm)]">
        <p className="flex flex-wrap items-center gap-2">
          <Badge tone={speech === "LOCAL" ? "success" : "neutral"}>{t(`ata.rec.speech.${speech}`)}</Badge>
          <span className="text-ws-text-muted">{t("ata.rec.localOnly")}</span>
        </p>
        {speech !== "LOCAL" && speech !== "VERIFICANDO" ? <p className="text-ws-text-muted" data-testid="speech-explain">{t(`ata.rec.speechExplain.${speech}`)}</p> : null}
        {speech === "BAIXAVEL" ? <Button size="sm" variant="ghost" className="w-fit" busy={installing} onClick={() => void install()}>{t("ata.rec.install")}</Button> : null}
      </div>
      {speech === "LOCAL" ? (
        <Field label={t("ata.rec.speaker")} hint={t("ata.rec.speakerHint")}>
          {({ id, describedBy }) => <Select id={id} aria-describedby={describedBy} value={speaker} onChange={(e) => setSpeaker(e.target.value)} options={speakers.map((s) => ({ value: s.userId, label: s.name }))} />}
        </Field>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        {recording ? (
          <Button variant="danger" onClick={stopAll}>{t("ata.rec.stop")}</Button>
        ) : (
          <Button variant="primary" onClick={() => void start()} disabled={!consentOk} title={consentOk ? undefined : t("ata.rec.needConsent")}>{t("ata.rec.start")}</Button>
        )}
        <span aria-live="polite" className="font-[family-name:var(--ws-font-mono)] text-[length:var(--ws-text-body-sm)] tabular-nums text-ws-text-muted">
          {recording ? t("ata.rec.recording", { time: mm }) : audioUrl ? t("ata.rec.recorded", { time: mm }) : ""}
        </span>
      </div>
      {!consentOk ? <p className="text-[length:var(--ws-text-caption)] text-ws-text-muted">{t("ata.rec.needConsent")}</p> : null}
      {error ? <p role="alert" className="text-[length:var(--ws-text-body-sm)] text-ws-danger-ink">{t(`ata.rec.error.${error}`)}</p> : null}
      {interim ? <p aria-live="polite" className="text-[length:var(--ws-text-body-sm)] italic text-ws-text-muted">{interim}</p> : null}
      {audioUrl ? (
        <div className="grid gap-2">
          <audio controls src={audioUrl} aria-label={t("ata.rec.playback")} className="w-full" />
          <div className="flex flex-wrap items-center gap-2 text-[length:var(--ws-text-caption)] text-ws-text-muted">
            <span>{t("ata.rec.audioStays")}</span>
            <Button size="sm" variant="ghost" onClick={discard}>{t("ata.rec.discard")}</Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
