import React, { useState } from 'react';
import { Radio, Square, Edit3, Volume2 } from 'lucide-react';
import type { SoundPad, AudioTrack } from '../types/audio';
import { SoundPadEditModal } from './SoundPadEditModal';

interface SoundboardProps {
  pads: SoundPad[];
  tracks: AudioTrack[];
  activePadSlot: number | null;
  onTriggerPad: (pad: SoundPad) => void;
  onStopAllPads: () => void;
  onUpdatePad: (updated: SoundPad) => void;
}

export const Soundboard: React.FC<SoundboardProps> = ({
  pads,
  tracks,
  activePadSlot,
  onTriggerPad,
  onStopAllPads,
  onUpdatePad
}) => {
  const [editingPad, setEditingPad] = useState<SoundPad | null>(null);

  return (
    <div className="soundboard-section-card">
      <div className="soundboard-header">
        <div className="soundboard-title">
          <Radio size={16} className="pulsing-icon" />
          <span>BÀN HIỆU ỨNG TỨC THỜI (SOUNDBOARD / JINGLE PADS)</span>
          <span className="soundboard-hint">Bấm chuột hoặc gõ phím tắt [1..9, 0] để kích hoạt</span>
        </div>

        <button
          className="btn-stop-pads"
          onClick={onStopAllPads}
          title="Dừng âm thanh tất cả các Pad đang phát"
        >
          <Square size={14} />
          <span>DỪNG TẤT CẢ PAD</span>
        </button>
      </div>

      <div className="soundpads-grid">
        {pads.map((pad) => {
          const isActive = activePadSlot === pad.slot;
          return (
            <div
              key={pad.id}
              className={`soundpad-btn ${isActive ? 'active-playing' : ''}`}
              style={{
                borderColor: pad.color,
                boxShadow: isActive ? `0 0 16px ${pad.color}` : 'none'
              }}
              onClick={() => onTriggerPad(pad)}
            >
              <div className="soundpad-top-row">
                <span className="soundpad-hotkey" style={{ backgroundColor: pad.color }}>
                  {pad.hotkey}
                </span>
                <button
                  className="soundpad-edit-trigger"
                  title="Tùy chỉnh nút này (đổi âm thanh, màu, phím tắt)"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingPad(pad);
                  }}
                >
                  <Edit3 size={13} />
                </button>
              </div>

              <div className="soundpad-label" title={pad.label}>
                {pad.label}
              </div>

              <div className="soundpad-footer">
                <span className="soundpad-type">
                  {pad.soundType === 'builtin' ? 'EFFECT' : 'TRACK'}
                </span>
                <span className="soundpad-vol">
                  <Volume2 size={11} /> {Math.round(pad.volume * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {editingPad && (
        <SoundPadEditModal
          pad={editingPad}
          tracks={tracks}
          onSave={onUpdatePad}
          onClose={() => setEditingPad(null)}
        />
      )}
    </div>
  );
};
