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
  'Y':[[1,0,1],[1,0,1],[0,1,0],[0,1,0],[0,1,0]],
  ' ':[[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]],
};

function pixelText(txt, x, y, col, scale = 1) {
  ctx.fillStyle = col || '#E4E4E4';
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
  ctx.fillStyle = col || '#E4E4E4';
  for (let r = 0; r < g.length; r++)
    for (let c = 0; c < g[r].length; c++)
      if (g[r][c]) ctx.fillRect(x + c * 2, y + r * 2, 2, 2);
}

let hudMessage = '';
let currentLevel = 1;
let hudMessageTimer = 0;

function drawHUD() {
  for (let i = 0; i < player.lives; i++) pixelHeart(3 + i * 14, 3, '#E4E4E4');
  pixelText('LVL ' + currentLevel, GW - 38, 3, '#E4E4E4', 1);
  if (score > 0) pixelText(String(score), GW / 2 - 4, 3, '#888', 1);
  if (player.speedBoost > 0) {
    ctx.fillStyle = '#444';
    ctx.fillRect(3, 16, 40, 2);
    ctx.fillStyle = '#E4E4E4';
    ctx.fillRect(3, 16, Math.round(player.speedBoost / 5 * 40), 2);
  }
  if (hudMessageTimer > 0) {
    const alpha = Math.min(1, hudMessageTimer);
    ctx.fillStyle = `rgba(228,228,228,${alpha.toFixed(2)})`;
    pixelText(hudMessage, GW - 38 - hudMessage.length * 5, 12, null, 1);
  }
}

function drawDeath() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, GW, GH);
  if (player.lives <= 0) {
    pixelText('GAME OVER', GW / 2 - 36, GH / 2 - 10, '#E4E4E4', 2);
    pixelText('NEW LEVEL ON JUMP', GW / 2 - 51, GH / 2 + 14, '#888', 1);
  } else {
    pixelText('YOU DIED', GW / 2 - 32, GH / 2 - 10, '#E4E4E4', 2);
    pixelText(String(player.lives) + ' LIVES LEFT', GW / 2 - 33, GH / 2 + 8, '#888', 1);
    pixelText('JUMP TO RETRY', GW / 2 - 39, GH / 2 + 20, '#555', 1);
  }
}

function drawVictory() {
  ctx.fillStyle = 'rgba(0,0,0,0.88)';
  ctx.fillRect(0, 0, GW, GH);

  function ctext(txt, y, col, sc) {
    pixelText(txt, Math.round(GW/2 - txt.length * (sc||1) * 2.5), y, col, sc||1);
  }

  ctext('YOU MADE IT', GH/2 - 30, '#E4E4E4', 2);
  ctext('SCORE ' + score, GH/2 + 6, '#888', 1);
  if (typeof rescuedHostages !== 'undefined' && rescuedHostages > 0)
    ctext('SAVED ' + rescuedHostages, GH/2 + 16, '#888', 1);
  ctext('JUMP FOR NEW LEVEL', GH/2 + 30, '#555', 1);
}

function drawPause() {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, GW, GH);
  pixelText('PAUSE', GW / 2 - 20, GH / 2 - 6, '#E4E4E4', 2);
  pixelText('ESC TO RESUME', GW / 2 - 39, GH / 2 + 14, '#888', 1);
}

function drawTitle() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GW, GH);

  // звёзды
  const stars = [[40,30],[120,15],[200,45],[300,20],[400,35],[60,80],[180,70],[350,60],[450,25],[80,110],[250,90],[380,100]];
  ctx.fillStyle = '#333';
  for (const [sx, sy] of stars) ctx.fillRect(sx, sy, 1, 1);

  // название
  pixelText('NUKED', GW/2 - 52, GH/2 - 40, '#E4E4E4', 4);
  pixelText('MAN', GW/2 - 28, GH/2, '#E4E4E4', 4);

  // подзаголовок
  const sub = 'a man. a hat. another dimension.';
  pixelText(sub, GW/2 - sub.length * 2, GH/2 + 36, '#555', 1);

  // мигающий prompt
  if (Math.floor(Date.now() / 500) % 2 === 0) {
    pixelText('JUMP TO START', GW/2 - 39, GH/2 + 52, '#888', 1);
  }
}
