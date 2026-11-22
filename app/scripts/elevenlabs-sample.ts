// Offline check of the ElevenLabs client: normalization against the documented response shape,
// plus the fixture path. Run: npx esbuild scripts/elevenlabs-sample.ts --bundle --platform=node --format=esm --outfile=<tmp>.mjs && node <tmp>.mjs
import assert from "node:assert/strict";
import { fetchConversation, toConversationRecord } from "../src/server/integrations/elevenlabs";

// The documented example from https://elevenlabs.io/docs/api-reference/conversations/get,
// with an agent turn and a message-less tool-call entry added around its user turn.
const sample = {
  agent_id: "agent_3701k3ttaq12ewp8b7qv5rfyszkz",
  status: "done" as const,
  metadata: { start_time_unix_secs: 1714423232, call_duration_secs: 10, cost_fiat: 1.1 },
  conversation_id: "conv_7401k5m9x2p8ec3rqv6dtnhb0fzw",
  has_audio: true,
  has_user_audio: true,
  has_response_audio: true,
  has_auxiliary_audio: true,
  transcript: [
    { role: "agent", time_in_call_secs: 0, message: "Hi, I'm Donna, an AI assistant. This call is recorded." },
    {
      role: "agent",
      time_in_call_secs: 4,
      message: null,
      tool_calls: [{ request_id: "r1", tool_name: "end_call", params_as_json: "{}", tool_has_been_called: true }],
    },
    { role: "user", time_in_call_secs: 10, message: "Hello, how are you?" },
  ],
  analysis: { call_successful: "success", transcript_summary: "Greeting." },
};

const record = toConversationRecord(sample);
assert.deepEqual(record, {
  conversationId: "conv_7401k5m9x2p8ec3rqv6dtnhb0fzw",
  durationSecs: 10,
  transcript: [
    { i: 0, role: "agent", text: "Hi, I'm Donna, an AI assistant. This call is recorded.", t: 0 },
    { i: 1, role: "user", text: "Hello, how are you?", t: 10 },
  ],
  analysis: { call_successful: "success", transcript_summary: "Greeting." },
  hasAudio: true,
});

const fixture = await fetchConversation("fixture-conv-001");
assert.equal(fixture.transcript.length, 9);
assert.equal(fixture.transcript[3].t, 17.8);
assert.equal(fixture.hasAudio, false);

console.log(`ok: normalized ${record.transcript.length} turns; fixture returned ${fixture.transcript.length} turns`);
