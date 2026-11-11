# 音模様（otomoyou）

好きな音楽ファイルを読み込むと、曲に合わせてグラフィカルな映像が動く、鑑賞用のオーディオビジュアライザーです。

音声の処理はすべてブラウザの中で行い、楽曲をサーバーへ送ることはありません。

## できること

- 音声ファイルの読み込み（ファイル選択、ドラッグ＆ドロップ）
- 再生、一時停止、シーク、音量の調整
- 3つのテーマの切り替え
  - **バー**: 周波数ごとの音量を棒グラフで表示（Canvas 2D）
  - **プラズマ**: 低音や拍に合わせてうねる模様（WebGPU / WebGL2）
  - **パーティクル**: 10万粒の粒子と、残像・ブルーム・色収差（WebGL2）
- 曲全体の事前解析（BPM、拍の位置、盛り上がり）による、拍に合った演出
- 全画面表示と、操作がないときのUIの自動非表示

## 動作環境

- Windows / macOS のデスクトップ版 Chrome または Edge
- 描画方式は、WebGPU → WebGL2 → Canvas 2D の順に、使えるものを自動で選びます

映像には点滅や明るさの変化が含まれます。気分が悪くなったら視聴を中止してください。

## 使い方

1. 画面に音声ファイルをドロップするか、「ファイルを選択」から選びます
2. 「再生」を押します（自動では再生しません）
3. 下部のボタンでテーマを切り替えます

### キーボード操作

| キー | 操作 |
|---|---|
| Space | 再生 / 一時停止 |
| ← / → | 5秒シーク（押しっぱなしで連続） |
| ↑ / ↓ | テーマの切り替え |
| 1〜9 | テーマを番号で選ぶ |
| F | 全画面 |
| H | UIの表示 / 非表示 |

## 開発

[Bun](https://bun.com/) を使います。

```bash
bun install
bun run dev
```

開発サーバーは `http://localhost:5173/otomoyou/` で開きます。開発時は、画面の左上に解析の数値が表示されます。

| コマンド | 内容 |
|---|---|
| `bun run dev` | 開発サーバーを起動 |
| `bun run build` | 型チェックとビルド（`dist/` に出力） |
| `bun run preview` | ビルド結果を確認 |
| `bun run test` | テストを実行 |
| `bun run typecheck` | 型チェック |
| `bun run lint` | oxlint で検査 |
| `bun fmt` | フォーマット |

## 技術構成

| 分類 | 採用 |
|---|---|
| ランタイム / パッケージ管理 | Bun |
| バンドラー / 開発サーバー | Vite |
| 言語 | TypeScript（UIはフレームワークなしのDOM） |
| 描画 | WebGPU（WGSL）、WebGL2（GLSL）、Canvas 2D |
| 音声 | Web Audio API（AnalyserNode、AudioWorklet）、Web Worker での事前解析 |
| Lint / Format | oxlint / `bun fmt` |
| デプロイ | GitHub Pages（GitHub Actions） |

## ディレクトリ構成

```text
src/
├─ analysis/   # 曲全体の事前解析（FFT、BPM、拍、セクション）
├─ audio/      # 再生とリアルタイムの解析
├─ engine/     # 描画方式の判定、描画ループ、テーマの管理
├─ themes/     # テーマ（バー、プラズマ、パーティクル）
└─ ui/         # 画面の部品とキー操作
```

## デプロイ

`main` ブランチへプッシュすると、GitHub Actions がフォーマット、lint、テスト、ビルドを行い、GitHub Pages へ公開します。

- リポジトリの Settings → Pages で、Source を「GitHub Actions」にしてください
- 公開先のパスは `vite.config.ts` の `base`（`/otomoyou/`）で決まります。リポジトリ名を変える場合は、あわせて変更してください
