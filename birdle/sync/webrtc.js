// WebRTC connection wrapper for Birdle sync

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
];

class PeerConnection {
  constructor() {
    this.pc = null;
    this.dataChannel = null;
    this.onMessage = null;
    this.onConnectionStateChange = null;
    this.onDataChannelOpen = null;
    this.onDataChannelClose = null;
  }

  async createConnection(isInitiator) {
    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (isInitiator) {
      this.dataChannel = this.pc.createDataChannel('sync', {
        ordered: true
      });
      this.setupDataChannel(this.dataChannel);
    } else {
      this.pc.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel(this.dataChannel);
      };
    }

    this.pc.onconnectionstatechange = () => {
      console.log('Connection state:', this.pc.connectionState);
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(this.pc.connectionState);
      }
    };

    this.pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', this.pc.iceConnectionState);
    };

    return this.pc;
  }

  setupDataChannel(channel) {
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('DataChannel open');
      if (this.onDataChannelOpen) {
        this.onDataChannelOpen();
      }
    };

    channel.onclose = () => {
      console.log('DataChannel closed');
      if (this.onDataChannelClose) {
        this.onDataChannelClose();
      }
    };

    channel.onerror = (error) => {
      console.error('DataChannel error:', error);
    };

    channel.onmessage = (event) => {
      if (this.onMessage) {
        this.onMessage(event.data);
      }
    };
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete
    await this.waitForICEComplete();

    return this.pc.localDescription;
  }

  async acceptOffer(offer) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    await this.waitForICEComplete();

    return this.pc.localDescription;
  }

  async acceptAnswer(answer) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(answer));
  }

  waitForICEComplete() {
    return new Promise((resolve) => {
      if (this.pc.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const checkState = () => {
        if (this.pc.iceGatheringState === 'complete') {
          this.pc.onicegatheringstatechange = null;
          resolve();
        }
      };

      this.pc.onicegatheringstatechange = checkState;

      // Timeout fallback (5 seconds)
      setTimeout(() => {
        this.pc.onicegatheringstatechange = null;
        resolve();
      }, 5000);
    });
  }

  send(data) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      try {
        this.dataChannel.send(data);
        return true;
      } catch (e) {
        console.error('Send error:', e);
        return false;
      }
    }
    console.warn('DataChannel not open, cannot send');
    return false;
  }

  isConnected() {
    return this.pc?.connectionState === 'connected' &&
           this.dataChannel?.readyState === 'open';
  }

  getConnectionState() {
    return {
      connection: this.pc?.connectionState,
      ice: this.pc?.iceConnectionState,
      dataChannel: this.dataChannel?.readyState
    };
  }

  close() {
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }
  }
}

// Export for global use
window.PeerConnection = PeerConnection;
