// shader.wgsl と同じ見た目になるように保つ
out vec4 fragColor;

void main() {
  vec2 uv = (gl_FragCoord.xy * 2.0 - resolution) / min(resolution.x, resolution.y);
  float screenRadius = length(uv);

  // 低音の音量ではなく立ち上がりを使い、ベースが鳴り続ける曲でもキックに反応させる
  float kick = punch;

  // 座標そのものを何度もゆがめて、液体のように大きくうねらせる
  // サビなど盛り上がる部分ほど大きくうねる
  float amount = (0.35 + 0.35 * energy + 0.9 * wobble) * (0.7 + 0.6 * section);
  float frequency = 1.6;
  for (int i = 0; i < 3; i++) {
    uv += amount * vec2(sin(uv.y * frequency + time * 1.1), cos(uv.x * frequency - time * 0.9));
    amount *= 0.6;
    frequency *= 1.7;
  }

  // 低音で模様が手前へ押し出され、中心がねじれる
  uv *= 1.0 - 0.45 * kick;
  float twist = (kick * 2.2 + beat * 1.2) * exp(-length(uv) * 0.8) + time * 0.2;
  float s = sin(twist);
  float c = cos(twist);
  uv = vec2(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
  float radius = length(uv);

  float density = 3.0 + kick * 5.0;
  float wave = sin(uv.x * density + time)
    + sin(uv.y * density - time * 1.3)
    + sin((uv.x + uv.y) * density * 0.7 + time * 0.7)
    + sin(radius * (5.0 + kick * 12.0) - time * 3.0);

  // 高音は細かいさざ波を重ねる
  wave += treble * 1.5 * sin(uv.x * 28.0 + time * 5.0) * sin(uv.y * 28.0 - time * 4.0);
  wave *= 0.25;

  // 音は模様の形と色の配置で表し、画面全体の平均の明るさは急に変えない
  vec3 color = 0.5 + 0.5 * cos(6.28318 * (wave * 1.5 + vec3(0.0, 0.33, 0.67) + mid * 0.8 + time * 0.05));
  color *= 0.55 + 0.45 * energy;

  // 高音は波の山を細く光らせる
  color += treble * 0.6 * pow(max(wave, 0.0), 4.0);

  // 拍は画面全体を光らせず、広がる輪で表す
  float ring = 1.0 - smoothstep(0.0, 0.16, abs(screenRadius - (1.0 - beat) * 1.8));
  color += ring * beat * 0.9;

  fragColor = vec4(color, 1.0);
}
