# ElevenLabs notes (Dev 2)

Client: `app/src/server/integrations/elevenlabs.ts`. Checked against the docs on 2026-11-22. The live path has not been run yet because there is no API key on the Mac.

## Env (`app/.env.server`, git-ignored)

- `ELEVENLABS_API_KEY`: the key. Never commit it.
- `ELEVENLABS_AGENT_ID=agent_0301m82483v8f35rz4eeg6gxjpj7` ("Donna - voice screener"; this id is not a secret)
- `DONNA_DATA_DIR` (optional): overrides where audio is saved. The default is `app/data`.

If either of the first two is missing, the client runs as a stub and returns fixtures. The conversation id `fixture-conv-001` also always returns the fixture.

## Endpoints verified

All requests use the header `xi-api-key` (https://elevenlabs.io/docs/api-reference/authentication).

| Use | Endpoint | Doc |
|---|---|---|
| WebRTC conversation token | `GET /v1/convai/conversation/token?agent_id=…` → `{ token, conversation_id }` | https://elevenlabs.io/docs/api-reference/conversations/get-webrtc-token |
| Signed URL (WebSocket, not used) | `GET /v1/convai/conversation/get-signed-url?agent_id=…` → `{ signed_url }` | https://elevenlabs.io/docs/eleven-agents/libraries/react.md |
| Conversation details | `GET /v1/convai/conversations/{id}` → `status` (`initiated`, `in-progress`, `processing`, `done`, `failed`), `transcript[]` (`role`, `message` nullable, `time_in_call_secs`, `tool_calls`), `metadata.call_duration_secs`, `analysis` (nullable), `has_audio` | https://elevenlabs.io/docs/api-reference/conversations/get |
| Conversation audio | `GET /v1/convai/conversations/{id}/audio` (audio bytes) | https://elevenlabs.io/docs/api-reference/conversations/get-audio |

Notes on the response fields:
- `time_in_call_secs` is documented as an integer, so a turn's `t` is whole seconds.
- The token response also includes a `conversation_id`. `startSession()` does not return it, because its signature is fixed. The client gets the id from `startSession` instead (see the snippet below).

## Token type: conversation token (WebRTC)

The React SDK uses WebRTC for voice by default, and WebRTC takes a `conversationToken`. A signed URL would also need `connectionType: "websocket"`. `StartScreenResult.token` is therefore a conversation token.

## Client snippet (`@elevenlabs/react`)

`useConversation` must be used inside a `<ConversationProvider>` ancestor.

```tsx
import { ConversationProvider, useConversation } from "@elevenlabs/react";

// <ConversationProvider><Screen /></ConversationProvider>
function Screen({ candidateId }: { candidateId: string }) {
  const conversation = useConversation();
  const start = async () => {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    const { token, dynamicVariables } = await startScreen({ candidateId, fast: false });
    const conversationId = await conversation.startSession({
      conversationToken: token,
      dynamicVariables,
    });
    // Keep conversationId (conversation.getId() also returns it). When the call ends:
    // await finalizeScreen({ candidateId, conversationId });
  };
  // ...
}
```

## Dynamic variables (from `StartScreenResult`)

`candidate_name`, `founder_name`, `company_name`, `role_title`, `top_project`, `tailored_questions` (one string, joined with newlines), `demo_fast_mode` (boolean).

## Agent configuration needed for a session to start

- Pass every `{{variable}}` used in the agent's prompt or first message in `dynamicVariables`, using exactly the seven names above. The docs I read do not say what happens when one is missing, so treat a missing variable as a reason the session may fail. Placeholders set on the agent (`dynamic_variable_placeholders`) act as defaults for testing (https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables).
- The `startScreen` call shape in the snippet above is illustrative. Use whatever the Wasp operation's real signature is.
- The agent is private (it needs authentication), so the browser connects only with the server-issued token. The key never leaves the server.
- Audio storage must stay on, or `has_audio` is false and `downloadAudio` returns null.

## Checking it offline

```bash
cd app && npx esbuild scripts/elevenlabs-sample.ts --bundle --platform=node --format=esm --outfile=/tmp/el.mjs && node /tmp/el.mjs
```
