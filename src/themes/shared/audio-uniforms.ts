import type { AudioFrame } from "../../audio/audio-frame";
import { BeatClock } from "./beat-clock";
import { Spring } from "./spring";

/** 拍の演出が消えるまでの時定数（秒） */
const BEAT_FALL_TIME = 0.35;
/** 映像の進む速さ。常に流れる分を抑え、拍の直後に大きく進めて曲と揃える */
const BASE_SPEED = 0.25;
const ENERGY_SPEED = 0.6;
const BEAT_SPEED = 4;
/** 画面全体の明るさが拍ごとに点滅しないよう、energyをゆっくり追従させる時定数（秒） */
const ENERGY_TIME_CONSTANT = 1.2;
/** 揺れの減衰。次の拍までに3分の1ほど残る */
const WOBBLE_DAMPING = 4;
/** 拍で加える力。揺れの速さに比例させて、テンポが変わっても振れ幅を保つ */
const WOBBLE_KICK_RATIO = 0.6;
/** 低音の平均を追う時定数（秒）。これより速い立ち上がりをアタックとして扱う */
const BASS_AVERAGE_TIME = 0.6;
const PUNCH_GAIN = 2.5;

/**
 * シェーダーへ渡す値。並びは shared/audio.wgsl と shared/audio.glsl に合わせる。
 * GLSLのstd140ではブロックの大きさが16バイト単位になるので、末尾の余りも確保する
 */
export class AudioUniforms {
  readonly data = new Float32Array(12);
  private readonly clock = new BeatClock();
  private readonly wobble = new Spring(0, WOBBLE_DAMPING);
  private time = 0;
  private beat = 0;
  private energy = 0;
  private bassAverage = 0;

  resize(width: number, height: number): void {
    this.data[0] = width;
    this.data[1] = height;
  }

  update(audio: AudioFrame, dt: number): void {
    this.beat = audio.beat ? 1 : this.beat * Math.exp(-dt / BEAT_FALL_TIME);
    this.time +=
      dt * (BASE_SPEED + audio.energy * ENERGY_SPEED + this.beat * BEAT_SPEED);
    this.energy +=
      (audio.energy - this.energy) * (1 - Math.exp(-dt / ENERGY_TIME_CONSTANT));

    // 低音が鳴り続ける曲でも反応するように、平均からの立ち上がりだけを取り出す
    this.bassAverage +=
      (audio.bass - this.bassAverage) * (1 - Math.exp(-dt / BASS_AVERAGE_TIME));
    const punch = (audio.bass - this.bassAverage) * PUNCH_GAIN;

    // 揺れの周期を拍の間隔に合わせ、毎拍同じ向きに力を加えて曲と同期させる
    this.clock.update(audio.beat, dt);
    const angularSpeed = (2 * Math.PI) / this.clock.interval;
    this.wobble.stiffness = angularSpeed ** 2;
    if (audio.beat) this.wobble.kick(angularSpeed * WOBBLE_KICK_RATIO);

    this.data[2] = this.time;
    this.data[3] = audio.bass;
    this.data[4] = audio.mid;
    this.data[5] = audio.treble;
    this.data[6] = this.energy;
    this.data[7] = this.beat;
    this.data[8] = this.wobble.update(0, dt);
    this.data[9] = Math.min(Math.max(punch, 0), 1);
    this.data[10] = dt;
    this.data[11] = audio.section;
  }
}
