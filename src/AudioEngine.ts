/**
 * Singleton AudioEngine class for spatial audio processing
 * Uses Web Audio API with HRTF panning model
 */
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

  // Frequency band ranges
  private readonly SAMPLE_RATE = 44100;
  private readonly FFT_SIZE = 2048;
  private readonly BASS_MAX_FREQ = 250;
  private readonly MIDS_MIN_FREQ = 250;
  private readonly MIDS_MAX_FREQ = 2000;
  private readonly HIGHS_MIN_FREQ = 2000;
  private readonly HIGHS_MAX_FREQ = 20000;

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

    // Create gain node for volume control
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = 1;

    // Initialize frequency data array
    this.frequencyData = new Uint8Array(this.analyserNode.frequencyBinCount);

    // Connect nodes: source -> panner -> analyser -> gain -> destination
    this.pannerNode.connect(this.analyserNode);
    this.analyserNode.connect(this.gainNode);
    this.gainNode.connect(this.audioContext.destination);
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
   * Set the position of the audio source in 3D space
   */
  public setPosition(x: number, y: number, z: number): void {
    if (this.pannerNode) {
      this.pannerNode.setPosition(x, y, z);
    }
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
   * Get bass level (0-250Hz)
   */
  public getBassLevel(): number {
    return this.getAverageLevel(0, this.BASS_MAX_FREQ);
  }

  /**
   * Get mids level (250-2000Hz)
   */
  public getMidsLevel(): number {
    return this.getAverageLevel(this.MIDS_MIN_FREQ, this.MIDS_MAX_FREQ);
  }

  /**
   * Get highs level (2000-20000Hz)
   */
  public getHighsLevel(): number {
    return this.getAverageLevel(this.HIGHS_MIN_FREQ, this.HIGHS_MAX_FREQ);
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
