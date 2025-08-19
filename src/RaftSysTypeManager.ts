import { RaftSystemType } from "./RaftSystemType";

type RaftSystemTypeCreator = () => RaftSystemType;

export default class RaftSysTypeManager {
  // Singleton instance
  private static _instance: RaftSysTypeManager;

  // System type map
  private _sysTypes: Map<string, RaftSystemTypeCreator> = new Map();
  private _defaultSysTypeFactory: RaftSystemTypeCreator | null = null;

  // Get instance (Singleton)
  public static getInstance(): RaftSysTypeManager {
    if (!RaftSysTypeManager._instance) {
      RaftSysTypeManager._instance = new RaftSysTypeManager();
    }
    return RaftSysTypeManager._instance;
  }

  // Add a system type by name with its factory
  public addSystemType(sysType: string, factory: RaftSystemTypeCreator): void {
    if (this._sysTypes.has(sysType)) {
      throw new Error(`System type '${sysType}' is already registered.`);
    }
    this._sysTypes.set(sysType, factory);
  }

  // Set the default system type factory
  public addDefaultSystemType(factory: RaftSystemTypeCreator): void {
    this._defaultSysTypeFactory = factory;
  }

  // Create a system type by name
  public createSystemType(sysType: string): RaftSystemType | null {
    const factory = this._sysTypes.get(sysType);
    if (!factory) {
      return null;
    }
    return factory();
  }

  // Create the default system type
  public createDefaultSystemType(): RaftSystemType | null {
    if (!this._defaultSysTypeFactory) {
      return null;
    }
    return this._defaultSysTypeFactory();
  }

  // Get a list of all unique BLE service UUIDs
  getAllServiceUUIDs(): string[] {
    const serviceUUIDs = new Set<string>();
    this._sysTypes.forEach((factory) => {
      const sysType = factory();
      if (!sysType.BLEServiceUUIDs) {
        return;
      }
      sysType.BLEServiceUUIDs.forEach((uuid) => serviceUUIDs.add(uuid));
    });
    return Array.from(serviceUUIDs);
  }

  // Get a list of all device name prefixes to filter on
  getAllNamePrefixes(): string[] {
    const deviceNames = new Set<string>();
    this._sysTypes.forEach((factory) => {
      const sysType = factory();
      if (!sysType.BLEDeviceNames) {
        return;
      }
      sysType.BLEDeviceNames.forEach((name) => deviceNames.add(name));
    });
    return Array.from(deviceNames);
  }

  // Find the system type for a given BLE device name prefix
  getSystemTypeByBLENamePrefix(name: string): RaftSystemType | null {
    for (const factory of this._sysTypes.values()) {
      const sysType = factory();
      if (sysType.BLEDeviceNames && sysType.BLEDeviceNames.some((prefix) => name.startsWith(prefix))) {
        return sysType;
      }
    }
    return null;
  }
}
