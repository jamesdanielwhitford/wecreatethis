"use client";

import React, { useRef, useEffect } from 'react';
import { LetterStroke } from '../../types';
import styles from './styles.module.css';

interface DrawingCanvasProps {
  onStrokeComplete: (strokes: LetterStroke[]) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onStrokeComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<any | null>(null);

  useEffect(() => {
    const initFabric = async () => {
      const fabricModule = await import('fabric');
      const fabric = fabricModule.fabric; // Access fabric as a property of the imported module
      if (canvasRef.current && !fabricCanvasRef.current && fabric && fabric.Canvas) {
        const canvas = new fabric.Canvas(canvasRef.current, {
          isDrawingMode: true,
          width: 400,
          height: 200,
          backgroundColor: '#f0f0f0',
        });
        fabricCanvasRef.current = canvas;

        canvas.freeDrawingBrush.color = '#000000';
        canvas.freeDrawingBrush.width = 5;
      }
    };

    initFabric();

    return () => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.dispose();
        fabricCanvasRef.current = null;
      }
    };
  }, []);

  const handleClear = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
      fabricCanvasRef.current.backgroundColor = '#f0f0f0';
      fabricCanvasRef.current.renderAll();
    }
  };

  const handleDone = () => {
    if (fabricCanvasRef.current) {
      const paths = fabricCanvasRef.current.getObjects('path');
      const strokes: LetterStroke[] = paths.map((path: any) => {
        const points = (path.path || []).map((p: any) => ({ x: p[p.length - 2], y: p[p.length - 1] }));
        return { points };
      });
      onStrokeComplete(strokes);
      handleClear();
    }
  };

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} />
      <div className={styles.buttons}>
        <button onClick={handleClear}>Clear</button>
        <button onClick={handleDone}>Done</button>
      </div>
    </div>
  );
};

export default DrawingCanvas;
