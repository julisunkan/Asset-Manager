import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface KnobProps {
  value: number; // 0 to 1
  onChange: (val: number) => void;
  onDoubleClick?: () => void;
  size?: number;
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  color?: string;
}

export function Knob({ 
  value, 
  onChange, 
  onDoubleClick, 
  size = 48, 
  label, 
  min = 0, 
  max = 1, 
  step = 0.01,
  color = 'hsl(var(--primary))'
}: KnobProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startY = useRef(0);
  const startVal = useRef(0);

  // Normalize value to 0-1 for drawing
  const normalizedValue = (value - min) / (max - min);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startY.current = e.clientY;
    startVal.current = normalizedValue;
  };

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!isDragging) return;
    const deltaY = startY.current - e.clientY;
    // 100px drag = full range
    const change = deltaY / 100; 
    let newVal = startVal.current + change;
    newVal = Math.max(0, Math.min(1, newVal));
    
    // Map back to min/max
    let finalVal = min + newVal * (max - min);
    // Apply step
    if (step) {
      finalVal = Math.round(finalVal / step) * step;
    }
    
    onChange(finalVal);
  }, [isDragging, min, max, step, onChange]);

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    } else {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    }
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, handlePointerMove, handlePointerUp]);

  // Calculate rotation (-135deg to +135deg)
  const angle = -135 + (normalizedValue * 270);

  return (
    <div className="flex flex-col items-center gap-1.5 select-none" onDoubleClick={onDoubleClick}>
      <div 
        className={cn(
          "relative rounded-full bg-card-border shadow-inner cursor-ns-resize flex items-center justify-center border-2 border-background",
          isDragging && "ring-1 ring-primary/50"
        )}
        style={{ width: size, height: size }}
        onPointerDown={handlePointerDown}
      >
        <div 
          className="absolute w-full h-full rounded-full"
          style={{ transform: `rotate(${angle}deg)` }}
        >
          <div 
            className="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-[30%] rounded-full"
            style={{ backgroundColor: color }}
          />
        </div>
        <div className="w-[70%] h-[70%] bg-card rounded-full shadow-[0_2px_5px_rgba(0,0,0,0.5)]" />
      </div>
      {label && <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>}
    </div>
  );
}
