import type { AudioFrame } from "../audio/audio-frame";
import type { RendererKind } from "../engine/renderers";

export type ThemeContext = {
  canvas: HTMLCanvasElement;
  audio: AudioFrame;
  /** 毎フレーム呼ばれる。dtは前のフレームからの経過秒 */
  onFrame(callback: (dt: number) => void): void;
  /** 登録時と、canvasの大きさが変わったときに呼ばれる。単位は実ピクセル */
  onResize(callback: (width: number, height: number) => void): void;
};

export type ThemeCleanup = () => void;

export type ThemeRender = (
  context: ThemeContext,
) => void | ThemeCleanup | Promise<void | ThemeCleanup>;

export type Theme = {
  name: string;
  /** 描画方式ごとの実装。1つ以上持つ */
  renderers: Partial<Record<RendererKind, ThemeRender>>;
};
