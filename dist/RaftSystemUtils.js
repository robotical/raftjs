"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftSystem
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const RaftWifiTypes_1 = require("./RaftWifiTypes");
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftTypes_1 = require("./RaftTypes");
class RaftSystemUtils {
    /**
     * constructor
     * @param raftMsgHandler
     */
    constructor(raftMsgHandler) {
        // System info
        this._systemInfo = null;
        // Raft naming
        this._friendlyName = null;
        // WiFi connection info
        this._wifiConnStatus = new RaftWifiTypes_1.RaftWifiConnStatus();
        this._defaultWiFiHostname = "Raft";
        this._maxSecsToWaitForWiFiConn = 20;
        this._msgHandler = raftMsgHandler;
    }
    /**
     * getMsgHandler
     * @returns RaftMsgHandler
     */
    getMsgHandler() {
        return this._msgHandler;
    }
    /**
     * setDefaultWiFiHostname
     * @param defaultWiFiHostname
     */
    setDefaultWiFiHostname(defaultWiFiHostname) {
        this._defaultWiFiHostname = defaultWiFiHostname;
    }
    /**
     * getFriendlyName
     *
     * @returns friendly name
     */
    getFriendlyName() {
        return this._friendlyName;
    }
    /**
     * invalidate
     */
    invalidate() {
        // Invalidate system info
        this._systemInfo = null;
        this._friendlyName = null;
        RaftLog_1.default.debug("RaftSystemUtils information invalidated");
    }
    /**
     * retrieveInfo - get system info
     * @returns Promise<RaftSystemInfo>
     *
     */
    async retrieveInfo() {
        var _a;
        // Get system info
        RaftLog_1.default.debug(`RaftSystemUtils retrieveInfo getting system info`);
        try {
            await this.getSystemInfo(true);
            RaftLog_1.default.debug(`retrieveInfo - Raft Version ${(_a = this._systemInfo) === null || _a === void 0 ? void 0 : _a.SystemVersion}`);
        }
        catch (error) {
            RaftLog_1.default.warn("RaftSystemUtils retrieveInfo - frailed to get version " + error);
            return false;
        }
        // Get app name
        try {
            await this.getRaftName();
        }
        catch (error) {
            RaftLog_1.default.warn("retrieveInfo - failed to get Raft name " + error);
            return false;
        }
        // Get WiFi connected info
        try {
            await this.getWiFiConnStatus();
        }
        catch (error) {
            RaftLog_1.default.warn("RaftSystemUtils retrieveInfo - failed to get WiFi Status " + error);
            return false;
        }
        return true;
    }
    /**
     *
     * getSystemInfo
     * @param forceGet - true to force a get from the raft app
     * @returns Promise<RaftSystemInfo>
     *
     */
    async getSystemInfo(forceGet = false) {
        if (!forceGet && this._systemInfo) {
            return this._systemInfo;
        }
        try {
            this._systemInfo = await this._msgHandler.sendRICRESTURL("v");
            RaftLog_1.default.debug("getRaftSystemInfo returned " + JSON.stringify(this._systemInfo));
            this._systemInfo.validMs = Date.now();
            // Check if friendly name is included in system info
            if (this._systemInfo.Friendly && (this._systemInfo.Friendly.length > 0)) {
                this._friendlyName = { "friendlyName": this._systemInfo.Friendly, "friendlyNameIsSet": true, "rslt": "ok", "validMs": Date.now() };
            }
            // Handle alternatives in system info
            if ((this._systemInfo.RicHwRevNo !== undefined) && (this._systemInfo.HwRev === undefined)) {
                this._systemInfo.HwRev = this._systemInfo.RicHwRevNo;
            }
            else if ((this._systemInfo.HwRev !== undefined) && (this._systemInfo.RicHwRevNo === undefined)) {
                this._systemInfo.RicHwRevNo = this._systemInfo.HwRev;
            }
            // Return system info
            return this._systemInfo;
        }
        catch (error) {
            RaftLog_1.default.debug(`RaftSystemUtils getRaftSystemInfo Failed to get version ${error}`);
            return new RaftTypes_1.RaftSystemInfo();
        }
    }
    /**
     *
     * setRaftName
     * @param newName name to refer to Raft - used for BLE advertising
     * @returns Promise<boolean> true if successful
     *
     */
    async setRaftName(newName) {
        try {
            this._friendlyName = await this._msgHandler.sendRICRESTURL(`friendlyname/${newName}`);
            if (this._friendlyName) {
                this._friendlyName.friendlyNameIsSet = false;
                this._friendlyName.validMs = Date.now();
                if (this._friendlyName &&
                    this._friendlyName.rslt &&
                    this._friendlyName.rslt.toLowerCase() === "ok") {
                    this._friendlyName.friendlyNameIsSet = true;
                }
                RaftLog_1.default.debug("RaftSystemUtils setRaftName returned " + JSON.stringify(this._friendlyName));
                return true;
            }
            return true;
        }
        catch (error) {
            this._friendlyName = null;
            return false;
        }
    }
    /**
     *
     * getRaftName
     * @param forceGet - true to force a get from the raft app
     * @returns Promise<RaftNameResponse> (object containing rslt)
     *
     */
    async getRaftName(forceGet = false) {
        // Check if we have a cached value
        if (!forceGet && this._friendlyName && this._friendlyName.validMs) {
            return this._friendlyName;
        }
        try {
            this._friendlyName = await this._msgHandler.sendRICRESTURL("friendlyname");
            if (this._friendlyName &&
                this._friendlyName.rslt &&
                this._friendlyName.rslt === "ok") {
                this._friendlyName.friendlyNameIsSet = this._friendlyName
                    .friendlyNameIsSet
                    ? true
                    : false;
            }
            else {
                this._friendlyName.friendlyNameIsSet = false;
            }
            this._friendlyName.validMs = Date.now();
            RaftLog_1.default.debug("RaftSystemUtils Friendly name set is: " + JSON.stringify(this._friendlyName));
            return this._friendlyName;
        }
        catch (error) {
            return new RaftTypes_1.RaftFriendlyName();
        }
    }
    /**
     *
     * getFileList - get list of files on file system
     * @returns Promise<RaftFileList>
     *
     */
    async getFileList() {
        try {
            const ricFileList = await this._msgHandler.sendRICRESTURL("filelist");
            RaftLog_1.default.debug("RaftSystemUtils getFileList returned " + ricFileList);
            return ricFileList;
        }
        catch (error) {
            RaftLog_1.default.debug(`RaftSystemUtils getFileList Failed to get file list ${error}`);
            return new RaftTypes_1.RaftFileList();
        }
    }
    /**
     *
     * Get BLEMan sysmod info
     *
     * @returns RaftSysModInfoBLEMan
     *
     */
    async getSysModInfoBLEMan() {
        try {
            // Get SysMod Info
            const bleInfo = await this._msgHandler.sendRICRESTURL("sysmodinfo/BLEMan");
            // Debug
            RaftLog_1.default.debug(`getSysModInfoBLEMan rslt ${bleInfo.rslt} isConn ${bleInfo.isConn} paused ${bleInfo.isAdv} txBPS ${bleInfo.txBPS} rxBPS ${bleInfo.rxBPS}`);
            // Check for test rate
            if ("tBPS" in bleInfo) {
                RaftLog_1.default.debug(`getSysModInfoBLEMan testMsgs ${bleInfo.tM} testBytes ${bleInfo.tB} testRateBytesPS ${bleInfo.tBPS}`);
            }
            return bleInfo;
        }
        catch (error) {
            RaftLog_1.default.debug(`getSysModInfoBLEMan sysmodinfo/BLEMan failed ${error}`);
        }
        return null;
    }
    /**
     * Get hostname of connected WiFi
     *
     *  @return string - hostname of connected WiFi
     *
     */
    _getHostnameFromFriendlyName() {
        const friendlyName = this.getFriendlyName();
        if (!friendlyName) {
            return this._defaultWiFiHostname;
        }
        let hostname = friendlyName.friendlyName;
        hostname = hostname === null || hostname === void 0 ? void 0 : hostname.replace(/ /g, "-");
        hostname = hostname.replace(/\W+/g, "");
        return hostname;
    }
    /**
     * Get Wifi connection status
     *
     *  @return boolean - true if connected
     *
     */
    async getWiFiConnStatus() {
        try {
            // Get status
            const ricSysModInfoWiFi = await this._msgHandler.sendRICRESTURL("sysmodinfo/NetMan");
            RaftLog_1.default.debug(`wifiConnStatus rslt ${ricSysModInfoWiFi.rslt} isConn ${ricSysModInfoWiFi.isConn} paused ${ricSysModInfoWiFi.isPaused}`);
            // Check status indicates WiFi connected
            if (ricSysModInfoWiFi.rslt === "ok") {
                this._wifiConnStatus.connState =
                    ricSysModInfoWiFi.isConn !== 0
                        ? RaftWifiTypes_1.RaftWifiConnState.WIFI_CONN_CONNECTED
                        : RaftWifiTypes_1.RaftWifiConnState.WIFI_CONN_NONE;
                this._wifiConnStatus.isPaused = ricSysModInfoWiFi.isPaused !== 0;
                this._wifiConnStatus.ipAddress = ricSysModInfoWiFi.IP;
                this._wifiConnStatus.hostname = ricSysModInfoWiFi.Hostname;
                this._wifiConnStatus.ssid = ricSysModInfoWiFi.SSID;
                this._wifiConnStatus.bssid = ricSysModInfoWiFi.WiFiMAC;
                this._wifiConnStatus.validMs = Date.now();
                return (ricSysModInfoWiFi.isConn !== 0 || ricSysModInfoWiFi.isPaused !== 0);
            }
        }
        catch (error) {
            RaftLog_1.default.debug(`[DEBUG]: wifiConnStatus sysmodinfo failed ${error}`);
            this._wifiConnStatus.validMs = 0;
        }
        this._wifiConnStatus.connState = RaftWifiTypes_1.RaftWifiConnState.WIFI_CONN_NONE;
        this._wifiConnStatus.isPaused = false;
        return null;
    }
    // Mark: WiFi Connection ------------------------------------------------------------------------------------
    /**
     * pause Wifi connection
     *
     *  @param boolean - true to pause, false to resume
     *  @return boolean - true if successful
     *
     */
    async pauseWifiConnection(pause) {
        try {
            if (pause) {
                await this._msgHandler.sendRICRESTURL("wifipause/pause");
            }
            else {
                await this._msgHandler.sendRICRESTURL("wifipause/resume");
            }
        }
        catch (error) {
            RaftLog_1.default.debug(`RaftSystemUtils wifiConnect wifi pause ${error}`);
            return true;
        }
        return false;
    }
    /**
     * Connect to WiFi
     *
     *  @param string - WiFi SSID
     *  @param string - WiFi password
     *  @return boolean - true if successful
     *
     */
    async wifiConnect(ssid, password) {
        RaftLog_1.default.debug(`RaftSystemUtils Connect to WiFi ${ssid} password ${password}`);
        // Issue the command to connect WiFi
        try {
            const RaftRESTURL_wifiCredentials = "w/" +
                ssid +
                "/" +
                password +
                "/" +
                this._getHostnameFromFriendlyName();
            RaftLog_1.default.debug(`wifiConnect attempting to connect to wifi ${RaftRESTURL_wifiCredentials}`);
            await this._msgHandler.sendRICRESTURL(RaftRESTURL_wifiCredentials);
        }
        catch (error) {
            RaftLog_1.default.debug(`RaftSystemUtils wifiConnect failed ${error}`);
            return false;
        }
        // Wait until connected, timed-out or failed
        for (let timeoutCount = 0; timeoutCount < this._maxSecsToWaitForWiFiConn; timeoutCount++) {
            // Wait a little before checking
            await new Promise((resolve) => setTimeout(resolve, 1000));
            // Get status info
            const connStat = await this.getWiFiConnStatus();
            RaftLog_1.default.debug(`RaftSystemUtils wifiConnect connStat ${connStat}`);
            if (connStat) {
                return true;
            }
        }
        return false;
    }
    /**
     * Disconnect WiFi
     *
     *  @return boolean - true if successful
     *
     */
    async wifiDisconnect() {
        try {
            RaftLog_1.default.debug(`RaftSystemUtils wifiDisconnect clearing wifi info`);
            await this._msgHandler.sendRICRESTURL("wc");
            this.getWiFiConnStatus();
            return true;
        }
        catch (error) {
            RaftLog_1.default.debug(`RaftSystemUtils wifiDisconnect clearing unsuccessful`);
        }
        return false;
    }
    // Mark: WiFi Scan ------------------------------------------------------------------------------------
    /**
     *  WiFiScan start
     *
     *  @return boolean - true if successful
     *
     */
    async wifiScanStart() {
        try {
            RaftLog_1.default.debug(`RaftSystemUtils wifiScanStart`);
            await this._msgHandler.sendRICRESTURL("wifiscan/start");
            return true;
        }
        catch (error) {
            RaftLog_1.default.debug(`RaftSystemUtils wifiScanStart unsuccessful`);
        }
        return false;
    }
    /**
     *  WiFiScan get results
     *
     *  @return boolean - false if unsuccessful, otherwise the results of the promise
     *
     */
    async wifiScanResults() {
        try {
            RaftLog_1.default.debug(`RaftSystemUtils wifiScanResults`);
            return this._msgHandler.sendRICRESTURL("wifiscan/results");
        }
        catch (error) {
            RaftLog_1.default.debug(`RaftSystemUtils wifiScanResults unsuccessful`);
        }
        return false;
    }
    getCachedSystemInfo() {
        return this._systemInfo;
    }
    getCachedRaftName() {
        return this._friendlyName;
    }
    getCachedWifiStatus() {
        return this._wifiConnStatus;
    }
}
exports.default = RaftSystemUtils;
//# sourceMappingURL=RaftSystemUtils.js.map