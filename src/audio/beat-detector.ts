/** 最短の拍間隔（秒）。拍の演出が1秒に3回を超えないようにする。180BPM相当 */
const MIN_INTERVAL = 1 / 3;
/** 平均と分散を追従させる時定数（秒） */
const STATS_TIME_CONSTANT = 1.5;
/** これより小さい音量では拍と判定しない */
const MIN_LEVEL = 0.1;
/** 入力は 0..1 なので、しきい値が高くなりすぎて検出できなくならないように上限を置く */
const MAX_THRESHOLD = 0.95;
/** しきい値付近の揺れで連続検出しないように、ここまで下がってから次の拍を受け付ける */
const REARM_RATIO = 0.9;

/** 低域の音量が、最近の平均より急に大きくなった瞬間を拍として検出する */
export class BeatDetector {
  private mean = 0;
  private variance = 0;
  private sinceBeat = Infinity;
  private armed = true;

  /** `level` は 0..1 に正規化した低域の音量 */
  update(level: number, dt: number): boolean {
    this.sinceBeat += dt;

    const adaptive = this.mean * 1.1 + Math.sqrt(this.variance);
    const threshold = Math.min(Math.max(adaptive, MIN_LEVEL), MAX_THRESHOLD);

    const isBeat =
      this.armed && level > threshold && this.sinceBeat >= MIN_INTERVAL;
    if (isBeat) {
      this.sinceBeat = 0;
      this.armed = false;
    } else if (level <= threshold * REARM_RATIO) {
      this.armed = true; // 一度下がるまでは次の拍を検出しない
    }

    this.updateStats(level, dt);
    return isBeat;
  }

  reset(): void {
    this.mean = 0;
    this.variance = 0;
    this.sinceBeat = Infinity;
    this.armed = true;
  }

  /** 指数移動平均で、平均と分散を時間基準で更新する */
  private updateStats(level: number, dt: number): void {
    const rate = 1 - Math.exp(-dt / STATS_TIME_CONSTANT);
    const delta = level - this.mean;

    this.mean += rate * delta;
    this.variance = (1 - rate) * (this.variance + rate * delta * delta);
  }
}
