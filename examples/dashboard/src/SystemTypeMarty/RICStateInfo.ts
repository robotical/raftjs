import RaftDeviceMgrIF from "../../../../src/RaftDeviceMgrIF";
import { DeviceAttributeState, DevicesState, DeviceState } from "../../../../src/RaftDeviceStates";
import { RICSERIAL_PAYLOAD_POS } from "../../../../src/RaftProtocolDefs";
import RICAddOnManager from "./RICAddOnManager";
import RICCommsStats from "./RICCommsStats";
import { RICROSSerial, ROSCameraData, ROSSerialAddOnStatusList, ROSSerialIMU, ROSSerialPowerStatus, ROSSerialRobotStatus, ROSSerialSmartServos } from "./RICROSSerial";

export class RICStateInfo implements RaftDeviceMgrIF {
    smartServos: ROSSerialSmartServos = new ROSSerialSmartServos();
    smartServosValidMs = 0;
    imuData: ROSSerialIMU = new ROSSerialIMU();
    imuDataValidMs = 0;
    power: ROSSerialPowerStatus = new ROSSerialPowerStatus();
    powerValidMs = 0;
    addOnInfo: ROSSerialAddOnStatusList = new ROSSerialAddOnStatusList();
    addOnInfoValidMs = 0;
    robotStatus: ROSSerialRobotStatus = new ROSSerialRobotStatus();
    robotStatusValidMs = 0;
    cameraData: ROSCameraData = new ROSCameraData();
    cameraDataValidMs = 0;

    updateFromROSSerialMsg(rxMsg: Uint8Array, commsStats: RICCommsStats, 
              addOnManager: RICAddOnManager, frameTimeMs: number): Array<number> {
        return RICROSSerial.decode(
            rxMsg,
            RICSERIAL_PAYLOAD_POS,
            commsStats,
            addOnManager,
            this,
            frameTimeMs
          );    
    }

    getDevicesState(): DevicesState {

        // TODO - implement if RICStateInfo is to be used as a DeviceMgr
        return {};
    }

    getDeviceState(deviceKey: string): DeviceState {

        // TODO - implement if RICStateInfo is to be used as a DeviceMgr
        return {
            deviceTypeInfo: undefined,
            deviceTimeline: {
                timestampsUs: [],
                lastReportTimestampUs: 0,
                reportTimestampOffsetUs: 0
            },
            deviceAttributes: {},
            deviceIsNew: false,
            stateChanged: false,
            isOnline: false
        };
    }

    onNewDevice(callback: (deviceKey: string, state: DeviceState) => void): void {
        // TODO - implement if RICStateInfo is to be used as a DeviceMgr
    }

    onNewDeviceAttribute(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        // TODO - implement if RICStateInfo is to be used as a DeviceMgr
    }

    onNewAttributeData(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        // TODO - implement if RICStateInfo is to be used as a DeviceMgr
    }

    sendAction(deviceKey: string, action: any, data: any): void {
        // TODO - implement if RICStateInfo is to be used as a DeviceMgr
    }

    sendCompoundAction(deviceKey: string, action: any, data: any): void {
        // TODO - implement if RICStateInfo is to be used as a DeviceMgr
    }

  }
  