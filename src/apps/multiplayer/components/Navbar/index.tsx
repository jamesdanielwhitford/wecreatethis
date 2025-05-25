// src/apps/multiplayer/components/Navbar/index.tsx
'use client';

import Link from 'next/link';
import { Room, ConnectionStatus } from '../../types/lobby.types';
import styles from './styles.module.css';

interface NavbarProps {
  currentRoom: Room | null;
  connectionStatus: ConnectionStatus;
  onLeaveRoom: () => void;
}

export const Navbar = ({
  currentRoom,
  connectionStatus,
  onLeaveRoom,
}: NavbarProps) => {
  const getConnectionStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected': return '#10b981';
      case 'connecting': return '#f59e0b';
      case 'disconnected': return '#6b7280';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link href="/" className={styles.homeLink}>
            🏠 Home
          </Link>
        </div>

        <div className={styles.right}>
          {currentRoom && (
            <>
              <div className={styles.roomStatus}>
                <div className={styles.statusInfo}>
                  <div 
                    className={styles.statusDot}
                    style={{ backgroundColor: getConnectionStatusColor(connectionStatus) }}
                  ></div>
                  <span className={styles.statusText}>
                    {connectionStatus === 'connected' && 'Connected'}
                    {connectionStatus === 'connecting' && 'Connecting...'}
                    {connectionStatus === 'disconnected' && 'Disconnected'}
                    {connectionStatus === 'error' && 'Error'}
                  </span>
                </div>
                <div className={styles.roomInfo}>
                  <span className={styles.playersCount}>
                    {currentRoom.players.length}/{currentRoom.maxPlayers} players
                  </span>
                </div>
              </div>
              <button onClick={onLeaveRoom} className={styles.leaveButton}>
                🚪 Leave Room
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};