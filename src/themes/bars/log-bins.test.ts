import { expect, test } from "bun:test";
import { createLogBinEdges, peakInRange } from "./log-bins";

test("境界は単調に増え、すべてのバーが1ビン以上を持つ", () => {
  const edges = createLogBinEdges(1, 768, 64);

  expect(edges.length).toBe(65);
  expect(edges[0]).toBe(1);
  for (let i = 1; i < edges.length; i++) {
    expect(edges[i] ?? 0).toBeGreaterThan(edges[i - 1] ?? 0);
  }
});

test("最後の境界が指定した範囲に収まる", () => {
  expect(createLogBinEdges(1, 768, 64).at(-1)).toBe(768);
});

test("高域のバーほど多くのビンを持つ", () => {
  const edges = createLogBinEdges(1, 768, 64);
  const width = (i: number) => (edges[i + 1] ?? 0) - (edges[i] ?? 0);

  expect(width(63)).toBeGreaterThan(width(1));
});

test("範囲内の最大値を返す", () => {
  const values = new Float32Array([0.1, 0.9, 0.3, 1]);

  expect(peakInRange(values, 0, 3)).toBeCloseTo(0.9);
  expect(peakInRange(values, 2, 3)).toBeCloseTo(0.3);
  expect(peakInRange(values, 2, 2)).toBe(0);
});
