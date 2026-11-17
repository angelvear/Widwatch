// Anfitrión de temas de WidWatch.
//
// Carga el tema elegido, le pasa la hora en cada "tick" y reacciona a los
// cambios de ajustes que llegan desde el menú. Funciona igual dentro de Tauri
// que en un navegador normal (útil para diseñar temas): abre
// index.html?theme=analog en cualquier servidor estático.

const TAURI = window.__TAURI__ ?? null;
const invoke = (cmd, args) => (TAURI ? TAURI.core.invoke(cmd, args) : Promise.resolve());

const stage = document.getElementById('stage');
const themeCss = document.getElementById('theme-css');
const params = new URLSearchParams(location.search);

/** Ajustes por defecto cuando no estamos dentro de la app (modo navegador). */
let settings = {
  theme: params.get('theme') ?? 'digital',
  scale: Number(params.get('scale') ?? 1),
  hour24: params.get('hour24') !== '0',
  showSeconds: params.get('seconds') !== '0',
};

let manifests = new Map();
let current = null; // { id, manifest, module, root, ctx }
let rafId = 0;
let timerId = 0;

async function loadManifests() {
  const ids = await fetch('themes/themes.json').then((r) => r.json());
  const list = await Promise.all(
    ids.map(async (id) => {
      try {
        const m = await fetch(`themes/${id}/manifest.json`).then((r) => r.json());
        return { ...m, id };
      } catch (err) {
        console.warn(`[WidWatch] El tema "${id}" no tiene manifest.json válido`, err);
        return null;
      }
    }),
  );
  return new Map(list.filter(Boolean).map((m) => [m.id, m]));
}

function makeContext(manifest) {
  return {
    settings: { ...settings },
    manifest,
    /** Ruta a un recurso dentro de la carpeta del tema (imágenes, fuentes…). */
    asset: (path) => `themes/${manifest.id}/${path}`,
    /** true si el usuario pidió menos animaciones en Windows. */
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
  };
}

function stopTicking() {
  cancelAnimationFrame(rafId);
  clearTimeout(timerId);
}

function startTicking() {
  stopTicking();
  if (!current) return;
  const { module, ctx, manifest } = current;

  if (manifest.tick === 'frame') {
    const loop = () => {
      module.update?.(new Date(), ctx);
      rafId = requestAnimationFrame(loop);
    };
    loop();
  } else {
    // Un tick por segundo, alineado con el cambio real de segundo.
    const loop = () => {
      const now = new Date();
      module.update?.(now, ctx);
      timerId = setTimeout(loop, 1000 - now.getMilliseconds() + 5);
    };
    loop();
  }
}

function applySize(manifest) {
  const { width, height } = manifest.size ?? { width: 300, height: 120 };
  const scale = settings.scale || 1;
  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;
  stage.style.transform = `scale(${scale})`;
  stage.style.setProperty('--widwatch-scale', scale);
  return invoke('resize_window', { width: width * scale, height: height * scale });
}

async function mountTheme(id) {
  const manifest = manifests.get(id) ?? manifests.values().next().value;
  if (!manifest) throw new Error('No hay ningún tema disponible');

  stopTicking();
  current?.module.unmount?.(current.ctx);
  stage.replaceChildren();

  themeCss.href = `themes/${manifest.id}/${manifest.style ?? 'style.css'}`;
  const module = (await import(`./themes/${manifest.id}/${manifest.script ?? 'clock.js'}`)).default;

  const root = document.createElement('div');
  root.className = `theme theme-${manifest.id}`;
  stage.append(root);

  const ctx = makeContext(manifest);
  current = { id: manifest.id, manifest, module, root, ctx };
  module.mount(root, ctx);
  await applySize(manifest);

  stage.classList.remove('entering');
  void stage.offsetWidth; // reinicia la animación de entrada
  stage.classList.add('entering');
  startTicking();
}

async function applySettings(next) {
  const prev = settings;
  settings = { ...settings, ...next };

  if (!current || prev.theme !== settings.theme) {
    await mountTheme(settings.theme);
    return;
  }

  current.ctx.settings = { ...settings };
  if (prev.scale !== settings.scale) await applySize(current.manifest);
  current.module.settingsChanged?.(current.ctx);
  current.module.update?.(new Date(), current.ctx);
}

// Arrastrar el reloj con el botón izquierdo, menú con el derecho.
stage.addEventListener('mousedown', (e) => {
  if (e.button === 0 && TAURI) TAURI.window.getCurrentWindow().startDragging();
});
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  invoke('show_context_menu');
});

// Ahorra batería: si la ventana no se ve, no animamos.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) stopTicking();
  else startTicking();
});

async function boot() {
  manifests = await loadManifests();

  if (TAURI) {
    settings = { ...settings, ...(await invoke('get_settings')) };
    await invoke('register_themes', {
      themes: [...manifests.values()].map((m) => ({ id: m.id, name: m.name })),
    });
    await TAURI.event.listen('settings-changed', (e) => applySettings(e.payload));
  }

  await mountTheme(settings.theme);
  await invoke('clock_ready');
}

boot().catch((err) => {
  console.error('[WidWatch]', err);
  invoke('clock_ready');
});
