let devicePromise: Promise<GPUDevice> | null = null;

async function requestDevice(): Promise<GPUDevice> {
  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) throw new Error("GPUアダプターを取得できません");

  const device = await adapter.requestDevice();
  // デバイスが失われたら、次のテーマ起動時に取り直す
  void device.lost.then(() => {
    devicePromise = null;
  });
  return device;
}

/** GPUDeviceを共有する。テーマを切り替えるたびに初期化しなくて済む */
export function getGpuDevice(): Promise<GPUDevice> {
  devicePromise ??= requestDevice().catch((error: unknown) => {
    devicePromise = null;
    throw error;
  });
  return devicePromise;
}
