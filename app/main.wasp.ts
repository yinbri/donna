import { api, app, page, route } from "@wasp.sh/spec";
import { HomePage } from "./src/HomePage" with { type: "ref" };
import { getHealth } from "./src/server/apis" with { type: "ref" };
import { seedDev } from "./src/server/seed" with { type: "ref" };

export default app({
  name: "donna",
  wasp: { version: "^0.26.1" },
  title: "Donna",
  head: ["<link rel='icon' href='/favicon.ico' />"],
  db: { seeds: [seedDev] },
  spec: [
    route("RootRoute", "/", page(HomePage)),
    api("GET", "/api/health", getHealth, { auth: false }),
  ],
});
