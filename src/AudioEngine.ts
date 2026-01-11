/**
 * Singleton AudioEngine class for spatial audio processing
 * Uses Web Audio API with HRTF panning model
 */

// Movement pattern types for complex 360 orbiting
export type PatternType = 'fullOrbit360' | 'helixSpiral' | 'figure8Complex' | 'waveSurround' | 'chaosOrbit';

// Movement preset interface - animated spatial patterns
export interface MovementPreset {
  name: string;
  pattern: PatternType;
  centerX: number;
  centerY: number;
  centerZ: number;
  radiusX: number;
  radiusY: number;
  radiusZ: number;
  speed: number; // Cycles per second (lower = longer duration)
  phase: number; // Starting phase offset (0-1)
}

// 5 COMPLEX 360-DEGREE ORBITING PRESETS - Long-lasting, truly moving patterns
export const MOVEMENT_PRESETS: MovementPreset[] = [
  // PRESET 1: Full 360 Head Orbit - Complete circle around head, slow and immersive
  { name: 'preset1', pattern: 'fullOrbit360', centerX: 0, centerY: 1.65, centerZ: 0, radiusX: 0.8, radiusY: 0.3, radiusZ: 0.8, speed: 0.08, phase: 0 },
  
  // PRESET 2: Helix Spiral - Spiraling up and down while orbiting 360
  { name: 'preset2', pattern: 'helixSpiral', centerX: 0, centerY: 1.5, centerZ: 0, radiusX: 0.7, radiusY: 0.6, radiusZ: 0.7, speed: 0.06, phase: 0 },
  
  // PRESET 3: Complex Figure-8 - 3D figure-8 that covers full 360 space
  { name: 'preset3', pattern: 'figure8Complex', centerX: 0, centerY: 1.6, centerZ: 0, radiusX: 0.9, radiusY: 0.5, radiusZ: 0.9, speed: 0.05, phase: 0 },
  
  // PRESET 4: Wave Surround - Undulating wave that circles entire head/body
  { name: 'preset4', pattern: 'waveSurround', centerX: 0, centerY: 1.55, centerZ: 0, radiusX: 1.0, radiusY: 0.4, radiusZ: 1.0, speed: 0.07, phase: 0 },
  
  // PRESET 5: Chaos Orbit - Unpredictable but continuous 360 movement
  { name: 'preset5', pattern: 'chaosOrbit', centerX: 0, centerY: 1.6, centerZ: 0, radiusX: 0.85, radiusY: 0.5, radiusZ: 0.85, speed: 0.04, phase: 0 },
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

  // Movement animation system
  private activePreset: MovementPreset | null = null;
  private animationStartTime: number = 0;
  private isAnimating: boolean = false;
  private animationSpeed: number = 1; // Global speed multiplier

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
   * Apply a movement preset - starts animated movement pattern
   */
  public applyPreset(presetIndex: number): void {
    if (presetIndex >= 0 && presetIndex < MOVEMENT_PRESETS.length) {
      const preset = MOVEMENT_PRESETS[presetIndex];
      this.activePreset = preset;
      this.animationStartTime = performance.now();
      this.isAnimating = true;
    }
  }

  /**
   * Stop the current movement animation
   */
  public stopAnimation(): void {
    this.isAnimating = false;
    this.activePreset = null;
  }

  /**
   * Check if animation is active
   */
  public isAnimationActive(): boolean {
    return this.isAnimating;
  }

  /**
   * Get the active preset index
   */
  public getActivePresetIndex(): number {
    if (!this.activePreset) return -1;
    return MOVEMENT_PRESETS.findIndex(p => p.name === this.activePreset?.name);
  }

  /**
   * Set animation speed multiplier
   */
  public setAnimationSpeed(speed: number): void {
    this.animationSpeed = Math.max(0.1, Math.min(3, speed));
  }

  /**
   * Get animation speed multiplier
   */
  public getAnimationSpeed(): number {
    return this.animationSpeed;
  }

  /**
   * Calculate position based on movement pattern - 5 COMPLEX 360-DEGREE PATTERNS
   */
  private calculatePatternPosition(preset: MovementPreset, time: number): { x: number; y: number; z: number } {
    // Use raw time for smoother, longer-lasting movements
    const t = time * preset.speed * this.animationSpeed * Math.PI * 2;
    const phase = preset.phase * Math.PI * 2;
    
    let x = preset.centerX;
    let y = preset.centerY;
    let z = preset.centerZ;

    switch (preset.pattern) {
      case 'fullOrbit360': {
        // FULL 360 ORBIT - Complete smooth circle around the listener
        // Takes ~12 seconds for full rotation at default speed
        x += Math.cos(t + phase) * preset.radiusX;
        y += Math.sin(t * 0.3 + phase) * preset.radiusY; // Gentle vertical wave
        z += Math.sin(t + phase) * preset.radiusZ;
        break;
      }

      case 'helixSpiral': {
        // HELIX SPIRAL - Continuous spiral that goes up and down while orbiting
        // Creates a corkscrew motion around the head
        const helixProgress = (Math.sin(t * 0.2 + phase) + 1) * 0.5; // 0 to 1 slowly
        x += Math.cos(t + phase) * preset.radiusX;
        y += (helixProgress - 0.5) * preset.radiusY * 2; // Up and down
        z += Math.sin(t + phase) * preset.radiusZ;
        // Add slight radius variation for more organic feel
        const radiusVar = 0.8 + Math.sin(t * 0.5) * 0.2;
        x *= radiusVar;
        z *= radiusVar;
        break;
      }

      case 'figure8Complex': {
        // COMPLEX FIGURE-8 - 3D infinity pattern that covers full 360 space
        // Crosses in front and behind, above and below
        x += Math.sin(t + phase) * preset.radiusX;
        y += Math.sin(t * 2 + phase) * preset.radiusY;
        // The key: z oscillates at different rate creating the figure-8 in 3D
        z += Math.sin(t * 2 + phase) * Math.cos(t + phase) * preset.radiusZ;
        // Add extra rotation for full coverage
        const rotAngle = t * 0.1;
        const newX = x * Math.cos(rotAngle) - z * Math.sin(rotAngle);
        const newZ = x * Math.sin(rotAngle) + z * Math.cos(rotAngle);
        x = newX;
        z = newZ;
        break;
      }

      case 'waveSurround': {
        // WAVE SURROUND - Undulating wave that circles the entire head/body
        // Like being inside a rolling wave that goes all around
        const wavePhase = t + phase;
        const waveHeight = Math.sin(wavePhase * 3) * 0.3 + 1; // Wave amplitude
        x += Math.cos(wavePhase) * preset.radiusX * waveHeight;
        y += Math.sin(wavePhase * 2) * preset.radiusY;
        z += Math.sin(wavePhase) * preset.radiusZ * waveHeight;
        // Add secondary wave for complexity
        x += Math.cos(wavePhase * 1.5 + 1) * preset.radiusX * 0.2;
        z += Math.sin(wavePhase * 1.5 + 1) * preset.radiusZ * 0.2;
        break;
      }

      case 'chaosOrbit': {
        // CHAOS ORBIT - Unpredictable but still continuous 360 movement
        // Multiple overlapping orbital frequencies
        const chaos1 = Math.sin(t * 1.0 + phase);
        const chaos2 = Math.sin(t * 0.7 + phase * 1.3);
        const chaos3 = Math.cos(t * 0.5 + phase * 0.8);
        const chaos4 = Math.cos(t * 1.3 + phase * 0.5);
        
        // Primary orbit
        x += Math.cos(t + phase) * preset.radiusX * 0.6;
        z += Math.sin(t + phase) * preset.radiusZ * 0.6;
        
        // Add chaotic variations
        x += (chaos1 * 0.3 + chaos2 * 0.2) * preset.radiusX;
        y += (chaos3 * 0.5 + chaos4 * 0.3) * preset.radiusY;
        z += (chaos2 * 0.3 + chaos3 * 0.2) * preset.radiusZ;
        break;
      }

      default:
        // Fallback to simple orbit
        x += Math.cos(t + phase) * preset.radiusX;
        z += Math.sin(t + phase) * preset.radiusZ;
        break;
    }

    return { x, y, z };
  }

  /**
   * Start the lerp animation loop
   */
  private startLerpLoop(): void {
    const lerp = (start: number, end: number, t: number) => start + (end - start) * t;
    
    const updatePosition = () => {
      // Handle movement preset animation
      if (this.isAnimating && this.activePreset && this.pannerNode) {
        const elapsedTime = (performance.now() - this.animationStartTime) / 1000;
        const newPos = this.calculatePatternPosition(this.activePreset, elapsedTime);
        
        // Apply movement speed multiplier to horizontal axes only
        // Y-axis (vertical) is not scaled to maintain realistic head-level audio
        this.currentPosition.x = newPos.x * this.movementSpeed;
        this.currentPosition.y = newPos.y;
        this.currentPosition.z = newPos.z * this.movementSpeed;
        
        this.pannerNode.setPosition(this.currentPosition.x, this.currentPosition.y, this.currentPosition.z);
      }
      // Handle manual position lerp (when not animating)
      else if (this.isLerpEnabled && this.pannerNode && !this.isAnimating) {
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
