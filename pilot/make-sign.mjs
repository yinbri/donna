// Makes the pilot QR and a full-screen table sign from the tunnel URL.
//   node pilot/make-sign.mjs https://<web>.trycloudflare.com [--demo-research]
// Writes pilot/qr.png and pilot/sign.html (both git-ignored: they die with the tunnel).
// Open sign.html in a browser on a laptop at the table, full screen. Showing it needs Dev 4's OK.
// --demo-research adds a line saying the research step shows demo data (use while box.ts is the stub).
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const demoResearch = args.includes("--demo-research");
const raw = args.find((a) => !a.startsWith("--"));

let url;
try {
  url = new URL(raw ?? "");
} catch {
  console.error("Usage: node pilot/make-sign.mjs https://<web>.trycloudflare.com [--demo-research]");
  process.exit(1);
}
if (url.protocol !== "https:" || !url.hostname.endsWith(".trycloudflare.com")) {
  console.error(`Refusing ${url.origin}: expected the https web tunnel URL (*.trycloudflare.com).`);
  process.exit(1);
}
if (/^\/(dev|founder)/.test(url.pathname)) {
  console.error("Refusing: never post /dev or /founder (runbook section 5).");
  process.exit(1);
}
url.pathname = "/apply"; // candidates always start here
url.search = "";
url.hash = "";
const link = url.toString();

// qrcode@1.5.4 is resolved from app/node_modules; if missing: cd app && npm i --no-save qrcode@1.5.4
const require = createRequire(resolve(here, "../app/package.json"));
let QRCode;
try {
  QRCode = require("qrcode");
} catch {
  console.error("qrcode not found. Run: cd app && npm i --no-save qrcode@1.5.4");
  process.exit(1);
}

await QRCode.toFile(resolve(here, "qr.png"), link, { width: 600, margin: 2 });
const svg = await QRCode.toString(link, { type: "svg", margin: 1 });

const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Donna pilot</title>
<style>
  :root { color-scheme: light; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; background: #fff; color: #111;
         font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center; }
  main { padding: 24px 16px; max-width: 720px; }
  h1 { font-size: clamp(28px, 5vw, 52px); margin: 0 0 8px; }
  p.lead { font-size: clamp(18px, 2.6vw, 26px); margin: 0 0 24px; }
  .qr { width: min(70vw, 420px); margin: 0 auto; }
  .qr svg { width: 100%; height: auto; display: block; }
  .url { font: 600 clamp(14px, 2vw, 20px) ui-monospace, monospace; margin: 16px 0; word-break: break-all; }
  .fine { font-size: clamp(13px, 1.6vw, 16px); color: #444; margin: 4px 0; }
</style></head>
<body><main>
  <h1>Try a 3-minute AI voice screen</h1>
  <p class="lead">Pick an open role at one of the sponsor startups, talk to Donna, get instant feedback.</p>
  <div class="qr">${svg}</div>
  <p class="url">${link}</p>
  <p class="fine">Donna is an AI. The call is recorded and scored. Use headphones in a quiet spot.</p>
  ${demoResearch ? '<p class="fine">The "researching you" step shows demo data today, not your profile.</p>' : ""}
  <p class="fine"><strong>Unofficial hackathon demo. This is not an application to the company.</strong></p>
</main></body></html>
`;
writeFileSync(resolve(here, "sign.html"), html);
console.log(`QR and sign ready for ${link}\n  pilot/qr.png\n  pilot/sign.html`);
