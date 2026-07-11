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

// ---- Synthesized dial-up handshake, on loop --------------------------------
let ac = null;
let master = null;
let noiseBuffer = null;
let loopTimer = null;
let stopped = false;

function makeNoise(context) {
  const len = Math.floor(context.sampleRate * 2);
  const b = context.createBuffer(1, len, context.sampleRate);
  const ch = b.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
  return b;
}

function tone(context, dest, freq, start, dur, gain, type) {
  const osc = context.createOscillator();
  const g = context.createGain();
  osc.type = type || "sine";
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.01);
  g.gain.setValueAtTime(gain, start + dur - 0.02);
  g.gain.linearRampToValueAtTime(0, start + dur);
  osc.connect(g).connect(dest);
  osc.start(start);
  osc.stop(start + dur + 0.02);
}

function screech(context, dest, start, dur, gain, centre, q) {
  if (!noiseBuffer) return;
  const src = context.createBufferSource();
  src.buffer = noiseBuffer;
  src.loop = true;
  const bp = context.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = centre;
  bp.Q.value = q;
  const g = context.createGain();
  g.gain.setValueAtTime(0, start);
  g.gain.linearRampToValueAtTime(gain, start + 0.05);
  g.gain.setValueAtTime(gain, start + dur - 0.08);
  g.gain.linearRampToValueAtTime(0, start + dur);
  src.connect(bp).connect(g).connect(dest);
  src.start(start);
  src.stop(start + dur + 0.02);
}

// Schedule one full ~9s dial-up sequence starting at time `t0`.
// Returns the total duration so the loop can re-arm itself.
function scheduleSequence(context, dest, t0) {
  let t = t0;

  // 1) Dial tone — the North American 350 + 440 Hz pair.
  tone(context, dest, 350, t, 1.1, 0.14);
  tone(context, dest, 440, t, 1.1, 0.14);
  t += 1.3;

  // 2) Touch-tone dialing — a fistful of DTMF digits.
  const dtmf = [
    [697, 1209],
    [770, 1336],
    [852, 1477],
    [697, 1477],
    [941, 1336],
    [852, 1209],
    [770, 1477],
  ];
  for (const pair of dtmf) {
    tone(context, dest, pair[0], t, 0.11, 0.15, "sine");
    tone(context, dest, pair[1], t, 0.11, 0.15, "sine");
    t += 0.17;
  }
  t += 0.35;

  // 3) The answer tone — a steady ~2100 Hz carrier.
  tone(context, dest, 2100, t, 0.9, 0.1);
  t += 0.95;

  // 4) The handshake: warbling carrier pairs over filtered noise.
  const warbleStart = t;
  const warbleDur = 3.6;
  let w = warbleStart;
  const pairs = [
    [1200, 2400],
    [1070, 1270],
    [2225, 2025],
    [1600, 2900],
  ];
  let pi = 0;
  while (w < warbleStart + warbleDur) {
    const pair = pairs[pi % pairs.length];
    const seg = 0.09 + Math.random() * 0.06;
    tone(context, dest, pair[0], w, seg, 0.09, "square");
    tone(context, dest, pair[1], w, seg, 0.06, "sine");
    w += seg;
    pi++;
  }
  // Layered noise screeches sweeping through the handshake.
  screech(context, dest, warbleStart, warbleDur, 0.09, 1800, 3);
  screech(context, dest, warbleStart + 0.4, warbleDur - 0.4, 0.06, 3200, 6);
  t = warbleStart + warbleDur;

  // 5) Connection hiss settling out, then a beat of near-silence.
  screech(context, dest, t, 1.1, 0.05, 1000, 1);
  t += 1.1;
  t += 0.5;

  return t - t0;
}

function armLoop() {
  if (!ac || !master || stopped) return;
  const dur = scheduleSequence(ac, master, ac.currentTime + 0.06);
  // Re-arm slightly before the sequence ends for a seamless loop.
  loopTimer = window.setTimeout(armLoop, Math.max(50, (dur - 0.1) * 1000));
}

// Create the audio graph if needed, then (re)try to resume it. Autoplay is
// blocked until a user gesture, so this is safe to call repeatedly: the loop
// only actually arms once the context is genuinely running. (Calling this a
// second time must still resume an already-created-but-suspended context —
// that's the whole point of the gesture retry.)
async function ensureRunning() {
  if (stopped) return;
  if (!ac) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    if (!Ctor) return;
    ac = new Ctor();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
    noiseBuffer = makeNoise(ac);
  }
  try {
    await ac.resume();
  } catch (e) {
    /* ignored — will retry on the next gesture */
  }
  if (ac && ac.state === "running" && loopTimer === null && !stopped) {
    armLoop();
  }
}

function stopDialup() {
  stopped = true;
  if (loopTimer !== null) {
    clearTimeout(loopTimer);
    loopTimer = null;
  }
  if (ac && master) {
    const now = ac.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(master.gain.value, now);
    master.gain.linearRampToValueAtTime(0, now + 0.25);
    const toClose = ac;
    window.setTimeout(() => toClose.close().catch(() => {}), 400);
    ac = null;
    master = null;
  }
}

// Try to start immediately; browsers block autoplay until a gesture, so also
// arm listeners that kick the modem off on the first interaction. The password
// box is focused on load, so the first keystroke doubles as that gesture.
ensureRunning();
function kickstart() {
  if (stopped) {
    removeKick();
    return;
  }
  ensureRunning().then(() => {
    if (!ac || ac.state === "running") removeKick();
  });
}
function removeKick() {
  for (const ev of ["pointerdown", "keydown", "touchstart"]) {
    window.removeEventListener(ev, kickstart);
  }
}
for (const ev of ["pointerdown", "keydown", "touchstart"]) {
  window.addEventListener(ev, kickstart, { passive: true });
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
