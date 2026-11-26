// 桌面表面：整块桌面先被 HTML-in-Canvas 捕获成纹理，再由这条管线画到 canvas。
// 主通道是 1:1 直通；特效通道按窗口矩形叠加 smoke / genie / wobble。
//
// 统一约定：所有 rect 都是**视口 CSS 像素**（桌面本身被 scale(0.9) 缩放，
// 因此矩形必须用 getBoundingClientRect 的屏幕坐标，不能直接用窗口 state 坐标）。
struct Params {
  viewport : vec2<f32>,      // [0..1] 画布后备缓冲（物理像素）
  cssSize : vec2<f32>,       // [2..3] 视口 CSS 尺寸
  count : f32,               // [4] 活动特效数
  pad0 : f32,                // [5]
  pad1 : vec2<f32>,          // [6..7]
  fx : array<vec4<f32>, 12>, // [8..] 每个特效 4 个 vec4：from / to / info / genieDir
};

@group(0) @binding(0) var<uniform> u : Params;
@group(0) @binding(1) var liveTex : texture_2d<f32>;
@group(0) @binding(2) var snapTex : texture_2d<f32>;
@group(0) @binding(3) var samp : sampler;

// ------------------------------------------------------------------ 公共

fn toNdc(css : vec2<f32>) -> vec4<f32> {
  // CSS → 物理像素（dpr = viewport / cssSize），再映射到 NDC。
  let px = css * (u.viewport / u.cssSize);
  return vec4<f32>(
    (px.x / u.viewport.x) * 2.0 - 1.0,
    1.0 - (px.y / u.viewport.y) * 2.0,
    0.0, 1.0
  );
}

fn hash_noise(p : vec2<f32>) -> f32 {
  return fract(sin(dot(p, vec2<f32>(12.9898, 78.233))) * 43758.5453);
}

fn value_noise(p : vec2<f32>) -> f32 {
  let i = floor(p);
  var f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash_noise(i), hash_noise(i + vec2<f32>(1.0, 0.0)), f.x),
    mix(hash_noise(i + vec2<f32>(0.0, 1.0)), hash_noise(i + vec2<f32>(1.0, 1.0)), f.x),
    f.y
  );
}

fn fbm(p0 : vec2<f32>) -> f32 {
  var p = p0;
  var v = 0.0;
  var a = 0.5;
  for (var i = 0; i < 4; i++) {
    v += a * value_noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

fn easeInOutQuad(x : f32) -> f32 {
  let c = clamp(x, 0.0, 1.0);
  if (c < 0.5) { return 2.0 * c * c; }
  return 1.0 - pow(-2.0 * c + 2.0, 2.0) * 0.5;
}

// ------------------------------------------------------------- 主通道

struct MainOut {
  @builtin(position) position : vec4<f32>,
  @location(0) uv : vec2<f32>,
};

@vertex
fn vs_main(@builtin(vertex_index) index : u32) -> MainOut {
  var quad = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 0.0), vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0)
  );
  let c = quad[index];
  var out : MainOut;
  out.position = toNdc(c * u.cssSize);
  out.uv = c;
  return out;
}

@fragment
fn fs_main(input : MainOut) -> @location(0) vec4<f32> {
  let smp = textureSampleLevel(liveTex, samp, input.uv, 0.0);
  // 捕获纹理是 straight alpha；canvas 是 premultiplied。
  return vec4<f32>(smp.rgb * smp.a, smp.a);
  // 捕获纹理是 straight alpha；canvas 是 premultiplied。
  // return vec4<f32>(smp.rgb * smp.a, smp.a);
}

// ------------------------------------------------------------- 特效通道

struct FxOut {
  @builtin(position) position : vec4<f32>,
  @location(0) @interpolate(flat) rectFrom : vec4<f32>,
  @location(1) @interpolate(flat) rectTo : vec4<f32>,
  @location(2) @interpolate(flat) info : vec4<f32>,
  @location(3) cssPos : vec2<f32>,
  @location(4) @interpolate(flat) genieDir : vec4<f32>,
};

@vertex
fn vs_fx(
  @builtin(vertex_index) index : u32,
  @builtin(instance_index) instance : u32,
) -> FxOut {
  let base = instance * 4u;
  let rectFrom = u.fx[base];
  let rectTo = u.fx[base + 1u];
  let info = u.fx[base + 2u];
  let genieDir = u.fx[base + 3u];

  var lo = min(rectFrom.xy, rectTo.xy) - vec2<f32>(4.0, 4.0);
  var hi = max(rectFrom.xy + rectFrom.zw, rectTo.xy + rectTo.zw) + vec2<f32>(4.0, 4.0);

  var quad = array<vec2<f32>, 6>(
    vec2<f32>(0.0, 0.0), vec2<f32>(1.0, 0.0), vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 1.0), vec2<f32>(1.0, 0.0), vec2<f32>(1.0, 1.0)
  );
  let c = quad[index];
  let cssPos = mix(lo, hi, c);

  var out : FxOut;
  out.position = toNdc(cssPos);
  out.rectFrom = rectFrom;
  out.rectTo = rectTo;
  out.info = info;
  out.cssPos = cssPos;
  out.genieDir = genieDir;
  return out;
}

fn sampleSnap(uv : vec2<f32>) -> vec4<f32> {
  // 在分支/discard 之后采样：必须用 textureSampleLevel（uniform control flow 限制）
  return textureSampleLevel(snapTex, samp, clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0)), 0.0);
}

@fragment
fn fs_fx(input : FxOut) -> @location(0) vec4<f32> {
  let kind = input.info.x;
  let progress = input.info.y;
  let seed = input.info.z;
  let rectA = input.rectFrom;
  let rectB = input.rectTo;
  let pos = input.cssPos;

  // ---- 关窗：烟雾消散（niri close_color 的 FBM 溶解）
  if (kind < 1.5) {
    let uv = (pos - rectA.xy) / max(rectA.zw, vec2<f32>(1.0));
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { discard; }
    let p = progress;
    let turb = fbm(uv * 5.0 + vec2<f32>(p * 2.0, -p * 3.0)) - 0.5;
    let turb2 = fbm(uv * 3.0 + vec2<f32>(-p * 1.5, -p * 2.0) + seed) - 0.5;
    let drift = vec2<f32>(turb * 0.15 * p * p, -p * p * 0.2 + turb2 * 0.12 * p);
    let disp = clamp(uv + drift, vec2<f32>(0.0), vec2<f32>(1.0));
    // 快照是整张桌面：窗口的 0..1 映射到 rectA 子区域，不能直接当整图 uv。
    let color = sampleSnap((rectA.xy + disp * rectA.zw) / u.cssSize);

    let n = fbm(uv * 6.0 + seed * 3.0);
    let visible = 1.0 - smoothstep(n - 0.1, n + 0.1, p * 1.2);
    let edge = abs(p * 1.2 - n);
    let wisp = exp(-edge * edge * 100.0) * p;
    let smokeColor = vec3<f32>(0.55, 0.55, 0.6);
    var rgb = mix(color.rgb, smokeColor, wisp * 0.7);
    let luma = dot(rgb, vec3<f32>(0.299, 0.587, 0.114));
    rgb = mix(rgb, vec3<f32>(luma), p * 0.3);

    let alpha = color.a * visible;
    if (alpha <= 0.002) { discard; }
    return vec4<f32>(rgb * alpha, alpha);
  }

  // ---- 最小化：原版 Genie 逆映射（逐行贝塞尔收窄 + 内容压缩）
  // 与 Macos-Genie-Effect-With-WebGPU 的 Genie.fragment.wgsl 逐行对应。
  if (kind < 2.5) {
    let dir = input.genieDir.xy;
    let perp = input.genieDir.zw;
    let duration = max(input.info.w, 1e-3);

    // 原版时间轴：曲线阶段 0..50%，位移阶段 40%..100%（两段重叠）
    let totalCurve = max(duration * 0.5, 1e-5);
    let transStart = duration * 0.4;
    let totalTrans = max(duration * 0.6, 1e-5);
    let now = progress * duration;
    let slide = clamp(now / totalCurve, 0.0, 1.0);
    let trans = clamp((now - transStart) / totalTrans, 0.0, 1.0);

    let src = rectA;          // 源窗口（屏幕 CSS 像素）
    let targetRect = rectB;   // Dock 图标

    // ---- 源 / 目标在 (dir, perp) 局部坐标系下的投影 ----
    let fromC = src.xy + src.zw * 0.5;
    let toC = targetRect.xy + targetRect.zw * 0.5;
    let fromHalfA = abs(dir.x) * src.z * 0.5 + abs(dir.y) * src.w * 0.5;
    let toHalfA = abs(dir.x) * targetRect.z * 0.5 + abs(dir.y) * targetRect.w * 0.5;
    let fromHalfP = abs(perp.x) * src.z * 0.5 + abs(perp.y) * src.w * 0.5;
    let toHalfP = abs(perp.x) * targetRect.z * 0.5 + abs(perp.y) * targetRect.w * 0.5;

    let fromA = dot(fromC, dir);
    let toA = dot(toC, dir);
    let fromP = dot(fromC, perp);
    let toP = dot(toC, perp);

    let fromALo = fromA - fromHalfA;
    let fromAHi = fromA + fromHalfA;
    let toALo = toA - toHalfA;
    let toAHi = toA + toHalfA;
    let fromPLo = fromP - fromHalfP;
    let fromPHi = fromP + fromHalfP;
    let toPLo = toP - toHalfP;
    let toPHi = toP + toHalfP;

    // ---- 当前帧行进带：两端各自朝目标端插值，内容是被压缩而不是裁掉 ----
    let farA = fromALo + trans * (toALo - fromALo);
    let nearA = fromAHi + trans * (toAHi - fromAHi);
    let bandLo = min(farA, nearA);
    let bandHi = max(farA, nearA);

    let a = dot(pos, dir);
    let c = dot(pos, perp);
    if (a < bandLo || a > bandHi) { discard; }

    // ---- 该行两侧边距（贝塞尔收窄）----
    let span = fromALo - toALo;
    var rowT = 1.0;
    if (abs(span) > 1e-6) { rowT = clamp((a - toALo) / span, 0.0, 1.0); }
    let e = easeInOutQuad(rowT);
    let rowLo = mix(mix(fromPLo, toPLo, slide), fromPLo, e);
    let rowHi = mix(mix(fromPHi, toPHi, slide), fromPHi, e);
    if (rowHi - rowLo <= 1e-4) { discard; }
    if (c < rowLo || c > rowHi) { discard; }

    // ---- 归一化回源矩形 ----
    let acrossNorm = (c - rowLo) / (rowHi - rowLo);
    let alongNorm = (a - bandLo) / max(bandHi - bandLo, 1e-6);
    let srcAlong = fromALo + alongNorm * (fromAHi - fromALo);
    let srcAcross = fromPLo + acrossNorm * (fromPHi - fromPLo);
    let srcPx = dir * srcAlong + perp * srcAcross;

    // 与源窗口对齐（不要 ±0.5，否则线性过滤会糊）
    let uv = (srcPx - src.xy) / src.zw;
    if (uv.x < -0.002 || uv.x > 1.002 || uv.y < -0.002 || uv.y > 1.002) { discard; }

    // 快照是整张桌面 → 映射到窗口子矩形
    let snapUv = (src.xy + clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0)) * src.zw) / u.cssSize;
    let color = textureSampleLevel(snapTex, samp, snapUv, 0.0);
    // 原版没有末端淡出：内容最终被压缩进目标矩形，由动画结束统一隐藏。
    let alpha = color.a;
    if (alpha <= 0.002) { discard; }
    return vec4<f32>(color.rgb * alpha, alpha);
  }

  // ---- 最大化 / 还原：旧窗口原位淡出（交叉淡化）
  // 不做几何拉伸：快照只有旧尺寸的内容，拉成新矩形必然马赛克；
  // 结束时也不再切换可见性，因此不会闪一下。
  let p = progress;
  let uv = (pos - rectA.xy) / max(rectA.zw, vec2<f32>(1.0));
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) { discard; }

  let snapUv = (rectA.xy + uv * rectA.zw) / u.cssSize;
  let color = textureSampleLevel(snapTex, samp, snapUv, 0.0);
  let alpha = color.a * (1.0 - smoothstep(0.0, 1.0, p));
  if (alpha <= 0.002) { discard; }
  return vec4<f32>(color.rgb * alpha, alpha);
}
