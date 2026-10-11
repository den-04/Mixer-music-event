// Creates rich procedural demonstration tracks for event rehearsal
// Exported as clean WAV blobs so they work offline with zero external network requests!

export async function generateDemoTrackBlob(type: 'welcome' | 'opening' | 'speech' | 'award'): Promise<Blob> {
  const sampleRate = 44100;
  const duration = 24; // 24-second seamless rehearsal loops
  const offlineCtx = new OfflineAudioContext(2, sampleRate * duration, sampleRate);

  if (type === 'welcome') {
    // Lounge / Chill Lo-Fi chords: Dm9 -> G13 -> Cmaj9 -> Am7
    const chords = [
      [293.66, 349.23, 440.0, 523.25, 659.25], // Dm9
      [196.0, 246.94, 329.63, 392.0, 440.0],  // G13
      [261.63, 329.63, 392.0, 493.88, 587.33], // Cmaj9
      [220.0, 261.63, 329.63, 392.0, 493.88]  // Am9
    ];
    for (let bar = 0; bar < 6; bar++) {
      const chord = chords[bar % chords.length];
      const barTime = bar * 4.0;
      chord.forEach(freq => {
        const osc = offlineCtx.createOscillator();
        const gain = offlineCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, barTime);
        gain.gain.setValueAtTime(0, barTime);
        gain.gain.linearRampToValueAtTime(0.08, barTime + 0.15);
        gain.gain.exponentialRampToValueAtTime(0.0001, barTime + 3.8);
        osc.connect(gain);
        gain.connect(offlineCtx.destination);
        osc.start(barTime);
        osc.stop(barTime + 3.9);
      });
    }
  } else if (type === 'opening') {
    // Epic cinematic brass & pulsing bass
    for (let i = 0; i < 48; i++) {
      const beatTime = i * 0.5;
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = i % 4 === 0 ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(i % 4 === 0 ? 65.41 : 130.81, beatTime);
      gain.gain.setValueAtTime(0.2, beatTime);
      gain.gain.exponentialRampToValueAtTime(0.001, beatTime + 0.4);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(beatTime);
      osc.stop(beatTime + 0.45);
    }
  } else if (type === 'speech') {
    // Ambient peaceful gentle pads
    const notes = [174.61, 220.0, 261.63, 329.63];
    notes.forEach(freq => {
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, 0);
      gain.gain.setValueAtTime(0.06, 0);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(0);
      osc.stop(duration);
    });
  } else {
    // Award / Triumphant brass sequence
    const notes = [261.63, 329.63, 392.0, 523.25];
    for (let beat = 0; beat < 24; beat++) {
      const t = beat * 1.0;
      const freq = notes[beat % notes.length];
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.85);
      osc.connect(gain);
      gain.connect(offlineCtx.destination);
      osc.start(t);
      osc.stop(t + 0.9);
    }
  }

  const renderedBuffer = await offlineCtx.startRendering();
  return bufferToWave(renderedBuffer, renderedBuffer.length);
}

// Convert AudioBuffer to WAV format Blob
function bufferToWave(abuffer: AudioBuffer, totalSteps: number): Blob {
  const numOfChan = abuffer.numberOfChannels;
  const length = totalSteps * numOfChan * 2 + 44;
  const outBuffer = new ArrayBuffer(length);
  const view = new DataView(outBuffer);
  const channels: Float32Array[] = [];
  let offset = 0;
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"
  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM
  setUint16(numOfChan);
  setUint32(abuffer.sampleRate);
  setUint32(abuffer.sampleRate * 2 * numOfChan); // byte rate
  setUint16(numOfChan * 2); // block align
  setUint16(16); // bits per sample
  setUint32(0x61746164); // "data" chunk
  setUint32(length - pos - 4);

  for (let i = 0; i < abuffer.numberOfChannels; i++) {
    channels.push(abuffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      let sample = Math.max(-1, Math.min(1, channels[i][offset]));
      sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
      view.setInt16(pos, sample, true);
      pos += 2;
    }
    offset++;
  }

  return new Blob([outBuffer], { type: 'audio/wav' });
}
