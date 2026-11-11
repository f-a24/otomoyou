import { Fft } from "./fft";

const FRAME_SIZE = 1024;
const HOP_SIZE = 256;
/** これより上の周波数は拍の判定に使わない */
const MAX_FREQUENCY = 8000;
/** キックの帯域の上限。ビンの数が少ないので、帯域ごとに平均してハイハットに負けないようにする */
const LOW_BAND_LIMIT = 200;
const LOW_BAND_WEIGHT = 2;
/** 音の立ち上がり以外の変化を取り除くときの、平均を取る幅（秒） */
const LOCAL_MEAN_TIME = 0.4;
/**
 * フレーム内の最大値に対する下限（約-50dB）。一定の音でも、ごく小さいビンは窓と波の位相の関係で
 * 規則的に揺れるため、それを拍と取り違えないように下限で切りそろえる
 */
const MAGNITUDE_FLOOR = 0.003;

export type AudioFeatures = {
  /** 音の立ち上がりの強さ。平均を引いて標準偏差で割っている */
  onset: Float32Array;
  /**
   * 正規化する前の立ち上がりの平均。対数の差なので音量によらない。
   * 正規化するとわずかな揺れも拡大されるので、拍があるかの判定にはこちらを使う
   */
  onsetStrength: number;
  /** 音量（RMS） */
  rms: Float32Array;
  /** 1秒あたりのフレーム数 */
  frameRate: number;
  /** フレーム番号を時刻へ変換するときに足す秒数。窓の中心に合わせる */
  timeOffset: number;
};

function createHannWindow(size: number): Float64Array {
  return Float64Array.from(
    { length: size },
    (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / size),
  );
}

/** 周囲の平均を引いて0未満を切り捨て、標準偏差で正規化する */
function normalizeOnset(flux: Float32Array, frameRate: number): Float32Array {
  const radius = Math.max(Math.round((LOCAL_MEAN_TIME * frameRate) / 2), 1);
  const prefix = new Float64Array(flux.length + 1);
  for (let i = 0; i < flux.length; i++) {
    prefix[i + 1] = (prefix[i] ?? 0) + (flux[i] ?? 0);
  }

  const result = new Float32Array(flux.length);
  let sumOfSquares = 0;
  for (let i = 0; i < flux.length; i++) {
    const start = Math.max(i - radius, 0);
    const end = Math.min(i + radius + 1, flux.length);
    const mean = ((prefix[end] ?? 0) - (prefix[start] ?? 0)) / (end - start);
    const value = Math.max((flux[i] ?? 0) - mean, 0);
    result[i] = value;
    sumOfSquares += value * value;
  }

  const deviation = Math.sqrt(sumOfSquares / Math.max(flux.length, 1));
  if (deviation > 0) {
    for (let i = 0; i < result.length; i++) {
      result[i] = (result[i] ?? 0) / deviation;
    }
  }
  return result;
}

/** 短い区間ごとにFFTをかけ、スペクトルが増えた量（スペクトラルフラックス）を求める */
export function computeFeatures(
  pcm: Float32Array,
  sampleRate: number,
): AudioFeatures {
  const frameCount = Math.max(
    Math.floor((pcm.length - FRAME_SIZE) / HOP_SIZE) + 1,
    0,
  );
  const binCount = Math.min(
    FRAME_SIZE / 2,
    Math.floor((MAX_FREQUENCY * FRAME_SIZE) / sampleRate),
  );
  const lowBinCount = Math.max(
    Math.floor((LOW_BAND_LIMIT * FRAME_SIZE) / sampleRate),
    2,
  );
  const frameRate = sampleRate / HOP_SIZE;

  const fft = new Fft(FRAME_SIZE);
  const hann = createHannWindow(FRAME_SIZE);
  const real = new Float64Array(FRAME_SIZE);
  const imag = new Float64Array(FRAME_SIZE);
  const previous = new Float64Array(binCount);
  const magnitudes = new Float64Array(binCount);
  const flux = new Float32Array(frameCount);
  const rms = new Float32Array(frameCount);

  for (let frame = 0; frame < frameCount; frame++) {
    const offset = frame * HOP_SIZE;
    let energy = 0;

    for (let i = 0; i < FRAME_SIZE; i++) {
      const sample = pcm[offset + i] ?? 0;
      energy += sample * sample;
      real[i] = sample * (hann[i] ?? 0);
      imag[i] = 0;
    }
    rms[frame] = Math.sqrt(energy / FRAME_SIZE);

    fft.transform(real, imag);

    let peak = 0;
    for (let bin = 1; bin < binCount; bin++) {
      const magnitude = Math.hypot(real[bin] ?? 0, imag[bin] ?? 0);
      magnitudes[bin] = magnitude;
      peak = Math.max(peak, magnitude);
    }
    const floor = peak * MAGNITUDE_FLOOR;

    let lowIncrease = 0;
    let highIncrease = 0;
    for (let bin = 1; bin < binCount; bin++) {
      // 対数で圧縮して、小さい音の立ち上がりも拾えるようにする
      const level = Math.log1p(100 * Math.max(magnitudes[bin] ?? 0, floor));
      const increase = Math.max(level - (previous[bin] ?? 0), 0);
      if (bin < lowBinCount) lowIncrease += increase;
      else highIncrease += increase;
      previous[bin] = level;
    }
    const low = lowIncrease / (lowBinCount - 1);
    const high = highIncrease / Math.max(binCount - lowBinCount, 1);
    flux[frame] = frame === 0 ? 0 : low * LOW_BAND_WEIGHT + high;
  }

  return {
    onset: normalizeOnset(flux, frameRate),
    onsetStrength:
      flux.reduce((sum, value) => sum + value, 0) / Math.max(frameCount, 1),
    rms,
    frameRate,
    timeOffset: FRAME_SIZE / 2 / sampleRate,
  };
}
