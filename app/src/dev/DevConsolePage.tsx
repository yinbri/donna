import { useState } from "react";
import {
  attemptWithoutApproval,
  createCandidate,
  decide,
  finalizeScreen,
  listCandidates,
  listRoles,
  proposeBooking,
  startScreen,
  useQuery,
} from "wasp/client/operations";
import { RealCallPanel } from "./RealCallPanel";

type Step = { label: string; result: unknown };

function GateLinks({ result }: { result: unknown }) {
  const r = (result ?? {}) as { approvalUrl?: unknown; calendarUrl?: unknown };
  const links = [
    ["Approve in Alter", r.approvalUrl],
    ["Calendar", r.calendarUrl],
  ].filter((l): l is [string, string] => typeof l[1] === "string");
  if (links.length === 0) return null;
  return (
    <p>
      {links.map(([label, href]) => (
        <a key={label} href={href} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>
          {label}
        </a>
      ))}
    </p>
  );
}

export function DevConsolePage() {
  const roles = useQuery(listRoles);
  const candidates = useQuery(listCandidates, {});
  const [candidateId, setCandidateId] = useState("");
  const [approvalId, setApprovalId] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      const result = await fn();
      setSteps((s) => [...s, { label, result }]);
      return result;
    } catch (err) {
      setSteps((s) => [...s, { label: `${label} FAILED`, result: (err as Error).message }]);
      return undefined;
    } finally {
      setBusy(false);
    }
  }

  const roleId = roles.data?.[0]?.id;

  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 16 }}>
      <h1>Donna dev console</h1>
      <p>
        <small>Unofficial hackathon demo. This is not an application to the company.</small>
      </p>

      <h2>Roles</h2>
      {roles.error && <p>Error: {roles.error.message}</p>}
      <ul>
        {roles.data?.map((r) => (
          <li key={r.id}>
            {r.title} at {r.companyName} ({r.id})
          </li>
        ))}
      </ul>

      <h2>Candidates</h2>
      {candidates.error && <p>Error: {candidates.error.message}</p>}
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            <th>Overall</th>
            <th>Id</th>
          </tr>
        </thead>
        <tbody>
          {candidates.data?.map((c) => (
            <tr key={c.id}>
              <td>{c.name}</td>
              <td>{c.status}</td>
              <td>{c.scorecard?.overall ?? "-"}</td>
              <td>
                <button onClick={() => setCandidateId(c.id)}>{c.id}</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <h2>Drive the flow (fixture stubs; the approval gate follows ALTER_MODE)</h2>
      <p>
        Candidate: <code>{candidateId || "none"}</code> · Approval: <code>{approvalId || "none"}</code>
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button
          disabled={busy || !roleId}
          onClick={async () => {
            const c = (await run("createCandidate", () =>
              createCandidate({
                roleId: roleId!,
                name: "Dev Tester",
                email: `dev+${Date.now()}@example.com`,
                githubUser: "devtester",
                consent: true,
              }),
            )) as { id: string } | undefined;
            if (c) setCandidateId(c.id);
          }}
        >
          1. Create
        </button>
        <button disabled={busy || !candidateId} onClick={() => run("startScreen", () => startScreen({ candidateId, fast: true }))}>
          2. Start screen
        </button>
        <button
          disabled={busy || !candidateId}
          onClick={() => run("finalizeScreen", () => finalizeScreen({ candidateId, conversationId: "fixture-conv-001" }))}
        >
          3. Finalize
        </button>
        <button
          disabled={busy || !candidateId}
          onClick={async () => {
            const a = (await run("proposeBooking", () => proposeBooking({ candidateId }))) as { id: string } | undefined;
            if (a) setApprovalId(a.id);
          }}
        >
          4. Propose booking
        </button>
        <button disabled={busy || !approvalId} onClick={() => run("attemptWithoutApproval", () => attemptWithoutApproval({ approvalId }))}>
          5. Attempt without approval
        </button>
        <button disabled={busy || !approvalId} onClick={() => run("decide", () => decide({ approvalId, approve: true }))}>
          6. Approve
        </button>
      </div>

      <RealCallPanel candidateId={candidateId} />

      <h2>Results</h2>
      {steps.map((s, n) => (
        <details key={n} open={n === steps.length - 1}>
          <summary>{s.label}</summary>
          <GateLinks result={s.result} />
          <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(s.result, null, 2)}</pre>
        </details>
      ))}
    </main>
  );
}
