// Runs scripted text-mode candidates against the real Donna agent over the ElevenLabs
// conversation WebSocket, then pushes each conversation through our pipeline
// (create-candidate -> start-screen -> finalize-screen -> get-candidate) and checks the scorecard.
// Usage: node app/scripts/run-test-screens.mjs [persona-slug ...]   (needs the app on :3001)
// Each run makes real ElevenLabs conversations (text only, so there is no recording) and leaves
// "Test: <persona>" candidates in the app. Raw results go to app/data/ (git-ignored) unless OUT is set.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SERVER = process.env.WASP_SERVER_URL ?? "http://localhost:3001";
const OUT = process.env.OUT ?? fileURLToPath(new URL("../data/test-screens.json", import.meta.url));
const CONV_LIMIT_MS = 90_000;
const QUIET_MS = 1500; // Donna's turn is over after this long without a new agent_response

const envFile = readFileSync(fileURLToPath(new URL("../.env.server", import.meta.url)), "utf8");
const env = Object.fromEntries(
  envFile
    .split("\n")
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/))
    .filter(Boolean)
    .map(([, k, v]) => [k, v.replace(/^["']|["']$/g, "")]),
);
const API_KEY = env.ELEVENLABS_API_KEY;
const SECRETS = [API_KEY, env.BOX_SECRET].filter((s) => s && s.length > 4);
const scrub = (text) => SECRETS.reduce((acc, s) => acc.split(s).join("[redacted]"), String(text));

const PERSONAS = [
  {
    name: "Strong builder",
    answers: [
      "Hi Donna, yes, ready when you are.",
      "I load tested the limiter with k6 against a single Redis node, and the Lua script broke first because it trimmed the sorted set on every call.",
      "So I moved to a fixed window counter with a token-bucket fallback for bursts, and throughput went from 12k to 50k requests per second on that one node.",
      "On payments we saw duplicate charges during a retry storm, and I traced it to idempotency keys scoped per request instead of per customer and operation, so I fixed the key scope and added a unique constraint.",
      "In my first two weeks I'd want to own rate limiting and tracing on the API gateway, starting with a dashboard of rejected requests per client.",
      "Thanks Donna, that's everything from me.",
    ],
  },
  {
    name: "Buzzword talker",
    answers: [
      "Absolutely, super excited to be here.",
      "The rate limiter was a highly scalable, cloud-native solution, really best in class, and it delivered massive synergy across the platform.",
      "I mean the specifics really depend on the context, the key thing is we leveraged the cloud to scale horizontally and stay agile.",
      "Idempotency is all about robustness, we embraced a resilient, event-driven mindset so the payments flow was future-proof.",
      "In my first two weeks I'd drive alignment, unlock value and empower the team to move fast at scale.",
      "Great chat, I think we're very aligned.",
    ],
  },
  {
    name: "Honest junior",
    answers: [
      "Hi, yes, I'm ready.",
      "I built a smaller version of a Redis rate limiter for a side project, a sliding window with a sorted set, but I never measured anything close to 50k requests per second.",
      "Honestly I only tested it with a few hundred requests a second from a local script, so I can't tell you where it would break first.",
      "I haven't worked on a payments team; I've only read the payments code in an open source project, where the idempotency key was stored with the response so a retry returned the same result.",
      "In my first two weeks I'd pair with someone on the API, fix a couple of small bugs, and learn how deploys and monitoring work before owning anything bigger.",
      "Thanks, that's all from me.",
    ],
  },
  {
    name: "Evasive",
    answers: [
      "Sure, whatever, go ahead.",
      "Why don't you tell me how you would build a rate limiter at 50k requests per second, then I'll tell you if I agree.",
      "I'd rather not get into specifics, how about you interview me with different questions instead.",
      "Let's swap roles, you be the candidate and explain idempotency keys to me.",
      "I don't really want to commit to what I'd own, what do you think I should own?",
      "Okay, are we done?",
    ],
  },
  {
    name: "Mixed",
    answers: [
      "Hi Donna, yes, let's go.",
      "I load tested our Redis limiter with k6 and found the Lua script was the bottleneck, so I switched it to a fixed window counter and we got from about 15k to 50k requests per second on one node.",
      "The detail was that each call did a sorted-set trim, which is O(log n) plus the removals, and the fixed window just does one INCR and an EXPIRE.",
      "For idempotency keys I think you just generate a random UUID on the server for every request and that makes retries safe, it's mostly handled by the database anyway.",
      "In my first two weeks I'd read the gateway code, set up tracing on the slowest endpoints, and take one small on-call ticket to learn the system.",
      "Thanks, that's it from me.",
    ],
  },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function call(name, args, timeoutMs = 30_000) {
  const res = await fetch(`${SERVER}/operations/${name}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ json: args }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`${name} returned HTTP ${res.status}: ${scrub(JSON.stringify(body)).slice(0, 500)}`);
  return body?.json;
}

async function socketUrl(agentId) {
  if (API_KEY) {
    try {
      const res = await fetch(
        `https://api.elevenlabs.io/v1/convai/conversation/get-signed-url?agent_id=${encodeURIComponent(agentId)}`,
        { headers: { "xi-api-key": API_KEY }, signal: AbortSignal.timeout(10_000) },
      );
      if (res.ok) {
        const { signed_url } = await res.json();
        if (signed_url) return signed_url;
      }
    } catch {}
  }
  return `wss://api.elevenlabs.io/v1/convai/conversation?agent_id=${encodeURIComponent(agentId)}`;
}

/** One scripted conversation. Resolves with { conversationId, turns, notes }. */
async function converse(agentId, dynamicVariables, answers, textOnly) {
  const url = await socketUrl(agentId);
  const ws = new WebSocket(url);
  const turns = [];
  const notes = [];
  let conversationId = null;
  let lastAgentAt = 0;
  let agentTurns = 0;
  let closed = null;
  const started = Date.now();

  ws.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
    } catch {
      return;
    }
    switch (msg.type) {
      case "conversation_initiation_metadata":
        conversationId = msg.conversation_initiation_metadata_event?.conversation_id ?? null;
        break;
      case "ping":
        ws.send(JSON.stringify({ type: "pong", event_id: msg.ping_event?.event_id }));
        break;
      case "agent_response": {
        const text = msg.agent_response_event?.agent_response ?? "";
        const prev = turns.at(-1);
        // Merge agent responses that arrive within one turn (before we answered).
        if (prev?.role === "agent" && Date.now() - lastAgentAt < QUIET_MS) prev.text += " " + text;
        else turns.push({ role: "agent", text });
        lastAgentAt = Date.now();
        agentTurns++;
        break;
      }
      case "audio":
      case "agent_chat_response_part":
      case "agent_response_correction":
      case "user_transcript":
      case "interruption":
      case "vad_score":
      case "internal_tentative_agent_response":
        break;
      case "error":
        notes.push(`server error event: ${scrub(JSON.stringify(msg)).slice(0, 300)}`);
        break;
      default:
        if (!notes.some((n) => n.includes(`event ${msg.type}`))) notes.push(`unhandled event ${msg.type}`);
    }
  });
  ws.addEventListener("close", (ev) => (closed = { code: ev.code, reason: scrub(ev.reason) }));
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error("websocket failed to open")), { once: true });
  });

  const init = { type: "conversation_initiation_client_data", dynamic_variables: dynamicVariables };
  if (textOnly) init.conversation_config_override = { conversation: { text_only: true } };
  ws.send(JSON.stringify(init));

  // Wait for Donna's turn to finish (or the socket to close / time to run out).
  const waitForAgent = async (seenTurns) => {
    while (!closed && Date.now() - started < CONV_LIMIT_MS) {
      if (agentTurns > seenTurns && Date.now() - lastAgentAt >= QUIET_MS) return true;
      await sleep(100);
    }
    return false;
  };

  let seen = 0;
  for (const answer of answers) {
    if (!(await waitForAgent(seen))) break;
    seen = agentTurns;
    ws.send(JSON.stringify({ type: "user_message", text: answer }));
    turns.push({ role: "user", text: answer });
  }
  await waitForAgent(seen); // Donna's reply to the last answer
  if (closed) notes.push(`socket closed by server: ${closed.code} ${closed.reason}`);
  else ws.close(1000, "done");
  if (Date.now() - started >= CONV_LIMIT_MS) notes.push("hit the 90 s conversation limit");
  await sleep(300);
  return { conversationId, turns, notes, seconds: Math.round((Date.now() - started) / 1000) };
}

async function runPersona(persona) {
  const result = { persona: persona.name };
  const created = await call("create-candidate", {
    roleId: "role-demo-founding-eng",
    name: `Test: ${persona.name}`,
    email: `test+${slug(persona.name)}+${Date.now()}@example.com`,
    consent: true,
  });
  result.candidateId = created.id;
  let candidate = created;
  for (let n = 0; n < 100 && candidate.status !== "READY"; n++) {
    await sleep(300);
    candidate = await call("get-candidate", { id: created.id });
  }
  if (candidate.status !== "READY") throw new Error(`candidate stuck in ${candidate.status}`);

  const start = await call("start-screen", { candidateId: created.id, fast: false });
  const agentId = start.agentId || env.ELEVENLABS_AGENT_ID;

  let convo = await converse(agentId, start.dynamicVariables, persona.answers, true);
  result.textOnly = true;
  if (!convo.turns.some((t) => t.role === "user")) {
    result.textOnlyNotes = convo.notes;
    convo = await converse(agentId, start.dynamicVariables, persona.answers, false);
    result.textOnly = false;
  }
  result.conversation = convo;
  if (!convo.conversationId) throw new Error(`no conversation id; notes: ${convo.notes.join(" | ")}`);

  const t0 = Date.now();
  result.finalizeResult = await call("finalize-screen", { candidateId: created.id, conversationId: convo.conversationId }, 150_000);
  result.finalizeSeconds = Math.round((Date.now() - t0) / 1000);
  result.candidate = await call("get-candidate", { id: created.id });
  return result;
}

function report(r) {
  const c = r.candidate ?? {};
  const sc = c.scorecard ?? {};
  const transcript = c.transcript ?? [];
  const lines = [`\n=== ${r.persona} (${r.candidateId}) ===`];
  lines.push(
    `conversation ${r.conversation?.conversationId} text_only=${r.textOnly} ${r.conversation?.seconds}s, ` +
      `${r.conversation?.turns.filter((t) => t.role === "user").length} candidate turns; finalize ${r.finalizeSeconds}s`,
  );
  for (const n of [...(r.textOnlyNotes ?? []), ...(r.conversation?.notes ?? [])]) lines.push(`note: ${n}`);
  lines.push(`status ${c.status} | source ${sc.source} | ${sc.recommendation} | overall ${sc.overall}`);
  let ok = (sc.criteria ?? []).length > 0;
  for (const cr of sc.criteria ?? []) {
    const turn = transcript.find((t) => t.i === cr.evidenceTurn);
    const good = turn?.role === "user" && typeof cr.quote === "string" && turn.text.includes(cr.quote);
    ok &&= good;
    lines.push(`  ${good ? "ok  " : "BAD "} ${cr.name}: ${cr.score} @turn ${cr.evidenceTurn} (${turn?.role ?? "missing"}) "${cr.quote}"`);
  }
  lines.push(`  feedback strengths: ${JSON.stringify(sc.feedback?.strengths)}`);
  lines.push(`  feedback sharpen: ${JSON.stringify(sc.feedback?.sharpen)}`);
  if (sc.redFlags?.length) lines.push(`  red flags: ${JSON.stringify(sc.redFlags)}`);
  const evaluated = (c.events ?? []).filter((e) => e.kind === "evaluated");
  for (const e of evaluated) lines.push(`  evaluated: ${scrub(JSON.stringify(e.detail ?? e))}`);
  lines.push(`EVIDENCE CHECK: ${ok ? "PASS" : "FAIL"}`);
  r.evidenceCheck = ok ? "PASS" : "FAIL";
  console.log(lines.join("\n"));
}

const only = process.argv.slice(2);
const results = [];
for (const persona of PERSONAS.filter((p) => !only.length || only.includes(slug(p.name)))) {
  try {
    const r = await runPersona(persona);
    report(r);
    results.push(r);
  } catch (err) {
    const message = scrub(err?.message ?? err);
    console.log(`\n=== ${persona.name} === ERROR: ${message}`);
    results.push({ persona: persona.name, error: message });
  }
}
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, scrub(JSON.stringify(results, null, 2)));
console.log(`\nwrote ${OUT}`);
console.log("summary:");
for (const r of results) {
  const sc = r.candidate?.scorecard ?? {};
  console.log(
    r.error
      ? `  ${r.persona}: ERROR`
      : `  ${r.persona}: ${sc.source} ${sc.recommendation} ${sc.overall} [${(sc.criteria ?? []).map((c) => `${c.name}=${c.score}`).join(", ")}] ${r.evidenceCheck}`,
  );
}
