import { action, api, app, page, query, route } from "@wasp.sh/spec";
import { HomePage } from "./src/HomePage" with { type: "ref" };
import { DevConsolePage } from "./src/dev/DevConsolePage" with { type: "ref" };
import { getAudio, getHealth } from "./src/server/apis" with { type: "ref" };
import {
  attemptWithoutApproval,
  createCandidate,
  decide,
  finalizeScreen,
  getCandidate,
  getIntegrationStatus,
  listCandidates,
  listRoles,
  proposeBooking,
  startScreen,
} from "./src/server/operations" with { type: "ref" };
import { seedDev } from "./src/server/seed" with { type: "ref" };

const all = ["Role", "Candidate", "Approval", "Event"];

export default app({
  name: "donna",
  wasp: { version: "^0.26.1" },
  title: "Donna",
  head: ["<link rel='icon' href='/favicon.ico' />"],
  db: { seeds: [seedDev] },
  spec: [
    route("RootRoute", "/", page(HomePage)),
    route("DevRoute", "/dev", page(DevConsolePage)),
    route("FounderRoute", "/founder", page(DevConsolePage)),

    query(listRoles, { entities: ["Role"] }),
    query(listCandidates, { entities: all }),
    query(getCandidate, { entities: all }),
    query(getIntegrationStatus, { entities: [] }),

    action(createCandidate, { entities: all }),
    action(startScreen, { entities: all }),
    action(finalizeScreen, { entities: all }),
    action(proposeBooking, { entities: all }),
    action(attemptWithoutApproval, { entities: all }),
    action(decide, { entities: all }),

    api("GET", "/api/health", getHealth, { auth: false }),
    api("GET", "/api/audio/:candidateId", getAudio, { auth: false }),
  ],
});
