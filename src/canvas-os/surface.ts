import { onEffect, type EffectRequest } from './effect-bus';
import {
  canvasExtras,
  drawElementToTexture,
  isSupported,
  onPaint,
  requestPaint,
  supportsElementTexture,
} from './html-in-canvas';
import shaderCode from './Surface.wgsl?raw';

interface Rect { x: number; y: number; w: number; h: number; }

interface ActiveEffect {
  kind: number;            // 1 smoke | 2 genie | 3 wobble
  from: Rect;
  to: Rect;
  start: number;
  duration: number;
  seed: number;
  /** genie 反向播放（从 Dock 图标展开回窗口）。 */
  reverse?: boolean;
  /** 反向 Genie 结束时要通知的窗口。 */
  windowId?: string;
  /** 到点后等待窗口真正显示/被 live 捕获，再移除特效。 */
  hold?: boolean;
  holdReady?: boolean;
  holdAt?: number;
  seenVisible?: boolean;
  /** 交接淡出开始时间。 */
  fadeAt?: number;
}

interface PendingRestore {
  windowId: string;
  appId: string;
  duration: number;
}

const UNIFORM_FLOATS = 8 + 3 * 16; // viewport/css/count/pad + 3 effects × 4 vec4
const MAX_EFFECTS = 3;

const DURATIONS: Record<string, number> = {
  smoke: 1600,
  genie: 1000,
  wobble: 240,
};

const rectOf = (el: Element): Rect => {
  const r = el.getBoundingClientRect();
  return { x: r.left, y: r.top, w: Math.max(1, r.width), h: Math.max(1, r.height) };
};

/**
 * 整个桌面的 HTML-in-Canvas 表面。
 *
 * 每帧把桌面元素捕获成一张纹理，直通画到 canvas；窗口动作通过 effectBus 进入，
 * 在直通结果上按窗口矩形叠加特效。DOM 仍然参与布局与命中测试，
 * 所以交互与可访问性不退化。
 */
export class Surface {
  private canvas: HTMLCanvasElement;
  private content: HTMLElement;
  private device!: GPUDevice;
  private context!: GPUCanvasContext;
  private format!: GPUTextureFormat;

  private liveTex: GPUTexture | null = null;
  private snapTex: GPUTexture | null = null;
  private windowTex: GPUTexture | null = null;
  /** 最小化时存下的「含窗口」整桌纹理，还原时用作反向 Genie 的源。 */
  private restoreTextures = new Map<string, GPUTexture>();
  private sampler: GPUSampler | null = null;
  private uniformBuf: GPUBuffer | null = null;
  private bindGroup: GPUBindGroup | null = null;
  private pipelineMain: GPURenderPipeline | null = null;
  private pipelineFx: GPURenderPipeline | null = null;

  private texW = 0;
  private texH = 0;
  private cssW = 0;
  private cssH = 0;
  private uniformData = new Float32Array(UNIFORM_FLOATS);
  private effects: ActiveEffect[] = [];
  private raf = 0;
  private disposed = false;
  private hasFrame = false;
  private pendingRestore: PendingRestore | null = null;
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onWindowResize = () => this.resize();
  private settleTimers: number[] = [];

  /** 图片/字体等资源异步完成时，浏览器不会自动触发 canvas paint。 */
  private repaintOnAsset = () => {
    if (!this.disposed) requestPaint(this.canvas);
  };

  constructor(canvas: HTMLCanvasElement, content: HTMLElement) {
    this.canvas = canvas;
    this.content = content;
    // ⚠️ 除了 canvas[content="drawable"]，被捕获的子元素还必须带 drawable 属性，
    // 否则 drawElementImageToTexture 报 "Only drawable descendants ..."。
    if (!content.hasAttribute('drawable')) content.setAttribute('drawable', '');
  }

  async init(): Promise<void> {
    if (!isSupported(this.canvas)) throw new Error('HTML-in-Canvas 不可用');
    if (!navigator.gpu) throw new Error('WebGPU 不可用');

    // ⚠️ 多次热重载/频繁切模式后 requestAdapter 可能永久 pending。
    // 没有超时的话 canvas 会停在默认 300×150，界面直接黑屏。
    const withTimeout = <T,>(p: Promise<T>, ms: number, label: string): Promise<T> =>
      Promise.race([
        p,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error(label + ' 超时')), ms)),
      ]);
    const adapter: any = await withTimeout((navigator as any).gpu.requestAdapter(), 5000, 'GPUAdapter 请求');
    if (!adapter) throw new Error('没有可用的 GPUAdapter');
    const device: any = await withTimeout(adapter.requestDevice(), 5000, 'GPUDevice 请求');
    if (this.disposed) return; // 初始化期间被关闭（快速切换开关）
    if (!supportsElementTexture(device.queue)) throw new Error('缺少 drawElementImageToTexture');

    this.device = device;
    const context = this.canvas.getContext('webgpu') as GPUCanvasContext | null;
    if (!context) throw new Error('无法获取 webgpu context');
    this.context = context;
    this.format = (navigator as any).gpu.getPreferredCanvasFormat?.() ?? 'bgra8unorm';
    context.configure({ device, format: this.format, alphaMode: 'premultiplied' });

    this.sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    // 还原动画用的窗口独立纹理；平时用 1×1 占位，避免 bind group 缺 binding。
    this.windowTex = device.createTexture({
      size: { width: 1, height: 1 },
      format: this.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
    });

    const module = device.createShaderModule({ code: shaderCode });
    const info = await module.getCompilationInfo?.();
    const errors = (info?.messages ?? []).filter((m: { type: string }) => m.type === 'error');
    if (errors.length) throw new Error('WGSL 编译失败: ' + errors.map((e: { message: string }) => e.message).join('; '));

    const group0 = device.createBindGroupLayout({
      entries: [
        { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: { type: 'uniform' } },
        { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
        { binding: 3, visibility: GPUShaderStage.FRAGMENT, sampler: { type: 'filtering' } },
        { binding: 4, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: 'float' } },
      ],
    });
    const layout = device.createPipelineLayout({ bindGroupLayouts: [group0] });
    const blend: GPUBlendState = {
      color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
      alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha', operation: 'add' },
    };
    const targets = [{ format: this.format, blend }];

    this.pipelineMain = device.createRenderPipeline({
      layout,
      vertex: { module, entryPoint: 'vs_main' },
      fragment: { module, entryPoint: 'fs_main', targets },
      primitive: { topology: 'triangle-list' },
    });
    this.pipelineFx = device.createRenderPipeline({
      layout,
      vertex: { module, entryPoint: 'vs_fx' },
      fragment: { module, entryPoint: 'fs_fx', targets },
      primitive: { topology: 'triangle-list' },
    });

    this.uniformBuf = device.createBuffer({
      size: UNIFORM_FLOATS * 4,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });

    this.resize();
    onPaint(this.canvas, () => this.draw());
    this.unsubscribe = onEffect((req) => this.pushEffect(req));
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(this.canvas);
    window.addEventListener('resize', this.onWindowResize);

    // 首帧：主动请求一次 paint，并补一次 rAF 兜底
    requestPaint(this.canvas);
    requestAnimationFrame(() => {
      this.syncHitGeometry();
      this.draw();
    });
    this.loop();
  }

  destroy(): void {
    this.disposed = true;
    cancelAnimationFrame(this.raf);
    this.unsubscribe?.();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    window.removeEventListener('load', this.repaintOnAsset, true);
    for (const id of this.settleTimers) window.clearTimeout(id);
    this.settleTimers = [];
    this.effects = [];
    this.liveTex?.destroy();
    this.snapTex?.destroy();
    this.windowTex?.destroy();
    for (const tex of this.restoreTextures.values()) tex.destroy();
    this.restoreTextures.clear();
    this.uniformBuf?.destroy();
  }

  /**
   * 把 drawable 子元素的几何交给浏览器做命中测试。
   * ⚠️ 不调用 updateElementGeometry 时，canvas 会吃掉所有指针事件：
   * elementFromPoint 永远返回 CANVAS，整个桌面点不动。
   * 桌面是 1:1 铺满，所以用单位矩阵即可。
   */
  private syncHitGeometry(): void {
    const extras = canvasExtras(this.canvas);
    if (typeof extras.updateElementGeometry !== 'function') return;
    try {
      extras.updateElementGeometry(this.content, { canvasTransform: new DOMMatrix() });
    } catch (err) {
      console.warn('[html-in-canvas] updateElementGeometry failed', err);
    }
  }

  /** 由桌面组件通过 CSS 切换；canvas 必须随视口变化重建纹理。 */
  private resize(): void {
    if (this.disposed) return;
    const r = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, Math.round(r.width));
    const cssH = Math.max(1, Math.round(r.height));
    const texW = Math.max(1, Math.round(cssW * dpr));
    const texH = Math.max(1, Math.round(cssH * dpr));
    if (texW === this.texW && texH === this.texH && cssW === this.cssW && cssH === this.cssH) return;

    this.cssW = cssW;
    this.cssH = cssH;
    this.texW = texW;
    this.texH = texH;
    this.canvas.width = texW;
    this.canvas.height = texH;

    this.liveTex?.destroy();
    this.snapTex?.destroy();
    this.liveTex = this.device.createTexture({
      size: { width: texW, height: texH },
      format: this.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        | GPUTextureUsage.COPY_SRC | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.snapTex = this.device.createTexture({
      size: { width: texW, height: texH },
      format: this.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        | GPUTextureUsage.RENDER_ATTACHMENT,
    });
    this.rebuildBindGroup();
    this.hasFrame = false;
    requestPaint(this.canvas);
    requestAnimationFrame(() => this.syncHitGeometry());

    // ⚠️ 桌面重挂载时，<img> 往往在首次捕获之后才解码完成。
    // 不主动 requestPaint 的话纹理永远停在图片空白的那一帧。
    window.addEventListener('load', this.repaintOnAsset, true);
    document.fonts?.ready.then(() => this.repaintOnAsset()).catch(() => {});
    for (const delay of [80, 300, 900, 2000]) {
      this.settleTimers.push(window.setTimeout(() => this.repaintOnAsset(), delay));
    }
  }

  private rebuildBindGroup(): void {
    if (!this.liveTex || !this.snapTex || !this.windowTex || !this.uniformBuf || !this.sampler) return;
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipelineMain!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuf } },
        { binding: 1, resource: this.liveTex.createView() },
        { binding: 2, resource: this.snapTex.createView() },
        { binding: 3, resource: this.sampler },
        { binding: 4, resource: this.windowTex.createView() },
      ],
    });
  }

  /**
   * 把**当前 DOM** 直接捕获到快照纹理。
   * 不能从 liveTex 复制：那一帧可能是尺寸变化/布局稳定前的旧内容，
   * 特效会采样到错位的画面（实测出现过两个桌面重影）。
   */
  private takeSnapshot(): boolean {
    if (!this.snapTex) return false;
    const gen = drawElementToTexture(this.device.queue, this.content, this.snapTex, this.texW, this.texH);
    return gen !== 'none';
  }

  /** 最小化时保存一份含窗口的整桌帧；还原时直接用它，避免捕获时序问题。 */
  private storeRestoreTexture(windowId: string): void {
    if (!this.liveTex || !this.snapTex) return;
    const old = this.restoreTextures.get(windowId);
    old?.destroy();
    const tex = this.device.createTexture({
      size: { width: this.texW, height: this.texH },
      format: this.format,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC,
    });
    // 用 live：最小化发生时窗口仍可见，live 已是含窗口的当前帧。
    // 不能用 snapTex —— 它的捕获与这次 copy 的队列顺序不可靠，常常拷到旧帧。
    const encoder = this.device.createCommandEncoder();
    encoder.copyTextureToTexture(
      { texture: this.liveTex },
      { texture: tex },
      { width: this.texW, height: this.texH },
    );
    this.device.queue.submit([encoder.finish()]);
    this.restoreTextures.set(windowId, tex);
    // 防御：最多缓存 6 个
    if (this.restoreTextures.size > 6) {
      const first = this.restoreTextures.keys().next().value;
      if (first) { this.restoreTextures.get(first)?.destroy(); this.restoreTextures.delete(first); }
    }
  }



  private pushEffect(req: EffectRequest): void {
    if (this.disposed || !this.hasFrame) return;

    // 还原：窗口还没挂载，先登记，等下一帧捕获到它再反向播放 Genie。
    if (req.kind === 'genie-restore') {
      if (!req.windowId) return;
      this.pendingRestore = {
        windowId: req.windowId,
        appId: req.appId,
        duration: req.duration ?? DURATIONS.genie,
      };
      requestPaint(this.canvas);
      return;
    }

    if (!req.element) return;
    const from = rectOf(req.element);

    if (req.kind === 'wobble') {
      // 只拍一张旧尺寸快照，原位置淡出；不要隐藏窗口、不要读目标矩形。
      // 目标尺寸的内容由 live 纹理直接呈现，避免拉伸与结束时的闪帧。
      const snapped = this.takeSnapshot();
      if (!snapped) return;
      this.startEffect(3, from, from, { duration: req.duration });
      return;
    }

    const snapped = this.takeSnapshot();

    if (req.kind === 'genie') {
      const dock = document.querySelector<HTMLElement>(`[data-dock-app="${req.appId}"]`);
      const to = dock ? rectOf(dock) : {
        x: from.x + from.w / 2 - 18,
        y: window.innerHeight - 90,
        w: 36,
        h: 36,
      };
      if (snapped && req.windowId) this.storeRestoreTexture(req.windowId);
      this.startEffect(2, from, to, { duration: req.duration });
      return;
    }

    // smoke
    if (snapped) this.startEffect(1, from, from, { duration: req.duration });
  }

  private startEffect(
    kind: number,
    from: Rect,
    to: Rect,
    opts: { duration?: number; reverse?: boolean; windowId?: string } = {},
  ): void {
    if (this.effects.length >= MAX_EFFECTS) {
      const dropped = this.effects.shift();
      if (dropped?.windowId) {
        window.dispatchEvent(new CustomEvent('hic:restore-done', { detail: { windowId: dropped.windowId } }));
      }
    }
    this.effects.push({
      kind,
      from,
      to,
      start: performance.now(),
      duration: opts.duration
        ?? (kind === 1 ? DURATIONS.smoke : kind === 2 ? DURATIONS.genie : DURATIONS.wobble),
      seed: Math.random() * 6.283,
      reverse: opts.reverse,
      windowId: opts.windowId,
    });
    requestPaint(this.canvas);
  }

  private loop = (): void => {
    if (this.disposed) return;
    if (this.effects.length > 0) {
      const now = performance.now();
      const before = this.effects.length;
      const next: ActiveEffect[] = [];
      for (const fx of this.effects) {
        const elapsed = now - fx.start;
        if (elapsed < fx.duration) {
          next.push(fx);
          continue;
        }
        // 反向 Genie 的「交接帧」：先显示窗口并派发事件，
        // 等 draw() 捕获到含窗口的 live 后再移除特效，避免结束时闪一帧背景。
        if (fx.windowId) {
          if (!fx.hold) {
            fx.hold = true;
            fx.holdAt = now;
            if (fx.reverse) window.dispatchEvent(new CustomEvent('hic:restore-done', { detail: { windowId: fx.windowId } }));
            requestPaint(this.canvas);
          }
          const timedOut = fx.holdAt !== undefined && now - fx.holdAt > 800;
          if (!fx.holdReady && !timedOut) {
            next.push(fx);
            continue;
          }
          // 交接交叉淡化：等 live 已含窗口后，让特效窗口淡出
          if (fx.holdReady) {
            const fadeAge = fx.fadeAt !== undefined ? now - fx.fadeAt : 0;
            if (fadeAge < 160) {
              next.push(fx);
              continue;
            }
          }
        }
      }
      this.effects = next;
      if (this.effects.length !== before) requestPaint(this.canvas);
      this.draw();
    }
    this.raf = requestAnimationFrame(this.loop);
  };

  private writeUniforms(now: number): number {
    const d = this.uniformData;
    d.fill(0);
    d[0] = this.texW;
    d[1] = this.texH;
    d[2] = this.cssW;
    d[3] = this.cssH;
    d[4] = this.effects.length;
    d[5] = 0;

    let i = 0;
    for (const fx of this.effects) {
      const base = 8 + i * 16;
      const t = Math.min(1, Math.max(0, (now - fx.start) / fx.duration));
      d[base + 0] = fx.from.x;
      d[base + 1] = fx.from.y;
      d[base + 2] = fx.from.w;
      d[base + 3] = fx.from.h;
      d[base + 4] = fx.to.x;
      d[base + 5] = fx.to.y;
      d[base + 6] = fx.to.w;
      d[base + 7] = fx.to.h;
      d[base + 8] = fx.kind;
      d[base + 9] = fx.reverse ? 1 - t : t;
      if (fx.kind === 2) {
        const fade = fx.fadeAt !== undefined ? 1 - Math.min(1, (now - fx.fadeAt) / 150) : 1;
        d[base + 10] = Math.max(0, fade);
      } else {
        d[base + 10] = fx.seed;
      }
      // genie 需要总时长（秒）；用符号编码 reverse，shader 据此选择窗口纹理
      d[base + 11] = fx.kind === 2 ? (fx.reverse ? -fx.duration / 1000 : fx.duration / 1000) : 0;
      // genie 的行进方向：指向目标中心，主轴取位移更大的那根
      const fcx = fx.from.x + fx.from.w / 2;
      const fcy = fx.from.y + fx.from.h / 2;
      const tcx = fx.to.x + fx.to.w / 2;
      const tcy = fx.to.y + fx.to.h / 2;
      let dx = 0;
      let dy = 0;
      if (Math.abs(tcy - fcy) >= Math.abs(tcx - fcx)) dy = tcy >= fcy ? 1 : -1;
      else dx = tcx >= fcx ? 1 : -1;
      d[base + 12] = dx;
      d[base + 13] = dy;
      d[base + 14] = -dy;
      d[base + 15] = dx;
      i++;
    }
    this.device.queue.writeBuffer(this.uniformBuf!, 0, d);
    return this.effects.length;
  }

  /** Dock 的物理像素矩形：特效之后用它做 scissor，把 Dock 重新画到最上层。 */
  private dockScissor(): { x: number; y: number; w: number; h: number } | null {
    const el = document.querySelector<HTMLElement>('[data-dock-root]');
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    const dpr = this.texW / Math.max(1, this.cssW);
    const x = Math.max(0, Math.floor(r.left * dpr) - 1);
    const y = Math.max(0, Math.floor(r.top * dpr) - 1);
    const right = Math.min(this.texW, Math.ceil((r.left + r.width) * dpr) + 1);
    const bottom = Math.min(this.texH, Math.ceil((r.top + r.height) * dpr) + 1);
    return { x, y, w: Math.max(0, right - x), h: Math.max(0, bottom - y) };
  }

  private draw(): void {
    if (this.disposed || !this.pipelineMain || !this.liveTex || !this.bindGroup) return;
    if (this.canvas.width === 0 || this.canvas.height === 0) return;

    // ⚠️ 还原那一帧不要重捕 live：窗口刚从 isMinimized 挂载出来，
    // 首帧可能还没完成内容绘制（或被隐藏标记影响），重捕会把一块空白窗口
    // 画到主通道上 —— 就是动画中途闪出的灰色大块。
    // 继续用上一帧（最小化后、本来就没有窗口）的 live 作为背景。
    if (!this.pendingRestore) {
      // 在捕获**之前**判断哪些特效已经历过一帧「窗口可见」，
      // 这样本次捕获一定包含窗口，移除特效才不会闪背景。
      const readyNow = this.effects.filter(f => f.hold && f.seenVisible && !f.holdReady);

      const gen = drawElementToTexture(
        this.device.queue,
        this.content,
        this.liveTex,
        this.texW,
        this.texH,
      );
      if (gen === 'none') return;
      this.hasFrame = true;

      for (const f of readyNow) {
        f.holdReady = true;
        f.fadeAt = performance.now();
        requestPaint(this.canvas);
      }
      // 本帧才变可见的，记下来，下一帧捕获后才允许移除
      for (const f of this.effects) {
        if (!f.hold || f.holdReady || !f.windowId) continue;
        const el = document.querySelector<HTMLElement>(`[data-window-id="${f.windowId}"]`);
        if (!el || getComputedStyle(el).visibility !== 'hidden') f.seenVisible = true;
      }
    } else if (!this.hasFrame) {
      return;
    }

    // 还原：窗口已挂载。把**窗口元素本身**捕获到独立纹理，
    // 不能从 live/快照里取 —— 那一帧可能还是上一帧的桌面（没有该窗口），
    // 结果还原动画采样到桌面纹理而不是 app 内容。
    if (this.pendingRestore) {
      const pending = this.pendingRestore;
      const el = document.querySelector<HTMLElement>(`[data-window-id="${pending.windowId}"]`);
      if (el) {
        // 窗口由 React 以 visibility:hidden 挂载，不会闪出完整尺寸。
        // 反向 Genie 的源用最小化时缓存的「含窗口」纹理。
        const stored = this.restoreTextures.get(pending.windowId);
        this.pendingRestore = null;
        if (!stored) {
          window.dispatchEvent(new CustomEvent('hic:restore-done', { detail: { windowId: pending.windowId } }));
          return;
        }
        // ⚠️ 窗口挂载时 animate-fade-in 是 scale(0.95)→1，持续 300ms。
        // 不在测矩形前禁用，反向 Genie 的 from 就会小 5%，动画结束才“突然变大”。
        el.style.animation = 'none';
        el.style.opacity = '1';
        void el.offsetWidth;
        const from = rectOf(el);
        this.windowTex?.destroy();
        this.windowTex = this.device.createTexture({
          size: { width: this.texW, height: this.texH },
          format: this.format,
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        });
        const encoder = this.device.createCommandEncoder();
        encoder.copyTextureToTexture(
          { texture: stored },
          { texture: this.windowTex },
          { width: this.texW, height: this.texH },
        );
        this.device.queue.submit([encoder.finish()]);
        this.rebuildBindGroup();

        const dock = document.querySelector<HTMLElement>(`[data-dock-app="${pending.appId}"]`);
        const to = dock ? rectOf(dock) : { x: from.x + from.w / 2 - 18, y: from.y + from.h - 40, w: 36, h: 36 };
        this.startEffect(2, from, to, {
          duration: pending.duration,
          reverse: true,
          windowId: pending.windowId,
        });
      } else {
        requestPaint(this.canvas);
      }
    }

    const count = this.writeUniforms(performance.now());
    const encoder = this.device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [{
        view: this.context.getCurrentTexture().createView(),
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        loadOp: 'clear',
        storeOp: 'store',
      }],
    });

    pass.setPipeline(this.pipelineMain);
    pass.setBindGroup(0, this.bindGroup);
    pass.draw(6);

    if (count > 0 && this.pipelineFx) {
      pass.setPipeline(this.pipelineFx);
      pass.setBindGroup(0, this.bindGroup);
      pass.draw(6, count);

      // ⚠️ Dock 在 live 纹理里，特效画完会盖住它。
      // 用 scissor 把 Dock 区域按最新一帧重绘一次 —— Dock 永远在动画之上，
      // 不需要把 Dock 拆出 canvas，也不增加任何管线/uniform。
      const dock = this.dockScissor();
      if (dock && dock.w > 0 && dock.h > 0) {
        pass.setScissorRect(dock.x, dock.y, dock.w, dock.h);
        pass.setPipeline(this.pipelineMain);
        pass.setBindGroup(0, this.bindGroup);
        pass.draw(6);
        pass.setScissorRect(0, 0, this.texW, this.texH);
      }
    }

    pass.end();
    this.device.queue.submit([encoder.finish()]);
  }
}

/** 在挂载前判断浏览器是否具备 HTML-in-Canvas + WebGPU。 */
export function probeSupport(): boolean {
  if (typeof navigator === 'undefined' || !navigator.gpu) return false;
  const probe = document.createElement('canvas');
  return isSupported(probe) && typeof canvasExtras(probe).requestPaint === 'function';
}
