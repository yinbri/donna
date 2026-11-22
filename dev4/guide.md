# Dev 4 guide: Trust + ops

How to build, run and hand off this lane. Requirements are in [prd.md](prd.md).

## Setup

```bash
git switch -c lane/trust-ops
```

1. Redeem the Alter perk (code in the Hacker Package) and create an API key. The key is shown only once and needs the `connect:initiate` and `grants:write` scopes.
2. Create or pick a **test Google account** to act as the founder. Seed its calendar with 3–4 busy blocks over the next 3 days.
3. Redeem TraceRoot when the code is announced, and create a project token.

## Alter notes

From a quick research pass; confirm in docs.alterauth.com (quickstart, policies, approvals). Alter also has a hosted onboarding MCP server: `claude mcp add --transport http alter-onboarding https://mcp.alterauth.com/mcp`.

- SDK: `npm install @alter-ai/alter-sdk`. Main pieces: an `App` client, `connect` for Google (returns a grant ID), `proxy_request` / `proxyRequest` (returns either a response or a pending approval with an approval URL) and `await_approval` / `awaitApproval`. Confirm the TypeScript method names.
- Writes go through Alter's proxy to the Google Calendar API (create an event with the candidate as attendee and `sendUpdates=all`, so Google emails the invite). Email through the Gmail API is optional; the calendar invite email alone is enough.
- Approval waits time out after about 5 minutes. Propose right before the demo beat.
- TypeScript with top-level await needs `.mts` files; inside Wasp operations this doesn't apply.

**"Try without approval":** send the same write with no approval in place. Store whatever Alter returns (denial reason, audit ID) in `deniedAttempt`, word for word. The demo's credibility depends on this being Alter's real response.

## TraceRoot notes

Confirm in traceroot.ai/docs:
- TS: `npm install @traceroot-ai/traceroot`, then call `initialize` once at server start. Wrap each step with `observe({ name, type }, fn)`.
- Python, in the box: `pip install traceroot`, then `traceroot.initialize(...)`. Coordinate with Dev 3 before adding it to the box.
- Env: `TRACEROOT_API_KEY`, `TRACEROOT_HOST_URL`, `TRACEROOT_ENABLED`. The SDKs do not auto-load `.env`.

## Seed roles

For each sponsor, open ycombinator.com/companies/<slug>/jobs and copy one engineering role. Write a 3-item rubric that fits it, and keep the founder name from the company page. Sponsors: Maritime, Ploid, Expected Parrot, TraceRoot, Alter, assistant-ui, Codevisor, Rowboat Labs, Fiber AI, Wasp.

## Pilot (after Gate 1)

1. Get the public URL from the Dev 2.
2. Generate a QR code PNG into `pilot/qr.png`, using any offline generator.
3. Put the disclaimer at the top of `/apply` (Brian's page) and confirm it shows.
4. Hand Brian the post text; he posts it. Nothing is sent on anyone's behalf automatically.

## Hand off

1. On your branch, add `alter.ts` and `traceroot.ts` in `app/src/server/integrations/` (after the Wasp scaffold is on `main`). Both return fixtures when their key is unset.
2. Open a PR from `lane/trust-ops`, listing which acceptance criteria pass, and say plainly whether the approval is enforced by Alter or by the in-app fallback.

## Done-when checklist

See [lane.md](lane.md) and the acceptance criteria in the PRD.
