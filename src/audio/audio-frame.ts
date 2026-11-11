/** AnalyserNodeのFFTサイズ。spectrumの長さはこの半分になる */
export const FFT_SIZE = 2048;

/** 毎フレーム同じオブジェクトを書き換える。配列も使い回すので、テーマ側で保持しないこと */
export type AudioFrame = {
  bass: number; // 0..1
  mid: number; // 0..1
  treble: number; // 0..1
  energy: number; // 全体の音量（RMS）0..1
  beat: boolean; // このフレームで拍を検出したか
  spectrum: Float32Array<ArrayBuffer>; // 各ビンの音量 0..1
  waveform: Float32Array<ArrayBuffer>; // 波形 -1..1
  time: number; // 再生位置（秒）
  section: number; // 曲の中での盛り上がり 0..1。事前解析の前は 0.5
};

export function createAudioFrame(): AudioFrame {
  return {
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    beat: false,
    spectrum: new Float32Array(FFT_SIZE / 2),
    waveform: new Float32Array(FFT_SIZE),
    time: 0,
    section: 0.5,
  };
}
