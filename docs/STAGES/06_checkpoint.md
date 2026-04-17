# ЭТАП 6 — Чекпоинты

## Объект чекпоинта:
```js
const checkpoints = [
  { x: 28 * T, y: 6 * T, activated: false },
];

function drawCheckpoint(cp) {
  const cx = Math.round(cp.x - cam);
  const cy = cp.y;
  // флажок попиксельно
  ctx.fillStyle = cp.activated ? '#E4E4E4' : '#555';
  ctx.fillRect(cx + 4, cy, 1, 16);       // шест
  ctx.fillRect(cx + 5, cy, 6, 1);        // флаг
  ctx.fillRect(cx + 5, cy + 1, 6, 1);
  ctx.fillRect(cx + 5, cy + 2, 5, 1);
  ctx.fillRect(cx + 5, cy + 3, 4, 1);
}

function checkCheckpoints() {
  const p = player;
  for (const cp of checkpoints) {
    if (cp.activated) continue;
    if (p.x < cp.x + 12 && p.x + p.w > cp.x && p.y < cp.y + 20 && p.y + p.h > cp.y) {
      cp.activated = true;
      START.x = cp.x;
      START.y = cp.y - p.h;
      hudMessage = 'CHECKPOINT';
      hudMessageTimer = 1.5;
    }
  }
}
```

## Тест:
- [ ] Флажок серый → белый при активации
- [ ] После смерти респаун на чекпоинте
- [ ] HUD показывает CHECKPOINT
