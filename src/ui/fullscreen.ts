/** アプリ全体を全画面にする。canvasだけにするとオーバーレイUIが見えなくなる */
export function toggleFullscreen(): void {
  if (document.fullscreenElement) {
    void document.exitFullscreen();
    return;
  }

  document.documentElement.requestFullscreen().catch((error: unknown) => {
    console.warn("全画面にできませんでした", error);
  });
}
