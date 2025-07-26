"use client";

import React, { useRef, useEffect } from 'react';
import { PositionedStroke } from '../../utils/textConverter';
import styles from './styles.module.css';

interface HandwritingDisplayProps {
  strokes: PositionedStroke[];
  originalText: string;
  onReset: () => void;
}

const PADDING = 20; // Padding around the handwriting

const HandwritingDisplay: React.FC<HandwritingDisplayProps> = ({ strokes, originalText, onReset }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;

    // Calculate bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    strokes.forEach(stroke => {
      stroke.points.forEach(point => {
        minX = Math.min(minX, point.x);
        minY = Math.min(minY, point.y);
        maxX = Math.max(maxX, point.x);
        maxY = Math.max(maxY, point.y);
      });
    });

    // Set canvas dimensions
    const canvasWidth = maxX - minX + PADDING * 2;
    const canvasHeight = maxY - minY + PADDING * 2;
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear and prepare context
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Draw strokes with smoothing
    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x - minX + PADDING, stroke.points[0].y - minY + PADDING);

      for (let i = 1; i < stroke.points.length - 1; i++) {
        const p0 = stroke.points[i - 1];
        const p1 = stroke.points[i];
        const p2 = stroke.points[i + 1];
        const midPoint1 = { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
        const midPoint2 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        ctx.quadraticCurveTo(p1.x - minX + PADDING, p1.y - minY + PADDING, midPoint2.x - minX + PADDING, midPoint2.y - minY + PADDING);
      }
      // Line to the last point
      const lastPoint = stroke.points[stroke.points.length - 1];
      ctx.lineTo(lastPoint.x - minX + PADDING, lastPoint.y - minY + PADDING);

      ctx.stroke();
    });

  }, [strokes]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const link = document.createElement('a');
      link.download = 'handwriting.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  if (strokes.length === 0) {
    return (
      <div className={styles.container}>
        <p>Nothing to display yet. Go back and enter some text.</p>
        <button onClick={onReset} className={styles.button}>Try New Text</button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.referenceText}>
        <p><strong>Original Text:</strong> {originalText}</p>
      </div>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.buttons}>
        <button onClick={onReset} className={styles.button}>Try New Text</button>
        <button onClick={handleDownload} className={styles.button}>Download as Image</button>
      </div>
    </div>
  );
};

export default HandwritingDisplay;
