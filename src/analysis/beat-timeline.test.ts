import { expect, test } from "bun:test";
import { BeatTimeline, sectionLevelAt } from "./beat-timeline";

test("再生位置が拍を通過したフレームだけtrueを返す", () => {
  const timeline = new BeatTimeline([0.5, 1]);

  expect(timeline.update(0.4)).toBe(false);
  expect(timeline.update(0.52)).toBe(true);
  expect(timeline.update(0.6)).toBe(false);
  expect(timeline.update(1.01)).toBe(true);
});

test("再生位置が止まっている間は拍を返さない", () => {
  const timeline = new BeatTimeline([0.5]);
  timeline.update(0.4);

  expect(timeline.update(0.4)).toBe(false);
  expect(timeline.update(0.4)).toBe(false);
});

test("シークしても途中の拍は返さず、次の拍から再開する", () => {
  const timeline = new BeatTimeline([1, 2, 3, 4]);

  expect(timeline.update(2.5)).toBe(false);
  expect(timeline.update(2.9)).toBe(false);
  expect(timeline.update(3.1)).toBe(true);
});

test("巻き戻すと前の拍をもう一度返す", () => {
  const timeline = new BeatTimeline([1, 2]);
  timeline.update(0.9);
  timeline.update(1.1);

  expect(timeline.update(0.8)).toBe(false);
  expect(timeline.update(1.05)).toBe(true);
});

test("最後の拍のあとはfalseを返し続ける", () => {
  const timeline = new BeatTimeline([1]);
  timeline.update(0.9);
  timeline.update(1.1);

  expect(timeline.update(1.3)).toBe(false);
  expect(timeline.update(5)).toBe(false);
  expect(timeline.update(5.1)).toBe(false);
});

test("再生位置のセクションの値を返す", () => {
  const sections = [
    { start: 0, end: 10, level: 0.2 },
    { start: 10, end: 20, level: 1 },
  ];

  expect(sectionLevelAt(sections, 5)).toBe(0.2);
  expect(sectionLevelAt(sections, 10)).toBe(1);
  expect(sectionLevelAt(sections, 30)).toBe(0.5);
});
