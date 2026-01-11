/**
 * Singleton AudioEngine class for spatial audio processing
 * Uses Web Audio API with HRTF panning model
 */

// Movement pattern types
export type PatternType = 'orbit' | 'pendulum' | 'figure8' | 'spiral' | 'wave' | 'bounce' | 'random';

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
  speed: number; // Cycles per second
  phase: number; // Starting phase offset (0-1)
}

// 30 Movement presets with unique orbiting patterns and sensations
export const MOVEMENT_PRESETS: MovementPreset[] = [
  // Ear whispers - gentle side to side
  { name: 'preset1', pattern: 'pendulum', centerX: 0, centerY: 1.65, centerZ: 0, radiusX: 0.2, radiusY: 0, radiusZ: 0, speed: 0.3, phase: 0 },
  // Slow neck orbit - sensual circular motion around neck
  { name: 'preset2', pattern: 'orbit', centerX: 0, centerY: 1.5, centerZ: 0, radiusX: 0.15, radiusY: 0, radiusZ: 0.15, speed: 0.2, phase: 0 },
  // Neck back and forth - intimate whisper pattern
  { name: 'preset3', pattern: 'pendulum', centerX: 0, centerY: 1.5, centerZ: 0, radiusX: 0, radiusY: 0, radiusZ: 0.25, speed: 0.25, phase: 0 },
  // Head orbit - full circle around head
  { name: 'preset4', pattern: 'orbit', centerX: 0, centerY: 1.7, centerZ: 0, radiusX: 0.3, radiusY: 0, radiusZ: 0.3, speed: 0.15, phase: 0 },
  // Ear to ear figure 8 - hypnotic pattern
  { name: 'preset5', pattern: 'figure8', centerX: 0, centerY: 1.65, centerZ: 0, radiusX: 0.2, radiusY: 0.05, radiusZ: 0.1, speed: 0.2, phase: 0 },
  // Shoulder caress - gentle shoulder movement
  { name: 'preset6', pattern: 'pendulum', centerX: 0, centerY: 1.4, centerZ: 0, radiusX: 0.4, radiusY: 0, radiusZ: 0, speed: 0.3, phase: 0 },
  // Spine descend - vertical wave down back
  { name: 'preset7', pattern: 'wave', centerX: 0, centerY: 1.2, centerZ: -0.2, radiusX: 0, radiusY: 0.4, radiusZ: 0, speed: 0.2, phase: 0 },
  // Intimate close orbit - very close ear whisper
  { name: 'preset8', pattern: 'orbit', centerX: 0, centerY: 1.65, centerZ: 0, radiusX: 0.08, radiusY: 0, radiusZ: 0.08, speed: 0.4, phase: 0 },
  // Wide head spiral - expanding/contracting
  { name: 'preset9', pattern: 'spiral', centerX: 0, centerY: 1.7, centerZ: 0, radiusX: 0.5, radiusY: 0, radiusZ: 0.5, speed: 0.1, phase: 0 },
  // Chest heart pattern - figure 8 over chest
  { name: 'preset10', pattern: 'figure8', centerX: 0, centerY: 1.2, centerZ: 0.15, radiusX: 0.2, radiusY: 0.15, radiusZ: 0, speed: 0.25, phase: 0 },
  // Fast ear switch - quick left-right
  { name: 'preset11', pattern: 'pendulum', centerX: 0, centerY: 1.65, centerZ: 0, radiusX: 0.18, radiusY: 0, radiusZ: 0, speed: 0.8, phase: 0 },
  // Slow dreamy orbit - relaxing wide circle
  { name: 'preset12', pattern: 'orbit', centerX: 0, centerY: 1.6, centerZ: 0, radiusX: 0.6, radiusY: 0.1, radiusZ: 0.6, speed: 0.08, phase: 0 },
  // Neck nuzzle - intimate neck focus
  { name: 'preset13', pattern: 'orbit', centerX: 0, centerY: 1.5, centerZ: 0.1, radiusX: 0.1, radiusY: 0.05, radiusZ: 0.1, speed: 0.35, phase: 0 },
  // Behind ear whisper - focused back of ear
  { name: 'preset14', pattern: 'pendulum', centerX: 0, centerY: 1.65, centerZ: -0.1, radiusX: 0.12, radiusY: 0, radiusZ: 0.05, speed: 0.3, phase: 0 },
  // Full body wave - top to bottom sensation
  { name: 'preset15', pattern: 'wave', centerX: 0, centerY: 1.0, centerZ: 0, radiusX: 0.2, radiusY: 0.8, radiusZ: 0, speed: 0.12, phase: 0 },
  // Diagonal cross - dynamic X pattern
  { name: 'preset16', pattern: 'figure8', centerX: 0, centerY: 1.5, centerZ: 0, radiusX: 0.4, radiusY: 0.3, radiusZ: 0, speed: 0.18, phase: 0.25 },
  // Random intimate - unpredictable close
  { name: 'preset17', pattern: 'random', centerX: 0, centerY: 1.6, centerZ: 0, radiusX: 0.15, radiusY: 0.1, radiusZ: 0.15, speed: 0.5, phase: 0 },
  // Collarbone trace - horizontal collarbone
  { name: 'preset18', pattern: 'pendulum', centerX: 0, centerY: 1.45, centerZ: 0.12, radiusX: 0.25, radiusY: 0, radiusZ: 0, speed: 0.22, phase: 0 },
  // Spiral descent - ear to shoulder spiral
  { name: 'preset19', pattern: 'spiral', centerX: 0, centerY: 1.55, centerZ: 0, radiusX: 0.2, radiusY: 0.15, radiusZ: 0.2, speed: 0.15, phase: 0 },
  // Bounce effect - gentle vertical bounce
  { name: 'preset20', pattern: 'bounce', centerX: 0, centerY: 1.6, centerZ: 0.1, radiusX: 0, radiusY: 0.15, radiusZ: 0, speed: 0.5, phase: 0 },
  // Wide panorama - cinema-like sweep
  { name: 'preset21', pattern: 'pendulum', centerX: 0, centerY: 1.5, centerZ: 0, radiusX: 1.5, radiusY: 0, radiusZ: 0, speed: 0.1, phase: 0 },
  // Intimate breath - very slow close
  { name: 'preset22', pattern: 'orbit', centerX: 0, centerY: 1.65, centerZ: 0.05, radiusX: 0.05, radiusY: 0.02, radiusZ: 0.05, speed: 0.15, phase: 0 },
  // Dynamic surround - full 3D movement
  { name: 'preset23', pattern: 'spiral', centerX: 0, centerY: 1.5, centerZ: 0, radiusX: 0.4, radiusY: 0.2, radiusZ: 0.4, speed: 0.2, phase: 0 },
  // Temple pulse - side of head focus
  { name: 'preset24', pattern: 'bounce', centerX: 0.15, centerY: 1.7, centerZ: 0, radiusX: 0.05, radiusY: 0, radiusZ: 0.08, speed: 0.6, phase: 0 },
  // Hypnotic slow - mesmerizing pace
  { name: 'preset25', pattern: 'orbit', centerX: 0, centerY: 1.65, centerZ: 0, radiusX: 0.25, radiusY: 0, radiusZ: 0.25, speed: 0.05, phase: 0 },
  // Energetic circle - fast exciting orbit
  { name: 'preset26', pattern: 'orbit', centerX: 0, centerY: 1.6, centerZ: 0, radiusX: 0.35, radiusY: 0, radiusZ: 0.35, speed: 0.6, phase: 0 },
  // Gentle rock - soothing pendulum
  { name: 'preset27', pattern: 'pendulum', centerX: 0, centerY: 1.55, centerZ: 0.1, radiusX: 0.15, radiusY: 0.05, radiusZ: 0, speed: 0.18, phase: 0 },
  // 3D figure 8 - complex immersive
  { name: 'preset28', pattern: 'figure8', centerX: 0, centerY: 1.6, centerZ: 0, radiusX: 0.3, radiusY: 0.1, radiusZ: 0.3, speed: 0.15, phase: 0 },
  // Close whisper circle - ASMR style
  { name: 'preset29', pattern: 'orbit', centerX: 0, centerY: 1.65, centerZ: 0.02, radiusX: 0.06, radiusY: 0, radiusZ: 0.06, speed: 0.25, phase: 0 },
  // Random surround - unpredictable full
  { name: 'preset30', pattern: 'random', centerX: 0, centerY: 1.5, centerZ: 0, radiusX: 0.5, radiusY: 0.2, radiusZ: 0.5, speed: 0.3, phase: 0 },
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
  private lastRandomUpdate: number = 0;
  private randomTarget = { x: 0, y: 0, z: 0 };

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
      this.randomTarget = { 
        x: preset.centerX, 
        y: preset.centerY, 
        z: preset.centerZ 
      };
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
   * Calculate position based on movement pattern
   */
  private calculatePatternPosition(preset: MovementPreset, time: number): { x: number; y: number; z: number } {
    const t = time * preset.speed * this.animationSpeed * Math.PI * 2;
    const phase = preset.phase * Math.PI * 2;
    
    let x = preset.centerX;
    let y = preset.centerY;
    let z = preset.centerZ;

    switch (preset.pattern) {
      case 'orbit': {
        // Circular orbit in XZ plane
        x += Math.cos(t + phase) * preset.radiusX;
        y += Math.sin(t * 0.5 + phase) * preset.radiusY;
        z += Math.sin(t + phase) * preset.radiusZ;
        break;
      }

      case 'pendulum': {
        // Swinging motion
        x += Math.sin(t + phase) * preset.radiusX;
        y += Math.sin(t * 2 + phase) * preset.radiusY * 0.5;
        z += Math.sin(t * 0.5 + phase) * preset.radiusZ;
        break;
      }

      case 'figure8': {
        // Figure-8 / infinity pattern
        x += Math.sin(t + phase) * preset.radiusX;
        y += Math.sin(t * 2 + phase) * preset.radiusY;
        z += Math.sin(t + phase) * Math.cos(t + phase) * preset.radiusZ * 2;
        break;
      }

      case 'spiral': {
        // Expanding/contracting spiral
        const spiralPhase = (Math.sin(t * 0.25 + phase) + 1) * 0.5; // 0 to 1
        x += Math.cos(t + phase) * preset.radiusX * spiralPhase;
        y += Math.sin(t * 0.5 + phase) * preset.radiusY;
        z += Math.sin(t + phase) * preset.radiusZ * spiralPhase;
        break;
      }

      case 'wave': {
        // Wave motion - smooth vertical movement with slight horizontal
        x += Math.sin(t * 0.5 + phase) * preset.radiusX;
        y += Math.sin(t + phase) * preset.radiusY;
        z += Math.cos(t * 0.3 + phase) * preset.radiusZ;
        break;
      }

      case 'bounce': {
        // Bouncing motion with ease
        const bounce = Math.abs(Math.sin(t + phase));
        x += Math.sin(t * 0.3 + phase) * preset.radiusX;
        y += bounce * preset.radiusY;
        z += Math.cos(t * 0.3 + phase) * preset.radiusZ;
        break;
      }

      case 'random': {
        // Smooth random movement
        const currentTime = performance.now();
        if (currentTime - this.lastRandomUpdate > 1000 / (preset.speed * this.animationSpeed)) {
          this.lastRandomUpdate = currentTime;
          const rand = () => (Math.random() - 0.5) * 2;
          this.randomTarget = {
            x: preset.centerX + rand() * preset.radiusX,
            y: preset.centerY + rand() * preset.radiusY,
            z: preset.centerZ + rand() * preset.radiusZ,
          };
        }
        // Smooth interpolation to random target
        const lerpVal = (a: number, b: number, factor: number) => a + (b - a) * factor;
        const smoothing = 0.05;
        x = lerpVal(this.currentPosition.x, this.randomTarget.x, smoothing);
        y = lerpVal(this.currentPosition.y, this.randomTarget.y, smoothing);
        z = lerpVal(this.currentPosition.z, this.randomTarget.z, smoothing);
        break;
      }

      default:
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
