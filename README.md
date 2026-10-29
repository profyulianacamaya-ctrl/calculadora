# Series de Tiempo — Método de Promedio Móvil

Calculadora web (PWA, funciona sin conexión) del método de promedio móvil con modelo multiplicativo:
índices estacionales, factor de corrección, desestacionalización, recta de tendencia y pronóstico.

## Archivos

| Archivo | Qué es |
|---|---|
| `index.html` | Interfaz (CSS y JS embebidos) |
| `calc.js` | Lógica de cálculo, funciones puras (la usan la app y los tests) |
| `manifest.json`, `sw.js` | Instalación como app y uso sin conexión |
| `icon.svg`, `icon-180/192/512.png` | Íconos |
| `test.js` | Pruebas de cálculo: `node test.js` |

## Probar localmente

Abrir `index.html` con doble clic ya funciona (sin modo offline). Para probar también el service worker,
servir la carpeta por HTTP:

```bash
npx serve .
```

y abrir la dirección que muestra (por ejemplo, `http://localhost:3000`).

## Publicar gratis

**GitHub Pages**
1. Crear un repositorio público y subir el contenido de esta carpeta (menos `test.js` si se quiere).
2. En el repositorio: *Settings → Pages → Source: Deploy from a branch → `main` / `(root)` → Save*.
3. En un par de minutos queda en `https://USUARIO.github.io/REPOSITORIO/`.

**Netlify**
1. Entrar a <https://app.netlify.com/drop>.
2. Arrastrar esta carpeta. Queda publicada al instante en una dirección `*.netlify.app`.

## Instalar en el celular

Abrir la dirección publicada y elegir *Agregar a la pantalla de inicio* (Safari: botón Compartir; Chrome: menú ⋮).

## Al actualizar la app

Cambiar `VERSION` en `sw.js` (por ejemplo, `serie-pm-v2`) para que los celulares descarguen la versión nueva.
