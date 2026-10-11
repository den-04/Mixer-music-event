import React, { useState } from 'react';
import { 
  Play, ChevronUp, ChevronDown, Trash2, ListOrdered, 
  FastForward, Disc
} from 'lucide-react';
import type { CueItem, AudioTrack } from '../types/audio';

interface CueListManagerProps {
  cues: CueItem[];
  tracks: AudioTrack[];
  activeCueIndex: number;
  onGoNextCue: () => void;
  onJumpToCue: (index: number) => void;
  onMoveCue: (index: number, direction: 'up' | 'down') => void;
  onDeleteCue: (id: string) => void;
  onUpdateCueNotes: (id: string, notes: string) => void;
}

export const CueListManager: React.FC<CueListManagerProps> = ({
  cues,
  tracks,
  activeCueIndex,
  onGoNextCue,
  onJumpToCue,
  onMoveCue,
  onDeleteCue,
  onUpdateCueNotes
}) => {
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null);

  const getTrackById = (id: string) => tracks.find((t) => t.id === id);

  return (
    <div className="cuelist-section-card">
      <div className="cuelist-header">
        <div className="cuelist-title-group">
          <ListOrdered size={18} />
          <h3>KỊCH BẢN BIỂU DIỄN SỰ KIỆN (CUE LIST - {cues.length} MỤC)</h3>
        </div>

        {/* Big Pro Stage GO Button */}
        <button
          className="btn-stage-go"
          onClick={onGoNextCue}
          disabled={cues.length === 0}
          title="Kích hoạt mục tiếp theo trong kịch bản [Phím Cách - SPACEBAR]"
        >
          <FastForward size={20} />
          <div className="go-text-col">
            <span className="go-main-text">GO (KỊCH BẢN TIẾP)</span>
            <span className="go-sub-text">
              {cues[activeCueIndex + 1]
                ? `Chuẩn bị: ${cues[activeCueIndex + 1].sectionName}`
                : cues.length > 0 && activeCueIndex === cues.length - 1
                ? 'Đã hết kịch bản'
                : 'Bắt đầu từ mục đầu'}
            </span>
          </div>
        </button>
      </div>

      <div className="cuelist-table-wrapper">
        {cues.length === 0 ? (
          <div className="cuelist-empty">
            <ListOrdered size={40} style={{ opacity: 0.3 }} />
            <p>Chưa có mục nào trong kịch bản.</p>
            <span>Hãy tích chọn các bài ở <strong>Kho Nhạc</strong> và bấm <strong>"Đưa vào Kịch bản"</strong></span>
          </div>
        ) : (
          <div className="cuelist-items">
            {cues.map((cue, idx) => {
              const track = getTrackById(cue.trackId);
              const isActive = activeCueIndex === idx;
              const isNext = activeCueIndex + 1 === idx;

              return (
                <div
                  key={cue.id}
                  className={`cue-item-row ${isActive ? 'cue-active' : ''} ${isNext ? 'cue-next' : ''}`}
                  onClick={() => onJumpToCue(idx)}
                >
                  {/* Status Indicator */}
                  <div className="cue-index-col">
                    {isActive ? (
                      <span className="cue-badge cue-badge-active" title="Đang phát">
                        <Disc size={13} className="spinning" /> #{idx + 1}
                      </span>
                    ) : isNext ? (
                      <span className="cue-badge cue-badge-next" title="Mục kế tiếp">
                        NEXT #{idx + 1}
                      </span>
                    ) : (
                      <span className="cue-badge cue-badge-idle">#{idx + 1}</span>
                    )}
                  </div>

                  {/* Section name & track info */}
                  <div className="cue-info-col">
                    <div className="cue-section-title">
                      <strong>{cue.sectionName}</strong>
                      <span className="cue-deck-target">
                        {cue.targetDeck === 'auto' ? 'Auto Deck' : `Deck ${cue.targetDeck}`}
                      </span>
                    </div>

                    <div className="cue-track-desc">
                      {track ? (
                        <>
                          <span className="cue-track-name">{track.title}</span>
                          <span className="cue-duration">
                            ({Math.floor(track.duration / 60)}:{(Math.floor(track.duration % 60)).toString().padStart(2, '0')})
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">Không tìm thấy file</span>
                      )}
                    </div>
                  </div>

                  {/* Operator Notes */}
                  <div className="cue-notes-col">
                    {editingNotesId === cue.id ? (
                      <input
                        type="text"
                        defaultValue={cue.notes || ''}
                        onBlur={(e) => {
                          onUpdateCueNotes(cue.id, e.target.value);
                          setEditingNotesId(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            onUpdateCueNotes(cue.id, (e.target as HTMLInputElement).value);
                            setEditingNotesId(null);
                          }
                        }}
                        autoFocus
                        className="cue-notes-input"
                        placeholder="Ghi chú MC, thời điểm bấm..."
                      />
                    ) : (
                      <span
                        className="cue-notes-text"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingNotesId(cue.id);
                        }}
                        title="Bấm để chỉnh sửa ghi chú"
                      >
                        {cue.notes ? `📝 ${cue.notes}` : '+ Thêm ghi chú...'}
                      </span>
                    )}
                  </div>

                  {/* Row actions */}
                  <div className="cue-actions-col" onClick={(e) => e.stopPropagation()}>
                    <button
                      className="cue-action-btn"
                      onClick={() => onJumpToCue(idx)}
                      title="Nạp và phát ngay mục này"
                    >
                      <Play size={14} />
                    </button>

                    <button
                      className="cue-action-btn"
                      disabled={idx === 0}
                      onClick={() => onMoveCue(idx, 'up')}
                      title="Chuyển lên trên"
                    >
                      <ChevronUp size={14} />
                    </button>

                    <button
                      className="cue-action-btn"
                      disabled={idx === cues.length - 1}
                      onClick={() => onMoveCue(idx, 'down')}
                      title="Chuyển xuống dưới"
                    >
                      <ChevronDown size={14} />
                    </button>

                    <button
                      className="cue-action-btn btn-delete"
                      onClick={() => onDeleteCue(cue.id)}
                      title="Xóa mục này"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
