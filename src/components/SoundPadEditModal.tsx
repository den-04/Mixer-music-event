import React, { useState } from 'react';
import { X, Volume2, Mic, Check } from 'lucide-react';
import type { SoundPad, AudioTrack } from '../types/audio';

interface SoundPadEditModalProps {
  pad: SoundPad;
  tracks: AudioTrack[];
  onSave: (updated: SoundPad) => void;
  onClose: () => void;
}

const BUILTIN_SOUNDS = [
  { id: 'applause', label: '👏 Tiếng vỗ tay & hoan hô (Applause)' },
  { id: 'fanfare', label: '🎺 Kèn trao giải vinh danh (Fanfare)' },
  { id: 'drumroll', label: '🥁 Trống hồi hộp & Crash (Drumroll)' },
  { id: 'countdown', label: '⏰ Đếm ngược 5-4-3-2-1 (Countdown)' },
  { id: 'correct', label: '✅ Trả lời đúng (Ding Chime)' },
  { id: 'wrong', label: '❌ Trả lời sai (Buzzer Error)' },
  { id: 'jackpot', label: '🎁 Quay số trúng thưởng (Jackpot)' },
  { id: 'gong', label: '🔔 Chiêng khai mạc (Gong Bell)' }
];

const PRESET_COLORS = [
  '#00f2fe', // Cyan
  '#00e676', // Emerald Green
  '#ff9100', // Amber Orange
  '#ff1744', // Crimson Red
  '#d500f9', // Magenta
  '#7c4dff', // Purple
  '#ffd600', // Yellow
  '#2979ff'  // Blue
];

export const SoundPadEditModal: React.FC<SoundPadEditModalProps> = ({
  pad,
  tracks,
  onSave,
  onClose
}) => {
  const [label, setLabel] = useState(pad.label);
  const [hotkey, setHotkey] = useState(pad.hotkey);
  const [color, setColor] = useState(pad.color);
  const [soundType, setSoundType] = useState<'builtin' | 'custom'>(pad.soundType);
  const [builtinId, setBuiltinId] = useState(pad.builtinId || 'applause');
  const [trackId, setTrackId] = useState(pad.trackId || '');
  const [volume, setVolume] = useState(pad.volume);
  const [ducking, setDucking] = useState(pad.ducking);

  const handleSave = () => {
    onSave({
      ...pad,
      label,
      hotkey,
      color,
      soundType,
      builtinId,
      trackId: soundType === 'custom' ? trackId : undefined,
      volume,
      ducking
    });
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content soundpad-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Cấu hình Nút Bấm Hiệu Ứng (Pad {pad.slot + 1})</h3>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-form">
          <div className="form-group">
            <label>Tên hiển thị trên nút:</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="VD: Vỗ tay lớn, Kèn trao giải..."
              className="form-input"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phím tắt bàn phím:</label>
              <input
                type="text"
                maxLength={4}
                value={hotkey}
                onChange={(e) => setHotkey(e.target.value.toUpperCase())}
                placeholder="VD: 1, Q, SPACE..."
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Màu nút:</label>
              <div className="color-picker-row">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-dot-btn ${color === c ? 'active' : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label>Nguồn âm thanh:</label>
            <div className="radio-pills">
              <button
                type="button"
                className={`radio-pill ${soundType === 'builtin' ? 'active' : ''}`}
                onClick={() => setSoundType('builtin')}
              >
                Hiệu ứng có sẵn chuẩn sự kiện
              </button>
              <button
                type="button"
                className={`radio-pill ${soundType === 'custom' ? 'active' : ''}`}
                onClick={() => setSoundType('custom')}
              >
                Chọn từ kho nhạc của bạn
              </button>
            </div>
          </div>

          {soundType === 'builtin' ? (
            <div className="form-group">
              <label>Chọn hiệu ứng có sẵn:</label>
              <select
                value={builtinId}
                onChange={(e) => {
                  setBuiltinId(e.target.value);
                  const found = BUILTIN_SOUNDS.find((s) => s.id === e.target.value);
                  if (found) setLabel(found.label.split('(')[0].trim());
                }}
                className="form-select"
              >
                {BUILTIN_SOUNDS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="form-group">
              <label>Chọn bài từ kho nhạc:</label>
              <select
                value={trackId}
                onChange={(e) => {
                  setTrackId(e.target.value);
                  const found = tracks.find((t) => t.id === e.target.value);
                  if (found) setLabel(found.title);
                }}
                className="form-select"
              >
                <option value="">-- Chọn bài hát hoặc hiệu ứng --</option>
                {tracks.map((t) => (
                  <option key={t.id} value={t.id}>
                    [{t.category.toUpperCase()}] {t.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>
                <Volume2 size={16} /> Âm lượng riêng: {Math.round(volume * 100)}%
              </label>
              <input
                type="range"
                min="0.1"
                max="1.2"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="form-range"
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={ducking}
                  onChange={(e) => setDucking(e.target.checked)}
                />
                <span>
                  <Mic size={15} /> Tự động giảm nhạc nền khi phát hiệu ứng này (Audio Ducking)
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={handleSave}>
            <Check size={16} /> Lưu cài đặt Pad
          </button>
        </div>
      </div>
    </div>
  );
};
