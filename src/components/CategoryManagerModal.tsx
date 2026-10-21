import React, { useState } from 'react';
import {
  X, Plus, Trash2, Edit2, Check, ArrowUp, ArrowDown,
  RotateCcw, FolderPlus, Tag, Music, AlertCircle
} from 'lucide-react';
import type { AudioTrack, CustomCategory } from '../types/audio';
import { DEFAULT_CATEGORIES } from '../types/audio';

interface CategoryManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CustomCategory[];
  tracks: AudioTrack[];
  onSaveCategories: (categories: CustomCategory[]) => void;
  onReassignTracksCategory?: (fromCatId: string, toCatId: string) => void;
}

const POPULAR_EMOJIS = [
  '🎪', '🎤', '🎙️', '🏆', '🎲', '👋', '🎵', '🎸', '🥁', '🎹',
  '🎷', '💃', '🕺', '🥂', '🍾', '🎂', '🎁', '🌟', '✨', '🔔',
  '🎬', '🎭', '🎧', '📢', '💥', '🎇', '👑', '🥇', '🥈', '🥉',
  '🍽️', '☕', '⚡', '🔥', '🚀', '❤️'
];

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  categories,
  tracks,
  onSaveCategories,
  onReassignTracksCategory
}) => {
  // Local working copy of categories
  const [list, setList] = useState<CustomCategory[]>(() => [...categories]);

  // Form state for creating new category
  const [newLabel, setNewLabel] = useState('');
  const [newIcon, setNewIcon] = useState('🎵');

  // Inline editing state: category id being edited
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editIcon, setEditIcon] = useState('');

  // Confirmation message state
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'warn' } | null>(null);

  if (!isOpen) return null;

  const showFeedback = (text: string, type: 'success' | 'warn' = 'success') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  // Count tracks in a category
  const getTrackCount = (catId: string) => {
    return tracks.filter((t) => t.category === catId).length;
  };

  // Add new category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabel.trim();
    if (!trimmed) return;

    // Check duplicate label or id
    const newId = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const nextOrder = list.length > 0 ? Math.max(...list.map((c) => c.order || 0)) + 1 : 1;

    const newCategory: CustomCategory = {
      id: newId,
      label: trimmed,
      icon: newIcon || '🎵',
      order: nextOrder,
      isBuiltIn: false
    };

    const nextList = [...list, newCategory];
    setList(nextList);
    onSaveCategories(nextList);
    setNewLabel('');
    setNewIcon('🎵');
    showFeedback(`Đã thêm danh mục mới: "${newCategory.icon} ${newCategory.label}"`);
  };

  // Start inline editing
  const handleStartEdit = (cat: CustomCategory) => {
    setEditingId(cat.id);
    setEditLabel(cat.label);
    setEditIcon(cat.icon);
  };

  // Save inline edit
  const handleSaveEdit = (catId: string) => {
    const trimmed = editLabel.trim();
    if (!trimmed) return;

    const nextList = list.map((c) =>
      c.id === catId ? { ...c, label: trimmed, icon: editIcon || c.icon } : c
    );
    setList(nextList);
    onSaveCategories(nextList);
    setEditingId(null);
    showFeedback('Đã cập nhật danh mục!');
  };

  // Reorder up / down
  const handleMove = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const nextList = [...list];
    const temp = nextList[index];
    nextList[index] = nextList[targetIndex];
    nextList[targetIndex] = temp;

    // Reassign order
    const updated = nextList.map((c, idx) => ({ ...c, order: idx + 1 }));
    setList(updated);
    onSaveCategories(updated);
  };

  // Delete category
  const handleDeleteCategory = (cat: CustomCategory) => {
    if (list.length <= 1) {
      alert('Phải giữ lại ít nhất 1 danh mục để phân loại bài hát!');
      return;
    }

    const count = getTrackCount(cat.id);
    const fallbackCategory = list.find((c) => c.id !== cat.id) || DEFAULT_CATEGORIES[0];

    const confirmMsg =
      count > 0
        ? `Danh mục "${cat.icon} ${cat.label}" đang có ${count} bài hát.\n\nNếu xóa, toàn bộ ${count} bài này sẽ được chuyển sang danh mục "${fallbackCategory.icon} ${fallbackCategory.label}".\n\nBạn có chắc chắn muốn xóa?`
        : `Bạn có chắc muốn xóa danh mục "${cat.icon} ${cat.label}"?`;

    if (window.confirm(confirmMsg)) {
      if (count > 0 && onReassignTracksCategory) {
        onReassignTracksCategory(cat.id, fallbackCategory.id);
      }
      const nextList = list.filter((c) => c.id !== cat.id);
      setList(nextList);
      onSaveCategories(nextList);
      showFeedback(`Đã xóa danh mục "${cat.label}"!`, 'warn');
    }
  };

  // Reset to default categories
  const handleResetDefaults = () => {
    if (
      window.confirm(
        'Khôi phục lại 6 danh mục mặc định của hệ thống?\n(Các danh mục tùy chỉnh do bạn tạo sẽ bị gỡ bỏ)'
      )
    ) {
      setList(DEFAULT_CATEGORIES);
      onSaveCategories(DEFAULT_CATEGORIES);
      showFeedback('Đã khôi phục 6 danh mục sự kiện mặc định!');
    }
  };

  return (
    <div className="cat-modal-backdrop" onClick={onClose}>
      <div className="cat-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="cat-modal-header">
          <div className="cat-modal-title-group">
            <Tag size={20} className="cat-header-icon" />
            <div>
              <h3>QUẢN LÝ DANH MỤC BÀI HÁT</h3>
              <p className="cat-modal-subtitle">
                Tự do tạo, đổi tên, chọn biểu tượng hoặc sắp xếp thứ tự giai đoạn sự kiện
              </p>
            </div>
          </div>
          <button className="btn-close-modal" onClick={onClose} title="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* Feedback message banner */}
        {statusMsg && (
          <div className={`cat-status-banner ${statusMsg.type}`}>
            <AlertCircle size={15} />
            <span>{statusMsg.text}</span>
          </div>
        )}

        <div className="cat-modal-body">
          {/* Section 1: Add New Category Form */}
          <div className="cat-add-card">
            <h4 className="cat-section-title">
              <FolderPlus size={16} />
              <span>+ THÊM DANH MỤC MỚI</span>
            </h4>
            <form onSubmit={handleAddCategory} className="cat-add-form">
              <div className="cat-add-inputs-row">
                <div className="cat-icon-picker-box">
                  <label className="cat-input-label">Biểu tượng</label>
                  <input
                    type="text"
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="cat-icon-input"
                    maxLength={4}
                    title="Nhập emoji bất kỳ hoặc chọn nhanh bên dưới"
                  />
                </div>

                <div className="cat-name-input-box">
                  <label className="cat-input-label">Tên danh mục sự kiện</label>
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                    placeholder="VD: 07. Ăn tiệc / Đón dâu / Giao lưu / Bốc thăm trúng thưởng..."
                    className="cat-text-input"
                    autoFocus
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary cat-btn-add"
                  disabled={!newLabel.trim()}
                >
                  <Plus size={16} />
                  <span>THÊM DANH MỤC</span>
                </button>
              </div>

              {/* Quick Emoji Selection Chips */}
              <div className="cat-emoji-palette">
                <span className="cat-emoji-label">Gợi ý nhanh:</span>
                <div className="cat-emoji-chips-list">
                  {POPULAR_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className={`cat-emoji-chip ${newIcon === emoji ? 'selected' : ''}`}
                      onClick={() => setNewIcon(emoji)}
                      title={`Chọn ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          </div>

          {/* Section 2: Current Categories List */}
          <div className="cat-list-card">
            <div className="cat-list-header">
              <h4 className="cat-section-title">
                <Music size={16} />
                <span>DANH SÁCH DANH MỤC HIỆN TẠI ({list.length})</span>
              </h4>
              <span className="cat-list-hint">
                Dùng mũi tên ▲ ▼ để đổi thứ tự trên thanh tab & menu
              </span>
            </div>

            <div className="cat-items-scroll">
              {list.map((cat, idx) => {
                const trackCount = getTrackCount(cat.id);
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className={`cat-item-row ${isEditing ? 'editing' : ''}`}
                  >
                    {/* Reorder Buttons */}
                    <div className="cat-item-reorder-btns">
                      <button
                        type="button"
                        className="btn-cat-move"
                        disabled={idx === 0}
                        onClick={() => handleMove(idx, 'up')}
                        title="Di chuyển lên trên"
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        className="btn-cat-move"
                        disabled={idx === list.length - 1}
                        onClick={() => handleMove(idx, 'down')}
                        title="Di chuyển xuống dưới"
                      >
                        <ArrowDown size={13} />
                      </button>
                    </div>

                    {/* Order badge */}
                    <span className="cat-order-badge">#{idx + 1}</span>

                    {/* Content / Edit Form */}
                    {isEditing ? (
                      <div className="cat-inline-edit-form">
                        <input
                          type="text"
                          value={editIcon}
                          onChange={(e) => setEditIcon(e.target.value)}
                          className="cat-inline-icon-input"
                          maxLength={4}
                        />
                        <input
                          type="text"
                          value={editLabel}
                          onChange={(e) => setEditLabel(e.target.value)}
                          className="cat-inline-label-input"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit(cat.id);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button
                          type="button"
                          className="btn-cat-save-inline"
                          onClick={() => handleSaveEdit(cat.id)}
                          title="Lưu lại"
                        >
                          <Check size={14} />
                          <span>Lưu</span>
                        </button>
                        <button
                          type="button"
                          className="btn-cat-cancel-inline"
                          onClick={() => setEditingId(null)}
                          title="Hủy"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div className="cat-item-content">
                        <span className="cat-item-icon">{cat.icon}</span>
                        <span className="cat-item-label">{cat.label}</span>
                        {cat.isBuiltIn && (
                          <span className="cat-builtin-tag" title="Danh mục hệ thống">
                            Mặc định
                          </span>
                        )}
                        <span
                          className={`cat-track-count-badge ${trackCount > 0 ? 'has-tracks' : ''}`}
                          title={`Có ${trackCount} bài hát trong danh mục này`}
                        >
                          {trackCount} bài
                        </span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    {!isEditing && (
                      <div className="cat-item-actions">
                        <button
                          type="button"
                          className="btn-cat-action btn-cat-edit"
                          onClick={() => handleStartEdit(cat)}
                          title="Sửa tên / biểu tượng"
                        >
                          <Edit2 size={14} />
                          <span>Sửa</span>
                        </button>

                        <button
                          type="button"
                          className="btn-cat-action btn-cat-delete"
                          onClick={() => handleDeleteCategory(cat)}
                          title="Xóa danh mục này"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="cat-modal-footer">
          <button
            type="button"
            className="btn-secondary cat-btn-reset"
            onClick={handleResetDefaults}
            title="Khôi phục lại danh mục sự kiện mặc định"
          >
            <RotateCcw size={14} />
            <span>Khôi phục 6 danh mục mặc định</span>
          </button>

          <button
            type="button"
            className="btn-primary cat-btn-done"
            onClick={onClose}
          >
            <Check size={16} />
            <span>Hoàn tất & Lưu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
