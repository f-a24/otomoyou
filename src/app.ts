import { analyzeFile } from "./analysis/analyze-file";
import { Player } from "./audio/player";
import { RealtimeAnalyzer } from "./audio/realtime-analyzer";
import { syncedTime } from "./audio/sync";
import { startLoop } from "./engine/loop";
import { RENDERER_LABELS, type RendererKind } from "./engine/renderers";
import { ThemeHost } from "./engine/theme-host";
import { themes } from "./themes";
import type { Theme } from "./themes/types";
import { AutoHide } from "./ui/auto-hide";
import { createControls } from "./ui/controls";
import { createDebugHud } from "./ui/debug-hud";
import {
  createDropzone,
  createFileOpener,
  listenFileDrop,
} from "./ui/dropzone";
import { toggleFullscreen } from "./ui/fullscreen";
import { handleKey } from "./ui/keyboard";
import { t } from "./ui/messages";
import { createThemePicker } from "./ui/theme-picker";

/** 各モジュールを接続して、アプリを起動する */
export function startApp(root: HTMLElement, renderers: RendererKind[]): void {
  const player = new Player();
  const analyzer = new RealtimeAnalyzer();
  const autoHide = new AutoHide();
  const hud = import.meta.env.DEV ? createDebugHud() : null;
  const openFilePicker = createFileOpener(openFile);
  const dropzone = createDropzone(openFilePicker);
  const controls = createControls(player, openFilePicker);
  let fileLoaded = false;
  let trackAnalysis: AbortController | null = null;

  const stage = document.createElement("div");
  stage.className = "stage";
  const themeHost = new ThemeHost(stage, analyzer.frame, renderers);

  // 使える描画方式の実装がないテーマは一覧に出さない
  const availableThemes = themes.filter((theme) =>
    renderers.some((kind) => theme.renderers[kind]),
  );
  let themeIndex = 0;
  const themePicker = createThemePicker(
    availableThemes,
    (theme) => void selectTheme(theme),
  );
  controls.element.prepend(themePicker.element);

  /** 再生と並行して曲全体を解析する。終わるまではリアルタイムの拍検出で動かす */
  async function analyzeInBackground(file: File): Promise<void> {
    const controller = new AbortController();
    trackAnalysis = controller;
    controls.setAnalysis(t.analyzing);

    try {
      const result = await analyzeFile(file, controller.signal);
      if (controller.signal.aborted) return;

      analyzer.setTrack(result);
      controls.setAnalysis(
        result.bpm === null ? "" : `${Math.round(result.bpm)} BPM`,
      );
    } catch (error) {
      if (controller.signal.aborted) return;

      // 解析できなくても再生は続けられるので、リアルタイムの拍検出のまま動かす
      console.warn("事前解析に失敗しました", error);
      controls.setAnalysis("");
    }
  }

  async function openFile(file: File): Promise<void> {
    trackAnalysis?.abort();
    analyzer.setTrack(null);

    const result = await player.load(file);
    if (result === "cancelled") return;

    fileLoaded = result === "loaded";
    dropzone.element.hidden = fileLoaded;
    controls.element.hidden = !fileLoaded;

    if (fileLoaded) {
      analyzer.reset();
      dropzone.showError(null);
      controls.setFileName(file.name);
      void analyzeInBackground(file);
    } else {
      dropzone.showError(t.unplayable(file.name));
    }
  }

  async function selectTheme(theme: Theme): Promise<void> {
    themeIndex = availableThemes.indexOf(theme);
    themePicker.setActive(theme);
    const kind = await themeHost.activate(theme);
    if (kind) controls.setRenderer(RENDERER_LABELS[kind]);
  }

  function selectThemeAt(index: number): void {
    const theme = availableThemes[index];
    if (theme) void selectTheme(theme);
  }

  function onActivity(): void {
    autoHide.activity(performance.now());
  }

  function listenUserActivity(): void {
    window.addEventListener("pointermove", onActivity);
    window.addEventListener("pointerdown", onActivity);

    window.addEventListener("keydown", (event) => {
      onActivity();
      const handled = handleKey(event, {
        togglePlay() {
          if (fileLoaded) void player.togglePlay();
        },
        seekBy(seconds) {
          if (fileLoaded) player.seek(player.currentTime + seconds);
        },
        moveTheme(offset) {
          const count = availableThemes.length;
          selectThemeAt((themeIndex + offset + count) % count);
        },
        selectTheme: selectThemeAt,
        toggleFullscreen,
        toggleUi: () => autoHide.toggle(performance.now()),
      });
      // フォーカス中のボタンやスライダーの標準動作と二重に動かないようにする
      if (handled) event.preventDefault();
    });
  }

  player.onOnset = () => analyzer.pushOnset();

  controls.element.hidden = true;
  root.replaceChildren(stage, dropzone.element, controls.element);
  if (hud) root.append(hud.element);
  listenFileDrop(openFile);
  listenUserActivity();
  selectThemeAt(0);

  startLoop((dt) => {
    const time = syncedTime(player.currentTime, player.outputLatency);
    analyzer.update(player.analyser, dt, time);
    themeHost.frame(dt);
    hud?.update(analyzer.frame);

    const playing = fileLoaded && !player.paused;
    const hidden = autoHide.update(performance.now(), playing);
    document.body.classList.toggle("ui-hidden", hidden);
  });
}
