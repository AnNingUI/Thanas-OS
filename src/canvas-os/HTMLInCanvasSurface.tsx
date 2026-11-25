import { useEffect, useRef, useState, type ReactNode } from 'react';
import { probeSupport, Surface } from './surface';

interface Props {
  enabled: boolean;
  children: ReactNode;
}

/**
 * HTML-in-Canvas 模式的外壳。
 *
 * 关闭时零成本：直接渲染 children，不创建 canvas / WebGPU / 纹理。
 * 开启时把整个桌面放进 <canvas content="drawable">，由 Surface 捕获并绘制。
 * 浏览器不支持时自动回退普通 DOM，绝不白屏。
 */
export function HTMLInCanvasSurface({ enabled, children }: Props) {
  const [mode, setMode] = useState<'plain' | 'canvas'>('plain');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!enabled) {
      setMode('plain');
      return;
    }
    if (!probeSupport()) {
      console.warn('[html-in-canvas] 浏览器不支持 content=drawable，保持普通渲染。');
      setMode('plain');
      return;
    }
    setMode('canvas');
  }, [enabled]);

  useEffect(() => {
    if (mode !== 'canvas') return;
    const canvas = canvasRef.current;
    // ⚠️ drawElementImageToTexture 只接受 canvas 的**直接子元素**；
    // 不能再包一层 .hic-content，否则报 "Only drawable descendants ..."。
    const content = canvas?.firstElementChild as HTMLElement | null;
    if (!canvas || !content) return;

    let cancelled = false;
    const surface = new Surface(canvas, content);
    surface.init()
      .then(() => { if (cancelled) surface.destroy(); })
      .catch((err: unknown) => {
        if (cancelled) return;
        console.warn('[html-in-canvas] 初始化失败，回退普通渲染：', err);
        surface.destroy();
        setMode('plain');
      });

    return () => {
      cancelled = true;
      surface.destroy();
    };
  }, [mode]);

  if (mode !== 'canvas') return <>{children}</>;

  return (
    <div className="hic-root">
      <canvas
        ref={canvasRef}
        className="hic-canvas"
        {...({ content: 'drawable' } as Record<string, string>)}
      >
        {children}
      </canvas>
    </div>
  );
}
