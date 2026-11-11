// shader.frag と同じ見た目になるように保つ
@fragment
fn fragmentMain(@builtin(position) position: vec4f) -> @location(0) vec4f {
  // WGSLのy座標は下向きなので、GLSLに合わせて反転する
  let coord = vec2f(position.x, audio.resolution.y - position.y);
  var uv = (coord * 2.0 - audio.resolution) / min(audio.resolution.x, audio.resolution.y);
  let screenRadius = length(uv);

  // 低音の音量ではなく立ち上がりを使い、ベースが鳴り続ける曲でもキックに反応させる
  let kick = audio.punch;

  // 座標そのものを何度もゆがめて、液体のように大きくうねらせる
  // サビなど盛り上がる部分ほど大きくうねる
  var amount = (0.35 + 0.35 * audio.energy + 0.9 * audio.wobble) * (0.7 + 0.6 * audio.section);
  var frequency = 1.6;
  for (var i = 0; i < 3; i++) {
    uv += amount * vec2f(sin(uv.y * frequency + audio.time * 1.1), cos(uv.x * frequency - audio.time * 0.9));
    amount *= 0.6;
    frequency *= 1.7;
  }

  // 低音で模様が手前へ押し出され、中心がねじれる
  uv *= 1.0 - 0.45 * kick;
  let twist = (kick * 2.2 + audio.beat * 1.2) * exp(-length(uv) * 0.8) + audio.time * 0.2;
  let s = sin(twist);
  let c = cos(twist);
  uv = vec2f(uv.x * c - uv.y * s, uv.x * s + uv.y * c);
  let radius = length(uv);

  let density = 3.0 + kick * 5.0;
  var wave = sin(uv.x * density + audio.time)
    + sin(uv.y * density - audio.time * 1.3)
    + sin((uv.x + uv.y) * density * 0.7 + audio.time * 0.7)
    + sin(radius * (5.0 + kick * 12.0) - audio.time * 3.0);

  // 高音は細かいさざ波を重ねる
  wave += audio.treble * 1.5 * sin(uv.x * 28.0 + audio.time * 5.0) * sin(uv.y * 28.0 - audio.time * 4.0);
  wave *= 0.25;

  // 音は模様の形と色の配置で表し、画面全体の平均の明るさは急に変えない
  var color = 0.5 + 0.5 * cos(6.28318 * (wave * 1.5 + vec3f(0.0, 0.33, 0.67) + audio.mid * 0.8 + audio.time * 0.05));
  color *= 0.55 + 0.45 * audio.energy;

  // 高音は波の山を細く光らせる
  color += audio.treble * 0.6 * pow(max(wave, 0.0), 4.0);

  // 拍は画面全体を光らせず、広がる輪で表す
  let ring = 1.0 - smoothstep(0.0, 0.16, abs(screenRadius - (1.0 - audio.beat) * 1.8));
  color += ring * audio.beat * 0.9;

  return vec4f(color, 1.0);
}
