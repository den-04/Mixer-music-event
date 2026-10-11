// Sound synthesizer for built-in event sound effects using Web Audio API
// Allows high-quality immediate soundboard triggers without needing external MP3 files!

export class SoundSynthesizer {
  private ctx: AudioContext;

  constructor(ctx: AudioContext) {
    this.ctx = ctx;
  }

  // Tiếng chuông đúng (Ding Correct)
  playCorrect(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    notes.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.08);

      gain.gain.setValueAtTime(0, now + i * 0.08);
      gain.gain.linearRampToValueAtTime(volume * 0.6, now + i * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.08 + 0.8);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.85);
    });
  }

  // Tiếng còi buzzer sai (Buzzer Error)
  playWrong(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    [140, 147].forEach((freq) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.linearRampToValueAtTime(freq * 0.75, now + 0.6);

      gain.gain.setValueAtTime(volume * 0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 0.65);
    });
  }

  // Kèn vinh danh trao giải (Fanfare Brass)
  playFanfare(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    // Triumphant Fanfare Melody: C4, G4, C5, E5, G5
    const chords = [
      { t: 0.0, freqs: [261.63, 329.63, 392.0], d: 0.25 }, // C major short
      { t: 0.25, freqs: [261.63, 329.63, 392.0], d: 0.25 },
      { t: 0.5, freqs: [329.63, 392.0, 523.25], d: 0.25 },
      { t: 0.75, freqs: [392.0, 523.25, 659.25], d: 0.25 },
      { t: 1.05, freqs: [523.25, 659.25, 783.99, 1046.5], d: 1.6 } // Big grand finish
    ];

    chords.forEach(({ t, freqs, d }) => {
      freqs.forEach(freq => {
        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + t);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now + t);

        gain.gain.setValueAtTime(0, now + t);
        gain.gain.linearRampToValueAtTime(volume * 0.35, now + t + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + t + d);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(dest);

        osc.start(now + t);
        osc.stop(now + t + d + 0.05);
      });
    });
  }

  // Trống hồi hộp dồn dập (Drumroll Suspense -> Crash)
  playDrumroll(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    const duration = 2.4;
    const numHits = 42;

    for (let i = 0; i < numHits; i++) {
      const hitTime = now + (i / numHits) * duration;
      const hitVol = (i / numHits) * 0.6 + 0.2;

      // Snare-like noise burst
      const bufferSize = this.ctx.sampleRate * 0.06;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let j = 0; j < bufferSize; j++) {
        data[j] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800 + (i * 20), hitTime);
      filter.Q.value = 3;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume * hitVol * 0.4, hitTime);
      gain.gain.exponentialRampToValueAtTime(0.001, hitTime + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(dest);

      noise.start(hitTime);
    }

    // Grand crash at the end
    const crashTime = now + duration;
    const crashBufferSize = this.ctx.sampleRate * 1.5;
    const crashBuffer = this.ctx.createBuffer(1, crashBufferSize, this.ctx.sampleRate);
    const crashData = crashBuffer.getChannelData(0);
    for (let j = 0; j < crashBufferSize; j++) {
      crashData[j] = Math.random() * 2 - 1;
    }
    const crashSource = this.ctx.createBufferSource();
    crashSource.buffer = crashBuffer;

    const crashFilter = this.ctx.createBiquadFilter();
    crashFilter.type = 'highpass';
    crashFilter.frequency.setValueAtTime(3000, crashTime);

    const crashGain = this.ctx.createGain();
    crashGain.gain.setValueAtTime(volume * 0.7, crashTime);
    crashGain.gain.exponentialRampToValueAtTime(0.0001, crashTime + 1.4);

    crashSource.connect(crashFilter);
    crashFilter.connect(crashGain);
    crashGain.connect(dest);
    crashSource.start(crashTime);
  }

  // Tiếng vỗ tay hoan hô (Applause & Cheering)
  playApplause(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    const duration = 3.5;
    
    // Multi-layer synthesized crowd applause
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(2, bufferSize, this.ctx.sampleRate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);

    for (let i = 0; i < bufferSize; i++) {
      // Density modulation for realistic applause claps
      const t = i / this.ctx.sampleRate;
      const envelope = Math.min(t / 0.5, 1) * Math.max(0, (duration - t) / 0.8);
      const clapFactor = Math.sin(t * 12) * 0.2 + 0.8;
      left[i] = (Math.random() * 2 - 1) * envelope * clapFactor;
      right[i] = (Math.random() * 2 - 1) * envelope * (1 - clapFactor * 0.3);
    }

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(dest);

    source.start(now);
  }

  // Tiếng đếm ngược hồi hộp (Countdown Beep 5-4-3-2-1)
  playCountdown(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    // 5 beeps: 4 low beeps, 1 high triumphant long beep
    const beeps = [0, 0.7, 1.4, 2.1, 2.8];
    beeps.forEach((t, index) => {
      const isFinal = index === beeps.length - 1;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = isFinal ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(isFinal ? 1200 : 700 + index * 50, now + t);

      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(volume * (isFinal ? 0.7 : 0.5), now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + (isFinal ? 0.9 : 0.3));

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + t);
      osc.stop(now + t + (isFinal ? 0.95 : 0.35));
    });
  }

  // Tiếng chuông vàng / Jackpot / May mắn
  playJackpot(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    const freqs = [523.25, 659.25, 783.99, 987.77, 1046.5, 1318.5, 1567.98, 2093.0];
    freqs.forEach((freq, idx) => {
      const t = idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + t);

      gain.gain.setValueAtTime(volume * 0.5, now + t);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.5);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now + t);
      osc.stop(now + t + 0.55);
    });
  }

  // Tiếng chiêng khai mạc (Gong / Grand Bell)
  playGong(dest: AudioNode, volume = 0.8) {
    const now = this.ctx.currentTime;
    const freqs = [180, 275, 410, 680];
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

      osc.connect(gain);
      gain.connect(dest);

      osc.start(now);
      osc.stop(now + 3.1);
    });
  }
}
