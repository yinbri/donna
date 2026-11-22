import { defineConfig } from "vite";
import { wasp } from "wasp/client/vite";

export default defineConfig({
  plugins: [wasp()],
  server: {
    // Phones reach the dev server through a cloudflared quick tunnel.
    allowedHosts: [".trycloudflare.com"],
  },
});
