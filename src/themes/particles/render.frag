in vec3 particleColor;

out vec4 fragColor;

void main() {
  // 点を四角ではなく、ふちがぼけた円にする
  float falloff = 1.0 - smoothstep(0.0, 0.5, length(gl_PointCoord - 0.5));
  fragColor = vec4(particleColor * falloff, 1.0);
}
