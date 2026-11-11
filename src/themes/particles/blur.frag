// 縦と横に分けてぼかす。2回に分けると、サンプル数が大幅に減る
uniform sampler2D source;
uniform vec2 targetSize;
uniform vec2 direction;

out vec4 fragColor;

void main() {
  vec2 uv = gl_FragCoord.xy / targetSize;
  vec2 step = direction / targetSize;

  vec3 color = texture(source, uv).rgb * 0.227;
  color += (texture(source, uv + step).rgb + texture(source, uv - step).rgb) * 0.195;
  color += (texture(source, uv + step * 2.0).rgb + texture(source, uv - step * 2.0).rgb) * 0.122;
  color += (texture(source, uv + step * 3.0).rgb + texture(source, uv - step * 3.0).rgb) * 0.054;
  color += (texture(source, uv + step * 4.0).rgb + texture(source, uv - step * 4.0).rgb) * 0.016;

  fragColor = vec4(color, 1.0);
}
