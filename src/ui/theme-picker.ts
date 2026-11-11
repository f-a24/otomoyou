import type { Theme } from "../themes/types";
import { t } from "./messages";

export type ThemePicker = {
  element: HTMLElement;
  setActive(theme: Theme): void;
};

/** テーマの一覧を表示する */
export function createThemePicker(
  themes: Theme[],
  onSelect: (theme: Theme) => void,
): ThemePicker {
  const element = document.createElement("div");
  element.className = "theme-picker";
  element.setAttribute("role", "group");
  element.setAttribute("aria-label", t.themesLabel);

  const buttons = new Map<Theme, HTMLButtonElement>();
  for (const theme of themes) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = theme.name;
    button.addEventListener("click", () => onSelect(theme));
    buttons.set(theme, button);
    element.append(button);
  }

  return {
    element,
    setActive(active) {
      for (const [theme, button] of buttons) {
        button.setAttribute("aria-pressed", String(theme === active));
      }
    },
  };
}
