// NUKED MAN — particles.js

const particles = [];

function spawnHitParticles(x, y) {
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2;
    const spd = 40 + Math.random() * 40;
    particles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd-10, life:1, maxLife:0.25+Math.random()*0.15, size:2, type:'sq' });
  }
  for (let i = 0; i < 5; i++) {
    const ang = (i / 5) * Math.PI * 2 + 0.3;
    const spd = 20 + Math.random() * 25;
    particles.push({ x, y, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd-30, life:1, maxLife:0.4+Math.random()*0.2, size:3, type:'star' });
  }
  particles.push({ x, y, life:1, maxLife:0.12, size:10, type:'flash', vx:0, vy:0 });
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const q = particles[i];
    q.x += q.vx * dt;
    q.y += q.vy * dt;
    q.vy += 180 * dt;
    q.life -= dt / q.maxLife;
    if (q.life <= 0) particles.splice(i, 1);
  }
}

function drawParticles() {
  for (const q of particles) {
    const a = q.life;
    if (q.type === 'flash') {
      if (a > 0.5) {
        ctx.fillStyle = '#fff';
        const s = Math.round(q.size * (2 - a * 2));
        const fx = Math.round(q.x), fy = Math.round(q.y);
        ctx.fillRect(fx - s, fy - 1, s * 2, 2);
        ctx.fillRect(fx - 1, fy - s, 2, s * 2);
      }
    } else if (q.type === 'star') {
      if (a > 0.15) {
        ctx.fillStyle = a > 0.6 ? '#fff' : '#E4E4E4';
        const px2 = Math.round(q.x), py2 = Math.round(q.y);
        ctx.fillRect(px2, py2 - 2, 1, 5);
        ctx.fillRect(px2 - 2, py2, 5, 1);
        ctx.fillRect(px2, py2, 2, 2);
      }
    } else {
      if (a > 0.1) {
        ctx.fillStyle = a > 0.5 ? '#E4E4E4' : '#888';
        ctx.fillRect(Math.round(q.x), Math.round(q.y), q.size, q.size);
      }
    }
  }
}
