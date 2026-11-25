// 项目没有引入 @webgpu/types；这里只声明本模块用到的最小表面。
// 真实类型由浏览器提供，运行时不做任何假设。
declare type GPUDevice = any;
declare type GPUQueue = any;
declare type GPUTexture = any;
declare type GPUTextureView = any;
declare type GPUBuffer = any;
declare type GPUSampler = any;
declare type GPUBindGroup = any;
declare type GPUBindGroupLayout = any;
declare type GPUPipelineLayout = any;
declare type GPUComputePipeline = any;
declare type GPURenderPipeline = any;
declare type GPUShaderModule = any;
declare type GPUCommandEncoder = any;
declare type GPURenderPassEncoder = any;
declare type GPUTextureFormat = string;
declare type GPUCanvasContext = any;
declare type GPUBufferUsage = any;
declare type GPUTextureUsage = any;
declare type GPUShaderStage = any;
declare type GPUBlendState = any;

declare var GPUShaderStage: any;
declare var GPUBufferUsage: any;
declare var GPUTextureUsage: any;

interface Navigator {
  gpu?: any;
}
