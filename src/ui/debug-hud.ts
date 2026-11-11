import type { AudioFrame } from "../audio/audio-frame";

/** BPMの概算に使う拍の数 */
const BEAT_HISTORY = 9;

export type DebugHud = {
  element: HTMLElement;
  update(frame: AudioFrame): void;
};

/** 開発時に解析結果の数値を表示する */
export function createDebugHud(): DebugHud {
  const element = document.createElement("pre");
  element.className = "debug-hud";

  const beatTimes: number[] = [];
  let beatCount = 0;

  return {
    element,
    update(frame) {
      if (frame.beat) {
        beatCount++;
        // マイク入力では再生位置が進まないので、実時間で測る
        beatTimes.push(performance.now() / 1000);
        if (beatTimes.length > BEAT_HISTORY) beatTimes.shift();
      }

      const first = beatTimes[0] ?? 0;
      const last = beatTimes.at(-1) ?? 0;
      const bpm =
        last > first ? (60 * (beatTimes.length - 1)) / (last - first) : 0;

      element.classList.toggle("debug-hud-beat", frame.beat);
      element.textContent = [
        `bass   ${frame.bass.toFixed(3)}`,
        `mid    ${frame.mid.toFixed(3)}`,
        `treble ${frame.treble.toFixed(3)}`,
        `energy ${frame.energy.toFixed(3)}`,
        `beats  ${beatCount}`,
        `bpm    ${bpm.toFixed(1)}`,
      ].join("\n");
    },
  };
}
