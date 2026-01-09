/**
 * Audio Utilities
 * Shared audio conversion functions for capture and playback services
 */

// OpenAI Realtime API sample rate
export const AUDIO_SAMPLE_RATE = 24000;

/**
 * Convert Float32Array to Int16Array (PCM16)
 */
export function float32ToPCM16(float32Array: Float32Array): Int16Array {
  const pcm16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1] and scale to Int16 range
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return pcm16;
}

/**
 * Convert Int16Array (PCM16) to Float32Array
 */
export function pcm16ToFloat32(pcm16: Int16Array): Float32Array {
  const float32 = new Float32Array(pcm16.length);
  for (let i = 0; i < pcm16.length; i++) {
    // Scale from Int16 range to [-1, 1]
    float32[i] = pcm16[i] / (pcm16[i] < 0 ? 0x8000 : 0x7fff);
  }
  return float32;
}

/**
 * Convert ArrayBuffer to base64 string
 */
export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Convert base64 string to ArrayBuffer
 */
export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Convert base64 string to Int16Array (PCM16)
 */
export function base64ToPCM16(base64: string): Int16Array {
  return new Int16Array(base64ToArrayBuffer(base64));
}

/**
 * Calculate RMS (root mean square) and peak amplitude from audio samples
 * Returns values in 0-1 range
 */
export function calculateAmplitude(samples: Float32Array): { rms: number; peak: number } {
  let sumSquares = 0;
  let peak = 0;

  for (let i = 0; i < samples.length; i++) {
    const abs = Math.abs(samples[i]);
    sumSquares += samples[i] * samples[i];
    if (abs > peak) peak = abs;
  }

  const rms = Math.sqrt(sumSquares / samples.length);
  return { rms, peak };
}
