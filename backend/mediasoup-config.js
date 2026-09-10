// backend/mediasoup-config.js
const os = require('os');

function getLocalIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

const localIp = getLocalIp();

module.exports = {
  // Worker settings
  worker: {
    logLevel: 'warn',
    logTags: [
      'info',
      'ice',
      'dtls',
      'rtp',
      'srtp',
      'rtcp'
    ],
    rtcMinPort: 40000,
    rtcMaxPort: 49999,
  },

  // Codecs supported by Mediasoup SFU
  mediaCodecs: [
    {
      kind: 'audio',
      mimeType: 'audio/opus',
      clockRate: 48000,
      channels: 2,
    },
    {
      kind: 'video',
      mimeType: 'video/VP8',
      clockRate: 90000,
      parameters: {
        'x-google-start-bitrate': 1000,
      },
    },
    {
      kind: 'video',
      mimeType: 'video/H264',
      clockRate: 90000,
      parameters: {
        'packetization-mode': 1,
        'profile-level-id': '42e01f',
        'level-asymmetry-allowed': 1,
      },
    },
  ],

  // WebRTC Transport settings with STUN/TURN support
  webRtcTransport: {
    listenIps: [
      {
        ip: '0.0.0.0',
        announcedIp: process.env.MEDIASOUP_ANNOUNCED_IP || localIp,
      },
    ],
    initialAvailableOutgoingBitrate: 1000000,
    minimumAvailableOutgoingBitrate: 300000,
    maxSctpMessageSize: 262144,
  },

  // Public & Production STUN / TURN servers for Carrier-Grade NAT (CGNAT) bypass
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    ...(process.env.TURN_URL ? [{
      urls: process.env.TURN_URL,
      username: process.env.TURN_USERNAME || '',
      credential: process.env.TURN_CREDENTIAL || '',
    }] : []),
  ],

  // Adaptive Bitrate Simulcast Encocings (for smooth streaming on 3G / 4G networks)
  simulcastEncodings: [
    { rid: 'r0', maxBitrate: 150000, scaleResolutionDownBy: 4.0 },  // 360p Low (Weak mobile data)
    { rid: 'r1', maxBitrate: 600000, scaleResolutionDownBy: 2.0 },  // 720p Medium (Standard 4G)
    { rid: 'r2', maxBitrate: 1500000, scaleResolutionDownBy: 1.0 }, // 1080p High (Wi-Fi / 5G)
  ],
};
