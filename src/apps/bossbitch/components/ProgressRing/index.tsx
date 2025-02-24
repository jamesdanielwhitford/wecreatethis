'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { IncomeSource } from '../../types/goal.types';
import styles from './styles.module.css';

interface ProgressRingProps {
  size?: number;
  strokeWidth?: number;
  progress: number;
  maxValue: number;
  color: string;
  segments?: IncomeSource[];
  animate?: boolean;
  className?: string;
  emptyRing?: boolean;
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 200,
  strokeWidth = 20,
  progress = 0,
  maxValue = 100,
  color,
  segments,
  animate = true,
  className = '',
  emptyRing = false,
}) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Ensure valid numbers for calculations
  const safeSize = Math.max(strokeWidth * 2, size || 200);
  const safeStrokeWidth = Math.max(1, strokeWidth || 20);
  const radius = (safeSize - safeStrokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Ensure we have valid numbers for progress calculation
  const safeProgress = isNaN(progress) || progress < 0 ? 0 : progress;
  const safeMaxValue = isNaN(maxValue) || maxValue <= 0 ? 100 : maxValue;
  
  // Calculate percentage with safety checks
  const percentage = Math.min((safeProgress / safeMaxValue) * 100, 100);
  
  // Wrap getStrokeDashoffset in useCallback to prevent recreation on every render
  const getStrokeDashoffset = useCallback((percent: number): number => {
    if (isNaN(percent)) return circumference;
    const offset = circumference - (percent / 100) * circumference;
    return isNaN(offset) ? circumference : offset;
  }, [circumference]);

  useEffect(() => {
    // Set initialization flag on mount
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (animate && circleRef.current && isInitialized) {
      const circle = circleRef.current;
      
      // Apply the initial position (start at 12 o'clock)
      circle.style.transform = 'rotate(-90deg)';
      circle.style.transformOrigin = 'center';
      
      if (percentage > 0) {
        // Animate stroke dashoffset
        circle.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
        const offset = getStrokeDashoffset(percentage);
        circle.style.strokeDashoffset = `${offset}`;
      } else {
        // Don't animate if percentage is 0
        circle.style.strokeDashoffset = `${circumference}`;
      }
    }
  }, [percentage, animate, circumference, isInitialized, getStrokeDashoffset]);

  const renderSegments = () => {
    if (!segments || !Array.isArray(segments) || segments.length === 0) return null;

    // Sum of all segment values with safety checks
    const totalValue = segments.reduce((sum, seg) => {
      const segValue = isNaN(seg.value) ? 0 : seg.value;
      return sum + segValue;
    }, 0);
    
    if (totalValue <= 0) return null;
    
    // Calculate segment percentages
    const segmentPercentages = segments.map(segment => {
      const segmentValue = isNaN(segment.value) ? 0 : segment.value;
      const segmentRatio = segmentValue / totalValue;
      return segmentRatio * percentage;
    });

    // Render segments
    let currentOffset = 0;
    
    return segments.map((segment, index) => {
      const segmentPercentage = segmentPercentages[index];
      const segmentLength = (segmentPercentage / 100) * circumference;
      const dashOffset = circumference - currentOffset;
      
      // Update current offset for next segment
      currentOffset += segmentLength;
      
      return (
        <circle
          key={segment.id}
          className={styles.segment}
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          fill="none"
          stroke={segment.color || color}
          strokeWidth={safeStrokeWidth}
          strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${safeSize / 2} ${safeSize / 2})`}
          style={{ 
            transition: isInitialized ? 'stroke-dashoffset 0.8s ease-in-out' : 'none'
          }}
        />
      );
    });
  };

  return (
    <div className={`${styles.ring} ${className}`}>
      <svg 
        width={safeSize} 
        height={safeSize} 
        className={animate && isInitialized ? styles.animate : ''}
        style={{ overflow: 'visible' }}
      >
        {/* Background circle */}
        <circle
          cx={safeSize / 2}
          cy={safeSize / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={safeStrokeWidth}
          className={styles.background}
          strokeLinecap="round"
          strokeDasharray={emptyRing ? '3,3' : undefined}
        />
        
        {/* Progress or segments */}
        {!emptyRing && (
          segments && segments.length > 0 ? (
            renderSegments()
          ) : (
            <circle
              ref={circleRef}
              cx={safeSize / 2}
              cy={safeSize / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={safeStrokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={!isInitialized ? circumference : getStrokeDashoffset(percentage)}
              className={styles.progress}
              strokeLinecap="round"
              style={{ 
                transform: 'rotate(-90deg)',
                transformOrigin: 'center',
                transition: isInitialized && animate ? 'stroke-dashoffset 0.8s ease-in-out' : 'none'
              }}
            />
          )
        )}
      </svg>
    </div>
  );
};

export default ProgressRing;