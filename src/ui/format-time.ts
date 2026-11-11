/** 秒を m:ss 形式にする。1時間以上は h:mm:ss 形式にする */
export function formatTime(seconds: number): string {
  const total = Number.isFinite(seconds) ? Math.max(Math.floor(seconds), 0) : 0;
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");

  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
