import type { TrackSection } from "./types";

const BEATS_PER_BAR = 4;
/** 短すぎるセクションを作らないための、最小の小節数 */
const MIN_BARS = 4;
/** 音量差がこの値（dB）を超えたらセクションの区切りとみなす */
const CHANGE_THRESHOLD_DB = 3;
const MIN_DB = -80;

type Bar = { start: number; end: number; db: number };

function toDecibels(value: number): number {
  return value > 0 ? Math.max(20 * Math.log10(value), MIN_DB) : MIN_DB;
}

/** 小節ごとの平均音量を求める */
function createBars(
  rms: Float32Array,
  frameRate: number,
  beats: number[],
  duration: number,
): Bar[] {
  const bars: Bar[] = [];

  for (let i = 0; i < beats.length; i += BEATS_PER_BAR) {
    const start = i === 0 ? 0 : (beats[i] ?? 0);
    const end = beats[i + BEATS_PER_BAR] ?? duration;
    const firstFrame = Math.floor(start * frameRate);
    const lastFrame = Math.min(Math.ceil(end * frameRate), rms.length);

    let sum = 0;
    for (let frame = firstFrame; frame < lastFrame; frame++) {
      sum += (rms[frame] ?? 0) ** 2;
    }
    const mean = Math.sqrt(sum / Math.max(lastFrame - firstFrame, 1));
    bars.push({ start, end, db: toDecibels(mean) });
  }
  return bars;
}

function average(bars: Bar[]): number {
  return bars.reduce((sum, bar) => sum + bar.db, 0) / bars.length;
}

/** 前後の数小節の音量差が最も大きい小節を、セクションの境目として返す */
function findBoundaries(bars: Bar[]): number[] {
  const change = bars.map((_, i) => {
    const before = bars.slice(Math.max(i - MIN_BARS, 0), i);
    const after = bars.slice(i, i + MIN_BARS);
    if (before.length < MIN_BARS || after.length < MIN_BARS) return 0;

    return Math.abs(average(after) - average(before));
  });

  const boundaries: number[] = [];
  change.forEach((value, i) => {
    const nearby = change.slice(Math.max(i - MIN_BARS + 1, 0), i + MIN_BARS);
    const previous = boundaries.at(-1) ?? -MIN_BARS;

    if (
      value > CHANGE_THRESHOLD_DB &&
      value >= Math.max(...nearby) &&
      i - previous >= MIN_BARS
    ) {
      boundaries.push(i);
    }
  });
  return boundaries;
}

/** 小節の音量の変化から曲を区切り、音量の順に盛り上がりの値を付ける */
export function detectSections(
  rms: Float32Array,
  frameRate: number,
  beats: number[],
  duration: number,
): TrackSection[] {
  const bars = createBars(rms, frameRate, beats, duration);
  if (bars.length === 0) return [{ start: 0, end: duration, level: 0.5 }];

  const edges = [0, ...findBoundaries(bars), bars.length];
  const groups = edges.slice(1).map((end, i) => bars.slice(edges[i], end));

  const levels = groups.map(average);
  const lowest = Math.min(...levels);
  const range = Math.max(...levels) - lowest;

  return groups.map((group, i) => ({
    start: group[0]?.start ?? 0,
    end: group.at(-1)?.end ?? duration,
    level: range > 0 ? ((levels[i] ?? lowest) - lowest) / range : 0.5,
  }));
}
