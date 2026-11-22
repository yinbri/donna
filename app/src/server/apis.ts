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
  // sendFile answers Range requests, which the receipts player needs to seek.
  res.sendFile(candidate.audioPath, (err) => {
    if (err && !res.headersSent) res.status(500).json({ error: `Could not send audio for ${candidateId}: ${err.message}` });
  });
};
