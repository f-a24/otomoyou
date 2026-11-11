// 前のフレームを少し暗くして、粒子の残像を作る
uniform sampler2D source;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / resolution;

  // 残像をわずかに拡大して、奥から手前へ流れて見えるようにする
  uv = (uv - 0.5) * (0.997 - punch * 0.02) + 0.5;

  fragColor = vec4(texture(source, uv).rgb * pow(0.02, deltaTime), 1.0);
}
