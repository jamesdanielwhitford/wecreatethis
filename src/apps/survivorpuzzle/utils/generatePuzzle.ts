// src/apps/survivorpuzzle/utils/generatePuzzle.ts
// Function to generate a random puzzle of numbers 1-15 distributed in 3 rows
export const generatePuzzle = (): number[][] => {
  // Create an array of numbers 1-15
  const numbers = Array.from({ length: 15 }, (_, i) => i + 1);
  
  // Shuffle the array
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  
  // Split into 3 rows of 5
  return [
    numbers.slice(0, 5),
    numbers.slice(5, 10),
    numbers.slice(10, 15)
  ];
};

// Check if the puzzle is solved (numbers 1-15 in order)
export const isPuzzleSolved = (rows: number[][]): boolean => {
  const flattened = rows.flat();
  return flattened.length === 15 && flattened.every((num, index) => num === index + 1);
};

// Get time limit in milliseconds based on difficulty
export const getTimeLimit = (difficulty: 'none' | 'easy' | 'medium' | 'difficult'): number | null => {
  switch (difficulty) {
    case 'none':
      return null; // No time limit
    case 'easy':
      return 5 * 60 * 1000; // 5 minutes
    case 'medium':
      return 3 * 60 * 1000; // 3 minutes
    case 'difficult':
      return 1 * 60 * 1000; // 1 minute
    default:
      return 5 * 60 * 1000; // Default to easy
  }
};