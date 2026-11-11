import type { Theme, ThemeContext } from "../types";
import { createLogBinEdges, peakInRange } from "./log-bins";

const BAR_COUNT = 64;
/** 16kHzより上はほとんど音がないので、バーの範囲から外す */
const SPECTRUM_RATIO = 0.75;
const BAR_FALL_TIME = 0.12;
const GLOW_FALL_TIME = 0.15;
const MAX_BAR_HEIGHT = 0.85;

function render({ canvas, audio, onFrame, onResize }: ThemeContext): void {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2Dのコンテキストを取得できません");

  const lastBin = Math.floor(audio.spectrum.length * SPECTRUM_RATIO);
  const edges = createLogBinEdges(1, lastBin, BAR_COUNT);
  const levels = new Float32Array(BAR_COUNT);
  let width = canvas.width;
  let height = canvas.height;
  let glow = 0;

  onResize((w, h) => {
    width = w;
    height = h;
  });

  onFrame((dt) => {
    // 画面全体を光らせず、バーの明るさだけを減衰付きで変える
    glow = audio.beat ? 1 : glow * Math.exp(-dt / GLOW_FALL_TIME);
    const fall = Math.exp(-dt / BAR_FALL_TIME);
    const barWidth = width / BAR_COUNT;
    const gap = Math.max(barWidth * 0.15, 1);

    context.fillStyle = "#08080d";
    context.fillRect(0, 0, width, height);

    for (let i = 0; i < BAR_COUNT; i++) {
      const target = peakInRange(
        audio.spectrum,
        edges[i] ?? 0,
        edges[i + 1] ?? 0,
      );
      const level = Math.max(target, (levels[i] ?? 0) * fall);
      levels[i] = level;

      const barHeight = level * level * height * MAX_BAR_HEIGHT;
      const hue = 260 - (200 * i) / BAR_COUNT;
      const lightness = 45 + audio.energy * 15 + glow * 10;

      context.fillStyle = `hsl(${hue} 80% ${lightness}%)`;
      context.fillRect(
        i * barWidth + gap / 2,
        height - barHeight,
        barWidth - gap,
        barHeight,
      );
    }
  });
}

export const bars: Theme = {
  name: "バー",
  renderers: { canvas2d: render },
};
