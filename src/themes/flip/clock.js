// Tema "Flip clock": cada dígito es una tarjeta partida en dos mitades.
// Cuando el dígito cambia, la mitad de arriba cae (con el valor viejo) y
// la de abajo se despliega (con el nuevo).

class FlipDigit {
  constructor(parent) {
    this.el = document.createElement('div');
    this.el.className = 'card';
    this.el.innerHTML = `
      <div class="half upper"><span></span></div>
      <div class="half lower"><span></span></div>
      <div class="flap front"><span></span></div>
      <div class="flap back"><span></span></div>`;
    [this.upper, this.lower, this.front, this.back] = [...this.el.querySelectorAll('span')];
    this.value = null;
    this.el.querySelector('.back').addEventListener('animationend', () => {
      this.lower.textContent = this.value;
      this.el.classList.remove('flipping');
    });
    parent.append(this.el);
  }

  set(next, animate) {
    if (next === this.value) return;
    const prev = this.value ?? next;
    this.value = next;

    if (!animate) {
      for (const s of [this.upper, this.lower, this.front, this.back]) s.textContent = next;
      return;
    }
    this.upper.textContent = next;
    this.lower.textContent = prev;
    this.front.textContent = prev;
    this.back.textContent = next;
    this.el.classList.remove('flipping');
    void this.el.offsetWidth; // reinicia la animación
    this.el.classList.add('flipping');
  }
}

const pad = (n) => String(n).padStart(2, '0');

export default {
  mount(root) {
    const wrap = document.createElement('div');
    wrap.className = 'flip';
    root.append(wrap);

    const group = (cls) => {
      const g = document.createElement('div');
      g.className = `group ${cls}`;
      wrap.append(g);
      return [new FlipDigit(g), new FlipDigit(g)];
    };
    const sep = (cls) => {
      const s = document.createElement('div');
      s.className = `sep ${cls}`;
      s.innerHTML = '<i></i><i></i>';
      wrap.append(s);
    };

    this.h = group('hours');
    sep('sep-min');
    this.m = group('minutes');
    sep('sep-sec');
    this.s = group('seconds');
    this.wrap = wrap;
    this.first = true;
  },

  update(now, { settings, reducedMotion }) {
    let h = now.getHours();
    if (!settings.hour24) h = h % 12 || 12;
    const digits = [pad(h), pad(now.getMinutes()), pad(now.getSeconds())];
    const animate = !this.first && !reducedMotion;

    [this.h, this.m, this.s].forEach((pair, i) => {
      pair[0].set(digits[i][0], animate);
      pair[1].set(digits[i][1], animate);
    });
    this.wrap.classList.toggle('no-seconds', !settings.showSeconds);
    this.first = false;
  },
};
