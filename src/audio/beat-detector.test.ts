import { expect, test } from "bun:test";
import { BeatDetector } from "./beat-detector";

type Signal = (time: number) => number;

/** 信号を一定のフレームレートで入力し、拍を検出した時刻を返す */
function detect(signal: Signal, seconds: number, fps: number): number[] {
  const detector = new BeatDetector();
  const dt = 1 / fps;
  const beats: number[] = [];

  for (let frame = 0; frame * dt < seconds; frame++) {
    const time = frame * dt;
    if (detector.update(signal(time), dt)) beats.push(time);
  }
  return beats;
}

/** 指定したBPMで、鳴った瞬間が最大で指数的に減衰するパルスを作る */
function pulses(bpm: number): Signal {
  const interval = 60 / bpm;
  return (time) => Math.exp(-(time % interval) / 0.08);
}

/** 再現性のある疑似乱数 */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

function intervals(beats: number[]): number[] {
  return beats.slice(1).map((beat, i) => beat - (beats[i] ?? 0));
}

for (const fps of [30, 60, 144]) {
  test(`120BPMの信号から0.5秒間隔の拍を検出する（${fps}fps）`, () => {
    const beats = detect(pulses(120), 10, fps);

    expect(beats.length).toBe(20);
    for (const interval of intervals(beats)) {
      expect(Math.abs(interval - 0.5)).toBeLessThanOrEqual(1.5 / fps);
    }
  });
}

test("ノイズが乗っていても120BPMの拍を検出する", () => {
  const random = createRandom(1);
  const signal = pulses(120);
  const beats = detect(
    (time) => Math.min(signal(time) * 0.8 + 0.15 * random(), 1),
    10,
    60,
  );

  expect(beats.length).toBeGreaterThanOrEqual(19);
  expect(beats.length).toBeLessThanOrEqual(21);
});

test("無音では拍を検出しない", () => {
  expect(detect(() => 0, 5, 60)).toEqual([]);
});

test("一定の音量では、鳴り始めの1回しか検出しない", () => {
  expect(detect(() => 0.5, 5, 60).length).toBe(1);
});

test("音量の小さな揺れは拍にしない", () => {
  const random = createRandom(2);
  const beats = detect(() => 0.5 + 0.02 * random(), 5, 60);

  expect(beats.length).toBe(1);
});

test("resetすると状態が初期値に戻る", () => {
  const detector = new BeatDetector();
  expect(detector.update(1, 1 / 60)).toBe(true);

  detector.reset();

  expect(detector.update(1, 1 / 60)).toBe(true);
});
