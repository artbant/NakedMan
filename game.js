// NUKED MAN — game.js
// Главный цикл, input, update, инициализация


// ── РЕКОРДЫ В LOCALSTORAGE ────────────────────────────────────────────
// Сохраняем: лучший общий счёт и самое быстрое время прохождения уровня.
// Ключ обёрнут в try/catch — в приватном режиме браузера localStorage может
// кидать ошибку, не даём игре упасть из-за этого.
function loadRecords() {
  try {
    const bs = localStorage.getItem('nuked-man:bestScore');
    const bt = localStorage.getItem('nuked-man:bestTime');
    game.bestScore = bs ? (parseInt(bs, 10) || 0) : 0;
    game.bestTime  = bt ? (parseFloat(bt) || null) : null;
  } catch (e) { /* storage недоступен — рекордов не будет */ }
}

function saveBestScore() {
  if (game.score <= game.bestScore) return false;
  game.bestScore = game.score;
  try { localStorage.setItem('nuked-man:bestScore', String(game.bestScore)); }
  catch (e) {}
  return true;
}

function saveBestTime(seconds) {
  if (game.bestTime !== null && seconds >= game.bestTime) return false;
  game.bestTime = seconds;
  try { localStorage.setItem('nuked-man:bestTime', String(seconds)); }
  catch (e) {}
  return true;
}

// Форматирует секунды → "M:SS" или "SS.S" для коротких интервалов
function fmtTime(seconds) {
  if (seconds === null || seconds === undefined) return '--';
  if (seconds < 60) return seconds.toFixed(1) + 's';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}


// ── ЗВУК (Web Audio API) ──────────────────────────────────────────────
function initAudio() {
  if (!game.audioCtx) {
    game.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // Создаём master gain узлы — все инструменты подключаются через них.
    // Это позволяет регулировать громкость музыки и sfx независимо.
    game._musicGain = game.audioCtx.createGain();
    game._sfxGain = game.audioCtx.createGain();
    game._musicGain.connect(game.audioCtx.destination);
    game._sfxGain.connect(game.audioCtx.destination);
    // Загружаем сохранённые уровни громкости из localStorage
    try {
      const mv = localStorage.getItem('nuked-man:musicVolume');
      const sv = localStorage.getItem('nuked-man:sfxVolume');
      if (mv !== null) game.musicVolume = Math.max(0, Math.min(1, parseFloat(mv)));
      if (sv !== null) game.sfxVolume   = Math.max(0, Math.min(1, parseFloat(sv)));
    } catch (e) {}
    game._musicGain.gain.value = game.musicVolume;
    game._sfxGain.gain.value = game.sfxVolume;
  }
  if (game.audioCtx.state === 'suspended') {
    game.audioCtx.resume().catch(() => {});
  }
}

// Установить громкость и сохранить в localStorage
function setMusicVolume(v) {
  game.musicVolume = Math.max(0, Math.min(1, v));
  if (game._musicGain) game._musicGain.gain.value = game.musicVolume;
  try { localStorage.setItem('nuked-man:musicVolume', String(game.musicVolume)); } catch (e) {}
}
function setSfxVolume(v) {
  game.sfxVolume = Math.max(0, Math.min(1, v));
  if (game._sfxGain) game._sfxGain.gain.value = game.sfxVolume;
  try { localStorage.setItem('nuked-man:sfxVolume', String(game.sfxVolume)); } catch (e) {}
}
window.addEventListener('keydown', initAudio, { once: true });
window.addEventListener('touchstart', initAudio, { once: true });

// Включить/выключить ambient-музыку. Вызывается из обработчика клика по кнопке.
function toggleMusic() {
  initAudio();
  game.musicOn = !game.musicOn;
  if (game.musicOn) {
    startAmbient();
  } else {
    if (game.ambientTimer) { clearTimeout(game.ambientTimer); game.ambientTimer = null; }
  }
}

function playSound(type) {
  if (!game.audioCtx) return;
  // Если у типа есть соответствующий музыкальный стинг — играем его
  // параллельно с sfx. Стинг звучит только если музыка включена.
  const stingMap = {
    punch:   'hit',
    stomp:   'kill',
    pickup:  'pickup',
    hurt:    'hurt',
    rescue:  'rescue',
    explode: 'explode',
  };
  if (stingMap[type]) playSting(stingMap[type]);
  const o = game.audioCtx.createOscillator();
  const g = game.audioCtx.createGain();
  o.connect(g); g.connect(game._sfxGain || game.audioCtx.destination);
  const t = game.audioCtx.currentTime;
  if (type === 'jump') {
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(380, t + 0.1);
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.15);
    o.start(t); o.stop(t + 0.15);
  } else if (type === 'punch') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180, t);
    o.frequency.exponentialRampToValueAtTime(55, t + 0.07);
    g.gain.setValueAtTime(0.25, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
    o.start(t); o.stop(t + 0.1);
  } else if (type === 'hurt') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(280, t);
    o.frequency.exponentialRampToValueAtTime(60, t + 0.3);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
    o.start(t); o.stop(t + 0.35);
  } else if (type === 'pickup') {
    o.frequency.setValueAtTime(440, t);
    o.frequency.exponentialRampToValueAtTime(880, t + 0.08);
    g.gain.setValueAtTime(0.15, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    o.start(t); o.stop(t + 0.12);
  } else if (type === 'explode') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 0.4);
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.45);
    o.start(t); o.stop(t + 0.45);
  } else if (type === 'win') {
    [440, 550, 660].forEach((freq, i) => {
      const oo = game.audioCtx.createOscillator();
      const gg = game.audioCtx.createGain();
      oo.connect(gg); gg.connect(game._sfxGain || game.audioCtx.destination);
      const st = t + i * 0.12;
      oo.frequency.setValueAtTime(freq, st);
      gg.gain.setValueAtTime(0.2, st);
      gg.gain.exponentialRampToValueAtTime(0.01, st + 0.2);
      oo.start(st); oo.stop(st + 0.2);
    });
    return;
  } else if (type === 'stomp') {
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(200, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.1);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
    o.start(t); o.stop(t + 0.12);
  } else if (type === 'rescue') {
    [330, 440, 550, 660].forEach((freq, i) => {
      const oo = game.audioCtx.createOscillator();
      const gg = game.audioCtx.createGain();
      oo.connect(gg); gg.connect(game._sfxGain || game.audioCtx.destination);
      const st = t + i * 0.07;
      oo.frequency.setValueAtTime(freq, st);
      gg.gain.setValueAtTime(0.15, st);
      gg.gain.exponentialRampToValueAtTime(0.01, st + 0.1);
      oo.start(st); oo.stop(st + 0.1);
    });
    return;
  } else {
    // неизвестный тип — просто не играем
    return;
  }
}


// ── АДАПТИВНАЯ МУЗЫКА ────────────────────────────────────────────────
// Реагирует на состояние игрока: движение, спринт, близость врагов.
// Плюс короткие "стинги" (музыкальные акценты) на события: удар, убийство,
// пикап, урон, спасение заложника, взрыв.

const BPM = 118;
const BEAT = 60 / BPM;
const STEP = BEAT / 4;          // 16-я доля
const BAR_STEPS = 16;
const LOOP_BARS = 4;

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// До-минорная пентатоника
const SCALE = [0, 3, 5, 7, 10];
const ROOT = 60;

// ── ПАТТЕРНЫ ────────────────────────────────────────────────────────
const BASS_PATTERNS = [
  [ 0, null, null, null,  4, null, null, null,
    0, null, null, null,  2, null,   4, null],
  [ 0, null,    0, null,  4, null, null,    4,
    0, null,    2, null,  4, null,   2, null],
  [ 0, null, null,    4,  0, null,    4, null,
    2, null,    0, null,  4, null, null, null],
  [ 0, null, null,    0,  2, null, null,    2,
    4, null, null,    4,  0, null,   4, null],
];

const MEL_PATTERNS = [
  [ null, null,    4, null,   null,    3, null, null,
    null, null,    2, null,   null,    4,    3, null],
  [ null, null,    4,    3,   null,    2, null, null,
       4, null,    3,    2,   null,    4, null,    3],
];

// Верхняя "спринт" линия — играет октавой выше на быстром беге
const SPRINT_MEL = [
     4, null, null,    3,   null, null,    2, null,
     4, null,    3, null,      2, null, null,    4,
];

const HAT_PATTERN = [
  null, null,    1, null,   null, null,    1, null,
  null, null,    1, null,   null, null,    1, null,
];
const CLAP_PATTERN = [
  null, null, null, null,      1, null, null, null,
  null, null, null, null,      1, null, null, null,
];
const SNARE_PATTERN = [
  null, null, null, null,   null, null, null, null,
  null, null, null, null,   null, null,    1,    1,
];

// ── ПАТТЕРНЫ БОЕВОГО СЛОЯ ────────────────────────────────────────────
// Играют только когда враг близко — делают музыку эпичнее.
// Плотный снэр — на каждой 8-й доле backbeat-style.
const COMBAT_SNARE = [
  null, null, null, null,      1, null, null, null,
  null, null, null, null,      1, null,    1, null,
];
// Боевые "крэши" — короткие удары на сильных долях 1 и 9 (начало и середина такта)
const COMBAT_CRASH = [
     1, null, null, null,   null, null, null, null,
     1, null, null, null,   null, null, null, null,
];

// ── ШУМОВОЙ БУФЕР ──────────────────────────────────────────────────
let _noiseBuffer = null;
function getNoiseBuffer() {
  if (_noiseBuffer) return _noiseBuffer;
  const ctx = game.audioCtx;
  const len = Math.floor(ctx.sampleRate * 0.1);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  _noiseBuffer = buf;
  return buf;
}

// ── ИНСТРУМЕНТЫ ────────────────────────────────────────────────────
function scheduleBass(startTime, freq, duration, volume = 0.08) {
  const ctx = game.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
  osc.start(startTime); osc.stop(startTime + duration + 0.05);
}

function scheduleMelody(startTime, freq, duration, volume = 0.05) {
  const ctx = game.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(freq, startTime);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
  osc.start(startTime); osc.stop(startTime + duration + 0.05);
}

function scheduleHat(startTime, volume = 0.04) {
  const ctx = game.audioCtx;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 7000;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.04);
  src.connect(hp); hp.connect(gain); gain.connect(game._musicGain || ctx.destination);
  src.start(startTime); src.stop(startTime + 0.05);
}

function scheduleClap(startTime) {
  const ctx = game.audioCtx;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800; bp.Q.value = 2;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.08, startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.09);
  src.connect(bp); bp.connect(gain); gain.connect(game._musicGain || ctx.destination);
  src.start(startTime); src.stop(startTime + 0.1);
}

// Боевой "крэш" — плотная помесь шума и низкой ноты, для combat-слоя.
// Это не полноценная тарелка, а короткий "чавк" с ощущением удара.
function scheduleCrash(startTime) {
  const ctx = game.audioCtx;
  // шумовая часть через bandpass вокруг 4kHz
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 4500; bp.Q.value = 0.8;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.09, startTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
  src.connect(bp); bp.connect(noiseGain); noiseGain.connect(game._musicGain || ctx.destination);
  src.start(startTime); src.stop(startTime + 0.16);
  // низкий тональный удар — даёт "вес" крэшу
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(120, startTime);
  osc.frequency.exponentialRampToValueAtTime(60, startTime + 0.08);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.07, startTime);
  og.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
  osc.connect(og); og.connect(game._musicGain || ctx.destination);
  osc.start(startTime); osc.stop(startTime + 0.12);
}

function scheduleSnare(startTime) {
  const ctx = game.audioCtx;
  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer();
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 3000; bp.Q.value = 1.2;
  const noiseGain = ctx.createGain();
  noiseGain.gain.setValueAtTime(0.07, startTime);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
  src.connect(bp); bp.connect(noiseGain); noiseGain.connect(game._musicGain || ctx.destination);
  src.start(startTime); src.stop(startTime + 0.1);
  const osc = ctx.createOscillator();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(200, startTime);
  osc.frequency.exponentialRampToValueAtTime(100, startTime + 0.05);
  const og = ctx.createGain();
  og.gain.setValueAtTime(0.05, startTime);
  og.gain.exponentialRampToValueAtTime(0.001, startTime + 0.06);
  osc.connect(og); og.connect(game._musicGain || ctx.destination);
  osc.start(startTime); osc.stop(startTime + 0.08);
}

// ── ИНСТРУМЕНТЫ НАПРЯЖЕНИЯ (по мотивам Кубрика/Пендерецкого/Лигети) ──
// Эти звуки играют только когда близко враг или идёт бой.
// Они НЕ ритмические, они текстурные — создают ощущение ужаса.

// Диссонантный кластер: три triangle-ноты в полутоне друг от друга
// (напр. C + C# + D). Звучит тревожно, напоминает атональные струнные.
function scheduleDissonantCluster(startTime, baseMidi, duration, volume = 0.04) {
  const ctx = game.audioCtx;
  const notes = [baseMidi, baseMidi + 1, baseMidi + 2]; // кластер в полутоне
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(midi(n), startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume / 3, startTime + 0.2);
    gain.gain.linearRampToValueAtTime(volume / 3, startTime + duration - 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
    osc.start(startTime); osc.stop(startTime + duration + 0.05);
  }
}

// Тремоло-дрон: два осциллятора на одной ноте + лёгкая расстройка 7Hz.
// Биение создаёт мурашки — эффект "тревоги" в фильмах Кубрика.
function scheduleTremoloDrone(startTime, baseMidi, duration, volume = 0.03) {
  const ctx = game.audioCtx;
  const freq = midi(baseMidi);
  for (const detune of [0, 7]) { // 0 Hz + 7 Hz — даёт ~7 Hz биения
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq + detune, startTime);
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(volume / 2, startTime + 0.3);
    gain.gain.linearRampToValueAtTime(volume / 2, startTime + duration - 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
    osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
    osc.start(startTime); osc.stop(startTime + duration + 0.05);
  }
}

// Глиссандо — быстрый свип частоты снизу вверх или сверху вниз.
// Используется как "шок"-акцент на сильных долях.
function scheduleGlissando(startTime, fromFreq, toFreq, duration, volume = 0.05) {
  const ctx = game.audioCtx;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(fromFreq, startTime);
  osc.frequency.exponentialRampToValueAtTime(toFreq, startTime + duration);
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
  osc.start(startTime); osc.stop(startTime + duration + 0.05);
}

// ── СОСТОЯНИЕ СЛОЁВ ────────────────────────────────────────────────
// Считается в updateMusicState() каждый кадр. Используется в scheduleBar().
const musicState = {
  moving: false,     // игрок движется
  sprinting: false,  // спринт
  combat: false,     // враг близко
  bossActive: false, // идёт бой с боссом (живой, виден)
  bossPhase3: false, // босс в финальной фазе (HP < 20%) — самый dread
  muteUntil: 0,      // audioCtx.currentTime — до этого времени всё заглушено (взрыв)
};

function updateMusicState() {
  if (!game.musicOn || !game.audioCtx) return;
  const p = player;
  // движение: dx != 0 за последний кадр (используем vx который уже посчитан)
  musicState.moving = Math.abs(p.vx) > 5 && !p.dead;
  // спринт: sprintTimer > 1.0
  musicState.sprinting = game.sprintTimer > 1.0;
  // боевая близость: есть живой враг в радиусе 200px
  let combat = false;
  if (typeof enemies !== 'undefined') {
    for (const e of enemies) {
      if (e.dead) continue;
      const dx = (e.x + e.w/2) - (p.x + p.w/2);
      const dy = (e.y + e.h/2) - (p.y + p.h/2);
      if (dx*dx + dy*dy < 200*200) { combat = true; break; }
    }
  }
  // живой босс — всегда combat-слой
  if (typeof boss !== 'undefined' && boss && !boss.dead) {
    combat = true;
    // Босс "в зоне видимости" — если он на экране (в пределах ±300px от игрока)
    const dxB = (boss.x + boss.w/2) - (p.x + p.w/2);
    musicState.bossActive = Math.abs(dxB) < 400;
    // Финальная фаза — босс близок к смерти, музыка становится самой отчаянной
    musicState.bossPhase3 = boss.phase === 3;
  } else {
    musicState.bossActive = false;
    musicState.bossPhase3 = false;
  }
  musicState.combat = combat;
}

// ── ПЛАНИРОВЩИК ТАКТА С УЧЁТОМ СЛОЁВ ───────────────────────────────
function scheduleBar(barStartTime, barIdx) {
  const ctx = game.audioCtx;
  const bassPat    = BASS_PATTERNS[barIdx % BASS_PATTERNS.length];
  const melPat     = MEL_PATTERNS[Math.floor(barIdx / 2) % MEL_PATTERNS.length];
  const isFillBar  = (barIdx === LOOP_BARS - 1);
  const barDuration = STEP * BAR_STEPS;

  // В combat: заменяем обычный дрон на ТРЕМОЛО-ДРОН (биения как мурашки)
  // плюс накладываем ДИССОНАНТНЫЙ КЛАСТЕР поверх — кубриковские атональные
  // струнные. Это создаёт беспрерывный "саспенс".
  if (musicState.combat && barStartTime >= musicState.muteUntil) {
    const bossOn = musicState.bossActive;
    const phase3 = musicState.bossPhase3;
    // тремоло-дрон вместо обычного sawtooth (громче при боссе)
    scheduleTremoloDrone(barStartTime, ROOT - 24, barDuration, bossOn ? 0.05 : 0.03);
    // диссонантный кластер на высокой октаве — струнные
    scheduleDissonantCluster(barStartTime, ROOT + 12, barDuration * 0.85, bossOn ? 0.055 : 0.035);
    if (bossOn) {
      // Второй кластер ОЧЕНЬ низко — инфернальный басовый контрапункт
      scheduleDissonantCluster(barStartTime, ROOT - 12, barDuration * 0.85, 0.045);
      // Глиссандо каждый такт, не только fill — нарастающая паника
      scheduleGlissando(barStartTime + barDuration * 0.3, 120, 600, barDuration * 0.35, 0.035);
      scheduleGlissando(barStartTime + barDuration * 0.7, 800, 200, barDuration * 0.3, 0.03);
    } else if (isFillBar) {
      // обычный combat без босса — глиссандо только на fill-такт
      scheduleGlissando(barStartTime + barDuration * 0.5, 150, 800, barDuration * 0.4, 0.04);
    }

    // ── DREAD СЛОЙ В PHASE 3 ─────────────────────────────────────
    // Самая отчаянная фаза — босс почти мёртв, но самый опасный.
    // Супер-низкий "ревущий" дрон + медленное непрерывное глиссандо,
    // имитирующее нарастающий ужас.
    if (phase3) {
      // Очень низкий "рык" — sawtooth на ROOT-36 с лёгкой расстройкой
      const dread1 = ctx.createOscillator();
      const dread2 = ctx.createOscillator();
      const dreadGain = ctx.createGain();
      dread1.type = 'sawtooth';
      dread2.type = 'sawtooth';
      dread1.frequency.setValueAtTime(midi(ROOT - 36), barStartTime);
      dread2.frequency.setValueAtTime(midi(ROOT - 36) * 1.007, barStartTime); // расстройка ~0.7%
      dreadGain.gain.setValueAtTime(0, barStartTime);
      dreadGain.gain.linearRampToValueAtTime(0.045, barStartTime + 0.3);
      dreadGain.gain.linearRampToValueAtTime(0.045, barStartTime + barDuration - 0.3);
      dreadGain.gain.linearRampToValueAtTime(0, barStartTime + barDuration);
      dread1.connect(dreadGain);
      dread2.connect(dreadGain);
      dreadGain.connect(game._musicGain || ctx.destination);
      dread1.start(barStartTime); dread1.stop(barStartTime + barDuration + 0.05);
      dread2.start(barStartTime); dread2.stop(barStartTime + barDuration + 0.05);

      // Медленное непрерывное глиссандо сверху вниз — "спуск в ад"
      scheduleGlissando(barStartTime, 400, 80, barDuration * 0.9, 0.025);
    }
  } else if (barStartTime >= musicState.muteUntil) {
    // вне combat — обычный тихий дрон
    const droneOsc = ctx.createOscillator();
    const droneGain = ctx.createGain();
    droneOsc.type = 'sawtooth';
    droneOsc.frequency.setValueAtTime(midi(ROOT - 24), barStartTime);
    droneGain.gain.setValueAtTime(0, barStartTime);
    droneGain.gain.linearRampToValueAtTime(0.015, barStartTime + 0.2);
    droneGain.gain.linearRampToValueAtTime(0.015, barStartTime + barDuration - 0.2);
    droneGain.gain.linearRampToValueAtTime(0, barStartTime + barDuration);
    droneOsc.connect(droneGain); droneGain.connect(game._musicGain || ctx.destination);
    droneOsc.start(barStartTime); droneOsc.stop(barStartTime + barDuration + 0.05);
  }

  for (let step = 0; step < BAR_STEPS; step++) {
    const t = barStartTime + step * STEP;
    // Если в момент этой ноты должен быть mute (взрыв) — пропускаем всё
    if (t < musicState.muteUntil) continue;

    // БАЗА: бас + хэт играют всегда
    const bassIdx = bassPat[step];
    if (bassIdx !== null) {
      const note = ROOT - 12 + SCALE[bassIdx];
      scheduleBass(t, midi(note), STEP * 2);
    }
    if (HAT_PATTERN[step] !== null) {
      scheduleHat(t);
    }

    // МЕЛОДИЯ: только когда игрок движется
    if (musicState.moving) {
      const melIdx = melPat[step];
      if (melIdx !== null) {
        let idx = melIdx;
        if (Math.random() < 0.2) {
          idx = Math.max(0, Math.min(SCALE.length - 1, idx + (Math.random() < 0.5 ? -1 : 1)));
        }
        const octaveShift = (Math.random() < 0.1) ? 0 : 12;
        const note = ROOT + octaveShift + SCALE[idx];
        scheduleMelody(t, midi(note), STEP * 1.5);
      }
    }

    // СПРИНТ: дополнительная верхняя мелодия
    if (musicState.sprinting) {
      const spIdx = SPRINT_MEL[step];
      if (spIdx !== null) {
        const note = ROOT + 24 + SCALE[spIdx]; // 2 октавы выше
        scheduleMelody(t, midi(note), STEP * 1.2, 0.035);
      }
    }

    // БОЙ: плотная перкуссия + power-chord в басу + крэши
    if (musicState.combat) {
      // дополнительный клэп — та же схема, но играет всегда (не только когда moving)
      if (CLAP_PATTERN[step] !== null) scheduleClap(t);
      // плотный снэр — каждый такт, не только fill
      if (COMBAT_SNARE[step] !== null) scheduleSnare(t);
      // боевые крэши на сильных долях — эпичный акцент
      if (COMBAT_CRASH[step] !== null) scheduleCrash(t);
      // power-chord: добавляем квинту к басу (играет квинту вверх от basIdx)
      // Это классический "эпичный рок" звук.
      const bassIdx2 = bassPat[step];
      if (bassIdx2 !== null) {
        const baseNote = ROOT - 12 + SCALE[bassIdx2];
        // квинта вверх = +7 полутонов
        scheduleBass(t, midi(baseNote + 7), STEP * 2, 0.05);
      }
    }
  }
}

// ── ЛУПЕР ──────────────────────────────────────────────────────────
function musicTick() {
  if (!game.musicOn || !game.audioCtx) return;
  const ctx = game.audioCtx;
  const now = ctx.currentTime;
  if (!game._nextBarTime || game._nextBarTime < now) {
    game._nextBarTime = now + 0.05;
    game._barIndex = 0;
  }
  const barDuration = STEP * BAR_STEPS;
  while (game._nextBarTime < now + 0.2) {
    if (!game.paused && !game.titleScreen) {
      scheduleBar(game._nextBarTime, game._barIndex % LOOP_BARS);
    }
    game._nextBarTime += barDuration;
    game._barIndex = (game._barIndex + 1) % (LOOP_BARS * 4);
  }
  game.ambientTimer = setTimeout(musicTick, 100);
}

function startAmbient() {
  if (game.ambientTimer || !game.musicOn) return;
  game._nextBarTime = 0;
  game._barIndex = 0;
  game.ambientTimer = setTimeout(musicTick, 50);
}

// ── СТИНГИ: короткие музыкальные акценты на события ──────────────────
// Играют сразу, не привязаны к ритму такта. Срабатывают из playSound()
// если event совпадает с одним из известных.
function playSting(type) {
  if (!game.musicOn || !game.audioCtx) return;
  const ctx = game.audioCtx;
  const t = ctx.currentTime;

  if (type === 'hit') {
    // удар: 3 хэта подряд — "чик-чик-чик"
    for (let i = 0; i < 3; i++) scheduleHat(t + i * 0.04, 0.05);

  } else if (type === 'kill') {
    // убил врага: мажорный аккорд из 3 нот (+победное ощущение)
    const chord = [ROOT + 12, ROOT + 12 + 4, ROOT + 12 + 7]; // C, E, G
    for (const n of chord) scheduleMelody(t, midi(n), 0.3, 0.06);

  } else if (type === 'pickup') {
    // пикап: восходящая пара нот "динь-динь"
    scheduleMelody(t,        midi(ROOT + 24), 0.12, 0.06);
    scheduleMelody(t + 0.08, midi(ROOT + 28), 0.2,  0.06);

  } else if (type === 'hurt') {
    // урон: нисходящее глиссандо в басу
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midi(ROOT - 12), t);
    osc.frequency.exponentialRampToValueAtTime(midi(ROOT - 24), t + 0.3);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
    osc.start(t); osc.stop(t + 0.4);

  } else if (type === 'rescue') {
    // Счастливая фанфара — восходящая мажорная линия с гармонией.
    // Мажорное трезвучие C-E-G (а не минорное пентатоническое).
    // Плюс звенящий колокольчик сверху на финальной ноте.
    const V = 0.07; // громкость мелодии
    // основная линия — до мажор: C → E → G → C (октавой выше)
    scheduleMelody(t,        midi(ROOT + 12),     0.14, V);       // C5
    scheduleMelody(t + 0.10, midi(ROOT + 12 + 4), 0.14, V);       // E5
    scheduleMelody(t + 0.20, midi(ROOT + 12 + 7), 0.14, V);       // G5
    scheduleMelody(t + 0.30, midi(ROOT + 24),     0.5,  V + 0.01); // C6 (длинная)
    // гармония — терция сверху, играет одновременно с основной
    scheduleMelody(t + 0.10, midi(ROOT + 12 + 7), 0.14, V * 0.6); // G5 к E
    scheduleMelody(t + 0.20, midi(ROOT + 24),     0.14, V * 0.6); // C6 к G
    scheduleMelody(t + 0.30, midi(ROOT + 24 + 4), 0.5,  V * 0.7); // E6 к C
    // звенящий колокольчик — высокая нота sine/triangle на самой верхушке
    const ch = ctx.createOscillator();
    const cg = ctx.createGain();
    ch.type = 'sine';
    ch.frequency.setValueAtTime(midi(ROOT + 36), t + 0.3); // C7
    cg.gain.setValueAtTime(0, t + 0.3);
    cg.gain.linearRampToValueAtTime(0.015, t + 0.31);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.6);
    ch.connect(cg); cg.connect(game._musicGain || ctx.destination);
    ch.start(t + 0.3); ch.stop(t + 0.7);

  } else if (type === 'explode') {
    // mute всей музыки на полтакта — создаёт ощущение "провала"
    musicState.muteUntil = t + STEP * 8; // половина такта
    // плюс низкое "бум" — бас-дроп
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(midi(ROOT - 24), t);
    gain.gain.setValueAtTime(0.15, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
    osc.start(t); osc.stop(t + 0.45);

  } else if (type === 'bossAppear') {
    // Появление босса: резкий кластер + нарастающее глиссандо + глубокий бум.
    // Момент "О, нет" — ужас и давление.
    musicState.muteUntil = t + 0.2; // секунда тишины перед ударом
    // глубокий бум снизу
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(midi(ROOT - 36), t + 0.25);
    gain.gain.setValueAtTime(0, t + 0.25);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
    osc.start(t + 0.25); osc.stop(t + 1.3);
    // кластер поверх
    scheduleDissonantCluster(t + 0.3, ROOT, 1.0, 0.08);
    // восходящее глиссандо — "что-то поднимается"
    scheduleGlissando(t + 0.3, 80, 400, 0.9, 0.07);

  } else if (type === 'bossPhase') {
    // Смена фазы босса: короткий шок-стинг + кластер + downward glissando.
    // "Он становится сильнее" — тревожный момент.
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(midi(ROOT - 12), t);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
    osc.start(t); osc.stop(t + 0.55);
    // резкий диссонантный аккорд (2 полутонные ноты)
    const chord = [ROOT + 6, ROOT + 7, ROOT + 19];
    for (const n of chord) scheduleMelody(t, midi(n), 0.5, 0.05);
    scheduleGlissando(t + 0.1, 600, 150, 0.5, 0.05);

  } else if (type === 'bossSummon') {
    // Призыв приспешников в phase 3: атмосферный "шёпот" из нескольких
    // высоких дрейфующих нот + низкий пульс. Звучит как зов из тьмы.
    // Низкий пульсирующий "зов"
    for (let k = 0; k < 3; k++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(midi(ROOT - 24), t + k * 0.15);
      gain.gain.setValueAtTime(0, t + k * 0.15);
      gain.gain.linearRampToValueAtTime(0.07, t + k * 0.15 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t + k * 0.15 + 0.2);
      osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
      osc.start(t + k * 0.15); osc.stop(t + k * 0.15 + 0.25);
    }
    // Высокие дрейфующие ноты сверху (как духи)
    const ghostNotes = [ROOT + 13, ROOT + 17, ROOT + 20]; // диссонантные полутона
    for (let i = 0; i < ghostNotes.length; i++) {
      const n = ghostNotes[i];
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(midi(n), t + 0.2 + i * 0.1);
      // микро-вибрато через LFO
      gain.gain.setValueAtTime(0, t + 0.2 + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.02, t + 0.3 + i * 0.1);
      gain.gain.linearRampToValueAtTime(0.02, t + 0.8 + i * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 1.2 + i * 0.1);
      osc.connect(gain); gain.connect(game._musicGain || ctx.destination);
      osc.start(t + 0.2 + i * 0.1); osc.stop(t + 1.3 + i * 0.1);
    }

  } else if (type === 'bossDefeat') {
    // Смерть босса: mute 0.3с (пауза), потом длинный мажорный аккорд + звенящий
    // колокольчик. Ощущение облегчения после долгого напряжения.
    musicState.muteUntil = t + 0.3;
    // мажорный аккорд C-E-G-C на октаву
    const V = 0.08;
    const chord = [ROOT, ROOT + 4, ROOT + 7, ROOT + 12, ROOT + 16];
    for (const n of chord) {
      scheduleMelody(t + 0.35, midi(n), 1.6, V);
    }
    // высокий колокольчик через 0.5с
    const bell = ctx.createOscillator();
    const bg = ctx.createGain();
    bell.type = 'sine';
    bell.frequency.setValueAtTime(midi(ROOT + 36), t + 0.5);
    bg.gain.setValueAtTime(0, t + 0.5);
    bg.gain.linearRampToValueAtTime(0.04, t + 0.52);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 1.8);
    bell.connect(bg); bg.connect(game._musicGain || ctx.destination);
    bell.start(t + 0.5); bell.stop(t + 1.9);
  }
}

// ── ЭКРАНОТРЯС ────────────────────────────────────────────────────────

function screenShake(magnitude, duration) {
  if (magnitude > game.shakeMag) { game.shakeMag = magnitude; game.shakeTimer = duration; }
}

function getShakeOffset() {
  if (game.shakeTimer <= 0) return { x: 0, y: 0 };
  const s = game.shakeMag * (game.shakeTimer / 0.3);
  return {
    x: Math.round((Math.random() * 2 - 1) * s),
    y: Math.round((Math.random() * 2 - 1) * s),
  };
}

// ── INPUT ─────────────────────────────────────────────────────────────
const keys = {};
window.addEventListener('keydown', e => {
  keys[e.code] = true;
  if (['Space','ArrowUp','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === 'Escape') game.paused = !game.paused;
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

const mk = { l: false, r: false, j: false, punch: false };
[['bl','l'],['br','r'],['bj','j'],['bp','punch']].forEach(([id, k]) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('touchstart', e => { e.preventDefault(); mk[k] = true; }, { passive: false });
  el.addEventListener('touchend',   e => { e.preventDefault(); mk[k] = false; }, { passive: false });
});

const isL = () => keys['ArrowLeft']  || keys['KeyA'] || mk.l;
const isR = () => keys['ArrowRight'] || keys['KeyD'] || mk.r;
const isJ = () => keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || mk.j;

// ── КЛИК / ТАП ПО CANVAS — для UI кнопок (музыка и т.п.) ─────────────
// Кнопка музыки в правом верхнем углу: прямоугольник ~16×10 пикселей.
// Координаты viewport-клика переводятся в канонические canvas-координаты
// (GW=480, GH=270) через getBoundingClientRect.
function canvasClickXY(evt) {
  const rect = CV.getBoundingClientRect();
  const vx = (evt.touches ? evt.touches[0].clientX : evt.clientX) - rect.left;
  const vy = (evt.touches ? evt.touches[0].clientY : evt.clientY) - rect.top;
  return { x: vx * (GW / rect.width), y: vy * (GH / rect.height) };
}
let _lastMusicToggle = 0;
function handleCanvasTap(evt) {
  const { x, y } = canvasClickXY(evt);
  // кнопка музыки: правый верхний угол, область 18×12
  if (x >= GW - 20 && x <= GW - 2 && y >= 1 && y <= 13) {
    evt.preventDefault();
    const now = Date.now();
    if (now - _lastMusicToggle < 300) return;
    _lastMusicToggle = now;
    toggleMusic();
    return;
  }

  // Слайдеры громкости. Рельсы:
  //   music: x∈[GW-38..GW-8], y∈[16..20]
  //   sfx:   x∈[GW-38..GW-8], y∈[24..28]
  // При попадании — выставляем громкость пропорционально x.
  const slX0 = GW - 38, slX1 = GW - 8;
  if (x >= slX0 - 2 && x <= slX1 + 2) {
    const frac = Math.max(0, Math.min(1, (x - slX0) / (slX1 - slX0)));
    if (y >= 15 && y <= 21) {
      evt.preventDefault();
      initAudio(); // на случай первого клика — поднимаем audioCtx
      setMusicVolume(frac);
      return;
    }
    if (y >= 23 && y <= 29) {
      evt.preventDefault();
      initAudio();
      setSfxVolume(frac);
      return;
    }
  }
}
CV.addEventListener('click', handleCanvasTap);
CV.addEventListener('touchstart', handleCanvasTap, { passive: false });

// ── UPDATE ────────────────────────────────────────────────────────────
function update(dt) {
  const p = player;

  // экран старта
  if (game.titleScreen) {
    const jn = isJ();
    if (jn && !game.jprev) {
      game.titleScreen = false;
      say('start');
    }
    game.jprev = jn;
    return;
  }

  if (p.dead) {
    p.dtimer += dt;
    const jn = isJ();
    if (p.dtimer > 1.2 && jn && !game.jprev) {
      if (p.lives <= 0) {
        // полная перегенерация уровня
        initLevel();
        p.lives = 3;
        game.score = 0;
      } else {
        // остались жизни — респавн на том же уровне,
        // враги/предметы/заложники возобновляются, но разрушенные тайлы
        // остаются разрушенными (мир помнит что игрок тут делал).
        initEnemies(game.currentLevel);
        if (typeof resetFirstEnemy === 'function') resetFirstEnemy();
        initItems();
        initHostages();
        // если босс уже был побеждён — не воскрешаем его; иначе — пересоздаём
        if (typeof boss !== 'undefined' && (!boss || !boss.defeated)) {
          initBoss(game.currentLevel);
        }
        Object.keys(tileHP).forEach(k => delete tileHP[k]);
        Object.keys(tileFlash).forEach(k => delete tileFlash[k]);
      }
      projectiles.length = 0;
      ragdolls.length = 0;
      game.cam = 0;
      Object.assign(p, { x: START.x, y: START.y, vx: 0, vy: 0, dead: false, dtimer: 0,
        invTimer: 0, punching: false, ptimer: 0, pframe: 0, pcooldown: 0, speedBoost: 0 });
    }
    game.jprev = jn;
    return;
  }

  // победа — прыжок запускает новый уровень
  if (game.levelComplete) {
    const jn = isJ();
    if (jn && !game.jprev) {
      game.currentLevel++;
      initLevel();
      game.cam = 0;
      game.score = 0;
      // жизни НЕ сбрасываем — игрок донёс сколько донёс (макс 4)
      Object.assign(p, { x: START.x, y: START.y, vx: 0, vy: 0, dead: false, dtimer: 0,
        invTimer: 0, punching: false, ptimer: 0, pframe: 0, pcooldown: 0, speedBoost: 0 });
    }
    game.jprev = jn;
    return;
  }

  p.vy += 480 * dt;
  if (p.vy > 600) p.vy = 600;

  const isPunch = keys['KeyZ'] || keys['KeyX'] || mk.punch;
  if (p.pcooldown > 0) p.pcooldown -= dt;
  // анимационный таймер (для процедурных спрайтов)
  p._animT = (p._animT || 0) + dt;
  // приземление — короткая анимация сжатия
  if (p._landTimer > 0) p._landTimer = Math.max(0, p._landTimer - dt);

  // ── IDLE / КУРЕНИЕ ──────────────────────────────────────────────
  // Если игрок ничего не делает (стоит на земле, не бьёт, не в воздухе) —
  // растёт _idleTimer. После 1.5с — достаёт сигарету (_smoking = true).
  // Пока курит, раз в 4-7с выдаёт случайную мысль из PLAYER_LINES.smoke.
  const isActive = Math.abs(p.vx) > 5 || !p.onGround || p.punching || p.crouching || p.dead;
  if (isActive) {
    p._idleTimer = 0;
    p._smoking = false;
    p._nextSmokeJoke = 0;
  } else {
    p._idleTimer = (p._idleTimer || 0) + dt;
    if (p._idleTimer > 1.5) {
      p._smoking = true;
      // первая шутка через ~2с после того как закурил
      if (!p._nextSmokeJoke) p._nextSmokeJoke = p._idleTimer + 2;
      if (p._idleTimer > p._nextSmokeJoke) {
        if (typeof say === 'function') say('smoke');
        p._nextSmokeJoke = p._idleTimer + 4 + Math.random() * 4; // следующая через 4-8с
      }
    }
  }

  if (isPunch && !p.punching && p.pcooldown <= 0) {
    p.punching = true; p.ptimer = 0; p.pframe = 0;
  }

  let dx = 0;
  const prevFacing = p.facing;
  if (isL()) { dx = -1; p.facing = -1; }
  if (isR()) { dx = 1;  p.facing = 1; }
  if (p.invTimer > 0) p.invTimer -= dt;
  if (p.speedBoost > 0) p.speedBoost -= dt;

  // Приседание: зажат ↓ на земле и не бьёт (т.к. ↓+Z — удар вниз)
  const isDownKey = keys['ArrowDown'] || keys['KeyS'];
  const wasCrouching = p.crouching;
  p.crouching = isDownKey && p.onGround && !p.punching;
  // Изменяем высоту хитбокса. Стандарт = 24, присев = 16.
  // При выходе из приседа убеждаемся что над головой нет потолка, иначе
  // остаёмся в приседе (классика).
  if (p.crouching && !wasCrouching) {
    // вход в присед: hitbox уменьшается, игрок "садится"
    const oldH = p.h;
    p.h = 16;
    p.y += (oldH - 16); // опускаем голову на ту же линию земли
  } else if (!p.crouching && wasCrouching) {
    // выход: проверяем что над головой свободно
    const newTop = p.y - (24 - 16);
    if (!solid(p.x + 2, newTop) && !solid(p.x + p.w - 3, newTop)) {
      p.h = 24;
      p.y = newTop;
    } else {
      // потолок — остаёмся в приседе
      p.crouching = true;
    }
  }

  const spd = p.speedBoost > 0 ? 130 : (p.crouching ? 30 : 75);
  p.vx = dx * spd;

  // Накапливаем sprintTimer пока игрок движется в одну сторону.
  // При остановке или смене направления — быстро сбрасываем.
  if (dx !== 0 && p.facing === prevFacing) {
    game.sprintTimer = Math.min(2.0, game.sprintTimer + dt);
  } else {
    game.sprintTimer = Math.max(0, game.sprintTimer - dt * 3); // сброс в 3× быстрее
  }

  const jn = isJ();
  const jPressed = jn && !game.jprev; // кнопка ТОЛЬКО что нажата

  // Coyote time: обновляем таймер. Если на земле — reset в 0.1с.
  // Если в воздухе — уменьшаем. Пока > 0 разрешаем прыгать "как с земли".
  if (p.onGround) {
    p.coyoteTimer = 0.1; // 100мс
    p.airJumps = p.maxAirJumps; // восстанавливаем доп прыжки при касании земли
  } else {
    p.coyoteTimer = Math.max(0, p.coyoteTimer - dt);
  }

  // Input buffer: если кнопка прыжка нажата — "запоминаем" на 0.15с.
  // Если в течение этих 150мс приземлимся — прыгнем сразу.
  if (jPressed) {
    p.jumpBufferTimer = 0.15;
  } else {
    p.jumpBufferTimer = Math.max(0, p.jumpBufferTimer - dt);
  }

  // Прыжок на земле / coyote
  if (p.jumpBufferTimer > 0 && p.coyoteTimer > 0 && !p.punching) {
    p.vy = -260;
    playSound('jump');
    p.jumpBufferTimer = 0;
    p.coyoteTimer = 0;
  }
  // Double jump: если в воздухе, кнопка только что нажата, есть airJumps
  else if (jPressed && !p.onGround && p.airJumps > 0 && !p.punching) {
    p.vy = -230; // чуть слабее наземного прыжка
    p.airJumps--;
    playSound('jump');
    // визуальный "пшик" при двойном прыжке — облачко частиц под ногами
    for (let k = 0; k < 8; k++) {
      const ang = Math.PI + (Math.random() - 0.5) * 0.8;
      particles.push({
        x: p.x - game.cam + p.w/2,
        y: p.y + p.h,
        vx: Math.cos(ang) * 40,
        vy: Math.sin(ang) * 40,
        life: 1, maxLife: 0.25, size: 1
      });
    }
  }
  game.jprev = jn;

  if (p.punching) {
    const prevFrame = p.pframe;
    p.ptimer += dt;
    if (p.ptimer < 0.08)      p.pframe = 0;
    else if (p.ptimer < 0.18) p.pframe = 1;
    else if (p.ptimer < 0.28) p.pframe = 2;
    else { p.punching = false; p.pcooldown = 0.15; }
    if (p.punching && p.pframe === 2 && prevFrame !== 2) {
      const hx = p.facing > 0 ? Math.round(p.x - game.cam) + p.w + 4 : Math.round(p.x - game.cam) - 4;
      spawnHitParticles(hx, Math.round(p.y) + 12);
      screenShake(2, 0.1);
      playSound('punch');
      punchBreakTiles();
    }
  }

  collide(p, dt);
  checkPunchHit();
  resetEnemyHitFlags();
  updateEnemies(dt);
  updateItems(dt);
  if (typeof updateBoss === 'function') updateBoss(dt);

  // столкновение игрока с боссом — наносит урон (игнорируя i-frames)
  if (typeof bossHitsPlayer === 'function' && bossHitsPlayer() && p.invTimer <= 0 && !p.dead) {
    hurtPlayer(p.facing > 0 ? -80 : 80, -120);
  }

  p.ftick += dt;
  if (!p.onGround) {
    p.state = 'jump';
  } else if (dx !== 0) {
    if (p.state !== 'run') { p.state = 'run'; p.frame = 0; p.ftick = 0; }
    if (p.ftick > 0.1) { p.frame = (p.frame + 1) % 4; p.ftick = 0; }
  } else {
    p.state = 'idle'; p.frame = 0;
    p.bobt += dt;
    p.bobY = Math.sin(p.bobt * 1.5) * 0.8;
  }

  if (p.x < 0) p.x = 0;
  if (p.x < game.cam) p.x = game.cam;
  if (p.y > MH * T + 20) {
    p.lives--;
    p.dead = true;
    p.dtimer = 0;
    playSound('hurt');
    return;
  }

  // lookahead — камера смотрит вперёд, дальше при длительной ходьбе.
  // Базовый 40px, после 2 секунд непрерывного движения → 100px.
  const sprintFactor = Math.min(1, game.sprintTimer / 2.0); // 0..1
  const lookAhead = p.facing * (40 + sprintFactor * 60);
  const tc = p.x + lookAhead - GW * 0.38;
  if (tc > game.cam) game.cam += (tc - game.cam) * 0.12;
  else if (tc < game.cam - 20) game.cam += (tc - game.cam) * 0.08;
  if (game.cam > WORLD_W - GW) game.cam = WORLD_W - GW;
  if (game.cam < 0) game.cam = 0;

  // проверка портала: на боссовых уровнях портал работает только после победы над боссом
  const bossActive = typeof boss !== 'undefined' && boss && !boss.dead;
  if (!game.levelComplete && !bossActive && checkPortal()) {
    game.levelComplete = true;
    say('win');
    playSound('win');
    screenShake(4, 0.4);
    // сохраняем рекорды
    saveBestTime(game.levelTimer);
    saveBestScore();
  }

  // таймер уровня — пока жив и уровень не завершён
  if (!game.levelComplete && !player.dead) {
    game.levelTimer += dt;
  }

  updateHostages(dt);
  updateSpeech(dt);
  updateEnemySpeech(dt);
}

// ── GAME LOOP ─────────────────────────────────────────────────────────
function loop(ts) {
  const dt = Math.min((ts - game.lastT) / 1000, 0.05);
  game.lastT = ts;

  // титульный экран — drawTitle сам закрашивает фон, ничего предварительно не нужно
  if (game.titleScreen) {
    update(dt);
    drawTitle();
    requestAnimationFrame(loop);
    return;
  }

  if (game.freezeTimer > 0) {
    game.freezeTimer = Math.max(0, game.freezeTimer - dt);
  } else {
    if (!game.paused && !game.levelComplete) update(dt);
    if (!game.paused) {
      updateParticles(dt);
      updateProjectiles(dt);
      updateRagdolls(dt);
    }
  }

  // обновляем состояние адаптивной музыки (движение/спринт/бой)
  updateMusicState();

  if (game.shakeTimer > 0) game.shakeTimer = Math.max(0, game.shakeTimer - dt);
  else game.shakeMag = 0;
  if (game.damageFlash > 0) game.damageFlash = Math.max(0, game.damageFlash - dt);
  const shake = getShakeOffset();

  ctx.save();
  ctx.translate(shake.x, shake.y);

  drawBgFar();
  drawBgMid();
  drawSnow(dt);
  drawTilemap(dt);
  drawPortal();
  drawHostages();
  drawEnemies();
  if (typeof drawBoss === 'function') drawBoss();
  drawItems();
  drawProjectiles();
  drawPlayer();
  // эффекты поверх всех игровых сущностей
  drawRagdolls();
  drawParticles();
  drawSpeech();
  drawEnemySpeech();

  ctx.restore();

  // ── DAMAGE FLASH — белая виньетка по краям экрана ───────────────
  if (game.damageFlash > 0) {
    const a = game.damageFlash / 0.3; // 1 → 0
    ctx.globalAlpha = a;
    ctx.fillStyle = '#fff';
    const thick = Math.round(20 * a);
    ctx.fillRect(0, 0, GW, thick);           // top
    ctx.fillRect(0, GH - thick, GW, thick);  // bottom
    ctx.fillRect(0, 0, thick, GH);           // left
    ctx.fillRect(GW - thick, 0, thick, GH);  // right
    ctx.globalAlpha = 1;
  }

  drawHUD();
  if (player.dead && player.dtimer > 1.2) drawDeath();
  if (game.levelComplete) drawVictory();
  if (game.paused && !game.levelComplete) drawPause();
  requestAnimationFrame(loop);
}

// ── INIT ──────────────────────────────────────────────────────────────
function initLevel() {
  const lvl = game.currentLevel;
  // очищаем ambient — если музыка включена, перезапустим ниже
  if (game.ambientTimer) { clearTimeout(game.ambientTimer); game.ambientTimer = null; }
  if (game.musicOn) setTimeout(startAmbient, 500);
  Object.keys(tileHP).forEach(k => delete tileHP[k]);
  Object.keys(tileFlash).forEach(k => delete tileFlash[k]);
  generateMap(lvl);
  buildSurfaceGraph();

  // Разветвление: ручной ASCII-уровень ИЛИ процедурная генерация
  const useAscii = typeof hasAsciiLevel === 'function' && hasAsciiLevel(lvl);
  let bossSpec = null;

  if (useAscii) {
    // applyAsciiLevel сам спавнит всех врагов, предметы, заложников
    const result = applyAsciiLevel(getAsciiLevel(lvl));
    bossSpec = result.bossSpec;
    if (typeof resetFirstEnemy === "function") resetFirstEnemy();
  } else {
    // Процедурная генерация: стандартные модули
    initEnemies(lvl);
    if (typeof resetFirstEnemy === "function") resetFirstEnemy();
    initItems();
    initHostages();
    initPortal();
  }

  // Босс: если в ASCII задан явно через 'B' — ставим там, иначе как было (initBoss по позиции)
  if (useAscii && bossSpec) {
    // спавним босса в указанной позиции
    if (typeof initBoss === 'function') {
      initBoss(lvl); // создаёт boss объект по стандартной логике
      if (typeof boss !== 'undefined' && boss) {
        // переопределяем позицию X на ту что в ASCII
        boss.x = bossSpec.tx * T;
        boss._homeX = boss.x;
        // пересчитываем Y ног — берём землю под позицией B в ASCII
        const footTX = bossSpec.tx;
        let footY = MH * T;
        for (let y = bossSpec.ty; y < MH; y++) {
          if (MAP[y] && MAP[y][footTX]) { footY = y * T; break; }
        }
        boss._legGroundY = footY;
        boss.y = footY - T * 4 - boss.h + 8;
      }
    }
  } else {
    initBoss(lvl);
  }

  START.y = findSpawnY(2, player.h);
  player.y = START.y;
  game.levelComplete = false;
  game.levelTimer = 0; // сброс таймера уровня
  setTimeout(() => say('start'), 800);
}

loadRecords();
initLevel();
requestAnimationFrame(ts => { game.lastT = ts; requestAnimationFrame(loop); });
