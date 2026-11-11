import { analyzeTrack } from "./js-analyzer";

export type AnalysisRequest = {
  pcm: Float32Array<ArrayBuffer>;
  sampleRate: number;
};

function respond(message: unknown): void {
  // Workerのpostmessageに送信先の指定はない
  // oxlint-disable-next-line unicorn/require-post-message-target-origin
  self.postMessage(message);
}

self.addEventListener("message", (event: MessageEvent<AnalysisRequest>) => {
  try {
    const { pcm, sampleRate } = event.data;
    respond({ analysis: analyzeTrack(pcm, sampleRate) });
  } catch (error) {
    respond({ error: String(error) });
  }
});
