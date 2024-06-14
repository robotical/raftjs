"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftChannelWebSockets
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const isomorphic_ws_1 = tslib_1.__importDefault(require("isomorphic-ws"));
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftUtils_1 = tslib_1.__importDefault(require("./RaftUtils"));
const RaftConnEvents_1 = require("./RaftConnEvents");
class RaftChannelWebSocket {
    constructor() {
        // Message handler
        this._raftMsgHandler = null;
        // Websocket we are connected to
        this._webSocket = null;
        // Last message tx time
        // private _msgTxTimeLast = Date.now();
        // private _msgTxMinTimeBetweenMs = 15;
        // Is connected
        this._isConnected = false;
        // Conn event fn
        this._onConnEvent = null;
        // File Handler parameters
        this._requestedBatchAckSize = 10;
        this._requestedFileBlockSize = 500;
    }
    fhBatchAckSize() { return this._requestedBatchAckSize; }
    fhFileBlockSize() { return this._requestedFileBlockSize; }
    // isConnected
    isConnected() {
        return this._isConnected;
    }
    // Set message handler
    setMsgHandler(raftMsgHandler) {
        this._raftMsgHandler = raftMsgHandler;
    }
    // WebSocket interfaces require subscription to published messages
    requiresSubscription() {
        return true;
    }
    // RICREST command before disconnect
    ricRestCmdBeforeDisconnect() {
        return null;
    }
    // Set onConnEvent handler
    setOnConnEvent(connEventFn) {
        this._onConnEvent = connEventFn;
    }
    // Get connected locator
    getConnectedLocator() {
        return this._webSocket;
    }
    // Connect to a device
    async connect(locator, connectorOptions) {
        // Debug
        RaftLog_1.default.debug("RaftChannelWebSocket.connect " + locator.toString());
        // Get ws suffix
        const wsSuffix = connectorOptions ? (connectorOptions.wsSuffix ? connectorOptions.wsSuffix : "ws") : "ws";
        // Connect
        const connOk = await this._wsConnect("ws://" + locator + "/" + wsSuffix);
        return connOk;
    }
    // Disconnect
    async disconnect() {
        var _a;
        // Not connected
        this._isConnected = false;
        // Disconnect websocket
        (_a = this._webSocket) === null || _a === void 0 ? void 0 : _a.close(1000);
        // Debug
        RaftLog_1.default.debug(`RaftChannelWebSocket.disconnect attempting to close websocket`);
    }
    pauseConnection(pause) { RaftLog_1.default.verbose(`pauseConnection ${pause} - no effect for this channel type`); return; }
    // Handle notifications
    _onMsgRx(msg) {
        // Debug
        if (msg !== null) {
            RaftLog_1.default.verbose(`RaftChannelWebSocket._onMsgRx ${RaftUtils_1.default.bufferToHex(msg)}`);
        }
        // Handle message
        if (msg !== null && this._raftMsgHandler) {
            this._raftMsgHandler.handleNewRxMsg(msg);
        }
    }
    // Send a message
    async sendTxMsg(msg, sendWithResponse) {
        var _a;
        // Check connected
        if (!this._isConnected)
            return false;
        // Debug
        RaftLog_1.default.verbose(`RaftChannelWebSocket.sendTxMsg ${msg.toString()} sendWithResp ${sendWithResponse.toString()}`);
        // Send over websocket
        try {
            await ((_a = this._webSocket) === null || _a === void 0 ? void 0 : _a.send(msg));
        }
        catch (error) {
            RaftLog_1.default.warn(`RaftChannelWebSocket.sendTxMsg - send failed ${error}`);
            return false;
        }
        return true;
    }
    async sendTxMsgNoAwait(msg, sendWithResponse) {
        var _a;
        // Check connected
        if (!this._isConnected)
            return false;
        // Debug
        RaftLog_1.default.verbose(`RaftChannelWebSocket.sendTxMsgNoAwait ${msg.toString()} sendWithResp ${sendWithResponse.toString()}`);
        // Send over websocket
        (_a = this._webSocket) === null || _a === void 0 ? void 0 : _a.send(msg);
        return true;
    }
    async _wsConnect(locator) {
        // Check already connected
        if (await this.isConnected()) {
            return true;
        }
        // Form websocket address
        const wsURL = locator.toString();
        // Connect to websocket
        // try {
        //     this._webSocket = await this._webSocketOpen(wsURL);
        // } catch (error: any) {
        //     RaftLog.debug(`Unable to create WebSocket ${error.toString()}`);
        //     return false;
        // }
        this._webSocket = null;
        return new Promise((resolve, reject) => {
            this._webSocketOpen(wsURL).then((ws) => {
                this._webSocket = ws;
                RaftLog_1.default.debug(`_wsConnect - opened connection`);
                // Handle messages
                this._webSocket.onmessage = (evt) => {
                    // RaftLog.debug("WebSocket rx");
                    if (evt.data instanceof ArrayBuffer) {
                        const msg = new Uint8Array(evt.data);
                        this._onMsgRx(msg);
                    }
                };
                // Handle close event
                this._webSocket.onclose = (evt) => {
                    RaftLog_1.default.info(`_wsConnect - closed code ${evt.code} wasClean ${evt.wasClean} reason ${evt.reason}`);
                    this._webSocket = null;
                    this._isConnected = false;
                    // Event handler
                    if (this._onConnEvent) {
                        this._onConnEvent(RaftConnEvents_1.RaftConnEvent.CONN_DISCONNECTED);
                    }
                };
                // Resolve the promise - success
                resolve(true);
            }).catch((err) => {
                if (err instanceof Error) {
                    RaftLog_1.default.verbose(`WS open failed ${err.toString()}`);
                }
                // Resolve - failed
                reject(false);
            });
        });
    }
    async _webSocketOpen(url) {
        return new Promise((resolve, reject) => {
            // Debug
            // RaftLog.debug('Attempting WebSocket connection');
            // Open the socket
            try {
                const webSocket = new isomorphic_ws_1.default(url);
                // Open socket
                webSocket.binaryType = "arraybuffer";
                webSocket.onopen = (_evt) => {
                    RaftLog_1.default.debug(`RaftChannelWebSocket._webSocketOpen - onopen ${_evt.toString()}`);
                    // // We're connected
                    this._isConnected = true;
                    resolve(webSocket);
                };
                webSocket.onerror = function (evt) {
                    RaftLog_1.default.warn(`RaftChannelWebSocket._webSocketOpen - onerror: ${evt.message}`);
                    reject(evt);
                };
            }
            catch (error) {
                RaftLog_1.default.warn(`RaftChannelWebSocket._webSocketOpen - open failed ${error}`);
                reject(error);
            }
        });
    }
}
exports.default = RaftChannelWebSocket;
//# sourceMappingURL=RaftChannelWebSocket.js.map