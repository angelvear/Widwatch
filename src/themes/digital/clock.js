// Tema "Digital minimal": el ejemplo más sencillo, ideal para copiarlo como base.

const pad = (n) => String(n).padStart(2, '0');

export default {
  mount(root) {
    root.innerHTML = `
      <div class="panel">
        <div class="time">
          <span class="hh"></span><span class="colon">:</span><span class="mm"></span>
          <span class="ss"></span>
          <span class="ampm"></span>
        </div>
        <div class="date"></div>
      </div>`;
    this.el = {
      hh: root.querySelector('.hh'),
      mm: root.querySelector('.mm'),
      ss: root.querySelector('.ss'),
      ampm: root.querySelector('.ampm'),
      colon: root.querySelector('.colon'),
      date: root.querySelector('.date'),
    };
    this.dateFmt = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  },

  update(now, { settings }) {
    const { hh, mm, ss, ampm, colon, date } = this.el;
    let h = now.getHours();
    if (!settings.hour24) {
      ampm.textContent = h < 12 ? 'AM' : 'PM';
      h = h % 12 || 12;
    } else {
      ampm.textContent = '';
    }
    hh.textContent = settings.hour24 ? pad(h) : String(h);
    mm.textContent = pad(now.getMinutes());
    ss.textContent = settings.showSeconds ? pad(now.getSeconds()) : '';
    colon.classList.toggle('dim', now.getSeconds() % 2 === 1);
    date.textContent = this.dateFmt.format(now);
  },
};
