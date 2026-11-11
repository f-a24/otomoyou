/** 拍の間隔が推定テンポからずれることへの罰則の強さ */
const TEMPO_TIGHTNESS = 100;

/**
 * 動的計画法で拍の並びを決める。立ち上がりが強い位置を通りつつ、
 * 間隔が推定テンポに近い並びの中で、合計の評価が最も高いものを選ぶ
 */
export function trackBeats(onset: Float32Array, period: number): number[] {
  const count = onset.length;
  if (count === 0 || period <= 0) return [];

  const scores = new Float64Array(count);
  const previous = new Int32Array(count).fill(-1);
  const minStep = Math.max(Math.round(period / 2), 1);
  const maxStep = Math.round(period * 2);

  for (let i = 0; i < count; i++) {
    let best = 0;
    let bestIndex = -1;

    for (let step = minStep; step <= maxStep && step <= i; step++) {
      const drift = Math.log(step / period);
      const score = (scores[i - step] ?? 0) - TEMPO_TIGHTNESS * drift * drift;

      if (score > best) {
        best = score;
        bestIndex = i - step;
      }
    }

    scores[i] = (onset[i] ?? 0) + best;
    previous[i] = bestIndex;
  }

  // 曲の最後の1拍分の中で、最も評価の高い位置から逆にたどる
  let last = count - 1;
  const tailStart = Math.max(count - Math.ceil(period), 0);
  for (let i = tailStart; i < count; i++) {
    if ((scores[i] ?? 0) > (scores[last] ?? 0)) last = i;
  }

  const beats: number[] = [];
  for (let index = last; index >= 0; index = previous[index] ?? -1) {
    beats.push(index);
  }
  return beats.toReversed();
}
