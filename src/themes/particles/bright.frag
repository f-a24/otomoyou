// ブルーム用に、明るい部分だけを縮小したテクスチャへ取り出す
uniform sampler2D source;
uniform vec2 targetSize;

out vec4 fragColor;

const float THRESHOLD = 0.6;

void main() {
  vec3 color = texture(source, gl_FragCoord.xy / targetSize).rgb;
  fragColor = vec4(max(color - THRESHOLD, 0.0), 1.0);
}
