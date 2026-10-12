import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as T from "./types";

/** Os enums do front são cópia literal dos enums Java (mesmos nomes e ordem) — o teste lê os .java e compara. */
const DOMAIN = fileURLToPath(new URL("../../ws-domain/src/main/java/br/gov/pr/secid/workstation/domain/", import.meta.url));

function javaEnum(file: string): string[] {
  const src = fs.readFileSync(`${DOMAIN}${file}`, "utf8").replace(/\/\*\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
  const body = src.slice(src.indexOf("{", src.indexOf("enum ")) + 1);
  const constants = body.split(/[;}]/)[0]!;
  return constants.split(",").map((x) => x.trim()).filter((x) => /^[A-Z_]+$/.test(x));
}

const CASES: [string, readonly string[]][] = [
  ["common/TargetType.java", T.TARGET_TYPES],
  ["common/Visibility.java", T.VISIBILITIES],
  ["common/AccessClassification.java", T.ACCESS_CLASSES],
  ["social/ReactionType.java", T.REACTION_TYPES],
  ["social/IgnoredReason.java", T.IGNORED_REASONS],
  ["social/ShareChannel.java", T.SHARE_CHANNELS],
  ["social/FollowTargetType.java", T.FOLLOW_TARGET_TYPES],
  ["social/FollowStatus.java", T.FOLLOW_STATUSES],
  ["social/MuralKind.java", T.MURAL_KINDS],
  ["social/NotificationCategory.java", T.NOTIFICATION_CATEGORIES],
  ["social/NotificationType.java", T.NOTIFICATION_TYPES],
  ["mensageria/AssignmentStatus.java", T.ASSIGNMENT_STATUSES],
  ["mensageria/AssignmentOrigin.java", T.ASSIGNMENT_ORIGINS],
  ["mensageria/AssignmentTargetType.java", T.ASSIGNMENT_TARGET_TYPES],
  ["acervo/TaskType.java", T.TASK_TYPES],
  ["acervo/TaskState.java", T.TASK_STATES],
  ["acervo/TaskCategory.java", T.TASK_CATEGORIES],
  ["acervo/CoverMode.java", T.COVER_MODES],
  ["projetos/ProjectStatus.java", T.PROJECT_STATUSES],
  ["projetos/ProjectPhase.java", T.PROJECT_PHASES],
  ["projetos/ProjectCoverMode.java", T.PROJECT_COVER_MODES],
  ["projetos/SchemeOrigin.java", T.SCHEME_ORIGINS],
  ["identity/ProfileType.java", T.PROFILE_TYPES],
  ["identity/HypeVisibility.java", T.HYPE_VISIBILITIES],
];

describe("enums espelham o domínio Java", () => {
  for (const [file, values] of CASES) it(file, () => expect([...values]).toEqual(javaEnum(file)));

  it("records sociais: campos do front existem no record Java (Comment, Share, Remix, Follow, Assignment)", () => {
    const fields = (file: string) => [...fs.readFileSync(`${DOMAIN}${file}`, "utf8").matchAll(/\)\s+[\w<>, ]+\s+(\w+)[,)]/g)].map((m) => m[1]);
    expect(fields("social/Comment.java")).toEqual(expect.arrayContaining(["authorId", "targetType", "targetId", "parentCommentId", "contentMd", "editedAt", "deletedBy", "active"]));
    expect(fields("social/Share.java")).toEqual(expect.arrayContaining(["channel", "sessionId", "externalToken", "expiresAt"]));
    expect(fields("social/Remix.java")).toEqual(expect.arrayContaining(["sourceType", "sourceId", "resultType", "resultId"]));
    expect(fields("social/Follow.java")).toEqual(expect.arrayContaining(["followerId", "targetType", "targetId", "status"]));
    expect(fields("mensageria/Assignment.java")).toEqual(expect.arrayContaining(["fromUserId", "toUserId", "origin", "status", "dueAt", "message", "reason", "previousResponsibleId", "traceNodeId", "respondedAt"]));
  });
});
