// npm run check:approval  (ALTER_MODE=stub by default; ALTER_MODE=live for real Alter)
// Runs propose -> attemptWithoutApproval -> decide(true) on a fixture candidate and
// asserts the Approval fields, the timeline Events and the candidate status after each step.
// Uses an in-memory store shaped like the Prisma rows (Approval, Event, Candidate.status),
// so it runs before and without the Wasp server.
// Live mode: every invite goes to DEMO_INVITE_TO (forced to the team's demo inbox), and the
// script pauses for you to approve in Alter (it prints the approval URL).

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// npm scripts run with cwd = app/. Works whether app/package.json is ESM or CJS.
const appDir = process.cwd();
const repoDir = resolve(appDir, "..");

// Minimal .env.server loader (no dependency). Never prints values.
const envFile = resolve(appDir, ".env.server");
if (existsSync(envFile)) {
  for (const line of readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const DEMO_INBOX = "istgtspmosmfr@gmail.com";
const mode = process.env.ALTER_MODE === "live" ? "live" : "stub";
if (mode === "live") process.env.DEMO_INVITE_TO = DEMO_INBOX; // never invite anyone else from a test

async function main() {
const { proposeBooking, attemptWithoutApproval, decide } = await import("../src/server/integrations/alter");

const role = JSON.parse(readFileSync(resolve(repoDir, "fixtures/roles.json"), "utf8"))[0];
const approvalFixture = JSON.parse(readFileSync(resolve(repoDir, "fixtures/approval.json"), "utf8"));
const input = {
  candidate: { id: approvalFixture.candidateId, name: "Sam Rivera", email: approvalFixture.emailDraft.to },
  role: { title: role.title, companyName: role.companyName, founderName: role.founderName },
  slotIso: process.env.CHECK_SLOT_ISO, // optional; default = next weekday 3 PM ET
};

// In-memory "rows"
const db = { candidateStatus: "EVALUATING" as string, approval: null as any, events: [] as any[] };
let failures = 0;
const check = (step: string, ok: boolean, detail: string) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${step}: ${detail}`);
  if (!ok) failures++;
};
const apply = (out: any) => {
  db.approval = out.approval;
  db.events.push(...out.events.map((e: any, i: number) => ({ id: `ev-${db.events.length + i}`, candidateId: input.candidate.id, ...e })));
  if (out.candidateStatus) db.candidateStatus = out.candidateStatus;
};
const lastKinds = (n: number) => db.events.slice(-n).map((e) => e.kind).join(",");

console.log(`check:approval, mode=${mode}${mode === "live" ? `, invites only to ${DEMO_INBOX}` : ""}\n`);

try {
  // 1. propose
  const p = await proposeBooking(input);
  apply(p);
  check(
    "1 propose",
    db.approval.status === "PENDING" && db.candidateStatus === "AWAITING_APPROVAL" && lastKinds(1) === "booking_proposed" &&
      (mode === "stub" || !!db.approval.alterRef),
    `status=${db.approval.status} candidate=${db.candidateStatus} alterRef=${db.approval.alterRef} event=${lastKinds(1)}`,
  );
  if (p.approvalUrl) console.log(`      Alter approval URL: ${p.approvalUrl}`);

  // 2. attempt without approval
  apply(await attemptWithoutApproval(db.approval, input));
  const d = db.approval.deniedAttempt;
  check(
    "2 attemptWithoutApproval",
    !!d && db.approval.status === "PENDING" && lastKinds(1) === "denied_attempt" &&
      (mode === "stub" ? d.reason.startsWith("In-app gate") : d.reason.startsWith("Alter")),
    `reason="${d?.reason}" auditRef=${d?.auditRef} event=${lastKinds(1)}`,
  );

  // 3. approve
  if (mode === "live") {
    console.log(`\n      Approve it in Alter now (the FIRST approval, not the "do not approve" one):\n      ${p.approvalUrl}\n      Waiting up to ${Number(process.env.ALTER_APPROVAL_WAIT_MS ?? 120000) / 1000}s...\n`);
  }
  const a = await decide(db.approval, true, input);
  apply(a);
  check(
    "3 decide(approve)",
    db.approval.status === "APPROVED" && db.candidateStatus === "BOOKED" &&
      (mode === "stub" ? lastKinds(1) === "approved" && !!a.calendarUrl?.startsWith("https://calendar.google.com/") : lastKinds(2) === "approved,invite_sent"),
    `status=${db.approval.status} candidate=${db.candidateStatus} events=${lastKinds(mode === "stub" ? 1 : 2)}`,
  );
  if (a.calendarUrl) console.log(`      calendar: ${a.calendarUrl}`);

  // 4. the gate holds after a decision
  let refused = false;
  try { await attemptWithoutApproval(db.approval, input); } catch { refused = true; }
  check("4 no second decision", refused, "attempt after decide is refused");
} catch (e) {
  failures++;
  console.log(`FAIL  threw: ${(e as Error).name}: ${(e as Error).message}`);
}

console.log("\nTimeline:");
for (const e of db.events) console.log(`  ${e.at}  ${e.kind.padEnd(16)} ${e.detail}`);
console.log(`\n${failures === 0 ? "ALL PASS" : `${failures} FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
}

main();
