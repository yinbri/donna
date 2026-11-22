# Dev 2 runbook: run Donna on the Mac and share it by QR

## 1. Fresh clone to running app

```bash
git clone <repo-url> donna && cd donna/app
```

```bash
wasp install
```

```bash
cp .env.server.example .env.server
```

Fill in the keys in `.env.server` (empty keys fall back to fixtures).

```bash
wasp db migrate-dev
```

```bash
wasp db seed
```

```bash
wasp start
```

Web runs on http://localhost:3000, server on http://localhost:3001.

## 2. Public HTTPS URL (phones need HTTPS for the microphone)

Install cloudflared once:

```bash
brew install cloudflared
```

In a second terminal, from the repo root, open the two tunnels (web on 3000, server on 3001). Leave it running; Ctrl-C closes both tunnels.

```bash
./scripts/public-url.sh
```

It prints both `https://….trycloudflare.com` URLs and the next command. Stop `wasp start` (Ctrl-C) and restart it with the printed URLs:

```bash
wasp start --client-url https://<web>.trycloudflare.com --server-url https://<server>.trycloudflare.com
```

The script also prints the equivalent env lines (`REACT_APP_API_URL` in `app/.env.client`, `WASP_WEB_CLIENT_URL` and `WASP_SERVER_URL` in `app/.env.server`) if you prefer files. The URLs change on every run of the script, so restart Wasp each time.

Check from your phone on mobile data: open the web URL and confirm the page loads and the mic prompt appears.

## 3. Keep the Mac awake

In a third terminal, for the whole demo:

```bash
caffeinate -dimsu
```

## 4. Show a QR code

No install: open the web URL in Chrome on the Mac, right-click the page and choose "Create QR code for this page" (also under Chrome's Cast, save and share menu). Put it full screen or print it.

Terminal option (needs `qrencode`, not installed yet):

```bash
brew install qrencode
```

```bash
qrencode -t ansiutf8 "https://<web>.trycloudflare.com"
```
