/** 窗口动作 → 表面特效的单向事件总线（不依赖 React，避免层层传参）。 */

export type EffectKind = 'smoke' | 'genie' | 'genie-restore' | 'wobble';

export interface EffectRequest {
  kind: EffectKind;
  /** 触发动作的窗口元素；genie-restore 时窗口尚未挂载，由 Surface 自己查找。 */
  element?: HTMLElement;
  appId: string;
  /** 目标窗口 id（genie-restore 需要）。 */
  windowId?: string;
  /** 覆盖默认动画时长（毫秒）。 */
  duration?: number;
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
