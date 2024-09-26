import { RaftChannelBLE, RaftConnector, RaftEventFn, RaftLog, RaftSystemUtils } from "../../../src/main";
import SystemTypeCog from "./SystemTypeCog/SystemTypeCog";
import SystemTypeMarty from "./SystemTypeMarty/SystemTypeMarty";

export default class ConnManager {

  // Singleton
  private static _instance: ConnManager;

  // Connector
  private _connector = new RaftConnector(async (systemUtils: RaftSystemUtils) => {
    const systemInfo = await systemUtils.getSystemInfo();
    if (systemInfo.SystemName === "RIC") {
      RaftLog.info("ConnManager - Marty detected");
      return new SystemTypeMarty();
    } else if (systemInfo.SystemName === "Cog") {
      RaftLog.info("ConnManager - Cog detected");
      return new SystemTypeCog();
    }
    RaftLog.error(`ConnManager - unknown system ${systemInfo.SystemName} ${JSON.stringify(systemInfo)}`);
    return null;
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

  private async getBleDevice(): Promise<BluetoothDevice | null> {
    try {
      const dev = await navigator.bluetooth.requestDevice({
        filters: [
          { services: [RaftChannelBLE.ServiceUUID] }
        ],
        optionalServices: []
      });
      return dev;
    } catch (e) {
      RaftLog.error(`getBleDevice - failed to get device ${e}`);
      return null;
    }
  }

  // Connect
  public async connect(method: string, locator: string | object): Promise<boolean> {

    // Hook up the connector
    this._connector.setEventListener((evtType, eventEnum, eventName, eventData) => {
      RaftLog.info(`ConnManager - event ${eventName}`);
      if (this._onConnectionEvent) {
        this._onConnectionEvent(evtType, eventEnum, eventName, eventData);
      }
    });
    // Set the connector websocket suffix
    if (method === "WebBLE") {
      const dev = await this.getBleDevice();
      return this._connector.connect(method, dev as object);
    }
    return this._connector.connect(method, locator);
  }

  // Disconnect
  public disconnect(): Promise<void> {
    return this._connector.disconnect();
  }
}
