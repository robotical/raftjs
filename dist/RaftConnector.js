"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftConnector
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const RaftChannelWebBLE_1 = tslib_1.__importDefault(require("./RaftChannelWebBLE"));
const RaftMsgHandler_1 = tslib_1.__importDefault(require("./RaftMsgHandler"));
const RaftChannelWebSocket_1 = tslib_1.__importDefault(require("./RaftChannelWebSocket"));
const RaftChannelWebSerial_1 = tslib_1.__importDefault(require("./RaftChannelWebSerial"));
const RaftCommsStats_1 = tslib_1.__importDefault(require("./RaftCommsStats"));
const RaftTypes_1 = require("./RaftTypes");
const RaftSystemUtils_1 = tslib_1.__importDefault(require("./RaftSystemUtils"));
const RaftFileHandler_1 = tslib_1.__importDefault(require("./RaftFileHandler"));
const RaftStreamHandler_1 = tslib_1.__importDefault(require("./RaftStreamHandler"));
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftConnEvents_1 = require("./RaftConnEvents");
const RaftUpdateEvents_1 = require("./RaftUpdateEvents");
const RaftUpdateManager_1 = tslib_1.__importDefault(require("./RaftUpdateManager"));
class RaftConnector {
    /**
     * RaftConnector constructor
     * @param getSystemTypeCB - callback to get system type
      */
    constructor(getSystemTypeCB = null) {
        // Get system type callback
        this._getSystemTypeCB = null;
        // System type
        this._systemType = null;
        // Channel
        this._raftChannel = null;
        // Channel connection method and locator
        this._channelConnMethod = "";
        this._channelConnLocator = "";
        // Comms stats
        this._commsStats = new RaftCommsStats_1.default();
        // Message handler
        this._raftMsgHandler = new RaftMsgHandler_1.default(this._commsStats);
        // RaftSystem
        this._raftSystemUtils = new RaftSystemUtils_1.default(this._raftMsgHandler);
        // Connection performance checker
        this._testConnPerfBlockSize = 500;
        this._testConnPerfNumBlocks = 50;
        this._connPerfRsltDelayMs = 4000;
        // Retry connection if lost
        this._retryIfLostEnabled = true;
        this._retryIfLostForSecs = 10;
        this._retryIfLostIsConnected = false;
        this._retryIfLostDisconnectTime = null;
        this._retryIfLostRetryDelayMs = 500;
        // File handler
        this._raftFileHandler = new RaftFileHandler_1.default(this._raftMsgHandler, this._commsStats);
        // Stream handler
        this._raftStreamHandler = new RaftStreamHandler_1.default(this._raftMsgHandler, this._commsStats, this);
        // Event listener
        this._onEventFn = null;
        // Update manager
        this._raftUpdateManager = null;
        // Get system type callback
        this._getSystemTypeCB = getSystemTypeCB;
        // Debug
        RaftLog_1.default.debug('RaftConnector starting up');
    }
    /**
     * Configure the file handler
     * @param fileBlockSize - size of file blocks to send
     * @param batchAckSize - number of blocks to send before waiting for ack
     * @returns void
       */
    configureFileHandler(fileBlockSize, batchAckSize) {
        this._raftFileHandler.setRequestedFileBlockSize(fileBlockSize);
        this._raftFileHandler.setRequestedBatchAckSize(batchAckSize);
    }
    /**
     * Set event listener
     * @param onEventFn - event listener
     * @returns void
     *  */
    setEventListener(onEventFn) {
        this._onEventFn = onEventFn;
    }
    /**
     * isConnected
     * @returns boolean - true if connected
     *  */
    isConnected() {
        // Check if connected
        const isConnected = this._retryIfLostIsConnected || (this._raftChannel ? this._raftChannel.isConnected() : false);
        return isConnected;
    }
    /**
     * Set try to reconnect if connection lost
     * @param enableRetry - true to enable retry
     * @param retryForSecs - retry for this many seconds
     * @returns void
     * */
    setRetryConnectionIfLost(enableRetry, retryForSecs) {
        this._retryIfLostEnabled = enableRetry;
        this._retryIfLostForSecs = retryForSecs;
        if (!this._retryIfLostEnabled) {
            this._retryIfLostIsConnected = false;
        }
        RaftLog_1.default.debug(`setRetryConnectionIfLost ${enableRetry} retry for ${retryForSecs}`);
    }
    /**
     * Get Raft system type (the type of hardware connected to - determined using the getSystemInfo API)
     * @returns RaftSystemType | null - Raft system type
     * */
    getSystemType() {
        return this._systemType;
    }
    /**
     * Get connection method
     * @returns string - connection method
     * */
    getConnMethod() {
        return this._channelConnMethod;
    }
    /**
   * Get connection locator
   * @returns string | object - connection locator
   * */
    getConnLocator() {
        return this._raftChannel ? this._raftChannel.getConnectedLocator() : null;
    }
    /**
     * Get Raft channel (this is the channel used for commuinications with the Raft application)
     * @returns RaftChannel | null - Raft channel
     * */
    getRaftChannel() {
        return this._raftChannel;
    }
    /**
     * Get Raft system utils (access to system information and control)
     * @returns RaftSystemUtils - Raft system utils
     * */
    getRaftSystemUtils() {
        return this._raftSystemUtils;
    }
    /**
     * Get communication stats
     * @returns RaftCommsStats - communication stats
     * */
    getCommsStats() {
        return this._commsStats;
    }
    /**
     * Get Raft message handler (to allow message sending and receiving)
     * @returns RaftMsgHandler - Raft message handler
     * */
    getRaftMsgHandler() {
        return this._raftMsgHandler;
    }
    /**
     * Pause connection
     * @param pause - true to pause, false to resume
     */
    pauseConnection(pause = true) {
        if (this._raftChannel)
            this._raftChannel.pauseConnection(pause);
    }
    /**
     * Connect to a Raft application
     *
     * @param {string} method - can be "WebBLE", "WebSocket" or "WebSerial"
     * @param {string | object} locator - either a string (WebSocket URL or serial port) or an object (WebBLE)
     * @returns Promise<boolean>
     *
     */
    async connect(method, locator) {
        // Ensure disconnected
        try {
            await this.disconnect();
        }
        catch (err) {
            // Ignore
        }
        // Check connection method
        let connMethod = "";
        if (method === 'WebBLE' && typeof locator === 'object' && locator !== null) {
            // Create channel
            this._raftChannel = new RaftChannelWebBLE_1.default();
            connMethod = 'WebBLE';
        }
        else if (((method === 'WebSocket') || (method === 'wifi')) && (typeof locator === 'string')) {
            // Create channel
            this._raftChannel = new RaftChannelWebSocket_1.default();
            connMethod = 'WebSocket';
        }
        else if (((method === 'WebSerial'))) {
            this._raftChannel = new RaftChannelWebSerial_1.default();
            connMethod = 'WebSerial';
        }
        RaftLog_1.default.debug(`connecting with connMethod ${connMethod}`);
        // Check channel established
        let connOk = false;
        if (this._raftChannel !== null) {
            // Connection method and locator
            this._channelConnMethod = connMethod;
            this._channelConnLocator = locator;
            // Set message handler
            this._raftChannel.setMsgHandler(this._raftMsgHandler);
            this._raftChannel.setOnConnEvent(this.onConnEvent.bind(this));
            // Message handling in and out
            this._raftMsgHandler.registerForResults(this);
            this._raftMsgHandler.registerMsgSender(this._raftChannel);
            // Connect
            try {
                // Event
                this.onConnEvent(RaftConnEvents_1.RaftConnEvent.CONN_CONNECTING);
                // Connect
                connOk = await this._connectToChannel();
            }
            catch (err) {
                RaftLog_1.default.error('RaftConnector.connect - error: ' + err);
            }
            // Check ok
            if (connOk) {
                // Get system type
                if (this._getSystemTypeCB) {
                    // Get system type
                    this._systemType = await this._getSystemTypeCB(this._raftSystemUtils);
                    // Set defaults
                    if (this._systemType) {
                        this._raftSystemUtils.setDefaultWiFiHostname(this._systemType.defaultWiFiHostname);
                    }
                }
                // Setup system type
                if (this._systemType) {
                    this._systemType.setup(this._raftSystemUtils, this._onEventFn);
                }
                // Check if subscription required
                if (this._systemType &&
                    this._systemType.subscribeForUpdates &&
                    this._raftChannel.requiresSubscription()) {
                    try {
                        // Subscription
                        await this._systemType.subscribeForUpdates(this._raftSystemUtils, true);
                        RaftLog_1.default.info(`connect subscribed for updates`);
                    }
                    catch (error) {
                        RaftLog_1.default.warn(`connect subscribe for updates failed ${error}`);
                    }
                }
                // Send connected event
                this.onConnEvent(RaftConnEvents_1.RaftConnEvent.CONN_CONNECTED);
            }
            else {
                // Failed Event
                this.onConnEvent(RaftConnEvents_1.RaftConnEvent.CONN_CONNECTION_FAILED);
            }
            // configure file handler
            this.configureFileHandler(this._raftChannel.fhFileBlockSize(), this._raftChannel.fhBatchAckSize());
        }
        else {
            this._channelConnMethod = "";
        }
        return connOk;
    }
    async disconnect() {
        // Disconnect
        this._retryIfLostIsConnected = false;
        if (this._raftChannel) {
            // Check if there is a RICREST command to send before disconnecting
            const ricRestCommand = this._raftChannel.ricRestCmdBeforeDisconnect();
            console.log(`sending RICREST command before disconnect: ${ricRestCommand}`);
            if (ricRestCommand) {
                await this.sendRICRESTMsg(ricRestCommand, {});
            }
            // await this.sendRICRESTMsg("bledisc", {});
            await this._raftChannel.disconnect();
            this._raftChannel = null;
        }
    }
    // Mark: Tx Message handling -----------------------------------------------------------------------------------------
    /**
     *
     * sendRICRESTMsg
     * @param commandName command API string
     * @param params parameters (simple name value pairs only) to parameterize trajectory
     * @returns Promise<RaftOKFail>
     *
     */
    async sendRICRESTMsg(commandName, params, bridgeID = undefined) {
        try {
            // Format the paramList as query string
            const paramEntries = Object.entries(params);
            let paramQueryStr = '';
            for (const param of paramEntries) {
                if (paramQueryStr.length > 0)
                    paramQueryStr += '&';
                paramQueryStr += param[0] + '=' + param[1];
            }
            // Format the url to send
            if (paramQueryStr.length > 0)
                commandName += '?' + paramQueryStr;
            return await this._raftMsgHandler.sendRICRESTURL(commandName, bridgeID);
        }
        catch (error) {
            RaftLog_1.default.warn(`sendRICRESTMsg failed ${error}`);
            return new RaftTypes_1.RaftOKFail();
        }
    }
    // Mark: Rx Message handling -----------------------------------------------------------------------------------------
    /**
     * onRxReply - handle a reply message
     * @param msgHandle number indicating the message that is being replied to (from the original message)
     * @param msgRsltCode result code
     * @param msgRsltJsonObj result object
     */
    onRxReply(msgHandle, msgRsltCode, msgRsltJsonObj) {
        RaftLog_1.default.verbose(`onRxReply msgHandle ${msgHandle} rsltCode ${msgRsltCode} obj ${JSON.stringify(msgRsltJsonObj)}`);
    }
    /**
     * onRxUnnumberedMsg - handle an unnumbered message
     * @param msgRsltJsonObj result object
     */
    onRxUnnumberedMsg(msgRsltJsonObj) {
        RaftLog_1.default.verbose(`onRxUnnumberedMsg rsltCode obj ${JSON.stringify(msgRsltJsonObj)}`);
        // Inform the file handler
        if ('okto' in msgRsltJsonObj) {
            this._raftFileHandler.onOktoMsg(msgRsltJsonObj.okto);
        }
        else if ('sokto' in msgRsltJsonObj) {
            this._raftStreamHandler.onSoktoMsg(msgRsltJsonObj.sokto);
        }
    }
    /**
     * onRxFileBlock - handle a file block
     * @param filePos file position
     * @param fileBlockData file block data
     */
    onRxFileBlock(filePos, fileBlockData) {
        // RaftLog.info(`onRxFileBlock filePos ${filePos} fileBlockData ${RaftUtils.bufferToHex(fileBlockData)}`);
        this._raftFileHandler.onFileBlock(filePos, fileBlockData);
    }
    // Mark: Handling of other message types -----------------------------------------------------------------------------------------
    /**
     * onRxOtherMsgType - handle other message types
     * @param payload message payload
     * @param frameTimeMs time of frame
     */
    onRxOtherMsgType(payload, _frameTimeMs) {
        // RaftLog.debug(`onRxOtherMsgType payload ${RaftUtils.bufferToHex(payload)}`);
        RaftLog_1.default.verbose(`onRxOtherMsgType payloadLen ${payload.length}`);
        // Handle other messages
        if (this._systemType && this._systemType.rxOtherMsgType) {
            this._systemType.rxOtherMsgType(payload, _frameTimeMs);
        }
    }
    // Mark: File sending --------------------------------------------------------------------------------
    /**
     * sendFile - send a file
     * @param fileName name of file to send
     * @param fileContents file contents
     * @param progressCallback callback to receive progress updates
     * @returns Promise<boolean> - true if file sent successfully
     */
    async sendFile(fileName, fileContents, progressCallback) {
        return this._raftFileHandler.fileSend(fileName, RaftTypes_1.RaftFileSendType.NORMAL_FILE, "fs", fileContents, progressCallback);
    }
    // Mark: Streaming --------------------------------------------------------------------------------
    /**
     * streamAudio - stream audio
     * @param streamContents audio data
     * @param clearExisting true to clear existing audio
     * @param duration duration of audio
     */
    streamAudio(streamContents, clearExisting, duration) {
        if (this._raftStreamHandler && this.isConnected()) {
            this._raftStreamHandler.streamAudio(streamContents, clearExisting, duration);
        }
    }
    /**
     * isStreamStarting - check if stream is starting
     */
    isStreamStarting() {
        return this._raftStreamHandler.isStreamStarting();
    }
    // Mark: File system --------------------------------------------------------------------------------
    /**
     * fsGetContents - get file contents
     * @param fileName name of file to get
     * @param fileSource source of file to get (e.g. "fs" or "bridgeserial1", if omitted defaults to "fs")
     * @param progressCallback callback to receive progress updates
     * @returns Promise<RaftFileDownloadResult>
     */
    async fsGetContents(fileName, fileSource, progressCallback) {
        return await this._raftFileHandler.fileReceive(fileName, fileSource, progressCallback);
    }
    /**
     * setLegacySoktoMode - set legacy sokto mode
     * @param legacyMode true to set legacy mode
     */
    setLegacySoktoMode(legacyMode) {
        return this._raftStreamHandler.setLegacySoktoMode(legacyMode);
    }
    // Mark: Bridge serial --------------------------------------------------------------------------------
    /**
     * createCommsBridge - create a comms bridge
     * @param bridgeSource source of bridge (e.g. "Serial1")
     * @param bridgeName name of bridge
     * @param idleCloseSecs idle close time seconds
     * @returns Promise<RaftBridgeSetupResp>
     */
    async createCommsBridge(bridgeSource, bridgeName, idleCloseSecs = 0) {
        return await this._raftMsgHandler.createCommsBridge(bridgeSource, bridgeName, idleCloseSecs);
    }
    // Mark: Connection performance--------------------------------------------------------------------------
    /**
     * ParkMiller random number generator
     * @param seed
     * @returns number
     */
    parkmiller_next(seed) {
        const hi = Math.round(16807 * (seed & 0xffff));
        let lo = Math.round(16807 * (seed >> 16));
        lo += (hi & 0x7fff) << 16;
        lo += hi >> 15;
        if (lo > 0x7fffffff)
            lo -= 0x7fffffff;
        return lo;
    }
    /**
     * checkConnPerformance - check connection performance
     * @returns Promise<number | undefined> - connection performance
     */
    async checkConnPerformance() {
        // Sends a magic sequence of bytes followed by blocks of random data 
        // these will be ignored by the Raft library (as it recognises magic sequence)
        // and is used performance evaluation
        let prbsState = 1;
        const testData = new Uint8Array(this._testConnPerfBlockSize);
        for (let i = 0; i < this._testConnPerfNumBlocks; i++) {
            testData.set([0, (i >> 24) & 0xff, (i >> 16) & 0xff, (i >> 8) & 0xff, i & 0xff, 0x1f, 0x9d, 0xf4, 0x7a, 0xb5]);
            for (let j = 10; j < this._testConnPerfBlockSize; j++) {
                prbsState = this.parkmiller_next(prbsState);
                testData[j] = prbsState & 0xff;
            }
            if (this._raftChannel) {
                await this._raftChannel.sendTxMsg(testData, false);
            }
        }
        // Wait a little to allow the Raft app to process the data
        await new Promise(resolve => setTimeout(resolve, this._connPerfRsltDelayMs));
        // Get performance
        const blePerf = await this._raftSystemUtils.getSysModInfoBLEMan();
        if (blePerf) {
            console.log(`checkConnPerformance result rate = ${blePerf.tBPS}BytesPS`);
            return blePerf.tBPS;
        }
        else {
            throw new Error('checkConnPerformance: failed to get BLE performance');
        }
    }
    // Mark: Connection event --------------------------------------------------------------------------
    /**
     * onConnEvent - handle connection event
     * @param eventEnum connection event enumeration
     * @param data data associated with event
     * @returns void
     */
    onConnEvent(eventEnum, data = undefined) {
        // Handle information clearing on disconnect
        switch (eventEnum) {
            case RaftConnEvents_1.RaftConnEvent.CONN_DISCONNECTED:
                // Disconnect time
                this._retryIfLostDisconnectTime = Date.now();
                // Check if retry required
                if (this._retryIfLostIsConnected && this._retryIfLostEnabled) {
                    // Indicate connection disrupted
                    if (this._onEventFn) {
                        this._onEventFn("conn", RaftConnEvents_1.RaftConnEvent.CONN_ISSUE_DETECTED, RaftConnEvents_1.RaftConnEventNames[RaftConnEvents_1.RaftConnEvent.CONN_ISSUE_DETECTED]);
                    }
                    // Retry connection
                    this._retryConnection();
                    // Don't allow disconnection to propagate until retries have occurred
                    return;
                }
                // Invalidate connection details
                this._raftSystemUtils.invalidate();
                // Invalidate system-type info
                if (this._systemType && this._systemType.stateIsInvalid) {
                    this._systemType.stateIsInvalid();
                }
                break;
        }
        // Notify
        if (this._onEventFn) {
            this._onEventFn("conn", eventEnum, RaftConnEvents_1.RaftConnEventNames[eventEnum], data);
        }
    }
    /**
     * Retry connection
     */
    _retryConnection() {
        // Check timeout
        if ((this._retryIfLostDisconnectTime !== null) &&
            (Date.now() - this._retryIfLostDisconnectTime < this._retryIfLostForSecs * 1000)) {
            // Set timer to try to reconnect
            setTimeout(async () => {
                // Try to connect
                const isConn = await this._connectToChannel();
                if (!isConn) {
                    this._retryConnection();
                }
                else {
                    // No longer retrying
                    this._retryIfLostDisconnectTime = null;
                    // Indicate connection problem resolved
                    if (this._onEventFn) {
                        this._onEventFn("conn", RaftConnEvents_1.RaftConnEvent.CONN_ISSUE_RESOLVED, RaftConnEvents_1.RaftConnEventNames[RaftConnEvents_1.RaftConnEvent.CONN_ISSUE_RESOLVED]);
                    }
                }
            }, this._retryIfLostRetryDelayMs);
        }
        else {
            // No longer connected after retry timeout
            this._retryIfLostIsConnected = false;
            // Indicate disconnection
            if (this._onEventFn) {
                this._onEventFn("conn", RaftConnEvents_1.RaftConnEvent.CONN_DISCONNECTED, RaftConnEvents_1.RaftConnEventNames[RaftConnEvents_1.RaftConnEvent.CONN_DISCONNECTED]);
            }
            // Invalidate connection details
            this._raftSystemUtils.invalidate();
            // Invalidate system-type info
            if (this._systemType && this._systemType.stateIsInvalid) {
                this._systemType.stateIsInvalid();
            }
        }
    }
    /**
     * Connect to channel
     * @returns Promise<boolean> - true if connected
     */
    async _connectToChannel() {
        // Connect
        try {
            if (this._raftChannel) {
                const connected = await this._raftChannel.connect(this._channelConnLocator, this._systemType ? this._systemType.connectorOptions : {});
                if (connected) {
                    this._retryIfLostIsConnected = true;
                    return true;
                }
            }
        }
        catch (error) {
            RaftLog_1.default.error(`RaftConnector.connect() error: ${error}`);
        }
        return false;
    }
    // Mark: OTA Update -----------------------------------------------------------------------------------------
    /**
     * onUpdateEvent - handle update event
     * @param eventEnum
     * @param data
     */
    _onUpdateEvent(eventEnum, data = undefined) {
        // Notify
        if (this._onEventFn) {
            this._onEventFn("ota", eventEnum, RaftUpdateEvents_1.RaftUpdateEventNames[eventEnum], data);
        }
    }
    /**
     * otaUpdateCheck - check for OTA update
     * @returns Promise<RaftUpdateEvent> - update event
     * */
    async otaUpdateCheck() {
        if (!this._raftUpdateManager)
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_NOT_CONFIGURED;
        return await this._raftUpdateManager.checkForUpdate(this._raftSystemUtils.getCachedSystemInfo());
    }
    /**
     * otaUpdateStart - start OTA update
     * @returns Promise<RaftUpdateEvent> - update event
     * */
    async otaUpdateStart() {
        if (!this._raftUpdateManager)
            return RaftUpdateEvents_1.RaftUpdateEvent.UPDATE_NOT_CONFIGURED;
        return await this._raftUpdateManager.firmwareUpdate();
    }
    /**
     * otaUpdateCancel - cancel OTA update
     * @returns Promise<void>
     * */
    async otaUpdateCancel() {
        if (!this._raftUpdateManager)
            return;
        return await this._raftUpdateManager.firmwareUpdateCancel();
    }
    /**
     * setupUpdateManager - setup the update manager
     * @param appVersion - app version
     * @param appUpdateURL - app update URL
     * @param firmwareBaseURL - firmware base URL
     * @param fileDownloader - file downloader
     * @returns void
     * */
    setupUpdateManager(appVersion, appUpdateURL, firmwareBaseURL, fileDownloader) {
        // Setup update manager
        const firmwareTypeStrForMainFw = 'main';
        this._raftUpdateManager = new RaftUpdateManager_1.default(this._systemType, this._raftMsgHandler, this._raftFileHandler, this._raftSystemUtils, this._onUpdateEvent.bind(this), firmwareTypeStrForMainFw, appVersion, fileDownloader, appUpdateURL, firmwareBaseURL, this._raftChannel);
    }
}
exports.default = RaftConnector;
//# sourceMappingURL=RaftConnector.js.map