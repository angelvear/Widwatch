// Tema "Matriz de puntos": cada dígito es una rejilla de 5×7 puntos LED.
// Para añadir caracteres nuevos (letras, símbolos) basta con ampliar FONT.

const NS = 'http://www.w3.org/2000/svg';

/** Fuente 5×7: cada carácter son 7 filas de 5 columnas ("1" = punto encendido). */
const FONT = {
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  ':': ['0', '0', '1', '0', '1', '0', '0'],
};

const ROWS = 7;
const PITCH = 10; // distancia entre centros de puntos
const RADIUS = 3.6;
const PAD_X = 18;
const PAD_Y = 22;

const pad = (n) => String(n).padStart(2, '0');

/** Un carácter de la matriz: guarda sus puntos para encenderlos/apagarlos. */
class DotChar {
  constructor(svg, col, width) {
    this.dots = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < width; c++) {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', PAD_X + (col + c) * PITCH + PITCH / 2);
        dot.setAttribute('cy', PAD_Y + r * PITCH + PITCH / 2);
        dot.setAttribute('r', RADIUS);
        dot.setAttribute('class', 'dot');
        svg.append(dot);
        row.push(dot);
      }
      this.dots.push(row);
    }
    this.value = null;
  }

  set(char) {
    if (char === this.value) return;
    this.value = char;
    const glyph = FONT[char] ?? FONT[' '];
    this.dots.forEach((row, r) =>
      row.forEach((dot, c) => dot.classList.toggle('on', glyph[r][c] === '1')),
    );
  }
}

export default {
  mount(root, ctx) {
    this.root = root;
    this.build(ctx.settings.showSeconds);
  },

  /** Crea la rejilla. Se rehace solo si cambia "Mostrar segundos". */
  build(showSeconds) {
    this.showSeconds = showSeconds;
    const layout = showSeconds ? 'dd:dd:dd' : 'dd:dd';

    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('class', 'matrix');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const bg = document.createElementNS(NS, 'rect');
    bg.setAttribute('class', 'panel');
    svg.append(bg);

    this.digits = [];
    this.colons = [];
    let col = 0;
    for (const [i, token] of [...layout].entries()) {
      if (i > 0) col += 1; // una columna de separación entre caracteres
      if (token === 'd') {
        this.digits.push(new DotChar(svg, col, 5));
        col += 5;
      } else {
        const colon = new DotChar(svg, col, 1);
        colon.set(':');
        this.colons.push(colon);
        col += 1;
      }
    }

    const w = col * PITCH + PAD_X * 2;
    const h = ROWS * PITCH + PAD_Y * 2;
    svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    Object.entries({ x: 1, y: 1, width: w - 2, height: h - 2, rx: 18 }).forEach(([k, v]) =>
      bg.setAttribute(k, v),
    );

    this.root.replaceChildren(svg);
  },

  update(now, { settings, reducedMotion }) {
    if (settings.showSeconds !== this.showSeconds) this.build(settings.showSeconds);
    this.root.classList.toggle('no-anim', reducedMotion);

    let h = now.getHours();
    if (!settings.hour24) h = h % 12 || 12;
    // En 12 h se oculta el cero inicial ("9:05" en vez de "09:05"), como en un panel real.
    const hh = settings.hour24 ? pad(h) : String(h).padStart(2, ' ');
    const text = hh + pad(now.getMinutes()) + pad(now.getSeconds());

    this.digits.forEach((d, i) => d.set(text[i]));

    const blink = now.getSeconds() % 2 === 1 && !reducedMotion;
    for (const c of this.colons) c.set(blink ? ' ' : ':');
  },
};
