import { expect, test } from "bun:test";
import { formatTime } from "./format-time";

test("1時間未満は m:ss で表示する", () => {
  expect(formatTime(0)).toBe("0:00");
  expect(formatTime(5.9)).toBe("0:05");
  expect(formatTime(225)).toBe("3:45");
});

test("1時間以上は h:mm:ss で表示する", () => {
  expect(formatTime(3600)).toBe("1:00:00");
  expect(formatTime(3725)).toBe("1:02:05");
});

test("不正な値は 0:00 にする", () => {
  expect(formatTime(Number.NaN)).toBe("0:00");
  expect(formatTime(Number.POSITIVE_INFINITY)).toBe("0:00");
  expect(formatTime(-1)).toBe("0:00");
});
