// 並びは audio-uniforms.ts に合わせる
layout(std140) uniform AudioUniforms {
  vec2 resolution;
  float time;
  float bass;
  float mid;
  float treble;
  float energy;
  float beat;
  float wobble;
  float punch;
  float deltaTime;
  float section;
};
