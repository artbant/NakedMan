// NUKED MAN — constants.js
// Глобальные константы и canvas setup

const CV = document.getElementById('c');
const ctx = CV.getContext('2d');
ctx.imageSmoothingEnabled = false;
const GW = 480, GH = 270;
CV.width = GW; CV.height = GH;

const T = 24; // tile size

const isMobile = 'ontouchstart' in window;
if (isMobile) {
  document.getElementById('mob').style.display = 'flex';
  document.getElementById('kb').style.display = 'none';
}

const MH = 11; // 11 тайлов высотой × T=24 = 264px ≈ GH=270
let secretRooms = [];

function rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function rndTex() { return rnd(1, 8); }
