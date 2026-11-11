const MIN_BPM = 60;
const MAX_BPM = 200;
/** よくあるテンポ。倍テンポと半分のテンポの取り違えを減らすために、ここへ寄せる */
const PREFERRED_BPM = 120;
/** 上のテンポからどれだけ離れてもよいか（オクターブ） */
const PREFERRED_WIDTH = 1;

export type TempoEstimate = {
  /** 1拍のフレーム数 */
  period: number;
  /**
   * 周期性の強さ。拍の周期の自己相関が、ほかの周期の平均よりどれだけ高いか。
   * 一定の音やノイズはどの周期でも同じくらいになるので、値が小さくなる
   */
  confidence: number;
};

function autocorrelation(values: Float32Array, lag: number): number {
  let sum = 0;
  const count = values.length - lag;
  for (let i = 0; i < count; i++) {
    sum += (values[i] ?? 0) * (values[i + lag] ?? 0);
  }
  return count > 0 ? sum / count : 0;
}

/** 立ち上がりの自己相関から、1拍のフレーム数を推定する。立ち上がりが全くなければnullを返す */
export function estimateTempo(
  onset: Float32Array,
  frameRate: number,
): TempoEstimate | null {
  const energy = autocorrelation(onset, 0);
  if (energy <= 0) return null;

  const minLag = Math.max(Math.floor((60 * frameRate) / MAX_BPM), 1);
  const maxLag = Math.ceil((60 * frameRate) / MIN_BPM);
  const scores = new Float64Array(maxLag + 2);

  for (let lag = minLag; lag <= maxLag + 1; lag++) {
    scores[lag] = autocorrelation(onset, lag);
  }

  let bestLag = minLag;
  let bestScore = -Infinity;
  for (let lag = minLag; lag <= maxLag; lag++) {
    const bpm = (60 * frameRate) / lag;
    const octaves = Math.log2(bpm / PREFERRED_BPM) / PREFERRED_WIDTH;
    const score = (scores[lag] ?? 0) * Math.exp(-0.5 * octaves * octaves);

    if (score > bestScore) {
      bestScore = score;
      bestLag = lag;
    }
  }

  // 隣のラグとの放物線補間で、フレームより細かい周期を求める。
  // 範囲の端では補間するとテンポの範囲を外れるので行わない
  let shift = 0;
  if (bestLag > minLag && bestLag < maxLag) {
    const left = scores[bestLag - 1] ?? 0;
    const center = scores[bestLag] ?? 0;
    const right = scores[bestLag + 1] ?? 0;
    const curve = left - 2 * center + right;
    if (curve !== 0) {
      shift = Math.min(Math.max((0.5 * (left - right)) / curve, -0.5), 0.5);
    }
  }

  let sum = 0;
  for (let lag = minLag; lag <= maxLag; lag++) sum += scores[lag] ?? 0;
  const average = sum / (maxLag - minLag + 1);

  return {
    period: bestLag + shift,
    confidence: Math.max(((scores[bestLag] ?? 0) - average) / energy, 0),
  };
}
