# Pilot runbook: real people take a Donna screen today

Owner: Dev 4. Mechanics for running the app (Wasp, tunnels, caffeinate, QR) are in [dev2/RUNBOOK.md](../dev2/RUNBOOK.md) and `scripts/public-url.sh`. They are not repeated here. This file covers when the pilot may go live, what people see, how we count, and how we stop.

## 1. Go / no-go (all must be true)

- [ ] Gate 1 passed on the Mac: apply, call, receipts play, denied attempt, Approve, invite.
- [ ] It is before **1:45 PM**. If the pilot is not live by 1:45, cut it (plan.md cut order). Do not rescue it.
- [ ] The Mac's `app/.env.server` has `DEMO_INVITE_TO=istgtspmosmfr@gmail.com`. Pilot candidates must never get a real calendar invite or email. Nobody approves pilot candidates in the founder view.
- [ ] The roles a candidate can pick are the real sponsor roles from `app/seed/roles.json` (2 real postings plus 9 "General interest"). Right now `app/src/server/seed.ts` seeds `FIXTURE_ROLES` instead. Ask Aarav to seed from `app/seed/roles.json` before going live.
- [ ] The banner and consent box (below) show on the page phones open.
- [ ] The phone check from dev2/RUNBOOK.md section 2 passed: the page loads on mobile data and the mic prompt appears.
- [ ] **Dev 4 says go.** Posting the link or QR anywhere needs Dev 4's OK each time.

## 2. Exact copy on the candidate page

Banner: on main as fine print on `/` and `/apply` ("Unofficial hackathon demo. This is not an application to the company.").

Consent box: on main in `app/src/candidate/ApplyPage.tsx`. It is Brian's file. Submit is refused until the box is ticked. The current text says the call is recorded and scored by an AI, and that the lookup uses only what the candidate entered. **Before the pilot goes live, ask Brian for two changes:**

1. It says "my first name and highlights may be shown to the company's founder". For pilot strangers that suggests a real founder sees them, which they don't; this is unofficial. Suggested replacement: "my first name and highlights are shown on Team 10's demo founder view, not sent to the company".
2. Add: "Team 10 deletes my answers after the event." Section 8 step 5 does the deletion.

These keep it in line with the guardrails in AGENTS.md. Donna's first sentence says she is an AI and the call is recorded. She never asks about protected topics and never promises an outcome.

## 3. Get the URL and QR

1. Follow dev2/RUNBOOK.md sections 1 to 3 on the Mac (`wasp start`, `./scripts/public-url.sh`, restart with `--client-url` / `--server-url`, `caffeinate -dimsu`).
2. The URL phones open is the **web** tunnel URL (`https://<web>.trycloudflare.com`). Candidates start at `/apply` (Brian's page, on main since merge #5).
3. Make a QR PNG from any machine with Node. Verified with `qrcode@1.5.4` on Windows:

   ```bash
   npx qrcode -o pilot/qr.png -w 600 "https://<web>.trycloudflare.com/apply"
   ```

   Or use Chrome on the Mac: right-click the page and choose "Create QR code for this page".
4. Scan the QR with a phone that is **not** on the venue Wi-Fi before showing it to anyone.

Do not commit `pilot/qr.png` with a live URL. It dies with the tunnel anyway.

## 4. Post text (for Brian, after Dev 4 says go)

> Built this today: take a 3-minute AI voice screen for one of the sponsor startups' open roles and get instant feedback. Unofficial demo, not an application. <link>

Where: the hackathon Discord or Slack, and a printed or on-screen QR at our table. Each post needs Dev 4's OK first.

## 5. Limits we must respect (from Cloudflare's quick tunnel docs)

- "Quick Tunnels have no uptime guarantee." The URL changes every time the tunnel restarts. A restart means a new QR and a new post.
- Up to 200 in-flight requests per tunnel, then `429`. That is fine for a table pilot.
- Quick tunnels do **not** support Server-Sent Events. If any page relies on SSE for live updates, it will hang over the tunnel. Use the page on localhost for the founder view during the demo.
- "Anyone with the URL can access your local service." That includes `/dev` and `/founder`. Do not post those paths. Stop the tunnel when the pilot ends.
- Vite only accepts `.trycloudflare.com` hosts because Aarav's `app/vite.config.ts` sets `server.allowedHosts`. If a phone gets a Vite "host not allowed" error, check that file first.

## 6. Fallback: team laptop at the table

If the tunnel is down, phones can't get mic access, or the venue network blocks it:

1. Open `http://localhost:3000/apply` on a team laptop (the Mac, or any laptop running the app) in Chrome.
2. Hand the candidate the laptop plus headphones with a mic. Localhost counts as a secure context, so the mic works without HTTPS.
3. Same consent box, same banner. A team member stays nearby but does not coach.

Count these screens the same way (section 7).

## 7. The real "N screens today" number

The pitch number must be real. A screen counts only if all of these hold:

- A real person who is not on Team 10 started it.
- It reached the `call_ended` event (logged in `operations.ts` when the transcript comes back).
- It was not stubbed, so the `call_started` event detail is not `ElevenLabs stubbed`.
- It is not the seeded fixture candidate "Sam Rivera".

How to read it on the Mac:

```bash
cd app && wasp db studio
```

In Prisma Studio, open **Event** and filter `kind = call_ended`. Delete from the count anything before go-live and every run by a team member. Keep a list of team test runs (name plus time) in this file's log below as you go, so this is quick at 2:15.

If N is 0 or 1, the pitch says "first real screens today" with the true number, or drops the pilot claim. It never rounds up.

## 8. Stop and roll back

When the pilot ends, at the latest at **2:20 feature freeze**, or if anything goes wrong (abuse, a protected-topic question, an outcome promise, a real invite sent):

1. Ctrl-C the `public-url.sh` terminal. The public URL dies at once.
2. Delete or unpin every post that carried the link.
3. If a real invite or email went out, tell Dev 4 right away. Check `DEMO_INVITE_TO` and the Alter audit log.
4. The demo continues on localhost. Gate 1 does not depend on the tunnel.
5. After judging, delete pilot candidates. In `wasp db studio`, remove their Candidate rows plus their Approval and Event rows, as the consent box promised. Keep only the count.

## Log (fill in during the pilot)

| Time | What | Who |
|---|---|---|
| | Go-live, URL posted to: | |
| | Team test run (exclude from N): | |
| | Pilot stopped | |
