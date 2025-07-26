import { LetterStroke, LetterTemplate, HandwritingSample } from '../types';

const STORAGE_KEY = 'handwritingSample';
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

/**
 * Saves a letter template to localStorage.
 * @param letter The letter character.
 * @param strokes The strokes for the letter.
 */
export const saveLetterTemplate = (letter: string, strokes: LetterStroke[]): void => {
  try {
    if (typeof window === 'undefined') return;
    const existingData = getAllLetterTemplates();
    const newTemplate: LetterTemplate = { letter, strokes };
    const newData: HandwritingSample = { ...existingData, [letter]: newTemplate };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newData));
  } catch (error) {
    console.error('Error saving to localStorage', error);
  }
};

/**
 * Retrieves a single letter template from localStorage.
 * @param letter The letter to retrieve.
 * @returns The LetterTemplate or null if not found.
 */
export const getLetterTemplate = (letter: string): LetterTemplate | null => {
  try {
    if (typeof window === 'undefined') return null;
    const allTemplates = getAllLetterTemplates();
    return allTemplates[letter] || null;
  } catch (error) {
    console.error('Error getting from localStorage', error);
    return null;
  }
};

/**
 * Retrieves all saved letter templates from localStorage.
 * @returns The HandwritingSample object.
 */
export const getAllLetterTemplates = (): HandwritingSample => {
  try {
    if (typeof window === 'undefined') return {};
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting from localStorage', error);
    return {};
  }
};

/**
 * Clears all saved templates from localStorage.
 */
export const clearAllTemplates = (): void => {
  try {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing localStorage', error);
  }
};

/**
 * Checks if all letters from A-Z have been captured.
 * @returns True if all letters are captured, false otherwise.
 */
export const hasAllLetters = (): boolean => {
  try {
    const templates = getAllLetterTemplates();
    return ALPHABET.every(letter => templates[letter]);
  } catch (error) {
    console.error('Error checking letters', error);
    return false;
  }
};

/**
 * Gets the list of letters that have been captured.
 * @returns An array of captured letters.
 */
export const getProgress = (): string[] => {
  try {
    const templates = getAllLetterTemplates();
    return Object.keys(templates);
  } catch (error) {
    console.error('Error getting progress', error);
    return [];
  }
};
