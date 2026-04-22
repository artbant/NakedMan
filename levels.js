// NUKED MAN — levels.js
// Ручные ASCII-уровни. Каждый уровень — массив строк (одна строка = ряд тайлов).
// Высота уровня = MH (11 тайлов). Ширина любая, но рекомендуется 100+ для интересных карт.
//
// ЛЕГЕНДА СИМВОЛОВ:
//   # — монолит обычный (прочность зависит от глубины)
//   X — монолит хрупкий (1 HP — легко сломать)
//   O — монолит крепкий (3 HP — 3 удара)
//   ' ' или . — воздух (ничего)
//   @ — позиция старта игрока (опционально, по умолчанию x=2)
//   P — портал (финиш). Если не указан — ставится в конце карты.
//   E — враг patrol (ходит туда-сюда)
//   G — враг guard (стреляет)
//   R — враг runner (убегает)
//   F — враг flyer (летает)
//   S — враг sniper (засада)
//   U — враг bruiser (большой)
//   B — босс
//   b — бочка обычная
//   x — бочка взрывная
//   c — ящик
//   m — аптечка
//   i — сигарета (speed boost)
//   H — заложник
//
// ВАЖНО: высота всегда 11 строк (MH). Если строка короче — дополняется пробелами.

const LEVELS = [
  // ───────── УРОВЕНЬ 1 — "The long walk" ───────────────────────────────
  // Длинный разнообразный уровень. Все пропасти 4-5 тайлов (перепрыгиваемо
  // с разбега + double jump).
  [
    //   0         1         2         3         4         5         6         7         8         9         10        11        12        13        14        15
    //   0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
    "                                                                                                                                                                   ",
    "                                                                                                                                                                   ",
    "                                                      S                                                                                                            ",
    "                                           F        ###                    F                                                       F     F                        ",
    "                                           ##       ###                                                                                                            ",
    "                                   S      ### #    ###        S                                                                                                   ",
    "               E          G              #####     ###       ###            F                   #######          #######                                          ",
    "                          ###         ############      #########                                ###                 ###                                          ",
    "     @     E             ####        ###########################              U                  ###  H  m           ###                  H        U           B  ",
    "####################     ####     ################################################################################################################################",
    "####################     ####     ################################################################################################################################",
  ],

  // ───────── УРОВЕНЬ 2 — "Пропасть и снайпер" ──────────────────────────
  // Вводит пропасть которую надо перепрыгнуть + снайпер за стеной
  [
    "                                                                                  ",
    "                                                                                  ",
    "                                                                                  ",
    "                                                                                  ",
    "                                                   S                              ",
    "                      m                            ##                             ",
    "                  ############          c    E   ####                             ",
    "      E                    #        #####   ######################                ",
    "@................                                                          ......B",
    "###################         ################################################ #####",
    "###################         ################################################ #####",
  ],

  // ───────── УРОВЕНЬ 3 — "Арена с летунами" ────────────────────────────
  // Большое открытое пространство, летающие враги, одна аптечка внутри
  [
    "                                                                                 ",
    "             F                              F                                    ",
    "                                                                                 ",
    "                         F                                 F                     ",
    "      O       O                                                                  ",
    "     ###     ###         H          m                                            ",
    "     ###     ###       #####     #######                    E   E               ",
    "@...............                                                             ...B",
    "################             ###################################################",
    "################             ###################################################",
    "################             ###################################################",
  ],
];

// ── ПАРСЕР ASCII-УРОВНЯ ──────────────────────────────────────────────
// Читает массив строк, выставляет MAP/BREAKABLE_MAP и возвращает
// { spawnEntities, startX, portalX, portalY } для последующей инициализации.
function parseAsciiLevel(rows) {
  // нормализуем: все строки равной длины (= максимальной)
  let maxLen = 0;
  for (const r of rows) if (r.length > maxLen) maxLen = r.length;
  const padded = rows.map(r => r + ' '.repeat(maxLen - r.length));
  // обрезаем до MH строк или дополняем пробелами
  while (padded.length < MH) padded.push(' '.repeat(maxLen));
  const grid = padded.slice(0, MH);

  MW = maxLen;
  WORLD_W = MW * T;

  // инициализируем пустые MAP и BREAKABLE_MAP
  MAP = [];
  BREAKABLE_MAP = [];
  for (let y = 0; y < MH; y++) {
    MAP.push(new Array(MW).fill(0));
    BREAKABLE_MAP.push(new Array(MW).fill(0));
  }

  // surface[x] — верхний тайл монолита в колонке (для surfacePoints и findSpawnY)
  const surface = new Array(MW).fill(MH);
  const spawnEntities = []; // массив { type, tx, ty }
  let startX = 2;
  let startY = 0;
  let portalTX = -1;
  let portalTY = -1;

  for (let y = 0; y < MH; y++) {
    const row = grid[y];
    for (let x = 0; x < MW; x++) {
      const ch = row[x];
      switch (ch) {
        case '#':
          MAP[y][x] = rndTex();
          // HP растёт с глубиной: depth 0-1 → 1 HP, 2-4 → 2 HP, 5+ → 3 HP
          // но пока не знаем глубину — поставим 0 и просчитаем после
          BREAKABLE_MAP[y][x] = -1; // маркер "обычная прочность"
          if (surface[x] > y) surface[x] = y;
          break;
        case 'X':
          MAP[y][x] = rndTex();
          BREAKABLE_MAP[y][x] = 1; // всегда 1 HP
          if (surface[x] > y) surface[x] = y;
          break;
        case 'O':
          MAP[y][x] = rndTex();
          BREAKABLE_MAP[y][x] = 3; // всегда 3 HP
          if (surface[x] > y) surface[x] = y;
          break;
        case '@':
          startX = x;
          startY = y;
          break;
        case 'P':
          portalTX = x;
          portalTY = y;
          break;
        case 'E': case 'G': case 'R': case 'F': case 'S': case 'U':
        case 'B':
        case 'b': case 'x': case 'c':
        case 'm': case 'i':
        case 'H':
          spawnEntities.push({ type: ch, tx: x, ty: y });
          break;
        // пробел/точка/любой другой символ → воздух, уже пусто
      }
    }
  }

  // Пересчитываем BREAKABLE_MAP для символов '#' — глубина от surface
  for (let x = 0; x < MW; x++) {
    const sf = surface[x];
    for (let y = sf; y < MH; y++) {
      if (BREAKABLE_MAP[y][x] === -1) {
        const depth = y - sf;
        BREAKABLE_MAP[y][x] = depth < 2 ? 1 : (depth < 5 ? 2 : 3);
      }
    }
  }

  return {
    spawnEntities,
    startX, startY,
    portalTX, portalTY,
    surface,
  };
}

// Применяет результат parseAsciiLevel к игре: спавнит врагов, предметы, заложников.
// Вызывается из generateMap вместо процедурного initEnemies/initItems/initHostages.
function applyAsciiLevel(rows) {
  const parsed = parseAsciiLevel(rows);

  // Старт игрока
  if (typeof START !== 'undefined') {
    START.x = parsed.startX * T + 4;
    // Y найдём по surface
    let startY = parsed.startY * T;
    // если @ стоял в воздухе — опускаем на ближайшую поверхность
    const col = parsed.surface[parsed.startX];
    if (col < MH) startY = col * T - (player.h || 24);
    START.y = startY;
  }

  // Портал
  if (parsed.portalTX >= 0) {
    portalX = parsed.portalTX * T;
    portalY = parsed.portalTY * T;
  } else {
    // нет явного P — ставим в самом конце на поверхности
    portalX = (MW - 3) * T;
    const col = parsed.surface[MW - 3];
    portalY = (col < MH ? col : MH - 1) * T - T * 2;
  }

  // Спавним сущности через соответствующие модули
  enemies = [];
  items = [];
  hostages = [];
  if (typeof objects !== 'undefined') objects.length = 0;

  const enemyTypeMap = {
    'E': 'patrol', 'G': 'guard', 'R': 'runner',
    'F': 'flyer',  'S': 'sniper', 'U': 'bruiser',
  };

  let bossSpec = null;
  for (const ent of parsed.spawnEntities) {
    if (enemyTypeMap[ent.type]) {
      spawnEnemy(ent.tx, ent.ty, enemyTypeMap[ent.type]);
    } else if (ent.type === 'B') {
      // Босс — запоминаем позицию, спавн сделаем после (initBoss расставляет сам)
      bossSpec = { tx: ent.tx, ty: ent.ty };
    } else if (ent.type === 'b' || ent.type === 'x' || ent.type === 'c') {
      // spawnObject принимает мировые координаты и тип: 'barrel' | 'expbarrel'
      // (crate в текущем коде не поддерживается — мапим в барель)
      const objType = ent.type === 'x' ? 'expbarrel' : 'barrel';
      if (typeof spawnObject === 'function') {
        // находим пол под указанной позицией
        let footTY = ent.ty;
        for (let y = ent.ty; y < MH; y++) {
          if (MAP[y] && MAP[y][ent.tx]) { footTY = y; break; }
        }
        spawnObject(ent.tx * T + 2, footTY * T, objType);
      }
    } else if (ent.type === 'm') {
      if (typeof spawnItem === 'function') spawnItem(ent.tx, 'medkit');
    } else if (ent.type === 'i') {
      if (typeof spawnItem === 'function') spawnItem(ent.tx, 'cigarette');
    } else if (ent.type === 'H') {
      if (typeof spawnHostage === 'function') spawnHostage(ent.tx, ent.ty);
    }
  }

  // Возвращаем bossSpec чтобы вызывающий мог использовать
  game.enemiesTotal = enemies.length;
  game.enemiesKilled = 0;
  return { bossSpec };
}

// Возвращает true если для уровня lvl есть ручной ASCII
function hasAsciiLevel(lvl) {
  return LEVELS[lvl - 1] !== undefined;
}

// Возвращает массив строк для уровня
function getAsciiLevel(lvl) {
  return LEVELS[lvl - 1];
}
