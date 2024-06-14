"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RaftFileHandler
// Communications Library
//
// Rob Dobson & Chris Greening 2020-2022
// (C) 2020-2022
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftTypes_1 = require("./RaftTypes");
const RaftUtils_1 = tslib_1.__importDefault(require("./RaftUtils"));
const RaftMiniHDLC_1 = tslib_1.__importDefault(require("./RaftMiniHDLC"));
const RaftProtocolDefs_1 = require("./RaftProtocolDefs");
class FileBlockTrackInfo {
    constructor(prom) {
        this.isDone = false;
        this.prom = prom;
        this.prom.then(() => {
            // RaftLog.debug('send complete');
            this.isDone = true;
        }, rej => {
            RaftLog_1.default.debug(`FileBlockTrackInfo send rejected ${rej}`);
            this.isDone = true;
        });
    }
    isComplete() {
        return this.isDone;
    }
    get() {
        return this.prom;
    }
}
class RaftFileHandler {
    constructor(msgHandler, commsStats) {
        // Timeouts
        this.BLOCK_ACK_TIMEOUT_MS = 30000;
        // Contents of file to send
        this._requestedFileBlockSize = 500;
        this._fileBlockSize = 0;
        this._requestedBatchAckSize = 10;
        this._batchAckSize = 0;
        // File sending flow control
        this._sendWithoutBatchAcks = false;
        this._ackedFilePos = 0;
        this._batchAckReceived = false;
        this._isTxCancelled = false;
        // File receive info
        this._isRxCancelled = false;
        this._fileRxActive = false;
        this._fileRxBatchMsgSize = 0;
        this._fileRxBatchAckSize = 0;
        this._fileRxStreamID = 0;
        this._fileRxFileLen = 0;
        this._fileRxCrc16 = 0;
        this._fileRxBuffer = new Uint8Array(0);
        this._fileRxLastAckTime = 0;
        this._fileRxLastBlockTime = 0;
        this._fileRxLastAckPos = 0;
        this.OVERALL_FILE_TRANSFER_TIMEOUT_MS = 100000;
        this.FILE_RX_ACK_RESEND_TIMEOUT_MS = 1000;
        // Message await list
        this._msgAwaitList = new Array();
        this.MAX_OUTSTANDING_FILE_BLOCK_SEND_PROMISES = 1;
        this._msgHandler = msgHandler;
        this._commsStats = commsStats;
        this._fileBlockSize = this._requestedFileBlockSize;
        this.onOktoMsg = this.onOktoMsg.bind(this);
    }
    setRequestedFileBlockSize(blockSize) {
        this._requestedFileBlockSize = blockSize;
    }
    setRequestedBatchAckSize(batchAckSize) {
        this._requestedBatchAckSize = batchAckSize;
    }
    async fileSend(fileName, fileType, fileDest, fileContents, progressCallback) {
        this._isTxCancelled = false;
        // Send file start message
        if (!await this._sendFileStartMsg(fileName, fileType, fileDest, fileContents))
            return false;
        // Send contents
        if (!await this._sendFileContents(fileContents, progressCallback))
            return false;
        // Send file end
        await this._sendFileEndMsg(fileName, fileType, fileDest, fileContents);
        // Clean up
        await this.awaitOutstandingMsgPromises(true);
        // Complete
        return true;
    }
    async fileSendCancel() {
        // Await outstanding promises
        await this.awaitOutstandingMsgPromises(true);
        this._isTxCancelled = true;
    }
    // Send the start message
    async _sendFileStartMsg(fileName, fileType, fileDest, fileContents) {
        // File start command message
        const reqStr = fileType == RaftTypes_1.RaftFileSendType.FIRMWARE_UPDATE
            ? 'espfwupdate'
            : 'fileupload';
        const fileLen = fileContents.length;
        const cmdMsg = `{"cmdName":"ufStart","reqStr":"${reqStr}","fileType":"${fileDest}","fileName":"${fileName}","fileLen":${fileLen},"batchMsgSize":${this._requestedFileBlockSize},"batchAckSize":${this._requestedBatchAckSize}}`;
        // Debug
        RaftLog_1.default.debug(`sendFileStartMsg ${cmdMsg}`);
        // Send
        let fileStartResp = null;
        try {
            fileStartResp = await this._msgHandler.sendRICREST(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME);
        }
        catch (err) {
            RaftLog_1.default.error(`sendFileStartMsg error ${err}`);
            return false;
        }
        if (fileStartResp.rslt !== 'ok') {
            RaftLog_1.default.error(`sendFileStartMsg error ${fileStartResp.rslt}`);
            return false;
        }
        // Extract params
        if (fileStartResp.batchMsgSize) {
            this._fileBlockSize = fileStartResp.batchMsgSize;
        }
        else {
            this._fileBlockSize = this._requestedFileBlockSize;
        }
        if (fileStartResp.batchAckSize) {
            this._batchAckSize = fileStartResp.batchAckSize;
        }
        else {
            this._batchAckSize = this._requestedBatchAckSize;
        }
        RaftLog_1.default.debug(`_fileSendStartMsg fileBlockSize req ${this._requestedFileBlockSize} resp ${fileStartResp.batchMsgSize} actual ${this._fileBlockSize}`);
        RaftLog_1.default.debug(`_fileSendStartMsg batchAckSize req ${this._requestedBatchAckSize} resp ${fileStartResp.batchAckSize} actual ${this._batchAckSize}`);
        return true;
    }
    async _sendFileEndMsg(fileName, fileType, fileDest, fileContents) {
        // File end command message
        const reqStr = fileType == RaftTypes_1.RaftFileSendType.FIRMWARE_UPDATE
            ? 'espfwupdate'
            : 'fileupload';
        const fileLen = fileContents.length;
        const cmdMsg = `{"cmdName":"ufEnd","reqStr":"${reqStr}","fileType":"${fileDest}","fileName":"${fileName}","fileLen":${fileLen}}`;
        // Await outstanding promises
        try {
            await this.awaitOutstandingMsgPromises(true);
        }
        catch (err) {
            // Ignore
        }
        // Send
        let fileEndResp = null;
        try {
            fileEndResp = await this._msgHandler.sendRICREST(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME);
        }
        catch (err) {
            RaftLog_1.default.error(`sendFileEndMsg error ${err}`);
            return false;
        }
        return fileEndResp.rslt === 'ok';
    }
    async _sendFileCancelMsg() {
        // File cancel command message
        const cmdMsg = `{"cmdName":"ufCancel"}`;
        // Await outstanding promises
        await this.awaitOutstandingMsgPromises(true);
        // Send
        try {
            return await this._msgHandler.sendRICREST(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME);
        }
        catch (err) {
            RaftLog_1.default.error(`sendFileCancelMsg error ${err}`);
        }
    }
    async _sendFileContents(fileContents, progressCallback) {
        if (progressCallback) {
            progressCallback(0, fileContents.length, 0);
        }
        this._batchAckReceived = false;
        this._ackedFilePos = 0;
        // Send file blocks
        let progressUpdateCtr = 0;
        while (this._ackedFilePos < fileContents.length) {
            // Sending with or without batches
            if (this._sendWithoutBatchAcks) {
                // Debug
                RaftLog_1.default.verbose(`_sendFileContents NO BATCH ACKS ${progressUpdateCtr} blocks total sent ${this._ackedFilePos} block len ${this._fileBlockSize}`);
                if (!await this._sendFileBlock(fileContents, this._ackedFilePos))
                    return false;
                this._ackedFilePos += this._fileBlockSize;
                progressUpdateCtr++;
            }
            else {
                // NOTE: first batch MUST be of size 1 (not _batchAckSize) because Raft performs a long-running
                // blocking task immediately after receiving the first message in a firmware
                // update - although this could be relaxed for non-firmware update file uploads
                let sendFromPos = this._ackedFilePos;
                const batchSize = sendFromPos == 0 ? 1 : this._batchAckSize;
                for (let i = 0; i < batchSize && sendFromPos < fileContents.length; i++) {
                    // Clear old batch acks
                    if (i == batchSize - 1) {
                        this._batchAckReceived = false;
                    }
                    // Debug
                    RaftLog_1.default.debug(`_sendFileContents sendblock pos ${sendFromPos} len ${this._fileBlockSize} ackedTo ${this._ackedFilePos} fileLen ${fileContents.length}`);
                    if (!await this._sendFileBlock(fileContents, sendFromPos))
                        return false;
                    sendFromPos += this._fileBlockSize;
                }
                // Wait for response (there is a timeout at the ESP end to ensure a response is always returned
                // even if blocks are dropped on reception at ESP) - the timeout here is for these responses
                // being dropped
                await this.batchAck(this.BLOCK_ACK_TIMEOUT_MS);
                progressUpdateCtr += this._batchAckSize;
            }
            // Show progress
            if ((progressUpdateCtr >= 20) && progressCallback) {
                // Update UI
                progressCallback(this._ackedFilePos, fileContents.length, this._ackedFilePos / fileContents.length);
                // Debug
                RaftLog_1.default.debug(`_sendFileContents ${progressUpdateCtr} blocks sent OkTo ${this._ackedFilePos} block len ${this._fileBlockSize}`);
                // Continue
                progressUpdateCtr = 0;
            }
        }
        return true;
    }
    async batchAck(timeout) {
        // Handle acknowledgement to a batch (OkTo message)
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkForAck = async () => {
                if (this._isTxCancelled) {
                    RaftLog_1.default.debug('checkForAck - cancelling file upload');
                    this._isTxCancelled = false;
                    // Send cancel
                    await this._sendFileCancelMsg();
                    // abort the upload process
                    reject(new Error('Update Cancelled'));
                    return;
                }
                if (this._batchAckReceived) {
                    RaftLog_1.default.debug(`checkForAck - rx OkTo ${this._ackedFilePos}`);
                    this._batchAckReceived = false;
                    resolve();
                    return;
                }
                else {
                    const now = Date.now();
                    if (now - startTime > timeout) {
                        RaftLog_1.default.warn(`checkForAck - time-out no new ack received`);
                        reject(new Error('Update failed. Please try again.'));
                        return;
                    }
                    setTimeout(checkForAck, 100);
                }
            };
            checkForAck();
        });
    }
    async _sendFileBlock(fileContents, blockStart) {
        // Calc block start and end
        const blockEnd = Math.min(fileContents.length, blockStart + this._fileBlockSize);
        // Check if we need to await a message send promise
        await this.awaitOutstandingMsgPromises(false);
        // Send
        const promRslt = this._msgHandler.sendFileBlock(fileContents.subarray(blockStart, blockEnd), blockStart);
        if (!promRslt) {
            return false;
        }
        // Record
        this._commsStats.recordFileBytes(blockEnd - blockStart);
        // Add to list of pending messages
        this._msgAwaitList.push(new FileBlockTrackInfo(promRslt));
        // Debug
        // RaftLog.debug(
        //   `sendFileBlock start ${blockStart} end ${blockEnd} len ${blockLen}`,
        // );
        return true;
    }
    onOktoMsg(fileOkTo) {
        // Get how far we've progressed in file
        this._ackedFilePos = fileOkTo;
        this._batchAckReceived = true;
        RaftLog_1.default.verbose(`onOktoMsg received file up to ${this._ackedFilePos}`);
    }
    async awaitOutstandingMsgPromises(all) {
        // Check if all outstanding promises to be awaited
        if (all) {
            for (const promRslt of this._msgAwaitList) {
                try {
                    await promRslt.get();
                }
                catch (error) {
                    RaftLog_1.default.warn(`awaitAll file part send failed ${error}`);
                }
            }
            this._msgAwaitList = [];
        }
        else {
            // RaftLog.debug('Await list len', this._msgAwaitList.length);
            if (this._msgAwaitList.length >=
                this.MAX_OUTSTANDING_FILE_BLOCK_SEND_PROMISES) {
                const fileBlockTrackInfo = this._msgAwaitList.shift();
                try {
                    if (fileBlockTrackInfo) {
                        await fileBlockTrackInfo.get();
                    }
                }
                catch (error) {
                    RaftLog_1.default.warn(`awaitSome file part send failed ${error}`);
                }
            }
        }
    }
    async fileReceive(fileName, fileSource, progressCallback) {
        this._isRxCancelled = false;
        // Check for bridgeserial1..N as fileSource - in this case use the RICREST bridging protocol
        // as attached devices using CommandSerial require bridging
        let bridgeID = undefined;
        const bridgeSerialPrefix = 'bridgeserial';
        if (fileSource.startsWith(bridgeSerialPrefix)) {
            // Establish a bridge
            const bridgedDeviceSerialPort = "Serial" + fileSource.slice(bridgeSerialPrefix.length);
            const cmdResp = await this._msgHandler.createCommsBridge(bridgedDeviceSerialPort, "fileSource");
            if (cmdResp.rslt != "ok") {
                RaftLog_1.default.error(`fileReceive - failed to setup bridge ${cmdResp.rslt}`);
                return new RaftTypes_1.RaftFileDownloadResult();
            }
            bridgeID = cmdResp.bridgeID;
            // Debug
            RaftLog_1.default.info(`fileReceive - bridge setup ${bridgeID}`);
        }
        // Send file start message
        if (!await this._receiveFileStart(fileName, bridgeID))
            return new RaftTypes_1.RaftFileDownloadResult();
        // Send contents
        const fileContents = await this._receiveFileContents(progressCallback, bridgeID);
        // Send file end
        await this._receiveFileEnd(fileName, bridgeID);
        // Clean up
        await this.awaitOutstandingMsgPromises(true);
        // Complete
        return fileContents;
    }
    async fileReceiveCancel() {
        this._isRxCancelled = true;
    }
    async _receiveFileStart(fileName, bridgeID) {
        const blockMaxSizeRequested = 5000;
        const batchAckSizeRequested = 10;
        const fileSrc = "fs";
        // Request file transfer
        // Frames follow the approach used in the web interface start, block..., end
        const cmdMsg = `{"cmdName":"dfStart","reqStr":"getFile","fileType":"${fileSrc}",` +
            `"batchMsgSize":${blockMaxSizeRequested},` +
            `"batchAckSize":${batchAckSizeRequested},` +
            `"fileName":"${fileName}"}`;
        // Send
        let cmdResp = null;
        try {
            cmdResp = await this._msgHandler.sendRICREST(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME, bridgeID);
        }
        catch (err) {
            RaftLog_1.default.error(`_receiveFileStartMsg error ${err}`);
            return false;
        }
        RaftLog_1.default.info(`_receiveFileStartMsg rslt ${JSON.stringify(cmdResp)}`);
        if (cmdResp.rslt === 'ok') {
            this._fileRxBatchMsgSize = cmdResp.batchMsgSize;
            this._fileRxBatchAckSize = cmdResp.batchAckSize;
            this._fileRxStreamID = cmdResp.streamID;
            this._fileRxFileLen = cmdResp.fileLen;
            this._fileRxCrc16 = parseInt(cmdResp.crc16, 16);
            this._fileRxBuffer = new Uint8Array(0);
            this._fileRxLastAckTime = 0;
            this._fileRxLastAckPos = 0;
            this._fileRxLastBlockTime = Date.now();
            this._fileRxActive = true;
        }
        return cmdResp.rslt === 'ok';
    }
    async _receiveFileContents(progressCallback, bridgeID) {
        // Wait for file to be received
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            const checkForComplete = async () => {
                // Check if we've received the whole file
                if (this._fileRxFileLen === this._fileRxBuffer.length) {
                    this._fileRxActive = false;
                    // Progress callback
                    if (progressCallback) {
                        progressCallback(this._fileRxBuffer.length, this._fileRxFileLen);
                    }
                    // Check CRC
                    const crc16 = RaftMiniHDLC_1.default.crc16(this._fileRxBuffer);
                    if (crc16 !== this._fileRxCrc16) {
                        RaftLog_1.default.error(`_receiveFileContents - CRC error ${crc16} ${this._fileRxCrc16}`);
                        reject(new Error('fileReceive CRC error'));
                        return;
                    }
                    else {
                        RaftLog_1.default.info(`_receiveFileContents - CRC OK ${crc16} ${this._fileRxCrc16}`);
                    }
                    resolve(new RaftTypes_1.RaftFileDownloadResult(this._fileRxBuffer));
                    return;
                }
                // Check if file transfer cancelled
                if (this._isRxCancelled) {
                    RaftLog_1.default.info('_receiveFileContents - cancelling file upload');
                    this._isRxCancelled = false;
                    this._fileRxActive = false;
                    // Send cancel message
                    this._sendFileRxCancelMsg(bridgeID);
                    // abort the upload process
                    reject(new Error('fileReceive Cancelled'));
                    return;
                }
                // Check for timeouts
                const now = Date.now();
                // Check for overall timeouts
                if ((now - startTime > this.OVERALL_FILE_TRANSFER_TIMEOUT_MS) ||
                    (now - this._fileRxLastBlockTime > this.BLOCK_ACK_TIMEOUT_MS)) {
                    RaftLog_1.default.warn(`_receiveFileContents - time-out no new data received`);
                    this._fileRxActive = false;
                    reject(new Error('fileReceive failed'));
                    return;
                }
                // Check if time to send ack
                let ackRequired = false;
                if (Date.now() - this._fileRxLastAckTime > this.FILE_RX_ACK_RESEND_TIMEOUT_MS) {
                    ackRequired = true;
                }
                // Check if position to send ack
                if (this._fileRxBuffer.length - this._fileRxLastAckPos >= this._fileRxBatchAckSize * this._fileRxBatchMsgSize) {
                    ackRequired = true;
                }
                // RaftLog.info(`_receiveFileContents ${ackRequired ? "ACK_REQUIRED" : "ACK_NOTREQUIRED"}  ${this._fileRxBuffer.length} ${this._fileRxLastAckPos} ${this._fileRxBatchAckSize} ${this._fileRxBatchMsgSize}`); 
                // Check if ack required
                if (ackRequired) {
                    // Ack timing
                    this._fileRxLastAckTime = Date.now();
                    this._fileRxLastAckPos = this._fileRxBuffer.length;
                    // Okto message
                    const cmdMsg = `{"cmdName":"dfAck","okto":${this._fileRxBuffer.length},` +
                        `"streamID":${this._fileRxStreamID},"rslt":"ok"}`;
                    // Send without waiting for response
                    this._msgHandler.sendRICRESTNoResp(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME, bridgeID);
                    // Debug
                    RaftLog_1.default.verbose(`_receiveFileContents ack generated at ${this._fileRxBuffer.length} msg ${cmdMsg}`);
                }
                // Progress callback
                if (progressCallback) {
                    progressCallback(this._fileRxBuffer.length, this._fileRxFileLen);
                }
                // Set timeout for next check
                setTimeout(checkForComplete, 50);
            };
            checkForComplete();
        });
    }
    async _receiveFileEnd(fileName, bridgeID) {
        // Send file end message
        const cmdMsg = `{"cmdName":"dfAck","reqStr":"getFile","okto":${this._fileRxBuffer.length},` +
            `"fileName":"${fileName}","streamID":${this._fileRxStreamID},"rslt":"ok"}`;
        this._msgHandler.sendRICRESTNoResp(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME, bridgeID);
        // No longer active
        this._fileRxActive = false;
        return false;
    }
    async _sendFileRxCancelMsg(bridgeID) {
        // Send file end message
        const cmdMsg = `{"cmdName":"dfCancel","reqStr":"getFile","streamID":${this._fileRxStreamID}}`;
        this._msgHandler.sendRICRESTNoResp(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME, bridgeID);
    }
    onFileBlock(filePos, fileBlockData) {
        // RaftLog.info(`onFileBlock filePos ${filePos} fileBlockData ${RaftUtils.bufferToHex(fileBlockData)}`);
        // Check if this is the next block we are expecting
        if (filePos === this._fileRxBuffer.length) {
            // Add to buffer
            const tmpArray = new Uint8Array(this._fileRxBuffer.length + fileBlockData.length);
            tmpArray.set(this._fileRxBuffer, 0);
            tmpArray.set(fileBlockData, this._fileRxBuffer.length);
            this._fileRxBuffer = tmpArray;
            // Update last block time
            this._fileRxLastBlockTime = Date.now();
            // Debug
            // RaftLog.info(`onFileBlock filePos ${filePos} fileBlockData ${RaftUtils.bufferToHex(fileBlockData)} added to buffer`);
        }
        else {
            RaftLog_1.default.warn(`onFileBlock expected streamID ${this._fileRxStreamID} filePos ${filePos} fileBlockData ${RaftUtils_1.default.bufferToHex(fileBlockData)} out of sequence`);
        }
    }
    isFileRxActive() {
        return this._fileRxActive;
    }
}
exports.default = RaftFileHandler;
//# sourceMappingURL=RaftFileHandler.js.map