/** 画面に表示する文言 */
export const t = {
  appTitle: "音模様",
  dropHint: "音声ファイルをドロップしてください",
  chooseFile: "ファイルを選択",
  flashNotice:
    "映像には点滅や明るさの変化が含まれます。気分が悪くなったら視聴を中止してください。",
  unplayable: (name: string) =>
    `「${name}」は再生できません。別のファイルを選んでください。`,
  controlsLabel: "再生コントロール",
  themesLabel: "テーマ",
  seekLabel: "再生位置",
  volumeLabel: "音量",
  play: "再生",
  pause: "一時停止",
  fullscreen: "全画面",
  exitFullscreen: "全画面を解除",
  replaceFile: "ファイルを差し替え",
  analyzing: "解析中…",
  renderer: (name: string) => `描画方式: ${name}`,
};
