import type { TrackSection } from "./types";

/** 1フレームでこれ以上進んだらシークとみなし、途中の拍を鳴らさない（秒） */
const MAX_STEP = 0.5;

/** 事前解析した拍の時刻を、再生位置に合わせて順に取り出す */
export class BeatTimeline {
  private nextIndex = 0;
  private previousTime = 0;

  constructor(private readonly beats: number[]) {}

  /** 前回から今回の再生位置までの間に拍があればtrueを返す */
  update(time: number): boolean {
    const jumped =
      time < this.previousTime || time - this.previousTime > MAX_STEP;
    this.previousTime = time;

    if (jumped) {
      this.nextIndex = this.beats.findIndex((beat) => beat > time);
      if (this.nextIndex < 0) this.nextIndex = this.beats.length;
      return false;
    }

    let passed = false;
    while ((this.beats[this.nextIndex] ?? Infinity) <= time) {
      passed = true;
      this.nextIndex++;
    }
    return passed;
  }
}

/** 再生位置のセクションの盛り上がりを返す。見つからなければ中間の値にする */
export function sectionLevelAt(sections: TrackSection[], time: number): number {
  const section = sections.find(
    ({ start, end }) => time >= start && time < end,
  );
  return section?.level ?? 0.5;
}
