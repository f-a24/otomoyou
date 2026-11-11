import { expect, test } from "bun:test";
import { OnsetTracker } from "./onset-tracker";

const SAMPLE_RATE = 48000;
const BLOCK_SIZE = 128;

type Signal = (time: number) => number;

/** 信号をブロックごとに入力し、立ち上がりを検出した時刻を返す */
function detect(signal: Signal, seconds: number): number[] {
  const tracker = new OnsetTracker(SAMPLE_RATE);
  const block = new Float32Array(BLOCK_SIZE);
  const onsets: number[] = [];

  for (let start = 0; start < seconds * SAMPLE_RATE; start += BLOCK_SIZE) {
    for (let i = 0; i < BLOCK_SIZE; i++) {
      block[i] = signal((start + i) / SAMPLE_RATE);
    }
    if (tracker.process(block)) onsets.push(start / SAMPLE_RATE);
  }
  return onsets;
}

function kick(time: number, interval: number): number {
  const beatTime = time % interval;
  return Math.sin(2 * Math.PI * 60 * beatTime) * Math.exp(-beatTime / 0.08);
}

test("120BPMのキックを0.5秒間隔で検出する", () => {
  const onsets = detect((time) => 0.7 * kick(time, 0.5), 10);

  expect(onsets.length).toBe(20);
  onsets.slice(1).forEach((onset, i) => {
    expect(Math.abs(onset - (onsets[i] ?? 0) - 0.5)).toBeLessThan(0.02);
  });
});

test("高音だけの信号には反応しない", () => {
  const onsets = detect(
    (time) =>
      (time % 0.5 < 0.05 ? 0.002 : 0) * Math.sin(2 * Math.PI * 8000 * time),
    5,
  );

  expect(onsets.length).toBeLessThanOrEqual(1);
});

test("無音では検出しない", () => {
  expect(detect(() => 0, 3)).toEqual([]);
});
