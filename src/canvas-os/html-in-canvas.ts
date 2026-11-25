/**
 * HTML-in-Canvas 的最小运行时封装（从 Macos-Genie-Effect-With-WebGPU 移植，已实测）。
 *
 * 三代上传 API：drawElementImageToTexture → copyElementImageToTexture(dict) → copy(legacy)。
 * 只保留本模式实际用到的部分：探测、尺寸、上传、paint 回调。
 */

export interface ElementImageDefaultSize {
  width: number;
  height: number;
}

interface DrawElementImageDestination {
  texture: GPUTexture;
  size?: unknown;
  origin?: unknown;
  mipLevel?: number;
  aspect?: string;
  colorSpace?: string;
  premultipliedAlpha?: boolean;
}

interface ElementQueueExtras {
  drawElementImageToTexture?: (source: { source: Element }, dest: DrawElementImageDestination) => void;
  copyElementImageToTexture?: (
    (source: { source: Element }, dest: { destination: { texture: GPUTexture }; width?: number; height?: number }) => void
  ) & ((element: Element, width: number, height: number, dest: { texture: GPUTexture }) => void);
}

/** canvas 上 HTML-in-Canvas 新增的成员。 */
export interface CanvasExtras {
  content?: 'fallback' | 'drawable';
  onpaint?: ((event: Event) => void) | null;
  requestPaint?(): void;
  getElementImageDefaultSize?(element: Element): ElementImageDefaultSize;
  /** 把元素几何登记给 canvas，命中测试才会落到元素（而不是 canvas）上。 */
  updateElementGeometry?(
    element: Element,
    options?: { canvasTransform?: DOMMatrix; preserveHitTestOrder?: boolean },
  ): void;
}

export type ApiGeneration = 'final' | 'dict' | 'legacy4' | 'none';

export function canvasExtras(canvas: HTMLCanvasElement): CanvasExtras {
  return canvas as unknown as CanvasExtras;
}

function queueExtras(queue: GPUQueue): ElementQueueExtras {
  return queue as unknown as ElementQueueExtras;
}

/** 浏览器是否提供 canvas.requestPaint。 */
export function isSupported(canvas: HTMLCanvasElement): boolean {
  return typeof canvasExtras(canvas).requestPaint === 'function';
}

/** queue 侧能否把元素画进纹理。 */
export function supportsElementTexture(queue: GPUQueue): boolean {
  const q = queueExtras(queue);
  return (
    typeof q.drawElementImageToTexture === 'function' ||
    typeof q.copyElementImageToTexture === 'function'
  );
}

/** 元素纹理尺寸（已含 DPR）。没有 paint 记录时回退到 offset 尺寸。 */
export function elementImageSize(canvas: HTMLCanvasElement, element: HTMLElement): ElementImageDefaultSize {
  const dpr = window.devicePixelRatio || 1;
  const fallback: ElementImageDefaultSize = {
    width: Math.max(1, Math.round(element.offsetWidth * dpr)),
    height: Math.max(1, Math.round(element.offsetHeight * dpr)),
  };
  const getSize = canvasExtras(canvas).getElementImageDefaultSize;
  if (typeof getSize === 'function') {
    try {
      const s = getSize.call(canvas, element);
      if (s && s.width > 0 && s.height > 0) return s;
    } catch {
      /* 首帧尚无 paint 记录 */
    }
  }
  return fallback;
}

/** 把元素快照画进纹理，返回实际生效的世代。 */
export function drawElementToTexture(
  queue: GPUQueue,
  element: Element,
  texture: GPUTexture,
  width: number,
  height: number,
): ApiGeneration {
  const q = queueExtras(queue);
  if (typeof q.drawElementImageToTexture === 'function') {
    try {
      q.drawElementImageToTexture({ source: element }, { texture, size: { width, height } });
      return 'final';
    } catch { /* 降级 */ }
  }
  if (typeof q.copyElementImageToTexture === 'function') {
    try {
      q.copyElementImageToTexture({ source: element }, { destination: { texture }, width, height });
      return 'dict';
    } catch {
      try {
        q.copyElementImageToTexture(element, width, height, { texture });
        return 'legacy4';
      } catch { /* 全部失败 */ }
    }
  }
  return 'none';
}

/** 请求一次 paint（即使没有 DOM 变化也触发）。 */
export function requestPaint(canvas: HTMLCanvasElement): void {
  canvasExtras(canvas).requestPaint?.();
}

/** 注册 paint 事件（onpaint 优先，回退 addEventListener）。 */
export function onPaint(canvas: HTMLCanvasElement, handler: () => void): void {
  const el = canvasExtras(canvas);
  if ('onpaint' in el) {
    el.onpaint = handler;
  } else {
    canvas.addEventListener('paint', handler);
  }
}
