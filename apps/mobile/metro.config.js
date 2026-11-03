// Metro in an npm workspace. Expo's default config already handles it: it watches the repo root and
// resolves from apps/mobile/node_modules first, then the root, so nothing is overridden here.
//
// That is only safe because there is ONE React on disk. Expo SDK 58 pins react to exactly 19.3.0,
// and the dashboard pins react and react-dom to the same 19.3.0, so npm hoists a single copy. Two
// Reacts inside one bundle is what causes "Invalid hook call" — so if either app's React moves,
// move the other with it. After any React or SDK bump: `npm ls react` from the root (one version),
// then `npm run bundle` here.
const { getDefaultConfig } = require('expo/metro-config');

module.exports = getDefaultConfig(__dirname);
