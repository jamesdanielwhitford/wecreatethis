// Birdle sync logic - handles data exchange and merging

const MessageType = {
  HELLO: 'HELLO',
  DATA: 'DATA',
  ACK: 'ACK',
  DONE: 'DONE'
};

class BirdleSync {
  constructor() {
    this.peer = null;
    this.onStatusChange = null;
    this.onProgress = null;
    this.onComplete = null;
    this.onError = null;
    this.receivedData = false;
    this.sentData = false;
  }

  async startSync(peerConnection) {
    this.peer = peerConnection;
    this.peer.onMessage = (data) => this.handleMessage(data);
    this.receivedData = false;
    this.sentData = false;

    this.updateStatus('Connected! Preparing data...');

    // Migrate any old sightings without syncId
    await BirdDB.migrateSightingsForSync();

    // Send our data
    await this.sendData();
  }

  async handleMessage(data) {
    try {
      const msg = JSON.parse(data);

      switch (msg.type) {
        case MessageType.HELLO:
          // Peer is ready, send our data
          await this.sendData();
          break;

        case MessageType.DATA:
          await this.handleIncomingData(msg.payload);
          break;

        case MessageType.ACK:
          this.updateProgress('Peer received our data');
          this.checkComplete();
          break;

        case MessageType.DONE:
          this.handleDone();
          break;
      }
    } catch (e) {
      console.error('Failed to handle message:', e);
      if (this.onError) {
        this.onError(e);
      }
    }
  }

  async sendData() {
    if (this.sentData) return;
    this.sentData = true;

    this.updateStatus('Gathering local data...');

    // Gather all syncable data
    const sightings = await BirdDB.getAllSightingsForSync();
    const games = this.getGamesForSync();

    const payload = {
      sightings,
      games,
      timestamp: Date.now()
    };

    this.updateProgress(`Sending ${sightings.length} sightings, ${games.length} games...`);

    this.send(MessageType.DATA, payload);
  }

  getGamesForSync() {
    const games = JSON.parse(localStorage.getItem('games') || '[]');
    // Only sync essential game data (not cached birds)
    return games.map(g => ({
      id: g.id,
      title: g.title,
      regionCode: g.regionCode,
      regionName: g.regionName,
      startDate: g.startDate,
      endDate: g.endDate,
      createdAt: g.createdAt,
      dateModified: g.dateModified || g.createdAt
    }));
  }

  async handleIncomingData(payload) {
    this.receivedData = true;
    const { sightings, games } = payload;

    this.updateStatus('Merging data...');

    // Merge sightings
    let sightingsImported = 0;
    let sightingsSkipped = 0;

    for (const sighting of sightings) {
      const result = await BirdDB.importSighting(sighting);
      if (result.imported) {
        sightingsImported++;
      } else {
        sightingsSkipped++;
      }
    }

    // Merge games
    let gamesImported = 0;
    let gamesUpdated = 0;
    let gamesSkipped = 0;

    const localGames = JSON.parse(localStorage.getItem('games') || '[]');
    const localGamesMap = new Map(localGames.map(g => [g.id, g]));

    for (const remoteGame of games) {
      const localGame = localGamesMap.get(remoteGame.id);

      if (!localGame) {
        // New game - add it
        localGames.push({
          ...remoteGame,
          birds: null,
          seenBirds: []
        });
        gamesImported++;
      } else {
        // Existing game - check if remote is newer
        const localModified = new Date(localGame.dateModified || localGame.createdAt || 0);
        const remoteModified = new Date(remoteGame.dateModified || remoteGame.createdAt || 0);

        if (remoteModified > localModified) {
          // Update local with remote (preserve birds cache)
          Object.assign(localGame, remoteGame);
          localGame.birds = localGame.birds; // Keep cached birds
          gamesUpdated++;
        } else {
          gamesSkipped++;
        }
      }
    }

    // Save merged games
    localStorage.setItem('games', JSON.stringify(localGames));

    this.updateProgress(
      `Imported: ${sightingsImported} sightings, ${gamesImported} games. ` +
      `Updated: ${gamesUpdated} games. ` +
      `Skipped: ${sightingsSkipped} sightings, ${gamesSkipped} games.`
    );

    // Send acknowledgment
    this.send(MessageType.ACK, {});

    this.checkComplete();
  }

  checkComplete() {
    if (this.receivedData && this.sentData) {
      this.send(MessageType.DONE, {});
      this.finishSync();
    }
  }

  handleDone() {
    this.finishSync();
  }

  finishSync() {
    this.updateStatus('Sync complete!');
    if (this.onComplete) {
      this.onComplete();
    }
  }

  send(type, payload) {
    const msg = JSON.stringify({ type, payload });
    return this.peer.send(msg);
  }

  updateStatus(status) {
    console.log('Sync:', status);
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  updateProgress(message) {
    console.log('Sync progress:', message);
    if (this.onProgress) {
      this.onProgress(message);
    }
  }

  abort() {
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }
  }
}

// Export for global use
window.BirdleSync = BirdleSync;
