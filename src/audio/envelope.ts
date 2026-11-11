/** 上がるときは速く、下がるときはゆっくり値を追従させる。時定数は秒で指定する */
export class Envelope {
  private value = 0;

  constructor(
    private readonly attack: number,
    private readonly release: number,
  ) {}

  update(target: number, dt: number): number {
    const timeConstant = target > this.value ? this.attack : this.release;
    this.value += (target - this.value) * (1 - Math.exp(-dt / timeConstant));
    return this.value;
  }

  reset(): void {
    this.value = 0;
  }
}

/** 最近の最大値を基準に 0..1 へ正規化し、音圧の違う曲でも反応を揃える */
export class AutoGain {
  private peak = 0;

  constructor(
    private readonly halfLife: number,
    private readonly floor: number,
  ) {}

  update(value: number, dt: number): number {
    const decayed = this.peak * 0.5 ** (dt / this.halfLife);
    this.peak = Math.max(value, decayed, this.floor);
    return value / this.peak;
  }

  reset(): void {
    this.peak = 0;
  }
}
