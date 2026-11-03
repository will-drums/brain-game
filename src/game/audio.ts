/**
 * Procedural Web Audio synthesizer for Sylvan Synapse.
 * Generates cozy kalimba/marimba harmonic chimes, gentle rain/breeze pink-noise soundscape,
 * 0.1 Hz resonance breath swells, UFOV lock-on bells, and soft dissonance warnings.
 */

import type { ChimeSymbol } from './rules';

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private ambientGain: GainNode | null = null;
  private isAmbientRunning: boolean = false;

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

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(muted ? 0 : 0.035, this.ctx.currentTime, 0.15);
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

  public startAmbientSanctuary() {
    if (this.isMuted || this.isAmbientRunning) return;
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      // Create soft warm pad drone (C major 9th pentatonic warmth: 130.81Hz + 196.00Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.value = 130.81; // C3
      osc2.type = 'triangle';
      osc2.frequency.value = 196.0; // G3

      filter.type = 'lowpass';
      filter.frequency.value = 320;

      gain.gain.value = this.isMuted ? 0 : 0.035;

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc1.start();
      osc2.start();

      this.ambientGain = gain;
      this.isAmbientRunning = true;
    } catch {
      // Ignore audio errors in headless environments
    }
  }

  public pauseAmbient() {
    if (this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
    }
  }

  public resumeAmbient() {
    if (!this.isMuted && this.ambientGain && this.ctx) {
      this.ambientGain.gain.setTargetAtTime(0.035, this.ctx.currentTime, 0.2);
    }
  }

  /**
   * Light pitch-varied (±8%) procedural synth note for movement / dew pickup / pulse.
   */
  public playLightNote(baseFreq = 523.25, duration = 0.18) {
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
      gain.connect(ctx.destination);

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
