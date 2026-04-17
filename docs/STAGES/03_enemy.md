# ЭТАП 3 — Враг базовый

## Правила
- Всё через fillRect, цвет врага #E4E4E4 (как персонаж)
- Враг не проваливается с платформы
- Враг не может перейти в пустой тайл

## Спрайт врага (12×16px) — простой гуманоид
```js
const ENEMY_SPRITE = [
  [4,0,4],        // голова верх
  [3,1,6],        // голова
  [3,2,6],
  [4,3,4],        // голова низ
  [2,4,8],        // плечи
  [3,5,6],        // торс
  [3,6,6],
  [3,7,6],
  [2,8,3],[7,8,3],  // руки
  [2,9,3],[7,9,3],
  [4,10,4],       // бёдра
  [3,11,2],[7,11,2], // ноги
  [3,12,2],[7,12,2],
  [3,13,2],[7,13,2],
  [2,14,3],[7,14,3], // ступни
];

// глаза (чёрные точки на голове)
// рисуются отдельно ctx.fillStyle='#000'
// [4,2,1] и [7,2,1]
```

## Объект врага
```js
// массив enemies = []
// при инициализации уровня:
function spawnEnemy(tileX, tileY) {
  enemies.push({
    x: tileX * T,
    y: tileY * T - 16,
    w: 12, h: 16,
    vx: 30, // скорость
    hp: 2,
    flashTimer: 0,  // мигание при ударе
    dead: false,
    deathTimer: 0,
  });
}
```

## Обновление врага в update():
```js
function updateEnemies(dt) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e.dead) {
      e.deathTimer += dt;
      if (e.deathTimer > 0.5) enemies.splice(i, 1);
      continue;
    }

    if (e.flashTimer > 0) e.flashTimer -= dt;

    // гравитация
    e.vy = (e.vy || 0) + 480 * dt;
    if (e.vy > 400) e.vy = 400;
    e.y += e.vy * dt;

    // земля
    if (solid(e.x + 2, e.y + e.h) || solid(e.x + e.w - 2, e.y + e.h)) {
      e.y = Math.floor((e.y + e.h) / T) * T - e.h;
      e.vy = 0;
    }

    // движение + разворот у края
    e.x += e.vx * dt;
    const ahead = e.vx > 0 ? e.x + e.w + 2 : e.x - 2;
    const groundAhead = e.y + e.h + 2;

    if (solid(ahead, e.y + e.h / 2) || !solid(ahead, groundAhead)) {
      e.vx *= -1;
    }

    // урон игроку при контакте
    const p = player;
    if (!p.dead && !p.punching &&
        p.x < e.x + e.w && p.x + p.w > e.x &&
        p.y < e.y + e.h && p.y + p.h > e.y) {
      p.lives--;
      p.dead = true;
      p.dtimer = 0;
    }
  }
}
```

## Проверка хитбокса удара:
```js
function checkPunchHit() {
  if (!player.punching || player.pframe < 1) return;
  const p = player;
  const hx = p.facing > 0 ? p.x + p.w : p.x - 14;
  const hy = p.y + 8;
  const hw = 14, hh = 12;

  for (const e of enemies) {
    if (e.dead) continue;
    if (hx < e.x + e.w && hx + hw > e.x && hy < e.y + e.h && hy + hh > e.y) {
      e.hp--;
      e.flashTimer = 0.2;
      if (e.hp <= 0) {
        e.dead = true;
        e.deathTimer = 0;
        spawnDeathParticles(e.x + e.w / 2 - cam, e.y + e.h / 2);
      }
    }
  }
}
```

## Отрисовка врага:
```js
function drawEnemies() {
  for (const e of enemies) {
    const ex = Math.round(e.x - cam);
    const ey = Math.round(e.y);
    if (ex + e.w < 0 || ex > GW) continue;

    if (e.dead) {
      // рассыпается пикселями — просто fadeout
      ctx.globalAlpha = 1 - e.deathTimer * 2;
      ctx.fillStyle = '#E4E4E4';
      ctx.fillRect(ex + 2, ey + 2, e.w - 4, e.h - 4);
      ctx.globalAlpha = 1;
      continue;
    }

    // мигание при ударе
    if (e.flashTimer > 0 && Math.floor(e.flashTimer * 20) % 2 === 0) {
      ctx.fillStyle = '#fff';
    } else {
      ctx.fillStyle = '#E4E4E4';
    }

    const flip = e.vx < 0;
    // рисуем спрайт ENEMY_SPRITE
    for (const [sx, sy, sw] of ENEMY_SPRITE) {
      const rx = flip ? (12 - sx - sw) : sx;
      ctx.fillRect(ex + rx, ey + sy, sw, 1);
    }
    // глаза
    ctx.fillStyle = '#000';
    const ex1 = flip ? ex + 12 - 5 : ex + 4;
    const ex2 = flip ? ex + 12 - 8 : ex + 7;
    ctx.fillRect(ex1, ey + 2, 1, 1);
    ctx.fillRect(ex2, ey + 2, 1, 1);
  }
}
```

## Начальное размещение врагов:
```js
// вызвать после инициализации карты:
spawnEnemy(10, 7);
spawnEnemy(20, 6);
spawnEnemy(31, 7);
```

## Тест:
- [ ] Враг ходит туда-обратно
- [ ] Разворачивается у края платформы
- [ ] 2 удара — умирает
- [ ] При получении урона мигает
- [ ] Контакт с игроком — жизнь теряется
