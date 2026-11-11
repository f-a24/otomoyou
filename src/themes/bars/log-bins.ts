/** 人の耳に近づけるため、周波数を対数スケールで分割する。バーiの範囲は edges[i]..edges[i+1] */
export function createLogBinEdges(
  firstBin: number,
  lastBin: number,
  barCount: number,
): Int32Array {
  const edges = new Int32Array(barCount + 1);
  const ratio = lastBin / firstBin;

  for (let i = 0; i <= barCount; i++) {
    const edge = Math.round(firstBin * ratio ** (i / barCount));
    // 低域は1バーが1ビンに満たないので、最低でも1ビンを割り当てる
    edges[i] = i === 0 ? edge : Math.max(edge, (edges[i - 1] ?? 0) + 1);
  }
  return edges;
}

/** 範囲内の最大値を返す。平均だと高域の鋭いピークが埋もれてしまう */
export function peakInRange(
  values: Float32Array,
  start: number,
  end: number,
): number {
  let peak = 0;
  for (let i = start; i < end; i++) {
    peak = Math.max(peak, values[i] ?? 0);
  }
  return peak;
}
