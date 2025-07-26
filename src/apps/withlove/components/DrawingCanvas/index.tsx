import React, { useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import { LetterStroke } from '../../types';
import styles from './styles.module.css';

interface DrawingCanvasProps {
  onStrokeComplete: (strokes: LetterStroke[]) => void;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onStrokeComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);

  useEffect(() => {
    if (canvasRef.current) {
      const canvas = new fabric.Canvas(canvasRef.current, {
        isDrawingMode: true,
        width: 400,
        height: 200,
        backgroundColor: '#f0f0f0',
      });
      fabricCanvasRef.current = canvas;

      canvas.freeDrawingBrush.color = '#000000';
      canvas.freeDrawingBrush.width = 5;

      return () => {
        canvas.dispose();
      };
    }
  }, []);

  const handleClear = () => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.clear();
       fabricCanvasRef.current.backgroundColor = '#f0f0f0';
    }
  };

  const handleDone = () => {
    if (fabricCanvasRef.current) {
      const paths = fabricCanvasRef.current.getObjects('path') as fabric.Path[];
      const strokes: LetterStroke[] = paths.map(path => {
        const points = (path.path || []).map(p => ({ x: p[p.length - 2], y: p[p.length - 1]}));
        return { points };
      });
      onStrokeComplete(strokes);
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
