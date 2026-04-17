# ЭТАП 7 — Мобильное управление

## index.html — мобильные кнопки:
```html
<div id="mob" style="display:none; position:fixed; bottom:0; left:0; right:0; padding:12px 16px; justify-content:space-between; align-items:flex-end;">

  <!-- Левый джойстик -->
  <div style="display:flex;gap:8px;">
    <button id="bl" class="btn-mob" style="width:60px;height:60px;font-size:24px;">◀</button>
    <button id="br" class="btn-mob" style="width:60px;height:60px;font-size:24px;">▶</button>
  </div>

  <!-- Правые кнопки -->
  <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end;">
    <button id="bp" class="btn-mob" style="width:56px;height:56px;font-size:13px;border-color:#fff;">HIT</button>
    <button id="bj" class="btn-mob" style="width:64px;height:64px;font-size:13px;">JUMP</button>
  </div>
</div>

<style>
.btn-mob {
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.4);
  background: rgba(255,255,255,0.08);
  color: #fff;
  font-family: monospace;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}
</style>
```

## game.js — подключение кнопки HIT:
```js
const mk = { l: false, r: false, j: false, punch: false };

// добавить для bp:
const bp = document.getElementById('bp');
if (bp) {
  bp.addEventListener('touchstart', e => { e.preventDefault(); mk.punch = true; }, { passive: false });
  bp.addEventListener('touchend',   e => { e.preventDefault(); mk.punch = false; }, { passive: false });
}

// в isPunch():
const isPunch = () => keys['KeyZ'] || keys['KeyX'] || mk.punch;
```

## Ориентация экрана:
```html
<!-- в <head>: -->
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">

<style>
  /* принудительно landscape на мобиле */
  @media screen and (max-width: 600px) and (orientation: portrait) {
    body::before {
      content: 'Поверни телефон';
      position: fixed; inset: 0;
      background: #000; color: #fff;
      display: flex; align-items: center; justify-content: center;
      font-family: monospace; font-size: 18px;
      z-index: 999;
    }
  }
</style>
```

## Тест:
- [ ] Кнопки видны на мобиле
- [ ] Движение работает
- [ ] Прыжок работает
- [ ] Удар работает
- [ ] В portrait — подсказка повернуть телефон
