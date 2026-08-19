// secret1 — client script (static same-origin file → satisfies CSP script-src 'self').
//
// A wall clock counts up in real time from 11:50:00 PM 12/31/1999. The visitor
// has 10 real minutes to type the next password ("password", placeholder) before
// the clock reaches midnight. At midnight, Y2K breaks the page: a Solitaire card
// cascade, melting images, and nonsensical error dialogs.
//
// Hidden test shortcut: Ctrl+Shift+M — or click the 16px transparent box in the
// bottom-right corner (#skip) — jumps straight to midnight.

import { initMinesweeper } from "/minesweeper.js";

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
  const v = virtualNow();
  if (v >= MIDNIGHT) {
    if (!broken) triggerBreakdown();
  } else {
    maybeForebode(v);
  }
  render();
}
render();
setInterval(tick, 200);

// A foreboding (but not yet cursed) popup once every minute of the countdown.
const FOREBODING = [
  "System clock approaching 00:00:00…",
  "Warning: date rollover in progress.",
  "Have you backed up your files?",
  "Checking Y2K compliance… please wait.",
  "The year 2000 cannot be guaranteed.",
  "Something is coming.",
  "Tick… tock…",
  "Your computer may not survive the transition.",
  "The mainframe grows uneasy.",
  "Please remain calm.",
];
const FOREBODING_TITLES = ["System Notice", "Warning", "Y2K Watch", "Reminder", "Notice"];
const FOREBODING_ICONS = ["⚠️", "⏳", "🕰️", "📅", "💾"];
let lastForebodeMin = new Date(START).getMinutes(); // 50 → first popup at 11:51
function maybeForebode(v) {
  const m = new Date(v).getMinutes();
  if (m === lastForebodeMin) return;
  lastForebodeMin = m;
  const pick = (a) => a[(Math.random() * a.length) | 0];
  errorBox(pick(FOREBODING_TITLES), pick(FOREBODING), pick(FOREBODING_ICONS));
}

// Slow visitor-counter churn, for flavor.
setInterval(() => {
  if (broken) return;
  const n = (parseInt(counter.textContent, 10) || 1999) + ((Math.random() * 3) | 0);
  counter.textContent = String(n).padStart(8, "0");
}, 1500);

// ---- the gate --------------------------------------------------------------
function check() {
  const entered = pw.value.trim().toLowerCase();
  if (!entered) return;
  if (entered !== NEXT_PASSWORD) {
    // Incorrect: shake the box and show denial.
    pw.classList.remove("wrong");
    void pw.offsetWidth; // restart the shake animation if already applied
    pw.classList.add("wrong");
    msg.textContent = "✗ ACCESS DENIED — try again";
    msg.classList.add("bad");
    return;
  }
  if (broken) {
    msg.textContent = "TOO LATE — Y2K HAS CONSUMED THE MAINFRAME";
    msg.classList.add("bad");
    return;
  }
  // Correct: freeze the countdown and (re)show the prize — every time.
  solved = true;
  pw.classList.remove("wrong");
  msg.textContent = "";
  msg.classList.remove("bad");
  pw.blur();
  startAvertedBlink();
  showPrizeBanner();
}

// Once averted, the frozen clock blinks between its held time and "Y2K AVERTED".
let avertedTimer = null;
function startAvertedBlink() {
  if (avertedTimer) return;
  const frozenTime = clockTime.textContent;
  const frozenDate = clockDate.textContent;
  tminus.textContent = "✓ MILLENNIUM SECURED";
  tminus.classList.remove("fail");
  tminus.classList.add("ok");
  if (reduceMotion) {
    clockTime.textContent = "Y2K AVERTED";
    clockDate.textContent = "— SAFE —";
    return;
  }
  let on = true;
  avertedTimer = setInterval(() => {
    on = !on;
    clockTime.textContent = on ? frozenTime : "Y2K AVERTED";
    clockDate.textContent = on ? frozenDate : "— SAFE —";
  }, 700);
}

// Only Submit (button or Enter) checks the password. Typing just clears any
// prior error feedback — it no longer auto-submits on every keystroke.
form.addEventListener("submit", (e) => {
  e.preventDefault();
  check();
});
pw.addEventListener("input", () => {
  pw.classList.remove("wrong");
  if (msg.classList.contains("bad")) {
    msg.textContent = "";
    msg.classList.remove("bad");
  }
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

// ================= DESKTOP APPS =================
// The icons and Start menu open real (draggable, closable) Win98 windows. When
// Y2K has hit (broken), the layer glitches and each window melts shortly after
// it opens — so everything you open is subject to the breakdown too.

const openWindows = {}; // key -> element (also prevents duplicates)
let topZ = 500;

function getAppsLayer() {
  let apps = document.getElementById("apps");
  if (!apps) {
    apps = document.createElement("div");
    apps.id = "apps";
    document.body.appendChild(apps);
    if (broken && !reduceMotion) apps.classList.add("glitch");
  }
  return apps;
}

function focusWin(win) {
  win.style.zIndex = ++topZ;
}

function closeWin(key) {
  const w = openWindows[key];
  if (w) {
    w.remove();
    delete openWindows[key];
  }
}

function makeDraggable(win) {
  const bar = win.querySelector(".win__title");
  bar.style.cursor = "move";
  bar.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".win__btns")) return; // don't drag from the buttons
    focusWin(win);
    const r = win.getBoundingClientRect();
    const dx = e.clientX - r.left;
    const dy = e.clientY - r.top;
    const move = (ev) => {
      win.style.left = ev.clientX - dx + "px";
      win.style.top = ev.clientY - dy + "px";
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    e.preventDefault();
  });
}

// onCreate runs only when the window is first opened (not when re-focused), so
// per-window listeners are wired exactly once.
function openWindow(key, title, bodyHTML, width, onCreate) {
  if (openWindows[key]) {
    focusWin(openWindows[key]);
    return openWindows[key];
  }
  const apps = getAppsLayer();
  const win = document.createElement("div");
  win.className = "win appwin";
  const w = width || 300;
  const n = Object.keys(openWindows).length;
  win.style.width = w + "px";
  win.style.left = Math.max(8, Math.min(window.innerWidth - w - 16, 130 + n * 26)) + "px";
  win.style.top = 66 + n * 24 + "px";
  win.style.zIndex = ++topZ;
  win.innerHTML =
    `<div class="win__title"><span>${title}</span>` +
    `<span class="win__btns"><b class="win__close">✕</b></span></div>` +
    `<div class="win__body">${bodyHTML}</div>`;
  apps.appendChild(win);
  openWindows[key] = win;

  win.addEventListener("pointerdown", () => focusWin(win));
  win.querySelector(".win__close").addEventListener("click", (e) => {
    e.stopPropagation();
    closeWin(key);
  });
  makeDraggable(win);
  if (typeof onCreate === "function") onCreate(win);

  // Subject to the breakdown: if Y2K already happened, this window melts too.
  if (broken && !reduceMotion) setTimeout(() => win.classList.add("melt"), 1200);
  return win;
}

// A one-off Win98 error dialog (distinct from the breeding breakdown dialogs).
function errorBox(title, message, icon) {
  const d = document.createElement("div");
  d.className = "dialog";
  d.style.left = Math.max(20, (window.innerWidth - 300) / 2 + (Math.random() * 80 - 40)) + "px";
  d.style.top = Math.max(60, (window.innerHeight - 160) / 2 + (Math.random() * 80 - 40)) + "px";
  d.style.zIndex = 1500;
  d.innerHTML =
    `<div class="dialog__title"><span>${title}</span><span class="dialog__x">✕</span></div>` +
    `<div class="dialog__body"><span class="dialog__icon">${icon || "❌"}</span><p>${message}</p></div>` +
    `<div class="dialog__foot"><button class="w95btn" type="button">OK</button></div>`;
  document.body.appendChild(d);
  const close = () => d.remove();
  d.querySelector(".dialog__x").addEventListener("click", close);
  d.querySelector(".w95btn").addEventListener("click", close);
}

// ---- app content -----------------------------------------------------------
function computerHTML() {
  return (
    `<div class="drive"><span>🖥️</span><div><b>(C:) BOOT</b><br><small>2000 MB — Y2K status: <span style="color:#b00000">NON-COMPLIANT</span></small></div></div>` +
    `<div class="drive"><span>💾</span><div><b>(A:) 3½ Floppy</b><br><small>1.44 MB</small></div></div>` +
    `<div class="drive"><span>💿</span><div><b>(D:) CD-ROM</b><br><small>Encarta '95</small></div></div>` +
    `<div class="drive"><span>🖨️</span><div><b>Printers</b><br><small>0 ready, 1 on fire</small></div></div>` +
    `<p class="small">4 object(s)</p>`
  );
}
function recycleHTML() {
  return (
    `<p class="small" id="binlist">Contents: the 1990s, homework.doc, Clippy, your free time.</p>` +
    `<button class="w95btn" id="emptybin" type="button">Empty Recycle Bin</button>`
  );
}
// ---- The Internet: an addressable fake Netscape browser --------------------
const HOME_URL = "http://www.geocities.com/Y2Kbunker/";
const SHOP_URL = "http://www.y2kbugbusters.com";

function browserChromeHTML() {
  return (
    `<div class="bnav">` +
    `<button class="bnav__btn" type="button" data-bnav="back" title="Back">◀</button>` +
    `<button class="bnav__btn" type="button" data-bnav="home" title="Home">🏠</button>` +
    `<input class="bnav__url" type="text" spellcheck="false" value="${HOME_URL}">` +
    `<button class="bnav__btn bnav__go" type="button" data-bnav="go">GO</button>` +
    `</div><div class="browser__page"></div>`
  );
}

function pageFor(url) {
  if (broken) {
    return (
      `<p style="color:#b00000"><b>CONNECTION LOST</b></p>` +
      `<p class="small">The Internet ended in 1999.</p>`
    );
  }
  const norm = String(url).toLowerCase().trim()
    .replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
  if (norm.includes("y2kbugbusters")) return shopPageHTML();
  if (norm === "" || norm.includes("geocities") || norm.includes("y2kbunker")) return homePageHTML();
  return (
    `<p style="color:#b00000"><b>404 — Page Not Found</b></p>` +
    `<p class="small">The page “${esc(url)}” could not be found on the World Wide Web (all 12 pages of it).</p>`
  );
}

function homePageHTML() {
  return (
    `<div class="throbber">🌐</div>` +
    `<p><b>Welcome to the World Wide Web!</b></p>` +
    `<p class="small">Connected at 56,000 bps</p>` +
    `<p>⚠️ Worried about the <b>Y2K BUG</b>?<br>` +
    `<a class="weblink blink" data-go="${SHOP_URL}">» Shop Y2K BugBusters «</a></p>` +
    `<p><a class="weblink" data-gbook="1">?? sign my guestbook ??</a></p>`
  );
}

function shopPageHTML() {
  // Left→right: GREEN bug zapper, RED bug spray, YELLOW fly tape.
  const item = (cls, emoji, title, price, bids, rating) =>
    `<div class="listing">` +
    `<div class="listing__img ${cls}">${emoji}</div>` +
    `<div class="listing__title">${title}</div>` +
    `<div class="listing__stars">${rating}</div>` +
    `<div class="listing__price">$${price}</div>` +
    `<div class="listing__bids">${bids} bids · ends in 00:0${bids % 9}</div>` +
    `<button class="listing__buy w95btn" type="button" data-buy="1">Buy It Now</button>` +
    `</div>`;
  return (
    `<div class="ebay">` +
    `<div class="ebay__head">🛒 Y2K BugBusters — Millennium Bug Superstore</div>` +
    `<div class="ebay__grid">` +
    item("green", "⚡", "Y2K Bug Zapper 2000™", "19.99", 12, "★★★★½") +
    item("red", "🧴", "MillenniuMist™ Bug Spray", "9.99", 7, "★★★★☆") +
    item("yellow", "🎗️", "StickyByte™ Fly Tape", "4.99", 3, "★★★½☆") +
    `</div></div>`
  );
}
// ---- D&D Character Creator -------------------------------------------------
const DND_RACES = ["Human", "Elf", "Dwarf", "Halfling", "Half-Orc", "Gnome", "Half-Elf", "Tiefling", "Dragonborn"];
const DND_CLASSES = [
  { n: "Fighter", d: 10, e: "⚔️" }, { n: "Wizard", d: 6, e: "🧙" },
  { n: "Rogue", d: 8, e: "🗡️" }, { n: "Cleric", d: 8, e: "✨" },
  { n: "Ranger", d: 10, e: "🏹" }, { n: "Bard", d: 8, e: "🎵" },
  { n: "Barbarian", d: 12, e: "🪓" }, { n: "Paladin", d: 10, e: "🛡️" },
  { n: "Druid", d: 8, e: "🍃" }, { n: "Sorcerer", d: 6, e: "🔥" },
  { n: "Monk", d: 8, e: "👊" }, { n: "Warlock", d: 8, e: "😈" },
];
const DND_ALIGN = [
  "Lawful Good", "Neutral Good", "Chaotic Good", "Lawful Neutral", "True Neutral",
  "Chaotic Neutral", "Lawful Evil", "Neutral Evil", "Chaotic Evil",
];
const DND_ABILS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
const DND_NAMES = [
  "Aldric", "Bryndhild", "Cormac", "Drizzt", "Elowen", "Fendrel", "Gorak", "Halia",
  "Ithil", "Jorund", "Kaelthas", "Lyra", "Morgaine", "Nyx", "Oswin", "Perrin",
  "Ragnar", "Seraphina", "Thorne", "Ulric", "Vesper", "Wynne", "Xanthe", "Zephyra",
];
const DND_TITLES = [
  "the Bold", "the Wise", "Dragonslayer", "of the Ashen Vale", "the Unlucky",
  "Stormborn", "the Cursed", "Lightbringer", "the Sly", "Ironfoot",
];
const DND_QUIPS = [
  "Rolled a natural 1 on Charisma",
  "Has never actually read the rulebook",
  "Min-maxed to perfection",
  "Will die in the first encounter",
  "Ready to counter your counterspell",
  "A party of orc bards is an orchestra",
  "Just like the role-player, but sexier",
];

function dndHTML() {
  const opts = (arr) => arr.map((v) => `<option>${v}</option>`).join("");
  const classOpts = DND_CLASSES.map((c) => `<option>${c.n}</option>`).join("");
  const abils = DND_ABILS
    .map((ab) => `<div class="abil" data-ab="${ab}"><span class="abil__name">${ab}</span>` +
      `<span class="abil__score">—</span><span class="abil__mod"></span></div>`)
    .join("");
  return (
    `<div class="dnd">` +
    `<div class="dnd__hd">🐉 DND CHARACTER CREATOR v1.0</div>` +
    `<div class="dnd__row"><label>Name</label>` +
    `<input class="dnd__name" maxlength="28" spellcheck="false" placeholder="(unnamed hero)">` +
    `<button class="w95btn dnd__rndname" type="button" title="Random name">🎲</button></div>` +
    `<div class="dnd__row"><label>Race</label><select class="dnd__race">${opts(DND_RACES)}</select></div>` +
    `<div class="dnd__row"><label>Class</label><select class="dnd__class">${classOpts}</select></div>` +
    `<div class="dnd__row"><label>Align</label><select class="dnd__align">${opts(DND_ALIGN)}</select></div>` +
    `<div class="dnd__portrait"><span class="dnd__emoji">⚔️</span><span class="dnd__hp">HP <b>—</b></span></div>` +
    `<div class="dnd__abils">${abils}</div>` +
    `<div class="dnd__ctrls">` +
    `<button class="w95btn dnd__roll" type="button">⚄ ROLL ABILITY SCORES</button>` +
    `<button class="w95btn dnd__rndall" type="button">RANDOMIZE ALL</button></div>` +
    `<p class="dnd__flavor"></p></div>`
  );
}

function wireDnd(win) {
  const root = win.querySelector(".dnd");
  const nameEl = root.querySelector(".dnd__name");
  const raceEl = root.querySelector(".dnd__race");
  const classEl = root.querySelector(".dnd__class");
  const alignEl = root.querySelector(".dnd__align");
  const emojiEl = root.querySelector(".dnd__emoji");
  const hpEl = root.querySelector(".dnd__hp b");
  const flavorEl = root.querySelector(".dnd__flavor");
  const scores = {}; // ability -> score

  const pick = (a) => a[(Math.random() * a.length) | 0];
  const d6 = () => 1 + ((Math.random() * 6) | 0);
  const mod = (s) => Math.floor((s - 10) / 2);
  const modStr = (m) => (m >= 0 ? "+" + m : "" + m);
  const classInfo = () => DND_CLASSES.find((c) => c.n === classEl.value) || DND_CLASSES[0];

  function updatePortrait() {
    const ci = classInfo();
    emojiEl.textContent = broken ? "💀" : ci.e;
    hpEl.textContent = scores.CON != null ? Math.max(1, ci.d + mod(scores.CON)) : "—";
  }

  function setFlavor() {
    const nm = nameEl.value.trim() || "This nameless wanderer";
    flavorEl.textContent =
      `${nm}: ${alignEl.value} ${raceEl.value} ${classEl.value}. ` +
      (broken ? "The character sheet bursts into flames." : pick(DND_QUIPS));
  }

  function rollAbilities() {
    DND_ABILS.forEach((ab) => {
      const r = [d6(), d6(), d6(), d6()].sort((a, b) => a - b);
      const score = r[1] + r[2] + r[3]; // 4d6, drop the lowest
      scores[ab] = score;
      const cell = root.querySelector('.abil[data-ab="' + ab + '"]');
      cell.querySelector(".abil__score").textContent = score;
      cell.querySelector(".abil__mod").textContent = modStr(mod(score));
    });
    updatePortrait();
    setFlavor();
  }

  root.querySelector(".dnd__roll").addEventListener("click", rollAbilities);
  root.querySelector(".dnd__rndname").addEventListener("click", () => {
    nameEl.value = pick(DND_NAMES) + " " + pick(DND_TITLES);
    setFlavor();
  });
  root.querySelector(".dnd__rndall").addEventListener("click", () => {
    nameEl.value = pick(DND_NAMES) + " " + pick(DND_TITLES);
    raceEl.value = pick(DND_RACES);
    classEl.selectedIndex = (Math.random() * DND_CLASSES.length) | 0;
    alignEl.value = pick(DND_ALIGN);
    rollAbilities();
  });
  classEl.addEventListener("change", () => { updatePortrait(); setFlavor(); });
  raceEl.addEventListener("change", setFlavor);
  alignEl.addEventListener("change", setFlavor);

  updatePortrait();
}
function documentsHTML() {
  return (
    `<p class="small">📄 resume_FINAL_final_v2.doc<br>📄 homework.txt<br>` +
    `📄 secret_diary_DO_NOT_OPEN.txt<br>📁 napster_downloads\\</p>`
  );
}
function settingsHTML() {
  return (
    `<p class="small">Control Panel</p>` +
    `<div class="drive"><span>🕐</span><div><b>Date/Time</b><br><small>System date: 12/31/1999 — do NOT advance</small></div></div>` +
    `<div class="drive"><span>🔊</span><div><b>Sounds</b><br><small>dialup.wav</small></div></div>` +
    `<div class="drive"><span>🖥️</span><div><b>Display</b><br><small>640×480, 16 colors</small></div></div>`
  );
}
function findHTML() {
  return (
    `<p>Named: <b>the future</b></p><p class="small">Look in: (C:)</p>` +
    `<p style="color:#b00000">Search complete. 0 file(s) found.<br>The future is not on this computer.</p>`
  );
}
function helpHTML() {
  return (
    `<p><b>Troubleshooting Wizard</b></p>` +
    `<p class="small">Have you tried turning it off and on again?</p>` +
    `<p class="small">If the problem persists, it is now the year 1900.</p>`
  );
}
function runHTML() {
  return (
    `<p class="small">Type the name of a program to open it — try MINESWEEPER, DND, INTERNET, GUESTBOOK…</p>` +
    `<div class="runrow"><span>Open:</span><input class="runinput" id="runinput" type="text" spellcheck="false" /></div>` +
    `<div class="runfoot"><button class="w95btn" id="runok" type="button">OK</button></div>`
  );
}
function shutdownHTML() {
  return (
    `<p class="small">What do you want the computer to do?</p>` +
    `<p class="sdopts"><b>◉ Shut down</b><br>○ Restart<br>○ Restart in MS-DOS mode</p>` +
    `<div class="runfoot"><button class="w95btn" id="sdok" type="button">OK</button>` +
    `<button class="w95btn" id="sdcancel" type="button">Cancel</button></div>`
  );
}

// ---- openers ---------------------------------------------------------------
function openApp(app) {
  if (app === "computer") openWindow("computer", "🖥️ My Computer", computerHTML(), 320);
  else if (app === "recycle")
    openWindow("recycle", "🗑️ Recycle Bin", recycleHTML(), 300, (win) => {
      win.querySelector("#emptybin").addEventListener("click", () => {
        win.querySelector("#binlist").textContent = broken
          ? "Cannot empty: 2000 item(s) restored themselves."
          : "The Recycle Bin is now empty.";
      });
    });
  else if (app === "internet")
    openWindow("internet", "🌐 The Internet — Netscape", browserChromeHTML(), 460, (win) => {
      const urlInput = win.querySelector(".bnav__url");
      const pageEl = win.querySelector(".browser__page");
      const hist = [];
      const wireLinks = () => {
        pageEl.querySelectorAll("[data-go]").forEach((a) => a.addEventListener("click", () => go(a.dataset.go)));
        pageEl.querySelectorAll("[data-gbook]").forEach((a) => a.addEventListener("click", openGuestbook));
        pageEl.querySelectorAll("[data-buy]").forEach((btn) =>
          btn.addEventListener("click", () =>
            errorBox("Y2K BugBusters", "Order failed — your credit card expires 00/00/00.", "💳")
          )
        );
      };
      const go = (url, push) => {
        if (push !== false) hist.push(url);
        urlInput.value = url;
        pageEl.innerHTML = pageFor(url);
        wireLinks();
      };
      win.querySelector('[data-bnav="go"]').addEventListener("click", () => go(urlInput.value));
      win.querySelector('[data-bnav="home"]').addEventListener("click", () => go(HOME_URL));
      win.querySelector('[data-bnav="back"]').addEventListener("click", () => {
        if (hist.length > 1) { hist.pop(); go(hist[hist.length - 1], false); }
      });
      urlInput.addEventListener("keydown", (e) => { if (e.key === "Enter") go(urlInput.value); });
      go(HOME_URL);
    });
  else if (app === "mines")
    openWindow("mines", "💣 Minesweeper", `<div class="mines"></div>`, 380, (win) => {
      initMinesweeper(win.querySelector(".mines"));
    });
  else if (app === "dnd")
    openWindow("dnd", "🐉 DND Creator", dndHTML(), 340, wireDnd);
}

// Resolve a typed program name to an action. Returns true if it launched.
function runProgram(raw) {
  const v = raw.trim().toLowerCase().replace(/\.exe$/, "").replace(/\s+/g, " ");
  if (v === "y2k" || v === "format c:" || v === "format") { goMidnight(); return true; }
  if (v === "guestbook" || v === "gbook") { openGuestbook(); return true; }

  // typed name -> desktop app (openApp), including real Win9x exe names
  const apps = {
    minesweeper: "mines", mines: "mines", winmine: "mines",
    dnd: "dnd", "d&d": "dnd", "d&d creator": "dnd", chargen: "dnd", character: "dnd",
    internet: "internet", iexplore: "internet", explorer: "internet",
    netscape: "internet", www: "internet", web: "internet",
    "my computer": "computer", computer: "computer",
    "recycle bin": "recycle", recycle: "recycle",
  };
  if (apps[v]) { openApp(apps[v]); return true; }

  // typed name -> Start-menu command
  const cmds = {
    documents: "documents", settings: "settings", control: "settings",
    "control panel": "settings", find: "find", search: "find",
    help: "help", winhelp: "help",
  };
  if (cmds[v]) { runStartCmd(cmds[v]); return true; }

  return false;
}

function openRunDialog() {
  openWindow("run", "🏃 Run", runHTML(), 340, (win) => {
    const input = win.querySelector("#runinput");
    const go = () => {
      const raw = input.value.trim();
      if (!raw) return;
      if (runProgram(raw)) { closeWin("run"); return; }
      errorBox(
        "Run",
        `Windows cannot find '${raw}'. Make sure you typed the name correctly, and then try again.`,
        "❌"
      );
    };
    win.querySelector("#runok").addEventListener("click", go);
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") go(); });
    setTimeout(() => input.focus(), 0);
  });
}

function openShutdownDialog() {
  openWindow("shutdown", "⏻ Shut Down Windows", shutdownHTML(), 320, (win) => {
    win.querySelector("#sdcancel").addEventListener("click", () => closeWin("shutdown"));
    win.querySelector("#sdok").addEventListener("click", () => {
      closeWin("shutdown");
      shutDown();
    });
  });
}

function shutDown() {
  const ov = document.createElement("div");
  ov.className = "shutdown";
  ov.innerHTML = `<div><p>It's now safe to turn off<br>your computer.</p><p class="small">(click to return)</p></div>`;
  // Just dismiss the overlay — no reload, so the countdown keeps its place.
  ov.addEventListener("click", () => ov.remove());
  document.body.appendChild(ov);
}

// ---- guestbook (opened from the decor window and the browser home page) -----
const GBOOK_KEY = "y2k_guestbook";
const GBOOK_SEED = [
  { n: "webmaster", m: "Welcome 2 my site!!! Best viewed in Netscape Navigator @ 800x600.", d: "12/28/1999" },
  { n: "Sk8erBoi97", m: "this site is da BOMB 💣 sign mine back!!", d: "12/30/1999" },
  { n: "Y2K_Survivor", m: "stocked up on canned beans + bottled water. see u in the year 2000 (maybe)", d: "12/31/1999" },
  { n: "xX_AOLkid_Xx", m: "a/s/l?? this page is kewl 8)", d: "12/31/1999" },
];

function esc(s) {
  return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
function loadGbook() {
  try { return JSON.parse(localStorage.getItem(GBOOK_KEY)) || []; } catch (e) { return []; }
}
function saveGbook(list) {
  try { localStorage.setItem(GBOOK_KEY, JSON.stringify(list)); } catch (e) { /* private mode */ }
}

function openGuestbook() {
  openWindow("guestbook", "📖 Guestbook", `<div class="gbook"></div>`, 360, (win) => {
    const root = win.querySelector(".gbook");
    const render = () => {
      const all = loadGbook().concat(GBOOK_SEED); // newest (user) entries first
      root.innerHTML =
        `<p class="gbook__title">✍️ Sign My Guestbook!</p>` +
        `<div class="gbook__list">` +
        all
          .map(
            (e) =>
              `<div class="gbook__entry"><div class="gbook__meta"><b>${esc(e.n)}</b>` +
              `<span>${esc(e.d)}</span></div><div class="gbook__body">${esc(e.m)}</div></div>`
          )
          .join("") +
        `</div>` +
        `<form class="gbook__form">` +
        `<input class="gbook__name" maxlength="24" spellcheck="false" placeholder="name / handle">` +
        `<textarea class="gbook__in" maxlength="200" placeholder="leave a message!"></textarea>` +
        `<button class="w95btn" type="submit">Sign It!</button></form>`;
      root.querySelector(".gbook__form").addEventListener("submit", (e) => {
        e.preventDefault();
        const m = root.querySelector(".gbook__in").value.trim();
        if (!m) return;
        const n = root.querySelector(".gbook__name").value.trim() || "anonymous";
        const list = loadGbook();
        list.unshift({ n, m, d: "12/31/1999" });
        saveGbook(list);
        render();
      });
    };
    render();
  });
}

// ---- "you saved the millennium" prize banner (on correct password) ---------
function showPrizeBanner() {
  const existing = document.getElementById("prizeBanner");
  if (existing) existing.remove(); // re-show fresh every time
  const el = document.createElement("div");
  el.id = "prizeBanner";
  el.className = "prize";
  el.innerHTML =
    `<div class="prize__box">` +
    `<button class="prize__x" type="button" aria-label="Close">✕</button>` +
    `<p class="prize__hd">🎆 YOU HAVE SAVED THE MILLENNIUM! 🎆</p>` +
    `<button class="prize__claim" type="button">★ CLAIM PRIZE ★</button>` +
    `<p class="prize__reveal"></p></div>`;
  document.body.appendChild(el);
  el.querySelector(".prize__x").addEventListener("click", () => el.remove());
  el.querySelector(".prize__claim").addEventListener("click", (e) => {
    e.currentTarget.style.display = "none";
    el.querySelector(".prize__reveal").textContent = "🐦 BIRD IS THE WORD 🐦";
  });
}

// ---- the Start menu --------------------------------------------------------
const startBtn = document.querySelector(".start");
let startMenu = null;

function closeStart() {
  if (startMenu) {
    startMenu.remove();
    startMenu = null;
    startBtn.classList.remove("active");
  }
}

function runStartCmd(cmd) {
  switch (cmd) {
    case "dnd": openApp("dnd"); break;
    case "documents": openWindow("documents", "📄 My Documents", documentsHTML(), 300); break;
    case "settings": openWindow("settings", "⚙️ Control Panel", settingsHTML(), 320); break;
    case "find": openWindow("find", "🔍 Find: All Files", findHTML(), 320); break;
    case "help": openWindow("help", "❓ Windows Help", helpHTML(), 300); break;
    case "run": openRunDialog(); break;
    case "shutdown": openShutdownDialog(); break;
  }
}

startBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (startMenu) { closeStart(); return; }
  startMenu = document.createElement("div");
  startMenu.className = "startmenu";
  startMenu.innerHTML =
    `<div class="startmenu__side">Windows&nbsp;98</div>` +
    `<div class="startmenu__items">` +
    `<button class="startmenu__item" type="button" data-cmd="dnd">📁&nbsp; Programs</button>` +
    `<button class="startmenu__item" type="button" data-cmd="documents">📄&nbsp; Documents</button>` +
    `<button class="startmenu__item" type="button" data-cmd="settings">⚙️&nbsp; Settings</button>` +
    `<button class="startmenu__item" type="button" data-cmd="find">🔍&nbsp; Find</button>` +
    `<button class="startmenu__item" type="button" data-cmd="help">❓&nbsp; Help</button>` +
    `<hr>` +
    `<button class="startmenu__item" type="button" data-cmd="run">🏃&nbsp; Run...</button>` +
    `<button class="startmenu__item" type="button" data-cmd="shutdown">⏻&nbsp; Shut Down...</button>` +
    `</div>`;
  document.body.appendChild(startMenu);
  startBtn.classList.add("active");
  startMenu.querySelectorAll(".startmenu__item").forEach((it) =>
    it.addEventListener("click", () => {
      const cmd = it.dataset.cmd;
      closeStart();
      runStartCmd(cmd);
    })
  );
});
window.addEventListener("click", (e) => {
  if (startMenu && !e.target.closest(".startmenu") && !e.target.closest(".start")) closeStart();
});

// ---- wire the desktop icons ------------------------------------------------
document.querySelectorAll(".icon").forEach((ic) => {
  const open = () => {
    document.querySelectorAll(".icon").forEach((i) => i.classList.remove("sel"));
    ic.classList.add("sel");
    openApp(ic.dataset.app);
  };
  ic.addEventListener("click", open);
  ic.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); }
  });
});

// ---- wire the "sign my guestbook" link in the decor window -----------------
document.querySelectorAll(".gbook-link").forEach((el) => {
  el.addEventListener("click", openGuestbook);
  el.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openGuestbook(); }
  });
});

// ================= Y2K BREAKDOWN =================
function triggerBreakdown() {
  if (broken) return;
  broken = true;

  meltEverything();
  if (!reduceMotion) {
    document.getElementById("desktop").classList.add("glitch");
    const apps = document.getElementById("apps");
    if (apps) apps.classList.add("glitch"); // any already-open app windows glitch too
  }
  startSolitaire();
  startDialogs();
}

// ---- melting images / windows ----------------------------------------------
function meltEverything() {
  const targets = document.querySelectorAll(".melt-target, .win--decor, .icon, .appwin");
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
