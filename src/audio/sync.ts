/**
 * 映像の拍を合わせる再生位置を求める。`<audio>` の再生位置は、スピーカーから実際に聞こえる位置より
 * 出力遅延の分だけ先に進んでいるので、それを引く
 */
export function syncedTime(currentTime: number, outputLatency: number): number {
  return Math.max(currentTime - outputLatency, 0);
}
