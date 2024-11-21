import { DeviceTypeAction } from "./RaftDeviceInfo";
import { DeviceAttributeState, DevicesState, DeviceState } from "./RaftDeviceStates";
export default interface RaftDeviceMgrIF {
    getDevicesState(): DevicesState;
    getDeviceState(deviceKey: string): DeviceState;
    onNewDevice(callback: (deviceKey: string, state: DeviceState) => void): void;
    onNewDeviceAttribute(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;
    onNewAttributeData(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;
    sendAction(deviceKey: string, action: DeviceTypeAction, data: number[]): void;
    sendCompoundAction(deviceKey: string, action: DeviceTypeAction, data: number[][]): void;
}
