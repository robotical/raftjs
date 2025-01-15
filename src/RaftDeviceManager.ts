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
import AttributeHandler from "./RaftAttributeHandler";
import RaftSystemUtils from "./RaftSystemUtils";
import RaftDeviceMgrIF from "./RaftDeviceMgrIF";
import { structPack } from "./RaftStruct";

export class DeviceManager implements RaftDeviceMgrIF{

    // Singleton
    // private static _instance: DeviceManager;

    // Max data points to store
    private _maxDatapointsToStore = 1000;

    // Min time between attempts to retrieve device type info
    private _minTimeBetweenDeviceTypeInfoRetrievalMs = 60000;

    // Attribute handler
    private _attributeHandler = new AttributeHandler();

    // Devices state
    public _devicesState = new DevicesState();

    // Last time each device was updated - used to detect devices that are no longer present
    private _deviceLastUpdateTime: { [deviceKey: string]: number } = {};

    // Flag indicating that removed devices should be removed from the state
    private _removeDevicesFlag = true;
    private _removeDevicesTimeMs = 60000;

    // System utils
    private _systemUtils: RaftSystemUtils | null = null;

    // Device callbacks
    private _newDeviceCallbacks: Array<(deviceKey: string, state: DeviceState) => void> = [];
    private _newDeviceAttributeCallbacks: Array<(deviceKey: string, attrState: DeviceAttributeState) => void> = [];
    private _newAttributeDataCallbacks: Array<(deviceKey: string, attrState: DeviceAttributeState) => void> = [];

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
    // Settings
    ////////////////////////////////////////////////////////////////////////////

    public setMaxDataPointsToStore(maxDatapointsToStore: number): void {
        this._maxDatapointsToStore = maxDatapointsToStore;
        // console.log(`DeviceManager setMaxDataPointsToStore ${maxDatapointsToStore}`);
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
                return msgRslt.rslt === "ok";
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
    // Register callbacks
    ////////////////////////////////////////////////////////////////////////////

    public addNewDeviceCallback(callback: (deviceKey: string, state: DeviceState) => void): void {
        if (!this._newDeviceCallbacks.includes(callback)) {
            this._newDeviceCallbacks.push(callback);
        }
    }

    public removeNewDeviceCallback(callback: (deviceKey: string, state: DeviceState) => void): void {
        this._newDeviceCallbacks = this._newDeviceCallbacks.filter((cb) => cb !== callback);
    }

    public addNewAttributeCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        if (!this._newDeviceAttributeCallbacks.includes(callback)) {
            this._newDeviceAttributeCallbacks.push(callback);
        }
    }

    public removeNewAttributeCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        this._newDeviceAttributeCallbacks = this._newDeviceAttributeCallbacks.filter((cb) => cb !== callback);
    }

    public addAttributeDataCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        if (!this._newAttributeDataCallbacks.includes(callback)) {
            this._newAttributeDataCallbacks.push(callback);
        }
    }

    public removeAttributeDataCallback(callback: (deviceKey: string, attrState: DeviceAttributeState) => void): void {
        this._newAttributeDataCallbacks = this._newAttributeDataCallbacks.filter((cb) => cb !== callback);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Set the friendly name for the device
    ////////////////////////////////////////////////////////////////////////////

    public async setFriendlyName(friendlyName: string): Promise<void> {
        // Set using utils
        await this._systemUtils?.setRaftName(friendlyName);
    }

    ////////////////////////////////////////////////////////////////////////////
    // Handle device message binary
    ////////////////////////////////////////////////////////////////////////////

    public async handleClientMsgBinary(rxMsg: Uint8Array) {
        // console.log(`DeviceManager client1 msg ${RaftUtils.bufferToHex(rxMsg)}`);

        // Example messages
        // 0080 0015 81 0000006a 0004 53b7 feff00000100081857079314 0011 80 00000000 0011 53b2 075106e400d60054 0010 80 00000000 0012 5231 000d0000010e01
        // 0080 0011 80 00000000                                                     0011 53f1 075806e900d70052 0010 80 00000000 0012 5231 000d0000010e01

        // First two bytes of each message are the message type (0080)
        // There are then a series of sections each of which is the data for a device
        //   First two bytes of each section is the section length (big endian) not including the length bytes
        //   Next byte is the connection mode (0 for direct connect, 1+ for bus number) and the MSB of this byte is 1 if the device is online
        //   Next is the device address (4 bytes big endian)
        //   Next is the device type index (2 bytes big endian)
        //   Finally the device data which can be one or more groups of attributes defined by the schema

        // Iterate through sections
        let msgPos = 2;
        while (msgPos < rxMsg.length) {

            // Check length
            if (rxMsg.length < msgPos + 11) {
                console.warn(`DeviceManager handleClientMsgBinary invalid length ${rxMsg.length}`);
                return;
            }

            // Get the length of the section
            const sectionLen = (rxMsg[msgPos] << 8) + rxMsg[msgPos + 1];
            if (sectionLen > rxMsg.length) {
                console.warn(`DeviceManager handleClientMsgBinary invalid msgPos ${msgPos} msgLen ${sectionLen} rxMsgLen ${rxMsg.length}`);
                return;
            }

            // Extract message elements
            const busNum = rxMsg[msgPos + 2] & 0x7f;
            const isOnline = (rxMsg[msgPos + 2] & 0x80) !== 0;
            const devAddr = (rxMsg[msgPos + 3] << 24) + (rxMsg[msgPos + 4] << 16) + (rxMsg[msgPos + 5] << 8) + rxMsg[msgPos + 6];
            const devTypeIdx = (rxMsg[msgPos + 7] << 8) + rxMsg[msgPos + 8];
            let attrGroupPos = msgPos + 9;

            // Debug
            // console.log(`DeviceManager overallLen ${rxMsg.length} sectionPos ${msgPos} sectionLen ${sectionLen} ${RaftUtils.bufferToHex(rxMsg.slice(msgPos, msgPos + sectionLen))}`);
            // console.log(`DeviceManager connMode ${busNum} isOnline ${isOnline} devAddr ${devAddr} devTypeIdx ${devTypeIdx} attrGroupDataLen ${sectionLen - 9}`);

            // Device key
            const deviceKey = getDeviceKey(busNum.toString(), devAddr.toString(), devTypeIdx.toString());

            // Update the last update time
            this._deviceLastUpdateTime[deviceKey] = Date.now();

            // Check if a device state already exists
            if (!(deviceKey in this._devicesState) || (this._devicesState[deviceKey].deviceTypeInfo === undefined)) {
                // Get the device type info
                const deviceTypeInfo = await this.getDeviceTypeInfo(busNum.toString(), devAddr.toString(), devTypeIdx.toString());
                // console.log(`DeviceManager deviceTypeInfo ${JSON.stringify(deviceTypeInfo)}`);

                // Check if device record exists
                if (deviceKey in this._devicesState) {
                    if (deviceTypeInfo !== undefined) {
                        this._devicesState[deviceKey].deviceTypeInfo = deviceTypeInfo;
                        this._devicesState[deviceKey].deviceType = deviceTypeInfo.name || "";
                        this._devicesState[deviceKey].busName = busNum.toString();
                        this._devicesState[deviceKey].deviceAddress = devAddr.toString();
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
                        isOnline: true,
                        deviceAddress: devAddr.toString(),
                        deviceType: deviceTypeInfo?.name || "",
                        busName: busNum.toString()
                    };
                }
            }

            // Get device state
            const deviceState = this._devicesState[deviceKey];
            deviceState.isOnline = isOnline;
            
            // Check if device type info is available
            if (deviceState.deviceTypeInfo && deviceState.deviceTypeInfo.resp) {

                // Iterate over attributes in the group
                const pollRespMetadata = deviceState.deviceTypeInfo!.resp!;

                // Iterate over attribute groups
                while (attrGroupPos < msgPos + sectionLen + 2) {
                    const curTimelineLen = deviceState.deviceTimeline.timestampsUs.length;
                    const newMsgBufIdx = this._attributeHandler.processMsgAttrGroup(rxMsg, attrGroupPos,
                        deviceState.deviceTimeline, pollRespMetadata,
                        deviceState.deviceAttributes,
                        this._maxDatapointsToStore);
                    if (newMsgBufIdx < 0)
                        break;
                    attrGroupPos = newMsgBufIdx;
                    if (deviceState.deviceTimeline.timestampsUs.length !== curTimelineLen) {
                        deviceState.stateChanged = true;
                    }
                }
            }

            // Move to next message
            msgPos += sectionLen + 2;
        }

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
    // Handle device message JSON
    ////////////////////////////////////////////////////////////////////////////

    public async handleClientMsgJson(jsonMsg: string) {

        const data = JSON.parse(jsonMsg) as DeviceMsgJson;
        // console.log(`DeviceManager client msg ${JSON.stringify(data)}`);

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

                // Device type name
                let deviceTypeName = "";
                if (attrGroups && typeof attrGroups === 'object' && "_t" in attrGroups && typeof attrGroups._t === "string") {
                    deviceTypeName = attrGroups._t || "";
                } else {
                    console.warn(`DeviceManager missing device type attrGroups ${JSON.stringify(attrGroups)}`);
                    return;
                }

                // Device key
                const deviceKey = getDeviceKey(busName, devAddr, deviceTypeName);

                // Update the last update time
                this._deviceLastUpdateTime[deviceKey] = Date.now();

                // Check if a device state already exists
                if (!(deviceKey in this._devicesState) || (this._devicesState[deviceKey].deviceTypeInfo === undefined)) {

                    // Get the device type info
                    const deviceTypeInfo = await this.getDeviceTypeInfo(busName, devAddr, deviceTypeName);

                    // Check if device record exists
                    if (deviceKey in this._devicesState) {
                        if (deviceTypeInfo !== undefined) {
                            this._devicesState[deviceKey].deviceTypeInfo = deviceTypeInfo;
                            this._devicesState[deviceKey].deviceType = deviceTypeName;
                            this._devicesState[deviceKey].deviceAddress = devAddr;
                            this._devicesState[deviceKey].busName = busName;
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
                            isOnline: true,
                            deviceAddress: devAddr,
                            deviceType: deviceTypeName,
                            busName: busName
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

                    // Work through the message which may contain multiple data instances
                    let msgBufIdx = 0;

                    // Iterate over attributes in the group
                    const pollRespMetadata = deviceState.deviceTypeInfo!.resp!;

                    // Loop
                    while (msgBufIdx < msgBytes.length) {

                        const curTimelineLen = deviceState.deviceTimeline.timestampsUs.length;
                        const newMsgBufIdx = this._attributeHandler.processMsgAttrGroup(msgBytes, msgBufIdx,
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
                this._newDeviceCallbacks.forEach((cb) => cb(deviceKey, deviceState));
                deviceState.deviceIsNew = false;
            }

            // Iterate over the attributes
            Object.entries(deviceState.deviceAttributes).forEach(([, attrState]): void => {
                if (attrState.newAttribute) {
                    this._newDeviceAttributeCallbacks.forEach((cb) => cb(deviceKey, attrState));
                    attrState.newAttribute = false;
                }
                if (attrState.newData) {
                    this._newAttributeDataCallbacks.forEach((cb) => cb(deviceKey, attrState));
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

    private toHex(data: Uint8Array): string {
        return Array.from(data)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }

    public async sendAction(deviceKey: string, action: DeviceTypeAction, data: number[]): Promise<boolean> {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);

        let writeBytes: Uint8Array;

        // Check for one data item
        if (data.length === 1) {

            let value = data[0];

            // Check for conversion
            if (action.sub !== undefined) {
                value = value - action.sub;
            }
            if (action.mul !== undefined) {
                value = value * action.mul;
            }

            // Form the write bytes
            writeBytes = action.t ? structPack(action.t, [value]) : new Uint8Array(0);

        } else
        {

            // Form the write bytes which may have multiple data items
            writeBytes = action.t ? structPack(action.t, data) : new Uint8Array(0);
        }

        // Convert to hex string
        let writeHexStr = this.toHex(writeBytes);

        // Add prefix and postfix
        writeHexStr = (action.w ? action.w : "") + writeHexStr + (action.wz ? action.wz : "");

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
                return msgRslt.rslt === "ok";
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

    public async sendCompoundAction(deviceKey: string, action: DeviceTypeAction, data: number[][]): Promise<boolean> {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);

        // Check if all data to be sent at once
        if (action.concat) {
            // Form a single list by flattening data
            let dataToWrite: number[] = [];
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
                const dataToWrite = [dataIdx as number].concat(data[dataIdx]);

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
