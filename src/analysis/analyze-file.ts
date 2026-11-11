import type { AnalysisRequest } from "./analysis.worker";
import type { TrackAnalysis } from "./types";

/** 拍の検出には高音域が要らないので、半分のサンプルレートで処理して軽くする */
const ANALYSIS_SAMPLE_RATE = 22050;

type AnalysisResponse = { analysis: TrackAnalysis } | { error: string };

/**
 * ファイルをモノラルのPCMに変換する。デコードの機能はWorkerで使えないので、
 * メインスレッドで行う。OfflineAudioContextはユーザー操作なしで使え、
 * 指定したサンプルレートへの変換も同時に行える
 */
async function decodeToMono(file: File): Promise<Float32Array<ArrayBuffer>> {
  const context = new OfflineAudioContext(1, 1, ANALYSIS_SAMPLE_RATE);
  const decoded = await context.decodeAudioData(await file.arrayBuffer());

  const mono = new Float32Array(decoded.length);
  for (let channel = 0; channel < decoded.numberOfChannels; channel++) {
    const samples = decoded.getChannelData(channel);
    for (let i = 0; i < mono.length; i++) {
      mono[i] = (mono[i] ?? 0) + (samples[i] ?? 0) / decoded.numberOfChannels;
    }
  }
  return mono;
}

/** Workerの中で解析する。中止するとWorkerごと止める */
function analyzeInWorker(
  pcm: Float32Array<ArrayBuffer>,
  signal: AbortSignal,
): Promise<TrackAnalysis> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./analysis.worker", import.meta.url), {
      type: "module",
    });
    const onAbort = () => {
      worker.terminate();
      reject(new DOMException("解析を中止しました", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    worker.addEventListener(
      "message",
      ({ data }: MessageEvent<AnalysisResponse>) => {
        signal.removeEventListener("abort", onAbort);
        worker.terminate();
        if ("error" in data) reject(new Error(data.error));
        else resolve(data.analysis);
      },
    );
    worker.addEventListener("error", (event) => {
      signal.removeEventListener("abort", onAbort);
      worker.terminate();
      reject(new Error(event.message));
    });

    const request: AnalysisRequest = {
      pcm,
      sampleRate: ANALYSIS_SAMPLE_RATE,
    };
    // PCMはコピーせず、所有権ごとWorkerへ渡す
    worker.postMessage(request, [pcm.buffer]);
  });
}

/** 曲全体を解析する。楽曲はブラウザの外へ送らない */
export async function analyzeFile(
  file: File,
  signal: AbortSignal,
): Promise<TrackAnalysis> {
  const pcm = await decodeToMono(file);
  signal.throwIfAborted();
  return analyzeInWorker(pcm, signal);
}
