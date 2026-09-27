/**
 * Audio Engine using Web Audio API
 * Provides synthesized supercar engine revs, turbo whoosh, UI clicks,
 * and ambient synthwave music without external audio dependencies.
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = true;
    this.enginePlaying = false;
    this.synthPlaying = false;
    this.rpm = 900; // Idle RPM
    this.targetRpm = 900;
    this.engineGain = null;
    this.oscillators = [];
    this.synthNodes = [];
  }

  init() {
    if (this.ctx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.ctx = new AudioContext();
    
    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);
  }

  toggleSound() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
      }
      this.stopEngine();
      this.stopSynthwave();
    } else {
      if (this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.7, this.ctx.currentTime, 0.05);
      }
      this.startEngine();
      this.startSynthwave();
      this.playClick(600);
    }
    return !this.isMuted;
  }

  // Supercar engine sound synthesis
  startEngine() {
    if (!this.ctx || this.isMuted || this.enginePlaying) return;
    this.enginePlaying = true;

    // Sub rumble + fundamental cylinders
    const numOsc = 3;
    this.oscillators = [];
    
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    this.engineGain.connect(this.masterGain);

    // Distortion/Overdrive for muscle growl
    const waveShaper = this.ctx.createWaveShaper();
    waveShaper.curve = this.makeDistortionCurve(18);
    waveShaper.oversample = '2x';

    // Lowpass filter for exhaust throatiness
    this.engineFilter = this.ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    this.engineFilter.Q.setValueAtTime(3.5, this.ctx.currentTime);

    const baseFreqs = [28, 56, 84];
    baseFreqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      osc.type = idx === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      const oscGain = this.ctx.createGain();
      oscGain.gain.setValueAtTime(1 / (idx + 1), this.ctx.currentTime);

      osc.connect(waveShaper);
      osc.start();
      this.oscillators.push({ osc, baseFreq: freq });
    });

    waveShaper.connect(this.engineFilter);
    this.engineFilter.connect(this.engineGain);
  }

  stopEngine() {
    this.oscillators.forEach(o => {
      try { o.osc.stop(); } catch(e){}
    });
    this.oscillators = [];
    this.enginePlaying = false;
  }

  // Rev engine up to high RPM
  revEngine(intensity = 1.0) {
    if (!this.ctx || this.isMuted) return;
    this.init();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this.enginePlaying) this.startEngine();

    const targetRpm = 4500 + intensity * 4500; // Up to 9000 RPM redline
    const now = this.ctx.currentTime;
    const revDuration = 0.4 + intensity * 0.4;

    this.oscillators.forEach(o => {
      const targetFreq = o.baseFreq * (targetRpm / 900);
      o.osc.frequency.cancelScheduledValues(now);
      o.osc.frequency.setValueAtTime(o.osc.frequency.value, now);
      o.osc.frequency.exponentialRampToValueAtTime(Math.max(20, targetFreq), now + revDuration * 0.4);
      o.osc.frequency.exponentialRampToValueAtTime(o.baseFreq, now + revDuration * 1.2);
    });

    if (this.engineFilter) {
      this.engineFilter.frequency.cancelScheduledValues(now);
      this.engineFilter.frequency.setValueAtTime(this.engineFilter.frequency.value, now);
      this.engineFilter.frequency.linearRampToValueAtTime(2200 * intensity, now + revDuration * 0.4);
      this.engineFilter.frequency.linearRampToValueAtTime(450, now + revDuration * 1.2);
    }

    if (this.engineGain) {
      this.engineGain.gain.cancelScheduledValues(now);
      this.engineGain.gain.setValueAtTime(this.engineGain.gain.value, now);
      this.engineGain.gain.linearRampToValueAtTime(0.28, now + revDuration * 0.3);
      this.engineGain.gain.linearRampToValueAtTime(0.12, now + revDuration * 1.2);
    }

    // Turbo blow-off whoosh sound on lift-off
    setTimeout(() => {
      this.playTurboWhoosh();
    }, revDuration * 400);
  }

  // Turbo blow-off valve hiss / whoosh
  playTurboWhoosh() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    
    // Noise buffer
    const bufferSize = this.ctx.sampleRate * 0.35;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2400, now);
    filter.frequency.exponentialRampToValueAtTime(600, now + 0.35);
    filter.Q.setValueAtTime(4.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(now);
  }

  // Futuristic UI click / hover audio
  playClick(pitch = 800) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.6, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  // Ambient synthwave chords
  startSynthwave() {
    if (!this.ctx || this.isMuted || this.synthPlaying) return;
    this.synthPlaying = true;
    
    // Synth chord loop progression (Am9 - Fmaj7 - C - G/B)
    const chordProgressions = [
      [220, 261.63, 329.63, 392], // A minor 7
      [174.61, 220, 261.63, 329.63], // F maj 7
      [261.63, 329.63, 392, 523.25], // C
      [196, 246.94, 293.66, 392]     // G
    ];

    let chordIndex = 0;
    this.synthInterval = setInterval(() => {
      if (!this.synthPlaying || this.isMuted || !this.ctx) return;
      const chord = chordProgressions[chordIndex % chordProgressions.length];
      chordIndex++;

      chord.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 0.5, this.ctx.currentTime);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, this.ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(1400, this.ctx.currentTime + 1.2);
        filter.frequency.exponentialRampToValueAtTime(500, this.ctx.currentTime + 3.8);

        gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 0.8);
        gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 3.9);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        osc.stop(this.ctx.currentTime + 4.0);
      });
    }, 4000);
  }

  stopSynthwave() {
    this.synthPlaying = false;
    if (this.synthInterval) {
      clearInterval(this.synthInterval);
      this.synthInterval = null;
    }
  }

  makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }
}

export const sound = new SoundEngine();
