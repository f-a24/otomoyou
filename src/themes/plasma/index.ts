import { createFullscreenProgram, releaseContext } from "../../engine/gl";
import { getGpuDevice } from "../../engine/gpu";
import { AudioUniforms } from "../shared/audio-uniforms";
import audioGlsl from "../shared/audio.glsl?raw";
import audioWgsl from "../shared/audio.wgsl?raw";
import type { ThemeCleanup, ThemeContext, Theme } from "../types";
import shaderFrag from "./shader.frag?raw";
import shaderWgsl from "./shader.wgsl?raw";

const UNIFORM_BINDING = 0;

function renderWebGL2({
  canvas,
  audio,
  onFrame,
  onResize,
}: ThemeContext): ThemeCleanup {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (!gl) throw new Error("WebGL2のコンテキストを取得できません");

  const source = `#version 300 es
precision highp float;
${audioGlsl}
${shaderFrag}`;
  const program = createFullscreenProgram(gl, source);
  const uniforms = new AudioUniforms();

  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, buffer);
  gl.bufferData(gl.UNIFORM_BUFFER, uniforms.data.byteLength, gl.DYNAMIC_DRAW);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, UNIFORM_BINDING, buffer);
  gl.uniformBlockBinding(
    program,
    gl.getUniformBlockIndex(program, "AudioUniforms"),
    UNIFORM_BINDING,
  );
  gl.useProgram(program);

  onResize((width, height) => {
    gl.viewport(0, 0, width, height);
    uniforms.resize(width, height);
  });

  onFrame((dt) => {
    if (gl.isContextLost()) return;

    uniforms.update(audio, dt);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, uniforms.data);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  });

  return () => releaseContext(gl);
}

async function renderWebGPU({
  canvas,
  audio,
  onFrame,
  onResize,
}: ThemeContext): Promise<ThemeCleanup> {
  const device = await getGpuDevice();
  const context = canvas.getContext("webgpu");
  if (!context) throw new Error("WebGPUのコンテキストを取得できません");

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  const module = device.createShaderModule({
    code: `${audioWgsl}\n${shaderWgsl}`,
  });
  // シェーダーに誤りがあるとここで失敗し、ThemeHostが次の描画方式を試す
  const pipeline = await device.createRenderPipelineAsync({
    layout: "auto",
    vertex: { module, entryPoint: "vertexMain" },
    fragment: { module, entryPoint: "fragmentMain", targets: [{ format }] },
  });

  const uniforms = new AudioUniforms();
  const buffer = device.createBuffer({
    size: uniforms.data.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer } }],
  });

  onResize((width, height) => uniforms.resize(width, height));

  onFrame((dt) => {
    uniforms.update(audio, dt);
    device.queue.writeBuffer(buffer, 0, uniforms.data);

    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: "clear",
          storeOp: "store",
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  });

  return () => {
    buffer.destroy();
    context.unconfigure();
  };
}

export const plasma: Theme = {
  name: "プラズマ",
  renderers: { webgpu: renderWebGPU, webgl2: renderWebGL2 },
};
