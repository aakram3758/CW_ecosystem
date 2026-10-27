// Metro in an npm workspace. Without this, the bundler only looks inside apps/mobile, while npm
// hoists most packages to the repo root — so imports resolve in the editor and fail in the bundler.
//
//   watchFolders        — also watch the repo root, so hoisted packages are seen and reloaded
//   nodeModulesPaths    — resolve from apps/mobile first, then the root
//   disableHierarchical — only those two places, so a stray node_modules further up can't win
//
// There ARE two React copies on disk, and that is fine — but only because of the lines below.
// Expo SDK 58 pins react to exactly 19.3.0, the dashboard asks for ^19.2.0 which resolves to
// 19.3.1, so npm hoists 19.3.1 to the root and nests 19.3.0 under apps/mobile. Two Reacts inside
// one bundle is what causes "Invalid hook call"; what prevents it here is that Metro looks in
// apps/mobile/node_modules FIRST and nowhere above the root, so every require('react') in the
// mobile bundle lands on the same 19.3.0.
//
// So: don't "tidy up" by dropping nodeModulesPaths or disableHierarchicalLookup, and don't loosen
// Expo's exact pin to dedupe — the pin is how Expo states what the SDK was tested against.
// `npm ls react` from the root, then `npm run bundle` here, is how to re-check after any bump.
const { getDefaultConfig } = require('expo/metro-config');
const path = require('node:path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

module.exports = config;
