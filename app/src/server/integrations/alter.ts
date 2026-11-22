// Approval gate for Donna's calendar writes. Lane: Dev 4 (trust + ops).
//
// ALTER_MODE=stub (default): an in-app gate. Same contract, honestly labelled
//   "in-app gate", never "Alter". Approve returns a prefilled Google Calendar link;
//   nothing is sent automatically.
// ALTER_MODE=live: real Alter (@alter-ai/alter-sdk). Google's token stays in Alter.
//   A policy in the Alter portal requires human approval for calendar.events.insert.
//   - proposeBooking: proxyRequest(insert) -> Alter returns PendingApproval (not executed).
//   - attemptWithoutApproval: the same write again with no approval; whatever Alter
//     returns (held / denied) is stored as-is. If Alter executes it, we throw: no fake denial.
//   - decide(true): the founder approves in Alter (approvalUrl); we awaitApproval until
//     Alter runs the insert, then record the event. Google emails the invite (sendUpdates=all).
//
// These functions never touch Prisma. They return the new Approval, the timeline
// events to write and the next candidate status; the Wasp operations persist them.
//
// Env: ALTER_MODE, ALTER_API_KEY, GOOGLE_GRANT_ID, ALTER_APPROVAL_WAIT_MS (default 120000),
//      DEMO_INVITE_TO (if set, every invite goes to this address instead of the candidate).

import type { Approval, CandidateStatus, TimelineEvent } from "../contracts";

export type AlterMode = "stub" | "live";
export const alterMode = (): AlterMode => (process.env.ALTER_MODE === "live" ? "live" : "stub");

export interface BookingInput {
  candidate: { id: string; name: string; email: string };
  role: { title: string; companyName: string; founderName: string };
  slotIso?: string;
}

export interface EventDraft {
  at: string;
  kind: TimelineEvent["kind"];
  detail: string;
}

export interface AlterOutcome {
  approval: Approval;
  events: EventDraft[];
  candidateStatus?: CandidateStatus;
  /** live: where the founder approves in Alter. stub: undefined. */
  approvalUrl?: string;
  /** live: Google event link once booked. stub: prefilled Calendar link (not sent). */
  calendarUrl?: string;
}

const SLOT_MINUTES = 30;
const now = () => new Date().toISOString();
const ev = (kind: EventDraft["kind"], detail: string): EventDraft => ({ at: now(), kind, detail });

// ---------- shared helpers ----------

/** Next weekday at 15:00 Eastern (EST, -05:00 in late November). */
export function defaultSlot(from = new Date()): string {
  const d = new Date(from);
  do d.setUTCDate(d.getUTCDate() + 1);
  while ([0, 6].includes(d.getUTCDay()));
  const ymd = d.toISOString().slice(0, 10);
  return `${ymd}T15:00:00-05:00`;
}

function slotEnd(slotIso: string): string {
  return new Date(new Date(slotIso).getTime() + SLOT_MINUTES * 60_000).toISOString();
}

function attendeeEmail(input: BookingInput): string {
  return process.env.DEMO_INVITE_TO || input.candidate.email;
}

function slotLabel(slotIso: string): string {
  return new Date(slotIso).toLocaleString("en-US", {
    timeZone: "America/Toronto",
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function emailDraft(input: BookingInput, slotIso: string): Approval["emailDraft"] {
  const first = input.candidate.name.split(" ")[0];
  return {
    to: attendeeEmail(input),
    subject: `Interview with ${input.role.founderName} at ${input.role.companyName}`,
    body:
      `Hi ${first}, thanks for the chat with Donna. ${input.role.founderName} would like to meet on ` +
      `${slotLabel(slotIso)} ET about the ${input.role.title} role. The calendar invite is attached. ` +
      `Reply here if that doesn't work.`,
  };
}

function calendarEventBody(input: BookingInput, slotIso: string) {
  return {
    summary: `Interview: ${input.candidate.name} × ${input.role.companyName} (${input.role.title})`,
    description: `Booked by Donna after ${input.role.founderName} approved it.`,
    start: { dateTime: new Date(slotIso).toISOString() },
    end: { dateTime: slotEnd(slotIso) },
    attendees: [{ email: attendeeEmail(input) }],
  };
}

/** Prefilled Google Calendar "add event" link. Opening it sends nothing by itself. */
export function calendarTemplateUrl(input: BookingInput, slotIso: string): string {
  const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const body = calendarEventBody(input, slotIso);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: body.summary,
    dates: `${fmt(slotIso)}/${fmt(slotEnd(slotIso))}`,
    details: body.description,
    add: attendeeEmail(input),
  });
  return `https://calendar.google.com/calendar/render?${q.toString()}`;
}

function requirePending(approval: Approval, action: string) {
  if (approval.status !== "PENDING") {
    throw new Error(`Cannot ${action}: approval ${approval.id} is ${approval.status}, not PENDING`);
  }
}

// ---------- public API ----------

export async function proposeBooking(input: BookingInput): Promise<AlterOutcome> {
  return alterMode() === "live" ? live.propose(input) : stub.propose(input);
}

export async function attemptWithoutApproval(approval: Approval, input: BookingInput): Promise<AlterOutcome> {
  requirePending(approval, "attempt a write");
  return alterMode() === "live" ? live.attempt(approval, input) : stub.attempt(approval);
}

export async function decide(approval: Approval, approve: boolean, input: BookingInput): Promise<AlterOutcome> {
  requirePending(approval, "decide");
  return alterMode() === "live" ? live.decide(approval, approve, input) : stub.decide(approval, approve, input);
}

// ---------- stub: in-app gate ----------

let stubCounter = 0;

const stub = {
  async propose(input: BookingInput): Promise<AlterOutcome> {
    const slotIso = input.slotIso ?? defaultSlot();
    const approval: Approval = {
      id: `approval-${input.candidate.id}-${Date.now()}`,
      candidateId: input.candidate.id,
      slotIso,
      status: "PENDING",
      alterRef: null,
      emailDraft: emailDraft(input, slotIso),
      deniedAttempt: null,
    };
    return {
      approval,
      candidateStatus: "AWAITING_APPROVAL",
      events: [ev("booking_proposed", `${slotLabel(slotIso)} ET held for founder approval (in-app gate)`)],
    };
  },

  async attempt(approval: Approval): Promise<AlterOutcome> {
    const deniedAttempt = {
      at: now(),
      reason: "In-app gate (Alter not connected): calendar write blocked, no founder approval on record.",
      auditRef: `in-app-gate-${++stubCounter}`,
    };
    return {
      approval: { ...approval, deniedAttempt },
      events: [ev("denied_attempt", "Donna tried to book without approval. Blocked by the in-app gate.")],
    };
  },

  async decide(approval: Approval, approve: boolean, input: BookingInput): Promise<AlterOutcome> {
    if (!approve) {
      return {
        approval: { ...approval, status: "REJECTED" },
        candidateStatus: "REJECTED",
        events: [ev("rejected", "Founder rejected the proposed interview.")],
      };
    }
    const calendarUrl = calendarTemplateUrl(input, approval.slotIso);
    return {
      approval: { ...approval, status: "APPROVED" },
      candidateStatus: "BOOKED",
      calendarUrl,
      // No invite_sent event: in stub mode nothing is sent until a person saves the event.
      events: [ev("approved", "Founder approved (in-app gate). Open the prefilled Google Calendar link to send the invite.")],
    };
  },
};

// ---------- live: Alter ----------

const CAL_INSERT_URL = "https://www.googleapis.com/calendar/v3/calendars/primary/events";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Sdk = any;
let sdkPromise: Promise<Sdk> | null = null;
let appClient: Sdk | null = null;

async function sdk(): Promise<Sdk> {
  sdkPromise ??= import("@alter-ai/alter-sdk");
  return sdkPromise;
}

async function client(): Promise<Sdk> {
  if (appClient) return appClient;
  if (!process.env.ALTER_API_KEY) throw new Error("ALTER_MODE=live but ALTER_API_KEY is not set");
  const { App } = await sdk();
  appClient = new App({ apiKey: process.env.ALTER_API_KEY });
  return appClient;
}

function grantId(): string {
  const g = process.env.GOOGLE_GRANT_ID;
  if (!g) throw new Error("ALTER_MODE=live but GOOGLE_GRANT_ID is not set (run the Alter connect step)");
  return g;
}

async function sendInsert(input: BookingInput, slotIso: string, reason: string, step: string) {
  const app = await client();
  const { HttpMethod } = await sdk();
  return app.proxyRequest({
    method: HttpMethod.POST,
    url: CAL_INSERT_URL,
    grantId: grantId(),
    json: calendarEventBody(input, slotIso),
    queryParams: { sendUpdates: "all" },
    reason,
    context: { candidateId: input.candidate.id, step },
  });
}

/** Alter's own words from an SDK error, with any ids it carries. */
function describeAlterError(e: unknown): { message: string; ref: string | null } {
  const err = e as { name?: string; message?: string; policyError?: string; statusCode?: number; details?: Record<string, unknown> };
  const d = err.details ?? {};
  const ref =
    (d.approval_id as string) ?? (d.approvalId as string) ?? (d.request_id as string) ?? (d.trace_id as string) ?? null;
  const parts = [err.name, err.statusCode ? `HTTP ${err.statusCode}` : null, err.policyError, err.message].filter(Boolean);
  return { message: `Alter: ${parts.join(" · ")}`, ref };
}

const live = {
  async propose(input: BookingInput): Promise<AlterOutcome> {
    const { PendingApproval } = await sdk();
    const slotIso = input.slotIso ?? defaultSlot();
    const res = await sendInsert(
      input,
      slotIso,
      `Donna proposes interviewing ${input.candidate.name} for ${input.role.title} on ${slotLabel(slotIso)} ET`,
      "propose",
    );
    if (!(res instanceof PendingApproval)) {
      // The write ran with no human in the loop: the policy is missing. Say so; never pretend.
      throw new Error(
        `Alter executed the calendar write without approval (HTTP ${res.statusCode}). ` +
          `Add a "Require human approval" policy for calendar.events.insert before demoing.`,
      );
    }
    const approval: Approval = {
      id: `approval-${input.candidate.id}-${Date.now()}`,
      candidateId: input.candidate.id,
      slotIso,
      status: "PENDING",
      alterRef: res.approvalId,
      emailDraft: emailDraft(input, slotIso),
      deniedAttempt: null,
    };
    return {
      approval,
      approvalUrl: res.approvalUrl,
      candidateStatus: "AWAITING_APPROVAL",
      events: [
        ev(
          "booking_proposed",
          `${slotLabel(slotIso)} ET held by Alter for founder approval (approval ${res.approvalId}, expires ${new Date(res.expiresAt).toLocaleTimeString("en-US", { timeZone: "America/Toronto" })})`,
        ),
      ],
    };
  },

  async attempt(approval: Approval, input: BookingInput): Promise<AlterOutcome> {
    const { PendingApproval } = await sdk();
    let reason: string;
    let auditRef: string | null;
    try {
      const res = await sendInsert(
        input,
        approval.slotIso,
        "Donna attempting the calendar write WITHOUT founder approval (demo: Alter must refuse; do not approve this one)",
        "attempt_without_approval",
      );
      if (!(res instanceof PendingApproval)) {
        throw new Error(
          `Alter executed the write without approval (HTTP ${res.statusCode}). Not recording a denial. Check the policy.`,
        );
      }
      reason = `Alter: approval required. Request held, not executed (status ${res.status}).`;
      auditRef = res.approvalId;
    } catch (e) {
      if ((e as Error).message?.startsWith("Alter executed")) throw e;
      const { message, ref } = describeAlterError(e);
      reason = message;
      auditRef = ref;
    }
    const deniedAttempt = { at: now(), reason, auditRef };
    return {
      approval: { ...approval, deniedAttempt },
      events: [ev("denied_attempt", `Donna tried to book without approval. ${reason}${auditRef ? ` [${auditRef}]` : ""}`)],
    };
  },

  async decide(approval: Approval, approve: boolean, _input: BookingInput): Promise<AlterOutcome> {
    if (!approval.alterRef) throw new Error(`Approval ${approval.id} has no Alter reference`);
    if (process.env.ALTER_DECIDER_KEY) return live.decideViaApi(approval, approve);
    if (!approve) {
      // This app key queued the request, so Alter refuses to let it decide (self_decision_refused).
      // Reject locally; the held request is never executed and expires in Alter.
      return {
        approval: { ...approval, status: "REJECTED" },
        candidateStatus: "REJECTED",
        events: [ev("rejected", `Founder rejected. Alter request ${approval.alterRef} was never executed.`)],
      };
    }
    const app = await client();
    const { ApprovalDeniedError } = await sdk();
    try {
      const result = await app.awaitApproval(approval.alterRef, {
        timeoutMs: Number(process.env.ALTER_APPROVAL_WAIT_MS ?? 120_000),
      });
      if (result.statusCode >= 300) {
        throw new Error(`Alter approved and ran the insert, but Google returned HTTP ${result.statusCode}: ${result.bodyText().slice(0, 300)}`);
      }
      const gEvent = result.bodyJson() as { id?: string; htmlLink?: string; attendees?: { email: string }[] };
      const to = gEvent.attendees?.map((a) => a.email).join(", ") ?? approval.emailDraft.to;
      return {
        approval: { ...approval, status: "APPROVED" },
        candidateStatus: "BOOKED",
        calendarUrl: gEvent.htmlLink,
        events: [
          ev("approved", `Founder approved in Alter (approval ${approval.alterRef}).`),
          ev("invite_sent", `Google Calendar event ${gEvent.id ?? ""} created through Alter; invite emailed to ${to}.`),
        ],
      };
    } catch (e) {
      if (e instanceof ApprovalDeniedError) {
        return {
          approval: { ...approval, status: "REJECTED" },
          candidateStatus: "REJECTED",
          events: [ev("rejected", `Founder denied it in Alter. ${describeAlterError(e).message}`)],
        };
      }
      throw e; // ApprovalTimeoutError etc.: still pending in Alter; caller can retry decide().
    }
  },

  /**
   * The founder clicks Approve/Reject in Donna; we record that decision in Alter with a
   * second app key that holds `approvals:decide` (Alter refuses the key that queued the
   * request: self_decision_refused). Alter checks ALTER_APPROVER_EMAIL against the rule's
   * approvers and audits it as asserted_by_integration. Then the main key awaits execution.
   */
  async decideViaApi(approval: Approval, approve: boolean): Promise<AlterOutcome> {
    const approverEmail = process.env.ALTER_APPROVER_EMAIL;
    if (!approverEmail) throw new Error("ALTER_DECIDER_KEY is set but ALTER_APPROVER_EMAIL is not");
    const { App } = await sdk();
    const app = await client();
    const decider = new App({ apiKey: process.env.ALTER_DECIDER_KEY });
    const ref = approval.alterRef!;
    try {
      if (!approve) {
        await decider.decideApproval(ref, { decision: "denied", actorEmail: approverEmail, reason: "Founder rejected in Donna" });
        return {
          approval: { ...approval, status: "REJECTED" },
          candidateStatus: "REJECTED",
          events: [ev("rejected", `Founder rejected; recorded in Alter as denied (approval ${ref}). Nothing was booked.`)],
        };
      }
      // Approving attests to a summary version; read it at the version Alter requires.
      let status = await app.getApprovalStatus(ref);
      if (status.requiredSummaryVersion > status.summaryVersion) {
        status = await app.getApprovalStatus(ref, { summaryVersion: status.requiredSummaryVersion });
      }
      await decider.decideApproval(ref, {
        decision: "approved",
        actorEmail: approverEmail,
        reason: "Founder approved in Donna",
        summaryVersion: status.summaryVersion,
      });
    } finally {
      await decider.close();
    }
    const result = await app.awaitApproval(ref, { timeoutMs: Number(process.env.ALTER_APPROVAL_WAIT_MS ?? 120_000) });
    if (result.statusCode >= 300) {
      throw new Error(`Alter approved and ran the insert, but Google returned HTTP ${result.statusCode}: ${result.bodyText().slice(0, 300)}`);
    }
    const gEvent = result.bodyJson() as { id?: string; htmlLink?: string; attendees?: { email: string }[] };
    const to = gEvent.attendees?.map((a) => a.email).join(", ") ?? approval.emailDraft.to;
    return {
      approval: { ...approval, status: "APPROVED" },
      candidateStatus: "BOOKED",
      calendarUrl: gEvent.htmlLink,
      events: [
        ev("approved", `Founder approved; Alter verified the approver and released the held write (approval ${ref}).`),
        ev("invite_sent", `Google Calendar event ${gEvent.id ?? ""} created through Alter; invite emailed to ${to}.`),
      ],
    };
  },
};
