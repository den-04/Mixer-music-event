import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Square, Volume2, Repeat, Trash2,
  Music, Plus, Download, Star
} from 'lucide-react';
import type { QuickLaunchSlot, AudioTrack } from '../types/audio';

interface QuickLaunchBoardProps {
  slots: QuickLaunchSlot[];
  tracks: AudioTrack[];
  onUpdateSlot: (slot: QuickLaunchSlot) => void;
  onAssignTrack: (slotId: string, track: AudioTrack) => void;
  onClearSlot: (slotId: string) => void;
}

interface SlotPlayState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
}

const HOTKEYS = ['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'];

export const QuickLaunchBoard: React.FC<QuickLaunchBoardProps> = ({
  slots,
  tracks,
  onUpdateSlot,
  onAssignTrack,
  onClearSlot,
}) => {
  // Per-slot HTMLAudioElement refs
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [playStates, setPlayStates] = useState<Map<string, SlotPlayState>>(new Map());
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [showTrackPicker, setShowTrackPicker] = useState<string | null>(null); // slotId
  const [pickerSearch, setPickerSearch] = useState('');

  // Initialize or get audio element for a slot
  const getOrCreateAudio = useCallback((slotId: string, fileUrl: string, volume: number, loop: boolean) => {
    let audio = audioRefs.current.get(slotId);
    if (!audio) {
      audio = new Audio();
      audio.preload = 'metadata';
      audioRefs.current.set(slotId, audio);
    }
    if (audio.src !== fileUrl) {
      audio.src = fileUrl;
      audio.currentTime = 0;
    }
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = loop;

    // Bind event listeners
    const onTimeUpdate = () => {
      setPlayStates(prev => new Map(prev).set(slotId, {
        isPlaying: !audio!.paused,
        currentTime: audio!.currentTime,
        duration: audio!.duration || 0,
      }));
    };
    const onEnded = () => {
      setPlayStates(prev => new Map(prev).set(slotId, {
        isPlaying: false,
        currentTime: 0,
        duration: audio!.duration || 0,
      }));
    };

    // Only add listeners once
    if (!audio.dataset.listenersBound) {
      audio.addEventListener('timeupdate', onTimeUpdate);
      audio.addEventListener('ended', onEnded);
      audio.addEventListener('pause', onTimeUpdate);
      audio.addEventListener('play', onTimeUpdate);
      audio.dataset.listenersBound = 'true';
    }

    return audio;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      audioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      audioRefs.current.clear();
    };
  }, []);

  // Keyboard F1-F12 trigger
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Only trigger if no input focused
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const idx = HOTKEYS.indexOf(e.key);
      if (idx === -1) return;
      const slot = slots.find(s => s.slot === idx);
      if (slot && slot.fileUrl) {
        e.preventDefault();
        handleTogglePlay(slot);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const handleTogglePlay = (slot: QuickLaunchSlot) => {
    if (!slot.fileUrl) return;
    const audio = getOrCreateAudio(slot.id, slot.fileUrl, slot.volume, slot.loop);
    const state = playStates.get(slot.id);
    if (state?.isPlaying) {
      audio.pause();
    } else {
      if (audio.ended || audio.currentTime >= (audio.duration || 0) - 0.1) {
        audio.currentTime = 0;
      }
      audio.play().catch(console.error);
    }
  };

  const handleStop = (slot: QuickLaunchSlot) => {
    const audio = audioRefs.current.get(slot.id);
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setPlayStates(prev => new Map(prev).set(slot.id, { isPlaying: false, currentTime: 0, duration: audio.duration || 0 }));
    }
  };

  const handleVolumeChange = (slot: QuickLaunchSlot, vol: number) => {
    const audio = audioRefs.current.get(slot.id);
    if (audio) audio.volume = vol;
    onUpdateSlot({ ...slot, volume: vol });
  };

  const handleLoopToggle = (slot: QuickLaunchSlot) => {
    const next = !slot.loop;
    const audio = audioRefs.current.get(slot.id);
    if (audio) audio.loop = next;
    onUpdateSlot({ ...slot, loop: next });
  };

  // Drag-and-drop from library
  const handleDragOver = (e: React.DragEvent, slotId: string) => {
    e.preventDefault();
    setDraggingOver(slotId);
  };
  const handleDragLeave = () => setDraggingOver(null);
  const handleDrop = (e: React.DragEvent, slot: QuickLaunchSlot) => {
    e.preventDefault();
    setDraggingOver(null);
    const trackId = e.dataTransfer.getData('text/plain');
    if (trackId) {
      const track = tracks.find(t => t.id === trackId);
      if (track) onAssignTrack(slot.id, track);
    }
  };

  const formatTime = (s: number) => {
    if (!s || isNaN(s)) return '0:00';
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  };

  const filteredTracks = tracks.filter(t =>
    t.title.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="qlb-section">
      {/* Header */}
      <div className="qlb-header">
        <div className="qlb-title-group">
          <Star size={18} className="qlb-star-icon" />
          <h3>BÀN NHẠC QUAN TRỌNG — QUICK LAUNCH ({slots.filter(s => s.trackId).length}/{slots.length} slot)</h3>
        </div>
        <div className="qlb-header-hint">
          <span>Kéo bài từ Kho Nhạc vào slot • Bấm nút <kbd>+</kbd> để chọn bài • Dùng phím <kbd>F1</kbd>–<kbd>F12</kbd> để phát tức thì</span>
        </div>
      </div>

      {/* Slots Grid */}
      <div className="qlb-grid">
        {slots.map((slot) => {
          const state = playStates.get(slot.id);
          const isPlaying = state?.isPlaying ?? false;
          const currentTime = state?.currentTime ?? 0;
          const duration = state?.duration ?? slot.duration ?? 0;
          const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
          const isEmpty = !slot.trackId;
          const color = slot.color;

          return (
            <div
              key={slot.id}
              className={`qlb-slot ${isPlaying ? 'qlb-slot-playing' : ''} ${isEmpty ? 'qlb-slot-empty' : ''} ${draggingOver === slot.id ? 'qlb-slot-dragover' : ''}`}
              style={{ '--slot-color': color } as React.CSSProperties}
              onDragOver={(e) => handleDragOver(e, slot.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot)}
            >
              {/* Slot Number & Hotkey */}
              <div className="qlb-slot-num">
                <span className="qlb-num-badge" style={{ borderColor: color, color }}>
                  {slot.slot + 1}
                </span>
                <span className="qlb-hotkey-tag">{HOTKEYS[slot.slot]}</span>
                {!isEmpty && (
                  <button
                    className="qlb-clear-btn"
                    onClick={() => { handleStop(slot); onClearSlot(slot.id); }}
                    title="Xóa bài khỏi slot"
                  >
                    <Trash2 size={11} />
                  </button>
                )}
              </div>

              {isEmpty ? (
                /* Empty state */
                <div className="qlb-empty-state">
                  <Music size={24} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  <span>Chưa có bài</span>
                  <button
                    className="qlb-assign-btn"
                    onClick={() => { setShowTrackPicker(slot.id); setPickerSearch(''); }}
                    style={{ borderColor: color, color }}
                  >
                    <Plus size={13} /> Chọn bài
                  </button>
                  <span className="qlb-drag-hint">hoặc kéo thả từ Kho Nhạc</span>
                </div>
              ) : (
                /* Loaded state */
                <>
                  {/* Track name */}
                  <div className="qlb-track-name" title={slot.label}>
                    <span>{slot.label}</span>
                  </div>

                  {/* Progress bar */}
                  <div className="qlb-progress-bar">
                    <div
                      className="qlb-progress-fill"
                      style={{ width: `${progress}%`, background: color }}
                    />
                  </div>
                  <div className="qlb-time-row">
                    <span>{formatTime(currentTime)}</span>
                    <span className="qlb-time-total">/{formatTime(duration)}</span>
                  </div>

                  {/* Controls */}
                  <div className="qlb-controls">
                    <button
                      className={`qlb-play-btn ${isPlaying ? 'qlb-playing' : 'qlb-cued'}`}
                      style={isPlaying ? { background: color, boxShadow: `0 0 14px ${color}80` } : { borderColor: color, color }}
                      onClick={() => handleTogglePlay(slot)}
                      title={isPlaying ? 'Tạm dừng' : 'Phát ngay'}
                    >
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>

                    <button
                      className="qlb-stop-btn"
                      onClick={() => handleStop(slot)}
                      disabled={!isPlaying && currentTime === 0}
                      title="Dừng & về đầu"
                    >
                      <Square size={13} />
                    </button>

                    <button
                      className={`qlb-loop-btn ${slot.loop ? 'active' : ''}`}
                      onClick={() => handleLoopToggle(slot)}
                      title={slot.loop ? 'Tắt lặp' : 'Bật lặp'}
                      style={slot.loop ? { color, borderColor: color } : {}}
                    >
                      <Repeat size={13} />
                    </button>
                  </div>

                  {/* Volume */}
                  <div className="qlb-volume-row">
                    <Volume2 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.02"
                      value={slot.volume}
                      onChange={(e) => handleVolumeChange(slot, parseFloat(e.target.value))}
                      className="qlb-vol-slider"
                      style={{ '--thumb-color': color } as React.CSSProperties}
                      title={`Âm lượng: ${Math.round(slot.volume * 100)}%`}
                    />
                    <span className="qlb-vol-pct">{Math.round(slot.volume * 100)}%</span>
                  </div>

                  {/* Replace button */}
                  <button
                    className="qlb-replace-btn"
                    onClick={() => { setShowTrackPicker(slot.id); setPickerSearch(''); }}
                    title="Đổi bài khác"
                  >
                    <Download size={11} /> Đổi bài
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Track Picker Modal */}
      {showTrackPicker && (
        <div className="qlb-picker-overlay" onClick={() => setShowTrackPicker(null)}>
          <div className="qlb-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qlb-picker-header">
              <h4>Chọn bài hát cho Slot {(slots.find(s => s.id === showTrackPicker)?.slot ?? 0) + 1}</h4>
              <button className="qlb-picker-close" onClick={() => setShowTrackPicker(null)}>✕</button>
            </div>
            <input
              type="text"
              className="qlb-picker-search"
              placeholder="Tìm bài hát..."
              value={pickerSearch}
              onChange={(e) => setPickerSearch(e.target.value)}
              autoFocus
            />
            <div className="qlb-picker-list">
              {filteredTracks.length === 0 ? (
                <div className="qlb-picker-empty">
                  <Music size={28} style={{ opacity: 0.3 }} />
                  <p>Chưa có bài nào trong kho nhạc</p>
                  <span>Hãy thêm nhạc vào Kho Nhạc trước</span>
                </div>
              ) : filteredTracks.map(track => (
                <button
                  key={track.id}
                  className="qlb-picker-item"
                  onClick={() => {
                    const slot = slots.find(s => s.id === showTrackPicker);
                    if (slot) onAssignTrack(slot.id, track);
                    setShowTrackPicker(null);
                  }}
                >
                  <Music size={14} style={{ color: 'var(--neon-cyan)', flexShrink: 0 }} />
                  <div className="qlb-picker-item-info">
                    <span className="qlb-picker-name">{track.title}</span>
                    <span className="qlb-picker-cat">{track.category.toUpperCase()}</span>
                  </div>
                  <span className="qlb-picker-duration">
                    {Math.floor(track.duration / 60)}:{String(Math.floor(track.duration % 60)).padStart(2,'0')}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
