// Tema "Ana-Digi retro": esfera analógica + pantalla LCD de 7 segmentos.
// Diseño original de TicTac inspirado en los relojes analógico-digitales de los 80.

const NS = 'http://www.w3.org/2000/svg';
const CX = 115; // centro de las agujas
const CY = 118;

function el(tag, attrs = {}, parent) {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  parent?.append(n);
  return n;
}

// --- Dígito de 7 segmentos -------------------------------------------------
//  aaa
// f   b
//  ggg
// e   c
//  ddd
const SEGMENTS = {
  a: [1.6, 0, 6.8, 2], g: [1.6, 8, 6.8, 2], d: [1.6, 16, 6.8, 2],
  f: [0, 1.4, 2, 6.8], b: [8, 1.4, 2, 6.8],
  e: [0, 9.8, 2, 6.8], c: [8, 9.8, 2, 6.8],
};
const DIGITS = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];

class Segment7 {
  constructor(parent, x, y, scale = 1) {
    const g = el('g', { transform: `translate(${x} ${y}) scale(${scale}) skewX(-7)` }, parent);
    this.segs = Object.fromEntries(
      Object.entries(SEGMENTS).map(([k, [sx, sy, w, h]]) => [
        k,
        el('rect', { x: sx, y: sy, width: w, height: h, rx: 0.7, class: 'seg' }, g),
      ]),
    );
  }
  set(digit) {
    const on = DIGITS[digit] ?? '';
    for (const [k, r] of Object.entries(this.segs)) r.classList.toggle('on', on.includes(k));
  }
}

// --- Índices sobre una esfera rectangular ----------------------------------
function indexPoint(deg, halfW, halfH) {
  const a = (deg * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const t = Math.min(Math.abs(halfW / dx || Infinity), Math.abs(halfH / dy || Infinity));
  return [dx, dy, t];
}

const DAYS = ['DO', 'LU', 'MA', 'MI', 'JU', 'VI', 'SA'];

export default {
  mount(root) {
    // El viewBox recorta justo la esfera (la ventana no muestra nada más).
    const s = el('svg', { viewBox: '31 37 168 210', class: 'watch' }, root);

    const defs = el('defs', {}, s);
    defs.innerHTML = `
      <radialGradient id="ad-dial" cx=".35" cy=".25" r="1">
        <stop offset="0" stop-color="#f6eedb"/><stop offset=".6" stop-color="#e3d5b3"/>
        <stop offset="1" stop-color="#c9b88e"/>
      </radialGradient>
      <filter id="ad-glow" x="-20%" y="-50%" width="140%" height="200%">
        <feGaussianBlur stdDeviation="3"/>
      </filter>`;

    // Solo la esfera: sin caja ni correa
    el('rect', { x: 37, y: 41, width: 156, height: 198, rx: 33, fill: 'url(#ad-dial)', class: 'dial' }, s);
    el('rect', { x: 39.5, y: 43.5, width: 151, height: 193, rx: 31, class: 'dial-edge' }, s);

    // Índices: se omiten los que caerían sobre la pantalla LCD
    for (let i = 0; i < 12; i++) {
      const deg = i * 30;
      const [dx, dy, t] = indexPoint(deg, 64, 70);
      const x1 = CX + dx * t;
      const y1 = CY + dy * t;
      if (y1 > 168) continue;
      const len = i % 3 === 0 ? 12 : 8;
      el('line', {
        x1, y1, x2: CX + dx * (t - len), y2: CY + dy * (t - len),
        class: i % 3 === 0 ? 'index major' : 'index',
      }, s);
    }

    const brand = el('text', { x: CX, y: 74, class: 'brand' }, s);
    brand.textContent = 'TICTAC';
    const sub = el('text', { x: CX, y: 85, class: 'sub' }, s);
    sub.textContent = 'ANA · DIGI';

    // Pantalla LCD
    const lcd = el('g', { class: 'lcd' }, s);
    el('rect', { x: 62, y: 184, width: 106, height: 34, rx: 4, class: 'lcd-frame' }, lcd);
    el('rect', { x: 66, y: 188, width: 98, height: 26, rx: 2, class: 'lcd-glow', filter: 'url(#ad-glow)' }, lcd);
    el('rect', { x: 66, y: 188, width: 98, height: 26, rx: 2, class: 'lcd-bg' }, lcd);

    this.day = el('text', { x: 71, y: 199, class: 'lcd-day' }, lcd);
    this.pm = el('text', { x: 71, y: 210, class: 'lcd-pm' }, lcd);
    this.digits = [
      new Segment7(lcd, 88, 192),
      new Segment7(lcd, 100, 192),
      new Segment7(lcd, 116, 192),
      new Segment7(lcd, 128, 192),
      new Segment7(lcd, 143, 198, 0.62),
      new Segment7(lcd, 151, 198, 0.62),
    ];
    this.colon = el('g', { class: 'lcd-colon' }, lcd);
    el('rect', { x: 111, y: 196, width: 2, height: 2, class: 'seg on' }, this.colon);
    el('rect', { x: 110.2, y: 203, width: 2, height: 2, class: 'seg on' }, this.colon);

    // Agujas (encima de todo)
    this.hour = el('g', { class: 'hand' }, s);
    el('rect', { x: CX - 3, y: CY - 40, width: 6, height: 48, rx: 2, class: 'hand-body' }, this.hour);
    el('rect', { x: CX - 1, y: CY - 36, width: 2, height: 26, rx: 1, class: 'hand-lume' }, this.hour);

    this.minute = el('g', { class: 'hand' }, s);
    el('rect', { x: CX - 2.3, y: CY - 64, width: 4.6, height: 72, rx: 2, class: 'hand-body' }, this.minute);
    el('rect', { x: CX - 0.8, y: CY - 60, width: 1.6, height: 44, rx: 1, class: 'hand-lume' }, this.minute);

    this.second = el('g', { class: 'hand second' }, s);
    el('line', { x1: CX, y1: CY + 16, x2: CX, y2: CY - 70, class: 'sec' }, this.second);

    el('circle', { cx: CX, cy: CY, r: 4.5, class: 'pin' }, s);
    el('circle', { cx: CX, cy: CY, r: 1.6, class: 'pin-dot' }, s);
  },

  update(now, { settings, reducedMotion }) {
    const h = now.getHours();
    const m = now.getMinutes();
    const sec = now.getSeconds();

    // Agujas analógicas. El segundero salta como un cuarzo de verdad; usamos un
    // ángulo que siempre crece para que la transición no gire hacia atrás en el 59→0.
    const totalSec = Math.floor(now.getTime() / 1000);
    const rot = (g, deg) => (g.style.transform = `rotate(${deg}deg)`);
    rot(this.hour, ((h % 12) + m / 60) * 30);
    rot(this.minute, (m + sec / 60) * 6);
    rot(this.second, totalSec * 6);
    this.second.style.display = settings.showSeconds ? '' : 'none';
    this.second.classList.toggle('instant', reducedMotion);

    // Pantalla LCD
    let hh = h;
    if (!settings.hour24) hh = h % 12 || 12;
    this.pm.textContent = !settings.hour24 && h >= 12 ? 'PM' : '';
    this.day.textContent = DAYS[now.getDay()];

    const d = [Math.floor(hh / 10), hh % 10, Math.floor(m / 10), m % 10, Math.floor(sec / 10), sec % 10];
    d.forEach((v, i) => this.digits[i].set(i === 0 && v === 0 && !settings.hour24 ? -1 : v));
    this.colon.classList.toggle('off', sec % 2 === 1 && !reducedMotion);
  },
};
