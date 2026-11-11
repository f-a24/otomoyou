import { expect, test } from "bun:test";
import { bandMagnitude, dbToLevel, dbToMagnitude, rms } from "./bands";

test("dBを0..1の範囲に変換する", () => {
  expect(dbToLevel(-Infinity)).toBe(0);
  expect(dbToLevel(-90)).toBe(0);
  expect(dbToLevel(-55)).toBeCloseTo(0.5);
  expect(dbToLevel(0)).toBe(1);
});

test("dBを振幅に変換する", () => {
  expect(dbToMagnitude(0)).toBe(1);
  expect(dbToMagnitude(-20)).toBeCloseTo(0.1);
  expect(dbToMagnitude(-Infinity)).toBe(0);
});

test("指定した帯域のビンだけを平均する", () => {
  // サンプルレート1000、8ビンなら、1ビンは62.5Hz
  const spectrum = new Float32Array(8).fill(-Infinity);
  spectrum[2] = 0; // 125Hz
  spectrum[6] = 0; // 375Hz

  expect(bandMagnitude(spectrum, [100, 150], 1000)).toBeCloseTo(1); // ビン2のみ
  expect(bandMagnitude(spectrum, [100, 200], 1000)).toBeCloseTo(0.5); // ビン2と3
  expect(bandMagnitude(spectrum, [300, 350], 1000)).toBe(0); // ビン5のみ
});

test("ナイキスト周波数より上の帯域は0を返す", () => {
  const spectrum = new Float32Array(8).fill(0);

  expect(bandMagnitude(spectrum, [4000, 20000], 1000)).toBe(0);
});

test("RMSを求める", () => {
  expect(rms(new Float32Array([1, -1, 1, -1]))).toBe(1);
  expect(rms(new Float32Array(4))).toBe(0);
  expect(rms(new Float32Array())).toBe(0);
});
