/** 窗口动作 → 表面特效的单向事件总线（不依赖 React，避免层层传参）。 */

export type EffectKind = 'smoke' | 'genie' | 'wobble';

export interface EffectRequest {
  kind: EffectKind;
  /** 触发动作的窗口元素（用于取当前屏幕矩形）。 */
  element: HTMLElement;
  appId: string;
}

type Handler = (request: EffectRequest) => void;

const handlers = new Set<Handler>();

export function emitEffect(request: EffectRequest): void {
  handlers.forEach((fn) => {
    try {
      fn(request);
    } catch (err) {
      console.warn('[html-in-canvas] effect failed', err);
    }
  });
}

export function onEffect(handler: Handler): () => void {
  handlers.add(handler);
  return () => handlers.delete(handler);
}
