/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftDeviceMgrIF.ts
// Interface to devices state
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { DeviceTypeAction } from "./RaftDeviceInfo";
import { DeviceAttributeState, DevicesState, DeviceState } from "./RaftDeviceStates";

export default interface RaftDeviceMgrIF {

    // Get state of devices
    getDevicesState(): DevicesState;
    getDeviceState(deviceKey: string): DeviceState;

    // Settings
    setMaxDataPointsToStore(maxDataPointsToStore: number): void;

    // Callbacks
    addNewDeviceCallback(callback: (deviceKey: string, state: DeviceState) => void): void;
    removeNewDeviceCallback(callback: (deviceKey: string, state: DeviceState) => void): void;
    addNewAttributeCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;
    removeNewAttributeCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;
    addAttributeDataCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;
    removeAttributeDataCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void;

    // Send action to device
    sendAction(deviceKey: string, action: DeviceTypeAction, data: number[]): void;
    sendCompoundAction(deviceKey: string, action: DeviceTypeAction, data: number[][]): void;
}
