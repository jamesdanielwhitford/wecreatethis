export interface StrokePoint {
  x: number;
  y: number;
}

export interface LetterStroke {
  points: StrokePoint[];
}

export interface LetterTemplate {
  letter: string;
  strokes: LetterStroke[];
}

export interface HandwritingSample {
  [letter: string]: LetterTemplate;
}
