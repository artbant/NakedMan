// NUKED MAN — items.js
// Пауэрапы + разрушаемые объекты (ящик, бочка, взрывная бочка)

// ── СПРАЙТЫ ПАУЭРАПОВ ────────────────────────────────────────────────
const BOTTLE_SPR = [
  [4,0,2],[3,1,4],[3,2,4],[2,3,6],
  [1,4,8],[1,5,8],[0,6,10],[0,7,10],[0,8,10],[0,9,10],
  [1,10,8],[2,11,6],
];
const CIG_SPR = [
  [0,1,8],[8,0,1],[8,2,1],
  [0,2,8],[8,1,2],
  [0,3,6],[1,4,4],
];
// Аптечка: квадратная коробка 10×10 с крестом внутри.
// Рисуется отдельной функцией (белый корпус + чёрный крест), не через SPR.

// ── ОТРИСОВКА ОБЪЕКТОВ ────────────────────────────────────────────────
function drawCrate(ox, oy) {
  // рамка
  ctx.fillRect(ox, oy, 12, 1);
  ctx.fillRect(ox, oy+11, 12, 1);
  ctx.fillRect(ox, oy, 1, 12);
  ctx.fillRect(ox+11, oy, 1, 12);
  // доски — три горизонтальные линии
  ctx.fillRect(ox+1, oy+4, 10, 1);
  ctx.fillRect(ox+1, oy+7, 10, 1);
  // вертикальные стыки досок
  ctx.fillRect(ox+4, oy+1, 1, 3);
  ctx.fillRect(ox+7, oy+1, 1, 3);
  ctx.fillRect(ox+4, oy+8, 1, 3);
  ctx.fillRect(ox+7, oy+8, 1, 3);
}

function drawBarrel(ox, oy) {
  for (let row = 0; row < 16; row++) {
    const ind = row < 2 || row > 13 ? 2 : row < 4 || row > 11 ? 1 : 0;
    ctx.fillRect(ox + ind, oy + row, 12 - ind * 2, 1);
  }
  ctx.fillStyle = '#000';
  ctx.fillRect(ox+1, oy+4, 10, 1);
  ctx.fillRect(ox+1, oy+11, 10, 1);
}

function drawExpBarrel(ox, oy) {
  drawBarrel(ox, oy);
  const blink = Math.floor(Date.now() / 300) % 2 === 0;
  ctx.fillStyle = blink ? '#fff' : '#000';
  ctx.fillRect(ox+3,oy+6,1,1); ctx.fillRect(ox+8,oy+6,1,1);
  ctx.fillRect(ox+4,oy+7,1,1); ctx.fillRect(ox+7,oy+7,1,1);
  ctx.fillRect(ox+5,oy+8,2,1);
  ctx.fillRect(ox+4,oy+9,1,1); ctx.fillRect(ox+7,oy+9,1,1);
  ctx.fillRect(ox+3,oy+10,1,1); ctx.fillRect(ox+8,oy+10,1,1);
}

// ── ОБЪЕКТЫ ───────────────────────────────────────────────────────────
let objects = [];

function spawnObject(wx, wy, type) {
  const sizes = { barrel:[12,16,2], expbarrel:[12,16,1] };
  const [w, h, hp] = sizes[type];
  objects.push({ x:wx, y:wy-h, w, h, hp, maxHP:hp, type, vy:0, dead:false, deathTimer:0, flashTimer:0 });
}



function explode(cx, cy) {
  const R = T * 2.5;
  screenShake(6, 0.3);
  particles.push({ x:cx-game.cam, y:cy, life:1, maxLife:0.15, size:20, type:'flash', vx:0, vy:0 });
  for (let i = 0; i < 20; i++) {
    const ang = Math.random() * Math.PI * 2, spd = 50 + Math.random() * 90;
    particles.push({ x:cx-game.cam, y:cy, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-50, life:1, maxLife:0.5+Math.random()*0.3, size:3 });
  }

  // ── D: взрыв ломает тайлы в радиусе ─────────────────────────────
  const tileR = Math.ceil(R / T) + 1;
  const tcx = Math.floor(cx / T);
  const tcy = Math.floor(cy / T);
  for (let dy = -tileR; dy <= tileR; dy++) {
    for (let dx = -tileR; dx <= tileR; dx++) {
      const tx = tcx + dx, ty = tcy + dy;
      if (tx < 0 || tx >= MW || ty < 0 || ty >= MH) continue;
      if (!MAP[ty][tx]) continue;
      const tileCx = (tx + 0.5) * T;
      const tileCy = (ty + 0.5) * T;
      const dist = Math.hypot(tileCx - cx, tileCy - cy);
      if (dist < R) {
        // взрыв разрушает хрупкие сразу, средним наносит урон
        const bt = BREAKABLE_MAP[ty][tx];
        if (bt === 1) {
          breakTile(tileCx, tileCy);
        } else if (bt === 2) {
          // средний — половина шанс сломать
          if (Math.random() < 0.5) breakTile(tileCx, tileCy);
        }
      }
    }
  }

  for (const e of enemies) {
    if (e.dead) continue;
    const dx = (e.x+e.w/2)-cx, dy = (e.y+e.h/2)-cy;
    if (Math.hypot(dx,dy) < R) {
      e.hp=0; e.dead=true; e.deathTimer=0; game.score++; game.enemiesKilled = (game.enemiesKilled || 0) + 1;
      spawnRagdoll(e);
      e.vx=dx>0?160:-160; e.vy=-130;
    }
  }
  for (const o of objects) {
    if (o.dead || o.type !== 'expbarrel') continue;
    const dx = (o.x+o.w/2)-cx, dy = (o.y+o.h/2)-cy;
    if (Math.hypot(dx,dy) < R) {
      o.dead = true; o.deathTimer = 0;
      const ox2=o.x+o.w/2, oy2=o.y+o.h/2;
      setTimeout(() => explode(ox2,oy2), 150);
    }
  }
  const p = player;
  const pdx=(p.x+p.w/2)-cx, pdy=(p.y+p.h/2)-cy;
  if (Math.hypot(pdx,pdy) < R) hurtPlayer(pdx>0?120:-120, -160);
  checkHostageExplosion(cx, cy, R);
  if (typeof panicEnemiesNear === 'function') panicEnemiesNear(cx, cy, R);
  playSound('explode');
}

function hitObject(obj) {
  if (obj.dead) return;
  obj.hp--; obj.flashTimer = 0.18;
  for (let i = 0; i < 6; i++) {
    const ang = Math.random() * Math.PI * 2;
    particles.push({ x:obj.x-game.cam+obj.w/2, y:obj.y+obj.h/2, vx:Math.cos(ang)*35, vy:Math.sin(ang)*35-25, life:1, maxLife:0.3, size:2 });
  }
  if (obj.hp <= 0) {
    obj.dead = true; obj.deathTimer = 0;
    const cx=obj.x+obj.w/2, cy=obj.y+obj.h/2;
    if (obj.type === 'expbarrel') {
      explode(cx, cy);
    } else {
      for (let i = 0; i < (obj.type==='crate'?14:18); i++) {
        const ang=Math.random()*Math.PI*2, spd=30+Math.random()*60;
        particles.push({ x:cx-game.cam, y:cy, vx:Math.cos(ang)*spd, vy:Math.sin(ang)*spd-35, life:1, maxLife:0.45+Math.random()*0.3, size:obj.type==='crate'?2:3 });
      }
    }
  }
}

function checkPunchObjects() {
  const p = player;
  if (!p.punching || p.pframe < 1) return;
  const hx = p.facing > 0 ? p.x + p.w : p.x - 14;
  const hy = p.y + 8;
  for (const o of objects) {
    if (o.dead) continue;
    if (hx < o.x+o.w && hx+14 > o.x && hy < o.y+o.h && hy+12 > o.y) hitObject(o);
  }
}

function updateObjects(dt) {
  for (let i = objects.length - 1; i >= 0; i--) {
    const o = objects[i];
    if (o.dead) { o.deathTimer += dt; if (o.deathTimer > 0.5) objects.splice(i,1); continue; }
    if (o.flashTimer > 0) o.flashTimer -= dt;
    o.vy += 480 * dt; if (o.vy > 500) o.vy = 500;
    o.y += o.vy * dt;
    if (solid(o.x+1, o.y+o.h) || solid(o.x+o.w-1, o.y+o.h)) {
      o.y = Math.floor((o.y+o.h)/T)*T - o.h; o.vy = 0;
    }
    // снаряды разрушают объекты
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const pr = projectiles[j];
      if (pr.x < o.x+o.w && pr.x+pr.w > o.x && pr.y < o.y+o.h && pr.y+pr.h > o.y) {
        hitObject(o); projectiles.splice(j,1); break;
      }
    }
  }
}

function drawObjects() {
  for (const o of objects) {
    const ox=Math.round(o.x-game.cam), oy=Math.round(o.y);
    if (ox+o.w < 0 || ox > GW) continue;
    if (o.dead) {
      ctx.globalAlpha = Math.max(0, 1-o.deathTimer*3);
      ctx.fillStyle = '#fff'; ctx.fillRect(ox+2,oy+2,o.w-4,o.h-4);
      ctx.globalAlpha = 1; continue;
    }
    // flash при ударе — инверсия (обычно белый силуэт, при ударе мигает чёрным)
    const flashing = o.flashTimer > 0 && Math.floor(o.flashTimer*20)%2===0;
    ctx.fillStyle = flashing ? '#000' : '#fff';
    if (o.type==='crate') drawCrate(ox,oy);
    else if (o.type==='barrel') drawBarrel(ox,oy);
    else drawExpBarrel(ox,oy);
    if (o.type==='barrel' && o.hp < o.maxHP) {
      ctx.fillStyle='#000'; ctx.fillRect(ox,oy-3,o.w,2);
      ctx.fillStyle='#fff'; ctx.fillRect(ox,oy-3,Math.round(o.w*o.hp/o.maxHP),2);
    }
  }
}

// ── ПАУЭРАПЫ ─────────────────────────────────────────────────────────
let items = [];

function spawnItem(tileX, type) {
  const y = findSpawnY(tileX, 12) - 4;
  items.push({ x:tileX*T+6, y, w:8, h:12, type, collected:false, bobT:Math.random()*Math.PI*2 });
}

function initObjects() {
  objects = [];

  // бочки — на широких участках, реже
  const barrelPoints = getSurfacePoints(p =>
    p.open >= 2 &&
    !p.isolated &&
    p.distFromStart > 0.15
  );
  for (const pt of barrelPoints) {
    if (Math.random() < 0.08) {
      spawnObject(pt.worldX + 2, pt.worldY, 'barrel');
    }
  }

  // взрывные бочки — рядом с врагами и у стен, редко
  const exploPoints = getSurfacePoints(p =>
    p.open >= 2 &&
    p.distFromStart > 0.2 &&
    p.distFromStart < 0.9
  );
  for (const pt of exploPoints) {
    // проверяем есть ли враг рядом
    const nearEnemy = enemies.some(e =>
      Math.abs(e.x - pt.worldX) < T * 4
    );
    if (nearEnemy && Math.random() < 0.2) {
      spawnObject(pt.worldX + 2, pt.worldY, 'expbarrel');
    }
  }
}

function initItems() {
  items = [];

  // АПТЕЧКА — редкий ценный предмет. Максимум одна-две на уровень.
  // Появляется только на дальней половине карты (не в начале) и не каждый раз.
  const medkitPoints = getSurfacePoints(p =>
    p.distFromStart > 0.35 &&
    p.distFromStart < 0.9
  );
  let lastMedkitX = 0;
  let medkitCount = 0;
  const maxMedkits = 2; // максимум 2 аптечки на всю карту
  // шанс появления снижен втрое, и минимальное расстояние больше
  for (const pt of medkitPoints) {
    if (medkitCount >= maxMedkits) break;
    if (pt.tx - lastMedkitX < 20) continue;
    // шанс только 8-20% в зависимости от опасности места
    const chance = pt.nearPit ? 0.2 : 0.08;
    if (Math.random() < chance) {
      spawnItem(pt.tx, 'medkit');
      lastMedkitX = pt.tx;
      medkitCount++;
    }
  }

  // сигарета — перед сложными участками (много врагов впереди)
  const cigPoints = getSurfacePoints(p =>
    p.distFromStart > 0.15 &&
    p.distFromStart < 0.85 &&
    !p.isolated
  );
  let lastCigX = 0;
  for (const pt of cigPoints) {
    if (pt.tx - lastCigX < 12) continue;
    const nearEnemies = enemies.filter(e =>
      e.x > pt.worldX && e.x < pt.worldX + T * 8
    ).length;
    if (nearEnemies >= 2 && Math.random() < 0.6) {
      spawnItem(pt.tx, 'cigarette');
      lastCigX = pt.tx;
    }
  }

  // объекты ставим после врагов (initObjects использует enemies)
  initObjects();
}

function applyPowerup(type) {
  const p = player;
  if (type === 'medkit' || type === 'bottle') {
    // Максимум 3 жизни. Аптечка восстанавливает одну.
    if (p.lives < 3) { p.lives++; game.hudMessage = '+1 HP'; }
    else game.hudMessage = 'FULL HP';
  } else { p.speedBoost = 5.0; game.hudMessage = 'SPEED!'; }
  game.hudMessageTimer = 1.2;
}

function updateItems(dt) {
  const p = player;
  for (const item of items) {
    if (item.collected) continue;
    item.bobT += dt * 2;
    if (p.x < item.x+item.w && p.x+p.w > item.x && p.y < item.y+item.h && p.y+p.h > item.y) {
      item.collected = true; applyPowerup(item.type); playSound('pickup');
      for (let i = 0; i < 8; i++) {
        const ang = Math.random()*Math.PI*2;
        particles.push({ x:item.x-game.cam+4, y:item.y+6, vx:Math.cos(ang)*30, vy:Math.sin(ang)*30-20, life:1, maxLife:0.3, size:1 });
      }
    }
  }
  if (game.hudMessageTimer > 0) game.hudMessageTimer -= dt;
  updateObjects(dt);
}

function drawItems() {
  for (const item of items) {
    if (item.collected) continue;
    const ix=Math.round(item.x-game.cam), iy=Math.round(item.y+Math.sin(item.bobT)*2);
    if (ix+item.w < 0 || ix > GW) continue;
    if (item.type === 'medkit') {
      // Белая коробка с чёрным крестом (аптечка)
      ctx.fillStyle = '#fff';
      ctx.fillRect(ix, iy, 10, 10);
      ctx.fillStyle = '#000';
      // чёрная обводка 1px — подчёркивает форму
      ctx.fillRect(ix, iy, 10, 1);
      ctx.fillRect(ix, iy+9, 10, 1);
      ctx.fillRect(ix, iy, 1, 10);
      ctx.fillRect(ix+9, iy, 1, 10);
      // крест в центре
      ctx.fillRect(ix+4, iy+2, 2, 6); // вертикальная планка
      ctx.fillRect(ix+2, iy+4, 6, 2); // горизонтальная планка
      continue;
    }
    ctx.fillStyle = '#fff';
    const spr = item.type==='bottle' ? BOTTLE_SPR : CIG_SPR;
    for (const [sx,sy,sw] of spr) ctx.fillRect(ix+sx, iy+sy, sw, 1);
    if (item.type==='cigarette') {
      const t = item.bobT; ctx.fillStyle = '#fff';
      for (let d = 0; d < 3; d++) {
        const dx2 = Math.round(Math.sin(t*1.5+d*0.8)*2);
        ctx.fillRect(ix+9+dx2, iy-2-d*2, 1, 1);
      }
    }
  }
  drawObjects();
}
