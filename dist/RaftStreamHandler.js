"use strict";
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//
// RafStreamHandler
// Part of RaftJS
//
// Rob Dobson & Chris Greening 2020-2024
// (C) 2020-2024 All rights reserved
//
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const RaftLog_1 = tslib_1.__importDefault(require("./RaftLog"));
const RaftTypes_1 = require("./RaftTypes");
const RaftConnEvents_1 = require("./RaftConnEvents");
const RaftProtocolDefs_1 = require("./RaftProtocolDefs");
class RaftStreamHandler {
    constructor(msgHandler, commsStats, raftConnector) {
        // Queue of audio stream requests
        /*
        private _streamAudioQueue: {
          streamContents: Uint8Array;
          audioDuration: number;
        }[] = [];
        */
        // Stream state
        this._streamID = null;
        this.DEFAULT_MAX_BLOCK_SIZE = 475;
        this._maxBlockSize = this.DEFAULT_MAX_BLOCK_SIZE;
        // Flow control
        this._soktoReceived = false;
        this._soktoPos = 0;
        this._streamIsStarting = false;
        this._lastStreamStartTime = 0;
        this._isStreaming = false;
        this._isPaused = false;
        this._streamBuffer = new Uint8Array();
        this._audioDuration = 0;
        this._audioByteRate = 0;
        this._streamPos = 0;
        this._numBlocksWithoutPause = 15;
        this._legacySoktoMode = false;
        // soundFinishPoint timer
        this.soundFinishPoint = null;
        this._raftConnector = raftConnector;
        this._msgHandler = msgHandler;
        this._commsStats = commsStats;
        this.onSoktoMsg = this.onSoktoMsg.bind(this);
    }
    setNumBlocksWithoutPause(numBlocks) {
        this._numBlocksWithoutPause = numBlocks;
    }
    setLegacySoktoMode(legacyMode) {
        RaftLog_1.default.debug(`Setting legacy sokto mode to ${legacyMode}`);
        this._legacySoktoMode = legacyMode;
    }
    // Start streaming audio
    streamAudio(streamContents, clearExisting, audioDuration) {
        if (!clearExisting)
            RaftLog_1.default.debug(`only clearExisting = true is supported right now.`);
        // TODO - if clearExisting is not set, form a queue
        if (this._streamIsStarting || this._lastStreamStartTime > (Date.now() - 500)) {
            RaftLog_1.default.error(`Unable to start sound, too soon since last request`);
            return;
        }
        this._isPaused = true;
        this._streamIsStarting = true;
        this._lastStreamStartTime = Date.now();
        this._soktoReceived = false;
        this._soktoPos = 0;
        this._streamPos = 0;
        this._streamBuffer = streamContents;
        this._audioDuration = audioDuration;
        this._audioByteRate = (streamContents.length / audioDuration) * 1000;
        this.clearFinishPointTimeout();
        this._sendStreamStartMsg("audio.mp3", "streamaudio", RaftTypes_1.RaftStreamType.REAL_TIME_STREAM, streamContents).then((result) => {
            this._isPaused = false;
            this._streamIsStarting = false;
            if (!result) {
                RaftLog_1.default.error(`Unable to start stream. ufStart message send failed`);
                return;
            }
            //this.streamingPerformanceChecker();
            if (!this._isStreaming) {
                this._isStreaming = true;
                this._sendStreamBuffer();
            }
        });
    }
    async streamCancel() {
        this._streamBuffer = new Uint8Array();
        this.clearFinishPointTimeout();
    }
    isStreamStarting() {
        return this._streamIsStarting;
    }
    clearFinishPointTimeout() {
        if (this.soundFinishPoint) {
            clearTimeout(this.soundFinishPoint);
            this.soundFinishPoint = null;
        }
    }
    streamingPerformanceChecker() {
        if (this._audioDuration) {
            this.clearFinishPointTimeout();
            this.soundFinishPoint = setTimeout(() => {
                // if the streaming hasn't finished before the end of the audio
                // we can assume we are having streaming issues
                // publish event in case we are having issues
                this._raftConnector.onConnEvent(RaftConnEvents_1.RaftConnEvent.CONN_STREAMING_ISSUE);
                this.clearFinishPointTimeout();
            }, this._audioDuration + 500);
        }
    }
    // Send the start message
    async _sendStreamStartMsg(streamName, targetEndpoint, streamTypeEnum, streamContents) {
        // Stream start command message
        const streamType = 'rtstream';
        const cmdMsg = `{"cmdName":"ufStart","reqStr":"ufStart","fileType":"${streamType}","fileName":"${streamName}","endpoint":"${targetEndpoint}","fileLen":${streamContents.length}}`;
        // Debug
        RaftLog_1.default.debug(`sendStreamStartMsg ${cmdMsg}`);
        // Send
        let streamStartResp = null;
        try {
            streamStartResp = await this._msgHandler.sendRICREST(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME);
        }
        catch (err) {
            RaftLog_1.default.error(`sendStreamStartMsg error ${err}`);
            return false;
        }
        // Extract params
        if (streamStartResp && (streamStartResp.rslt === 'ok')) {
            this._streamID = streamStartResp.streamID;
            this._maxBlockSize = streamStartResp.maxBlockSize || this.DEFAULT_MAX_BLOCK_SIZE;
            this.streamingPerformanceChecker();
            RaftLog_1.default.verbose(`sendStreamStartMsg streamID ${this._streamID} maxBlockSize ${this._maxBlockSize} streamType ${streamTypeEnum}`);
        }
        else {
            RaftLog_1.default.warn(`sendStreamStartMsg failed ${streamStartResp ? streamStartResp.rslt : 'no response'}`);
            return false;
        }
        return true;
    }
    get maxBlockSize() {
        return this._maxBlockSize;
    }
    set maxBlockSize(maxBlockSize) {
        this._maxBlockSize = maxBlockSize;
        this.DEFAULT_MAX_BLOCK_SIZE = maxBlockSize;
    }
    async _sendStreamEndMsg(streamID) {
        if (streamID === null) {
            return false;
        }
        // Stram end command message
        const cmdMsg = `{"cmdName":"ufEnd","reqStr":"ufEnd","streamID":${streamID}}`;
        // Debug
        RaftLog_1.default.debug(`sendStreamEndMsg ${cmdMsg}`);
        // Send
        let streamEndResp = null;
        try {
            streamEndResp = await this._msgHandler.sendRICREST(cmdMsg, RaftProtocolDefs_1.RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME);
        }
        catch (err) {
            RaftLog_1.default.error(`sendStreamEndMsg error ${err}`);
            return false;
        }
        return streamEndResp.rslt === 'ok';
    }
    /*
      private async _sendAudioStopMsg(): Promise<RaftOKFail> {
        const cmdMsg = `{"cmdName":"audio/stop"}`;
    
        // Debug
        RaftLog.debug(`sendAudioStopMsg ${cmdMsg}`);
    
        // Send
        return this._msgHandler.sendRICREST<RaftOKFail>(
          cmdMsg,
          RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME,
        );
      }
    
    
      private async _sendStreamCancelMsg(): Promise<RaftOKFail> {
        // File cancel command message
        const cmdMsg = `{"cmdName":"ufCancel","reqStr":"ufCancel","streamID":${this._streamID}}`;
    
        // Debug
        RaftLog.debug(`sendStreamCancelMsg ${cmdMsg}`);
    
        // Send
        return this._msgHandler.sendRICREST<RaftOKFail>(
          cmdMsg,
          RICRESTElemCode.RICREST_ELEM_CODE_COMMAND_FRAME,
        );
      }
    */
    async _sendStreamBuffer() {
        const streamStartTime = Date.now();
        // Check streamID is valid
        if (this._streamID === null) {
            return false;
        }
        let blockNum = 0;
        // Send stream blocks
        while (this._soktoPos < this._streamBuffer.length || this._isPaused) {
            if (this._isPaused) {
                await new Promise((resolve) => setTimeout(resolve, 5));
                continue;
            }
            // Check for new sokto
            if (this._soktoReceived) {
                if (this._legacySoktoMode)
                    this._streamPos = this._soktoPos;
                // apart from when in legacy mode, the sokto message is now informational only, 
                // to allow the central to slow down sending of data if it is swamping the peripheral
                RaftLog_1.default.verbose(`sendStreamContents ${Date.now() - streamStartTime}ms soktoReceived for ${this._streamPos}`);
                this._soktoReceived = false;
                // receiving an sokto message before the completion of the stream means that the streaming is not keeping up
                this._raftConnector.onConnEvent(RaftConnEvents_1.RaftConnEvent.CONN_STREAMING_ISSUE);
            }
            // Send stream block
            const blockSize = Math.min(this._streamBuffer.length - this._streamPos, this._maxBlockSize);
            const block = this._streamBuffer.slice(this._streamPos, this._streamPos + blockSize);
            if (block.length > 0) {
                const sentOk = await this._msgHandler.sendStreamBlock(block, this._streamPos, this._streamID);
                this._commsStats.recordStreamBytes(block.length);
                RaftLog_1.default.verbose(`sendStreamContents ${sentOk ? "OK" : "FAILED"} ${Date.now() - streamStartTime}ms pos ${this._streamPos} ${blockSize} ${block.length} ${this._soktoPos}`);
                if (!sentOk) {
                    return false;
                }
                this._streamPos += blockSize;
                blockNum += 1;
                if (this._audioByteRate && blockNum > this._numBlocksWithoutPause) {
                    const pauseTime = ((blockSize / this._audioByteRate) * 1000) - 10;
                    RaftLog_1.default.verbose(`Pausing for ${pauseTime} ms between audio packets. Bit rate ${this._audioByteRate * 8}`);
                    await new Promise((resolve) => setTimeout(resolve, pauseTime));
                }
            }
            // Wait to ensure we don't hog the CPU
            await new Promise((resolve) => setTimeout(resolve, 1));
        }
        this._isStreaming = false;
        this.clearFinishPointTimeout();
        await this._sendStreamEndMsg(this._streamID);
        return true;
    }
    onSoktoMsg(soktoPos) {
        // Get how far we've progressed in file
        this._soktoPos = soktoPos;
        this._soktoReceived = true;
        RaftLog_1.default.debug(`onSoktoMsg received file up to ${this._soktoPos}`);
    }
}
exports.default = RaftStreamHandler;
//# sourceMappingURL=RaftStreamHandler.js.map