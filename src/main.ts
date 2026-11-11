import "./styles.css";
import { startApp } from "./app";
import { detectRenderers } from "./engine/renderers";

const root = document.querySelector<HTMLElement>("#app");
if (!root) throw new Error("#app要素が見つかりません");

startApp(root, await detectRenderers());
