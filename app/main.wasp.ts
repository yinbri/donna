import { action, api, app, page, query, route } from "@wasp.sh/spec";
import { LandingRoute } from "./src/Landing" with { type: "ref" };
import { ApplyRoute } from "./src/candidate/ApplyPage" with { type: "ref" };
import { ResearchRoute } from "./src/candidate/ResearchPage" with { type: "ref" };
import { CallRoute } from "./src/candidate/CallPage" with { type: "ref" };
import { DoneRoute } from "./src/candidate/DonePage" with { type: "ref" };
import { FounderRoute } from "./src/founder/FounderHome" with { type: "ref" };
import { CandidateRoute } from "./src/founder/CandidatePage" with { type: "ref" };
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
    route("RootRoute", "/", page(LandingRoute)),
    route("ApplyRoute", "/apply", page(ApplyRoute)),
    route("ResearchRoute", "/apply/:id/research", page(ResearchRoute)),
    route("CallRoute", "/apply/:id/call", page(CallRoute)),
    route("DoneRoute", "/apply/:id/done", page(DoneRoute)),
    route("FounderRoute", "/founder", page(FounderRoute)),
    route("FounderCandidateRoute", "/founder/candidates/:id", page(CandidateRoute)),
    route("DevRoute", "/dev", page(DevConsolePage)),

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
