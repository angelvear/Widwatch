# Cómo contribuir a TicTac

Gracias por echar una mano. Hay dos formas principales de contribuir:

1. **Crear un tema** (solo HTML, CSS y JavaScript). Es lo más fácil y lo que más se agradece.
2. **Mejorar la app** (Rust en `src-tauri/` o el anfitrión en `src/host.js`).

Para cambios grandes, abre antes un *issue* y lo hablamos.

---

## Crea tu primer tema en 10 minutos

### 1. Copia la plantilla

```
src/themes/_plantilla/  →  src/themes/mi-tema/
```

El nombre de la carpeta es el **id** del tema: minúsculas, números y guiones.

### 2. Regístralo

Añade el id a `src/themes/themes.json`:

```json
["digital", "analog", "flip", "text", "mi-tema"]
```

### 3. Rellena `manifest.json`

```json
{
  "name": "Mi tema",
  "description": "Una frase que lo describa.",
  "author": "Tu nombre o usuario de GitHub",
  "version": "1.0.0",
  "license": "MIT",
  "size": { "width": 300, "height": 120 },
  "tick": "second"
}
```

| Campo | Para qué sirve |
|---|---|
| `size` | Tamaño de la ventana al 100 %, en píxeles. La app lo multiplica por la escala que elija el usuario. |
| `tick` | `"second"`: `update()` se llama una vez por segundo. `"frame"`: en cada fotograma (para animaciones fluidas, gasta más). |
| `script`, `style` | Opcionales, por si tus archivos no se llaman `clock.js` y `style.css`. |

### 4. Programa `clock.js`

Un tema es un módulo que exporta un objeto con estos métodos:

```js
export default {
  mount(root, ctx) {},          // obligatorio: crea tu HTML/SVG/canvas dentro de root
  update(now, ctx) {},          // obligatorio: dibuja la hora (now es un Date)
  settingsChanged(ctx) {},      // opcional: el usuario cambió algo en el menú
  unmount(ctx) {},              // opcional: limpia timers y listeners
};
```

`ctx` contiene:

| Propiedad | Ejemplo |
|---|---|
| `ctx.settings.hour24` | `true` si el usuario quiere formato 24 h |
| `ctx.settings.showSeconds` | `true` si quiere ver los segundos |
| `ctx.manifest` | tu `manifest.json` |
| `ctx.asset('img/fondo.png')` | ruta a un archivo dentro de la carpeta de tu tema |
| `ctx.reducedMotion` | `true` si Windows tiene las animaciones desactivadas: respétalo |

### 5. Pruébalo

```bash
npm install
npm run preview
```

- `http://localhost:5173/gallery.html` muestra todos los temas sobre un fondo tipo escritorio.
- `http://localhost:5173/index.html?theme=mi-tema&hour24=0&seconds=0` muestra solo el tuyo con otros ajustes.

Si tienes Rust instalado, `npm run dev` lo abre como reloj real.

### Normas para los temas

- **Prefija todo el CSS** con `.theme-<id>` para no romper otros temas.
- **Sin recursos externos**: nada de CDN, Google Fonts ni llamadas a internet. Si usas una fuente, inclúyela en tu carpeta y comprueba que su licencia lo permita.
- **Fondo transparente** fuera de tu diseño: la ventana no tiene marco.
- **Que se lea** sobre fondos claros y oscuros (una sombra de texto ayuda mucho).
- **Ligero**: si usas `"tick": "frame"`, evita reconstruir el DOM en cada fotograma; cambia solo atributos o `transform`.
- Solo trabajo original o con licencia compatible con MIT. Nada de personajes, logos o marcas de terceros.

---

## Mejorar la app

- `src/host.js`: carga de temas, ticks, escala, arrastre.
- `src-tauri/src/lib.rs`: ventana, bandeja, menú y comandos que usa el JavaScript.
- `src-tauri/src/settings.rs`: ajustes guardados en disco.

Antes de abrir el *pull request*:

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml
```

## Pull requests

- Uno por tema o por mejora.
- En la descripción: qué cambia y, si es visual, **una captura o GIF**.
- Los mensajes de commit pueden ir en español o en inglés.
