import { expect, test } from "bun:test";
import { createAudioFrame } from "../../audio/audio-frame";
import { AudioUniforms } from "./audio-uniforms";

test("シェーダーと同じ順番で値を書き込む", () => {
  const uniforms = new AudioUniforms();
  const audio = createAudioFrame();
  audio.bass = 0.25;
  audio.mid = 0.5;
  audio.treble = 0.75;
  audio.energy = 1;
  audio.beat = true;

  uniforms.resize(1920, 1080);
  uniforms.update(audio, 1);

  const [width, height, time, bass, mid, treble, energy, beat] = uniforms.data;
  expect([width, height]).toEqual([1920, 1080]);
  expect(time).toBeGreaterThan(0);
  expect([bass, mid, treble, beat]).toEqual([0.25, 0.5, 0.75, 1]);
  expect(energy).toBeGreaterThan(0);
  expect(energy).toBeLessThan(1);
});

test("120BPMで音量が0と1を繰り返しても、明るさの値は大きく揺れない", () => {
  const uniforms = new AudioUniforms();
  const audio = createAudioFrame();
  const dt = 1 / 60;
  const values: number[] = [];

  for (let frame = 0; frame < 60 * 20; frame++) {
    audio.energy = (frame * dt) % 0.5 < 0.25 ? 1 : 0;
    uniforms.update(audio, dt);
    if (frame >= 60 * 15) values.push(uniforms.data[6] ?? 0);
  }

  expect(Math.max(...values) - Math.min(...values)).toBeLessThan(0.15);
});

test("音が大きいほど時間が速く進む", () => {
  const quiet = new AudioUniforms();
  const loud = new AudioUniforms();
  const audio = createAudioFrame();

  quiet.update(audio, 1);
  audio.energy = 1;
  loud.update(audio, 1);

  expect(loud.data[2] ?? 0).toBeGreaterThan(quiet.data[2] ?? 0);
});

test("拍の直後は時間が速く進む", () => {
  const steady = new AudioUniforms();
  const onBeat = new AudioUniforms();
  const audio = createAudioFrame();

  steady.update(audio, 0.1);
  audio.beat = true;
  onBeat.update(audio, 0.1);

  expect(onBeat.data[2] ?? 0).toBeGreaterThan((steady.data[2] ?? 0) * 2);
});

test("拍のあとは揺れの値が行き来する", () => {
  const uniforms = new AudioUniforms();
  const audio = createAudioFrame();
  const values: number[] = [];

  audio.beat = true;
  uniforms.update(audio, 1 / 60);
  audio.beat = false;
  for (let frame = 0; frame < 60; frame++) {
    uniforms.update(audio, 1 / 60);
    values.push(uniforms.data[8] ?? 0);
  }

  expect(Math.max(...values)).toBeGreaterThan(0.3);
  expect(Math.min(...values)).toBeLessThan(-0.1);
});

test("低音が鳴り続けてもアタックの値は残らない", () => {
  const uniforms = new AudioUniforms();
  const audio = createAudioFrame();
  audio.bass = 0.8;

  for (let frame = 0; frame < 60 * 5; frame++) uniforms.update(audio, 1 / 60);

  expect(uniforms.data[9]).toBeLessThan(0.01);
});

test("低音の立ち上がりでアタックの値が大きくなる", () => {
  const uniforms = new AudioUniforms();
  const audio = createAudioFrame();
  audio.bass = 0.5;
  for (let frame = 0; frame < 60 * 5; frame++) uniforms.update(audio, 1 / 60);

  audio.bass = 1;
  uniforms.update(audio, 1 / 60);

  expect(uniforms.data[9]).toBeGreaterThan(0.9);
});

test("揺れは拍と同じ周期で繰り返す", () => {
  const uniforms = new AudioUniforms();
  const audio = createAudioFrame();
  const dt = 1 / 120;
  const interval = 0.4;
  const framesPerBeat = Math.round(interval / dt);
  const values: number[] = [];

  for (let frame = 0; frame < framesPerBeat * 30; frame++) {
    audio.beat = frame % framesPerBeat === 0;
    uniforms.update(audio, dt);
    values.push(uniforms.data[8] ?? 0);
  }

  // 1拍の中でプラスとマイナスを1往復し、次の拍でも同じ形になる
  const last = values.slice(-framesPerBeat);
  const previous = values.slice(-framesPerBeat * 2, -framesPerBeat);
  expect(Math.max(...last)).toBeGreaterThan(0.5);
  expect(Math.min(...last)).toBeLessThan(-0.3);
  last.forEach((value, i) => {
    expect(Math.abs(value - (previous[i] ?? 0))).toBeLessThan(0.05);
  });
});

test("拍の値は検出後に減衰する", () => {
  const uniforms = new AudioUniforms();
  const audio = createAudioFrame();

  audio.beat = true;
  uniforms.update(audio, 1 / 60);
  expect(uniforms.data[7]).toBe(1);

  audio.beat = false;
  uniforms.update(audio, 0.35);
  expect(uniforms.data[7]).toBeCloseTo(Math.exp(-1));
});
