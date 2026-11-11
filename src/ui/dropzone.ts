import { t } from "./messages";

type FileHandler = (file: File) => void;

export type Dropzone = {
  element: HTMLElement;
  showError(message: string | null): void;
};

/** ファイル選択ダイアログを開く関数を作る */
export function createFileOpener(onFile: FileHandler): () => void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "audio/*";
  input.addEventListener("change", () => {
    const file = input.files?.[0];
    input.value = ""; // 同じファイルを続けて選べるようにする
    if (file) onFile(file);
  });

  return () => input.click();
}

/** 初期状態の画面。ドロップの案内とファイル選択ボタンを表示する */
export function createDropzone(openFilePicker: () => void): Dropzone {
  const element = document.createElement("main");
  element.className = "dropzone";

  const title = document.createElement("h1");
  title.textContent = t.appTitle;

  const hint = document.createElement("p");
  hint.textContent = t.dropHint;

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = t.chooseFile;
  button.addEventListener("click", openFilePicker);

  const notice = document.createElement("p");
  notice.className = "dropzone-notice";
  notice.textContent = t.flashNotice;

  const error = document.createElement("p");
  error.className = "dropzone-error";
  error.setAttribute("role", "alert");
  error.hidden = true;

  element.append(title, hint, button, error, notice);

  return {
    element,
    showError(message) {
      error.textContent = message;
      error.hidden = message === null;
    },
  };
}

function setDragging(dragging: boolean): void {
  document.body.classList.toggle("dragging", dragging);
}

/** ウィンドウ全体でファイルのドロップを受け付ける */
export function listenFileDrop(onFile: FileHandler): void {
  window.addEventListener("dragover", (event) => {
    if (!event.dataTransfer?.types.includes("Files")) return;

    event.preventDefault(); // これがないとブラウザがファイルを開いてしまう
    event.dataTransfer.dropEffect = "copy";
    setDragging(true);
  });

  window.addEventListener("dragleave", (event) => {
    if (event.relatedTarget === null) setDragging(false);
  });

  window.addEventListener("drop", (event) => {
    event.preventDefault();
    setDragging(false);

    const file = event.dataTransfer?.files[0];
    if (file) onFile(file);
  });
}
