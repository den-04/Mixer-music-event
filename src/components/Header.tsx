import React, { useState, useEffect } from 'react';
import { 
  Save, Download, Upload, Clock, Maximize2, Minimize2, 
  Keyboard, Play, RotateCcw, Activity, Edit2, Bookmark
} from 'lucide-react';

interface HeaderProps {
  projectName: string;
  onUpdateProjectName: (name: string) => void;
  onSaveProject: () => void;
  onExportProject: () => void;
  onImportProject: (file: File) => void;
  onOpenPresets: () => void;
  onOpenHotkeys: () => void;
  isSaved: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  projectName,
  onUpdateProjectName,
  onSaveProject,
  onExportProject,
  onImportProject,
  onOpenPresets,
  onOpenHotkeys,
  isSaved
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // Real-time Stage Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  // Stage Stopwatch / Timer
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);
  const [isStopwatchRunning, setIsStopwatchRunning] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('vi-VN', { hour12: false }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let swInterval: ReturnType<typeof setInterval> | undefined;
    if (isStopwatchRunning) {
      swInterval = setInterval(() => {
        setStopwatchSeconds((s) => s + 1);
      }, 1000);
    }
    return () => {
      if (swInterval) clearInterval(swInterval);
    };
  }, [isStopwatchRunning]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(console.error);
      setIsFullscreen(false);
    }
  };

  const formatStopwatch = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <header className="app-header">
      {/* Brand & Project Name */}
      <div className="header-brand-group">
        <div className="header-logo">
          <Activity className="header-logo-icon" size={24} />
          <div className="logo-text-col">
            <span className="logo-brand">EVENTMIX</span>
            <span className="logo-pro-badge">PRO</span>
          </div>
        </div>

        <div className="project-title-wrap">
          {isEditingTitle ? (
            <input
              type="text"
              defaultValue={projectName}
              onBlur={(e) => {
                onUpdateProjectName(e.target.value.trim() || 'Kịch Bản Sự Kiện Mới');
                setIsEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onUpdateProjectName((e.target as HTMLInputElement).value.trim() || 'Kịch Bản Sự Kiện Mới');
                  setIsEditingTitle(false);
                }
              }}
              autoFocus
              className="project-title-input"
            />
          ) : (
            <div 
              className="project-title-display" 
              onClick={() => setIsEditingTitle(true)}
              title="Nhấp để đổi tên kịch bản sự kiện"
            >
              <h2>{projectName}</h2>
              <Edit2 size={13} className="edit-icon" />
            </div>
          )}
        </div>
      </div>

      {/* Stage Clocks & Stopwatch */}
      <div className="header-timing-group">
        {/* Real-time Clock */}
        <div className="stage-clock" title="Giờ hiện tại">
          <Clock size={15} />
          <span className="clock-digits">{currentTime}</span>
        </div>

        {/* MC Stopwatch */}
        <div className="stage-stopwatch" title="Bấm giờ MC phát biểu / Tiết mục">
          <span className="sw-label">BẤM GIỜ:</span>
          <span className="sw-digits">{formatStopwatch(stopwatchSeconds)}</span>
          <button
            className={`sw-btn ${isStopwatchRunning ? 'running' : ''}`}
            onClick={() => setIsStopwatchRunning(!isStopwatchRunning)}
            title={isStopwatchRunning ? 'Tạm dừng' : 'Bắt đầu bấm giờ'}
          >
            <Play size={12} />
          </button>
          <button
            className="sw-btn"
            onClick={() => {
              setIsStopwatchRunning(false);
              setStopwatchSeconds(0);
            }}
            title="Đặt lại 00:00"
          >
            <RotateCcw size={12} />
          </button>
        </div>
      </div>

      {/* File Operations & Shortcuts */}
      <div className="header-actions-group">
        <input
          type="file"
          ref={fileInputRef}
          accept=".eventmix,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onImportProject(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        {/* Preset Management */}
        <button
          className="btn-header btn-header-presets"
          onClick={onOpenPresets}
          title="Quản lý và nạp các Preset sự kiện đã lưu (để không phải set từ đầu)"
        >
          <Bookmark size={15} />
          <span>PRESET SỰ KIỆN</span>
        </button>

        <button
          className={`btn-header ${isSaved ? 'btn-saved' : ''}`}
          onClick={onSaveProject}
          title="Lưu trạng thái kịch bản vào bộ nhớ máy"
        >
          <Save size={15} />
          <span>{isSaved ? 'ĐÃ LƯU' : 'LƯU DỰ ÁN'}</span>
        </button>

        <button
          className="btn-header"
          onClick={onExportProject}
          title="Xuất file kịch bản (.eventmix) để tải về máy hoặc chuyển máy khác"
        >
          <Download size={15} />
          <span>XUẤT KỊCH BẢN</span>
        </button>

        <button
          className="btn-header"
          onClick={() => fileInputRef.current?.click()}
          title="Mở file kịch bản (.eventmix hoặc .json) đã lưu trước đó"
        >
          <Upload size={15} />
          <span>MỞ KỊCH BẢN</span>
        </button>

        <button
          className="btn-header btn-hotkeys"
          onClick={onOpenHotkeys}
          title="Bảng phím tắt bàn phím [?]"
        >
          <Keyboard size={15} />
          <span>PHÍM TẮT</span>
        </button>

        <button
          className="btn-header btn-fullscreen"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Toàn màn hình [F11]'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>
    </header>
  );
};
