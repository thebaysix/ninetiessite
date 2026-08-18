// Minesweeper riddle — a fixed, hand-verified 9x9 / 14-mine board that is fully
// solvable by logic (no guessing) from the pre-revealed opening. Its five
// gold-starred cells spell the escape code 1-3-1-3-3 (each star's number is its
// count of neighboring mines). Rendered into a container by initMinesweeper();
// used as the "Minesweeper" app window on the /secret1/ desktop.
//
// To design a new board for another riddle: generate + verify a layout with a
// solver (single-point + subset deduction), then swap MINES / OPENING / STAR_CELLS.

const SIZE = 9;
const MINES = new Set([
  "0,1", "0,6", "0,8", "2,0", "2,2", "3,8", "4,4", "4,5",
  "6,3", "6,8", "7,3", "7,6", "8,0", "8,3",
]);
const OPENING = [
  [0, 2], [0, 3], [0, 4], [0, 5], [1, 2], [1, 3], [1, 4], [1, 5], [1, 6], [1, 7],
  [2, 3], [2, 4], [2, 5], [2, 6], [2, 7], [3, 3], [3, 4], [3, 5], [3, 6], [3, 7],
];
// [row, col, badgeNumber] — read the badges 1..5 for the code.
const STAR_CELLS = [
  [0, 0, 1], [1, 1, 2], [4, 6, 3], [5, 4, 4], [7, 2, 5],
];

const key = (r, c) => r + "," + c;

function neighbors(r, c) {
  const out = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < SIZE && nc >= 0 && nc < SIZE) out.push([nr, nc]);
    }
  }
  return out;
}

// The board is fixed, so counts + star lookup are computed once at module load.
const counts = {};
for (let r = 0; r < SIZE; r++) {
  for (let c = 0; c < SIZE; c++) {
    if (MINES.has(key(r, c))) { counts[key(r, c)] = -1; continue; }
    let n = 0;
    neighbors(r, c).forEach(([nr, nc]) => { if (MINES.has(key(nr, nc))) n++; });
    counts[key(r, c)] = n;
  }
}
const starMap = {}; // key -> badge number
STAR_CELLS.forEach(([r, c, badge]) => { starMap[key(r, c)] = badge; });

const BOARD_HTML =
  `<p class="ms-prompt">Clear every safe square — every mine is findable by logic, ` +
  `no guessing. Five ⭐ squares each hold a digit; read them 1→5 for the code.<br>` +
  `<b>Click</b> reveals · <b>Right-click</b> (or Flag Mode) flags.</p>` +
  `<div class="panel">` +
  `<div class="lcd ms-mineCount">014</div>` +
  `<div class="smiley ms-smiley">🙂</div>` +
  `<div class="lcd ms-timer">000</div>` +
  `</div>` +
  `<div class="board-frame"><div class="grid ms-grid"></div></div>` +
  `<div class="controls">` +
  `<button class="flagmode ms-flagBtn" type="button">🚩 Flag Mode: OFF</button>` +
  `<button class="hint-toggle ms-hintBtn" type="button">need a hint?</button>` +
  `</div>` +
  `<div class="code-panel"><h2>ESCAPE CODE</h2><div class="code-slots">` +
  `<div class="slot" data-slot="1">?</div><div class="slot" data-slot="2">?</div>` +
  `<div class="slot" data-slot="3">?</div><div class="slot" data-slot="4">?</div>` +
  `<div class="slot" data-slot="5">?</div></div></div>` +
  // in-window modal overlays (absolute within .mines)
  `<div class="overlay ms-winOverlay"><div class="overlay-box">` +
  `<div class="ov-title">🏆 FIELD CLEARED</div><div class="overlay-body">` +
  `<div class="big">😎</div><p>The minefield is clear. Your code is:</p>` +
  `<div class="code-out ms-winCode">-----</div>` +
  `<button class="overlay-btn ms-winClose" type="button">OK</button></div></div></div>` +
  `<div class="overlay ms-loseOverlay"><div class="overlay-box">` +
  `<div class="ov-title">💥 BOOM</div><div class="overlay-body">` +
  `<div class="big">😵</div><p>That was a mine. Every mine here is deducible — look ` +
  `for a square whose count is already satisfied by flagged neighbors.</p>` +
  `<button class="overlay-btn ms-loseClose" type="button">Try Again</button></div></div></div>` +
  `<div class="overlay ms-hintOverlay"><div class="overlay-box">` +
  `<div class="ov-title">💡 HINT</div><div class="overlay-body"><p style="text-align:left;">` +
  `• A number = how many of its 8 neighbors are mines.<br><br>` +
  `• If a number's hidden neighbors exactly equal its remaining count, they're ` +
  `<b>all mines</b> — flag them.<br><br>` +
  `• If a number is already satisfied by its flags, every <b>other</b> hidden ` +
  `neighbor is safe.<br><br>` +
  `• When two numbers overlap, the leftover difference is often forced too.</p>` +
  `<button class="overlay-btn ms-hintClose" type="button">Got it</button></div></div></div>`;

// Renders a fresh, self-contained game into `root` (a .mines element).
export function initMinesweeper(root) {
  root.innerHTML = BOARD_HTML;
  const q = (sel) => root.querySelector(sel);

  const gridEl = q(".ms-grid");
  const mineCountEl = q(".ms-mineCount");
  const timerEl = q(".ms-timer");
  const smileyEl = q(".ms-smiley");
  const flagModeBtn = q(".ms-flagBtn");
  const winOverlay = q(".ms-winOverlay");
  const loseOverlay = q(".ms-loseOverlay");
  const hintOverlay = q(".ms-hintOverlay");
  const winCodeEl = q(".ms-winCode");
  const slotEl = (n) => q('.slot[data-slot="' + n + '"]');

  const cellEls = {};
  let revealed, flagged, started, timerInterval, seconds, gameOver, flagMode;

  function buildGrid() {
    gridEl.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const div = document.createElement("div");
        div.className = "cell hidden";
        div.dataset.r = r;
        div.dataset.c = c;
        div.addEventListener("click", onCellClick);
        div.addEventListener("contextmenu", onCellRightClick);
        gridEl.appendChild(div);
        cellEls[key(r, c)] = div;
      }
    }
  }

  function resetGame() {
    revealed = new Set();
    flagged = new Set();
    started = false;
    gameOver = false;
    flagMode = false;
    seconds = 0;
    clearInterval(timerInterval);
    timerEl.textContent = "000";
    smileyEl.textContent = "🙂";
    flagModeBtn.textContent = "🚩 Flag Mode: OFF";
    flagModeBtn.classList.remove("active");
    updateMineCount();
    winOverlay.classList.remove("show");
    loseOverlay.classList.remove("show");
    for (let n = 1; n <= 5; n++) slotEl(n).textContent = "?";

    for (const k in cellEls) {
      cellEls[k].className = "cell hidden";
      cellEls[k].textContent = "";
    }

    // pre-reveal the verified safe opening (the guaranteed-safe "first click")
    OPENING.forEach(([r, c]) => floodFrom(r, c));
    OPENING.forEach(([r, c]) => paintRevealed(r, c));
    checkWin();
  }

  function floodFrom(r, c) {
    const k = key(r, c);
    if (revealed.has(k) || MINES.has(k)) return;
    revealed.add(k);
    if (counts[k] === 0) neighbors(r, c).forEach(([nr, nc]) => floodFrom(nr, nc));
  }

  function paintRevealed(r, c) {
    const k = key(r, c);
    const el = cellEls[k];
    el.className = "cell revealed";
    const val = counts[k];
    if (val > 0) {
      el.textContent = val;
      el.classList.add("n" + val);
    }
    if (starMap[k]) {
      el.classList.add("star");
      const b = document.createElement("span");
      b.className = "badge";
      b.textContent = starMap[k];
      el.appendChild(b);
      slotEl(starMap[k]).textContent = val;
    }
  }

  function updateMineCount() {
    const remaining = MINES.size - flagged.size;
    mineCountEl.textContent = String(Math.max(remaining, 0)).padStart(3, "0");
  }

  function startTimerIfNeeded() {
    if (started) return;
    started = true;
    timerInterval = setInterval(() => {
      seconds = Math.min(seconds + 1, 999);
      timerEl.textContent = String(seconds).padStart(3, "0");
    }, 1000);
  }

  function onCellClick(e) {
    if (gameOver) return;
    const r = parseInt(e.currentTarget.dataset.r, 10);
    const c = parseInt(e.currentTarget.dataset.c, 10);
    const k = key(r, c);
    if (revealed.has(k)) return;
    if (flagMode) { toggleFlag(r, c); return; }
    if (flagged.has(k)) return;
    startTimerIfNeeded();
    if (MINES.has(k)) { loseGame(r, c); return; }
    floodFrom(r, c);
    paintAll();
    checkWin();
  }

  function onCellRightClick(e) {
    e.preventDefault();
    if (gameOver) return;
    const r = parseInt(e.currentTarget.dataset.r, 10);
    const c = parseInt(e.currentTarget.dataset.c, 10);
    if (revealed.has(key(r, c))) return;
    startTimerIfNeeded();
    toggleFlag(r, c);
  }

  function toggleFlag(r, c) {
    const k = key(r, c);
    const el = cellEls[k];
    if (flagged.has(k)) { flagged.delete(k); el.textContent = ""; }
    else { flagged.add(k); el.textContent = "🚩"; }
    updateMineCount();
  }

  function paintAll() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (revealed.has(key(r, c))) paintRevealed(r, c);
      }
    }
  }

  function checkWin() {
    if (revealed.size === SIZE * SIZE - MINES.size) {
      gameOver = true;
      clearInterval(timerInterval);
      smileyEl.textContent = "😎";
      winCodeEl.textContent = STAR_CELLS.map(([r, c]) => counts[key(r, c)]).join("-");
      setTimeout(() => winOverlay.classList.add("show"), 350);
    }
  }

  function loseGame(hitR, hitC) {
    gameOver = true;
    clearInterval(timerInterval);
    smileyEl.textContent = "😵";
    MINES.forEach((k) => {
      const [r, c] = k.split(",").map(Number);
      const el = cellEls[k];
      el.className = "cell revealed";
      el.textContent = "💣";
      if (r === hitR && c === hitC) el.classList.add("mine-hit");
    });
    setTimeout(() => loseOverlay.classList.add("show"), 350);
  }

  smileyEl.addEventListener("click", resetGame);
  q(".ms-winClose").addEventListener("click", () => winOverlay.classList.remove("show"));
  q(".ms-loseClose").addEventListener("click", resetGame);
  q(".ms-hintBtn").addEventListener("click", () => hintOverlay.classList.add("show"));
  q(".ms-hintClose").addEventListener("click", () => hintOverlay.classList.remove("show"));
  flagModeBtn.addEventListener("click", () => {
    flagMode = !flagMode;
    flagModeBtn.textContent = "🚩 Flag Mode: " + (flagMode ? "ON" : "OFF");
    flagModeBtn.classList.toggle("active", flagMode);
  });

  buildGrid();
  resetGame();
}
