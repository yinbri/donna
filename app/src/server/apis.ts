import type { GetHealth } from "wasp/server/api";

export const getHealth: GetHealth = (_req, res) => {
  res.json({ ok: true });
};
