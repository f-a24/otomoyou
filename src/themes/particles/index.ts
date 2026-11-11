import {
  bindUniformBlock,
  createFullscreenProgram,
  createProgram,
  createRenderTarget,
  deleteRenderTarget,
  drawFullscreen,
  GLSL_HEADER,
  releaseContext,
  useRenderTarget,
  type RenderTarget,
} from "../../engine/gl";
import { AudioUniforms } from "../shared/audio-uniforms";
import audioGlsl from "../shared/audio.glsl?raw";
import type { Theme, ThemeCleanup, ThemeContext } from "../types";
import blurFrag from "./blur.frag?raw";
import brightFrag from "./bright.frag?raw";
import compositeFrag from "./composite.frag?raw";
import fadeFrag from "./fade.frag?raw";
import renderFrag from "./render.frag?raw";
import renderVert from "./render.vert?raw";
import updateVert from "./update.vert?raw";

const PARTICLE_COUNT = 100_000;
/** 1粒子あたり、位置と速度で4つのfloat */
const FLOATS_PER_PARTICLE = 4;
const STRIDE = FLOATS_PER_PARTICLE * Float32Array.BYTES_PER_ELEMENT;
const UNIFORM_BINDING = 0;
/** ブルームは縮小して処理する。ぼかす処理なので解像度が低くても目立たない */
const BLOOM_SCALE = 4;

function withAudio(source: string): string {
  return `${GLSL_HEADER}${audioGlsl}
${source}`;
}

/** 円の中にランダムに置いた初期状態を作る */
function createInitialParticles(): Float32Array<ArrayBuffer> {
  const data = new Float32Array(PARTICLE_COUNT * FLOATS_PER_PARTICLE);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.sqrt(Math.random()) * 1.5;
    data[i * FLOATS_PER_PARTICLE] = Math.cos(angle) * radius;
    data[i * FLOATS_PER_PARTICLE + 1] = Math.sin(angle) * radius;
  }
  return data;
}

/** 同じ内容の頂点バッファを2つ作る。読み込み用と書き出し用を毎フレーム入れ替える */
function createParticleBuffers(gl: WebGL2RenderingContext) {
  const initial = createInitialParticles();

  return [0, 1].map(() => {
    const buffer = gl.createBuffer();
    const vertexArray = gl.createVertexArray();

    gl.bindVertexArray(vertexArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, initial, gl.DYNAMIC_COPY);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, STRIDE, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, STRIDE, 8);
    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    return { buffer, vertexArray };
  });
}

function setTextureUnits(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  units: Record<string, number>,
): void {
  gl.useProgram(program);
  for (const [name, unit] of Object.entries(units)) {
    gl.uniform1i(gl.getUniformLocation(program, name), unit);
  }
}

function render({
  canvas,
  audio,
  onFrame,
  onResize,
}: ThemeContext): ThemeCleanup {
  const gl = canvas.getContext("webgl2", { alpha: false, antialias: false });
  if (!gl) throw new Error("WebGL2のコンテキストを取得できません");

  const updateProgram = createProgram(
    gl,
    withAudio(updateVert),
    `${GLSL_HEADER}void main() {}`,
    ["outPosition", "outVelocity"],
  );
  const drawProgram = createProgram(
    gl,
    withAudio(renderVert),
    `${GLSL_HEADER}${renderFrag}`,
  );
  const fadeProgram = createFullscreenProgram(gl, withAudio(fadeFrag));
  const brightProgram = createFullscreenProgram(
    gl,
    `${GLSL_HEADER}${brightFrag}`,
  );
  const blurProgram = createFullscreenProgram(gl, `${GLSL_HEADER}${blurFrag}`);
  const compositeProgram = createFullscreenProgram(
    gl,
    withAudio(compositeFrag),
  );

  const uniforms = new AudioUniforms();
  const uniformBuffer = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, uniformBuffer);
  gl.bufferData(gl.UNIFORM_BUFFER, uniforms.data.byteLength, gl.DYNAMIC_DRAW);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, UNIFORM_BINDING, uniformBuffer);
  for (const program of [
    updateProgram,
    drawProgram,
    fadeProgram,
    compositeProgram,
  ]) {
    bindUniformBlock(gl, program, "AudioUniforms", UNIFORM_BINDING);
  }

  setTextureUnits(gl, fadeProgram, { source: 0 });
  setTextureUnits(gl, brightProgram, { source: 0 });
  setTextureUnits(gl, blurProgram, { source: 0 });
  setTextureUnits(gl, compositeProgram, { scene: 0, bloom: 1 });

  const brightTargetSize = gl.getUniformLocation(brightProgram, "targetSize");
  const blurTargetSize = gl.getUniformLocation(blurProgram, "targetSize");
  const blurDirection = gl.getUniformLocation(blurProgram, "direction");

  const particles = createParticleBuffers(gl);
  let particleIndex = 0;
  let trails: RenderTarget[] = [];
  let blooms: RenderTarget[] = [];

  onResize((width, height) => {
    for (const target of [...trails, ...blooms]) deleteRenderTarget(gl, target);

    const bloomWidth = Math.max(Math.floor(width / BLOOM_SCALE), 1);
    const bloomHeight = Math.max(Math.floor(height / BLOOM_SCALE), 1);
    trails = [0, 1].map(() => createRenderTarget(gl, width, height));
    blooms = [0, 1].map(() => createRenderTarget(gl, bloomWidth, bloomHeight));
    uniforms.resize(width, height);
  });

  const stepParticles = (): void => {
    const nextIndex = 1 - particleIndex;
    const source = particles[particleIndex];
    const target = particles[nextIndex];
    if (!source || !target) return;

    gl.useProgram(updateProgram);
    gl.bindVertexArray(source.vertexArray);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, target.buffer);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, null);
    gl.bindVertexArray(null);

    particleIndex = nextIndex;
  };

  /** 前のフレームを暗くした上に、粒子を加算で描く */
  const drawTrail = (previous: RenderTarget, current: RenderTarget): void => {
    useRenderTarget(gl, current);
    gl.useProgram(fadeProgram);
    gl.bindTexture(gl.TEXTURE_2D, previous.texture);
    drawFullscreen(gl);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.useProgram(drawProgram);
    gl.bindVertexArray(particles[particleIndex]?.vertexArray ?? null);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    gl.bindVertexArray(null);
    gl.disable(gl.BLEND);
  };

  const drawBloom = (
    scene: RenderTarget,
    first: RenderTarget,
    second: RenderTarget,
  ): void => {
    useRenderTarget(gl, first);
    gl.useProgram(brightProgram);
    gl.uniform2f(brightTargetSize, first.width, first.height);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    drawFullscreen(gl);

    gl.useProgram(blurProgram);
    gl.uniform2f(blurTargetSize, first.width, first.height);

    useRenderTarget(gl, second);
    gl.uniform2f(blurDirection, 1, 0);
    gl.bindTexture(gl.TEXTURE_2D, first.texture);
    drawFullscreen(gl);

    useRenderTarget(gl, first);
    gl.uniform2f(blurDirection, 0, 1);
    gl.bindTexture(gl.TEXTURE_2D, second.texture);
    drawFullscreen(gl);
  };

  const drawComposite = (scene: RenderTarget, bloom: RenderTarget): void => {
    useRenderTarget(gl, null);
    gl.useProgram(compositeProgram);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, bloom.texture);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, scene.texture);
    drawFullscreen(gl);
  };

  onFrame((dt) => {
    if (gl.isContextLost()) return;

    const [previous, current] = trails;
    const [firstBloom, secondBloom] = blooms;
    if (!previous || !current || !firstBloom || !secondBloom) return;

    uniforms.update(audio, dt);
    gl.bufferSubData(gl.UNIFORM_BUFFER, 0, uniforms.data);

    stepParticles();
    drawTrail(previous, current);
    drawBloom(current, firstBloom, secondBloom);
    drawComposite(current, firstBloom);

    trails = [current, previous];
  });

  return () => releaseContext(gl);
}

export const particles: Theme = {
  name: "パーティクル",
  renderers: { webgl2: render },
};
