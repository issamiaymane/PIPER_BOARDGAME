/**
 * Audio Capture Service
 * Captures microphone audio and converts to PCM16 format for OpenAI Realtime API
 */

export interface AudioChunkData {
  audio: string;      // base64 encoded PCM16
  amplitude: number;  // RMS amplitude (0-1 scale)
  peak: number;       // Peak amplitude (0-1 scale)
}

export class AudioCapture {
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private isCapturing = false;

  // Callback when audio chunk is ready (with amplitude data)
  onAudioChunk?: (data: AudioChunkData) => void;

  /**
   * Request microphone permission and initialize audio pipeline
   */
  async initialize(): Promise<boolean> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 24000 // OpenAI Realtime API expects 24kHz
        }
      });

      // Create audio context at 24kHz sample rate
      this.audioContext = new AudioContext({ sampleRate: 24000 });

      // Create source from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for audio processing
      // Buffer size of 4096 gives ~170ms chunks at 24kHz
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isCapturing || !this.onAudioChunk) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Calculate amplitude metrics
        const { rms, peak } = this.calculateAmplitude(inputData);

        // Debug: Log high amplitude (potential screaming)
        if (rms > 0.3 || peak > 0.6) {
          console.log(`[AudioCapture] HIGH AMPLITUDE - RMS: ${rms.toFixed(3)}, Peak: ${peak.toFixed(3)}`);
        }

        const pcm16 = this.float32ToPCM16(inputData);
        const base64 = this.arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

        this.onAudioChunk({
          audio: base64,
          amplitude: rms,
          peak: peak
        });
      };

      return true;
    } catch (err) {
      console.error('Failed to initialize audio capture:', err);
      return false;
    }
  }

  /**
   * Start capturing audio from microphone
   */
  start(): void {
    if (!this.audioContext || !this.sourceNode || !this.processorNode) {
      console.error('Audio capture not initialized');
      return;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Connect the audio pipeline
    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);

    this.isCapturing = true;
  }

  /**
   * Stop capturing audio
   */
  stop(): void {
    this.isCapturing = false;

    if (this.processorNode && this.sourceNode) {
      this.sourceNode.disconnect();
      this.processorNode.disconnect();
    }
  }

  /**
   * Check if currently capturing
   */
  isActive(): boolean {
    return this.isCapturing;
  }

  /**
   * Clean up all resources
   */
  dispose(): void {
    this.stop();

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.sourceNode = null;
    this.processorNode = null;
  }

  /**
   * Calculate RMS (root mean square) and peak amplitude from audio samples
   * Returns values in 0-1 range
   */
  private calculateAmplitude(samples: Float32Array): { rms: number; peak: number } {
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

  /**
   * Convert Float32Array to Int16Array (PCM16)
   */
  private float32ToPCM16(float32Array: Float32Array): Int16Array {
    const pcm16 = new Int16Array(float32Array.length);
    for (let i = 0; i < float32Array.length; i++) {
      // Clamp to [-1, 1] and scale to Int16 range
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
    return pcm16;
  }

  /**
   * Convert ArrayBuffer to base64 string
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
