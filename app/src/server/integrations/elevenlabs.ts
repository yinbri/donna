import type { TranscriptTurn } from "../contracts";
import { FIXTURE_CONVERSATION } from "../fixtures";

export type ConversationRecord = {
  conversationId: string;
  durationSecs: number;
  transcript: TranscriptTurn[];
  analysis: unknown;
  hasAudio: boolean;
};

export function isStubbed(): boolean {
  return !process.env.ELEVENLABS_API_KEY || !process.env.ELEVENLABS_AGENT_ID;
}

// Stub bodies: every call returns fixture data until the real ElevenLabs client lands.

export async function startSession(): Promise<{ token: string; agentId: string }> {
  return { token: "stub-token", agentId: "stub-agent" };
}

export async function fetchConversation(conversationId: string): Promise<ConversationRecord> {
  return {
    conversationId,
    durationSecs: FIXTURE_CONVERSATION.durationSecs,
    transcript: FIXTURE_CONVERSATION.transcript,
    analysis: null,
    hasAudio: false,
  };
}

/** Saves the call audio for a candidate and returns its absolute path, or null when there is none. */
export async function downloadAudio(_conversationId: string, _candidateId: string): Promise<string | null> {
  return null;
}
