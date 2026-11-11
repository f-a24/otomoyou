/** GLSLソースの先頭に付ける共通の宣言 */
export const GLSL_HEADER = `#version 300 es
precision highp float;
`;

export type RenderTarget = {
  framebuffer: WebGLFramebuffer;
  texture: WebGLTexture;
  width: number;
  height: number;
};

/** 頂点バッファなしで画面全体を覆う三角形を描く */
const FULLSCREEN_VERTEX_SHADER = `#version 300 es
void main() {
  vec2 position = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(position * 2.0 - 1.0, 0.0, 1.0);
}
`;

function compileShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("シェーダーを作成できません");

  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(
      `シェーダーのコンパイルに失敗: ${gl.getShaderInfoLog(shader)}`,
    );
  }
  return shader;
}

/** プログラムを作る。`feedbackVaryings` を渡すとTransform Feedbackの出力になる */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
  feedbackVaryings: string[] = [],
): WebGLProgram {
  const program = gl.createProgram();
  const vertex = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  if (feedbackVaryings.length > 0) {
    gl.transformFeedbackVaryings(
      program,
      feedbackVaryings,
      gl.INTERLEAVED_ATTRIBS,
    );
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(
      `シェーダーのリンクに失敗: ${gl.getProgramInfoLog(program)}`,
    );
  }

  gl.deleteShader(vertex);
  gl.deleteShader(fragment);
  return program;
}

/** 全画面に描くプログラムを作る。`fragmentSource` は `#version` の行から始める */
export function createFullscreenProgram(
  gl: WebGL2RenderingContext,
  fragmentSource: string,
): WebGLProgram {
  return createProgram(gl, FULLSCREEN_VERTEX_SHADER, fragmentSource);
}

/** 画面全体を描く。頂点属性は使わない */
export function drawFullscreen(gl: WebGL2RenderingContext): void {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/** プログラムのuniformブロックをバインディングに結び付ける。使われていないブロックは無視する */
export function bindUniformBlock(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
  binding: number,
): void {
  const index = gl.getUniformBlockIndex(program, name);
  if (index !== gl.INVALID_INDEX) {
    gl.uniformBlockBinding(program, index, binding);
  }
}

/** 描画先のテクスチャを作る。対応していれば、明るさが1を超えられる16ビット浮動小数を使う */
export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): RenderTarget {
  const hasFloat = gl.getExtension("EXT_color_buffer_float") !== null;
  const texture = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    hasFloat ? gl.RGBA16F : gl.RGBA8,
    width,
    height,
    0,
    gl.RGBA,
    hasFloat ? gl.HALF_FLOAT : gl.UNSIGNED_BYTE,
    null,
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const framebuffer = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    texture,
    0,
  );
  gl.clearColor(0, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  return { framebuffer, texture, width, height };
}

export function deleteRenderTarget(
  gl: WebGL2RenderingContext,
  target: RenderTarget,
): void {
  gl.deleteFramebuffer(target.framebuffer);
  gl.deleteTexture(target.texture);
}

/** 描画先を切り替える。nullなら画面に描く */
export function useRenderTarget(
  gl: WebGL2RenderingContext,
  target: RenderTarget | null,
): void {
  gl.bindFramebuffer(gl.FRAMEBUFFER, target?.framebuffer ?? null);
  gl.viewport(
    0,
    0,
    target?.width ?? gl.drawingBufferWidth,
    target?.height ?? gl.drawingBufferHeight,
  );
}

/** ブラウザが同時に持てるコンテキスト数には上限があるので、不要になったらすぐ解放する */
export function releaseContext(gl: WebGL2RenderingContext): void {
  gl.getExtension("WEBGL_lose_context")?.loseContext();
}
