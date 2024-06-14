"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftTypes
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftFileDownloadResult = exports.RaftSysModInfoBLEMan = exports.RaftFileList = exports.RaftHWFWUpdRslt = exports.RaftHWFWStat = exports.RaftReportMsg = exports.RaftOKFail = exports.RaftCalibInfo = exports.RaftSystemInfo = exports.RaftFriendlyName = exports.RaftStreamType = exports.RaftFileSendType = exports.RaftPublishEventNames = exports.RaftPublishEvent = void 0;
var RaftPublishEvent;
(function (RaftPublishEvent) {
    RaftPublishEvent[RaftPublishEvent["PUBLISH_EVENT_DATA"] = 0] = "PUBLISH_EVENT_DATA";
})(RaftPublishEvent || (exports.RaftPublishEvent = RaftPublishEvent = {}));
exports.RaftPublishEventNames = {
    [RaftPublishEvent.PUBLISH_EVENT_DATA]: 'PUBLISH_EVENT_DATA'
};
var RaftFileSendType;
(function (RaftFileSendType) {
    RaftFileSendType[RaftFileSendType["NORMAL_FILE"] = 0] = "NORMAL_FILE";
    RaftFileSendType[RaftFileSendType["FIRMWARE_UPDATE"] = 1] = "FIRMWARE_UPDATE";
})(RaftFileSendType || (exports.RaftFileSendType = RaftFileSendType = {}));
var RaftStreamType;
(function (RaftStreamType) {
    RaftStreamType[RaftStreamType["REAL_TIME_STREAM"] = 0] = "REAL_TIME_STREAM";
})(RaftStreamType || (exports.RaftStreamType = RaftStreamType = {}));
class RaftFriendlyName {
    constructor() {
        this.friendlyName = '';
        this.friendlyNameIsSet = false;
        this.req = '';
        this.rslt = 'commsFail';
        this.validMs = 0;
    }
}
exports.RaftFriendlyName = RaftFriendlyName;
class RaftSystemInfo {
    constructor() {
        this.rslt = '';
        this.SystemName = 'Unknown';
        this.SystemVersion = '0.0.0';
        this.RicHwRevNo = 0;
        this.HwRev = "";
        this.MAC = "";
        this.SerialNo = "";
        this.validMs = 0;
        this.Friendly = "";
    }
}
exports.RaftSystemInfo = RaftSystemInfo;
class RaftCalibInfo {
    constructor() {
        this.rslt = '';
        this.calDone = 0;
        this.validMs = 0;
    }
}
exports.RaftCalibInfo = RaftCalibInfo;
class RaftOKFail {
    constructor() {
        this.RAFT_OK = 'ok';
        this.rslt = 'commsFail';
    }
    set(rsltFlag) {
        if (rsltFlag) {
            this.rslt = this.RAFT_OK;
        }
        else {
            this.rslt = 'fail';
        }
    }
    isOk() {
        return this.rslt === this.RAFT_OK;
    }
}
exports.RaftOKFail = RaftOKFail;
class RaftReportMsg {
    constructor() {
        this.rslt = '';
    }
}
exports.RaftReportMsg = RaftReportMsg;
class RaftHWFWStat {
    constructor() {
        this.s = '';
        this.m = '';
        this.v = '';
        this.n = '';
        this.p = 0;
        this.i = 0;
    }
}
exports.RaftHWFWStat = RaftHWFWStat;
class RaftHWFWUpdRslt {
    constructor() {
        this.req = '';
        this.rslt = 'commsFail';
        this.st = new RaftHWFWStat();
    }
}
exports.RaftHWFWUpdRslt = RaftHWFWUpdRslt;
class RaftFileList {
    constructor() {
        this.req = '';
        this.rslt = 'ok';
        this.fsName = 'spiffs';
        this.fsBase = '/spiffs';
        this.diskSize = 0;
        this.diskUsed = 0;
        this.folder = '/spiffs/';
        this.files = [];
    }
}
exports.RaftFileList = RaftFileList;
class RaftSysModInfoBLEMan {
    constructor() {
        this.req = '';
        this.rslt = 'ok';
        this.isConn = false;
        this.isAdv = false;
        this.advName = "";
        this.BLEMAC = "";
        this.rssi = -200;
        this.rxM = 0;
        this.rxB = 0;
        this.rxBPS = 0.0;
        this.txM = 0;
        this.txB = 0;
        this.txBPS = 0.0;
        this.txErr = 0;
        this.txErrPS = 0;
        this.tM = 0;
        this.tB = 0;
        this.tBPS = 0.0;
        this.tSeqErrs = 0;
        this.tDatErrs = 0;
    }
}
exports.RaftSysModInfoBLEMan = RaftSysModInfoBLEMan;
class RaftFileDownloadResult {
    constructor(buffer = undefined) {
        this.fileData = null;
        this.downloadedOk = false;
        if (buffer !== undefined) {
            this.fileData = buffer;
            this.downloadedOk = true;
        }
        else {
            this.fileData = null;
            this.downloadedOk = false;
        }
    }
}
exports.RaftFileDownloadResult = RaftFileDownloadResult;
//# sourceMappingURL=RaftTypes.js.map