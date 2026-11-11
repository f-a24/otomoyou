import { BeatTimeline, sectionLevelAt } from "../analysis/beat-timeline";
import type { TrackAnalysis, TrackSection } from "../analysis/types";
import { createAudioFrame, FFT_SIZE, type AudioFrame } from "./audio-frame";
import {
  BASS_RANGE,
  bandMagnitude,
  dbToLevel,
  MID_RANGE,
  rms,
  TREBLE_RANGE,
  type FrequencyRange,
} from "./bands";
import { BeatDetector } from "./beat-detector";
import { AutoGain, Envelope } from "./envelope";

const ATTACK = 0.01;
const RELEASE = 0.25;
const GAIN_HALF_LIFE = 10;
const GAIN_FLOOR = 0.002;

/** 自動ゲインと平滑化を1つの値にかける */
class Channel {
  private readonly gain = new AutoGain(GAIN_HALF_LIFE, GAIN_FLOOR);
  private readonly envelope = new Envelope(ATTACK, RELEASE);
  /** 平滑化する前の値。拍検出に使う */
  normalized = 0;

  update(value: number, dt: number): number {
    this.normalized = this.gain.update(value, dt);
    return this.envelope.update(this.normalized, dt);
  }

  reset(): void {
    this.gain.reset();
    this.envelope.reset();
    this.normalized = 0;
  }
}

/** AnalyserNodeの値を、毎フレームAudioFrameへ書き込む */
export class RealtimeAnalyzer {
  readonly frame: AudioFrame = createAudioFrame();
  private readonly spectrumDb = new Float32Array(FFT_SIZE / 2);
  private readonly bass = new Channel();
  private readonly mid = new Channel();
  private readonly treble = new Channel();
  private readonly energy = new Channel();
  private readonly beatDetector = new BeatDetector();
  private timeline: BeatTimeline | null = null;
  private sections: TrackSection[] = [];
  private hasOnsetSource = false;
  private onsetPending = false;

  /** 音声スレッドの検出結果を受け取る。届き始めたらメインスレッドの検出より優先する */
  pushOnset(): void {
    this.hasOnsetSource = true;
    this.onsetPending = true;
  }

  /** 事前解析の結果を使う。nullならリアルタイムの拍検出に戻す */
  setTrack(analysis: TrackAnalysis | null): void {
    // 拍が見つからなかった曲は、リアルタイムの拍検出のまま動かす
    this.timeline =
      analysis && analysis.beats.length > 0
        ? new BeatTimeline(analysis.beats)
        : null;
    this.sections = analysis?.sections ?? [];
  }

  /** `analyser` は最初の再生までnullで、その間は無音として扱う */
  update(analyser: AnalyserNode | null, dt: number, time: number): void {
    const { frame, spectrumDb } = this;
    const sampleRate = analyser?.context.sampleRate ?? 44100;

    if (analyser) {
      analyser.getFloatFrequencyData(spectrumDb);
      analyser.getFloatTimeDomainData(frame.waveform);
    } else {
      spectrumDb.fill(-Infinity);
      frame.waveform.fill(0);
    }

    for (let i = 0; i < spectrumDb.length; i++) {
      frame.spectrum[i] = dbToLevel(spectrumDb[i] ?? -Infinity);
    }

    const magnitude = (range: FrequencyRange) =>
      bandMagnitude(spectrumDb, range, sampleRate);

    frame.bass = this.bass.update(magnitude(BASS_RANGE), dt);
    frame.mid = this.mid.update(magnitude(MID_RANGE), dt);
    frame.treble = this.treble.update(magnitude(TREBLE_RANGE), dt);
    frame.energy = this.energy.update(rms(frame.waveform), dt);

    // 優先順位は、事前解析の拍、音声スレッドの検出、メインスレッドの検出
    const detected = this.beatDetector.update(this.bass.normalized, dt);
    const realtimeBeat = this.hasOnsetSource ? this.onsetPending : detected;
    this.onsetPending = false;
    frame.beat = this.timeline ? this.timeline.update(time) : realtimeBeat;
    frame.section = sectionLevelAt(this.sections, time);
    frame.time = time;
  }

  /** 曲が変わったら、前の曲の音量基準を持ち越さないように初期化する */
  reset(): void {
    this.bass.reset();
    this.mid.reset();
    this.treble.reset();
    this.energy.reset();
    this.beatDetector.reset();
  }
}
