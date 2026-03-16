const TILE = 28;
const ROWS = 15;
const COLS = 15;

const mapTemplate = [
  "###############",
  "#.............#",
  "#.###.###.###.#",
  "#.............#",
  "#.###.#.#.###.#",
  "#.....#.#.....#",
  "#####.#.#.#####",
  "#.............#",
  "#.###.#.#.###.#",
  "#...#.....#...#",
  "###.#.###.#.###",
  "#.............#",
  "#.###.###.###.#",
  "#.............#",
  "###############",
];

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const dotsEl = document.getElementById("dots");
const statusEl = document.getElementById("status");
const restartBtn = document.getElementById("restart");

let map;
let score;
let dots;
let running;
let pendingDirection;
let pacman;
let ghost;
let lastTick = 0;
const speedMs = 130;

function resetGame() {
  map = mapTemplate.map((row) => row.split(""));
  score = 0;
  running = false;
  pendingDirection = { x: 1, y: 0 };
  pacman = { x: 1, y: 1, dir: { x: 1, y: 0 }, mouth: 0 };
  ghost = { x: 13, y: 13, dir: { x: -1, y: 0 } };

  dots = map.flat().filter((cell) => cell === ".").length;
  updateHud();
  statusEl.textContent = "按空格开始游戏";
  draw();
}

function updateHud() {
  scoreEl.textContent = score;
  dotsEl.textContent = dots;
}

function isWall(x, y) {
  return map[y]?.[x] === "#";
}

function canMove(entity, dir) {
  return !isWall(entity.x + dir.x, entity.y + dir.y);
}

function stepEntity(entity, dir) {
  entity.x += dir.x;
  entity.y += dir.y;
}

function handleInput(event) {
  const key = event.key.toLowerCase();
  const keyMap = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };

  if (key === " ") {
    running = true;
    statusEl.textContent = "游戏进行中…";
    return;
  }

  if (keyMap[key]) {
    pendingDirection = keyMap[key];
  }
}

function movePacman() {
  if (canMove(pacman, pendingDirection)) {
    pacman.dir = pendingDirection;
  }

  if (canMove(pacman, pacman.dir)) {
    stepEntity(pacman, pacman.dir);
  }

  if (map[pacman.y][pacman.x] === ".") {
    map[pacman.y][pacman.x] = " ";
    score += 10;
    dots -= 1;
    updateHud();

    if (dots === 0) {
      running = false;
      statusEl.textContent = "🎉 你赢了！按重新开始再来一局";
    }
  }

  pacman.mouth = (pacman.mouth + 1) % 10;
}

function moveGhost() {
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  const available = dirs.filter((dir) => canMove(ghost, dir));
  const towardPacman = available.sort((a, b) => {
    const ad = Math.abs(pacman.x - (ghost.x + a.x)) + Math.abs(pacman.y - (ghost.y + a.y));
    const bd = Math.abs(pacman.x - (ghost.x + b.x)) + Math.abs(pacman.y - (ghost.y + b.y));
    return ad - bd;
  });

  if (towardPacman.length > 0) {
    ghost.dir = Math.random() < 0.7 ? towardPacman[0] : towardPacman[Math.floor(Math.random() * towardPacman.length)];
    stepEntity(ghost, ghost.dir);
  }
}

function detectCollision() {
  if (pacman.x === ghost.x && pacman.y === ghost.y) {
    running = false;
    statusEl.textContent = "💥 被幽灵抓到了！点击重新开始";
  }
}

function drawMaze() {
  for (let y = 0; y < ROWS; y += 1) {
    for (let x = 0; x < COLS; x += 1) {
      const px = x * TILE;
      const py = y * TILE;
      const cell = map[y][x];

      if (cell === "#") {
        ctx.fillStyle = "#2f67ff";
        ctx.fillRect(px, py, TILE, TILE);
      } else if (cell === ".") {
        ctx.fillStyle = "#ffe88a";
        ctx.beginPath();
        ctx.arc(px + TILE / 2, py + TILE / 2, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

function drawPacman() {
  const cx = pacman.x * TILE + TILE / 2;
  const cy = pacman.y * TILE + TILE / 2;
  const open = pacman.mouth < 5 ? 0.2 : 0.03;
  const angle = Math.atan2(pacman.dir.y, pacman.dir.x);

  ctx.fillStyle = "#ffd400";
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, TILE / 2 - 3, angle + open, angle - open + Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

function drawGhost() {
  const x = ghost.x * TILE;
  const y = ghost.y * TILE;

  ctx.fillStyle = "#ff4b7d";
  ctx.beginPath();
  ctx.arc(x + TILE / 2, y + TILE / 2, TILE / 2 - 3, Math.PI, 0);
  ctx.rect(x + 3, y + TILE / 2, TILE - 6, TILE / 2 - 3);
  ctx.fill();

  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(x + 10, y + 14, 3, 0, Math.PI * 2);
  ctx.arc(x + 18, y + 14, 3, 0, Math.PI * 2);
  ctx.fill();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawMaze();
  drawPacman();
  drawGhost();
}

function loop(timestamp) {
  if (!lastTick) lastTick = timestamp;
  const elapsed = timestamp - lastTick;

  if (running && elapsed >= speedMs) {
    movePacman();
    moveGhost();
    detectCollision();
    lastTick = timestamp;
  }

  draw();
  requestAnimationFrame(loop);
}

document.addEventListener("keydown", handleInput);
restartBtn.addEventListener("click", resetGame);

resetGame();
requestAnimationFrame(loop);
