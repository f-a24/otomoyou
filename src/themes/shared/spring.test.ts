import { expect, test } from "bun:test";
import { Spring } from "./spring";

function run(spring: Spring, target: number, seconds: number, fps: number) {
  const values: number[] = [];
  for (let frame = 0; frame < seconds * fps; frame++) {
    values.push(spring.update(target, 1 / fps));
  }
  return values;
}

test("目標を行き過ぎて揺れ戻る", () => {
  const values = run(new Spring(350, 6), 1, 2, 60);

  expect(Math.max(...values)).toBeGreaterThan(1.2);
  expect(Math.min(...values.slice(30))).toBeLessThan(1);
});

test("揺れはやがて目標に収まる", () => {
  const values = run(new Spring(350, 6), 1, 5, 60);

  expect(values.at(-1)).toBeCloseTo(1, 2);
});

test("フレームレートが違っても同じように揺れる", () => {
  const at30fps = new Spring(350, 6);
  const at144fps = new Spring(350, 6);
  run(at30fps, 1, 0.5, 30);
  run(at144fps, 1, 0.5, 144);

  expect(at30fps.value).toBeCloseTo(at144fps.value, 1);
});

test("dtが大きくても発散しない", () => {
  const values = run(new Spring(350, 6), 1, 5, 10);

  expect(Math.max(...values)).toBeLessThan(3);
});

test("kickで目標がなくても揺れる", () => {
  const spring = new Spring(350, 6);
  spring.kick(10);

  const values = run(spring, 0, 1, 60);

  expect(Math.max(...values)).toBeGreaterThan(0.2);
  expect(Math.min(...values)).toBeLessThan(0);
});
