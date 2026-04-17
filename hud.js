// NUKED MAN — hud.js
// Пиксельный шрифт, сердца, HUD, экран смерти

const GLYPHS = {
  '0':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  '1':[[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
  '2':[[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
  '3':[[1,1,1],[0,0,1],[0,1,1],[0,0,1],[1,1,1]],
  '4':[[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
  '5':[[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
  '6':[[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
  '7':[[1,1,1],[0,0,1],[0,1,0],[0,1,0],[0,1,0]],
  '8':[[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
  '9':[[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
  'A':[[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'B':[[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
  'C':[[0,1,1],[1,0,0],[1,0,0],[1,0,0],[0,1,1]],
  'D':[[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
  'E':[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,1,1]],
  'F':[[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
  'G':[[0,1,1],[1,0,0],[1,0,1],[1,0,1],[0,1,1]],
  'H':[[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
  'I':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
  'J':[[0,1,1],[0,0,1],[0,0,1],[1,0,1],[1,1,1]],
  'K':[[1,0,1],[1,1,0],[1,1,0],[1,0,1],[1,0,1]],
  'L':[[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
  'M':[[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
  'N':[[1,0,1],[1,1,1],[1,1,1],[1,0,1],[1,0,1]],
  'O':[[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  'P':[[1,1,0],[1,0,1],[1,1,0],[1,0,0],[1,0,0]],
  'R':[[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
  'S':[[0,1,1],[1,0,0],[0,1,0],[0,0,1],[1,1,0]],
  'T':[[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
  'U':[[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
  'V':[[1,0,1],[1,0,1],[1,0,1],[0,1,0],[0,1,0]],
  'W':[[1,0,1],[1,0,1],[1,1,1],[1,1,1],[1,0,1]],
  'Q':[[1,1,1],[1,0,1],[1,0,1],[1,1,0],[0,0,1]],
  'X':[[1,0,1],[1,0,1],[0,1,0],[1,0,1],[1,0,1]],
  'Y':[[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  'Z':[[1,1,1],[0,0,1],[0,1,0],[1,0,0],[1,1,1]],
  '.':[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,1,0]],
  ',':[[0,0,0],[0,0,0],[0,0,0],[0,1,0],[1,0,0]],
  '!':[[0,1,0],[0,1,0],[0,1,0],[0,0,0],[0,1,0]],
  '?':[[1,1,0],[0,0,1],[0,1,0],[0,0,0],[0,1,0]],
  ':':[[0,0,0],[0,1,0],[0,0,0],[0,1,0],[0,0,0]],
  "'":[[0,1,0],[0,1,0],[0,0,0],[0,0,0],[0,0,0]],
  '+':[[0,0,0],[0,1,0],[1,1,1],[0,1,0],[0,0,0]],
  '-':[[0,0,0],[0,0,0],[1,1,1],[0,0,0],[0,0,0]],
  ' ':[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
};

// pixelText: если col передан (не null/undefined) — ставим как fillStyle.
// Если col === null — оставляем fillStyle как есть (нужно для fade эффектов
// через rgba(...) выставленные снаружи).
function pixelText(txt, x, y, col, scale = 1) {
  if (col !== null && col !== undefined) ctx.fillStyle = col;
  let cx = x;
  for (const ch of txt.toUpperCase()) {
    const g = GLYPHS[ch];
    if (!g) { cx += 4 * scale; continue; }
    const W = g[0].length;
    for (let row = 0; row < g.length; row++)
      for (let col2 = 0; col2 < W; col2++)
        if (g[row][col2]) ctx.fillRect(cx + col2 * scale, y + row * scale, scale, scale);
    cx += (W + 1) * scale;
  }
}

function pixelHeart(x, y, col) {
  const g = [[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]];
  ctx.fillStyle = col || '#fff';
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[r].length; c++)
      if (g[r][c]) ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
}


// Рисуем текст с чёрной обводкой — читается на любом фоне (белом, чёрном, дизеринг).
// Сначала выставляем чёрный и печатаем со сдвигом ±1 по x/y, потом основной цвет сверху.
function pixelTextOutlined(txt, x, y, col, scale = 1) {
  const prev = ctx.fillStyle;
  ctx.fillStyle = '#000';
  for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    pixelText(txt, x + dx, y + dy, '#000', scale);
  }
  pixelText(txt, x, y, col, scale);
  ctx.fillStyle = prev;
}

// Сердце с тонкой чёрной обводкой — контрастно на любом фоне.
function pixelHeartOutlined(x, y, col) {
  // "полный" глиф сердца
  const g = [[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]];
  // маска обводки: 1px вокруг заполненных клеток. Рисуем эту маску чёрным,
  // потом заливаем основное сердце белым поверх.
  ctx.fillStyle = '#000';
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      if (!g[r][c]) continue;
      // рисуем 3×3 блок чёрным вокруг каждого пикселя
      ctx.fillRect(x + c * 2 - 1, y + r * 2 - 1, 4, 4);
    }
  }
  // основной белый сверху
  ctx.fillStyle = col || '#fff';
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[r].length; c++)
      if (g[r][c]) ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
}

// Маленький пустой контур сердца — для max capacity отображения
function pixelHeartEmpty(x, y) {
  const g = [[0,1,0,1,0],[1,1,1,1,1],[1,1,1,1,1],[0,1,1,1,0],[0,0,1,0,0]];
  ctx.fillStyle = '#000';
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      if (!g[r][c]) continue;
      ctx.fillRect(x + c * 2 - 1, y + r * 2 - 1, 4, 4);
    }
  }
  // внутри — чёрное (пустое), внешняя обводка видна
  // рисуем белые точки только по внешнему контуру (имитация пустого сердца)
  // для простоты — просто рисуем глиф с меньшей плотностью
  // Внутренняя "дыра": заливаем серым дизером
  for (let r = 0; r < g.length; r++) {
    for (let c = 0; c < g[r].length; c++) {
      if (!g[r][c]) continue;
      // рамка: если на краю глифа — белый, если внутри — чёрный
      const isEdge = r === 0 || r === g.length - 1 || c === 0 || c === g[r].length - 1 ||
                     !g[r-1]?.[c] || !g[r+1]?.[c] || !g[r]?.[c-1] || !g[r]?.[c+1];
      ctx.fillStyle = isEdge ? '#fff' : '#000';
      ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
    }
  }
}

// Иконка сигареты 6×2 — компактная, для speedboost полоски
function drawCigIcon(x, y) {
  ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, 8, 4); // обводка
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 5, 2);        // корпус
  ctx.fillStyle = '#000'; ctx.fillRect(x + 5, y, 1, 2);    // кончик
}

// ── СЧЁТЧИКИ СЕССИИ ───────────────────────────────────────────────
// Используем зафиксированные total из initEnemies/initHostages — не
// зависим от удаления умерших сущностей из массивов.
function countEnemies() {
  const total = game.enemiesTotal || 0;
  const killed = game.enemiesKilled || 0;
  return [total - killed, total]; // живых / всего
}
function countHostages() {
  const total = game.hostagesTotal || 0;
  const saved = game.rescuedHostages || 0;
  return [saved, total];
}

// Кнопка музыки — иконка ноты (on) или ноты с крестом (off).
// Область 14×10 с отступом 1px обводки.
function drawMusicButton(x, y) {
  // фон кнопки — тонкая обводка, полупрозрачная заливка для кликабельности
  ctx.fillStyle = '#000'; ctx.fillRect(x - 1, y - 1, 16, 12);
  ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 14, 10);

  // иконка ноты — квадратик (головка) + вертикальная палочка
  ctx.fillStyle = '#000';
  // головка ноты
  ctx.fillRect(x + 3, y + 5, 4, 3);
  // палочка
  ctx.fillRect(x + 6, y + 2, 1, 4);
  // флажок
  ctx.fillRect(x + 7, y + 2, 2, 1);
  ctx.fillRect(x + 8, y + 3, 1, 1);

  // если музыка выключена — рисуем диагональный крест
  if (!game.musicOn) {
    ctx.fillStyle = '#000';
    // диагональ с верхне-левого в нижне-правый угол
    for (let i = 0; i < 10; i++) {
      ctx.fillRect(x + 2 + i, y + i, 1, 1);
    }
  }
}

// Рисует 2 слайдера громкости: музыка и sfx. Позиция: под кнопкой музыки.
// Каждый слайдер: "M" иконка + рельс 30×3 + заполненная часть.
// Клик/тап обрабатывается в handleCanvasTap (см. game.js).
function drawVolumeSliders(x, y) {
  const trackW = 30, trackH = 3;
  // ── MUSIC слайдер ─────────────────────────────────
  pixelTextOutlined('M', x, y, '#fff', 1);
  ctx.fillStyle = '#000'; ctx.fillRect(x + 5, y + 1, trackW + 2, trackH + 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, y + 2, trackW, trackH);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 6, y + 2, Math.round(trackW * (game.musicVolume || 0)), trackH);
  // ── SFX слайдер ──────────────────────────────────
  const y2 = y + 8;
  pixelTextOutlined('S', x, y2, '#fff', 1);
  ctx.fillStyle = '#000'; ctx.fillRect(x + 5, y2 + 1, trackW + 2, trackH + 2);
  ctx.fillStyle = '#fff'; ctx.fillRect(x + 6, y2 + 2, trackW, trackH);
  ctx.fillStyle = '#000';
  ctx.fillRect(x + 6, y2 + 2, Math.round(trackW * (game.sfxVolume || 0)), trackH);
}

function drawHUD() {
  // ── СЕРДЦА — только те что есть. Пустые не рисуем. ─────────────
  for (let i = 0; i < player.lives; i++) {
    const hx = 3 + i * 13;
    pixelHeartOutlined(hx, 3, '#fff');
  }

  // ── КНОПКА МУЗЫКИ — правый верхний угол ────────────────────
  drawMusicButton(GW - 18, 2);

  // ── СЛАЙДЕРЫ ГРОМКОСТИ — под кнопкой музыки ────────────────
  // Область для тапов: см. handleCanvasTap в game.js
  drawVolumeSliders(GW - 44, 15);

  // ── SCORE по центру вверху ──────────────────────────────────────
  if (game.score > 0) {
    const scoreText = String(game.score);
    pixelTextOutlined(scoreText, GW / 2 - scoreText.length * 2, 3, '#fff', 1);
  }

  // ── СЧЁТЧИКИ: живые враги слева, заложники справа ──────────────
  const [eAlive, eTotal] = countEnemies();
  if (eTotal > 0) {
    // формат: ×N / M
    const t = eAlive + '/' + eTotal;
    // маленький значок врага: квадратик 4×4 с глазами
    const iconX = 3, iconY = 16;
    ctx.fillStyle = '#000'; ctx.fillRect(iconX - 1, iconY - 1, 6, 6);
    ctx.fillStyle = '#fff'; ctx.fillRect(iconX, iconY, 4, 4);
    ctx.fillStyle = '#000'; ctx.fillRect(iconX + 1, iconY + 1, 1, 1); ctx.fillRect(iconX + 2, iconY + 1, 1, 1);
    pixelTextOutlined(t, iconX + 7, iconY, '#fff', 1);
  }

  // (счётчики заложников в HUD больше не показываем — они идут в экран победы)

  // ── ПОЛОСКА SPEEDBOOST с иконкой и обводкой ────────────────────
  if (player.speedBoost > 0) {
    const barY = GH - 8;
    const barW = 40, barH = 3;
    const barX = 12;
    // обводка
    ctx.fillStyle = '#000'; ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
    // фон полоски
    ctx.fillStyle = '#fff'; ctx.fillRect(barX, barY, barW, barH);
    // пустая часть — чёрная
    const filled = Math.round(player.speedBoost / 5 * barW);
    ctx.fillStyle = '#000'; ctx.fillRect(barX + filled, barY, barW - filled, barH);
    // иконка слева
    drawCigIcon(3, barY);
  }

  // ── HUD-СООБЩЕНИЯ (fade) с обводкой ─────────────────────────────
  if (game.hudMessageTimer > 0) {
    const alpha = Math.min(1, game.hudMessageTimer);
    // обводка чёрная всегда непрозрачная, чтобы читался контур
    ctx.fillStyle = '#000';
    const msgX = GW - 38 - game.hudMessage.length * 5;
    const msgY = GH - 16;
    for (const [dx, dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
      pixelText(game.hudMessage, msgX + dx, msgY + dy, '#000', 1);
    }
    // основной текст с fade
    ctx.fillStyle = `rgba(228,228,228,${alpha.toFixed(2)})`;
    pixelText(game.hudMessage, msgX, msgY, null, 1);
  }
}

function drawDeath() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, GW, GH);
  const blink = Math.floor(Date.now() / 500) % 2 === 0;
  if (player.lives <= 0) {
    pixelText('GAME OVER', GW / 2 - 36, GH / 2 - 10, '#fff', 2);
    if (blink) pixelText('NEW LEVEL ON JUMP', GW / 2 - 51, GH / 2 + 14, '#fff', 1);
  } else {
    pixelText('YOU DIED', GW / 2 - 32, GH / 2 - 10, '#fff', 2);
    pixelText(String(player.lives) + ' LIVES LEFT', GW / 2 - 33, GH / 2 + 8, '#fff', 1);
    if (blink) pixelText('JUMP TO RETRY', GW / 2 - 39, GH / 2 + 20, '#fff', 1);
  }
}

function drawVictory() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, GW, GH);

  function ctext(txt, y, col, sc) {
    pixelText(txt, Math.round(GW/2 - txt.length * (sc||1) * 2.5), y, col, sc||1);
  }

  ctext('YOU MADE IT', GH/2 - 40, '#fff', 2);
  ctext('SCORE ' + game.score, GH/2 - 10, '#fff', 1);
  ctext('TIME ' + (typeof fmtTime === 'function' ? fmtTime(game.levelTimer) : ''), GH/2, '#fff', 1);

  // рекорды
  if (typeof game.bestScore !== 'undefined' && game.bestScore > 0) {
    ctext('BEST SCORE ' + game.bestScore, GH/2 + 12, '#fff', 1);
  }
  if (typeof game.bestTime !== 'undefined' && game.bestTime !== null) {
    ctext('BEST TIME ' + fmtTime(game.bestTime), GH/2 + 22, '#fff', 1);
  }

  // индикация побитого рекорда (мигает)
  if (game.levelTimer <= (game.bestTime || Infinity) + 0.01 && Math.floor(Date.now() / 300) % 2 === 0) {
    ctext('NEW BEST TIME', GH/2 + 34, '#fff', 1);
  }

  if (Math.floor(Date.now() / 500) % 2 === 0)
    ctext('JUMP FOR NEW LEVEL', GH - 14, '#fff', 1);
}

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, GW, GH);
  pixelText('PAUSE', GW / 2 - 20, GH / 2 - 6, '#fff', 2);
  pixelText('ESC TO RESUME', GW / 2 - 39, GH / 2 + 14, '#fff', 1);
}

function drawTitle() {
  // чисто чёрный фон, никаких дизерингов
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GW, GH);

  // название
  pixelTextOutlined('NUKED', GW/2 - 52, GH/2 - 40, '#fff', 4);
  pixelTextOutlined('MAN', GW/2 - 28, GH/2, '#fff', 4);

  const sub = 'a man. a hat. another dimension.';
  pixelTextOutlined(sub, GW/2 - sub.length * 2, GH/2 + 36, '#fff', 1);

  if (Math.floor(Date.now() / 500) % 2 === 0) {
    pixelTextOutlined('JUMP TO START', GW/2 - 39, GH/2 + 52, '#fff', 1);
  }

  // рекорды внизу экрана — если есть
  if (typeof game.bestScore !== 'undefined' && game.bestScore > 0) {
    const t = 'BEST SCORE ' + game.bestScore;
    pixelTextOutlined(t, GW/2 - t.length * 2, GH - 18, '#fff', 1);
  }
  if (typeof game.bestTime !== 'undefined' && game.bestTime !== null) {
    const t = 'BEST TIME ' + fmtTime(game.bestTime);
    pixelTextOutlined(t, GW/2 - t.length * 2, GH - 10, '#fff', 1);
  }
}
