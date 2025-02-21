'use client';

// src/apps/bossbitch/components/ProgressRing/index.tsx
import React, { useEffect, useRef } from 'react';
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
}

const ProgressRing: React.FC<ProgressRingProps> = ({
  size = 200,
  strokeWidth = 20,
  progress,
  maxValue,
  color,
  segments,
  animate = true,
  className = '',
}) => {
  const circleRef = useRef<SVGCircleElement>(null);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Calculate total progress percentage (cap at 100% for visual purposes)
  const percentage = Math.min((progress / maxValue) * 100, 100);
  
  // Calculate stroke dashoffset based on progress
  const getStrokeDashoffset = (percent: number) => {
    return circumference - (percent / 100) * circumference;
  };

  useEffect(() => {
    if (animate && circleRef.current) {
      const circle = circleRef.current;
      // Start from 0
      circle.style.strokeDashoffset = `${getStrokeDashoffset(0)}`;
      
      // Animate to actual value
      requestAnimationFrame(() => {
        circle.style.transition = 'stroke-dashoffset 0.8s ease-in-out';
        circle.style.strokeDashoffset = `${getStrokeDashoffset(percentage)}`;
      });
    }
  }, [percentage, animate, circumference]);

  const renderSegments = () => {
    if (!segments || segments.length === 0) return null;

    // Sum of all segment values
    const totalValue = segments.reduce((sum, seg) => sum + seg.value, 0);
    
    // The actual percentage each segment takes of the whole circumference
    // We convert the overall progress percentage to the segment percentages
    const segmentPercentages = segments.map(segment => {
      const segmentRatio = segment.value / totalValue;
      return segmentRatio * percentage;
    });

    // Render segments in a continuous manner
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
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={segment.color}
          strokeWidth={strokeWidth}
          strokeDasharray={`${segmentLength} ${circumference - segmentLength}`}
          strokeDashoffset={dashOffset}
          strokeLinecap="butt"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      );
    });
  };

  return (
    <div className={`${styles.ring} ${className}`}>
      <svg 
        width={size} 
        height={size} 
        className={animate ? styles.animate : ''}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={styles.background}
          strokeLinecap="round"
        />
        
        {/* Progress or segments */}
        {segments && segments.length > 0 ? (
          renderSegments()
        ) : (
          <circle
            ref={circleRef}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={animate ? circumference : getStrokeDashoffset(percentage)}
            className={styles.progress}
            strokeLinecap="round"
          />
        )}
      </svg>
    </div>
  );
};

export default ProgressRing;