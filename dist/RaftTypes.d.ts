import { RaftConnEvent } from './RaftConnEvents';
import { RaftUpdateEvent } from './RaftUpdateEvents';
export declare enum RaftPublishEvent {
    PUBLISH_EVENT_DATA = 0
}
export declare const RaftPublishEventNames: {
    0: string;
};
export declare enum RaftFileSendType {
    NORMAL_FILE = 0,
    FIRMWARE_UPDATE = 1
}
export declare enum RaftStreamType {
    REAL_TIME_STREAM = 0
}
export type RaftEventFn = (eventType: string, eventEnum: RaftConnEvent | RaftUpdateEvent | RaftPublishEvent, eventName: string, data?: object | string | null) => void;
export interface RaftSubscription {
    remove(): void;
}
export declare class RaftFriendlyName {
    friendlyName: string;
    friendlyNameIsSet?: boolean | undefined;
    req?: string | undefined;
    rslt?: string | undefined;
    validMs?: number | undefined;
}
export declare class RaftSystemInfo {
    rslt: string;
    SystemName: string;
    SystemVersion: string;
    RicHwRevNo?: string | number;
    HwRev?: string | number;
    MAC?: string | undefined;
    SerialNo?: string | undefined;
    validMs?: number | undefined;
    Friendly?: string | undefined;
}
export declare class RaftCalibInfo {
    rslt: string;
    calDone: number;
    validMs?: number | undefined;
}
export declare class RaftOKFail {
    RAFT_OK: string;
    set(rsltFlag: boolean): void;
    rslt: string;
    isOk(): boolean;
}
export declare class RaftReportMsg {
    msgType?: string;
    rslt: string;
    timeReceived?: number;
    hexRd?: string;
    elemName?: string;
    IDNo?: number;
    msgKey?: string;
    addr?: number;
    msgBody?: string;
}
export declare class RaftHWFWStat {
    s: string;
    m: string;
    v: string;
    n: string;
    p: number;
    i: number;
}
export declare class RaftHWFWUpdRslt {
    req: string;
    rslt: string;
    st: RaftHWFWStat;
}
export type RaftFWInfo = {
    elemType: string;
    version: string;
    destname: string;
    md5: string;
    releaseNotes: string;
    comments: string;
    updaters: Array<string>;
    downloadUrl: string;
    firmware?: string;
};
export type RaftUpdateInfo = {
    rslt: string;
    firmwareVersion: string;
    ricRevision: string;
    files: Array<RaftFWInfo>;
    minimumUpdaterVersion: Dictionary<string>;
    note: string;
};
export type RaftFileStartResp = {
    rslt: string;
    batchMsgSize: number;
    batchAckSize: number;
};
export type RaftStreamStartResp = {
    rslt: string;
    streamID: number;
    maxBlockSize?: number;
};
export type RaftBridgeSetupResp = {
    rslt: string;
    bridgeID: number;
};
export type RaftFile = {
    name: string;
    size: number;
};
export declare class RaftFileList {
    req: string;
    rslt: string;
    fsName: string;
    fsBase: string;
    diskSize: number;
    diskUsed: number;
    folder: string;
    files: Array<RaftFile>;
}
export declare class RaftSysModInfoBLEMan {
    req?: string | undefined;
    rslt: string;
    isConn: boolean;
    isAdv: boolean;
    advName?: string | undefined;
    BLEMAC: string;
    rssi: number;
    rxM: number;
    rxB: number;
    rxBPS: number;
    txM: number;
    txB: number;
    txBPS: number;
    txErr: number;
    txErrPS: number;
    tM?: number | undefined;
    tB?: number | undefined;
    tBPS?: number | undefined;
    tSeqErrs?: number | undefined;
    tDatErrs?: number | undefined;
}
export type RaftProgressCBType = (received: number, total: number) => void;
export declare class RaftFileDownloadResult {
    fileData: Uint8Array | null;
    downloadedOk: boolean;
    constructor(buffer?: Uint8Array | undefined);
}
export type RaftFileDownloadFn = (downloadUrl: string, progressCB: RaftProgressCBType) => Promise<RaftFileDownloadResult>;
export type RaftFileDownloadResp = {
    req: string;
    rslt: string;
};
export type RaftFileDownloadStartResp = {
    req: string;
    rslt: string;
    batchMsgSize: number;
    batchAckSize: number;
    streamID: number;
    fileLen: number;
    crc16: string;
};
export interface Dictionary<T> {
    [key: string]: T;
}
export type RaftWifiScanResults = {
    req: string;
    rslt: string;
    wifi: WifiScanWifiItem[];
};
export type WifiScanWifiItem = {
    ssid: string;
    rssi: number;
    ch1: number;
    ch2: number;
    auth: string;
    bssid: string;
    pair: string;
    group: string;
};
export type PystatusMsgType = {
    req: string;
    running: string;
    rslt: string;
};
