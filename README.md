# ohnoitsthenineties

A one-page static joke site for **https://ohnoitsthenineties.lol**.

Visit it and you get a full-screen wall of shimmering black-and-white television
static, a synthesized 56k dial-up handshake screeching on loop, and a single
password box in the middle of the screen. Type **`pikachu`** and the modem
finally connects — the noise cuts out and you're welcomed to 1999.

Sibling to [`devsite`](https://github.com/thebaysix/devsite): same stack (static
Astro → Cloudflare Pages), same strict security headers, same `thebaysix` /
`thebay6@gmail.com` git identity.

## Stack

- **Astro** static output, Node 22 (see `.nvmrc`).
- The whole experience is one page (`src/pages/index.astro`) plus one static,
  same-origin client script (`public/nineties.js`).
- **No binary assets.** The dial-up sound is synthesized live with the Web Audio
  API (dial tone → DTMF digits → answer tone → warbling handshake over filtered
  noise), and the static is generated per-frame on a `<canvas>`. This keeps the
  page tiny and lets it satisfy the strict CSP with no `media-src` or inline JS.

## Commands

```bash
npm install
npm run dev      # localhost:4321 — hot reload
npm run build    # production build to dist/
npm run preview  # serve the built dist/ locally
```

## Notes

- **Autoplay.** Browsers block audio until a user gesture, so the script tries to
  start immediately and also arms a one-shot `pointerdown`/`keydown`/`touchstart`
  listener that kicks the modem off on first interaction.
- **The gate** checks the input on every keystroke (case-insensitive, trimmed);
  `pikachu` ramps the master gain to zero and closes the `AudioContext`.
- **CSP.** Security headers live in `public/_headers` (mirrors `devsite`). The
  client script is a static same-origin file — not inline — so `script-src 'self'`
  holds without `'unsafe-inline'`.

## Deploy

Out of scope here, but the intent mirrors `devsite`: push to `main` → Cloudflare
Pages builds `dist/` and serves it. Git auth is pinned to the `thebaysix` GitHub
account; commits authored as `thebay6@gmail.com`.
