import type { AudioFrame } from "../audio/audio-frame";
import type { Theme, ThemeCleanup, ThemeContext } from "../themes/types";
import type { RendererKind } from "./renderers";

/** 高解像度ディスプレイで描画が重くなりすぎないようにする上限 */
const MAX_PIXEL_RATIO = 2;

type FrameCallback = (dt: number) => void;
type ResizeCallback = (width: number, height: number) => void;

type Instance = {
  canvas: HTMLCanvasElement;
  frameCallbacks: FrameCallback[];
  resizeCallbacks: ResizeCallback[];
  cleanup: ThemeCleanup | null;
};

function destroy(instance: Instance): void {
  instance.cleanup?.();
  instance.canvas.remove();
  instance.frameCallbacks.length = 0;
  instance.resizeCallbacks.length = 0;
}

/** テーマごとのcanvasを作り、描画方式の選択と切り替えを管理する */
export class ThemeHost {
  private current: Instance | null = null;
  private generation = 0;

  constructor(
    private readonly container: HTMLElement,
    private readonly audio: AudioFrame,
    private readonly available: RendererKind[],
  ) {
    new ResizeObserver(() => this.resize()).observe(container);
  }

  /**
   * テーマを起動し、実際に使った描画方式を返す。使える中で上位の方式から試し、
   * 初期化に失敗したら次の方式を試す。途中で別のテーマに切り替わったらnullを返す
   */
  async activate(theme: Theme): Promise<RendererKind | null> {
    const generation = ++this.generation;
    this.clear();

    for (const kind of this.available) {
      const render = theme.renderers[kind];
      if (!render) continue;

      const instance = this.createInstance();
      this.current = instance;

      try {
        const cleanup = await render(this.createContext(instance));

        // 初期化の間に切り替わっていたら、古いテーマをすぐに片付ける
        if (generation !== this.generation) {
          cleanup?.();
          return null;
        }
        instance.cleanup = cleanup ?? null;
        return kind;
      } catch (error) {
        if (generation !== this.generation) return null;

        console.warn(`${theme.name}（${kind}）の初期化に失敗しました`, error);
        this.clear();
      }
    }
    return null;
  }

  /** 毎フレーム呼ぶ */
  frame(dt: number): void {
    if (!this.current) return;

    for (const callback of this.current.frameCallbacks) callback(dt);
  }

  private clear(): void {
    if (this.current) destroy(this.current);
    this.current = null;
  }

  private createInstance(): Instance {
    const canvas = document.createElement("canvas");
    const instance: Instance = {
      canvas,
      frameCallbacks: [],
      resizeCallbacks: [],
      cleanup: null,
    };

    this.applySize(canvas);
    this.container.append(canvas);
    return instance;
  }

  private createContext(instance: Instance): ThemeContext {
    return {
      canvas: instance.canvas,
      audio: this.audio,
      onFrame(callback) {
        instance.frameCallbacks.push(callback);
      },
      onResize(callback) {
        instance.resizeCallbacks.push(callback);
        callback(instance.canvas.width, instance.canvas.height);
      },
    };
  }

  private resize(): void {
    const instance = this.current;
    if (!instance || !this.applySize(instance.canvas)) return;

    const { width, height } = instance.canvas;
    for (const callback of instance.resizeCallbacks) callback(width, height);
  }

  /** canvasの大きさを表示サイズに合わせる。変わったらtrueを返す */
  private applySize(canvas: HTMLCanvasElement): boolean {
    const ratio = Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO);
    const width = Math.max(Math.round(this.container.clientWidth * ratio), 1);
    const height = Math.max(Math.round(this.container.clientHeight * ratio), 1);
    if (canvas.width === width && canvas.height === height) return false;

    // 代入するとcanvasの内容が消えるので、変わったときだけ代入する
    canvas.width = width;
    canvas.height = height;
    return true;
  }
}
