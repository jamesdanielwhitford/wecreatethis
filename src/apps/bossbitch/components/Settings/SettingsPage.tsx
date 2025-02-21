'use client';

// src/apps/bossbitch/components/Settings/SettingsPage.tsx
import React, { useState } from 'react';
import { 
  Moon, 
  Sun, 
  Trash2, 
  Database, 
  Palette, 
  LogIn,
  Download,
  Upload,
  Info
} from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import { AuthModal, AuthButton } from '../Auth';
import ColorPicker from './ColorPicker';
import styles from './styles.module.css';

interface SettingsPageProps {
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  isDarkMode,
  onThemeToggle
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
  const [exportedData, setExportedData] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  // Handle data export
  const handleExportData = async () => {
    setIsLoading(true);
    try {
      const data = await exportData();
      setExportedData(data);
      
      // Create and download file
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bossbitch-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
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

  const SettingItem = ({ 
    icon: Icon, 
    title, 
    description, 
    action 
  }: { 
    icon: React.FC<any>; 
    title: string; 
    description: string; 
    action: React.ReactNode;
  }) => (
    <div className={styles.settingItem}>
      <div className={styles.settingContent}>
        <div className={styles.settingIcon}>
          <Icon size={20} />
        </div>
        <div className={styles.settingInfo}>
          <h3 className={styles.settingTitle}>{title}</h3>
          <p className={styles.settingDescription}>{description}</p>
        </div>
      </div>
      <div>{action}</div>
    </div>
  );

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
          
          <SettingItem
            icon={LogIn}
            title={isAuthenticated ? "Account" : "Sign In"}
            description={
              isAuthenticated 
                ? `Signed in as ${currentUser?.email}` 
                : "Sign in to sync your data across devices"
            }
            action={
              <AuthButton 
                onClick={() => setShowAuthModal(true)}
                showName={false}
              />
            }
          />
        </div>

        {/* Appearance Section */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Appearance</h3>
          
          {/* Theme Toggle */}
          <SettingItem
            icon={isDarkMode ? Moon : Sun}
            title="App Theme"
            description="Switch between dark and light mode"
            action={
              <button
                onClick={onThemeToggle}
                className={`${styles.toggleSwitch} ${isDarkMode ? styles.toggleSwitchActive : ''}`}
              >
                <span
                  className={`${styles.toggleKnob} ${isDarkMode ? styles.toggleKnobActive : ''}`}
                />
              </button>
            }
          />

          {/* Color Customization */}
          <SettingItem
            icon={Palette}
            title="Colors"
            description="Customize app colors and ring themes"
            action={
              <button
                onClick={() => setShowColorPicker(true)}
                className={styles.actionButton}
              >
                Edit
              </button>
            }
          />
        </div>

        {/* Data Management Section */}
        <div className={styles.settingSection}>
          <h3 className={styles.sectionTitle}>Data</h3>
          
          {/* Export Data */}
          <SettingItem
            icon={Download}
            title="Export Data"
            description="Download your goals and progress data"
            action={
              <button
                onClick={handleExportData}
                className={styles.actionButton}
                disabled={isLoading}
              >
                Export
              </button>
            }
          />
          
          {/* Import Data */}
          <SettingItem
            icon={Upload}
            title="Import Data"
            description="Restore from a previous export"
            action={
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
            }
          />
          
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
          <SettingItem
            icon={Trash2}
            title="Clear Data"
            description="Delete all your goal data"
            action={
              <button
                onClick={handleClearData}
                className={confirmClear ? styles.dangerButtonConfirm : styles.dangerButton}
                disabled={isLoading}
              >
                {confirmClear ? 'Confirm' : 'Clear'}
              </button>
            }
          />
          
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