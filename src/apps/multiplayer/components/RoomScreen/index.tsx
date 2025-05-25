// src/apps/multiplayer/components/RoomScreen/index.tsx
'use client';

import { Room, Player, ConnectionStatus } from '../../types/lobby.types';
import styles from './styles.module.css';

interface RoomScreenProps {
  room: Room | null;
  currentPlayer: Player | null;
  isHost: boolean;
  isReady: boolean;
  allPlayersReady: boolean;
  roomFull: boolean;
  onUpdateReady: (isReady: boolean) => void;
  onLeaveRoom: () => void;
  connectionStatus: ConnectionStatus;
}

export const RoomScreen = ({
  room,
  currentPlayer,
//   isHost,
  isReady,
  allPlayersReady,
  roomFull,
  onUpdateReady,
  onLeaveRoom,
  connectionStatus,
}: RoomScreenProps) => {
  if (!room || !currentPlayer) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading room...</p>
        </div>
      </div>
    );
  }

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(room.id);
    // You could add a toast notification here
  };

  const handleShareRoom = async () => {
    const shareUrl = `${window.location.origin}/multiplayer?room=${room.id}`;
    const shareData = {
      title: 'Join my game room!',
      text: `Hey! Join me in my multiplayer game room. Room code: ${room.id}`,
      url: shareUrl,
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy link to clipboard
        await navigator.clipboard.writeText(shareUrl);
        // You could show a toast notification here saying "Link copied to clipboard!"
        alert('Share link copied to clipboard!');
      }
    } catch (error) {
      // If sharing was cancelled or failed, try copying to clipboard as fallback
      try {
        await navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      } catch (clipboardError) {
        console.error('Failed to share or copy:', error, clipboardError);
        // Final fallback - show the link
        alert(`Share this link: ${shareUrl}`);
      }
    }
  };

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
    <div className={styles.container}>
      <div className={styles.roomHeader}>
        <div className={styles.roomInfo}>
          <h1 className={styles.roomTitle}>Room {room.id}</h1>
          <div className={styles.connectionStatus}>
            <div 
              className={styles.statusDot}
              style={{ backgroundColor: getConnectionStatusColor(connectionStatus) }}
            ></div>
            <span className={styles.statusText}>
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'connecting' && 'Connecting...'}
              {connectionStatus === 'disconnected' && 'Disconnected'}
              {connectionStatus === 'error' && 'Connection Error'}
            </span>
          </div>
        </div>
        
        <div className={styles.roomActions}>
          <button onClick={handleShareRoom} className={styles.shareButton}>
            📤 Share Room
          </button>
          <button onClick={handleCopyRoomCode} className={styles.copyButton}>
            📋 Copy Code
          </button>
          <button onClick={onLeaveRoom} className={styles.leaveButton}>
            🚪 Leave Room
          </button>
        </div>
      </div>

      <div className={styles.playersSection}>
        <h2 className={styles.sectionTitle}>
          Players ({room.players.length}/{room.maxPlayers})
        </h2>
        
        <div className={styles.playersList}>
          {room.players.map((player) => (
            <div 
              key={player.id} 
              className={`${styles.playerCard} ${player.id === currentPlayer.id ? styles.currentPlayer : ''}`}
            >
              <div className={styles.playerInfo}>
                <div className={styles.playerAvatar}>
                  {player.name[0].toUpperCase()}
                </div>
                <div className={styles.playerDetails}>
                  <div className={styles.playerName}>
                    {player.name}
                    {player.id === room.hostId && (
                      <span className={styles.hostBadge}>👑 Host</span>
                    )}
                    {player.id === currentPlayer.id && (
                      <span className={styles.youBadge}>You</span>
                    )}
                  </div>
                  <div className={styles.playerMeta}>
                    Joined {new Date(player.joinedAt).toLocaleTimeString()}
                  </div>
                </div>
              </div>
              
              <div className={styles.playerStatus}>
                <div className={`${styles.readyIndicator} ${player.isReady ? styles.ready : styles.notReady}`}>
                  {player.isReady ? '✅ Ready' : '⏳ Not Ready'}
                </div>
              </div>
            </div>
          ))}
          
          {/* Empty slots */}
          {Array.from({ length: room.maxPlayers - room.players.length }).map((_, index) => (
            <div key={`empty-${index}`} className={`${styles.playerCard} ${styles.emptySlot}`}>
              <div className={styles.emptySlotContent}>
                <div className={styles.emptyAvatar}>?</div>
                <div className={styles.emptyText}>Waiting for player...</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.gameControls}>
        {!roomFull && (
          <div className={styles.waitingMessage}>
            <p>🔗 Share the room with your friend using the <strong>Share Room</strong> button above!</p>
          </div>
        )}
        
        {roomFull && (
          <>
            <div className={styles.readySection}>
              <button
                onClick={() => onUpdateReady(!isReady)}
                className={`${styles.readyButton} ${isReady ? styles.readyActive : ''}`}
              >
                {isReady ? '✅ Ready!' : '⏳ Click when ready'}
              </button>
            </div>
            
            {allPlayersReady && (
              <div className={styles.allReadyMessage}>
                <h3>🎉 All players are ready!</h3>
                <p>Time to choose a game to play together.</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};