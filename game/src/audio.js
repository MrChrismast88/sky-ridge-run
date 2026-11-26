// Sky Ridge Run — sound. Everything is synthesised with WebAudio: an
// engine drone that follows the throttle, wind, and chimes for rings,
// warnings and landings. No audio files.
export class SoundEngine {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engineOsc = null;
    this.engineGain = null;
    this.windGain = null;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();
    // Engine: two detuned saws through a low-pass filter.
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 62;
    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.value = 93;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    this.engineOsc.connect(filter);
    osc2.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.ctx.destination);
    this.engineOsc.start();
    osc2.start();
    this.engineOsc2 = osc2;
    // Wind: looped noise through a band-pass filter.
    const len = this.ctx.sampleRate * 2;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const band = this.ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 500;
    band.Q.value = 0.6;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    noise.connect(band);
    band.connect(this.windGain);
    this.windGain.connect(this.ctx.destination);
    noise.start();
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.ctx) this.ctx.destination.gain = 0;
    if (this.ctx && !muted) this.ctx.destination.gain.value = 1;
  }

  update(throttle, speed, flying) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const target = flying ? 0.02 + (throttle / 100) * 0.05 : 0;
    this.engineGain.gain.setTargetAtTime(target, t, 0.2);
    this.engineOsc.frequency.setTargetAtTime(52 + throttle * 0.9, t, 0.2);
    this.engineOsc2.frequency.setTargetAtTime(78 + throttle * 1.35, t, 0.2);
    this.windGain.gain.setTargetAtTime(flying ? Math.min(0.06, speed * 0.00016) : 0, t, 0.3);
  }

  tone(freq, dur, type = 'sine', volume = 0.16, when = 0) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  ringChime() {
    this.tone(880, 0.5, 'sine', 0.18);
    this.tone(1318, 0.7, 'sine', 0.14, 0.07);
  }

  warningBeep() {
    this.tone(620, 0.14, 'square', 0.08);
  }

  crash() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const len = this.ctx.sampleRate * 0.7;
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.value = 0.5;
    src.connect(gain);
    gain.connect(this.ctx.destination);
    src.start(t);
    this.tone(70, 0.6, 'sine', 0.3);
  }

  fanfare() {
    const notes = [523, 659, 784, 1046];
    notes.forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.16, i * 0.13));
  }
}
