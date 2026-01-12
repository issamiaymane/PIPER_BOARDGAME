/**
 * Audio Capture Service
 * Captures microphone audio and converts to PCM16 format for OpenAI Realtime API
 */

import {
  AUDIO_SAMPLE_RATE,
  float32ToPCM16,
  arrayBufferToBase64,
  calculateAmplitude
} from './audio-utils.js';
import { audioLogger } from './logger.js';

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
          sampleRate: AUDIO_SAMPLE_RATE
        }
      });

      // Create audio context at OpenAI Realtime API sample rate
      this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });

      // Create source from microphone
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // Create script processor for audio processing
      // Buffer size of 4096 gives ~170ms chunks at 24kHz
      this.processorNode = this.audioContext.createScriptProcessor(4096, 1, 1);

      this.processorNode.onaudioprocess = (event) => {
        if (!this.isCapturing || !this.onAudioChunk) return;

        const inputData = event.inputBuffer.getChannelData(0);

        // Calculate amplitude metrics
        const { rms, peak } = calculateAmplitude(inputData);

        // Debug: Log high amplitude (potential screaming)
        if (rms > 0.3 || peak > 0.6) {
          audioLogger.debug(`HIGH AMPLITUDE - RMS: ${rms.toFixed(3)}, Peak: ${peak.toFixed(3)}`);
        }

        const pcm16 = float32ToPCM16(inputData);
        const base64 = arrayBufferToBase64(pcm16.buffer as ArrayBuffer);

        this.onAudioChunk({
          audio: base64,
          amplitude: rms,
          peak: peak
        });
      };

      return true;
    } catch (err) {
      audioLogger.error('Failed to initialize capture:', err);
      return false;
    }
  }

  /**
   * Start capturing audio from microphone
   */
  start(): void {
    if (!this.audioContext || !this.sourceNode || !this.processorNode) {
      audioLogger.error('Capture not initialized');
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
   * Resume audio context if suspended (e.g., after tab becomes visible)
   * Returns true if context was resumed or already running
   */
  async resumeAudioContext(): Promise<boolean> {
    if (!this.audioContext) return false;

    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        audioLogger.info('AudioCapture: AudioContext resumed');
        return true;
      } catch (err) {
        audioLogger.error('AudioCapture: Failed to resume AudioContext:', err);
        return false;
      }
    }
    return this.audioContext.state === 'running';
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
}
