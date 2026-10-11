import React, { useRef, useState } from 'react';
import { Play, Pause, Square, RotateCcw, Repeat, TrendingDown, Music, Disc } from 'lucide-react';
import type { DeckState } from '../types/audio';
import { VUMeter } from './VUMeter';
import { Knob } from './Knob';

interface DeckPlayerProps {
  deckId: 'A' | 'B';
  state: DeckState;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onSeek: (seconds: number) => void;
  onCue: () => void;
  onFadeOut: (duration: number) => void;
  onVolumeChange: (vol: number) => void;
  onPitchChange: (pitch: number) => void;
  onLoopToggle: () => void;
  onEQChange: (low: number, mid: number, high: number) => void;
  onEject: () => void;
}

export const DeckPlayer: React.FC<DeckPlayerProps> = ({
  deckId,
  state,
  onPlay,
  onPause,
  onStop,
  onSeek,
  onCue,
  onFadeOut,
  onVolumeChange,
  onPitchChange,
  onLoopToggle,
  onEQChange,
  onEject
}) => {
  const isDeckA = deckId === 'A';
  const themeColor = isDeckA ? 'var(--neon-cyan, #00f2fe)' : 'var(--neon-orange, #ff6d00)';
  const badgeClass = isDeckA ? 'badge-deck-a' : 'badge-deck-b';

  const progressRef = useRef<HTMLDivElement>(null);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPercent, setHoverPercent] = useState<number>(0);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) secs = 0;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;
  const remaining = state.duration > 0 ? Math.max(0, state.duration - state.currentTime) : 0;

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || state.duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    onSeek(percent * state.duration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || state.duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, clickX / rect.width));
    setHoverPercent(percent * 100);
    setHoverTime(percent * state.duration);
  };

  return (
    <div className={`deck-player-card ${isDeckA ? 'deck-a-card' : 'deck-b-card'}`}>
      {/* Deck Header */}
      <div className="deck-header">
        <div className="deck-title-row">
          <span className={`deck-badge ${badgeClass}`}>DECK {deckId}</span>
          <span className={`deck-status-dot ${state.isPlaying ? 'playing' : state.track ? 'ready' : ''}`} />
          <span className="deck-status-text">
            {state.isFadingOut ? 'ĐANG FADE OUT...' : state.isPlaying ? '🔴 LIVE ON AIR' : state.track ? '▶ SẴN SÀNG - NHẤN PLAY' : 'CUE / CHỜ'}
          </span>
        </div>
        {state.track && (
          <button 
            className="deck-eject-btn" 
            title="Gỡ bài khỏi Deck"
            onClick={onEject}
          >
            Đổi bài
          </button>
        )}
      </div>

      {/* Track Info Screen */}
      <div className="deck-screen">
        <div className="deck-track-details">
          {state.track ? (
            <>
              <div className="deck-track-title" title={state.track.title}>
                <Disc className={`deck-disc-icon ${state.isPlaying ? 'spinning' : ''}`} size={16} />
                <span>{state.track.title}</span>
              </div>
              <div className="deck-track-meta">
                <span className="deck-category-tag">{state.track.category.toUpperCase()}</span>
                {state.track.artist && <span className="deck-artist">{state.track.artist}</span>}
                <span className="deck-bpm">{Math.round(state.pitch * 100)}% Speed</span>
              </div>
            </>
          ) : (
            <div className="deck-empty-state">
              <Music size={24} style={{ opacity: 0.4 }} />
              <span>Chưa nạp bài (Bấm "Nạp Deck {deckId}" từ kho nhạc bên dưới)</span>
            </div>
          )}
        </div>

        {/* Large Time Display */}
        <div className="deck-time-display">
          <div className="time-block elapsed">
            <span className="time-label">ELAPSED</span>
            <span className="time-digits">{formatTime(state.currentTime)}</span>
          </div>
          <div className="time-block remaining">
            <span className="time-label">REMAINING</span>
            <span className="time-digits remaining-digits">-{formatTime(remaining)}</span>
          </div>
        </div>

        {/* Waveform / Progress Scrubbing Bar */}
        <div 
          className="waveform-progress-bar"
          ref={progressRef}
          onClick={handleProgressBarClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverTime(null)}
        >
          {/* Waveform background bars simulation */}
          <div className="waveform-bg-bars">
            {Array.from({ length: 48 }).map((_, i) => (
              <span 
                key={i} 
                className="wave-bar" 
                style={{ 
                  height: `${25 + Math.sin(i * 0.4) * 20 + ((i % 5) * 8)}%`,
                  opacity: (i / 48) * 100 <= progress ? 1 : 0.25,
                  backgroundColor: (i / 48) * 100 <= progress ? themeColor : 'rgba(255,255,255,0.2)'
                }} 
              />
            ))}
          </div>

          <div 
            className="waveform-fill" 
            style={{ width: `${progress}%`, backgroundColor: themeColor }}
          />
          <div 
            className="waveform-playhead" 
            style={{ left: `${progress}%`, borderColor: themeColor }}
          />

          {hoverTime !== null && (
            <div className="waveform-tooltip" style={{ left: `${hoverPercent}%` }}>
              {formatTime(hoverTime)}
            </div>
          )}
        </div>
      </div>

      {/* Transport Controls & Knobs Grid */}
      <div className="deck-controls-grid">
        {/* Playback Transport Buttons */}
        <div className="deck-transport-col">
          <div className="deck-main-buttons">
            <button
              className={`btn-deck-play ${state.isPlaying ? 'playing' : state.track ? 'cued' : ''}`}
              onClick={state.isPlaying ? onPause : onPlay}
              disabled={!state.track}
              title={state.isPlaying ? 'Tạm dừng (Pause)' : 'Phát nhạc (Play)'}
            >
              {state.isPlaying ? <Pause size={22} /> : <Play size={22} />}
              <span>{state.isPlaying ? 'PAUSE' : 'PLAY ▶'}</span>
            </button>

            <button
              className="btn-deck-cue"
              onClick={onCue}
              disabled={!state.track}
              title="Về đầu bài và dừng (Cue)"
            >
              <RotateCcw size={16} />
              <span>CUE</span>
            </button>

            <button
              className="btn-deck-stop"
              onClick={onStop}
              disabled={!state.track}
              title="Dừng hẳn bài hát (Stop)"
            >
              <Square size={16} />
              <span>STOP</span>
            </button>
          </div>

          <div className="deck-aux-buttons">
            <button
              className={`btn-deck-aux ${state.isLooping ? 'active' : ''}`}
              onClick={onLoopToggle}
              title="Lặp lại bài hát này"
            >
              <Repeat size={14} />
              <span>LOOP</span>
            </button>

            <button
              className="btn-deck-fadeout"
              onClick={() => onFadeOut(2)}
              disabled={!state.isPlaying}
              title="Fade out êm dịu trong 2 giây khi MC phát biểu"
            >
              <TrendingDown size={14} />
              <span>FADE OUT (2s)</span>
            </button>
          </div>

          <div className="deck-pitch-row" title="Kéo để chỉnh tốc độ nhạc ±20%, nhấp đúp để về 100%">
            <span className="pitch-tag">SPEED: {Math.round(state.pitch * 100)}%</span>
            <input
              type="range"
              min="0.8"
              max="1.2"
              step="0.01"
              value={state.pitch}
              onChange={(e) => onPitchChange(parseFloat(e.target.value))}
              onDoubleClick={() => onPitchChange(1.0)}
              className="pitch-slider"
            />
          </div>
        </div>

        {/* 3-Band EQ Knobs */}
        <div className="deck-eq-col">
          <div className="eq-label-header">3-BAND EQ</div>
          <div className="eq-knobs-row">
            <Knob
              label="HIGH"
              value={state.highEQ}
              color={themeColor}
              onChange={(v) => onEQChange(state.lowEQ, state.midEQ, v)}
            />
            <Knob
              label="MID"
              value={state.midEQ}
              color={themeColor}
              onChange={(v) => onEQChange(state.lowEQ, v, state.highEQ)}
            />
            <Knob
              label="LOW"
              value={state.lowEQ}
              color={themeColor}
              onChange={(v) => onEQChange(v, state.midEQ, state.highEQ)}
            />
          </div>
        </div>

        {/* Volume Fader & VU Meter */}
        <div className="deck-fader-col">
          <div className="fader-label">CH {deckId} VOL</div>
          <div className="fader-slider-wrap">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={state.volume}
              onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
              className="vertical-fader"
              title={`Âm lượng Deck ${deckId}: ${Math.round(state.volume * 100)}%`}
            />
            <VUMeter level={state.vuLevel} segments={12} vertical />
          </div>
          <div className="fader-percent">{Math.round(state.volume * 100)}%</div>
        </div>
      </div>
    </div>
  );
};
