// oh no, it's the nineties — client script.
// Served as a static same-origin file so it satisfies the strict CSP
// (script-src 'self'). Plain JS, no build step.

// ---- Full-screen shimmering B/W static -------------------------------------
const canvas = document.getElementById("static");
const ctx = canvas.getContext("2d", { alpha: false });

// Render noise into a small offscreen buffer, then scale it up chunky.
const buf = document.createElement("canvas");
const bctx = buf.getContext("2d", { alpha: false });

function sizeBuffer() {
  // Keep the buffer small (perf) but proportional to the viewport.
  const scale = 0.34;
  buf.width = Math.max(2, Math.floor(window.innerWidth * scale));
  buf.height = Math.max(2, Math.floor(window.innerHeight * scale));
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx.imageSmoothingEnabled = false;
}
sizeBuffer();
window.addEventListener("resize", sizeBuffer);

const reduceMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
).matches;

let img = bctx.createImageData(buf.width, buf.height);
let lastW = buf.width;
let lastH = buf.height;

function drawStatic() {
  if (buf.width !== lastW || buf.height !== lastH) {
    img = bctx.createImageData(buf.width, buf.height);
    lastW = buf.width;
    lastH = buf.height;
  }
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = (Math.random() * 255) | 0;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  bctx.putImageData(img, 0, 0);
  ctx.drawImage(buf, 0, 0, canvas.width, canvas.height);
}

// ~30fps shimmer (or a gentle ~8fps if the user asked for reduced motion).
const frameGap = reduceMotion ? 120 : 33;
let lastFrame = 0;
function loop(t) {
  if (t - lastFrame >= frameGap) {
    lastFrame = t;
    drawStatic();
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- Dial-up handshake audio (looping mp3) ---------------------------------
const dialup = document.getElementById("dialup");
dialup.loop = true;
dialup.volume = 0.7;
let stopped = false;
let fadeTimer = null;

// play() returns a promise that rejects when autoplay is blocked. Wrap it so
// callers can always .then()/.catch() regardless of browser.
function tryPlay() {
  if (stopped) return Promise.resolve();
  try {
    const p = dialup.play();
    return p && typeof p.then === "function" ? p : Promise.resolve();
  } catch (e) {
    return Promise.reject(e);
  }
}

// Try to start immediately; browsers block autoplay until a gesture, so also
// arm listeners that kick the modem off on the first interaction. The password
// box is focused on load, so the first keystroke doubles as that gesture.
tryPlay().catch(() => {});
function kickstart() {
  if (stopped) {
    removeKick();
    return;
  }
  if (!dialup.paused) {
    removeKick();
    return;
  }
  tryPlay()
    .then(() => {
      if (!dialup.paused) removeKick();
    })
    .catch(() => {});
}
function removeKick() {
  for (const ev of ["pointerdown", "keydown", "touchstart"]) {
    window.removeEventListener(ev, kickstart);
  }
}
for (const ev of ["pointerdown", "keydown", "touchstart"]) {
  window.addEventListener(ev, kickstart, { passive: true });
}

function stopDialup() {
  stopped = true;
  removeKick();
  // Quick fade so the connection doesn't cut off with a click.
  if (fadeTimer === null) {
    fadeTimer = window.setInterval(() => {
      dialup.volume = Math.max(0, dialup.volume - 0.08);
      if (dialup.volume <= 0.001) {
        clearInterval(fadeTimer);
        fadeTimer = null;
        dialup.pause();
      }
    }, 30);
  }
}

// ---- The gate --------------------------------------------------------------
const pw = document.getElementById("pw");
const form = document.getElementById("gate");
const hint = document.getElementById("hint");
let solved = false;

function showHint(text) {
  hint.textContent = text;
  hint.classList.add("show");
}

function check() {
  if (solved) return;
  if (pw.value.trim().toLowerCase() === "pikachu") {
    solved = true;
    stopDialup();
    pw.classList.add("ok");
    pw.blur();
    showHint("…blessed silence. welcome to 1999.");
  }
}

pw.addEventListener("input", check);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  check();
});

// Give first-time visitors a nudge once things are noisy.
window.setTimeout(() => {
  if (!solved) showHint("(the password is a pokémon)");
}, 6000);

// Focus the box so people can just start typing.
window.addEventListener("load", () => pw.focus());
