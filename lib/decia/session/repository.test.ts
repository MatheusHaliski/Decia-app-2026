import { describe, expect, it } from "vitest";
import { createAuditLog } from "@/lib/decia/audit/log";
import { DEMO_PEOPLE } from "@/lib/decia/fixtures";
import { createMemoryLedger } from "@/lib/points/ledger";
import { buildDemoOrgPolicy, buildDemoSessions, DEMO_SESSION_IDS } from "./fixtures";
import { validateMinutes, type MinutesTextLabels } from "./meeting";
import { createMemorySessionRepository } from "./repository";
import type { MinutesDraft } from "./types";

const NOW = new Date("2026-11-12T15:00:00Z");
const later = (h: number) => new Date(NOW.getTime() + h * 3_600_000);
const LABELS: MinutesTextLabels = {
  title: (t, d) => `Ata — ${t} (${d})`, participants: "Participantes", agenda: "Pauta", decisions: "Decisões", followUps: "Encaminhamentos", pending: "Pendências",
  toDefine: "a definir", none: "nenhum", refused: "recusado", formatDate: (d) => d.split("-").reverse().join("/"),
};
const setup = () => {
  const ledger = createMemoryLedger();
  const audit = createAuditLog();
  const repo = createMemorySessionRepository(buildDemoSessions(NOW), buildDemoOrgPolicy(NOW), { ledger, audit, people: DEMO_PEOPLE, search: () => [] });
  return { repo, ledger, audit };
};
const S = DEMO_SESSION_IDS.infra;

const TRANSCRIPT = `Pauta: custos de saída de dados; cronograma
Bruno Exemplo: Fica aprovado pedir a cotação de egress a dois provedores.
Carla Exemplo: Eu fico com a cotação da AWS até sexta.
Pessoa Exemplo: Diego vai consolidar a planilha em 5 dias úteis.
Bruno Exemplo: Fulano deve revisar o contrato até 30/11.`;

function compiled(repo: ReturnType<typeof setup>["repo"]) {
  const started = repo.startMeeting(S, "u-pessoa", { title: "Reunião de custos", baseDate: "2026-11-12", source: "TRANSCRICAO_COLADA", participantIds: ["u-bruno", "u-carla", "u-diego"] }, NOW);
  if (!started.ok) throw new Error(started.reason);
  const c = repo.compileMeeting(S, "u-pessoa", started.meetingId, TRANSCRIPT, null);
  if (!c.ok) throw new Error(c.reason);
  return { meetingId: started.meetingId, draft: c.draft };
}

describe("Ata Viva: da transcrição colada à ratificação", () => {
  it("compila decisões e encaminhamentos com responsável casado e prazo; o que não casa fica a definir", () => {
    const { repo } = setup();
    const { draft } = compiled(repo);
    expect(draft.decisions.map((d) => d.text)).toEqual(["Fica aprovado pedir a cotação de egress a dois provedores."]);
    expect(draft.followUps.map((f) => [f.action, f.responsible.status === "CASADO" ? f.responsible.userId : f.responsible.status, f.due?.date])).toEqual([
      ["Cotação da AWS", "u-carla", "2026-11-13"],
      ["Consolidar a planilha", "u-diego", "2026-11-19"],
      ["Revisar o contrato", "A_DEFINIR", "2026-11-30"],
    ]);
    expect(validateMinutes(draft).map((i) => i.problem)).toEqual(["SEM_DECISAO", "SEM_DECISAO", "SEM_DECISAO"]);
  });

  it("ratificar exige decidir cada encaminhamento e responsável/prazo nos aceitos; depois publica a ata, cria tarefas, audita e pontua uma vez", () => {
    const { repo, ledger, audit } = setup();
    const { meetingId, draft } = compiled(repo);
    expect(repo.ratifyMeeting(S, "u-pessoa", meetingId, LABELS, NOW)).toEqual({ ok: false, reason: "ATA_INVALIDA" });
    const reviewed: MinutesDraft = {
      ...draft,
      followUps: [
        { ...draft.followUps[0]!, accepted: true },
        { ...draft.followUps[1]!, accepted: true, action: "Consolidar a planilha de custos" },
        { ...draft.followUps[2]!, accepted: false },
      ],
    };
    expect(repo.updateDraft(S, "u-pessoa", meetingId, reviewed).ok).toBe(true);
    const r = repo.ratifyMeeting(S, "u-pessoa", meetingId, LABELS, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.note).toMatchObject({ event: "ATA_RATIFICADA", status: "CREDITADO", delta: 3 });
    const s = repo.get(S)!;
    const meeting = s.meetings.find((m) => m.id === meetingId)!;
    expect(meeting).toMatchObject({ status: "CONFIRMADA", version: 1, ratifiedBy: "u-pessoa" });
    expect(Date.parse(meeting.ratificationDeadlineAt!) - NOW.getTime()).toBe(48 * 3_600_000);
    expect(s.messages.at(-1)).toMatchObject({ kind: "ATA", meetingId, minutesVersion: 1 });
    expect(s.followUps.filter((f) => f.meetingId === meetingId).map((f) => [f.action, f.responsibleId, f.dueDate])).toEqual([
      ["Cotação da AWS", "u-carla", "2026-11-13"],
      ["Consolidar a planilha de custos", "u-diego", "2026-11-19"],
    ]);
    expect(audit.list().map((a) => [a.target.kind, a.action])).toEqual([
      ["ATA", "EDITOU_E_ACEITOU"], ["ENCAMINHAMENTO", "ACEITOU"], ["ENCAMINHAMENTO", "EDITOU_E_ACEITOU"], ["ENCAMINHAMENTO", "REJEITOU"],
    ]);
    expect(audit.list()[0]!.policy).toEqual({ mode: "SUGESTOES", version: 2 });
    // participantes ratificam (cada um uma vez); o mesmo fato nunca pontua duas vezes
    const carla = repo.ratifyAsParticipant(S, "u-carla", meetingId, later(1));
    expect(carla.ok && carla.note).toMatchObject({ status: "CREDITADO", delta: 3 });
    expect(repo.ratifyAsParticipant(S, "u-carla", meetingId, later(2))).toEqual({ ok: false, reason: "JA_RATIFICOU" });
    expect(repo.ratifyAsParticipant(S, "u-elisa", meetingId, later(2))).toEqual({ ok: false, reason: "NAO_PARTICIPOU" });
    expect(repo.ratifyAsParticipant(S, "u-bruno", meetingId, later(49))).toEqual({ ok: false, reason: "PRAZO_ENCERRADO" });
    expect(ledger.entries("u-carla").filter((e) => e.event === "ATA_RATIFICADA")).toHaveLength(1);
    expect(ledger.balance("u-pessoa")).toBe(3);
  });

  it("contestar devolve a ata à correção e avisa quem organizou; a nova ratificação é a versão 2 e não pontua de novo", () => {
    const { repo, ledger } = setup();
    const { meetingId, draft } = compiled(repo);
    repo.updateDraft(S, "u-pessoa", meetingId, { ...draft, followUps: draft.followUps.map((f) => ({ ...f, accepted: f.responsible.status === "CASADO" })) });
    expect(repo.ratifyMeeting(S, "u-pessoa", meetingId, LABELS, NOW).ok).toBe(true);
    expect(repo.contestMeeting(S, "u-bruno", meetingId, "curto", later(1))).toEqual({ ok: false, reason: "MOTIVO_OBRIGATORIO" });
    expect(repo.contestMeeting(S, "u-bruno", meetingId, "A decisão foi pedir três cotações, não duas.", later(1)).ok).toBe(true);
    const s = repo.get(S)!;
    expect(s.meetings.find((m) => m.id === meetingId)!.status).toBe("CONTESTADA");
    expect(s.unread["u-pessoa"]?.length).toBe(1);
    expect(repo.reopenMinutes(S, "u-bruno", meetingId)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    expect(repo.reopenMinutes(S, "u-pessoa", meetingId).ok).toBe(true);
    const again = repo.ratifyMeeting(S, "u-pessoa", meetingId, LABELS, later(2));
    expect(again.ok && again.note).toMatchObject({ status: "DUPLICADO" });
    expect(repo.get(S)!.meetings.find((m) => m.id === meetingId)!.version).toBe(2);
    expect(repo.get(S)!.followUps.filter((f) => f.meetingId === meetingId)).toHaveLength(2); // sem duplicar encaminhamentos
    expect(ledger.entries("u-pessoa").filter((e) => e.event === "ATA_RATIFICADA")).toHaveLength(1);
  });

  it("encaminhamento cumprido: pelo responsável ou proprietário, pontua o responsável uma vez", () => {
    const { repo, ledger } = setup();
    const f = DEMO_SESSION_IDS.fornecedor;
    const open = repo.get(f)!.followUps.find((x) => x.status === "ABERTO")!;
    expect(repo.completeFollowUp(f, "u-elisa", open.id, NOW)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const r = repo.completeFollowUp(f, "u-pessoa", open.id, NOW);
    expect(r.ok && r.note).toMatchObject({ event: "ENCAMINHAMENTO_CUMPRIDO", userId: "u-pessoa", status: "CREDITADO", delta: 5 });
    expect(repo.completeFollowUp(f, "u-pessoa", open.id, NOW)).toEqual({ ok: false, reason: "JA_CUMPRIDO" });
    expect(ledger.balance("u-pessoa")).toBe(5);
  });

  it("gravação no navegador exige o consentimento de todos os participantes antes de compilar", () => {
    const { repo } = setup();
    const m = repo.startMeeting(S, "u-pessoa", { title: "Gravada", baseDate: "2026-11-12", source: "GRAVACAO_NAVEGADOR", participantIds: ["u-bruno"] }, NOW);
    if (!m.ok) throw new Error(m.reason);
    expect(repo.compileMeeting(S, "u-pessoa", m.meetingId, "Bruno Exemplo: oi", null)).toEqual({ ok: false, reason: "CONSENTIMENTO_PENDENTE" });
    expect(repo.setConsent(S, "u-carla", m.meetingId, "u-bruno", true)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    repo.setConsent(S, "u-bruno", m.meetingId, "u-bruno", true);
    repo.setConsent(S, "u-pessoa", m.meetingId, "u-pessoa", true);
    expect(repo.compileMeeting(S, "u-pessoa", m.meetingId, "Bruno Exemplo: Fica aprovado o plano.", null).ok).toBe(true);
  });
});

describe("pontos do chat (RF42) sem incentivar volume", () => {
  it("argumento com evidência: credita, teto de 10 por sessão, nota discreta na própria mensagem; sem confirmação não pontua", () => {
    const { repo, ledger } = setup();
    const ref = { kind: "DOCUMENTO" as const, label: "Fonte", href: null };
    for (let i = 0; i < 11; i++) {
      const r = repo.post(S, "u-carla", { kind: "EVIDENCIA", text: `Evidência número ${i} com dados distintos: medição ${i * 17} da série ${i}.`, reference: ref }, later(i));
      if (!r.ok) throw new Error(r.reason);
      const note = r.session.messages.at(-1)!.points![0]!;
      expect(note.status).toBe(i < 10 ? "CREDITADO" : "TETO_ATINGIDO");
    }
    expect(ledger.balance("u-carla")).toBe(50);
    const short = repo.post(S, "u-bruno", { kind: "EVIDENCIA", text: "curta", reference: ref }, NOW);
    expect(short.ok && short.session.messages.at(-1)!.points).toEqual([{ event: "ARGUMENTO_EVIDENCIA", userId: "u-bruno", delta: null, status: "NAO_CONFIRMADO", reason: "TEXTO_CURTO" }]);
    expect(repo.post(S, "u-bruno", { kind: "MENSAGEM", text: "Concordo." }, NOW).ok).toBe(true);
    expect(ledger.balance("u-bruno")).toBe(0);
  });

  it("pergunta respondida pontua quem respondeu uma única vez", () => {
    const { repo, ledger } = setup();
    const s = repo.get(S)!;
    const q = s.messages.find((m) => m.kind === "PERGUNTA" && m.author.kind === "PESSOA" && m.author.userId === "u-carla")!;
    const a = s.messages.find((m) => m.replyTo === q.id)!;
    const r = repo.acceptAnswer(S, "u-carla", q.id, a.id, NOW);
    expect(r.ok && r.note).toMatchObject({ userId: "u-bruno", status: "CREDITADO", delta: 4 });
    expect(repo.acceptAnswer(S, "u-carla", q.id, a.id, NOW)).toEqual({ ok: false, reason: "JA_RESPONDIDA" });
    expect(ledger.balance("u-bruno")).toBe(4);
  });
});

describe("propostas da IA e política", () => {
  const MINUTA_LABELS = { heading: "Resumo", evidence: (n: number) => `Evidências (${n})`, questions: (n: number) => `Perguntas (${n})`, decisions: (n: number) => `Decisões (${n})`, followUps: (o: number, d: number) => `Encaminhamentos (${o}/${d})`, none: "nenhum", formatDate: (d: string) => d };

  it("aceitar, editar e aceitar, rejeitar e reverter ficam na trilha com antes · proposta · depois e a política vigente", () => {
    const { repo, audit } = setup();
    const p = repo.get(S)!.proposals.find((x) => x.id.endsWith("p-new"))!;
    expect(repo.resolveProposal(S, "u-diego", p.id, { kind: "ACEITAR" }, NOW)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const edited = `${p.text}\nObservação da Carla.`;
    expect(repo.resolveProposal(S, "u-carla", p.id, { kind: "EDITAR_E_ACEITAR", text: edited }, NOW).ok).toBe(true);
    const s = repo.get(S)!;
    expect(s.minuta).toMatchObject({ revision: 5, text: edited });
    const rec = audit.list().at(-1)!;
    expect(rec).toMatchObject({ action: "EDITOU_E_ACEITOU", actorId: "u-carla", policy: { mode: "SUGESTOES", version: 2 }, proposed: p.text, after: edited });
    expect(rec.before).toBe(p.baseText);
    expect(repo.revertProposal(S, "u-pessoa", p.id, "x", NOW)).toEqual({ ok: false, reason: "MOTIVO_OBRIGATORIO" });
    expect(repo.revertProposal(S, "u-pessoa", p.id, "Texto da IA trouxe pergunta já respondida.", later(1)).ok).toBe(true);
    expect(repo.get(S)!.minuta).toMatchObject({ revision: 6, text: p.baseText });
    expect(audit.list().at(-1)).toMatchObject({ action: "REVERTEU", before: edited, after: p.baseText });
    expect(audit.verify()).toEqual({ ok: true });
  });

  it("trocar o modo invalida a proposta pendente e nova proposta a pedido só onde o modo permite", () => {
    const { repo } = setup();
    const p = repo.get(S)!.proposals.find((x) => x.id.endsWith("p-new"))!;
    expect(repo.changeMode(S, "u-pessoa", "SOB_SOLICITACAO", null, NOW).ok).toBe(true);
    expect(repo.resolveProposal(S, "u-pessoa", p.id, { kind: "ACEITAR" }, NOW)).toEqual({ ok: false, reason: "PROPOSTA_OBSOLETA_POLITICA" });
    expect(repo.requestProposal(S, "u-pessoa", "MANUAL", MINUTA_LABELS, NOW)).toEqual({ ok: false, reason: "MODO_NAO_PERMITE" });
    const r = repo.requestProposal(S, "u-pessoa", "SOB_SOLICITACAO", MINUTA_LABELS, NOW);
    expect(r.ok && r.session.proposals.at(-1)).toMatchObject({ status: "PENDENTE", policyVersion: 3, requestedBy: "u-pessoa", mode: "SOB_SOLICITACAO" });
    expect(repo.editMinuta(S, "u-bruno", "Texto novo do Bruno", NOW).ok).toBe(true);
    const last = repo.get(S)!.proposals.at(-1)!;
    expect(repo.resolveProposal(S, "u-pessoa", last.id, { kind: "ACEITAR" }, NOW)).toEqual({ ok: false, reason: "PROPOSTA_OBSOLETA_REVISAO" });
  });

  it("mudar o teto da organização avisa todos os membros das sessões e invalida propostas", () => {
    const { repo } = setup();
    expect(repo.setOrgPolicy("CHEFE", { ceiling: "MANUAL", defaultMode: "MANUAL" }, NOW)).toEqual({ ok: false, reason: "SEM_PERMISSAO" });
    const r = repo.setOrgPolicy("ADMIN", { ceiling: "SOB_SOLICITACAO", defaultMode: "MANUAL" }, NOW);
    if (!r.ok) throw new Error(r.reason);
    expect(r.notified).toBe(5 + 4 + 3);
    expect(r.invalidated).toBe(1);
    const s = repo.get(S)!;
    expect(s.messages.at(-1)!.notice).toMatchObject({ kind: "TETO_ALTERADO", ceiling: "SOB_SOLICITACAO", before: "SUGESTOES", after: "SOB_SOLICITACAO", by: "org:ADMIN" });
    expect(s.unread["u-pessoa"]).toHaveLength(1);
    const created = repo.create({ title: "Nova sessão", objective: "Testar o padrão", participants: [{ userId: "u-ana", role: "EDITOR" }] }, "u-pessoa", NOW);
    expect(created.ok && created.session.policy.mode).toBe("MANUAL");
    expect(created.ok && created.session.participants.map((p) => p.role)).toEqual(["PROPRIETARIO", "EDITOR"]);
  });
});
