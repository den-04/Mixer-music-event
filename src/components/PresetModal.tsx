import React, { useState, useEffect, useRef } from 'react';
import {
  X, Bookmark, Plus, Check, Star, Trash2, Download, Upload,
  Clock, Music, ListOrdered, Sparkles, FolderDown, ArrowRight
} from 'lucide-react';
import type { AudioTrack, CueItem, SoundPad, ProjectData, MixerSettings, QuickLaunchSlot, EventPreset } from '../types/audio';
import { storageService } from '../services/storage';

interface PresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProjectData: {
    projectName: string;
    tracks: AudioTrack[];
    cues: CueItem[];
    soundpads: SoundPad[];
    quickLaunchSlots: QuickLaunchSlot[];
    mixerSettings: MixerSettings;
  };
  onLoadPreset: (presetData: ProjectData) => Promise<void>;
}

export const PresetModal: React.FC<PresetModalProps> = ({
  isOpen,
  onClose,
  currentProjectData,
  onLoadPreset
}) => {
  const [presets, setPresets] = useState<EventPreset[]>([]);
  const [defaultPresetId, setDefaultPresetId] = useState<string | null>(null);
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetDesc, setNewPresetDesc] = useState('');
  const [setAsDefaultOnSave, setSetAsDefaultOnSave] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'list' | 'save'>('list');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load presets from storage
  const loadPresets = async () => {
    try {
      const list = await storageService.getPresets();
      setPresets(list);
      const defId = await storageService.getDefaultPresetId();
      setDefaultPresetId(defId);
    } catch (err) {
      console.error('Error loading presets:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPresets();
      setNewPresetName(currentProjectData.projectName || 'Preset Sự Kiện Mới');
      setNewPresetDesc('');
    }
  }, [isOpen, currentProjectData.projectName]);

  if (!isOpen) return null;

  // Save current state as new preset
  const handleSaveNewPreset = async () => {
    const name = newPresetName.trim() || 'Preset Sự Kiện Mới';
    setIsLoading(true);

    try {
      const sanitizedTracks = currentProjectData.tracks.map((t) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fileUrl, ...rest } = t;
        return rest;
      });

      const presetId = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const preset: EventPreset = {
        id: presetId,
        name,
        description: newPresetDesc.trim(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data: {
          projectName: name,
          version: '1.0.0',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          tracks: sanitizedTracks,
          cues: currentProjectData.cues,
          soundpads: currentProjectData.soundpads,
          quickLaunchSlots: currentProjectData.quickLaunchSlots,
          mixerSettings: currentProjectData.mixerSettings
        }
      };

      await storageService.savePreset(preset);

      if (setAsDefaultOnSave) {
        await storageService.setDefaultPresetId(presetId);
        setDefaultPresetId(presetId);
      }

      await loadPresets();
      setActiveTab('list');
      setSelectedPresetId(presetId);
      alert(`Đã lưu preset "${name}" thành công!`);
    } catch (err: any) {
      alert(`Lỗi khi lưu preset: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Overwrite existing preset with current setup
  const handleOverwritePreset = async (presetId: string) => {
    const existing = presets.find((p) => p.id === presetId);
    if (!existing) return;

    if (!window.confirm(`Bạn có chắc muốn GHI ĐÈ thiết lập hiện tại lên Preset "${existing.name}"?`)) {
      return;
    }

    setIsLoading(true);
    try {
      const sanitizedTracks = currentProjectData.tracks.map((t) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { fileUrl, ...rest } = t;
        return rest;
      });

      const updatedPreset: EventPreset = {
        ...existing,
        updatedAt: Date.now(),
        data: {
          ...existing.data,
          projectName: existing.name,
          updatedAt: Date.now(),
          tracks: sanitizedTracks,
          cues: currentProjectData.cues,
          soundpads: currentProjectData.soundpads,
          quickLaunchSlots: currentProjectData.quickLaunchSlots,
          mixerSettings: currentProjectData.mixerSettings
        }
      };

      await storageService.savePreset(updatedPreset);
      await loadPresets();
      alert(`Đã cập nhật preset "${existing.name}" thành công!`);
    } catch (err: any) {
      alert(`Lỗi khi cập nhật preset: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Load a preset
  const handleApplyPreset = async (preset: EventPreset) => {
    setIsLoading(true);
    try {
      await onLoadPreset(preset.data);
      onClose();
    } catch (err: any) {
      alert(`Lỗi khi nạp preset: ${err?.message || err}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Toggle default preset on startup
  const handleToggleDefault = async (presetId: string) => {
    try {
      if (defaultPresetId === presetId) {
        await storageService.setDefaultPresetId(null);
        setDefaultPresetId(null);
      } else {
        await storageService.setDefaultPresetId(presetId);
        setDefaultPresetId(presetId);
      }
    } catch (err) {
      console.error('Error toggling default preset:', err);
    }
  };

  // Delete preset
  const handleDeletePreset = async (presetId: string, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa preset "${name}"?`)) return;
    try {
      await storageService.deletePreset(presetId);
      if (defaultPresetId === presetId) {
        await storageService.setDefaultPresetId(null);
        setDefaultPresetId(null);
      }
      await loadPresets();
    } catch (err) {
      console.error('Error deleting preset:', err);
    }
  };

  // Export preset to file
  const handleExportPreset = (preset: EventPreset) => {
    storageService.exportProjectFile(preset.data);
  };

  // Import preset file
  const handleImportPresetFile = async (file: File) => {
    try {
      const data = await storageService.parseProjectFile(file);
      const name = data.projectName || file.name.replace(/\.[^/.]+$/, '');
      const presetId = `preset_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const preset: EventPreset = {
        id: presetId,
        name,
        description: 'Nhập từ file máy tính',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        data
      };
      await storageService.savePreset(preset);
      await loadPresets();
      setSelectedPresetId(presetId);
      alert(`Đã thêm preset "${name}" từ file vào danh sách!`);
    } catch (err: any) {
      alert(`Lỗi nạp file preset: ${err?.message || err}`);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    const date = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    return `${time} - ${date}`;
  };

  const assignedQuickLaunchCount = currentProjectData.quickLaunchSlots?.filter((s) => s.trackId).length || 0;
  const currentDropPercent = Math.round((1 - (currentProjectData.mixerSettings.duckingAmount ?? 0.25)) * 100);

  return (
    <div className="preset-modal-overlay" onClick={onClose}>
      <div className="preset-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Hidden File Input for Preset Import */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".eventmix,.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleImportPresetFile(e.target.files[0]);
              e.target.value = '';
            }
          }}
        />

        {/* Modal Header */}
        <div className="preset-modal-header">
          <div className="preset-modal-title">
            <Bookmark size={20} className="text-cyan" />
            <div>
              <h3>QUẢN LÝ PRESET SỰ KIỆN</h3>
              <p className="preset-modal-sub">
                Lưu toàn bộ kịch bản, kho nhạc, bàn 12 bài quan trọng & cài đặt mixer để mở lại chạy ngay
              </p>
            </div>
          </div>
          <button className="btn-modal-close" onClick={onClose} title="Đóng (ESC)">
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="preset-tabs-bar">
          <button
            className={`preset-tab-btn ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <FolderDown size={15} />
            <span>DANH SÁCH PRESET ĐÃ LƯU ({presets.length})</span>
          </button>
          <button
            className={`preset-tab-btn ${activeTab === 'save' ? 'active' : ''}`}
            onClick={() => setActiveTab('save')}
          >
            <Plus size={15} />
            <span>+ LƯU THIẾT LẬP HIỆN TẠI THÀNH PRESET</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="preset-modal-body">
          {activeTab === 'list' ? (
            <div className="preset-list-container">
              {/* Top Action Bar in List */}
              <div className="preset-list-actions">
                <button
                  className="btn-preset-action-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  title="Nhập file preset (.eventmix) từ máy tính"
                >
                  <Upload size={14} />
                  <span>NẠP TỪ FILE MÁY TÍNH (.eventmix)</span>
                </button>

                <button
                  className="btn-preset-action-primary"
                  onClick={() => setActiveTab('save')}
                >
                  <Plus size={14} />
                  <span>LƯU THIẾT LẬP HIỆN TẠI</span>
                </button>
              </div>

              {/* Presets List */}
              {presets.length === 0 ? (
                <div className="preset-empty-state">
                  <Bookmark size={48} className="empty-icon" />
                  <h4>Chưa có Preset nào được lưu</h4>
                  <p>
                    Hãy thiết lập kho nhạc, kịch bản cue và bàn nhạc quan trọng, sau đó bấm{' '}
                    <strong>"Lưu thiết lập hiện tại"</strong> để lưu lại dùng nhiều lần!
                  </p>
                  <button
                    className="btn-preset-primary-lg"
                    onClick={() => setActiveTab('save')}
                  >
                    <Plus size={16} />
                    <span>Lưu thiết lập hiện tại ngay bây giờ</span>
                  </button>
                </div>
              ) : (
                <div className="preset-cards-grid">
                  {presets.map((p) => {
                    const isDefault = defaultPresetId === p.id;
                    const trackCount = p.data.tracks?.length || 0;
                    const cueCount = p.data.cues?.length || 0;
                    const qlCount = p.data.quickLaunchSlots?.filter((s) => s.trackId).length || 0;
                    const duckAmount = p.data.mixerSettings?.duckingAmount ?? 0.25;
                    const duckPercent = Math.round((1 - duckAmount) * 100);

                    return (
                      <div
                        key={p.id}
                        className={`preset-card ${selectedPresetId === p.id ? 'selected' : ''} ${isDefault ? 'is-default' : ''}`}
                        onClick={() => setSelectedPresetId(p.id)}
                      >
                        <div className="preset-card-header">
                          <div className="preset-title-group">
                            <span className="preset-name">{p.name}</span>
                            {isDefault && (
                              <span className="badge-default-preset" title="Preset này sẽ tự động nạp mỗi khi mở ứng dụng">
                                <Star size={11} />
                                <span>MẶC ĐỊNH KHỞI ĐỘNG</span>
                              </span>
                            )}
                          </div>

                          <div className="preset-card-actions">
                            <button
                              className={`btn-preset-star ${isDefault ? 'active' : ''}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleDefault(p.id);
                              }}
                              title={isDefault ? 'Bỏ làm mặc định' : 'Đặt làm preset mặc định khi mở app'}
                            >
                              <Star size={14} />
                            </button>

                            <button
                              className="btn-preset-icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportPreset(p);
                              }}
                              title="Tải file preset (.eventmix) về máy tính"
                            >
                              <Download size={14} />
                            </button>

                            <button
                              className="btn-preset-icon btn-preset-danger"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePreset(p.id, p.name);
                              }}
                              title="Xóa preset này"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {p.description && (
                          <p className="preset-card-desc">{p.description}</p>
                        )}

                        <div className="preset-meta-tags">
                          <span className="meta-tag">
                            <Music size={12} />
                            <span>{trackCount} bài nhạc</span>
                          </span>
                          <span className="meta-tag">
                            <ListOrdered size={12} />
                            <span>{cueCount} kịch bản cue</span>
                          </span>
                          {qlCount > 0 && (
                            <span className="meta-tag meta-tag-ql">
                              <Star size={12} />
                              <span>{qlCount} bài F1-F12</span>
                            </span>
                          )}
                          <span className="meta-tag">
                            <span>Ducking: -{duckPercent}%</span>
                          </span>
                        </div>

                        <div className="preset-card-footer">
                          <span className="preset-date">
                            <Clock size={11} />
                            <span>{formatDate(p.updatedAt || p.createdAt)}</span>
                          </span>

                          <div className="preset-card-btns">
                            <button
                              className="btn-preset-overwrite"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOverwritePreset(p.id);
                              }}
                              title="Ghi đè kịch bản hiện tại lên preset này"
                            >
                              <span>Cập nhật</span>
                            </button>

                            <button
                              className="btn-preset-apply"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApplyPreset(p);
                              }}
                              title="Nạp ngay preset này vào bàn mixer"
                            >
                              <span>NẠP PRESET</span>
                              <ArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* Save New Preset Form */
            <div className="preset-save-container">
              <div className="preset-save-info-box">
                <Sparkles size={18} className="text-cyan" />
                <div>
                  <h4>Lưu thiết lập sự kiện hiện tại thành Preset</h4>
                  <p>
                    Bao gồm toàn bộ: Kho bài hát, Kịch bản sự kiện (Cue list), Bàn 12 bài quan trọng (F1-F12),
                    Phím hiệu Soundpads và Cài đặt Mixer (Ducking, Master volume).
                  </p>
                </div>
              </div>

              {/* Current Setup Summary */}
              <div className="preset-summary-grid">
                <div className="summary-stat-card">
                  <Music size={16} className="text-cyan" />
                  <div className="stat-content">
                    <span className="stat-num">{currentProjectData.tracks.length}</span>
                    <span className="stat-label">Bài hát trong kho</span>
                  </div>
                </div>

                <div className="summary-stat-card">
                  <ListOrdered size={16} className="text-cyan" />
                  <div className="stat-content">
                    <span className="stat-num">{currentProjectData.cues.length}</span>
                    <span className="stat-label">Mục kịch bản Cue</span>
                  </div>
                </div>

                <div className="summary-stat-card">
                  <Star size={16} className="text-amber" />
                  <div className="stat-content">
                    <span className="stat-num">{assignedQuickLaunchCount}</span>
                    <span className="stat-label">Bài quan trọng F1-F12</span>
                  </div>
                </div>

                <div className="summary-stat-card">
                  <Bookmark size={16} className="text-emerald" />
                  <div className="stat-content">
                    <span className="stat-num">-{currentDropPercent}%</span>
                    <span className="stat-label">MC Ducking</span>
                  </div>
                </div>
              </div>

              {/* Form Input */}
              <div className="preset-form-group">
                <label className="preset-form-label">
                  Tên Preset / Tên Sự Kiện <span className="required">*</span>
                </label>
                <input
                  type="text"
                  value={newPresetName}
                  onChange={(e) => setNewPresetName(e.target.value)}
                  placeholder="Ví dụ: Gala Dinner 2026, Đám cưới Tuấn & Ly, Hội nghị Khách hàng..."
                  className="preset-form-input"
                  autoFocus
                />
              </div>

              <div className="preset-form-group">
                <label className="preset-form-label">Ghi chú / Mô tả ngắn</label>
                <textarea
                  value={newPresetDesc}
                  onChange={(e) => setNewPresetDesc(e.target.value)}
                  placeholder="Ví dụ: Đã gán bài đón khách lặp Deck A, bài trao giải Deck B, Ducking -80%..."
                  rows={2}
                  className="preset-form-textarea"
                />
              </div>

              {/* Set As Default Checkbox */}
              <div
                className="preset-default-toggle"
                onClick={() => setSetAsDefaultOnSave(!setAsDefaultOnSave)}
              >
                <div className={`checkbox-custom ${setAsDefaultOnSave ? 'checked' : ''}`}>
                  {setAsDefaultOnSave && <Check size={14} />}
                </div>
                <div>
                  <span className="toggle-title">⭐ Đặt làm Preset mặc định khi khởi động</span>
                  <p className="toggle-desc">
                    Mỗi lần mở ứng dụng lên, toàn bộ kịch bản và nhạc của Preset này sẽ tự động nạp sẵn vào bàn mixer,
                    bạn không cần phải cài đặt lại từ đầu!
                  </p>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="preset-form-actions">
                <button
                  type="button"
                  className="btn-preset-cancel"
                  onClick={() => setActiveTab('list')}
                >
                  Quay lại danh sách
                </button>

                <button
                  type="button"
                  className="btn-preset-save-submit"
                  onClick={handleSaveNewPreset}
                  disabled={isLoading}
                >
                  <Check size={16} />
                  <span>{isLoading ? 'Đang lưu...' : 'LƯU THÀNH PRESET MỚI'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
