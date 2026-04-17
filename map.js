// NUKED MAN — map.js
// Процедурная генерация карты, отрисовка тайлов и фонов

let MAP = [];
let MW = 0;
let WORLD_W = 0;

// BREAKABLE_MAP: 0=неразрушаемый, 1=хрупкий(1 удар), 2=средний(2 удара)
// Заполняется при generateMap
let BREAKABLE_MAP = [];

function generateMap(lvl = 1) {
  // чем выше уровень — длиннее карта, больше пропастей
  const baseW = 65 + Math.min(lvl * 4, 35);
  const totalWidth = rnd(baseW, baseW + 15);
  MW = totalWidth;
  WORLD_W = MW * T;

  MAP = [];
  BREAKABLE_MAP = [];
  for (let y = 0; y < MH; y++) {
    MAP.push(new Array(MW).fill(0));
    BREAKABLE_MAP.push(new Array(MW).fill(0));
  }

  // ── ШАГ 1: ПРОФИЛЬ ВЫСОТЫ — реальные перепады ────────────────────────
  const surface = new Array(MW);
  let h = 6;

  for (let x = 0; x < MW; x++) {
    const r = Math.random();
    if (r < 0.12)       h = Math.max(3, h - 2);  // резкий подъём
    else if (r < 0.22)  h = Math.min(7, h + 2);  // резкий спуск
    else if (r < 0.42)  h = Math.max(3, Math.min(7, h + (Math.random() < 0.5 ? -1 : 1)));
    // иначе та же высота — плоский участок
    surface[x] = h;
  }
  // не более 2 тайлов перепада за шаг
  for (let x = 1; x < MW; x++) {
    const diff = surface[x] - surface[x - 1];
    if (Math.abs(diff) > 2) surface[x] = surface[x - 1] + Math.sign(diff) * 2;
  }
  // фиксируем старт и финал
  for (let x = 0; x < 5; x++) surface[x] = 6;
  for (let x = MW - 6; x < MW; x++) surface[x] = surface[MW - 7] || 6;

  // ── ШАГ 2: ЗАПОЛНЯЕМ ТАЙЛЫ ───────────────────────────────────────────
  for (let x = 0; x < MW; x++) {
    const sf = surface[x];
    for (let y = sf; y < MH; y++) {
      MAP[y][x] = rndTex();
      const depth = y - sf;
      let br;
      if (depth === 0)      br = Math.random() < 0.6 ? 1 : 2;
      else if (depth === 1) br = Math.random() < 0.3 ? 1 : Math.random() < 0.85 ? 2 : 0;
      else                  br = Math.random() < 0.1 ? 2 : 0;
      BREAKABLE_MAP[y][x] = br;
    }
  }

  // ── ШАГ 3: ВПАДИНЫ И РЕДКИЕ ПРОПАСТИ ─────────────────────────────────
  // Впадина = углубление в несколько тайлов (не насквозь)
  // Пропасть = только 1-2 тайла шириной и только иногда
  const numFeatures = rnd(2 + Math.min(lvl, 3), 4 + Math.min(lvl, 5));
  const usedX = [];
  for (let p = 0; p < numFeatures; p++) {
    const fx = rnd(8, MW - 10);
    if (usedX.some(x => Math.abs(x - fx) < 6)) continue;
    usedX.push(fx);

    const r = Math.random();
    if (r < 0.3) {
      // настоящая пропасть — узкая, 1-2 тайла
      const gapW = 1 + (Math.random() < 0.3 ? 1 : 0);
      for (let dx = 0; dx < gapW && fx + dx < MW - 4; dx++)
        for (let dy = 0; dy < MH; dy++) {
          MAP[dy][fx + dx] = 0;
          BREAKABLE_MAP[dy][fx + dx] = 0;
        }
    } else {
      // впадина — убираем верхние 1-3 тайла на 2-4 колонки
      const fW = rnd(2, 4);
      const fDepth = rnd(1, 3);
      const sf = surface[fx];
      for (let dx = 0; dx < fW && fx + dx < MW - 4; dx++) {
        for (let dy = 0; dy < fDepth; dy++) {
          const ty = sf + dy;
          if (ty < MH && MAP[ty][fx + dx]) {
            MAP[ty][fx + dx] = 0;
            BREAKABLE_MAP[ty][fx + dx] = 0;
          }
        }
      }
    }
  }

  // ── ШАГ 4: ПЕЩЕРЫ ВНУТРИ МОНОЛИТА ───────────────────────────────────
  const numCaves = rnd(2, 3);
  for (let c = 0; c < numCaves; c++) {
    const caveX = rnd(8, MW - 12);
    const caveSurf = surface[caveX];
    const caveY = rnd(caveSurf + 1, Math.min(caveSurf + 3, MH - 2));
    const caveLen = rnd(3, 7);
    const caveH = rnd(1, 2);
    for (let dx = 0; dx < caveLen && caveX + dx < MW - 4; dx++)
      for (let dy = 0; dy <= caveH; dy++) {
        const ty = caveY + dy;
        if (ty < MH) { MAP[ty][caveX + dx] = 0; BREAKABLE_MAP[ty][caveX + dx] = 0; }
      }
  }

  // ── ШАГ 5: ВЫСТУПЫ НАД ПОВЕРХНОСТЬЮ ─────────────────────────────────
  for (let x = 6; x < MW - 6; x += rnd(5, 9)) {
    const sf = surface[x];
    const type = rnd(0, 3);
    if (type === 0 && sf > 3) {
      const colH = rnd(1, 3);
      for (let dy = 1; dy <= colH; dy++) {
        const ty = sf - dy;
        if (ty >= 1) {
          MAP[ty][x] = rndTex(); BREAKABLE_MAP[ty][x] = rnd(1, 2);
          if (Math.random() < 0.4 && x + 1 < MW - 4) {
            MAP[ty][x+1] = rndTex(); BREAKABLE_MAP[ty][x+1] = rnd(1, 2);
          }
        }
      }
    } else if (type === 1 && sf > 4) {
      const shelfLen = rnd(2, 4);
      const shelfY = sf - rnd(1, 2);
      if (shelfY >= 2)
        for (let dx = 0; dx < shelfLen && x + dx < MW - 4; dx++) {
          MAP[shelfY][x+dx] = rndTex(); BREAKABLE_MAP[shelfY][x+dx] = 1;
        }
    } else if (type === 2) {
      const gateY = sf - 1;
      if (gateY >= 2) {
        MAP[gateY][x] = rndTex(); BREAKABLE_MAP[gateY][x] = rnd(1, 2);
        if (x + 3 < MW - 4) { MAP[gateY][x+3] = rndTex(); BREAKABLE_MAP[gateY][x+3] = rnd(1, 2); }
      }
    }
  }

  // ── ШАГ 6: СТАРТОВАЯ И ФИНАЛЬНАЯ ЗОНЫ ПРОЧНЫЕ ───────────────────────
  for (let x = 0; x < 5; x++)
    for (let y = surface[x]; y < MH; y++) BREAKABLE_MAP[y][x] = 0;
  for (let x = MW - 6; x < MW; x++)
    for (let y = (surface[x] || 4); y < MH; y++) BREAKABLE_MAP[y][x] = 0;
}

// ── ПОРТАЛ ────────────────────────────────────────────────────────────
let portalX = 0, portalY = 0;

function initPortal() {
  // портал в конце уровня — последние 4 тайла, на поверхности
  const px = MW - 4;
  portalY = findSpawnY(px, T * 2);
  portalX = px * T;
}

function drawPortal(cam) {
  const sx = Math.round(portalX - cam);
  const sy = Math.round(portalY);
  if (sx + T < 0 || sx > GW) return;
  const blink = Math.floor(Date.now() / 150) % 2;

  // арка пикселями
  ctx.fillStyle = blink ? '#fff' : '#E4E4E4';
  // верхняя перекладина
  ctx.fillRect(sx + 4, sy, T - 8, 3);
  // левая стойка
  ctx.fillRect(sx, sy + 3, 4, T * 2 - 3);
  // правая стойка
  ctx.fillRect(sx + T - 4, sy + 3, 4, T * 2 - 3);

  // внутри — мигающие пиксели
  ctx.fillStyle = blink ? '#444' : '#222';
  for (let dy = 4; dy < T * 2 - 4; dy += 4)
    for (let dx = 6; dx < T - 6; dx += 4)
      ctx.fillRect(sx + dx, sy + dy, 2, 2);

  // надпись EXIT над аркой
  ctx.fillStyle = blink ? '#fff' : '#888';
  ctx.fillRect(sx + 5, sy - 7, 1, 5); // E
  ctx.fillRect(sx + 5, sy - 7, 4, 1);
  ctx.fillRect(sx + 5, sy - 5, 3, 1);
  ctx.fillRect(sx + 5, sy - 3, 4, 1);
}

function checkPortal() {
  const p = player;
  if (p.dead) return false;
  return p.x + p.w > portalX + 4 &&
         p.x < portalX + T - 4 &&
         p.y + p.h > portalY &&
         p.y < portalY + T * 2;
}

// Хранит HP разрушаемых тайлов {key: hp}
const tileHP = {};

function tileKey(tx, ty) { return tx + ',' + ty; }

function breakTile(wx, wy) {
  const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
  if (tx < 0 || tx >= MW || ty < 0 || ty >= MH) return false;
  if (!MAP[ty][tx]) return false;
  const bt = BREAKABLE_MAP[ty][tx];
  if (bt === 0) return false; // неразрушаемый

  const key = tileKey(tx, ty);
  const maxHP = bt === 1 ? 1 : 2;
  if (tileHP[key] === undefined) tileHP[key] = maxHP;
  tileHP[key]--;

  // мигание тайла при ударе
  flashTile(tx, ty);

  // частицы при ударе
  const cx = (tx + 0.5) * T - cam;
  const cy = (ty + 0.5) * T;
  const count = bt === 1 ? 10 : 6;
  for (let i = 0; i < count; i++) {
    const ang = Math.random() * Math.PI * 2;
    const spd = 20 + Math.random() * 40;
    particles.push({ x: cx, y: cy, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 20, life:1, maxLife:0.35+Math.random()*0.2, size: bt===1?2:3 });
  }

  if (tileHP[key] <= 0) {
    // разрушаем тайл
    delete tileHP[key];
    MAP[ty][tx] = 0;
    BREAKABLE_MAP[ty][tx] = 0;
    // большой взрыв пикселей
    for (let i = 0; i < 16; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 30 + Math.random() * 60;
      particles.push({ x: cx, y: cy, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd-30, life:1, maxLife:0.5+Math.random()*0.3, size:3 });
    }
    return true;
  }
  return false;
}

function solid(wx, wy) {
  const tx = Math.floor(wx / T), ty = Math.floor(wy / T);
  if (tx < 0 || tx >= MW || ty < 0 || ty >= MH) return false;
  return MAP[ty][tx] !== 0;
}

function findSpawnY(tileX, h, startTileY = 0) {
  for (let ty = startTileY; ty < MH; ty++) {
    if (MAP[ty][tileX] !== 0) return ty * T - h;
  }
  return MH * T - h;
}

// мигание тайлов при ударе: key -> таймер
const tileFlash = {};

// ── ГРАФ ПОВЕРХНОСТЕЙ ─────────────────────────────────────────────────
// Строится один раз после generateMap().
// surfacePoints — массив всех точек где можно стоять.
let surfacePoints = [];

function buildSurfaceGraph() {
  surfacePoints = [];

  for (let tx = 1; tx < MW - 1; tx++) {
    // ищем поверхность — первый твёрдый тайл сверху
    for (let ty = 1; ty < MH; ty++) {
      if (MAP[ty][tx] !== 0 && MAP[ty - 1][tx] === 0) {
        // считаем высоту свободного пространства над точкой
        let open = 0;
        for (let sy = ty - 1; sy >= 0; sy--) {
          if (MAP[sy][tx] !== 0) break;
          open++;
        }

        // есть ли пропасть слева или справа (в пределах 2 тайлов)
        const nearPitLeft  = !MAP[ty][tx - 1] && !MAP[ty][tx - 2];
        const nearPitRight = !MAP[ty][tx + 1] && !MAP[ty][tx + 2];
        const nearPit = nearPitLeft || nearPitRight;

        // есть ли стена рядом (тайл на том же уровне)
        const wallLeft  = tx > 0 && MAP[ty - 1][tx - 1] !== 0;
        const wallRight = tx < MW - 1 && MAP[ty - 1][tx + 1] !== 0;
        const nearWall = wallLeft || wallRight;

        // изолированная ли платформа (нет соседей на том же уровне слева/справа)
        const isolated = MAP[ty][tx - 1] === 0 && MAP[ty][tx + 1] === 0;

        // дистанция от старта 0.0..1.0
        const distFromStart = tx / MW;

        surfacePoints.push({
          tx, ty,
          worldX: tx * T,
          worldY: ty * T,
          open,
          nearPit,
          nearWall,
          isolated,
          distFromStart,
        });
        break;
      }
    }
  }
}

// возвращает случайную точку по фильтру
function getSurfacePoints(filter) {
  return surfacePoints.filter(filter);
}

function flashTile(tx, ty) {
  tileFlash[tileKey(tx, ty)] = 0.18;
}

function updateTileFlash(dt) {
  for (const key of Object.keys(tileFlash)) {
    tileFlash[key] -= dt;
    if (tileFlash[key] <= 0) delete tileFlash[key];
  }
}

function drawTile(tx, ty, type, cam) {
  const x = tx * T - cam, y = ty * T;
  if (x + T < 0 || x > GW) return;

  const bt = (BREAKABLE_MAP[ty] && BREAKABLE_MAP[ty][tx]) || 0;
  const key = tileKey(tx, ty);
  const flashing = tileFlash[key] !== undefined && Math.floor(tileFlash[key] * 20) % 2 === 0;

  // ЧБ палитра по прочности:
  // хрупкий  — светлый  #e0e0e0 (читается как лёгкий материал)
  // средний  — средний  #b4b4b4
  // прочный  — тёмный   #787878 (читается как камень)
  const bgCol  = flashing ? '#fff' : bt === 1 ? '#e0e0e0' : bt === 2 ? '#b4b4b4' : '#787878';
  const patCol = flashing ? '#ccc' : bt === 1 ? '#b8b8b8' : bt === 2 ? '#888'    : '#555';
  const rimTop = flashing ? '#fff' : bt === 1 ? '#f0f0f0' : bt === 2 ? '#ccc'    : '#999';
  const rimBot = flashing ? '#ccc' : bt === 1 ? '#aaa'    : bt === 2 ? '#666'    : '#444';

  ctx.fillStyle = bgCol;
  ctx.fillRect(x, y, T, T);
  ctx.fillStyle = patCol;
  if (type === 1) {
    for (let dy = 0; dy < T; dy += 4)
      for (let dx = (dy / 4 % 2) * 4; dx < T; dx += 8)
        ctx.fillRect(x + dx, y + dy, 4, 4);
  } else if (type === 2) {
    for (let dx = 2; dx < T; dx += 4) ctx.fillRect(x + dx, y, 2, T);
  } else if (type === 3) {
    for (let row = 0; row < T; row += 6) {
      const off = (Math.floor(row / 6) % 2) * 6;
      ctx.fillRect(x, y + row, T, 1);
      for (let bx = off; bx < T; bx += 12) ctx.fillRect(x + bx, y + row, 1, 6);
    }
  } else if (type === 4) {
    for (let d = 0; d < T * 2; d += 5)
      for (let s = 0; s < T; s++) {
        const px = d + s;
        if (px >= 0 && px < T) ctx.fillRect(x + px, y + s, 2, 1);
      }
  } else if (type === 5) {
    for (let dy = 3; dy < T; dy += 4)
      for (let dx = 3; dx < T; dx += 4)
        ctx.fillRect(x + dx, y + dy, 2, 2);
  } else if (type === 6) {
    for (let s = 0; s < 5; s++) {
      const m = s * 2, sz = T - s * 4;
      if (sz <= 2) break;
      ctx.fillRect(x + m, y + m, sz, 2);
      ctx.fillRect(x + m, y + T - m - 2, sz, 2);
      ctx.fillRect(x + m, y + m, 2, sz);
      ctx.fillRect(x + T - m - 2, y + m, 2, sz);
    }
  } else if (type === 7) {
    for (let row = 0; row < T; row += 3)
      for (let col = 0; col < T; col++) {
        const z = col % 8;
        if (z < 4 ? z === row % 4 : 7 - z === row % 4) ctx.fillRect(x + col, y + row, 1, 2);
      }
  } else if (type === 8) {
    for (let dy = 0; dy < T; dy += 4) ctx.fillRect(x, y + dy, T, 1);
    for (let dx = 0; dx < T; dx += 4) ctx.fillRect(x + dx, y, 1, T);
  }

  // рамка
  ctx.fillStyle = rimTop;
  ctx.fillRect(x, y, T, 1);
  ctx.fillStyle = rimBot;
  ctx.fillRect(x, y + T - 1, T, 1);
  ctx.fillRect(x, y, 1, T);
  ctx.fillRect(x + T - 1, y, 1, T);

  // трещины если повреждён
  if (tileHP[key] !== undefined) {
    ctx.fillStyle = bt === 1 ? '#888' : '#333';
    ctx.fillRect(x+4, y+5, 1, 4);
    ctx.fillRect(x+5, y+7, 3, 1);
    ctx.fillRect(x+T-5, y+9, 1, 5);
    ctx.fillRect(x+T-7, y+11, 3, 1);
  }
}

// ── ПОДЗЕМНЫЙ СЛОЙ — рисуется ДО тайлов ─────────────────────────────
// Там где тайл сломан но рядом есть монолит — виден тёмный "подвал"
function drawUnderground(cam) {
  const s = Math.floor(cam / T);
  const e = Math.min(MW, s + Math.ceil(GW / T) + 2);
  for (let ty = 0; ty < MH; ty++) {
    for (let tx = s; tx < e; tx++) {
      if (MAP[ty][tx] !== 0) continue;
      // только внутри монолита — есть хоть один тайл рядом
      const hasNeighbor =
        (ty > 0      && MAP[ty-1][tx]) ||
        (ty < MH-1   && MAP[ty+1][tx]) ||
        (tx > 0      && MAP[ty][tx-1]) ||
        (tx < MW-1   && MAP[ty][tx+1]);
      if (!hasNeighbor) continue;

      const x = Math.round(tx * T - cam);
      const y = ty * T;

      // тёмный подвал
      ctx.fillStyle = '#0d0d0d';
      ctx.fillRect(x, y, T, T);
      // паттерн — редкие точки имитируют камень в темноте
      ctx.fillStyle = '#181818';
      for (let dy = 3; dy < T - 2; dy += 7)
        for (let dx = 3; dx < T - 2; dx += 7)
          ctx.fillRect(x + dx, y + dy, 2, 2);
      // тонкая тёмная рамка на верхней и левой грани
      ctx.fillStyle = '#1f1f1f';
      ctx.fillRect(x, y, T, 1);
      ctx.fillRect(x, y, 1, T);
    }
  }
}

function drawTilemap(cam, dt) {
  if (dt) updateTileFlash(dt);
  drawUnderground(cam);
  const s = Math.floor(cam / T);
  const e = Math.min(MW, s + Math.ceil(GW / T) + 2);
  for (let ty = 0; ty < MH; ty++)
    for (let tx = s; tx < e; tx++)
      if (MAP[ty][tx]) drawTile(tx, ty, MAP[ty][tx], cam);
}

function drawMoon(cx, cy) {
  const rows = [[4,6],[2,10],[1,12],[0,14],[0,14],[0,14],[0,14],[0,14],[1,12],[2,10],[4,6]];
  ctx.fillStyle = '#d0d0d0';
  for (let i = 0; i < rows.length; i++) {
    const [ox, w] = rows[i];
    ctx.fillRect(cx - Math.floor(w / 2), cy + i, w, 1);
  }
  ctx.fillStyle = '#aaa';
  ctx.fillRect(cx - 3, cy + 3, 4, 2);
  ctx.fillRect(cx + 2, cy + 7, 3, 2);
}

function drawBgFar(cam) {
  // фон другого мира — чистый чёрный с геометрическими аномалиями
  ctx.fillStyle = '#050505';
  ctx.fillRect(0, 0, GW, GH);

  const t = Date.now() / 1000;
  const off = cam * 0.05;

  // далёкие "звёзды" — не обычные, а квадратные и мигающие
  ctx.fillStyle = '#1a1a1a';
  const stars = [
    [40,20],[110,8],[190,30],[280,14],[370,22],[450,5],
    [60,55],[160,42],[250,60],[340,48],[430,35],
    [90,85],[200,75],[310,90],[420,70],[470,80],
    [30,110],[150,100],[270,115],[390,105],[460,118],
  ];
  for (const [sx, sy] of stars) {
    const rx = ((sx - off * 0.3) % (GW + 20) + GW + 20) % (GW + 20) - 10;
    const blink = Math.sin(t * 0.7 + sx * 0.1) > 0.6;
    if (blink) ctx.fillRect(Math.round(rx), sy, 2, 2);
    else ctx.fillRect(Math.round(rx), sy, 1, 1);
  }

  // геометрические структуры на горизонте — пирамиды/обелиски
  ctx.fillStyle = '#0e0e0e';
  const shapes = [
    { x: 80,  h: 60, w: 30 },
    { x: 180, h: 90, w: 20 },
    { x: 290, h: 50, w: 40 },
    { x: 380, h: 75, w: 25 },
    { x: 460, h: 40, w: 35 },
    { x: 550, h: 65, w: 18 },
  ];
  for (const s of shapes) {
    const rx = Math.round(((s.x - off * 0.15) % (WORLD_W * 0.05 + GW) + WORLD_W * 0.05 + GW) % (WORLD_W * 0.05 + GW) - 20);
    // обелиск — тонкий и высокий
    ctx.fillRect(rx - s.w/4, GH - s.h, s.w/2, s.h);
    // основание шире
    ctx.fillRect(rx - s.w/2, GH - 8, s.w, 8);
  }

  // медленно пульсирующие линии горизонта
  ctx.fillStyle = '#111';
  for (let x = 0; x < GW; x += 3) {
    const pulse = Math.sin(t * 0.3 + x * 0.02) * 3;
    ctx.fillRect(x, Math.round(GH * 0.72 + pulse), 2, 1);
  }
}

function drawBgMid(cam) {
  const t = Date.now() / 1000;
  const off = cam * 0.25;

  // средний слой — странные строения другого мира
  // не здания, а абстрактные структуры
  ctx.fillStyle = '#181818';
  const structs = [
    { x: 50,  h: 80,  w: 18, type: 0 },
    { x: 130, h: 110, w: 12, type: 1 },
    { x: 220, h: 70,  w: 22, type: 0 },
    { x: 310, h: 130, w: 10, type: 2 },
    { x: 400, h: 90,  w: 16, type: 1 },
    { x: 500, h: 60,  w: 24, type: 0 },
    { x: 600, h: 100, w: 14, type: 2 },
  ];

  for (const s of structs) {
    const rx = Math.round(((s.x - off) % (GW * 2) + GW * 2) % (GW * 2) - 30);
    if (rx > GW + 30 || rx < -30) continue;

    if (s.type === 0) {
      // прямоугольная башня с окошками
      ctx.fillStyle = '#181818';
      ctx.fillRect(rx - s.w/2, GH - s.h, s.w, s.h);
      ctx.fillStyle = '#0a0a0a';
      for (let wy = GH - s.h + 5; wy < GH - 10; wy += 12) {
        ctx.fillRect(rx - 3, wy, 3, 5);
        ctx.fillRect(rx + 1, wy, 3, 5);
      }
    } else if (s.type === 1) {
      // зигзаг-структура
      ctx.fillStyle = '#181818';
      ctx.fillRect(rx - s.w/2, GH - s.h, s.w, s.h);
      ctx.fillRect(rx - s.w, GH - s.h * 0.6, s.w, s.h * 0.6);
    } else {
      // арка
      ctx.fillStyle = '#181818';
      ctx.fillRect(rx - s.w, GH - s.h, s.w/2, s.h);
      ctx.fillRect(rx + s.w/2, GH - s.h, s.w/2, s.h);
      ctx.fillRect(rx - s.w, GH - s.h, s.w * 2, s.w/2);
    }
  }

  // мерцающие "нити" — как электрические разряды
  ctx.fillStyle = '#222';
  for (let i = 0; i < 4; i++) {
    const nx = Math.round(((i * 120 + t * 20) % GW));
    const ny = Math.round(GH * 0.4 + Math.sin(t * 2 + i) * 20);
    ctx.fillRect(nx, ny, 1, Math.round(GH * 0.3 + Math.sin(t + i * 0.5) * 10));
  }
}
