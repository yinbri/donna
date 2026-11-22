import type { DbSeedFn } from "wasp/server";
import { FIXTURE_APPROVAL, FIXTURE_CONVERSATION, FIXTURE_DOSSIER, FIXTURE_PANEL, FIXTURE_ROLES } from "./fixtures";

const FIXTURE_CANDIDATE_ID = FIXTURE_APPROVAL.candidateId;

export const seedDev: DbSeedFn = async (prisma) => {
  for (const role of FIXTURE_ROLES) {
    const data = {
      title: role.title,
      companyName: role.companyName,
      founderName: role.founderName,
      rubric: JSON.stringify(role.rubric),
      questions: JSON.stringify(role.questions),
      sourceUrl: role.sourceUrl,
      isOfficialPosting: role.isOfficialPosting,
    };
    await prisma.role.upsert({ where: { id: role.id }, create: { id: role.id, ...data }, update: data });
  }

  const candidate = {
    roleId: FIXTURE_ROLES[0].id,
    name: "Sam Rivera",
    email: FIXTURE_APPROVAL.emailDraft.to,
    githubUser: "samrivera",
    linkedinUrl: null,
    consentAt: new Date("2026-11-22T12:00:00Z"),
    status: "AWAITING_APPROVAL",
    dossier: JSON.stringify(FIXTURE_DOSSIER),
    conversationId: FIXTURE_CONVERSATION.conversationId,
    transcript: JSON.stringify(FIXTURE_CONVERSATION.transcript),
    durationSecs: FIXTURE_CONVERSATION.durationSecs,
    analysis: JSON.stringify(null),
    scorecard: JSON.stringify(FIXTURE_PANEL),
    audioPath: null,
    traceUrl: null,
  };
  await prisma.candidate.upsert({
    where: { id: FIXTURE_CANDIDATE_ID },
    create: { id: FIXTURE_CANDIDATE_ID, ...candidate },
    update: candidate,
  });

  const approval = {
    candidateId: FIXTURE_CANDIDATE_ID,
    slotIso: FIXTURE_APPROVAL.slotIso,
    status: FIXTURE_APPROVAL.status,
    alterRef: FIXTURE_APPROVAL.alterRef,
    emailDraft: JSON.stringify(FIXTURE_APPROVAL.emailDraft),
    deniedAttempt: null,
  };
  await prisma.approval.upsert({
    where: { id: FIXTURE_APPROVAL.id },
    create: { id: FIXTURE_APPROVAL.id, ...approval },
    update: approval,
  });

  // Replace the fixture timeline wholesale so reseeding never duplicates it.
  await prisma.event.deleteMany({ where: { candidateId: FIXTURE_CANDIDATE_ID } });
  const start = candidate.consentAt.getTime();
  const events: [string, string][] = [
    ["applied", "Sam Rivera applied for Founding Engineer"],
    ["research_done", FIXTURE_DOSSIER.summary],
    ["call_started", "Fixture call"],
    ["call_ended", `${FIXTURE_CONVERSATION.transcript.length} turns, ${FIXTURE_CONVERSATION.durationSecs}s, no audio`],
    ["evaluated", `${FIXTURE_PANEL.recommendation}, overall ${FIXTURE_PANEL.overall}`],
    ["booking_proposed", `Slot ${FIXTURE_APPROVAL.slotIso}, approval ${FIXTURE_APPROVAL.id}`],
  ];
  await prisma.event.createMany({
    data: events.map(([kind, detail], n) => ({
      candidateId: FIXTURE_CANDIDATE_ID,
      kind,
      detail,
      at: new Date(start + n * 60_000),
    })),
  });
};
