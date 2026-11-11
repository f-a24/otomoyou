import { BeatDetector } from "./beat-detector";
import { AutoGain, Envelope } from "./envelope";

/** 低域だけを取り出すフィルターの遮断周波数（Hz） */
const CUTOFF = 150;
const ATTACK = 0.005;
const RELEASE = 0.05;
const GAIN_HALF_LIFE = 10;
const GAIN_FLOOR = 0.002;

/** 音声のブロックを順に受け取り、低域の立ち上がりを検出する */
export class OnsetTracker {
  private readonly filterRate: number;
  private readonly gain = new AutoGain(GAIN_HALF_LIFE, GAIN_FLOOR);
  private readonly envelope = new Envelope(ATTACK, RELEASE);
  private readonly detector = new BeatDetector();
  private filtered = 0;

  constructor(private readonly sampleRate: number) {
    this.filterRate = 1 - Math.exp((-2 * Math.PI * CUTOFF) / sampleRate);
  }

  /** ブロックの中で立ち上がりを検出したらtrueを返す */
  process(samples: Float32Array): boolean {
    let sum = 0;
    for (const sample of samples) {
      this.filtered += (sample - this.filtered) * this.filterRate;
      sum += this.filtered * this.filtered;
    }

    const dt = samples.length / this.sampleRate;
    const level = Math.sqrt(sum / Math.max(samples.length, 1));
    const smoothed = this.envelope.update(level, dt);
    return this.detector.update(this.gain.update(smoothed, dt), dt);
  }
}
