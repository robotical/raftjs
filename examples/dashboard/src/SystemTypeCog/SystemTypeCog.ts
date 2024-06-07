import { RaftSubscribeForUpdatesCBType, RaftSystemType } from "../../../../src/RaftSystemType";
import { RaftEventFn, RaftSystemUtils } from "../../../../src/main";

export default class SystemTypeCog implements RaftSystemType {
    nameForDialogs = "Robotical Cog";
    defaultWiFiHostname = "Cog";
    firmwareDestName = "ricfw";
    normalFileDestName = "fs";

    // Raft system utils
    private _systemUtils: RaftSystemUtils | null = null;
    setup(systemUtils: RaftSystemUtils, onEvent: RaftEventFn | null): void {
      this._systemUtils = systemUtils;
    };
    
    // Subscribe for updates
    subscribeForUpdates: RaftSubscribeForUpdatesCBType | null = async (systemUtils: RaftSystemUtils, enable: boolean) => {
      return;
    };

    // Invalidate state
    stateIsInvalid(): void {};

    // Other message type
    rxOtherMsgType(payload: Uint8Array, _frameTimeMs: number) {};
  }
