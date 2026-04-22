// NUKED MAN — player.js
// Голый мужик в шляпе. Вид со спины в idle/jump/punch, в профиль при беге.
// bbox 18×36 px. Анатомия:
//   Шляпа: y=0-5 (тулья + промежуток + поля)
//   Голова: y=7-11
//   Плечи/торс: y=13-22
//   Попа: y=23-26
//   Ноги: y=27-33
//   Ступни: y=34-35

const player = {
  x: 2 * 24 + 4, y: 0,
  vx: 0, vy: 0, w: 18, h: 36,
  onGround: false, facing: 1,
  lives: 3, dead: false, dtimer: 0,
  state: 'idle', frame: 0, ftick: 0, bobt: 0, bobY: 0,
  punching: false, ptimer: 0, pframe: 0, pcooldown: 0,
  speedBoost: 0, invTimer: 0,
  coyoteTimer: 0, jumpBufferTimer: 0, crouching: false,
  airJumps: 0, maxAirJumps: 1,
  _animT: 0, _landTimer: 0, _upPunch: false, _downPunch: false,
};

const START = { x: 2 * 24 + 4, y: 0 };

// ── ПРИМИТИВЫ (вид со спины) ──────────────────────────────────────────

// Шляпа — два яруса с промежутком
function drawHat(px, py) {
  ctx.fillStyle = '#fff';
  // Тулья 4×2
  ctx.fillRect(px + 7, py, 4, 2);
  ctx.fillRect(px + 6, py + 2, 6, 1);
  // Поля (широкие)
  ctx.fillRect(px + 3, py + 3, 12, 1);
  ctx.fillRect(px, py + 4, 18, 2);
}

// Голова со спины — овал, без лица
function drawHeadBack(px, py, squash) {
  const headH = Math.max(4, Math.round(5 * squash));
  const headYofs = 5 - headH;
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 3, py + 7 + headYofs, 12, headH);
}

// Торс со спины — плечи расширяются, талия сужается
function drawTorsoBack(px, py, bendX) {
  ctx.fillStyle = '#fff';
  // y=13: плечи начинаются (12 px)
  ctx.fillRect(px + 3 + bendX, py + 13, 12, 1);
  // y=14-15: плечи на максимум (16 px, края)
  ctx.fillRect(px + 1 + bendX, py + 14, 16, 2);
  // y=16-17: грудная клетка (14 px)
  ctx.fillRect(px + 2 + bendX, py + 16, 14, 2);
  // y=18-20: сужение к талии (12 → 10)
  ctx.fillRect(px + 3 + bendX, py + 18, 12, 1);
  ctx.fillRect(px + 4 + bendX, py + 19, 10, 1);
  ctx.fillRect(px + 4 + bendX, py + 20, 10, 1);
  // y=21-22: талия (10 px)
  ctx.fillRect(px + 4 + bendX, py + 21, 10, 2);
}

// Задница — V-образный разрез
function drawButt(px, py) {
  ctx.fillStyle = '#fff';
  // y=23: расширение после талии
  ctx.fillRect(px + 2, py + 23, 14, 1);
  // y=24: ягодицы с узким разрезом в центре (2 px)
  ctx.fillRect(px + 2, py + 24, 7, 1);
  ctx.fillRect(px + 9, py + 24, 7, 1);
  // y=25: разрез шире (3 px)
  ctx.fillRect(px + 2, py + 25, 6, 1);
  ctx.fillRect(px + 10, py + 25, 6, 1);
  // y=26: разрез ещё шире (4 px)
  ctx.fillRect(px + 3, py + 26, 5, 1);
  ctx.fillRect(px + 10, py + 26, 5, 1);
  // V-разрез (чёрные тени)
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 8, py + 24, 1, 1);
  ctx.fillRect(px + 8, py + 25, 2, 1);
  ctx.fillRect(px + 8, py + 26, 2, 1);
}

// Ноги — 2 px шириной каждая, с зазором
function drawLegs(px, py, step) {
  ctx.fillStyle = '#fff';
  if (step === 0) {
    // стоят ровно — обе ноги одинаково
    ctx.fillRect(px + 4, py + 27, 3, 7);
    ctx.fillRect(px + 11, py + 27, 3, 7);
    // ступни
    ctx.fillRect(px + 3, py + 34, 5, 2);
    ctx.fillRect(px + 10, py + 34, 5, 2);
  } else if (step === 1) {
    // правая приподнята
    ctx.fillRect(px + 4, py + 27, 3, 7);
    ctx.fillRect(px + 11, py + 27, 3, 6);
    ctx.fillRect(px + 3, py + 34, 5, 2);
    ctx.fillRect(px + 10, py + 33, 5, 2);
  } else {
    ctx.fillRect(px + 4, py + 27, 3, 6);
    ctx.fillRect(px + 11, py + 27, 3, 7);
    ctx.fillRect(px + 3, py + 33, 5, 2);
    ctx.fillRect(px + 10, py + 34, 5, 2);
  }
}

// ХЕР — в зазоре между ногами
function drawDick(px, py, swing) {
  ctx.fillStyle = '#fff';
  const dx = Math.round(swing);
  ctx.fillRect(px + 8 + dx, py + 27, 2, 3);
}

// Руки — свисают по бокам
function drawArmsDown(px, py) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 14, 2, 9);
  ctx.fillRect(px + 16, py + 14, 2, 9);
}

function drawArmsSwinging(px, py, step) {
  ctx.fillStyle = '#fff';
  if (step === 1) {
    ctx.fillRect(px, py + 13, 2, 8);
    ctx.fillRect(px + 16, py + 15, 2, 9);
  } else if (step === -1) {
    ctx.fillRect(px, py + 15, 2, 9);
    ctx.fillRect(px + 16, py + 13, 2, 8);
  } else {
    drawArmsDown(px, py);
  }
}

// ── ПОЗЫ ──────────────────────────────────────────────────────────────

function drawPoseIdle(px, py, flip, t) {
  const bob = Math.round(Math.sin(t * 2) * 0.3);
  drawHat(px, py + bob);
  drawHeadBack(px, py + bob, 1);
  drawTorsoBack(px, py + bob, 0);
  drawArmsDown(px, py + bob);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, Math.sin(t * 2) * 0.5);

  // Курение — рука поднята к голове с сигаретой
  if (player._smoking) {
    // Стираем правую свисающую руку
    ctx.fillStyle = '#000';
    ctx.fillRect(px + 16, py + bob + 14, 2, 9);
    // Рисуем поднятую руку согнутую
    ctx.fillStyle = '#fff';
    const handX = flip ? px + 1 : px + 15;
    const midX = flip ? px + 3 : px + 13;
    const tipX = flip ? px + 4 : px + 12;
    ctx.fillRect(handX, py + bob + 14, 2, 3);  // плечо
    ctx.fillRect(midX, py + bob + 10, 2, 4);   // предплечье
    ctx.fillRect(tipX, py + bob + 9, 2, 2);    // кисть
    // Сигарета
    const cigX = flip ? tipX - 2 : tipX + 2;
    ctx.fillRect(cigX, py + bob + 9, 1, 1);
    // Тлеющий кончик
    if (Math.floor(t * 3) % 2 === 0) {
      ctx.fillRect(cigX + (flip ? -1 : 1), py + bob + 9, 1, 1);
    }
    // Дым
    const smokeBaseX = cigX + (flip ? -1 : 1);
    const smokeBaseY = py + bob + 9;
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.8 + i * 0.33) % 1;
      if (phase > 0.9) continue;
      const dy = -Math.round(phase * 12);
      const dx = Math.round(Math.sin(phase * Math.PI * 2 + i) * 2);
      ctx.globalAlpha = (1 - phase) * 0.7;
      ctx.fillRect(smokeBaseX + dx, smokeBaseY + dy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// ── БЕГ/СПРИНТ В ПРОФИЛЬ ──────────────────────────────────────────────

function drawHatProfile(px, py, flip) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 7, py, 4, 2);
  ctx.fillRect(px + 6, py + 2, 6, 1);
  ctx.fillRect(px + 3, py + 3, 12, 1);
  ctx.fillRect(px, py + 4, 18, 2);
}

function drawHeadProfile(px, py, flip) {
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 4, py + 7, 10, 5);
  // Нос
  if (flip) ctx.fillRect(px + 3, py + 9, 1, 1);
  else ctx.fillRect(px + 14, py + 9, 1, 1);
  // Глаз
  ctx.fillStyle = '#000';
  if (flip) ctx.fillRect(px + 5, py + 8, 1, 1);
  else ctx.fillRect(px + 12, py + 8, 1, 1);
}

function drawTorsoProfile(px, py, flip, lean) {
  ctx.fillStyle = '#fff';
  const leanX = flip ? -lean : lean;
  // Плечи
  ctx.fillRect(px + 4 + leanX, py + 13, 10, 1);
  ctx.fillRect(px + 3 + leanX, py + 14, 12, 2);
  // Туловище
  ctx.fillRect(px + 4 + leanX, py + 16, 10, 2);
  ctx.fillRect(px + 5 + leanX, py + 18, 8, 2);
  ctx.fillRect(px + 5 + leanX, py + 20, 8, 2);
  // Пояс
  ctx.fillRect(px + 5, py + 22, 8, 1);
  // Попа
  ctx.fillRect(px + 4, py + 23, 10, 3);
}

function drawArmProfile(px, py, flip, phase) {
  ctx.fillStyle = '#fff';
  if (phase > 0) {
    const handX = flip ? px + 1 : px + 15;
    ctx.fillRect(flip ? px + 5 : px + 13, py + 14, 2, 2);
    ctx.fillRect(handX, py + 15, 2, 5);
  } else if (phase < 0) {
    const handX = flip ? px + 15 : px + 1;
    ctx.fillRect(flip ? px + 13 : px + 5, py + 14, 2, 2);
    ctx.fillRect(handX, py + 15, 2, 5);
  } else {
    ctx.fillRect(px + 4, py + 15, 2, 5);
    ctx.fillRect(px + 12, py + 15, 2, 5);
  }
}

function drawLegsProfile(px, py, flip, stepFrame) {
  ctx.fillStyle = '#fff';
  if (stepFrame === 0) {
    const frontX = flip ? px + 4 : px + 11;
    const backX  = flip ? px + 11 : px + 4;
    ctx.fillRect(frontX, py + 26, 3, 8);
    ctx.fillRect(backX, py + 26, 3, 6);
    ctx.fillRect(frontX - 1, py + 34, 5, 2);
    ctx.fillRect(backX, py + 32, 5, 2);
  } else if (stepFrame === 2) {
    const frontX = flip ? px + 11 : px + 4;
    const backX  = flip ? px + 4 : px + 11;
    ctx.fillRect(frontX, py + 26, 3, 8);
    ctx.fillRect(backX, py + 26, 3, 6);
    ctx.fillRect(frontX - 1, py + 34, 5, 2);
    ctx.fillRect(backX, py + 32, 5, 2);
  } else {
    ctx.fillRect(px + 6, py + 26, 3, 8);
    ctx.fillRect(px + 10, py + 26, 3, 8);
    ctx.fillRect(px + 5, py + 34, 5, 2);
    ctx.fillRect(px + 10, py + 34, 5, 2);
  }
}

function drawDickProfile(px, py, flip, swing) {
  ctx.fillStyle = '#fff';
  const dx = Math.round(swing);
  const dir = flip ? -1 : 1;
  const baseX = flip ? px + 6 : px + 10;
  ctx.fillRect(baseX + dx, py + 24, 1, 3);
  ctx.fillRect(baseX + dx + dir, py + 26, 1, 1);
}

function drawPoseRun(px, py, flip, t) {
  const step = Math.floor(t * 10) % 4;
  const bob = (step === 1 || step === 3) ? -1 : 0;
  drawHatProfile(px, py + bob, flip);
  drawHeadProfile(px, py + bob, flip);
  drawTorsoProfile(px, py + bob, flip, 1);
  if (step === 0) drawArmProfile(px, py + bob, flip, -1);
  else if (step === 2) drawArmProfile(px, py + bob, flip, 1);
  else drawArmProfile(px, py + bob, flip, 0);
  drawLegsProfile(px, py, flip, step);
  drawDickProfile(px, py, flip, Math.sin(t * 20) * 1.5);
}

function drawPoseSprint(px, py, flip, t) {
  const step = Math.floor(t * 14) % 4;
  const bob = (step === 1 || step === 3) ? -1 : 0;
  drawHatProfile(px, py + bob, flip);
  drawHeadProfile(px, py + bob, flip);
  drawTorsoProfile(px, py + bob, flip, 2);
  drawArmProfile(px, py + bob, flip, -1);
  drawLegsProfile(px, py, flip, step);
  drawDickProfile(px, py, flip, Math.sin(t * 28) * 2);
}

// ── ОСТАЛЬНЫЕ ПОЗЫ (вид со спины) ─────────────────────────────────────

function drawPoseJumpUp(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // Руки подняты вверх
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 9, 2, 6);
  ctx.fillRect(px + 16, py + 9, 2, 6);
  drawButt(px, py);
  // Ноги подтянуты
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 4, py + 27, 3, 5);
  ctx.fillRect(px + 11, py + 27, 3, 6);
  ctx.fillRect(px + 3, py + 32, 5, 1);
  ctx.fillRect(px + 10, py + 33, 5, 1);
  drawDick(px, py, 0);
}

function drawPoseJumpPeak(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // Руки раскинуты
  ctx.fillStyle = '#fff';
  ctx.fillRect(px - 1, py + 14, 3, 3);
  ctx.fillRect(px + 16, py + 14, 3, 3);
  drawButt(px, py);
  // Ноги шире
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 2, py + 27, 3, 6);
  ctx.fillRect(px + 13, py + 27, 3, 6);
  ctx.fillRect(px + 1, py + 33, 5, 1);
  ctx.fillRect(px + 12, py + 33, 5, 1);
  drawDick(px, py, 0);
}

function drawPoseJumpDown(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  drawArmsDown(px, py);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, Math.random() - 0.5);
}

function drawPoseLand(px, py, flip) {
  drawHat(px, py + 3);
  drawHeadBack(px, py + 3, 0.7);
  // Сжатый торс
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 16, 16, 2);
  ctx.fillRect(px + 2, py + 18, 14, 2);
  ctx.fillRect(px + 3, py + 20, 12, 2);
  // Задница ближе к земле
  ctx.fillRect(px + 2, py + 22, 14, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 8, py + 22, 2, 2);
  // Ноги раскинуты широко
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 24, 3, 8);
  ctx.fillRect(px + 14, py + 24, 3, 8);
  ctx.fillRect(px, py + 32, 4, 2);
  ctx.fillRect(px + 14, py + 32, 4, 2);
  ctx.fillRect(px, py + 34, 4, 2);
  ctx.fillRect(px + 14, py + 34, 4, 2);
  drawDick(px, py, 0);
}

function drawPoseCrouch(px, py, flip) {
  // Присел — всё сжато
  drawHat(px, py + 6);
  drawHeadBack(px, py + 6, 1);
  // Короткий торс
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 17, 16, 3);
  ctx.fillRect(px + 2, py + 20, 14, 3);
  // Попа
  ctx.fillRect(px + 2, py + 23, 6, 2);
  ctx.fillRect(px + 10, py + 23, 6, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 8, py + 23, 2, 2);
  // Согнутые ноги
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 3, py + 25, 4, 5);
  ctx.fillRect(px + 11, py + 25, 4, 5);
  ctx.fillRect(px + 2, py + 30, 5, 2);
  ctx.fillRect(px + 11, py + 30, 5, 2);
  // Прижаты к телу руки
  ctx.fillRect(px, py + 17, 2, 5);
  ctx.fillRect(px + 16, py + 17, 2, 5);
}

function drawPosePunchWindup(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, flip ? -1 : 1);
  // Задняя рука у тела
  ctx.fillStyle = '#fff';
  const backArmX = flip ? px + 16 : px;
  ctx.fillRect(backArmX, py + 14, 2, 8);
  // Передняя рука отведена назад (замах)
  const retrX = flip ? px + 1 : px + 15;
  ctx.fillRect(retrX, py + 13, 2, 6);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPosePunchHit(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, flip ? 1 : -1);
  // Задняя рука
  ctx.fillStyle = '#fff';
  const backArmX = flip ? px + 16 : px;
  ctx.fillRect(backArmX, py + 14, 2, 8);
  // Бьющая рука вытянута вперёд
  const dir = flip ? -1 : 1;
  const armStart = flip ? px - 3 : px + 18;
  ctx.fillRect(armStart, py + 14, 3, 3);
  ctx.fillRect(armStart + dir * 3, py + 14, 3, 3);
  // Кулак
  ctx.fillRect(armStart + dir * 6, py + 13, 4, 4);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPosePunchRecover(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // Задняя рука
  ctx.fillStyle = '#fff';
  const backArmX = flip ? px + 16 : px;
  ctx.fillRect(backArmX, py + 14, 2, 8);
  // Передняя рука 50% вытянута
  const dir = flip ? -1 : 1;
  const armStart = flip ? px - 1 : px + 17;
  ctx.fillRect(armStart, py + 15, 2, 4);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPoseDownPunch(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // Одна рука поднята
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 7, 2, 9);
  // Вторая рука с кулаком вниз
  ctx.fillRect(px + 8, py + 22, 3, 12);
  ctx.fillRect(px + 7, py + 33, 5, 3);
  drawButt(px, py);
  // Ноги подтянуты
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 27, 3, 4);
  ctx.fillRect(px + 14, py + 27, 3, 4);
}

function drawPoseUpPunch(px, py, flip) {
  drawHat(px, py + 5);
  drawHeadBack(px, py + 5, 1);
  drawTorsoBack(px, py + 5, 0);
  // Одна рука опущена
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 19, 2, 8);
  // Вторая рука с кулаком вверх
  ctx.fillRect(px + 8, py - 3, 3, 14);
  ctx.fillRect(px + 7, py - 6, 5, 3);
  drawButt(px, py + 5);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPoseHurt(px, py, flip) {
  drawHat(px, py + 2);
  drawHeadBack(px, py + 2, 1);
  drawTorsoBack(px, py + 2, flip ? -3 : 3);
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 17, 2, 6);
  ctx.fillRect(px + 16, py + 17, 2, 6);
  drawButt(px, py + 2);
  drawLegs(px, py + 2, 0);
  drawDick(px, py + 2, 0);
}

function drawPoseDeath(px, py, flip, dtimer) {
  const t = Math.min(1, dtimer / 0.4);
  if (t < 1) {
    // Падает лицом вниз
    const offY = Math.round(t * 18);
    drawHat(px, py + offY);
    drawHeadBack(px, py + offY, 1 - t * 0.3);
    ctx.fillStyle = '#fff';
    const tt = Math.round(t * 10);
    ctx.fillRect(px + 1, py + 14 + tt, 16, 3);
    ctx.fillRect(px + 2, py + 22 + tt, 14, 3);
    ctx.fillRect(px + 3, py + 25 + tt, 6, Math.max(1, 8 - tt));
    ctx.fillRect(px + 9, py + 25 + tt, 6, Math.max(1, 8 - tt));
  } else {
    // Лежит на животе — спина и попа видны
    ctx.fillStyle = '#fff';
    // Шляпа рядом
    ctx.fillRect(px + 13, py + 30, 5, 2);
    ctx.fillRect(px + 12, py + 32, 7, 2);
    // Тело лежит горизонтально
    const bodyX = flip ? px + 2 : px;
    ctx.fillRect(bodyX, py + 30, 4, 5);
    ctx.fillRect(bodyX + 3, py + 30, 8, 5);
    ctx.fillRect(bodyX + 10, py + 29, 4, 6);
    ctx.fillRect(bodyX + 13, py + 31, 3, 3);
  }
}

// ── DISPATCHER ────────────────────────────────────────────────────────

function drawPlayerPose(px, py, flip, p, animT) {
  if (p.dead) { drawPoseDeath(px, py, flip, p.dtimer); return; }
  if (p.punching) {
    if (p._upPunch) drawPoseUpPunch(px, py, flip);
    else if (p._downPunch) drawPoseDownPunch(px, py, flip);
    else if (p.pframe === 0) drawPosePunchWindup(px, py, flip);
    else if (p.pframe === 1) drawPosePunchHit(px, py, flip);
    else drawPosePunchRecover(px, py, flip);
    return;
  }
  if (p.invTimer > 0.6) { drawPoseHurt(px, py, flip); return; }
  if (p.crouching) { drawPoseCrouch(px, py, flip); return; }
  if (p._landTimer > 0) { drawPoseLand(px, py, flip); return; }
  if (!p.onGround) {
    if (p.vy < -80) drawPoseJumpUp(px, py, flip);
    else if (p.vy < 80) drawPoseJumpPeak(px, py, flip);
    else drawPoseJumpDown(px, py, flip);
    return;
  }
  if (game.sprintTimer > 1.0) { drawPoseSprint(px, py, flip, animT); return; }
  if (Math.abs(p.vx) > 10) { drawPoseRun(px, py, flip, animT); return; }
  drawPoseIdle(px, py, flip, animT);
}

// ── ФИЗИКА ────────────────────────────────────────────────────────────

function collide(p, dt) {
  p.x += p.vx * dt;
  if (p.vx > 0) {
    if (solid(p.x + p.w, p.y + 2) || solid(p.x + p.w, p.y + p.h - 2))
      { p.x = Math.floor((p.x + p.w) / T) * T - p.w; p.vx = 0; }
  } else if (p.vx < 0) {
    if (solid(p.x, p.y + 2) || solid(p.x, p.y + p.h - 2))
      { p.x = Math.ceil(p.x / T) * T; p.vx = 0; }
  }
  p.y += p.vy * dt;
  const wasInAir = !p.onGround;
  const fallSpeed = p.vy;
  p.onGround = false;
  if (p.vy >= 0) {
    if (solid(p.x + 2, p.y + p.h) || solid(p.x + p.w - 3, p.y + p.h))
      { p.y = Math.floor((p.y + p.h) / T) * T - p.h; p.vy = 0; p.onGround = true; }
  } else if (p.vy < 0) {
    if (solid(p.x + 2, p.y) || solid(p.x + p.w - 3, p.y))
      { p.y = Math.ceil(p.y / T) * T; p.vy = 0; }
  }
  if (wasInAir && p.onGround && fallSpeed > 180) {
    p._landTimer = 0.15;
  }
}

function punchBreakTiles() {
  const p = player;
  const hitX = p.facing > 0 ? p.x + p.w + 2 : p.x - 2;
  breakTile(hitX, p.y + 2);
  breakTile(hitX, p.y + p.h * 0.33);
  breakTile(hitX, p.y + p.h * 0.66);
  const isDown = (typeof keys !== 'undefined') && (keys['ArrowDown'] || keys['KeyS']);
  if (isDown) {
    const underX = p.x + p.w / 2;
    breakTile(underX, p.y + p.h + 2);
    breakTile(underX, p.y + p.h + T * 0.5);
    p._downPunch = true;
  } else {
    p._downPunch = false;
  }
  if (p.vy < -50) {
    const overX = p.x + p.w / 2;
    breakTile(overX, p.y - 2);
    breakTile(overX, p.y - T * 0.5);
    p._upPunch = true;
  } else {
    p._upPunch = false;
  }
  p.vx = p.facing > 0 ? -25 : 25;
}

function drawPlayer() {
  const p = player;
  const px = Math.round(p.x - game.cam);
  const py = Math.round(p.y);
  const flip = p.facing < 0;
  const invBlink = p.invTimer > 0 && p.invTimer < 0.6 &&
                   Math.floor(p.invTimer * 12) % 2 === 0;
  if (invBlink) return;
  drawPlayerPose(px, py, flip, p, p._animT || 0);
}
