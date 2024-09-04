/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftDeviceMgrIF.ts
// Interface to devices state
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { DataType } from "python-struct";
import { DeviceTypeAction } from "./RaftDeviceInfo";
import { DeviceAttributeState, DevicesState, DeviceState } from "./RaftDeviceStates";

export default interface RaftDeviceMgrIF {

    // Get state of devices
    getDevicesState(): DevicesState;
    getDeviceState(deviceKey: string): DeviceState;

    // Callbacks
    onNewDevice(callback: (deviceKey: string, state: DeviceState) => void): void;
    onNewDeviceAttribute(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;
    onNewAttributeData(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;

    // Send action to device
    sendAction(deviceKey: string, action: DeviceTypeAction, data: DataType[]): void;
    sendCompoundAction(deviceKey: string, action: DeviceTypeAction, data: DataType[][]): void;
}
