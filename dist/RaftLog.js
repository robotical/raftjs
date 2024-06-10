"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftLog
// Communications Library
//
// Rob Dobson & Chris Greening 2020-2022
// (C) 2020-2022
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftLogLevel = void 0;
var RaftLogLevel;
(function (RaftLogLevel) {
    RaftLogLevel[RaftLogLevel["NONE"] = 0] = "NONE";
    RaftLogLevel[RaftLogLevel["ERROR"] = 1] = "ERROR";
    RaftLogLevel[RaftLogLevel["WARN"] = 2] = "WARN";
    RaftLogLevel[RaftLogLevel["INFO"] = 3] = "INFO";
    RaftLogLevel[RaftLogLevel["DEBUG"] = 4] = "DEBUG";
    RaftLogLevel[RaftLogLevel["VERBOSE"] = 5] = "VERBOSE";
})(RaftLogLevel || (exports.RaftLogLevel = RaftLogLevel = {}));
class RaftLog {
    static format(msg) {
        return (Date.now() / 1000).toFixed(3).toString() + " " + msg;
    }
    static debug(msg) {
        if (!this.doLogging(RaftLogLevel.DEBUG, msg))
            console.debug(RaftLog.format(msg));
    }
    static info(msg) {
        if (!this.doLogging(RaftLogLevel.INFO, msg))
            console.info(RaftLog.format(msg));
    }
    static warn(msg) {
        if (!this.doLogging(RaftLogLevel.WARN, msg))
            console.warn(RaftLog.format(msg));
    }
    static error(msg) {
        if (!this.doLogging(RaftLogLevel.ERROR, msg))
            console.error(RaftLog.format(msg));
    }
    static verbose(msg) {
        if (!this.doLogging(RaftLogLevel.VERBOSE, msg))
            console.debug(RaftLog.format(msg));
    }
    static setLogListener(listener) {
        this._logListener = listener;
    }
    static setLogLevel(logLevel) {
        this._logLevel = logLevel;
    }
    static doLogging(logLevel, msg) {
        if (this._logListener) {
            this._logListener(logLevel, msg);
            return true;
        }
        return this._logLevel <= logLevel;
    }
}
RaftLog._logListener = null;
RaftLog._logLevel = RaftLogLevel.DEBUG;
exports.default = RaftLog;
//# sourceMappingURL=RaftLog.js.map