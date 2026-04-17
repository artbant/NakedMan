# ЭТАП 8 — Полировка и звук

## Звук через Web Audio API (без файлов!)
```js
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
  if (!audioCtx) audioCtx = new AudioCtx();
}

function playSound(type) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  if (type === 'jump') {
    osc.frequency.setValueAtTime(200, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);

  } else if (type === 'punch') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
    osc.start(); osc.stop(audioCtx.currentTime + 0.1);

  } else if (type === 'pickup') {
    osc.frequency.setValueAtTime(400, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
    osc.start(); osc.stop(audioCtx.currentTime + 0.15);

  } else if (type === 'death') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(300, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
    osc.start(); osc.stop(audioCtx.currentTime + 0.4);
  }
}

// инициализировать при первом нажатии:
window.addEventListener('keydown', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });
```

## Экран паузы (ESC):
```js
let paused = false;

window.addEventListener('keydown', e => {
  if (e.code === 'Escape') paused = !paused;
});

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, GW, GH);
  pixelText('PAUSE', GW / 2 - 17, GH / 2 - 6, '#E4E4E4', 2);
  pixelText('ESC TO RESUME', GW / 2 - 39, GH / 2 + 14, '#888', 1);
}

// в game loop:
if (paused) { drawPause(); requestAnimationFrame(loop); return; }
```

## Счёт убитых врагов:
```js
let score = 0;

// при смерти врага:
score++;

// в drawHUD():
pixelText(String(score), GW - 10 - score.toString().length * 5, 3, '#E4E4E4', 1);
```

## Экран смерти с анимацией:
```js
function drawDeath() {
  const alpha = Math.min(player.dtimer / 0.5, 0.88);
  ctx.fillStyle = `rgba(0,0,0,${alpha})`;
  ctx.fillRect(0, 0, GW, GH);

  if (player.dtimer > 0.6) {
    pixelText('YOU DIED', GW / 2 - 32, GH / 2 - 10, '#E4E4E4', 2);
  }
  if (player.dtimer > 1.2) {
    pixelText('JUMP TO RETRY', GW / 2 - 39, GH / 2 + 14, '#888', 1);
  }
}
```

## Тест:
- [ ] Звук прыжка
- [ ] Звук удара
- [ ] Звук подбора предмета
- [ ] Звук смерти
- [ ] ESC пауза работает
- [ ] Счёт отображается в HUD
- [ ] Экран смерти появляется плавно
