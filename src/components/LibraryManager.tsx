import React, { useState, useRef } from 'react';
import {
  Upload, Search, Plus, CheckSquare, Square, Trash2, ListPlus,
  Play, Pause, Music, FolderOpen, Sparkles,
  ArrowUpDown, ArrowUp, ArrowDown, Clock, ArrowDownAZ, Settings2
} from 'lucide-react';
import type { AudioTrack, EventCategory, CustomCategory } from '../types/audio';
import { DEFAULT_CATEGORIES } from '../types/audio';
import { CategoryManagerModal } from './CategoryManagerModal';

interface LibraryManagerProps {
  tracks: AudioTrack[];
  categories?: CustomCategory[];
  isImporting?: boolean;
  importProgress?: string;
  onAddTracks: (files: FileList | File[]) => void;
  onDeleteTracks: (trackIds: string[]) => void;
  onClearAllTracks: () => void;
  onSendToDeck: (track: AudioTrack, deck: 'A' | 'B') => void;
  onAddToCueList: (tracks: AudioTrack[]) => void;
  onUpdateTrackCategory: (trackId: string, category: EventCategory) => void;
  onUpdateCategories?: (categories: CustomCategory[]) => void;
  onReassignTracksCategory?: (fromCatId: string, toCatId: string) => void;
  onGenerateDemoMusic: () => void;
}

export const LibraryManager: React.FC<LibraryManagerProps> = ({
  tracks,
  categories = DEFAULT_CATEGORIES,
  isImporting = false,
  importProgress = '',
  onAddTracks,
  onDeleteTracks,
  onClearAllTracks,
  onSendToDeck,
  onAddToCueList,
  onUpdateTrackCategory,
  onUpdateCategories,
  onReassignTracksCategory,
  onGenerateDemoMusic
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<EventCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrackIds, setSelectedTrackIds] = useState<Set<string>>(new Set());
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  // Sorting state
  type SortField = 'date' | 'name' | 'duration';
  type SortDirection = 'asc' | 'desc';
  const [sortBy, setSortBy] = useState<SortField>('date');
  const [sortDir, setSortDir] = useState<SortDirection>('desc'); // Default: newest first

  const handleSortChange = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'name' ? 'asc' : 'desc');
    }
  };

  const formatAddedTime = (time?: number) => {
    if (!time) return '--:--';
    const d = new Date(time);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    const date = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    return `${h}:${m} ${date}/${month}`;
  };

  // Filter tracks
  const filteredTracks = tracks.filter((track) => {
    const matchesCategory = selectedCategory === 'all' || track.category === selectedCategory;
    const matchesSearch =
      track.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (track.artist && track.artist.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Sort tracks
  const sortedTracks = [...filteredTracks].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'name') {
      cmp = a.title.localeCompare(b.title, 'vi', { sensitivity: 'base', numeric: true });
    } else if (sortBy === 'date') {
      const timeA = a.addedAt || 0;
      const timeB = b.addedAt || 0;
      cmp = timeA - timeB;
    } else if (sortBy === 'duration') {
      cmp = (a.duration || 0) - (b.duration || 0);
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  // Multi selection helpers
  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedTrackIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedTrackIds(next);
  };

  const handleSelectAll = () => {
    if (selectedTrackIds.size === sortedTracks.length) {
      setSelectedTrackIds(new Set());
    } else {
      setSelectedTrackIds(new Set(sortedTracks.map((t) => t.id)));
    }
  };

  // Preview track
  const handleTogglePreview = (track: AudioTrack) => {
    if (previewTrackId === track.id) {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      setPreviewTrackId(null);
    } else {
      if (previewAudioRef.current) {
        previewAudioRef.current.pause();
      }
      if (track.fileUrl) {
        const audio = new Audio(track.fileUrl);
        audio.volume = 0.6;
        audio.play().catch(console.error);
        audio.onended = () => setPreviewTrackId(null);
        previewAudioRef.current = audio;
        setPreviewTrackId(track.id);
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddTracks(Array.from(e.dataTransfer.files));
    }
  };

  const handleBatchAddToCue = () => {
    const selectedTracks = tracks.filter((t) => selectedTrackIds.has(t.id));
    if (selectedTracks.length > 0) {
      onAddToCueList(selectedTracks);
      setSelectedTrackIds(new Set());
    }
  };

  const handleBatchDelete = () => {
    if (selectedTrackIds.size === 0) return;
    if (window.confirm(`Bạn có chắc muốn xóa ${selectedTrackIds.size} bài hát đã chọn khỏi kho nhạc?`)) {
      onDeleteTracks(Array.from(selectedTrackIds));
      setSelectedTrackIds(new Set());
    }
  };

  const formatDuration = (sec: number) => {
    if (!sec || isNaN(sec)) return '00:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`library-section-card ${isDragOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        multiple
        accept=".mp3,.wav,.ogg,.m4a,.flac,.aac,.wma,audio/*"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddTracks(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Hidden Folder input */}
      <input
        type="file"
        ref={folderInputRef}
        style={{ display: 'none' }}
        multiple
        {...{ webkitdirectory: '', directory: '' }}
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAddTracks(Array.from(e.target.files));
            e.target.value = '';
          }
        }}
      />

      {/* Importing Progress Notification */}
      {isImporting && (
        <div className="importing-overlay-banner">
          <div className="importing-spinner" />
          <span>{importProgress || 'Đang nạp danh sách bài hát...'}</span>
        </div>
      )}

      {/* Top Bar: Action Buttons & Search */}
      <div className="library-top-bar">
        <div className="library-title-group">
          <Music size={18} />
          <h3>KHO NHẠC SỰ KIỆN ({tracks.length} bài)</h3>
        </div>

        <div className="library-actions-group">
          <button
            className="btn-primary btn-add-music"
            onClick={() => fileInputRef.current?.click()}
            title="Bấm vào đây, rồi giữ Ctrl hoặc Shift để chọn CÙNG LÚC NHIỀU BÀI HÁT"
          >
            <Upload size={16} />
            <span>+ THÊM NHẠC</span>
          </button>

          <button
            className="btn-primary btn-add-folder"
            onClick={() => folderInputRef.current?.click()}
            title="Chọn cả một THƯ MỤC nhạc trên máy tính để nạp toàn bộ bài hát"
          >
            <FolderOpen size={16} />
            <span>📁 CHỌN CẢ THƯ MỤC</span>
          </button>

          {tracks.length > 0 && (
            <button
              className="btn-danger-clear"
              onClick={() => {
                if (window.confirm("Bạn có chắc muốn XÓA HẾT tất cả bài hát để tự thêm nhạc mới?")) {
                  onClearAllTracks();
                }
              }}
              title="Xóa toàn bộ bài hát trong kho và kịch bản"
            >
              <Trash2 size={15} />
              <span>XÓA HẾT BÀI</span>
            </button>
          )}

          <button
            className="btn-secondary btn-demo-music"
            onClick={onGenerateDemoMusic}
            title="Tạo các bài mẫu sự kiện thử nghiệm không cần tải file"
          >
            <Sparkles size={15} />
            <span>Tạo 4 bài mẫu thử</span>
          </button>
        </div>
      </div>

      {/* Search & Category Filter Pills & Sort Options */}
      <div className="library-filter-row">
        <div className="library-search-and-sort">
          <div className="library-search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bài hát theo tên hoặc nghệ sĩ..."
              className="search-input"
            />
          </div>

          <div className="library-sort-group">
            <span className="sort-label">Sắp xếp:</span>
            <button
              type="button"
              className={`sort-pill ${sortBy === 'name' ? 'active' : ''}`}
              onClick={() => handleSortChange('name')}
              title={`Xếp theo Tên bài hát (${sortDir === 'asc' ? 'A → Z' : 'Z → A'})`}
            >
              <ArrowDownAZ size={13} />
              <span>Tên bài hát</span>
              {sortBy === 'name' ? (
                sortDir === 'asc' ? <ArrowUp size={12} className="sort-dir-active" /> : <ArrowDown size={12} className="sort-dir-active" />
              ) : (
                <ArrowUpDown size={11} className="sort-dir-muted" />
              )}
            </button>

            <button
              type="button"
              className={`sort-pill ${sortBy === 'date' ? 'active' : ''}`}
              onClick={() => handleSortChange('date')}
              title={`Xếp theo Thời gian thêm (${sortDir === 'desc' ? 'Mới nhất trước' : 'Cũ nhất trước'})`}
            >
              <Clock size={13} />
              <span>Thời gian thêm</span>
              {sortBy === 'date' ? (
                sortDir === 'desc' ? <ArrowDown size={12} className="sort-dir-active" /> : <ArrowUp size={12} className="sort-dir-active" />
              ) : (
                <ArrowUpDown size={11} className="sort-dir-muted" />
              )}
            </button>

            <button
              type="button"
              className={`sort-pill ${sortBy === 'duration' ? 'active' : ''}`}
              onClick={() => handleSortChange('duration')}
              title={`Xếp theo Thời lượng (${sortDir === 'asc' ? 'Ngắn → Dài' : 'Dài → Ngắn'})`}
            >
              <span>Thời lượng</span>
              {sortBy === 'duration' ? (
                sortDir === 'asc' ? <ArrowUp size={12} className="sort-dir-active" /> : <ArrowDown size={12} className="sort-dir-active" />
              ) : (
                <ArrowUpDown size={11} className="sort-dir-muted" />
              )}
            </button>
          </div>
        </div>

        <div className="category-pills-list">
          {/* "All" category pill */}
          <button
            className={`category-pill ${selectedCategory === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedCategory('all')}
          >
            <span>🎵</span>
            <span>ALL</span>
            <span className="cat-count">{tracks.length}</span>
          </button>

          {/* Dynamic Category Pills */}
          {[...categories]
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map((cat) => (
              <button
                key={cat.id}
                className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="cat-count">
                  {tracks.filter((t) => t.category === cat.id).length}
                </span>
              </button>
            ))}

          {/* Manage / Add Custom Category Button */}
          <button
            type="button"
            className="category-pill-manage"
            onClick={() => setShowCategoryModal(true)}
            title="Tự tạo, sửa tên, đổi icon hoặc sắp xếp danh mục sự kiện"
          >
            <Settings2 size={13} />
            <span>Tùy chỉnh danh mục</span>
          </button>
        </div>
      </div>

      {/* Batch Selection Action Bar (Appears when >= 1 tracks selected) */}
      {selectedTrackIds.size > 0 && (
        <div className="batch-action-bar">
          <div className="batch-info">
            <CheckSquare size={16} className="text-cyan" />
            <span>Đã chọn: <strong>{selectedTrackIds.size}</strong> bài</span>
          </div>

          <div className="batch-buttons">
            <button
              className="btn-batch btn-batch-cue"
              onClick={handleBatchAddToCue}
              title="Đưa toàn bộ bài đã chọn vào Kịch bản kĩ thuật"
            >
              <ListPlus size={15} />
              <span>Đưa vào Kịch bản sự kiện ({selectedTrackIds.size})</span>
            </button>

            <button
              className="btn-batch btn-batch-delete"
              onClick={handleBatchDelete}
              title="Xóa các bài đã chọn khỏi kho nhạc"
            >
              <Trash2 size={15} />
              <span>Xóa các bài đã chọn</span>
            </button>

            <button
              className="btn-batch-cancel"
              onClick={() => setSelectedTrackIds(new Set())}
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Track List Table */}
      <div className="library-table-container">
        {sortedTracks.length === 0 ? (
          <div className="library-empty-state" onClick={() => fileInputRef.current?.click()}>
            <FolderOpen size={48} className="empty-icon" />
            <h4>Chưa có bài hát nào trong mục này</h4>
            <p>Bấm vào đây hoặc kéo thả các file nhạc (.mp3, .wav, .m4a) từ máy tính vào để sử dụng</p>
          </div>
        ) : (
          <table className="library-table">
            <thead>
              <tr>
                <th className="th-select" onClick={handleSelectAll} title="Chọn / Bỏ chọn tất cả">
                  {selectedTrackIds.size === sortedTracks.length && sortedTracks.length > 0 ? (
                    <CheckSquare size={16} className="text-cyan" />
                  ) : (
                    <Square size={16} />
                  )}
                </th>
                <th className="th-play">Test</th>
                <th
                  className={`th-title sortable ${sortBy === 'name' ? 'sorted' : ''}`}
                  onClick={() => handleSortChange('name')}
                  title={`Bấm để sắp xếp theo Tên bài hát (${sortBy === 'name' && sortDir === 'asc' ? 'đang A→Z, bấm đổi Z→A' : 'A→Z'})`}
                >
                  <div className="th-inner">
                    <span>Tên bài hát</span>
                    {sortBy === 'name' ? (
                      sortDir === 'asc' ? <ArrowUp size={13} className="text-cyan" /> : <ArrowDown size={13} className="text-cyan" />
                    ) : (
                      <ArrowUpDown size={12} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th className="th-category">Phân loại sự kiện</th>
                <th
                  className={`th-date sortable ${sortBy === 'date' ? 'sorted' : ''}`}
                  onClick={() => handleSortChange('date')}
                  title={`Bấm để sắp xếp theo Thời gian thêm (${sortBy === 'date' && sortDir === 'desc' ? 'đang mới nhất trước, bấm đổi cũ nhất trước' : 'mới nhất trước'})`}
                >
                  <div className="th-inner">
                    <span>Đã thêm</span>
                    {sortBy === 'date' ? (
                      sortDir === 'desc' ? <ArrowDown size={13} className="text-cyan" /> : <ArrowUp size={13} className="text-cyan" />
                    ) : (
                      <ArrowUpDown size={12} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th
                  className={`th-duration sortable ${sortBy === 'duration' ? 'sorted' : ''}`}
                  onClick={() => handleSortChange('duration')}
                  title={`Bấm để sắp xếp theo Thời lượng (${sortBy === 'duration' && sortDir === 'asc' ? 'đang ngắn→dài, bấm đổi dài→ngắn' : 'ngắn→dài'})`}
                >
                  <div className="th-inner">
                    <span>Thời lượng</span>
                    {sortBy === 'duration' ? (
                      sortDir === 'asc' ? <ArrowUp size={13} className="text-cyan" /> : <ArrowDown size={13} className="text-cyan" />
                    ) : (
                      <ArrowUpDown size={12} className="th-sort-muted" />
                    )}
                  </div>
                </th>
                <th className="th-actions">Điều khiển / Nạp Deck</th>
              </tr>
            </thead>
            <tbody>
              {sortedTracks.map((track) => {
                const isSelected = selectedTrackIds.has(track.id);
                const isPreviewing = previewTrackId === track.id;
                return (
                  <tr
                    key={track.id}
                    className={`track-row ${isSelected ? 'row-selected' : ''}`}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/plain', track.id)}
                  >
                    <td className="td-select" onClick={() => handleToggleSelect(track.id)}>
                      {isSelected ? (
                        <CheckSquare size={16} className="text-cyan" />
                      ) : (
                        <Square size={16} />
                      )}
                    </td>

                    <td className="td-play">
                      <button
                        className={`btn-preview-play ${isPreviewing ? 'previewing' : ''}`}
                        onClick={() => handleTogglePreview(track)}
                        title={isPreviewing ? 'Dừng nghe thử' : 'Nghe thử trước'}
                      >
                        {isPreviewing ? <Pause size={14} /> : <Play size={14} />}
                      </button>
                    </td>

                    <td className="td-title">
                      <span className="track-title-text" title={track.title}>
                        {track.title}
                      </span>
                      {track.artist && <span className="track-artist-text">{track.artist}</span>}
                    </td>

                    <td className="td-category">
                      <select
                        className="track-cat-select"
                        value={track.category}
                        onChange={(e) => {
                          if (e.target.value === '__manage__') {
                            setShowCategoryModal(true);
                          } else {
                            onUpdateTrackCategory(track.id, e.target.value as EventCategory);
                          }
                        }}
                      >
                        {[...categories]
                          .sort((a, b) => (a.order || 0) - (b.order || 0))
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.icon} {c.label}
                            </option>
                          ))}
                        {/* Fallback if track category is not in list */}
                        {!categories.some((c) => c.id === track.category) && (
                          <option value={track.category}>
                            🎵 {track.category}
                          </option>
                        )}
                        <option disabled value="">──────────</option>
                        <option value="__manage__">⚙️ Tự chỉnh danh mục...</option>
                      </select>
                    </td>

                    <td className="td-date">
                      <span className="track-date-text">{formatAddedTime(track.addedAt)}</span>
                    </td>

                    <td className="td-duration">{formatDuration(track.duration)}</td>

                    <td className="td-actions">
                      <div className="track-load-btns">
                        <button
                          className="btn-load-deck btn-load-deck-a"
                          onClick={() => onSendToDeck(track, 'A')}
                          title="Nạp vào Deck A"
                        >
                          <span>→ Deck A</span>
                        </button>

                        <button
                          className="btn-load-deck btn-load-deck-b"
                          onClick={() => onSendToDeck(track, 'B')}
                          title="Nạp vào Deck B"
                        >
                          <span>→ Deck B</span>
                        </button>

                        <button
                          className="btn-add-single-cue"
                          onClick={() => onAddToCueList([track])}
                          title="Thêm vào Kịch bản sự kiện"
                        >
                          <Plus size={14} />
                          <span>Kịch bản</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Custom Category Management Modal */}
      {showCategoryModal && (
        <CategoryManagerModal
          isOpen={showCategoryModal}
          onClose={() => setShowCategoryModal(false)}
          categories={categories}
          tracks={tracks}
          onSaveCategories={(newCats) => {
            if (onUpdateCategories) {
              onUpdateCategories(newCats);
            }
          }}
          onReassignTracksCategory={onReassignTracksCategory}
        />
      )}
    </div>
  );
};
