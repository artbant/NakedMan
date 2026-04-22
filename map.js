// NUKED MAN — map.js
// Процедурная генерация карты, отрисовка тайлов и фонов

let MAP = [];
let MW = 0;
let WORLD_W = 0;

// BREAKABLE_MAP: 0=неразрушаемый, 1=хрупкий(1 удар), 2=средний(2 удара)
// Заполняется при generateMap
let BREAKABLE_MAP = [];

// ── БИОМЫ ────────────────────────────────────────────────────────────
// Определяют визуальный стиль уровня. Меняются каждые 4 уровня.
// Все биомы в ЧБ-палитре, различия через паттерны дизеринга и плотности.
// BIOME.sky — функция, рисующая небо в кэше-канвасе.
// BIOME.undergroundDensity — плотность белых точек в подвале (сквозь трещины).
// BIOME.tileDamageBase — базовая плотность "крошки" в тайле (0=нет, 1=сплошной белый).
const BIOMES = [
  {
    // VOID — изначальный стиль. Чёрное небо, редкие звёзды вверху.
    name: 'VOID',
    starDensity: 0.15,   // доля звёзд у верха (быстро редеет)
    starDecay: 3.5,      // степень кривой (больше = быстрее редеет)
    horizonFrac: 0.60,   // где проходит горизонт по высоте экрана
    undergroundDensity: 0.06, // белые точки в подвале (пробивающийся свет)
    tileCrackIntensity: 1.0,  // множитель "крошки" в тайле при повреждении
  },
  {
    // DUST — "запылённый" мир. Горизонт выше, больше низкого тумана.
    // Звёзд меньше, но есть "пыль" у горизонта.
    name: 'DUST',
    starDensity: 0.08,
    starDecay: 2.5,
    horizonFrac: 0.50,   // горизонт выше — больше "земли"
    undergroundDensity: 0.10, // больше "пыли" в камнях
    tileCrackIntensity: 1.3,
    // особенность: туманный слой у горизонта (нарисуем в sky)
    hasMist: true,
  },
  {
    // GLARE — "снежный" / яркий мир. Звёзды плотнее, разбросаны выше к горизонту.
    name: 'GLARE',
    starDensity: 0.22,
    starDecay: 2.0,
    horizonFrac: 0.55,
    undergroundDensity: 0.04,
    tileCrackIntensity: 0.7,
  },
  {
    // HIVE — "клетчатый" мир. В тайлах есть структурный паттерн.
    // Звёзды как битые — не равномерно распределены.
    name: 'HIVE',
    starDensity: 0.12,
    starDecay: 4.0,
    horizonFrac: 0.55,
    undergroundDensity: 0.08,
    tileCrackIntensity: 1.1,
    // битый паттерн неба: звёзды кластерами (хэш с низкой частотой)
    clusteredStars: true,
  },
];

let currentBiome = BIOMES[0];

function getBiome(lvl) {
  // каждые 4 уровня новый биом, потом циклически
  return BIOMES[Math.floor((lvl - 1) / 4) % BIOMES.length];
}

function generateMap(lvl = 1) {
  currentBiome = getBiome(lvl);
  // инвалидируем кэш неба — нужен новый под текущий биом
  _skyCache = null;

  // Если для этого уровня есть ручной ASCII-уровень — используем его
  if (typeof hasAsciiLevel === 'function' && hasAsciiLevel(lvl)) {
    // парсер заполнит MAP/BREAKABLE_MAP/MW/WORLD_W и вернёт surface
    // applyAsciiLevel мы вызовем отдельно из initLevel (после того как
    // будут готовы функции spawnEnemy и др.)
    parseAsciiLevel(getAsciiLevel(lvl));
    return;
  }

  // чем выше уровень — длиннее карта, больше пропастей
  // Удвоенная ширина: было 65+4*lvl (капс 100), стало 130+8*lvl (капс 200)
  const baseW = 130 + Math.min(lvl * 8, 70);
  const totalWidth = rnd(baseW, baseW + 30);
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
  // Все тайлы разрушаемы, но прочность растёт с глубиной.
  // Это предотвращает "диагональный скип": прорыть туннель через монолит
  // вниз и вперёд к финалу. Глубокие тайлы требуют столько ударов что
  // идти поверху становится явно быстрее.
  for (let x = 0; x < MW; x++) {
    const sf = surface[x];
    for (let y = sf; y < MH; y++) {
      MAP[y][x] = rndTex();
      const depth = y - sf;
      // depth 0-1 → 1 HP (поверхность, хрупкая)
      // depth 2-4 → 2 HP (средний слой)
      // depth 5+  → 3 HP (глубина, очень прочная)
      BREAKABLE_MAP[y][x] = depth < 2 ? 1 : (depth < 5 ? 2 : 3);
    }
  }

  // ── ШАГ 3: ВПАДИНЫ И РЕДКИЕ ПРОПАСТИ ─────────────────────────────────
  // Впадина = углубление в несколько тайлов (не насквозь)
  // Пропасть = только 1-2 тайла шириной и только иногда
  const numFeatures = rnd(4 + Math.min(lvl * 2, 6), 8 + Math.min(lvl * 2, 10));
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
  const numCaves = rnd(4, 6);
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

  // (ШАГ 6 убран — все тайлы разрушаемы, включая старт и финал)
}

// ── ПОРТАЛ ────────────────────────────────────────────────────────────
let portalX = 0, portalY = 0;

function initPortal() {
  // портал в конце уровня — последние 4 тайла, на поверхности
  const px = MW - 4;
  portalY = findSpawnY(px, T * 2);
  portalX = px * T;
}

function drawPortal() {
  const sx = Math.round(portalX - game.cam);
  const sy = Math.round(portalY);
  if (sx + T < 0 || sx > GW) return;
  const blink = Math.floor(Date.now() / 150) % 2;

  // арка пикселями
  ctx.fillStyle = blink ? '#fff' : '#E4E4E4';
  ctx.fillRect(sx + 4, sy, T - 8, 3);
  ctx.fillRect(sx, sy + 3, 4, T * 2 - 3);
  ctx.fillRect(sx + T - 4, sy + 3, 4, T * 2 - 3);

  // внутри — мигающие пиксели
  ctx.fillStyle = '#000';
  for (let dy = 4; dy < T * 2 - 4; dy += 4)
    for (let dx = 6; dx < T - 6; dx += 4)
      ctx.fillRect(sx + dx, sy + dy, 2, 2);

  // надпись EXIT над аркой — через пиксельный шрифт (4 буквы × 4px + 3 промежутка = 19px)
  if (typeof pixelText === 'function') {
    pixelText('EXIT', sx + Math.round(T / 2) - 8, sy - 8, '#fff', 1);
  }
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
  const maxHP = bt === 1 ? 1 : bt === 2 ? 2 : 3;
  if (tileHP[key] === undefined) tileHP[key] = maxHP;
  tileHP[key]--;

  // мигание тайла при ударе
  flashTile(tx, ty);

  // частицы при ударе
  const cx = (tx + 0.5) * T - game.cam;
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
    // уведомляем врагов о разрушении — громкий звук
    if (typeof notifyEnemiesOfSound === 'function') {
      notifyEnemiesOfSound((tx + 0.5) * T, (ty + 0.5) * T, T * 10);
    }
    return true;
  }
  // даже при обычном ударе по тайлу (не разрушил) — тихий звук
  if (typeof notifyEnemiesOfSound === 'function') {
    notifyEnemiesOfSound((tx + 0.5) * T, (ty + 0.5) * T, T * 6);
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

function drawTile(tx, ty, type) {
  const x = Math.round(tx * T - game.cam), y = ty * T;
  if (x + T < 0 || x > GW) return;

  const bt = (BREAKABLE_MAP[ty] && BREAKABLE_MAP[ty][tx]) || 0;
  const key = tileKey(tx, ty);
  const flashing = tileFlash[key] !== undefined && Math.floor(tileFlash[key] * 20) % 2 === 0;

  if (flashing) {
    // при ударе тайл "вспыхивает" — инверсия
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y, T, T);
    ctx.fillStyle = '#fff';
    const d16 = 0.85 * 16;
    for (let dy = 0; dy < T; dy++) {
      const row = BAYER4[(y + dy) % 4];
      for (let dx = 0; dx < T; dx++) {
        if (d16 > row[(x + dx) % 4]) ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
    return;
  }

  // Чёрный фон тайла
  ctx.fillStyle = '#000';
  ctx.fillRect(x, y, T, T);

  // Проверяем — "поверхность" ли это (нет тайла сверху) или "нутро" (есть тайл сверху)
  const isSurface = ty === 0 || !MAP[ty - 1] || !MAP[ty - 1][tx];

  if (isSurface) {
    // ── ПОВЕРХНОСТНЫЙ ТАЙЛ — текстура как в референсе ──
    // 1. Сплошная белая линия на кромке (y=0)
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, T, 1);
    // 2. Зона плотного дизеринга (y=2-5, 4 ряда Bayer)
    const denseD16 = 0.55 * 16;
    for (let dy = 2; dy <= 5; dy++) {
      const row = BAYER4[(y + dy) % 4];
      for (let dx = 0; dx < T; dx++) {
        if (denseD16 > row[(x + dx) % 4]) ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
    // 3. Полосатая зона (y=7-14) — чередуем линии точек и пустоту
    for (let dy = 7; dy <= 14; dy++) {
      const striRow = dy % 3; // каждый 3-й ряд — точки
      if (striRow !== 0) continue;
      const densD16 = 0.45 * 16;
      const row = BAYER4[(y + dy) % 4];
      for (let dx = 0; dx < T; dx++) {
        if (densD16 > row[(x + dx) % 4]) ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
    // 4. Редкие точки в нижней части (y=16-23) — одиночные камни
    for (let dy = 16; dy < T; dy++) {
      const sparseRow = dy % 4;
      if (sparseRow !== 0) continue;
      const sparseD16 = 0.15 * 16;
      const row = BAYER4[(y + dy) % 4];
      for (let dx = 0; dx < T; dx++) {
        if (sparseD16 > row[(x + dx) % 4]) ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  } else {
    // ── ВНУТРЕННИЙ ТАЙЛ — почти чёрный с очень редкими точками ──
    ctx.fillStyle = '#fff';
    const innerD16 = 0.08 * 16;
    for (let dy = 0; dy < T; dy++) {
      const row = BAYER4[(y + dy) % 4];
      for (let dx = 0; dx < T; dx++) {
        if (innerD16 > row[(x + dx) % 4]) ctx.fillRect(x + dx, y + dy, 1, 1);
      }
    }
  }

  // ── Повреждения — белые точки на месте удара ──
  const hp = tileHP[key];
  if (hp !== undefined) {
    const maxHP = bt === 1 ? 1 : bt === 2 ? 2 : 3;
    const ratio = hp / maxHP;
    const whiteDensity = 0.35 * (1 - ratio);
    if (whiteDensity > 0.01) {
      ctx.fillStyle = '#fff';
      const d16 = Math.min(16, whiteDensity * 16);
      for (let dy = 0; dy < T; dy++) {
        const row = BAYER4[(y + dy) % 4];
        for (let dx = 0; dx < T; dx++) {
          if (d16 > row[(x + dx) % 4]) ctx.fillRect(x + dx, y + dy, 1, 1);
        }
      }
    }
  }
}


// ── ПОДЗЕМНЫЙ СЛОЙ — рисуется ДО тайлов ─────────────────────────────
// Рисуем "подвал" ТОЛЬКО в полостях окружённых монолитом со всех сторон.
// На поверхности (если сверху воздух) не рисуем — иначе создаётся
// крапинка вдоль линии горизонта которая мешает читать персонажей.
function drawUnderground() {
  const s = Math.floor(game.cam / T);
  const e = Math.min(MW, s + Math.ceil(GW / T) + 2);
  const biomeDensity = (currentBiome && currentBiome.undergroundDensity) || 0.06;
  const d16 = biomeDensity * 16;
  for (let ty = 0; ty < MH; ty++) {
    for (let tx = s; tx < e; tx++) {
      if (MAP[ty][tx] !== 0) continue;
      // Считаем это подземной полостью если:
      // - сверху твёрдо (крыша)
      // - и с боков есть опора
      const hasAbove = ty > 0 && MAP[ty-1][tx];
      const hasLeft = tx > 0 && MAP[ty][tx-1];
      const hasRight = tx < MW-1 && MAP[ty][tx+1];
      if (!hasAbove || (!hasLeft && !hasRight)) continue;

      const x = Math.round(tx * T - game.cam);
      const y = ty * T;

      ctx.fillStyle = '#000';
      ctx.fillRect(x, y, T, T);
      ctx.fillStyle = '#fff';
      for (let dy = 0; dy < T; dy++) {
        const row = BAYER4[(y + dy) % 4];
        for (let dx = 0; dx < T; dx++) {
          if (d16 > row[(x + dx) % 4]) {
            ctx.fillRect(x + dx, y + dy, 1, 1);
          }
        }
      }
    }
  }
}

function drawTilemap(dt) {
  if (dt) updateTileFlash(dt);
  drawUnderground();
  const s = Math.floor(game.cam / T);
  const e = Math.min(MW, s + Math.ceil(GW / T) + 2);
  for (let ty = 0; ty < MH; ty++)
    for (let tx = s; tx < e; tx++)
      if (MAP[ty][tx]) drawTile(tx, ty, MAP[ty][tx]);
}

function drawMoon(cx, cy) {
  // Луна в ЧБ: диск — белый с редким дизерингом (density 0.15),
  // кратеры — более плотный дизеринг (density 0.55).
  const rows = [[4,6],[2,10],[1,12],[0,14],[0,14],[0,14],[0,14],[0,14],[1,12],[2,10],[4,6]];

  // 1) белый диск — сплошной белый
  ctx.fillStyle = '#fff';
  for (let i = 0; i < rows.length; i++) {
    const [ox, w] = rows[i];
    ctx.fillRect(cx - Math.floor(w / 2), cy + i, w, 1);
  }

  // 2) тонкий дизеринг по всему диску — "фактура" луны
  ctx.fillStyle = '#000';
  const diskD16 = 0.15 * 16;
  for (let i = 0; i < rows.length; i++) {
    const [, w] = rows[i];
    const startX = cx - Math.floor(w / 2);
    const py = cy + i;
    const bayerRow = BAYER4[((py % 4) + 4) % 4];
    for (let j = 0; j < w; j++) {
      const px = startX + j;
      if (diskD16 > bayerRow[((px % 4) + 4) % 4]) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }

  // 3) кратеры — плотные пятна дизеринга
  const craters = [
    { x: cx - 3, y: cy + 3, w: 4, h: 2 },
    { x: cx + 2, y: cy + 7, w: 3, h: 2 },
  ];
  const craterD16 = 0.55 * 16;
  for (const c of craters) {
    for (let dy = 0; dy < c.h; dy++) {
      const py = c.y + dy;
      const bayerRow = BAYER4[((py % 4) + 4) % 4];
      for (let dx = 0; dx < c.w; dx++) {
        const px = c.x + dx;
        if (craterD16 > bayerRow[((px % 4) + 4) % 4]) {
          ctx.fillRect(px, py, 1, 1);
        }
      }
    }
  }
}

// ── СНЕГ — инициализируется один раз ────────────────────────────────
const snowParticles = [];
(function initSnow() {
  for (let i = 0; i < 90; i++) {
    const layer = i < 35 ? 1 : i < 65 ? 2 : 3;
    snowParticles.push({
      x: Math.random() * GW,
      y: Math.random() * GH,
      speed: layer === 1 ? 10 + Math.random()*15 : layer === 2 ? 28 + Math.random()*18 : 55 + Math.random()*25,
      drift: (Math.random() - 0.5) * 2,
      phase: Math.random() * Math.PI * 2,
      size: layer === 3 ? 2 : 1,
      layer,
    });
  }
})();

function drawSnow(dt) {
  const t = Date.now() / 1000;
  for (const p of snowParticles) {
    // ИНВЕРСИЯ: движение снизу вверх — частицы летят ВВЕРХ
    p.y -= p.speed * dt;
    p.x += Math.sin(t * 0.8 + p.phase) * 0.4;
    // параллакс с камерой
    const px = (p.x - game.cam * (p.layer === 1 ? 0.02 : p.layer === 2 ? 0.08 : 0.18)) % (GW + 20);
    const drawX = ((px % GW) + GW) % GW;
    // респавн: когда улетел за верх — возвращаем вниз
    if (p.y < -2) { p.y = GH + 2; p.x = Math.random() * GW; }

    const alpha = p.layer === 1 ? 0.3 : p.layer === 2 ? 0.55 : 0.85;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#fff';
    ctx.fillRect(Math.round(drawX), Math.round(p.y), p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

// ── ПРОЦЕДУРНЫЙ ПРОФИЛЬ ГОРИЗОНТА ────────────────────────────────────
// детерминированный — один раз считается, не дрожит каждый кадр
function horizonProfile(baseY, amplitude, freq, offset) {
  // возвращает высоту для каждой X-позиции (0..GW)
  // через сумму синусов с разными частотами — органичный силуэт
  return function(x) {
    const s1 = Math.sin((x + offset) * freq) * amplitude;
    const s2 = Math.sin((x + offset * 1.3) * freq * 2.1) * amplitude * 0.4;
    const s3 = Math.sin((x + offset * 0.7) * freq * 0.5) * amplitude * 0.3;
    return Math.round(baseY + s1 + s2 + s3);
  };
}

// ── ДИЗЕРИНГ BAYER 4×4 ───────────────────────────────────────────────
// Упорядоченный дизеринг: threshold-матрица даёт стабильный, не дрожащий
// паттерн белых точек на чёрной подложке. Плотность 0..1 задаёт долю белого:
// 0.0 = абсолютный чёрный (ничего не рисуем), 1.0 = сплошной белый.
// Чем чернее — тем БЛИЖЕ к игроку/впереди. Дальние планы светлее.
const BAYER4 = [
  [ 0,  8,  2, 10],
  [12,  4, 14,  6],
  [ 3, 11,  1,  9],
  [15,  7, 13,  5],
];

// Рисует прямоугольник (x,y,w,h) белыми точками на чёрной подложке,
// плотностью density. Вызывающий код выставляет fillStyle = '#fff'.
function ditherFill(x, y, w, h, density) {
  if (density <= 0) return;
  if (density >= 1) { ctx.fillRect(x, y, w, h); return; }
  const d16 = density * 16;
  const x0 = x | 0, y0 = y | 0;
  const x1 = x0 + (w | 0), y1 = y0 + (h | 0);
  for (let py = y0; py < y1; py++) {
    const row = BAYER4[((py % 4) + 4) % 4];
    for (let px = x0; px < x1; px++) {
      if (d16 > row[((px % 4) + 4) % 4]) {
        ctx.fillRect(px, py, 1, 1);
      }
    }
  }
}

// Силуэтный план — над профилем прозрачно (оставляем подложку),
// ниже — заполняем дизерингом плотности density белыми точками.
function drawDitheredSilhouettePlan(parallax, density, baseY, amplitude, freq, offsetBase) {
  const offset = offsetBase - game.cam * parallax;
  const profile = horizonProfile(baseY, amplitude, freq, offset);
  const d16 = density * 16;
  // fillStyle уже '#fff' — вызывающий код выставляет один раз
  for (let x = 0; x <= GW; x++) {
    const top = profile(x);
    if (top >= GH) continue;
    const startY = top < 0 ? 0 : top;
    if (density >= 1) {
      ctx.fillRect(x, startY, 1, GH - startY);
      continue;
    }
    const bayerCol = ((x % 4) + 4) % 4;
    for (let py = startY; py < GH; py++) {
      if (d16 > BAYER4[((py % 4) + 4) % 4][bayerCol]) {
        ctx.fillRect(x, py, 1, 1);
      }
    }
  }
}

// ── КЕШ НЕБА ─────────────────────────────────────────────────────────
// Логика: чёрный горизонт (нижняя часть экрана абсолютно чёрная),
// редкие БЕЛЫЕ точки в верхней части неба — звёзды/искры.
// Расположение РАНДОМНОЕ (через хэш координат), не по bayer-сетке.
// Плотность максимальна у самого верха и быстро падает к горизонту.
let _skyCache = null;
function getSkyCache() {
  if (_skyCache) return _skyCache;
  const cnv = (typeof OffscreenCanvas !== 'undefined')
    ? new OffscreenCanvas(GW, GH)
    : Object.assign(document.createElement('canvas'), { width: GW, height: GH });
  const c = cnv.getContext('2d');
  // Абсолютно чёрное небо — никаких звёзд, никакого тумана
  c.fillStyle = '#000';
  c.fillRect(0, 0, GW, GH);

  _skyCache = cnv;
  return cnv;
}

function drawBgFar() {
  // Небо с параллаксом: движется со скоростью 10% от камеры.
  // Звёзды "едут" намного медленнее мира, создавая ощущение глубины.
  // Для бесшовности рисуем 2 копии: основную и сдвинутую вправо.
  const sky = getSkyCache();
  const PARALLAX = 0.1; // 10% от скорости игрока
  const offset = (game.cam * PARALLAX) % GW;
  // Из-за модуло отрицательного числа в JS — нормализуем в [0, GW)
  const shift = offset >= 0 ? offset : offset + GW;
  // Основная копия смещена влево на shift пикселей
  ctx.drawImage(sky, -shift, 0);
  // Вторая копия справа — для покрытия пустого места
  ctx.drawImage(sky, GW - shift, 0);
}

function drawBgMid() {
  // пусто — дополнительные слои параллакса отсутствуют
}

