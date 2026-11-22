import fs from "node:fs";
import type { GetAudio, GetHealth } from "wasp/server/api";
import { prisma } from "wasp/server";

export const getHealth: GetHealth = (_req, res) => {
  res.json({ ok: true });
};

export const getAudio: GetAudio = async (req, res) => {
  const candidateId = String(req.params.candidateId);
  const candidate = await prisma.candidate.findUnique({ where: { id: candidateId }, select: { audioPath: true } });
  if (!candidate) {
    res.status(404).json({ error: `Candidate ${candidateId} not found` });
    return;
  }
  if (!candidate.audioPath || !fs.existsSync(candidate.audioPath)) {
    res.status(404).json({ error: `No stored audio for candidate ${candidateId}` });
    return;
  }
  // The player runs on the web client's origin, and Wasp's default security headers only let the
  // server's own origin embed a response, so the browser would block the recording.
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  // sendFile answers Range requests, which the receipts player needs to seek.
  res.sendFile(candidate.audioPath, (err) => {
    if (err && !res.headersSent) res.status(500).json({ error: `Could not send audio for ${candidateId}: ${err.message}` });
  });
};
