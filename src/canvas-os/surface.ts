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
  private unsubscribe: (() => void) | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onWindowResize = () => this.resize();

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
    this.effects = [];
    this.liveTex?.destroy();
    this.snapTex?.destroy();
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
    this.bindGroup = this.device.createBindGroup({
      layout: this.pipelineMain!.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: this.uniformBuf } },
        { binding: 1, resource: this.liveTex.createView() },
        { binding: 2, resource: this.snapTex.createView() },
        { binding: 3, resource: this.sampler },
      ],
    });
    this.hasFrame = false;
    requestPaint(this.canvas);
    requestAnimationFrame(() => this.syncHitGeometry());
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

  private pushEffect(req: EffectRequest): void {
    if (this.disposed || !this.hasFrame) return;

    const from = rectOf(req.element);

    if (req.kind === 'wobble') {
      // 只拍一张旧尺寸快照，原位置淡出；不要隐藏窗口、不要读目标矩形。
      // 目标尺寸的内容由 live 纹理直接呈现，避免拉伸与结束时的闪帧。
      const snapped = this.takeSnapshot();
      if (!snapped) return;
      this.startEffect(3, from, from);
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
      this.startEffect(2, from, to);
      return;
    }

    // smoke
    if (snapped) this.startEffect(1, from, from);
  }

  private startEffect(kind: number, from: Rect, to: Rect): void {
    if (this.effects.length >= MAX_EFFECTS) this.effects.shift();
    this.effects.push({
      kind,
      from,
      to,
      start: performance.now(),
      duration: kind === 1 ? DURATIONS.smoke : kind === 2 ? DURATIONS.genie : DURATIONS.wobble,
      seed: Math.random() * 6.283,
    });
    requestPaint(this.canvas);
  }

  private loop = (): void => {
    if (this.disposed) return;
    if (this.effects.length > 0) {
      const now = performance.now();
      const before = this.effects.length;
      this.effects = this.effects.filter((fx) => now - fx.start < fx.duration);
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
      d[base + 9] = t;
      d[base + 10] = fx.seed;
      d[base + 11] = fx.kind === 2 ? fx.duration / 1000 : 0; // genie 需要总时长（秒）
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

    const gen = drawElementToTexture(
      this.device.queue,
      this.content,
      this.liveTex,
      this.texW,
      this.texH,
    );
    if (gen === 'none') return;
    this.hasFrame = true;

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
