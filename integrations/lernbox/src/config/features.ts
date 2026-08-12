export const FEATURES = {
    enableReverseMode: true,
    enableAI: false,
    enableCloudSync: false,
    enableAdvancedStats: true,
};

export const isFeatureEnabled = (feature: keyof typeof FEATURES) => FEATURES[feature];
