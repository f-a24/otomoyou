import type { Player } from "../audio/player";
import { formatTime } from "./format-time";
import { toggleFullscreen } from "./fullscreen";
import { t } from "./messages";

export type Controls = {
  element: HTMLElement;
  setFileName(name: string): void;
  setRenderer(label: string): void;
  setAnalysis(text: string): void;
};

function createRange(label: string, max: number, step: number) {
  const input = document.createElement("input");
  input.type = "range";
  input.min = "0";
  input.max = String(max);
  input.step = String(step);
  input.setAttribute("aria-label", label);
  return input;
}

function createButton(
  className: string,
  label: string,
  onClick: () => void,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

/** 画面下部の再生コントロール */
export function createControls(
  player: Player,
  openFilePicker: () => void,
): Controls {
  const element = document.createElement("section");
  element.className = "controls";
  element.setAttribute("aria-label", t.controlsLabel);

  const info = document.createElement("div");
  info.className = "controls-info";
  const fileName = document.createElement("span");
  fileName.className = "controls-file";
  const replaceButton = createButton(
    "controls-replace",
    t.replaceFile,
    openFilePicker,
  );
  const analysis = document.createElement("span");
  analysis.className = "controls-analysis";
  const renderer = document.createElement("span");
  renderer.className = "controls-renderer";
  info.append(fileName, replaceButton, analysis, renderer);

  const playButton = createButton(
    "controls-play",
    "",
    () => void player.togglePlay(),
  );

  const seekBar = createRange(t.seekLabel, 0, 0.01);
  seekBar.className = "controls-seek";

  const time = document.createElement("span");
  time.className = "controls-time";

  const volume = createRange(t.volumeLabel, 1, 0.01);
  volume.className = "controls-volume";
  volume.value = String(player.volume);
  volume.addEventListener("input", () => {
    player.volume = volume.valueAsNumber;
  });

  const fullscreenButton = createButton(
    "controls-fullscreen",
    "",
    toggleFullscreen,
  );
  const renderFullscreen = () => {
    fullscreenButton.textContent = document.fullscreenElement
      ? t.exitFullscreen
      : t.fullscreen;
  };
  document.addEventListener("fullscreenchange", renderFullscreen);
  renderFullscreen();

  const row = document.createElement("div");
  row.className = "controls-row";
  row.append(playButton, seekBar, time, volume, fullscreenButton);
  element.append(info, row);

  const renderTime = (current: number) => {
    time.textContent = `${formatTime(current)} / ${formatTime(player.duration)}`;
  };

  // ドラッグ中は再生位置で上書きせず、手を離したときにシークする
  let seeking = false;
  seekBar.addEventListener("input", () => {
    seeking = true;
    renderTime(seekBar.valueAsNumber);
  });
  seekBar.addEventListener("change", () => {
    seeking = false;
    player.seek(seekBar.valueAsNumber);
  });

  const render = () => {
    playButton.textContent = player.paused ? t.play : t.pause;
    seekBar.max = String(player.duration);
    if (seeking) return;

    seekBar.value = String(player.currentTime);
    renderTime(player.currentTime);
  };
  player.subscribe(render);
  render();

  return {
    element,
    setFileName(name) {
      fileName.textContent = name;
    },
    setRenderer(label) {
      renderer.textContent = t.renderer(label);
    },
    setAnalysis(text) {
      analysis.textContent = text;
    },
  };
}
