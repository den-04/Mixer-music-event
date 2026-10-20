import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Play, Pause, Square, Volume2, Repeat, Trash2,
  Music, Plus, Download, Star, Scissors, X, ChevronDown, ChevronUp
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

const fmtShort = (s: number) => {
  if (!s || isNaN(s)) return '0:00';
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

const fmtTenths = (s: number) => {
  if (!s || isNaN(s)) return '0:00.0';
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(Math.floor(sec)).padStart(2, '0')}.${Math.floor((sec % 1) * 10)}`;
};

const parseTime = (str: string): number | null => {
  const m = str.match(/^(\d+):([0-5]?\d)(?:\.(\d))?$/);
  if (!m) return null;
  return parseInt(m[1]) * 60 + parseInt(m[2]) + (m[3] ? parseInt(m[3]) / 10 : 0);
};

export const QuickLaunchBoard: React.FC<QuickLaunchBoardProps> = ({
  slots,
  tracks,
  onUpdateSlot,
  onAssignTrack,
  onClearSlot,
}) => {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [playStates, setPlayStates] = useState<Map<string, SlotPlayState>>(new Map());
  const [draggingOver, setDraggingOver] = useState<string | null>(null);
  const [showTrackPicker, setShowTrackPicker] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState('');
  const [timelineOpenSlot, setTimelineOpenSlot] = useState<string | null>(null);
  const [tlInValue, setTlInValue] = useState('');
  const [tlOutValue, setTlOutValue] = useState('');
  const [tlInError, setTlInError] = useState(false);
  const [tlOutError, setTlOutError] = useState(false);

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
    if (!audio.dataset.listenersBound) {
      const updateState = () => setPlayStates(prev => new Map(prev).set(slotId, {
        isPlaying: !audio!.paused,
        currentTime: audio!.currentTime,
        duration: audio!.duration || 0,
      }));
      audio.addEventListener('timeupdate', updateState);
      audio.addEventListener('ended', () => setPlayStates(prev => new Map(prev).set(slotId, {
        isPlaying: false, currentTime: 0, duration: audio!.duration || 0,
      })));
      audio.addEventListener('pause', updateState);
      audio.addEventListener('play', updateState);
      audio.dataset.listenersBound = 'true';
    }
    return audio;
  }, []);

  // OUT-point watcher
  useEffect(() => {
    const iv = setInterval(() => {
      slots.forEach(slot => {
        if (!slot.fileUrl || slot.endTime === undefined) return;
        const audio = audioRefs.current.get(slot.id);
        if (!audio || audio.paused) return;
        if (audio.currentTime >= slot.endTime) {
          if (slot.loop) {
            audio.currentTime = slot.startTime ?? 0;
          } else {
            audio.pause();
            audio.currentTime = slot.startTime ?? 0;
          }
        }
      });
    }, 80);
    return () => clearInterval(iv);
  }, [slots]);

  useEffect(() => () => {
    audioRefs.current.forEach(a => { a.pause(); a.src = ''; });
    audioRefs.current.clear();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const idx = HOTKEYS.indexOf(e.key);
      if (idx === -1) return;
      const slot = slots.find(s => s.slot === idx);
      if (slot && slot.fileUrl) { e.preventDefault(); handleTogglePlay(slot); }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots]);

  const handleTogglePlay = (slot: QuickLaunchSlot) => {
    if (!slot.fileUrl) return;
    const audio = getOrCreateAudio(slot.id, slot.fileUrl, slot.volume, slot.loop);
    const state = playStates.get(slot.id);
    const inPt = slot.startTime ?? 0;
    if (state?.isPlaying) {
      audio.pause();
    } else {
      const outPt = slot.endTime ?? audio.duration;
      if (audio.ended || audio.currentTime >= (outPt || audio.duration) - 0.1 || audio.currentTime < inPt) {
        audio.currentTime = inPt;
      }
      audio.play().catch(console.error);
    }
  };

  const handleStop = (slot: QuickLaunchSlot) => {
    const audio = audioRefs.current.get(slot.id);
    if (audio) {
      audio.pause();
      audio.currentTime = slot.startTime ?? 0;
      setPlayStates(prev => new Map(prev).set(slot.id, {
        isPlaying: false, currentTime: slot.startTime ?? 0, duration: audio.duration || 0,
      }));
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

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>, slot: QuickLaunchSlot) => {
    const audio = audioRefs.current.get(slot.id);
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const dur = audio.duration || slot.duration || 0;
    if (!dur) return;
    audio.currentTime = ratio * dur;
  };

  const handleSetIn = (slot: QuickLaunchSlot) => {
    const audio = audioRefs.current.get(slot.id);
    const cur = audio?.currentTime ?? 0;
    if (slot.endTime !== undefined && cur >= slot.endTime) return;
    onUpdateSlot({ ...slot, startTime: cur });
    setTlInValue(fmtTenths(cur));
  };

  const handleSetOut = (slot: QuickLaunchSlot) => {
    const audio = audioRefs.current.get(slot.id);
    const dur = audio?.duration || slot.duration || 0;
    const cur = audio?.currentTime ?? dur;
    if (cur <= (slot.startTime ?? 0)) return;
    onUpdateSlot({ ...slot, endTime: cur });
    setTlOutValue(fmtTenths(cur));
  };

  const handleResetTimeline = (slot: QuickLaunchSlot) => {
    const audio = audioRefs.current.get(slot.id);
    if (audio) audio.currentTime = 0;
    onUpdateSlot({ ...slot, startTime: undefined, endTime: undefined });
    setTlInValue(''); setTlOutValue('');
  };

  const openTimeline = (slot: QuickLaunchSlot) => {
    const dur = slot.duration ?? 0;
    setTlInValue(slot.startTime !== undefined ? fmtTenths(slot.startTime) : '0:00.0');
    setTlOutValue(slot.endTime !== undefined ? fmtTenths(slot.endTime) : (dur > 0 ? fmtTenths(dur) : ''));
    setTlInError(false); setTlOutError(false);
    setTimelineOpenSlot(slot.id);
  };

  const commitTlIn = (slot: QuickLaunchSlot) => {
    const v = parseTime(tlInValue);
    const dur = (audioRefs.current.get(slot.id)?.duration) || slot.duration || 0;
    const outPt = slot.endTime ?? dur;
    if (v === null || v < 0 || (outPt > 0 && v >= outPt)) { setTlInError(true); return; }
    setTlInError(false);
    onUpdateSlot({ ...slot, startTime: v });
  };

  const commitTlOut = (slot: QuickLaunchSlot) => {
    const v = parseTime(tlOutValue);
    const dur = (audioRefs.current.get(slot.id)?.duration) || slot.duration || 0;
    const inPt = slot.startTime ?? 0;
    if (v === null || v <= inPt || (dur > 0 && v > dur)) { setTlOutError(true); return; }
    setTlOutError(false);
    onUpdateSlot({ ...slot, endTime: v });
  };

  const handleDragOver = (e: React.DragEvent, slotId: string) => { e.preventDefault(); setDraggingOver(slotId); };
  const handleDragLeave = () => setDraggingOver(null);
  const handleDrop = (e: React.DragEvent, slot: QuickLaunchSlot) => {
    e.preventDefault(); setDraggingOver(null);
    const trackId = e.dataTransfer.getData('text/plain');
    if (trackId) { const track = tracks.find(t => t.id === trackId); if (track) onAssignTrack(slot.id, track); }
  };

  const filteredTracks = tracks.filter(t => t.title.toLowerCase().includes(pickerSearch.toLowerCase()));

  return (
    <div className="qlb-section">
      <div className="qlb-header">
        <div className="qlb-title-group">
          <Star size={18} className="qlb-star-icon" />
          <h3>BAN NHAC QUAN TRONG — QUICK LAUNCH ({slots.filter(s => s.trackId).length}/{slots.length} slot)</h3>
        </div>
        <div className="qlb-header-hint">
          <span>Keo bai tu Kho Nhac vao slot • Bam nut <kbd>+</kbd> de chon bai • Dung phim <kbd>F1</kbd>–<kbd>F12</kbd> de phat tuc thi • <kbd>✂</kbd> chinh timeline IN/OUT</span>
        </div>
      </div>

      <div className="qlb-grid">
        {slots.map((slot) => {
          const state = playStates.get(slot.id);
          const isPlaying = state?.isPlaying ?? false;
          const currentTime = state?.currentTime ?? (slot.startTime ?? 0);
          const duration = state?.duration ?? slot.duration ?? 0;
          const inPt = slot.startTime ?? 0;
          const outPt = slot.endTime ?? duration;
          const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
          const inPct = duration > 0 ? (inPt / duration) * 100 : 0;
          const outPct = duration > 0 && outPt > 0 ? (outPt / duration) * 100 : 100;
          const hasRange = (slot.startTime !== undefined && slot.startTime > 0) || slot.endTime !== undefined;
          const isEmpty = !slot.trackId;
          const color = slot.color;
          const isTimelineOpen = timelineOpenSlot === slot.id;

          return (
            <div
              key={slot.id}
              className={`qlb-slot ${isPlaying ? 'qlb-slot-playing' : ''} ${isEmpty ? 'qlb-slot-empty' : ''} ${draggingOver === slot.id ? 'qlb-slot-dragover' : ''}`}
              style={{ '--slot-color': color } as React.CSSProperties}
              onDragOver={(e) => handleDragOver(e, slot.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, slot)}
            >
              <div className="qlb-slot-num">
                <span className="qlb-num-badge" style={{ borderColor: color, color }}>{slot.slot + 1}</span>
                <span className="qlb-hotkey-tag">{HOTKEYS[slot.slot]}</span>
                {!isEmpty && (
                  <button className="qlb-clear-btn" onClick={() => { handleStop(slot); onClearSlot(slot.id); }} title="Xoa bai khoi slot">
                    <Trash2 size={11} />
                  </button>
                )}
              </div>

              {isEmpty ? (
                <div className="qlb-empty-state">
                  <Music size={24} style={{ color: 'var(--text-muted)', opacity: 0.5 }} />
                  <span>Chua co bai</span>
                  <button className="qlb-assign-btn" onClick={() => { setShowTrackPicker(slot.id); setPickerSearch(''); }} style={{ borderColor: color, color }}>
                    <Plus size={13} /> Chon bai
                  </button>
                  <span className="qlb-drag-hint">hoac keo tha tu Kho Nhac</span>
                </div>
              ) : (
                <>
                  <div className="qlb-track-name" title={slot.label}><span>{slot.label}</span></div>

                  {/* Interactive scrubber */}
                  <div className="qlb-scrubber-wrap" onClick={(e) => handleScrubberClick(e, slot)} title="Click de tua nhac">
                    <div className="qlb-scrubber-bg" />
                    <div className="qlb-scrubber-range" style={{ left: `${inPct}%`, width: `${outPct - inPct}%`, background: color }} />
                    <div className="qlb-scrubber-head" style={{ left: `${progress}%`, background: color }} />
                    {inPt > 0 && <div className="qlb-scrubber-marker qlb-marker-in" style={{ left: `${inPct}%`, borderColor: color }} title={`IN: ${fmtShort(inPt)}`} />}
                    {slot.endTime !== undefined && <div className="qlb-scrubber-marker qlb-marker-out" style={{ left: `${outPct}%`, borderColor: color }} title={`OUT: ${fmtShort(outPt)}`} />}
                  </div>

                  <div className="qlb-time-row">
                    <span>{fmtShort(currentTime)}</span>
                    {hasRange && <span className="qlb-range-badge" style={{ color }}>{fmtShort(inPt)}→{fmtShort(slot.endTime ?? duration)}</span>}
                    <span className="qlb-time-total">/{fmtShort(duration)}</span>
                  </div>

                  <div className="qlb-controls">
                    <button className={`qlb-play-btn ${isPlaying ? 'qlb-playing' : 'qlb-cued'}`}
                      style={isPlaying ? { background: color, boxShadow: `0 0 14px ${color}80` } : { borderColor: color, color }}
                      onClick={() => handleTogglePlay(slot)} title={isPlaying ? 'Tam dung' : 'Phat ngay'}>
                      {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                    </button>
                    <button className="qlb-stop-btn" onClick={() => handleStop(slot)}
                      disabled={!isPlaying && currentTime === (slot.startTime ?? 0)} title="Dung & ve IN point">
                      <Square size={13} />
                    </button>
                    <button className={`qlb-loop-btn ${slot.loop ? 'active' : ''}`}
                      onClick={() => handleLoopToggle(slot)} title={slot.loop ? 'Tat lap' : 'Bat lap'}
                      style={slot.loop ? { color, borderColor: color } : {}}>
                      <Repeat size={13} />
                    </button>
                    <button className={`qlb-timeline-toggle ${isTimelineOpen ? 'active' : ''} ${hasRange ? 'has-range' : ''}`}
                      onClick={() => isTimelineOpen ? setTimelineOpenSlot(null) : openTimeline(slot)}
                      title="Chinh timeline IN/OUT"
                      style={hasRange ? { color, borderColor: color } : {}}>
                      <Scissors size={12} />
                      {isTimelineOpen ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                    </button>
                  </div>

                  <div className="qlb-volume-row">
                    <Volume2 size={12} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                    <input type="range" min="0" max="1" step="0.02" value={slot.volume}
                      onChange={(e) => handleVolumeChange(slot, parseFloat(e.target.value))}
                      className="qlb-vol-slider" style={{ '--thumb-color': color } as React.CSSProperties}
                      title={`Am luong: ${Math.round(slot.volume * 100)}%`} />
                    <span className="qlb-vol-pct">{Math.round(slot.volume * 100)}%</span>
                  </div>

                  {/* Timeline editor */}
                  {isTimelineOpen && (
                    <div className="qlb-tl-editor" style={{ '--tl-color': color } as React.CSSProperties}>
                      <div className="qlb-tl-header">
                        <Scissors size={11} />
                        <span>Timeline IN / OUT</span>
                        <button className="qlb-tl-close" onClick={() => setTimelineOpenSlot(null)}><X size={10} /></button>
                      </div>
                      <div className="qlb-tl-quick">
                        <button className="qlb-tl-set-btn" onClick={() => handleSetIn(slot)} title="Dat diem IN tai vi tri hien tai">▷ Set IN</button>
                        <span className="qlb-tl-now">{fmtShort(currentTime)}</span>
                        <button className="qlb-tl-set-btn" onClick={() => handleSetOut(slot)} title="Dat diem OUT tai vi tri hien tai">Set OUT ◁</button>
                      </div>
                      <div className="qlb-tl-inputs">
                        <div className="qlb-tl-field">
                          <label>IN</label>
                          <input type="text" className={`qlb-tl-input ${tlInError ? 'error' : ''}`}
                            value={tlInValue}
                            onChange={e => { setTlInValue(e.target.value); setTlInError(false); }}
                            onBlur={() => commitTlIn(slot)}
                            onKeyDown={e => e.key === 'Enter' && commitTlIn(slot)}
                            placeholder="0:00.0" />
                        </div>
                        <span className="qlb-tl-arrow">→</span>
                        <div className="qlb-tl-field">
                          <label>OUT</label>
                          <input type="text" className={`qlb-tl-input ${tlOutError ? 'error' : ''}`}
                            value={tlOutValue}
                            onChange={e => { setTlOutValue(e.target.value); setTlOutError(false); }}
                            onBlur={() => commitTlOut(slot)}
                            onKeyDown={e => e.key === 'Enter' && commitTlOut(slot)}
                            placeholder={duration > 0 ? fmtShort(duration) : 'M:SS'} />
                        </div>
                      </div>
                      {(slot.startTime !== undefined || slot.endTime !== undefined) && (
                        <div className="qlb-tl-clip-info">
                          <span>Doan phat: {fmtShort((slot.endTime ?? duration) - (slot.startTime ?? 0))}</span>
                          <button className="qlb-tl-reset" onClick={() => handleResetTimeline(slot)} title="Xoa IN/OUT – phat toan bo">
                            <X size={9} /> Reset
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  <button className="qlb-replace-btn" onClick={() => { setShowTrackPicker(slot.id); setPickerSearch(''); }} title="Doi bai khac">
                    <Download size={11} /> Doi bai
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>

      {showTrackPicker && (
        <div className="qlb-picker-overlay" onClick={() => setShowTrackPicker(null)}>
          <div className="qlb-picker-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qlb-picker-header">
              <h4>Chon bai hat cho Slot {(slots.find(s => s.id === showTrackPicker)?.slot ?? 0) + 1}</h4>
              <button className="qlb-picker-close" onClick={() => setShowTrackPicker(null)}>✕</button>
            </div>
            <input type="text" className="qlb-picker-search" placeholder="Tim bai hat..."
              value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} autoFocus />
            <div className="qlb-picker-list">
              {filteredTracks.length === 0 ? (
                <div className="qlb-picker-empty">
                  <Music size={28} style={{ opacity: 0.3 }} />
                  <p>Chua co bai nao trong kho nhac</p>
                  <span>Hay them nhac vao Kho Nhac truoc</span>
                </div>
              ) : filteredTracks.map(track => (
                <button key={track.id} className="qlb-picker-item"
                  onClick={() => {
                    const slot = slots.find(s => s.id === showTrackPicker);
                    if (slot) onAssignTrack(slot.id, track);
                    setShowTrackPicker(null);
                  }}>
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
