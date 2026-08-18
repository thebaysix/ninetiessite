// secret1 — client script (static same-origin file → satisfies CSP script-src 'self').
//
// A wall clock counts up in real time from 11:50:00 PM 12/31/1999. The visitor
// has 10 real minutes to type the next password ("password", placeholder) before
// the clock reaches midnight. At midnight, Y2K breaks the page: a Solitaire card
// cascade, melting images, and nonsensical error dialogs.
//
// Hidden test shortcut: Ctrl+Shift+M — or click the 16px transparent box in the
// bottom-right corner (#skip) — jumps straight to midnight.

const START = new Date(1999, 11, 31, 23, 50, 0).getTime(); // 11:50:00 PM 12/31/1999
const MIDNIGHT = new Date(2000, 0, 1, 0, 0, 0).getTime(); //  12:00:00 AM 01/01/2000
const DURATION = MIDNIGHT - START; // 10 minutes of real time

const NEXT_PASSWORD = "password"; // placeholder — TBD

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// startedAt is the real-world instant the countdown began. Shifting it into the
// past is how "Go To Midnight" fast-forwards the virtual clock.
let startedAt = Date.now();
let broken = false; // Y2K has hit
let solved = false; // correct password entered in time

const virtualNow = () => START + (Date.now() - startedAt);

// ---- elements --------------------------------------------------------------
const clockTime = document.getElementById("clockTime");
const clockDate = document.getElementById("clockDate");
const tminus = document.getElementById("tminus");
const trayclock = document.getElementById("trayclock");
const counter = document.getElementById("counter");
const form = document.getElementById("gate");
const pw = document.getElementById("pw");
const msg = document.getElementById("msg");

// ---- formatting ------------------------------------------------------------
const pad = (n) => String(n).padStart(2, "0");

function fmtTime(d) {
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${ampm}`;
}

function fmtCountdown(ms) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${pad((total / 60) | 0)}:${pad(total % 60)}`;
}

// ---- the clock -------------------------------------------------------------
function render() {
  const v = virtualNow();
  const d = new Date(v);
  clockTime.textContent = fmtTime(d);
  trayclock.textContent = fmtTime(d).replace(/:\d\d /, " "); // taskbar: no seconds

  if (v < MIDNIGHT) {
    clockDate.textContent = "12 / 31 / 1999";
    tminus.textContent = `T–${fmtCountdown(MIDNIGHT - v)} UNTIL Y2K`;
  } else {
    // The bug itself: two-digit year rolls to 1900 (and sometimes overflows).
    clockDate.textContent = Math.random() < 0.15 ? "01 / 01 / 19100" : "01 / 01 / 1900";
    tminus.textContent = "!! SYSTEM FAILURE !!";
    tminus.classList.add("fail");
  }
}

function tick() {
  if (solved) return;
  if (virtualNow() >= MIDNIGHT && !broken) triggerBreakdown();
  render();
}
render();
setInterval(tick, 200);

// Slow visitor-counter churn, for flavor.
setInterval(() => {
  if (broken) return;
  const n = (parseInt(counter.textContent, 10) || 1999) + ((Math.random() * 3) | 0);
  counter.textContent = String(n).padStart(8, "0");
}, 1500);

// ---- the gate --------------------------------------------------------------
function check() {
  if (solved) return;
  if (pw.value.trim().toLowerCase() !== NEXT_PASSWORD) return;
  if (broken) {
    msg.textContent = "TOO LATE — Y2K HAS CONSUMED THE MAINFRAME";
    msg.classList.add("bad");
    return;
  }
  // Beat the clock: freeze the countdown and hold. (Next stage TBD — point this
  // at /secret2/ once it exists.)
  solved = true;
  pw.blur();
  msg.textContent = "AUTHORIZATION ACCEPTED — Y2K BUG CONTAINED ✓";
}

pw.addEventListener("input", check);
form.addEventListener("submit", (e) => {
  e.preventDefault();
  check();
});

// ---- hidden "Go To Midnight" test shortcut ---------------------------------
function goMidnight() {
  if (solved || broken) return;
  startedAt = Date.now() - DURATION - 1000; // virtualNow() jumps past MIDNIGHT
  tick();
}
document.getElementById("skip").addEventListener("click", goMidnight);
window.addEventListener("keydown", (e) => {
  if (e.ctrlKey && e.shiftKey && (e.key === "M" || e.key === "m")) {
    e.preventDefault();
    goMidnight();
  }
});

// ================= Y2K BREAKDOWN =================
function triggerBreakdown() {
  if (broken) return;
  broken = true;

  meltEverything();
  if (!reduceMotion) document.getElementById("desktop").classList.add("glitch");
  startSolitaire();
  startDialogs();
}

// ---- melting images / windows ----------------------------------------------
function meltEverything() {
  const targets = document.querySelectorAll(".melt-target, .win--decor, .icon");
  targets.forEach((el, i) => {
    el.style.animationDelay = (i * 0.25).toFixed(2) + "s";
    el.classList.add("melt");
  });
}

// ---- Solitaire card cascade ------------------------------------------------
function startSolitaire() {
  const layer = document.createElement("div");
  layer.id = "cardlayer";
  document.body.appendChild(layer);

  const suits = [["♥", "#d40000"], ["♦", "#d40000"], ["♠", "#000"], ["♣", "#000"]];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const W = () => window.innerWidth;
  const H = () => window.innerHeight;

  const MAX_TRAILS = 1400;
  let trails = 0;
  const bouncers = [];

  function makeFace() {
    const [suit, color] = suits[(Math.random() * 4) | 0];
    const rank = ranks[(Math.random() * ranks.length) | 0];
    const el = document.createElement("div");
    el.className = "card";
    el.style.color = color;
    el.innerHTML =
      `<span class="card__c tl">${rank}${suit}</span>` +
      `<span class="card__s">${suit}</span>` +
      `<span class="card__c br">${rank}${suit}</span>`;
    return el;
  }

  function spawn() {
    const el = makeFace();
    layer.appendChild(el);
    bouncers.push({
      el,
      x: W() * 0.2 + Math.random() * W() * 0.6,
      y: -80,
      vx: (Math.random() * 2 - 1) * 7,
      vy: Math.random() * 3,
    });
  }

  let spawned = 0;
  spawn();
  const spawnTimer = setInterval(() => {
    if (++spawned >= 8) clearInterval(spawnTimer);
    else spawn();
  }, 650);

  const G = 0.6;
  const BOUNCE = 0.78;
  function frame() {
    for (const p of bouncers) {
      p.vy += G;
      p.x += p.vx;
      p.y += p.vy;
      if (p.y > H() - 66) {
        p.y = H() - 66;
        p.vy *= -BOUNCE;
        if (Math.abs(p.vy) < 2.5) p.vy = -(6 + Math.random() * 11); // never rest
      }
      if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); }
      if (p.x > W() - 46) { p.x = W() - 46; p.vx = -Math.abs(p.vx); }
      const tf = `translate(${p.x | 0}px, ${p.y | 0}px)`;
      p.el.style.transform = tf;
      // Leave a static trail behind (the classic "window didn't repaint" smear).
      if (trails < MAX_TRAILS) {
        const t = p.el.cloneNode(true);
        t.classList.add("card--trail");
        t.style.transform = tf;
        layer.appendChild(t);
        trails++;
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

// ---- nonsensical error dialogs ---------------------------------------------
function startDialogs() {
  const MESSAGES = [
    "Task Failed Successfully.",
    "Error: The operation completed successfully.",
    "Warning: Nothing is wrong. Please panic.",
    "Y2K.EXE has caused an error in 1900.DLL and will now feel fine.",
    "The current year is 19100. This is normal.",
    "System32 has gained sentience.",
    "Do you want to save changes to REALITY.TXT?",
    "Insufficient memory to display this error message.",
    "Press F1 to continue. There is no F1.",
    "C:\\ is no longer a valid decade.",
    "Millennium Bug detected. Bug promoted to feature.",
    "Cannot delete PANIC: file is in use by everyone.",
  ];
  const TITLES = ["System Error", "Warning", "C:\\WINDOWS", "Y2K.EXE", "Notice", "Fatal"];
  const ICONS = ["⚠️", "❌", "ℹ️", "💾", "💀"];

  const MAX = 42;
  let count = 0;

  function spawn() {
    if (count >= MAX) return;
    count++;
    const d = document.createElement("div");
    d.className = "dialog";
    d.style.left = Math.max(4, Math.random() * (window.innerWidth - 300)) + "px";
    d.style.top = Math.max(40, Math.random() * (window.innerHeight - 170)) + "px";
    const pick = (a) => a[(Math.random() * a.length) | 0];
    d.innerHTML =
      `<div class="dialog__title"><span>${pick(TITLES)}</span><span class="dialog__x">✕</span></div>` +
      `<div class="dialog__body"><span class="dialog__icon">${pick(ICONS)}</span><p>${pick(MESSAGES)}</p></div>` +
      `<div class="dialog__foot"><button class="w95btn" type="button">OK</button><button class="w95btn" type="button">OK</button></div>`;
    document.body.appendChild(d);

    const close = () => { d.remove(); count--; };
    d.querySelector(".dialog__x").addEventListener("click", close);
    // Every button closes this one and breeds two more — until the cap.
    d.querySelectorAll(".w95btn").forEach((b) =>
      b.addEventListener("click", () => { close(); spawn(); spawn(); })
    );
  }

  spawn();
  spawn();
  const wave = setInterval(() => {
    spawn();
    if (count >= 9) clearInterval(wave);
  }, 850);
}
