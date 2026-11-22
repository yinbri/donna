// Creates one of Donna's text-only ElevenLabs agents and prints its env line.
// The voice screening agent (ELEVENLABS_AGENT_ID) is left alone.
//
//   node --env-file=.env.server scripts/create-text-agent.mjs chat     # founder's Ask Donna chat
//   node --env-file=.env.server scripts/create-text-agent.mjs scorer   # scores each screen
//
// Put the printed line in app/.env.server. Prompts live in ../agent/ (text below "<!-- prompt -->").

import { readFileSync } from "node:fs";

const AGENTS = {
  chat: {
    env: "ELEVENLABS_CHAT_AGENT_ID",
    name: "Donna (Ask Donna chat)",
    promptFile: "ask-donna-prompt.md",
    llm: process.env.ELEVENLABS_CHAT_LLM || "claude-haiku-5-5",
    temperature: 0.3,
    placeholders: { founder_name: "Alex", scope: "Founding Engineer at Acme", candidates: "Sam Rivera: Advance, 7.6 overall.", history: "(none)" },
  },
  scorer: {
    env: "ELEVENLABS_SCORER_AGENT_ID",
    name: "Donna (screen scorer)",
    promptFile: "scoring-guidelines.md",
    llm: process.env.ELEVENLABS_SCORER_LLM || "claude-sonnet-5-5",
    temperature: 0,
    placeholders: {
      role_title: "Founding Engineer",
      company_name: "Acme",
      rubric: "Shipped real systems; Depth on own project; Communication",
      dossier: "Backend engineer; built a Redis-backed rate limiter.",
      transcript: "Donna: Tell me about your rate limiter.\n[1] Candidate: I load tested it with k6.",
    },
  },
};

const kind = process.argv[2];
const spec = AGENTS[kind];
if (!spec) throw new Error(`Usage: create-text-agent.mjs <${Object.keys(AGENTS).join("|")}>`);
const key = process.env.ELEVENLABS_API_KEY;
if (!key) throw new Error("Set ELEVENLABS_API_KEY (run with --env-file=.env.server)");

const prompt = readFileSync(new URL(`../../agent/${spec.promptFile}`, import.meta.url), "utf8").split("<!-- prompt -->")[1].trim();

const res = await fetch("https://api.elevenlabs.io/v1/convai/agents/create", {
  method: "POST",
  headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify({
    name: spec.name,
    conversation_config: {
      agent: {
        first_message: "",
        language: "en",
        prompt: { prompt, llm: spec.llm, temperature: spec.temperature },
        dynamic_variables: { dynamic_variable_placeholders: spec.placeholders },
      },
      conversation: { text_only: true },
    },
  }),
});
const json = await res.json();
if (!res.ok) throw new Error(`Create failed with ${res.status}: ${JSON.stringify(json)}`);
console.log(`${spec.env}=${json.agent_id}`);
