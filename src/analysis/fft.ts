/** 基数2の高速フーリエ変換。サイズは2のべき乗に限る */
export class Fft {
  private readonly cosTable: Float64Array;
  private readonly sinTable: Float64Array;
  private readonly reversed: Uint32Array;

  constructor(readonly size: number) {
    if (size < 2 || (size & (size - 1)) !== 0) {
      throw new Error("FFTのサイズは2のべき乗にしてください");
    }

    this.cosTable = new Float64Array(size / 2);
    this.sinTable = new Float64Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos((2 * Math.PI * i) / size);
      this.sinTable[i] = -Math.sin((2 * Math.PI * i) / size);
    }

    const bits = Math.log2(size);
    this.reversed = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      let value = 0;
      for (let bit = 0; bit < bits; bit++) {
        if (i & (1 << bit)) value |= 1 << (bits - 1 - bit);
      }
      this.reversed[i] = value;
    }
  }

  /** 実部と虚部の配列をその場で変換する */
  transform(real: Float64Array, imag: Float64Array): void {
    const { size, reversed, cosTable, sinTable } = this;

    for (let i = 0; i < size; i++) {
      const j = reversed[i] ?? 0;
      if (j > i) {
        [real[i], real[j]] = [real[j] ?? 0, real[i] ?? 0];
        [imag[i], imag[j]] = [imag[j] ?? 0, imag[i] ?? 0];
      }
    }

    for (let length = 2; length <= size; length *= 2) {
      const half = length / 2;
      const tableStep = size / length;

      for (let start = 0; start < size; start += length) {
        for (let k = 0; k < half; k++) {
          const cos = cosTable[k * tableStep] ?? 0;
          const sin = sinTable[k * tableStep] ?? 0;
          const even = start + k;
          const odd = even + half;
          const oddReal = real[odd] ?? 0;
          const oddImag = imag[odd] ?? 0;
          const productReal = oddReal * cos - oddImag * sin;
          const productImag = oddReal * sin + oddImag * cos;
          const evenReal = real[even] ?? 0;
          const evenImag = imag[even] ?? 0;

          real[odd] = evenReal - productReal;
          imag[odd] = evenImag - productImag;
          real[even] = evenReal + productReal;
          imag[even] = evenImag + productImag;
        }
      }
    }
  }
}
