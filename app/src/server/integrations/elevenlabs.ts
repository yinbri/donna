import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { TranscriptTurn } from "../contracts";
import { FIXTURE_CONVERSATION } from "../fixtures";

export type ConversationRecord = {
  conversationId: string;
  durationSecs: number;
  transcript: TranscriptTurn[];
  analysis: unknown;
  hasAudio: boolean;
};

const API_BASE = "https://api.elevenlabs.io/v1/convai";
const POLL_INTERVAL_MS = 2_000;
const POLL_TIMEOUT_MS = 90_000;
const SAFE_ID = /^[A-Za-z0-9_-]{1,128}$/;

type ApiTranscriptEntry = {
  role: string;
  message?: string | null;
  time_in_call_secs: number;
};

type ApiConversation = {
  conversation_id: string;
  status: "initiated" | "in-progress" | "processing" | "done" | "failed";
  transcript: ApiTranscriptEntry[];
  metadata: { call_duration_secs: number };
  analysis?: unknown;
  has_audio: boolean;
};

export function isStubbed(): boolean {
  return !process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID;
}

function isFixture(conversationId: string): boolean {
  return isStubbed() || conversationId === FIXTURE_CONVERSATION.conversationId;
}

async function apiGet(urlPath: string): Promise<Response> {
  const res = await fetch(`${API_BASE}${urlPath}`, {
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY! },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`ElevenLabs GET ${urlPath} failed with ${res.status}: ${body}`);
  }
  return res;
}

/** Conversation token for a WebRTC session, which is the @elevenlabs/react default for voice. */
export async function startSession(): Promise<{ token: string; agentId: string }> {
  if (isStubbed()) return { token: "stub-token", agentId: "stub-agent" };
  const agentId = process.env.ELEVENLABS_AGENT_ID!;
  const res = await apiGet(`/conversation/token?agent_id=${encodeURIComponent(agentId)}`);
  const body = (await res.json()) as { token?: string };
  if (!body.token) throw new Error(`ElevenLabs returned no conversation token for agent ${agentId}`);
  return { token: body.token, agentId };
}

export function normalizeTranscript(entries: ApiTranscriptEntry[]): TranscriptTurn[] {
  const turns: TranscriptTurn[] = [];
  for (const entry of entries) {
    // Tool-call and tool-result entries carry no message; they are not spoken turns.
    const text = entry.message?.trim();
    if (!text) continue;
    turns.push({
      i: turns.length,
      role: entry.role === "agent" ? "agent" : "user",
      text,
      t: entry.time_in_call_secs,
    });
  }
  return turns;
}

export function toConversationRecord(conv: ApiConversation): ConversationRecord {
  return {
    conversationId: conv.conversation_id,
    durationSecs: conv.metadata.call_duration_secs,
    transcript: normalizeTranscript(conv.transcript),
    analysis: conv.analysis ?? null,
    hasAudio: conv.has_audio,
  };
}

export async function fetchConversation(conversationId: string): Promise<ConversationRecord> {
  if (isFixture(conversationId)) {
    return {
      conversationId,
      durationSecs: FIXTURE_CONVERSATION.durationSecs,
      transcript: FIXTURE_CONVERSATION.transcript,
      analysis: null,
      hasAudio: false,
    };
  }
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus = "unknown";
  while (Date.now() < deadline) {
    const res = await apiGet(`/conversations/${encodeURIComponent(conversationId)}`);
    const conv = (await res.json()) as ApiConversation;
    lastStatus = conv.status;
    if (conv.status === "done") return toConversationRecord(conv);
    if (conv.status === "failed") throw new Error(`ElevenLabs conversation ${conversationId} failed`);
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(
    `ElevenLabs conversation ${conversationId} not done after ${POLL_TIMEOUT_MS / 1000}s (last status: ${lastStatus})`,
  );
}

// `wasp start` runs the server from app/.wasp/out/server, so walk up to the folder holding main.wasp.ts.
export function dataDir(): string {
  if (process.env.DONNA_DATA_DIR) return path.resolve(process.env.DONNA_DATA_DIR);
  let dir = process.cwd();
  while (true) {
    if (existsSync(path.join(dir, "main.wasp.ts"))) return path.join(dir, "data");
    const parent = path.dirname(dir);
    if (parent === dir) {
      throw new Error(`Cannot find the Wasp app root above ${process.cwd()}; set DONNA_DATA_DIR`);
    }
    dir = parent;
  }
}

/** Saves the call audio for a candidate and returns its absolute path, or null when there is none. */
export async function downloadAudio(conversationId: string, candidateId: string): Promise<string | null> {
  if (isFixture(conversationId)) return null;
  if (!SAFE_ID.test(candidateId)) throw new Error(`Invalid candidate id for audio file name: ${JSON.stringify(candidateId)}`);
  const conv = await fetchConversation(conversationId);
  if (!conv.hasAudio) return null;
  const res = await apiGet(`/conversations/${encodeURIComponent(conversationId)}/audio`);
  const audioDir = path.join(dataDir(), "audio");
  await mkdir(audioDir, { recursive: true });
  const file = path.join(audioDir, `${candidateId}.mp3`);
  await writeFile(file, Buffer.from(await res.arrayBuffer()));
  return file;
}
