// src/SettingsManager.ts
export type Settings = {
    latencyTest: boolean;
  };
  
  class SettingsManager {
    private static instance: SettingsManager;
    private settings: Settings;
  
    private constructor() {
      this.settings = {
        latencyTest: false, // Default value
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
    }
  
    getAllSettings(): Settings {
      return this.settings;
    }
  }
  
  export default SettingsManager;
  