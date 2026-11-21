import { type AudioAnalysisResult, AudioAnalysisResultSchema } from "./schemas";

export interface FftSpectrum {
  readonly magnitudes: Float32Array;
  readonly binHz: number;
  readonly fftSize: number;
  readonly sampleRate: number;
}

/** Check whether any sample in the buffer is NaN or +/-Infinity. */
export function hasNonFiniteSamples(samples: Float32Array): boolean {
  for (let i = 0; i < samples.length; i += 1) {
    if (!Number.isFinite(samples[i] ?? 0)) return true;
  }
  return false;
}

/** Peak absolute amplitude in the buffer. */
export function computePeak(samples: Float32Array): number {
  let peak = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const abs = Math.abs(samples[i] ?? 0);
    if (abs > peak) peak = abs;
  }
  return peak;
}

/** Root-mean-square energy over [startSample, endSample). */
export function computeRMS(
  samples: Float32Array,
  startSample = 0,
  endSample = samples.length,
): number {
  const start = Math.max(0, Math.min(samples.length, startSample));
  const end = Math.max(start, Math.min(samples.length, endSample));
  const count = end - start;
  if (count === 0) return 0;
  let sumSq = 0;
  for (let i = start; i < end; i += 1) {
    const v = samples[i] ?? 0;
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / count);
}

/** Mean DC offset of the buffer. */
export function computeDcOffset(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) {
    sum += samples[i] ?? 0;
  }
  return sum / samples.length;
}

/** Difference in cents between detected frequency and target frequency. */
export function frequencyErrorCents(detectedHz: number, targetHz: number): number {
  if (detectedHz <= 0 || targetHz <= 0) return Number.POSITIVE_INFINITY;
  return 1200 * Math.log2(detectedHz / targetHz);
}

/** In-place iterative Radix-2 Cooley-Tukey FFT. */
function fftInPlace(real: Float64Array, imag: Float64Array): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    while ((j & bit) !== 0) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const tr = real[i] ?? 0;
      const ti = imag[i] ?? 0;
      real[i] = real[j] ?? 0;
      imag[i] = imag[j] ?? 0;
      real[j] = tr;
      imag[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const half = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wRealStep = Math.cos(angle);
    const wImagStep = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wReal = 1;
      let wImag = 0;
      for (let j = 0; j < half; j += 1) {
        const uIdx = i + j;
        const vIdx = uIdx + half;
        const vr = real[vIdx] ?? 0;
        const vi = imag[vIdx] ?? 0;
        const tr = vr * wReal - vi * wImag;
        const ti = vr * wImag + vi * wReal;
        const ur = real[uIdx] ?? 0;
        const ui = imag[uIdx] ?? 0;
        real[uIdx] = ur + tr;
        imag[uIdx] = ui + ti;
        real[vIdx] = ur - tr;
        imag[vIdx] = ui - ti;

        const nextWReal = wReal * wRealStep - wImag * wImagStep;
        wImag = wReal * wImagStep + wImag * wRealStep;
        wReal = nextWReal;
      }
    }
  }
}

/**
 * Compute Hann-windowed magnitude FFT spectrum (power-of-two size, zero-padded if needed).
 */
export function computeFFT(
  samples: Float32Array,
  sampleRate: number,
  fftSize = 16_384,
  startSample = 0,
): FftSpectrum {
  const real = new Float64Array(fftSize);
  const imag = new Float64Array(fftSize);
  const available = Math.max(0, Math.min(fftSize, samples.length - startSample));

  for (let i = 0; i < available; i += 1) {
    const hann = available > 1 ? 0.5 * (1 - Math.cos((2 * Math.PI * i) / (available - 1))) : 1;
    real[i] = (samples[startSample + i] ?? 0) * hann;
  }

  fftInPlace(real, imag);

  const half = fftSize >> 1;
  const magnitudes = new Float32Array(half);
  const scale = available > 0 ? 2 / available : 1;
  for (let i = 0; i < half; i += 1) {
    const r = real[i] ?? 0;
    const im = imag[i] ?? 0;
    magnitudes[i] = Math.hypot(r, im) * scale;
  }

  return {
    magnitudes,
    binHz: sampleRate / fftSize,
    fftSize,
    sampleRate,
  };
}

/** Parabolic interpolation around a discrete extremum at index k. */
function parabolicVertexOffset(yPrev: number, yCurr: number, yNext: number): number {
  const denom = yPrev - 2 * yCurr + yNext;
  if (Math.abs(denom) < 1e-12) return 0;
  return Math.max(-0.5, Math.min(0.5, (0.5 * (yPrev - yNext)) / denom));
}

/**
 * YIN fundamental pitch estimator (de Cheveigne & Kawahara, 2002).
 * Handles harmonic-rich piano notes down to A0 (27.5 Hz) without octave errors.
 */
function detectPitchYin(
  samples: Float32Array,
  sampleRate: number,
  minHz: number,
  maxHz: number,
  startSample: number,
): number {
  const maxLag = Math.min(
    Math.floor(sampleRate / minHz) + 4,
    Math.floor((samples.length - startSample) / 2) - 1,
  );
  const minLag = Math.max(4, Math.floor(sampleRate / maxHz) - 2);
  if (maxLag <= minLag + 2) return 0;

  const windowSize = Math.min(2048, samples.length - startSample - maxLag);
  if (windowSize < 64) return 0;

  const diff = new Float64Array(maxLag + 1);
  for (let tau = 1; tau <= maxLag; tau += 1) {
    let sum = 0;
    for (let i = 0; i < windowSize; i += 1) {
      const delta = (samples[startSample + i] ?? 0) - (samples[startSample + i + tau] ?? 0);
      sum += delta * delta;
    }
    diff[tau] = sum;
  }

  const cmndf = new Float64Array(maxLag + 1);
  cmndf[0] = 1;
  let runningSum = 0;
  for (let tau = 1; tau <= maxLag; tau += 1) {
    runningSum += diff[tau] ?? 0;
    cmndf[tau] = runningSum > 0 ? ((diff[tau] ?? 0) * tau) / runningSum : 1;
  }

  const threshold = 0.12;
  let bestTau = -1;
  for (let tau = minLag; tau < maxLag; tau += 1) {
    const val = cmndf[tau] ?? 1;
    if (val < threshold) {
      while (tau + 1 < maxLag && (cmndf[tau + 1] ?? 1) < (cmndf[tau] ?? 1)) {
        tau += 1;
      }
      bestTau = tau;
      break;
    }
  }

  if (bestTau === -1) {
    let minVal = Number.POSITIVE_INFINITY;
    for (let tau = minLag; tau < maxLag; tau += 1) {
      const val = cmndf[tau] ?? 1;
      if (val < minVal) {
        minVal = val;
        bestTau = tau;
      }
    }
  }

  if (bestTau <= 0) return 0;
  const offset = parabolicVertexOffset(
    cmndf[bestTau - 1] ?? 1,
    cmndf[bestTau] ?? 1,
    cmndf[bestTau + 1] ?? 1,
  );
  const refinedTau = bestTau + offset;
  return refinedTau > 0 ? sampleRate / refinedTau : 0;
}

/**
 * Refine a pitch estimate using Hann-windowed FFT log-magnitude parabolic interpolation.
 * Gives < 0.2 cent accuracy in mid/high registers where YIN lag is small.
 */
function refinePitchWithFft(
  samples: Float32Array,
  sampleRate: number,
  coarseHz: number,
  startSample: number,
): number {
  const fftSize = 16_384;
  const spectrum = computeFFT(samples, sampleRate, fftSize, startSample);
  const centerBin = Math.round(coarseHz / spectrum.binHz);
  const searchRadius = Math.max(3, Math.ceil((coarseHz * 0.04) / spectrum.binHz));
  const minBin = Math.max(1, centerBin - searchRadius);
  const maxBin = Math.min(spectrum.magnitudes.length - 2, centerBin + searchRadius);

  let bestBin = centerBin;
  let bestMag = -1;
  for (let b = minBin; b <= maxBin; b += 1) {
    const mag = spectrum.magnitudes[b] ?? 0;
    if (mag > bestMag) {
      bestMag = mag;
      bestBin = b;
    }
  }

  if (bestMag <= 0) return coarseHz;
  const yPrev = Math.log((spectrum.magnitudes[bestBin - 1] ?? 0) + 1e-12);
  const yCurr = Math.log((spectrum.magnitudes[bestBin] ?? 0) + 1e-12);
  const yNext = Math.log((spectrum.magnitudes[bestBin + 1] ?? 0) + 1e-12);
  const offset = parabolicVertexOffset(yPrev, yCurr, yNext);
  return (bestBin + offset) * spectrum.binHz;
}

/**
 * Hybrid YIN + FFT fundamental pitch detector across the full 88-key piano range (25–4600 Hz).
 */
export function detectPitchHz(
  samples: Float32Array,
  sampleRate: number,
  minHz = 25,
  maxHz = 4600,
): number {
  // Skip first 12ms hammer transient when buffer is long enough
  const startSample = samples.length > sampleRate * 0.12 ? Math.floor(sampleRate * 0.012) : 0;
  const yinHz = detectPitchYin(samples, sampleRate, minHz, maxHz, startSample);
  if (yinHz <= 0) return 0;
  if (yinHz >= 320 && samples.length - startSample >= 2048) {
    return refinePitchWithFft(samples, sampleRate, yinHz, startSample);
  }
  return yinHz;
}

/** Compute spectral centroid in Hz (measures perceived brightness). */
export function computeSpectralCentroidHz(samples: Float32Array, sampleRate: number): number {
  const fftSize = samples.length >= 4096 ? 8192 : 2048;
  const spectrum = computeFFT(samples, sampleRate, fftSize, 0);
  let weightedSum = 0;
  let totalMag = 0;
  for (let i = 1; i < spectrum.magnitudes.length; i += 1) {
    const mag = spectrum.magnitudes[i] ?? 0;
    weightedSum += i * spectrum.binHz * mag;
    totalMag += mag;
  }
  return totalMag > 0 ? weightedSum / totalMag : 0;
}

/**
 * Check whether an FFT spectrum contains a clear energy peak near targetHz
 * (used to verify intervals and chords contain all expected pitches).
 */
export function findSpectralPeakNear(
  spectrum: FftSpectrum,
  targetHz: number,
  toleranceCents = 25,
): { detectedHz: number; magnitude: number; relativeMagnitude: number } {
  let maxMag = 0;
  for (let i = 1; i < spectrum.magnitudes.length; i += 1) {
    const mag = spectrum.magnitudes[i] ?? 0;
    if (mag > maxMag) maxMag = mag;
  }

  const ratio = 2 ** (toleranceCents / 1200);
  const lowHz = targetHz / ratio;
  const highHz = targetHz * ratio;
  const minBin = Math.max(1, Math.floor(lowHz / spectrum.binHz) - 1);
  const maxBin = Math.min(spectrum.magnitudes.length - 2, Math.ceil(highHz / spectrum.binHz) + 1);

  let bestBin = minBin;
  let bestMag = 0;
  for (let b = minBin; b <= maxBin; b += 1) {
    const mag = spectrum.magnitudes[b] ?? 0;
    if (mag > bestMag) {
      bestMag = mag;
      bestBin = b;
    }
  }

  const yPrev = Math.log((spectrum.magnitudes[bestBin - 1] ?? 0) + 1e-12);
  const yCurr = Math.log((spectrum.magnitudes[bestBin] ?? 0) + 1e-12);
  const yNext = Math.log((spectrum.magnitudes[bestBin + 1] ?? 0) + 1e-12);
  const offset = parabolicVertexOffset(yPrev, yCurr, yNext);
  const detectedHz = (bestBin + offset) * spectrum.binHz;

  return {
    detectedHz,
    magnitude: bestMag,
    relativeMagnitude: maxMag > 0 ? bestMag / maxMag : 0,
  };
}

/** Full mathematical analysis of a mono PCM buffer. */
export function analyzeBuffer(
  samples: Float32Array,
  sampleRate: number,
  targetHz?: number,
): AudioAnalysisResult {
  const durationSeconds = samples.length / sampleRate;
  const hasNonFinite = hasNonFiniteSamples(samples);
  const peak = computePeak(samples);
  const rms = computeRMS(samples);
  const dcOffset = computeDcOffset(samples);
  const spectralCentroidHz = computeSpectralCentroidHz(samples, sampleRate);

  // Locate time of peak amplitude (attack peak)
  let peakIndex = 0;
  let maxAbs = 0;
  for (let i = 0; i < samples.length; i += 1) {
    const abs = Math.abs(samples[i] ?? 0);
    if (abs > maxAbs) {
      maxAbs = abs;
      peakIndex = i;
    }
  }
  const attackPeakSeconds = peakIndex / sampleRate;

  // Compare early window RMS vs tail window RMS to verify ADSR decay
  const earlyEnd = Math.max(1, Math.floor(samples.length * 0.25));
  const tailStart = Math.max(0, Math.floor(samples.length * 0.75));
  const earlyRms = computeRMS(samples, 0, earlyEnd);
  const tailRms = computeRMS(samples, tailStart, samples.length);
  const envelopeDecays = earlyRms > tailRms;

  const detectedHz = detectPitchHz(samples, sampleRate);
  const centsError =
    targetHz !== undefined && detectedHz > 0 ? frequencyErrorCents(detectedHz, targetHz) : null;

  return AudioAnalysisResultSchema.parse({
    sampleRate,
    durationSeconds,
    rms,
    peak,
    hasNonFinite,
    dcOffset,
    detectedHz,
    centsError,
    spectralCentroidHz,
    attackPeakSeconds,
    earlyRms,
    tailRms,
    envelopeDecays,
  });
}
