// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// @rnmapbox/maps ships some native-component "spec" files as raw .ts inside
// node_modules (e.g. lib/module/specs/RNMBXCameraNativeComponent.ts) with no
// precompiled .js twin. Metro needs package-exports resolution disabled so it
// resolves/transforms those internal relative imports the normal way instead
// of trying to route them through package.json "exports" maps.
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
