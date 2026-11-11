layout(location = 0) in vec2 inPosition;
layout(location = 1) in vec2 inVelocity;

out vec3 particleColor;

/** 明るさの基準にする画面の面積。画面が小さいほど粒子が重なるので暗くする */
const float REFERENCE_AREA = 1920.0 * 1080.0;

void main() {
  vec2 scale = min(resolution.x, resolution.y) / resolution;
  gl_Position = vec4(inPosition * scale, 0.0, 1.0);
  gl_PointSize = max(resolution.y / 1080.0 * (1.5 + treble * 2.0), 1.0);

  // 速い粒子は色相をずらす。明るさの差は小さくして、キックで画面全体が明滅しないようにする
  float speed = length(inVelocity);
  vec3 hue = 0.5 + 0.5 * cos(6.28318 * (speed * 0.35 + mid * 0.6 + time * 0.04 + vec3(0.0, 0.33, 0.67)));
  float density = min(resolution.x * resolution.y / REFERENCE_AREA, 1.0);
  particleColor = hue * (0.3 + min(speed, 2.0) * 0.1) * density;
}
