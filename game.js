// NUKED MAN — game.js
// Главный цикл, input, update, инициализация

let cam = 0;
let score = 0;
let levelComplete = false;
let paused = false;
let titleScreen = true;

// ── ЗВУК (Web Audio API) ──────────────────────────────────────────────
let audioCtx = null;
function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    setTimeout(startAmbient, 1000);
  }
}
window.addEventListener('keydown', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });

function playSound(type) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.connect(g); g.connect(audioCtx.destination);
  const t = audioCtx.currentTime;
  if (type === 'jump') {
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.1);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    o.start(t); o.stop(t + 0.15);
  } else if (type === 'punch') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    o.start(t); o.stop(t + 0.1);
  } else if (type === 'hurt') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(280, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    o.start(t); o.stop(t + 0.35);
  } else if (type === 'pickup') {
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.08);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    o.start(t); o.stop(t + 0.12);
  } else if (type === 'explode') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
    o.start(t); o.stop(t + 0.45);
  } else if (type === 'win') {
    [440, 550, 660].forEach((freq, i) => {
      const oo = audioCtx.createOscillator();
      const gg = audioCtx.createGain();
      oo.connect(gg); gg.connect(audioCtx.destination);
      const st = t + i * 0.12;
      oo.frequency.setValueAtTime(freq, st);
      gg.gain.setValueAtTime(0.2, st);
      gg.gain.exponentialRampToValueAtTime(0.01, st + 0.2);
      oo.start(st); oo.stop(st + 0.2);
    });
    return;
  } else if (type === 'stomp') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    o.start(t); o.stop(t + 0.12);
  } else if (type === 'rescue') {
    [330, 440, 550, 660].forEach((freq, i) => {
      const oo = audioCtx.createOscillator();
      const gg = audioCtx.createGain();
      oo.connect(gg); gg.connect(audioCtx.destination);
      const st = t + i * 0.07;
      oo.frequency.setValueAtTime(freq, st);
      gg.gain.setValueAtTime(0.15, st);
      gg.gain.exponentialRampToValueAtTime(0.01, st + 0.1);
      oo.start(st); oo.stop(st + 0.1);
    });
    return;
  } else {
    // неизвестный тип — просто не играем
    return;
  }
}


// ── AMBIENT ЗВУК ─────────────────────────────────────────────────────
let ambientInterval = null;
const AMBIENT_NOTES = [55, 65, 73, 82, 98, 110, 130]; // низкие ноты другого мира

function startAmbient() {
  if (ambientInterval) return;
  ambientInterval = setInterval(() => {
    if (!audioCtx || paused || titleScreen) return;
    const freq = AMBIENT_NOTES[Math.floor(Math.random() * AMBIENT_NOTES.length)];
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    const t = audioCtx.currentTime;
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.04, t + 0.8);
    g.gain.linearRampToValueAtTime(0, t + 3.0);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(t); o.stop(t + 3.0);
  }, 2000 + Math.random() * 2000);
}

// ── ЭКРАНОТРЯС ────────────────────────────────────────────────────────
let shakeTimer = 0;
let shakeMag = 0;

function screenShake(magnitude, duration) {
  if (magnitude > shakeMag) { shakeMag = magnitude; shakeTimer = duration; }
}

function getShakeOffset() {
  if (shakeTimer <= 0) return { x: 0, y: 0 };
  const s = shakeMag * (shakeTimer / 0.3);
  return {
    x: Math.round((Math.random() * 2 - 1) * s),
    y: Math.round((Math.random() * 2 - 1) * s),
  };
}

// ── INPUT ─────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') paused = !paused;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

const mk = { l: false, r: false, j: false, punch: false };
let jprev = false;
[['bl','l'],['br','r'],['bj','j'],['bp','punch']].forEach(([id, k]) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', e => { e.preventDefault(); mk[k] = true; }, { passive: false });
  el.addEventListener('touchend',   e => { e.preventDefault(); mk[k] = false; }, { passive: false });
});

const isL = () => keys['ArrowLeft']  || keys['KeyA'] || mk.l;
const isR = () => keys['ArrowRight'] || keys['KeyD'] || mk.r;
const isJ = () => keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || mk.j;

// ── UPDATE ────────────────────────────────────────────────────────────
let lastT = 0;
function update(dt) {
  const p = player;

  // экран старта
  if (titleScreen) {
    const jn = isJ();
    if (jn && !jprev) {
      titleScreen = false;
      say('start');
    }
    jprev = jn;
    return;
  }

  if (p.dead) {
    p.dtimer += dt;
    const jn = isJ();
    if (p.dtimer > 1.2 && jn && !jprev) {
      if (p.lives <= 0) {
        initLevel();
        p.lives = 3;
        score = 0;
      }
      projectiles.length = 0;
      ragdolls.length = 0;
      cam = 0;
      Object.assign(p, { x: START.x, y: START.y, vx: 0, vy: 0, dead: false, dtimer: 0,
        invTimer: 0, punching: false, ptimer: 0, pframe: 0, pcooldown: 0, speedBoost: 0 });
    }
    jprev = jn;
    return;
  }

  // победа — прыжок запускает новый уровень
  if (levelComplete) {
    const jn = isJ();
    if (jn && !jprev) {
      currentLevel++;
      initLevel();
      cam = 0;
      score = 0;
      Object.assign(p, { x: START.x, y: START.y, vx: 0, vy: 0, dead: false, dtimer: 0,
        lives: 3, invTimer: 0, punching: false, ptimer: 0, pframe: 0, pcooldown: 0, speedBoost: 0 });
    }
    jprev = jn;
    return;
  }

  p.vy += 480 * dt;
  if (p.vy > 600) p.vy = 600;

  const isPunch = keys['KeyZ'] || keys['KeyX'] || mk.punch;
  if (p.pcooldown > 0) p.pcooldown -= dt;
  if (isPunch && !p.punching && p.pcooldown <= 0) {
    p.punching = true; p.ptimer = 0; p.pframe = 0;
  }

  let dx = 0;
  if (isL()) { dx = -1; p.facing = -1; }
  if (isR()) { dx = 1;  p.facing = 1; }
  if (p.invTimer > 0) p.invTimer -= dt;
  if (p.speedBoost > 0) p.speedBoost -= dt;
  const spd = p.speedBoost > 0 ? 130 : 75;
  p.vx = dx * spd;

  const jn = isJ();
  if (jn && !jprev && p.onGround && !p.punching) { p.vy = -260; playSound('jump'); }
  jprev = jn;

  if (p.punching) {
    const prevFrame = p.pframe;
    p.ptimer += dt;
    if (p.ptimer < 0.08)      p.pframe = 0;
    else if (p.ptimer < 0.18) p.pframe = 1;
    else if (p.ptimer < 0.28) p.pframe = 2;
    else { p.punching = false; p.pcooldown = 0.15; }
    if (p.punching && p.pframe === 2 && prevFrame !== 2) {
      const hx = p.facing > 0 ? Math.round(p.x - cam) + p.w + 4 : Math.round(p.x - cam) - 4;
      spawnHitParticles(hx, Math.round(p.y) + 12);
      screenShake(2, 0.1);
      playSound('punch');
      punchBreakTiles();
    }
  }

  collide(p, dt);
  checkPunchHit();
  resetEnemyHitFlags();
  updateEnemies(dt);
  updateItems(dt);

  p.ftick += dt;
  if (!p.onGround) {
    p.state = 'jump';
  } else if (dx !== 0) {
    if (p.state !== 'run') { p.state = 'run'; p.frame = 0; p.ftick = 0; }
    if (p.ftick > 0.1) { p.frame = (p.frame + 1) % 4; p.ftick = 0; }
  } else {
    p.state = 'idle'; p.frame = 0;
    p.bobt += dt;
    p.bobY = Math.sin(p.bobt * 1.5) * 0.8;
  }

  if (p.x < 0) p.x = 0;
  if (p.x < cam) p.x = cam;
  if (p.y > MH * T + 20) {
    p.lives--;
    p.dead = true;
    p.dtimer = 0;
    return;
  }

  // lookahead — камера смотрит чуть вперёд куда идёт игрок
  const lookAhead = p.facing * 40;
  const tc = p.x + lookAhead - GW * 0.38;
  if (tc > cam) cam += (tc - cam) * 0.12;
  else if (tc < cam - 20) cam += (tc - cam) * 0.08;
  if (cam > WORLD_W - GW) cam = WORLD_W - GW;
  if (cam < 0) cam = 0;

  // проверка портала
  if (!levelComplete && checkPortal()) {
    levelComplete = true;
    say('win');
    playSound('win');
    screenShake(4, 0.4);
  }

  updateHostages(dt);
  updateSpeech(dt);
  updateEnemySpeech(dt);
}

// ── GAME LOOP ─────────────────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min((ts - lastT) / 1000, 0.05);
  lastT = ts;

  // титульный экран — рисуем и выходим
  if (titleScreen) {
    update(dt);
    drawBgFar(0);
    drawTitle();
    requestAnimationFrame(loop);
    return;
  }

  if (freezeTimer > 0) {
    freezeTimer = Math.max(0, freezeTimer - dt);
  } else {
    if (!paused && !levelComplete) update(dt);
    if (!paused) {
      updateParticles(dt);
      updateProjectiles(dt);
      updateRagdolls(dt);
    }
  }

  if (shakeTimer > 0) shakeTimer = Math.max(0, shakeTimer - dt);
  else shakeMag = 0;
  const shake = getShakeOffset();

  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawBgFar(cam);
  drawBgMid(cam);
  drawTilemap(cam, dt);
  drawPortal(cam);
  drawHostages(cam);
  drawPlayer(cam);
  drawParticles();
  drawRagdolls();
  drawProjectiles();
  drawEnemies();
  drawItems();
  drawSpeech(cam);
  drawEnemySpeech(cam);

  ctx.restore();

  drawHUD();
  if (player.dead && player.dtimer > 1.2) drawDeath();
  if (levelComplete) drawVictory();
  if (paused && !levelComplete) drawPause();
  requestAnimationFrame(loop);
}

// ── INIT ──────────────────────────────────────────────────────────────
function initLevel() {
  const lvl = currentLevel;
  // очищаем ambient чтобы не копить интервалы
  if (ambientInterval) { clearInterval(ambientInterval); ambientInterval = null; }
  setTimeout(startAmbient, 500);
  Object.keys(tileHP).forEach(k => delete tileHP[k]);
  Object.keys(tileFlash).forEach(k => delete tileFlash[k]);
  generateMap(lvl);
  buildSurfaceGraph();
  initEnemies(lvl);
  if (typeof resetFirstEnemy === "function") resetFirstEnemy();
  initItems();
  initHostages();
  initPortal();
  START.y = findSpawnY(2, player.h);
  player.y = START.y;
  levelComplete = false;
  setTimeout(() => say('start'), 800);
}

initLevel();
requestAnimationFrame(ts => { lastT = ts; requestAnimationFrame(loop); });
