/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftDeviceManager
// Device manager for Raft devices
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import { DeviceAttributeState, DevicesState, DeviceState, getDeviceKey } from "./RaftDeviceStates";
import { DeviceMsgJson } from "./RaftDeviceMsg";
import { RaftOKFail } from './RaftTypes';
import { DeviceTypeInfo, DeviceTypeAction, DeviceTypeInfoRecs, RaftDevTypeInfoResponse } from "./RaftDeviceInfo";
import struct, { DataType } from 'python-struct';
import AttributeHandler from "./RaftAttributeHandler";
import RaftSystemUtils from "./RaftSystemUtils";

export class DeviceManager {

    // Singleton
    // private static _instance: DeviceManager;

    // Max data points to store
    private _maxDatapointsToStore = 1000;

    // Min time between attempts to retrieve device type info
    private _minTimeBetweenDeviceTypeInfoRetrievalMs = 60000;

    // Attribute handler
    private _attributeHandler = new AttributeHandler();

    // Devices state
    private _devicesState = new DevicesState();

    // Last time each device was updated - used to detect devices that are no longer present
    private _deviceLastUpdateTime: { [deviceKey: string]: number } = {};

    // Flag indicating that removed devices should be removed from the state
    private _removeDevicesFlag = true;
    private _removeDevicesTimeMs = 60000;

    // System utils
    private _systemUtils: RaftSystemUtils | null = null;

    // Device callbacks
    private _callbackNewDevice: ((deviceKey: string, state: DeviceState) => void) | null = null;
    private _callbackNewDeviceAttribute: ((deviceKey: string, attrState: DeviceAttributeState) => void) | null = null;
    private _callbackNewAttributeData: ((deviceKey: string, attrState: DeviceAttributeState) => void) | null = null;

    public getDevicesState(): DevicesState {
        return this._devicesState;
    }

    public getDeviceState(deviceKey: string): DeviceState {
        return this._devicesState[deviceKey];
    }

    // Cached device type data
    private _cachedDeviceTypeRecs: DeviceTypeInfoRecs = {};

    // Cached device type previous attempt times
    private _cachedDeviceTypePreviousAttemptTimes: { [deviceType: string]: number } = {};

    // Constructor
    constructor() {
    }

    ////////////////////////////////////////////////////////////////////////////
    // Send REST commands
    ////////////////////////////////////////////////////////////////////////////

    async sendCommand(cmd: string): Promise<boolean> {
        try {
            // Get the msg handler
            const msgHandler = this._systemUtils?.getMsgHandler();
            if (msgHandler) {
                const msgRslt = await msgHandler.sendRICRESTURL<RaftOKFail>(cmd);
                return msgRslt.isOk();
            }
            return false;
        } catch (error) {
            console.warn(`DeviceManager sendCommand error ${error}`);
            return false;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Setup
    ////////////////////////////////////////////////////////////////////////////

    public async setup(systemUtils: RaftSystemUtils): Promise<boolean> {

        // Save the system utils
        this._systemUtils = systemUtils;
        return true;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Callbacks
    ////////////////////////////////////////////////////////////////////////////

    // Register state change callbacks
    public onNewDevice(callback: (deviceKey: string, state: DeviceState) => void): void {
        // Save the callback
        this._callbackNewDevice = callback;
    }
    public onNewDeviceAttribute(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        // Save the callback
        this._callbackNewDeviceAttribute = callback;
    }
    public onNewAttributeData(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        // Save the callback
        this._callbackNewAttributeData = callback;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Set the friendly name for the device
    ////////////////////////////////////////////////////////////////////////////

    public async setFriendlyName(friendlyName: string): Promise<void> {
        // Set using utils
        await this._systemUtils?.setRaftName(friendlyName);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Handle device message JSON
    ////////////////////////////////////////////////////////////////////////////

    public handleClientMsgJson(jsonMsg: string) {

        let data = JSON.parse(jsonMsg) as DeviceMsgJson;
        // console.log(`DeviceManager websocket message ${JSON.stringify(data)}`);

        // Iterate over the buses
        Object.entries(data).forEach(([busName, devices]) => {

            // Check for bus status info
            if (devices && typeof devices === "object" && "_s" in devices) {
                // console.log(`DeviceManager bus status ${JSON.stringify(devices._s)}`);
                return;
            }

            // Iterate over the devices
            Object.entries(devices).forEach(async ([devAddr, attrGroups]) => {

                // Check for non-device info (starts with _)
                if (devAddr.startsWith("_")) {
                    return;
                }

                // Device key
                const deviceKey = getDeviceKey(busName, devAddr);

                // Update the last update time
                this._deviceLastUpdateTime[deviceKey] = Date.now();

                // Check if a device state already exists
                if (!(deviceKey in this._devicesState) || (this._devicesState[deviceKey].deviceTypeInfo === undefined)) {

                    let deviceTypeName = "";
                    if (attrGroups && typeof attrGroups === 'object' && "_t" in attrGroups && typeof attrGroups._t === "string") {
                        deviceTypeName = attrGroups._t || "";
                    } else {
                        console.warn(`DeviceManager missing device type attrGroups ${JSON.stringify(attrGroups)}`);
                        return;
                    }

                    // Get the device type info
                    const deviceTypeInfo = await this.getDeviceTypeInfo(busName, devAddr, deviceTypeName);

                    // Check if device record exists
                    if (deviceKey in this._devicesState) {
                        if (deviceTypeInfo !== undefined) {
                            this._devicesState[deviceKey].deviceTypeInfo = deviceTypeInfo;
                        }
                    } else {
                        // Create device record - device type info may be undefined
                        this._devicesState[deviceKey] = {
                            deviceTypeInfo: deviceTypeInfo,
                            deviceTimeline: {
                                timestampsUs: [],
                                lastReportTimestampUs: 0,
                                reportTimestampOffsetUs: 0
                            },
                            deviceAttributes: {},
                            deviceIsNew: true,
                            stateChanged: false,
                            isOnline: true
                        };
                    }
                }

                // Get device state
                const deviceState = this._devicesState[deviceKey];

                // Check for online/offline state information
                if (attrGroups && typeof attrGroups === "object" && "_o" in attrGroups) {
                    deviceState.isOnline = ((attrGroups._o === true) || (attrGroups._o === "1") || (attrGroups._o === 1));
                }

                // Check if device type info is available
                if (!deviceState.deviceTypeInfo) {
                    return;
                }

                // Iterate attribute groups
                Object.entries(attrGroups).forEach(([attrGroupName, msgHexStr]) => {

                    // Check valid
                    if (attrGroupName.startsWith("_") || (typeof msgHexStr != 'string')) {
                        return;
                    }

                    // Check the device type info
                    if (!deviceState.deviceTypeInfo!.resp) {
                        return;
                    }

                    // Convert the hex string to an arraybuffer by converting each pair of hex chars to a byte
                    const msgBytes = this.hexToBytes(msgHexStr);

                    // Convert to a Buffer
                    const msgBuffer = Buffer.from(msgBytes);

                    // Work through the message which may contain multiple data instances
                    let msgBufIdx = 0;

                    // Iterate over attributes in the group
                    const pollRespMetadata = deviceState.deviceTypeInfo!.resp!;

                    // Loop
                    while (msgBufIdx < msgBytes.length) {

                        const curTimelineLen = deviceState.deviceTimeline.timestampsUs.length;
                        const newMsgBufIdx = this._attributeHandler.processMsgAttrGroup(msgBuffer, msgBufIdx,
                            deviceState.deviceTimeline, pollRespMetadata,
                            deviceState.deviceAttributes,
                            this._maxDatapointsToStore);
                        if (newMsgBufIdx < 0)
                            break;
                        msgBufIdx = newMsgBufIdx;
                        if (deviceState.deviceTimeline.timestampsUs.length !== curTimelineLen) {
                            deviceState.stateChanged = true;
                        }
                    }
                });
            });
        });

        // Check for devices that have not been updated for a while
        if (this._removeDevicesFlag) {
            const nowTime = Date.now();
            Object.entries(this._deviceLastUpdateTime).forEach(([deviceKey, lastUpdateTime]) => {
                if ((nowTime - lastUpdateTime) > this._removeDevicesTimeMs) {
                    delete this._devicesState[deviceKey];
                }
            });
        }
        
        // Process the callback
        this.processStateCallback();
    }

    ////////////////////////////////////////////////////////////////////////////
    // Process state change callback
    ////////////////////////////////////////////////////////////////////////////

    private processStateCallback() {

        // Iterate over the devices
        Object.entries(this._devicesState).forEach(([deviceKey, deviceState]) => {

            // Check if device record is new
            if (deviceState.deviceIsNew) {
                if (this._callbackNewDevice) {
                    this._callbackNewDevice(
                        deviceKey,
                        deviceState
                    );
                }
                deviceState.deviceIsNew = false;
            }

            // Iterate over the attributes
            Object.entries(deviceState.deviceAttributes).forEach(([_attrKey, attrState]) => {
                if (attrState.newAttribute) {
                    if (this._callbackNewDeviceAttribute) {
                        this._callbackNewDeviceAttribute(
                            deviceKey,
                            attrState
                        );
                    }
                    attrState.newAttribute = false;
                }
                if (attrState.newData) {
                    if (this._callbackNewAttributeData) {
                        this._callbackNewAttributeData(
                            deviceKey,
                            attrState
                        );
                    }
                    attrState.newData = false;
                }
            });
        });
    }

    ////////////////////////////////////////////////////////////////////////////
    // Get device type info
    ////////////////////////////////////////////////////////////////////////////

    private async getDeviceTypeInfo(busName: string, _devAddr: string, deviceType: string): Promise<DeviceTypeInfo | undefined> {

        // Check if already in the cache
        if (deviceType in this._cachedDeviceTypeRecs) {
            return this._cachedDeviceTypeRecs[deviceType];
        }

        // Check if we have tried to get device info previously (and failed presumably since it isn't in the cache)
        if (deviceType in this._cachedDeviceTypePreviousAttemptTimes) {
            // Check if we should retry
            if ((Date.now() - this._cachedDeviceTypePreviousAttemptTimes[deviceType]) < this._minTimeBetweenDeviceTypeInfoRetrievalMs) {
                return undefined;
            }
        }
        this._cachedDeviceTypePreviousAttemptTimes[deviceType] = Date.now();

        // Get the device type info from the server
        try {
            // Form the request
            const cmd = "devman/typeinfo?bus=" + busName + "&type=" + deviceType;

            // Get the msg handler
            const msgHandler = this._systemUtils?.getMsgHandler();
            if (msgHandler) {
                const msgRslt = await msgHandler.sendRICRESTURL<RaftDevTypeInfoResponse>(cmd);
                if (msgRslt.rslt === "ok") {
                    this._cachedDeviceTypeRecs[deviceType] = msgRslt.devinfo;
                    return msgRslt.devinfo
                }
            }
            return undefined;
        } catch (error) {
            console.error(`DeviceManager getDeviceTypeInfo error ${error}`);
            return undefined;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Send action to device
    ////////////////////////////////////////////////////////////////////////////

    public async sendAction(deviceKey: string, action: DeviceTypeAction, data: DataType[]): Promise<boolean> {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);

        // Form the write bytes
        let writeBytes = action.t ? struct.pack(action.t, data) : Buffer.from([]);

        // Convert to hex string
        let writeHexStr = Buffer.from(writeBytes).toString('hex');

        // Add prefix
        writeHexStr = action.w + writeHexStr;

        // Separate the bus and address in the deviceKey (_ char)
        const devBus = deviceKey.split("_")[0]
        const devAddr = deviceKey.split("_")[1]

        // Send the action to the server
        const cmd = "devman/cmdraw?bus=" + devBus + "&addr=" + devAddr + "&hexWr=" + writeHexStr;

        console.log(`DeviceManager deviceKey ${deviceKey} action name ${action.n} value ${data} prefix ${action.w} sendAction ${cmd}`);

        // Send the command
        try {

            // Get the msg handler
            const msgHandler = this._systemUtils?.getMsgHandler();
            if (msgHandler) {
                const msgRslt = await msgHandler.sendRICRESTURL<RaftOKFail>(cmd);
                return msgRslt.isOk();
            }
            return false;
        } catch (error) {
            console.warn(`DeviceManager sendAction error ${error}`);
            return false;
        }
    }

    ////////////////////////////////////////////////////////////////////////////
    // Send a compound action to the device
    ////////////////////////////////////////////////////////////////////////////

    public async sendCompoundAction(deviceKey: string, action: DeviceTypeAction, data: DataType[][]): Promise<boolean> {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);

        // Check if all data to be sent at once
        if (action.concat) {
            // Form a single list by flattening data
            let dataToWrite: DataType[] = [];
            for (let dataIdx = 0; dataIdx < data.length; dataIdx++) {
                dataToWrite = dataToWrite.concat(data[dataIdx]);
            }

            // Use sendAction to send this
            return await this.sendAction(deviceKey, action, dataToWrite);
        } else {
            // Iterate over the data
            let allOk = true;
            for (let dataIdx = 0; dataIdx < data.length; dataIdx++) {

                // Create the data to write by prepending the index to the data for this index
                let dataToWrite = [dataIdx as DataType].concat(data[dataIdx]);

                // Use sendAction to send this
                allOk = allOk && await this.sendAction(deviceKey, action, dataToWrite);
            }
        }
        return false;
    }

    ////////////////////////////////////////////////////////////////////////////
    // Convert hex to bytes
    ////////////////////////////////////////////////////////////////////////////

    private hexToBytes(hex: string): Uint8Array {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }

}
