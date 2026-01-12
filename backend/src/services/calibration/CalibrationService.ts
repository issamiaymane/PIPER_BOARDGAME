/**
 * Calibration Service
 * Handles pre-session voice calibration to establish dynamic thresholds
 */

import { config } from '../../config/index.js';
import { logger } from '../../utils/logger.js';
import type {
  CalibrationPhase,
  CalibrationState,
  CalibrationResult,
  CalibrationConfidence,
  AmplitudeSample,
  SilencePhaseResult,
  NormalPhaseResult,
  ExcitedPhaseResult,
  LoudPhaseResult,
} from '../../types/calibration.js';

// ─────────────────────────────────────────────────────────────────────────────
// STATISTICAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / (values.length - 1);
  return Math.sqrt(variance);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function max(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values);
}

// ─────────────────────────────────────────────────────────────────────────────
// CALIBRATION SERVICE
// ─────────────────────────────────────────────────────────────────────────────

export class CalibrationService {
  private state: CalibrationState;
  private readonly cfg = config.calibration;

  constructor() {
    this.state = this.createInitialState();
  }

  private createInitialState(): CalibrationState {
    return {
      isCalibrating: false,
      currentPhase: 'idle',
      samples: [],
      transcripts: [],
      retryCount: 0,
      maxRetries: 1,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Start the calibration process
   */
  startCalibration(): void {
    this.state = this.createInitialState();
    this.state.isCalibrating = true;
    this.state.currentPhase = 'silence';
    this.state.phaseStartTime = Date.now();
    logger.info('CalibrationService: Calibration started');
  }

  /**
   * Add an amplitude sample during calibration
   */
  addSample(amplitude: number, peak: number): void {
    if (!this.state.isCalibrating) return;

    this.state.samples.push({
      amplitude,
      peak,
      timestamp: Date.now(),
    });
  }

  /**
   * Add a transcript from GPT-4o mini
   */
  addTranscript(transcript: string): void {
    if (!this.state.isCalibrating) return;
    this.state.transcripts.push(transcript);
  }

  /**
   * Get the current calibration phase
   */
  getCurrentPhase(): CalibrationPhase {
    return this.state.currentPhase;
  }

  /**
   * Check if calibration is in progress
   */
  isCalibrating(): boolean {
    return this.state.isCalibrating;
  }

  /**
   * Complete the current phase and move to the next
   * Returns the next phase or 'complete'/'failed'
   */
  completePhase(): { nextPhase: CalibrationPhase; needsRetry: boolean; retryReason?: string } {
    const phase = this.state.currentPhase;
    logger.info(`CalibrationService: Completing phase ${phase} with ${this.state.samples.length} samples`);

    // Analyze current phase
    const analysisResult = this.analyzeCurrentPhase();

    if (!analysisResult.valid && this.state.retryCount < this.state.maxRetries) {
      // Retry current phase
      this.state.retryCount++;
      this.state.samples = [];
      this.state.transcripts = [];
      this.state.phaseStartTime = Date.now();
      logger.info(`CalibrationService: Retrying phase ${phase} (attempt ${this.state.retryCount + 1})`);
      return { nextPhase: phase, needsRetry: true, retryReason: analysisResult.reason };
    }

    // Move to next phase
    const nextPhase = this.getNextPhase(phase);
    this.state.currentPhase = nextPhase;
    this.state.samples = [];
    this.state.transcripts = [];
    this.state.retryCount = 0;
    this.state.phaseStartTime = Date.now();

    if (nextPhase === 'complete' || nextPhase === 'failed') {
      this.state.isCalibrating = false;
    }

    return { nextPhase, needsRetry: false };
  }

  /**
   * Abort calibration
   */
  abort(): void {
    this.state.isCalibrating = false;
    this.state.currentPhase = 'failed';
    logger.info('CalibrationService: Calibration aborted');
  }

  /**
   * Calculate final calibration result
   */
  calculateResult(): CalibrationResult {
    const { silenceResult, normalResult, excitedResult, loudResult } = this.state;

    // Check if we have required data
    if (!normalResult) {
      return this.createFailedResult('Missing normal phase data');
    }

    // Calculate thresholds
    const { amplitudeThreshold, peakThreshold, confidence } = this.calculateThresholds();

    // Calculate device gain (relative to expected normal speech ~0.10)
    const deviceGain = normalResult.amplitudeMean / 0.10;

    const result: CalibrationResult = {
      amplitudeThreshold,
      peakThreshold,
      isValid: confidence !== 'low',
      confidence,
      rawData: {
        silence: silenceResult,
        normal: normalResult,
        excited: excitedResult,
        loud: loudResult,
      },
      deviceGain,
      calibratedAt: new Date(),
    };

    logger.info(`CalibrationService: Calibration complete - amplitude: ${amplitudeThreshold.toFixed(3)}, peak: ${peakThreshold.toFixed(3)}, confidence: ${confidence}`);

    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE ANALYSIS
  // ─────────────────────────────────────────────────────────────────────────────

  private analyzeCurrentPhase(): { valid: boolean; reason?: string } {
    const phase = this.state.currentPhase;
    const samples = this.state.samples;

    switch (phase) {
      case 'silence':
        return this.analyzeSilencePhase(samples);
      case 'normal':
        return this.analyzeNormalPhase(samples);
      case 'excited':
        return this.analyzeExcitedPhase(samples);
      case 'loud':
        return this.analyzeLoudPhase(samples);
      default:
        return { valid: true };
    }
  }

  private analyzeSilencePhase(samples: AmplitudeSample[]): { valid: boolean; reason?: string } {
    const amplitudes = samples.map(s => s.amplitude);
    const peaks = samples.map(s => s.peak);

    this.state.silenceResult = {
      noiseFloor: mean(amplitudes),
      noiseFloorPeak: mean(peaks),
      samples: [...samples],
    };

    // Silence phase is always valid - we just want to measure background noise
    logger.debug(`CalibrationService: Silence phase - noise floor: ${this.state.silenceResult.noiseFloor.toFixed(4)}`);
    return { valid: true };
  }

  private analyzeNormalPhase(samples: AmplitudeSample[]): { valid: boolean; reason?: string } {
    const amplitudes = samples.map(s => s.amplitude);
    const peaks = samples.map(s => s.peak);

    // Filter for samples with voice activity
    const voiceSamples = samples.filter(s => s.amplitude > this.cfg.validation.voiceActivityThreshold);

    if (voiceSamples.length < this.cfg.validation.minSpeechSamples) {
      return { valid: false, reason: 'Not enough voice activity detected' };
    }

    const voiceAmplitudes = voiceSamples.map(s => s.amplitude);
    const voicePeaks = voiceSamples.map(s => s.peak);

    // Check transcript for expected words
    const transcript = this.state.transcripts.join(' ').toLowerCase();
    const wordsMatched = this.cfg.phases.normal.words.filter(w => transcript.includes(w)).length;

    this.state.normalResult = {
      amplitudeMean: mean(voiceAmplitudes),
      amplitudeStd: std(voiceAmplitudes),
      amplitudeMax: max(voiceAmplitudes),
      peakMean: mean(voicePeaks),
      peakMax: max(voicePeaks),
      samples: [...samples],
      transcript,
      wordsMatched,
    };

    logger.debug(`CalibrationService: Normal phase - mean: ${this.state.normalResult.amplitudeMean.toFixed(3)}, std: ${this.state.normalResult.amplitudeStd.toFixed(3)}, words: ${wordsMatched}`);

    // Validation: need enough voice samples (transcript validation is optional)
    return { valid: true };
  }

  private analyzeExcitedPhase(samples: AmplitudeSample[]): { valid: boolean; reason?: string } {
    const voiceSamples = samples.filter(s => s.amplitude > this.cfg.validation.voiceActivityThreshold);

    if (voiceSamples.length < this.cfg.validation.minSpeechSamples) {
      return { valid: false, reason: 'Not enough voice activity detected' };
    }

    const voiceAmplitudes = voiceSamples.map(s => s.amplitude);
    const voicePeaks = voiceSamples.map(s => s.peak);

    const transcript = this.state.transcripts.join(' ').toLowerCase();
    const wordsMatched = this.cfg.phases.excited.words.filter(w => transcript.includes(w)).length;

    this.state.excitedResult = {
      amplitudeMean: mean(voiceAmplitudes),
      amplitudeMax: max(voiceAmplitudes),
      peakMean: mean(voicePeaks),
      peakMax: max(voicePeaks),
      samples: [...samples],
      transcript,
      wordsMatched,
    };

    // Check if excited is louder than normal
    if (this.state.normalResult) {
      const ratio = this.state.excitedResult.amplitudeMean / this.state.normalResult.amplitudeMean;
      if (ratio < this.cfg.validation.excitedToNormalRatio) {
        logger.debug(`CalibrationService: Excited phase not loud enough (ratio: ${ratio.toFixed(2)})`);
        // Don't fail - use the data we have
      }
    }

    logger.debug(`CalibrationService: Excited phase - mean: ${this.state.excitedResult.amplitudeMean.toFixed(3)}, max: ${this.state.excitedResult.amplitudeMax.toFixed(3)}`);
    return { valid: true };
  }

  private analyzeLoudPhase(samples: AmplitudeSample[]): { valid: boolean; reason?: string } {
    const voiceSamples = samples.filter(s => s.amplitude > this.cfg.validation.voiceActivityThreshold);

    if (voiceSamples.length < this.cfg.validation.minSpeechSamples) {
      return { valid: false, reason: 'Not enough voice activity detected' };
    }

    const voiceAmplitudes = voiceSamples.map(s => s.amplitude);
    const voicePeaks = voiceSamples.map(s => s.peak);

    const transcript = this.state.transcripts.join(' ').toLowerCase();

    this.state.loudResult = {
      amplitudeMax: max(voiceAmplitudes),
      amplitude95th: percentile(voiceAmplitudes, 95),
      peakMax: max(voicePeaks),
      peak95th: percentile(voicePeaks, 95),
      samples: [...samples],
      transcript,
    };

    logger.debug(`CalibrationService: Loud phase - max: ${this.state.loudResult.amplitudeMax.toFixed(3)}, 95th: ${this.state.loudResult.amplitude95th.toFixed(3)}`);
    return { valid: true };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // THRESHOLD CALCULATION
  // ─────────────────────────────────────────────────────────────────────────────

  private calculateThresholds(): { amplitudeThreshold: number; peakThreshold: number; confidence: CalibrationConfidence } {
    const { normalResult, excitedResult, loudResult, silenceResult } = this.state;
    const cfg = this.cfg.thresholds;

    // Default to fallback values
    let amplitudeThreshold = this.cfg.fallback.amplitudeThreshold;
    let peakThreshold = this.cfg.fallback.peakThreshold;
    let confidence: CalibrationConfidence = 'low';

    if (!normalResult) {
      return { amplitudeThreshold, peakThreshold, confidence };
    }

    // Calculate amplitude threshold
    // Formula: normal_ceiling + factor * (excited_mean - normal_ceiling)
    const normalCeiling = normalResult.amplitudeMean + (2 * normalResult.amplitudeStd);

    if (excitedResult) {
      amplitudeThreshold = normalCeiling + cfg.amplitudeFactor * (excitedResult.amplitudeMean - normalCeiling);
      confidence = 'medium';
    } else {
      // Fallback: use normal data with multiplier
      amplitudeThreshold = normalResult.amplitudeMean * 3.0;
    }

    // Calculate peak threshold
    // Formula: normal_peak + factor * (loud_peak_95th - normal_peak)
    if (loudResult) {
      peakThreshold = normalResult.peakMax + cfg.peakFactor * (loudResult.peak95th - normalResult.peakMax);
      if (confidence === 'medium') {
        confidence = 'high';
      }
    } else if (excitedResult) {
      // Fallback: use excited peak with multiplier
      peakThreshold = excitedResult.peakMax * 1.2;
    } else {
      // Fallback: use normal peak with multiplier
      peakThreshold = normalResult.peakMax * 1.5;
    }

    // Apply noise floor adjustment
    if (silenceResult && silenceResult.noiseFloor > 0.03) {
      const noiseAdjustedMin = silenceResult.noiseFloor * 4;
      amplitudeThreshold = Math.max(amplitudeThreshold, noiseAdjustedMin);
      logger.debug(`CalibrationService: Applied noise floor adjustment - min threshold: ${noiseAdjustedMin.toFixed(3)}`);
    }

    // Clamp to reasonable ranges
    amplitudeThreshold = Math.max(cfg.amplitudeMin, Math.min(cfg.amplitudeMax, amplitudeThreshold));
    peakThreshold = Math.max(cfg.peakMin, Math.min(cfg.peakMax, peakThreshold));

    // Check for flat response (all phases similar)
    if (excitedResult && normalResult) {
      const ratio = excitedResult.amplitudeMean / normalResult.amplitudeMean;
      if (ratio < 1.2) {
        logger.warn('CalibrationService: Flat response detected - child may not have followed instructions');
        confidence = 'low';
      }
    }

    return { amplitudeThreshold, peakThreshold, confidence };
  }

  private createFailedResult(reason: string): CalibrationResult {
    logger.warn(`CalibrationService: Calibration failed - ${reason}`);
    return {
      amplitudeThreshold: this.cfg.fallback.amplitudeThreshold,
      peakThreshold: this.cfg.fallback.peakThreshold,
      isValid: false,
      confidence: 'low',
      failureReason: reason,
      rawData: {
        silence: this.state.silenceResult,
        normal: this.state.normalResult,
        excited: this.state.excitedResult,
        loud: this.state.loudResult,
      },
      deviceGain: 1.0,
      calibratedAt: new Date(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // PHASE FLOW
  // ─────────────────────────────────────────────────────────────────────────────

  private getNextPhase(current: CalibrationPhase): CalibrationPhase {
    switch (current) {
      case 'silence':
        return 'normal';
      case 'normal':
        return 'excited';
      case 'excited':
        return 'loud';
      case 'loud':
        return 'complete';
      default:
        return 'failed';
    }
  }

  /**
   * Get duration for current phase
   */
  getPhaseDuration(): number {
    switch (this.state.currentPhase) {
      case 'silence':
        return this.cfg.phases.silence.durationMs;
      case 'normal':
        return this.cfg.phases.normal.durationMs;
      case 'excited':
        return this.cfg.phases.excited.durationMs;
      case 'loud':
        return this.cfg.phases.loud.durationMs;
      default:
        return 0;
    }
  }

  /**
   * Get prompt for current phase
   */
  getPhasePrompt(): string {
    const prompts = config.calibrationPrompts;
    switch (this.state.currentPhase) {
      case 'silence':
        return prompts.silence;
      case 'normal':
        return prompts.normal;
      case 'excited':
        return prompts.excited;
      case 'loud':
        return prompts.loud;
      default:
        return '';
    }
  }
}
