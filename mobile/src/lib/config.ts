import Constants from 'expo-constants';

// The website the app talks to. EXPO_PUBLIC_SITE overrides it for a local test server only.
const fromConfig = (Constants.expoConfig?.extra as { siteOrigin?: string } | undefined)?.siteOrigin;
export const SITE_ORIGIN = (process.env.EXPO_PUBLIC_SITE || fromConfig || 'https://pppmtl.com').replace(/\/+$/, '');
export const APP_VERSION = Constants.expoConfig?.version ?? '2.0.0';
