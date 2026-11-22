// Creates the text-only "Ask Donna" agent in ElevenLabs and prints its ID.
// The founder chat uses this agent; the voice screening agent (ELEVENLABS_AGENT_ID) is left alone.
//
//   node --env-file=.env.server scripts/create-chat-agent.mjs
//
// Then put the printed ID in app/.env.server as ELEVENLABS_CHAT_AGENT_ID.
// Prompt source of truth: ../agent/ask-donna-prompt.md

import { readFileSync } from "node:fs";

const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_API_KEY (run with --env-file=.env.server)");

const prompt = readFileSync(new URL("../../agent/ask-donna-prompt.md", import.meta.url), "utf8")
  .split("<!-- prompt -->")[1]
  .trim();

const body = {
  name: "Donna (Ask Donna chat)",
  conversation_config: {
    agent: {
      first_message: "",
      language: "en",
      prompt: { prompt, llm: process.env.ELEVENLABS_CHAT_LLM || "claude-haiku-5-5", temperature: 0.3 },
      dynamic_variables: {
        dynamic_variable_placeholders: {
          founder_name: "Alex",
          scope: "Founding Engineer at Acme",
          candidates: "Sam Rivera: Advance, 7.6 overall.",
          history: "(none)",
        },
      },
    },
    conversation: { text_only: true },
  },
};

const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
  method: "POST",
  headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify(body),
});
const json = await res.json();
if (!res.ok) throw new Error(`Create failed with ${res.status}: ${JSON.stringify(json)}`);
console.log(`ELEVENLABS_CHAT_AGENT_ID=${json.agent_id}`);
