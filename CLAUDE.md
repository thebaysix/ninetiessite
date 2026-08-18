# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`ohnoitsthenineties` — a one-page static joke site for https://ohnoitsthenineties.lol.
A visitor lands on full-screen shimmering B/W TV static with a looping 56k dial-up
handshake and a password box. Typing `pikachu` (case-insensitive, trimmed) navigates
to `/secret1/`, which unloads the page and stops the audio. Sibling to
[`devsite`](https://github.com/thebaysix/devsite): same stack, same strict headers,
same `thebaysix` / `thebay6@gmail.com` git identity.

## Commands

```bash
npm install
npm run dev      # localhost:4321 — hot reload
npm run build    # production build to dist/
npm run preview  # serve the built dist/ locally
npm run check    # astro check (type/diagnostic pass)
```

Node 22 (`.nvmrc`). There is no test suite.

## Architecture & constraints

The whole experience is driven by two hard rules that shape where code must live:

- **Strict CSP forbids inline JS.** `public/_headers` sets `script-src 'self'`
  (and `media-src 'self'`) for every response. So all client behavior lives in
  `public/nineties.js` — a plain, same-origin static file with no build step —
  referenced via `<script type="module" src="/nineties.js" is:inline>`. Do **not**
  add inline `<script>` bodies, inline event handlers, or third-party script/media
  sources; that would require loosening the CSP. Inline `<style>` is allowed
  (`style-src` includes `'unsafe-inline'`).
- **Audio autoplay is gated on a user gesture.** Browsers block audible autoplay,
  so a full-screen "click to dial in" `#splash` (in `index.astro`) makes the first
  click part of the experience: it starts the looping `<audio id="dialup">`, removes
  the splash, and focuses the password box. `nineties.js` also arms one-shot
  `pointerdown`/`keydown`/`touchstart` listeners as a fallback.

Key files:
- `src/pages/index.astro` — the entire landing page (markup + global `<style>`).
- `public/nineties.js` — canvas static renderer, dial-up audio start, and the
  password gate. Navigates to `/secret1/` **with the trailing slash** on success to
  match the built route and skip a 308 redirect hop.
- `src/pages/secret1.astro` — the post-password page (currently blank, `noindex`).
- `src/components/Marquee.astro` — decorative site-wide Y2K marquee, included per page.
- `public/_headers` — Cloudflare Pages security headers (source of the CSP above).
- `astro.config.mjs` — static output, `site` URL, `trailingSlash: "ignore"`.

The canvas static is generated per-frame into a small offscreen buffer scaled up
chunky (~30fps, throttled to ~8fps under `prefers-reduced-motion`).

## Deploy

Push to `main` → Cloudflare Pages builds `dist/` and serves it. `dist/` and
`.astro/` are gitignored (the committed `dist/` snapshot is incidental). Git auth is
pinned to the `thebaysix` GitHub account; commits authored as `thebay6@gmail.com`.
