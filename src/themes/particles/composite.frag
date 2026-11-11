// 残像とブルームを合成し、色収差を加えて画面へ出す
uniform sampler2D scene;
uniform sampler2D bloom;

out vec4 fragColor;

const float BLOOM_STRENGTH = 1.2;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  // 赤と青を中心から逆向きにずらす。キックの瞬間に大きくなる
  vec2 shift = (uv - 0.5) * (0.004 + punch * 0.03 + beat * 0.01);
  vec3 color = vec3(
    texture(scene, uv + shift).r,
    texture(scene, uv).g,
    texture(scene, uv - shift).b
  );
  color += texture(bloom, uv).rgb * BLOOM_STRENGTH;

  // 明るい部分が白く飛びすぎないように丸める
  fragColor = vec4(1.0 - exp(-color * 1.4), 1.0);
}
