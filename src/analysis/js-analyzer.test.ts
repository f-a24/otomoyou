import { expect, test } from "bun:test";
import { analyzeTrack } from "./js-analyzer";

const SAMPLE_RATE = 22050;

/** 再現性のある疑似乱数 */
function createRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 2 ** 32;
    return state / 2 ** 32;
  };
}

/** キック、鳴り続けるベース、ハイハットを重ねた曲を作る。`gain` で時刻ごとの音量を変えられる */
function createTrack(
  bpm: number,
  seconds: number,
  gain: (time: number) => number = () => 1,
): Float32Array {
  const random = createRandom(1);
  const interval = 60 / bpm;
  const pcm = new Float32Array(Math.floor(seconds * SAMPLE_RATE));

  for (let i = 0; i < pcm.length; i++) {
    const time = i / SAMPLE_RATE;
    const beatTime = time % interval;
    const pitch = 50 + 90 * Math.exp(-beatTime / 0.03);
    const kick =
      0.6 *
      Math.sin(2 * Math.PI * pitch * beatTime) *
      Math.exp(-beatTime / 0.09);
    const bass = 0.2 * Math.sin(2 * Math.PI * 55 * time);
    const hatTime = (time + interval / 2) % interval;
    const hat = 0.08 * (random() * 2 - 1) * Math.exp(-hatTime / 0.02);
    pcm[i] = (kick + bass + hat) * gain(time);
  }
  return pcm;
}

for (const bpm of [90, 128, 174]) {
  test(`${bpm}BPMの曲のテンポと拍を求める`, () => {
    const interval = 60 / bpm;
    const { bpm: detected, beats } = analyzeTrack(
      createTrack(bpm, 30),
      SAMPLE_RATE,
    );

    expect(detected).not.toBeNull();
    expect(Math.abs((detected ?? 0) - bpm)).toBeLessThan(1.5);

    // キックの位置から50ミリ秒以内の拍が大半を占める
    const onGrid = beats.filter((beat) => {
      const phase = beat % interval;
      return Math.min(phase, interval - phase) < 0.05;
    });
    expect(onGrid.length / beats.length).toBeGreaterThan(0.9);
    expect(beats.length).toBeGreaterThan((30 / interval) * 0.9);
  });
}

test("静かな部分と大きな部分を別のセクションに分ける", () => {
  const pcm = createTrack(120, 48, (time) => (time < 24 ? 0.25 : 1));

  const { sections } = analyzeTrack(pcm, SAMPLE_RATE);

  expect(sections.length).toBeGreaterThanOrEqual(2);

  const first = sections[0];
  const last = sections.at(-1);
  expect(first?.level).toBeLessThan(0.3);
  expect(last?.level).toBeGreaterThan(0.7);
  expect(Math.abs((first?.end ?? 0) - 24)).toBeLessThan(4);
});

test("無音ではBPMと拍を返さない", () => {
  const result = analyzeTrack(new Float32Array(SAMPLE_RATE * 5), SAMPLE_RATE);

  expect(result.bpm).toBeNull();
  expect(result.beats).toEqual([]);
  expect(result.sections.length).toBeGreaterThanOrEqual(1);
});

/** 長さ30秒の信号を作る */
function createSignal(signal: (time: number) => number): Float32Array {
  return Float32Array.from({ length: SAMPLE_RATE * 30 }, (_, i) =>
    signal(i / SAMPLE_RATE),
  );
}

const random = createRandom(7);
const hitTimes = Array.from({ length: 60 }, () => random() * 30);
const unrhythmic: Record<string, (time: number) => number> = {
  ホワイトノイズ: () => 0.3 * (random() * 2 - 1),
  一定のサイン波: (time) => 0.3 * Math.sin(2 * Math.PI * 440 * time),
  ゆっくり変わる和音: (time) => {
    const root = [220, 246.9, 196][Math.floor(time / 8) % 3] ?? 220;
    return (
      0.1 *
      [1, 1.26, 1.5].reduce(
        (sum, ratio) => sum + Math.sin(2 * Math.PI * root * ratio * time),
        0,
      )
    );
  },
  不規則な打音: (time) =>
    hitTimes.reduce((sum, hit) => {
      const delay = time - hit;
      return delay >= 0 && delay < 0.3
        ? sum +
            0.5 * Math.sin(2 * Math.PI * 80 * delay) * Math.exp(-delay / 0.08)
        : sum;
    }, 0),
};

for (const [name, signal] of Object.entries(unrhythmic)) {
  test(`拍のない音（${name}）ではBPMを返さない`, () => {
    const result = analyzeTrack(createSignal(signal), SAMPLE_RATE);

    expect(result.bpm).toBeNull();
    expect(result.beats).toEqual([]);
  });
}

test("ノイズが大きくても拍のある曲ではBPMを返す", () => {
  const noise = createRandom(9);
  const pcm = createTrack(128, 30);
  for (let i = 0; i < pcm.length; i++) {
    pcm[i] = (pcm[i] ?? 0) + 0.3 * (noise() * 2 - 1);
  }

  const { bpm } = analyzeTrack(pcm, SAMPLE_RATE);

  expect(Math.abs((bpm ?? 0) - 128)).toBeLessThan(1.5);
});

test("極端に短いファイルでも落ちない", () => {
  const result = analyzeTrack(new Float32Array(100), SAMPLE_RATE);

  expect(result.beats).toEqual([]);
});
