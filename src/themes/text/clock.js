// Tema "En palabras": redondea a los 5 minutos más cercanos y lo dice en español.

const HOURS = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis',
  'siete', 'ocho', 'nueve', 'diez', 'once'];

const PAST = { 0: 'en punto', 5: 'y cinco', 10: 'y diez', 15: 'y cuarto',
  20: 'y veinte', 25: 'y veinticinco', 30: 'y media' };
const TO = { 35: 'menos veinticinco', 40: 'menos veinte', 45: 'menos cuarto',
  50: 'menos diez', 55: 'menos cinco' };

function partOfDay(h) {
  if (h < 6) return 'de la madrugada';
  if (h < 13) return 'de la mañana';
  if (h < 21) return 'de la tarde';
  return 'de la noche';
}

export function toWords(date) {
  let h = date.getHours();
  let m = Math.round((date.getMinutes() + date.getSeconds() / 60) / 5) * 5;
  if (m === 60) { m = 0; h += 1; }
  const shown = m > 30 ? h + 1 : h;      // "las cuatro menos cuarto"
  const h24 = shown % 24;
  const word = HOURS[h24 % 12];
  const verb = word === 'una' ? 'Es la' : 'Son las';
  return {
    lead: verb,
    hour: word,
    minutes: m > 30 ? TO[m] : PAST[m],
    tail: h24 === 0 && m === 0 ? 'medianoche' : h24 === 12 && m === 0 ? 'mediodía' : partOfDay(h24),
  };
}

export default {
  mount(root) {
    root.innerHTML = `
      <p class="phrase">
        <span class="lead"></span>
        <strong class="hour"></strong>
        <span class="minutes"></span>
      </p>
      <p class="tail"></p>`;
    this.el = Object.fromEntries(
      ['lead', 'hour', 'minutes', 'tail'].map((k) => [k, root.querySelector(`.${k}`)]),
    );
    this.root = root;
  },

  update(now) {
    const w = toWords(now);
    const key = Object.values(w).join('|');
    if (key === this.last) return;   // solo cambia cada ~5 minutos
    const first = this.last === undefined;
    this.last = key;

    for (const [k, v] of Object.entries(w)) this.el[k].textContent = v;
    if (!first) {
      this.root.classList.remove('changed');
      void this.root.offsetWidth;
      this.root.classList.add('changed');
    }
  },
};
