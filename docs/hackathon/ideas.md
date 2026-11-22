# Project ideas: "An AI coworker you'd actually hire"

## Reading the prompt

"Actually hire" is the hard part. A chatbot is not a coworker. Think about what makes someone hireable:

| A hire you'd trust... | Sponsor that shows it |
|---|---|
| Does a real job end to end, without hand-holding | ElevenLabs agent with tools, phone calls |
| Knows who they're dealing with | Fiber AI or Ploid |
| Can be trusted with your accounts, and asks before risky moves | Alter (credential vault, policies, approvals) |
| Shows their work, and you can see when they mess up | TraceRoot (traces, failure detection) |
| Is always available, and remembers | Maritime (one persistent agent per user) |
| Has a place to work | Wasp (app with login, DB, dashboard), assistant-ui (chat UI) |

A pitch that names the role, the person who would hire it, and why they would trust it covers "usefulness and impact" (25%) and makes the partner tools central rather than bolted on (another 25%).

The judges are YC founders who are hiring right now. A coworker for a job they personally need filled will land.

## Ideas

Ranked by fit with the prompt, the judges and a 4-hour build.

### 1. Recruiting coordinator that phone-screens candidates (recommended)

Founders at this event are hiring. This coworker takes an applicant, researches them, calls them, runs a 5-minute screen, and books a slot on the founder's calendar if they pass.

- **ElevenLabs:** outbound phone call (Twilio) or web call; the screen itself; transcript and summary from the post-call webhook
- **Fiber AI or Ploid:** research the candidate from a name or LinkedIn URL before the call, so questions are specific
- **Alter:** books the founder's Google Calendar and sends the invite, without the agent holding the token; a policy requires approval before emailing a candidate
- **Maritime:** hosts the agent; one per open role
- **Wasp:** the hiring dashboard (roles, candidates, scorecards, call recordings)
- **TraceRoot:** every screen traced, so the founder can see why a candidate passed or failed

**Demo:** a judge enters their own name and phone number, gets called in under a minute, is screened, and sees a scorecard and calendar hold appear on screen. That is a live product on real input, which the rules require.

**Risk:** Twilio setup takes about 30 minutes. Fall back to a browser voice call if it stalls.

### 2. On-call engineer that phones you when something breaks

Watches an agent or app, catches a failure, calls the engineer, explains what went wrong in plain speech, and proposes a fix you approve by voice.

- **TraceRoot:** detects the failure and supplies the trace
- **ElevenLabs:** the phone call and the conversation about the incident
- **Alter:** runs the fix (GitHub revert, Slack post) only after spoken approval
- **Maritime:** the always-on watcher

Strong technical story; needs a convincing "thing that breaks" for the demo.

### 3. User researcher that interviews customers

Calls real users, runs a short interview, then uses Expected Parrot to test the findings against a synthetic panel of personas and writes a report with charts.

- **ElevenLabs:** the interviews (phone or web)
- **Expected Parrot:** extends 3 real interviews into a 50-persona simulated study
- **Fiber AI or Ploid:** finds people who match the target customer
- **Wasp or assistant-ui:** the report and chat over results

Original, but the value is harder to show in 3 minutes.

### 4. SDR that books meetings

Finds leads, researches each one, calls or emails them in a personalized way, and books meetings. Strong use of Fiber, Ploid, ElevenLabs and Alter. Many teams will have the same idea, and cold-calling real people live is awkward to demo.

### 5. Chief of staff you talk to

You call it on the way to work. It reads your inbox and calendar through Alter, briefs you aloud, drafts replies and asks before sending. Easy to understand, but generic; it needs a sharp angle to stand out.

## Prize targeting

Partner prizes stack with the Grand Prize. Idea 1 can credibly go for:

- **Best Use of ElevenLabs:** the product is a voice call. (The Grand Prize winner can't also take this one.)
- **Best agents on Maritime:** host it there.
- **Best project built with Wasp:** build the dashboard on Open SaaS. On Windows this needs WSL2, Node 24+ and Postgres.
- **Codevisor Mac mini:** only if a teammate has an Apple silicon Mac to run Codevisor on.

## Suggested split for 4 people

| Person | Owns |
|---|---|
| 1 | ElevenLabs agent: prompt, tools, phone number, post-call webhook |
| 2 | Backend: webhook handler, Fiber or Ploid research, Alter calendar and email |
| 3 | Dashboard (Wasp or Next.js + assistant-ui), deploy |
| 4 | Maritime and TraceRoot |

Remember: a fresh repo after 11:00, and submission by 3:00 PM with the project link, a 2-minute demo video and every partner tool used.
