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
const python_struct_1 = tslib_1.__importDefault(require("python-struct"));
const TestDataGen_1 = tslib_1.__importDefault(require("./TestDataGen"));
const RaftAttributeHandler_1 = tslib_1.__importDefault(require("./RaftAttributeHandler"));
let testingDeviceTypeRecsConditionalLoadPromise = null;
if (process.env.TEST_DATA) {
    testingDeviceTypeRecsConditionalLoadPromise = Promise.resolve().then(() => tslib_1.__importStar(require('../testdata/TestDeviceTypeRecs.json')));
}
class DeviceManager {
    // Get instance
    static getInstance() {
        if (!DeviceManager._instance) {
            DeviceManager._instance = new DeviceManager();
        }
        return DeviceManager._instance;
    }
    getDevicesState() {
        return this._devicesState;
    }
    getDeviceState(deviceKey) {
        return this._devicesState[deviceKey];
    }
    // Constructor
    constructor() {
        // Max data points to store
        this._maxDatapointsToStore = 1000;
        // Attribute handler
        this._attributeHandler = new RaftAttributeHandler_1.default();
        // Server address
        this._serverAddressPrefix = "";
        // URL prefix
        this._urlPrefix = "/api";
        // Devices state
        this._devicesState = new RaftDeviceStates_1.DevicesState();
        // Device callbacks
        this._callbackNewDevice = null;
        this._callbackNewDeviceAttribute = null;
        this._callbackNewAttributeData = null;
        // Last time we got a state update
        this._lastStateUpdate = 0;
        this.MAX_TIME_BETWEEN_STATE_UPDATES_MS = 60000;
        // Websocket
        this._websocket = null;
        // Cached device type data
        this._cachedDeviceTypeRecs = {};
        // Test device type data
        this._testDeviceTypeRecs = null;
        this._testDataGen = new TestDataGen_1.default();
        // Check if test mode
        // if (window.location.hostname === "localhost") {
        if (process.env.TEST_DATA) {
            this._testDataGen.start((msg) => {
                this.handleClientMsgJson(msg);
            });
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    // Send REST commands
    ////////////////////////////////////////////////////////////////////////////
    async sendCommand(cmd) {
        try {
            const sendCommandResponse = await fetch(this._serverAddressPrefix + this._urlPrefix + cmd);
            if (!sendCommandResponse.ok) {
                console.warn(`DeviceManager sendCommand response not ok ${sendCommandResponse.status}`);
            }
            return sendCommandResponse.ok;
        }
        catch (error) {
            console.warn(`DeviceManager sendCommand error ${error}`);
            return false;
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    // Init
    ////////////////////////////////////////////////////////////////////////////
    async init() {
        // Check if already initialized
        if (this._websocket) {
            console.warn(`DeviceManager init already initialized`);
            return true;
        }
        // console.log(`DeviceManager init - first time`)
        // Conditionally load the device type records
        if (testingDeviceTypeRecsConditionalLoadPromise) {
            testingDeviceTypeRecsConditionalLoadPromise.then((jsonData) => {
                this._testDeviceTypeRecs = jsonData;
            });
        }
        // Websocket if not in test mode
        if (!process.env.TEST_DATA) {
            // Open websocket
            const rslt = await this.connectWebSocket();
            // Start timer to check for websocket reconnection
            setInterval(async () => {
                var _a;
                if (!this._websocket) {
                    console.log(`DeviceManager init - reconnecting websocket`);
                    await this.connectWebSocket();
                }
                else if ((Date.now() - this._lastStateUpdate) > this.MAX_TIME_BETWEEN_STATE_UPDATES_MS) {
                    const inactiveTimeSecs = ((Date.now() - this._lastStateUpdate) / 1000).toFixed(1);
                    if (this._websocket) {
                        console.log(`DeviceManager init - closing websocket due to ${inactiveTimeSecs}s inactivity`);
                        this._websocket.close();
                        this._websocket = null;
                    }
                }
                console.log(`websocket state ${(_a = this._websocket) === null || _a === void 0 ? void 0 : _a.readyState}`);
            }, 5000);
            return rslt;
        }
        // Test mode
        return true;
    }
    ////////////////////////////////////////////////////////////////////////////
    // Open websocket
    ////////////////////////////////////////////////////////////////////////////
    async connectWebSocket() {
        // Open a websocket to the server
        try {
            console.log(`DeviceManager init location.origin ${window.location.origin} ${window.location.protocol} ${window.location.host} ${window.location.hostname} ${window.location.port} ${window.location.pathname} ${window.location.search} ${window.location.hash}`);
            let webSocketURL = this._serverAddressPrefix;
            if (webSocketURL.startsWith("http")) {
                webSocketURL = webSocketURL.replace(/^http/, 'ws');
            }
            else {
                webSocketURL = window.location.origin.replace(/^http/, 'ws');
            }
            webSocketURL += "/devjson";
            console.log(`DeviceManager init opening websocket ${webSocketURL}`);
            this._websocket = new WebSocket(webSocketURL);
            if (!this._websocket) {
                console.error("DeviceManager init unable to create websocket");
                return false;
            }
            this._websocket.binaryType = "arraybuffer";
            this._lastStateUpdate = Date.now();
            this._websocket.onopen = () => {
                // Debug
                console.log(`DeviceManager init websocket opened to ${webSocketURL}`);
                // Send subscription request messages after a short delay
                setTimeout(() => {
                    // Subscribe to device messages
                    const subscribeName = "devices";
                    console.log(`DeviceManager init subscribing to ${subscribeName}`);
                    if (this._websocket) {
                        this._websocket.send(JSON.stringify({
                            cmdName: "subscription",
                            action: "update",
                            pubRecs: [
                                { name: subscribeName, msgID: subscribeName, rateHz: 0.1 },
                            ]
                        }));
                    }
                }, 1000);
            };
            this._websocket.onmessage = (event) => {
                this.handleClientMsgJson(event.data);
            };
            this._websocket.onclose = () => {
                console.log(`DeviceManager websocket closed`);
                this._websocket = null;
            };
            this._websocket.onerror = (error) => {
                console.warn(`DeviceManager websocket error ${error}`);
            };
        }
        catch (error) {
            console.warn(`DeviceManager websocket error ${error}`);
            return false;
        }
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
        try {
            await fetch(this._serverAddressPrefix + this._urlPrefix + "/friendlyname/" + friendlyName);
        }
        catch (error) {
            console.log(`DeviceManager setFriendlyName ${error}`);
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    // Handle device message JSON
    ////////////////////////////////////////////////////////////////////////////
    handleClientMsgJson(jsonMsg) {
        const removeDevicesNoLongerPresent = true;
        let data = JSON.parse(jsonMsg);
        // console.log(`DeviceManager websocket message ${JSON.stringify(data)}`);
        // Iterate over the buses
        Object.entries(data).forEach(([busName, devices]) => {
            // Check for bus status info
            if (devices && typeof devices === "object" && "_s" in devices) {
                // console.log(`DeviceManager bus status ${JSON.stringify(devices._s)}`);
                return;
            }
            // Get a list of keys for the current devicesState
            const deviceKeysToRemove = Object.keys(this._devicesState);
            // Iterate over the devices
            Object.entries(devices).forEach(async ([devAddr, attrGroups]) => {
                // Check for non-device info (starts with _)
                if (devAddr.startsWith("_")) {
                    return;
                }
                // Device key
                const deviceKey = (0, RaftDeviceStates_1.getDeviceKey)(busName, devAddr);
                // Remove from the list of keys for the current devicesState
                const idx = deviceKeysToRemove.indexOf(deviceKey);
                if (idx >= 0) {
                    deviceKeysToRemove.splice(idx, 1);
                }
                // Check if a device state already exists
                if (!(deviceKey in this._devicesState)) {
                    let deviceTypeName = "";
                    if (attrGroups && typeof attrGroups === 'object' && "_t" in attrGroups && typeof attrGroups._t === "string") {
                        deviceTypeName = attrGroups._t || "";
                    }
                    else {
                        console.warn(`DeviceManager missing device type attrGroups ${JSON.stringify(attrGroups)}`);
                        return;
                    }
                    // Create device record
                    this._devicesState[deviceKey] = {
                        deviceTypeInfo: await this.getDeviceTypeInfo(busName, devAddr, deviceTypeName),
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
                // Get device state
                const deviceState = this._devicesState[deviceKey];
                // Check for online/offline state information
                if (attrGroups && typeof attrGroups === "object" && "_o" in attrGroups) {
                    deviceState.isOnline = ((attrGroups._o === true) || (attrGroups._o === "1") || (attrGroups._o === 1));
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
                    // Convert to a Buffer
                    const msgBuffer = Buffer.from(msgBytes);
                    // Work through the message which may contain multiple data instances
                    let msgBufIdx = 0;
                    // Iterate over attributes in the group
                    const pollRespMetadata = deviceState.deviceTypeInfo.resp;
                    // Loop
                    while (msgBufIdx < msgBytes.length) {
                        const curTimelineLen = deviceState.deviceTimeline.timestampsUs.length;
                        const newMsgBufIdx = this._attributeHandler.processMsgAttrGroup(msgBuffer, msgBufIdx, deviceState.deviceTimeline, pollRespMetadata, deviceState.deviceAttributes, this._maxDatapointsToStore);
                        if (newMsgBufIdx < 0)
                            break;
                        msgBufIdx = newMsgBufIdx;
                        if (deviceState.deviceTimeline.timestampsUs.length !== curTimelineLen) {
                            deviceState.stateChanged = true;
                        }
                    }
                });
            });
            // Remove devices no longer present
            if (removeDevicesNoLongerPresent) {
                deviceKeysToRemove.forEach((deviceKey) => {
                    delete this._devicesState[deviceKey];
                });
            }
        });
        // Update the last state update time
        this._lastStateUpdate = Date.now();
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
        const emptyRec = {
            "name": "Unknown",
            "desc": "Unknown",
            "manu": "Unknown",
            "type": "Unknown"
        };
        // Ensure that this._testDeviceTypeRecs and devTypes[deviceType] are properly initialized
        if (process.env.TEST_DATA) {
            if (this._testDeviceTypeRecs && this._testDeviceTypeRecs.devTypes[deviceType]) {
                return this._testDeviceTypeRecs.devTypes[deviceType].devInfoJson;
            }
            else {
                // Handle the case where the necessary data isn't available
                console.error("Device type info not available for:", deviceType);
                return emptyRec;
            }
        }
        // Check if already in the cache
        if (deviceType in this._cachedDeviceTypeRecs) {
            return this._cachedDeviceTypeRecs[deviceType];
        }
        // Get the device type info from the server
        try {
            const getDevTypeInfoResponse = await fetch(this._serverAddressPrefix + this._urlPrefix + "/devman/typeinfo?bus=" + busName + "&type=" + deviceType);
            if (!getDevTypeInfoResponse.ok) {
                console.error(`DeviceManager getDeviceTypeInfo response not ok ${getDevTypeInfoResponse.status}`);
                return emptyRec;
            }
            const devTypeInfo = await getDevTypeInfoResponse.json();
            if ("devinfo" in devTypeInfo) {
                this._cachedDeviceTypeRecs[deviceType] = devTypeInfo.devinfo;
                return devTypeInfo.devinfo;
            }
            return emptyRec;
        }
        catch (error) {
            console.error(`DeviceManager getDeviceTypeInfo error ${error}`);
            return emptyRec;
        }
    }
    ////////////////////////////////////////////////////////////////////////////
    // Send action to device
    ////////////////////////////////////////////////////////////////////////////
    sendAction(deviceKey, action, data) {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);
        // Form the write bytes
        let writeBytes = action.t ? python_struct_1.default.pack(action.t, data) : Buffer.from([]);
        // Convert to hex string
        let writeHexStr = Buffer.from(writeBytes).toString('hex');
        // Add prefix
        writeHexStr = action.w + writeHexStr;
        // Separate the bus and address in the deviceKey (_ char)
        const devBus = deviceKey.split("_")[0];
        const devAddr = deviceKey.split("_")[1];
        // Send the action to the server
        const url = this._serverAddressPrefix + this._urlPrefix + "/devman/cmdraw?bus=" + devBus + "&addr=" + devAddr + "&hexWr=" + writeHexStr;
        console.log(`DeviceManager deviceKey ${deviceKey} action name ${action.n} value ${data} prefix ${action.w} sendAction ${url}`);
        fetch(url)
            .then(response => {
            if (!response.ok) {
                console.error(`DeviceManager sendAction response not ok ${response.status}`);
            }
        })
            .catch(error => {
            console.error(`DeviceManager sendAction error ${error}`);
        });
    }
    ////////////////////////////////////////////////////////////////////////////
    // Send a compound action to the device
    ////////////////////////////////////////////////////////////////////////////
    sendCompoundAction(deviceKey, action, data) {
        // console.log(`DeviceManager sendAction ${deviceKey} action name ${action.n} value ${value} prefix ${action.w}`);
        // Check if all data to be sent at once
        if (action.concat) {
            // Form a single list by flattening data
            let dataToWrite = [];
            for (let dataIdx = 0; dataIdx < data.length; dataIdx++) {
                dataToWrite = dataToWrite.concat(data[dataIdx]);
            }
            // Use sendAction to send this
            this.sendAction(deviceKey, action, dataToWrite);
        }
        else {
            // Iterate over the data
            for (let dataIdx = 0; dataIdx < data.length; dataIdx++) {
                // Create the data to write by prepending the index to the data for this index
                let dataToWrite = [dataIdx].concat(data[dataIdx]);
                // Use sendAction to send this
                this.sendAction(deviceKey, action, dataToWrite);
            }
        }
    }
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