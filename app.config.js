// app.config.js is used instead of app.json to support env-var interpolation
// for the Mapbox secret download token (MAPBOX_SECRET_TOKEN).
// Set MAPBOX_SECRET_TOKEN as an EAS secret (eas secret:create) for cloud builds,
// and add it to your local .env for local prebuild runs.
export default {
  expo: {
    name: "MineOpsApp",
    slug: "MineOpsApp",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.sakumi.mineopsapp",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: "com.sakumi.mineopsapp",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      [
        "expo-image-picker",
        {
          photosPermission:
            "MineOps needs access to your photos to set your profile picture.",
          cameraPermission:
            "MineOps needs access to your camera to take a profile picture.",
        },
      ],
      "expo-secure-store",
      [
        "expo-local-authentication",
        {
          faceIDPermission: "MineOps uses Face ID to securely sign you in.",
        },
      ],
      "expo-font",
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsDownloadToken: process.env.MAPBOX_SECRET_TOKEN ?? "",
        },
      ],
    ],
    extra: {
      eas: {
        projectId: "5befeaf7-e38a-419e-8e5a-5cccd607e115",
      },
    },
    owner: "sa.kumi",
  },
};
