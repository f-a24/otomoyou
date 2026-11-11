import { expect, test } from "bun:test";
import { handleKey, type KeyboardActions } from "./keyboard";

function setup() {
  const calls: string[] = [];
  const actions: KeyboardActions = {
    togglePlay: () => calls.push("togglePlay"),
    seekBy: (seconds) => calls.push(`seekBy ${seconds}`),
    moveTheme: (offset) => calls.push(`moveTheme ${offset}`),
    selectTheme: (index) => calls.push(`selectTheme ${index}`),
    toggleFullscreen: () => calls.push("toggleFullscreen"),
    toggleUi: () => calls.push("toggleUi"),
  };
  return { calls, actions };
}

function key(code: string, options: Partial<KeyboardEvent> = {}) {
  return {
    code,
    repeat: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    ...options,
  };
}

test("各キーが対応する操作を呼ぶ", () => {
  const { calls, actions } = setup();
  const codes = [
    "Space",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Digit2",
    "KeyF",
    "KeyH",
  ];

  for (const code of codes) {
    expect(handleKey(key(code), actions)).toBe(true);
  }

  expect(calls).toEqual([
    "togglePlay",
    "seekBy -5",
    "seekBy 5",
    "moveTheme -1",
    "moveTheme 1",
    "selectTheme 1",
    "toggleFullscreen",
    "toggleUi",
  ]);
});

test("対応しないキーは処理しない", () => {
  const { calls, actions } = setup();

  expect(handleKey(key("KeyA"), actions)).toBe(false);
  expect(handleKey(key("Digit0"), actions)).toBe(false);
  expect(calls).toEqual([]);
});

test("修飾キー付きはブラウザに任せる", () => {
  const { calls, actions } = setup();

  expect(handleKey(key("KeyF", { ctrlKey: true }), actions)).toBe(false);
  expect(calls).toEqual([]);
});

test("押しっぱなしはシークだけ繰り返す", () => {
  const { calls, actions } = setup();

  expect(handleKey(key("Space", { repeat: true }), actions)).toBe(true);
  expect(handleKey(key("ArrowRight", { repeat: true }), actions)).toBe(true);

  expect(calls).toEqual(["seekBy 5"]);
});
