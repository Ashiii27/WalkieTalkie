const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Allow importing .wav / .mp3 audio assets bundled with the app.
config.resolver.assetExts = Array.from(
  new Set([...config.resolver.assetExts, 'wav', 'mp3', 'ogg'])
);

module.exports = config;
