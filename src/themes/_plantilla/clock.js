// Plantilla de tema para TicTac.
// 1. Copia esta carpeta y renómbrala (solo minúsculas, números y guiones: "mi-tema").
// 2. Añade el nombre de la carpeta a src/themes/themes.json.
// 3. Ábrela en la galería (npm run preview → /gallery.html) y ¡a diseñar!

export default {
  /**
   * Se llama una vez al cargar el tema.
   * @param {HTMLElement} root  Contenedor vacío con la clase "theme theme-<id>".
   * @param {object} ctx        { settings, manifest, asset(ruta), reducedMotion }
   */
  mount(root, ctx) {
    root.innerHTML = `<div class="hora"></div>`;
    this.hora = root.querySelector('.hora');
  },

  /**
   * Se llama en cada tick: una vez por segundo ("tick": "second")
   * o en cada fotograma ("tick": "frame") según tu manifest.json.
   * @param {Date} now
   * @param {object} ctx  ctx.settings → { hour24, showSeconds, scale, theme }
   */
  update(now, { settings }) {
    this.hora.textContent = now.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
      second: settings.showSeconds ? '2-digit' : undefined,
      hour12: !settings.hour24,
    });
  },

  /** Opcional: el usuario cambió algún ajuste desde el menú. */
  settingsChanged(ctx) {},

  /** Opcional: limpia timers, listeners… antes de cambiar a otro tema. */
  unmount(ctx) {},
};
