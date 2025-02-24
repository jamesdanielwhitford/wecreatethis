'use client';

// src/apps/bossbitch/components/Settings/SettingsPage.tsx
import React, { useState } from 'react';
import { 
  Moon, 
  Sun, 
  Computer,
  Trash2, 
  Palette, 
  LogIn,
  Download,
  Upload
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { AuthModal, AuthButton } from '../Auth';
import styles from './styles.module.css';

type ThemeOption = 'light' | 'dark' | 'system';

interface SettingsPageProps {
  themePreference?: ThemeOption;
  onThemeChange?: (theme: ThemeOption) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  themePreference = 'system',
  onThemeChange = () => {}
}) => {
  const { 
    isAuthenticated, 
    currentUser, 
    clearAllData,
    exportData,
    importData,
    preferences,
    updatePreferences,
    isLoading,
    setIsLoading
  } = useData();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<ThemeOption>(themePreference);

  // Handle data export
  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const data = await exportData();
      
      // Create and download file
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bossbitch-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle data import
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(false);
    
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const jsonString = e.target?.result as string;
          const success = await importData(jsonString);
          
          if (success) {
            setImportSuccess(true);
          } else {
            setImportError('Failed to import data. Invalid format.');
          }
        } catch (error) {
          console.error('Error importing data:', error);
          setImportError('Error importing data. Please try again.');
        } finally {
          setIsLoading(false);
        }
      };
      
      reader.onerror = () => {
        setImportError('Error reading file. Please try again.');
        setIsLoading(false);
      };
      
      reader.readAsText(file);
    } catch (error) {
      console.error('Error handling file import:', error);
      setImportError('Error handling file import. Please try again.');
      setIsLoading(false);
    }
    
    // Reset file input
    event.target.value = '';
  };

  // Handle data clearing
  const handleClearData = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    
    setIsLoading(true);
    try {
      await clearAllData();
      setConfirmClear(false);
    } catch (error) {
      console.error('Error clearing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle color customization
  const handleColorUpdate = (colorKey: string, value: string) => {
    if (!preferences) return;
    
    updatePreferences({
      colors: {
        ...preferences.colors,
        [colorKey]: value
      }
    });
  };

  // Handle theme change
  const handleThemeChange = (theme: ThemeOption) => {
    setSelectedTheme(theme);
    
    if (theme === 'system') {
      // Let system preference decide
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.classList.toggle('dark-mode', prefersDark);
      document.documentElement.classList.toggle('light-mode', !prefersDark);
      localStorage.removeItem('bossbitch-theme');
    } else {
      // Manually set theme
      const isDark = theme === 'dark';
      document.documentElement.classList.toggle('dark-mode', isDark);
      document.documentElement.classList.toggle('light-mode', !isDark);
      localStorage.setItem('bossbitch-theme', isDark ? 'dark' : 'light');
    }
    
    onThemeChange(theme);
  };

  const renderColorSettings = () => (
    <div className={styles.colorSettings}>
      <h4 className={styles.colorTitle}>App Colors</h4>
      
      {preferences && (
        <div className={styles.colorOptions}>
          <div className={styles.colorOption}>
            <label className={styles.colorLabel}>Daily Ring</label>
            <input 
              type="color" 
              value={preferences.colors.dailyRing} 
              onChange={(e) => handleColorUpdate('dailyRing', e.target.value)}
              className={styles.colorInput}
            />
          </div>
          
          <div className={styles.colorOption}>
            <label className={styles.colorLabel}>Monthly Ring</label>
            <input 
              type="color" 
              value={preferences.colors.monthlyRing} 
              onChange={(e) => handleColorUpdate('monthlyRing', e.target.value)}
              className={styles.colorInput}
            />
          </div>
          
          <div className={styles.colorOption}>
            <label className={styles.colorLabel}>Accent Color</label>
            <input 
              type="color" 
              value={preferences.colors.accent} 
              onChange={(e) => handleColorUpdate('accent', e.target.value)}
              className={styles.colorInput}
            />
          </div>
        </div>
      )}
      
      <button 
        className={styles.doneButton}
        onClick={() => setShowColorPicker(false)}
      >
        Done
      </button>
    </div>
  );

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Settings</h2>

      <div className={styles.settingsCard}>
        {/* Account Section */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Account</h3>
          
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingIcon}>
                <LogIn size={20} />
              </div>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>
                  {isAuthenticated ? "Account" : "Sign In"}
                </h3>
                <p className={styles.settingDescription}>
                  {isAuthenticated 
                    ? `Signed in as ${currentUser?.email}` 
                    : "Sign in to sync your data across devices"}
                </p>
              </div>
            </div>
            <AuthButton 
              onClick={() => setShowAuthModal(true)}
              showName={false}
            />
          </div>
        </div>

        {/* Appearance Section */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Appearance</h3>
          
          {/* Theme Selection */}
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingIcon}>
                {selectedTheme === 'dark' ? (
                  <Moon size={20} />
                ) : selectedTheme === 'light' ? (
                  <Sun size={20} />
                ) : (
                  <Computer size={20} />
                )}
              </div>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>App Theme</h3>
                <p className={styles.settingDescription}>
                  Choose between light, dark, or system default theme
                </p>
              </div>
            </div>
            <div className={styles.themeOptions}>
              <button 
                className={`${styles.themeButton} ${selectedTheme === 'light' ? styles.themeButtonActive : ''}`}
                onClick={() => handleThemeChange('light')}
                aria-label="Light theme"
              >
                <Sun size={16} />
                <span>Light</span>
              </button>
              <button 
                className={`${styles.themeButton} ${selectedTheme === 'system' ? styles.themeButtonActive : ''}`}
                onClick={() => handleThemeChange('system')}
                aria-label="System theme"
              >
                <Computer size={16} />
                <span>System</span>
              </button>
              <button 
                className={`${styles.themeButton} ${selectedTheme === 'dark' ? styles.themeButtonActive : ''}`}
                onClick={() => handleThemeChange('dark')}
                aria-label="Dark theme"
              >
                <Moon size={16} />
                <span>Dark</span>
              </button>
            </div>
          </div>

          {/* Color Customization */}
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingIcon}>
                <Palette size={20} />
              </div>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>Colors</h3>
                <p className={styles.settingDescription}>
                  Customize app colors and ring themes
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowColorPicker(true)}
              className={styles.actionButton}
            >
              Edit
            </button>
          </div>
        </div>

        {/* Data Management Section */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Data</h3>
          
          {/* Export Data */}
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingIcon}>
                <Download size={20} />
              </div>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>Export Data</h3>
                <p className={styles.settingDescription}>
                  Download your goals and progress data
                </p>
              </div>
            </div>
            <button
              onClick={handleExportData}
              className={styles.actionButton}
              disabled={isLoading}
            >
              Export
            </button>
          </div>
          
          {/* Import Data */}
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingIcon}>
                <Upload size={20} />
              </div>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>Import Data</h3>
                <p className={styles.settingDescription}>
                  Restore from a previous export
                </p>
              </div>
            </div>
            <div className={styles.importContainer}>
              <label className={styles.importLabel}>
                <span className={styles.actionButton}>Import</span>
                <input 
                  type="file" 
                  accept=".json" 
                  onChange={handleImportData}
                  className={styles.fileInput}
                  disabled={isLoading}
                />
              </label>
            </div>
          </div>
          
          {/* Error/Success messages for import */}
          {importError && (
            <div className={styles.importMessage}>
              <div className={styles.error}>{importError}</div>
            </div>
          )}
          
          {importSuccess && (
            <div className={styles.importMessage}>
              <div className={styles.success}>Data imported successfully!</div>
            </div>
          )}
          
          {/* Clear Data */}
          <div className={styles.settingItem}>
            <div className={styles.settingContent}>
              <div className={styles.settingIcon}>
                <Trash2 size={20} />
              </div>
              <div className={styles.settingInfo}>
                <h3 className={styles.settingTitle}>Clear Data</h3>
                <p className={styles.settingDescription}>
                  Delete all your goal data
                </p>
              </div>
            </div>
            <button
              onClick={handleClearData}
              className={confirmClear ? styles.dangerButtonConfirm : styles.dangerButton}
              disabled={isLoading}
            >
              {confirmClear ? 'Confirm' : 'Clear'}
            </button>
          </div>
          
          {confirmClear && (
            <div className={styles.confirmMessage}>
              <p>Are you sure? This will delete all your goal data and cannot be undone.</p>
              <button 
                className={styles.cancelButton}
                onClick={() => setConfirmClear(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <p className={styles.versionInfo}>
        Boss Bitch v1.0.0
      </p>

      {showAuthModal && (
        <AuthModal onClose={() => setShowAuthModal(false)} />
      )}
      
      {showColorPicker && (
        <div className={styles.colorPickerOverlay}>
          {renderColorSettings()}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;