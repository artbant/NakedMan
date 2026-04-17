# ЭТАП 4 — Пауэрапы

## Правила
- Всё через fillRect
- Подбирается при касании игрока
- Эффект — визуальный индикатор в HUD

## Спрайт бутылки (8×12px):
```js
const BOTTLE = [
  [3,0,2],      // горлышко
  [3,1,2],
  [2,2,4],      // плечи
  [1,3,6],      // тело
  [1,4,6],
  [1,5,6],
  [1,6,6],
  [1,7,6],
  [1,8,6],
  [2,9,4],      // дно
  [1,10,6],
  [2,11,4],
];
```

## Спрайт сигареты (10×4px):
```js
const CIGARETTE = [
  [0,0,7],[7,0,2],  // тело + фильтр
  [0,1,7],[7,1,2],
  [0,2,6],          // огонь
  [0,3,5],
];
```

## Объект пауэрапа:
```js
// массив items = []
function spawnItem(tileX, tileY, type) {
  items.push({
    x: tileX * T + 8,
    y: tileY * T - 12,
    type, // 'bottle' | 'cigarette'
    collected: false,
    bobT: Math.random() * Math.PI * 2, // фаза покачивания
  });
}
```

## Обновление в update():
```js
function updateItems(dt) {
  for (const item of items) {
    if (item.collected) continue;
    item.bobT += dt * 2;

    // проверка подбора
    const p = player;
    if (p.x < item.x + 8 && p.x + p.w > item.x &&
        p.y < item.y + 12 && p.y + p.h > item.y) {
      item.collected = true;
      applyPowerup(item.type);
      spawnPickupParticles(item.x - cam + 4, item.y + 6);
    }
  }
}

function applyPowerup(type) {
  if (type === 'bottle') {
    if (player.lives < 3) player.lives++;
    // показать "+1" в HUD на 1 сек
    hudMessage = '+1 LIFE';
    hudMessageTimer = 1.0;
  } else if (type === 'cigarette') {
    player.speedBoost = 5.0; // 5 секунд ускорения
    hudMessage = 'SPEED!';
    hudMessageTimer = 1.0;
  }
}
```

## Ускорение от сигареты в update():
```js
if (player.speedBoost > 0) {
  player.speedBoost -= dt;
  p.vx = dx * 130; // вместо 75
} else {
  p.vx = dx * 75;
}
```

## Отрисовка предметов:
```js
function drawItems() {
  for (const item of items) {
    if (item.collected) continue;
    const ix = Math.round(item.x - cam);
    const iy = Math.round(item.y + Math.sin(item.bobT) * 2); // покачивание

    ctx.fillStyle = '#E4E4E4';
    const spr = item.type === 'bottle' ? BOTTLE : CIGARETTE;
    for (const [sx, sy, sw] of spr) {
      ctx.fillRect(ix + sx, iy + sy, sw, 1);
    }
  }
}
```

## HUD индикатор ускорения:
```js
// в drawHUD():
if (player.speedBoost > 0) {
  // мигающая полоска под сердцами
  if (Math.floor(player.speedBoost * 4) % 2 === 0) {
    ctx.fillStyle = '#E4E4E4';
    ctx.fillRect(3, 14, Math.round(player.speedBoost / 5 * 40), 2);
  }
}

// сообщение в HUD:
if (hudMessageTimer > 0) {
  hudMessageTimer -= dt;
  pixelText(hudMessage, GW/2 - 20, GH/2 - 30, '#E4E4E4', 1);
}
```

## Начальное размещение:
```js
spawnItem(8, 6, 'bottle');
spawnItem(18, 5, 'cigarette');
spawnItem(28, 7, 'bottle');
```

## Тест:
- [ ] Бутылка подбирается — добавляет жизнь
- [ ] Сигарета подбирается — персонаж быстрее 5 сек
- [ ] Предметы покачиваются
- [ ] HUD показывает эффект
- [ ] Подобранный предмет исчезает
