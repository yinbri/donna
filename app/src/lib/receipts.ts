// Receipts: play the exact seconds of the call that earned a score.
// With real call audio, seek the <audio> element to the evidence turn and stop at
// the next turn. Until real audio exists, fall back to reading the quote aloud with
// the browser's speech synthesis, and say so in the UI.

import type { TranscriptTurn } from '../server/contracts';

let audio: HTMLAudioElement | null = null;
let stopHandler: (() => void) | null = null;
let audioOk: boolean | null = null;

export async function hasAudio(url: string): Promise<boolean> {
  if (audioOk !== null) return audioOk;
  try {
    const r = await fetch(url, { method: 'HEAD' });
    audioOk = r.ok && (r.headers.get('content-type') ?? '').startsWith('audio');
  } catch {
    audioOk = false;
  }
  return audioOk;
}

export function stopReceipt() {
  if (audio && stopHandler) audio.removeEventListener('timeupdate', stopHandler);
  audio?.pause();
  stopHandler = null;
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
}

export async function playReceipt(
  url: string,
  transcript: TranscriptTurn[],
  turnIndex: number,
  onEnd: () => void,
): Promise<'audio' | 'speech'> {
  stopReceipt();
  const turn = transcript.find((t) => t.i === turnIndex);
  if (!turn) {
    onEnd();
    return 'speech';
  }
  const next = transcript.find((t) => t.i > turn.i);

  if (await hasAudio(url)) {
    if (!audio || audio.src !== new URL(url, location.href).href) audio = new Audio(url);
    const a = audio;
    a.currentTime = turn.t;
    const stopAt = next ? next.t : Number.POSITIVE_INFINITY;
    stopHandler = () => {
      if (a.currentTime >= stopAt) {
        stopReceipt();
        onEnd();
      }
    };
    a.addEventListener('timeupdate', stopHandler);
    a.onended = () => onEnd();
    await a.play();
    return 'audio';
  }

  const u = new SpeechSynthesisUtterance(turn.text);
  u.rate = 1.05;
  u.onend = () => onEnd();
  window.speechSynthesis.speak(u);
  return 'speech';
}
