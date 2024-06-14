"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftMsgTrackInfo
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftMsgTrackInfo = void 0;
class RaftMsgTrackInfo {
    constructor() {
        this.msgOutstanding = false;
        this.msgFrame = new Uint8Array();
        this.msgSentMs = 0;
        this.retryCount = 0;
        this.withResponse = false;
        this.bridgeID = undefined;
        this.msgHandle = 0;
        this.msgTimeoutMs = undefined;
        this.msgOutstanding = false;
    }
    set(msgOutstanding, msgFrame, withResponse, bridgeID = undefined, msgHandle, msgTimeoutMs, resolve, reject) {
        this.msgOutstanding = msgOutstanding;
        this.msgFrame = msgFrame;
        this.retryCount = 0;
        this.msgSentMs = Date.now();
        this.withResponse = withResponse;
        this.bridgeID = bridgeID;
        this.msgHandle = msgHandle;
        this.msgTimeoutMs = msgTimeoutMs;
        this.resolve = resolve;
        this.reject = reject;
    }
}
exports.RaftMsgTrackInfo = RaftMsgTrackInfo;
RaftMsgTrackInfo.MAX_MSG_NUM = 255;
RaftMsgTrackInfo.MSG_RESPONSE_TIMEOUT_MS = 2000;
RaftMsgTrackInfo.MSG_RETRY_COUNT = 5;
//# sourceMappingURL=RaftMsgTrackInfo.js.map