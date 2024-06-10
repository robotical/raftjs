"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftWifiTypes
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftSysModInfoWiFi = exports.RaftWifiConnStatus = exports.RaftWifiConnState = void 0;
var RaftWifiConnState;
(function (RaftWifiConnState) {
    RaftWifiConnState[RaftWifiConnState["WIFI_CONN_NONE"] = 0] = "WIFI_CONN_NONE";
    RaftWifiConnState[RaftWifiConnState["WIFI_CONN_CONNECTED"] = 1] = "WIFI_CONN_CONNECTED";
})(RaftWifiConnState || (exports.RaftWifiConnState = RaftWifiConnState = {}));
class RaftWifiConnStatus {
    constructor() {
        this.connState = RaftWifiConnState.WIFI_CONN_NONE;
        this.isPaused = false;
        this.ipAddress = '';
        this.hostname = '';
        this.ssid = '';
        this.bssid = '';
        this.validMs = 0;
    }
}
exports.RaftWifiConnStatus = RaftWifiConnStatus;
class RaftSysModInfoWiFi {
    constructor() {
        this.rslt = 'ok';
        this.isConn = 0;
        this.isPaused = 0;
        this.connState = 'None';
        this.SSID = '';
        this.IP = '';
        this.Hostname = '';
        this.WiFiMAC = '';
    }
}
exports.RaftSysModInfoWiFi = RaftSysModInfoWiFi;
//# sourceMappingURL=RaftWifiTypes.js.map