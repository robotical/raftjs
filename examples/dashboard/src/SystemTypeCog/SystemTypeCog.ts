import { RaftSubscribeForUpdatesCBType, RaftSystemType } from "../../../../src/RaftSystemType";
import { RaftEventFn, RaftLog, RaftOKFail, RaftPublishEvent, RaftPublishEventNames, RaftSystemUtils } from "../../../../src/main";
import { CogStateInfo } from "./CogStateInfo";
import { DeviceManager } from "../../../../src/RaftDeviceManager";

export default class SystemTypeCog implements RaftSystemType {
    nameForDialogs = "Robotical Cog";
    defaultWiFiHostname = "Cog";
    firmwareDestName = "ricfw";
    normalFileDestName = "fs";
    connectorOptions = {wsSuffix: "wsjson", bleConnItvlMs: 50};

    // Event handler
    private _onEvent: RaftEventFn | null = null;

    // Raft system utils
    private _systemUtils: RaftSystemUtils | null = null;

    // Device manager
    private _deviceManager: DeviceManager = new DeviceManager();
    
    // Setup
    setup(systemUtils: RaftSystemUtils, onEvent: RaftEventFn | null): void {
      this._systemUtils = systemUtils;
      this._onEvent = onEvent;
      this._deviceManager.setup(systemUtils);
    }

    // Latest data from servos, IMU, etc
    private _stateInfo: CogStateInfo = new CogStateInfo(this._deviceManager);
    getStateInfo(): CogStateInfo {
      return this._stateInfo;
    }

    // Subscribe for updates
    subscribeForUpdates: RaftSubscribeForUpdatesCBType | null = async (systemUtils: RaftSystemUtils, enable: boolean) => {
      // Subscription rate
      const subscribeRateHz = 0.1;
      try {
        const subscribeDisable = '{"cmdName":"subscription","action":"update",' +
          '"pubRecs":[' +
          `{"name":"devjson","rateHz":0,}` +
          ']}';
        const subscribeEnable = '{"cmdName":"subscription","action":"update",' +
          '"pubRecs":[' +
          `{"name":"devjson","trigger":"timeorchange","rateHz":${subscribeRateHz.toString()}}` +
          ']}';

        const msgHandler = systemUtils.getMsgHandler();
        const ricResp = await msgHandler.sendRICRESTCmdFrame<RaftOKFail>(
          enable ? subscribeEnable : subscribeDisable
        );

        // Debug
        RaftLog.debug(`subscribe enable/disable returned ${JSON.stringify(ricResp)}`);
      } catch (error: unknown) {
        RaftLog.warn(`getRICCalibInfo Failed subscribe for updates ${error}`);
      }
    };

    // Invalidate state
    stateIsInvalid(): void {};

    // Other message type
    rxOtherMsgType(payload: Uint8Array, frameTimeMs: number) {

      // RICLog.debug(`rxOtherMsgType payload ${RICUtils.bufferToHex(payload)}`);
      RaftLog.verbose(`rxOtherMsgType payloadLen ${payload.length}`);
      const topicIDs = this._stateInfo.updateFromMsg(payload, frameTimeMs);

      // Call event handler if registered
      if (this._onEvent) {
        this._onEvent("pub", RaftPublishEvent.PUBLISH_EVENT_DATA, RaftPublishEventNames[RaftPublishEvent.PUBLISH_EVENT_DATA],
          {
            topicIDs: topicIDs,
            payload: payload,
            frameTimeMs: frameTimeMs
          });
      }
    };

    // Get device manager
    deviceMgrIF = this._deviceManager;
  }
