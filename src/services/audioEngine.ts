import { SoundSynthesizer } from './soundSynthesizer';

export interface VUMeterData {
  deckA: number;
  deckB: number;
  master: number;
}

export class AudioEngine {
  private ctx: AudioContext | null = null;
  public synthesizer: SoundSynthesizer | null = null;

  // Deck A audio elements & nodes
  public audioA: HTMLAudioElement;
  private sourceA: MediaElementAudioSourceNode | null = null;
  private eqLowA: BiquadFilterNode | null = null;
  private eqMidA: BiquadFilterNode | null = null;
  private eqHighA: BiquadFilterNode | null = null;
  private gainA: GainNode | null = null;
  private crossGainA: GainNode | null = null;
  private analyserA: AnalyserNode | null = null;

  // Deck B audio elements & nodes
  public audioB: HTMLAudioElement;
  private sourceB: MediaElementAudioSourceNode | null = null;
  private eqLowB: BiquadFilterNode | null = null;
  private eqMidB: BiquadFilterNode | null = null;
  private eqHighB: BiquadFilterNode | null = null;
  private gainB: GainNode | null = null;
  private crossGainB: GainNode | null = null;
  private analyserB: AnalyserNode | null = null;

  // Soundpads sub-mix
  private soundpadsBus: GainNode | null = null;
  private activePadControllers: Map<string, { stop: () => void }> = new Map();

  // Master bus
  private duckingGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private masterAnalyser: AnalyserNode | null = null;

  // State
  private crossfaderPosition = 0; // -1 (A) to 1 (B)
  private isMuted = false;
  private masterVolume = 0.9;
  public isDucking = false;
  private duckingLevel = 0.25; // drop background to 25%

  // Animation frame for VU meters
  private vuAnimFrame: number | null = null;
  private vuListeners: Set<(data: VUMeterData) => void> = new Set();
  private timeListeners: Set<(deck: 'A' | 'B', current: number, duration: number) => void> = new Set();
  private endListeners: Set<(deck: 'A' | 'B') => void> = new Set();
  private playStateListeners: Set<(deck: 'A' | 'B', isPlaying: boolean) => void> = new Set();

  constructor() {
    this.audioA = new Audio();
    this.audioB = new Audio();
    this.audioA.volume = 1.0;
    this.audioB.volume = 1.0;

    this.setupAudioListeners('A', this.audioA);
    this.setupAudioListeners('B', this.audioB);
  }

  // Ensure AudioContext is initialized on user gesture
  public ensureContext(): AudioContext {
    if (!this.ctx) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.synthesizer = new SoundSynthesizer(this.ctx);
      this.buildAudioGraph();
      this.startVUMeterLoop();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(console.warn);
    }
    return this.ctx;
  }

  public async resumeContext(): Promise<void> {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (err) {
        console.warn('AudioContext resume failed:', err);
      }
    }
  }

  private buildAudioGraph() {
    if (!this.ctx) return;

    // Master nodes
    this.duckingGain = this.ctx.createGain();
    this.duckingGain.gain.value = 1.0;

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.masterVolume;

    this.masterAnalyser = this.ctx.createAnalyser();
    this.masterAnalyser.fftSize = 256;

    this.duckingGain.connect(this.masterGain);
    this.masterGain.connect(this.masterAnalyser);
    this.masterAnalyser.connect(this.ctx.destination);

    // Soundpads Bus (goes straight to Master, not ducked by itself)
    this.soundpadsBus = this.ctx.createGain();
    this.soundpadsBus.gain.value = 1.0;
    this.soundpadsBus.connect(this.masterGain);

    // Deck A Graph
    this.sourceA = this.ctx.createMediaElementSource(this.audioA);
    this.eqLowA = this.ctx.createBiquadFilter();
    this.eqLowA.type = 'lowshelf';
    this.eqLowA.frequency.value = 250;

    this.eqMidA = this.ctx.createBiquadFilter();
    this.eqMidA.type = 'peaking';
    this.eqMidA.frequency.value = 1200;
    this.eqMidA.Q.value = 1.0;

    this.eqHighA = this.ctx.createBiquadFilter();
    this.eqHighA.type = 'highshelf';
    this.eqHighA.frequency.value = 4000;

    this.gainA = this.ctx.createGain();
    this.gainA.gain.value = 1.0;
    this.crossGainA = this.ctx.createGain();
    this.analyserA = this.ctx.createAnalyser();
    this.analyserA.fftSize = 256;

    this.sourceA.connect(this.eqLowA);
    this.eqLowA.connect(this.eqMidA);
    this.eqMidA.connect(this.eqHighA);
    this.eqHighA.connect(this.gainA);
    this.gainA.connect(this.crossGainA);
    this.crossGainA.connect(this.analyserA);
    this.analyserA.connect(this.duckingGain); // Ducking acts on Deck A & B

    // Deck B Graph
    this.sourceB = this.ctx.createMediaElementSource(this.audioB);
    this.eqLowB = this.ctx.createBiquadFilter();
    this.eqLowB.type = 'lowshelf';
    this.eqLowB.frequency.value = 250;

    this.eqMidB = this.ctx.createBiquadFilter();
    this.eqMidB.type = 'peaking';
    this.eqMidB.frequency.value = 1200;
    this.eqMidB.Q.value = 1.0;

    this.eqHighB = this.ctx.createBiquadFilter();
    this.eqHighB.type = 'highshelf';
    this.eqHighB.frequency.value = 4000;

    this.gainB = this.ctx.createGain();
    this.gainB.gain.value = 1.0;
    this.crossGainB = this.ctx.createGain();
    this.analyserB = this.ctx.createAnalyser();
    this.analyserB.fftSize = 256;

    this.sourceB.connect(this.eqLowB);
    this.eqLowB.connect(this.eqMidB);
    this.eqMidB.connect(this.eqHighB);
    this.eqHighB.connect(this.gainB);
    this.gainB.connect(this.crossGainB);
    this.crossGainB.connect(this.analyserB);
    this.analyserB.connect(this.duckingGain);

    this.updateCrossfaderGains();
  }

  private setupAudioListeners(deck: 'A' | 'B', audio: HTMLAudioElement) {
    audio.addEventListener('timeupdate', () => {
      this.timeListeners.forEach(fn => fn(deck, audio.currentTime, audio.duration || 0));
    });
    audio.addEventListener('play', () => {
      this.playStateListeners.forEach(fn => fn(deck, true));
    });
    audio.addEventListener('pause', () => {
      this.playStateListeners.forEach(fn => fn(deck, false));
    });
    audio.addEventListener('ended', () => {
      this.playStateListeners.forEach(fn => fn(deck, false));
      this.endListeners.forEach(fn => fn(deck));
    });
    audio.addEventListener('error', (e) => {
      console.error(`Deck ${deck} Media element error:`, audio.error, e);
    });
  }

  // Load a track URL into Deck
  public async loadTrack(deck: 'A' | 'B', url: string, autoplay = false): Promise<boolean> {
    await this.resumeContext();
    const audio = deck === 'A' ? this.audioA : this.audioB;
    
    // Only apply anonymous CORS if remote http(s), avoid on blob/data urls which cause errors
    if (url.startsWith('http://') || url.startsWith('https://')) {
      audio.crossOrigin = 'anonymous';
    } else {
      audio.removeAttribute('crossorigin');
    }

    audio.src = url;
    audio.currentTime = 0;

    if (autoplay) {
      return this.play(deck);
    }
    return true;
  }

  public async play(deck: 'A' | 'B'): Promise<boolean> {
    await this.resumeContext();
    const audio = deck === 'A' ? this.audioA : this.audioB;
    
    // Restart if at or near end
    if (audio.duration && audio.currentTime >= audio.duration - 0.2) {
      audio.currentTime = 0;
    }

    try {
      await audio.play();
      return true;
    } catch (err) {
      console.error(`Error playing deck ${deck}:`, err);
      return false;
    }
  }

  public pause(deck: 'A' | 'B') {
    const audio = deck === 'A' ? this.audioA : this.audioB;
    audio.pause();
  }

  public stop(deck: 'A' | 'B') {
    const audio = deck === 'A' ? this.audioA : this.audioB;
    audio.pause();
    audio.currentTime = 0;
  }

  public seek(deck: 'A' | 'B', seconds: number) {
    const audio = deck === 'A' ? this.audioA : this.audioB;
    audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || 0));
  }

  public setLoop(deck: 'A' | 'B', loop: boolean) {
    const audio = deck === 'A' ? this.audioA : this.audioB;
    audio.loop = loop;
  }

  public setPitch(deck: 'A' | 'B', pitch: number) {
    const audio = deck === 'A' ? this.audioA : this.audioB;
    audio.playbackRate = Math.max(0.5, Math.min(2.0, pitch));
  }

  public setDeckVolume(deck: 'A' | 'B', volume: number) {
    this.ensureContext();
    const gainNode = deck === 'A' ? this.gainA : this.gainB;
    if (gainNode && this.ctx) {
      gainNode.gain.setValueAtTime(Math.max(0, Math.min(1.5, volume)), this.ctx.currentTime);
    }
  }

  public setEQ(deck: 'A' | 'B', low: number, mid: number, high: number) {
    this.ensureContext();
    const lowNode = deck === 'A' ? this.eqLowA : this.eqLowB;
    const midNode = deck === 'A' ? this.eqMidA : this.eqMidB;
    const highNode = deck === 'A' ? this.eqHighA : this.eqHighB;
    if (lowNode && midNode && highNode && this.ctx) {
      lowNode.gain.setValueAtTime(low, this.ctx.currentTime);
      midNode.gain.setValueAtTime(mid, this.ctx.currentTime);
      highNode.gain.setValueAtTime(high, this.ctx.currentTime);
    }
  }

  // Crossfader: value from -1 (Full Deck A) to 1 (Full Deck B)
  public setCrossfader(val: number) {
    this.crossfaderPosition = Math.max(-1, Math.min(1, val));
    this.updateCrossfaderGains();
  }

  private updateCrossfaderGains() {
    if (!this.crossGainA || !this.crossGainB || !this.ctx) return;
    const now = this.ctx.currentTime;
    // Equal power curve
    const x = (this.crossfaderPosition + 1) / 2; // 0 to 1
    const gainAVal = Math.cos(x * 0.5 * Math.PI);
    const gainBVal = Math.sin(x * 0.5 * Math.PI);

    this.crossGainA.gain.setTargetAtTime(gainAVal, now, 0.02);
    this.crossGainB.gain.setTargetAtTime(gainBVal, now, 0.02);
  }

  // Auto transition crossfader over duration seconds
  public autoCrossfade(targetDeck: 'A' | 'B', duration = 3): Promise<void> {
    return new Promise(resolve => {
      const startX = this.crossfaderPosition;
      const targetX = targetDeck === 'A' ? -1 : 1;
      const startTime = performance.now();
      const durMs = duration * 1000;

      const step = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(1, elapsed / durMs);
        // Smooth easing
        const eased = progress < 0.5 
          ? 2 * progress * progress 
          : -1 + (4 - 2 * progress) * progress;
        const currentX = startX + (targetX - startX) * eased;
        this.setCrossfader(currentX);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          this.setCrossfader(targetX);
          resolve();
        }
      };
      requestAnimationFrame(step);
    });
  }

  // Smooth Fade Out of a Deck
  public fadeOutDeck(deck: 'A' | 'B', duration = 2): Promise<void> {
    this.ensureContext();
    return new Promise(resolve => {
      const gainNode = deck === 'A' ? this.gainA : this.gainB;
      const audio = deck === 'A' ? this.audioA : this.audioB;
      if (!gainNode || !this.ctx) {
        audio.pause();
        return resolve();
      }

      const now = this.ctx.currentTime;
      const currentGain = gainNode.gain.value;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(currentGain, now);
      gainNode.gain.linearRampToValueAtTime(0.0001, now + duration);

      setTimeout(() => {
        audio.pause();
        gainNode.gain.setValueAtTime(currentGain, this.ctx!.currentTime);
        resolve();
      }, duration * 1000);
    });
  }

  // Emergency Fade Out All: Fade Deck A & Deck B down smoothly in duration seconds
  public fadeOutAll(duration = 2): Promise<void> {
    return Promise.all([
      this.fadeOutDeck('A', duration),
      this.fadeOutDeck('B', duration)
    ]).then(() => {});
  }

  // Master Volume
  public setMasterVolume(vol: number) {
    this.masterVolume = Math.max(0, Math.min(1.5, vol));
    if (this.masterGain && this.ctx && !this.isMuted) {
      this.masterGain.gain.setValueAtTime(this.masterVolume, this.ctx.currentTime);
    }
  }

  // Master Mute
  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      const target = this.isMuted ? 0 : this.masterVolume;
      this.masterGain.gain.setValueAtTime(target, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  // MC Ducking toggle: lowers background music by duckingLevel
  public setDucking(active: boolean) {
    this.isDucking = active;
    if (this.duckingGain && this.ctx) {
      const targetGain = active ? this.duckingLevel : 1.0;
      this.duckingGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.08);
    }
  }

  // Set Ducking ratio level (e.g. 0.25 means background volume drops to 25%, i.e. -75%)
  public setDuckingLevel(level: number) {
    this.duckingLevel = Math.max(0.01, Math.min(1.0, level));
    if (this.isDucking && this.duckingGain && this.ctx) {
      this.duckingGain.gain.setTargetAtTime(this.duckingLevel, this.ctx.currentTime, 0.05);
    }
  }

  public getDuckingLevel(): number {
    return this.duckingLevel;
  }

  // Active Soundpad controllers map (padId -> stop function)
  private activePadControllers: Map<string, { stop: () => void }> = new Map();

  // Check if a specific Soundpad is currently playing
  public isPadPlaying(padId: string): boolean {
    return this.activePadControllers.has(padId);
  }

  // Stop a specific Soundpad immediately
  public stopSoundpad(padId: string): boolean {
    const ctrl = this.activePadControllers.get(padId);
    if (ctrl) {
      ctrl.stop();
      this.activePadControllers.delete(padId);
      if (this.activePadControllers.size === 0) {
        this.setDucking(false);
      }
      return true;
    }
    return false;
  }

  // Stop all currently playing Soundpads
  public stopAllSoundpads(): void {
    this.activePadControllers.forEach((ctrl) => {
      try {
        ctrl.stop();
      } catch {}
    });
    this.activePadControllers.clear();
    this.setDucking(false);
  }

  // Trigger Soundpad (Toggle play/stop: 1st press plays, 2nd press stops)
  public playSoundpad(
    padId: string,
    soundType: 'builtin' | 'custom',
    identifier: string,
    volume = 0.9,
    ducking = false,
    onEnded?: () => void
  ): boolean {
    this.ensureContext();
    if (!this.ctx || !this.soundpadsBus) return false;

    // TOGGLE: If this pad is already playing, stop it!
    if (this.isPadPlaying(padId)) {
      this.stopSoundpad(padId);
      onEnded?.();
      return false; // stopped
    }

    if (ducking) {
      this.setDucking(true);
    }

    const padGain = this.ctx.createGain();
    padGain.gain.value = volume;
    padGain.connect(this.soundpadsBus);

    let stopFn = () => {
      if (this.ctx) {
        padGain.gain.setValueAtTime(padGain.gain.value, this.ctx.currentTime);
        padGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.05);
      }
      setTimeout(() => {
        try {
          padGain.disconnect();
        } catch {}
      }, 60);
    };

    if (soundType === 'builtin' && this.synthesizer) {
      let durationMs = 3000;
      switch (identifier) {
        case 'applause':
          this.synthesizer.playApplause(padGain, volume);
          durationMs = 4500;
          break;
        case 'drumroll':
          this.synthesizer.playDrumroll(padGain, volume);
          durationMs = 4200;
          break;
        case 'fanfare':
          this.synthesizer.playFanfare(padGain, volume);
          durationMs = 3500;
          break;
        case 'countdown':
          this.synthesizer.playCountdown(padGain, volume);
          durationMs = 5500;
          break;
        case 'correct':
          this.synthesizer.playCorrect(padGain, volume);
          durationMs = 900;
          break;
        case 'wrong':
          this.synthesizer.playWrong(padGain, volume);
          durationMs = 700;
          break;
        case 'jackpot':
          this.synthesizer.playJackpot(padGain, volume);
          durationMs = 3200;
          break;
        case 'gong':
          this.synthesizer.playGong(padGain, volume);
          durationMs = 3500;
          break;
        default:
          this.synthesizer.playFanfare(padGain, volume);
          durationMs = 3500;
      }

      const timerId = setTimeout(() => {
        this.activePadControllers.delete(padId);
        if (this.activePadControllers.size === 0 && ducking) {
          this.setDucking(false);
        }
        onEnded?.();
      }, durationMs);

      const origStop = stopFn;
      stopFn = () => {
        clearTimeout(timerId);
        origStop();
        onEnded?.();
      };
    } else if (soundType === 'custom' && identifier) {
      // One-shot HTMLAudioElement connected to soundpads bus
      const soundAudio = new Audio(identifier);
      if (identifier.startsWith('http://') || identifier.startsWith('https://')) {
        soundAudio.crossOrigin = 'anonymous';
      }
      const node = this.ctx.createMediaElementSource(soundAudio);
      node.connect(padGain);

      soundAudio.play().catch(console.error);

      soundAudio.addEventListener('ended', () => {
        this.activePadControllers.delete(padId);
        if (this.activePadControllers.size === 0 && ducking) {
          this.setDucking(false);
        }
        onEnded?.();
      });

      stopFn = () => {
        soundAudio.pause();
        soundAudio.currentTime = 0;
        try {
          padGain.disconnect();
        } catch {}
        onEnded?.();
      };
    }

    this.activePadControllers.set(padId, { stop: stopFn });
    return true; // started playing
  }

  // VU Meter Loop
  private startVUMeterLoop() {
    const dataArrayA = new Uint8Array(128);
    const dataArrayB = new Uint8Array(128);
    const dataArrayMaster = new Uint8Array(128);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calcRMS = (analyser: AnalyserNode | null, arr: any): number => {
      if (!analyser) return 0;
      analyser.getByteTimeDomainData(arr);
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        const val = (arr[i] - 128) / 128;
        sum += val * val;
      }
      const rms = Math.sqrt(sum / arr.length);
      return Math.min(1, rms * 3.5); // Scaled for visible lively LED meter
    };

    const updateVU = () => {
      if (this.ctx && this.ctx.state === 'running') {
        const vuA = calcRMS(this.analyserA, dataArrayA);
        const vuB = calcRMS(this.analyserB, dataArrayB);
        const vuM = calcRMS(this.masterAnalyser, dataArrayMaster);

        const data: VUMeterData = {
          deckA: vuA,
          deckB: vuB,
          master: vuM
        };

        this.vuListeners.forEach(fn => fn(data));
      }
      this.vuAnimFrame = requestAnimationFrame(updateVU);
    };

    updateVU();
  }

  // Subscriptions
  public onVU(callback: (data: VUMeterData) => void) {
    this.vuListeners.add(callback);
    return () => this.vuListeners.delete(callback);
  }

  public onTime(callback: (deck: 'A' | 'B', current: number, duration: number) => void) {
    this.timeListeners.add(callback);
    return () => this.timeListeners.delete(callback);
  }

  public onPlayState(callback: (deck: 'A' | 'B', isPlaying: boolean) => void) {
    this.playStateListeners.add(callback);
    return () => this.playStateListeners.delete(callback);
  }

  public onEnded(callback: (deck: 'A' | 'B') => void) {
    this.endListeners.add(callback);
    return () => this.endListeners.delete(callback);
  }

  public destroy() {
    if (this.vuAnimFrame) cancelAnimationFrame(this.vuAnimFrame);
    if (this.ctx) this.ctx.close();
    this.audioA.pause();
    this.audioB.pause();
  }
}

export const audioEngine = new AudioEngine();
