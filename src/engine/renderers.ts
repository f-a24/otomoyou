export type RendererKind = "webgpu" | "webgl2" | "canvas2d";

export const RENDERER_LABELS: Record<RendererKind, string> = {
  webgpu: "WebGPU",
  webgl2: "WebGL2",
  canvas2d: "Canvas 2D",
};

/** APIがあってもアダプターを取得できない環境があるため、取得まで試す */
async function isWebGPUAvailable(): Promise<boolean> {
  if (!("gpu" in navigator)) return false;

  try {
    return (await navigator.gpu.requestAdapter()) !== null;
  } catch {
    return false;
  }
}

/** 判定に使ったコンテキストはすぐに解放する */
function isWebGL2Available(): boolean {
  const gl = document.createElement("canvas").getContext("webgl2");
  if (!gl) return false;

  gl.getExtension("WEBGL_lose_context")?.loseContext();
  return true;
}

/** 使える描画方式を優先度の高い順に返す。Canvas 2Dはどの環境でも使える前提で最後に置く */
export async function detectRenderers(): Promise<RendererKind[]> {
  const renderers: RendererKind[] = [];

  if (await isWebGPUAvailable()) renderers.push("webgpu");
  if (isWebGL2Available()) renderers.push("webgl2");
  renderers.push("canvas2d");

  return renderers;
}
