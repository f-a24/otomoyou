import { OnsetTracker } from "./onset-tracker";

// AudioWorkletの中だけにある定義。TypeScriptの標準の型には含まれていない
declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(
  name: string,
  processor: new () => AudioWorkletProcessor,
): void;

/** 音声スレッドで立ち上がりを検出し、メインスレッドへ知らせる */
class OnsetProcessor extends AudioWorkletProcessor {
  private readonly tracker = new OnsetTracker(sampleRate);

  process(inputs: Float32Array[][]): boolean {
    const samples = inputs[0]?.[0];
    if (samples && this.tracker.process(samples)) {
      // MessagePortのpostMessageに送信先の指定はない
      // oxlint-disable-next-line unicorn/require-post-message-target-origin
      this.port.postMessage("onset");
    }
    return true;
  }
}

registerProcessor("onset-processor", OnsetProcessor);
