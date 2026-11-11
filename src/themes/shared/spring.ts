/** 計算の刻み幅（秒）。フレームレートに関係なく同じ揺れ方にする */
const STEP = 1 / 240;

/** 目標を行き過ぎて、ぷるぷると揺れ戻る値 */
export class Spring {
  value = 0;
  private velocity = 0;
  private remaining = 0;

  /**
   * @param stiffness 大きいほど速く揺れる。途中で変えられる
   * @param damping 大きいほど早く揺れが収まる
   */
  constructor(
    public stiffness: number,
    private readonly damping: number,
  ) {}

  /** 瞬間的に力を加える */
  kick(velocity: number): void {
    this.velocity += velocity;
  }

  update(target: number, dt: number): number {
    this.remaining += dt;

    while (this.remaining >= STEP) {
      const force =
        this.stiffness * (target - this.value) - this.damping * this.velocity;
      this.velocity += force * STEP;
      this.value += this.velocity * STEP;
      this.remaining -= STEP;
    }
    return this.value;
  }
}
