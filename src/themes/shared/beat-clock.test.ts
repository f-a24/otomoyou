import { expect, test } from "bun:test";
import { BeatClock } from "./beat-clock";

/** 指定した秒数ごとに拍を入力する */
function feed(clock: BeatClock, intervals: number[]): void {
  const dt = 1 / 120;
  for (const interval of intervals) {
    const frames = Math.round(interval / dt);
    for (let frame = 1; frame < frames; frame++) clock.update(false, dt);
    clock.update(true, dt);
  }
}

test("拍の間隔からテンポを推定する", () => {
  const clock = new BeatClock();

  feed(
    clock,
    Array.from({ length: 8 }, () => 0.4),
  );

  expect(clock.interval).toBeCloseTo(0.4, 2);
});

test("拍を取りこぼしても推定が大きくずれない", () => {
  const clock = new BeatClock();

  feed(clock, [0.4, 0.4, 0.8, 0.4, 0.4, 0.8, 0.4]);

  expect(clock.interval).toBeCloseTo(0.4, 2);
});

test("範囲外の間隔は無視する", () => {
  const clock = new BeatClock();

  feed(clock, [0.5, 5, 0.1]);

  expect(clock.interval).toBeCloseTo(0.5, 2);
});
