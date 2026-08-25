import packageJson from "../package.json";

export const APP_VERSION = packageJson.version;
export const LIVE_APP_VERSION = `lernraum-${APP_VERSION}` as const;
