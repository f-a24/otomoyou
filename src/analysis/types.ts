export type TrackSection = {
  start: number; // 秒
  end: number; // 秒
  level: number; // 曲の中での盛り上がり 0..1
};

export type TrackAnalysis = {
  bpm: number | null; // 拍がはっきりしない曲ではnull
  beats: number[]; // 拍の時刻（秒）。昇順。拍がはっきりしない曲では空
  sections: TrackSection[];
};

/** JsAnalyzer / WasmAnalyzer を差し替えて比較する */
export interface OfflineAnalyzer {
  analyze(pcm: Float32Array, sampleRate: number): Promise<TrackAnalysis>;
}
