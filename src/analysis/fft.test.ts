import { expect, test } from "bun:test";
import { Fft } from "./fft";

function magnitudes(real: Float64Array, imag: Float64Array): number[] {
  return Array.from(real, (value, i) => Math.hypot(value, imag[i] ?? 0));
}

test("サイン波は対応するビンに集まる", () => {
  const size = 64;
  const real = Float64Array.from({ length: size }, (_, i) =>
    Math.sin((2 * Math.PI * 5 * i) / size),
  );
  const imag = new Float64Array(size);

  new Fft(size).transform(real, imag);

  const spectrum = magnitudes(real, imag);
  expect(spectrum[5]).toBeCloseTo(size / 2);
  expect(spectrum[59]).toBeCloseTo(size / 2);
  expect(spectrum[4]).toBeCloseTo(0);
});

test("直流成分は0番目のビンに入る", () => {
  const real = new Float64Array(8).fill(1);
  const imag = new Float64Array(8);

  new Fft(8).transform(real, imag);

  expect(real[0]).toBeCloseTo(8);
  expect(real[1]).toBeCloseTo(0);
});

test("2のべき乗以外はエラーにする", () => {
  expect(() => new Fft(100)).toThrow();
});
