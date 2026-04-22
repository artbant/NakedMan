// NUKED MAN — boss.js
// Босс "Глаз" — гигантский глаз на тонких ходулях. Появляется на уровнях 5/10/15.
// Три фазы по HP:
//   100%–50% (phase 1): медленное движение, редкие лазеры
//   50%–20%  (phase 2): быстрее, двойные лазеры, прыжки
//   20%–0   (phase 3): призывает мелких врагов + частые атаки

let boss = null;

// Проверка: нужен ли босс на этом уровне
// Сейчас — КАЖДЫЙ уровень заканчивается боссом.
function levelHasBoss(lvl) {
  return true;
}

// Инициализация босса — вызывается из initLevel после generateMap
function initBoss(lvl) {
  if (!levelHasBoss(lvl)) {
    boss = null;
    return;
  }
  // HP растёт плавно: lvl 1 → 6, lvl 5 → 14, lvl 10 → 24
  const hp = 5 + lvl * 1.5 | 0;

  // Позиция — ближе к концу уровня, на земле.
  // Босс стоит на тонких ногах, глаз зависает над землёй на ~2 тайла.
  const tx = Math.max(4, MW - 10);
  const groundY = findSpawnY(tx, 0) - 4; // земля под боссом
  // глаз висит на 4 тайла над землёй (тонкие ноги 4 тайла)
  const eyeH = 48; // размер глаза
  const legLen = T * 4; // длина ног
  const bodyY = groundY - legLen - eyeH + 8;

  boss = {
    x: tx * T,
    y: bodyY,
    w: 48, h: 48,        // хитбокс глаза (ног нет в хитбоксе)
    vx: 0, vy: 0,
    hp, maxHP: hp,
    _legGroundY: groundY, // уровень земли для ног (визуально)
    phase: 1,
    flashTimer: 0,
    shootCooldown: 1.5,   // первая атака через 1.5с после спавна
    summonCooldown: 0,
    _lookPhase: 0,        // фаза для движения зрачка
    _moveT: 0,            // таймер для паттернов движения
    _homeX: tx * T,       // точка притяжения по X
    dead: false,
    deathTimer: 0,
    defeated: false,      // победа зафиксирована
  };
  // Драматический стинг появления — через небольшую задержку
  // чтобы игрок увидел босса на экране
  if (typeof playSting === 'function') {
    setTimeout(() => playSting('bossAppear'), 200);
  }
}

// Обновление босса. Вызывается каждый кадр из update() в game.js.
function updateBoss(dt) {
  if (!boss || boss.dead) {
    if (boss && boss.dead) {
      boss.deathTimer += dt;
      // Дополнительные мелкие искры во время распада — на уровне земли (ноги осыпаются)
      if (boss.deathTimer < 0.8 && Math.random() < 0.5) {
        const px = boss.x + Math.random() * boss.w - game.cam;
        const py = boss._legGroundY - Math.random() * T * 3;
        particles.push({
          x: px, y: py,
          vx: (Math.random() - 0.5) * 60,
          vy: -20 - Math.random() * 40,
          life: 1, maxLife: 0.3 + Math.random() * 0.2,
          size: 1 + Math.floor(Math.random() * 2)
        });
      }
      if (boss.deathTimer > 1.5 && !boss.defeated) {
        boss.defeated = true;
        if (typeof onBossDefeated === 'function') onBossDefeated();
      }
    }
    return;
  }

  boss._lookPhase += dt * 2;
  boss._moveT += dt;

  if (boss.flashTimer > 0) boss.flashTimer -= dt;
  if (boss._hitFlash > 0) boss._hitFlash -= dt;
  if (boss.shootCooldown > 0) boss.shootCooldown -= dt;
  if (boss.summonCooldown > 0) boss.summonCooldown -= dt;

  // Определяем фазу по % HP
  const hpPct = boss.hp / boss.maxHP;
  const newPhase = hpPct > 0.5 ? 1 : (hpPct > 0.2 ? 2 : 3);
  if (newPhase !== boss.phase) {
    boss.phase = newPhase;
    // при смене фазы — короткая пауза перед следующей атакой
    boss.shootCooldown = 1.0;
    screenShake(4, 0.3);
    if (typeof playSting === 'function') playSting('bossPhase');
  }

  const p = player;
  const dxP = (p.x + p.w/2) - (boss.x + boss.w/2);

  // ── ДВИЖЕНИЕ ─────────────────────────────────────────────────────
  // Плавное "плавание" глаза туда-сюда вокруг _homeX.
  const speed = boss.phase === 1 ? 30 : boss.phase === 2 ? 55 : 75;
  const amplitude = boss.phase === 1 ? 40 : boss.phase === 2 ? 70 : 100;
  // возврат к центру + синусоидальное покачивание
  const targetX = boss._homeX + Math.sin(boss._moveT * 0.8) * amplitude;
  const diffX = targetX - boss.x;
  boss.vx = Math.sign(diffX) * Math.min(speed, Math.abs(diffX) * 2);
  boss.x += boss.vx * dt;
  // вертикальное покачивание для "парения"
  const bobAmp = boss.phase === 3 ? 12 : 6;
  boss.y = (boss._legGroundY - T * 4 - boss.h + 8) + Math.sin(boss._moveT * 1.5) * bobAmp;

  // ── АТАКИ ПО ФАЗАМ ──────────────────────────────────────────────
  if (boss.shootCooldown <= 0) {
    if (boss.phase === 1) {
      // одиночный лазер в сторону игрока
      fireBossLaser(boss, dxP > 0 ? 1 : -1);
      boss.shootCooldown = 2.5;
    } else if (boss.phase === 2) {
      // двойной лазер — сначала прямой, через 0.3с наклонный
      fireBossLaser(boss, dxP > 0 ? 1 : -1);
      setTimeout(() => {
        if (boss && !boss.dead) fireBossLaser(boss, dxP > 0 ? 1 : -1, -0.3);
      }, 300);
      boss.shootCooldown = 1.8;
    } else {
      // phase 3: тройной лазер веером
      fireBossLaser(boss, dxP > 0 ? 1 : -1, -0.4);
      fireBossLaser(boss, dxP > 0 ? 1 : -1, 0);
      fireBossLaser(boss, dxP > 0 ? 1 : -1, 0.4);
      boss.shootCooldown = 1.5;
    }
  }

  // ── ПРИЗЫВ ПРИСПЕШНИКОВ в фазе 3 ────────────────────────────────
  if (boss.phase === 3 && boss.summonCooldown <= 0) {
    // призываем 1-2 runner'а рядом с боссом
    const bossTX = Math.floor((boss.x + boss.w/2) / T);
    for (let k = 0; k < 2; k++) {
      const tx = bossTX + (k === 0 ? -4 : 4);
      if (tx > 2 && tx < MW - 2) {
        spawnEnemy(tx, Math.floor(boss._legGroundY / T) - 1, 'runner');
      }
    }
    game.enemiesTotal = (game.enemiesTotal || 0) + 2;
    boss.summonCooldown = 5.0;
    if (typeof playSting === 'function') playSting('bossSummon');
  }
}

// Лазер босса — большой projectile с уроном
function fireBossLaser(b, dir, yAngle = 0) {
  const startX = b.x + b.w/2;
  const startY = b.y + b.h/2;
  const vx = dir * 220;
  const vy = yAngle * 220;
  projectiles.push({
    x: startX, y: startY,
    vx, vy,
    life: 3.0, maxLife: 3.0,
    boss: true, // помечаем как босс-снаряд (больше урона, больше размер)
  });
  playSound('punch');
}

// ── РИСОВАНИЕ ────────────────────────────────────────────────────
function drawBoss() {
  if (!boss) return;
  if (boss.dead && boss.deathTimer > 1.5) return; // после смерти уже не рисуем

  const bx = Math.round(boss.x - game.cam);
  const by = Math.round(boss.y);
  if (bx + boss.w < 0 || bx > GW) return;

  // При смерти — не рисуем тело, оно развалилось в ragdoll + частицы
  if (boss.dead) return;

  const flashing = boss.flashTimer > 0 && Math.floor(boss.flashTimer * 20) % 2 === 0;
  const bodyCol = flashing ? '#000' : '#fff';
  const pupilCol = flashing ? '#fff' : '#000';

  // ── НОГИ: две тонкие длинные вертикальные линии ──
  // Ноги опираются в землю на _legGroundY, поднимаются до низа глаза
  const legFootY = boss._legGroundY;
  const legTopY  = by + boss.h - 4;
  // немного покачиваются в фазе с движением
  const legSway = Math.sin(boss._moveT * 1.5) * 2;
  ctx.fillStyle = bodyCol;
  // левая нога
  ctx.fillRect(bx + 14 + legSway, legTopY, 2, legFootY - legTopY);
  // правая нога
  ctx.fillRect(bx + boss.w - 16 - legSway, legTopY, 2, legFootY - legTopY);
  // ступни — маленькие "тапочки"
  ctx.fillRect(bx + 12 + legSway, legFootY - 1, 6, 2);
  ctx.fillRect(bx + boss.w - 18 - legSway, legFootY - 1, 6, 2);

  // ── ГЛАЗ: круг ──
  // рисуем примерный круг через квадраты-строки (pixel-art стиль)
  // 48×48, центр (bx+24, by+24), радиус 22
  const cx = bx + boss.w/2;
  const cy = by + boss.h/2;
  const r = 22;
  // белое тело глаза
  ctx.fillStyle = bodyCol;
  for (let dy = -r; dy <= r; dy++) {
    const w = Math.floor(Math.sqrt(r*r - dy*dy));
    ctx.fillRect(cx - w, cy + dy, w * 2, 1);
  }

  // ── ЗРАЧОК — следит за игроком ──
  const p = player;
  const plX = p.x + p.w/2 - game.cam;
  const plY = p.y + p.h/2;
  const dxEye = plX - cx;
  const dyEye = plY - cy;
  const ang = Math.atan2(dyEye, dxEye);
  // зрачок смещён в сторону игрока, но не дальше чем r/2
  const pupOff = Math.min(r * 0.45, Math.sqrt(dxEye*dxEye + dyEye*dyEye) * 0.1);
  const pupX = cx + Math.cos(ang) * pupOff;
  const pupY = cy + Math.sin(ang) * pupOff;
  const pupR = 10;
  // радужка (средний круг) — тёмное кольцо вокруг зрачка
  ctx.fillStyle = pupilCol;
  for (let dy = -pupR; dy <= pupR; dy++) {
    const w = Math.floor(Math.sqrt(pupR*pupR - dy*dy));
    ctx.fillRect(Math.round(pupX) - w, Math.round(pupY + dy), w * 2, 1);
  }
  // блик — маленький белый квадратик в верхнем-левом углу зрачка
  ctx.fillStyle = bodyCol;
  ctx.fillRect(Math.round(pupX) - 4, Math.round(pupY) - 5, 2, 2);

  // ── HP-ПОЛОСКА над боссом ──
  if (!boss.dead && boss.hp > 0) {
    const barY = by - 14;
    const barW = boss.w;
    // Чёрная обводка
    ctx.fillStyle = '#000';
    ctx.fillRect(bx - 2, barY - 2, barW + 4, 7);
    // Белая "рамка" (внешняя граница самой шкалы)
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx - 1, barY - 1, barW + 2, 5);
    // Чёрный фон внутри — "пустая" часть
    ctx.fillStyle = '#000';
    ctx.fillRect(bx, barY, barW, 3);
    // Белая заполненная часть (текущее HP) — хорошо видна на тёмном фоне
    ctx.fillStyle = '#fff';
    ctx.fillRect(bx, barY, Math.round(barW * boss.hp / boss.maxHP), 3);
  }

  // HIT-FLASH overlay — белая вспышка при попадании
  if (boss._hitFlash > 0 && !boss.dead) {
    ctx.globalAlpha = Math.min(1, boss._hitFlash * 15);
    ctx.fillStyle = '#fff';
    // круглая форма чтобы соответствовать глазу
    for (let dy = -r - 1; dy <= r + 1; dy++) {
      const rowR = Math.floor(Math.sqrt(Math.max(0, (r + 1) * (r + 1) - dy * dy)));
      ctx.fillRect(cx - rowR, cy + dy, rowR * 2, 1);
    }
    ctx.globalAlpha = 1;
  }

  // Название босса сверху (первая секунда боя)
  if (boss._moveT < 2.0 && !boss.dead) {
    const title = 'THE EYE';
    const tx = Math.round(cx - title.length * 2);
    if (typeof pixelTextOutlined === 'function') {
      pixelTextOutlined(title, tx, by - 22, '#fff', 1);
    }
  }
}

// Урон боссу — вызывается из checkPunchHit в enemies.js
function damageBoss(dmg) {
  if (!boss || boss.dead) return false;
  boss.hp -= dmg;
  boss.flashTimer = 0.2;
  boss._hitFlash = 0.06;
  screenShake(2, 0.1);

  // Частицы-брызги в точке удара (центр глаза, на стороне игрока)
  const p = player;
  const dir = (p.x + p.w/2) < (boss.x + boss.w/2) ? 1 : -1;
  const impactX = boss.x + boss.w/2 - game.cam - dir * 10;
  const impactY = boss.y + boss.h/2;
  for (let k = 0; k < 10; k++) {
    const baseAng = dir > 0 ? Math.PI : 0;
    const ang = baseAng + (Math.random() - 0.5) * 1.4;
    const spd = 100 + Math.random() * 140;
    particles.push({
      x: impactX, y: impactY,
      vx: Math.cos(ang) * spd,
      vy: Math.sin(ang) * spd - 50 - Math.random() * 40,
      life: 1,
      maxLife: 0.25 + Math.random() * 0.2,
      size: 2 + Math.floor(Math.random() * 3),
    });
  }
  game.freezeTimer = Math.max(game.freezeTimer, 0.04);

  if (boss.hp <= 0) {
    boss.hp = 0;
    boss.dead = true;
    boss.deathTimer = 0;
    game.score += 10;
    if (typeof say === 'function') say('kill');
    if (typeof playSting === 'function') playSting('bossDefeat');
    if (typeof playSound === 'function') playSound('explode');
    screenShake(8, 0.6);
    game.freezeTimer = Math.max(game.freezeTimer, 0.18);

    // МАССИВНЫЙ пиксельный распад глаза
    const bcx = boss.x + boss.w / 2 - game.cam;
    const bcy = boss.y + boss.h / 2;
    // Большая центральная вспышка
    particles.push({
      x: bcx, y: bcy,
      vx: 0, vy: 0,
      life: 1, maxLife: 0.25,
      size: boss.w * 1.2,
      type: 'flash',
    });
    // Кольцевой взрыв из 40 "кубиков" глаза — разлетаются во все стороны
    for (let i = 0; i < 40; i++) {
      const ang = (i / 40) * Math.PI * 2 + Math.random() * 0.2;
      const spd = 120 + Math.random() * 180;
      const dist = Math.random() * 20; // стартуют чуть из центра
      ragdolls.push({
        x: bcx + Math.cos(ang) * dist,
        y: bcy + Math.sin(ang) * dist,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 60,
        size: 2 + Math.floor(Math.random() * 4),
        life: 1,
        maxLife: 0.8 + Math.random() * 0.8,
        rot: Math.random() * 6 - 3,
      });
    }
    // Дополнительная волна частиц-искр
    for (let i = 0; i < 25; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 80 + Math.random() * 200;
      particles.push({
        x: bcx, y: bcy,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd - 80,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 2 + Math.floor(Math.random() * 2),
        type: 'star',
      });
    }
  } else {
    if (typeof playSting === 'function') playSting('hit');
  }
  return true;
}

// Проверка коллизии игрока с боссом — возвращает true если попадание
function bossHitsPlayer() {
  if (!boss || boss.dead) return false;
  const p = player;
  return (p.x < boss.x + boss.w && p.x + p.w > boss.x &&
          p.y < boss.y + boss.h && p.y + p.h > boss.y);
}

// Проверка попадания удара игрока по боссу (из enemies.js checkPunchHit)
function bossPunchHit(hx, hy, hw, hh) {
  if (!boss || boss.dead) return false;
  if (hx < boss.x + boss.w && hx + hw > boss.x &&
      hy < boss.y + boss.h && hy + hh > boss.y) {
    damageBoss(1);
    return true;
  }
  return false;
}
