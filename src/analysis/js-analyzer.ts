import { trackBeats } from "./beats";
import { computeFeatures } from "./features";
import { detectSections } from "./sections";
import { estimateTempo } from "./tempo";
import type { OfflineAnalyzer, TrackAnalysis } from "./types";

/** 立ち上がりがこれより弱い曲は、拍がないものとして扱う */
const MIN_ONSET_STRENGTH = 0.01;
/**
 * 周期性がこれより弱い曲は、テンポを決めない。合成した音で測ると、
 * 拍のある曲は0.5以上、ノイズやパッドは0.07以下だった
 */
const MIN_CONFIDENCE = 0.3;

/** 曲全体からBPM、拍、セクションを求める同期処理。Workerの中で呼ぶ */
export function analyzeTrack(
  pcm: Float32Array,
  sampleRate: number,
): TrackAnalysis {
  const { onset, onsetStrength, rms, frameRate, timeOffset } = computeFeatures(
    pcm,
    sampleRate,
  );
  const duration = pcm.length / sampleRate;

  const tempo =
    onsetStrength >= MIN_ONSET_STRENGTH
      ? estimateTempo(onset, frameRate)
      : null;
  if (!tempo || tempo.confidence < MIN_CONFIDENCE) {
    return {
      bpm: null,
      beats: [],
      sections: detectSections(rms, frameRate, [], duration),
    };
  }

  const beats = trackBeats(onset, tempo.period).map(
    (frame) => frame / frameRate + timeOffset,
  );
  return {
    bpm: (60 * frameRate) / tempo.period,
    beats,
    sections: detectSections(rms, frameRate, beats, duration),
  };
}

export class JsAnalyzer implements OfflineAnalyzer {
  analyze(pcm: Float32Array, sampleRate: number): Promise<TrackAnalysis> {
    return Promise.resolve(analyzeTrack(pcm, sampleRate));
  }
}
