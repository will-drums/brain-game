/**
 * Procedural Web Audio synthesizer for Sylvan Synapse.
 * Generates cozy kalimba/marimba harmonic chimes, gentle rain/breeze pink-noise soundscape,
 * 0.1 Hz resonance breath swells, UFOV lock-on bells, and soft dissonance warnings.
 */

import {
  getSanctuaryAtmosphereConfig,
  type ChimeSymbol,
  type SanctuaryAtmosphereId,
} from './rules';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private binauralGain: GainNode | null = null;
  private noiseGain: GainNode | null = null;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private noiseFilter: BiquadFilterNode | null = null;
  private noiseLfo: OscillatorNode | null = null;
  private noiseLfoGain: GainNode | null = null;
  private isAmbientRunning: boolean = false;
  private isBinauralEnabled: boolean = true;
  private currentAtmosphere: SanctuaryAtmosphereId = 'forest';

  private getContext(): AudioContext | null {
    if (this.isMuted) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getAtmosphere(): SanctuaryAtmosphereId {
    return this.currentAtmosphere;
  }

  public setAtmosphere(atmosphereId: SanctuaryAtmosphereId, playPreviewCue = true): SanctuaryAtmosphereId {
    this.currentAtmosphere = atmosphereId;
    const cfg = getSanctuaryAtmosphereConfig(atmosphereId);

    if (!this.isMuted && playPreviewCue && !this.isAmbientRunning) {
      this.startAmbientSanctuary();
    }

    if (this.ctx && this.isAmbientRunning) {
      const now = this.ctx.currentTime;
      try {
        if (this.droneOsc1) {
          this.droneOsc1.frequency.setTargetAtTime(cfg.droneRootHz, now, 0.25);
        }
        if (this.droneOsc2) {
          this.droneOsc2.frequency.setTargetAtTime(cfg.droneFifthHz, now, 0.25);
        }
        if (this.noiseFilter) {
          this.noiseFilter.type = cfg.noiseFilterType;
          this.noiseFilter.frequency.setTargetAtTime(cfg.noiseCenterHz, now, 0.25);
          this.noiseFilter.Q.setTargetAtTime(cfg.noiseQ, now, 0.25);
        }
        if (this.noiseLfo) {
          this.noiseLfo.frequency.setTargetAtTime(cfg.lfoRateHz, now, 0.25);
        }
        if (this.noiseLfoGain) {
          this.noiseLfoGain.gain.setTargetAtTime(cfg.lfoDepthHz, now, 0.25);
        }
        if (this.noiseGain) {
          this.noiseGain.gain.setTargetAtTime(this.isMuted ? 0 : cfg.noiseGain, now, 0.25);
        }
      } catch {
        // Ignore audio scheduling errors in headless environments
      }
    }

    if (!this.isMuted && playPreviewCue) {
      this.playAtmospherePreview(cfg.previewNotesHz, atmosphereId);
    }

    return this.currentAtmosphere;
  }

  private playAtmospherePreview(notes: number[], atmosphereId: SanctuaryAtmosphereId) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = atmosphereId === 'rain' ? 'sine' : idx % 2 === 0 ? 'sine' : 'triangle';
        const start = now + idx * (atmosphereId === 'rain' ? 0.055 : 0.075);
        const dur = atmosphereId === 'meadow' ? 0.42 : 0.34;

        osc.frequency.setValueAtTime(freq, start);
        if (atmosphereId === 'rain') {
          osc.frequency.exponentialRampToValueAtTime(freq * 0.96, start + dur);
        }

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.065, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + dur + 0.03);
      });
    } catch {
      // Ignore
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    const cfg = getSanctuaryAtmosphereConfig(this.currentAtmosphere);
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.035, this.ctx.currentTime, 0.15);
    }
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setTargetAtTime(muted ? 0 : cfg.noiseGain, this.ctx.currentTime, 0.15);
    }
    if (this.binauralGain && this.ctx) {
      this.binauralGain.gain.setTargetAtTime(
        muted || !this.isBinauralEnabled ? 0 : 0.016,
        this.ctx.currentTime,
        0.15
      );
    }
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    if (!this.isMuted) {
      this.playLightNote(528, 0.12);
    }
    return this.isMuted;
  }

  public getBinauralEnabled(): boolean {
    return this.isBinauralEnabled;
  }

  public toggleBinauralEntrainment(): boolean {
    this.isBinauralEnabled = !this.isBinauralEnabled;
    if (this.binauralGain && this.ctx) {
      this.binauralGain.gain.setTargetAtTime(
        !this.isMuted && this.isBinauralEnabled ? 0.016 : 0,
        this.ctx.currentTime,
        0.2
      );
    }
    if (!this.isMuted && this.isBinauralEnabled) {
      this.playLightNote(432, 0.18);
    }
    return this.isBinauralEnabled;
  }

  public startAmbientSanctuary() {
    if (this.isMuted || this.isAmbientRunning) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const cfg = getSanctuaryAtmosphereConfig(this.currentAtmosphere);

      // 1. Soft warm pad drone tuned to active Sanctuary Atmosphere
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = cfg.droneRootHz;
      osc2.type = 'triangle';
      osc2.frequency.value = cfg.droneFifthHz;

      filter.type = 'lowpass';
      filter.frequency.value = 340;

      gain.gain.value = this.isMuted ? 0 : 0.035;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      // 2. Procedural Pink-Noise Texture Generator (Forest Wind / Rain Patter / Meadow Breeze)
      const bufferDurationSec = 3;
      const sampleRate = ctx.sampleRate || 44100;
      const bufferSize = sampleRate * bufferDurationSec;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, sampleRate);
      const output = noiseBuffer.getChannelData(0);
      // Paul Kellet's refined pink-noise filter approximation
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = noiseBuffer;
      noiseSource.loop = true;

      const nFilter = ctx.createBiquadFilter();
      nFilter.type = cfg.noiseFilterType;
      nFilter.frequency.value = cfg.noiseCenterHz;
      nFilter.Q.value = cfg.noiseQ;

      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.type = 'sine';
      lfo.frequency.value = cfg.lfoRateHz;
      lfoGain.gain.value = cfg.lfoDepthHz;
      lfo.connect(lfoGain);
      lfoGain.connect(nFilter.frequency);

      const nGain = ctx.createGain();
      nGain.gain.value = this.isMuted ? 0 : cfg.noiseGain;

      noiseSource.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(ctx.destination);

      noiseSource.start();
      lfo.start();

      // 3. 10 Hz Alpha Binaural Entrainment Pair (200 Hz Left Ear / 210 Hz Right Ear)
      const leftOsc = ctx.createOscillator();
      const rightOsc = ctx.createOscillator();
      const bGain = ctx.createGain();
      leftOsc.type = 'sine';
      leftOsc.frequency.value = 200.0;
      rightOsc.type = 'sine';
      rightOsc.frequency.value = 210.0; // 10 Hz Alpha difference frequency

      bGain.gain.value = !this.isMuted && this.isBinauralEnabled ? 0.016 : 0;

      if (typeof ctx.createStereoPanner === 'function') {
        const leftPan = ctx.createStereoPanner();
        const rightPan = ctx.createStereoPanner();
        leftPan.pan.value = -0.8;
        rightPan.pan.value = 0.8;
        leftOsc.connect(leftPan);
        rightOsc.connect(rightPan);
        leftPan.connect(bGain);
        rightPan.connect(bGain);
      } else {
        leftOsc.connect(bGain);
        rightOsc.connect(bGain);
      }

      bGain.connect(ctx.destination);
      leftOsc.start();
      rightOsc.start();

      this.droneOsc1 = osc1;
      this.droneOsc2 = osc2;
      this.ambientGain = gain;
      this.noiseFilter = nFilter;
      this.noiseLfo = lfo;
      this.noiseLfoGain = lfoGain;
      this.noiseGain = nGain;
      this.binauralGain = bGain;
      this.isAmbientRunning = true;
    } catch {
      // Ignore audio errors in headless environments
    }
  }

  public pauseAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    if (this.noiseGain && this.ctx) {
      this.noiseGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
    if (this.binauralGain && this.ctx) {
      this.binauralGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  public resumeAmbient() {
    const cfg = getSanctuaryAtmosphereConfig(this.currentAtmosphere);
    if (!this.isMuted && this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.2);
    }
    if (!this.isMuted && this.noiseGain && this.ctx) {
      this.noiseGain.gain.setTargetAtTime(cfg.noiseGain, this.ctx.currentTime, 0.2);
    }
    if (!this.isMuted && this.isBinauralEnabled && this.binauralGain && this.ctx) {
      this.binauralGain.gain.setTargetAtTime(0.016, this.ctx.currentTime, 0.2);
    }
  }

  /**
   * Light pitch-varied (±8%) procedural synth note with optional stereo panning (-1..1).
   */
  public playLightNote(baseFreq = 523.25, duration = 0.18, pan = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const pitchShift = 1 + (Math.random() * 0.14 - 0.07);
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq * pitchShift, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * pitchShift * 1.25, now + duration);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.11, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      if (typeof ctx.createStereoPanner === 'function' && pan !== 0) {
        const panner = ctx.createStereoPanner();
        panner.pan.value = Math.max(-1, Math.min(1, pan));
        gain.connect(panner);
        panner.connect(ctx.destination);
      } else {
        gain.connect(ctx.destination);
      }

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Ignore
    }
  }

  /**
   * Distinct harmonic chime for N-Back Totem symbols.
   */
  public playChimeSymbol(symbol: ChimeSymbol) {
    const freqMap: Record<ChimeSymbol, number> = {
      SUN: 523.25, // C5
      LEAF: 659.25, // E5
      DROP: 783.99, // G5
      STAR: 987.77, // B5
    };
    const freq = freqMap[symbol] || 523.25;
    this.playLightNote(freq, 0.28);
  }

  /**
   * Heavy rewarding harmonic chord for N-Back match, UFOVPeripheral lock, or Dendrite Tree Graft.
   */
  public playHarmonicChord(type: 'ufov' | 'nback' | 'graft' | 'victory') {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const chords: Record<typeof type, number[]> = {
        ufov: [523.25, 659.25, 783.99, 1046.5],
        nback: [587.33, 739.99, 880.0, 1174.66],
        graft: [440.0, 554.37, 659.25, 880.0, 1108.73],
        victory: [523.25, 659.25, 783.99, 987.77, 1318.51],
      };

      const notes = chords[type];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
        const start = now + idx * 0.045;
        const dur = 0.55;

        osc.frequency.setValueAtTime(freq, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.09, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + dur + 0.05);
      });
    } catch {
      // Ignore
    }
  }

  /**
   * Soft warning cue when a Stress Wisp telegraphs or touches the player.
   */
  public playSoftDissonance(isTelegraph = false) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const startFreq = isTelegraph ? 260 : 210;
      const endFreq = isTelegraph ? 320 : 145;
      const dur = isTelegraph ? 0.22 : 0.35;

      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.linearRampToValueAtTime(endFreq, now + dur);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(isTelegraph ? 0.06 : 0.12, now + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + dur + 0.02);
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new SoundEngine();
