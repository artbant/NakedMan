// Nuked Man — pure canvas, fillRect only, no antialiasing.
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const W = canvas.width;   // 320
  const H = canvas.height;  // 180
  const TILE = 24;

  // ---------- Player sprite (15x24) ----------
  const STAY = [
    [4,0,7],[3,1,3],[9,1,3],[3,2,9],[0,3,15],
    [3,5,9],[3,6,9],[4,7,7],
    [3,9,9],[2,10,11],[1,11,13],
    [1,12,1],[3,12,9],[13,12,1],
    [1,13,1],[3,13,9],[13,13,1],
    [1,14,1],[3,14,9],[13,14,1],
    [3,15,2],[6,15,3],[10,15,2],
    [1,16,1],[3,16,3],[7,16,1],[11,16,3],[13,16,1],
    [3,17,4],[8,17,4],[3,18,4],[8,18,4],
    [3,19,3],[11,19,3],
    [3,20,1],[13,20,1],[3,21,1],[13,21,1],[3,22,1],[13,22,1],
    [2,23,2],[12,23,2],
  ];
  const SPRITE_W = 15;
  const SPRITE_H = 24;

  function drawSprite(rows, x, y, flip) {
    ctx.fillStyle = '#fff';
    for (const [rx, ry, rw] of rows) {
      const dx = flip ? (x + (SPRITE_W - rx - rw)) : (x + rx);
      ctx.fillRect(dx | 0, (y + ry) | 0, rw, 1);
    }
  }

  // ---------- Pixel font (5x7) ----------
  const G = {};
  function defGlyph(ch, rows) {
    G[ch] = rows.map(r => r.split('').map(c => c === '1' ? 1 : 0));
  }
  defGlyph('0', ['01110','10001','10011','10101','11001','10001','01110']);
  defGlyph('1', ['00100','01100','00100','00100','00100','00100','01110']);
  defGlyph('2', ['01110','10001','00001','00010','00100','01000','11111']);
  defGlyph('3', ['11110','00001','00001','01110','00001','00001','11110']);
  defGlyph('4', ['00010','00110','01010','10010','11111','00010','00010']);
  defGlyph('5', ['11111','10000','11110','00001','00001','10001','01110']);
  defGlyph('6', ['00110','01000','10000','11110','10001','10001','01110']);
  defGlyph('7', ['11111','00001','00010','00100','01000','01000','01000']);
  defGlyph('8', ['01110','10001','10001','01110','10001','10001','01110']);
  defGlyph('9', ['01110','10001','10001','01111','00001','00010','01100']);
  defGlyph('A', ['01110','10001','10001','11111','10001','10001','10001']);
  defGlyph('B', ['11110','10001','10001','11110','10001','10001','11110']);
  defGlyph('C', ['01110','10001','10000','10000','10000','10001','01110']);
  defGlyph('D', ['11110','10001','10001','10001','10001','10001','11110']);
  defGlyph('E', ['11111','10000','10000','11110','10000','10000','11111']);
  defGlyph('F', ['11111','10000','10000','11110','10000','10000','10000']);
  defGlyph('G', ['01110','10001','10000','10111','10001','10001','01111']);
  defGlyph('H', ['10001','10001','10001','11111','10001','10001','10001']);
  defGlyph('I', ['01110','00100','00100','00100','00100','00100','01110']);
  defGlyph('J', ['00111','00010','00010','00010','00010','10010','01100']);
  defGlyph('K', ['10001','10010','10100','11000','10100','10010','10001']);
  defGlyph('L', ['10000','10000','10000','10000','10000','10000','11111']);
  defGlyph('M', ['10001','11011','10101','10101','10001','10001','10001']);
  defGlyph('N', ['10001','10001','11001','10101','10011','10001','10001']);
  defGlyph('O', ['01110','10001','10001','10001','10001','10001','01110']);
  defGlyph('P', ['11110','10001','10001','11110','10000','10000','10000']);
  defGlyph('Q', ['01110','10001','10001','10001','10101','10010','01101']);
  defGlyph('R', ['11110','10001','10001','11110','10100','10010','10001']);
  defGlyph('S', ['01111','10000','10000','01110','00001','00001','11110']);
  defGlyph('T', ['11111','00100','00100','00100','00100','00100','00100']);
  defGlyph('U', ['10001','10001','10001','10001','10001','10001','01110']);
  defGlyph('V', ['10001','10001','10001','10001','10001','01010','00100']);
  defGlyph('W', ['10001','10001','10001','10101','10101','11011','10001']);
  defGlyph('X', ['10001','10001','01010','00100','01010','10001','10001']);
  defGlyph('Y', ['10001','10001','01010','00100','00100','00100','00100']);
  defGlyph('Z', ['11111','00001','00010','00100','01000','10000','11111']);
  defGlyph(' ', ['00000','00000','00000','00000','00000','00000','00000']);
  defGlyph(':', ['00000','00100','00000','00000','00000','00100','00000']);
  defGlyph('-', ['00000','00000','00000','11111','00000','00000','00000']);

  function drawText(str, x, y) {
    ctx.fillStyle = '#fff';
    str = String(str).toUpperCase();
    for (let i = 0; i < str.length; i++) {
      const g = G[str[i]];
      if (!g) continue;
      for (let ry = 0; ry < 7; ry++) {
        for (let rx = 0; rx < 5; rx++) {
          if (g[ry][rx]) ctx.fillRect(x + i * 6 + rx, y + ry, 1, 1);
        }
      }
    }
  }

  // ---------- Heart ----------
  const HEART = [
    '01101100',
    '11111110',
    '11111110',
    '01111100',
    '00111000',
    '00010000',
  ];
  function drawHeart(x, y) {
    ctx.fillStyle = '#fff';
    for (let ry = 0; ry < HEART.length; ry++) {
      for (let rx = 0; rx < HEART[ry].length; rx++) {
        if (HEART[ry][rx] === '1') ctx.fillRect(x + rx, y + ry, 1, 1);
      }
    }
  }

  // ---------- Map ----------
  // 0 empty, 1..8 tile types
  const MAP_H = 8;
  const MAP = [
    '0000000000000000000000000000000000000000',
    '0000000000000000000000000000000000000000',
    '0000000000022200000000000000000000000000',
    '0000000000000000000000000000000000000000',
    '0000000033000000000000005500000000000000',
    '0000111000000000000444000000000000077000',
    '0000000000000666000000000000000000000000',
    '1111111122221111133333322222111118888111',
  ];
  const MAP_W = MAP[0].length;
  const WORLD_W = MAP_W * TILE;
  const WORLD_H = MAP_H * TILE;

  function tileAt(tx, ty) {
    if (tx < 0 || tx >= MAP_W || ty < 0 || ty >= MAP_H) return 0;
    const c = MAP[ty][tx];
    return c === '0' ? 0 : parseInt(c, 10);
  }
  function solid(tx, ty) { return tileAt(tx, ty) !== 0; }

  // ---------- Tile drawing (fillRect only) ----------
  function drawTile(t, x, y) {
    ctx.fillStyle = '#fff';
    switch (t) {
      case 1: // checkerboard
        for (let j = 0; j < TILE; j += 4)
          for (let i = 0; i < TILE; i += 4)
            if (((i + j) >> 2) & 1) ctx.fillRect(x + i, y + j, 4, 4);
        ctx.fillRect(x, y, TILE, 1);
        break;
      case 2: // vertical lines
        for (let i = 0; i < TILE; i += 3) ctx.fillRect(x + i, y, 1, TILE);
        ctx.fillRect(x, y, TILE, 1);
        break;
      case 3: // brick
        ctx.fillRect(x, y, TILE, 1);
        ctx.fillRect(x, y + 8, TILE, 1);
        ctx.fillRect(x, y + 16, TILE, 1);
        ctx.fillRect(x + 12, y, 1, 8);
        ctx.fillRect(x, y + 8, 1, 8);
        ctx.fillRect(x + 12, y + 16, 1, 8);
        ctx.fillRect(x + 23, y, 1, TILE);
        break;
      case 4: // diagonal stripes
        for (let k = -TILE; k < TILE; k += 4)
          for (let i = 0; i < TILE; i++) {
            const j = k + i;
            if (j >= 0 && j < TILE) ctx.fillRect(x + i, y + j, 1, 1);
          }
        ctx.fillRect(x, y, TILE, 1);
        break;
      case 5: // dot grid
        for (let j = 2; j < TILE; j += 4)
          for (let i = 2; i < TILE; i += 4)
            ctx.fillRect(x + i, y + j, 2, 2);
        ctx.fillRect(x, y, TILE, 1);
        break;
      case 6: // nested squares
        ctx.strokeStyle = '#fff';
        ctx.fillRect(x, y, TILE, 1);
        ctx.fillRect(x, y + TILE - 1, TILE, 1);
        ctx.fillRect(x, y, 1, TILE);
        ctx.fillRect(x + TILE - 1, y, 1, TILE);
        ctx.fillRect(x + 4, y + 4, TILE - 8, 1);
        ctx.fillRect(x + 4, y + TILE - 5, TILE - 8, 1);
        ctx.fillRect(x + 4, y + 4, 1, TILE - 8);
        ctx.fillRect(x + TILE - 5, y + 4, 1, TILE - 8);
        ctx.fillRect(x + 10, y + 10, 4, 4);
        break;
      case 7: // zigzag
        for (let j = 0; j < TILE; j += 6) {
          for (let i = 0; i < 6; i++) {
            ctx.fillRect(x + i, y + j + i, 1, 1);
            ctx.fillRect(x + 12 - i, y + j + i, 1, 1);
            ctx.fillRect(x + 12 + i, y + j + i, 1, 1);
            ctx.fillRect(x + TILE - 1 - i, y + j + i, 1, 1);
          }
        }
        ctx.fillRect(x, y, TILE, 1);
        break;
      case 8: // crosshatch
        for (let i = 0; i < TILE; i += 3) {
          for (let j = 0; j < TILE; j++) {
            const a = (i + j) % TILE;
            if (a < TILE) ctx.fillRect(x + a, y + j, 1, 1);
          }
        }
        ctx.fillRect(x, y, TILE, 1);
        break;
    }
  }

  // ---------- Parallax backgrounds ----------
  // Layer 3: far. Moon + monoliths.
  const FAR = [];
  for (let i = 0; i < 14; i++) {
    FAR.push({
      x: i * 90 + (i * 37) % 60,
      w: 8 + (i * 13) % 14,
      h: 30 + (i * 17) % 50,
    });
  }
  function drawFar(camX) {
    // moon
    const mx = 40 - (camX * 0.02) | 0;
    const my = 22;
    ctx.fillStyle = '#fff';
    ctx.fillRect(mx + 2, my, 8, 1);
    ctx.fillRect(mx + 1, my + 1, 10, 1);
    ctx.fillRect(mx, my + 2, 12, 8);
    ctx.fillRect(mx + 1, my + 10, 10, 1);
    ctx.fillRect(mx + 2, my + 11, 8, 1);
    // few stars
    for (let i = 0; i < 30; i++) {
      const sx = ((i * 53 - camX * 0.05) % WORLD_W + WORLD_W) % WORLD_W;
      const sy = (i * 17) % 60;
      ctx.fillRect(sx | 0, sy, 1, 1);
    }
    // monoliths anchored to ground (top of last row)
    const groundY = (MAP_H - 1) * TILE;
    for (const m of FAR) {
      const x = (m.x - camX * 0.08) | 0;
      const xx = ((x % (WORLD_W + 200)) + (WORLD_W + 200)) % (WORLD_W + 200) - 100;
      ctx.fillRect(xx, groundY - m.h, 1, m.h);
      ctx.fillRect(xx + m.w, groundY - m.h, 1, m.h);
      ctx.fillRect(xx, groundY - m.h, m.w, 1);
    }
  }

  const MID = [];
  for (let i = 0; i < 20; i++) {
    MID.push({
      x: i * 55 + (i * 23) % 30,
      w: 14 + (i * 7) % 18,
      h: 40 + (i * 19) % 70,
    });
  }
  function drawMid(camX) {
    const groundY = (MAP_H - 1) * TILE;
    for (const m of MID) {
      const x = (m.x - camX * 0.35) | 0;
      const xx = ((x % (WORLD_W + 400)) + (WORLD_W + 400)) % (WORLD_W + 400) - 200;
      const top = groundY - m.h;
      // outline
      ctx.fillStyle = '#fff';
      ctx.fillRect(xx, top, m.w, 1);
      ctx.fillRect(xx, top, 1, m.h);
      ctx.fillRect(xx + m.w - 1, top, 1, m.h);
      // diagonal interior texture (sparse)
      for (let j = 2; j < m.h - 1; j += 3) {
        for (let i = 2; i < m.w - 1; i++) {
          if (((i + j) & 3) === 0) ctx.fillRect(xx + i, top + j, 1, 1);
        }
      }
    }
  }

  // ---------- Player ----------
  const player = {
    x: 30, y: 0,
    vx: 0, vy: 0,
    w: SPRITE_W, h: SPRITE_H,
    onGround: false,
    facing: 0, // 0 = back to camera (idle), -1 left, 1 right
    lives: 3,
    spawnX: 30, spawnY: 0,
    dead: false,
    deadTimer: 0,
  };

  // find spawn Y: above first solid column
  function initSpawn() {
    for (let ty = 0; ty < MAP_H; ty++) {
      if (solid(1, ty)) { player.spawnY = ty * TILE - SPRITE_H; break; }
    }
    player.x = player.spawnX;
    player.y = player.spawnY;
  }

  function respawn() {
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0; player.vy = 0;
    player.dead = false;
    player.facing = 0;
  }

  // ---------- Input ----------
  const keys = { left: false, right: false, jump: false, punch: false };
  let jumpHeld = false;
  window.addEventListener('keydown', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = true;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = true;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      if (!jumpHeld) keys.jump = true;
      jumpHeld = true;
    }
    if (e.code === 'KeyZ') keys.punch = true;
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'ArrowLeft' || e.code === 'KeyA') keys.left = false;
    if (e.code === 'ArrowRight' || e.code === 'KeyD') keys.right = false;
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') jumpHeld = false;
    if (e.code === 'KeyZ') keys.punch = false;
  });

  function bindBtn(id, on, off) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = e => { e.preventDefault(); on(); };
    const end = e => { e.preventDefault(); off(); };
    el.addEventListener('touchstart', start, { passive: false });
    el.addEventListener('touchend', end);
    el.addEventListener('touchcancel', end);
    el.addEventListener('mousedown', start);
    el.addEventListener('mouseup', end);
    el.addEventListener('mouseleave', end);
  }
  bindBtn('bL', () => keys.left = true, () => keys.left = false);
  bindBtn('bR', () => keys.right = true, () => keys.right = false);
  bindBtn('bJ', () => { keys.jump = true; }, () => {});
  bindBtn('bP', () => keys.punch = true, () => keys.punch = false);

  // ---------- Physics ----------
  const GRAVITY = 480;
  const SPEED = 75;
  const JUMP_V = -260;
  const MAX_FALL = 600;

  function moveX(dx) {
    player.x += dx;
    const top = player.y;
    const bot = player.y + player.h - 1;
    if (dx > 0) {
      const right = player.x + player.w - 1;
      const tx = (right / TILE) | 0;
      for (let py = top; py <= bot; py += TILE) {
        if (solid(tx, (py / TILE) | 0)) {
          player.x = tx * TILE - player.w;
          return;
        }
      }
      if (solid(tx, (bot / TILE) | 0)) player.x = tx * TILE - player.w;
    } else if (dx < 0) {
      const left = player.x;
      const tx = (left / TILE) | 0;
      for (let py = top; py <= bot; py += TILE) {
        if (solid(tx, (py / TILE) | 0)) {
          player.x = (tx + 1) * TILE;
          return;
        }
      }
      if (solid(tx, (bot / TILE) | 0)) player.x = (tx + 1) * TILE;
    }
  }

  function moveY(dy) {
    player.y += dy;
    const left = player.x;
    const right = player.x + player.w - 1;
    if (dy > 0) {
      const bot = player.y + player.h - 1;
      const ty = (bot / TILE) | 0;
      for (let px = left; px <= right; px += TILE) {
        if (solid((px / TILE) | 0, ty)) {
          player.y = ty * TILE - player.h;
          player.vy = 0;
          player.onGround = true;
          return;
        }
      }
      if (solid((right / TILE) | 0, ty)) {
        player.y = ty * TILE - player.h;
        player.vy = 0;
        player.onGround = true;
      }
    } else if (dy < 0) {
      const top = player.y;
      const ty = (top / TILE) | 0;
      for (let px = left; px <= right; px += TILE) {
        if (solid((px / TILE) | 0, ty)) {
          player.y = (ty + 1) * TILE;
          player.vy = 0;
          return;
        }
      }
      if (solid((right / TILE) | 0, ty)) {
        player.y = (ty + 1) * TILE;
        player.vy = 0;
      }
    }
  }

  // ---------- Camera ----------
  let camX = 0;
  function updateCamera() {
    const target = player.x - W / 3;
    if (target > camX) camX = target; // right only
    if (camX < 0) camX = 0;
    if (camX > WORLD_W - W) camX = WORLD_W - W;
  }

  // ---------- Loop ----------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  function update(dt) {
    if (player.dead) {
      player.deadTimer -= dt;
      if (player.deadTimer <= 0) {
        player.lives = Math.max(0, player.lives - 1);
        if (player.lives <= 0) player.lives = 3;
        respawn();
      }
      return;
    }

    let ax = 0;
    if (keys.left) { ax -= 1; player.facing = -1; }
    if (keys.right) { ax += 1; player.facing = 1; }
    if (ax === 0) player.facing = 0;
    player.vx = ax * SPEED;

    if (keys.jump && player.onGround) {
      player.vy = JUMP_V;
      player.onGround = false;
    }
    keys.jump = false;

    player.vy += GRAVITY * dt;
    if (player.vy > MAX_FALL) player.vy = MAX_FALL;

    player.onGround = false;
    moveX(player.vx * dt);
    moveY(player.vy * dt);

    if (player.x < 0) player.x = 0;

    // fall death
    if (player.y > WORLD_H + 40) {
      player.dead = true;
      player.deadTimer = 0.6;
    }

    updateCamera();
  }

  function render() {
    // sky
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    drawFar(camX);
    drawMid(camX);

    // tiles (only visible)
    const startTx = Math.max(0, (camX / TILE) | 0);
    const endTx = Math.min(MAP_W, ((camX + W) / TILE | 0) + 1);
    for (let ty = 0; ty < MAP_H; ty++) {
      for (let tx = startTx; tx < endTx; tx++) {
        const t = tileAt(tx, ty);
        if (t) drawTile(t, tx * TILE - (camX | 0), ty * TILE);
      }
    }

    // player
    if (!player.dead) {
      drawSprite(STAY, (player.x - camX) | 0, player.y | 0, player.facing === -1);
    }

    // HUD
    for (let i = 0; i < player.lives; i++) drawHeart(6 + i * 11, 6);
    drawText('NUKED MAN', W - 60, 6);
  }

  initSpawn();
  requestAnimationFrame(loop);
})();
