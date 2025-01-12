export type Settings = {
  showCharts: boolean;
  maxChartDataPoints: number;
  maxDatapointsToStore: number;
  latencyTest: boolean;
  latencyAttributeName: string;
  latencyChangeThreshold: number;
};

class SettingsManager {
  private static instance: SettingsManager;
  private settings: Settings;
  private storageKey = "RaftJS_Settings";
  private maxChartDataPoints_default = 50;
  private maxDatapointsToStore_default = 1000;

  private constructor() {
    // Load settings from localStorage or use default values
    const savedSettings = localStorage.getItem(this.storageKey);
    this.settings = savedSettings
      ? JSON.parse(savedSettings)
      : {
          latencyTest: false,
          showCharts: true,
          maxChartDataPoints: this.maxChartDataPoints_default,
          maxDatapointsToStore: this.maxDatapointsToStore_default,
        };
  }

  static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager();
    }
    return SettingsManager.instance;
  }

  getSetting<K extends keyof Settings>(key: K): Settings[K] {
    return this.settings[key];
  }

  setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
    this.settings[key] = value;
    this.saveSettings();
  }

  getAllSettings(): Settings {
    return this.settings;
  }

  // Save settings to localStorage
  private saveSettings(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.settings));
  }

  // Reset to default settings
  resetSettings(): void {
    this.settings = {
      latencyTest: false,
      showCharts: true,
      maxChartDataPoints: this.maxChartDataPoints_default,
      maxDatapointsToStore: this.maxDatapointsToStore_default,
    };
    this.saveSettings();
  }
}

export default SettingsManager;
