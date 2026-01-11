/**
 * Singleton AudioEngine class for spatial audio processing
 * Uses Web Audio API with HRTF panning model
 */

// Preset positions for spatial audio (relative to listener at origin)
export interface SpatialPreset {
  name: string;
  x: number;
  y: number;
  z: number;
}

// 30 Presets for different body/spatial positions
export const SPATIAL_PRESETS: SpatialPreset[] = [
  { name: 'preset1', x: 0, y: 1.7, z: 0.3 },      // Front of head
  { name: 'preset2', x: 0, y: 1.7, z: -0.3 },     // Back of head
  { name: 'preset3', x: 0.15, y: 1.65, z: 0 },    // Right ear
  { name: 'preset4', x: -0.15, y: 1.65, z: 0 },   // Left ear
  { name: 'preset5', x: 0, y: 1.5, z: 0.2 },      // Front neck
  { name: 'preset6', x: 0, y: 1.5, z: -0.2 },     // Back neck
  { name: 'preset7', x: 0.3, y: 1.4, z: 0 },      // Right shoulder
  { name: 'preset8', x: -0.3, y: 1.4, z: 0 },     // Left shoulder
  { name: 'preset9', x: 0, y: 1.3, z: 0.2 },      // Upper chest
  { name: 'preset10', x: 0, y: 1.1, z: 0.2 },     // Mid chest
  { name: 'preset11', x: 0, y: 1.3, z: -0.2 },    // Upper back
  { name: 'preset12', x: 0, y: 1.0, z: -0.2 },    // Mid back
  { name: 'preset13', x: 0.5, y: 1.0, z: 0 },     // Right arm
  { name: 'preset14', x: -0.5, y: 1.0, z: 0 },    // Left arm
  { name: 'preset15', x: 0.7, y: 0.8, z: 0 },     // Right hand
  { name: 'preset16', x: -0.7, y: 0.8, z: 0 },    // Left hand
  { name: 'preset17', x: 0, y: 0.9, z: 0.15 },    // Stomach
  { name: 'preset18', x: 0, y: 0.9, z: -0.15 },   // Lower back
  { name: 'preset19', x: 0.15, y: 0.5, z: 0 },    // Right hip
  { name: 'preset20', x: -0.15, y: 0.5, z: 0 },   // Left hip
  { name: 'preset21', x: 0.15, y: 0.3, z: 0 },    // Right thigh
  { name: 'preset22', x: -0.15, y: 0.3, z: 0 },   // Left thigh
  { name: 'preset23', x: 0.15, y: 0, z: 0 },      // Right knee
  { name: 'preset24', x: -0.15, y: 0, z: 0 },     // Left knee
  { name: 'preset25', x: 0.1, y: -0.4, z: 0 },    // Right foot
  { name: 'preset26', x: -0.1, y: -0.4, z: 0 },   // Left foot
  { name: 'preset27', x: 2, y: 1.5, z: 0 },       // Far right
  { name: 'preset28', x: -2, y: 1.5, z: 0 },      // Far left
  { name: 'preset29', x: 0, y: 1.5, z: 2 },       // Far front
  { name: 'preset30', x: 0, y: 1.5, z: -2 },      // Far back
];

class AudioEngine {
  private static instance: AudioEngine | null = null;
  
  private audioContext: AudioContext | null = null;
  private analyserNode: AnalyserNode | null = null;
  private pannerNode: PannerNode | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private frequencyData: Uint8Array<ArrayBuffer> | null = null;
  private isPlaying: boolean = false;
  private startTime: number = 0;
  private pauseTime: number = 0;

  // EQ filter nodes
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private highFilter: BiquadFilterNode | null = null;

  // Current position and target for lerp
  private currentPosition = { x: 0, y: 0, z: 0 };
  private targetPosition = { x: 0, y: 0, z: 0 };
  private lerpSpeed = 0.1; // 0-1, higher = faster
  private movementSpeed = 1; // Multiplier for position changes
  private isLerpEnabled = true;

  // Frequency band ranges
  private readonly SAMPLE_RATE = 44100;
  private readonly FFT_SIZE = 2048;
  
  // Extended frequency bands for instruments/sounds
  private readonly SUB_BASS_MIN = 20;
  private readonly SUB_BASS_MAX = 60;      // Sub-bass (kick drums, bass drops)
  private readonly BASS_MIN = 60;
  private readonly BASS_MAX = 250;          // Bass (bass guitar, kick)
  private readonly LOW_MIDS_MIN = 250;
  private readonly LOW_MIDS_MAX = 500;      // Low mids (snare body, toms)
  private readonly MIDS_MIN = 500;
  private readonly MIDS_MAX = 2000;         // Mids (vocals, guitars)
  private readonly HIGH_MIDS_MIN = 2000;
  private readonly HIGH_MIDS_MAX = 4000;    // High mids (vocal clarity, guitars)
  private readonly PRESENCE_MIN = 4000;
  private readonly PRESENCE_MAX = 6000;     // Presence (vocal presence, cymbals)
  private readonly BRILLIANCE_MIN = 6000;
  private readonly BRILLIANCE_MAX = 12000;  // Brilliance (hi-hats, sparkle)
  private readonly AIR_MIN = 12000;
  private readonly AIR_MAX = 20000;         // Air (airiness, shimmer)

  private constructor() {}

  /**
   * Get the singleton instance of AudioEngine
   */
  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  /**
   * Initialize the audio context and nodes
   */
  public async initialize(): Promise<void> {
    if (this.audioContext) {
      return; // Already initialized
    }

    this.audioContext = new AudioContext();
    
    // Create AnalyserNode with fftSize 2048
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = this.FFT_SIZE;
    this.analyserNode.smoothingTimeConstant = 0.8;
    
    // Create PannerNode with HRTF model
    this.pannerNode = this.audioContext.createPanner();
    this.pannerNode.panningModel = 'HRTF';
    this.pannerNode.distanceModel = 'inverse';
    this.pannerNode.refDistance = 1;
    this.pannerNode.maxDistance = 10000;
    this.pannerNode.rolloffFactor = 1;
    this.pannerNode.coneInnerAngle = 360;
    this.pannerNode.coneOuterAngle = 0;
    this.pannerNode.coneOuterGain = 0;
    this.pannerNode.setPosition(0, 0, 0);

    // Create EQ filters
    this.bassFilter = this.audioContext.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 250;
    this.bassFilter.gain.value = 0;

    this.midFilter = this.audioContext.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 1000;
    this.midFilter.Q.value = 1;
    this.midFilter.gain.value = 0;

    this.highFilter = this.audioContext.createBiquadFilter();
    this.highFilter.type = 'highshelf';
    this.highFilter.frequency.value = 4000;
    this.highFilter.gain.value = 0;

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;

    // Initialize frequency data array
    this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

    // Connect nodes: source -> panner -> bass -> mid -> high -> analyser -> gain -> destination
    this.pannerNode.connect(this.bassFilter);
    this.bassFilter.connect(this.midFilter);
    this.midFilter.connect(this.highFilter);
    this.highFilter.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);

    // Start lerp animation loop
    this.startLerpLoop();
  }

  /**
   * Load an audio file
   */
  public async loadAudioFile(file: File): Promise<void> {
    if (!this.audioContext) {
      throw new Error('AudioEngine not initialized');
    }

    // Stop current playback
    this.stop();

    const arrayBuffer = await file.arrayBuffer();
    this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    this.pauseTime = 0;
  }

  /**
   * Play the loaded audio
   */
  public play(): void {
    if (!this.audioContext || !this.audioBuffer || !this.pannerNode) {
      return;
    }

    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    // Create new source node (they can only be used once)
    this.sourceNode = this.audioContext.createBufferSource();
    this.sourceNode.buffer = this.audioBuffer;
    this.sourceNode.connect(this.pannerNode);
    
    this.sourceNode.onended = () => {
      if (this.isPlaying) {
        this.isPlaying = false;
        this.pauseTime = 0;
      }
    };

    this.startTime = this.audioContext.currentTime - this.pauseTime;
    this.sourceNode.start(0, this.pauseTime);
    this.isPlaying = true;
  }

  /**
   * Pause the audio
   */
  public pause(): void {
    if (!this.audioContext || !this.sourceNode || !this.isPlaying) {
      return;
    }

    this.pauseTime = this.audioContext.currentTime - this.startTime;
    this.sourceNode.stop();
    this.sourceNode.disconnect();
    this.sourceNode = null;
    this.isPlaying = false;
  }

  /**
   * Stop the audio and reset position
   */
  public stop(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Source may already be stopped
      }
      this.sourceNode = null;
    }
    this.isPlaying = false;
    this.pauseTime = 0;
  }

  /**
   * Set the target position for lerp movement
   */
  public setPosition(x: number, y: number, z: number): void {
    const scaledX = x * this.movementSpeed;
    const scaledY = y * this.movementSpeed;
    const scaledZ = z * this.movementSpeed;

    if (this.isLerpEnabled) {
      this.targetPosition = { x: scaledX, y: scaledY, z: scaledZ };
    } else {
      this.currentPosition = { x: scaledX, y: scaledY, z: scaledZ };
      this.targetPosition = { x: scaledX, y: scaledY, z: scaledZ };
      if (this.pannerNode) {
        this.pannerNode.setPosition(scaledX, scaledY, scaledZ);
      }
    }
  }

  /**
   * Set position immediately without lerp
   */
  public setPositionImmediate(x: number, y: number, z: number): void {
    const scaledX = x * this.movementSpeed;
    const scaledY = y * this.movementSpeed;
    const scaledZ = z * this.movementSpeed;
    this.currentPosition = { x: scaledX, y: scaledY, z: scaledZ };
    this.targetPosition = { x: scaledX, y: scaledY, z: scaledZ };
    if (this.pannerNode) {
      this.pannerNode.setPosition(scaledX, scaledY, scaledZ);
    }
  }

  /**
   * Apply a preset position
   */
  public applyPreset(presetIndex: number): void {
    if (presetIndex >= 0 && presetIndex < SPATIAL_PRESETS.length) {
      const preset = SPATIAL_PRESETS[presetIndex];
      this.setPosition(preset.x, preset.y, preset.z);
    }
  }

  /**
   * Start the lerp animation loop
   */
  private startLerpLoop(): void {
    const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
    
    const updatePosition = () => {
      if (this.isLerpEnabled && this.pannerNode) {
        const dx = this.targetPosition.x - this.currentPosition.x;
        const dy = this.targetPosition.y - this.currentPosition.y;
        const dz = this.targetPosition.z - this.currentPosition.z;
        
        // Only update if there's significant difference
        if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001 || Math.abs(dz) > 0.001) {
          this.currentPosition.x = lerp(this.currentPosition.x, this.targetPosition.x, this.lerpSpeed);
          this.currentPosition.y = lerp(this.currentPosition.y, this.targetPosition.y, this.lerpSpeed);
          this.currentPosition.z = lerp(this.currentPosition.z, this.targetPosition.z, this.lerpSpeed);
          this.pannerNode.setPosition(this.currentPosition.x, this.currentPosition.y, this.currentPosition.z);
        }
      }
      requestAnimationFrame(updatePosition);
    };
    
    requestAnimationFrame(updatePosition);
  }

  /**
   * Set lerp speed (0.01 to 1, higher = faster)
   */
  public setLerpSpeed(speed: number): void {
    this.lerpSpeed = Math.max(0.01, Math.min(1, speed));
  }

  /**
   * Get current lerp speed
   */
  public getLerpSpeed(): number {
    return this.lerpSpeed;
  }

  /**
   * Enable or disable lerp
   */
  public setLerpEnabled(enabled: boolean): void {
    this.isLerpEnabled = enabled;
  }

  /**
   * Get lerp enabled state
   */
  public getLerpEnabled(): boolean {
    return this.isLerpEnabled;
  }

  /**
   * Set movement speed multiplier
   */
  public setMovementSpeed(speed: number): void {
    this.movementSpeed = Math.max(0.1, Math.min(5, speed));
  }

  /**
   * Get movement speed multiplier
   */
  public getMovementSpeed(): number {
    return this.movementSpeed;
  }

  /**
   * Get current position
   */
  public getCurrentPosition(): { x: number; y: number; z: number } {
    return { ...this.currentPosition };
  }

  /**
   * Set EQ bass gain (-12 to 12 dB)
   */
  public setBassGain(gain: number): void {
    if (this.bassFilter) {
      this.bassFilter.gain.value = Math.max(-12, Math.min(12, gain));
    }
  }

  /**
   * Set EQ mid gain (-12 to 12 dB)
   */
  public setMidGain(gain: number): void {
    if (this.midFilter) {
      this.midFilter.gain.value = Math.max(-12, Math.min(12, gain));
    }
  }

  /**
   * Set EQ high gain (-12 to 12 dB)
   */
  public setHighGain(gain: number): void {
    if (this.highFilter) {
      this.highFilter.gain.value = Math.max(-12, Math.min(12, gain));
    }
  }

  /**
   * Get current EQ settings
   */
  public getEQSettings(): { bass: number; mid: number; high: number } {
    return {
      bass: this.bassFilter?.gain.value || 0,
      mid: this.midFilter?.gain.value || 0,
      high: this.highFilter?.gain.value || 0,
    };
  }

  /**
   * Set master volume (0 to 1)
   */
  public setVolume(volume: number): void {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Get master volume
   */
  public getVolume(): number {
    return this.gainNode?.gain.value || 1;
  }

  /**
   * Get the raw frequency data from the analyser
   */
  public getFrequencyData(): Uint8Array<ArrayBuffer> {
    if (!this.analyserNode || !this.frequencyData) {
      return new Uint8Array(0);
    }
    
    this.analyserNode.getByteFrequencyData(this.frequencyData);
    return this.frequencyData;
  }

  /**
   * Convert frequency to bin index
   */
  private frequencyToBin(frequency: number): number {
    const sampleRate = this.audioContext?.sampleRate || this.SAMPLE_RATE;
    const binCount = this.analyserNode?.frequencyBinCount || this.FFT_SIZE / 2;
    const nyquist = sampleRate / 2;
    return Math.round((frequency / nyquist) * binCount);
  }

  /**
   * Calculate average level for a frequency range
   */
  private getAverageLevel(minFreq: number, maxFreq: number): number {
    if (!this.frequencyData || !this.analyserNode) {
      return 0;
    }

    this.analyserNode.getByteFrequencyData(this.frequencyData);

    const minBin = Math.max(0, this.frequencyToBin(minFreq));
    const maxBin = Math.min(this.frequencyData.length - 1, this.frequencyToBin(maxFreq));
    
    if (maxBin <= minBin) {
      return 0;
    }

    let sum = 0;
    for (let i = minBin; i <= maxBin; i++) {
      sum += this.frequencyData[i];
    }

    // Normalize to 0-100 range
    return (sum / (maxBin - minBin + 1) / 255) * 100;
  }

  /**
   * Get sub-bass level (20-60Hz) - Kick drums, bass drops
   */
  public getSubBassLevel(): number {
    return this.getAverageLevel(this.SUB_BASS_MIN, this.SUB_BASS_MAX);
  }

  /**
   * Get bass level (60-250Hz) - Bass guitar, kick drums
   */
  public getBassLevel(): number {
    return this.getAverageLevel(this.BASS_MIN, this.BASS_MAX);
  }

  /**
   * Get low-mids level (250-500Hz) - Snare body, toms
   */
  public getLowMidsLevel(): number {
    return this.getAverageLevel(this.LOW_MIDS_MIN, this.LOW_MIDS_MAX);
  }

  /**
   * Get mids level (500-2000Hz) - Vocals, guitars
   */
  public getMidsLevel(): number {
    return this.getAverageLevel(this.MIDS_MIN, this.MIDS_MAX);
  }

  /**
   * Get high-mids level (2000-4000Hz) - Vocal clarity, guitars
   */
  public getHighMidsLevel(): number {
    return this.getAverageLevel(this.HIGH_MIDS_MIN, this.HIGH_MIDS_MAX);
  }

  /**
   * Get presence level (4000-6000Hz) - Vocal presence, cymbals
   */
  public getPresenceLevel(): number {
    return this.getAverageLevel(this.PRESENCE_MIN, this.PRESENCE_MAX);
  }

  /**
   * Get brilliance level (6000-12000Hz) - Hi-hats, sparkle
   */
  public getBrillianceLevel(): number {
    return this.getAverageLevel(this.BRILLIANCE_MIN, this.BRILLIANCE_MAX);
  }

  /**
   * Get air level (12000-20000Hz) - Airiness, shimmer
   */
  public getAirLevel(): number {
    return this.getAverageLevel(this.AIR_MIN, this.AIR_MAX);
  }

  /**
   * Get highs level (combined 2000-20000Hz for backward compatibility)
   */
  public getHighsLevel(): number {
    return this.getAverageLevel(this.HIGH_MIDS_MIN, this.AIR_MAX);
  }

  /**
   * Get all frequency levels at once
   */
  public getAllFrequencyLevels(): {
    subBass: number;
    bass: number;
    lowMids: number;
    mids: number;
    highMids: number;
    presence: number;
    brilliance: number;
    air: number;
  } {
    // Get frequency data once for all calculations
    if (this.analyserNode && this.frequencyData) {
      this.analyserNode.getByteFrequencyData(this.frequencyData);
    }
    
    return {
      subBass: this.getSubBassLevel(),
      bass: this.getBassLevel(),
      lowMids: this.getLowMidsLevel(),
      mids: this.getMidsLevel(),
      highMids: this.getHighMidsLevel(),
      presence: this.getPresenceLevel(),
      brilliance: this.getBrillianceLevel(),
      air: this.getAirLevel(),
    };
  }

  /**
   * Check if audio is currently playing
   */
  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Check if an audio file is loaded
   */
  public hasAudioLoaded(): boolean {
    return this.audioBuffer !== null;
  }
}

export default AudioEngine;
