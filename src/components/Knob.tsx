import React, { useState, useRef, useEffect } from 'react';

interface KnobProps {
  value: number; // e.g. -12 to 12
  min?: number;
  max?: number;
  step?: number;
  defaultValue?: number;
  label: string;
  unit?: string;
  color?: string;
  onChange: (val: number) => void;
}

export const Knob: React.FC<KnobProps> = ({
  value,
  min = -12,
  max = 12,
  step = 0.5,
  defaultValue = 0,
  label,
  unit = 'dB',
  color = '#00f2fe',
  onChange
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef<number>(0);
  const startVal = useRef<number>(value);

  // Map value to angle (-135 deg to +135 deg)
  const angle = ((value - min) / (max - min)) * 270 - 135;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = value;
  };

  const handleDoubleClick = () => {
    onChange(defaultValue);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY.current - e.clientY;
      const range = max - min;
      const change = (deltaY / 120) * range;
      let newVal = Math.round((startVal.current + change) / step) * step;
      newVal = Math.max(min, Math.min(max, newVal));
      onChange(Number(newVal.toFixed(1)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, min, max, step, onChange]);

  return (
    <div 
      className="eq-knob-container" 
      title={`Kéo lên/xuống để chỉnh, nhấp đúp để về ${defaultValue}${unit}`}
      onDoubleClick={handleDoubleClick}
    >
      <div 
        className="eq-knob-body" 
        onMouseDown={handleMouseDown}
        style={{ cursor: isDragging ? 'ns-resize' : 'grab' }}
      >
        <div 
          className="eq-knob-dial"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div className="eq-knob-indicator" style={{ backgroundColor: color }} />
        </div>
      </div>
      <div className="eq-knob-info">
        <span className="eq-knob-label">{label}</span>
        <span className="eq-knob-val" style={{ color: value !== 0 ? color : 'var(--text-muted)' }}>
          {value > 0 ? `+${value}` : value}
        </span>
      </div>
    </div>
  );
};
