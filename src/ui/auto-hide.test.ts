import { expect, test } from "bun:test";
import { AutoHide } from "./auto-hide";

test("再生中に3秒操作がなければ隠す", () => {
  const autoHide = new AutoHide();
  autoHide.activity(1000);

  expect(autoHide.update(3999, true)).toBe(false);
  expect(autoHide.update(4000, true)).toBe(true);
});

test("一時停止中は隠さない", () => {
  const autoHide = new AutoHide();

  expect(autoHide.update(10000, false)).toBe(false);
});

test("操作があると再び表示する", () => {
  const autoHide = new AutoHide();
  expect(autoHide.update(10000, true)).toBe(true);

  autoHide.activity(10000);

  expect(autoHide.update(10001, true)).toBe(false);
});

test("手動で隠すと操作があっても表示しない", () => {
  const autoHide = new AutoHide();
  autoHide.update(0, false);
  autoHide.toggle(0);

  autoHide.activity(100);

  expect(autoHide.update(200, false)).toBe(true);
});

test("隠れているときのトグルは表示に戻す", () => {
  const autoHide = new AutoHide();
  expect(autoHide.update(10000, true)).toBe(true);

  autoHide.toggle(10000);

  expect(autoHide.update(10001, true)).toBe(false);
});
