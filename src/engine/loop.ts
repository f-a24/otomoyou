/** タブが非表示から戻ったときなどに、dtが大きく跳ねないようにする上限（秒） */
const MAX_DT = 0.1;

/** 毎フレーム `onFrame` を呼ぶ。返り値の関数で止められる */
export function startLoop(onFrame: (dt: number) => void): () => void {
  let previous = performance.now();
  let handle = requestAnimationFrame(tick);

  function tick(now: number): void {
    const dt = Math.min((now - previous) / 1000, MAX_DT);
    previous = now;
    onFrame(dt);
    handle = requestAnimationFrame(tick);
  }

  return () => cancelAnimationFrame(handle);
}
