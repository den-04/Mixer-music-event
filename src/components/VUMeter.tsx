import React from 'react';

interface VUMeterProps {
  level: number; // 0 to 1
  label?: string;
  vertical?: boolean;
  segments?: number;
}

export const VUMeter: React.FC<VUMeterProps> = ({
  level,
  label,
  vertical = true,
  segments = 14
}) => {
  // Clamp level
  const clamped = Math.max(0, Math.min(1, level));
  const activeSegments = Math.round(clamped * segments);

  const segmentIndices = Array.from({ length: segments }, (_, i) => i);

  // If vertical, bottom is 0, top is segments - 1
  const displayIndices = vertical ? [...segmentIndices].reverse() : segmentIndices;

  const getSegmentColor = (index: number) => {
    const ratio = index / segments;
    if (ratio >= 0.82) return 'var(--color-vu-red, #ff2a55)';
    if (ratio >= 0.62) return 'var(--color-vu-yellow, #ffaa00)';
    return 'var(--color-vu-green, #00e676)';
  };

  return (
    <div className={`vu-meter-container ${vertical ? 'vertical' : 'horizontal'}`}>
      {label && <span className="vu-label">{label}</span>}
      <div className={`vu-bar ${vertical ? 'vertical' : 'horizontal'}`}>
        {displayIndices.map((idx) => {
          const isActive = idx < activeSegments;
          const color = getSegmentColor(idx);
          return (
            <div
              key={idx}
              className={`vu-segment ${isActive ? 'active' : ''}`}
              style={{
                backgroundColor: isActive ? color : 'rgba(255, 255, 255, 0.05)',
                boxShadow: isActive ? `0 0 6px ${color}` : 'none'
              }}
            />
          );
        })}
      </div>
    </div>
  );
};
