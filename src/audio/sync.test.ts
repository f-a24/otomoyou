import { expect, test } from "bun:test";
import { syncedTime } from "./sync";

test("出力遅延の分だけ再生位置を戻す", () => {
  expect(syncedTime(10, 0.04)).toBeCloseTo(9.96);
});

test("曲の先頭より前にはならない", () => {
  expect(syncedTime(0.01, 0.04)).toBe(0);
});
