// 並びは audio-uniforms.ts に合わせる
struct AudioUniforms {
  resolution: vec2f,
  time: f32,
  bass: f32,
  mid: f32,
  treble: f32,
  energy: f32,
  beat: f32,
  wobble: f32,
  punch: f32,
  deltaTime: f32,
  section: f32,
}

@group(0) @binding(0) var<uniform> audio: AudioUniforms;

// 頂点バッファなしで画面全体を覆う三角形を描く
@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> @builtin(position) vec4f {
  let position = vec2f(f32((index << 1u) & 2u), f32(index & 2u));
  return vec4f(position * 2.0 - 1.0, 0.0, 1.0);
}
