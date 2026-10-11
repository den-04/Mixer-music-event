import React, { useState, useRef } from 'react';
import {
  Volume2, VolumeX, Mic, MicOff, TrendingDown, ArrowLeftRight,
  ChevronLeft, ChevronRight, Sliders, Settings2, X, Check, Volume1
} from 'lucide-react';
import type { MixerSettings } from '../types/audio';
import { VUMeter } from './VUMeter';

interface MixerSectionProps {
  settings: MixerSettings;
  masterVU: number;
  onCrossfaderChange: (val: number) => void;
  onAutoCrossfade: (target: 'A' | 'B', duration?: number) => void;
  onMasterVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleDucking: () => void;
  onFadeOutAll: () => void;
  onDuckingAmountChange?: (amount: number) => void;
}

export const MixerSection: React.FC<MixerSectionProps> = ({
  settings,
  masterVU,
  onCrossfaderChange,
  onAutoCrossfade,
  onMasterVolumeChange,
  onToggleMute,
  onToggleDucking,
  onFadeOutAll,
  onDuckingAmountChange
}) => {
  // Ducking Configuration Modal
  const [isDuckingModalOpen, setIsDuckingModalOpen] = useState(false);
  const clickTimeoutRef = useRef<number | null>(null);

  // Master Volume inline percentage editing
  const [isEditingMasterPercent, setIsEditingMasterPercent] = useState(false);
  const [tempMasterPercent, setTempMasterPercent] = useState('');

  const currentDuckingAmount = settings.duckingAmount ?? 0.25;
  const currentDropPercent = Math.round((1 - currentDuckingAmount) * 100);

  // Handle Ducking single click vs double click
  const handleDuckingClick = () => {
    // If a double-click is pending, cancel timer and open modal
    if (clickTimeoutRef.current) {
      window.clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      setIsDuckingModalOpen(true);
      return;
    }

    clickTimeoutRef.current = window.setTimeout(() => {
      clickTimeoutRef.current = null;
      onToggleDucking();
    }, 220);
  };

  const handleDuckingDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
    }
    setIsDuckingModalOpen(true);
  };

  const applyMasterPercent = () => {
    setIsEditingMasterPercent(false);
    const parsed = parseInt(tempMasterPercent);
    if (!isNaN(parsed)) {
      const clamped = Math.max(0, Math.min(100, parsed));
      onMasterVolumeChange((clamped / 100) * 1.2);
    }
  };

  return (
    <div className="mixer-center-card">
      <div className="mixer-header">
        <div className="mixer-title">
          <Sliders size={16} />
          <span>MASTER MIXER CONSOLE</span>
        </div>
      </div>

      {/* Main Master Controls & Meters */}
      <div className="mixer-body">
        {/* Left Side: Auto Transitions & Crossfader */}
        <div className="crossfader-container">
          <div className="crossfader-labels">
            <span className="cf-label-a">DECK A</span>
            <span className="cf-label-center">BALANCED</span>
            <span className="cf-label-b">DECK B</span>
          </div>

          <div className="crossfader-track-wrap">
            <input
              type="range"
              min="-1"
              max="1"
              step="0.02"
              value={settings.crossfader}
              onChange={(e) => onCrossfaderChange(parseFloat(e.target.value))}
              className="crossfader-slider"
              title="Kéo sang trái: Deck A, Giữa: Cả hai, Phải: Deck B"
            />
          </div>

          {/* Quick Auto Transition Buttons */}
          <div className="crossfader-actions">
            <button
              className="btn-autofade btn-autofade-a"
              onClick={() => onAutoCrossfade('A', settings.autoFadeDuration)}
              title={`Chuyển êm sang Deck A trong ${settings.autoFadeDuration}s`}
            >
              <ChevronLeft size={16} />
              <span>FADE SANG A ({settings.autoFadeDuration}s)</span>
            </button>

            <button
              className="btn-autofade-center"
              onClick={() => onCrossfaderChange(0)}
              title="Đưa Crossfader về chính giữa (50% A - 50% B)"
            >
              <ArrowLeftRight size={14} />
              <span>CÂN BẰNG</span>
            </button>

            <button
              className="btn-autofade btn-autofade-b"
              onClick={() => onAutoCrossfade('B', settings.autoFadeDuration)}
              title={`Chuyển êm sang Deck B trong ${settings.autoFadeDuration}s`}
            >
              <span>FADE SANG B ({settings.autoFadeDuration}s)</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* Master Output Section: Master Fader & Master Stereo Meter */}
        <div className="master-output-col">
          <div className="master-meter-section">
            <div className="master-fader-wrap">
              <input
                type="range"
                min="0"
                max="1.2"
                step="0.01"
                value={settings.masterVolume}
                onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                className="vertical-fader master-fader"
                title={`Master Volume: ${Math.round((settings.masterVolume / 1.2) * 100)}%`}
              />
              <div className="master-vu-pair">
                <VUMeter level={masterVU} segments={14} vertical label="L" />
                <VUMeter level={masterVU * 0.96} segments={14} vertical label="R" />
              </div>
            </div>

            {/* Master Volume Percentage (Editable on double-click) */}
            {isEditingMasterPercent ? (
              <div className="master-vol-edit-wrap">
                <input
                  type="number"
                  min="0"
                  max="100"
                  autoFocus
                  value={tempMasterPercent}
                  onChange={(e) => setTempMasterPercent(e.target.value)}
                  onBlur={applyMasterPercent}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') applyMasterPercent();
                    if (e.key === 'Escape') setIsEditingMasterPercent(false);
                  }}
                  className="master-vol-inline-input"
                />
                <span className="master-vol-unit">%</span>
              </div>
            ) : (
              <span
                className="master-vol-percent editable"
                onDoubleClick={(e) => {
                  e.stopPropagation();
                  setTempMasterPercent(String(Math.round((settings.masterVolume / 1.2) * 100)));
                  setIsEditingMasterPercent(true);
                }}
                title="Bấm double-click để gõ số % âm lượng Master trực tiếp"
              >
                {Math.round((settings.masterVolume / 1.2) * 100)}%
              </span>
            )}

            <span className="master-vol-title">MASTER</span>
          </div>
        </div>
      </div>

      {/* Emergency Event Toolbar: Big Red Buttons */}
      <div className="emergency-toolbar">
        {/* Smooth Fade Out All */}
        <button
          className="btn-emergency btn-fadeout-all"
          onClick={onFadeOutAll}
          title="Hạ âm lượng cả 2 Deck êm dịu trong 2 giây khi MC phát biểu (Phím F)"
        >
          <TrendingDown size={18} />
          <div className="btn-text-group">
            <span className="btn-main-label">FADE OUT TẤT CẢ (2s)</span>
            <span className="btn-sub-label">Khi MC bước lên phát biểu [F]</span>
          </div>
        </button>

        {/* MC Ducking (Click: Toggle / Double-click: Config % Amount) */}
        <button
          className={`btn-emergency btn-ducking ${settings.isDuckingActive ? 'active' : ''}`}
          onClick={handleDuckingClick}
          onDoubleClick={handleDuckingDoubleClick}
          title={`Bấm 1 lần hoặc nhấn phím D để Bật/Tắt.\nDOUBLE-CLICK để chỉnh % âm lượng hạ nhỏ (hiện tại: -${currentDropPercent}%).`}
        >
          {settings.isDuckingActive ? <Mic size={18} /> : <MicOff size={18} />}
          <div className="btn-text-group">
            <span className="btn-main-label">
              {settings.isDuckingActive
                ? `MC DUCKING (-${currentDropPercent}%): ĐANG BẬT`
                : `MC DUCKING (-${currentDropPercent}%)`}
            </span>
            <span className="btn-sub-label">
              Hạ nhỏ nền khi MC nói [D]
              <span className="dblclick-badge">2x click đổi %</span>
            </span>
          </div>

          <div
            className="btn-ducking-gear-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsDuckingModalOpen(true);
            }}
            title="Bấm để chỉnh % âm lượng hạ nhỏ"
          >
            <Settings2 size={13} />
          </div>
        </button>

        {/* Emergency Mute */}
        <button
          className={`btn-emergency btn-master-mute ${settings.isMuted ? 'muted' : ''}`}
          onClick={onToggleMute}
          title="Ngắt tiếng khẩn cấp nếu có sự cố hú micro hoặc phát nhầm [M]"
        >
          {settings.isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <div className="btn-text-group">
            <span className="btn-main-label">
              {settings.isMuted ? 'ĐÃ NGẮT TIẾNG (MUTED)' : 'MUTE KHẨN CẤP'}
            </span>
            <span className="btn-sub-label">Cắt tiếng tức thì [M]</span>
          </div>
        </button>
      </div>

      {/* Ducking Percentage Configuration Modal */}
      {isDuckingModalOpen && (
        <div className="ducking-modal-overlay" onClick={() => setIsDuckingModalOpen(false)}>
          <div className="ducking-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="ducking-modal-header">
              <div className="ducking-modal-title">
                <Mic size={18} className="text-cyan" />
                <span>CHỈNH % HẠ ÂM LƯỢNG MC DUCKING</span>
              </div>
              <button
                className="btn-modal-close"
                onClick={() => setIsDuckingModalOpen(false)}
                title="Đóng (ESC)"
              >
                <X size={16} />
              </button>
            </div>

            <div className="ducking-modal-body">
              <div className="ducking-status-preview">
                <div className="ducking-preview-stat">
                  <span className="stat-label">Mức giảm khi MC nói:</span>
                  <span className="stat-value text-red">-{currentDropPercent}%</span>
                </div>
                <div className="ducking-preview-stat">
                  <span className="stat-label">Âm lượng nền còn lại:</span>
                  <span className="stat-value text-cyan">{100 - currentDropPercent}%</span>
                </div>
              </div>

              {/* Slider */}
              <div className="ducking-slider-group">
                <div className="ducking-slider-labels">
                  <span>-10% (Giảm ít)</span>
                  <span className="current-percent-tag">-{currentDropPercent}%</span>
                  <span>-95% (Giảm rất mạnh)</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="95"
                  step="5"
                  value={currentDropPercent}
                  onChange={(e) => {
                    const drop = parseInt(e.target.value);
                    const remaining = (100 - drop) / 100;
                    onDuckingAmountChange?.(remaining);
                  }}
                  className="ducking-range-slider"
                />
              </div>

              {/* Quick Presets */}
              <div className="ducking-presets-group">
                <span className="presets-label">Mức phổ biến trong sự kiện:</span>
                <div className="presets-buttons">
                  {[
                    { drop: 50, label: '-50% (Nhẹ 1/2)' },
                    { drop: 70, label: '-70% (Vừa)' },
                    { drop: 75, label: '-75% (Tiêu chuẩn)' },
                    { drop: 80, label: '-80% (Rõ MC)' },
                    { drop: 90, label: '-90% (Rất nhỏ)' }
                  ].map((preset) => (
                    <button
                      key={preset.drop}
                      type="button"
                      className={`btn-ducking-preset ${currentDropPercent === preset.drop ? 'active' : ''}`}
                      onClick={() => {
                        const remaining = (100 - preset.drop) / 100;
                        onDuckingAmountChange?.(remaining);
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Test Toggle */}
              <div className="ducking-test-row">
                <button
                  type="button"
                  className={`btn-test-ducking ${settings.isDuckingActive ? 'testing' : ''}`}
                  onClick={onToggleDucking}
                  title="Bật thử Ducking để nghe trực tiếp độ nhỏ của nhạc nền hiện tại"
                >
                  {settings.isDuckingActive ? (
                    <>
                      <Volume1 size={16} />
                      <span>ĐANG TEST DUCKING: ĐÃ HẠ NHỎ NHẠC (BẤM ĐỂ TẮT)</span>
                    </>
                  ) : (
                    <>
                      <Mic size={16} />
                      <span>BẬT THỬ ĐỂ NGHE ĐỘ NHỎ NHẠC NỀN TRỰC TIẾP</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="ducking-modal-footer">
              <span className="ducking-hint-text">
                💡 Bạn có thể double click lại vào nút MC Ducking bất cứ lúc nào để chỉnh %.
              </span>
              <button
                className="btn-modal-done"
                onClick={() => setIsDuckingModalOpen(false)}
              >
                <Check size={16} />
                <span>XONG & LƯU</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
