// NUKED MAN — enemies.js
// Типы врагов, AI, анимации

// Спрайты теперь рисуются процедурно в drawXxx функциях (см. ниже),
// чтобы поддерживать кадры анимации (шаг, idle, замах).

const PROJ_SPR = [
  [1,0,2],[0,1,4],[0,2,4],[1,3,2],
];

let projectiles = [];

// ── BROFORCE-СТИЛЬ УРОНА ──────────────────────────────────────────────
// knockbackX/Y — импульс отброса. 0 = нет отброса
function hurtPlayer(knockbackX, knockbackY) {
  const p = player;
  if (p.dead || p.invTimer > 0) return;
  p.lives--;
  screenShake(3, 0.2);
  playSound('hurt');
  game.damageFlash = 0.3;
  if (p.lives <= 0) {
    p.dead = true;
    p.dtimer = 0;
    screenShake(5, 0.35);
    // Серия ругательств пока лежит
    say('die');
    setTimeout(() => { if (p.dead) say('die'); }, 800);
    setTimeout(() => { if (p.dead) say('die'); }, 1800);
    return;
  }
  say('hurt');
  p.invTimer = 0.6;
  p.vx = knockbackX;
  if (knockbackY !== 0) p.vy = knockbackY;
  if (p.onGround && knockbackY === 0) p.vy = -80;
}

function spawnProjectile(x, y, dir) {
  projectiles.push({ x, y, vx: dir * 90, vy: -20, w: 4, h: 4, life: 2.5 });
}

function updateProjectiles(dt) {
  const p = player;
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const pr = projectiles[i];
    // Босс-лазер: без гравитации, размер 6×6
    if (pr.boss) {
      if (pr.w === undefined) { pr.w = 6; pr.h = 6; }
    } else {
      if (pr.w === undefined) { pr.w = 4; pr.h = 4; }
      pr.vy += 200 * dt; // обычная гравитация только для не-боссовских
    }
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (solid(pr.x, pr.y + pr.h) || solid(pr.x + pr.w, pr.y + pr.h) ||
        solid(pr.x, pr.y) || solid(pr.x + pr.w, pr.y)) {
      for (let k = 0; k < 5; k++) {
        const ang = Math.random() * Math.PI * 2;
        particles.push({ x: pr.x - game.cam, y: pr.y, vx: Math.cos(ang)*25, vy: Math.sin(ang)*25-10, life:1, maxLife:0.25, size:1 });
      }
      projectiles.splice(i, 1); continue;
    }
    if (!p.dead && p.invTimer <= 0 &&
        p.x < pr.x + pr.w && p.x + p.w > pr.x &&
        p.y < pr.y + pr.h && p.y + p.h > pr.y) {
      // снаряд отбрасывает в сторону полёта
      const knockback = pr.boss ? 120 : 80; // босс сильнее отбрасывает
      hurtPlayer(pr.vx > 0 ? knockback : -knockback, -80);
      projectiles.splice(i, 1); continue;
    }
    if (pr.life <= 0) projectiles.splice(i, 1);
  }
}

function drawProjectiles() {
  for (const pr of projectiles) {
    const px2 = Math.round(pr.x - game.cam), py2 = Math.round(pr.y);
    if ((px2 + (pr.w || 4)) < 0 || px2 > GW) continue;
    if (pr.boss) {
      // Боссовский лазер — большой белый круг 6×6 с тёмным ядром
      ctx.fillStyle = '#fff';
      ctx.fillRect(px2, py2 + 1, 6, 4);
      ctx.fillRect(px2 + 1, py2, 4, 6);
      ctx.fillStyle = '#000';
      ctx.fillRect(px2 + 2, py2 + 2, 2, 2);
    } else {
      ctx.fillStyle = '#fff';
      for (const [sx, sy, sw] of PROJ_SPR) ctx.fillRect(px2 + sx, py2 + sy, sw, 1);
    }
  }
}


// ── РЕПЛИКИ ГЕРОЯ ─────────────────────────────────────────────────────
// Только латиница — GLYPHS содержит A-Z, цифры и пунктуацию.
const PLAYER_LINES = {
  start:   ["where am i", "not my block", "good party", "ok. ok.", "need pants", "huh", "guess i walk", "whatever"],
  hurt:    ["ow", "no", "ok that hurt", "rude", "seriously", "hey", "stop", "dont"],
  die:     ["shit", "fuck", "noo", "aargh", "are you kidding", "seriously", "not again", "goddamn"],
  kill:    ["sorry", "didnt mean it", "my bad", "you started it", "were even", "bye", "no hard feelings"],
  rescue:  ["youre here too?", "lets go together", "hang on", "now were two", "know the exit?"],
  pickup:  ["this will do", "nice find", "dont touch my stuff", "thanks universe"],
  win:     ["where to now", "next one better be easier", "going home", "almost get it", "ok keep going", "weird place"],
  explode: ["fine fine", "did that on purpose", "ok too much", "not bad"],
  firstenemy: ["oh no", "whats that", "hi", "oops", "dont touch"],
  // Мысли/шутки пока курит (idle > 1.5 сек)
  smoke:   [
    "tastes like dust",
    "good cig",
    "why am i naked",
    "lost my pants",
    "hat still on tho",
    "another dimension",
    "this isnt home",
    "i was at a party",
    "i think",
    "feels like monday",
    "is this hell",
    "at least its quiet",
    "wait what was that",
    "need a drink",
    "quitting tomorrow",
    "weird place to smoke",
    "am i dreaming",
  ],
};

let speechBubble = { text: '', timer: 0, worldX: 0, worldY: 0 };

function say(category) {
  const lines = PLAYER_LINES[category];
  if (!lines) return;
  const text = lines[Math.floor(Math.random() * lines.length)];
  speechBubble.text = text;
  speechBubble.timer = 2.2;
  speechBubble.worldX = player.x + player.w / 2;
  speechBubble.worldY = player.y - 12;
}

function updateSpeech(dt) {
  if (speechBubble.timer > 0) speechBubble.timer -= dt;
  speechBubble.worldX = player.x + player.w / 2;
  speechBubble.worldY = player.y - 12;
}

function drawSpeech() {
  if (speechBubble.timer <= 0) return;
  const alpha = Math.min(1, speechBubble.timer);
  const sx = Math.round(speechBubble.worldX - game.cam);
  let sy = Math.round(speechBubble.worldY);

  // если пузырь уходит за верхний край экрана — смещаем вниз под игрока
  if (sy < 2) sy = Math.round(player.y + player.h + 2);
  // если под игроком тоже нет места (пол рядом) — прижимаем к верху экрана
  if (sy > GH - 8) sy = 2;

  // обводка для читаемости
  const len = speechBubble.text.length;
  const drawText = (col) => {
    ctx.fillStyle = col;
    for (let i = 0; i < len; i++) {
      const ch = speechBubble.text[i].toUpperCase();
      const g = GLYPHS[ch];
      if (!g) continue;
      const cx2 = sx - Math.floor(len * 2) + i * 5;
      for (let r = 0; r < g.length; r++)
        for (let c = 0; c < g[r].length; c++)
          if (g[r][c]) ctx.fillRect(cx2 + c, sy + r, 1, 1);
    }
  };
  // чёрная обводка (4 смещения)
  const originalCol = ctx.fillStyle;
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    ctx.save(); ctx.translate(dx, dy);
    drawText('#000');
    ctx.restore();
  }
  // основной текст с fade
  drawText(`rgba(228,228,228,${alpha.toFixed(2)})`);
}

// ── ТАРАБАРЩИНА ВРАГОВ ────────────────────────────────────────────────
const GLITCH_CHARS = ['@','#','%','&','*','?','!','~','^','=','+','<','>'];
const PATROL_MUTTER = ['zxq?','#ok#','@@@','wtf','!!?','...','???','!!'];
const GUARD_ALERT   = ['STOP','HEY','!!!','%#!','@!?','HALT','NOO'];

let enemySpeech = []; // { e, text, timer }

function triggerEnemySpeech(e, texts) {
  // не дублируем для одного врага
  enemySpeech = enemySpeech.filter(s => s.e !== e);
  enemySpeech.push({
    e,
    text: texts[Math.floor(Math.random() * texts.length)],
    timer: 1.5,
  });
}

function updateEnemySpeech(dt) {
  for (let i = enemySpeech.length - 1; i >= 0; i--) {
    enemySpeech[i].timer -= dt;
    if (enemySpeech[i].timer <= 0) enemySpeech.splice(i, 1);
  }
}

function drawEnemySpeech() {
  for (const s of enemySpeech) {
    if (s.e.dead) continue;
    const alpha = Math.min(1, s.timer);
    const ex = Math.round(s.e.x - game.cam + s.e.w / 2);
    const ey = Math.round(s.e.y - 8);
    ctx.fillStyle = `rgba(228,228,228,${alpha.toFixed(2)})`;
    const len = s.text.length;
    for (let i = 0; i < len; i++) {
      ctx.fillRect(ex - Math.floor(len * 2) + i * 4, ey, 3, 1);
      ctx.fillRect(ex - Math.floor(len * 2) + i * 4, ey + 2, 3, 1);
      ctx.fillRect(ex - Math.floor(len * 2) + i * 4, ey + 4, 2, 1);
    }
    // рисуем как глитч-пиксели (не буквы — тарабарщина визуально)
    for (let i = 0; i < len * 4; i++) {
      const gx = ex - Math.floor(len * 2.5) + Math.floor(Math.random() * len * 5);
      const gy = ey + Math.floor(Math.random() * 6);
      ctx.fillRect(gx, gy, 1, 1);
    }
  }
}


// ── ДИНАМИКА BROFORCE-СТИЛЬ ───────────────────────────────────────────

// Оповещаем соседних врагов при алерте/взрыве
function alertNearbyEnemies(srcEnemy, radius) {
  for (const e of enemies) {
    if (e === srcEnemy || e.dead) continue;
    const dx = Math.abs((e.x + e.w/2) - (srcEnemy.x + srcEnemy.w/2));
    if (dx < radius) {
      e.alerted = true;
      e._wasAlerted = true;
      if (!e._panicTimer) e._panicTimer = 0.8 + Math.random() * 0.4;
    }
  }
}

// Реакция врагов на взрыв рядом
function panicEnemiesNear(cx, cy, radius) {
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = (e.x + e.w/2) - cx;
    const dy = (e.y + e.h/2) - cy;
    const dist = Math.hypot(dx, dy);
    if (dist < radius * 1.5) {
      // убегают от взрыва
      e.vx = dx > 0 ? 80 : -80;
      e.vy = -120;
      e._panicTimer = 1.5;
      e.alerted = true;
      triggerEnemySpeech(e, ['!!!','RUN','@#!','NOO','HELP']);
      // будим соседей
      alertNearbyEnemies(e, T * 5);
    }
  }
}

// Реакция врагов на звук (удар игрока, разрушение тайла).
// patrol разворачиваются к источнику, guard становятся alerted.
// cx — мировая X-координата источника звука.
function notifyEnemiesOfSound(cx, cy, radius = T * 8) {
  for (const e of enemies) {
    if (e.dead) continue;
    const dx = cx - (e.x + e.w/2);
    const dy = cy - (e.y + e.h/2);
    const dist = Math.hypot(dx, dy);
    if (dist > radius) continue;
    // patrol поворачивается к звуку — если стоит, начинает идти; если идёт мимо, разворачивается
    if (e.type === 'patrol') {
      if (dx > 0 && e.vx < 0) e.vx = Math.abs(e.vx) || 28;
      else if (dx < 0 && e.vx > 0) e.vx = -Math.abs(e.vx) || -28;
      else if (Math.abs(e.vx) < 2) e.vx = dx > 0 ? 28 : -28;
      // Показываем восклицание — видел/слышал что-то
      if (!e._heardTimer || e._heardTimer < 0) {
        e._heardTimer = 0.6;
        triggerEnemySpeech(e, ['?!','HM?','WHO','!']);
      }
    } else if (e.type === 'guard') {
      // guard становится alerted на короткое время, если звук близко
      if (dist < radius * 0.7) {
        e.alerted = true;
        e._wasAlerted = true;
      }
    }
    // bruiser вздрагивает и идёт в сторону звука
    else if (e.type === 'bruiser') {
      e.vx = dx > 0 ? 18 : -18;
    }
  }
}

// Вспышка выстрела guard
function drawMuzzleFlash(ex, ey, facing) {
  ctx.fillStyle = '#fff';
  const fx = facing > 0 ? ex + 14 : ex - 6;
  ctx.fillRect(fx, ey + 5, 4, 2);
  ctx.fillRect(fx + (facing > 0 ? 3 : -2), ey + 4, 2, 4);
}

// Пыль при приземлении
function spawnLandingDust(x, y) {
  for (let i = 0; i < 5; i++) {
    const side = i < 3 ? -1 : 1;
    particles.push({
      x: x - game.cam, y,
      vx: side * (5 + Math.random() * 20),
      vy: -10 - Math.random() * 15,
      life: 1, maxLife: 0.25, size: 2,
    });
  }
}

let enemies = [];
let _firstEnemySeen = false;

function resetFirstEnemy() { _firstEnemySeen = false; }


function spawnEnemy(tileX, startRow, type = 'patrol') {
  // Увеличенные размеры — вдохновлено референсом (больше деталей)
  const dims = {
    patrol:  { w: 22, h: 36 },
    guard:   { w: 24, h: 30 },   // приземистый танк
    runner:  { w: 14, h: 42 },   // тощий высокий
    flyer:   { w: 28, h: 20 },   // крылатый
    sniper:  { w: 18, h: 40 },   // балахонник
    bruiser: { w: 32, h: 48 },   // монстр, 2 тайла в высоту
  };
  const { w, h } = dims[type] || dims.patrol;

  // HP по типу
  const hpByType = {
    patrol: 2, guard: 1, runner: 1,
    flyer: 1, sniper: 2, bruiser: 3,
  };

  // Начальный vx
  const vxByType = {
    patrol: 28, guard: 0, runner: 45,
    flyer: 0,   // летает сам
    sniper: 0,  // стоит
    bruiser: 18,
  };

  // Позиция Y
  let startY;
  if (type === 'flyer') {
    // летает в воздухе над землёй — спавн выше поверхности на 4 тайла
    const groundY = findSpawnY(tileX, h, startRow);
    startY = Math.max(T * 2, groundY - T * 4);
  } else {
    startY = findSpawnY(tileX, h, startRow);
  }

  enemies.push({
    x: tileX * T + 4, y: startY,
    w, h,
    vx: vxByType[type] || 0, vy: 0,
    hp: hpByType[type] || 1,
    type, flashTimer: 0, dead: false, deathTimer: 0, hitThisSwing: false,
    alertTimer: 0, shootCooldown: 0, alerted: false, facing: 1,
    // flyer: центр "орбиты" + фаза синусоиды
    _homeY: (type === 'flyer') ? startY : 0,
    _flyPhase: Math.random() * Math.PI * 2,
    // bruiser: кулдаун на слом стены
    _breakCooldown: 0,
    // Анимация: _animT растёт в update, кадр шага = floor(_animT * speed) % 2
    _animT: Math.random() * 10, // случайная начальная фаза чтобы не синхронно
    _aimTimer: 0, // для прицельного луча sniper
    _windupTimer: 0, // для замаха guard перед выстрелом
  });
}

function initEnemies(lvl = 1) {
  enemies = [];

  // patrol — на открытых широких участках, не у края
  const patrolPoints = getSurfacePoints(p =>
    p.open >= 2 &&
    !p.isolated &&
    !p.nearPit &&
    p.distFromStart > 0.15 &&
    p.distFromStart < 0.95
  );

  // guard — у стен, есть где стоять
  const guardPoints = getSurfacePoints(p =>
    p.nearWall &&
    p.open >= 2 &&
    p.distFromStart > 0.2 &&
    p.distFromStart < 0.95
  );

  // расставляем patrol каждые ~7 тайлов из подходящих точек
  const usedX = new Set();
  const minGap = 6;

  for (const pt of patrolPoints) {
    if ([...usedX].some(x => Math.abs(x - pt.tx) < minGap)) continue;
    const patrolChance = Math.min(0.5 + lvl * 0.05, 0.85);
    if (Math.random() < patrolChance) {
      spawnEnemy(pt.tx, pt.ty - 1, 'patrol');
      usedX.add(pt.tx);
    }
  }

  // расставляем guard из подходящих точек
  for (const pt of guardPoints) {
    if ([...usedX].some(x => Math.abs(x - pt.tx) < minGap)) continue;
    if (lvl >= 2 && Math.random() < Math.min(0.3 + lvl * 0.08, 0.7)) {
      spawnEnemy(pt.tx, pt.ty - 1, 'guard');
      usedX.add(pt.tx);
    }
  }

  // runner — появляется с уровня 4, убегает и зовёт других
  if (lvl >= 4) {
    const runnerPoints = getSurfacePoints(p =>
      p.open >= 2 && !p.isolated && p.distFromStart > 0.3 && p.distFromStart < 0.85
    );
    let runnerCount = 0;
    const maxRunners = Math.min(Math.floor(lvl / 2), 4);
    for (const pt of runnerPoints) {
      if (runnerCount >= maxRunners) break;
      if ([...usedX].some(x => Math.abs(x - pt.tx) < minGap)) continue;
      if (Math.random() < 0.3) {
        spawnEnemy(pt.tx, pt.ty - 1, 'runner');
        usedX.add(pt.tx);
        runnerCount++;
      }
    }
  }

  // flyer — появляется с уровня 3, летает в воздухе над открытыми участками
  if (lvl >= 3) {
    const flyerPoints = getSurfacePoints(p =>
      p.open >= 3 && p.distFromStart > 0.25 && p.distFromStart < 0.9
    );
    let flyerCount = 0;
    const maxFlyers = Math.min(Math.floor((lvl - 1) / 2), 5);
    for (const pt of flyerPoints) {
      if (flyerCount >= maxFlyers) break;
      if ([...usedX].some(x => Math.abs(x - pt.tx) < minGap)) continue;
      if (Math.random() < 0.35) {
        spawnEnemy(pt.tx, pt.ty - 1, 'flyer');
        usedX.add(pt.tx);
        flyerCount++;
      }
    }
  }

  // sniper — появляется с уровня 3, ставится у стен для засады
  if (lvl >= 3) {
    const sniperPoints = getSurfacePoints(p =>
      p.nearWall && p.distFromStart > 0.3 && p.distFromStart < 0.9
    );
    let sniperCount = 0;
    const maxSnipers = Math.min(Math.floor((lvl - 2) / 2), 3);
    for (const pt of sniperPoints) {
      if (sniperCount >= maxSnipers) break;
      if ([...usedX].some(x => Math.abs(x - pt.tx) < minGap)) continue;
      if (Math.random() < 0.3) {
        spawnEnemy(pt.tx, pt.ty - 1, 'sniper');
        usedX.add(pt.tx);
        sniperCount++;
      }
    }
  }

  // bruiser — появляется с уровня 5, редкий большой враг
  if (lvl >= 5) {
    const bruiserPoints = getSurfacePoints(p =>
      p.open >= 3 && !p.nearPit && p.distFromStart > 0.35 && p.distFromStart < 0.9
    );
    let bruiserCount = 0;
    const maxBruisers = Math.min(Math.floor((lvl - 3) / 3) + 1, 3);
    for (const pt of bruiserPoints) {
      if (bruiserCount >= maxBruisers) break;
      // bruiser большой — нужна bigger gap
      if ([...usedX].some(x => Math.abs(x - pt.tx) < minGap + 3)) continue;
      if (Math.random() < 0.25) {
        spawnEnemy(pt.tx, pt.ty - 1, 'bruiser');
        usedX.add(pt.tx);
        bruiserCount++;
      }
    }
  }

  // фиксируем total для стабильного счётчика HUD
  game.enemiesTotal = enemies.length;
  game.enemiesKilled = 0;
}

function updateEnemies(dt) {
  const p = player;
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) {
      e.deathTimer += dt;
      if (e.deathTimer > 0.5) enemies.splice(i, 1);
      continue;
    }
    if (e.flashTimer > 0) e.flashTimer -= dt;
    if (e.shootCooldown > 0) e.shootCooldown -= dt;
    if (e._muzzleFlash > 0) e._muzzleFlash -= dt;
    if (e._panicTimer > 0) e._panicTimer -= dt;
    if (e._aimTimer > 0) e._aimTimer -= dt;
    if (e._windupTimer > 0) e._windupTimer -= dt;
    if (e._heardTimer > 0) e._heardTimer -= dt;
    if (e._hitFlash > 0) e._hitFlash -= dt;
    // Таймер анимации: растёт пропорционально модулю скорости.
    // Стоящий враг не "шагает", движущийся — анимируется быстрее если быстрее.
    e._animT = (e._animT || 0) + dt * (1 + Math.abs(e.vx) / 30);

    // гравитация — только для наземных врагов (не flyer)
    if (e.type !== 'flyer') {
      e.vy += 480 * dt;
      if (e.vy > 500) e.vy = 500;
      e.y += e.vy * dt;
      if (solid(e.x + 2, e.y + e.h) || solid(e.x + e.w - 2, e.y + e.h)) {
        e.y = Math.floor((e.y + e.h) / T) * T - e.h;
        e.vy = 0;
      }
    }

    if (e.type === 'patrol') {
      // иногда бормочет
      if (!e._mutterTimer) e._mutterTimer = 2 + Math.random() * 4;
      e._mutterTimer -= dt;
      if (e._mutterTimer <= 0) {
        triggerEnemySpeech(e, PATROL_MUTTER);
        e._mutterTimer = 3 + Math.random() * 5;
      }
      // panic — убегает быстрее (таймер декрементится общим кодом выше)
      if (e._panicTimer > 0) {
        e.vx = e.vx > 0 ? 65 : -65;
      }
      // затухание knockback
      if (Math.abs(e.vx) > 35) e.vx *= 0.8;
      e.x += e.vx * dt;
      const frontX = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      if (solid(frontX, e.y + e.h / 2) || !solid(frontX, e.y + e.h + 2)) {
        e.vx = Math.abs(e.vx) > 35 ? 0 : -e.vx;
        if (Math.abs(e.vx) < 2) e.vx = (e.vx >= 0 ? 1 : -1) * 28;
        e.x += e.vx * dt * 2;
      }
    } else if (e.type === 'guard') {
      const dx = (p.x + p.w / 2) - (e.x + e.w / 2);
      const dist = Math.abs(dx);
      e.facing = dx > 0 ? 1 : -1;
      const sameLevel = Math.abs((p.y + p.h) - (e.y + e.h)) < T * 2;
      e.alerted = dist < 110 && sameLevel;
      // тарабарщина при алерте
      if (e.alerted && !e._wasAlerted) {
        triggerEnemySpeech(e, GUARD_ALERT);
        alertNearbyEnemies(e, T * 6); // будим соседей
      }
      e._wasAlerted = e.alerted;
      if (e.alerted && e.shootCooldown <= 0 && e._windupTimer <= 0) {
        if (dist < 22) {
          // удар дубиной в упор — мгновенный
          if (!p.dead && p.invTimer <= 0) {
            hurtPlayer(80, 0);
          }
          e.shootCooldown = 1.5;
        } else {
          // запускаем замах, выстрел сработает через 0.25с
          e._windupTimer = 0.25;
          // отмечаем "запланированный выстрел" — стрельнём при _windupTimer → 0
          e._pendingShot = true;
        }
      }
      // Проверяем конец замаха — стрельнём
      if (e._pendingShot && e._windupTimer <= 0 && e.alerted) {
        spawnProjectile(e.x + (e.facing > 0 ? e.w + 2 : -6), e.y + 6, e.facing);
        e._muzzleFlash = 0.08;
        e.shootCooldown = 2.0;
        e._pendingShot = false;
      } else if (e._pendingShot && !e.alerted) {
        // прервали замах (игрок сбежал)
        e._pendingShot = false;
      }
      if (Math.abs(e.vx) > 0) { e.vx *= 0.85; if (Math.abs(e.vx) < 2) e.vx = 0; }
    
    } else if (e.type === 'runner') {
      // убегает от игрока при приближении, кричит тарабарщину
      const dx = (p.x + p.w/2) - (e.x + e.w/2);
      const dist = Math.abs(dx);
      const sameLevel = Math.abs((p.y + p.h) - (e.y + e.h)) < T * 3;

      if (dist < 80 && sameLevel) {
        // убегаем в обратную сторону
        e.vx = dx > 0 ? -55 : 55;
        if (!e._alerted) {
          e._alerted = true;
          triggerEnemySpeech(e, ['RUN','!!!','HELP','@#!','NOO']);
          // будим ближайших patrol
          for (const other of enemies) {
            if (other === e || other.dead || other.type !== 'patrol') continue;
            if (Math.abs(other.x - e.x) < T * 6) {
              other.vx = dx > 0 ? -35 : 35; // patrol тоже реагирует
            }
          }
        }
      } else {
        // спокойно ходит
        e._alerted = false;
        if (Math.abs(e.vx) < 2) e.vx = 35;
      }

      // отскок от стен и краёв
      if (Math.abs(e.vx) > 1) e.x += e.vx * dt;
      const frontX2 = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      if (solid(frontX2, e.y + e.h/2) || !solid(frontX2, e.y + e.h + 2)) {
        e.vx = -e.vx;
      }

    } else if (e.type === 'flyer') {
      // Летает в воздухе. Два режима: парение и пике.
      const dxP = (p.x + p.w/2) - (e.x + e.w/2);
      const dyP = (p.y + p.h/2) - (e.y + e.h/2);
      const distX = Math.abs(dxP);
      const distY = Math.abs(dyP);

      // Режим пике: если игрок строго снизу (distX малое, dyP > 30) и не уже в пике,
      // начинаем падать с ускорением.
      if (!e._diving && !e._diveCooldown && distX < 45 && dyP > 30 && dyP < 140 && !p.dead) {
        e._diving = true;
        e._diveTimer = 0;
        triggerEnemySpeech(e, ['DIVE','!','#@!']);
      }
      if (e._diveCooldown > 0) e._diveCooldown -= dt;

      if (e._diving) {
        // Пике: набираем вниз + немного в сторону игрока
        e._diveTimer += dt;
        e.vy = (e.vy || 0) + 600 * dt;
        if (e.vy > 350) e.vy = 350;
        e.vx = dxP > 0 ? 60 : -60;
        e.y += e.vy * dt;
        e.x += e.vx * dt;
        e.facing = dxP > 0 ? 1 : -1;

        // Закончить пике: упал на землю или прошло 1.0с
        const hitGround = solid(e.x + e.w/2, e.y + e.h + 2);
        if (hitGround || e._diveTimer > 1.0) {
          e._diving = false;
          e.vy = 0;
          e._diveCooldown = 3.0; // перезарядка пике
          // если упал на землю — отскакивает и возвращается наверх
          if (hitGround) {
            e.y = Math.floor((e.y + e.h) / T) * T - e.h;
            screenShake(2, 0.1);
            // частицы от удара
            for (let k = 0; k < 6; k++) {
              const ang = Math.PI + (Math.random() - 0.5);
              particles.push({
                x: e.x - game.cam + e.w/2, y: e.y + e.h,
                vx: Math.cos(ang) * 40, vy: Math.sin(ang) * 40,
                life: 1, maxLife: 0.3, size: 2
              });
            }
          }
          // восстанавливаем _homeY — будущее парение вернёт вверх
          e._homeY = Math.max(T * 2, e.y - T * 3);
        }
      } else {
        // Парение: синусоида + преследование
        e._flyPhase += dt * 2.5;
        const wave = Math.sin(e._flyPhase) * 8;
        // Плавно возвращаем Y к _homeY
        const targetY = e._homeY + wave;
        e.y += (targetY - e.y) * dt * 4;
        // горизонтальное движение
        if (distX < 180 && !p.dead) {
          e.vx = (dxP > 0 ? 1 : -1) * 40;
          e.facing = dxP > 0 ? 1 : -1;
        } else {
          if (Math.abs(e.vx) < 2) e.vx = 20;
        }
        e.x += e.vx * dt;
        // отскок от вертикальных стен
        const frontXF = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
        if (solid(frontXF, e.y + e.h/2)) {
          e.vx = -e.vx;
        }
      }

    } else if (e.type === 'sniper') {
      e.vx = 0;
      const dxS = (p.x + p.w/2) - (e.x + e.w/2);
      const distS = Math.abs(dxS);
      e.facing = dxS > 0 ? 1 : -1;
      const sameLevel = Math.abs((p.y + p.h) - (e.y + e.h)) < T * 3;
      e.alerted = distS < 280 && sameLevel;
      if (e.alerted && e.shootCooldown <= 0 && e._aimTimer <= 0 && !e._pendingShot) {
        // Начинаем прицеливаться: луч показывается 0.5с
        e._aimTimer = 0.5;
        e._pendingShot = true;
      }
      // Стреляем когда прицел завершён
      if (e._pendingShot && e._aimTimer <= 0 && e.alerted) {
        spawnProjectile(e.x + (e.facing > 0 ? e.w + 2 : -6), e.y + 6, e.facing);
        e._muzzleFlash = 0.12;
        e.shootCooldown = 1.6;
        e._pendingShot = false;
      } else if (e._pendingShot && !e.alerted) {
        // игрок ушёл из поля зрения — отмена
        e._aimTimer = 0;
        e._pendingShot = false;
      }

    } else if (e.type === 'bruiser') {
      // Большой медленный враг, ломает стены на пути.
      if (!e._mutterTimer) e._mutterTimer = 3 + Math.random() * 3;
      e._mutterTimer -= dt;
      if (e._mutterTimer <= 0) {
        triggerEnemySpeech(e, PATROL_MUTTER);
        e._mutterTimer = 4 + Math.random() * 4;
      }
      if (e._breakCooldown > 0) e._breakCooldown -= dt;
      if (e._recoverTimer > 0) e._recoverTimer -= dt;

      // Если в режиме восстановления — отступает на шаг назад
      if (e._recoverTimer > 0) {
        // направление назад = противоположно facing
        const backSign = e.facing > 0 ? -1 : 1;
        e.vx = backSign * 12;
      } else {
        // Обычный ход вперёд (в сторону игрока если близко)
        const dxB = (p.x + p.w/2) - (e.x + e.w/2);
        const facingPlayer = dxB > 0 ? 1 : -1;
        e.facing = facingPlayer;
        if (Math.abs(e.vx) < 2) e.vx = facingPlayer * 18;
      }
      e.x += e.vx * dt;
      const frontXB = e.vx > 0 ? e.x + e.w + 1 : e.x - 1;
      // ломает стену если упёрся
      if (solid(frontXB, e.y + e.h/2) || solid(frontXB, e.y + e.h - 4)) {
        if (e._breakCooldown <= 0 && typeof breakTile === 'function') {
          breakTile(frontXB, e.y + e.h/2);
          breakTile(frontXB, e.y + e.h - 4);
          e._breakCooldown = 0.4;
        } else {
          e.vx *= 0.5;
        }
      }
      // не падаем в пропасти — разворачиваемся
      if (!solid(frontXB, e.y + e.h + 2)) {
        e.vx = -e.vx;
      }
    }

    // реплика при первом виде врага
    if (!_firstEnemySeen && !p.dead) {
      const edx = Math.abs((e.x + e.w/2) - (p.x + p.w/2));
      if (edx < 80) {
        _firstEnemySeen = true;
        say('firstenemy');
      }
    }

    if (p.dead || p.invTimer > 0) continue;

    // ── БРОFORCE-СТИЛЬ КОЛЛИЗИИ ────────────────────────────────────
    // Хитбокс врага уменьшен (не весь спрайт):
    const eHitX = e.x + 2;         // внутренний хитбокс по X
    const eHitW = e.w - 4;
    const eHitY = e.y + 4;         // голова не бьёт
    const eHitH = e.h - 6;         // ноги не бьют

    const overlapX = p.x < eHitX + eHitW && p.x + p.w > eHitX;
    const overlapY = p.y < eHitY + eHitH && p.y + p.h > eHitY;

    if (!overlapX || !overlapY) continue;

    // Прыжок сверху — STOMP как в Broforce
    // Считаем stomp если: игрок падает И его ноги в ВЕРХНЕЙ ПОЛОВИНЕ врага
    // (раньше было "верхняя треть" — слишком строго, промахивались часто)
    const pFeet = p.y + p.h;
    const eMid = e.y + e.h * 0.55;  // середина чуть ниже — даём больше шансов
    const fallingDown = p.vy >= -20; // почти падает (допускаем лёгкое зависание)

    if (fallingDown && pFeet > eHitY && pFeet < eMid && !p.punching) {
      // Bruiser выдерживает stomp — только 1 урон, не умирает за раз
      if (e.type === 'bruiser') {
        e.hp--;
        e.flashTimer = 0.25;
        p.vy = -260; // отскок выше, т.к. враг не погиб
        screenShake(3, 0.15);
        playSound('stomp');
        if (e.hp <= 0) {
          e.dead = true; e.deathTimer = 0; game.score++;
          game.enemiesKilled = (game.enemiesKilled || 0) + 1;
          say('kill');
          if (typeof playSting === 'function') playSting('kill');
          spawnRagdoll(e);
        }
        continue;
      }
      e.hp = 0; e.dead = true; e.deathTimer = 0; game.score++; game.enemiesKilled = (game.enemiesKilled || 0) + 1;
      p.vy = -200;
      game.freezeTimer = 0.08;
      screenShake(4, 0.18);
      playSound('stomp');
      say('kill');
      for (let k = 0; k < 10; k++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 40;
        particles.push({ x: e.x - game.cam + e.w/2, y: e.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 40, life:1, maxLife:0.3+Math.random()*0.2, size:2 });
      }
      continue;
    }

    // Боковой контакт — урон только если враг смотрит в сторону игрока
    const enemyFacingPlayer = e.type === 'patrol'
      ? (e.vx > 0 ? p.x > e.x : p.x < e.x)
      : (e.facing > 0 ? p.x > e.x : p.x < e.x);

    // patrol бьёт всегда при боковом касании,
    // guard — только если алертован
    // bruiser — всегда и сильнее
    const canHit = e.type === 'patrol' || e.type === 'bruiser' ||
                   (e.type === 'guard' && e.alerted) ||
                   e.type === 'flyer' || e.type === 'runner';

    if (canHit && !p.punching) {
      const kb = e.type === 'bruiser' ? 140 : 60;
      hurtPlayer(p.facing > 0 ? -kb : kb, -100);
      // bruiser отступает после удара
      if (e.type === 'bruiser') {
        e._recoverTimer = 1.0;
      }
    }
  }
}

// ── ФИЗИКА ТЕЛ (RAGDOLL) ─────────────────────────────────────────────
let ragdolls = [];

function spawnRagdoll(e) {
  // Пиксельный распад: разбиваем bbox врага на сетку кубиков.
  // Каждый кубик получает импульс "наружу" (от центра) + случайный.
  // Результат — враг красиво разваливается на части.
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  // Плотность: примерно 1 кубик на каждые 10 квадратных пикселей
  const area = e.w * e.h;
  const targetCount = Math.min(24, Math.max(12, Math.floor(area / 18)));

  for (let i = 0; i < targetCount; i++) {
    // Позиция кубика — случайная точка в bbox
    const px = e.x + Math.random() * e.w;
    const py = e.y + Math.random() * e.h;
    // Импульс "наружу" от центра врага
    const dxFromCenter = px - cx;
    const dyFromCenter = py - cy;
    const distFromCenter = Math.hypot(dxFromCenter, dyFromCenter) || 1;
    // базовая скорость взрыва + случайная добавка
    const explodeSpd = 80 + Math.random() * 60;
    const outVx = (dxFromCenter / distFromCenter) * explodeSpd;
    const outVy = (dyFromCenter / distFromCenter) * explodeSpd;
    // плюс случайная "разбрызгивалка" для неравномерности
    const noiseAng = Math.random() * Math.PI * 2;
    const noiseSpd = 20 + Math.random() * 40;
    ragdolls.push({
      x: px - game.cam,
      y: py,
      vx: outVx + Math.cos(noiseAng) * noiseSpd + (e.vx || 0) * 0.3,
      vy: outVy + Math.sin(noiseAng) * noiseSpd - 40, // лёгкий подброс вверх
      size: 1 + Math.floor(Math.random() * 3), // 1-3 px
      life: 1,
      maxLife: 0.6 + Math.random() * 0.6,
      rot: Math.random() * 4 - 2,
    });
  }

  // Дополнительно — горизонтальная волна пыли у ног (если враг на земле)
  const feetY = e.y + e.h;
  for (let i = 0; i < 8; i++) {
    const ang = (Math.random() < 0.5 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.6;
    const spd = 60 + Math.random() * 80;
    particles.push({
      x: cx - game.cam,
      y: feetY - 2,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd * 0.3 - 10, // пыль низко летит
      life: 1,
      maxLife: 0.35 + Math.random() * 0.25,
      size: 2 + Math.floor(Math.random() * 2),
    });
  }
  // Центральная "вспышка" — один крупный объёмный взрыв
  particles.push({
    x: cx - game.cam,
    y: cy,
    vx: 0, vy: 0,
    life: 1,
    maxLife: 0.12,
    size: Math.max(e.w, e.h) * 0.8, // крупная вспышка размером с врага
    type: 'flash',
  });
}

function updateRagdolls(dt) {
  for (let i = ragdolls.length - 1; i >= 0; i--) {
    const r = ragdolls[i];
    r.vy += 300 * dt;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.life -= dt / r.maxLife;
    // отскок от земли
    const wx = r.x + game.cam;
    if (solid(wx, r.y + r.size) || solid(wx + r.size, r.y + r.size)) {
      r.y = Math.floor((r.y + r.size) / T) * T - r.size;
      r.vy *= -0.3;
      r.vx *= 0.6;
    }
    if (r.life <= 0) ragdolls.splice(i, 1);
  }
}

function drawRagdolls() {
  for (const r of ragdolls) {
    const a = Math.max(0, r.life);
    if (a < 0.15) continue;
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.round(r.x), Math.round(r.y), r.size, r.size);
  }
  ctx.globalAlpha = 1;
}
function checkPunchHit() {
  const p = player;
  if (!p.punching || p.pframe < 1) return;
  const hx = p.facing > 0 ? p.x + p.w : p.x - 14;
  const hy = p.y + 8;
  for (const e of enemies) {
    if (e.dead || e.hitThisSwing) continue;
    if (hx < e.x + e.w && hx + 14 > e.x && hy < e.y + e.h && hy + 12 > e.y) {
      e.hp--; e.flashTimer = 0.25; e.hitThisSwing = true;
      e.vx = p.facing > 0 ? 120 : -120;
      e.vy = -80;
      // Белая обводка на 60мс — "кадр вспышки" как в Hotline Miami
      e._hitFlash = 0.06;

      // Частицы-брызги из точки удара — белые чёрточки в сторону отлёта врага
      const impactX = e.x + e.w / 2 - game.cam;
      const impactY = e.y + e.h / 2;
      for (let k = 0; k < 8; k++) {
        const baseAng = p.facing > 0 ? 0 : Math.PI;
        const ang = baseAng + (Math.random() - 0.5) * 1.4;
        const spd = 80 + Math.random() * 120;
        particles.push({
          x: impactX, y: impactY,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd - 40 - Math.random() * 30,
          life: 1,
          maxLife: 0.2 + Math.random() * 0.15,
          size: 2 + Math.floor(Math.random() * 2),
        });
      }
      // Freeze-frame и дрожание — ощутимый вес удара
      game.freezeTimer = Math.max(game.freezeTimer, 0.03);
      screenShake(1.8, 0.08);

      if (e.hp <= 0) {
        e.dead = true; e.deathTimer = 0; game.score++; game.enemiesKilled = (game.enemiesKilled || 0) + 1;
        game.freezeTimer = 0.08;
        screenShake(3, 0.15);
        say('kill');
        if (typeof playSting === 'function') playSting('kill');
        spawnRagdoll(e);
      }
    }
  }
  checkPunchObjects();
  if (typeof bossPunchHit === 'function' && !player._bossHitThisSwing) {
    if (bossPunchHit(hx, hy, 14, 12)) {
      player._bossHitThisSwing = true;
    }
  }
}

function resetEnemyHitFlags() {
  if (!player.punching) {
    for (const e of enemies) e.hitThisSwing = false;
    player._bossHitThisSwing = false;
  }
}

// ── ПРОЦЕДУРНЫЕ СПРАЙТЫ ВРАГОВ ───────────────────────────────────────
// Каждая функция принимает: ex/ey (экранные коорд), flip (направление),
// bodyCol/eyeCol (цвета — меняются при flash), animT (для шага/idle)
// Размеры согласованы с dims в spawnEnemy.

// Helper: рисует глазное "белое" + зрачок который следит за игроком.
// eyeScreenCX/CY — экранные координаты центра глаза.
// enemyWX/WY — мировые координаты середины ВРАГА (для вычисления направления).
// eyeR — радиус глазного белка (обычно 2-3).
// pupilR — радиус зрачка (обычно 1).
// squinting — если true, верх глаза закрыт (боевой прищур).
// blinking — если true, глаз полностью закрыт (моргание).
function drawEnemyEye(eyeScreenCX, eyeScreenCY, enemyWX, enemyWY,
                     eyeR, pupilR, bodyCol, eyeCol, squinting, blinking) {
  if (blinking) {
    // Закрытый глаз — только горизонтальная полоска
    ctx.fillStyle = eyeCol;
    ctx.fillRect(eyeScreenCX - eyeR, eyeScreenCY, eyeR * 2, 1);
    return;
  }
  // Белок глаза — маленький прямоугольник bodyCol (уже часть тела, рисуем только если eyeR > 1)
  if (eyeR >= 2) {
    ctx.fillStyle = bodyCol;
    ctx.fillRect(eyeScreenCX - eyeR, eyeScreenCY - eyeR, eyeR * 2, eyeR * 2);
  }
  // Смещение зрачка в сторону игрока
  const p = player;
  const plX = p.x + p.w / 2;
  const plY = p.y + p.h / 2;
  const dx = plX - enemyWX;
  const dy = plY - enemyWY;
  const dist = Math.hypot(dx, dy) || 1;
  // максимальное смещение — eyeR - pupilR (чтобы зрачок не вылезал за глаз)
  const maxOff = Math.max(0, eyeR - pupilR);
  const offX = (dx / dist) * maxOff;
  const offY = (dy / dist) * maxOff;
  // Щуримся при боевой готовности — прячем половину зрачка верхней линией
  ctx.fillStyle = eyeCol;
  if (squinting) {
    // Чуть меньше зрачок, сверху "прикрыт веком" (тот же цвет что тело)
    ctx.fillRect(Math.round(eyeScreenCX + offX - pupilR),
                 Math.round(eyeScreenCY + offY - pupilR + 1),
                 pupilR * 2, pupilR * 2 - 1);
  } else {
    ctx.fillRect(Math.round(eyeScreenCX + offX - pupilR),
                 Math.round(eyeScreenCY + offY - pupilR),
                 pupilR * 2, pupilR * 2);
  }
}

// Проверка: моргает ли враг прямо сейчас. Случайное моргание каждые 3-5с на 0.1с.
// Опирается на _animT + сдвиг по хэшу чтобы глаза не моргали синхронно.
function isBlinking(e) {
  const period = 4 + (e._flyPhase || 0) % 2; // 4-6 секунд цикл
  const phase = ((e._animT || 0) + (e._flyPhase || 0) * 10) % period;
  return phase < 0.12; // первые 120мс каждого цикла — моргаем
}

// PATROL 22×36 — увеличенный человек с плоской шляпой
function drawPatrol(ex, ey, flip, bodyCol, eyeCol, animT, worldX, worldY) {
  const step = Math.floor(animT * 8) % 3;
  const bob = step === 1 ? -1 : 0;
  const ey2 = ey + bob;

  ctx.fillStyle = bodyCol;
  // Шляпа: узкая тулья + широкие поля
  ctx.fillRect(ex + 8, ey2, 6, 2);
  ctx.fillRect(ex + 7, ey2 + 2, 8, 1);
  ctx.fillRect(ex + 2, ey2 + 3, 18, 2);
  // Голова
  ctx.fillRect(ex + 6, ey2 + 6, 10, 7);
  // Шея
  ctx.fillRect(ex + 9, ey2 + 13, 4, 1);
  // Плечи/торс
  ctx.fillRect(ex + 4, ey2 + 14, 14, 2);
  ctx.fillRect(ex + 3, ey2 + 16, 16, 2);
  ctx.fillRect(ex + 4, ey2 + 18, 14, 4);
  ctx.fillRect(ex + 5, ey2 + 22, 12, 3);

  // Руки
  if (step === 0) {
    ctx.fillRect(ex + 1, ey2 + 15, 3, 8);
    ctx.fillRect(ex + 18, ey2 + 14, 3, 7);
  } else if (step === 2) {
    ctx.fillRect(ex + 1, ey2 + 14, 3, 7);
    ctx.fillRect(ex + 18, ey2 + 15, 3, 8);
  } else {
    ctx.fillRect(ex + 1, ey2 + 14, 3, 9);
    ctx.fillRect(ex + 18, ey2 + 14, 3, 9);
  }

  // Ноги
  if (step === 0) {
    const frontX = flip ? ex + 5 : ex + 13;
    const backX  = flip ? ex + 13 : ex + 5;
    ctx.fillRect(frontX, ey2 + 25, 4, 10);
    ctx.fillRect(backX,  ey2 + 25, 4, 8);
    ctx.fillRect(frontX - 1, ey2 + 34, 6, 2);
    ctx.fillRect(backX, ey2 + 32, 6, 2);
  } else if (step === 2) {
    const frontX = flip ? ex + 13 : ex + 5;
    const backX  = flip ? ex + 5 : ex + 13;
    ctx.fillRect(frontX, ey2 + 25, 4, 10);
    ctx.fillRect(backX,  ey2 + 25, 4, 8);
    ctx.fillRect(frontX - 1, ey2 + 34, 6, 2);
    ctx.fillRect(backX, ey2 + 32, 6, 2);
  } else {
    ctx.fillRect(ex + 6, ey2 + 25, 4, 10);
    ctx.fillRect(ex + 13, ey2 + 25, 4, 10);
    ctx.fillRect(ex + 4, ey2 + 34, 6, 2);
    ctx.fillRect(ex + 13, ey2 + 34, 6, 2);
  }

  // Глаза
  const blink = isBlinking({ _animT: animT });
  const eyeY = ey2 + 9;
  if (flip) {
    drawEnemyEye(ex + 7, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
    drawEnemyEye(ex + 10, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
  } else {
    drawEnemyEye(ex + 11, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
    drawEnemyEye(ex + 14, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
  }
}

// GUARD 24×30 — приземистый танк в броне
function drawGuard(ex, ey, flip, bodyCol, eyeCol, animT, alerted, windup, worldX, worldY) {
  const step = Math.floor(animT * 6) % 3;
  const bob = step === 1 ? -1 : 0;
  const ey2 = ey + bob;

  ctx.fillStyle = bodyCol;
  // Голова в шлеме (8×7)
  ctx.fillRect(ex + 8, ey2, 8, 7);
  ctx.fillRect(ex + 7, ey2 + 1, 10, 5);
  // Шея
  ctx.fillRect(ex + 6, ey2 + 7, 12, 3);
  // Широкие плечи-броня (22 px)
  ctx.fillRect(ex + 1, ey2 + 10, 22, 4);
  // Тело-броня
  ctx.fillRect(ex + 3, ey2 + 14, 18, 8);
  // Пояс
  ctx.fillRect(ex + 4, ey2 + 22, 16, 2);

  // Рука с оружием
  const armUp = Math.min(1, windup / 0.25);
  if (flip) {
    const armY = Math.round(ey2 + 16 - armUp * 6);
    ctx.fillRect(ex - 3, armY, 3, 6);
    ctx.fillRect(ex - 6, armY, 3, 3);
    ctx.fillRect(ex + 21, ey2 + 16, 3, 6);
  } else {
    const armY = Math.round(ey2 + 16 - armUp * 6);
    ctx.fillRect(ex + 24, armY, 3, 6);
    ctx.fillRect(ex + 27, armY, 3, 3);
    ctx.fillRect(ex, ey2 + 16, 3, 6);
  }

  // Короткие ноги
  if (step === 0) {
    ctx.fillRect(ex + 6, ey2 + 24, 4, 6);
    ctx.fillRect(ex + 14, ey2 + 24, 4, 5);
    ctx.fillRect(ex + 5, ey2 + 29, 6, 1);
    ctx.fillRect(ex + 13, ey2 + 28, 6, 1);
  } else if (step === 2) {
    ctx.fillRect(ex + 6, ey2 + 24, 4, 5);
    ctx.fillRect(ex + 14, ey2 + 24, 4, 6);
    ctx.fillRect(ex + 5, ey2 + 28, 6, 1);
    ctx.fillRect(ex + 13, ey2 + 29, 6, 1);
  } else {
    ctx.fillRect(ex + 6, ey2 + 24, 4, 6);
    ctx.fillRect(ex + 14, ey2 + 24, 4, 6);
    ctx.fillRect(ex + 5, ey2 + 29, 6, 1);
    ctx.fillRect(ex + 13, ey2 + 29, 6, 1);
  }

  const blink = isBlinking({ _animT: animT + 1 });
  const eyeY = ey2 + 3;
  if (flip) {
    drawEnemyEye(ex + 9, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, alerted, blink);
    drawEnemyEye(ex + 13, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, alerted, blink);
  } else {
    drawEnemyEye(ex + 11, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, alerted, blink);
    drawEnemyEye(ex + 15, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, alerted, blink);
  }
}

// RUNNER 14×42 — тощий высокий, большая голова, длинные ноги
function drawRunner(ex, ey, flip, bodyCol, eyeCol, animT, worldX, worldY) {
  const step = Math.floor(animT * 12) % 3;
  const bob = step === 1 ? -2 : 0;
  const ey2 = ey + bob;

  ctx.fillStyle = bodyCol;
  // Огромная голова (10×10)
  ctx.fillRect(ex + 2, ey2, 10, 10);
  ctx.fillRect(ex + 1, ey2 + 2, 12, 7);
  // Тонкая шея
  ctx.fillRect(ex + 6, ey2 + 10, 2, 3);
  // Узкое тело
  ctx.fillRect(ex + 4, ey2 + 13, 6, 8);
  // Руки раскинуты
  const armSpread = step === 1 ? 3 : 0;
  ctx.fillRect(ex - armSpread, ey2 + 13, 3, 3);
  ctx.fillRect(ex + 11 + armSpread, ey2 + 13, 3, 3);
  ctx.fillRect(ex - armSpread, ey2 + 16, 2, 5);
  ctx.fillRect(ex + 12 + armSpread, ey2 + 16, 2, 5);

  // Длинные тонкие ноги (17 px)
  if (step === 0) {
    const frontX = flip ? ex + 3 : ex + 9;
    const backX  = flip ? ex + 9 : ex + 3;
    ctx.fillRect(frontX, ey2 + 21, 2, 15);
    ctx.fillRect(backX,  ey2 + 21, 2, 12);
    ctx.fillRect(frontX - 1, ey2 + 36, 4, 2);
    ctx.fillRect(backX, ey2 + 33, 4, 2);
  } else if (step === 2) {
    const frontX = flip ? ex + 9 : ex + 3;
    const backX  = flip ? ex + 3 : ex + 9;
    ctx.fillRect(frontX, ey2 + 21, 2, 15);
    ctx.fillRect(backX,  ey2 + 21, 2, 12);
    ctx.fillRect(frontX - 1, ey2 + 36, 4, 2);
    ctx.fillRect(backX, ey2 + 33, 4, 2);
  } else {
    ctx.fillRect(ex + 3, ey2 + 21, 2, 18);
    ctx.fillRect(ex + 9, ey2 + 21, 2, 18);
    ctx.fillRect(ex + 2, ey2 + 39, 4, 2);
    ctx.fillRect(ex + 9, ey2 + 39, 4, 2);
  }

  // Огромные паникующие глаза
  const blink = isBlinking({ _animT: animT + 2 });
  const eyeY = ey2 + 4;
  if (flip) {
    drawEnemyEye(ex + 3, eyeY, worldX, worldY, 2, 1, bodyCol, eyeCol, false, blink);
    drawEnemyEye(ex + 8, eyeY, worldX, worldY, 2, 1, bodyCol, eyeCol, false, blink);
  } else {
    drawEnemyEye(ex + 5, eyeY, worldX, worldY, 2, 1, bodyCol, eyeCol, false, blink);
    drawEnemyEye(ex + 10, eyeY, worldX, worldY, 2, 1, bodyCol, eyeCol, false, blink);
  }
}

// FLYER 28×20 — большое летающее с размашистыми крыльями
function drawFlyer(ex, ey, flip, bodyCol, eyeCol, animT, worldX, worldY) {
  const wingFrame = Math.floor(animT * 14) % 3;
  const breath = Math.sin(animT * 6) * 0.5;
  ctx.fillStyle = bodyCol;
  // Тело в центре (10×8)
  const bh = Math.round(7 + breath);
  const by = 7 + Math.floor((7 - bh) / 2);
  ctx.fillRect(ex + 9, ey + by, 10, bh);
  ctx.fillRect(ex + 10, ey + by - 1, 8, 1);
  ctx.fillRect(ex + 10, ey + by + bh, 8, 1);
  // Хвост
  ctx.fillRect(flip ? ex + 22 : ex + 4, ey + 10, 4, 3);
  // Крылья
  if (wingFrame === 0) {
    // вверх
    ctx.fillRect(ex, ey, 8, 3);
    ctx.fillRect(ex + 3, ey + 3, 6, 3);
    ctx.fillRect(ex + 6, ey + 6, 4, 1);
    ctx.fillRect(ex + 20, ey, 8, 3);
    ctx.fillRect(ex + 19, ey + 3, 6, 3);
    ctx.fillRect(ex + 18, ey + 6, 4, 1);
  } else if (wingFrame === 1) {
    // горизонтально — полный размах
    ctx.fillRect(ex, ey + 8, 10, 4);
    ctx.fillRect(ex + 2, ey + 6, 7, 2);
    ctx.fillRect(ex + 18, ey + 8, 10, 4);
    ctx.fillRect(ex + 19, ey + 6, 7, 2);
  } else {
    // вниз
    ctx.fillRect(ex, ey + 14, 8, 3);
    ctx.fillRect(ex + 3, ey + 12, 6, 2);
    ctx.fillRect(ex + 6, ey + 10, 4, 2);
    ctx.fillRect(ex + 20, ey + 14, 8, 3);
    ctx.fillRect(ex + 19, ey + 12, 6, 2);
    ctx.fillRect(ex + 18, ey + 10, 4, 2);
  }
  // Глаза
  const blink = isBlinking({ _animT: animT + 4 });
  const eyeY = ey + 10;
  if (flip) {
    drawEnemyEye(ex + 10, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
    drawEnemyEye(ex + 14, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
  } else {
    drawEnemyEye(ex + 14, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
    drawEnemyEye(ex + 18, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, false, blink);
  }
}

// SNIPER 18×40 — высокий балахонник до земли
function drawSniper(ex, ey, flip, bodyCol, eyeCol, animT, alerted, aimT, worldX, worldY) {
  ctx.fillStyle = bodyCol;
  // Острый верх капюшона
  ctx.fillRect(ex + 8, ey, 2, 2);
  ctx.fillRect(ex + 7, ey + 2, 4, 1);
  ctx.fillRect(ex + 6, ey + 3, 6, 2);
  ctx.fillRect(ex + 5, ey + 5, 8, 2);
  // Тень в капюшоне (лицо)
  ctx.fillRect(ex + 4, ey + 7, 10, 6);
  // Плечи балахона
  ctx.fillRect(ex + 2, ey + 13, 14, 3);
  ctx.fillRect(ex + 1, ey + 16, 16, 2);
  // Длинный балахон до земли — расширяется
  ctx.fillRect(ex + 1, ey + 18, 16, 5);
  ctx.fillRect(ex, ey + 23, 18, 5);
  ctx.fillRect(ex, ey + 28, 18, 7);
  // Бахрома снизу
  ctx.fillRect(ex, ey + 35, 3, 3);
  ctx.fillRect(ex + 4, ey + 35, 3, 4);
  ctx.fillRect(ex + 8, ey + 35, 2, 3);
  ctx.fillRect(ex + 11, ey + 35, 3, 4);
  ctx.fillRect(ex + 15, ey + 35, 3, 3);

  // Рука с винтовкой
  if (flip) {
    ctx.fillRect(ex - 4, ey + 17, 4, 3);
    ctx.fillRect(ex - 9, ey + 17, 5, 2);
    ctx.fillRect(ex - 6, ey + 19, 3, 1);
  } else {
    ctx.fillRect(ex + 18, ey + 17, 4, 3);
    ctx.fillRect(ex + 22, ey + 17, 5, 2);
    ctx.fillRect(ex + 19, ey + 19, 3, 1);
  }

  // Глаз в капюшоне
  const blink = isBlinking({ _animT: animT + 5 });
  drawEnemyEye(flip ? ex + 5 : ex + 12, ey + 9,
               worldX, worldY, alerted ? 2 : 1, 1, bodyCol, eyeCol, false, blink);

  // Прицельный луч
  if (aimT > 0) {
    const muzX = flip ? ex - 8 : ex + 26;
    const muzY = ey + 19;
    const plX = player.x + player.w/2 - game.cam;
    const plY = player.y + player.h/2;
    const dx = plX - muzX;
    const dy = plY - muzY;
    const dist = Math.sqrt(dx*dx + dy*dy);
    const stepN = Math.floor(dist / 4);
    ctx.fillStyle = '#fff';
    ctx.globalAlpha = 0.6;
    for (let k = 1; k < stepN; k++) {
      if (k % 2 !== 0) continue;
      const t2 = k / stepN;
      ctx.fillRect(Math.round(muzX + dx * t2), Math.round(muzY + dy * t2), 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// BRUISER 28×32 — колоссальный, маленькая голова на массивном корпусе.
function drawBruiser(ex, ey, flip, bodyCol, eyeCol, animT, worldX, worldY) {
  const step = Math.floor(animT * 3) % 3;
  const bob = step === 1 ? -1 : 0;
  const ey2 = ey + bob;

  ctx.fillStyle = bodyCol;
  // Маленькая голова (12×8) на большом теле — непропорционально
  ctx.fillRect(ex + 10, ey2, 12, 8);
  ctx.fillRect(ex + 9, ey2 + 1, 14, 6);
  // Толстая шея
  ctx.fillRect(ex + 12, ey2 + 8, 8, 3);
  // ОГРОМНЫЕ плечи (32 px — шире всего тела)
  ctx.fillRect(ex, ey2 + 11, 32, 7);
  // Массивное тело
  ctx.fillRect(ex + 3, ey2 + 18, 26, 16);
  // Пояс
  ctx.fillRect(ex + 4, ey2 + 34, 24, 2);
  // Мускулистые руки
  let armL = 0, armR = 0;
  if (step === 0) { armL = -1; armR = 1; }
  else if (step === 2) { armL = 1; armR = -1; }
  ctx.fillRect(ex - 2, ey2 + 15 + armL, 5, 20);
  ctx.fillRect(ex + 29, ey2 + 15 + armR, 5, 20);
  // Кулаки
  ctx.fillRect(ex - 3, ey2 + 33 + armL, 7, 6);
  ctx.fillRect(ex + 29, ey2 + 33 + armR, 7, 6);
  // Мощные ноги
  if (step === 0) {
    ctx.fillRect(ex + 7, ey2 + 36, 7, 11);
    ctx.fillRect(ex + 18, ey2 + 36, 7, 10);
    ctx.fillRect(ex + 6, ey2 + 46, 9, 2);
    ctx.fillRect(ex + 17, ey2 + 45, 9, 2);
  } else if (step === 2) {
    ctx.fillRect(ex + 7, ey2 + 36, 7, 10);
    ctx.fillRect(ex + 18, ey2 + 36, 7, 11);
    ctx.fillRect(ex + 6, ey2 + 45, 9, 2);
    ctx.fillRect(ex + 17, ey2 + 46, 9, 2);
  } else {
    ctx.fillRect(ex + 7, ey2 + 36, 7, 11);
    ctx.fillRect(ex + 18, ey2 + 36, 7, 11);
    ctx.fillRect(ex + 6, ey2 + 46, 9, 2);
    ctx.fillRect(ex + 17, ey2 + 46, 9, 2);
  }
  // Нахмуренная бровь
  ctx.fillStyle = bodyCol;
  ctx.fillRect(ex + 10, ey2 + 2, 12, 1);
  // Маленькие злые глаза
  const blink = isBlinking({ _animT: animT + 3 });
  const eyeY = ey2 + 4;
  if (flip) {
    drawEnemyEye(ex + 12, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, true, blink);
    drawEnemyEye(ex + 17, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, true, blink);
  } else {
    drawEnemyEye(ex + 14, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, true, blink);
    drawEnemyEye(ex + 19, eyeY, worldX, worldY, 1, 1, bodyCol, eyeCol, true, blink);
  }
}

function drawEnemies() {
  const now = Date.now() / 1000;
  for (const e of enemies) {
    const ex = Math.round(e.x - game.cam), ey = Math.round(e.y);
    if (ex + e.w < 0 || ex > GW) continue;

    if (e.dead) {
      // Не рисуем спрайт — враг "развалился" на ragdoll + частицы.
      // Счётчик deathTimer продолжает работать в updateEnemies для удаления.
      continue;
    }

    const flashing = e.flashTimer > 0 && Math.floor(e.flashTimer * 20) % 2 === 0;
    const bodyColor = flashing ? '#000' : '#fff';
    const eyeColor = flashing ? '#fff' : '#000';

    // _animT увеличивается пропорционально скорости — стоящий враг не шагает
    // (кроме idle bob). Плюс небольшой idle bob через Date.now.
    const moving = Math.abs(e.vx) > 5;
    const idleBob = moving ? 0 : Math.round(Math.sin(now * 2 + (e._flyPhase || 0)) * 1);
    const drawY = ey + idleBob;
    // При получении урона — небольшой shake спрайта на первые 0.1с flash
    let hurtShakeX = 0;
    if (e.flashTimer > 0.15) {
      hurtShakeX = (Math.random() * 2 - 1) * 2;
    }
    const drawX = ex + Math.round(hurtShakeX);
    // Мировые координаты центра врага — для вычисления направления взгляда
    const wX = e.x + e.w / 2;
    const wY = e.y + e.h / 2;

    if (e.type === 'patrol') {
      drawPatrol(drawX, drawY, e.vx < 0, bodyColor, eyeColor, e._animT, wX, wY);
    } else if (e.type === 'runner') {
      ctx.globalAlpha = 0.85 + Math.sin(Date.now() / 80) * 0.15;
      drawRunner(drawX, drawY, e.vx < 0, bodyColor, eyeColor, e._animT, wX, wY);
      ctx.globalAlpha = 1;
    } else if (e.type === 'guard') {
      drawGuard(drawX, drawY, e.facing < 0, bodyColor, eyeColor, e._animT, e.alerted, e._windupTimer || 0, wX, wY);

      // пузырь ?/!
      const suspDist = Math.abs((player.x + player.w / 2) - (e.x + e.w / 2));
      const drawBubble = (draws) => {
        ctx.fillStyle = '#000';
        for (const [dx, dy, dw, dh] of draws) ctx.fillRect(dx - 1, dy - 1, dw + 2, dh + 2);
        ctx.fillStyle = '#fff';
        for (const [dx, dy, dw, dh] of draws) ctx.fillRect(dx, dy, dw, dh);
      };
      if (suspDist < 140 && !e.alerted && Math.abs((player.y + player.h) - (e.y + e.h)) < T * 3) {
        if (Math.floor(Date.now() / 400) % 2 === 0) {
          drawBubble([
            [drawX + 6, drawY - 8, 4, 1], [drawX + 8, drawY - 7, 2, 1],
            [drawX + 7, drawY - 6, 2, 1], [drawX + 7, drawY - 4, 2, 1],
          ]);
        }
      } else if (e.alerted && Math.floor(Date.now() / 200) % 2 === 0) {
        drawBubble([[drawX + 7, drawY - 4, 2, 3], [drawX + 7, drawY - 6, 2, 1]]);
      }
      if (e._muzzleFlash > 0) drawMuzzleFlash(drawX, drawY, e.facing);

    } else if (e.type === 'flyer') {
      drawFlyer(drawX, ey, e.vx < 0, bodyColor, eyeColor, e._animT, wX, wY);
    } else if (e.type === 'sniper') {
      drawSniper(drawX, drawY, e.facing < 0, bodyColor, eyeColor, e._animT, e.alerted, e._aimTimer || 0, wX, wY);
      if (e._muzzleFlash > 0) drawMuzzleFlash(drawX, drawY, e.facing);
      if (e.alerted && Math.floor(Date.now() / 150) % 2 === 0) {
        ctx.fillStyle = '#000';
        ctx.fillRect(drawX + 6, drawY - 5, 2, 1);
        ctx.fillRect(drawX + 6, drawY - 3, 2, 2);
      }
    } else if (e.type === 'bruiser') {
      drawBruiser(drawX, drawY, e.vx < 0, bodyColor, eyeColor, e._animT, wX, wY);
    }

    // HIT-FLASH overlay — яркая белая вспышка на долю секунды при попадании
    if (e._hitFlash > 0) {
      ctx.globalAlpha = Math.min(1, e._hitFlash * 15); // 0.06 → alpha 0.9
      ctx.fillStyle = '#fff';
      ctx.fillRect(drawX - 1, drawY - 1, e.w + 2, e.h + 2);
      ctx.globalAlpha = 1;
    }

    // HP-полоска
    const hpByType = { patrol: 2, guard: 1, runner: 1, flyer: 1, sniper: 2, bruiser: 3 };
    const maxHP = hpByType[e.type] || 1;
    if (e.hp < maxHP && e.hp > 0) {
      ctx.fillStyle = '#000'; ctx.fillRect(ex, drawY - 3, e.w, 2);
      ctx.fillStyle = '#fff'; ctx.fillRect(ex, drawY - 3, Math.round(e.w * e.hp / maxHP), 2);
    }
  }
}
