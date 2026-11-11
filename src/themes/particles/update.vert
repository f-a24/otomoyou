// Transform Feedbackで粒子を1フレーム進める。座標は短辺を -1..1 とする
layout(location = 0) in vec2 inPosition;
layout(location = 1) in vec2 inVelocity;

out vec2 outPosition;
out vec2 outVelocity;

const float RESPAWN_RADIUS = 2.2;

float hash(float value) {
  return fract(sin(value * 91.3458) * 47453.5453);
}

void main() {
  vec2 position = inPosition;
  vec2 velocity = inVelocity;

  // 場所ごとに向きが変わる流れに乗せる。音が大きく、盛り上がる部分ほど流れが強い
  vec2 flow = vec2(
    sin(position.y * 2.5 + time * 0.7) + sin(position.y * 5.7 - time),
    cos(position.x * 2.5 - time * 0.6) + cos(position.x * 4.8 + time * 1.1)
  );
  velocity += flow * (0.4 + energy * 1.4) * (0.6 + 0.8 * section) * deltaTime;

  // キックで中心から外へ吹き飛ばす。中心に近いほど弱くして、真ん中に空洞ができないようにする
  velocity += position * (punch * 9.0 + beat * 3.0) * deltaTime;

  // 画面の外へ出ていかないように、中心へ引き戻す
  velocity -= position * 0.9 * deltaTime;
  velocity *= exp(-deltaTime * 1.6);
  position += velocity * deltaTime;

  // 遠くへ行った粒子は中心付近からやり直す。平方根を取って、円の中に均等に散らばるようにする
  if (length(position) > RESPAWN_RADIUS) {
    float seed = float(gl_VertexID) * 0.0013 + time;
    float angle = hash(seed) * 6.28318;
    float distance = sqrt(hash(seed + 1.7)) * 0.6;
    position = vec2(cos(angle), sin(angle)) * distance;
    velocity = vec2(0.0);
  }

  outPosition = position;
  outVelocity = velocity;
}
