// Drives one candidate through the stubbed screen against a running `wasp start`
// and checks that every criterion's evidence points at a real candidate turn.
// Wire format: POST /operations/<kebab-name> with a SuperJSON body { json: args }.

const SERVER = process.env.WASP_SERVER_URL ?? "http://localhost:3001";
const CONVERSATION_ID = "fixture-conv-001";

function fail(message) {
  console.error(`check:screen FAILED: ${message}`);
  process.exit(1);
}

async function call(name, args) {
  let res;
  try {
    res = await fetch(`${SERVER}/operations/${name}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ json: args }),
    });
  } catch (err) {
    fail(`cannot reach ${SERVER} (is \`wasp start\` running?): ${err.message}`);
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) fail(`${name} returned HTTP ${res.status}: ${JSON.stringify(body)}`);
  return body?.json;
}

const roles = await call("list-roles", {});
if (!roles?.length) fail("list-roles returned no roles; run `wasp db seed`");
const roleId = roles[0].id;

const created = await call("create-candidate", {
  roleId,
  name: "Check Screen",
  email: `check+${Date.now()}@example.com`,
  githubUser: "checkscreen",
  consent: true,
});
console.log(`created ${created.id} (${created.status})`);

let candidate = created;
for (let n = 0; n < 50 && candidate.status !== "READY"; n++) {
  await new Promise((r) => setTimeout(r, 200));
  candidate = await call("get-candidate", { id: created.id });
}
if (candidate.status !== "READY") fail(`candidate ${created.id} stuck in ${candidate.status}, expected READY`);
console.log(`research done, dossier ${candidate.dossier ? "saved" : "missing"}`);

const start = await call("start-screen", { candidateId: created.id, fast: true });
if (!start?.dynamicVariables?.candidate_name) fail(`start-screen returned no dynamicVariables: ${JSON.stringify(start)}`);

const scorecard = await call("finalize-screen", { candidateId: created.id, conversationId: CONVERSATION_ID });
candidate = await call("get-candidate", { id: created.id });
if (candidate.status !== "AWAITING_APPROVAL") {
  fail(`candidate ${created.id} is ${candidate.status} after finalize, expected AWAITING_APPROVAL`);
}

const transcript = candidate.transcript ?? [];
if (!transcript.length) fail(`candidate ${created.id} has no stored transcript`);
if (!scorecard?.criteria?.length) fail(`scorecard for ${created.id} has no criteria`);

for (const c of candidate.scorecard.criteria) {
  const turn = transcript.find((t) => t.i === c.evidenceTurn);
  if (!turn) fail(`criterion "${c.name}" points at turn ${c.evidenceTurn}, which is not in the transcript`);
  if (turn.role !== "user") fail(`criterion "${c.name}" points at turn ${c.evidenceTurn}, a ${turn.role} turn`);
  if (!turn.text.includes(c.quote)) {
    fail(`criterion "${c.name}" quote is not in turn ${c.evidenceTurn}: ${JSON.stringify(c.quote)}`);
  }
  console.log(`ok  ${c.name}: turn ${c.evidenceTurn} at ${turn.t}s`);
}

const kinds = candidate.events.map((e) => e.kind).join(", ");
console.log(`events: ${kinds}`);
console.log(`check:screen passed for ${created.id} (${scorecard.recommendation}, overall ${scorecard.overall})`);
