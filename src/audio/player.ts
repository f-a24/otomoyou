import { FFT_SIZE } from "./audio-frame";
import onsetProcessorUrl from "./onset-processor?worker&url";

export type LoadResult = "loaded" | "failed" | "cancelled";

type Listener = () => void;

const NOTIFY_EVENTS = [
  "play",
  "pause",
  "timeupdate",
  "durationchange",
  "seeked",
  "ended",
  "emptied",
];

/** 音声ファイルの再生を担当する。再生そのものは `<audio>` に任せ、音量だけWeb Audio側で変える */
export class Player {
  /** 音声スレッドで立ち上がりを検出したときに呼ばれる */
  onOnset: (() => void) | null = null;
  private readonly audio = new Audio();
  private readonly listeners = new Set<Listener>();
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private objectUrl: string | null = null;
  private loading: AbortController | null = null;
  private currentVolume = 0.8;

  constructor() {
    for (const type of NOTIFY_EVENTS) {
      this.audio.addEventListener(type, () => this.notify());
    }
  }

  /** 最初の再生までnullを返す */
  get analyser(): AnalyserNode | null {
    return this.analyserNode;
  }

  get paused(): boolean {
    return this.audio.paused;
  }

  get currentTime(): number {
    return this.audio.currentTime;
  }

  /** 音がスピーカーから出るまでの遅延（秒）。ブラウザが値を返さなければ処理側の遅延だけになる */
  get outputLatency(): number {
    const context = this.context;
    if (!context) return 0;
    return context.baseLatency + (context.outputLatency || 0);
  }

  get duration(): number {
    return Number.isFinite(this.audio.duration) ? this.audio.duration : 0;
  }

  get volume(): number {
    return this.currentVolume;
  }

  set volume(value: number) {
    this.currentVolume = value;
    if (this.gain) this.gain.gain.value = value;
    this.notify();
  }

  /** 状態が変わるたびに呼ばれる関数を登録する */
  subscribe(listener: Listener): void {
    this.listeners.add(listener);
  }

  /** ファイルを読み込む。読み込み中に次のファイルが来たら、前の結果は "cancelled" になる */
  load(file: File): Promise<LoadResult> {
    this.loading?.abort();
    const loading = new AbortController();
    this.loading = loading;

    this.audio.pause();
    const previousUrl = this.objectUrl;
    this.objectUrl = URL.createObjectURL(file);
    this.audio.src = this.objectUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);

    return new Promise((resolve) => {
      const finish = (result: LoadResult) => {
        resolve(result);
        loading.abort(); // 残ったイベントリスナーを外す
      };
      const options = { once: true, signal: loading.signal };

      this.audio.addEventListener(
        "loadedmetadata",
        () => finish("loaded"),
        options,
      );
      this.audio.addEventListener("error", () => finish("failed"), options);
      loading.signal.addEventListener("abort", () => resolve("cancelled"), {
        once: true,
      });
    });
  }

  async play(): Promise<void> {
    await this.ensureContext().resume();

    try {
      await this.audio.play();
    } catch (error) {
      // 再生開始の直後に一時停止やファイル差し替えが起きた場合は問題ない
      if (error instanceof DOMException && error.name === "AbortError") return;
      throw error;
    }
  }

  pause(): void {
    this.audio.pause();
  }

  togglePlay(): Promise<void> {
    if (this.paused) return this.play();

    this.pause();
    return Promise.resolve();
  }

  seek(time: number): void {
    this.audio.currentTime = Math.min(Math.max(time, 0), this.duration);
  }

  /** AudioContextはユーザー操作の中で作る必要があるため、最初の再生時に作る */
  private ensureContext(): AudioContext {
    if (this.context) return this.context;

    const context = new AudioContext();
    const source = context.createMediaElementSource(this.audio);
    const analysisInput = context.createGain();
    const analyser = context.createAnalyser();
    analyser.fftSize = FFT_SIZE;
    analyser.smoothingTimeConstant = 0; // 平滑化はEnvelopeで行う
    const gain = context.createGain();
    gain.gain.value = this.currentVolume;

    // 解析と音量を別の経路にして、音量を下げても映像が弱まらないようにする
    source.connect(gain).connect(context.destination);
    source.connect(analysisInput).connect(analyser);

    this.context = context;
    this.analyserNode = analyser;
    this.gain = gain;
    void this.startOnsetWorklet(context, analysisInput);
    return context;
  }

  /** 読み込めなくても、メインスレッドの拍検出で動き続ける */
  private async startOnsetWorklet(
    context: AudioContext,
    input: AudioNode,
  ): Promise<void> {
    try {
      await context.audioWorklet.addModule(onsetProcessorUrl);

      const node = new AudioWorkletNode(context, "onset-processor");
      node.port.addEventListener("message", () => this.onOnset?.());
      node.port.start();

      // 出力は無音だが、destinationへつながないと処理されないことがある
      input.connect(node).connect(context.destination);
    } catch (error) {
      console.warn("AudioWorkletを開始できませんでした", error);
    }
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }
}
