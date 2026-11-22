import { prisma } from "wasp/server";
import type { Approval as ApprovalRow, Candidate, Event, Role as RoleRow } from "wasp/entities";
import type { Approval, CandidateStatus, TimelineEvent } from "./contracts";
import type { CandidateView, JsonValue, RoleView } from "./views";

export function parseJson<T>(value: string | null, field: string, id: string): T | null {
  if (value === null) return null;
  try {
    return JSON.parse(value) as T;
  } catch (err) {
    throw new Error(`Stored ${field} for ${id} is not valid JSON: ${(err as Error).message}`);
  }
}

export function toRoleView(role: RoleRow): RoleView {
  return {
    id: role.id,
    title: role.title,
    companyName: role.companyName,
    founderName: role.founderName,
    rubric: parseJson<string[]>(role.rubric, "rubric", role.id) ?? [],
    questions: parseJson<string[]>(role.questions, "questions", role.id) ?? [],
    sourceUrl: role.sourceUrl,
    isOfficialPosting: role.isOfficialPosting,
  };
}

export function toApproval(row: ApprovalRow): Approval {
  return {
    id: row.id,
    candidateId: row.candidateId,
    slotIso: row.slotIso,
    status: row.status as Approval["status"],
    alterRef: row.alterRef,
    emailDraft: parseJson<Approval["emailDraft"]>(row.emailDraft, "emailDraft", row.id)!,
    deniedAttempt: parseJson<NonNullable<Approval["deniedAttempt"]>>(row.deniedAttempt, "deniedAttempt", row.id),
  };
}

export function toTimelineEvent(row: Event): TimelineEvent {
  return {
    id: row.id,
    candidateId: row.candidateId,
    at: row.at.toISOString(),
    kind: row.kind as TimelineEvent["kind"],
    detail: row.detail,
  };
}

type CandidateWithRelations = Candidate & { role: RoleRow; approvals: ApprovalRow[]; events: Event[] };

export const candidateInclude = {
  role: true,
  approvals: { orderBy: { createdAt: "asc" } },
  events: { orderBy: { at: "asc" } },
} as const;

export function toCandidateView(c: CandidateWithRelations): CandidateView {
  return {
    id: c.id,
    roleId: c.roleId,
    name: c.name,
    email: c.email,
    githubUser: c.githubUser,
    linkedinUrl: c.linkedinUrl,
    consentAt: c.consentAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
    status: c.status as CandidateStatus,
    conversationId: c.conversationId,
    audioPath: c.audioPath,
    audioUrl: c.audioPath ? `/api/audio/${c.id}` : null,
    traceUrl: c.traceUrl,
    dossier: parseJson(c.dossier, "dossier", c.id),
    transcript: parseJson(c.transcript, "transcript", c.id),
    durationSecs: c.durationSecs,
    analysis: parseJson<JsonValue>(c.analysis, "analysis", c.id),
    scorecard: parseJson(c.scorecard, "scorecard", c.id),
    role: toRoleView(c.role),
    approvals: c.approvals.map(toApproval),
    events: c.events.map(toTimelineEvent),
  };
}

export async function logEvent(candidateId: string, kind: TimelineEvent["kind"], detail = ""): Promise<void> {
  await prisma.event.create({ data: { candidateId, kind, detail } });
}

export async function setStatus(candidateId: string, status: CandidateStatus): Promise<void> {
  await prisma.candidate.update({ where: { id: candidateId }, data: { status } });
}

/** Next Monday-to-Friday after today, at 15:00 server-local time. */
export function defaultSlotIso(now = new Date()): string {
  const slot = new Date(now);
  slot.setHours(15, 0, 0, 0);
  do {
    slot.setDate(slot.getDate() + 1);
  } while (slot.getDay() === 0 || slot.getDay() === 6);
  return slot.toISOString();
}
