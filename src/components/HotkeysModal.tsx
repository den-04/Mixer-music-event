import React from 'react';
import { X, Keyboard } from 'lucide-react';

interface HotkeysModalProps {
  onClose: () => void;
}

export const HotkeysModal: React.FC<HotkeysModalProps> = ({ onClose }) => {
  const hotkeyGroups = [
    {
      title: 'KỊCH BẢN & PHÁT NHẠC',
      items: [
        { key: 'SPACEBAR', desc: 'Bấm "GO" sang mục kịch bản tiếp theo / Play-Pause' },
        { key: 'F', desc: 'FADE OUT tức thời trong 2 giây (khi MC bắt đầu nói)' },
        { key: 'D', desc: 'Bật/tắt chế độ MC Ducking (-75% âm lượng nền)' },
        { key: 'M', desc: 'MUTE KHẨN CẤP (cắt toàn bộ âm thanh ngay lập tức)' }
      ]
    },
    {
      title: 'BÀN HIỆU ỨNG TỨC THÌ (SOUNDBOARD)',
      items: [
        { key: '1 .. 9, 0', desc: 'Kích hoạt ngay các Soundpad 1 đến 10 (Vỗ tay, Kèn, Trống...)' },
        { key: 'ESC', desc: 'Dừng âm thanh tất cả các Soundpad đang kêu' }
      ]
    },
    {
      title: 'BÀN TRỘN MIXER & CHUYỂN BÀI',
      items: [
        { key: '[', desc: 'Tự động Fade mượt sang Deck A (Auto Crossfade A)' },
        { key: ']', desc: 'Tự động Fade mượt sang Deck B (Auto Crossfade B)' },
        { key: '\\', desc: 'Đưa Crossfader về chính giữa (Cân bằng A & B)' },
        { key: 'F11', desc: 'Bật/Tắt chế độ Toàn Màn Hình sân khấu' }
      ]
    }
  ];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content hotkeys-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="hotkeys-modal-title">
            <Keyboard size={20} className="text-cyan" />
            <h3>BẢNG PHÍM TẮT ĐIỀU KHIỂN SÂN KHẤU (HOTKEYS)</h3>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="hotkeys-modal-body">
          <p className="hotkeys-intro">
            Thao tác bàn phím giúp bạn phản xạ cực nhanh với diễn biến trên sân khấu mà không cần rê chuột:
          </p>

          <div className="hotkeys-grid">
            {hotkeyGroups.map((group, gIdx) => (
              <div key={gIdx} className="hotkey-group-card">
                <h4>{group.title}</h4>
                <div className="hotkey-items-list">
                  {group.items.map((item, iIdx) => (
                    <div key={iIdx} className="hotkey-item-row">
                      <kbd className="hotkey-kbd">{item.key}</kbd>
                      <span className="hotkey-desc">{item.desc}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            Đã hiểu, đóng bảng phím tắt
          </button>
        </div>
      </div>
    </div>
  );
};
