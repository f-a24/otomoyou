export type FrequencyRange = readonly [lowHz: number, highHz: number];

export const BASS_RANGE: FrequencyRange = [20, 250];
export const MID_RANGE: FrequencyRange = [250, 4000];
export const TREBLE_RANGE: FrequencyRange = [4000, 20000];

const MIN_DB = -90;
const MAX_DB = -20;

/** デシベル値を表示用の 0..1 に変換する */
export function dbToLevel(db: number): number {
  const level = (db - MIN_DB) / (MAX_DB - MIN_DB);
  return Math.min(Math.max(level, 0), 1);
}

/** デシベル値を振幅に変換する。無音の -Infinity は 0 になる */
export function dbToMagnitude(db: number): number {
  return 10 ** (db / 20);
}

/** 指定した周波数帯の平均振幅を求める。振幅で扱うほうが、dBより音量の変化が大きく出る */
export function bandMagnitude(
  spectrumDb: Float32Array,
  [lowHz, highHz]: FrequencyRange,
  sampleRate: number,
): number {
  const binHz = sampleRate / 2 / spectrumDb.length;
  const start = Math.max(Math.ceil(lowHz / binHz), 1);
  const end = Math.min(Math.floor(highHz / binHz), spectrumDb.length - 1);
  if (end < start) return 0;

  let sum = 0;
  for (let i = start; i <= end; i++) {
    sum += dbToMagnitude(spectrumDb[i] ?? -Infinity);
  }
  return sum / (end - start + 1);
}

/** 波形の二乗平均平方根（RMS）を求める */
export function rms(waveform: Float32Array): number {
  if (waveform.length === 0) return 0;

  let sum = 0;
  for (const sample of waveform) sum += sample * sample;
  return Math.sqrt(sum / waveform.length);
}
