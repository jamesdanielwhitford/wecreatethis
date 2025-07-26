import { LetterStroke, HandwritingSample, StrokePoint } from '../types';
import * as strokeStorage from './strokeStorage';

const TARGET_HEIGHT = 50; // Target height in pixels for normalized letters
const WORD_SPACING = 20;
const LINE_HEIGHT = 80;
const VARIATION_PIXELS = 2;
const VARIATION_DEGREES = 3;

export interface PositionedStroke extends LetterStroke {
  letter: string;
}

/**
 * Finds the bounding box of a set of strokes.
 */
const getBoundingBox = (strokes: LetterStroke[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  strokes.forEach(stroke => {
    stroke.points.forEach(point => {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    });
  });
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY };
};

/**
 * Normalizes strokes to a consistent size and position (origin).
 */
export const normalizeStrokes = (strokes: LetterStroke[]): LetterStroke[] => {
  if (strokes.length === 0 || strokes.every(s => s.points.length === 0)) return [];

  const box = getBoundingBox(strokes);
  if (box.height === 0) return strokes; // Avoid division by zero

  const scale = TARGET_HEIGHT / box.height;

  return strokes.map(stroke => ({
    points: stroke.points.map(point => ({
      x: (point.x - box.minX) * scale,
      y: (point.y - box.minY) * scale,
    })),
  }));
};

/**
 * Applies slight random variations to strokes for a more natural look.
 */
export const addNaturalVariation = (strokes: LetterStroke[]): LetterStroke[] => {
  const angleRad = (Math.random() - 0.5) * 2 * (VARIATION_DEGREES * Math.PI / 180);
  const offsetX = (Math.random() - 0.5) * 2 * VARIATION_PIXELS;
  const offsetY = (Math.random() - 0.5) * 2 * VARIATION_PIXELS;
  const cosA = Math.cos(angleRad);
  const sinA = Math.sin(angleRad);

  return strokes.map(stroke => ({
    points: stroke.points.map(point => ({
      x: (point.x * cosA - point.y * sinA) + offsetX,
      y: (point.x * sinA + point.y * cosA) + offsetY,
    })),
  }));
};

/**
 * Calculates the width of a letter after normalization for spacing.
 */
export const calculateLetterSpacing = (strokes: LetterStroke[]): number => {
  if (strokes.length === 0) return 0;
  const box = getBoundingBox(strokes);
  return box.width + 5; // 5px kerning
};

/**
 * Main function to convert a string of text into positioned handwriting strokes.
 */
export const convertTextToHandwriting = (text: string): PositionedStroke[] => {
  const templates = strokeStorage.getAllLetterTemplates();
  const allStrokes: PositionedStroke[] = [];
  let cursorX = 0;
  let cursorY = 0;

  text.toUpperCase().split('').forEach(char => {
    if (char === ' ') {
      cursorX += WORD_SPACING;
      return;
    }
    if (char === '\n') {
        cursorX = 0;
        cursorY += LINE_HEIGHT;
        return;
    }

    const template = templates[char];
    if (!template) return; // Skip characters without a template

    let letterStrokes = normalizeStrokes(template.strokes);
    letterStrokes = addNaturalVariation(letterStrokes);

    const positionedStrokes: PositionedStroke[] = letterStrokes.map(stroke => ({
      ...stroke,
      letter: char,
      points: stroke.points.map(point => ({
        x: point.x + cursorX,
        y: point.y + cursorY,
      })),
    }));

    allStrokes.push(...positionedStrokes);

    cursorX += calculateLetterSpacing(letterStrokes);
  });

  return allStrokes;
};