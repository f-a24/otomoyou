import { expect, test } from "bun:test";
import { AutoGain, Envelope } from "./envelope";

function run(envelope: Envelope, target: number, dt: number, seconds: number) {
  let value = 0;
  for (let t = 0; t < seconds - 1e-9; t += dt) {
    value = envelope.update(target, dt);
  }
  return value;
}

test("Envelopeは上がるときのほうが速い", () => {
  const rising = new Envelope(0.01, 0.5);
  expect(run(rising, 1, 1 / 60, 0.1)).toBeGreaterThan(0.99);

  const falling = run(rising, 0, 1 / 60, 0.1);
  expect(falling).toBeGreaterThan(0.7);
});

test("Envelopeの追従はフレームレートに左右されない", () => {
  const at30fps = run(new Envelope(0.1, 0.1), 1, 1 / 30, 0.2);
  const at144fps = run(new Envelope(0.1, 0.1), 1, 1 / 144, 0.2);

  expect(at30fps).toBeCloseTo(at144fps, 1);
});

test("AutoGainは小さい音量でも1近くまで持ち上げる", () => {
  const gain = new AutoGain(10, 0.001);

  expect(gain.update(0.01, 1 / 60)).toBe(1);
  expect(gain.update(0.005, 1 / 60)).toBeCloseTo(0.5, 1);
});

test("AutoGainは下限より小さい音を持ち上げすぎない", () => {
  const gain = new AutoGain(10, 0.01);

  expect(gain.update(0.001, 1 / 60)).toBeCloseTo(0.1);
});

test("AutoGainの基準は半減期で下がる", () => {
  const gain = new AutoGain(1, 0.001);
  gain.update(1, 0);

  expect(gain.update(0.25, 1)).toBeCloseTo(0.5);
});
