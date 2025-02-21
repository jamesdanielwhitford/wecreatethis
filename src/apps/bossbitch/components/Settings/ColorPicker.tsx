// src/apps/bossbitch/components/Settings/ColorPicker.tsx
import React from 'react';
import styles from './styles.module.css';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

// Predefined color options
const COLOR_OPTIONS = [
  // Red shades
  '#FF6B6B', '#FF5252', '#FF4081', '#F44336', '#E91E63',
  // Purple shades
  '#9C27B0', '#7C3AED', '#673AB7', '#5E35B1', '#4527A0', 
  // Blue shades
  '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#45B7D1',
  // Green shades
  '#4ECDC4', '#009688', '#4CAF50', '#8BC34A', '#CDDC39',
  // Yellow/Orange shades
  '#FFEB3B', '#FFC107', '#FF9800', '#FF5722', '#FFD700'
];

const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  return (
    <div className={styles.colorPickerContainer}>
      {label && <label className={styles.colorPickerLabel}>{label}</label>}
      
      <div className={styles.colorInputWrapper}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={styles.colorPickerInput}
        />
        <div 
          className={styles.colorPreview}
          style={{ backgroundColor: value }}
        />
      </div>
      
      <div className={styles.colorOptions}>
        {COLOR_OPTIONS.map((color, index) => (
          <button
            key={index}
            type="button"
            className={`${styles.colorOption} ${value === color ? styles.activeColor : ''}`}
            style={{ backgroundColor: color }}
            onClick={() => onChange(color)}
            aria-label={`Color option ${color}`}
          />
        ))}
      </div>
    </div>
  );
};

export default ColorPicker;