import { RaftConnector, RaftEventFn, RaftLog, RaftSystemUtils, RaftSysTypeManager } from "../../../src/main";
import SettingsManager from "./SettingsManager";
import SystemTypeCog from "./SystemTypeCog/SystemTypeCog";
import SystemTypeGeneric from "./SystemTypeGeneric/SystemTypeGeneric";
import SystemTypeMarty from "./SystemTypeMarty/SystemTypeMarty";

const sysTypeManager = RaftSysTypeManager.getInstance();
const settingsManager = SettingsManager.getInstance();

sysTypeManager.addSystemType('Cog', () => new SystemTypeCog());
sysTypeManager.addSystemType('Marty', () => new SystemTypeMarty());
sysTypeManager.addDefaultSystemType(() => new SystemTypeGeneric());

export default class ConnManager {

  // Singleton
  private static _instance: ConnManager;

  // Connector
  private _connector = new RaftConnector(async (systemUtils: RaftSystemUtils) => {
    const systemInfo = await systemUtils.getSystemInfo();
    const sysType = sysTypeManager.createSystemType(systemInfo.SystemName) || sysTypeManager.createDefaultSystemType();
    sysType?.deviceMgrIF.setMaxDataPointsToStore(settingsManager.getSetting("maxDatapointsToStore"));
    return sysType;
  });

  // Callback on connection event
  private _onConnectionEvent: RaftEventFn | null = null;

  // Get instance
  public static getInstance(): ConnManager {
    if (!ConnManager._instance) {
      ConnManager._instance = new ConnManager();
    }
    return ConnManager._instance;
  }

  // Set connection event listener
  public setConnectionEventListener(listener: RaftEventFn) {
    this._onConnectionEvent = listener;
  }

  // Check if connected
  public isConnected(): boolean {
    return this._connector.isConnected();
  }

  public getConnector(): RaftConnector {
    return this._connector;
  }

  private async getBleDevice(uuids: string[]): Promise<BluetoothDevice | null> {
    const filtersArray = uuids.map((uuid) => ({ services: [uuid] }));
    try {
      const dev = await navigator.bluetooth.requestDevice({
        filters: filtersArray,
        optionalServices: []
      });
      return dev;
    } catch (e) {
      RaftLog.error(`getBleDevice - failed to get device ${e}`);
      return null;
    }
  }

  // Connect
  public async connect(method: string, locator: string | object, uuids: string[]): Promise<boolean> {

    // Hook up the connector
    this._connector.setEventListener((evtType, eventEnum, eventName, eventData) => {
      RaftLog.verbose(`ConnManager - event ${eventName}`);
      if (this._onConnectionEvent) {
        this._onConnectionEvent(evtType, eventEnum, eventName, eventData);
      }
    });
    await this._connector.initializeChannel(method);
    // Set the connector websocket suffix
    if (method === "WebBLE") {
      const dev = await this.getBleDevice(uuids);
      return this._connector.connect(dev as object);
    }
    return this._connector.connect(locator);
  }

  // Disconnect
  public disconnect(): Promise<void> {
    return this._connector.disconnect();
  }
}
