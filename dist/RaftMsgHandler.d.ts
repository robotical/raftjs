import RaftCommsStats from './RaftCommsStats';
import { RICRESTElemCode, RaftCommsMsgProtocol, RaftCommsMsgTypeCode } from './RaftProtocolDefs';
import { RaftBridgeSetupResp, RaftReportMsg } from './RaftTypes';
export declare enum RaftMsgResultCode {
    MESSAGE_RESULT_TIMEOUT = 0,
    MESSAGE_RESULT_OK = 1,
    MESSAGE_RESULT_FAIL = 2,
    MESSAGE_RESULT_UNKNOWN = 3
}
export interface RaftMessageResult {
    onRxReply(msgHandle: number, msgRsltCode: RaftMsgResultCode, msgRsltJsonObj: object | null): void;
    onRxUnnumberedMsg(msgRsltJsonObj: object): void;
    onRxFileBlock(filePos: number, fileBlockData: Uint8Array): void;
    onRxOtherMsgType(payload: Uint8Array, frameTimeMs: number): void;
}
export interface RaftMessageSender {
    sendTxMsg(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
    sendTxMsgNoAwait(msg: Uint8Array, sendWithResponse: boolean): Promise<boolean>;
}
export default class RaftMsgHandler {
    private _currentMsgNumber;
    private _currentMsgHandle;
    private _msgTrackInfos;
    private _msgTrackTimerMs;
    private _msgTrackLastCheckIdx;
    private _reportMsgCallbacks;
    private _msgResultHandler;
    private _msgSender;
    private _commsStats;
    private _miniHDLC;
    constructor(commsStats: RaftCommsStats);
    registerForResults(msgResultHandler: RaftMessageResult): void;
    registerMsgSender(RaftMessageSender: RaftMessageSender): void;
    handleNewRxMsg(rxMsg: Uint8Array): void;
    reportMsgCallbacksSet(callbackName: string, callback: (report: RaftReportMsg) => void): void;
    reportMsgCallbacksDelete(callbackName: string): void;
    _onHDLCFrameDecode(rxMsg: Uint8Array, frameTimeMs: number): void;
    _handleResponseMessages(restStr: string, rxMsgNum: number): void;
    _handleReportMessages(restStr: string): void;
    sendRICRESTURL<T>(cmdStr: string, bridgeID?: number | undefined, msgTimeoutMs?: number | undefined): Promise<T>;
    sendRICRESTCmdFrame<T>(cmdStr: string, bridgeID?: number | undefined, msgTimeoutMs?: number | undefined): Promise<T>;
    sendRICREST<T>(cmdStr: string, ricRESTElemCode: RICRESTElemCode, bridgeID?: number | undefined, msgTimeoutMs?: number | undefined): Promise<T>;
    sendRICRESTNoResp(cmdStr: string, ricRESTElemCode: RICRESTElemCode, bridgeID?: number | undefined): Promise<boolean>;
    sendRICRESTBytes<T>(cmdBytes: Uint8Array, ricRESTElemCode: RICRESTElemCode, withResponse: boolean, bridgeID?: number | undefined, msgTimeoutMs?: number | undefined): Promise<T>;
    sendMsgAndWaitForReply<T>(msgPayload: Uint8Array, msgDirection: RaftCommsMsgTypeCode, msgProtocol: RaftCommsMsgProtocol, withResponse: boolean, bridgeID: number | undefined, msgTimeoutMs: number | undefined): Promise<T>;
    frameCommsMsg(msgPayload: Uint8Array, msgDirection: RaftCommsMsgTypeCode, msgProtocol: RaftCommsMsgProtocol, isNumbered: boolean): Uint8Array;
    bridgeCommsMsg(msgBuf: Uint8Array, bridgeID: number): Uint8Array;
    msgTrackingTxCmdMsg<T>(msgFrame: Uint8Array, withResponse: boolean, bridgeID: number | undefined, msgTimeoutMs: number | undefined, resolve: (arg: T) => void, reject: (reason: Error) => void): void;
    msgTrackingRxRespMsg(msgNum: number, msgRsltCode: RaftMsgResultCode, msgRsltJsonObj: object): void;
    _msgCompleted(msgNum: number, msgRsltCode: RaftMsgResultCode, msgRsltObj: object | null): void;
    _onMsgTrackTimer(chainRecall: boolean): Promise<void>;
    encodeFileStreamBlock(blockContents: Uint8Array, blockStart: number, streamID: number): Uint8Array;
    sendFileBlock(blockContents: Uint8Array, blockStart: number): Promise<boolean>;
    sendStreamBlock(blockContents: Uint8Array, blockStart: number, streamID: number): Promise<boolean>;
    createCommsBridge(bridgeSource: string, bridgeName: string, idleCloseSecs?: number): Promise<RaftBridgeSetupResp>;
    removeCommsBridge(bridgeID: number): Promise<boolean>;
}
