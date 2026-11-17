// Tema "Analógico clásico": ejemplo de tema con SVG y animación a 60 fps
// (manifest.json → "tick": "frame").

const NS = 'http://www.w3.org/2000/svg';

function svg(tag, attrs, parent) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  parent?.append(el);
  return el;
}

export default {
  mount(root) {
    const s = svg('svg', { viewBox: '-110 -110 220 220', class: 'face' }, root);
    svg('circle', { r: 104, class: 'rim' }, s);
    svg('circle', { r: 98, class: 'dial' }, s);

    for (let i = 0; i < 60; i++) {
      const major = i % 5 === 0;
      svg('line', {
        x1: 0, y1: major ? -80 : -86, x2: 0, y2: -91,
        class: major ? 'tick major' : 'tick',
        transform: `rotate(${i * 6})`,
      }, s);
    }
    for (let n = 1; n <= 12; n++) {
      const a = (n * 30 * Math.PI) / 180;
      const t = svg('text', { x: Math.sin(a) * 66, y: -Math.cos(a) * 66 + 5, class: 'num' }, s);
      t.textContent = n;
    }

    this.date = svg('text', { x: 0, y: 40, class: 'date' }, s);
    this.hour = svg('line', { x1: 0, y1: 12, x2: 0, y2: -48, class: 'hand hour' }, s);
    this.minute = svg('line', { x1: 0, y1: 14, x2: 0, y2: -72, class: 'hand minute' }, s);
    this.second = svg('g', { class: 'second' }, s);
    svg('line', { x1: 0, y1: 20, x2: 0, y2: -84, class: 'hand sec' }, this.second);
    svg('circle', { r: 5, class: 'hub' }, s);
    svg('circle', { r: 2, class: 'hub-dot' }, s);
  },

  update(now, { settings, reducedMotion }) {
    const ms = now.getMilliseconds();
    // Con "menos animaciones" activado en Windows, el segundero salta en vez de barrer.
    const sec = now.getSeconds() + (reducedMotion ? 0 : ms / 1000);
    const min = now.getMinutes() + sec / 60;
    const hr = (now.getHours() % 12) + min / 60;

    this.hour.setAttribute('transform', `rotate(${hr * 30})`);
    this.minute.setAttribute('transform', `rotate(${min * 6})`);
    this.second.setAttribute('transform', `rotate(${sec * 6})`);
    this.second.style.display = settings.showSeconds ? '' : 'none';

    const day = now.getDate();
    if (this.lastDay !== day) {
      this.lastDay = day;
      this.date.textContent = now
        .toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
        .toUpperCase();
    }
  },
};
