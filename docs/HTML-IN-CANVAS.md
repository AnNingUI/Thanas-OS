# HTML-in-Canvas Desktop Mode

ThanasOS can render the **entire desktop** (wallpaper, widgets, menu bar, windows, dock)
as one WebGPU texture, captured from real DOM through
[HTML-in-Canvas](https://github.com/WICG/html-in-canvas) (`canvas[content="drawable"]`).
Window actions then get the same effect vocabulary as
`Macos-Genie-Effect-With-WebGPU`: smoke dissolve on close, funnel collapse into the
dock on minimize, and a live window resize on maximize/restore.

![Desktop rendered through the WebGPU canvas](assets/canvas-desktop.png)

It is **opt-in**: Settings → Displays → *HTML-in-Canvas*. Default is off, and the
browser-support check falls back to plain DOM without ever blanking the page.

| Close (red) | Minimize (yellow) | Restore (reverse) |
| --- | --- | --- |
| ![smoke](assets/smoke.png) | ![genie](assets/genie.png) | ![genie restore](assets/genie-restore.png) |

![Displays settings](assets/settings-durations.png)

Maximize/restore is **not** a canvas effect: the window's real DOM geometry is animated
with a CSS transition, so the app content reflows every frame instead of being stretched.

## Architecture (minimal surface area)

```
src/canvas-os/
├── HTMLInCanvasSurface.tsx   React wrapper: off = plain children, on = canvas + Surface
├── surface.ts                WebGPU device, capture, render, effect scheduler
├── Surface.wgsl              pass-through + smoke / genie fragment shaders
├── html-in-canvas.ts         minimal wrapper for the 3 generations of the capture API
├── effect-bus.ts             window action → effect event (no prop drilling)
└── webgpu.d.ts               minimal WebGPU ambient types (no new dependency)
```

Integration touches seven existing files:

| File | Change |
| --- | --- |
| `types/macos.ts` | `htmlInCanvas?: boolean` |
| `contexts/MacOSContext.tsx` | 2 one-line `triggerWindowEffect(...)` calls + geometry resize for maximize |
| `components/macos/Desktop.tsx` | wrap the desktop root in `<HTMLInCanvasSurface>` |
| `components/macos/Window.tsx` | `data-window-id` (effect rect lookup) |
| `components/macos/Dock.tsx` | `data-dock-app` (genie target rect) |
| `components/apps/SettingsApp.tsx` | HTML-in-Canvas switch + two duration sliders in Displays |
| `index.css` | canvas surface + drawable-child sizing |

No context API changes, no new dependencies, no build config changes.

## How it works

1. The desktop root becomes the direct child of `<canvas content="drawable" drawable>`.
2. Every paint, `drawElementImageToTexture` copies that subtree into `liveTex`.
3. A full-screen quad samples `liveTex` 1:1 (premultiplied alpha).
4. On close/minimize the context emits an effect **before** the state update.
   The surface captures the current DOM into `snapTex` (the frame that is about to
   disappear), then draws an effect quad for that window rect on top of the live desktop.
5. Effect quads share one instanced draw call: up to 3 effects × 4 vec4 in the uniform
   buffer (from rect, to rect, kind/progress/seed/duration, genie dir+perp).
   Maximize/restore bypasses this path entirely: `maximizeWindow()` animates the real
   DOM box (`left/top/width/height`) and commits React state at the end.
6. On minimize the surface also caches the current **live** frame (which still contains
the window) keyed by window id. Restore emits `genie-restore`; the surface reuses that
cached frame as the source, hides the newly mounted window, and runs the same Genie
shader with `progress = 1 - t`, expanding from the dock icon back into the window.
Using the cached live frame matters: a window captured right after mount can still be
mid fade-in / not painted, which showed the desktop instead of the app. Before measuring the restore rectangle, the window's `animate-fade-in` (scale 0.95 → 1,
300 ms) is cancelled; otherwise the reverse Genie starts from a 5%-smaller rect and the
window appears to grow when the animation ends.

The restored
window is also mounted with `isRestoring: true` (`visibility: hidden`) and only revealed
when the Surface dispatches `hic:restore-done`, so there is no one-frame full-size flash.

The effect is not removed at the same moment the window is revealed: it holds at
`progress = 0` (full window) until a paint has actually captured the now-visible window
into `liveTex`, then the effect window cross-fades out over ~150 ms (`info.z` carries the
hand-off alpha) and is dropped. That softens the change between the cached frame and the
live window. Without that hand-off, removing the effect a
frame before the window is captured shows one frame of bare desktop.
7. The minimize effect is a line-for-line port of `Genie.fragment.wgsl`: rows are
   projected onto `(dir, perp)`, the band shrinks toward the dock icon, and each row's
   side margins follow `mix(mix(fromP, toP, slide), fromP, easeInOutQuad(t))`.
   Content is **compressed** into the shrinking band, never cropped.

### Dock stays above every effect

The dock is part of the captured desktop, so an effect quad would otherwise paint over
it. After the effect pass the renderer re-draws the **docked region** from the live
texture with a scissor rectangle (`data-dock-root`); no extra pipeline, uniform or
texture is needed. Dock magnification therefore stays visible above smoke and genie.

DOM stays fully interactive and accessible: hit-testing follows the original layout,
so drag, resize, inputs and dock magnification keep working.

## Six traps that cost the most time

1. **The captured element must be a direct child of the canvas and carry `drawable`.**
   `drawElementImageToTexture` rejects anything else with
   `Only drawable descendants of the <canvas> element can be passed...`.
   A wrapper div around the desktop breaks it.
2. **`position: fixed` children get zero geometry inside a drawable canvas.**
   The desktop root is `fixed inset-0`; inside the canvas it measured 0×0, so the
   capture was empty and the canvas rendered black. Force it with
   `.hic-canvas > [drawable] { position:absolute; inset:0; width:100%; height:100% }`.
3. **Only direct-children of the canvas are drawn**; nested wrappers are not "drawable".
4. **`@interpolate(flat)` on the position varying** makes the whole quad collapse to
   one pixel's value — everything gets discarded. Only pass rects/info as flat;
   the per-pixel CSS position must interpolate normally.
5. **Snapshot sampling needs the window sub-rect**, not 0..1:
   `snapUv = (rect.xy + localUv * rect.zw) / cssSize`. Using `localUv` directly
   stretches the whole desktop into the window rectangle (visible as duplicated widgets).

6. **Drawable children do not take pointer events until their geometry is registered.**
   Without `canvas.updateElementGeometry(content, { canvasTransform: new DOMMatrix() })`
   every click lands on the canvas: `elementFromPoint` returns `CANVAS` and the whole
   desktop is dead. Call it once after mount and again after every resize.

Also: shaders must use `textureSampleLevel(..., 0.0)` after a discard/branch
(`textureSample` is restricted to uniform control flow), and `from`/`to` are
reserved words in WGSL.

## Scope and limits

- Effects only run for the **top-most** window (checked in `triggerWindowEffect`).
  Effect quads are composited above the live desktop, so animating a background window
  would incorrectly cover the windows above it.
- Smoke/genie read from a snapshot taken at the moment of the action; the DOM window is
  already removed (close/minimize) during the animation. Maximize/restore never uses a
  snapshot: it animates the real box and lets the app content reflow.
- The rest of the desktop is captured live, so dock magnification, drag/resize and
  widget animations appear unchanged.
- Toggling the switch mounts/unmounts the canvas, so the desktop subtree remounts:
  open windows close and the Settings panel returns to its first section. That is the
  price of keeping the off path at zero cost.
- If `content="drawable"` or WebGPU is missing, the switch does nothing and the
  desktop renders exactly as before.
