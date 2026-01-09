/**
 * Audio Playback Service
 * Plays PCM16 audio from OpenAI Realtime API
 */

import { AUDIO_SAMPLE_RATE, base64ToPCM16, pcm16ToFloat32 } from './audio-utils.js';
import { audioLogger } from './logger.js';

export class AudioPlayback {
  private audioContext: AudioContext | null = null;
  private audioQueue: AudioBuffer[] = [];
  private isPlaying = false;
  private currentSource: AudioBufferSourceNode | null = null;
  private nextPlayTime = 0;

  // Callback when playback state changes
  onStateChange?: (isPlaying: boolean) => void;

  constructor() {
    // Create audio context at OpenAI Realtime API sample rate
    this.audioContext = new AudioContext({ sampleRate: AUDIO_SAMPLE_RATE });
  }

  /**
   * Add audio chunk to playback queue (base64 encoded PCM16)
   */
  enqueue(audioBase64: string): void {
    if (!this.audioContext) return;

    try {
      // Decode base64 to PCM16
      const pcm16 = base64ToPCM16(audioBase64);

      // Convert PCM16 to AudioBuffer
      const audioBuffer = this.pcm16ToAudioBuffer(pcm16);

      // Add to queue
      this.audioQueue.push(audioBuffer);

      // Start playback if not already playing
      if (!this.isPlaying) {
        this.playNext();
      }
    } catch (err) {
      audioLogger.error('Failed to enqueue audio:', err);
    }
  }

  /**
   * Play the next audio buffer in queue
   */
  private playNext(): void {
    if (!this.audioContext || this.audioQueue.length === 0) {
      this.isPlaying = false;
      this.onStateChange?.(false);
      return;
    }

    // Resume audio context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    this.isPlaying = true;
    this.onStateChange?.(true);

    const audioBuffer = this.audioQueue.shift()!;
    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Schedule playback
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextPlayTime);
    source.start(startTime);

    // Update next play time for seamless playback
    this.nextPlayTime = startTime + audioBuffer.duration;

    this.currentSource = source;

    // When this buffer finishes, play the next one
    source.onended = () => {
      this.currentSource = null;
      this.playNext();
    };
  }

  /**
   * Stop playback and clear queue
   */
  stop(): void {
    if (this.currentSource) {
      this.currentSource.stop();
      this.currentSource = null;
    }

    this.audioQueue = [];
    this.isPlaying = false;
    this.nextPlayTime = 0;
    this.onStateChange?.(false);
  }

  /**
   * Check if currently playing
   */
  isActive(): boolean {
    return this.isPlaying;
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.audioQueue.length;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    this.stop();

    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }

  /**
   * Convert Int16Array (PCM16) to AudioBuffer
   */
  private pcm16ToAudioBuffer(pcm16: Int16Array): AudioBuffer {
    if (!this.audioContext) {
      throw new Error('AudioContext not initialized');
    }

    // Create AudioBuffer at OpenAI Realtime API sample rate
    const audioBuffer = this.audioContext.createBuffer(1, pcm16.length, AUDIO_SAMPLE_RATE);
    const channelData = audioBuffer.getChannelData(0);
    const float32 = pcm16ToFloat32(pcm16);
    channelData.set(float32);

    return audioBuffer;
  }
}
