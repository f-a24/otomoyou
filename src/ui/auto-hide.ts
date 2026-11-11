/** UIを隠すまでの無操作時間（ミリ秒） */
const IDLE_TIME = 3000;

/** 再生中に操作がしばらくなければUIを隠す。タイマーを使わず、毎フレームの判定で決める */
export class AutoHide {
  private lastActivity = 0;
  private manuallyHidden = false;
  private hidden = false;

  /** マウスやキーの操作があったときに呼ぶ */
  activity(now: number): void {
    this.lastActivity = now;
  }

  /** Hキーの操作。手動で隠した場合は、もう一度押すまで表示しない */
  toggle(now: number): void {
    this.manuallyHidden = !this.hidden;
    this.lastActivity = now;
  }

  /** 毎フレーム呼び、UIを隠すべきかを返す */
  update(now: number, playing: boolean): boolean {
    const idle = now - this.lastActivity >= IDLE_TIME;
    this.hidden = this.manuallyHidden || (playing && idle);
    return this.hidden;
  }
}
