// NUKED MAN — hostages.js
// Заложники — спасти при касании, убиваются взрывом

// Спрайт заложника (8×16px) — связанный человечек
const HOSTAGE_SPR = [
  [2,0,4],        // голова
  [1,1,6],[1,2,6],[2,3,4],
  [0,4,8],        // плечи (руки связаны)
  [1,5,6],[1,6,6],[1,7,6],
  [3,8,2],        // верёвка
  [2,9,4],[2,10,4],
  [1,11,2],[5,11,2], // ноги
  [1,12,2],[5,12,2],
  [1,13,2],[5,13,2],
  [0,14,3],[5,14,3],
];

let hostages = [];

function initHostages() {
  hostages = [];
  game.rescuedHostages = 0;

  // 5-8 заложников на удлинённую карту
  const count = rnd(5, 8);
  const used = [];
  const candidates = getSurfacePoints(p =>
    p.open >= 2 &&
    p.distFromStart > 0.2 &&
    p.distFromStart < 0.92 &&
    !p.isolated
  );

  for (let i = 0; i < count && candidates.length > 0; i++) {
    // выбираем случайную точку с расстоянием от других заложников
    let pt = null;
    for (let attempt = 0; attempt < 20; attempt++) {
      const c = candidates[Math.floor(Math.random() * candidates.length)];
      if (used.every(u => Math.abs(u - c.tx) > 8)) {
        pt = c; break;
      }
    }
    if (!pt) continue;
    used.push(pt.tx);

    hostages.push({
      x: pt.worldX + 4,
      y: pt.worldY - 16,
      w: 8, h: 16,
      vy: 0,
      rescued: false,
      dead: false,
      deathTimer: 0,
      bobT: Math.random() * Math.PI * 2,
    });
  }
  // фиксируем финальное количество для HUD (чтобы total не прыгал
  // когда умершие сущности удаляются из массива)
  game.hostagesTotal = hostages.length;
}

// Ручной спавн заложника на тайл-позиции — используется ASCII-парсером
function spawnHostage(tx, ty) {
  // Ищем пол под указанной клеткой
  let footY = ty;
  for (let y = ty; y < MH; y++) {
    if (MAP[y] && MAP[y][tx]) { footY = y; break; }
  }
  hostages.push({
    x: tx * T + 4,
    y: footY * T - 16,
    w: 8, h: 16,
    vy: 0,
    rescued: false,
    dead: false,
    deathTimer: 0,
    bobT: Math.random() * Math.PI * 2,
  });
  game.hostagesTotal = (game.hostagesTotal || 0) + 1;
}

function updateHostages(dt) {
  const p = player;
  for (let i = hostages.length - 1; i >= 0; i--) {
    const h = hostages[i];
    if (h.dead) {
      h.deathTimer += dt;
      if (h.deathTimer > 0.6) hostages.splice(i, 1);
      continue;
    }
    if (h.rescued) continue;

    // гравитация
    h.vy += 400 * dt;
    if (h.vy > 400) h.vy = 400;
    h.y += h.vy * dt;
    if (solid(h.x + 1, h.y + h.h) || solid(h.x + h.w - 1, h.y + h.h)) {
      h.y = Math.floor((h.y + h.h) / T) * T - h.h;
      h.vy = 0;
    }
    if (h.y > MH * T + 10) { hostages.splice(i, 1); continue; }

    h.bobT += dt * 1.5;

    // касание игрока — спасаем
    if (!p.dead &&
        p.x < h.x + h.w && p.x + p.w > h.x &&
        p.y < h.y + h.h && p.y + p.h > h.y) {
      h.rescued = true;
      game.rescuedHostages++;
      playSound('rescue');
      game.hudMessage = 'SAVED!';
      say('rescue');
      game.hudMessageTimer = 1.2;
      // частицы радости
      for (let k = 0; k < 8; k++) {
        const ang = (k / 8) * Math.PI * 2;
        particles.push({
          x: h.x - game.cam + 4, y: h.y + 8,
          vx: Math.cos(ang) * 30, vy: Math.sin(ang) * 30 - 20,
          life: 1, maxLife: 0.4, size: 2,
        });
      }
    }
  }
}

function killHostage(hst) {
  if (hst.rescued || hst.dead) return;
  hst.dead = true;
  hst.deathTimer = 0;
  // частицы смерти
  for (let k = 0; k < 6; k++) {
    const ang = Math.random() * Math.PI * 2;
    particles.push({
      x: hst.x - game.cam + 4, y: hst.y + 8,
      vx: Math.cos(ang) * 25, vy: Math.sin(ang) * 25 - 30,
      life: 1, maxLife: 0.35, size: 2,
    });
  }
}

// вызывается из explode() в items.js при взрыве
function checkHostageExplosion(cx, cy, radius) {
  for (const h of hostages) {
    if (h.rescued || h.dead) continue;
    const dx = (h.x + h.w / 2) - cx;
    const dy = (h.y + h.h / 2) - cy;
    if (Math.hypot(dx, dy) < radius) killHostage(h);
  }
}

function drawHostages() {
  for (const h of hostages) {
    if (h.rescued) continue;
    const hx = Math.round(h.x - game.cam);
    const hy = Math.round(h.y + Math.sin(h.bobT) * 1.5);
    if (hx + h.w < 0 || hx > GW) continue;

    if (h.dead) {
      ctx.globalAlpha = Math.max(0, 1 - h.deathTimer * 2.5);
      ctx.fillStyle = '#E4E4E4';
      ctx.fillRect(hx + 2, hy + 2, h.w - 4, h.h - 4);
      ctx.globalAlpha = 1;
      continue;
    }

    ctx.fillStyle = '#E4E4E4';
    for (const [sx, sy, sw] of HOSTAGE_SPR)
      ctx.fillRect(hx + sx, hy + sy, sw, 1);

    // SAVE пузырь над головой
    const blink = Math.floor(Date.now() / 500) % 2 === 0;
    if (blink) {
      // чёрная рамка (снаружи) для читаемости на белом дизеринге
      ctx.fillStyle = '#000';
      ctx.fillRect(hx - 7, hy - 13, 22, 10);
      // белая заливка пузыря
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx - 6, hy - 12, 20, 8);
      // текст SAVE пиксельный маленький
      ctx.fillStyle = '#000';
      // S
      ctx.fillRect(hx-5, hy-11, 3, 1); ctx.fillRect(hx-5, hy-10, 1, 1);
      ctx.fillRect(hx-5, hy-9, 3, 1); ctx.fillRect(hx-3, hy-8, 1, 1);
      ctx.fillRect(hx-5, hy-7, 3, 1);
      // A
      ctx.fillRect(hx-1, hy-11, 3, 1); ctx.fillRect(hx-1, hy-10, 1, 1); ctx.fillRect(hx+1, hy-10, 1, 1);
      ctx.fillRect(hx-1, hy-9, 3, 1); ctx.fillRect(hx-1, hy-8, 1, 1); ctx.fillRect(hx+1, hy-8, 1, 1);
      ctx.fillRect(hx-1, hy-7, 1, 1); ctx.fillRect(hx+1, hy-7, 1, 1);
      // хвостик пузыря (белый с чёрным контуром)
      ctx.fillStyle = '#000';
      ctx.fillRect(hx + 1, hy - 4, 4, 3);
      ctx.fillStyle = '#fff';
      ctx.fillRect(hx + 2, hy - 4, 2, 2);
    }
  }
}
