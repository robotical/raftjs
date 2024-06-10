"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftChannelWebBLE
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const RaftConnEvents_1 = require("./RaftConnEvents");
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftUtils_1 = tslib_1.__importDefault(require("./RaftUtils"));
class RaftChannelWebBLE {
    constructor() {
        // Device and characteristics
        this._bleDevice = null;
        this._characteristicTx = null;
        this._characteristicRx = null;
        // Message handler
        this._raftMsgHandler = null;
        // Conn event fn
        this._onConnEvent = null;
        // Last message tx time
        this._msgTxTimeLast = Date.now();
        this._msgTxMinTimeBetweenMs = 1;
        this.maxRetries = 1;
        // Connected flag and retries
        this._isConnected = false;
        this._maxConnRetries = 3;
        // Event listener fn
        this._eventListenerFn = null;
        // File Handler parameters
        this._requestedBatchAckSize = 10;
        this._requestedFileBlockSize = 500;
    }
    fhBatchAckSize() {
        return this._requestedBatchAckSize;
    }
    fhFileBlockSize() {
        return this._requestedFileBlockSize;
    }
    // Set message handler
    setMsgHandler(raftMsgHandler) {
        this._raftMsgHandler = raftMsgHandler;
    }
    // BLE interfaces are automatically subscribed to publish messages
    requiresSubscription() {
        return false;
    }
    // RICREST command before disconnect
    ricRestCmdBeforeDisconnect() {
        return "blereset";
    }
    // isEnabled
    isEnabled() {
        if (navigator.bluetooth) {
            RaftLog_1.default.error("Web Bluetooth is supported in your browser.");
            return true;
        }
        else {
            window.alert("Web Bluetooth API is not available.\n" +
                'Please make sure the "Experimental Web Platform features" flag is enabled.');
            return false;
        }
    }
    // isConnected
    isConnected() {
        return this._bleDevice !== null && this._isConnected;
    }
    // Set onConnEvent handler
    setOnConnEvent(connEventFn) {
        this._onConnEvent = connEventFn;
    }
    // Disconnection event
    onDisconnected(event) {
        const device = event.target;
        RaftLog_1.default.debug(`RaftChannelWebBLE.onDisconnected ${device.name}`);
        if (this._bleDevice) {
            this._bleDevice.removeEventListener("gattserverdisconnected", this._eventListenerFn);
        }
        this._isConnected = false;
        if (this._onConnEvent) {
            this._onConnEvent(RaftConnEvents_1.RaftConnEvent.CONN_DISCONNECTED);
        }
    }
    // Get connected locator
    getConnectedLocator() {
        return this._bleDevice || "";
    }
    // Connect to a device
    async connect(locator, _connectorOptions) {
        // RaftLog.debug(`Selected device: ${deviceID}`);
        this._bleDevice = locator;
        if (this._bleDevice && this._bleDevice.gatt) {
            try {
                // Connect
                for (let connRetry = 0; connRetry < this._maxConnRetries; connRetry++) {
                    // Connect
                    await RaftUtils_1.default.withTimeout(2000, this._bleDevice.gatt.connect());
                    RaftLog_1.default.debug(`RaftChannelWebBLE.connect - ${this._bleDevice.gatt.connected ? "OK" : "FAILED"} attempt ${connRetry + 1} connection to device ${this._bleDevice.name}`);
                    if (this._bleDevice.gatt.connected) {
                        // Delay a bit
                        await new Promise(resolve => setTimeout(resolve, 100));
                        // Get service
                        try {
                            const service = await this._bleDevice.gatt.getPrimaryService(RaftChannelWebBLE.ServiceUUID);
                            RaftLog_1.default.debug(`RaftChannelWebBLE.connect - found service: ${service.uuid}`);
                            try {
                                // Get Tx and Rx characteristics
                                this._characteristicTx = await service.getCharacteristic(RaftChannelWebBLE.CmdUUID);
                                RaftLog_1.default.debug(`RaftChannelWebBLE.connect - found char ${this._characteristicTx.uuid}`);
                                this._characteristicRx = await service.getCharacteristic(RaftChannelWebBLE.RespUUID);
                                RaftLog_1.default.debug(`RaftChannelWebBLE.connect - found char ${this._characteristicRx.uuid}`);
                                // Notifications of received messages
                                try {
                                    await this._characteristicRx.startNotifications();
                                    RaftLog_1.default.debug("RaftChannelWebBLE.connect - notifications started");
                                    this._characteristicRx.addEventListener("characteristicvaluechanged", this._onMsgRx.bind(this));
                                }
                                catch (error) {
                                    RaftLog_1.default.debug("RaftChannelWebBLE.connnect - addEventListener failed " + error);
                                }
                                // Connected ok
                                RaftLog_1.default.debug(`RaftChannelWebBLE.connect ${this._bleDevice.name}`);
                                // Add disconnect listener
                                this._eventListenerFn = this.onDisconnected.bind(this);
                                this._bleDevice.addEventListener("gattserverdisconnected", this._eventListenerFn);
                                // Connected
                                this._isConnected = true;
                                return true;
                            }
                            catch (error) {
                                RaftLog_1.default.error(`RaftChannelWebBLE.connect - cannot find characteristic: ${error}`);
                            }
                        }
                        catch (error) {
                            if (connRetry === this._maxConnRetries - 1) {
                                RaftLog_1.default.error(`RaftChannelWebBLE.connect - cannot get primary service ${error} - attempt #${connRetry + 1} - giving up`);
                            }
                            else {
                                RaftLog_1.default.debug(`RaftChannelWebBLE.connect - cannot get primary service - attempt #${connRetry + 1} ${error}`);
                            }
                        }
                    }
                }
            }
            catch (error) {
                RaftLog_1.default.warn(`RaftChannelWebBLE.connect - cannot connect ${error}`);
            }
            // Disconnect
            if (this._bleDevice &&
                this._bleDevice.gatt &&
                this._bleDevice.gatt.connected) {
                try {
                    await this._bleDevice.gatt.disconnect();
                }
                catch (error) {
                    RaftLog_1.default.warn(`RaftChannelWebBLE.connect - cannot disconnect ${error}`);
                }
            }
        }
        return false;
    }
    // Disconnect
    async disconnect() {
        if (this._bleDevice && this._bleDevice.gatt) {
            try {
                RaftLog_1.default.debug(`RaftChannelWebBLE.disconnect GATT`);
                await this._bleDevice.gatt.disconnect();
            }
            catch (error) {
                RaftLog_1.default.debug(`RaftChannelWebBLE.disconnect ${error}`);
            }
        }
    }
    pauseConnection(pause) {
        RaftLog_1.default.verbose(`pauseConnection ${pause} - no effect for this channel type`);
        return;
    }
    // Handle notifications
    _onMsgRx(event) {
        // Get characteristic
        const characteristic = event.target;
        // Get value
        const value = characteristic.value;
        if (value !== undefined) {
            const msg = new Uint8Array(value.buffer);
            // Handle message
            if (this._raftMsgHandler) {
                try {
                    this._raftMsgHandler.handleNewRxMsg(msg);
                }
                catch (error) {
                    RaftLog_1.default.debug(`RaftChannelWebBLE.onMsgRx ${error}`);
                }
            }
        }
    }
    // Send a message
    async sendTxMsg(msg
    //    _sendWithResponse: boolean
    ) {
        // Check valid
        if (this._bleDevice === null) {
            return false;
        }
        // Retry upto maxRetries
        for (let retryIdx = 0; retryIdx < this.maxRetries; retryIdx++) {
            // Check for min time between messages
            while (Date.now() - this._msgTxTimeLast < this._msgTxMinTimeBetweenMs) {
                await new Promise((resolve) => setTimeout(resolve, 5));
            }
            this._msgTxTimeLast = Date.now();
            // Write to the characteristic
            try {
                if (this._characteristicTx) {
                    if (this._characteristicTx.writeValueWithoutResponse) {
                        await this._characteristicTx.writeValueWithoutResponse(msg);
                    }
                    else if (this._characteristicTx.writeValue) {
                        await this._characteristicTx.writeValue(msg);
                    }
                    else if (this._characteristicTx.writeValueWithResponse) {
                        await this._characteristicTx.writeValueWithResponse(msg);
                    }
                }
                break;
            }
            catch (error) {
                if (retryIdx === this.maxRetries - 1) {
                    RaftLog_1.default.info(`RaftChannelWebBLE.sendTxMsg ${error} retried ${retryIdx} times`);
                }
            }
        }
        return true;
    }
    // Send message without awaiting response
    async sendTxMsgNoAwait(msg
    //    _sendWithResponse: boolean
    ) {
        // Check valid
        if (this._bleDevice === null) {
            return false;
        }
        // Check for min time between messages
        while (Date.now() - this._msgTxTimeLast < this._msgTxMinTimeBetweenMs) {
            await new Promise((resolve) => setTimeout(resolve, 5));
        }
        this._msgTxTimeLast = Date.now();
        // Write to the characteristic
        if (this._characteristicTx) {
            if (this._characteristicTx.writeValueWithoutResponse) {
                this._characteristicTx.writeValueWithoutResponse(msg);
            }
            else if (this._characteristicTx.writeValue) {
                this._characteristicTx.writeValue(msg);
            }
            else if (this._characteristicTx.writeValueWithResponse) {
                this._characteristicTx.writeValueWithResponse(msg);
            }
            return true;
        }
        return false;
    }
}
// BLE UUIDS
RaftChannelWebBLE.ServiceUUID = "aa76677e-9cfd-4626-a510-0d305be57c8d";
RaftChannelWebBLE.CmdUUID = "aa76677e-9cfd-4626-a510-0d305be57c8e";
RaftChannelWebBLE.RespUUID = "aa76677e-9cfd-4626-a510-0d305be57c8f";
exports.default = RaftChannelWebBLE;
//# sourceMappingURL=RaftChannelWebBLE.js.map