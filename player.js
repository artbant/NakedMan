// NUKED MAN — player.js
// Голый мужик в шляпе. Вид СО СПИНЫ — всегда повёрнут к нам задом.
// bbox 15×24 px. Анатомия (вид сзади):
//   Шляпа: y=0-3 (круглая макушка + круглые поля)
//   Голова: y=4-8 (без лица, без глаз — только затылок)
//   Плечи/торс: y=9-14
//   Поясница: y=15
//   Задница: y=16-18 (две округлости)
//   Ноги: y=18-22
//   Ступни: y=23
//   ХЕР: 1-2 px между ног на уровне y=18-20, болтается при беге

const player = {
  x: 2 * 24 + 4, y: 0,
  vx: 0, vy: 0, w: 15, h: 24,
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

// ── ПРИМИТИВЫ ─────────────────────────────────────────────────────────

// Шляпа со спины — узкая высокая тулья + широкие поля с промежутком
function drawHat(px, py) {
  ctx.fillStyle = '#fff';
  // Верхняя тулья — узкая, высокая: 3×3 по центру
  ctx.fillRect(px + 6, py, 3, 3);
  // Поля — широкие, отдельно внизу, с промежутком
  ctx.fillRect(px + 1, py + 3, 13, 1);
}

// Голова со спины — только затылок, без глаз.
function drawHeadBack(px, py, squash) {
  const headH = Math.max(3, Math.round(5 * squash));
  const headYofs = 5 - headH;
  ctx.fillStyle = '#fff';
  // Затылок — овал 9×headH
  ctx.fillRect(px + 3, py + 4 + headYofs, 9, headH);
}

// Торс со спины — плечи + грудная клетка + талия
// Явное сужение силуэта к поясу — как у твоего эскиза
function drawTorsoBack(px, py, bendX) {
  ctx.fillStyle = '#fff';
  // y=9: плечи (13 широких)
  ctx.fillRect(px + 1 + bendX, py + 9, 13, 1);
  // y=10: плечи (самые широкие 15)
  ctx.fillRect(px + bendX, py + 10, 15, 1);
  // y=11: грудная клетка (13 px)
  ctx.fillRect(px + 1 + bendX, py + 11, 13, 1);
  // y=12: сужение (11 px)
  ctx.fillRect(px + 2 + bendX, py + 12, 11, 1);
  // y=13: талия (9 px)
  ctx.fillRect(px + 3 + bendX, py + 13, 9, 1);
  // y=14: талия (9 px)
  ctx.fillRect(px + 3 + bendX, py + 14, 9, 1);
}

// Задница — расширяется от узкой талии. Две круглых ягодицы с V-разрезом.
function drawButt(px, py) {
  ctx.fillStyle = '#fff';
  // y=15: расширение после талии — широкий пояс (13 px)
  ctx.fillRect(px + 1, py + 15, 13, 1);
  // y=16: попа начинает округляться, появляется узкий разрез в центре (1 px)
  ctx.fillRect(px + 1, py + 16, 6, 1);
  ctx.fillRect(px + 8, py + 16, 6, 1);
  // y=17: разрез расширяется до 3 px (V)
  ctx.fillRect(px + 2, py + 17, 4, 1);
  ctx.fillRect(px + 9, py + 17, 4, 1);
  // Чёрные точки V-разреза
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 7, py + 16, 1, 1);   // узкая вершина
  ctx.fillRect(px + 6, py + 17, 3, 1);   // расширение
}

// Ноги — обе видны, каждая 2 пикселя шириной. Между ними зазор.
// step: -1/0/+1 определяет кадр "бега" (при виде со спины тоже применимо)
function drawLegs(px, py, step) {
  ctx.fillStyle = '#fff';
  // Левая нога x=4-5, правая x=9-10. Зазор между ними x=6-8 (3 пикс).
  if (step === 0) {
    // стоят ровно
    ctx.fillRect(px + 4, py + 18, 2, 5);
    ctx.fillRect(px + 9, py + 18, 2, 5);
    // ступни
    ctx.fillRect(px + 3, py + 23, 3, 1);
    ctx.fillRect(px + 9, py + 23, 3, 1);
  } else if (step === 1) {
    // правая приподнята
    ctx.fillRect(px + 4, py + 18, 2, 5);
    ctx.fillRect(px + 9, py + 18, 2, 4);
    ctx.fillRect(px + 3, py + 23, 3, 1);
    ctx.fillRect(px + 9, py + 22, 3, 1);
  } else {
    ctx.fillRect(px + 4, py + 18, 2, 4);
    ctx.fillRect(px + 9, py + 18, 2, 5);
    ctx.fillRect(px + 3, py + 22, 3, 1);
    ctx.fillRect(px + 9, py + 23, 3, 1);
  }
}

// ХЕР — 1 пиксель в зазоре между ногами. swing: фаза болтания (-1..+1)
function drawDick(px, py, swing) {
  ctx.fillStyle = '#fff';
  const dx = Math.round(swing);
  // Зазор между ног на x=6-8, ставим по центру x=7
  ctx.fillRect(px + 7 + dx, py + 18, 1, 2);
}

// Руки по бокам — свисают сверху плеч до талии
function drawArmsDown(px, py) {
  ctx.fillStyle = '#fff';
  // Левая и правая — 2×6, от y=10 до y=15
  ctx.fillRect(px, py + 10, 2, 6);
  ctx.fillRect(px + 13, py + 10, 2, 6);
}

function drawArmsSwinging(px, py, step) {
  ctx.fillStyle = '#fff';
  if (step === 1) {
    // одна рука впереди (в bendX), другая сзади
    ctx.fillRect(px, py + 9, 2, 4);
    ctx.fillRect(px + 13, py + 11, 2, 5);
  } else if (step === -1) {
    ctx.fillRect(px, py + 11, 2, 5);
    ctx.fillRect(px + 13, py + 9, 2, 4);
  } else {
    drawArmsDown(px, py);
  }
}

// ── ПОЗЫ ──────────────────────────────────────────────────────────────

// drawPoseIdle — точный перенос SVG-эскиза пользователя (stay.svg, 15×24).
// Анатомия:
//   Шляпа: y=0-3 (четыре яруса: поля вверху, дуга, широкие поля, самая широкая линия)
//   Голова: y=5-7 (9×3 со скруглением)
//   Плечи/торс: y=9-11 (9→11→13 расширение)
//   Руки: y=12-16 (отдельные стойки по 1 px с зазором от тела)
//   Торс: y=12-16 (9 px шириной)
//   Попа + V-разрез: y=15-18
//   Ноги: y=19-22 (1 px шириной каждая)
//   Ступни: y=23 (2 px расширены наружу)
function drawPoseIdle(px, py, flip, t) {
  const bob = Math.round(Math.sin(t * 2) * 0.3);
  const y = py + bob;
  ctx.fillStyle = '#fff';
  // y=0: поля шляпы (7 px по центру) — 4-10
  ctx.fillRect(px + 4, y, 7, 1);
  // y=1: дуга полей (края)
  ctx.fillRect(px + 3, y + 1, 3, 1);
  ctx.fillRect(px + 9, y + 1, 3, 1);
  // y=2: нижняя часть (9 px)
  ctx.fillRect(px + 3, y + 2, 9, 1);
  // y=3: самая широкая (15 px)
  ctx.fillRect(px, y + 3, 15, 1);
  // y=5-6: голова (9×2)
  ctx.fillRect(px + 3, y + 5, 9, 2);
  // y=7: низ головы (7 px, скруглён)
  ctx.fillRect(px + 4, y + 7, 7, 1);
  // y=9: плечи (9 px)
  ctx.fillRect(px + 3, y + 9, 9, 1);
  // y=10: плечи шире (11)
  ctx.fillRect(px + 2, y + 10, 11, 1);
  // y=11: плечи максимум (13)
  ctx.fillRect(px + 1, y + 11, 13, 1);
  // y=12-14: руки по бокам (1 px стойки) + торс с зазором
  for (let row = 12; row <= 14; row++) {
    ctx.fillRect(px + 1, y + row, 1, 1);       // левая рука
    ctx.fillRect(px + 3, y + row, 9, 1);       // торс (9 px)
    ctx.fillRect(px + 13, y + row, 1, 1);      // правая рука
  }
  // y=15: попа начинается — `..##.###.##..` → 2 сегмента + центр
  ctx.fillRect(px + 3, y + 15, 2, 1);   // левая ягодица (верх)
  ctx.fillRect(px + 6, y + 15, 3, 1);   // центр (соединяющий мост)
  ctx.fillRect(px + 10, y + 15, 2, 1);  // правая ягодица (верх)
  // y=16: `.#.###.#.###.#.` — руки + попа с тонким центральным разрезом
  ctx.fillRect(px + 1, y + 16, 1, 1);         // левая рука
  ctx.fillRect(px + 3, y + 16, 3, 1);         // левая ягодица
  ctx.fillRect(px + 7, y + 16, 1, 1);         // центральный мост
  ctx.fillRect(px + 9, y + 16, 3, 1);         // правая ягодица
  ctx.fillRect(px + 13, y + 16, 1, 1);        // правая рука
  // y=17: `...####.####...` — попа с чётким разрезом
  ctx.fillRect(px + 3, y + 17, 4, 1);
  ctx.fillRect(px + 8, y + 17, 4, 1);
  // y=18: та же попа
  ctx.fillRect(px + 3, y + 18, 4, 1);
  ctx.fillRect(px + 8, y + 18, 4, 1);
  // y=19: ноги сходятся — `...###...###...`
  ctx.fillRect(px + 3, y + 19, 3, 1);
  ctx.fillRect(px + 9, y + 19, 3, 1);
  // y=20-22: тонкие ноги по 1 px каждая
  for (let row = 20; row <= 22; row++) {
    ctx.fillRect(px + 3, y + row, 1, 1);
    ctx.fillRect(px + 11, y + row, 1, 1);
  }
  // y=23: ступни (2 px расширены наружу)
  ctx.fillRect(px + 2, y + 23, 2, 1);
  ctx.fillRect(px + 11, y + 23, 2, 1);

  // Если курит — рука поднята к голове + сигарета + дым
  if (player._smoking) {
    // Стираем правую свисающую руку (y=12-16 x=13)
    ctx.fillStyle = '#000';
    for (let row = 12; row <= 16; row++) ctx.fillRect(px + 13, y + row, 1, 1);
    // Рисуем поднятую руку: плечо → вверх → к голове
    ctx.fillStyle = '#fff';
    const handX = flip ? px + 1 : px + 13;
    // предплечье идёт от плеча к голове диагонально
    ctx.fillRect(handX, y + 11, 1, 1);  // из плеча
    const midX = flip ? px + 2 : px + 12;
    ctx.fillRect(midX, y + 9, 1, 2);    // вверх
    const tipX = flip ? px + 3 : px + 11;
    ctx.fillRect(tipX, y + 8, 1, 1);    // у головы
    // Сигарета торчит от кисти
    const cigX = flip ? tipX - 1 : tipX + 1;
    ctx.fillStyle = '#fff';
    ctx.fillRect(cigX, y + 8, 1, 1);
    // Тлеющий кончик мерцает
    if (Math.floor(t * 3) % 2 === 0) {
      ctx.fillRect(cigX + (flip ? -1 : 1), y + 8, 1, 1);
    }
    // Дым — 3 точки восходящие
    const smokeBaseX = cigX + (flip ? -1 : 1);
    const smokeBaseY = y + 8;
    for (let i = 0; i < 3; i++) {
      const phase = (t * 0.8 + i * 0.33) % 1;
      if (phase > 0.9) continue;
      const dy = -Math.round(phase * 10);
      const dx = Math.round(Math.sin(phase * Math.PI * 2 + i) * 2);
      ctx.globalAlpha = (1 - phase) * 0.7;
      ctx.fillRect(smokeBaseX + dx, smokeBaseY + dy, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// ── БЕГ И СПРИНТ В ПРОФИЛЬ ───────────────────────────────────────
// Когда игрок бежит — мы видим его сбоку (в профиль).
// flip=false: бежит вправо, лицом вправо.
// flip=true: бежит влево, лицом влево.

// Шляпа в профиль — плоский силуэт сбоку (две ступени)
function drawHatProfile(px, py, flip) {
  ctx.fillStyle = '#fff';
  // Тулья — 5×3 со смещением в зависимости от flip
  ctx.fillRect(px + 5, py, 5, 3);
  // Поля — широкие, но в профиль немного смещены вперёд
  ctx.fillRect(px + 1, py + 3, 13, 1);
}

// Голова в профиль — с одним глазом + намёк на нос
function drawHeadProfile(px, py, flip) {
  ctx.fillStyle = '#fff';
  // Голова 9×5
  ctx.fillRect(px + 3, py + 4, 9, 5);
  // Нос — 1 пиксель торчит в сторону flip
  if (flip) {
    ctx.fillRect(px + 2, py + 6, 1, 1);
  } else {
    ctx.fillRect(px + 12, py + 6, 1, 1);
  }
  // Один глаз — спереди (в направлении facing)
  ctx.fillStyle = '#000';
  if (flip) {
    ctx.fillRect(px + 4, py + 5, 1, 1);
  } else {
    ctx.fillRect(px + 10, py + 5, 1, 1);
  }
}

// Торс в профиль — узкий силуэт
function drawTorsoProfile(px, py, flip, lean) {
  ctx.fillStyle = '#fff';
  // lean — наклон вперёд (при беге 1, при спринте 2)
  const leanX = flip ? -lean : lean;
  // Шея/плечи
  ctx.fillRect(px + 4 + leanX, py + 9, 7, 1);
  // Туловище
  ctx.fillRect(px + 3 + leanX, py + 10, 9, 1);
  ctx.fillRect(px + 4 + leanX, py + 11, 7, 1);
  ctx.fillRect(px + 4 + leanX, py + 12, 7, 1);
  ctx.fillRect(px + 4 + leanX, py + 13, 7, 1);
  ctx.fillRect(px + 4 + leanX, py + 14, 7, 1);
  // пояс
  ctx.fillRect(px + 4, py + 15, 7, 1);
}

// Рука в профиль — машет. phase: -1 / 0 / +1
// phase=+1 рука вперёд, -1 назад, 0 нейтрально
function drawArmProfile(px, py, flip, phase) {
  ctx.fillStyle = '#fff';
  const dir = flip ? -1 : 1;
  if (phase > 0) {
    // Рука вперёд — плечо у корпуса, кисть впереди
    const shoulderX = flip ? px + 4 : px + 10;
    const handX = flip ? px + 1 : px + 12;
    ctx.fillRect(shoulderX, py + 10, 2, 2);
    ctx.fillRect(handX, py + 11, 2, 3);
  } else if (phase < 0) {
    // Рука назад
    const shoulderX = flip ? px + 10 : px + 4;
    const handX = flip ? px + 12 : px + 1;
    ctx.fillRect(shoulderX, py + 10, 2, 2);
    ctx.fillRect(handX, py + 11, 2, 3);
  } else {
    // Средний кадр — руки близко к телу
    ctx.fillRect(px + 3, py + 11, 2, 3);
    ctx.fillRect(px + 10, py + 11, 2, 3);
  }
}

// Ноги в профиль — шагают. stepFrame: 0 / 1 / 2 / 3 (4-кадровый цикл)
function drawLegsProfile(px, py, flip, stepFrame) {
  ctx.fillStyle = '#fff';
  const dir = flip ? -1 : 1;
  // pos0: нейтральное положение (обе ноги вместе)
  // step 0: передняя нога впереди, задняя назад
  // step 1: ноги сходятся
  // step 2: передняя назад, задняя впереди
  // step 3: ноги сходятся
  if (stepFrame === 0) {
    // Передняя нога вперёд
    const frontX = flip ? px + 3 : px + 10;
    const backX  = flip ? px + 10 : px + 3;
    ctx.fillRect(frontX, py + 17, 2, 5);
    ctx.fillRect(backX, py + 17, 2, 4);
    ctx.fillRect(frontX - 1, py + 22, 3, 1);
    ctx.fillRect(backX + (flip ? 1 : -1), py + 21, 3, 1);
    // Ступни
    ctx.fillRect(frontX - 1, py + 23, 4, 1);
    ctx.fillRect(backX, py + 22, 3, 1);
  } else if (stepFrame === 2) {
    // Задняя нога впереди
    const frontX = flip ? px + 10 : px + 3;
    const backX  = flip ? px + 3 : px + 10;
    ctx.fillRect(frontX, py + 17, 2, 5);
    ctx.fillRect(backX, py + 17, 2, 4);
    ctx.fillRect(frontX - 1, py + 22, 3, 1);
    ctx.fillRect(backX + (flip ? 1 : -1), py + 21, 3, 1);
    ctx.fillRect(frontX - 1, py + 23, 4, 1);
    ctx.fillRect(backX, py + 22, 3, 1);
  } else {
    // Средний кадр — ноги сошлись
    ctx.fillRect(px + 5, py + 17, 2, 5);
    ctx.fillRect(px + 8, py + 17, 2, 5);
    ctx.fillRect(px + 4, py + 23, 4, 1);
    ctx.fillRect(px + 8, py + 23, 4, 1);
  }
}

// Хер болтается в профиль — трясётся горизонтально
function drawDickProfile(px, py, flip, swing) {
  ctx.fillStyle = '#fff';
  const dx = Math.round(swing);
  const dir = flip ? -1 : 1;
  // В профиль — висит сбоку, торчит чуть вперёд
  const baseX = flip ? px + 5 : px + 8;
  ctx.fillRect(baseX + dx, py + 16, 1, 2);
  ctx.fillRect(baseX + dx + dir, py + 17, 1, 1);
}

function drawPoseRun(px, py, flip, t) {
  // 4-кадровый цикл в профиль
  const step = Math.floor(t * 10) % 4;
  const bob = (step === 1 || step === 3) ? -1 : 0;

  drawHatProfile(px, py + bob, flip);
  drawHeadProfile(px, py + bob, flip);
  drawTorsoProfile(px, py + bob, flip, 1);
  // Руки противоходом к ногам
  if (step === 0) {
    // передняя нога вперёд → передняя рука НАЗАД
    drawArmProfile(px, py + bob, flip, -1);
  } else if (step === 2) {
    drawArmProfile(px, py + bob, flip, 1);
  } else {
    drawArmProfile(px, py + bob, flip, 0);
  }
  drawLegsProfile(px, py, flip, step);
  // Хер трясётся
  const swing = Math.sin(t * 20) * 1.5;
  drawDickProfile(px, py, flip, swing);
}

function drawPoseSprint(px, py, flip, t) {
  // Как run, но быстрее и с сильным наклоном
  const step = Math.floor(t * 14) % 4;
  const bob = (step === 1 || step === 3) ? -1 : 0;

  drawHatProfile(px, py + bob, flip);
  drawHeadProfile(px, py + bob, flip);
  drawTorsoProfile(px, py + bob, flip, 2);
  // Обе руки назад при спринте
  drawArmProfile(px, py + bob, flip, -1);
  drawLegsProfile(px, py, flip, step);
  const swing = Math.sin(t * 28) * 2;
  drawDickProfile(px, py, flip, swing);
}

function drawPoseJumpUp(px, py, flip) {
  // только прыгнул — тело вытянуто, руки чуть подняты
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // Руки подняты
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 6, 2, 5);
  ctx.fillRect(px + 13, py + 6, 2, 5);
  drawButt(px, py);
  // Ноги — одна согнута, другая вытянута
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 3, py + 18, 4, 4);
  ctx.fillRect(px + 8, py + 18, 4, 5);
  ctx.fillRect(px + 2, py + 22, 5, 1);
  ctx.fillRect(px + 8, py + 23, 5, 1);
  drawDick(px, py, 0);
}

function drawPoseJumpPeak(px, py, flip) {
  // пик прыжка — ноги раскиданы в стороны (классическая поза прыжка)
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // Руки раскинуты
  ctx.fillStyle = '#fff';
  ctx.fillRect(px - 1, py + 10, 3, 2);
  ctx.fillRect(px + 13, py + 10, 3, 2);
  drawButt(px, py);
  // Ноги раскинуты шире
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 18, 4, 4);
  ctx.fillRect(px + 10, py + 18, 4, 4);
  ctx.fillRect(px, py + 22, 5, 1);
  ctx.fillRect(px + 10, py + 22, 5, 1);
  // ХЕР болтается
  drawDick(px, py, 0);
}

function drawPoseJumpDown(px, py, flip) {
  // падает — руки по бокам, ноги прямые вниз
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  drawArmsDown(px, py);
  drawButt(px, py);
  drawLegs(px, py, 0);
  // падая, хер отклоняется чуть назад (вверх т.к. падаем)
  drawDick(px, py, Math.random() - 0.5);
}

function drawPoseLand(px, py, flip) {
  // приземление — тело сжато вниз, ноги раскинуты
  drawHat(px, py + 2);
  drawHeadBack(px, py + 2, 0.7);
  // сжатый торс
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 11, 13, 1);
  ctx.fillRect(px, py + 12, 15, 2);
  ctx.fillRect(px + 1, py + 14, 13, 1);
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 7, py + 12, 1, 2);
  // задница чуть видна
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 2, py + 15, 5, 2);
  ctx.fillRect(px + 8, py + 15, 5, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 7, py + 15, 1, 2);
  // ноги раскинуты широко
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 17, 2, 5);
  ctx.fillRect(px + 12, py + 17, 2, 5);
  ctx.fillRect(px, py + 22, 4, 2);
  ctx.fillRect(px + 11, py + 22, 4, 2);
  drawDick(px, py, 0);
}

// (прежний bendX-helper убран — не нужен)

function drawPoseCrouch(px, py, flip) {
  // присел — голова ниже, задница ближе к полу
  drawHat(px, py + 4);
  drawHeadBack(px, py + 4, 1);
  // короткий торс
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 11, 13, 3);
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 7, py + 11, 1, 3);
  // задница
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 14, 6, 2);
  ctx.fillRect(px + 8, py + 14, 6, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(px + 7, py + 14, 1, 2);
  // согнутые ноги
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 2, py + 16, 4, 2);
  ctx.fillRect(px + 9, py + 16, 4, 2);
  ctx.fillRect(px + 1, py + 18, 5, 1);
  ctx.fillRect(px + 9, py + 18, 5, 1);
  // руки прижаты к телу
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 12, 2, 3);
  ctx.fillRect(px + 13, py + 12, 2, 3);
  drawDick(px, py - 2, 0);
}

function drawPosePunchWindup(px, py, flip) {
  // замах — тело слегка повёрнуто, одна рука отведена назад (видна как культя сбоку)
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, flip ? -1 : 1);
  // задняя рука (противоположная от удара) — внутри, у тела
  ctx.fillStyle = '#fff';
  const backArmX = flip ? px + 13 : px;
  ctx.fillRect(backArmX, py + 10, 2, 5);
  // передняя рука (бьющая) отведена назад — торчит в противоположную от удара сторону
  const retrX = flip ? px + 1 : px + 12;
  ctx.fillRect(retrX, py + 10, 2, 4);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPosePunchHit(px, py, flip) {
  // удар — рука вытянута в сторону цели
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, flip ? 1 : -1); // корпус поворачивается в сторону удара
  // задняя рука — внутри
  ctx.fillStyle = '#fff';
  const backArmX = flip ? px + 13 : px;
  ctx.fillRect(backArmX, py + 10, 2, 5);
  // бьющая рука — выходит за bbox в сторону facing
  const dir = flip ? -1 : 1;
  const armStart = flip ? px - 2 : px + 15;
  ctx.fillRect(armStart, py + 10, 2, 3);
  ctx.fillRect(armStart + dir * 2, py + 10, 2, 3);
  // кулак
  ctx.fillRect(armStart + dir * 4, py + 10, 3, 3);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPosePunchRecover(px, py, flip) {
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // бьющая рука чуть вытянута (промежуточная фаза)
  ctx.fillStyle = '#fff';
  const dir = flip ? -1 : 1;
  const armStart = flip ? px - 1 : px + 14;
  ctx.fillRect(armStart, py + 11, 2, 3);
  const backArmX = flip ? px + 13 : px;
  ctx.fillRect(backArmX, py + 10, 2, 5);
  drawButt(px, py);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPoseDownPunch(px, py, flip) {
  // ↓+Z — в воздухе, кулак вниз
  drawHat(px, py);
  drawHeadBack(px, py, 1);
  drawTorsoBack(px, py, 0);
  // Руки: одна поднята, другая с кулаком вниз
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 5, 2, 6);
  // Рука вниз с кулаком
  ctx.fillRect(px + 6, py + 15, 3, 8);
  ctx.fillRect(px + 5, py + 22, 5, 2);
  drawButt(px, py);
  // Ноги подтянуты
  ctx.fillStyle = '#fff';
  ctx.fillRect(px + 1, py + 18, 3, 3);
  ctx.fillRect(px + 11, py + 18, 3, 3);
}

function drawPoseUpPunch(px, py, flip) {
  // прыжок+Z — кулак вверх
  drawHat(px, py + 3);
  drawHeadBack(px, py + 3, 1);
  drawTorsoBack(px, py + 3, 0);
  // Одна рука опущена, другая с кулаком вверх
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 13, 2, 5);
  // рука вверх
  ctx.fillRect(px + 6, py - 2, 3, 10);
  ctx.fillRect(px + 5, py - 4, 5, 2);
  drawButt(px, py + 3);
  drawLegs(px, py, 0);
  drawDick(px, py, 0);
}

function drawPoseHurt(px, py, flip) {
  // Получил урон — корпус отшатнулся, голова назад (но со спины это = голова дёрнулась)
  drawHat(px, py + 1);
  drawHeadBack(px, py + 1, 1);
  drawTorsoBack(px, py + 1, flip ? -2 : 2);
  // Руки болтаются
  ctx.fillStyle = '#fff';
  ctx.fillRect(px, py + 12, 2, 4);
  ctx.fillRect(px + 13, py + 12, 2, 4);
  drawButt(px, py + 1);
  drawLegs(px, py + 1, 0);
  drawDick(px, py + 1, 0);
}

function drawPoseDeath(px, py, flip, dtimer) {
  const t = Math.min(1, dtimer / 0.4);
  if (t < 1) {
    // Падает лицом вниз (со спины видим как ложится)
    const offY = Math.round(t * 12);
    drawHat(px, py + offY);
    drawHeadBack(px, py + offY, 1 - t * 0.3);
    ctx.fillStyle = '#fff';
    const tt = Math.round(t * 6);
    ctx.fillRect(px + 1, py + 10 + tt, 13, 3);
    ctx.fillRect(px + 2, py + 14 + tt, 5, 2);
    ctx.fillRect(px + 8, py + 14 + tt, 5, 2);
    ctx.fillRect(px + 2, py + 17 + tt, 4, Math.max(1, 5 - tt));
    ctx.fillRect(px + 9, py + 17 + tt, 4, Math.max(1, 5 - tt));
  } else {
    // Полностью лежит на животе — мы видим спину + попу + ноги
    ctx.fillStyle = '#fff';
    // Шляпа скатилась рядом
    ctx.fillRect(px + 11, py + 20, 4, 1);
    ctx.fillRect(px + 10, py + 21, 5, 1);
    // Голова слева (или справа если flip)
    const bodyX = flip ? px + 2 : px;
    ctx.fillRect(bodyX, py + 20, 3, 3);
    // Плечи и спина — длинный прямоугольник
    ctx.fillRect(bodyX + 3, py + 20, 5, 3);
    // Попа — чуть выпирает
    ctx.fillRect(bodyX + 7, py + 19, 3, 4);
    // Ноги
    ctx.fillRect(bodyX + 9, py + 21, 3, 2);
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
