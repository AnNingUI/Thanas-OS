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

  // 跨域图片（iTunes 封面、GitHub 头像、shields 图标）会污染画布，
  // drawElementImageToTexture 会直接丢弃它们。转成同源 blob URL 后再捕获。
  useEffect(() => {
    if (mode !== 'canvas') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const made: string[] = [];
    const originals: { img: HTMLImageElement; src: string }[] = [];
    const seen = new WeakSet<HTMLImageElement>();
    const repaint = () => (canvas as unknown as { requestPaint?: () => void }).requestPaint?.();

    const swap = async (img: HTMLImageElement) => {
      const src = img.currentSrc || img.src;
      if (!/^https?:\/\//i.test(src)) return;
      if (seen.has(img)) return;
      seen.add(img);
      const candidates = [
        src,
        `https://wsrv.nl/?url=${encodeURIComponent(src)}&w=800&output=png`,
      ];
      for (const url of candidates) {
        try {
          const res = await fetch(url, { mode: 'cors' });
          if (!res.ok) continue;
          const blob = await res.blob();
          if (!blob.size || !blob.type.startsWith('image/')) continue;
          const local = URL.createObjectURL(blob);
          made.push(local);
          originals.push({ img, src });
          img.src = local;
          await img.decode().catch(() => {});
          repaint();
          return;
        } catch { /* 尝试下一个代理 */ }
      }
    };

    const scan = () => {
      canvas.querySelectorAll('img').forEach(img => { void swap(img); });
    };
    scan();
    const mo = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === 'attributes') {
          const img = r.target as HTMLImageElement;
          if (img.tagName === 'IMG' && !img.src.startsWith('blob:')) { seen.delete(img); void swap(img); }
        } else {
          r.addedNodes.forEach(n => {
            if (n instanceof HTMLImageElement) void swap(n);
            else if (n instanceof HTMLElement) n.querySelectorAll('img').forEach(img => { void swap(img); });
          });
        }
      }
    });
    mo.observe(canvas, { subtree: true, childList: true, attributes: true, attributeFilter: ['src'] });
    repaint();
    return () => {
      mo.disconnect();
      // 关闭 canvas 模式时把原始 URL 还回去，再释放 blob，
      // 否则 <img> 仍指向已 revoke 的 blob，切回普通模式会变成裂图。
      for (const { img, src } of originals) {
        if (img.src.startsWith('blob:')) img.src = src;
      }
      for (const url of made) URL.revokeObjectURL(url);
    };
  }, [mode]);

  if (mode !== 'canvas') return <>{children}</>

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
