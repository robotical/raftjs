"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftMsgHandler
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
exports.RaftMsgResultCode = void 0;
const tslib_1 = require("tslib");
const RaftMsgTrackInfo_1 = require("./RaftMsgTrackInfo");
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftUtils_1 = tslib_1.__importDefault(require("./RaftUtils"));
const RaftProtocolDefs_1 = require("./RaftProtocolDefs");
const RaftMiniHDLC_1 = tslib_1.__importDefault(require("./RaftMiniHDLC"));
// Message results
var RaftMsgResultCode;
(function (RaftMsgResultCode) {
    RaftMsgResultCode[RaftMsgResultCode["MESSAGE_RESULT_TIMEOUT"] = 0] = "MESSAGE_RESULT_TIMEOUT";
    RaftMsgResultCode[RaftMsgResultCode["MESSAGE_RESULT_OK"] = 1] = "MESSAGE_RESULT_OK";
    RaftMsgResultCode[RaftMsgResultCode["MESSAGE_RESULT_FAIL"] = 2] = "MESSAGE_RESULT_FAIL";
    RaftMsgResultCode[RaftMsgResultCode["MESSAGE_RESULT_UNKNOWN"] = 3] = "MESSAGE_RESULT_UNKNOWN";
})(RaftMsgResultCode || (exports.RaftMsgResultCode = RaftMsgResultCode = {}));
class RaftMsgHandler {
    // Constructor
    constructor(commsStats) {
        // Message numbering and tracking
        this._currentMsgNumber = 1;
        this._currentMsgHandle = 1;
        this._msgTrackInfos = new Array(RaftMsgTrackInfo_1.RaftMsgTrackInfo.MAX_MSG_NUM + 1);
        this._msgTrackTimerMs = 50;
        this._msgTrackLastCheckIdx = 0;
        // report message callback dictionary. Add a callback to subscribe to report messages
        this._reportMsgCallbacks = new Map();
        // Interface to inform of message results
        this._msgResultHandler = null;
        // Interface to send messages
        this._msgSender = null;
        this._commsStats = commsStats;
        RaftLog_1.default.debug('RaftMsgHandler constructor');
        // Message tracking
        for (let i = 0; i < this._msgTrackInfos.length; i++) {
            this._msgTrackInfos[i] = new RaftMsgTrackInfo_1.RaftMsgTrackInfo();
        }
        // Timer for checking messages
        setTimeout(async () => {
            this._onMsgTrackTimer(true);
        }, this._msgTrackTimerMs);
        // HDLC used to encode/decode the RICREST protocol
        this._miniHDLC = new RaftMiniHDLC_1.default();
        this._miniHDLC.setOnRxFrame(this._onHDLCFrameDecode.bind(this));
    }
    registerForResults(msgResultHandler) {
        this._msgResultHandler = msgResultHandler;
    }
    registerMsgSender(RaftMessageSender) {
        this._msgSender = RaftMessageSender;
    }
    handleNewRxMsg(rxMsg) {
        this._miniHDLC.addRxBytes(rxMsg);
        // RaftLog.verbose(`handleNewRxMsg len ${rxMsg.length} ${RaftUtils.bufferToHex(rxMsg)}`)
    }
    reportMsgCallbacksSet(callbackName, callback) {
        this._reportMsgCallbacks.set(callbackName, callback);
    }
    reportMsgCallbacksDelete(callbackName) {
        this._reportMsgCallbacks.delete(callbackName);
    }
    _onHDLCFrameDecode(rxMsg, frameTimeMs) {
        var _a, _b;
        // Add to stats
        this._commsStats.msgRx();
        // Validity
        if (rxMsg.length < RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS) {
            this._commsStats.msgTooShort();
            return;
        }
        // RaftLog.verbose(`_onHDLCFrameDecode len ${rxMsg.length}`);
        // Decode the RICFrame header
        let rxMsgNum = rxMsg[RaftProtocolDefs_1.RICSERIAL_MSG_NUM_POS] & 0xff;
        let rxProtocol = rxMsg[RaftProtocolDefs_1.RICSERIAL_PROTOCOL_POS] & 0x3f;
        let rxMsgType = (rxMsg[RaftProtocolDefs_1.RICSERIAL_PROTOCOL_POS] >> 6) & 0x03;
        // Check for RICREST bridging protocol
        if (rxProtocol == RaftProtocolDefs_1.RaftCommsMsgProtocol.MSG_PROTOCOL_BRIDGE_RICREST) {
            // Debug
            const bridgeID = rxMsg.length > RaftProtocolDefs_1.RICREST_BRIDGE_ID_POS ? rxMsg[RaftProtocolDefs_1.RICREST_BRIDGE_ID_POS] : 0;
            RaftLog_1.default.info(`_onHDLCFrameDecode RICREST bridge rx bridgeID ${bridgeID} len ${rxMsg.length}`);
            // Simply remove the wrapper
            rxMsg = rxMsg.slice(RaftProtocolDefs_1.RICREST_BRIDGE_PAYLOAD_POS);
            // Get the message info from the unwrapped message
            rxMsgNum = rxMsg[RaftProtocolDefs_1.RICSERIAL_MSG_NUM_POS] & 0xff;
            rxProtocol = rxMsg[RaftProtocolDefs_1.RICSERIAL_PROTOCOL_POS] & 0x3f;
            rxMsgType = (rxMsg[RaftProtocolDefs_1.RICSERIAL_PROTOCOL_POS] >> 6) & 0x03;
        }
        // Check for RICREST protocol
        if (rxProtocol == RaftProtocolDefs_1.RaftCommsMsgProtocol.MSG_PROTOCOL_RICREST) {
            RaftLog_1.default.verbose(`_onHDLCFrameDecode RICREST rx msgNum ${rxMsgNum} msgDirn ${rxMsgType} ${RaftUtils_1.default.bufferToHex(rxMsg)}`);
            // Extract payload
            const ricRestElemCode = rxMsg[RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS + RaftProtocolDefs_1.RICREST_REST_ELEM_CODE_POS] & 0xff;
            if (ricRestElemCode == RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_URL ||
                ricRestElemCode == RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_CMDRESPJSON ||
                ricRestElemCode == RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME) {
                // These are all text-based messages
                const restStr = RaftUtils_1.default.getStringFromBuffer(rxMsg, RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS + RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS, rxMsg.length - RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS - RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS - 1);
                RaftLog_1.default.verbose(`_onHDLCFrameDecode RICREST rx elemCode ${ricRestElemCode} ${restStr}`);
                // Check message types
                if (rxMsgType == RaftProtocolDefs_1.RaftCommsMsgTypeCode.MSG_TYPE_RESPONSE) {
                    // Handle response messages
                    this._handleResponseMessages(restStr, rxMsgNum);
                }
                else if (rxMsgType == RaftProtocolDefs_1.RaftCommsMsgTypeCode.MSG_TYPE_REPORT) {
                    // Handle report messages
                    this._handleReportMessages(restStr);
                }
            }
            else {
                const binMsgLen = rxMsg.length - RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS - RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS;
                RaftLog_1.default.verbose(`_onHDLCFrameDecode RICREST rx binary message elemCode ${ricRestElemCode} len ${binMsgLen} data ${RaftUtils_1.default.bufferToHex(rxMsg)}`);
                if (ricRestElemCode == RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_FILEBLOCK) {
                    const filePos = RaftUtils_1.default.getBEUint32FromBuf(rxMsg, RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS + RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS + RaftProtocolDefs_1.RICREST_FILEBLOCK_FILEPOS_POS);
                    (_a = this._msgResultHandler) === null || _a === void 0 ? void 0 : _a.onRxFileBlock(filePos, rxMsg.slice(RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS + RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS + RaftProtocolDefs_1.RICREST_FILEBLOCK_PAYLOAD_POS, rxMsg.length));
                }
            }
            // Other message types
        }
        else {
            (_b = this._msgResultHandler) === null || _b === void 0 ? void 0 : _b.onRxOtherMsgType(rxMsg, frameTimeMs);
        }
    }
    _handleResponseMessages(restStr, rxMsgNum) {
        try {
            let msgRsltCode = RaftMsgResultCode.MESSAGE_RESULT_UNKNOWN;
            const msgRsltJsonObj = JSON.parse(restStr);
            if ('rslt' in msgRsltJsonObj) {
                const rsltStr = msgRsltJsonObj.rslt.toLowerCase();
                if (rsltStr === 'ok') {
                    RaftLog_1.default.verbose(`_handleResponseMessages RICREST rslt Ok ${rxMsgNum == 0 ? "unnumbered" : "msgNum " + rxMsgNum.toString()} resp ${msgRsltJsonObj.rslt}`);
                    msgRsltCode = RaftMsgResultCode.MESSAGE_RESULT_OK;
                }
                else if (rsltStr === 'fail') {
                    msgRsltCode = RaftMsgResultCode.MESSAGE_RESULT_FAIL;
                    RaftLog_1.default.warn(`_handleResponseMessages RICREST rslt fail ${rxMsgNum == 0 ? "unnumbered" : "msgNum " + rxMsgNum.toString()} resp ${restStr}`);
                }
                else {
                    RaftLog_1.default.warn(`_handleResponseMessages RICREST rslt not recognized ${rxMsgNum == 0 ? "unnumbered" : "msgNum " + rxMsgNum.toString()}resp ${restStr}`);
                }
            }
            else {
                RaftLog_1.default.warn(`_handleResponseMessages RICREST response doesn't contain rslt ${rxMsgNum == 0 ? "unnumbered" : "msgNum " + rxMsgNum.toString()}resp ${restStr}`);
            }
            // Handle matching of request and response
            this.msgTrackingRxRespMsg(rxMsgNum, msgRsltCode, msgRsltJsonObj);
        }
        catch (excp) {
            if (excp instanceof Error) {
                RaftLog_1.default.warn(`_handleResponseMessages Failed to parse JSON ${rxMsgNum == 0 ? "unnumbered" : "msgNum " + rxMsgNum.toString()} JSON STR ${restStr} resp ${excp.toString()}`);
            }
        }
    }
    _handleReportMessages(restStr) {
        try {
            const reportMsg = JSON.parse(restStr);
            reportMsg.timeReceived = Date.now();
            RaftLog_1.default.debug(`_handleReportMessages ${JSON.stringify(reportMsg)}`);
            this._reportMsgCallbacks.forEach((callback) => callback(reportMsg));
        }
        catch (excp) {
            if (excp instanceof Error) {
                RaftLog_1.default.warn(`_handleReportMessages Failed to parse JSON report ${excp.toString()}`);
            }
        }
    }
    async sendRICRESTURL(cmdStr, bridgeID = undefined, msgTimeoutMs = undefined) {
        // Send
        return this.sendRICREST(cmdStr, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_URL, bridgeID, msgTimeoutMs);
    }
    async sendRICRESTCmdFrame(cmdStr, bridgeID = undefined, msgTimeoutMs = undefined) {
        // Send
        return this.sendRICREST(cmdStr, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME, bridgeID, msgTimeoutMs);
    }
    async sendRICREST(cmdStr, ricRESTElemCode, bridgeID = undefined, msgTimeoutMs = undefined) {
        // Put cmdStr into buffer
        const cmdStrTerm = new Uint8Array(cmdStr.length + 1);
        RaftUtils_1.default.addStringToBuffer(cmdStrTerm, cmdStr, 0);
        cmdStrTerm[cmdStrTerm.length - 1] = 0;
        // Send
        return this.sendRICRESTBytes(cmdStrTerm, ricRESTElemCode, true, bridgeID, msgTimeoutMs);
    }
    async sendRICRESTNoResp(cmdStr, ricRESTElemCode, bridgeID = undefined) {
        // Check there is a sender
        if (!this._msgSender) {
            return false;
        }
        // Put cmdStr into buffer
        const cmdBytes = new Uint8Array(cmdStr.length + 1);
        RaftUtils_1.default.addStringToBuffer(cmdBytes, cmdStr, 0);
        cmdBytes[cmdBytes.length - 1] = 0;
        // Form message
        const cmdMsg = new Uint8Array(cmdBytes.length + RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS);
        cmdMsg[RaftProtocolDefs_1.RICREST_REST_ELEM_CODE_POS] = ricRESTElemCode;
        cmdMsg.set(cmdBytes, RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS);
        // Frame the message
        let framedMsg = this.frameCommsMsg(cmdMsg, RaftProtocolDefs_1.RaftCommsMsgTypeCode.MSG_TYPE_COMMAND, RaftProtocolDefs_1.RaftCommsMsgProtocol.MSG_PROTOCOL_RICREST, true);
        // Wrap if bridged
        if (bridgeID !== undefined) {
            framedMsg = this.bridgeCommsMsg(framedMsg, bridgeID);
        }
        // Encode like HDLC
        const encodedMsg = this._miniHDLC.encode(framedMsg);
        // Send
        if (!await this._msgSender.sendTxMsg(encodedMsg, false)) {
            RaftLog_1.default.warn(`sendRICRESTNoResp failed to send message`);
            this._commsStats.recordMsgNoConnection();
        }
        return true;
    }
    async sendRICRESTBytes(cmdBytes, ricRESTElemCode, withResponse, bridgeID = undefined, msgTimeoutMs = undefined) {
        // Form message
        const cmdMsg = new Uint8Array(cmdBytes.length + RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS);
        cmdMsg[RaftProtocolDefs_1.RICREST_REST_ELEM_CODE_POS] = ricRESTElemCode;
        cmdMsg.set(cmdBytes, RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS);
        // Send
        return this.sendMsgAndWaitForReply(cmdMsg, RaftProtocolDefs_1.RaftCommsMsgTypeCode.MSG_TYPE_COMMAND, RaftProtocolDefs_1.RaftCommsMsgProtocol.MSG_PROTOCOL_RICREST, withResponse, bridgeID, msgTimeoutMs);
    }
    async sendMsgAndWaitForReply(msgPayload, msgDirection, msgProtocol, withResponse, bridgeID = undefined, msgTimeoutMs) {
        // Check there is a sender
        if (!this._msgSender) {
            throw new Error('sendMsgAndWaitForReply failed no sender');
        }
        // Frame the message
        let framedMsg = this.frameCommsMsg(msgPayload, msgDirection, msgProtocol, true);
        // Wrap if bridged
        if (bridgeID !== undefined) {
            framedMsg = this.bridgeCommsMsg(framedMsg, bridgeID);
            // RaftLog.debug(`sendMsgAndWaitForReply - bridged idx ${bridgeID}`)
        }
        else {
            // RaftLog.debug(`sendMsgAndWaitForReply - not bridged`)
        }
        // Encode like HDLC
        const encodedMsg = this._miniHDLC.encode(framedMsg);
        // Debug
        // RaftLog.debug(
        //   `sendMsgAndWaitForReply ${RaftUtils.bufferToHex(encodedMsg)}`,
        // );
        // Return a promise that will be resolved when a reply is received or timeout occurs
        const promise = new Promise((resolve, reject) => {
            // Update message tracking
            this.msgTrackingTxCmdMsg(encodedMsg, withResponse, bridgeID, msgTimeoutMs, resolve, reject);
            this._currentMsgHandle++;
        });
        return promise;
    }
    frameCommsMsg(msgPayload, msgDirection, msgProtocol, isNumbered) {
        // Header
        const msgBuf = new Uint8Array(msgPayload.length + RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS);
        msgBuf[RaftProtocolDefs_1.RICSERIAL_MSG_NUM_POS] = isNumbered ? this._currentMsgNumber & 0xff : 0;
        msgBuf[RaftProtocolDefs_1.RICSERIAL_PROTOCOL_POS] = (msgDirection << 6) + msgProtocol;
        // Payload
        msgBuf.set(msgPayload, RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS);
        // Return framed message
        return msgBuf;
    }
    bridgeCommsMsg(msgBuf, bridgeID) {
        // 
        const bridgedMsg = new Uint8Array(msgBuf.length + RaftProtocolDefs_1.RICREST_BRIDGE_PAYLOAD_POS);
        // Bridged messages are unnumbered (msgNum == 0)
        bridgedMsg[RaftProtocolDefs_1.RICSERIAL_MSG_NUM_POS] = 0;
        bridgedMsg[RaftProtocolDefs_1.RICSERIAL_PROTOCOL_POS] = (RaftProtocolDefs_1.RaftCommsMsgTypeCode.MSG_TYPE_COMMAND << 6) + RaftProtocolDefs_1.RaftCommsMsgProtocol.MSG_PROTOCOL_BRIDGE_RICREST;
        bridgedMsg[RaftProtocolDefs_1.RICREST_BRIDGE_ID_POS] = bridgeID;
        bridgedMsg.set(msgBuf, RaftProtocolDefs_1.RICREST_BRIDGE_PAYLOAD_POS);
        return bridgedMsg;
    }
    msgTrackingTxCmdMsg(msgFrame, withResponse, bridgeID = undefined, msgTimeoutMs, resolve, reject) {
        // Record message re-use of number
        if (this._msgTrackInfos[this._currentMsgNumber].msgOutstanding) {
            this._commsStats.recordMsgNumCollision();
        }
        // Set tracking info
        this._msgTrackInfos[this._currentMsgNumber].set(true, msgFrame, withResponse, bridgeID, this._currentMsgHandle, msgTimeoutMs, resolve, reject);
        // Debug
        RaftLog_1.default.debug(`msgTrackingTxCmdMsg msgNum ${this._currentMsgNumber} bridgeID ${bridgeID} msg ${RaftUtils_1.default.bufferToHex(msgFrame)} msgOutstanding ${this._msgTrackInfos[this._currentMsgNumber].msgOutstanding}`);
        // Stats
        this._commsStats.msgTx();
        // Bump msg number
        if (this._currentMsgNumber == RaftMsgTrackInfo_1.RaftMsgTrackInfo.MAX_MSG_NUM) {
            this._currentMsgNumber = 1;
        }
        else {
            this._currentMsgNumber++;
        }
    }
    msgTrackingRxRespMsg(msgNum, msgRsltCode, msgRsltJsonObj) {
        // Check message number
        if (msgNum == 0) {
            // Callback on unnumbered message
            if (this._msgResultHandler !== null)
                this._msgResultHandler.onRxUnnumberedMsg(msgRsltJsonObj);
            return;
        }
        if (msgNum > RaftMsgTrackInfo_1.RaftMsgTrackInfo.MAX_MSG_NUM) {
            RaftLog_1.default.warn('msgTrackingRxRespMsg msgNum > 255');
            return;
        }
        if (!this._msgTrackInfos[msgNum].msgOutstanding) {
            RaftLog_1.default.warn(`msgTrackingRxRespMsg unmatched msgNum ${msgNum}`);
            this._commsStats.recordMsgNumUnmatched();
            return;
        }
        // Handle message
        RaftLog_1.default.verbose(`msgTrackingRxRespMsg Message response received msgNum ${msgNum}`);
        this._commsStats.recordMsgResp(Date.now() - this._msgTrackInfos[msgNum].msgSentMs);
        this._msgCompleted(msgNum, msgRsltCode, msgRsltJsonObj);
    }
    _msgCompleted(msgNum, msgRsltCode, msgRsltObj) {
        // Lookup message in tracking
        const msgHandle = this._msgTrackInfos[msgNum].msgHandle;
        this._msgTrackInfos[msgNum].msgOutstanding = false;
        // Check if message result handler should be informed
        if (this._msgResultHandler !== null) {
            this._msgResultHandler.onRxReply(msgHandle, msgRsltCode, msgRsltObj);
        }
        // Handle reply
        // if (msgRsltCode === RaftMsgResultCode.MESSAGE_RESULT_OK) {
        const resolve = this._msgTrackInfos[msgNum].resolve;
        if (resolve) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            RaftLog_1.default.debug(`_msgCompleted msgNum ${msgNum} result ${msgRsltCode.toString()} ${JSON.stringify(msgRsltObj)}`);
            resolve(msgRsltObj);
        }
        // } else {
        //   const reject = this._msgTrackInfos[msgNum].reject;
        //   if (reject) {
        //     // eslint-disable-next-line @typescript-eslint/no-explicit-any
        //     try {
        //       RaftLog.debug(`_msgCompleted reject rsltCode ${msgRsltCode}`);
        //       // (reject as any)(new Error(`Message failed msgNum ${msgNum} rslt ${msgRsltCode}`));
        //     } catch (excp: unknown) {
        //       RaftLog.warn(`_msgCompleted reject ${excp}`);
        //     }
        //   }
        // }
        // No longer waiting for reply
        this._msgTrackInfos[msgNum].resolve = null;
        this._msgTrackInfos[msgNum].reject = null;
    }
    // Check message timeouts
    async _onMsgTrackTimer(chainRecall) {
        if (this._msgSender !== null) {
            // Handle message tracking
            for (let loopIdx = 0; loopIdx < this._msgTrackInfos.length; loopIdx++) {
                // Index to check
                const checkIdx = this._msgTrackLastCheckIdx;
                this._msgTrackLastCheckIdx = (checkIdx + 1) % this._msgTrackInfos.length;
                // Check if message is outstanding
                if (!this._msgTrackInfos[checkIdx].msgOutstanding)
                    continue;
                // Get message timeout and ensure valid
                let msgTimeoutMs = this._msgTrackInfos[checkIdx].msgTimeoutMs;
                if (msgTimeoutMs === undefined) {
                    msgTimeoutMs = RaftMsgTrackInfo_1.RaftMsgTrackInfo.MSG_RESPONSE_TIMEOUT_MS;
                }
                // Check for timeout (or never sent)
                if ((this._msgTrackInfos[checkIdx].retryCount === 0) || (Date.now() > this._msgTrackInfos[checkIdx].msgSentMs + (msgTimeoutMs * (this._msgTrackInfos[checkIdx].retryCount)))) {
                    // Debug
                    RaftLog_1.default.debug(`msgTrackTimer msgNum ${checkIdx} ${this._msgTrackInfos[checkIdx].retryCount === 0 ? 'first send' : 'timeout - retrying'} ${RaftUtils_1.default.bufferToHex(this._msgTrackInfos[checkIdx].msgFrame)}`);
                    // RaftLog.verbose(`msgTrackTimer msg ${RaftUtils.bufferToHex(this._msgTrackInfos[i].msgFrame)}`);
                    // Handle timeout (or first send)
                    if (this._msgTrackInfos[checkIdx].retryCount < RaftMsgTrackInfo_1.RaftMsgTrackInfo.MSG_RETRY_COUNT) {
                        this._msgTrackInfos[checkIdx].retryCount++;
                        try {
                            // Send the message
                            if (!await this._msgSender.sendTxMsg(this._msgTrackInfos[checkIdx].msgFrame, this._msgTrackInfos[checkIdx].withResponse)) {
                                RaftLog_1.default.warn(`msgTrackTimer Message send failed msgNum ${checkIdx} ${RaftUtils_1.default.bufferToHex(this._msgTrackInfos[checkIdx].msgFrame)}`);
                                this._msgCompleted(checkIdx, RaftMsgResultCode.MESSAGE_RESULT_FAIL, null);
                                this._commsStats.recordMsgNoConnection();
                            }
                            // Message sent ok so break here
                            break;
                        }
                        catch (error) {
                            RaftLog_1.default.warn(`Retry message failed ${error}`);
                        }
                        this._commsStats.recordMsgRetry();
                        this._msgTrackInfos[checkIdx].msgSentMs = Date.now();
                    }
                    else {
                        RaftLog_1.default.warn(`msgTrackTimer TIMEOUT msgNum ${checkIdx} after ${RaftMsgTrackInfo_1.RaftMsgTrackInfo.MSG_RETRY_COUNT} retries ${RaftUtils_1.default.bufferToHex(this._msgTrackInfos[checkIdx].msgFrame)}`);
                        this._msgCompleted(checkIdx, RaftMsgResultCode.MESSAGE_RESULT_TIMEOUT, null);
                        this._commsStats.recordMsgTimeout();
                    }
                }
            }
        }
        // Call again if required
        if (chainRecall) {
            setTimeout(async () => {
                this._onMsgTrackTimer(true);
            }, this._msgTrackTimerMs);
        }
    }
    encodeFileStreamBlock(blockContents, blockStart, streamID) {
        // Create entire message buffer (including protocol wrappers)
        const msgBuf = new Uint8Array(blockContents.length + 4 + RaftProtocolDefs_1.RICREST_HEADER_PAYLOAD_POS + RaftProtocolDefs_1.RICSERIAL_PAYLOAD_POS);
        let msgBufPos = 0;
        // RICSERIAL protocol
        msgBuf[msgBufPos++] = 0; // not numbered
        msgBuf[msgBufPos++] =
            (RaftProtocolDefs_1.RaftCommsMsgTypeCode.MSG_TYPE_COMMAND << 6) +
                RaftProtocolDefs_1.RaftCommsMsgProtocol.MSG_PROTOCOL_RICREST;
        // RICREST protocol
        msgBuf[msgBufPos++] = RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_FILEBLOCK;
        // Header
        msgBuf[msgBufPos++] = streamID & 0xff;
        msgBuf[msgBufPos++] = (blockStart >> 16) & 0xff;
        msgBuf[msgBufPos++] = (blockStart >> 8) & 0xff;
        msgBuf[msgBufPos++] = blockStart & 0xff;
        // Copy block info
        msgBuf.set(blockContents, msgBufPos);
        return msgBuf;
    }
    async sendFileBlock(blockContents, blockStart) {
        const msgBuf = this.encodeFileStreamBlock(blockContents, blockStart, 0);
        // // Debug
        // RaftLog.debug(
        //   `sendFileBlock frameLen ${msgBuf.length} start ${blockStart} end ${blockEnd} len ${blockLen}`,
        // );
        // Send
        try {
            // Send
            if (this._msgSender) {
                // Wrap into HDLC
                const framedMsg = this._miniHDLC.encode(msgBuf);
                // Send
                return this._msgSender.sendTxMsg(framedMsg, true);
            }
        }
        catch (error) {
            RaftLog_1.default.warn(`RaftMsgHandler sendFileBlock error${error}`);
        }
        return false;
    }
    async sendStreamBlock(blockContents, blockStart, streamID) {
        // Ensure any waiting messages are sent first
        await this._onMsgTrackTimer(false);
        // Encode message
        const msgBuf = this.encodeFileStreamBlock(blockContents, blockStart, streamID);
        // // Debug
        // RaftLog.debug(
        //   `sendStreamBlock frameLen ${msgBuf.length} start ${blockStart} end ${blockEnd} len ${blockLen}`,
        // );
        // Send
        try {
            // Send
            if (this._msgSender) {
                // Wrap into HDLC
                const framedMsg = this._miniHDLC.encode(msgBuf);
                // Send
                return await this._msgSender.sendTxMsg(framedMsg, true);
            }
        }
        catch (error) {
            RaftLog_1.default.warn(`RaftMsgHandler sendStreamBlock error${error}`);
        }
        return false;
    }
    async createCommsBridge(bridgeSource, bridgeName, idleCloseSecs = 0) {
        // Establish a bridge
        return await this.sendRICRESTURL(`commandserial/bridge/setup?port=${bridgeSource}&name=${bridgeName}&idleCloseSecs=${idleCloseSecs}`);
    }
    async removeCommsBridge(bridgeID) {
        // Remove a bridge
        return await this.sendRICRESTURL(`commandserial/bridge/remove?id=${bridgeID}`);
    }
}
exports.default = RaftMsgHandler;
//# sourceMappingURL=RaftMsgHandler.js.map