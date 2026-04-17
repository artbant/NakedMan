// NUKED MAN — enemies.js
// freeze frame при убийстве
let freezeTimer = 0;

// Типы врагов, AI, снаряды

const ENEMY_SPR = [
  [4,0,4],[3,1,6],[3,2,6],[4,3,4],[2,4,8],
  [3,5,6],[3,6,6],[3,7,6],
  [2,8,3],[7,8,3],[2,9,3],[7,9,3],[4,10,4],
  [3,11,2],[7,11,2],[3,12,2],[7,12,2],[3,13,2],[7,13,2],[2,14,3],[7,14,3],
];

const GUARD_SPR = [
  [3,0,4],[2,1,6],[2,2,6],[3,3,4],[1,4,8],
  [2,5,6],[2,6,6],[0,7,3],[7,7,3],[0,8,3],[7,8,3],[3,9,4],
  [2,10,2],[6,10,2],[2,11,2],[6,11,2],[1,12,2],[7,12,2],
  [10,6,1],[10,7,2],[10,8,2],[10,9,1],
];

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
  say(p.lives <= 0 ? 'die' : 'hurt');
  say(p.lives <= 0 ? 'die' : 'hurt');
  if (p.lives <= 0) {
    p.dead = true;
    p.dtimer = 0;
    screenShake(5, 0.35);
    return;
  }
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
    pr.vy += 200 * dt;
    pr.x += pr.vx * dt;
    pr.y += pr.vy * dt;
    pr.life -= dt;
    if (solid(pr.x, pr.y + pr.h) || solid(pr.x + pr.w, pr.y + pr.h) ||
        solid(pr.x, pr.y) || solid(pr.x + pr.w, pr.y)) {
      for (let k = 0; k < 5; k++) {
        const ang = Math.random() * Math.PI * 2;
        particles.push({ x: pr.x - cam, y: pr.y, vx: Math.cos(ang)*25, vy: Math.sin(ang)*25-10, life:1, maxLife:0.25, size:1 });
      }
      projectiles.splice(i, 1); continue;
    }
    if (!p.dead && p.invTimer <= 0 &&
        p.x < pr.x + pr.w && p.x + p.w > pr.x &&
        p.y < pr.y + pr.h && p.y + p.h > pr.y) {
      // снаряд отбрасывает в сторону полёта
      hurtPlayer(pr.vx > 0 ? 80 : -80, -60);
      projectiles.splice(i, 1); continue;
    }
    if (pr.life <= 0) projectiles.splice(i, 1);
  }
}

function drawProjectiles() {
  ctx.fillStyle = '#E4E4E4';
  for (const pr of projectiles) {
    const px2 = Math.round(pr.x - cam), py2 = Math.round(pr.y);
    if (px2 + pr.w < 0 || px2 > GW) continue;
    for (const [sx, sy, sw] of PROJ_SPR) ctx.fillRect(px2 + sx, py2 + sy, sw, 1);
  }
}


// ── РЕПЛИКИ ГЕРОЯ ─────────────────────────────────────────────────────
const PLAYER_LINES = {
  start:   ["где я вообще", "это не мой район", "хорошая была вечеринка", "окей. окей.", "штаны бы найти", "интересно", "надо идти наверное", "ладно"],
  hurt:    ["ай", "нет", "ок больно", "за что", "серьёзно", "эй", "стоп", "не надо"],
  die:     ["ладно бывает", "опять", "ну и пожалуйста", "засчитай как сон", "это не я упал"],
  kill:    ["извини", "не хотел", "сорри", "ты сам начал", "мы квиты", "пока", "не злись"],
  rescue:  ["ты тоже здесь?", "давай вместе", "держись", "нас уже двое", "ты знаешь выход?"],
  pickup:  ["о это пригодится", "хорошая находка", "не трогайте мои вещи", "спасибо вселенная"],
  win:     ["и куда теперь", "наверное следующий уровень лучше", "я иду домой", "почти понял что происходит", "ок продолжаем", "странное место"],
  explode: ["нормально нормально", "это я специально", "ок это уже слишком", "неплохо"],
  firstenemy: ["о нет", "кто это", "привет", "ой", "не трогайте"],
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

function drawSpeech(cam) {
  if (speechBubble.timer <= 0) return;
  const alpha = Math.min(1, speechBubble.timer);
  const sx = Math.round(speechBubble.worldX - cam);
  const sy = Math.round(speechBubble.worldY);
  ctx.fillStyle = `rgba(228,228,228,${alpha.toFixed(2)})`;
  const len = speechBubble.text.length;
  for (let i = 0; i < len; i++) {
    const ch = speechBubble.text[i].toUpperCase();
    const g = GLYPHS[ch];
    if (!g) continue;
    const cx2 = sx - Math.floor(len * 2) + i * 5;
    for (let r = 0; r < g.length; r++)
      for (let c = 0; c < g[r].length; c++)
        if (g[r][c]) ctx.fillRect(cx2 + c, sy + r, 1, 1);
  }
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

function drawEnemySpeech(cam) {
  for (const s of enemySpeech) {
    if (s.e.dead) continue;
    const alpha = Math.min(1, s.timer);
    const ex = Math.round(s.e.x - cam + s.e.w / 2);
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

let enemies = [];
let _firstEnemySeen = false;

function resetFirstEnemy() { _firstEnemySeen = false; }


function spawnEnemy(tileX, startRow, type = 'patrol') {
  const h = type === 'guard' ? 14 : 16;
  const spawnY = findSpawnY(tileX, h, startRow);
  enemies.push({
    x: tileX * T + 4, y: spawnY,
    w: type === 'guard' ? 10 : 12, h,
    vx: type === 'patrol' ? 28 : type === 'runner' ? 45 : 0, vy: 0,
    hp: type === 'guard' ? 1 : type === 'runner' ? 1 : 2,
    type, flashTimer: 0, dead: false, deathTimer: 0, hitThisSwing: false,
    alertTimer: 0, shootCooldown: 0, alerted: false, facing: 1,
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

    // гравитация
    e.vy += 480 * dt;
    if (e.vy > 500) e.vy = 500;
    e.y += e.vy * dt;
    if (solid(e.x + 2, e.y + e.h) || solid(e.x + e.w - 2, e.y + e.h)) {
      e.y = Math.floor((e.y + e.h) / T) * T - e.h;
      e.vy = 0;
    }

    if (e.type === 'patrol') {
      // иногда бормочет
      if (!e._mutterTimer) e._mutterTimer = 2 + Math.random() * 4;
      e._mutterTimer -= dt;
      if (e._mutterTimer <= 0) {
        triggerEnemySpeech(e, PATROL_MUTTER);
        e._mutterTimer = 3 + Math.random() * 5;
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
      if (e.alerted && !e._wasAlerted) triggerEnemySpeech(e, GUARD_ALERT);
      e._wasAlerted = e.alerted;
      if (e.alerted && e.shootCooldown <= 0) {
        if (dist < 22) {
          if (!p.dead && p.invTimer <= 0) {
            hurtPlayer(80, 0); // knockback от удара дубиной
          }
          e.shootCooldown = 1.5;
        } else {
          spawnProjectile(e.x + (e.facing > 0 ? e.w + 2 : -6), e.y + 6, e.facing);
          e.shootCooldown = 2.0;
        }
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
    // Если игрок падает и его ноги попадают в верхнюю треть врага
    const pFeet = p.y + p.h;
    const eTorso = e.y + e.h * 0.35;
    const fallingDown = p.vy > 0;

    if (fallingDown && pFeet > eHitY && pFeet < eTorso + 4 && !p.punching) {
      e.hp = 0; e.dead = true; e.deathTimer = 0; score++;
      p.vy = -200;
      freezeTimer = 0.08;
      screenShake(4, 0.18);
      playSound('stomp');
      say('kill');
      for (let k = 0; k < 10; k++) {
        const ang = Math.random() * Math.PI * 2;
        const spd = 20 + Math.random() * 40;
        particles.push({ x: e.x - cam + e.w/2, y: e.y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 40, life:1, maxLife:0.3+Math.random()*0.2, size:2 });
      }
      continue;
    }

    // Боковой контакт — урон только если враг смотрит в сторону игрока
    // (не ударяет в спину случайно)
    const enemyFacingPlayer = e.type === 'patrol'
      ? (e.vx > 0 ? p.x > e.x : p.x < e.x)
      : (e.facing > 0 ? p.x > e.x : p.x < e.x);

    // patrol бьёт всегда при боковом касании,
    // guard — только если алертован
    const canHit = e.type === 'patrol' || (e.type === 'guard' && e.alerted);

    if (canHit && !p.punching) {
      hurtPlayer(p.facing > 0 ? -60 : 60, -100);
    }
  }
}

// ── ФИЗИКА ТЕЛ (RAGDOLL) ─────────────────────────────────────────────
let ragdolls = [];

function spawnRagdoll(e) {
  // разбиваем врага на 4-6 кусков которые разлетаются
  const cx = e.x + e.w / 2;
  const cy = e.y + e.h / 2;
  const count = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const ang = (Math.random() * Math.PI * 2);
    const spd = 40 + Math.random() * 80;
    ragdolls.push({
      x: cx - cam, y: cy,
      vx: Math.cos(ang) * spd + (e.vx || 0) * 0.5,
      vy: Math.sin(ang) * spd - 60,
      size: 1 + Math.floor(Math.random() * 3),
      life: 1,
      maxLife: 0.6 + Math.random() * 0.5,
      rot: Math.random() * 4 - 2, // скорость "вращения" (визуально)
    });
  }
}

function updateRagdolls(dt) {
  for (let i = ragdolls.length - 1; i >= 0; i--) {
    const r = ragdolls[i];
    r.vy += 300 * dt;
    r.x += r.vx * dt;
    r.y += r.vy * dt;
    r.life -= dt / r.maxLife;
    // отскок от земли
    const wx = r.x + cam;
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
    ctx.fillStyle = a > 0.5 ? '#E4E4E4' : '#888';
    ctx.fillRect(Math.round(r.x), Math.round(r.y), r.size, r.size);
  }
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
      if (e.hp <= 0) {
        e.dead = true; e.deathTimer = 0; score++;
        freezeTimer = 0.06;
        screenShake(3, 0.15);
        say('kill');
        spawnRagdoll(e);
      }
    }
  }
  checkPunchObjects();
}

function resetEnemyHitFlags() {
  if (!player.punching)
    for (const e of enemies) e.hitThisSwing = false;
}

function drawEnemies() {
  for (const e of enemies) {
    const ex = Math.round(e.x - cam), ey = Math.round(e.y);
    if (ex + e.w < 0 || ex > GW) continue;
    if (e.dead) {
      ctx.globalAlpha = Math.max(0, 1 - e.deathTimer * 2);
      ctx.fillStyle = '#E4E4E4';
      ctx.fillRect(ex + 2, ey + 2, e.w - 4, e.h - 4);
      ctx.globalAlpha = 1; continue;
    }
    ctx.fillStyle = (e.flashTimer > 0 && Math.floor(e.flashTimer * 20) % 2 === 0) ? '#fff' : '#E4E4E4';
    if (e.type === 'runner') {
      // runner — маленький, быстрый, паникует
      const flip = e.vx < 0;
      ctx.globalAlpha = 0.85 + Math.sin(Date.now() / 80) * 0.15; // мерцает
      for (const [sx, sy, sw] of ENEMY_SPR) ctx.fillRect(ex + (flip ? 12-sx-sw : sx), ey + sy, sw, 1);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      // большие испуганные глаза
      ctx.fillRect(flip ? ex+3 : ex+2, ey+2, 2, 2);
      ctx.fillRect(flip ? ex+7 : ex+6, ey+2, 2, 2);
    } else if (e.type === 'patrol') {
      const flip = e.vx < 0;
      for (const [sx, sy, sw] of ENEMY_SPR) ctx.fillRect(ex + (flip ? 12-sx-sw : sx), ey + sy, sw, 1);
      ctx.fillStyle = '#000';
      ctx.fillRect(flip ? ex+4 : ex+3, ey+2, 1, 1);
      ctx.fillRect(flip ? ex+7 : ex+6, ey+2, 1, 1);
    } else {
      const flip = e.facing < 0;
      for (const [sx, sy, sw] of GUARD_SPR) ctx.fillRect(ex + (flip ? 12-sx-sw : sx), ey + sy, sw, 1);
      ctx.fillStyle = '#000';
      ctx.fillRect(flip ? ex+5 : ex+2, ey+1, 1, 1);
      ctx.fillRect(flip ? ex+7 : ex+4, ey+1, 1, 1);
      if (e.alerted && Math.floor(Date.now() / 200) % 2 === 0) {
        ctx.fillStyle = '#E4E4E4';
        ctx.fillRect(ex+4, ey-4, 2, 3);
        ctx.fillRect(ex+4, ey-6, 2, 1);
      }
    }
    if (e.hp < (e.type === 'patrol' ? 2 : 1)) {
      ctx.fillStyle = '#555'; ctx.fillRect(ex, ey-3, e.w, 2);
      ctx.fillStyle = '#E4E4E4'; ctx.fillRect(ex, ey-3, Math.round(e.w * e.hp / 2), 2);
    }
  }
}
