/** ← → キーで移動する秒数 */
const SEEK_STEP = 5;

export type KeyboardActions = {
  togglePlay(): void;
  seekBy(seconds: number): void;
  moveTheme(offset: number): void;
  selectTheme(index: number): void;
  toggleFullscreen(): void;
  toggleUi(): void;
};

type KeyInput = Pick<
  KeyboardEvent,
  "code" | "repeat" | "ctrlKey" | "altKey" | "metaKey"
>;

/**
 * キー操作を実行し、処理したらtrueを返す。
 * 日本語入力がオンでも動くように、`key` ではなく物理キーの `code` で判定する
 */
export function handleKey(event: KeyInput, actions: KeyboardActions): boolean {
  if (event.ctrlKey || event.altKey || event.metaKey) return false;

  // シークだけは押しっぱなしで連続して動かす
  if (event.code === "ArrowLeft") {
    actions.seekBy(-SEEK_STEP);
    return true;
  }
  if (event.code === "ArrowRight") {
    actions.seekBy(SEEK_STEP);
    return true;
  }

  const digit = /^Digit([1-9])$/.exec(event.code)?.[1];
  const action = digit
    ? () => actions.selectTheme(Number(digit) - 1)
    : {
        Space: () => actions.togglePlay(),
        ArrowUp: () => actions.moveTheme(-1),
        ArrowDown: () => actions.moveTheme(1),
        KeyF: () => actions.toggleFullscreen(),
        KeyH: () => actions.toggleUi(),
      }[event.code];

  if (!action) return false;
  if (!event.repeat) action();
  return true;
}
