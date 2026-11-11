/** テンポとして受け入れる拍の間隔（秒）。200BPMから50BPMまで */
const MIN_INTERVAL = 0.3;
const MAX_INTERVAL = 1.2;
const HISTORY_SIZE = 9;
const DEFAULT_INTERVAL = 0.5;

/** 最近の拍の間隔から曲のテンポを推定する。中央値を使い、拍の取りこぼしに左右されにくくする */
export class BeatClock {
  /** 推定した拍の間隔（秒） */
  interval = DEFAULT_INTERVAL;
  private sinceBeat = Infinity;
  private readonly history: number[] = [];

  update(beat: boolean, dt: number): void {
    this.sinceBeat += dt;
    if (!beat) return;

    if (this.sinceBeat >= MIN_INTERVAL && this.sinceBeat <= MAX_INTERVAL) {
      this.history.push(this.sinceBeat);
      if (this.history.length > HISTORY_SIZE) this.history.shift();

      const sorted = this.history.toSorted((a, b) => a - b);
      this.interval = sorted[Math.floor(sorted.length / 2)] ?? this.interval;
    }
    this.sinceBeat = 0;
  }
}
