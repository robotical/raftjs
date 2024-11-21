"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftDeviceManager
// Device manager for Raft devices
//
// Rob Dobson (C) 2024
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeviceManager = void 0;
const tslib_1 = require("tslib");
const RaftDeviceStates_1 = require("./RaftDeviceStates");
const RaftAttributeHandler_1 = tslib_1.__importDefault(require("./RaftAttributeHandler"));
const RaftStruct_1 = require("./RaftStruct");
class DeviceManager {
    getDevicesState() {
        return this._devicesState;
    }
    getDeviceState(deviceKey) {
        return this._devicesState[deviceKey];
    }
    // Constructor
    constructor() {
        // Singleton
        // private static _instance: DeviceManager;
        // Max data points to store
        this._maxDatapointsToStore = 10000;
        // Min time between attempts to retrieve device type info
        this._minTimeBetweenDeviceTypeInfoRetrievalMs = 60000;
        // Attribute handler
        this._attributeHandler = new RaftAttributeHandler_1.default();
        // Devices state
        this._devicesState = new RaftDeviceStates_1.DevicesState();
        // Last time each device was updated - used to detect devices that are no longer present
        this._deviceLastUpdateTime = {};
        // Flag indicating that removed devices should be removed from the state
        this._removeDevicesFlag = true;
        this._removeDevicesTimeMs = 60000;
        // System utils
        this._systemUtils = null;
        // Device callbacks
        this._callbackNewDevice = null;
        this._callbackNewDeviceAttribute = null;
        this._callbackNewAttributeData = null;
        // Cached device type data
        this._cachedDeviceTypeRecs = {};
        // Cached device type previous attempt times
        this._cachedDeviceTypePreviousAttemptTimes = {};
    }
    ////////////////////////////////////////////////////////////////////////////
    // Send REST commands
    ////////////////////////////////////////////////////////////////////////////
    async sendCommand(cmd) {
        var _a;
        try {
            // Get the msg handler
            const msgHandler = (_a = this._systemUtils) === null || _a === void 0 ? void 0 : _a.getMsgHandler();
            if (msgHandler) {
                const msgRslt = await msgHandler.sendRICRESTURL(cmd);
                return msgRslt.isOk();
            }
            return false;
        }
        catch (error) {
            console.warn(`DeviceManager sendCommand error ${error}`);
            return false;
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    // Setup
    ////////////////////////////////////////////////////////////////////////////
    async setup(systemUtils) {
        // Save the system utils
        this._systemUtils = systemUtils;
        return true;
    }
    ////////////////////////////////////////////////////////////////////////////
    // Callbacks
    ////////////////////////////////////////////////////////////////////////////
    // Register state change callbacks
    onNewDevice(callback) {
        // Save the callback
        this._callbackNewDevice = callback;
    }
    onNewDeviceAttribute(callback) {
        // Save the callback
        this._callbackNewDeviceAttribute = callback;
    }
    onNewAttributeData(callback) {
        // Save the callback
        this._callbackNewAttributeData = callback;
    }
    ////////////////////////////////////////////////////////////////////////////
    // Set the friendly name for the device
    ////////////////////////////////////////////////////////////////////////////
    async setFriendlyName(friendlyName) {
        var _a;
        // Set using utils
        await ((_a = this._systemUtils) === null || _a === void 0 ? void 0 : _a.setRaftName(friendlyName));
    }
    ////////////////////////////////////////////////////////////////////////////
    // Handle device message JSON
    ////////////////////////////////////////////////////////////////////////////
    handleClientMsgJson(jsonMsg) {
        let data = JSON.parse(jsonMsg);
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
                const deviceKey = (0, RaftDeviceStates_1.getDeviceKey)(busName, devAddr);
                // Update the last update time
                this._deviceLastUpdateTime[deviceKey] = Date.now();
                // Check if a device state already exists
                if (!(deviceKey in this._devicesState) || (this._devicesState[deviceKey].deviceTypeInfo === undefined)) {
                    let deviceTypeName = "";
                    if (attrGroups && typeof attrGroups === 'object' && "_t" in attrGroups && typeof attrGroups._t === "string") {
                        deviceTypeName = attrGroups._t || "";
                    }
                    else {
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
                    }
                    else {
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
                    if (!deviceState.deviceTypeInfo.resp) {
                        return;
                    }
                    // Convert the hex string to an arraybuffer by converting each pair of hex chars to a byte
                    const msgBytes = this.hexToBytes(msgHexStr);
                    // Work through the message which may contain multiple data instances
                    let msgBufIdx = 0;
                    // Iterate over attributes in the group
                    const pollRespMetadata = deviceState.deviceTypeInfo.resp;
                    // Loop
                    while (msgBufIdx < msgBytes.length) {
                        const curTimelineLen = deviceState.deviceTimeline.timestampsUs.length;
                        const newMsgBufIdx = this._attributeHandler.processMsgAttrGroup(msgBytes, msgBufIdx, deviceState.deviceTimeline, pollRespMetadata, deviceState.deviceAttributes, this._maxDatapointsToStore);
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
    processStateCallback() {
        // Iterate over the devices
        Object.entries(this._devicesState).forEach(([deviceKey, deviceState]) => {
            // Check if device record is new
            if (deviceState.deviceIsNew) {
                if (this._callbackNewDevice) {
                    this._callbackNewDevice(deviceKey, deviceState);
                }
                deviceState.deviceIsNew = false;
            }
            // Iterate over the attributes
            Object.entries(deviceState.deviceAttributes).forEach(([_attrKey, attrState]) => {
                if (attrState.newAttribute) {
                    if (this._callbackNewDeviceAttribute) {
                        this._callbackNewDeviceAttribute(deviceKey, attrState);
                    }
                    attrState.newAttribute = false;
                }
                if (attrState.newData) {
                    if (this._callbackNewAttributeData) {
                        this._callbackNewAttributeData(deviceKey, attrState);
                    }
                    attrState.newData = false;
                }
            });
        });
    }
    ////////////////////////////////////////////////////////////////////////////
    // Get device type info
    ////////////////////////////////////////////////////////////////////////////
    async getDeviceTypeInfo(busName, _devAddr, deviceType) {
        var _a;
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
            const msgHandler = (_a = this._systemUtils) === null || _a === void 0 ? void 0 : _a.getMsgHandler();
            if (msgHandler) {
                const msgRslt = await msgHandler.sendRICRESTURL(cmd);
                if (msgRslt.rslt === "ok") {
                    this._cachedDeviceTypeRecs[deviceType] = msgRslt.devinfo;
                    return msgRslt.devinfo;
                }
            }
            return undefined;
        }
        catch (error) {
            console.error(`DeviceManager getDeviceTypeInfo error ${error}`);
            return undefined;
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    // Send action to device
    ////////////////////////////////////////////////////////////////////////////
    toHex(data) {
        return Array.from(data)
            .map(byte => byte.toString(16).padStart(2, "0"))
            .join("");
    }
    async sendAction(deviceKey, action, data) {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);
        var _a;
        // Form the write bytes
        let writeBytes = action.t ? (0, RaftStruct_1.structPack)(action.t, data) : new Uint8Array(0);
        // Convert to hex string
        let writeHexStr = this.toHex(writeBytes);
        // Add prefix
        writeHexStr = action.w + writeHexStr;
        // Separate the bus and address in the deviceKey (_ char)
        const devBus = deviceKey.split("_")[0];
        const devAddr = deviceKey.split("_")[1];
        // Send the action to the server
        const cmd = "devman/cmdraw?bus=" + devBus + "&addr=" + devAddr + "&hexWr=" + writeHexStr;
        console.log(`DeviceManager deviceKey ${deviceKey} action name ${action.n} value ${data} prefix ${action.w} sendAction ${cmd}`);
        // Send the command
        try {
            // Get the msg handler
            const msgHandler = (_a = this._systemUtils) === null || _a === void 0 ? void 0 : _a.getMsgHandler();
            if (msgHandler) {
                const msgRslt = await msgHandler.sendRICRESTURL(cmd);
                return msgRslt.isOk();
            }
            return false;
        }
        catch (error) {
            console.warn(`DeviceManager sendAction error ${error}`);
            return false;
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    // Send a compound action to the device
    ////////////////////////////////////////////////////////////////////////////
    async sendCompoundAction(deviceKey, action, data) {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);
        // Check if all data to be sent at once
        if (action.concat) {
            // Form a single list by flattening data
            let dataToWrite = [];
            for (let dataIdx = 0; dataIdx < data.length; dataIdx++) {
                dataToWrite = dataToWrite.concat(data[dataIdx]);
            }
            // Use sendAction to send this
            return await this.sendAction(deviceKey, action, dataToWrite);
        }
        else {
            // Iterate over the data
            let allOk = true;
            for (let dataIdx = 0; dataIdx < data.length; dataIdx++) {
                // Create the data to write by prepending the index to the data for this index
                let dataToWrite = [dataIdx].concat(data[dataIdx]);
                // Use sendAction to send this
                allOk = allOk && await this.sendAction(deviceKey, action, dataToWrite);
            }
        }
        return false;
    }
    ////////////////////////////////////////////////////////////////////////////
    // Convert hex to bytes
    ////////////////////////////////////////////////////////////////////////////
    hexToBytes(hex) {
        const bytes = new Uint8Array(hex.length / 2);
        for (let i = 0; i < bytes.length; i++) {
            bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
        }
        return bytes;
    }
}
exports.DeviceManager = DeviceManager;
//# sourceMappingURL=RaftDeviceManager.js.map